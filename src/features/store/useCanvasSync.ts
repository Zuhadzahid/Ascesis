"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import { useCanvasStore } from "./canvasStore";
import { EPOCH, type CanvasSnapshot } from "./canvasSnapshot";

const DEBOUNCE_MS = 1500;

/**
 * Keeps the canvas layout in sync across devices.
 *
 * Local state is the fast path (localStorage, per user). On mount we rehydrate
 * that and compare with the server copy: the newer one wins. Pushes are
 * debounced and written as a compare-and-set, so a stale tab can never
 * overwrite a newer layout saved elsewhere.
 */
export function useCanvasSync({
  userId,
  serverSnapshot,
}: {
  userId: string;
  serverSnapshot: CanvasSnapshot | null;
}) {
  const [ready, setReady] = useState(false);
  const lastPushed = useRef<string | null>(null);
  /** True when the rehydrated local layout is ahead of the server copy. */
  const needsInitialPush = useRef(false);

  // 1. Rehydrate this user's local layout, then reconcile with the server.
  useEffect(() => {
    let cancelled = false;
    const persist = useCanvasStore.persist;
    persist.setOptions({ name: `pos:canvas:${userId}` });

    void Promise.resolve(persist.rehydrate()).then(() => {
      if (cancelled) return;
      const local = useCanvasStore.getState().snapshot();
      const serverAt = serverSnapshot?.updatedAt ?? EPOCH;

      if (serverSnapshot && serverAt > local.updatedAt) {
        useCanvasStore.getState().applySnapshot(serverSnapshot);
        lastPushed.current = serverSnapshot.updatedAt;
      } else if (local.updatedAt !== EPOCH && local.updatedAt > serverAt) {
        // A layout saved on this device has never reached the server (saved
        // while offline, or before this column existed). Push it once.
        needsInitialPush.current = true;
      } else {
        lastPushed.current = local.updatedAt;
      }
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, serverSnapshot]);

  // 2. Push local changes, debounced, with a compare-and-set guard.
  useEffect(() => {
    if (!ready) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
      const snap = useCanvasStore.getState().snapshot();
      if (snap.updatedAt === lastPushed.current) return;
      lastPushed.current = snap.updatedAt;

      const supabase = createClient();
      void supabase
        .from("profiles")
        .update({
          // The snapshot is plain JSON-serialisable data.
          canvas_state: snap as unknown as Json,
          canvas_state_updated_at: snap.updatedAt,
        })
        .eq("id", userId)
        .or(
          `canvas_state_updated_at.is.null,canvas_state_updated_at.lte.${snap.updatedAt}`,
        )
        .then(({ error }) => {
          if (error) {
            // Let the next change retry rather than losing the layout silently.
            lastPushed.current = null;
            console.warn("[canvas] layout sync failed:", error.message);
          }
        });
    };

    if (needsInitialPush.current) {
      needsInitialPush.current = false;
      flush();
    }

    const unsubscribe = useCanvasStore.subscribe((state, prev) => {
      if (state.updatedAt === prev.updatedAt) return;
      clearTimeout(timer);
      timer = setTimeout(flush, DEBOUNCE_MS);
    });

    const onHide = () => {
      if (document.visibilityState === "hidden") {
        clearTimeout(timer);
        flush();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);

    return () => {
      unsubscribe();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
    };
  }, [ready, userId]);

  return ready;
}
