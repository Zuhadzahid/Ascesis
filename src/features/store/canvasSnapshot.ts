import { isNodeId, type NodeId, type XY } from "@/features/canvas/defaultLayout";

/**
 * The serialisable slice of canvas state: what lives in localStorage and in
 * `profiles.canvas_state`.
 *
 * This module is deliberately NOT marked "use client" — the server component
 * that loads the profile parses the stored snapshot before handing it to the
 * canvas, so the parser has to be callable from both sides.
 */
export interface Size {
  width: number;
  height: number;
}

export interface CanvasSnapshot {
  version: 1;
  positions: Partial<Record<NodeId, XY>>;
  sizes: Partial<Record<NodeId, Size>>;
  collapsed: Partial<Record<NodeId, boolean>>;
  /** ISO timestamp of the last change; drives last-writer-wins sync. */
  updatedAt: string;
}

export const EPOCH = new Date(0).toISOString();

export function emptySnapshot(): CanvasSnapshot {
  return { version: 1, positions: {}, sizes: {}, collapsed: {}, updatedAt: EPOCH };
}

/** Narrow unknown JSON (from the database or storage) into a usable snapshot. */
export function parseSnapshot(value: unknown): CanvasSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1) return null;

  const positions: Partial<Record<NodeId, XY>> = {};
  if (raw.positions && typeof raw.positions === "object") {
    for (const [key, val] of Object.entries(raw.positions)) {
      if (!isNodeId(key) || !val || typeof val !== "object") continue;
      const xy = val as Record<string, unknown>;
      if (typeof xy.x === "number" && typeof xy.y === "number") {
        positions[key] = { x: xy.x, y: xy.y };
      }
    }
  }

  const sizes: Partial<Record<NodeId, Size>> = {};
  if (raw.sizes && typeof raw.sizes === "object") {
    for (const [key, val] of Object.entries(raw.sizes)) {
      if (!isNodeId(key) || !val || typeof val !== "object") continue;
      const wh = val as Record<string, unknown>;
      if (typeof wh.width === "number" && typeof wh.height === "number") {
        sizes[key] = { width: wh.width, height: wh.height };
      }
    }
  }

  const collapsed: Partial<Record<NodeId, boolean>> = {};
  if (raw.collapsed && typeof raw.collapsed === "object") {
    for (const [key, val] of Object.entries(raw.collapsed)) {
      if (isNodeId(key) && typeof val === "boolean") collapsed[key] = val;
    }
  }

  return {
    version: 1,
    positions,
    sizes,
    collapsed,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : EPOCH,
  };
}
