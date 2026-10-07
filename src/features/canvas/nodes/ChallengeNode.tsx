"use client";

import { useState } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { Flame } from "lucide-react";
import type { WeekStart } from "@/lib/dates/core";
import { useToday } from "@/lib/dates/useToday";
import {
  challengeProgress,
  useActiveChallenge,
} from "@/features/challenges/queries";
import { useChallengeActions } from "@/features/challenges/mutations";
import { ChallengeEditor } from "@/features/challenges/ChallengeEditor";
import { useDailyLog } from "@/features/today/queries";
import { useStreak } from "@/features/score/rollups";
import { CARD_WIDTH } from "../defaultLayout";
import { NodeShell } from "./NodeShell";

export type ChallengeNodeData = { timezone: string; weekStartsOn: WeekStart };
export type ChallengeNodeType = Node<ChallengeNodeData, "challenge">;

/**
 * The Monk Mode protocol: a fixed arc with non-negotiable rules, a streak, and
 * how far through it you are.
 */
export function ChallengeNode({ id, data, selected }: NodeProps<ChallengeNodeType>) {
  const today = useToday(data.timezone);
  const { data: challenge, isLoading } = useActiveChallenge(today);
  const { data: log } = useDailyLog(today);
  const { data: streak } = useStreak(today);
  const actions = useChallengeActions(today);
  const [editing, setEditing] = useState(false);

  const progress = challenge ? challengeProgress(challenge, today) : null;
  const doneToday = log?.completedRuleIds ?? [];

  return (
    <>
      <NodeShell
        title="Monk Mode"
        subtitle={
          challenge
            ? `Day ${progress?.dayNumber} of ${progress?.totalDays}`
            : "No arc running"
        }
        icon={<Flame size={15} className="text-beige" />}
        width={CARD_WIDTH}
        nodeId={id}
        resizable
        minWidth={360}
        minHeight={260}
        selected={selected}
        accent="olive"
      >
        <div className="h-full space-y-3 overflow-y-auto wc-scroll bg-beige/40 p-3">
          {isLoading && <p className="text-xs text-ink-faint">Loading…</p>}

          {!isLoading && !challenge && (
            <div className="rounded-lg border border-dashed border-teal-600/60 p-4 text-center">
              <p className="text-sm font-medium text-ink">
                Nothing running right now.
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                Pick a 30, 60 or 90 day window and the rules you will not break.
              </p>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="mt-3 rounded-lg bg-olive px-4 py-2 text-sm font-semibold text-beige shadow-card hover:bg-olive-700"
              >
                Start an arc
              </button>
            </div>
          )}

          {challenge && progress && (
            <>
              <div className="rounded-lg border border-card-border bg-card p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-ink">
                    {challenge.title}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-ink-soft">
                    {progress.percent}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-beige-200">
                  <div
                    className="h-full rounded-full bg-olive transition-[width]"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-ink-faint">
                  {progress.daysLeft === 0
                    ? "Final day."
                    : `${progress.daysLeft} days left.`}
                </p>
                {challenge.objective && (
                  <p className="mt-2 border-t border-card-border pt-2 text-xs text-ink-soft">
                    {challenge.objective}
                  </p>
                )}
              </div>

              {/* Streak */}
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-lg border border-card-border bg-card px-3 py-2">
                  <Flame size={16} className="text-olive" />
                  <span className="text-lg font-semibold tabular-nums text-ink">
                    {streak?.current ?? 0}
                  </span>
                  <span className="text-[11px] text-ink-soft">day streak</span>
                </div>
                <div className="rounded-lg border border-card-border bg-card px-3 py-2 text-center">
                  <span className="block text-sm font-semibold tabular-nums text-ink">
                    {streak?.longest ?? 0}
                  </span>
                  <span className="text-[10px] text-ink-faint">best</span>
                </div>
              </div>

              {/* Today's rule status, read-only here; toggled on the Today card */}
              <div>
                <h4 className="mb-1 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-olive">
                  Non-negotiables
                </h4>
                <ul className="space-y-1">
                  {challenge.rules.map((rule) => {
                    const done = doneToday.includes(rule.id);
                    return (
                      <li
                        key={rule.id}
                        className="flex items-center gap-2 rounded-md bg-card px-2.5 py-1.5 text-xs"
                      >
                        <span
                          className={`size-1.5 shrink-0 rounded-full ${
                            done ? "bg-olive" : "bg-teal-600/40"
                          }`}
                        />
                        <span
                          className={
                            done ? "text-ink-faint line-through" : "text-ink"
                          }
                        >
                          {rule.text}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => void actions.end(challenge)}
                className="w-full rounded-lg border border-card-border px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-danger hover:text-danger"
              >
                End this arc
              </button>

              {actions.error && (
                <p className="rounded-md bg-danger-soft/60 px-2 py-1 text-[11px] text-danger">
                  {actions.error}
                </p>
              )}
            </>
          )}
        </div>
      </NodeShell>

      {editing && (
        <ChallengeEditor today={today} onClose={() => setEditing(false)} />
      )}
    </>
  );
}
