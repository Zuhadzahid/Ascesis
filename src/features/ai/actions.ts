"use server";

import { createClient } from "@/lib/supabase/server";
import { getAiProvider } from "@/lib/ai/provider";
import {
  breakDownGoalPrompt,
  draftRulesPrompt,
  expandTaskPrompt,
  parseJson,
  planPrompt,
  weeklyReviewPrompt,
  type PlannerContext,
} from "@/lib/ai/prompts";

/**
 * AI runs on the server only, so a provider key never reaches the browser.
 *
 * Every action returns a discriminated result instead of throwing, because
 * "AI is not set up" is a normal state for this app, not an error.
 */
export type AiResult<T> =
  | { ok: true; data: T; provider: string }
  | { ok: false; reason: "not_configured" | "unauthorized" | "failed"; message: string };

const NOT_CONFIGURED = {
  ok: false as const,
  reason: "not_configured" as const,
  message:
    "AI is not switched on yet. Add a provider key to the server environment and it starts working.",
};

/** Simple per-user throttle so a stuck client cannot run up a bill. */
const lastCall = new Map<string, number>();
const MIN_GAP_MS = 3000;

async function guard(): Promise<
  { ok: true; userId: string } | { ok: false; result: AiResult<never> }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      result: {
        ok: false,
        reason: "unauthorized",
        message: "Sign in to use this.",
      },
    };
  }

  const now = Date.now();
  const previous = lastCall.get(user.id) ?? 0;
  if (now - previous < MIN_GAP_MS) {
    return {
      ok: false,
      result: {
        ok: false,
        reason: "failed",
        message: "Give it a second before asking again.",
      },
    };
  }
  lastCall.set(user.id, now);

  return { ok: true, userId: user.id };
}

async function run<T>(
  build: () => { system: string; prompt: string },
  maxTokens = 900,
): Promise<AiResult<T>> {
  const gate = await guard();
  if (!gate.ok) return gate.result as AiResult<T>;

  const provider = getAiProvider();
  if (!provider) return NOT_CONFIGURED;

  try {
    const { system, prompt } = build();
    const raw = await provider.complete({ system, prompt, maxTokens });
    return { ok: true, data: parseJson<T>(raw), provider: provider.name };
  } catch (err) {
    return {
      ok: false,
      reason: "failed",
      message:
        err instanceof Error
          ? `The model could not answer: ${err.message}`
          : "The model could not answer.",
    };
  }
}

// --- The four features ------------------------------------------------------

export async function draftArcRules(objective: string, days: number) {
  if (!objective.trim()) {
    return {
      ok: false as const,
      reason: "failed" as const,
      message: "Write your objective first, then ask.",
    };
  }
  return run<{ rules: string[]; deepWorkMinutes: number; note?: string }>(() =>
    draftRulesPrompt({ objective: objective.trim(), days }),
  );
}

export async function breakDownGoal(
  goalTitle: string,
  horizon: "month" | "week",
  context?: string,
) {
  return run<{ items: string[] }>(() =>
    breakDownGoalPrompt({ goalTitle, horizon, context }),
  );
}

export async function expandTaskDetails(title: string, existing?: string) {
  return run<{ markdown: string }>(
    () => expandTaskPrompt({ title, existing }),
    1200,
  );
}

export async function writeWeeklyReview(input: {
  weekLabel: string;
  averageScore: number;
  daysLogged: number;
  streak: number;
  priorities: { title: string; done: boolean }[];
  ruleMisses: string[];
}) {
  return run<{
    verdict: string;
    worked: string[];
    slipped: string[];
    changeNextWeek: string;
  }>(() => weeklyReviewPrompt(input), 900);
}

/**
 * The assistant's planner. Returns the model's raw JSON; the caller normalises
 * it against the product's limits before anything is shown or saved.
 */
export async function planFromPrompt(input: {
  request: string;
  context: PlannerContext;
  previousPlan?: string;
}) {
  if (!input.request.trim()) {
    return {
      ok: false as const,
      reason: "failed" as const,
      message: "Tell me what you want to plan.",
    };
  }
  return run<unknown>(() => planPrompt(input), 2000);
}

/** Lets the UI show or hide AI affordances without exposing any key. */
export async function aiStatus(): Promise<{ configured: boolean; provider: string | null }> {
  const provider = getAiProvider();
  return { configured: !!provider, provider: provider?.name ?? null };
}
