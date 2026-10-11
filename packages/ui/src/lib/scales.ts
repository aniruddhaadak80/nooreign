import { scaleLinear, type ScaleLinear } from "d3-scale";

/**
 * Scales and path geometry for the SVG chrome.
 *
 * Every generator is deterministic: no `Math.random`, no clock, no locale. The
 * atlas renders the same atlas on the server and on the client, so any drift
 * here would show up as a hydration mismatch on every gauge.
 */

export type ClampScale = ScaleLinear<number, number, never>;

/** Linear and clamped outside the domain — meters must never overdraw. */
export function clampScale(domain: readonly [number, number], range: readonly [number, number]): ClampScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  return scaleLinear<number, number>().domain([d0, d1]).range([r0, r1]).clamp(true);
}

export interface BandScale {
  /** Distance between the left edges of consecutive bands. */
  step: number;
  /** Drawable width inside each band. */
  bandwidth: number;
  /** Left edge of band `i`. */
  index: (i: number) => number;
  /** Centre of band `i` — what bars and labels actually align to. */
  center: (i: number) => number;
}

/**
 * `padding` is the fraction of a band lost to gutters, matching the way a
 * charting library reports inner padding. `bandScale(5, 100, 0.2)` therefore
 * yields a 20px step and a 16px bandwidth.
 */
export function bandScale(count: number, width: number, padding = 0): BandScale {
  const safeCount = Math.max(0, Math.floor(count));
  const safePadding = Math.min(0.95, Math.max(0, padding));
  const step = safeCount === 0 ? 0 : width / safeCount;
  const bandwidth = step * (1 - safePadding);
  const safeIndex = (i: number): number => (Number.isFinite(i) ? i : 0) * step;
  return {
    step,
    bandwidth,
    index: safeIndex,
    center: (i: number) => safeIndex(i) + bandwidth / 2,
  };
}

export interface Point {
  x: number;
  y: number;
}

/** Compass convention: 0° is twelve o'clock, angles increase clockwise. */
export function radialPosition(angleDegrees: number, radius: number, cx = 0, cy = 0): Point {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.sin(radians),
    y: cy - radius * Math.cos(radians),
  };
}

/**
 * Stable colour assignment: keys are folded to their sorted-unique set before
 * the palette index is taken, so the same item keeps its hue even when the
 * caller's array is reordered between renders.
 */
export function ordinalColors(items: readonly string[], palette: readonly string[]): ReadonlyMap<string, string> {
  const assignments = new Map<string, string>();
  if (palette.length === 0) return assignments;
  const unique = [...new Set(items)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  unique.forEach((item, index) => {
    const colour = palette[index % palette.length];
    if (colour !== undefined) assignments.set(item, colour);
  });
  return assignments;
}

/** Tension for the optional smoothed variants; 0 means straight segments. */
export function curveTension(tension = 0.2): number {
  if (!Number.isFinite(tension)) return 0;
  return Math.min(1, Math.max(0, tension));
}

export interface PathOptions {
  /** Pad the drawing box so strokes at the extremes are not clipped. */
  padding?: number;
  /** When true, emit Catmull-Rom style cubic segments instead of lines. */
  smooth?: boolean;
  tension?: number;
}

const round = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? "0" : String(rounded);
};

/** Monotone-ish polyline. One `M` then one `L` per value. */
export function sparklinePath(
  values: readonly number[],
  width = 100,
  height = 32,
  options: PathOptions = {},
): string {
  const points = normalise(values, width, height, options.padding ?? 0);
  if (points.length === 0) return "";
  const first = points[0];
  if (first === undefined) return "";
  if (points.length === 1) return `M${round(first.x)},${round(first.y)}`;
  if (options.smooth === true) {
    return smoothPath(points, curveTension(options.tension ?? 0.2));
  }
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${round(point.x)},${round(point.y)}`).join(" ");
}

/** The `sparklinePath` outline closed down to the baseline, for area fills. */
export function areaPath(
  values: readonly number[],
  width = 100,
  height = 32,
  options: PathOptions = {},
): string {
  const points = normalise(values, width, height, options.padding ?? 0);
  const first = points[0];
  const last = points.at(-1);
  if (first === undefined || last === undefined) return "";
  const top = sparklinePath(values, width, height, options);
  return `${top} L${round(last.x)},${round(height)} L${round(first.x)},${round(height)} Z`;
}

function normalise(
  values: readonly number[],
  width: number,
  height: number,
  padding: number,
): Point[] {
  if (values.length === 0) return [];
  const safePadding = Math.min(width / 2 - 0.01, Math.max(0, padding));
  const usableWidth = Math.max(0, width - safePadding * 2);
  const usableHeight = Math.max(0, height - safePadding * 2);
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    const safe = Number.isFinite(value) ? value : 0;
    if (safe < min) min = safe;
    if (safe > max) max = safe;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  const span = max - min;
  const lastIndex = Math.max(1, values.length - 1);
  return values.map((value, index) => {
    const safe = Number.isFinite(value) ? value : min;
    // A flat series should sit on the midline rather than snap to an edge.
    const ratio = span === 0 ? 0.5 : (safe - min) / span;
    return {
      x: safePadding + (usableWidth * index) / lastIndex,
      y: safePadding + usableHeight * (1 - ratio),
    };
  });
}

function smoothPath(points: readonly Point[], tension: number): string {
  const head = points[0];
  if (head === undefined) return "";
  const segments = points.slice(1).map((point, index) => {
    const previous = points[index] ?? head;
    const current = point;
    const next = points[index + 2] ?? current;
    const c1x = previous.x + (current.x - next.x === 0 ? 0 : (current.x - previous.x) * tension);
    const c1y = previous.y + (current.y - next.y) * tension;
    const c2x = current.x - (next.x - previous.x) * tension;
    const c2y = current.y - (next.y - previous.y) * tension;
    return `C${round(c1x)},${round(c1y)} ${round(c2x)},${round(c2y)} ${round(current.x)},${round(current.y)}`;
  });
  return [`M${round(head.x)},${round(head.y)}`, ...segments].join(" ");
}

/** Evenly spaced degrees for n council seats, first seat at twelve o'clock. */
export function ringAngles(count: number): number[] {
  const safeCount = Math.max(0, Math.floor(count));
  if (safeCount === 0) return [];
  return Array.from({ length: safeCount }, (_, index) => (360 / safeCount) * index);
}

/** Arc segment as a path — used by RingGauge, BarMeter and EraRail. */
export function arcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = radialPosition(startAngle, radius, cx, cy);
  const end = radialPosition(endAngle, radius, cx, cy);
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  const sweep = endAngle >= startAngle ? 1 : 0;
  return `M${round(start.x)},${round(start.y)} A${round(radius)},${round(radius)} 0 ${largeArc} ${sweep} ${round(end.x)},${round(end.y)}`;
}