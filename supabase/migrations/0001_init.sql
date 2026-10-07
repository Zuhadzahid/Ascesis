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
