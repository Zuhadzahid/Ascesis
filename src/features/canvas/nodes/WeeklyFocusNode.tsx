"use client";

import { useMemo } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { ListChecks } from "lucide-react";
import type { WeekStart } from "@/lib/dates/core";
import { useToday } from "@/lib/dates/useToday";
import { useGoals, useGoalLinks } from "@/features/goals/queries";
import { indexLinks, resolveProgress } from "@/features/goals/rollup";
import { GoalBreakdown } from "@/features/goals/GoalBreakdown";
import { useTaskActions } from "@/features/tasks/mutations";
import { WeeklyReview } from "@/features/score/WeeklyReview";
import { useGoalActions } from "@/features/goals/mutations";
import {
  MAX_WEEK_PRIORITIES,
  periodLabel,
  periodStart,
} from "@/features/goals/period";
import { GoalList } from "@/features/goals/GoalList";
import { CARD_WIDTH } from "../defaultLayout";
import { NodeShell } from "./NodeShell";

export type WeeklyNodeData = { timezone: string; weekStartsOn: WeekStart };
export type WeeklyNodeType = Node<WeeklyNodeData, "weeklyFocus">;

/**
 * Three priorities, and only three. The cap is the point: it forces a choice
 * instead of letting the week fill up with everything.
 */
export function WeeklyFocusNode({
  id,
  data,
  selected,
}: NodeProps<WeeklyNodeType>) {
  const today = useToday(data.timezone);
  const start = useMemo(
    () => periodStart("week", today, data.weekStartsOn),
    [today, data.weekStartsOn],
  );

  const { data: goals = [], isLoading } = useGoals("week", start);
  const actions = useGoalActions("week", start);

  const goalIds = goals.map((g) => g.id);
  const { data: links } = useGoalLinks(goalIds);
  const linkIndex = useMemo(
    () => indexLinks(links?.children ?? [], links?.tasks ?? []),
    [links],
  );
  const taskActions = useTaskActions();

  const done = goals.filter(
    (g) => resolveProgress(g, linkIndex.get(g.id)).percent >= 100,
  ).length;

  return (
    <NodeShell
      title="Weekly Focus"
      subtitle={`${periodLabel("week", start)} · ${done}/${goals.length || 0} done`}
      icon={<ListChecks size={15} className="text-olive" />}
      width={CARD_WIDTH}
      nodeId={id}
      resizable
      minWidth={360}
      minHeight={200}
      selected={selected}
    >
      <div className="h-full space-y-3 overflow-y-auto wc-scroll bg-beige/40 p-3">
        {isLoading && <p className="text-xs text-ink-faint">Loading…</p>}

        {actions.error && (
          <p className="rounded-md bg-danger-soft/60 px-2 py-1 text-[11px] text-danger">
            {actions.error}
          </p>
        )}

        <div>
          <h4 className="mb-1 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-olive">
            Priorities this week
          </h4>
          <GoalList
            goals={goals}
            variant="check"
            max={MAX_WEEK_PRIORITIES}
            emptyLabel="Pick the three things that matter most."
            addLabel="Add a priority"
            onCreate={(title) => void actions.create(title)}
            onPatch={(goal, changes) => void actions.patch(goal, changes)}
            onRemove={(goal) => void actions.remove(goal)}
            progressFor={(goal) => resolveProgress(goal, linkIndex.get(goal.id))}
            renderFooter={(goal) => (
              <GoalBreakdown
                goal={goal}
                horizon="week"
                childLabel="tasks for today"
                onAccept={async (titles) => {
                  for (const title of titles) {
                    await taskActions.create(today, title, goal.id);
                  }
                }}
              />
            )}
          />
        </div>

        <div className="border-t border-card-border pt-3">
          <WeeklyReview
            weekStart={start}
            today={today}
            priorities={goals}
            prioritiesDone={
              new Set(
                goals
                  .filter(
                    (g) => resolveProgress(g, linkIndex.get(g.id)).percent >= 100,
                  )
                  .map((g) => g.id),
              )
            }
          />
        </div>
      </div>
    </NodeShell>
  );
}
