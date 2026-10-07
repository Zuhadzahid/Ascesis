"use client";

import { useQuery } from "@tanstack/react-query";
import { endOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { parseISODate, toISODate, type ISODate } from "@/lib/dates/core";
import { computeStreak, type ScoredDay } from "./streak";

export interface MonthRollup {
  days: ScoredDay[];
  /** Mean score across logged days, 0 when nothing is logged. */
  average: number;
  daysLogged: number;
  /** Share of logged days that cleared the streak threshold, as a percentage. */
  consistency: number;
}

/**
 * Scores for one calendar month. One indexed range scan on the daily_logs
 * primary key, so this stays cheap as history grows.
 */
export function useMonthScores(monthStart: ISODate) {
  return useQuery({
    queryKey: ["rollup", "month", monthStart],
    staleTime: 60_000,
    queryFn: async (): Promise<MonthRollup> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user)
        return { days: [], average: 0, daysLogged: 0, consistency: 0 };

      const from = monthStart;
      const to = toISODate(endOfMonth(parseISODate(monthStart)));

      const { data, error } = await supabase
        .from("daily_logs")
        .select("log_date, daily_score")
        .eq("user_id", user.id)
        .gte("log_date", from)
        .lte("log_date", to)
        .order("log_date", { ascending: true });

      if (error) throw error;

      const days: ScoredDay[] = (data ?? []).map((row) => ({
        date: row.log_date,
        score: Number(row.daily_score),
      }));

      const daysLogged = days.length;
      const average = daysLogged
        ? Math.round(days.reduce((s, d) => s + d.score, 0) / daysLogged)
        : 0;
      const cleared = days.filter((d) => d.score >= 60).length;
      const consistency = daysLogged
        ? Math.round((cleared / daysLogged) * 100)
        : 0;

      return { days, average, daysLogged, consistency };
    },
  });
}

/** Current and longest streak as of a date, derived from a year of logs. */
export function useStreak(asOf: ISODate) {
  return useQuery({
    queryKey: ["rollup", "streak", asOf],
    staleTime: 60_000,
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { current: 0, longest: 0 };

      const from = toISODate(
        new Date(parseISODate(asOf).getFullYear() - 1, 0, 1),
      );

      const { data, error } = await supabase
        .from("daily_logs")
        .select("log_date, daily_score")
        .eq("user_id", user.id)
        .gte("log_date", from)
        .lte("log_date", asOf);

      if (error) throw error;

      const days: ScoredDay[] = (data ?? []).map((row) => ({
        date: row.log_date,
        score: Number(row.daily_score),
      }));
      return computeStreak(days, asOf);
    },
  });
}

/** Scores for a single week, used by the weekly review. */
export function useWeekScores(weekStart: ISODate) {
  return useQuery({
    queryKey: ["rollup", "week", weekStart],
    staleTime: 60_000,
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { days: [] as ScoredDay[], average: 0, daysLogged: 0 };

      const to = toISODate(
        new Date(
          parseISODate(weekStart).getFullYear(),
          parseISODate(weekStart).getMonth(),
          parseISODate(weekStart).getDate() + 6,
          12,
        ),
      );

      const { data, error } = await supabase
        .from("daily_logs")
        .select("log_date, daily_score, rule_ids, completed_rule_ids")
        .eq("user_id", user.id)
        .gte("log_date", weekStart)
        .lte("log_date", to)
        .order("log_date", { ascending: true });

      if (error) throw error;

      const rows = data ?? [];
      const days: ScoredDay[] = rows.map((r) => ({
        date: r.log_date,
        score: Number(r.daily_score),
      }));
      const daysLogged = days.length;
      const average = daysLogged
        ? Math.round(days.reduce((s, d) => s + d.score, 0) / daysLogged)
        : 0;

      // Which rules were most often left undone across the week.
      const missCount = new Map<string, number>();
      for (const row of rows) {
        const all = Array.isArray(row.rule_ids) ? (row.rule_ids as string[]) : [];
        const done = Array.isArray(row.completed_rule_ids)
          ? (row.completed_rule_ids as string[])
          : [];
        for (const id of all) {
          if (!done.includes(id)) {
            missCount.set(id, (missCount.get(id) ?? 0) + 1);
          }
        }
      }

      return { days, average, daysLogged, missCount };
    },
  });
}
