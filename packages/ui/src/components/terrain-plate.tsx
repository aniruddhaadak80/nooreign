import type { Terrain } from "@repo/seed/types";
import { hashSeed, terrainPath } from "../svg/terrain";
import { cn } from "../lib/cn";
import { mix, withAlpha } from "../lib/palette";

/**
 * A kingdom's province, drawn from its id so the plate is stable across routes
 * and builds. The ink layer is filled with the kingdom colour at low alpha and
 * the accent layer on top, which reads as topography without a gradient.
 */
export interface TerrainPlateProps {
  terrain: Terrain;
  /** Any stable string — `kingdom.id` is the usual choice. */
  seedKey: string;
  primary?: string;
  accent?: string;
  width?: number;
  height?: number;
  title?: string;
  /** Fills the container with `object-cover` semantics. */
  className?: string;
  /** Dim the plate so overlaid text stays legible. */
  veil?: boolean;
}

export function TerrainPlate({
  terrain,
  seedKey,
  primary = "#D9A441",
  accent = "#4FA88B",
  width = 480,
  height = 200,
  title,
  className,
  veil = false,
}: TerrainPlateProps) {
  const plate = terrainPath(terrain, width, height, hashSeed(seedKey));
  const ink = withAlpha(primary, 0.22);
  const inkDeep = mix(primary, "#070B18", 0.72);

  return (
    <svg
      viewBox={plate.viewBox}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      role={title === undefined ? "presentation" : "img"}
      aria-hidden={title === undefined ? true : undefined}
      aria-label={title}
      className={cn("block", className)}
    >
      {title === undefined ? null : <title>{title}</title>}
      <path d={plate.path} fill={inkDeep} />
      <path d={plate.path} fill={ink} />
      <path d={plate.accents} fill={withAlpha(accent, 0.5)} />
      {veil ? <path d={plate.viewBox} fill={withAlpha("#070B18", 0.55)} /> : null}
    </svg>
  );
}