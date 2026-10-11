import type { Advisor } from "@repo/seed/types";
import { portraitSvg } from "../svg/portraits";
import { cn } from "../lib/cn";
import { withAlpha } from "../lib/palette";

/**
 * Geometric portrait: hue ring, crest charge, bust, and the advisor's sigil
 * initials drawn with the geometric alphabet. Nothing here is a photograph and
 * nothing here is typeset — the whole point is that the court is a court of ideas.
 */
export interface AdvisorPortraitProps {
  advisor: Advisor;
  size?: number;
  /** Ring thickness in user units (of a 100-unit box). */
  ringWidth?: number;
  /** Hides the sigil initials inside the bust. */
  hideInitials?: boolean;
  className?: string;
}

/**
 * A sigil glyph is authored across the full `size × size` box, so it is placed
 * with a pure scale — no per-size arithmetic, and the stroke weight stays
 * proportional to the plate instead of snapping to a hairline at 32px.
 */
function initialTransform(size: number, count: number, index: number): string {
  const scale = count > 1 ? 0.34 : 0.52;
  const glyphWidth = size * scale;
  const gutter = size * 0.04;
  const total = count * glyphWidth + Math.max(0, count - 1) * gutter;
  const x = (size - total) / 2 + index * (glyphWidth + gutter);
  const y = size * 0.26;
  return `translate(${round(x)} ${round(y)}) scale(${scale})`;
}

const round = (value: number): number => Math.round(value * 100) / 100;

export function AdvisorPortrait({
  advisor,
  size = 96,
  ringWidth = 3,
  hideInitials = false,
  className,
}: AdvisorPortraitProps) {
  const art = portraitSvg(advisor, size);
  const name = `${advisor.name} — ${advisor.portrait.sigil}`;
  const initials = art.initials;

  return (
    <svg
      viewBox={art.viewBox}
      width={size}
      height={size}
      role="img"
      aria-label={`Portrait of ${name}`}
      className={cn("shrink-0", className)}
      fill="none"
    >
      <title>{name}</title>
      {/* Ring first, so the bust sits inside the hoop like a struck medal. */}
      <path d={art.ring} fill="none" stroke={art.hue} strokeWidth={ringWidth} opacity={0.9} />
      <path d={art.ring} fill="none" stroke="var(--color-abyss)" strokeWidth={ringWidth * 0.4} opacity={0.6} />
      <path d={art.silhouette} fill={withAlpha(art.hue, 0.16)} stroke={withAlpha(art.hue, 0.7)} strokeWidth={1} />
      <path d={art.charge.path} fill={withAlpha(art.hue, 0.32)} fillRule="evenodd" clipRule="evenodd" />
      {hideInitials ? null : initials.map((glyph, index) => (
        <path
          key={`${art.seed}-${index}`}
          d={glyph.path}
          transform={initialTransform(size, initials.length, index)}
          fill="none"
          stroke="var(--color-parchment)"
          strokeWidth={glyph.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}