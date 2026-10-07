"use client";

import { useMemo } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { Target } from "lucide-react";
import type { WeekStart } from "@/lib/dates/core";
import { useToday } from "@/lib/dates/useToday";
import { useGoals, useGoalLinks } from "@/features/goals/queries";
import { indexLinks, resolveProgress } from "@/features/goals/rollup";
import { GoalBreakdown } from "@/features/goals/GoalBreakdown";
import { weekStartISO } from "@/lib/dates/core";
import { useGoalActions } from "@/features/goals/mutations";
import {
  MAX_MONTH_TARGETS,
  periodLabel,
  periodStart,
} from "@/features/goals/period";
import { GoalList } from "@/features/goals/GoalList";
import { useMonthScores } from "@/features/score/rollups";
import { CARD_WIDTH } from "../defaultLayout";
import { NodeShell } from "./NodeShell";

export type MonthlyNodeData = { timezone: string; weekStartsOn: WeekStart };
export type MonthlyNodeType = Node<MonthlyNodeData, "monthly">;

/** Up to three concrete deliverables for the month, plus the month's score. */
export function MonthlyTargetNode({
  id,
  data,
  selected,
}: NodeProps<MonthlyNodeType>) {
  const today = useToday(data.timezone);
  const start = useMemo(
    () => periodStart("month", today, data.weekStartsOn),
    [today, data.weekStartsOn],
  );

  const { data: goals = [], isLoading } = useGoals("month", start);
  const actions = useGoalActions("month", start);
  const { data: rollup } = useMonthScores(start);

  // Weekly priorities that hang off these deliverables decide their progress.
  const goalIds = goals.map((g) => g.id);
  const { data: links } = useGoalLinks(goalIds);
  const linkIndex = useMemo(
    () => indexLinks(links?.children ?? [], links?.tasks ?? []),
    [links],
  );

  // Breaking a deliverable down creates weekly priorities for the current week.
  const weekStart = weekStartISO(today, data.weekStartsOn);
  const weekActions = useGoalActions("week", weekStart);

  return (
    <NodeShell
      title="Monthly Target"
      subtitle={periodLabel("month", start)}
      icon={<Target size={15} className="text-olive" />}
      width={CARD_WIDTH}
      nodeId={id}
      resizable
      minWidth={360}
      minHeight={240}
      selected={selected}
    >
      <div className="h-full space-y-3 overflow-y-auto wc-scroll bg-beige/40 p-3">
        {/* Month score */}
        <div className="rounded-lg border border-card-border bg-card p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-olive">
              Month score
            </span>
            <span className="text-lg font-semibold tabular-nums text-ink">
              {rollup?.average ?? 0}
              <span className="text-xs text-ink-faint">/100</span>
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-beige-200">
            <div
              className="h-full rounded-full bg-teal transition-[width]"
              style={{ width: `${rollup?.average ?? 0}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-ink-faint">
            {rollup?.daysLogged
              ? `${rollup.daysLogged} days logged · ${rollup.consistency}% cleared the bar`
              : "No days logged yet this month."}
          </p>
        </div>

        {isLoading && <p className="text-xs text-ink-faint">Loading…</p>}

        {actions.error && (
          <p className="rounded-md bg-danger-soft/60 px-2 py-1 text-[11px] text-danger">
            {actions.error}
          </p>
        )}

        <div>
          <h4 className="mb-1 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-olive">
            Deliverables
          </h4>
          <GoalList
            goals={goals}
            variant="progress"
            max={MAX_MONTH_TARGETS}
            emptyLabel="What will actually ship this month?"
            addLabel="Add a deliverable"
            onCreate={(title) => void actions.create(title)}
            onPatch={(goal, changes) => void actions.patch(goal, changes)}
            onRemove={(goal) => void actions.remove(goal)}
            progressFor={(goal) => resolveProgress(goal, linkIndex.get(goal.id))}
            renderFooter={(goal) => (
              <GoalBreakdown
                goal={goal}
                horizon="month"
                childLabel="weekly priorities"
                onAccept={async (titles) => {
                  for (const title of titles) {
                    await weekActions.create(title, null, goal.id);
                  }
                }}
              />
            )}
          />
        </div>
      </div>
    </NodeShell>
  );
}
