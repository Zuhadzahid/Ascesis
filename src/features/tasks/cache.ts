import type { QueryClient } from "@tanstack/react-query";
import { monthBucket } from "@/lib/dates/ranges";
import type { Task } from "./types";

/**
 * Helpers that mutate the TanStack Query cache for tasks. All task queries are
 * keyed ["tasks", "<YYYY-MM>"]; a task can move between buckets when its date
 * crosses a month boundary, so these operate across every cached bucket.
 */

type Entry = [readonly unknown[], Task[] | undefined];

function entries(qc: QueryClient): Entry[] {
  return qc.getQueriesData<Task[]>({ queryKey: ["tasks"] });
}

/** Snapshot every task bucket so a failed mutation can roll back. */
export function snapshot(qc: QueryClient): Entry[] {
  return entries(qc).map(([key, data]) => [key, data ? [...data] : data]);
}

export function restore(qc: QueryClient, snap: Entry[]) {
  for (const [key, data] of snap) qc.setQueryData(key, data);
}

/** Insert or replace a task, placing it in the bucket matching its date. */
export function upsertTask(qc: QueryClient, task: Task) {
  const targetBucket = monthBucket(task.date);
  for (const [key, data] of entries(qc)) {
    if (!data) continue;
    const bucket = key[1] as string;
    const without = data.filter((t) => t.id !== task.id);
    if (bucket === targetBucket) {
      qc.setQueryData(key, [...without, task]);
    } else if (without.length !== data.length) {
      // Task left this bucket (date moved to another month).
      qc.setQueryData(key, without);
    }
  }
}

/** Patch changed fields of a task wherever it currently lives. */
export function patchTask(qc: QueryClient, id: string, patch: Partial<Task>) {
  for (const [key, data] of entries(qc)) {
    if (!data) continue;
    let changed = false;
    const next = data.map((t) => {
      if (t.id !== id) return t;
      changed = true;
      return { ...t, ...patch };
    });
    if (changed) qc.setQueryData(key, next);
  }
}

/** Remove a task from every bucket (used for soft delete). */
export function removeTask(qc: QueryClient, id: string) {
  for (const [key, data] of entries(qc)) {
    if (!data) continue;
    if (data.some((t) => t.id === id)) {
      qc.setQueryData(
        key,
        data.filter((t) => t.id !== id),
      );
    }
  }
}

/** Read the currently cached tasks for a specific date, sorted as cached. */
export function tasksForDate(qc: QueryClient, date: string): Task[] {
  const bucket = monthBucket(date);
  const data = qc.getQueryData<Task[]>(["tasks", bucket]) ?? [];
  return data.filter((t) => t.date === date);
}
