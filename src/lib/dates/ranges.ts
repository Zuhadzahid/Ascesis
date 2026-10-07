import {
  addISODays,
  parseISODate,
  toISODate,
  weekStartISO,
  type ISODate,
  type WeekStart,
} from "./core";
import { format, startOfMonth } from "date-fns";

/** The 7 ISO dates of the week containing `anchor`. */
export function weekDates(anchor: ISODate, weekStartsOn: WeekStart): ISODate[] {
  const start = weekStartISO(anchor, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addISODays(start, i));
}

/**
 * A month laid out as a calendar grid: whole weeks (rows of 7) covering the
 * month of `anchor`, including leading/trailing days from adjacent months so
 * every row is full. Produces 4, 5 or 6 rows depending on the month.
 */
export function monthGrid(
  anchor: ISODate,
  weekStartsOn: WeekStart,
): { weeks: ISODate[][]; monthISO: ISODate } {
  const first = toISODate(startOfMonth(parseISODate(anchor)));
  const gridStart = weekStartISO(first, weekStartsOn);
  const monthNum = parseISODate(first).getMonth();

  const weeks: ISODate[][] = [];
  let cursor = gridStart;
  // Emit whole weeks until we've passed the month and completed the week.
  for (let row = 0; row < 6; row++) {
    const week = Array.from({ length: 7 }, (_, i) => addISODays(cursor, i));
    weeks.push(week);
    cursor = addISODays(cursor, 7);
    const lastDay = parseISODate(week[6]);
    // Stop once we've emitted the row that contains the month's end and the
    // next row would be entirely in the following month.
    if (lastDay.getMonth() !== monthNum && lastDay > parseISODate(first)) {
      const nextRowStart = parseISODate(cursor);
      if (nextRowStart.getMonth() !== monthNum) break;
    }
  }
  return { weeks, monthISO: first };
}

/** Inclusive [from, to] ISO range that covers a set of dates, for a DB query. */
export function boundingRange(dates: ISODate[]): { from: ISODate; to: ISODate } {
  const sorted = [...dates].sort();
  return { from: sorted[0], to: sorted[sorted.length - 1] };
}

/** The "YYYY-MM" month bucket key a date belongs to (TanStack Query cache key). */
export function monthBucket(iso: ISODate): string {
  return iso.slice(0, 7);
}

/** Every distinct month bucket touched by a list of dates. */
export function bucketsFor(dates: ISODate[]): string[] {
  return Array.from(new Set(dates.map(monthBucket))).sort();
}

export function isWeekend(iso: ISODate): boolean {
  const dow = parseISODate(iso).getDay();
  return dow === 0 || dow === 6;
}

export function sameMonth(iso: ISODate, monthISO: ISODate): boolean {
  return iso.slice(0, 7) === monthISO.slice(0, 7);
}

// --- Display formatting ---

export function weekdayShort(iso: ISODate): string {
  return format(parseISODate(iso), "EEE");
}
export function weekdayLong(iso: ISODate): string {
  return format(parseISODate(iso), "EEEE");
}
export function dayOfMonth(iso: ISODate): string {
  return format(parseISODate(iso), "d");
}
export function monthDayLabel(iso: ISODate): string {
  return format(parseISODate(iso), "MMM d");
}
export function monthYearLabel(iso: ISODate): string {
  return format(parseISODate(iso), "MMMM yyyy");
}
export function rangeLabel(from: ISODate, to: ISODate): string {
  const a = parseISODate(from);
  const b = parseISODate(to);
  const sameYear = a.getFullYear() === b.getFullYear();
  const sameMon = sameYear && a.getMonth() === b.getMonth();
  if (sameMon) return `${format(a, "MMM d")} – ${format(b, "d, yyyy")}`;
  if (sameYear) return `${format(a, "MMM d")} – ${format(b, "MMM d, yyyy")}`;
  return `${format(a, "MMM d, yyyy")} – ${format(b, "MMM d, yyyy")}`;
}
