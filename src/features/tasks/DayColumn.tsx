"use client";

import { cn } from "@/lib/utils";
import { isWeekend, weekdayLong, weekdayShort, dayOfMonth } from "@/lib/dates/ranges";
import type { ISODate } from "@/lib/dates/core";
import type { Task } from "./types";
import { TaskCard } from "./TaskCard";
import { QuickAdd } from "./QuickAdd";
import type { DropTarget } from "./dnd/useCardDrag";

interface DayColumnProps {
  date: ISODate;
  tasks: Task[];
  isToday: boolean;
  dimmed: boolean;
  compact: boolean;
  showPopover: boolean;
  draggingId?: string;
  dropTarget: DropTarget | null;
  onAdd: (date: ISODate, title: string) => void;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onOpenDetails: (task: Task) => void;
  onRename: (task: Task, title: string) => void;
  onDragStart: (task: Task, e: React.PointerEvent) => void;
  onExpandDay: (date: ISODate) => void;
}

const MONTH_VISIBLE_LIMIT = 4;

export function DayColumn(props: DayColumnProps) {
  const {
    date,
    tasks,
    isToday,
    dimmed,
    compact,
    showPopover,
    draggingId,
    dropTarget,
    onAdd,
    onExpandDay,
  } = props;

  const weekend = isWeekend(date);

  const visible = compact ? tasks.slice(0, MONTH_VISIBLE_LIMIT) : tasks;
  const hiddenCount = tasks.length - visible.length;

  // Drop indicator line before the item at dropTarget.index.
  const targetIndex =
    dropTarget && dropTarget.date === date ? dropTarget.index : null;

  const remaining = tasks.filter((t) => !t.completed).length;

  return (
    <div
      data-column-date={date}
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[14px] border shadow-card",
        "border-card-border bg-tea/70",
        dimmed && "opacity-55",
        targetIndex !== null && "ring-2 ring-olive/60",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2",
          isToday ? "bg-teal text-ink" : "bg-tea",
        )}
      >
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "text-xs font-semibold uppercase tracking-wide",
              weekend ? "text-olive" : "text-ink-soft",
            )}
          >
            {compact ? weekdayShort(date) : weekdayLong(date)}
          </span>
          <span className="text-lg font-semibold leading-none text-ink">
            {dayOfMonth(date)}
          </span>
          {isToday && (
            <span className="rounded-full bg-olive px-1.5 py-0.5 text-[10px] font-medium uppercase text-beige">
              Today
            </span>
          )}
        </div>
        {remaining > 0 && (
          <span className="text-[11px] text-ink-faint">{remaining} left</span>
        )}
      </div>

      {/* Task list */}
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto wc-scroll px-2 py-2">
        {visible.map((task, i) => (
          <div key={task.id} className="relative">
            {targetIndex === i && <DropLine />}
            <TaskCard
              task={task}
              dragging={draggingId === task.id}
              showPopover={showPopover}
              onToggle={props.onToggle}
              onDelete={props.onDelete}
              onOpenDetails={props.onOpenDetails}
              onRename={props.onRename}
              onDragStart={props.onDragStart}
            />
          </div>
        ))}
        {targetIndex === visible.length && <DropLine />}

        {compact && hiddenCount > 0 && (
          <button
            type="button"
            data-no-pan
            onClick={() => onExpandDay(date)}
            className="mt-0.5 rounded-md px-2 py-1 text-left text-[11px] text-ink-soft hover:bg-tea"
          >
            +{hiddenCount} more
          </button>
        )}

        {tasks.length === 0 && !compact && (
          <p className="px-1 py-2 text-xs text-ink-faint">No tasks yet.</p>
        )}
      </div>

      {/* Quick add */}
      <div className="border-t border-card-border/60 px-2 py-2">
        <QuickAdd date={date} onAdd={onAdd} compact={compact} />
      </div>
    </div>
  );
}

function DropLine() {
  return <div className="mx-1 mb-1 h-[3px] rounded-full bg-olive" />;
}
