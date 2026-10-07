import { describe, expect, it } from "vitest";
import {
  addISODays,
  parseISODate,
  toISODate,
  weekStartISO,
  msUntilLocalMidnight,
} from "./core";
import {
  weekDates,
  monthGrid,
  isWeekend,
  bucketsFor,
  monthBucket,
} from "./ranges";

describe("core date math", () => {
  it("round-trips an ISO date without shifting", () => {
    expect(toISODate(parseISODate("2026-09-08"))).toBe("2026-09-08");
  });

  it("adds and subtracts calendar days across month boundaries", () => {
    expect(addISODays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addISODays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addISODays("2024-02-28", 1)).toBe("2024-02-29"); // leap year
  });

  it("survives a spring-forward DST week (America/Sao_Paulo historically at midnight)", () => {
    // Using local noon anchoring, day arithmetic never lands in a DST gap.
    const start = "2018-11-03"; // near a midnight DST change in some zones
    let d = start;
    for (let i = 0; i < 7; i++) d = addISODays(d, 1);
    expect(d).toBe("2018-11-10");
  });

  it("computes week start for both Monday and Sunday conventions", () => {
    // 2026-09-08 is a Tuesday.
    expect(weekStartISO("2026-09-08", 1)).toBe("2026-09-07"); // Monday
    expect(weekStartISO("2026-09-08", 0)).toBe("2026-09-06"); // Sunday
    expect(weekStartISO("2026-09-08", 6)).toBe("2026-09-05"); // Saturday
  });

  it("schedules a positive delay until midnight", () => {
    const ms = msUntilLocalMidnight(new Date(2026, 8, 8, 23, 59, 0));
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(62_000);
  });
});

describe("week ranges", () => {
  it("returns 7 consecutive days starting on the configured day", () => {
    const week = weekDates("2026-09-08", 1);
    expect(week).toHaveLength(7);
    expect(week[0]).toBe("2026-09-07");
    expect(week[6]).toBe("2026-09-13");
  });

  it("flags weekends correctly", () => {
    expect(isWeekend("2026-09-12")).toBe(true); // Saturday
    expect(isWeekend("2026-09-13")).toBe(true); // Sunday
    expect(isWeekend("2026-09-08")).toBe(false); // Tuesday
  });
});

describe("month grid", () => {
  it("produces whole weeks that fully contain the month", () => {
    const { weeks } = monthGrid("2026-09-15", 1);
    const flat = weeks.flat();
    expect(flat).toContain("2026-09-01");
    expect(flat).toContain("2026-09-30");
    // Every row is a full week.
    for (const w of weeks) expect(w).toHaveLength(7);
    // 4, 5 or 6 rows.
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    expect(weeks.length).toBeLessThanOrEqual(6);
  });

  it("handles a month that spans a year boundary", () => {
    const { weeks } = monthGrid("2026-12-20", 1);
    const flat = weeks.flat();
    expect(flat).toContain("2026-12-31");
    expect(flat).toContain("2027-01-01");
  });

  it("starts the grid on the configured week start", () => {
    const { weeks } = monthGrid("2026-09-15", 0); // Sunday-start
    // First cell is a Sunday.
    expect(parseISODate(weeks[0][0]).getDay()).toBe(0);
  });
});

describe("buckets", () => {
  it("derives the YYYY-MM bucket and dedupes", () => {
    expect(monthBucket("2026-09-08")).toBe("2026-09");
    expect(bucketsFor(["2026-08-31", "2026-09-01", "2026-09-30"])).toEqual([
      "2026-08",
      "2026-09",
    ]);
  });
});
