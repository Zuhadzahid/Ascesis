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
