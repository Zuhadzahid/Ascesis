"use client";

import { Check, Palette } from "lucide-react";
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
import { THEMES } from "./themes";
import { useTheme } from "./useTheme";

/**
 * Theme switcher for the canvas toolbar.
 *
 * Each row previews itself: the swatch is drawn from the theme's own colours,
 * so you can see what you are choosing without applying it first.
 */
export function ThemePicker() {
  const [theme, setTheme] = useTheme();

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger
            aria-label="Colour theme"
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-full text-ink-soft transition-colors outline-none",
              "hover:bg-beige-200 hover:text-ink",
              "focus-visible:ring-2 focus-visible:ring-olive focus-visible:ring-offset-1 focus-visible:ring-offset-card",
              "data-[state=open]:bg-teal data-[state=open]:text-ink",
            )}
          >
            <Palette size={16} />
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">
          <span className="font-medium">Colour theme</span>
          <span className="mt-0.5 block text-chrome-fg/70">
            Recolours the whole app, header and footer included
          </span>
        </TooltipContent>
      </Tooltip>

      <PopoverContent side="top" className="w-60">
        <p className="px-2.5 py-1.5 text-[11px] font-medium tracking-wide text-ink-faint uppercase">
          Colour theme
        </p>

        {THEMES.map((option) => {
          const active = theme === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
              aria-pressed={active}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                active ? "bg-tea/70" : "hover:bg-beige-200",
              )}
            >
              <span
                aria-hidden
                className="flex size-7 shrink-0 overflow-hidden rounded-full border border-card-border"
              >
                {option.swatch.map((colour) => (
                  <span
                    key={colour}
                    className="h-full flex-1"
                    style={{ background: colour }}
                  />
                ))}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">
                  {option.label}
                </span>
                <span className="block truncate text-[11px] text-ink-faint">
                  {option.hint}
                </span>
              </span>

              {active && <Check size={14} className="shrink-0 text-olive" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
