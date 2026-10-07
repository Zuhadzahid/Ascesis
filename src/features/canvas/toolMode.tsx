"use client";

import { createContext, useContext } from "react";

/**
 * The active canvas tool, in the spirit of tldraw's toolbar.
 *
 *  - "select": the normal mode. Cards move by their header, text selects, and
 *    dragging empty canvas draws a selection marquee.
 *  - "hand": dragging anywhere pans, including across a card. Cards cannot be
 *    moved by accident, which is what you want on a dense canvas.
 *  - "resize": cards hold still and show their resize grips. Separating this
 *    from select means a card can never be resized when you meant to move it,
 *    and the grips can be permanently visible instead of appearing on hover.
 *
 * Middle-drag and Space+drag pan in every mode, so navigating never costs you
 * a tool switch.
 */
export const TOOL_MODES = ["select", "hand", "resize"] as const;

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
 * sprinkled across components. That is what went wrong before: the card header
 * carried a permanent `cursor-grab`, so a hand appeared over cards even when
 * the select tool was active and React Flow was showing an arrow everywhere
 * else. One class, one source of truth, no contradictions.
 */
export function toolRootClass(tool: ToolMode): string {
  return `pos-tool-${tool}`;
}
