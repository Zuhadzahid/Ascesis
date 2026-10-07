"use client";

import { createContext, useContext } from "react";

/**
 * The active canvas tool, in the spirit of tldraw's toolbar.
 *
 *  - "select": the normal mode, and the only one most people ever need. Click
 *    a card to select it; the selected card shows its resize handles. Drag a
 *    card's header to move it, a handle to resize it, or empty canvas to pan.
 *    Shift+drag on empty canvas draws a selection box.
 *  - "hand": dragging anywhere pans, including across a card, and nothing can
 *    be moved or resized. This is the safe mode for a dense canvas, and it is
 *    deliberately pan-only — Figma, Miro and tldraw all do the same, because
 *    a hand that also moved things would just be a second arrow.
 *
 * Resize is not a tool. It belongs to the selection, the way it does in every
 * major canvas app: there is nothing to switch into, and handles only ever
 * appear on the card you clicked.
 */
export const TOOL_MODES = ["select", "hand"] as const;

export type ToolMode = (typeof TOOL_MODES)[number];

export function isToolMode(value: unknown): value is ToolMode {
  return TOOL_MODES.includes(value as ToolMode);
}

const ToolModeContext = createContext<ToolMode>("select");

export const ToolModeProvider = ToolModeContext.Provider;

export function useToolMode(): ToolMode {
  return useContext(ToolModeContext);
}

/**
 * Classes for the interactive body of a node.
 *
 * `nowheel` is always on so a scrollable card keeps its own wheel events
 * instead of the canvas swallowing them to pan. `nopan` is dropped in hand
 * mode so a drag across a card still pans the canvas.
 */
export function nodeBodyClass(tool: ToolMode): string {
  return tool === "hand" ? "nodrag nowheel" : "nodrag nopan nowheel";
}

/**
 * The class that drives every cursor on the canvas.
 *
 * Cursors are set in one place, keyed off the active tool, rather than being
 * sprinkled across components. One class, one source of truth, no
 * contradictions between what the pane shows and what a card shows.
 */
export function toolRootClass(tool: ToolMode): string {
  return `pos-tool-${tool}`;
}
