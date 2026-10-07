"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { DailyLogRow } from "@/lib/supabase/database.types";
import type { ISODate } from "@/lib/dates/core";

export interface DailyLog {
  date: ISODate;
  challengeId: string | null;
  /** Rules in force that day, snapshotted so editing a challenge later
   *  cannot rewrite history. */
  ruleIds: string[];
  completedRuleIds: string[];
  mainObjective: string | null;
  deepWorkMinutes: number;
  deepWorkTargetMinutes: number;
  eveningRating: number | null;
  reflectionText: string | null;
  /** Computed by a database trigger; always authoritative. */
  dailyScore: number;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export function fromLogRow(row: DailyLogRow): DailyLog {
  return {
    date: row.log_date,
    challengeId: row.challenge_id,
    ruleIds: toStringArray(row.rule_ids),
    completedRuleIds: toStringArray(row.completed_rule_ids),
    mainObjective: row.main_objective,
    deepWorkMinutes: row.deep_work_minutes,
    deepWorkTargetMinutes: row.deep_work_target_minutes,
    eveningRating: row.evening_rating,
    reflectionText: row.reflection_text,
    dailyScore: Number(row.daily_score),
  };
}

export function dailyLogKey(date: string) {
  return ["daily_log", date] as const;
}

export function useDailyLog(date: ISODate) {
  return useQuery({
    queryKey: dailyLogKey(date),
    staleTime: 30_000,
    queryFn: async (): Promise<DailyLog | null> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("log_date", date)
        .maybeSingle();

      if (error) throw error;
      return data ? fromLogRow(data) : null;
    },
  });
}
