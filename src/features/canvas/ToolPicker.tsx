"use client";

import { Hand, MousePointer2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolMode } from "./toolMode";

const TOOLS: {
  id: ToolMode;
  label: string;
  hint: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "select",
    label: "Select",
    hint: "Move cards, drag a box to select (V)",
    icon: <MousePointer2 size={16} />,
  },
  {
    id: "hand",
    label: "Hand",
    hint: "Drag anywhere to pan (H). Space+drag also works",
    icon: <Hand size={16} />,
  },
];

/** Cursor and hand tools, like tldraw's toolbar. */
export function ToolPicker({
  tool,
  onChange,
}: {
  tool: ToolMode;
  onChange: (tool: ToolMode) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-label={t.label}
          aria-pressed={tool === t.id}
          title={`${t.label} — ${t.hint}`}
          onClick={() => onChange(t.id)}
          className={cn(
            "rounded-full p-1.5 transition-colors",
            tool === t.id
              ? "bg-teal text-ink"
              : "text-ink-soft hover:bg-beige-200 hover:text-ink",
          )}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
}
