"use client";

import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { ChallengeRow } from "@/lib/supabase/database.types";
import { parseISODate, type ISODate } from "@/lib/dates/core";

/** A single non-negotiable. Ids are stable so history stays accurate. */
export interface Rule {
  id: string;
  text: string;
}

export interface Challenge {
  id: string;
  title: string;
  objective: string | null;
  startDate: ISODate;
  endDate: ISODate;
  rules: Rule[];
  deepWorkTargetMinutes: number | null;
}

export function parseRules(value: unknown): Rule[] {
  if (!Array.isArray(value)) return [];
  const rules: Rule[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const raw = entry as Record<string, unknown>;
    if (typeof raw.id === "string" && typeof raw.text === "string") {
      rules.push({ id: raw.id, text: raw.text });
    }
  }
  return rules;
}

export function fromChallengeRow(row: ChallengeRow): Challenge {
  return {
    id: row.id,
    title: row.title,
    objective: row.objective,
    startDate: row.start_date,
    endDate: row.end_date,
    rules: parseRules(row.rules),
    deepWorkTargetMinutes: row.deep_work_target_minutes,
  };
}

export function activeChallengeKey(today: string) {
  return ["challenge", "active", today] as const;
}

/**
 * The challenge whose date range contains today. The database guarantees at
 * most one live challenge per user, so this is always zero or one row.
 */
export function useActiveChallenge(today: ISODate) {
  return useQuery({
    queryKey: activeChallengeKey(today),
    staleTime: 60_000,
    queryFn: async (): Promise<Challenge | null> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("user_id", user.id)
        .lte("start_date", today)
        .gte("end_date", today)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;
      return data ? fromChallengeRow(data) : null;
    },
  });
}

/** Day number and total length, both inclusive of the start and end dates. */
export function challengeProgress(challenge: Challenge, today: ISODate) {
  const start = parseISODate(challenge.startDate);
  const end = parseISODate(challenge.endDate);
  const now = parseISODate(today);

  const totalDays = differenceInCalendarDays(end, start) + 1;
  const dayNumber = Math.min(
    totalDays,
    Math.max(1, differenceInCalendarDays(now, start) + 1),
  );
  const percent = Math.round((dayNumber / totalDays) * 100);
  const daysLeft = Math.max(0, totalDays - dayNumber);

  return { dayNumber, totalDays, percent, daysLeft };
}
