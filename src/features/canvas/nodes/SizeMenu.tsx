"use client";

import { useState } from "react";
import { Check, RotateCcw, Scaling } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Four sizes that cover the realistic uses of a card: glanceable, default,
 * roomy, and "this is the one I work in". Dragging a corner still gives any
 * size in between; these just remove the fiddling for the common cases.
 */
export const SIZE_PRESETS = [
  { id: "s", label: "S", hint: "Compact", width: 360, height: 280 },
  { id: "m", label: "M", hint: "Default", width: 440, height: 400 },
  { id: "l", label: "L", hint: "Roomy", width: 560, height: 560 },
  { id: "xl", label: "XL", hint: "Focus", width: 720, height: 720 },
] as const;

export type SizePresetId = (typeof SIZE_PRESETS)[number]["id"];

export function SizeMenu({
  current,
  minWidth,
  minHeight,
  onPick,
  onReset,
}: {
  current?: { width: number; height: number };
  minWidth: number;
  minHeight: number;
  onPick: (size: { width: number; height: number }) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);

  // A preset must never take a card below the size its content needs.
  const clamp = (p: (typeof SIZE_PRESETS)[number]) => ({
    width: Math.max(minWidth, p.width),
    height: Math.max(minHeight, p.height),
  });

  const activeId = current
    ? SIZE_PRESETS.find((p) => {
        const c = clamp(p);
        return c.width === current.width && c.height === current.height;
      })?.id
    : undefined;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Card size"
        title="Card size"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "rounded-md p-1 transition-colors",
          open
            ? "bg-beige-200/80 text-ink"
            : "text-ink-soft hover:bg-beige-200/70 hover:text-ink",
        )}
      >
        <Scaling size={14} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-44 rounded-xl border border-card-border bg-card p-1 text-ink shadow-float">
            <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
              Card size
            </p>

            {SIZE_PRESETS.map((preset) => {
              const size = clamp(preset);
              const active = activeId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onPick(size);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors",
                    active ? "bg-tea/70" : "hover:bg-beige-200",
                  )}
                >
                  <span className="w-6 shrink-0 text-xs font-semibold">
                    {preset.label}
                  </span>
                  <span className="flex-1 text-[11px] text-ink-soft">
                    {preset.hint}
                  </span>
                  <span className="text-[10px] tabular-nums text-ink-faint">
                    {size.width}×{size.height}
                  </span>
                  {active && <Check size={12} className="shrink-0 text-olive" />}
                </button>
              );
            })}

            <div className="my-1 h-px bg-card-border" />

            <button
              type="button"
              onClick={() => {
                onReset();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] text-ink-soft transition-colors hover:bg-beige-200 hover:text-ink"
            >
              <RotateCcw size={12} />
              Reset to default
            </button>
          </div>
        </>
      )}
    </div>
  );
}
