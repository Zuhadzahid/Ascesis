import { addISODays, type ISODate } from "@/lib/dates/core";
import { STREAK_THRESHOLD } from "./score";

/**
 * Streak calculation, mirrored from the SQL function public.streak.
 * Used for optimistic display and as the fallback when the cached counter is
 * cold.
 */

export interface ScoredDay {
  date: ISODate;
  score: number;
}

export interface StreakResult {
  current: number;
  longest: number;
}

/**
 * A day counts toward a streak when its score reaches the threshold.
 *
 * The current streak is allowed to end yesterday as well as today, because
 * today may simply not be logged yet — otherwise the number would collapse to
 * zero every morning.
 */
export function computeStreak(
  days: ScoredDay[],
  asOf: ISODate,
  threshold = STREAK_THRESHOLD,
): StreakResult {
  const qualifying = days
    .filter((d) => d.score >= threshold && d.date <= asOf)
    .map((d) => d.date)
    .sort()
    .reverse();

  if (qualifying.length === 0) return { current: 0, longest: 0 };

  let current = 0;
  let longest = 0;
  let run = 0;
  let currentClosed = false;
  let previous: ISODate | null = null;

  for (const date of qualifying) {
    if (previous === null) {
      run = 1;
      // Reaches today or yesterday?
      if (date === asOf || date === addISODays(asOf, -1)) {
        current = 1;
      } else {
        currentClosed = true;
      }
    } else if (addISODays(previous, -1) === date) {
      run += 1;
      if (!currentClosed) current += 1;
    } else {
      if (run > longest) longest = run;
      run = 1;
      currentClosed = true;
    }
    previous = date;
  }

  if (run > longest) longest = run;
  return { current, longest };
}
