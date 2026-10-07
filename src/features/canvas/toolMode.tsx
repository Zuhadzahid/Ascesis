"use client";

import { createContext, useContext } from "react";

/**
 * The active canvas tool, in the spirit of tldraw's toolbar.
 *
 *  - "select": the normal mode. Cards are draggable by their header, text is
 *    selectable, and dragging empty canvas pans.
 *  - "hand": dragging anywhere pans, including over a card. Cards cannot be
 *    moved by accident, which is what you want on a dense canvas.
 */
export type ToolMode = "select" | "hand";

const ToolModeContext = createContext<ToolMode>("select");

export const ToolModeProvider = ToolModeContext.Provider;

export function useToolMode(): ToolMode {
  return useContext(ToolModeContext);
}

/**
 * Classes for the interactive body of a node.
 *
 * `nowheel` is always on so a scrollable card keeps its own wheel events
 * instead of the canvas swallowing them to pan. `nopan` is only applied in
 * select mode, so the hand tool can pan by dragging across a card.
 */
export function nodeBodyClass(tool: ToolMode): string {
  return tool === "hand" ? "nodrag nowheel" : "nodrag nopan nowheel";
}
