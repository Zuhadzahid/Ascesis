-- Ascesis: challenge protocol, cascading goals, daily execution log and
-- deep-work sessions. Additive; the existing profiles/tasks tables are untouched.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Challenge protocol (Winter Arc / Monk Mode)
-- ---------------------------------------------------------------------------
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  objective text check (char_length(objective) <= 2000),
  start_date date not null,
  end_date date not null,
  -- [{ "id": uuid, "text": "2 hours deep work" }], 3 to 5 non-negotiables
  rules jsonb not null default '[]'::jsonb,
  deep_work_target_minutes int check (deep_work_target_minutes between 15 and 720),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint challenges_dates_valid
    check (end_date >= start_date and end_date - start_date <= 365),
  constraint challenges_rules_shape
    check (jsonb_typeof(rules) = 'array' and jsonb_array_length(rules) between 3 and 5),
  -- At most one live challenge per user at any moment.
  constraint challenges_no_overlap
    exclude using gist (
      user_id with =,
      daterange(start_date, end_date, '[]') with &&
    ) where (deleted_at is null)
);

create index if not exists challenges_active_idx
  on public.challenges (user_id, start_date, end_date)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Cascading goals: Yearly Vision -> Monthly Target -> Weekly Priority
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'goal_kind') then
    create type public.goal_kind as enum ('year', 'month', 'week');
  end if;
  if not exists (select 1 from pg_type where typname = 'goal_dimension') then
    create type public.goal_dimension as enum
      ('career', 'health', 'finance', 'learning', 'personal');
  end if;
end;
$$;

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind public.goal_kind not null,
  -- Jan 1 for a year, the 1st for a month, the week start for a week.
  period_start date not null,
  dimension public.goal_dimension,
  parent_id uuid references public.goals (id) on delete set null,
  title text not null check (char_length(title) between 1 and 300),
  progress smallint not null default 0 check (progress between 0 and 100),
  -- month: [{ "id": uuid, "text": "...", "done": false }] (max 3)
  deliverables jsonb not null default '[]'::jsonb,
  -- week: [{ "id": uuid, "type": "win" | "blocker", "text": "...", "at": iso }]
  log jsonb not null default '[]'::jsonb,
  position text collate "C" not null default 'a0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint goals_year_needs_dimension
    check (kind <> 'year' or dimension is not null)
);

create index if not exists goals_period_idx
  on public.goals (user_id, kind, period_start, position)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Daily execution log. One row per user per calendar day; the primary key
-- doubles as the range index that powers the heatmap and rollups.
-- ---------------------------------------------------------------------------
create table if not exists public.daily_logs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date date not null,
  challenge_id uuid references public.challenges (id) on delete set null,
  -- Snapshot of the rule ids in force that day, so editing a challenge later
  -- never rewrites history.
  rule_ids jsonb not null default '[]'::jsonb,
  completed_rule_ids jsonb not null default '[]'::jsonb,
  main_objective text check (char_length(main_objective) <= 500),
  deep_work_minutes int not null default 0
    check (deep_work_minutes between 0 and 1440),
  deep_work_target_minutes int not null default 120
    check (deep_work_target_minutes between 0 and 1440),
  evening_rating smallint check (evening_rating between 1 and 10),
  reflection_text text check (char_length(reflection_text) <= 5000),
  daily_score numeric(5, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date)
);

-- ---------------------------------------------------------------------------
-- Deep work sessions roll up into daily_logs.deep_work_minutes.
-- ---------------------------------------------------------------------------
create table if not exists public.deep_work_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date date not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  label text check (char_length(label) <= 200),
  minutes int generated always as (
    case
      when ended_at is null then 0
      else least(720, greatest(0, (extract(epoch from ended_at - started_at) / 60)::int))
    end
  ) stored,
  constraint dws_range_valid check (ended_at is null or ended_at >= started_at)
);

create index if not exists dws_day_idx
  on public.deep_work_sessions (user_id, log_date);

-- Only one timer may run at a time.
create unique index if not exists dws_one_open_idx
  on public.deep_work_sessions (user_id)
  where ended_at is null;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.challenges enable row level security;
alter table public.goals enable row level security;
alter table public.daily_logs enable row level security;
alter table public.deep_work_sessions enable row level security;

drop policy if exists challenges_own on public.challenges;
create policy challenges_own on public.challenges for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists goals_own on public.goals;
create policy goals_own on public.goals for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists daily_logs_own on public.daily_logs;
create policy daily_logs_own on public.daily_logs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists dws_own on public.deep_work_sessions;
create policy dws_own on public.deep_work_sessions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Daily Score: weights 0.5 rules / 0.3 deep work / 0.2 evening rating,
-- renormalised over the components that actually apply. Without this a user
-- with no active challenge could never exceed 50.
-- ---------------------------------------------------------------------------
create or replace function public.daily_score(
  rule_total int,
  rule_done int,
  dw_minutes int,
  dw_target int,
  rating int
)
returns numeric
language plpgsql
immutable
as $$
declare
  weight_sum numeric := 0;
  acc numeric := 0;
  component numeric;
begin
  if rule_total is not null and rule_total > 0 then
    component := least(100, (coalesce(rule_done, 0)::numeric / rule_total) * 100);
    acc := acc + component * 0.5;
    weight_sum := weight_sum + 0.5;
  end if;

  if dw_target is not null and dw_target > 0 then
    component := least(100, (coalesce(dw_minutes, 0)::numeric / dw_target) * 100);
    acc := acc + component * 0.3;
    weight_sum := weight_sum + 0.3;
  end if;

  if rating is not null then
    component := least(100, greatest(0, rating::numeric * 10));
    acc := acc + component * 0.2;
    weight_sum := weight_sum + 0.2;
  end if;

  if weight_sum = 0 then
    return 0;
  end if;

  return round(acc / weight_sum, 2);
end;
$$;

-- Authoritative score on every write. Only ids present in rule_ids count, so a
-- stale or malicious client cannot inflate its own score.
create or replace function public.daily_logs_compute()
returns trigger
language plpgsql
as $$
declare
  total int;
  done int;
begin
  total := jsonb_array_length(coalesce(new.rule_ids, '[]'::jsonb));

  select count(*) into done
  from jsonb_array_elements_text(coalesce(new.completed_rule_ids, '[]'::jsonb)) as c(id)
  where new.rule_ids ? c.id;

  new.daily_score := public.daily_score(
    total, done, new.deep_work_minutes, new.deep_work_target_minutes, new.evening_rating
  );
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists daily_logs_compute on public.daily_logs;
create trigger daily_logs_compute
  before insert or update on public.daily_logs
  for each row execute function public.daily_logs_compute();

-- Keep daily_logs.deep_work_minutes equal to the sum of that day's sessions.
create or replace function public.dws_rollup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user uuid;
  target_date date;
  total int;
begin
  target_user := coalesce(new.user_id, old.user_id);
  target_date := coalesce(new.log_date, old.log_date);

  select coalesce(sum(minutes), 0) into total
  from public.deep_work_sessions
  where user_id = target_user and log_date = target_date;

  insert into public.daily_logs (user_id, log_date, deep_work_minutes)
  values (target_user, target_date, total)
  on conflict (user_id, log_date)
    do update set deep_work_minutes = excluded.deep_work_minutes;

  return null;
end;
$$;

drop trigger if exists dws_rollup on public.deep_work_sessions;
create trigger dws_rollup
  after insert or update or delete on public.deep_work_sessions
  for each row execute function public.dws_rollup();

-- Hard caps: 3 weekly priorities, 3 monthly deliverables.
create or replace function public.goals_enforce_caps()
returns trigger
language plpgsql
as $$
declare
  existing int;
begin
  if new.kind = 'month' and jsonb_array_length(coalesce(new.deliverables, '[]'::jsonb)) > 3 then
    raise exception 'A monthly target allows at most 3 deliverables'
      using errcode = 'check_violation';
  end if;

  if new.kind = 'week' and new.deleted_at is null then
    -- Serialise concurrent inserts for the same user and week.
    perform pg_advisory_xact_lock(hashtext(new.user_id::text || ':' || new.period_start::text));

    select count(*) into existing
    from public.goals
    where user_id = new.user_id
      and kind = 'week'
      and period_start = new.period_start
      and deleted_at is null
      and id <> new.id;

    if existing >= 3 then
      raise exception 'Weekly priorities are capped at 3'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists goals_enforce_caps on public.goals;
create trigger goals_enforce_caps
  before insert or update on public.goals
  for each row execute function public.goals_enforce_caps();

-- updated_at maintenance, matching the convention in 0001.
create or replace function public.pos_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists challenges_touch on public.challenges;
create trigger challenges_touch
  before update on public.challenges
  for each row execute function public.pos_touch();

drop trigger if exists goals_touch on public.goals;
create trigger goals_touch
  before update on public.goals
  for each row execute function public.pos_touch();

-- ---------------------------------------------------------------------------
-- Streak, as the fallback when the Redis counter is cold or unavailable.
-- Security invoker, so RLS scopes it to the calling user.
-- ---------------------------------------------------------------------------
create or replace function public.streak(
  p_asof date,
  p_threshold numeric default 60
)
returns table (current_streak int, longest_streak int)
language plpgsql
stable
as $$
declare
  r record;
  prev_date date := null;
  run int := 0;
  best int := 0;
  cur int := 0;
  cur_closed boolean := false;
begin
  for r in
    select log_date
    from public.daily_logs
    where user_id = (select auth.uid())
      and log_date <= p_asof
      and daily_score >= p_threshold
    order by log_date desc
  loop
    if prev_date is null then
      run := 1;
      -- The current run counts only if it reaches today or yesterday, since
      -- today may simply not be logged yet.
      if (p_asof - r.log_date) <= 1 then
        cur := 1;
      else
        cur_closed := true;
      end if;
    elsif prev_date - r.log_date = 1 then
      run := run + 1;
      if not cur_closed then
        cur := cur + 1;
      end if;
    else
      if run > best then best := run; end if;
      run := 1;
      cur_closed := true;
    end if;

    prev_date := r.log_date;
  end loop;

  if run > best then best := run; end if;
  return query select cur, best;
end;
$$;
