"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUp, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Rendered under an assistant message, e.g. a reviewable plan. */
  attachment?: React.ReactNode;
}

const STARTERS = [
  "Plan a 90 day arc to ship my app and get back in the gym",
  "Break my month into weekly priorities",
  "What should I do today?",
];

/**
 * The canvas assistant: a floating robot that turns a sentence of intent into
 * a structured plan you can review before anything is saved.
 *
 * This is the shell. It owns the conversation, the panel and the empty states;
 * the planner that answers is wired in separately so the UI can be judged and
 * used before any provider exists.
 */
export function AiChatWidget({
  messages,
  busy,
  onSend,
  onClear,
}: {
  messages: ChatMessage[];
  busy: boolean;
  onSend: (text: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, open]);

  const send = () => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    onSend(text);
  };

  return (
    <div className="pointer-events-none absolute right-4 bottom-4 z-30 flex flex-col items-end gap-2">
      {open && (
        <section
          aria-label="Ascesis assistant"
          className="pointer-events-auto flex h-[30rem] max-h-[70vh] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-float"
        >
          <header className="flex items-center gap-2 border-b border-chrome-border bg-chrome px-3 py-2 text-chrome-fg">
            <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-chrome-fg">
              <Image
                src="/logo.png"
                alt=""
                width={28}
                height={28}
                className="size-7 object-contain"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-tight font-semibold">Assistant</p>
              <p className="text-[11px] leading-tight text-chrome-fg/70">
                Describe what you want. Nothing saves until you accept.
              </p>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="rounded-md px-1.5 py-1 text-[11px] text-chrome-fg/70 hover:bg-chrome-fg/10 hover:text-chrome-fg"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              aria-label="Close assistant"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-chrome-fg/70 hover:bg-chrome-fg/10 hover:text-chrome-fg"
            >
              <X size={16} />
            </button>
          </header>

          <div
            ref={scrollRef}
            className="wc-scroll min-h-0 flex-1 space-y-3 overflow-y-auto bg-beige/40 p-3"
          >
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-ink-soft">
                  Tell me what you are trying to do and I will draft the whole
                  thing: the arc, its rules, your monthly targets, this
                  week&apos;s priorities and today&apos;s tasks. You review it
                  before anything is created.
                </p>
                <div className="space-y-1.5">
                  {STARTERS.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => onSend(starter)}
                      className="flex w-full items-start gap-1.5 rounded-lg border border-card-border bg-card px-2.5 py-2 text-left text-xs text-ink transition-colors hover:border-teal"
                    >
                      <Sparkles
                        size={12}
                        className="mt-0.5 shrink-0 text-olive"
                      />
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                    message.role === "user"
                      ? "ml-auto rounded-br-sm bg-olive text-beige"
                      : "rounded-bl-sm border border-card-border bg-card text-ink",
                  )}
                >
                  {message.text}
                </div>
                {message.attachment}
              </div>
            ))}

            {busy && (
              <div className="flex items-center gap-1.5 text-xs text-ink-faint">
                <Sparkles size={12} className="animate-pulse" />
                Working on it…
              </div>
            )}
          </div>

          <div className="border-t border-card-border p-2">
            <div className="flex items-end gap-1.5">
              <textarea
                rows={1}
                value={draft}
                placeholder="What do you want to plan?"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                className="max-h-24 min-h-[2.25rem] flex-1 resize-none rounded-xl border border-card-border bg-beige-100 px-3 py-2 text-xs text-ink outline-none placeholder:text-ink-faint focus:border-teal-600"
              />
              <button
                type="button"
                aria-label="Send"
                onClick={send}
                disabled={busy || draft.trim().length === 0}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-olive text-beige transition-colors hover:bg-olive-700 disabled:opacity-40"
              >
                <ArrowUp size={16} />
              </button>
            </div>
            <p className="mt-1 px-1 text-[10px] text-ink-faint">
              Enter to send, Shift+Enter for a new line.
            </p>
          </div>
        </section>
      )}

      {/* The robot itself. */}
      <button
        type="button"
        aria-label={open ? "Hide assistant" : "Open assistant"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "pointer-events-auto flex size-14 items-center justify-center rounded-full border-2 bg-chrome-fg shadow-float transition-transform hover:scale-105",
          open ? "border-olive" : "border-card-border",
        )}
      >
        <Image
          src="/logo.png"
          alt=""
          width={48}
          height={48}
          className="size-12 object-contain"
          priority
        />
      </button>
    </div>
  );
}
