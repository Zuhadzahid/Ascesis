import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

/**
 * Fractional-index ordering. A task's `position` is an opaque string; sorting
 * by it (byte-wise, matching Postgres `collate "C"`) yields display order.
 * Moving a task is a single-field update: compute one new key between its new
 * neighbours. No renumbering, so optimistic updates never fight the server.
 */

/** A key for appending to the end of a column whose last key is `last`. */
export function keyAtEnd(last: string | null): string {
  return generateKeyBetween(last ?? null, null);
}

/** A key for prepending before the first key `first`. */
export function keyAtStart(first: string | null): string {
  return generateKeyBetween(null, first ?? null);
}

/** N keys to seed a fresh column (e.g. initial ordering). */
export function keysForCount(n: number): string[] {
  return generateNKeysBetween(null, null, n);
}

/**
 * The position for dropping an item at `toIndex` in a column, given the
 * column's items already sorted by position. `movingId` is excluded so moving
 * within the same column computes against the item's future neighbours.
 */
export function positionForIndex(
  sorted: { id: string; position: string }[],
  toIndex: number,
  movingId?: string,
): string {
  const list = movingId ? sorted.filter((t) => t.id !== movingId) : sorted;
  const clamped = Math.max(0, Math.min(toIndex, list.length));
  const before = clamped > 0 ? list[clamped - 1].position : null;
  const after = clamped < list.length ? list[clamped].position : null;
  return generateKeyBetween(before, after);
}

/** Stable comparison for rendering: position, then createdAt, then id. */
export function compareTasks(
  a: { position: string; createdAt: string; id: string },
  b: { position: string; createdAt: string; id: string },
): number {
  if (a.position !== b.position) return a.position < b.position ? -1 : 1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
