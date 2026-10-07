-- Let work decompose downward: a monthly deliverable breaks into weekly
-- priorities, and a weekly priority breaks into day-level tasks.
--
-- goals.parent_id already exists (0004). This adds the task end of the chain
-- so a weekly priority can own the tasks that actually deliver it.

alter table public.tasks
  add column if not exists goal_id uuid references public.goals (id) on delete set null;

create index if not exists tasks_goal_idx
  on public.tasks (goal_id)
  where deleted_at is null and goal_id is not null;

-- Finding a goal's children is the hot path for the rollup.
create index if not exists goals_parent_idx
  on public.goals (parent_id)
  where deleted_at is null and parent_id is not null;

-- A goal may only hang off one directly above it: week -> month, month -> year.
-- Enforced in a trigger because it needs to read the parent row.
create or replace function public.goals_check_parent()
returns trigger
language plpgsql
as $parent$
declare
  parent_kind public.goal_kind;
  parent_owner uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'A goal cannot be its own parent'
      using errcode = 'check_violation';
  end if;

  select kind, user_id into parent_kind, parent_owner
  from public.goals
  where id = new.parent_id;

  if parent_owner is distinct from new.user_id then
    raise exception 'A goal can only link to your own goals'
      using errcode = 'check_violation';
  end if;

  if not (
    (new.kind = 'week' and parent_kind = 'month') or
    (new.kind = 'month' and parent_kind = 'year')
  ) then
    raise exception 'A % goal cannot hang off a % goal', new.kind, parent_kind
      using errcode = 'check_violation';
  end if;

  return new;
end;
$parent$;

drop trigger if exists goals_check_parent on public.goals;
create trigger goals_check_parent
  before insert or update of parent_id on public.goals
  for each row execute function public.goals_check_parent();
