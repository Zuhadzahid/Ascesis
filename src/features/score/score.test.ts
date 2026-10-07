import { describe, expect, it } from "vitest";
import { computeDailyScore, round2, scoreBreakdown } from "./score";
import { computeStreak } from "./streak";

/**
 * These fixtures are the contract between the TypeScript mirror and the SQL
 * function public.daily_score. If you change one, change both.
 */
const FIXTURES: {
  name: string;
  input: Parameters<typeof computeDailyScore>[0];
  expected: number;
}[] = [
  {
    name: "all three components perfect",
    input: {
      ruleTotal: 4,
      ruleDone: 4,
      deepWorkMinutes: 120,
      deepWorkTargetMinutes: 120,
      eveningRating: 10,
    },
    expected: 100,
  },
  {
    name: "nothing done, but all components apply",
    input: {
      ruleTotal: 4,
      ruleDone: 0,
      deepWorkMinutes: 0,
      deepWorkTargetMinutes: 120,
      eveningRating: 1,
    },
    // only the rating contributes: (10 * 0.2) / 1.0
    expected: 2,
  },
  {
    name: "no challenge: renormalises over deep work and rating",
    input: {
      ruleTotal: 0,
      ruleDone: 0,
      deepWorkMinutes: 120,
      deepWorkTargetMinutes: 120,
      eveningRating: 8,
    },
    // (100*0.3 + 80*0.2) / 0.5 = 92
    expected: 92,
  },
  {
    name: "evening not yet rated",
    input: {
      ruleTotal: 3,
      ruleDone: 2,
      deepWorkMinutes: 60,
      deepWorkTargetMinutes: 120,
      eveningRating: null,
    },
    // (66.666..*0.5 + 50*0.3) / 0.8 = 60.4166.. -> 60.42
    expected: 60.42,
  },
  {
    name: "deep work overshoot is capped at 100",
    input: {
      ruleTotal: 2,
      ruleDone: 2,
      deepWorkMinutes: 600,
      deepWorkTargetMinutes: 120,
      eveningRating: 10,
    },
    expected: 100,
  },
  {
    name: "no components at all scores zero",
    input: {
      ruleTotal: 0,
      ruleDone: 0,
      deepWorkMinutes: 0,
      deepWorkTargetMinutes: 0,
      eveningRating: null,
    },
    expected: 0,
  },
];

describe("daily score", () => {
  for (const f of FIXTURES) {
    it(f.name, () => {
      expect(computeDailyScore(f.input)).toBe(f.expected);
    });
  }

  it("never exceeds 100 or drops below 0", () => {
    for (let done = 0; done <= 5; done++) {
      for (const rating of [null, 1, 5, 10]) {
        const s = computeDailyScore({
          ruleTotal: 5,
          ruleDone: done,
          deepWorkMinutes: done * 40,
          deepWorkTargetMinutes: 120,
          eveningRating: rating,
        });
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
      }
    }
  });

  it("reports which components applied", () => {
    const b = scoreBreakdown({
      ruleTotal: 0,
      ruleDone: 0,
      deepWorkMinutes: 30,
      deepWorkTargetMinutes: 60,
      eveningRating: null,
    });
    expect(b.rules).toBeNull();
    expect(b.evening).toBeNull();
    expect(b.deepWork).toBe(50);
    expect(b.score).toBe(50);
  });

  it("rounds half-up to two decimals", () => {
    expect(round2(60.415)).toBe(60.42);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2)).toBe(2);
  });
});

describe("streak", () => {
  const scored = (dates: string[]) => dates.map((date) => ({ date, score: 80 }));

  it("counts a run ending today", () => {
    const r = computeStreak(
      scored(["2026-09-13", "2026-09-14", "2026-09-15"]),
      "2026-09-15",
    );
    expect(r.current).toBe(3);
    expect(r.longest).toBe(3);
  });

  it("still counts when today is not logged yet", () => {
    const r = computeStreak(
      scored(["2026-09-13", "2026-09-14"]),
      "2026-09-15",
    );
    expect(r.current).toBe(2);
  });

  it("breaks the current streak when the gap is bigger than a day", () => {
    const r = computeStreak(
      scored(["2026-09-10", "2026-09-11", "2026-09-12"]),
      "2026-09-15",
    );
    expect(r.current).toBe(0);
    expect(r.longest).toBe(3);
  });

  it("keeps the longest run across gaps", () => {
    const r = computeStreak(
      scored([
        "2026-09-01",
        "2026-09-02",
        "2026-09-03",
        "2026-09-04",
        "2026-09-10",
        "2026-09-15",
      ]),
      "2026-09-15",
    );
    expect(r.current).toBe(1);
    expect(r.longest).toBe(4);
  });

  it("ignores days below the threshold", () => {
    const r = computeStreak(
      [
        { date: "2026-09-14", score: 59 },
        { date: "2026-09-15", score: 61 },
      ],
      "2026-09-15",
    );
    expect(r.current).toBe(1);
    expect(r.longest).toBe(1);
  });

  it("returns zeros with no qualifying days", () => {
    expect(computeStreak([], "2026-09-15")).toEqual({ current: 0, longest: 0 });
  });
});
