"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { Check, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeekStart } from "@/lib/dates/core";
import { useToday } from "@/lib/dates/useToday";
import { monthDayLabel, weekdayLong } from "@/lib/dates/ranges";
import { useActiveChallenge } from "@/features/challenges/queries";
import { useDailyLog } from "@/features/today/queries";
import { useDailyLogActions } from "@/features/today/mutations";
import { CARD_WIDTH } from "../defaultLayout";
import { NodeShell } from "./NodeShell";

export type TodayNodeData = { timezone: string; weekStartsOn: WeekStart };
export type TodayNodeType = Node<TodayNodeData, "today">;

const SAVE_DEBOUNCE_MS = 800;

/**
 * The day's execution card: one objective, the rules in force, and an honest
 * rating at the end. These three feed the Daily Score.
 */
export function TodayNode({ id, data, selected }: NodeProps<TodayNodeType>) {
  const today = useToday(data.timezone);
  const { data: challenge } = useActiveChallenge(today);
  const { data: log } = useDailyLog(today);
  const actions = useDailyLogActions(today, challenge ?? null);

  const score = log?.dailyScore ?? 0;
  const rules = challenge?.rules ?? [];
  const completed = log?.completedRuleIds ?? [];

  return (
    <NodeShell
      title="Today"
      subtitle={`${weekdayLong(today)}, ${monthDayLabel(today)}`}
      icon={<Sun size={15} className="text-ink" />}
      width={CARD_WIDTH}
      nodeId={id}
      resizable
      minWidth={360}
      minHeight={300}
      selected={selected}
      accent="teal"
    >
      <div className="h-full space-y-3 overflow-y-auto wc-scroll bg-beige/40 p-3">
        {/* Score */}
        <div className="rounded-lg border border-card-border bg-card p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-olive">
              Daily score
            </span>
            <span className="text-2xl font-semibold tabular-nums text-ink">
              {Math.round(score)}
              <span className="text-xs text-ink-faint">/100</span>
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-beige-200">
            <div
              className="h-full rounded-full bg-teal transition-[width]"
              style={{ width: `${Math.min(100, score)}%` }}
            />
          </div>
        </div>

        {/* Main objective */}
        <DebouncedField
          label="Main objective"
          placeholder="The one thing that makes today count"
          value={log?.mainObjective ?? ""}
          onSave={(v) => void actions.setObjective(v)}
        />

        {/* Rules */}
        <div>
          <h4 className="mb-1 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-olive">
            Non-negotiables
          </h4>
          {rules.length === 0 ? (
            <p className="rounded-lg border border-dashed border-teal-600/50 px-2.5 py-2 text-xs text-ink-faint">
              No arc running. Start one on the Monk Mode card and your rules
              appear here every day.
            </p>
          ) : (
            <ul className="space-y-1">
              {rules.map((rule) => {
                const done = completed.includes(rule.id);
                return (
                  <li key={rule.id}>
                    <button
                      type="button"
                      onClick={() => void actions.toggleRule(rule.id)}
                      aria-pressed={done}
                      className="flex w-full items-center gap-2 rounded-lg border border-card-border bg-card px-2.5 py-2 text-left transition-colors hover:border-teal"
                    >
                      <span
                        className={cn(
                          "flex size-[17px] shrink-0 items-center justify-center rounded-[5px] border transition-colors",
                          done
                            ? "border-olive bg-olive text-beige"
                            : "border-teal-600",
                        )}
                      >
                        {done && <Check size={11} strokeWidth={3} />}
                      </span>
                      <span
                        className={cn(
                          "text-sm",
                          done ? "text-ink-faint line-through" : "text-ink",
                        )}
                      >
                        {rule.text}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Deep work progress (logged by the timer, phase 12) */}
        {log && log.deepWorkTargetMinutes > 0 && (
          <div className="rounded-lg border border-card-border bg-card p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-olive">
                Deep work
              </span>
              <span className="text-xs tabular-nums text-ink-soft">
                {log.deepWorkMinutes} / {log.deepWorkTargetMinutes} min
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-beige-200">
              <div
                className="h-full rounded-full bg-olive transition-[width]"
                style={{
                  width: `${Math.min(
                    100,
                    (log.deepWorkMinutes / log.deepWorkTargetMinutes) * 100,
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Evening review */}
        <div className="rounded-lg border border-card-border bg-card p-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-olive">
            Evening review
          </h4>
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
              const active = (log?.eveningRating ?? 0) >= n;
              return (
                <button
                  key={n}
                  type="button"
                  aria-label={`Rate ${n} out of 10`}
                  onClick={() =>
                    void actions.setRating(log?.eveningRating === n ? null : n)
                  }
                  className={cn(
                    "h-6 flex-1 rounded-[4px] border text-[10px] transition-colors",
                    active
                      ? "border-olive bg-teal text-ink"
                      : "border-card-border bg-beige-100 text-ink-faint hover:border-teal-600",
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <div className="mt-2">
            <DebouncedField
              placeholder="What actually happened today?"
              value={log?.reflectionText ?? ""}
              onSave={(v) => void actions.setReflection(v)}
              multiline
            />
          </div>
        </div>
      </div>
    </NodeShell>
  );
}

/**
 * Text input that saves on a debounce and flushes on blur, so typing never
 * spams the database but nothing is lost.
 */
function DebouncedField({
  label,
  value,
  placeholder,
  onSave,
  multiline,
}: {
  label?: string;
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
  multiline?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(value);
  const saved = useRef(value);
  const dirty = useRef(false);

  // Adopt server changes only while the user is not mid-edit.
  useEffect(() => {
    if (!dirty.current && value !== latest.current) {
      latest.current = value;
      saved.current = value;
      setDraft(value);
    }
  }, [value]);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (latest.current !== saved.current) {
      saved.current = latest.current;
      onSave(latest.current);
    }
    dirty.current = false;
  }, [onSave]);

  const change = (next: string) => {
    dirty.current = true;
    latest.current = next;
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
  };

  useEffect(() => () => flush(), [flush]);

  const shared =
    "w-full rounded-lg border border-card-border bg-beige-100 px-2.5 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-teal-600";

  return (
    <div>
      {label && (
        <h4 className="mb-1 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-olive">
          {label}
        </h4>
      )}
      {multiline ? (
        <textarea
          rows={2}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => change(e.target.value)}
          onBlur={flush}
          className={`${shared} resize-none`}
        />
      ) : (
        <input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => change(e.target.value)}
          onBlur={flush}
          className={shared}
        />
      )}
    </div>
  );
}
