"use client";

import { useEffect, useState } from "react";
import { msUntilLocalMidnight, todayISO, type ISODate } from "./core";

/**
 * The current calendar date in the given time zone, kept fresh: it recomputes
 * on window focus and schedules a refresh at the next local midnight so the
 * highlighted "today" column moves without a reload.
 */
export function useToday(timeZone: string): ISODate {
  const [today, setToday] = useState<ISODate>(() => todayISO(timeZone));

  useEffect(() => {
    const update = () => setToday(todayISO(timeZone));
    update();

    const onFocus = () => update();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    let timer: ReturnType<typeof setTimeout>;
    const scheduleMidnight = () => {
      timer = setTimeout(() => {
        update();
        scheduleMidnight();
      }, msUntilLocalMidnight());
    };
    scheduleMidnight();

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      clearTimeout(timer);
    };
  }, [timeZone]);

  return today;
}
