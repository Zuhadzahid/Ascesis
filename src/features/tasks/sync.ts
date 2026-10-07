"use client";

import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";

/**
 * Lightweight cross-tab sync. When one tab writes a task, it posts on a
 * BroadcastChannel; other tabs invalidate their task queries so they refetch
 * on next focus. This is cheap and covers the common "two tabs open" case
 * without a realtime subscription (that is a later phase).
 */
const CHANNEL = "ascesis:tasks";

function channel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(CHANNEL);
}

let sender: BroadcastChannel | null | undefined;

export function notifyTasksChanged() {
  if (sender === undefined) sender = channel();
  try {
    sender?.postMessage({ type: "tasks-changed", at: Date.now() });
  } catch {
    // Channel closed; ignore.
  }
}

/** Subscribe a QueryClient to task changes from other tabs. */
export function useTaskSync(qc: QueryClient) {
  useEffect(() => {
    const ch = channel();
    if (!ch) return;
    ch.onmessage = (e) => {
      if (e.data?.type === "tasks-changed") {
        qc.invalidateQueries({ queryKey: ["tasks"] });
      }
    };
    return () => ch.close();
  }, [qc]);
}
