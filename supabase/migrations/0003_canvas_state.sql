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
