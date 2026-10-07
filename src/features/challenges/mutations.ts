"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import type { ISODate } from "@/lib/dates/core";
import {
  activeChallengeKey,
  fromChallengeRow,
  type Challenge,
  type Rule,
} from "./queries";

export interface NewChallenge {
  title: string;
  objective: string;
  startDate: ISODate;
  endDate: ISODate;
  rules: Rule[];
  deepWorkTargetMinutes: number | null;
}

/** Translate database constraint errors into something a person can act on. */
function friendlyError(message: string): string {
  if (message.includes("challenges_no_overlap"))
    return "You already have a challenge running over those dates. End it first.";
  if (message.includes("challenges_rules_shape"))
    return "Pick between 3 and 5 rules.";
  if (message.includes("challenges_dates_valid"))
    return "The end date must be after the start, and within a year.";
  return message;
}

export function useChallengeActions(today: ISODate) {
  const qc = useQueryClient();
  const key = activeChallengeKey(today);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (input: NewChallenge): Promise<Challenge | null> => {
      setError(null);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not signed in");
        return null;
      }

      const { data, error: dbError } = await supabase
        .from("challenges")
        .insert({
          user_id: user.id,
          title: input.title.trim(),
          objective: input.objective.trim() || null,
          start_date: input.startDate,
          end_date: input.endDate,
          rules: input.rules as unknown as Json,
          deep_work_target_minutes: input.deepWorkTargetMinutes,
        })
        .select("*")
        .single();

      if (dbError) {
        setError(friendlyError(dbError.message));
        return null;
      }

      const challenge = fromChallengeRow(data);
      qc.setQueryData(key, challenge);
      void qc.invalidateQueries({ queryKey: ["challenge"] });
      return challenge;
    },
    [qc, key],
  );

  /** Soft delete, so past daily logs keep their snapshot of the rules. */
  const end = useCallback(
    async (challenge: Challenge) => {
      setError(null);
      const supabase = createClient();
      const { error: dbError } = await supabase
        .from("challenges")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", challenge.id);

      if (dbError) {
        setError(friendlyError(dbError.message));
        return;
      }
      qc.setQueryData(key, null);
      void qc.invalidateQueries({ queryKey: ["challenge"] });
      void qc.invalidateQueries({ queryKey: ["daily_log"] });
    },
    [qc, key],
  );

  return { create, end, error, clearError: () => setError(null) };
}
