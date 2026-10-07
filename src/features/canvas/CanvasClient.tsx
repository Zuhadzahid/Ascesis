"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { detectTimeZone, type WeekStart } from "@/lib/dates/core";
import type { CanvasSnapshot } from "@/features/store/canvasSnapshot";

/**
 * React Flow reads window/ResizeObserver at import time, so the canvas is
 * client-only. Loading it here (from a Client Component) keeps `ssr: false`
 * legal in Next 16.
 */
const PosCanvas = dynamic(() => import("./PosCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-beige">
      <span className="rounded-full bg-card/90 px-3 py-1 text-xs text-ink-soft shadow-card">
        Loading your canvas…
      </span>
    </div>
  ),
});

/**
 * Client entry for the canvas. Reconciles the user's time zone: if the profile
 * was created with the default "UTC", adopt the browser's zone (once) so
 * "today" matches the user's wall clock, and persist it.
 */
export function CanvasClient({
  userId,
  initialTimezone,
  weekStartsOn,
  serverSnapshot,
}: {
  userId: string;
  initialTimezone: string;
  weekStartsOn: WeekStart;
  serverSnapshot: CanvasSnapshot | null;
}) {
  // Resolve the effective zone once, on the client: adopt the browser's zone
  // when the profile still has the "UTC" default. The effect only persists the
  // choice; it does not drive rendering, so there is no cascading setState.
  const [timezone] = useState(() => {
    if (initialTimezone && initialTimezone !== "UTC") return initialTimezone;
    return detectTimeZone() || initialTimezone;
  });

  useEffect(() => {
    if (timezone === initialTimezone) return;
    const supabase = createClient();
    void supabase.from("profiles").update({ timezone }).eq("id", userId);
  }, [timezone, initialTimezone, userId]);

  return (
    <PosCanvas
      userId={userId}
      timezone={timezone}
      weekStartsOn={weekStartsOn}
      serverSnapshot={serverSnapshot}
    />
  );
}
