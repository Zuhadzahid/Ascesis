import { startOfMonth, startOfYear, format } from "date-fns";
import {
  parseISODate,
  toISODate,
  weekStartISO,
  type ISODate,
  type WeekStart,
} from "@/lib/dates/core";
import type { GoalKind } from "@/lib/supabase/database.types";

/**
 * Goals are filed under the first day of their period, so every query is an
 * exact match rather than a range scan:
 *   year  -> Jan 1
 *   month -> the 1st
 *   week  -> the user's week start
 */
export function periodStart(
  kind: GoalKind,
  anchor: ISODate,
  weekStartsOn: WeekStart,
): ISODate {
  if (kind === "year") return toISODate(startOfYear(parseISODate(anchor)));
  if (kind === "month") return toISODate(startOfMonth(parseISODate(anchor)));
  return weekStartISO(anchor, weekStartsOn);
}

export function periodLabel(kind: GoalKind, start: ISODate): string {
  const d = parseISODate(start);
  if (kind === "year") return format(d, "yyyy");
  if (kind === "month") return format(d, "MMMM yyyy");
  return `Week of ${format(d, "MMM d")}`;
}

/** The five life dimensions of the Yearly Vision, in display order. */
export const DIMENSIONS = [
  { id: "career", label: "Career" },
  { id: "health", label: "Health" },
  { id: "finance", label: "Finance" },
  { id: "learning", label: "Learning" },
  { id: "personal", label: "Personal" },
] as const;

/** Hard caps the product enforces (the database enforces the weekly one too). */
export const MAX_WEEK_PRIORITIES = 3;
export const MAX_MONTH_TARGETS = 3;
