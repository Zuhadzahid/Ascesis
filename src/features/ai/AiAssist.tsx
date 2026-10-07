"use client";

import { useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AiState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: T; provider: string }
  | { status: "error"; message: string; notConfigured: boolean };

/** Small button that kicks off an AI request. */
export function AiButton({
  label = "Draft with AI",
  loading,
  disabled,
  onClick,
  className,
}: {
  label?: string;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-teal-600/60 bg-tea/40 px-2.5 py-1.5 text-xs font-medium text-ink transition-colors hover:border-olive hover:bg-tea disabled:opacity-50",
        className,
      )}
    >
      <Sparkles size={13} className={cn(loading && "animate-pulse")} />
      {loading ? "Thinking…" : label}
    </button>
  );
}

/** Explains why nothing happened when no provider is set up. */
export function AiMessage({
  message,
  notConfigured,
  onDismiss,
}: {
  message: string;
  notConfigured: boolean;
  onDismiss?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg px-2.5 py-2 text-[11px]",
        notConfigured
          ? "bg-beige-200 text-ink-soft"
          : "bg-danger-soft/60 text-danger",
      )}
    >
      <Sparkles size={12} className="mt-0.5 shrink-0" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 opacity-60 hover:opacity-100"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

/**
 * A reviewable list of AI suggestions. Nothing is saved until the user picks
 * items and accepts, so the model proposes and the person decides.
 */
export function AiSuggestionList({
  items,
  provider,
  acceptLabel = "Add selected",
  onAccept,
  onDismiss,
}: {
  items: string[];
  provider: string;
  acceptLabel?: string;
  onAccept: (chosen: string[]) => void;
  onDismiss: () => void;
}) {
  const [chosen, setChosen] = useState<Set<number>>(
    () => new Set(items.map((_, i) => i)),
  );

  const toggle = (i: number) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="space-y-2 rounded-lg border border-teal-600/50 bg-beige-100 p-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-olive">
        <Sparkles size={12} />
        {provider} suggested these. Pick what you want.
      </p>

      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={`${i}-${item}`}>
            <button
              type="button"
              onClick={() => toggle(i)}
              className="flex w-full items-start gap-2 rounded-md bg-card px-2 py-1.5 text-left text-xs text-ink hover:bg-tea/40"
            >
              <span
                className={cn(
                  "mt-0.5 flex size-[15px] shrink-0 items-center justify-center rounded-[4px] border",
                  chosen.has(i)
                    ? "border-olive bg-olive text-beige"
                    : "border-teal-600",
                )}
              >
                {chosen.has(i) && <Check size={10} strokeWidth={3} />}
              </span>
              <span>{item}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-end gap-2 pt-0.5">
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md px-2 py-1 text-[11px] text-ink-soft hover:bg-beige-200"
        >
          Discard
        </button>
        <button
          type="button"
          disabled={chosen.size === 0}
          onClick={() => onAccept(items.filter((_, i) => chosen.has(i)))}
          className="rounded-md bg-olive px-2.5 py-1 text-[11px] font-semibold text-beige hover:bg-olive-700 disabled:opacity-50"
        >
          {acceptLabel}
        </button>
      </div>
    </div>
  );
}
