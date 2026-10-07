import { describe, expect, it } from "vitest";
import {
  keyAtEnd,
  keyAtStart,
  keysForCount,
  positionForIndex,
  compareTasks,
} from "./position";

function task(id: string, position: string, createdAt = "2026-01-01T00:00:00Z") {
  return { id, position, createdAt };
}

describe("fractional positions", () => {
  it("appends after the last key and prepends before the first", () => {
    const a = keyAtEnd(null);
    const b = keyAtEnd(a);
    expect(a < b).toBe(true);
    const z = keyAtStart(a);
    expect(z < a).toBe(true);
  });

  it("seeds N strictly increasing keys", () => {
    const keys = keysForCount(5);
    expect(keys).toHaveLength(5);
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i - 1] < keys[i]).toBe(true);
    }
  });

  it("generates a key that sorts strictly between neighbours at every index", () => {
    const keys = keysForCount(4);
    const sorted = keys.map((position, i) => ({ id: `t${i}`, position }));
    for (let index = 0; index <= sorted.length; index++) {
      const pos = positionForIndex(sorted, index);
      const before = index > 0 ? sorted[index - 1].position : null;
      const after = index < sorted.length ? sorted[index].position : null;
      if (before) expect(before < pos).toBe(true);
      if (after) expect(pos < after).toBe(true);
    }
  });

  it("excludes the moving item so a within-column move targets future neighbours", () => {
    const keys = keysForCount(3);
    const sorted = keys.map((position, i) => ({ id: `t${i}`, position }));
    // Move t0 to the end.
    const pos = positionForIndex(sorted, 3, "t0");
    expect(pos > sorted[2].position).toBe(true);
  });

  it("orders by position, then createdAt, then id", () => {
    const list = [
      task("b", "a2", "2026-01-02T00:00:00Z"),
      task("a", "a1"),
      task("c", "a2", "2026-01-01T00:00:00Z"),
    ];
    const sorted = [...list].sort(compareTasks);
    expect(sorted.map((t) => t.id)).toEqual(["a", "c", "b"]);
  });
});
