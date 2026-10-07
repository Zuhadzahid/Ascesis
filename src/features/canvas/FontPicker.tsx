"use client";

import { useEffect, useState } from "react";
import { Check, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

export const FONT_CHOICES = [
  {
    id: "handwritten",
    label: "Handwritten",
    hint: "Playpen Sans",
    css: "var(--font-playpen), sans-serif",
  },
  {
    id: "clean",
    label: "Clean",
    hint: "Inter",
    css: "var(--font-inter), sans-serif",
  },
  {
    id: "serif",
    label: "Serif",
    hint: "Lora",
    css: "var(--font-lora), serif",
  },
  {
    id: "mono",
    label: "Mono",
    hint: "JetBrains Mono",
    css: "var(--font-jetbrains), monospace",
  },
] as const;

export type FontId = (typeof FONT_CHOICES)[number]["id"];

const STORAGE_KEY = "ascesis:font";
const DEFAULT_FONT: FontId = "handwritten";

function applyFont(id: FontId) {
  document.documentElement.dataset.font = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Private mode or storage disabled; the choice just will not persist.
  }
}

/**
 * Typeface switcher, in the spirit of tldraw's style panel: a pen button that
 * opens a short list of faces, each previewed in its own font. The choice is
 * applied to the whole app by swapping --font-sans on <html>.
 */
export function FontPicker() {
  const [open, setOpen] = useState(false);

  // Read whatever the inline bootstrap script already applied. This component
  // only ever renders on the client (the canvas is loaded with ssr: false), so
  // touching `document` in the initialiser is safe and avoids a flash.
  const [font, setFont] = useState<FontId>(() => {
    if (typeof document === "undefined") return DEFAULT_FONT;
    const current = document.documentElement.dataset.font as FontId | undefined;
    return current && FONT_CHOICES.some((f) => f.id === current)
      ? current
      : DEFAULT_FONT;
  });

  // Make sure the attribute exists even when nothing was stored.
  useEffect(() => {
    if (!document.documentElement.dataset.font) {
      document.documentElement.dataset.font = DEFAULT_FONT;
    }
  }, []);

  const choose = (id: FontId) => {
    setFont(id);
    applyFont(id);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Typeface"
        title="Typeface"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "rounded-full p-1.5 transition-colors",
          open
            ? "bg-teal text-ink"
            : "text-ink-soft hover:bg-beige-200 hover:text-ink",
        )}
      >
        <PenLine size={16} />
      </button>

      {open && (
        <>
          {/* Click-away layer */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute bottom-[calc(100%+10px)] left-1/2 z-40 w-52 -translate-x-1/2 rounded-xl border border-card-border bg-card p-1 shadow-float">
            <p className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
              Typeface
            </p>
            {FONT_CHOICES.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => choose(choice.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                  font === choice.id ? "bg-tea/70" : "hover:bg-beige-200",
                )}
              >
                <span className="min-w-0">
                  <span
                    className="block truncate text-sm text-ink"
                    style={{ fontFamily: choice.css }}
                  >
                    {choice.label}
                  </span>
                  <span className="block truncate text-[11px] text-ink-faint">
                    {choice.hint}
                  </span>
                </span>
                {font === choice.id && (
                  <Check size={14} className="shrink-0 text-olive" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
