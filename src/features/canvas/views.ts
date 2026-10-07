import { NODE_IDS, type NodeId } from "./defaultLayout";

/**
 * The canvas can show everything at once, or one card at a time.
 *
 * The Dashboard is the whole operating system laid out and connected. The
 * other tabs isolate a single level of the hierarchy, so someone new is not
 * confronted with six cards before they know what any of them do.
 */
export type ViewTab =
  | "dashboard"
  | "yearly"
  | "monk"
  | "monthly"
  | "weekly"
  | "today"
  | "board";

export const VIEW_TABS: { id: ViewTab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "yearly", label: "Yearly" },
  { id: "monk", label: "Monk Mode" },
  { id: "monthly", label: "Monthly" },
  { id: "weekly", label: "Weekly" },
  { id: "today", label: "Today" },
  { id: "board", label: "Board" },
];

const ALL: NodeId[] = [
  NODE_IDS.yearly,
  NODE_IDS.monthly,
  NODE_IDS.weeklyFocus,
  NODE_IDS.today,
  NODE_IDS.challenge,
  NODE_IDS.board,
];

export const NODES_FOR_VIEW: Record<ViewTab, NodeId[]> = {
  dashboard: ALL,
  yearly: [NODE_IDS.yearly],
  monk: [NODE_IDS.challenge],
  monthly: [NODE_IDS.monthly],
  weekly: [NODE_IDS.weeklyFocus],
  today: [NODE_IDS.today],
  board: [NODE_IDS.board],
};

export function isViewTab(value: string | null): value is ViewTab {
  return !!value && VIEW_TABS.some((t) => t.id === value);
}

export function parseViewTab(value: string | null): ViewTab {
  return isViewTab(value) ? value : "dashboard";
}
