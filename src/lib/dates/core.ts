import { addDays, format, startOfWeek } from "date-fns";
import { TZDate } from "@date-fns/tz";

/**
 * A calendar date with no time or zone, as "YYYY-MM-DD". This is the unit the
 * app reasons about: a task on "2026-09-08" stays on Sep 8 regardless of where
 * the user is or what time it is.
 *
 * Rules that keep this correct:
 *  - Never `new Date("2026-09-08")` (parsed as UTC midnight, shifts a day in
 *    negative-offset zones). Parse into a LOCAL date instead.
 *  - Anchor working Dates at local NOON so date-fns arithmetic can never fall
 *    into a midnight DST gap and skip/repeat a day.
 */
export type ISODate = string;

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(value: string): value is ISODate {
  return ISO_RE.test(value);
}

/** Parse "YYYY-MM-DD" into a local Date anchored at noon. */
export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** Format a local Date back to "YYYY-MM-DD" (uses local Y/M/D, not UTC). */
export function toISODate(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Add (or subtract, with a negative n) calendar days to an ISO date. */
export function addISODays(iso: ISODate, n: number): ISODate {
  return toISODate(addDays(parseISODate(iso), n));
}

/**
 * The current calendar date in a given IANA time zone, as an ISO date.
 * Recompute this on window focus and at local midnight so "today" tracks the
 * wall clock.
 */
export function todayISO(timeZone: string): ISODate {
  try {
    return format(TZDate.tz(timeZone), "yyyy-MM-dd");
  } catch {
    // Fall back to the host's local date if the zone is unknown.
    return toISODate(new Date());
  }
}

/** The IANA time zone the browser is currently running in. */
export function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** The first day of the week containing `iso`, honouring the user's setting. */
export function weekStartISO(iso: ISODate, weekStartsOn: WeekStart): ISODate {
  return toISODate(startOfWeek(parseISODate(iso), { weekStartsOn }));
}

/** Milliseconds from now until the next local midnight, for scheduling a "today" refresh. */
export function msUntilLocalMidnight(now = new Date()): number {
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    2, // 2s past midnight, to be safely on the new day
    0,
  );
  return next.getTime() - now.getTime();
}
