import type { EdgeTypes, NodeTypes } from "@xyflow/react";
import { HierarchyEdge } from "../edges/HierarchyEdge";
import { WeeklyBoardNode } from "./WeeklyBoardNode";
import { YearlyVisionNode } from "./YearlyVisionNode";
import { MonthlyTargetNode } from "./MonthlyTargetNode";
import { WeeklyFocusNode } from "./WeeklyFocusNode";
import { ChallengeNode } from "./ChallengeNode";
import { TodayNode } from "./TodayNode";

/**
 * Module-level constants on purpose: passing fresh objects to ReactFlow
 * remounts every node on each render, which destroys input focus.
 */
export const NODE_TYPES: NodeTypes = {
  yearly: YearlyVisionNode,
  monthly: MonthlyTargetNode,
  weeklyFocus: WeeklyFocusNode,
  today: TodayNode,
  challenge: ChallengeNode,
  board: WeeklyBoardNode,
};

export const EDGE_TYPES: EdgeTypes = {
  hierarchy: HierarchyEdge,
};
