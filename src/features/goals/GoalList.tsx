"use client";

import { useState, type ReactNode } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GoalDimension } from "@/lib/supabase/database.types";
import type { Goal } from "./queries";
import type { ResolvedProgress } from "./rollup";

interface GoalListProps {
  goals: Goal[];
  /** "progress" shows a 0-100 slider; "check" shows a done toggle. */
  variant: "progress" | "check";
  max?: number;
  emptyLabel: string;
  addLabel: string;
  dimension?: GoalDimension;
  onCreate: (title: string, dimension?: GoalDimension | null) => void;
  onPatch: (goal: Goal, changes: { title?: string; progress?: number }) => void;
  onRemove: (goal: Goal) => void;
  /** When a goal owns children its progress is derived and read-only. */
  progressFor?: (goal: Goal) => ResolvedProgress;
  /** Extra controls under each goal, such as the breakdown button. */
  renderFooter?: (goal: Goal) => ReactNode;
}

export function GoalList({
  goals,
  variant,
  max,
  emptyLabel,
  addLabel,
  dimension,
  onCreate,
  onPatch,
  onRemove,
  progressFor,
  renderFooter,
}: GoalListProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const atCapacity = max !== undefined && goals.length >= max;

  const commit = () => {
    const value = draft.trim();
    if (value) onCreate(value, dimension ?? null);
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="space-y-1.5">
      {goals.length === 0 && !adding && (
        <p className="px-1 py-1 text-xs text-ink-faint">{emptyLabel}</p>
      )}

      {goals.map((goal) => (
        <GoalItem
          key={goal.id}
          goal={goal}
          variant={variant}
          resolved={progressFor?.(goal)}
          footer={renderFooter?.(goal)}
          onPatch={onPatch}
          onRemove={onRemove}
        />
      ))}

      {adding ? (
        <input
          autoFocus
          value={draft}
          placeholder="What are you aiming at?"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") {
              setDraft("");
              setAdding(false);
            }
          }}
          className="w-full rounded-lg border border-teal-600 bg-card px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-ink-faint"
        />
      ) : (
        !atCapacity && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-1.5 rounded-lg border border-dashed border-teal-600/60 px-2.5 py-1.5 text-xs text-ink-soft transition-colors hover:border-olive hover:bg-tea/40"
          >
            <Plus size={13} />
            {addLabel}
          </button>
        )
      )}

      {atCapacity && (
        <p className="px-1 text-[11px] text-ink-faint">
          {max} is the limit. Finish or drop one before adding another.
        </p>
      )}
    </div>
  );
}

function GoalItem({
  goal,
  variant,
  resolved,
  footer,
  onPatch,
  onRemove,
}: {
  goal: Goal;
  variant: "progress" | "check";
  resolved?: ResolvedProgress;
  footer?: ReactNode;
  onPatch: (goal: Goal, changes: { title?: string; progress?: number }) => void;
  onRemove: (goal: Goal) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal.title);
  const percent = resolved?.percent ?? goal.progress;
  const derived = resolved?.derived ?? false;
  const done = percent >= 100;

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== goal.title) {
      onPatch(goal, { title: draft });
    } else {
      setDraft(goal.title);
    }
  };

  return (
    <div className="group rounded-lg border border-card-border bg-card px-2.5 py-2">
      <div className="flex items-start gap-2">
        {variant === "check" && (
          <button
            type="button"
            aria-label={done ? "Mark not done" : "Mark done"}
            aria-pressed={done}
            onClick={() => onPatch(goal, { progress: done ? 0 : 100 })}
            className={cn(
              "mt-0.5 flex size-[17px] shrink-0 items-center justify-center rounded-[5px] border transition-colors",
              done
                ? "border-olive bg-olive text-beige"
                : "border-teal-600 hover:bg-tea",
            )}
          >
            {done && <Check size={11} strokeWidth={3} />}
          </button>
        )}

        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") {
                  setDraft(goal.title);
                  setEditing(false);
                }
              }}
              className="w-full rounded border border-teal-600 bg-beige-100 px-1 py-0.5 text-sm text-ink outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={cn(
                "block w-full break-words text-left text-sm leading-snug text-ink",
                done && variant === "check" && "text-ink-faint line-through",
              )}
            >
              {goal.title}
            </button>
          )}
        </div>

        <button
          type="button"
          aria-label="Delete"
          onClick={() => onRemove(goal)}
          className="mt-0.5 text-ink-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {variant === "progress" &&
        (derived ? (
          // Progress comes from the work below it, so the slider is gone: the
          // only honest way to move this number is to finish the children.
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-beige-200">
                <div
                  className="h-full rounded-full bg-teal transition-[width]"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-ink-soft">
                {percent}%
              </span>
            </div>
            {resolved?.source && (
              <p className="mt-1 text-[10px] text-ink-faint">
                {resolved.source}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={goal.progress}
              aria-label={`Progress for ${goal.title}`}
              onChange={(e) =>
                onPatch(goal, { progress: Number(e.target.value) })
              }
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-beige-200 accent-olive"
              style={{
                background: `linear-gradient(to right, var(--color-teal) 0%, var(--color-teal) ${goal.progress}%, var(--color-beige-200) ${goal.progress}%, var(--color-beige-200) 100%)`,
              }}
            />
            <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-ink-soft">
              {goal.progress}%
            </span>
          </div>
        ))}

      {variant === "check" && derived && resolved?.source && (
        <p className="mt-1.5 pl-[25px] text-[10px] text-ink-faint">
          {resolved.source}
        </p>
      )}

      {footer && <div className="mt-2 border-t border-card-border pt-1.5">{footer}</div>}
    </div>
  );
}
