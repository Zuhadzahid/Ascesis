"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { addISODays, type ISODate } from "@/lib/dates/core";
import { monthDayLabel } from "@/lib/dates/ranges";
import type { Rule } from "./queries";
import { useChallengeActions } from "./mutations";
import { draftArcRules } from "@/features/ai/actions";
import { AiButton, AiMessage } from "@/features/ai/AiAssist";

const PRESETS = [30, 60, 90] as const;
const MAX_RULES = 5;
const MIN_RULES = 3;

function newRule(text = ""): Rule {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `r-${Math.random().toString(36).slice(2)}`;
  return { id, text };
}

/**
 * Creates a challenge: a fixed window, a clear objective, and the three to five
 * rules you will not break. Those rules then appear on every day of the arc.
 */
export function ChallengeEditor({
  today,
  onClose,
}: {
  today: ISODate;
  onClose: () => void;
}) {
  const actions = useChallengeActions(today);
  const [title, setTitle] = useState("Winter Arc");
  const [objective, setObjective] = useState("");
  const [days, setDays] = useState<number>(30);
  const [deepWork, setDeepWork] = useState(120);
  const [rules, setRules] = useState<Rule[]>([
    newRule("2 hours of deep work"),
    newRule("30 minutes of exercise"),
    newRule("Sleep before 1am"),
  ]);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<{ text: string; soft: boolean } | null>(
    null,
  );

  /** Ask the model for rules, then drop them straight into the form to edit. */
  const draftWithAi = async () => {
    setAiBusy(true);
    setAiNote(null);
    const result = await draftArcRules(objective, days);
    setAiBusy(false);

    if (!result.ok) {
      setAiNote({
        text: result.message,
        soft: result.reason === "not_configured",
      });
      return;
    }

    const proposed = (result.data.rules ?? []).slice(0, MAX_RULES);
    if (proposed.length >= MIN_RULES) {
      setRules(proposed.map((text) => newRule(text)));
    }
    if (typeof result.data.deepWorkMinutes === "number") {
      setDeepWork(
        Math.max(15, Math.min(480, Math.round(result.data.deepWorkMinutes))),
      );
    }
    if (result.data.note) {
      setAiNote({ text: result.data.note, soft: true });
    }
  };

  const endDate = addISODays(today, days - 1);
  const filledRules = rules.filter((r) => r.text.trim().length > 0);
  const canSave =
    title.trim().length > 0 &&
    filledRules.length >= MIN_RULES &&
    filledRules.length <= MAX_RULES &&
    !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    const created = await actions.create({
      title,
      objective,
      startDate: today,
      endDate,
      rules: filledRules.map((r) => ({ id: r.id, text: r.text.trim() })),
      deepWorkTargetMinutes: deepWork,
    });
    setSaving(false);
    if (created) onClose();
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-olive-900/30 p-4 backdrop-blur-sm">
      <div className="max-h-full w-full max-w-md overflow-y-auto wc-scroll rounded-2xl border border-card-border bg-card shadow-float">
        <header className="flex items-start justify-between gap-3 border-b border-card-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Start a Monk Mode arc
            </h2>
            <p className="mt-0.5 text-xs text-ink-soft">
              A fixed window with rules you do not negotiate with.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1 text-ink-soft hover:bg-beige-200"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-4 px-5 py-4">
          <Field label="Name">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Winter Arc"
              className="w-full rounded-lg border border-card-border bg-beige-100 px-3 py-2 text-sm text-ink outline-none focus:border-teal-600"
            />
          </Field>

          <Field label="Main objective">
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={2}
              placeholder="What does winning this arc look like?"
              className="w-full resize-none rounded-lg border border-card-border bg-beige-100 px-3 py-2 text-sm text-ink outline-none focus:border-teal-600"
            />
          </Field>

          <Field label="Length">
            <div className="flex items-center gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDays(preset)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    days === preset
                      ? "border-olive bg-teal text-ink"
                      : "border-card-border bg-beige-100 text-ink-soft hover:border-teal-600",
                  )}
                >
                  {preset} days
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-ink-faint">
              {monthDayLabel(today)} to {monthDayLabel(endDate)}
            </p>
          </Field>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-ink-soft">
              Non-negotiables ({filledRules.length}/{MAX_RULES})
            </span>
            <AiButton
              label="Draft with AI"
              loading={aiBusy}
              disabled={!objective.trim()}
              onClick={() => void draftWithAi()}
            />
          </div>
          {aiNote && (
            <AiMessage
              message={aiNote.text}
              notConfigured={aiNote.soft}
              onDismiss={() => setAiNote(null)}
            />
          )}
          <Field label="">
            <div className="space-y-1.5">
              {rules.map((rule, i) => (
                <div key={rule.id} className="flex items-center gap-1.5">
                  <span className="w-4 shrink-0 text-center text-[11px] text-ink-faint">
                    {i + 1}
                  </span>
                  <input
                    value={rule.text}
                    onChange={(e) =>
                      setRules((list) =>
                        list.map((r) =>
                          r.id === rule.id ? { ...r, text: e.target.value } : r,
                        ),
                      )
                    }
                    placeholder="A rule you will not break"
                    className="flex-1 rounded-lg border border-card-border bg-beige-100 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-teal-600"
                  />
                  {rules.length > MIN_RULES && (
                    <button
                      type="button"
                      aria-label="Remove rule"
                      onClick={() =>
                        setRules((list) => list.filter((r) => r.id !== rule.id))
                      }
                      className="rounded p-1 text-ink-faint hover:text-danger"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              {rules.length < MAX_RULES && (
                <button
                  type="button"
                  onClick={() => setRules((list) => [...list, newRule()])}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-teal-600/60 px-2.5 py-1.5 text-xs text-ink-soft hover:border-olive hover:bg-tea/40"
                >
                  <Plus size={13} /> Add a rule
                </button>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-ink-faint">
              Between {MIN_RULES} and {MAX_RULES}. Fewer rules, kept every day,
              beats a long list you abandon.
            </p>
          </Field>

          <Field label="Daily deep work target">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={15}
                max={480}
                step={15}
                value={deepWork}
                onChange={(e) => setDeepWork(Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-beige-200 accent-olive"
              />
              <span className="w-16 shrink-0 text-right text-sm tabular-nums text-ink">
                {Math.floor(deepWork / 60)}h {deepWork % 60}m
              </span>
            </div>
          </Field>

          {actions.error && (
            <p className="rounded-md bg-danger-soft/60 px-3 py-2 text-xs text-danger">
              {actions.error}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-card-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-beige-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSave}
            className="rounded-lg bg-olive px-4 py-2 text-sm font-semibold text-beige shadow-card transition-colors hover:bg-olive-700 disabled:opacity-50"
          >
            {saving ? "Starting…" : "Start the arc"}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-soft">
        {label}
      </span>
      {children}
    </label>
  );
}
