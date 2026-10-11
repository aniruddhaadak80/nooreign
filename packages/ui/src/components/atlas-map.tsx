import type { Kingdom } from "@repo/seed/types";
import { titleCase } from "../lib/format";
import { cn } from "../lib/cn";
import { hashSeed } from "../svg/terrain";

/**
 * The atlas itself: every kingdom plotted at its capital's coordinates on the
 * 0..100 plane, with relation edges drawn underneath the nodes.
 *
 * The projection is deliberately not a Mercator or a globe. Kingdoms argue with
 * each other, not across an ocean, so a flat plane with a decorative graticule
 * says "diagram" rather than "map" — which is what this is.
 */
export interface AtlasEdge {
  from: string;
  to: string;
  kind: "alliance" | "rivalry" | "vassal" | "debate" | "succession";
  note?: string;
}

export interface AtlasMapProps {
  kingdoms: readonly Kingdom[];
  /** Defaults to each kingdom's own `relations`, deduplicated. */
  edges?: readonly AtlasEdge[];
  width?: number;
  height?: number;
  activeId?: string;
  selectedId?: string;
  onSelect?: (id: string) => void;
  showLabels?: boolean;
  className?: string;
  title?: string;
}

const RELATION_STYLE: Record<AtlasEdge["kind"], { stroke: string; dash: string | undefined; width: number }> = {
  alliance: { stroke: "var(--color-verdigris)", dash: undefined, width: 1.2 },
  rivalry: { stroke: "var(--color-crimson)", dash: "4 3", width: 1.2 },
  vassal: { stroke: "var(--color-parchment-dim)", dash: "1 4", width: 1.6 },
  debate: { stroke: "var(--color-gold)", dash: "6 4", width: 1 },
  succession: { stroke: "var(--color-indigo-glow)", dash: "8 4 2 4", width: 1 },
};

function defaultEdges(kingdoms: readonly Kingdom[]): AtlasEdge[] {
  const seen = new Set<string>();
  const edges: AtlasEdge[] = [];
  for (const kingdom of kingdoms) {
    for (const relation of kingdom.relations) {
      const key = `${kingdom.id}->${relation.to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: kingdom.id, to: relation.to, kind: relation.kind });
    }
  }
  return edges;
}

export function AtlasMap({
  kingdoms,
  edges,
  width = 100,
  height = 70,
  activeId,
  selectedId,
  onSelect,
  showLabels = true,
  className,
  title = "Atlas of the kingdoms of mind",
}: AtlasMapProps) {
  const resolved = edges ?? defaultEdges(kingdoms);
  const byId = new Map(kingdoms.map((kingdom) => [kingdom.id, kingdom]));
  // Plane coordinates are 0..100 on both axes; the viewBox is the plate size.
  const project = (x: number, y: number): { x: number; y: number } => ({ x, y: (y / 100) * height });

  const graticule: string[] = [];
  for (let step = 10; step < 100; step += 10) {
    graticule.push(`M${step},0 L${step},${height}`);
    graticule.push(`M0,${(step / 100) * height} L${width},${(step / 100) * height}`);
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("block w-full", className)}
      role="img"
      aria-label={title}
      preserveAspectRatio="xMidYMid meet"
    >
      <title>{title}</title>
      <path d={graticule.join(" ")} stroke="var(--color-abyss-border)" strokeWidth={0.15} fill="none" />

      <g>
        {resolved.map((edge) => {
          const source = byId.get(edge.from);
          const target = byId.get(edge.to);
          if (source === undefined || target === undefined) return null;
          const a = project(source.capital.x, source.capital.y);
          const b = project(target.capital.x, target.capital.y);
          const style = RELATION_STYLE[edge.kind];
          return (
            <line
              key={`${edge.from}-${edge.to}-${edge.kind}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={style.stroke}
              strokeWidth={style.width}
              strokeDasharray={style.dash}
              strokeLinecap="round"
              opacity={activeId === undefined || activeId === edge.from || activeId === edge.to ? 0.75 : 0.18}
            >
              {edge.note === undefined ? null : <title>{`${titleCase(edge.kind)}: ${edge.note}`}</title>}
            </line>
          );
        })}
      </g>

      <g>
        {kingdoms.map((kingdom) => {
          const point = project(kingdom.capital.x, kingdom.capital.y);
          const selected = kingdom.id === selectedId;
          const dimmed = activeId !== undefined && kingdom.id !== activeId;
          const seed = hashSeed(kingdom.id);
          const radius = 1.1 + ((seed % 7) / 7) * 0.8;
          const interactive = onSelect !== undefined;
          return (
            <g
              key={kingdom.id}
              transform={`translate(${point.x} ${point.y})`}
              opacity={dimmed ? 0.35 : 1}
              className={interactive ? "cursor-pointer" : undefined}
              {...(interactive ? { onClick: () => onSelect(kingdom.id) } : {})}
            >
              {selected ? (
                <circle r={radius + 2.2} fill="none" stroke={kingdom.crest.accent} strokeWidth={0.4} opacity={0.9} />
              ) : null}
              <circle
                r={radius}
                fill={kingdom.crest.primary}
                stroke="var(--color-abyss)"
                strokeWidth={0.4}
              />
              {showLabels ? (
                <text
                  x={radius + 1}
                  y={1}
                  textAnchor="start"
                  fontSize={3}
                  letterSpacing={0.18}
                  fill="var(--color-parchment-dim)"
                  style={{ textTransform: "uppercase", fontFamily: "var(--font-mono, monospace)" }}
                >
                  {kingdom.name}
                </text>
              ) : null}
              <title>{`${kingdom.name} — ${kingdom.capital.name}`}</title>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export { RELATION_STYLE };