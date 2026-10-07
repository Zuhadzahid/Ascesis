/**
 * The structured plan an assistant reply turns into.
 *
 * A model will happily return six weekly priorities when the product allows
 * three, or two rules when an arc needs at least three. Rather than trusting
 * it, every reply is normalised here against the same limits the database
 * enforces, and the UI tells the user what was trimmed.
 */

export const LIMITS = {
  minRules: 3,
  maxRules: 5,
  maxMonthly: 3,
  maxWeeklyPerMonthly: 3,
  maxWeeklyTotal: 3,
  maxTasksPerWeekly: 6,
  minDays: 7,
  maxDays: 365,
  minDeepWork: 15,
  maxDeepWork: 480,
  maxTitle: 300,
} as const;

export interface PlannedTask {
  title: string;
}
export interface PlannedWeekly {
  title: string;
  tasks: PlannedTask[];
}
export interface PlannedMonthly {
  title: string;
  weekly: PlannedWeekly[];
}
export interface PlannedChallenge {
  title: string;
  objective: string;
  days: number;
  rules: string[];
  deepWorkMinutes: number;
}

export interface AiPlan {
  summary: string;
  challenge: PlannedChallenge | null;
  monthly: PlannedMonthly[];
  /** Tasks for today that do not belong to a weekly priority. */
  today: PlannedTask[];
  /** Human-readable notes about anything trimmed to fit the limits. */
  adjustments: string[];
}

function text(value: unknown, max: number = LIMITS.maxTitle): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Turn whatever the model returned into a plan that cannot violate the
 * product's rules. Anything dropped is reported, never silently discarded.
 */
export function normalisePlan(
  raw: unknown,
  options: { hasActiveChallenge: boolean },
): AiPlan {
  const adjustments: string[] = [];
  const obj = (raw ?? {}) as Record<string, unknown>;

  // --- challenge ---
  let challenge: PlannedChallenge | null = null;
  const rawChallenge = obj.challenge as Record<string, unknown> | undefined;

  if (rawChallenge && typeof rawChallenge === "object") {
    const rules = list(rawChallenge.rules)
      .map((r) => text(r, 120))
      .filter((r): r is string => !!r);

    if (options.hasActiveChallenge) {
      adjustments.push(
        "You already have an arc running, so the suggested one was left out.",
      );
    } else if (rules.length < LIMITS.minRules) {
      adjustments.push(
        `The arc was left out: it came back with only ${rules.length} rule${rules.length === 1 ? "" : "s"}, and an arc needs at least ${LIMITS.minRules}.`,
      );
    } else {
      const kept = rules.slice(0, LIMITS.maxRules);
      if (rules.length > LIMITS.maxRules) {
        adjustments.push(
          `Kept the first ${LIMITS.maxRules} rules of ${rules.length}.`,
        );
      }
      const days = clamp(
        Math.round(Number(rawChallenge.days) || 30),
        LIMITS.minDays,
        LIMITS.maxDays,
      );
      challenge = {
        title: text(rawChallenge.title, 120) ?? "Monk Mode",
        objective: text(rawChallenge.objective, 2000) ?? "",
        days,
        rules: kept,
        deepWorkMinutes: clamp(
          Math.round(Number(rawChallenge.deepWorkMinutes) || 120),
          LIMITS.minDeepWork,
          LIMITS.maxDeepWork,
        ),
      };
    }
  }

  // --- monthly targets, with their weekly priorities and tasks ---
  const rawMonthly = list(obj.monthly);
  const monthly: PlannedMonthly[] = [];
  let weeklyBudget = LIMITS.maxWeeklyTotal;

  for (const entry of rawMonthly.slice(0, LIMITS.maxMonthly)) {
    const node = (entry ?? {}) as Record<string, unknown>;
    const title = text(node.title);
    if (!title) continue;

    const weekly: PlannedWeekly[] = [];
    for (const w of list(node.weekly).slice(0, LIMITS.maxWeeklyPerMonthly)) {
      if (weeklyBudget <= 0) break;
      const wNode = (w ?? {}) as Record<string, unknown>;
      const wTitle = text(wNode.title);
      if (!wTitle) continue;

      const tasks = list(wNode.tasks)
        .map((t) => text(t, 500))
        .filter((t): t is string => !!t)
        .slice(0, LIMITS.maxTasksPerWeekly)
        .map((t) => ({ title: t }));

      weekly.push({ title: wTitle, tasks });
      weeklyBudget -= 1;
    }
    monthly.push({ title, weekly });
  }

  if (rawMonthly.length > LIMITS.maxMonthly) {
    adjustments.push(
      `Kept the first ${LIMITS.maxMonthly} monthly targets of ${rawMonthly.length}.`,
    );
  }

  const totalWeeklyOffered = rawMonthly.reduce<number>(
    (sum, m) => sum + list((m as Record<string, unknown>)?.weekly).length,
    0,
  );
  if (totalWeeklyOffered > LIMITS.maxWeeklyTotal) {
    adjustments.push(
      `A week holds ${LIMITS.maxWeeklyTotal} priorities, so ${totalWeeklyOffered - LIMITS.maxWeeklyTotal} were left out.`,
    );
  }

  // --- loose tasks for today ---
  const today = list(obj.today)
    .map((t) => text(t, 500))
    .filter((t): t is string => !!t)
    .slice(0, LIMITS.maxTasksPerWeekly)
    .map((t) => ({ title: t }));

  return {
    summary: text(obj.summary, 400) ?? "Here is a plan.",
    challenge,
    monthly,
    today,
    adjustments,
  };
}

/** True when there is nothing worth showing the user. */
export function isPlanEmpty(plan: AiPlan): boolean {
  return (
    !plan.challenge &&
    plan.monthly.length === 0 &&
    plan.today.length === 0
  );
}

/** Count what applying the plan would create, for the confirm button. */
export function planCounts(plan: AiPlan) {
  const weekly = plan.monthly.reduce((n, m) => n + m.weekly.length, 0);
  const tasks =
    plan.monthly.reduce(
      (n, m) => n + m.weekly.reduce((k, w) => k + w.tasks.length, 0),
      0,
    ) + plan.today.length;
  return {
    challenge: plan.challenge ? 1 : 0,
    monthly: plan.monthly.length,
    weekly,
    tasks,
  };
}
