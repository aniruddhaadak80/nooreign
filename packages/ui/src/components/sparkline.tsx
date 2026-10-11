import { cn } from "../lib/cn";
import { areaPath, sparklinePath } from "../lib/scales";
import { withAlpha } from "../lib/palette";

/**
 * A series as a line. No axis furniture by default — the atlas uses sparklines
 * as punctuation next to a number, and an axis would push that number off the
 * 8px grid.
 */
export interface SparklineProps {
  values: readonly number[];
  label: string;
  width?: number;
  height?: number;
  color?: string;
  /** Fills under the line. */
  area?: boolean;
  /** Catmull-Rom-ish smoothing instead of straight segments. */
  smooth?: boolean;
  /** Dot at the final sample, calling out "now". */
  showLast?: boolean;
  /** Forces a fixed y-domain, e.g. `[0, 1]` for percentages. */
  domain?: readonly [number, number];
  className?: string;
}

export function Sparkline({
  values,
  label,
  width = 160,
  height = 40,
  color = "var(--color-gold)",
  area = false,
  smooth = false,
  showLast = true,
  domain,
  className,
}: SparklineProps) {
  if (values.length === 0) {
    return (
      <span className={cn("inline-block text-[11px] text-parchment-dim", className)}>{label}</span>
    );
  }

  const line = sparklinePath(values, width, height, { smooth, padding: showLast ? height * 0.18 : 0 });
  const fill = area
    ? areaPath(values, width, height, { smooth, padding: showLast ? height * 0.18 : 0 })
    : "";
  const last = values.at(-1);
  const padding = showLast ? height * 0.18 : 0;
  const max = domain?.[1];
  const min = domain?.[0];
  const rawMax = values.reduce((acc, value) => (value > acc ? value : acc), Number.NEGATIVE_INFINITY);
  const rawMin = values.reduce((acc, value) => (value < acc ? value : acc), Number.POSITIVE_INFINITY);
  const hi = max ?? rawMax;
  const lo = min ?? rawMin;
  const span = hi - lo;
  const ratio = last === undefined || span === 0 ? 0.5 : (last - lo) / span;
  const usableHeight = Math.max(0, height - padding * 2);
  const dotY = padding + usableHeight * (1 - ratio);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`${label}: ${values.length} samples, latest ${last ?? "—"}`}
      className={cn("block overflow-visible", className)}
      preserveAspectRatio="none"
    >
      <title>{`${label}: ${values.length} samples`}</title>
      {fill === "" ? null : <path d={fill} fill={withAlpha(color, 0.14)} />}
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {showLast ? (
        <circle cx={width - padding} cy={dotY} r={2.5} fill={color} vectorEffect="non-scaling-stroke" />
      ) : null}
    </svg>
  );
}