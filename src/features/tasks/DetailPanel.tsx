"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Eye, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { weekdayLong, monthDayLabel } from "@/lib/dates/ranges";
import { checklistStats, toggleChecklistItem } from "./checklist";
import { Markdown } from "./Markdown";
import type { Task } from "./types";
import { expandTaskDetails } from "@/features/ai/actions";
import { AiButton, AiMessage } from "@/features/ai/AiAssist";

interface DetailPanelProps {
  task: Task;
  onSave: (taskId: string, details: string) => void;
  onClose: () => void;
}

const DEBOUNCE_MS = 800;

/**
 * Right-side editor for a task's details. Writes are debounced (~800ms) and
 * flushed on blur, on close and when the tab is hidden, so typing never spams
 * the database but nothing is lost.
 */
export function DetailPanel({ task, onSave, onClose }: DetailPanelProps) {
  // The parent remounts this panel with key={task.id}, so state initialises
  // fresh for each task — no reset effect needed.
  const [draft, setDraft] = useState(task.details ?? "");
  const [tab, setTab] = useState<"write" | "preview">(
    task.details ? "preview" : "write",
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(task.details ?? "");
  const savedRef = useRef(task.details ?? "");

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (latest.current !== savedRef.current) {
      savedRef.current = latest.current;
      onSave(task.id, latest.current);
    }
  }, [onSave, task.id]);

  const schedule = useCallback(
    (next: string) => {
      latest.current = next;
      setDraft(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (latest.current !== savedRef.current) {
          savedRef.current = latest.current;
          onSave(task.id, latest.current);
        }
      }, DEBOUNCE_MS);
    },
    [onSave, task.id],
  );

  // Flush when the tab is hidden and on unmount.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [flush]);

  const close = () => {
    flush();
    onClose();
  };

  const toggleItem = (index: number) => {
    schedule(toggleChecklistItem(latest.current, index));
  };

  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<{ text: string; soft: boolean } | null>(
    null,
  );

  /** Expand the title into notes and a checklist, appended below anything there. */
  const expandWithAi = async () => {
    setAiBusy(true);
    setAiNote(null);
    const result = await expandTaskDetails(task.title, latest.current);
    setAiBusy(false);

    if (!result.ok) {
      setAiNote({
        text: result.message,
        soft: result.reason === "not_configured",
      });
      return;
    }

    const markdown = (result.data.markdown ?? "").trim();
    if (!markdown) return;
    const existing = latest.current.trim();
    schedule(existing ? `${existing}\n\n${markdown}` : markdown);
    setTab("preview");
  };

  const stats = checklistStats(draft);

  return (
    <div
      data-no-pan
      className="fixed bottom-9 right-0 top-14 z-[55] flex w-[360px] max-w-full flex-col border-l border-card-border bg-card shadow-float"
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-card-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {task.title}
          </p>
          <p className="text-xs text-ink-faint">
            {weekdayLong(task.date)}, {monthDayLabel(task.date)}
            {stats.total > 0 && (
              <>
                {" · "}
                {stats.done}/{stats.total} done
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close details"
          onClick={close}
          className="rounded-md p-1 text-ink-soft hover:bg-beige-200"
        >
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 pt-3">
        <TabButton active={tab === "write"} onClick={() => setTab("write")}>
          <Pencil size={13} /> Write
        </TabButton>
        <TabButton active={tab === "preview"} onClick={() => setTab("preview")}>
          <Eye size={13} /> Preview
        </TabButton>
        <AiButton
          label="Expand"
          loading={aiBusy}
          onClick={() => void expandWithAi()}
          className="ml-auto"
        />
      </div>
      {aiNote && (
        <div className="px-4 pt-2">
          <AiMessage
            message={aiNote.text}
            notConfigured={aiNote.soft}
            onDismiss={() => setAiNote(null)}
          />
        </div>
      )}

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto wc-scroll px-4 py-3">
        {tab === "write" ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => schedule(e.target.value)}
            onBlur={flush}
            placeholder={
              "Add notes in markdown…\n\n- [ ] a sub-task\n- [ ] another"
            }
            className="h-full min-h-[300px] w-full resize-none rounded-lg border border-card-border bg-beige-100 p-3 font-mono text-[13px] leading-relaxed text-ink outline-none focus:border-teal-600"
          />
        ) : draft.trim() ? (
          <div className="space-y-3">
            {stats.total > 0 && (
              <ChecklistEditor details={draft} onToggle={toggleItem} />
            )}
            <Markdown>{draft}</Markdown>
          </div>
        ) : (
          <p className="text-sm text-ink-faint">
            Nothing here yet. Switch to Write to add notes and sub-tasks.
          </p>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-teal text-ink"
          : "text-ink-soft hover:bg-beige-200",
      )}
    >
      {children}
    </button>
  );
}

/** Interactive checklist derived from the details markdown. */
function ChecklistEditor({
  details,
  onToggle,
}: {
  details: string;
  onToggle: (index: number) => void;
}) {
  const items: { label: string; checked: boolean }[] = [];
  let inFence = false;
  for (const line of details.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(\s*)([-*+])\s+\[([ xX])\]\s?(.*)$/.exec(line);
    if (m) items.push({ label: m[4], checked: m[3].toLowerCase() === "x" });
  }

  return (
    <div className="rounded-lg border border-card-border bg-beige-100 p-2">
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onToggle(i)}
          className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-sm text-ink hover:bg-tea/50"
        >
          <span
            className={cn(
              "flex size-[16px] shrink-0 items-center justify-center rounded border",
              item.checked
                ? "border-olive bg-olive text-beige"
                : "border-teal-600",
            )}
          >
            {item.checked && <Check size={11} strokeWidth={3} />}
          </span>
          <span className={cn(item.checked && "text-ink-faint line-through")}>
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}
