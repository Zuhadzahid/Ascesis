"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";

/**
 * Connector between hierarchy nodes: Yearly to Monthly to Weekly to Today.
 * Dashed edges mark a softer relationship (challenge rules, board link).
 */
export function HierarchyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 14,
  });

  const dashed = Boolean(data?.dashed);
  const label = typeof data?.label === "string" ? data.label : null;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: "var(--color-olive)",
          strokeWidth: 1.5,
          strokeDasharray: dashed ? "6 5" : undefined,
          opacity: dashed ? 0.6 : 0.85,
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute rounded-full border border-card-border bg-card px-2 py-0.5 text-[10px] font-medium text-ink-soft shadow-card"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
