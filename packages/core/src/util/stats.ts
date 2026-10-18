/**
 * Descriptive statistics for the review surfaces.
 *
 * WHY a module and not a bag of inline reductions: the atlas asks
 * distributional questions — how unevenly are utilons spread, how concentrated
 * is the court behind one option, how much information does a profile carry —
 * and each question has one honest numeric answer. Computing them here keeps
 * the conventions identical everywhere the number is rendered: empty inputs
 * collapse to 0 rather than `NaN`, nothing mutates its input, and every result
 * is a pure function of the values passed in, so a report row can be reproduced
 * from the same corpus and the same seed.
 */

import { clamp, mean, sum } from "./math";

/**
 * Middle value of the sample, averaging the two middles for an even count.
 * Returns 0 for an empty sample, matching `mean`'s convention.
 */
export function median(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

/**
 * Linear-interpolated quantile (the `R-7`/NumPy default), with `q` clamped to
 * `[0, 1]`. `quantile(xs, 0.5)` equals `median(xs)`; returns 0 for an empty
 * sample. The interpolation sits between the two order statistics that bracket
 * the requested rank, so small samples produce the values a reader would write
 * down by hand rather than a nearest-neighbour approximation.
 */
export function quantile(xs: readonly number[], q: number): number {
  if (xs.length === 0) return 0;
  const p = clamp(q, 0, 1);
  const sorted = [...xs].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0] ?? 0;
  const rank = p * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const lo = sorted[lower] ?? 0;
  const hi = sorted[upper] ?? lo;
  return lo + (hi - lo) * (rank - lower);
}

/**
 * Population variance (divides by `n`). The atlas treats each corpus entry as
 * the whole population — a dilemma list is not a sample of a larger list of
 * dilemmas — so the cheaper population form is the honest one here. Empty
 * sample: 0.
 */
export function variance(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  const mu = mean(xs);
  let acc = 0;
  for (const x of xs) {
    const d = x - mu;
    acc += d * d;
  }
  return acc / xs.length;
}

/** Population standard deviation: the square root of `variance`. */
export function stdDev(xs: readonly number[]): number {
  return Math.sqrt(variance(xs));
}

/**
 * Gini coefficient of a non-negative distribution, in `[0, 1]`: 0 means every
 * entry carries the same weight, 1 means all mass sits on one entry. Negative
 * entries are treated as 0 — a benefit cannot be negative, and the coefficient
 * is undefined otherwise. An all-zero sample is defined as 0 rather than a
 * division by zero.
 */
export function gini(xs: readonly number[]): number {
  const values = xs.map((x) => (Number.isFinite(x) && x > 0 ? x : 0));
  const total = sum(values);
  if (total === 0) return 0;
  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);
  let weighted = 0;
  for (let i = 0; i < n; i += 1) {
    weighted += (i + 1) * (sorted[i] ?? 0);
  }
  return clamp((2 * weighted) / (n * total) - (n + 1) / n, 0, 1);
}

/**
 * Shannon entropy of a weight distribution, normalised to `[0, 1]`: 1 means
 * every bucket carries equal mass (maximum uncertainty), 0 means all mass sits
 * on one bucket. Normalising by `log2(n)` is what makes the number comparable
 * across corpora of different sizes, which is the only way the observatory can
 * colour one bar differently from another. Empty input: 0; a single bucket is
 * trivially even, so 1.
 */
export function normalizedEntropy(weights: readonly number[]): number {
  if (weights.length === 0) return 0;
  if (weights.length === 1) return 1;
  const positive = weights.filter((w) => Number.isFinite(w) && w > 0);
  const total = sum(positive);
  if (total === 0 || positive.length <= 1) return 0;
  let bits = 0;
  for (const w of positive) {
    const p = w / total;
    bits -= p * Math.log2(p);
  }
  return clamp(bits / Math.log2(weights.length), 0, 1);
}

/**
 * Standardised scores (`(x - mean) / sd`). When the sample has no spread every
 * z-score is 0 — the sample carries no information about which entry stands
 * out, and `NaN` would poison every downstream comparison. Empty input: `[]`.
 */
export function zScores(xs: readonly number[]): number[] {
  if (xs.length === 0) return [];
  const mu = mean(xs);
  const sd = stdDev(xs);
  if (sd === 0) return xs.map(() => 0);
  return xs.map((x) => (x - mu) / sd);
}

/** One row of the summary table the observatory pages render. */
export interface Summary {
  readonly count: number;
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly median: number;
  readonly p25: number;
  readonly p75: number;
  readonly stdDev: number;
}

/**
 * Five-number-flavoured summary of a sample in one pass over the sorted copy.
 * Empty input yields all zeros so a table cell never renders `undefined`.
 */
export function summary(xs: readonly number[]): Summary {
  if (xs.length === 0) {
    return { count: 0, min: 0, max: 0, mean: 0, median: 0, p25: 0, p75: 0, stdDev: 0 };
  }
  const sorted = [...xs].sort((a, b) => a - b);
  return {
    count: xs.length,
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    mean: mean(xs),
    median: median(xs),
    p25: quantile(xs, 0.25),
    p75: quantile(xs, 0.75),
    stdDev: stdDev(xs),
  };
}
