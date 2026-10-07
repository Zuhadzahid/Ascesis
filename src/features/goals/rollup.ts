import type { Goal } from "./queries";

/**
 * How a goal's progress is decided.
 *
 * A goal that nothing hangs off keeps its manual value: you move the slider,
 * or tick the box. A goal that owns children stops being manual and reports
 * what its children actually say, so the ladder cannot lie.
 *
 * Yearly visions are deliberately excluded from this: some of them, like
 * "hold 78kg", do not decompose into deliverables, so they stay manual even
 * when monthly targets point at them.
 */

export interface LinkedCounts {
  /** Weekly priorities hanging off a monthly deliverable. */
  children: Goal[];
  /** Tasks hanging off a weekly priority. */
  tasks: { id: string; completed: boolean }[];
}

export interface ResolvedProgress {
  percent: number;
  /** True when the number comes from children rather than the slider. */
  derived: boolean;
  /** Short description of where the number came from, for the UI. */
  source: string | null;
}

export function resolveProgress(
  goal: Goal,
  linked: LinkedCounts | undefined,
): ResolvedProgress {
  // Yearly visions are always manual, by design.
  if (goal.kind === "year") {
    return { percent: goal.progress, derived: false, source: null };
  }

  const tasks = linked?.tasks ?? [];
  if (goal.kind === "week" && tasks.length > 0) {
    const done = tasks.filter((t) => t.completed).length;
    return {
      percent: Math.round((done / tasks.length) * 100),
      derived: true,
      source: `${done}/${tasks.length} tasks done`,
    };
  }

  const children = linked?.children ?? [];
  if (goal.kind === "month" && children.length > 0) {
    const total = children.reduce((sum, c) => sum + c.progress, 0);
    const done = children.filter((c) => c.progress >= 100).length;
    return {
      percent: Math.round(total / children.length),
      derived: true,
      source: `${done}/${children.length} priorities done`,
    };
  }

  return { percent: goal.progress, derived: false, source: null };
}

/** Group children and tasks by the goal they hang off. */
export function indexLinks(
  children: Goal[],
  tasks: { id: string; completed: boolean; goalId: string | null }[],
): Map<string, LinkedCounts> {
  const map = new Map<string, LinkedCounts>();
  const get = (id: string): LinkedCounts => {
    let entry = map.get(id);
    if (!entry) {
      entry = { children: [], tasks: [] };
      map.set(id, entry);
    }
    return entry;
  };

  for (const child of children) {
    if (child.parentId) get(child.parentId).children.push(child);
  }
  for (const task of tasks) {
    if (task.goalId) {
      get(task.goalId).tasks.push({ id: task.id, completed: task.completed });
    }
  }
  return map;
}
