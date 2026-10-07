"use client";

import { useRef, useState } from "react";
import { Check, GripVertical, StickyNote, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { checklistStats } from "./checklist";
import type { Task } from "./types";
import { DetailPopover } from "./DetailPopover";

interface TaskCardProps {
  task: Task;
  dragging?: boolean;
  showPopover: boolean; // suppressed at low zoom or while dragging
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onOpenDetails: (task: Task) => void;
  onRename: (task: Task, title: string) => void;
  onDragStart: (task: Task, e: React.PointerEvent) => void;
}

export function TaskCard({
  task,
  dragging,
  showPopover,
  onToggle,
  onDelete,
  onOpenDetails,
  onRename,
  onDragStart,
}: TaskCardProps) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const stats = checklistStats(task.details);

  const enter = () => {
    if (!showPopover) return;
    hoverTimer.current = setTimeout(() => setHovered(true), 300);
  };
  const leave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHovered(false);
  };

  const commitRename = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== task.title) onRename(task, draft);
    else setDraft(task.title);
  };

  return (
    <div
      ref={cardRef}
      data-card
      data-task-id={task.id}
      data-date={task.date}
      className={cn(
        "wc-pop group relative rounded-[10px] border bg-card px-2.5 py-2 shadow-card transition-colors",
        "border-card-border hover:border-teal",
        task.completed && "opacity-60",
        dragging && "opacity-30",
      )}
      onMouseEnter={enter}
      onMouseLeave={leave}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          type="button"
          aria-label="Drag task"
          data-no-pan
          onPointerDown={(e) => onDragStart(task, e)}
          className="mt-0.5 cursor-grab touch-none text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </button>

        {/* Checkbox */}
        <button
          type="button"
          aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
          aria-pressed={task.completed}
          onClick={() => onToggle(task)}
          className={cn(
            "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-colors",
            task.completed
              ? "border-olive bg-olive text-beige"
              : "border-teal-600 bg-transparent hover:bg-tea",
          )}
        >
          {task.completed && <Check size={12} strokeWidth={3} />}
        </button>

        {/* Title (click to edit; click note area to open details) */}
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              data-no-pan
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setDraft(task.title);
                  setEditing(false);
                }
              }}
              className="w-full rounded border border-teal-600 bg-beige-100 px-1 py-0.5 text-sm text-ink outline-none"
            />
          ) : (
            <button
              type="button"
              data-no-pan
              onDoubleClick={() => setEditing(true)}
              onClick={() => onOpenDetails(task)}
              className={cn(
                "block w-full break-words text-left text-sm leading-snug text-ink",
                task.completed && "line-through",
              )}
            >
              {task.title}
            </button>
          )}

          {/* Details indicator */}
          {task.hasDetails && (
            <button
              type="button"
              data-no-pan
              onClick={() => onOpenDetails(task)}
              className="mt-1 inline-flex items-center gap-1 rounded-full bg-beige-200 px-1.5 py-0.5 text-[11px] text-ink-soft transition-colors hover:bg-tea"
            >
              <StickyNote size={11} />
              {stats.total > 0 ? (
                <span>
                  {stats.done}/{stats.total}
                </span>
              ) : (
                <span>notes</span>
              )}
            </button>
          )}
        </div>

        {/* Delete */}
        <button
          type="button"
          aria-label="Delete task"
          data-no-pan
          onClick={() => onDelete(task)}
          className="mt-0.5 text-ink-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {hovered && task.hasDetails && task.details && (
        <DetailPopover details={task.details} />
      )}
    </div>
  );
}
