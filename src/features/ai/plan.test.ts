import { describe, expect, it } from "vitest";
import { LIMITS, isPlanEmpty, normalisePlan, planCounts } from "./plan";

const ok = { hasActiveChallenge: false };

describe("plan normalisation", () => {
  it("keeps a well-formed plan intact", () => {
    const plan = normalisePlan(
      {
        summary: "Ship it and train.",
        challenge: {
          title: "Winter Arc",
          objective: "Ship v1",
          days: 90,
          rules: ["2h deep work", "30m exercise", "Sleep by 1am"],
          deepWorkMinutes: 120,
        },
        monthly: [
          { title: "Ship the beta", weekly: [{ title: "Finish auth", tasks: ["Write login"] }] },
        ],
        today: ["Email the designer"],
      },
      ok,
    );

    expect(plan.challenge?.rules).toHaveLength(3);
    expect(plan.monthly).toHaveLength(1);
    expect(plan.monthly[0].weekly[0].tasks).toHaveLength(1);
    expect(plan.today).toHaveLength(1);
    expect(plan.adjustments).toEqual([]);
    expect(planCounts(plan)).toEqual({
      challenge: 1,
      monthly: 1,
      weekly: 1,
      tasks: 2,
    });
  });

  it("trims too many rules and says so", () => {
    const plan = normalisePlan(
      {
        challenge: {
          title: "Arc",
          days: 30,
          rules: ["a", "b", "c", "d", "e", "f", "g"],
          deepWorkMinutes: 120,
        },
      },
      ok,
    );
    expect(plan.challenge?.rules).toHaveLength(LIMITS.maxRules);
    expect(plan.adjustments.join(" ")).toMatch(/Kept the first 5 rules of 7/);
  });

  it("drops an arc that has too few rules", () => {
    const plan = normalisePlan(
      { challenge: { title: "Arc", days: 30, rules: ["only one"] } },
      ok,
    );
    expect(plan.challenge).toBeNull();
    expect(plan.adjustments.join(" ")).toMatch(/at least 3/);
  });

  it("refuses a second arc when one is already running", () => {
    const plan = normalisePlan(
      {
        challenge: {
          title: "Another",
          days: 30,
          rules: ["a", "b", "c"],
          deepWorkMinutes: 60,
        },
      },
      { hasActiveChallenge: true },
    );
    expect(plan.challenge).toBeNull();
    expect(plan.adjustments.join(" ")).toMatch(/already have an arc/);
  });

  it("never lets the week exceed three priorities in total", () => {
    const plan = normalisePlan(
      {
        monthly: [
          { title: "M1", weekly: [{ title: "W1" }, { title: "W2" }] },
          { title: "M2", weekly: [{ title: "W3" }, { title: "W4" }] },
          { title: "M3", weekly: [{ title: "W5" }] },
        ],
      },
      ok,
    );
    const weekly = plan.monthly.reduce((n, m) => n + m.weekly.length, 0);
    expect(weekly).toBe(LIMITS.maxWeeklyTotal);
    expect(plan.adjustments.join(" ")).toMatch(/A week holds 3 priorities/);
  });

  it("caps monthly targets at three", () => {
    const plan = normalisePlan(
      { monthly: [1, 2, 3, 4, 5].map((n) => ({ title: `M${n}` })) },
      ok,
    );
    expect(plan.monthly).toHaveLength(LIMITS.maxMonthly);
    expect(plan.adjustments.join(" ")).toMatch(/first 3 monthly targets of 5/);
  });

  it("clamps an absurd deep work target and length", () => {
    const plan = normalisePlan(
      {
        challenge: {
          title: "Arc",
          days: 9000,
          rules: ["a", "b", "c"],
          deepWorkMinutes: 5000,
        },
      },
      ok,
    );
    expect(plan.challenge?.days).toBe(LIMITS.maxDays);
    expect(plan.challenge?.deepWorkMinutes).toBe(LIMITS.maxDeepWork);
  });

  it("survives junk without throwing", () => {
    for (const junk of [null, undefined, 42, "hello", [], {}]) {
      const plan = normalisePlan(junk, ok);
      expect(plan.monthly).toEqual([]);
      expect(plan.challenge).toBeNull();
      expect(isPlanEmpty(plan)).toBe(true);
    }
  });

  it("ignores blank titles rather than creating empty rows", () => {
    const plan = normalisePlan(
      {
        monthly: [{ title: "   " }, { title: "Real one", weekly: [{ title: "" }] }],
        today: ["", "   ", "Actual task"],
      },
      ok,
    );
    expect(plan.monthly).toHaveLength(1);
    expect(plan.monthly[0].title).toBe("Real one");
    expect(plan.monthly[0].weekly).toHaveLength(0);
    expect(plan.today).toEqual([{ title: "Actual task" }]);
  });
});
