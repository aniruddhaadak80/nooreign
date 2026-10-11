import type { ArgumentMove } from "@repo/seed/types";
import { cn } from "../lib/cn";
import { AXIOM_COLORS } from "../lib/palette";
import { ordinalColors } from "../lib/scales";

/**
 * The argument as a DAG.
 *
 * The node and edge shapes are declared here rather than imported from the core
 * package on purpose: this is a renderer with a two-field contract, and it
 * should not break when the engine grows a third field.
 */
export interface ArgumentNode {
  id: string;
  label: string;
  kind?: ArgumentMove["kind"];
  /** 0..1 — the weight the move carries. */
  weight?: number;
  /** Columns are laid out by depth so the graph reads left to right. */
  depth?: number;
}

export interface ArgumentEdge {
  from: string;
  to: string;
  /** Dashed for a refutation, solid for support, dotted for "depends on". */
  relation?: "supports" | "refutes" | "depends";
  label?: string;
}

export interface ArgumentGraphProps {
  nodes: readonly ArgumentNode[];
  edges: readonly ArgumentEdge[];
  width?: number;
  height?: number;
  onNodeSelect?: (id: string) => void;
  selectedId?: string;
  className?: string;
  title?: string;
}

const EDGE_STYLE: Record<NonNullable<ArgumentEdge["relation"]>, { color: string; dash: string | undefined }> = {
  supports: { color: "var(--color-verdigris)", dash: undefined },
  refutes: { color: "var(--color-crimson)", dash: "5 3" },
  depends: { color: "var(--color-parchment-dim)", dash: "1 4" },
};

const round = (value: number): number => Math.round(value * 100) / 100;

/**
 * Layered layout: depth on x, index-within-depth on y. Not a force simulation —
 * a deliberation has an order, and a deterministic layout keeps that order
 * legible between renders.
 */
function layout(nodes: readonly ArgumentNode[], width: number, height: number): Map<string, { x: number; y: number }> {
  const columns = new Map<number, ArgumentNode[]>();
  for (const node of nodes) {
    const depth = Math.max(0, node.depth ?? 0);
    const bucket = columns.get(depth);
    if (bucket === undefined) columns.set(depth, [node]);
    else bucket.push(node);
  }
  const maxDepth = Math.max(0, ...Array.from(columns.keys()));
  const columnWidth = maxDepth === 0 ? 0 : (width - 120) / maxDepth;
  const positions = new Map<string, { x: number; y: number }>();

  for (const [depth, bucket] of Array.from(columns.entries()).sort((a, b) => a[0] - b[0])) {
    const x = 60 + depth * columnWidth;
    const slot = (height - 40) / (bucket.length + 1);
    bucket.forEach((node, index) => {
      positions.set(node.id, { x: round(x), y: round(20 + slot * (index + 1)) });
    });
  }
  return positions;
}

export function ArgumentGraph({
  nodes,
  edges,
  width = 720,
  height = 320,
  onNodeSelect,
  selectedId,
  className,
  title = "Argument graph",
}: ArgumentGraphProps) {
  const positions = layout(nodes, width, height);
  const axiomColours = ordinalColors(
    nodes.map((node) => node.kind ?? "premise"),
    Object.values(AXIOM_COLORS),
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("block w-full", className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <g>
        {edges.map((edge) => {
          const from = positions.get(edge.from);
          const to = positions.get(edge.to);
          if (from === undefined || to === undefined) return null;
          const style = EDGE_STYLE[edge.relation ?? "supports"];
          const mid = (from.x + to.x) / 2;
          return (
            <path
              key={`${edge.from}-${edge.to}-${edge.relation ?? "supports"}`}
              d={`M${from.x},${from.y} C${mid},${from.y} ${mid},${to.y} ${to.x},${to.y}`}
              fill="none"
              stroke={style.color}
              strokeWidth={1.2}
              strokeDasharray={style.dash}
              opacity={0.7}
            >
              {edge.label === undefined ? null : <title>{edge.label}</title>}
            </path>
          );
        })}
      </g>
      <g>
        {nodes.map((node) => {
          const position = positions.get(node.id);
          if (position === undefined) return null;
          const weight = node.weight ?? 0.5;
          const radius = 7 + weight * 7;
          const colour = axiomColours.get(node.kind ?? "premise") ?? "var(--color-gold)";
          const selected = node.id === selectedId;
          const interactive = onNodeSelect !== undefined;
          return (
            <g
              key={node.id}
              transform={`translate(${position.x} ${position.y})`}
              className={interactive ? "cursor-pointer" : undefined}
              {...(interactive ? { onClick: () => onNodeSelect(node.id) } : {})}
            >
              {selected ? (
                <circle r={radius + 5} fill="none" stroke={colour} strokeWidth={1} opacity={0.5} />
              ) : null}
              <circle r={radius} fill="var(--color-abyss-raised)" stroke={colour} strokeWidth={1.6} />
              <text
                y={radius + 12}
                textAnchor="middle"
                fontSize={9}
                letterSpacing={0.12}
                fill="var(--color-parchment-dim)"
                style={{ fontFamily: "var(--font-mono, monospace)", textTransform: "uppercase" }}
              >
                {node.label}
              </text>
              <title>{`${node.label} — weight ${weight.toFixed(2)}`}</title>
            </g>
          );
        })}
      </g>
      <desc>{`${nodes.length} moves joined by ${edges.length} relations.`}</desc>
    </svg>
  );
}