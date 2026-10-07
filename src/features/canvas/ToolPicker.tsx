"use client";

import { Hand, MousePointer2 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ToolMode } from "./toolMode";

const TOOLS: {
  id: ToolMode;
  label: string;
  hint: string;
  key: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "select",
    label: "Select",
    hint: "Click a card to select and resize it. Drag its header to move. Drag empty canvas to pan",
    key: "V",
    icon: <MousePointer2 size={16} />,
  },
  {
    id: "hand",
    label: "Hand",
    hint: "Drag anywhere to pan, even across a card. Nothing moves or resizes",
    key: "H",
    icon: <Hand size={16} />,
  },
];

/**
 * Cursor and hand tools, like tldraw's toolbar.
 *
 * A radio group rather than two buttons: exactly one tool is active, so Tab
 * reaches the group once and the arrow keys move between tools.
 */
export function ToolPicker({
  tool,
  onChange,
}: {
  tool: ToolMode;
  onChange: (tool: ToolMode) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={tool}
      // Radix fires an empty string when the active item is pressed again.
      // A canvas always has a tool, so that press is simply ignored.
      onValueChange={(next) => next && onChange(next as ToolMode)}
      aria-label="Canvas tool"
    >
      {TOOLS.map((t) => (
        <Tooltip key={t.id}>
          <TooltipTrigger asChild>
            <ToggleGroupItem value={t.id} aria-label={t.label}>
              {t.icon}
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="top">
            <span className="font-medium">{t.label}</span>
            <kbd className="ml-1.5 rounded bg-chrome-fg/15 px-1 py-0.5 text-[10px]">
              {t.key}
            </kbd>
            <span className="mt-0.5 block text-chrome-fg/70">{t.hint}</span>
          </TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  );
}
