"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { ISODate } from "@/lib/dates/core";

/**
 * Fast task entry at the foot of a column. Enter commits and keeps focus so
 * several tasks can be typed in a row; Escape blurs. Compact variant is used
 * in the dense month view.
 */
export function QuickAdd({
  date,
  onAdd,
  compact,
}: {
  date: ISODate;
  onAdd: (date: ISODate, title: string) => void;
  compact?: boolean;
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const commit = () => {
    const v = value.trim();
    if (v) {
      onAdd(date, v);
      setValue("");
    }
  };

  if (!open && !compact) {
    return (
      <button
        type="button"
        data-quickadd
        data-no-pan
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="flex w-full items-center gap-1.5 rounded-[10px] border border-dashed border-teal-600/60 px-2.5 py-2 text-sm text-ink-soft transition-colors hover:border-olive hover:bg-tea/40"
      >
        <Plus size={15} />
        Add task
      </button>
    );
  }

  return (
    <div data-quickadd data-no-pan className="relative">
      <input
        ref={inputRef}
        value={value}
        placeholder="What needs doing?"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            setValue("");
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
        onBlur={() => {
          commit();
          if (!compact) setOpen(false);
        }}
        className="w-full rounded-[10px] border border-teal-600 bg-card px-2.5 py-2 text-sm text-ink shadow-card outline-none placeholder:text-ink-faint focus:border-olive"
        autoFocus={compact ? false : open}
      />
    </div>
  );
}
