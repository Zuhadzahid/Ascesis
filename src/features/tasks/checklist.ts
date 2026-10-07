/**
 * Checklist sub-items live inside a task's markdown `details` as GitHub-style
 * task list lines: "- [ ] item" (open) and "- [x] item" (done). Keeping them
 * in the details text means a task is one row: moving, deleting or duplicating
 * it is atomic and optimistic updates stay trivial.
 *
 * These helpers are pure so they can be unit-tested and used for the small
 * progress badge shown on a task card without rendering markdown.
 */

// Matches a task-list line, capturing indent, checkbox state and label.
// Requires "- ", "* " or "+ " bullet followed by "[ ]" / "[x]" / "[X]".
const TASK_LINE = /^(\s*)([-*+])\s+\[([ xX])\]\s?(.*)$/;

export interface ChecklistStats {
  total: number;
  done: number;
}

/** Count checklist items, skipping lines inside fenced code blocks. */
export function checklistStats(details: string | null | undefined): ChecklistStats {
  if (!details) return { total: 0, done: 0 };
  let total = 0;
  let done = 0;
  let inFence = false;
  for (const line of details.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = TASK_LINE.exec(line);
    if (m) {
      total++;
      if (m[3].toLowerCase() === "x") done++;
    }
  }
  return { total, done };
}

/**
 * Toggle the checkbox of the nth task-list item (0-indexed among task lines,
 * ignoring fenced code). Returns new details text; input unchanged if index
 * is out of range.
 */
export function toggleChecklistItem(details: string, index: number): string {
  const lines = details.split("\n");
  let seen = -1;
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = TASK_LINE.exec(lines[i]);
    if (!m) continue;
    seen++;
    if (seen === index) {
      const checked = m[3].toLowerCase() === "x";
      const box = checked ? "[ ]" : "[x]";
      lines[i] = `${m[1]}${m[2]} ${box} ${m[4]}`;
      break;
    }
  }
  return lines.join("\n");
}

/** True if the details text contains at least one checklist item. */
export function hasChecklist(details: string | null | undefined): boolean {
  return checklistStats(details).total > 0;
}
