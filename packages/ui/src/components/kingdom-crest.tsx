import type { Charge } from "../svg/crests";
import { crestPath, shieldPath } from "../svg/crests";
import { cn } from "../lib/cn";
import { mix, readableInk, withAlpha } from "../lib/palette";

/**
 * The heraldic mark of a kingdom: a heater shield carrying a charge.
 *
 * Shield and charge both come from the crest layer, so the same mark renders at
 * 20px in a nav rail and at 200px on a kingdom page with no second asset.
 * No `<clipPath>`: SVG ids are document-global, and a duplicated id across a
 * kingdom grid would silently recolour somebody's crest.
 */
export interface KingdomCrestProps {
  charge: Charge;
  /** Heraldic primary, from `kingdom.crest.primary`. */
  primary?: string;
  /** Heraldic accent, from `kingdom.crest.accent`. */
  accent?: string;
  size?: number;
  variant?: "solid" | "duotone" | "outline";
  /** Accessible name. Omit only when adjacent text already names the kingdom. */
  title?: string;
  className?: string;
}

export function KingdomCrest({
  charge,
  primary = "#D9A441",
  accent = "#C8483F",
  size = 48,
  variant = "duotone",
  title,
  className,
}: KingdomCrestProps) {
  const shield = shieldPath(size);
  const mark = crestPath(charge, size);
  const outline = mix(primary, "#070B18", 0.4);
  const chargeFill = variant === "solid" ? readableInk(primary) : accent;
  // Inset hairline just inside the shield edge — the engraved bevel.
  const inset = size / 12;

  return (
    <svg
      viewBox={shield.viewBox}
      width={size}
      height={size}
      role={title === undefined ? "presentation" : "img"}
      aria-hidden={title === undefined ? true : undefined}
      aria-label={title}
      className={cn("shrink-0", className)}
      fill="none"
    >
      {title === undefined ? null : <title>{title}</title>}
      <path
        d={shield.path}
        fill={variant === "outline" ? "none" : withAlpha(primary, 0.18)}
        stroke={outline}
        strokeWidth={size / 64}
      />
      <path
        d={shield.path}
        fill="none"
        stroke={withAlpha(primary, 0.35)}
        strokeWidth={size / 160}
        transform={`translate(${inset} ${inset}) scale(${1 - (2 * inset) / size})`}
      />
      <path
        d={mark.path}
        fill={variant === "outline" ? "none" : chargeFill}
        stroke={variant === "outline" ? accent : "none"}
        strokeWidth={size / 40}
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}