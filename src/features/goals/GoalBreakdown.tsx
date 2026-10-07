"use client";

import { useState } from "react";
import { GitBranch } from "lucide-react";
import { breakDownGoal } from "@/features/ai/actions";
import { AiMessage, AiSuggestionList } from "@/features/ai/AiAssist";
import type { Goal } from "./queries";

/**
 * Breaks a goal into the level below it: a monthly deliverable into weekly
 * priorities, a weekly priority into tasks for today.
 *
 * The model only proposes. Nothing is written until the user picks items and
 * accepts, and each accepted item is linked to its parent so progress rolls
 * back up automatically.
 */
export function GoalBreakdown({
  goal,
  horizon,
  childLabel,
  onAccept,
}: {
  goal: Goal;
  horizon: "month" | "week";
  /** e.g. "weekly priorities" or "tasks for today" */
  childLabel: string;
  onAccept: (titles: string[]) => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<string[] | null>(null);
  const [provider, setProvider] = useState("AI");
  const [note, setNote] = useState<{ text: string; soft: boolean } | null>(null);

  const ask = async () => {
    setBusy(true);
    setNote(null);
    setItems(null);
    const result = await breakDownGoal(goal.title, horizon);
    setBusy(false);

    if (!result.ok) {
      setNote({ text: result.message, soft: result.reason === "not_configured" });
      return;
    }
    const proposed = (result.data.items ?? []).filter(
      (t) => typeof t === "string" && t.trim().length > 0,
    );
    if (proposed.length === 0) {
      setNote({ text: "Nothing useful came back. Try rewording the goal.", soft: true });
      return;
    }
    setProvider(result.provider);
    setItems(proposed);
  };

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => void ask()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] text-ink-soft transition-colors hover:bg-beige-200 hover:text-ink disabled:opacity-50"
      >
        <GitBranch size={11} />
        {busy ? "Thinking…" : `Break into ${childLabel}`}
      </button>

      {note && (
        <AiMessage
          message={note.text}
          notConfigured={note.soft}
          onDismiss={() => setNote(null)}
        />
      )}

      {items && (
        <AiSuggestionList
          items={items}
          provider={provider}
          acceptLabel="Add these"
          onAccept={async (chosen) => {
            setItems(null);
            await onAccept(chosen);
          }}
          onDismiss={() => setItems(null)}
        />
      )}
    </div>
  );
}
