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
