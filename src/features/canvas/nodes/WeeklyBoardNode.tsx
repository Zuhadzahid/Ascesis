"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  useReactFlow,
  useStore,
  useUpdateNodeInternals,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { LayoutGrid } from "lucide-react";
import type { WeekStart } from "@/lib/dates/core";
import { useToday } from "@/lib/dates/useToday";
import { useViewState } from "@/features/calendar/viewState";
import { computeLayout } from "@/features/calendar/layout";
import {
  monthDayLabel,
  monthYearLabel,
  rangeLabel,
  weekdayLong,
} from "@/lib/dates/ranges";
import { useTasks } from "@/features/tasks/queries";
import { useTaskActions } from "@/features/tasks/mutations";
import { useTaskSync } from "@/features/tasks/sync";
import { DayColumn } from "@/features/tasks/DayColumn";
import { DetailPanel } from "@/features/tasks/DetailPanel";
import { useCardDrag } from "@/features/tasks/dnd/useCardDrag";
import { BoardControls } from "@/features/calendar/BoardControls";
import { NodeShell } from "./NodeShell";
import { nodeBodyClass, useToolMode } from "../toolMode";

export type BoardNodeData = {
  timezone: string;
  weekStartsOn: WeekStart;
};
export type BoardNodeType = Node<BoardNodeData, "board">;

/**
 * The original seven-day task board, hosted as a canvas node.
 *
 * Two things make this work inside React Flow:
 *  - only the header is the drag handle, and the body is "nodrag nopan nowheel"
 *    so inputs, column scrolling and task drag-and-drop receive their events;
 *  - task hit-testing converts screen to board-local world coordinates using
 *    the rect of the board and the live zoom, so it stays correct at any zoom
 *    and wherever the node sits on the canvas.
 */
export function WeeklyBoardNode({
  id,
  data,
  selected,
}: NodeProps<BoardNodeType>) {
  const { timezone, weekStartsOn } = data;
  const qc = useQueryClient();
  useTaskSync(qc);

  const tool = useToolMode();
  const { getZoom } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  // Coarse selector: re-renders only when crossing the readability threshold,
  // not on every zoom tick.
  const zoomedIn = useStore((s) => s.transform[2] >= 0.6);

  const today = useToday(timezone);
  const { mode, anchor, setMode, goToday, openDay, step, buckets } =
    useViewState(today, weekStartsOn);

  const { byDate, isLoading } = useTasks(buckets);
  const actions = useTaskActions();

  const layout = useMemo(
    () => computeLayout(mode, anchor, weekStartsOn),
    [mode, anchor, weekStartsOn],
  );

  const columnsRef = useRef(layout.columns);
  useEffect(() => {
    columnsRef.current = layout.columns;
  }, [layout.columns]);

  // The node changes size when the view mode changes; tell React Flow so the
  // edges reattach in the right place.
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, layout.width, layout.height, updateNodeInternals]);

  const boardRef = useRef<HTMLDivElement | null>(null);

  /** Screen point to board-local world coordinates (what computeLayout uses). */
  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const el = boardRef.current;
      if (!el) return { x: 0, y: 0 };
      const r = el.getBoundingClientRect();
      const z = getZoom() || 1;
      return { x: (clientX - r.left) / z, y: (clientY - r.top) / z };
    },
    [getZoom],
  );

  const { drag, startDrag } = useCardDrag({
    containerRef: boardRef,
    columnsRef,
    screenToWorld,
    onMove: (task, date, index) => void actions.move(task, date, index),
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedTask = useMemo(() => {
    for (const list of byDate.values()) {
      const t = list.find((task) => task.id === selectedId);
      if (t) return t;
    }
    return null;
  }, [byDate, selectedId]);

  // Board-scoped keyboard shortcuts.
  useEffect(() => {
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
      switch (e.key) {
        case "t":
        case "T":
          goToday();
          break;
        case "[":
          step(-1);
          break;
        case "]":
          step(1);
          break;
        case "1":
          setMode("day");
          break;
        case "2":
          setMode("week");
          break;
        case "3":
          setMode("month");
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goToday, step, setMode]);

  const label = useMemo(() => {
    if (mode === "day")
      return `${weekdayLong(anchor)}, ${monthDayLabel(anchor)}`;
    if (mode === "week") {
      const first = layout.columns[0]?.date ?? anchor;
      const last = layout.columns.at(-1)?.date ?? anchor;
      return rangeLabel(first, last);
    }
    return monthYearLabel(anchor);
  }, [mode, anchor, layout.columns]);

  const showPopover = zoomedIn && !drag;
  const compact = mode === "month";
  const canPortal = typeof document !== "undefined";

  return (
    <>
      <NodeShell
        title="Weekly Board"
        subtitle={label}
        icon={<LayoutGrid size={15} className="text-olive" />}
        width={layout.width}
        selected={selected}
        headerRight={
          <BoardControls
            mode={mode}
            onMode={setMode}
            onPrev={() => step(-1)}
            onToday={goToday}
            onNext={() => step(1)}
          />
        }
      >
        <div
          ref={boardRef}
          className={`${nodeBodyClass(tool)} relative bg-beige/40`}
          style={{ width: layout.width, height: layout.height }}
        >
          {isLoading && (
            <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center">
              <span className="rounded-full bg-card/90 px-3 py-1 text-xs text-ink-soft shadow-card">
                Loading tasks…
              </span>
            </div>
          )}

          {layout.columns.map((box) => (
            <div
              key={`${box.date}@${box.x},${box.y}`}
              className="absolute"
              style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
            >
              <DayColumn
                date={box.date}
                tasks={byDate.get(box.date) ?? []}
                isToday={box.date === today}
                dimmed={box.dimmed}
                compact={compact}
                showPopover={showPopover}
                draggingId={drag?.task.id}
                dropTarget={drag?.target ?? null}
                onAdd={(d, title) => void actions.create(d, title)}
                onToggle={(t) => void actions.toggle(t)}
                onDelete={(t) => void actions.remove(t)}
                onOpenDetails={(t) => setSelectedId(t.id)}
                onRename={(t, title) => void actions.rename(t, title)}
                onDragStart={startDrag}
                onExpandDay={openDay}
              />
            </div>
          ))}
        </div>
      </NodeShell>

      {/* Overlays render outside the transformed viewport, or CSS containment
          would misplace their fixed positioning. */}
      {canPortal &&
        drag &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[60] rounded-[10px] border border-teal bg-card px-2.5 py-2 text-sm text-ink shadow-float"
            style={{
              left: drag.pointer.x - drag.offset.x,
              top: drag.pointer.y - drag.offset.y,
              width: drag.width,
            }}
          >
            <span className="line-clamp-2">{drag.task.title}</span>
          </div>,
          document.body,
        )}

      {canPortal &&
        selectedTask &&
        createPortal(
          <DetailPanel
            key={selectedTask.id}
            task={selectedTask}
            onSave={(taskId, details) =>
              void actions.saveDetails(taskId, details)
            }
            onClose={() => setSelectedId(null)}
          />,
          document.body,
        )}
    </>
  );
}
