"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { startOfMonth } from "date-fns";
import {
  parseISODate,
  toISODate,
  weekStartISO,
  type ISODate,
  type WeekStart,
} from "@/lib/dates/core";
import { monthYearLabel, rangeLabel } from "@/lib/dates/ranges";
import { addISODays } from "@/lib/dates/core";
import { useGoals } from "@/features/goals/queries";
import { periodStart } from "@/features/goals/period";
import { useActiveChallenge } from "@/features/challenges/queries";
import { planFromPrompt } from "./actions";
import { isPlanEmpty, normalisePlan, type AiPlan } from "./plan";
import { applyPlan } from "./applyPlan";
import { AiChatWidget, type ChatMessage } from "./AiChatWidget";
import { AiMessage } from "./AiAssist";
import { PlanPreview } from "./PlanPreview";

function id(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `m-${Math.random().toString(36).slice(2)}`;
}

/**
 * Owns the assistant conversation: a request becomes a plan, the plan becomes
 * a preview, and only an explicit Apply turns it into rows.
 */
export function AiAssistant({
  today,
  weekStartsOn,
}: {
  today: ISODate;
  weekStartsOn: WeekStart;
}) {
  const qc = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  /** Kept so a follow-up revises the last plan rather than starting over. */
  const [lastPlan, setLastPlan] = useState<AiPlan | null>(null);

  const weekStart = weekStartISO(today, weekStartsOn);
  const monthStart = toISODate(startOfMonth(parseISODate(today)));

  const { data: challenge } = useActiveChallenge(today);
  const { data: monthlyGoals = [] } = useGoals(
    "month",
    periodStart("month", today, weekStartsOn),
  );
  const { data: weeklyGoals = [] } = useGoals("week", weekStart);

  const say = useCallback(
    (role: ChatMessage["role"], text: string, attachment?: React.ReactNode) => {
      setMessages((prev) => [...prev, { id: id(), role, text, attachment }]);
    },
    [],
  );

  const runApply = useCallback(
    async (chosen: AiPlan) => {
      setApplying(true);
      try {
        const result = await applyPlan(chosen, {
          today,
          weekStart,
          monthStart,
        });
        // Everything the plan could have touched.
        void qc.invalidateQueries({ queryKey: ["goals"] });
        void qc.invalidateQueries({ queryKey: ["goal-links"] });
        void qc.invalidateQueries({ queryKey: ["tasks"] });
        void qc.invalidateQueries({ queryKey: ["challenge"] });
        void qc.invalidateQueries({ queryKey: ["daily_log"] });

        const parts = [
          result.challenges && "the arc",
          result.monthly && `${result.monthly} monthly target${result.monthly === 1 ? "" : "s"}`,
          result.weekly && `${result.weekly} weekly priorit${result.weekly === 1 ? "y" : "ies"}`,
          result.tasks && `${result.tasks} task${result.tasks === 1 ? "" : "s"}`,
        ].filter(Boolean);

        setLastPlan(null);
        say("assistant", `Created ${parts.join(", ")}. It is on your canvas now.`);
      } catch (err) {
        say(
          "assistant",
          err instanceof Error
            ? err.message
            : "That could not be created. Nothing was changed.",
        );
      } finally {
        setApplying(false);
      }
    },
    [qc, today, weekStart, monthStart, say],
  );

  const send = useCallback(
    async (request: string) => {
      say("user", request);
      setBusy(true);

      const result = await planFromPrompt({
        request,
        context: {
          today,
          weekLabel: rangeLabel(weekStart, addISODays(weekStart, 6)),
          monthLabel: monthYearLabel(monthStart),
          activeChallenge: challenge
            ? { title: challenge.title, endDate: challenge.endDate }
            : null,
          existingMonthly: monthlyGoals.map((g) => g.title),
          existingWeekly: weeklyGoals.map((g) => g.title),
        },
        previousPlan: lastPlan ? JSON.stringify(lastPlan) : undefined,
      });
      setBusy(false);

      if (!result.ok) {
        say(
          "assistant",
          result.reason === "not_configured"
            ? "I am not switched on yet."
            : result.message,
          result.reason === "not_configured" ? (
            <AiMessage
              notConfigured
              message="Add a provider key to the server environment and I will draft full plans here: the arc, its rules, monthly targets, weekly priorities and today's tasks."
            />
          ) : undefined,
        );
        return;
      }

      const plan = normalisePlan(result.data, {
        hasActiveChallenge: !!challenge,
      });

      if (isPlanEmpty(plan)) {
        say(
          "assistant",
          "Nothing usable came back. Try describing the outcome you want and roughly how long you have.",
        );
        return;
      }

      setLastPlan(plan);
      say(
        "assistant",
        plan.summary,
        <PlanPreview
          plan={plan}
          applying={applying}
          onApply={(chosen) => void runApply(chosen)}
          onDiscard={() => setLastPlan(null)}
        />,
      );
    },
    [
      say,
      today,
      weekStart,
      monthStart,
      challenge,
      monthlyGoals,
      weeklyGoals,
      lastPlan,
      applying,
      runApply,
    ],
  );

  return (
    <AiChatWidget
      messages={messages}
      busy={busy}
      onSend={(text) => void send(text)}
      onClear={() => {
        setMessages([]);
        setLastPlan(null);
      }}
    />
  );
}
