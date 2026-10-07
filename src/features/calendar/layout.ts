import { monthGrid, weekDates } from "@/lib/dates/ranges";
import type { ISODate, WeekStart } from "@/lib/dates/core";
import type { ViewMode } from "./viewState";

/**
 * World-space geometry for the columns of a view. All coordinates are in
 * "world" units (before the viewport's pan/zoom transform). The canvas simply
 * renders each column at its (x, y, w, h).
 */

export const COL = {
  weekWidth: 268,
  dayWidth: 420,
  monthWidth: 190,
  gap: 24,
  monthRowGap: 20,
  weekHeight: 620,
  dayHeight: 720,
  monthHeight: 176,
  pad: 48, // world padding around the whole content block
};

export interface ColumnBox {
  date: ISODate;
  x: number;
  y: number;
  w: number;
  h: number;
  dimmed: boolean; // adjacent-month day in month view
}

export interface CanvasLayout {
  columns: ColumnBox[];
  width: number;
  height: number;
}

export function computeLayout(
  mode: ViewMode,
  anchor: ISODate,
  weekStartsOn: WeekStart,
): CanvasLayout {
  if (mode === "day") {
    const w = COL.dayWidth;
    const h = COL.dayHeight;
    return {
      columns: [{ date: anchor, x: COL.pad, y: COL.pad, w, h, dimmed: false }],
      width: w + COL.pad * 2,
      height: h + COL.pad * 2,
    };
  }

  if (mode === "week") {
    const w = COL.weekWidth;
    const h = COL.weekHeight;
    const dates = weekDates(anchor, weekStartsOn);
    const columns = dates.map((date, i) => ({
      date,
      x: COL.pad + i * (w + COL.gap),
      y: COL.pad,
      w,
      h,
      dimmed: false,
    }));
    return {
      columns,
      width: COL.pad * 2 + dates.length * w + (dates.length - 1) * COL.gap,
      height: h + COL.pad * 2,
    };
  }

  // month
  const w = COL.monthWidth;
  const h = COL.monthHeight;
  const { weeks, monthISO } = monthGrid(anchor, weekStartsOn);
  const monthKey = monthISO.slice(0, 7);
  const columns: ColumnBox[] = [];
  weeks.forEach((week, row) => {
    week.forEach((date, i) => {
      columns.push({
        date,
        x: COL.pad + i * (w + COL.gap),
        y: COL.pad + row * (h + COL.monthRowGap),
        w,
        h,
        dimmed: date.slice(0, 7) !== monthKey,
      });
    });
  });
  return {
    columns,
    width: COL.pad * 2 + 7 * w + 6 * COL.gap,
    height: COL.pad * 2 + weeks.length * h + (weeks.length - 1) * COL.monthRowGap,
  };
}
