-- ============================================================
-- Ascesis: migrations 0005 and 0006.
-- Run this if you already applied 0001 through 0004.
-- Paste into the Supabase SQL Editor and press Run.
-- Safe to run more than once.
-- ============================================================

-- ------------------------------------------------------------
-- 0005_goal_links.sql
-- ------------------------------------------------------------

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

-- ------------------------------------------------------------
-- 0006_apply_plan.sql
-- ------------------------------------------------------------

-- Apply an assistant plan in one transaction.
--
-- A plan spans four tables and the links between them matter: weekly
-- priorities hang off monthly targets, tasks hang off weekly priorities. Doing
-- that as separate calls from the browser risks leaving half a plan behind if
-- one insert fails. A function is atomic, so it either all lands or none does.
--
-- security invoker on purpose: row level security still applies, so this can
-- only ever write rows belonging to the caller.
--
-- Anything that is not a JSON array is read as an empty one, inline, so a
-- malformed field can never abort the whole apply.

create or replace function public.apply_ai_plan(plan jsonb)
returns jsonb
language plpgsql
security invoker
as $apply$
declare
  uid uuid := (select auth.uid());
  month_start date := (plan ->> 'monthStart')::date;
  week_start date := (plan ->> 'weekStart')::date;
  today date := (plan ->> 'today')::date;
  challenge_json jsonb := plan -> 'challenge';
  monthly_json jsonb := case
    when jsonb_typeof(plan -> 'monthly') = 'array' then plan -> 'monthly'
    else '[]'::jsonb
  end;
  loose_tasks jsonb := case
    when jsonb_typeof(plan -> 'today_tasks') = 'array' then plan -> 'today_tasks'
    else '[]'::jsonb
  end;
  weekly_json jsonb;
  tasks_json jsonb;
  m jsonb;
  w jsonb;
  t jsonb;
  new_month_id uuid;
  new_week_id uuid;
  made_challenges int := 0;
  made_monthly int := 0;
  made_weekly int := 0;
  made_tasks int := 0;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  if month_start is null or week_start is null or today is null then
    raise exception 'Plan is missing its dates' using errcode = 'check_violation';
  end if;

  -- The arc
  if challenge_json is not null and jsonb_typeof(challenge_json) = 'object' then
    insert into public.challenges
      (user_id, title, objective, start_date, end_date, rules, deep_work_target_minutes)
    values (
      uid,
      challenge_json ->> 'title',
      nullif(challenge_json ->> 'objective', ''),
      (challenge_json ->> 'startDate')::date,
      (challenge_json ->> 'endDate')::date,
      challenge_json -> 'rules',
      (challenge_json ->> 'deepWorkMinutes')::int
    );
    made_challenges := 1;
  end if;

  -- Monthly targets, then their weekly priorities, then their tasks
  for m in select * from jsonb_array_elements(monthly_json)
  loop
    insert into public.goals (user_id, kind, period_start, title, position)
    values (uid, 'month', month_start, m ->> 'title', m ->> 'position')
    returning id into new_month_id;
    made_monthly := made_monthly + 1;

    weekly_json := case
      when jsonb_typeof(m -> 'weekly') = 'array' then m -> 'weekly'
      else '[]'::jsonb
    end;

    for w in select * from jsonb_array_elements(weekly_json)
    loop
      insert into public.goals
        (user_id, kind, period_start, title, position, parent_id)
      values (uid, 'week', week_start, w ->> 'title', w ->> 'position', new_month_id)
      returning id into new_week_id;
      made_weekly := made_weekly + 1;

      tasks_json := case
        when jsonb_typeof(w -> 'tasks') = 'array' then w -> 'tasks'
        else '[]'::jsonb
      end;

      for t in select * from jsonb_array_elements(tasks_json)
      loop
        insert into public.tasks (user_id, task_date, title, position, goal_id)
        values (uid, today, t ->> 'title', t ->> 'position', new_week_id);
        made_tasks := made_tasks + 1;
      end loop;
    end loop;
  end loop;

  -- Tasks for today that belong to no priority
  for t in select * from jsonb_array_elements(loose_tasks)
  loop
    insert into public.tasks (user_id, task_date, title, position)
    values (uid, today, t ->> 'title', t ->> 'position');
    made_tasks := made_tasks + 1;
  end loop;

  return jsonb_build_object(
    'challenges', made_challenges,
    'monthly', made_monthly,
    'weekly', made_weekly,
    'tasks', made_tasks
  );
end;
$apply$;

revoke all on function public.apply_ai_plan(jsonb) from public;
grant execute on function public.apply_ai_plan(jsonb) to authenticated;

