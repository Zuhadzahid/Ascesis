"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode } from "./viewState";

const MODES: { value: ViewMode; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

/**
 * Day/Week/Month plus date navigation. Lives in the Weekly Board node header
 * (the canvas toolbar keeps only viewport controls).
 */
export function BoardControls({
  mode,
  onMode,
  onPrev,
  onToday,
  onNext,
}: {
  mode: ViewMode;
  onMode: (m: ViewMode) => void;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-full bg-beige-200/80 p-0.5">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => onMode(m.value)}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
              mode === m.value
                ? "bg-card text-ink shadow-sm"
                : "text-ink-soft hover:text-ink",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          aria-label="Previous"
          onClick={onPrev}
          className="rounded-full p-1 text-ink-soft transition-colors hover:bg-beige-200/70 hover:text-ink"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={onToday}
          className="rounded-full px-2 py-0.5 text-xs font-medium text-ink-soft transition-colors hover:bg-beige-200/70 hover:text-ink"
        >
          Today
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={onNext}
          className="rounded-full p-1 text-ink-soft transition-colors hover:bg-beige-200/70 hover:text-ink"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
