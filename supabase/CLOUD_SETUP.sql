-- ============================================================
-- Ascesis: complete schema for a fresh Supabase project.
-- Paste this whole file into the Supabase SQL Editor and Run.
-- Safe to run more than once.
-- ============================================================


-- ------------------------------------------------------------
-- 0001_init.sql
-- ------------------------------------------------------------

-- Ascesis — core schema, RLS and triggers.
-- Safe to run on a fresh Supabase project.

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created automatically on sign-up.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  week_starts_on smallint not null default 1 check (week_starts_on between 0 and 6),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tasks: the to-dos. task_date is a calendar date (no zone). position is a
-- fractional index stored as text with C collation so JS byte-wise sorting and
-- Postgres ordering agree. details holds markdown incl. "- [ ]" checklists.
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  task_date date not null,
  title text not null check (char_length(title) between 1 and 500),
  details text check (char_length(details) <= 20000),
  has_details boolean generated always as (nullif(btrim(details), '') is not null) stored,
  completed boolean not null default false,
  completed_at timestamptz,
  position text collate "C" not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- The one index that serves every read: a user's active tasks in a date range,
-- already ordered by position.
create index if not exists tasks_active_idx
  on public.tasks (user_id, task_date, position)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Row Level Security: users see and change only their own rows.
-- (select auth.uid()) is evaluated once per query, not per row.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;

drop policy if exists profiles_own on public.profiles;
create policy profiles_own on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists tasks_own on public.tasks;
create policy tasks_own on public.tasks
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Keep updated_at fresh and manage completed_at on tasks.
-- ---------------------------------------------------------------------------
create or replace function public.tasks_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if new.completed and not old.completed then
    new.completed_at := now();
  elsif not new.completed then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_touch on public.tasks;
create trigger tasks_touch
  before update on public.tasks
  for each row execute function public.tasks_touch();

create or replace function public.profiles_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.profiles_touch();

-- ---------------------------------------------------------------------------
-- Create a profile automatically when an auth user is created. security definer
-- + empty search_path so it works regardless of caller, and coalesce so both
-- Google (full_name/name) and email sign-ups get a sensible display name.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Abuse guard: cap active (non-deleted) tasks per user.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_task_cap()
returns trigger
language plpgsql
as $$
declare
  active_count integer;
begin
  select count(*) into active_count
  from public.tasks
  where user_id = new.user_id and deleted_at is null;

  if active_count >= 20000 then
    raise exception 'Task limit reached (20000 active tasks).'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_cap on public.tasks;
create trigger tasks_cap
  before insert on public.tasks
  for each row execute function public.enforce_task_cap();


-- ------------------------------------------------------------
-- 0002_purge_cron.sql
-- ------------------------------------------------------------

-- Optional: purge soft-deleted tasks after 30 days using pg_cron.
-- pg_cron is available on Supabase (enable the extension). Guarded so this
-- migration is a no-op where pg_cron is not installed (e.g. some local setups).

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;

    -- Remove any prior schedule with this name, then (re)create it.
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'purge_deleted_tasks';

    perform cron.schedule(
      'purge_deleted_tasks',
      '0 4 * * *',
      $purge$
        delete from public.tasks
        where deleted_at is not null
          and deleted_at < now() - interval '30 days'
      $purge$
    );
  end if;
end;
$$;


-- ------------------------------------------------------------
-- 0003_canvas_state.sql
-- ------------------------------------------------------------

-- Canvas layout persistence for the Ascesis canvas.
-- Additive: existing rows get the defaults, so no backfill is needed. An empty
-- object means "use the default layout".

alter table public.profiles
  add column if not exists canvas_state jsonb not null default '{}'::jsonb,
  add column if not exists canvas_state_updated_at timestamptz;

-- Guard against a runaway client writing a huge blob into the layout.
alter table public.profiles
  drop constraint if exists profiles_canvas_state_size;
alter table public.profiles
  add constraint profiles_canvas_state_size
  check (pg_column_size(canvas_state) <= 16384);


-- ------------------------------------------------------------
-- 0004_pos.sql
-- ------------------------------------------------------------

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

