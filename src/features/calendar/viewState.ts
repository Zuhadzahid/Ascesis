"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  addISODays,
  isISODate,
  parseISODate,
  toISODate,
  weekStartISO,
  type ISODate,
  type WeekStart,
} from "@/lib/dates/core";
import { addMonths, startOfMonth } from "date-fns";
import { monthGrid, weekDates, bucketsFor } from "@/lib/dates/ranges";

export type ViewMode = "day" | "week" | "month";

export interface ViewState {
  mode: ViewMode;
  anchor: ISODate;
}

function parseMode(v: string | null): ViewMode {
  return v === "day" || v === "month" ? v : "week";
}

/**
 * View state (mode + anchor date) lives in the URL so it is shareable and
 * survives reload. `today` is passed in from the timezone-aware clock.
 */
export function useViewState(today: ISODate, weekStartsOn: WeekStart) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const mode = parseMode(params.get("view"));
  const rawDate = params.get("date");
  const anchor = rawDate && isISODate(rawDate) ? rawDate : today;

  const setState = useCallback(
    (next: Partial<ViewState>) => {
      const sp = new URLSearchParams(params.toString());
      if (next.mode) sp.set("view", next.mode);
      if (next.anchor) sp.set("date", next.anchor);
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  // Switching the view mode also snaps the anchor to today, so Day/Week/Month
  // always open on the period containing the current date. Use the arrows or
  // openDay() to move to another date within a mode.
  const setMode = useCallback(
    (m: ViewMode) => setState({ mode: m, anchor: today }),
    [setState, today],
  );
  const goToday = useCallback(() => setState({ anchor: today }), [setState, today]);
  const openDay = useCallback(
    (date: ISODate) => setState({ mode: "day", anchor: date }),
    [setState],
  );

  const step = useCallback(
    (dir: 1 | -1) => {
      if (mode === "day") {
        setState({ anchor: addISODays(anchor, dir) });
      } else if (mode === "week") {
        setState({ anchor: addISODays(weekStartISO(anchor, weekStartsOn), dir * 7) });
      } else {
        const m = addMonths(startOfMonth(parseISODate(anchor)), dir);
        setState({ anchor: toISODate(m) });
      }
    },
    [mode, anchor, weekStartsOn, setState],
  );

  // The dates and month buckets the current view needs loaded.
  const { dates, buckets } = useMemo(() => {
    let dates: ISODate[];
    if (mode === "day") dates = [anchor];
    else if (mode === "week") dates = weekDates(anchor, weekStartsOn);
    else dates = monthGrid(anchor, weekStartsOn).weeks.flat();
    return { dates, buckets: bucketsFor(dates) };
  }, [mode, anchor, weekStartsOn]);

  return { mode, anchor, setMode, goToday, openDay, step, dates, buckets };
}
