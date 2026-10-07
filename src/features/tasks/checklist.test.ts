import { describe, expect, it } from "vitest";
import {
  checklistStats,
  toggleChecklistItem,
  hasChecklist,
} from "./checklist";

const sample = `Some notes here.

- [ ] first
- [x] second
* [ ] third with asterisk bullet

\`\`\`
- [ ] this is inside a code fence and must be ignored
\`\`\`
`;

describe("checklist parsing", () => {
  it("counts items and done, ignoring fenced code", () => {
    expect(checklistStats(sample)).toEqual({ total: 3, done: 1 });
  });

  it("returns zero for empty/nullish details", () => {
    expect(checklistStats(null)).toEqual({ total: 0, done: 0 });
    expect(checklistStats("")).toEqual({ total: 0, done: 0 });
    expect(hasChecklist("just prose")).toBe(false);
  });

  it("toggles the nth item without touching others or code fences", () => {
    const after = toggleChecklistItem(sample, 0);
    expect(checklistStats(after)).toEqual({ total: 3, done: 2 });
    expect(after).toContain("- [x] first");
    // The line inside the fence is still unchecked text.
    expect(after).toContain("- [ ] this is inside a code fence");
  });

  it("unchecks an already-checked item", () => {
    const after = toggleChecklistItem(sample, 1); // "second" is [x]
    expect(after).toContain("- [ ] second");
    expect(checklistStats(after)).toEqual({ total: 3, done: 0 });
  });

  it("is a no-op for an out-of-range index", () => {
    expect(toggleChecklistItem(sample, 99)).toBe(sample);
  });
});
