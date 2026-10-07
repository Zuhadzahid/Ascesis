"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import {
  Handle,
  NodeResizeControl,
  Position,
  ResizeControlVariant,
  useStore,
  useUpdateNodeInternals,
} from "@xyflow/react";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { nodeBodyClass, useToolMode } from "../toolMode";
import { useCanvasStore } from "@/features/store/canvasStore";
import { isNodeId } from "../defaultLayout";
import { SizeMenu } from "./SizeMenu";

/**
 * Resize affordances. React Flow owns the maths because it alone knows the
 * viewport transform, so a drag at 45% zoom resizes by the right amount; only
 * the chrome is ours.
 */
const CORNERS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
] as const;
const EDGES = ["top", "right", "bottom", "left"] as const;

/**
 * The handles a selected card shows: four corner grips and four invisible edge
 * strips, the way Figma, Miro and tldraw draw a selection.
 *
 * Mounted only while the card is selected, so this is also the only thing on
 * the canvas that re-renders on zoom. It reads the zoom so the grips can scale
 * by its inverse and stay the same size on screen — a grip that shrinks to a
 * speck at 40% and balloons at 150% is what made the old ones feel cheap.
 */
function SelectionHandles({
  minWidth,
  minHeight,
  onLive,
  onCommit,
}: {
  minWidth: number;
  minHeight: number;
  onLive: (w: number, h: number) => void;
  onCommit: (w: number, h: number) => void;
}) {
  const zoom = useStore((s) => s.transform[2]);
  const style = { "--pos-inv-zoom": 1 / zoom } as CSSProperties;

  return (
    <div style={style} className="contents">
      {/* Edges: no visible chrome, just a wider grab strip and a cursor. */}
      {EDGES.map((edge) => (
        <NodeResizeControl
          key={edge}
          position={edge}
          minWidth={minWidth}
          minHeight={minHeight}
          onResize={(_, p) => onLive(p.width, p.height)}
          onResizeEnd={(_, p) => onCommit(p.width, p.height)}
          variant={ResizeControlVariant.Line}
          className={`pos-resize-edge pos-resize-edge--${edge}`}
        />
      ))}

      {/* Corners: a small square grip. */}
      {CORNERS.map((corner) => (
        <NodeResizeControl
          key={corner}
          position={corner}
          minWidth={minWidth}
          minHeight={minHeight}
          onResize={(_, p) => onLive(p.width, p.height)}
          onResizeEnd={(_, p) => onCommit(p.width, p.height)}
          className={`pos-resize-corner pos-resize-corner--${corner}`}
          style={{ background: "transparent", border: "none" }}
        >
          <span className="pos-grip" aria-hidden />
        </NodeResizeControl>
      ))}
    </div>
  );
}

/**
 * Shared chrome for every canvas card node: a draggable header, an optional
 * collapse toggle, and hidden connection handles for the hierarchy edges.
 *
 * Only the header carries `pos-drag-handle`, which the node registers as its
 * `dragHandle`. Everything else is `nodrag nopan` so inputs, scrolling and the
 * task drag-and-drop inside a node keep working.
 */
export function NodeShell({
  nodeId,
  title,
  subtitle,
  icon,
  width,
  resizable = false,
  minWidth = 300,
  minHeight = 180,
  collapsed = false,
  onToggleCollapsed,
  headerRight,
  selected,
  accent = "tea",
  children,
}: {
  /** Needed to persist a resize; omit for nodes that size themselves. */
  nodeId?: string;
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  width: number;
  resizable?: boolean;
  minWidth?: number;
  minHeight?: number;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  headerRight?: ReactNode;
  selected?: boolean;
  accent?: "tea" | "teal" | "olive";
  children: ReactNode;
}) {
  const tool = useToolMode();
  const bodyClass = nodeBodyClass(tool);
  const setSize = useCanvasStore((s) => s.setSize);
  const clearSize = useCanvasStore((s) => s.clearSize);
  const updateNodeInternals = useUpdateNodeInternals();
  const storedSize = useCanvasStore((s) =>
    nodeId && isNodeId(nodeId) ? s.sizes[nodeId] : undefined,
  );
  /** Live dimensions while dragging, so the badge can read out. */
  const [live, setLive] = useState<{ w: number; h: number } | null>(null);

  // Resize is part of selection, not a mode. Click a card and it alone shows
  // its handles; click away and they go. That is how every major canvas app
  // works, and it means the handles are never on a card you are not looking
  // at. The hand tool shows none, because it exists to touch nothing.
  const canResize = resizable && selected === true && tool === "select";

  const commitSize = (w: number, h: number) => {
    if (nodeId && isNodeId(nodeId)) {
      setSize(nodeId, { width: Math.round(w), height: Math.round(h) });
    }
    setLive(null);
  };

  const accentClass =
    accent === "teal"
      ? "bg-teal"
      : accent === "olive"
        ? "bg-olive text-beige"
        : "bg-tea";

  // A stored size wins over the card's natural width, so a card the user has
  // stretched stays stretched across reloads.
  const boxWidth = storedSize?.width ?? width;
  const boxHeight = storedSize?.height;

  return (
    <div
      style={{ width: boxWidth, height: boxHeight }}
      className={cn(
        "pos-card group/card relative flex flex-col overflow-visible rounded-2xl border bg-card shadow-card transition-shadow",
        selected ? "border-olive shadow-float" : "border-card-border",
        live && "pos-resizing",
      )}
    >
      {canResize && (
        <SelectionHandles
          minWidth={minWidth}
          minHeight={minHeight}
          onLive={(w, h) => setLive({ w, h })}
          onCommit={commitSize}
        />
      )}

      {/* Live size readout, only while dragging. */}
      {live && (
        <span className="pointer-events-none absolute -top-7 right-0 z-20 rounded-full bg-chrome px-2 py-0.5 text-[11px] font-medium text-chrome-fg tabular-nums shadow-float">
          {Math.round(live.w)} × {Math.round(live.h)}
        </span>
      )}

      <Handle type="target" position={Position.Top} className="!opacity-0" />

      {/* No cursor classes here on purpose. The header used to be permanently
          `cursor-grab`, which put a hand over every card even when the select
          tool was active and the rest of the canvas showed an arrow. Cursors
          now come from one place: the `pos-tool-*` rules in globals.css. */}
      <header
        className={cn(
          "pos-drag-handle flex items-center gap-2 px-3 py-2",
          accentClass,
        )}
      >
        <GripVertical
          size={14}
          className={accent === "olive" ? "text-beige/70" : "text-ink-faint"}
        />
        {icon}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-tight font-semibold">
            {title}
          </p>
          {subtitle && (
            <p
              className={cn(
                "truncate text-[11px] leading-tight",
                accent === "olive" ? "text-beige/80" : "text-ink-soft",
              )}
            >
              {subtitle}
            </p>
          )}
        </div>

        {headerRight && (
          <div className={cn(bodyClass, "flex items-center gap-1")}>
            {headerRight}
          </div>
        )}

        {canResize && nodeId && isNodeId(nodeId) && (
          <div className={cn(bodyClass, "shrink-0")}>
            <SizeMenu
              current={storedSize}
              minWidth={minWidth}
              minHeight={minHeight}
              onPick={(size) => {
                setSize(nodeId, size);
                updateNodeInternals(nodeId);
              }}
              onReset={() => {
                clearSize(nodeId);
                updateNodeInternals(nodeId);
              }}
            />
          </div>
        )}

        {onToggleCollapsed && (
          <button
            type="button"
            aria-label={collapsed ? "Expand" : "Collapse"}
            onClick={onToggleCollapsed}
            className={cn(
              bodyClass,
              "rounded-md p-1 text-ink-soft transition-colors hover:bg-beige-200/70",
            )}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
          </button>
        )}
      </header>

      {!collapsed && (
        <div className={cn(bodyClass, "min-h-0 flex-1 overflow-hidden")}>
          {children}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}
