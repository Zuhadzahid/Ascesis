"use client";

import { useEffect, useState } from "react";
import { Check, PenLine } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

function isFontId(value: unknown): value is FontId {
  return FONT_CHOICES.some((f) => f.id === value);
}

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
  // Read whatever the bootstrap script already applied, so the picker agrees
  // with what is on screen rather than racing it.
  const [font, setFont] = useState<FontId>(() => {
    if (typeof document === "undefined") return DEFAULT_FONT;
    const current = document.documentElement.dataset.font;
    return isFontId(current) ? current : DEFAULT_FONT;
  });

  // Write the attribute if the bootstrap script did not. State already holds
  // the default, so only the document needs correcting.
  useEffect(() => {
    if (!isFontId(document.documentElement.dataset.font)) {
      applyFont(DEFAULT_FONT);
    }
  }, []);

  const choose = (id: FontId) => {
    setFont(id);
    applyFont(id);
  };

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger
            aria-label="Typeface"
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-full text-ink-soft transition-colors outline-none",
              "hover:bg-beige-200 hover:text-ink",
              "focus-visible:ring-2 focus-visible:ring-olive focus-visible:ring-offset-1 focus-visible:ring-offset-card",
              "data-[state=open]:bg-teal data-[state=open]:text-ink",
            )}
          >
            <PenLine size={16} />
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">
          <span className="font-medium">Typeface</span>
          <span className="mt-0.5 block text-chrome-fg/70">
            Changes the font across the whole app
          </span>
        </TooltipContent>
      </Tooltip>

      <PopoverContent side="top" className="w-56">
        <p className="px-2.5 py-1.5 text-[11px] font-medium tracking-wide text-ink-faint uppercase">
          Typeface
        </p>
        {FONT_CHOICES.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => choose(choice.id)}
            aria-pressed={font === choice.id}
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
      </PopoverContent>
    </Popover>
  );
}
