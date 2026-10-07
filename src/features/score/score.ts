/**
 * Daily Score, mirrored from the SQL function public.daily_score in
 * supabase/migrations/0004_pos.sql.
 *
 * The database value is authoritative (a trigger recomputes it on every write);
 * this copy exists so the UI can show a score optimistically before the round
 * trip. The two must agree exactly, which the shared fixtures in score.test.ts
 * pin down.
 *
 * Weights: rules 0.5, deep work 0.3, evening rating 0.2 — renormalised over
 * whichever components apply that day. Without renormalising, someone with no
 * active challenge could never score above 50.
 */

export interface ScoreInput {
  /** Number of non-negotiable rules in force that day (0 when no challenge). */
  ruleTotal: number;
  /** How many of those rules were completed. */
  ruleDone: number;
  deepWorkMinutes: number;
  /** 0 disables the deep-work component. */
  deepWorkTargetMinutes: number;
  /** 1-10, or null until the evening review is filled in. */
  eveningRating: number | null;
}

export interface ScoreBreakdown {
  score: number;
  rules: number | null;
  deepWork: number | null;
  evening: number | null;
}

const clamp100 = (n: number) => Math.min(100, Math.max(0, n));

/** Round half-up to 2 decimals, matching Postgres `round(numeric, 2)`. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function scoreBreakdown(input: ScoreInput): ScoreBreakdown {
  const {
    ruleTotal,
    ruleDone,
    deepWorkMinutes,
    deepWorkTargetMinutes,
    eveningRating,
  } = input;

  let weightSum = 0;
  let acc = 0;

  const rules =
    ruleTotal > 0 ? clamp100((Math.max(0, ruleDone) / ruleTotal) * 100) : null;
  if (rules !== null) {
    acc += rules * 0.5;
    weightSum += 0.5;
  }

  const deepWork =
    deepWorkTargetMinutes > 0
      ? clamp100((Math.max(0, deepWorkMinutes) / deepWorkTargetMinutes) * 100)
      : null;
  if (deepWork !== null) {
    acc += deepWork * 0.3;
    weightSum += 0.3;
  }

  const evening =
    eveningRating === null || eveningRating === undefined
      ? null
      : clamp100(eveningRating * 10);
  if (evening !== null) {
    acc += evening * 0.2;
    weightSum += 0.2;
  }

  return {
    score: weightSum === 0 ? 0 : round2(acc / weightSum),
    rules,
    deepWork,
    evening,
  };
}

export function computeDailyScore(input: ScoreInput): number {
  return scoreBreakdown(input).score;
}

/** Scores at or above this count toward a streak. */
export const STREAK_THRESHOLD = 60;
