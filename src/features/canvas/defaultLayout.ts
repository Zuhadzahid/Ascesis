import type { Edge } from "@xyflow/react";

/**
 * Canvas node identity and the default spatial layout of the Ascesis.
 *
 * Positions are world coordinates. The left column holds the execution
 * hierarchy (Yearly -> Monthly -> Weekly Focus -> Today); the right side holds
 * the Challenge protocol and the Weekly Board of free-form tasks.
 */
export const NODE_IDS = {
  yearly: "yearly",
  monthly: "monthly",
  weeklyFocus: "weeklyFocus",
  today: "today",
  challenge: "challenge",
  board: "board",
} as const;

export type NodeId = (typeof NODE_IDS)[keyof typeof NODE_IDS];

export interface XY {
  x: number;
  y: number;
}

export const CARD_WIDTH = 420;

export const DEFAULT_POSITIONS: Record<NodeId, XY> = {
  [NODE_IDS.yearly]: { x: 0, y: 0 },
  [NODE_IDS.monthly]: { x: 0, y: 360 },
  [NODE_IDS.weeklyFocus]: { x: 0, y: 740 },
  [NODE_IDS.today]: { x: 0, y: 1140 },
  [NODE_IDS.challenge]: { x: 520, y: 0 },
  [NODE_IDS.board]: { x: 520, y: 360 },
};

/** The hierarchy connectors drawn between nodes. */
export const DEFAULT_EDGES: Edge[] = [
  {
    id: "e-yearly-monthly",
    source: NODE_IDS.yearly,
    target: NODE_IDS.monthly,
    type: "hierarchy",
  },
  {
    id: "e-monthly-weekly",
    source: NODE_IDS.monthly,
    target: NODE_IDS.weeklyFocus,
    type: "hierarchy",
  },
  {
    id: "e-weekly-today",
    source: NODE_IDS.weeklyFocus,
    target: NODE_IDS.today,
    type: "hierarchy",
  },
  {
    id: "e-challenge-today",
    source: NODE_IDS.challenge,
    target: NODE_IDS.today,
    type: "hierarchy",
    data: { dashed: true, label: "rules" },
  },
  {
    id: "e-weekly-board",
    source: NODE_IDS.weeklyFocus,
    target: NODE_IDS.board,
    type: "hierarchy",
    data: { dashed: true },
  },
];

export function isNodeId(value: string): value is NodeId {
  return Object.prototype.hasOwnProperty.call(DEFAULT_POSITIONS, value);
}
