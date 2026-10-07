"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import type { WeekStart } from "@/lib/dates/core";
import { useCanvasStore, positionOf } from "@/features/store/canvasStore";
import type { CanvasSnapshot } from "@/features/store/canvasSnapshot";
import { DEFAULT_EDGES, isNodeId, type NodeId } from "./defaultLayout";
import { EDGE_TYPES, NODE_TYPES } from "./nodes/nodeTypes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemePicker } from "@/features/theme/ThemePicker";
import { CanvasToolbar } from "./CanvasToolbar";
import { FontPicker } from "./FontPicker";
import { ToolPicker } from "./ToolPicker";
import { ToolModeProvider, toolRootClass, type ToolMode } from "./toolMode";
import { NODES_FOR_VIEW, parseViewTab } from "./views";
import { useCanvasSync } from "@/features/store/useCanvasSync";
import { AiAssistant } from "@/features/ai/AiAssistant";
import { useToday } from "@/lib/dates/useToday";

export interface PosCanvasProps {
  userId: string;
  timezone: string;
  weekStartsOn: WeekStart;
  /** Snapshot loaded server-side from profiles.canvas_state. */
  serverSnapshot: CanvasSnapshot | null;
}

function Canvas({
  userId,
  timezone,
  weekStartsOn,
  serverSnapshot,
}: PosCanvasProps) {
  const [tool, setTool] = useState<ToolMode>("select");
  const today = useToday(timezone);
  const params = useSearchParams();
  const tab = parseViewTab(params.get("tab"));
  const visibleNodes = NODES_FOR_VIEW[tab];

  const positions = useCanvasStore((s) => s.positions);
  const revision = useCanvasStore((s) => s.revision);
  const setPosition = useCanvasStore((s) => s.setPosition);
  const resetLayout = useCanvasStore((s) => s.resetLayout);

  useCanvasSync({ userId, serverSnapshot });

  const buildNodes = useCallback(
    (ids: readonly NodeId[]): Node[] =>
      ids.map((id) => ({
        id,
        type: id,
        position: positionOf(positions, id),
        dragHandle: ".pos-drag-handle",
        data: { timezone, weekStartsOn },
      })),
    // Positions are read at call time; later external changes come through the
    // revision effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timezone, weekStartsOn],
  );

  const initialNodes = useMemo(
    () => buildNodes(visibleNodes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  // The board node sizes itself from its content, so React Flow's own `fitView`
  // prop can run before anything has been measured and leave the canvas parked
  // off-screen. Fit once, after measurement.
  const nodesInitialized = useNodesInitialized();
  const { fitView } = useReactFlow();
  const hasFitted = useRef(false);
  useEffect(() => {
    if (!nodesInitialized || hasFitted.current) return;
    hasFitted.current = true;
    void fitView({ padding: 0.12, minZoom: 0.45, maxZoom: 1 });
  }, [nodesInitialized, fitView]);

  // Switching tab changes which cards are on the canvas, then refits.
  const tabRef = useRef(tab);
  useEffect(() => {
    if (tabRef.current === tab) return;
    tabRef.current = tab;
    setNodes(buildNodes(visibleNodes));
    const id = requestAnimationFrame(() =>
      fitView({ padding: 0.12, minZoom: 0.4, maxZoom: 1, duration: 250 }),
    );
    return () => cancelAnimationFrame(id);
  }, [tab, visibleNodes, buildNodes, setNodes, fitView]);

  // V and H switch tools, the way every canvas app does it.
  useEffect(() => {
    const SHORTCUTS: Record<string, ToolMode> = {
      v: "select",
      h: "hand",
    };
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      )
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const next = SHORTCUTS[e.key.toLowerCase()];
      if (next) setTool(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Re-seed positions when the store changes from outside the canvas
  // (server hydration or reset layout).
  useEffect(() => {
    if (revision === 0) return;
    setNodes((current) =>
      current.map((n) =>
        isNodeId(n.id) ? { ...n, position: positionOf(positions, n.id) } : n,
      ),
    );
    // positions is read through the store at the moment revision changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, setNodes]);

  // Persist a position once per drag, not per frame.
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      for (const change of changes) {
        if (
          change.type === "position" &&
          change.dragging === false &&
          change.position &&
          isNodeId(change.id)
        ) {
          setPosition(change.id, change.position);
        }
      }
    },
    [onNodesChange, setPosition],
  );

  // Only draw edges whose endpoints are both on the canvas.
  const edges = useMemo(() => {
    const present = new Set(nodes.map((n) => n.id));
    return DEFAULT_EDGES.filter(
      (e) => present.has(e.source) && present.has(e.target),
    );
  }, [nodes]);

  return (
    <ToolModeProvider value={tool}>
      <TooltipProvider>
        <div className={cn("absolute inset-0", toolRootClass(tool))}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            // Wheel pans, ctrl/cmd+wheel zooms — matches the previous canvas feel.
            panOnScroll
            zoomOnScroll={false}
            zoomOnPinch
            zoomOnDoubleClick={false}
            // Dragging empty canvas pans in both tools; with half a dozen cards
            // a selection box has little use, so it is behind Shift. The tools
            // differ over a card: select moves it by its header and resizes it
            // by its handles, hand pans straight across it and touches nothing.
            // Middle-drag and Space+drag pan too, so navigating never requires
            // a tool switch.
            panOnDrag
            selectionOnDrag={false}
            selectionKeyCode="Shift"
            selectionMode={SelectionMode.Partial}
            panActivationKeyCode="Space"
            nodesConnectable={false}
            nodesDraggable={tool === "select"}
            elevateNodesOnSelect
            minZoom={0.2}
            maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
          >
            {/* The dot colour is a theme token, so the grid follows the theme
              instead of staying olive on a dark background. */}
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1.4}
              color="var(--color-dot)"
            />
          </ReactFlow>

          <CanvasToolbar onResetLayout={resetLayout} />

          <AiAssistant today={today} weekStartsOn={weekStartsOn} />

          {/* Tool bar, bottom centre (tldraw-like): three tools, then the two
            appearance controls. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-3">
            <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-card-border bg-card/95 px-2 py-1.5 shadow-float backdrop-blur">
              <ToolPicker tool={tool} onChange={setTool} />
              <div className="mx-1 h-5 w-px bg-card-border" />
              <FontPicker />
              <ThemePicker />
            </div>
          </div>
        </div>
      </TooltipProvider>
    </ToolModeProvider>
  );
}

export default function PosCanvas(props: PosCanvasProps) {
  // `absolute inset-0` rather than `h-full`: React Flow measures its container
  // on mount and renders nothing if the height is still 0, which a percentage
  // height chain can be during the dynamic import swap.
  return (
    <div className="absolute inset-0 bg-beige">
      <ReactFlowProvider>
        <Canvas {...props} />
      </ReactFlowProvider>
    </div>
  );
}
