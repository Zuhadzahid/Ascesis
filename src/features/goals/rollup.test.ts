import { describe, expect, it } from "vitest";
import { indexLinks, resolveProgress } from "./rollup";
import type { Goal } from "./queries";

function goal(over: Partial<Goal> & Pick<Goal, "id" | "kind">): Goal {
  return {
    periodStart: "2026-09-01",
    dimension: null,
    parentId: null,
    title: "A goal",
    progress: 0,
    position: "a0",
    createdAt: "2026-09-01T00:00:00Z",
    ...over,
  } as Goal;
}

describe("goal rollup", () => {
  it("keeps yearly visions manual even when months point at them", () => {
    const year = goal({ id: "y", kind: "year", progress: 42 });
    const links = indexLinks(
      [goal({ id: "m", kind: "month", parentId: "y", progress: 100 })],
      [],
    );
    const resolved = resolveProgress(year, links.get("y"));
    expect(resolved.percent).toBe(42);
    expect(resolved.derived).toBe(false);
  });

  it("derives a monthly target from its weekly priorities", () => {
    const month = goal({ id: "m", kind: "month", progress: 5 });
    const links = indexLinks(
      [
        goal({ id: "w1", kind: "week", parentId: "m", progress: 100 }),
        goal({ id: "w2", kind: "week", parentId: "m", progress: 50 }),
        goal({ id: "w3", kind: "week", parentId: "m", progress: 0 }),
      ],
      [],
    );
    const resolved = resolveProgress(month, links.get("m"));
    expect(resolved.percent).toBe(50);
    expect(resolved.derived).toBe(true);
    expect(resolved.source).toBe("1/3 priorities done");
  });

  it("derives a weekly priority from its tasks", () => {
    const week = goal({ id: "w", kind: "week", progress: 0 });
    const links = indexLinks(
      [],
      [
        { id: "t1", completed: true, goalId: "w" },
        { id: "t2", completed: true, goalId: "w" },
        { id: "t3", completed: false, goalId: "w" },
        { id: "t4", completed: false, goalId: "other" },
      ],
    );
    const resolved = resolveProgress(week, links.get("w"));
    expect(resolved.percent).toBe(67);
    expect(resolved.derived).toBe(true);
    expect(resolved.source).toBe("2/3 tasks done");
  });

  it("falls back to the manual value when nothing is linked", () => {
    const week = goal({ id: "w", kind: "week", progress: 100 });
    const resolved = resolveProgress(week, undefined);
    expect(resolved.percent).toBe(100);
    expect(resolved.derived).toBe(false);
    expect(resolved.source).toBeNull();
  });

  it("reaches 100 only when every child is finished", () => {
    const month = goal({ id: "m", kind: "month" });
    const all = indexLinks(
      [
        goal({ id: "w1", kind: "week", parentId: "m", progress: 100 }),
        goal({ id: "w2", kind: "week", parentId: "m", progress: 100 }),
      ],
      [],
    );
    expect(resolveProgress(month, all.get("m")).percent).toBe(100);
  });

  it("ignores links that point at another goal", () => {
    const week = goal({ id: "w", kind: "week", progress: 30 });
    const links = indexLinks([], [{ id: "t", completed: true, goalId: "zzz" }]);
    expect(resolveProgress(week, links.get("w")).percent).toBe(30);
  });
});
