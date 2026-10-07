"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { compareTasks, keyAtEnd, positionForIndex } from "./position";
import {
  patchTask,
  removeTask,
  restore,
  snapshot,
  tasksForDate,
  upsertTask,
} from "./cache";
import { fromRow, type Task } from "./types";
import type { ISODate } from "@/lib/dates/core";
import { notifyTasksChanged } from "./sync";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `tmp-${Math.random().toString(36).slice(2)}`;
}

/**
 * Task actions with optimistic cache updates. Each action updates the cache
 * immediately, calls Supabase with ONLY the fields it changed (so a late
 * debounced details save can't clobber a newer date/position), and rolls back
 * on error.
 */
export function useTaskActions() {
  const qc = useQueryClient();

  const withRollback = useCallback(
    async (apply: () => void, server: () => Promise<void>) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const snap = snapshot(qc);
      apply();
      try {
        await server();
        notifyTasksChanged();
      } catch (err) {
        restore(qc, snap);
        throw err;
      }
    },
    [qc],
  );

  const create = useCallback(
    async (
      date: ISODate,
      title: string,
      goalId?: string | null,
    ): Promise<Task | undefined> => {
      const trimmed = title.trim();
      if (!trimmed) return;

      const existing = tasksForDate(qc, date).sort(compareTasks);
      const position = keyAtEnd(existing.at(-1)?.position ?? null);
      const optimistic: Task = {
        id: uuid(),
        date,
        title: trimmed,
        details: null,
        hasDetails: false,
        completed: false,
        position,
        goalId: goalId ?? null,
        createdAt: new Date().toISOString(),
      };

      await withRollback(
        () => upsertTask(qc, optimistic),
        async () => {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("Not signed in");
          const { data, error } = await supabase
            .from("tasks")
            .insert({
              id: optimistic.id,
              user_id: user.id,
              task_date: date,
              title: trimmed,
              position,
              goal_id: optimistic.goalId,
            })
            .select("*")
            .single();
          if (error) throw error;
          // Reconcile with server-authoritative row (timestamps, has_details).
          if (data) upsertTask(qc, fromRow(data));
        },
      );
      return optimistic;
    },
    [qc, withRollback],
  );

  const toggle = useCallback(
    async (task: Task) => {
      const completed = !task.completed;
      await withRollback(
        () => patchTask(qc, task.id, { completed }),
        async () => {
          const supabase = createClient();
          const { error } = await supabase
            .from("tasks")
            .update({ completed })
            .eq("id", task.id);
          if (error) throw error;
        },
      );
    },
    [qc, withRollback],
  );

  const rename = useCallback(
    async (task: Task, title: string) => {
      const trimmed = title.trim();
      if (!trimmed || trimmed === task.title) return;
      await withRollback(
        () => patchTask(qc, task.id, { title: trimmed }),
        async () => {
          const supabase = createClient();
          const { error } = await supabase
            .from("tasks")
            .update({ title: trimmed })
            .eq("id", task.id);
          if (error) throw error;
        },
      );
    },
    [qc, withRollback],
  );

  /** Persist details text. Called by the debounced editor; patches only details. */
  const saveDetails = useCallback(
    async (taskId: string, details: string) => {
      const value = details.length ? details : null;
      await withRollback(
        () =>
          patchTask(qc, taskId, {
            details: value,
            hasDetails: !!value && value.trim().length > 0,
          }),
        async () => {
          const supabase = createClient();
          const { error } = await supabase
            .from("tasks")
            .update({ details: value })
            .eq("id", taskId);
          if (error) throw error;
        },
      );
    },
    [qc, withRollback],
  );

  const remove = useCallback(
    async (task: Task) => {
      await withRollback(
        () => removeTask(qc, task.id),
        async () => {
          const supabase = createClient();
          const { error } = await supabase
            .from("tasks")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", task.id);
          if (error) throw error;
        },
      );
    },
    [qc, withRollback],
  );

  /**
   * Move a task to a target date at a target index within that day's column.
   * Patches only task_date and position.
   */
  const move = useCallback(
    async (task: Task, toDate: ISODate, toIndex: number) => {
      const destination = tasksForDate(qc, toDate).sort(compareTasks);
      const position = positionForIndex(
        destination.map((t) => ({ id: t.id, position: t.position })),
        toIndex,
        task.id,
      );
      const moved: Task = { ...task, date: toDate, position };
      await withRollback(
        () => upsertTask(qc, moved),
        async () => {
          const supabase = createClient();
          const { error } = await supabase
            .from("tasks")
            .update({ task_date: toDate, position })
            .eq("id", task.id);
          if (error) throw error;
        },
      );
    },
    [qc, withRollback],
  );

  return { create, toggle, rename, saveDetails, remove, move };
}
