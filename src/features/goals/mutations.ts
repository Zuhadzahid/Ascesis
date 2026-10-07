"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  GoalDimension,
  GoalKind,
} from "@/lib/supabase/database.types";
import { keyAtEnd } from "@/features/tasks/position";
import { fromGoalRow, goalsKey, type Goal } from "./queries";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `tmp-${Math.random().toString(36).slice(2)}`;
}

/**
 * Goal actions with optimistic cache updates, mirroring the pattern used for
 * tasks: apply locally, call the server with only the changed fields, roll back
 * and surface a message if the server refuses (for example the weekly cap).
 */
export function useGoalActions(kind: GoalKind, periodStart: string) {
  const qc = useQueryClient();
  const key = goalsKey(kind, periodStart);
  const [error, setError] = useState<string | null>(null);

  const withRollback = useCallback(
    async (apply: () => void, server: () => Promise<void>) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<Goal[]>(key);
      apply();
      try {
        await server();
        setError(null);
      } catch (err) {
        qc.setQueryData(key, snapshot);
        const message =
          err instanceof Error ? err.message : "Could not save that change.";
        setError(message);
        throw err;
      }
    },
    [qc, key],
  );

  const create = useCallback(
    async (
      title: string,
      dimension?: GoalDimension | null,
      parentId?: string | null,
    ) => {
      const trimmed = title.trim();
      if (!trimmed) return;

      const existing = qc.getQueryData<Goal[]>(key) ?? [];
      const optimistic: Goal = {
        id: uuid(),
        kind,
        periodStart,
        dimension: dimension ?? null,
        parentId: parentId ?? null,
        title: trimmed,
        progress: 0,
        position: keyAtEnd(existing.at(-1)?.position ?? null),
        createdAt: new Date().toISOString(),
      };

      await withRollback(
        () => qc.setQueryData<Goal[]>(key, [...existing, optimistic]),
        async () => {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("Not signed in");

          const { data, error: dbError } = await supabase
            .from("goals")
            .insert({
              id: optimistic.id,
              user_id: user.id,
              kind,
              period_start: periodStart,
              dimension: optimistic.dimension,
              parent_id: optimistic.parentId,
              title: trimmed,
              position: optimistic.position,
            })
            .select("*")
            .single();
          if (dbError) throw dbError;
          if (data) {
            qc.setQueryData<Goal[]>(key, (list) =>
              (list ?? []).map((g) =>
                g.id === optimistic.id ? fromGoalRow(data) : g,
              ),
            );
          }
        },
      );
    },
    [qc, key, kind, periodStart, withRollback],
  );

  const patch = useCallback(
    async (goal: Goal, changes: { title?: string; progress?: number }) => {
      const next = { ...goal, ...changes };
      if (changes.title !== undefined) next.title = changes.title.trim();
      if (!next.title) return;

      await withRollback(
        () =>
          qc.setQueryData<Goal[]>(key, (list) =>
            (list ?? []).map((g) => (g.id === goal.id ? next : g)),
          ),
        async () => {
          const supabase = createClient();
          const { error: dbError } = await supabase
            .from("goals")
            .update(changes)
            .eq("id", goal.id);
          if (dbError) throw dbError;
        },
      );
    },
    [qc, key, withRollback],
  );

  const remove = useCallback(
    async (goal: Goal) => {
      await withRollback(
        () =>
          qc.setQueryData<Goal[]>(key, (list) =>
            (list ?? []).filter((g) => g.id !== goal.id),
          ),
        async () => {
          const supabase = createClient();
          const { error: dbError } = await supabase
            .from("goals")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", goal.id);
          if (dbError) throw dbError;
        },
      );
    },
    [qc, key, withRollback],
  );

  return { create, patch, remove, error, clearError: () => setError(null) };
}
