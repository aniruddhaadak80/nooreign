/**
 * Near-miss matching for the codex: "did you mean ..." over the index's own terms.
 *
 * WHY this exists next to `suggest`: prefix completion only helps while the
 * reader is still typing the right word. Once a term is misspelled at the stem
 * ("utiliterianism", "obersight") completion returns nothing, and the honest
 * reply is the closest terms the corpus actually contains. The vocabulary is
 * closed and small, so the whole scan is cheap enough to run per keystroke.
 *
 * Every ordering here is total and machine-independent: distance first, then
 * document frequency, then a code-unit comparison of the terms. Two candidate
 * corrections can never swap places between renders.
 */

import type { SearchIndex } from "./index";

/** How many edits a candidate may stray before it stops being a correction. */
export const NEAR_MISS_MAX_DISTANCE = 2;

/**
 * Levenshtein distance, abandoned as soon as it provably exceeds `max`.
 * Returns `max + 1` for a pair that is further apart, which is the same
 * convention as an exact-then-truncate search and keeps the early exit cheap.
 *
 * Only the previous row is kept: the full matrix is never needed because the
 * caller only wants the value, and the abandon-on-row-minimum rule means a long
 * wrong candidate dies after one pass over the short word.
 */
export function boundedDistance(a: string, b: string, max: number): number {
  if (a === b) return 0;
  // A budget below zero has no valid edit chain, so it behaves exactly like 0.
  if (max <= 0) return 1;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  const short = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;
  if (short.length === 0) return long.length > max ? max + 1 : long.length;

  let previous: number[] = [];
  let current: number[] = [];
  for (let j = 0; j <= long.length; j += 1) previous.push(j);

  for (let i = 1; i <= short.length; i += 1) {
    current = [i];
    let rowMin = i;
    const sc = short.charCodeAt(i - 1);
    for (let j = 1; j <= long.length; j += 1) {
      const cost = sc === long.charCodeAt(j - 1) ? 0 : 1;
      const value = Math.min(
        (previous[j] ?? 0) + 1, // deletion
        (current[j - 1] ?? 0) + 1, // insertion
        (previous[j - 1] ?? 0) + cost, // substitution
      );
      current.push(value);
      if (value < rowMin) rowMin = value;
    }
    // Every cell on this row already costs more than the budget, and costs can
    // only grow downward, so the final answer is known to be over budget.
    if (rowMin > max) return max + 1;
    previous = current;
  }

  return previous[long.length] ?? max + 1;
}

export interface DidYouMeanOptions {
  /** Maximum edit distance to accept. Defaults to `NEAR_MISS_MAX_DISTANCE`. */
  readonly maxDistance?: number;
  /** How many corrections to return. Defaults to 5. */
  readonly limit?: number;
}

/**
 * Closest indexed terms to `word`, best first. An exact term scores distance 0
 * and is returned first; callers who only want corrections filter it out by
 * comparing with the input rather than asking for a special mode.
 *
 * Ties break on higher document frequency (the corpus's own opinion of which
 * term is more likely meant), then on code-unit order, so the result is stable
 * on every machine.
 */
export function didYouMean(index: SearchIndex, word: string, opts: DidYouMeanOptions = {}): string[] {
  const needle = word.trim().toLowerCase();
  if (needle.length === 0) return [];
  const maxDistance = opts.maxDistance ?? NEAR_MISS_MAX_DISTANCE;
  const limit = Math.max(0, opts.limit ?? 5);
  if (limit === 0) return [];

  const candidates: Array<{ term: string; distance: number; df: number }> = [];
  for (const [term, entry] of index.terms) {
    const distance = boundedDistance(needle, term, maxDistance);
    if (distance > maxDistance) continue;
    candidates.push({ term, distance, df: entry.df });
  }

  candidates.sort(
    (a, b) =>
      a.distance - b.distance ||
      b.df - a.df ||
      (a.term < b.term ? -1 : a.term > b.term ? 1 : 0),
  );
  return candidates.slice(0, limit).map((entry) => entry.term);
}
