"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  GoalDimension,
  GoalKind,
  GoalRow,
} from "@/lib/supabase/database.types";
import type { ISODate } from "@/lib/dates/core";

export interface Goal {
  id: string;
  kind: GoalKind;
  periodStart: ISODate;
  dimension: GoalDimension | null;
  parentId: string | null;
  title: string;
  progress: number;
  position: string;
  createdAt: string;
}

export function fromGoalRow(row: GoalRow): Goal {
  return {
    id: row.id,
    kind: row.kind,
    periodStart: row.period_start,
    dimension: row.dimension,
    parentId: row.parent_id,
    title: row.title,
    progress: row.progress,
    position: row.position,
    createdAt: row.created_at,
  };
}

export function goalsKey(kind: GoalKind, periodStart: string) {
  return ["goals", kind, periodStart] as const;
}

async function fetchGoals(
  kind: GoalKind,
  periodStart: string,
): Promise<Goal[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("kind", kind)
    .eq("period_start", periodStart)
    .is("deleted_at", null)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(fromGoalRow);
}

/** Goals for one period (a year, a month, or a week). */
export function useGoals(kind: GoalKind, periodStart: string) {
  return useQuery({
    queryKey: goalsKey(kind, periodStart),
    queryFn: () => fetchGoals(kind, periodStart),
    staleTime: 60_000,
  });
}

/**
 * Everything hanging off a set of goals: child goals (week under month) and
 * tasks (under a weekly priority). One query each, both indexed.
 */
export function useGoalLinks(goalIds: string[]) {
  const key = [...goalIds].sort().join(",");
  return useQuery({
    queryKey: ["goal-links", key],
    enabled: goalIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { children: [] as Goal[], tasks: [] };

      const [childRes, taskRes] = await Promise.all([
        supabase
          .from("goals")
          .select("*")
          .eq("user_id", user.id)
          .in("parent_id", goalIds)
          .is("deleted_at", null),
        supabase
          .from("tasks")
          .select("id, completed, goal_id")
          .eq("user_id", user.id)
          .in("goal_id", goalIds)
          .is("deleted_at", null),
      ]);

      if (childRes.error) throw childRes.error;
      if (taskRes.error) throw taskRes.error;

      return {
        children: (childRes.data ?? []).map(fromGoalRow),
        tasks: (taskRes.data ?? []).map((t) => ({
          id: t.id,
          completed: t.completed,
          goalId: t.goal_id,
        })),
      };
    },
  });
}
