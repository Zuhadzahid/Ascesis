"use client";

import { useMemo } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { Compass } from "lucide-react";
import type { WeekStart } from "@/lib/dates/core";
import { useToday } from "@/lib/dates/useToday";
import { useGoals } from "@/features/goals/queries";
import { useGoalActions } from "@/features/goals/mutations";
import { DIMENSIONS, periodLabel, periodStart } from "@/features/goals/period";
import { GoalList } from "@/features/goals/GoalList";
import { CARD_WIDTH } from "../defaultLayout";
import { NodeShell } from "./NodeShell";

export type VisionNodeData = { timezone: string; weekStartsOn: WeekStart };
export type VisionNodeType = Node<VisionNodeData, "yearly">;

/**
 * The top of the hierarchy: one vision per life dimension for the year, each
 * with its own progress. Everything below (month, week, day) should ladder up
 * to these.
 */
export function YearlyVisionNode({
  id,
  data,
  selected,
}: NodeProps<VisionNodeType>) {
  const today = useToday(data.timezone);
  const start = useMemo(
    () => periodStart("year", today, data.weekStartsOn),
    [today, data.weekStartsOn],
  );

  const { data: goals = [], isLoading } = useGoals("year", start);
  const actions = useGoalActions("year", start);

  const overall = goals.length
    ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
    : 0;

  return (
    <NodeShell
      title="Yearly Vision"
      subtitle={`${periodLabel("year", start)} · ${overall}% overall`}
      icon={<Compass size={15} className="text-olive" />}
      width={CARD_WIDTH}
      nodeId={id}
      resizable
      minWidth={360}
      minHeight={240}
      selected={selected}
    >
      <div className="h-full space-y-3 overflow-y-auto wc-scroll bg-beige/40 p-3">
        {isLoading && <p className="text-xs text-ink-faint">Loading…</p>}

        {actions.error && (
          <p className="rounded-md bg-danger-soft/60 px-2 py-1 text-[11px] text-danger">
            {actions.error}
          </p>
        )}

        {DIMENSIONS.map((dim) => {
          const forDim = goals.filter((g) => g.dimension === dim.id);
          return (
            <section key={dim.id}>
              <h4 className="mb-1 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-olive">
                {dim.label}
              </h4>
              <GoalList
                goals={forDim}
                variant="progress"
                dimension={dim.id}
                emptyLabel="Nothing set yet."
                addLabel={`Add ${dim.label.toLowerCase()} vision`}
                onCreate={(title, dimension) =>
                  void actions.create(title, dimension)
                }
                onPatch={(goal, changes) => void actions.patch(goal, changes)}
                onRemove={(goal) => void actions.remove(goal)}
              />
            </section>
          );
        })}
      </div>
    </NodeShell>
  );
}
