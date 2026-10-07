"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ColumnBox } from "@/features/calendar/layout";
import type { ISODate } from "@/lib/dates/core";
import type { Task } from "../types";

export interface DropTarget {
  date: ISODate;
  index: number;
}

interface DragState {
  task: Task;
  pointer: { x: number; y: number };
  offset: { x: number; y: number }; // grab offset within the card, screen px
  width: number;
  target: DropTarget | null;
}

interface Options {
  containerRef: React.RefObject<HTMLElement | null>;
  columnsRef: React.RefObject<ColumnBox[]>;
  screenToWorld: (x: number, y: number) => { x: number; y: number };
  onMove: (task: Task, date: ISODate, index: number) => void;
}

const DRAG_THRESHOLD = 5; // px before a press becomes a drag

/**
 * Pointer-based drag for task cards. Because hit-testing is done in world
 * coordinates against known column boxes, it stays correct at any zoom — the
 * reason we don't use a rect-measuring DnD library inside a scaled container.
 */
export function useCardDrag({
  containerRef,
  columnsRef,
  screenToWorld,
  onMove,
}: Options) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // Update both the render state and the synchronous ref (safe: called from
  // event handlers, not during render) so pointerup always sees the latest.
  const applyDrag = useCallback((next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);

  const pending = useRef<{
    task: Task;
    startX: number;
    startY: number;
    offset: { x: number; y: number };
    width: number;
  } | null>(null);

  const columnAt = useCallback(
    (clientX: number, clientY: number): ColumnBox | null => {
      const w = screenToWorld(clientX, clientY);
      for (const box of columnsRef.current ?? []) {
        if (
          w.x >= box.x &&
          w.x <= box.x + box.w &&
          w.y >= box.y &&
          w.y <= box.y + box.h
        ) {
          return box;
        }
      }
      return null;
    },
    [columnsRef, screenToWorld],
  );

  const indexInColumn = useCallback(
    (date: ISODate, clientY: number, movingId: string): number => {
      const root = containerRef.current;
      if (!root) return 0;
      const cards = root.querySelectorAll<HTMLElement>(
        `[data-card][data-date="${date}"]`,
      );
      let idx = 0;
      for (const el of cards) {
        if (el.dataset.taskId === movingId) continue;
        const r = el.getBoundingClientRect();
        if (clientY > r.top + r.height / 2) idx++;
      }
      return idx;
    },
    [containerRef],
  );

  const computeTarget = useCallback(
    (task: Task, clientX: number, clientY: number): DropTarget | null => {
      const col = columnAt(clientX, clientY);
      if (!col) return null;
      return { date: col.date, index: indexInColumn(col.date, clientY, task.id) };
    },
    [columnAt, indexInColumn],
  );

  const startDrag = useCallback((task: Task, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const cardEl = (e.currentTarget as HTMLElement).closest(
      "[data-card]",
    ) as HTMLElement | null;
    const r = cardEl?.getBoundingClientRect();
    pending.current = {
      task,
      startX: e.clientX,
      startY: e.clientY,
      offset: r
        ? { x: e.clientX - r.left, y: e.clientY - r.top }
        : { x: 0, y: 0 },
      width: r?.width ?? 240,
    };
    e.stopPropagation();
  }, []);

  useEffect(() => {
    const onMoveEvt = (e: PointerEvent) => {
      const p = pending.current;
      if (p && !dragRef.current) {
        if (
          Math.hypot(e.clientX - p.startX, e.clientY - p.startY) < DRAG_THRESHOLD
        )
          return;
        applyDrag({
          task: p.task,
          pointer: { x: e.clientX, y: e.clientY },
          offset: p.offset,
          width: p.width,
          target: computeTarget(p.task, e.clientX, e.clientY),
        });
        return;
      }
      const d = dragRef.current;
      if (d) {
        e.preventDefault();
        applyDrag({
          ...d,
          pointer: { x: e.clientX, y: e.clientY },
          target: computeTarget(d.task, e.clientX, e.clientY),
        });
      }
    };

    const onUp = () => {
      const d = dragRef.current;
      if (d && d.target) onMove(d.task, d.target.date, d.target.index);
      pending.current = null;
      applyDrag(null);
    };

    window.addEventListener("pointermove", onMoveEvt, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMoveEvt);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [computeTarget, onMove, applyDrag]);

  return { drag, startDrag };
}
