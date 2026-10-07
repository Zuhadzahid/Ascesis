"use client";

import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import { keysForCount } from "@/features/tasks/position";
import { addISODays, type ISODate } from "@/lib/dates/core";
import type { AiPlan } from "./plan";

export interface ApplyResult {
  challenges: number;
  monthly: number;
  weekly: number;
  tasks: number;
}

function ruleId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `r-${Math.random().toString(36).slice(2)}`;
}

/**
 * Turn an accepted plan into rows.
 *
 * Ordering keys are generated here rather than in SQL, because they must be
 * valid fractional indexes that the client can later insert between. The
 * insert itself runs inside one database function, so a plan either lands
 * whole or not at all.
 */
export async function applyPlan(
  plan: AiPlan,
  dates: { today: ISODate; weekStart: ISODate; monthStart: ISODate },
): Promise<ApplyResult> {
  const monthlyKeys = keysForCount(Math.max(1, plan.monthly.length));
  const weeklyKeys = keysForCount(
    Math.max(1, plan.monthly.reduce((n, m) => n + m.weekly.length, 0)),
  );
  const taskKeys = keysForCount(
    Math.max(
      1,
      plan.monthly.reduce(
        (n, m) => n + m.weekly.reduce((k, w) => k + w.tasks.length, 0),
        0,
      ) + plan.today.length,
    ),
  );

  let weeklyIdx = 0;
  let taskIdx = 0;

  const payload = {
    today: dates.today,
    weekStart: dates.weekStart,
    monthStart: dates.monthStart,
    challenge: plan.challenge
      ? {
          title: plan.challenge.title,
          objective: plan.challenge.objective,
          startDate: dates.today,
          endDate: addISODays(dates.today, plan.challenge.days - 1),
          rules: plan.challenge.rules.map((text) => ({ id: ruleId(), text })),
          deepWorkMinutes: plan.challenge.deepWorkMinutes,
        }
      : null,
    monthly: plan.monthly.map((m, i) => ({
      title: m.title,
      position: monthlyKeys[i],
      weekly: m.weekly.map((w) => ({
        title: w.title,
        position: weeklyKeys[weeklyIdx++],
        tasks: w.tasks.map((t) => ({
          title: t.title,
          position: taskKeys[taskIdx++],
        })),
      })),
    })),
    today_tasks: plan.today.map((t) => ({
      title: t.title,
      position: taskKeys[taskIdx++],
    })),
  };

  const supabase = createClient();
  const { data, error } = await supabase.rpc("apply_ai_plan", {
    plan: payload as unknown as Json,
  });

  if (error) throw new Error(friendlyApplyError(error.message));
  return data as unknown as ApplyResult;
}

/** Constraint names are not something a person should have to read. */
function friendlyApplyError(message: string): string {
  if (message.includes("challenges_no_overlap"))
    return "You already have an arc running over those dates. End it first, or apply the rest of the plan without the arc.";
  if (message.includes("Weekly priorities are capped"))
    return "That would leave more than three priorities this week. Untick one and try again.";
  if (message.includes("challenges_rules_shape"))
    return "The arc needs between 3 and 5 rules.";
  return message;
}
