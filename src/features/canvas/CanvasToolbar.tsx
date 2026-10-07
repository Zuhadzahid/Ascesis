"use client";

import { useReactFlow, useStore } from "@xyflow/react";
import { Crosshair, Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { NODE_IDS } from "./defaultLayout";

/**
 * Viewport controls for the whole canvas. View-mode and date navigation live in
 * the Weekly Board header instead, since they only affect that node.
 */
export function CanvasToolbar({ onResetLayout }: { onResetLayout: () => void }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const zoomPct = useStore((s) => Math.round(s.transform[2] * 100));

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-3">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-card-border bg-card/95 px-2 py-1.5 shadow-float backdrop-blur">
        <IconButton
          label="Focus today"
          onClick={() =>
            void fitView({
              nodes: [{ id: NODE_IDS.today }, { id: NODE_IDS.board }],
              padding: 0.12,
              minZoom: 0.45,
              maxZoom: 1,
              duration: 300,
            })
          }
        >
          <Crosshair size={16} />
        </IconButton>

        <IconButton
          label="Fit to view"
          onClick={() =>
            void fitView({ padding: 0.12, minZoom: 0.35, duration: 300 })
          }
        >
          <Maximize2 size={15} />
        </IconButton>

        <div className="mx-1 h-5 w-px bg-card-border" />

        <IconButton label="Zoom out" onClick={() => void zoomOut()}>
          <Minus size={16} />
        </IconButton>
        <span className="w-10 text-center text-[11px] tabular-nums text-ink-soft">
          {zoomPct}%
        </span>
        <IconButton label="Zoom in" onClick={() => void zoomIn()}>
          <Plus size={16} />
        </IconButton>

        <div className="mx-1 h-5 w-px bg-card-border" />

        <IconButton label="Reset layout" onClick={onResetLayout}>
          <RotateCcw size={15} />
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded-full p-1.5 text-ink-soft transition-colors hover:bg-beige-200 hover:text-ink"
    >
      {children}
    </button>
  );
}
