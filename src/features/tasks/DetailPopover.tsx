"use client";

import { Markdown } from "./Markdown";

/**
 * Hover preview of a task's details. Positioned above the card, capped height,
 * scrolls if long. Rendered inside the card so it inherits the world transform;
 * `data-no-pan` keeps it from starting a canvas pan.
 */
export function DetailPopover({ details }: { details: string }) {
  return (
    <div
      data-no-pan
      className="absolute bottom-[calc(100%+8px)] left-0 z-30 w-[280px] max-w-[80vw] rounded-[10px] border border-card-border bg-card p-3 shadow-float"
    >
      <div className="max-h-[240px] overflow-y-auto wc-scroll">
        <Markdown>{details}</Markdown>
      </div>
      <div className="absolute -bottom-1.5 left-5 size-3 rotate-45 border-b border-r border-card-border bg-card" />
    </div>
  );
}
