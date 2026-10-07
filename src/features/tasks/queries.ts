import { useQueries } from "@tanstack/react-query";
import { endOfMonth, startOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { parseISODate, toISODate, type ISODate } from "@/lib/dates/core";
import { compareTasks } from "./position";
import { fromRow, type Task } from "./types";

/** Cache key for a month bucket, e.g. ["tasks", "2026-09"]. */
export function tasksKey(bucket: string) {
  return ["tasks", bucket] as const;
}

/** The [from, to] date range (inclusive) covering a "YYYY-MM" bucket. */
function bucketRange(bucket: string): { from: ISODate; to: ISODate } {
  const anchor = parseISODate(`${bucket}-01`);
  return {
    from: toISODate(startOfMonth(anchor)),
    to: toISODate(endOfMonth(anchor)),
  };
}

/**
 * Fetch every active task in a month bucket. The explicit user_id filter helps
 * the planner pick tasks_active_idx even though RLS already scopes rows.
 */
async function fetchBucket(bucket: string): Promise<Task[]> {
  const supabase = createClient();
  const { from, to } = bucketRange(bucket);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, user_id, task_date, title, details, has_details, completed, completed_at, position, goal_id, created_at, updated_at, deleted_at",
    )
    .eq("user_id", user.id)
    .gte("task_date", from)
    .lte("task_date", to)
    .is("deleted_at", null)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export function bucketQueryOptions(bucket: string) {
  return {
    queryKey: tasksKey(bucket),
    queryFn: () => fetchBucket(bucket),
    staleTime: 30_000,
  };
}

/**
 * Load one or more month buckets and expose tasks grouped by date, already
 * sorted. Buckets are independent queries so switching Day/Week/Month reuses
 * whatever is cached.
 */
export function useTasks(buckets: string[]) {
  const results = useQueries({
    queries: buckets.map(bucketQueryOptions),
  });

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);
  const error = results.find((r) => r.isError)?.error ?? null;

  // Grouping a month's worth of tasks is cheap, so we build the map each render
  // rather than memoizing on an unstable results array.
  const byDate = new Map<ISODate, Task[]>();
  for (const r of results) {
    for (const task of r.data ?? []) {
      const list = byDate.get(task.date);
      if (list) list.push(task);
      else byDate.set(task.date, [task]);
    }
  }
  for (const list of byDate.values()) list.sort(compareTasks);

  return { byDate, isLoading, isError, error };
}
