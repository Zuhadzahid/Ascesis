"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DEFAULT_POSITIONS,
  type NodeId,
  type XY,
} from "@/features/canvas/defaultLayout";
import { EPOCH, type CanvasSnapshot, type Size } from "./canvasSnapshot";

// Re-exported as a type only. `parseSnapshot` must be imported from
// ./canvasSnapshot directly, because this module is client-only and the server
// component needs to parse the stored layout too.
export type { CanvasSnapshot };

interface CanvasStore extends CanvasSnapshot {
  /** Not persisted. */
  selectedId: NodeId | null;
  /**
   * Bumped only when state changes from OUTSIDE the canvas (server hydration,
   * reset layout). React Flow re-seeds node positions when this changes; a
   * local drag does not bump it, because React Flow already has that position.
   */
  revision: number;
  setPosition: (id: NodeId, xy: XY) => void;
  setSize: (id: NodeId, size: Size) => void;
  /** Drop a stored size so the card returns to its natural dimensions. */
  clearSize: (id: NodeId) => void;
  setCollapsed: (id: NodeId, collapsed: boolean) => void;
  select: (id: NodeId | null) => void;
  resetLayout: () => void;
  /** Replace local state with a server snapshot (server judged newer). */
  applySnapshot: (snapshot: CanvasSnapshot) => void;
  snapshot: () => CanvasSnapshot;
}

const EMPTY: Omit<CanvasSnapshot, "updatedAt"> = {
  version: 1,
  positions: {},
  sizes: {},
  collapsed: {},
};

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set, get) => ({
      ...EMPTY,
      updatedAt: EPOCH,
      selectedId: null,
      revision: 0,

      setPosition: (id, xy) =>
        set((s) => ({
          positions: { ...s.positions, [id]: xy },
          updatedAt: new Date().toISOString(),
        })),

      setSize: (id, size) =>
        set((s) => ({
          sizes: { ...s.sizes, [id]: size },
          updatedAt: new Date().toISOString(),
        })),

      clearSize: (id) =>
        set((s) => {
          const next = { ...s.sizes };
          delete next[id];
          return { sizes: next, updatedAt: new Date().toISOString() };
        }),

      setCollapsed: (id, collapsed) =>
        set((s) => ({
          collapsed: { ...s.collapsed, [id]: collapsed },
          updatedAt: new Date().toISOString(),
        })),

      select: (id) => set({ selectedId: id }),

      resetLayout: () =>
        set((s) => ({
          positions: {},
          sizes: {},
          collapsed: {},
          updatedAt: new Date().toISOString(),
          revision: s.revision + 1,
        })),

      applySnapshot: (snapshot) =>
        set((s) => ({
          version: 1,
          positions: snapshot.positions,
          sizes: snapshot.sizes ?? {},
          collapsed: snapshot.collapsed,
          updatedAt: snapshot.updatedAt,
          revision: s.revision + 1,
        })),

      snapshot: () => {
        const s = get();
        return {
          version: 1,
          positions: s.positions,
          sizes: s.sizes,
          collapsed: s.collapsed,
          updatedAt: s.updatedAt,
        };
      },
    }),
    {
      name: "pos:canvas:anon",
      storage: createJSONStorage(() => localStorage),
      // Rehydrated manually once the user id is known, so two accounts sharing
      // a browser never read each other's layout, and SSR never mismatches.
      skipHydration: true,
      partialize: (s) => ({
        version: s.version,
        positions: s.positions,
        sizes: s.sizes,
        collapsed: s.collapsed,
        updatedAt: s.updatedAt,
      }),
    },
  ),
);

/** Position for a node, falling back to the default layout. */
export function positionOf(
  positions: Partial<Record<NodeId, XY>>,
  id: NodeId,
): XY {
  return positions[id] ?? DEFAULT_POSITIONS[id];
}
