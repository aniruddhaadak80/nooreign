/**
 * Small, dependency-free numeric helpers shared by every engine in `@repo/core`.
 *
 * WHY: the deliberation engine must produce byte-identical output for identical
 * inputs (it is rendered as "the arithmetic the court actually did"). That rules
 * out anything with hidden state, and it makes the awkward corners — empty
 * arrays, zero denominators, zero-length windows — explicit at the call site
 * instead of leaving them as `NaN` leaking into a verdict.
 */

/** Restrict `n` to `[min, max]`. NaN collapses to `min` so callers never render "NaN%". */
export function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

/**
 * Round to `dp` decimal places, neutralising binary float dust such as
 * `0.1 + 0.2 === 0.30000000000000004`.
 */
export function round(n: number, dp = 4): number {
  if (!Number.isFinite(n)) return n;
  const factor = 10 ** dp;
  // The `+ Number.EPSILON` nudge only matters for positive products; the sign is
  // re-applied afterwards so negative values round half-away-from-zero.
  const scaled = n * factor;
  const rounded = Math.round(Math.abs(scaled) + Number.EPSILON * Math.abs(scaled)) * Math.sign(scaled);
  return rounded / factor;
}

/** Linear interpolation: `t = 0` yields `a`, `t = 1` yields `b`. `t` is not clamped. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function sum(xs: readonly number[]): number {
  let total = 0;
  for (const x of xs) total += x;
  return total;
}

export function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  return sum(xs) / xs.length;
}

/** Euclidean inner product. Returns 0 for mismatched lengths rather than throwing. */
export function dot(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length);
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    total += x * y;
  }
  return total;
}

/**
 * Cosine similarity in [-1, 1]. A zero-length vector has no direction, so it is
 * treated as maximally uninformative rather than as similar to everything.
 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length);
  let ab = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < n; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    ab += x * y;
    aa += x * x;
    bb += y * y;
  }
  const denom = Math.sqrt(aa) * Math.sqrt(bb);
  if (denom === 0) return 0;
  return clamp(ab / denom, -1, 1);
}

/** Scale to unit length. A zero vector cannot be scaled, so it is returned unchanged. */
export function normalize(xs: readonly number[]): number[] {
  const norm = Math.sqrt(sum(xs.map((x) => x * x)));
  if (norm === 0) return [...xs];
  return xs.map((x) => x / norm);
}

/**
 * Weighted average. When every weight is zero the weights carry no information,
 * so we fall back to the plain mean instead of dividing by zero.
 */
export function weightedMean(values: readonly number[], weights: readonly number[]): number {
  if (values.length === 0) return 0;
  const w = sum(weights);
  if (w === 0) return mean(values);
  const n = Math.min(values.length, weights.length);
  let acc = 0;
  for (let i = 0; i < n; i += 1) {
    acc += (values[i] ?? 0) * (weights[i] ?? 0);
  }
  return acc / w;
}

/**
 * Softmax with temperature.
 *
 * A low temperature sharpens towards argmax (the court converging); a high one
 * flattens towards a uniform distribution (the court spread thin). Temperature
 * <= 0 is treated as a hard argmax so callers can pass 0 meaning "certain".
 */
export function softmax(xs: readonly number[], temperature = 1): number[] {
  if (xs.length === 0) return [];
  if (temperature <= 0) {
    const max = maxOf(xs);
    const winners = xs.filter((x) => x === max);
    const share = safeDiv(1, winners.length);
    return xs.map((x) => (x === max ? share : 0));
  }
  const max = maxOf(xs);
  const exps = xs.map((x) => Math.exp((x - max) / temperature));
  const total = sum(exps);
  if (total === 0) return xs.map(() => safeDiv(1, xs.length));
  return exps.map((e) => e / total);
}

/** Smallest value, or 0 for an empty list. */
export function minOf(xs: readonly number[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (const x of xs) if (x < best) best = x;
  return xs.length === 0 ? 0 : best;
}

/** Largest value, or 0 for an empty list. */
export function maxOf(xs: readonly number[]): number {
  let best = Number.NEGATIVE_INFINITY;
  for (const x of xs) if (x > best) best = x;
  return xs.length === 0 ? 0 : best;
}

/** Split into `[matching, rest]`, preserving input order in both halves. */
export function partition<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): [T[], T[]] {
  const yes: T[] = [];
  const no: T[] = [];
  items.forEach((item, index) => {
    if (predicate(item, index)) yes.push(item);
    else no.push(item);
  });
  return [yes, no];
}

/**
 * Inclusive numeric range, guarding the classic `step = 0` infinite loop.
 * Floating point accumulation is avoided by stepping an integer counter.
 */
export function range(min: number, max: number, step = 1): number[] {
  if (step <= 0 || !Number.isFinite(step)) return [];
  if (min > max) return [];
  const out: number[] = [];
  const count = Math.floor((max - min) / step) + 1;
  for (let i = 0; i < count; i += 1) {
    const value = min + i * step;
    out.push(round(value, 10));
  }
  return out;
}

/**
 * Trailing simple moving average. The first `window - 1` entries average the
 * shorter prefix available, so the series never has holes; a `window` below 1 or
 * an empty input yields `[]`.
 */
export function movingAverage(xs: readonly number[], window: number): number[] {
  if (window < 1 || xs.length === 0) return [];
  const out: number[] = [];
  let running = 0;
  for (let i = 0; i < xs.length; i += 1) {
    running += xs[i] ?? 0;
    if (i >= window) running -= xs[i - window] ?? 0;
    const count = i < window ? i + 1 : window;
    out.push(round(safeDiv(running, count), 10));
  }
  return out;
}

/** Division that yields 0 instead of Infinity/NaN when the denominator is 0. */
export function safeDiv(n: number, d: number): number {
  if (d === 0) return 0;
  const result = n / d;
  return Number.isFinite(result) ? result : 0;
}

/** -1, 0 or 1. Used to turn a signed margin into a comparison-safe quantity. */
export function sign(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n > 0) return 1;
  if (n < 0) return -1;
  return 0;
}