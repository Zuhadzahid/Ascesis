"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import type { ISODate } from "@/lib/dates/core";
import { computeDailyScore } from "@/features/score/score";
import type { Challenge } from "@/features/challenges/queries";
import { dailyLogKey, fromLogRow, type DailyLog } from "./queries";

const DEFAULT_DEEP_WORK_TARGET = 120;

/** The row we write when a day is touched for the first time. */
function seedLog(
  date: ISODate,
  challenge: Challenge | null,
  profileTarget: number,
): DailyLog {
  return {
    date,
    challengeId: challenge?.id ?? null,
    ruleIds: challenge?.rules.map((r) => r.id) ?? [],
    completedRuleIds: [],
    mainObjective: null,
    deepWorkMinutes: 0,
    deepWorkTargetMinutes:
      challenge?.deepWorkTargetMinutes ?? profileTarget ?? DEFAULT_DEEP_WORK_TARGET,
    eveningRating: null,
    reflectionText: null,
    dailyScore: 0,
  };
}

/**
 * Writes to today's execution log.
 *
 * Every write is an upsert keyed on (user, date) and carries the snapshot of
 * which rules were in force, so the database can score the day authoritatively.
 * The optimistic score mirrors the SQL formula and is replaced by the server's
 * value as soon as it responds.
 */
export function useDailyLogActions(
  date: ISODate,
  challenge: Challenge | null,
  profileTarget = DEFAULT_DEEP_WORK_TARGET,
) {
  const qc = useQueryClient();
  const key = dailyLogKey(date);

  const write = useCallback(
    async (changes: Partial<DailyLog>) => {
      const current =
        qc.getQueryData<DailyLog | null>(key) ??
        seedLog(date, challenge, profileTarget);

      // If a challenge started (or its rules changed) today, refresh the
      // snapshot. Past days are never touched.
      const ruleIds =
        challenge && challenge.rules.length
          ? challenge.rules.map((r) => r.id)
          : current.ruleIds;

      const next: DailyLog = {
        ...current,
        ...changes,
        ruleIds,
        challengeId: challenge?.id ?? current.challengeId,
        deepWorkTargetMinutes:
          challenge?.deepWorkTargetMinutes ??
          current.deepWorkTargetMinutes ??
          profileTarget,
      };

      // Only rules actually in force count, matching the database trigger.
      const completed = next.completedRuleIds.filter((id) =>
        ruleIds.includes(id),
      );
      next.completedRuleIds = completed;
      next.dailyScore = computeDailyScore({
        ruleTotal: ruleIds.length,
        ruleDone: completed.length,
        deepWorkMinutes: next.deepWorkMinutes,
        deepWorkTargetMinutes: next.deepWorkTargetMinutes,
        eveningRating: next.eveningRating,
      });

      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<DailyLog | null>(key);
      qc.setQueryData(key, next);

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not signed in");

        const { data, error } = await supabase
          .from("daily_logs")
          .upsert(
            {
              user_id: user.id,
              log_date: date,
              challenge_id: next.challengeId,
              rule_ids: next.ruleIds as unknown as Json,
              completed_rule_ids: next.completedRuleIds as unknown as Json,
              main_objective: next.mainObjective,
              deep_work_target_minutes: next.deepWorkTargetMinutes,
              evening_rating: next.eveningRating,
              reflection_text: next.reflectionText,
            },
            { onConflict: "user_id,log_date" },
          )
          .select("*")
          .single();

        if (error) throw error;
        // The trigger is the source of truth for the score.
        if (data) qc.setQueryData(key, fromLogRow(data));
        void qc.invalidateQueries({ queryKey: ["rollup"] });
      } catch (err) {
        qc.setQueryData(key, snapshot);
        throw err;
      }
    },
    [qc, key, date, challenge, profileTarget],
  );

  const toggleRule = useCallback(
    async (ruleId: string) => {
      const current =
        qc.getQueryData<DailyLog | null>(key) ??
        seedLog(date, challenge, profileTarget);
      const done = current.completedRuleIds.includes(ruleId);
      const completedRuleIds = done
        ? current.completedRuleIds.filter((id) => id !== ruleId)
        : [...current.completedRuleIds, ruleId];
      await write({ completedRuleIds });
    },
    [qc, key, date, challenge, profileTarget, write],
  );

  const setObjective = useCallback(
    (mainObjective: string) => write({ mainObjective: mainObjective || null }),
    [write],
  );

  const setRating = useCallback(
    (eveningRating: number | null) => write({ eveningRating }),
    [write],
  );

  const setReflection = useCallback(
    (reflectionText: string) => write({ reflectionText: reflectionText || null }),
    [write],
  );

  return { write, toggleRule, setObjective, setRating, setReflection };
}
