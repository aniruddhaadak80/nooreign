/**
 * Deterministic pseudo-randomness.
 *
 * WHY: Nooreign has no API keys and no network. Every "what if the court had
 * shaken things up differently" question is answered by re-running with a
 * different seed, and every rendered verdict must be reproducible from
 * `(seed, ids)` alone. So all randomness here is a pure function of its inputs:
 * `createRng(seed, "r1", advisorId, optionId)` always yields the same stream.
 */

import { sum } from "./math";

/**
 * mulberry32 — a 32-bit state generator with a full 2^32 period.
 * Chosen because it is four lines, has no hidden tables, and is trivially
 * portable, which matters more here than statistical sophistication.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * FNV-1a, 32-bit. String seeds are folded into the integer seed so callers can
 * key streams off human-readable tags ("r1", advisor slugs, dilemma ids).
 */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform in [min, max). */
  range(min: number, max: number): number;
  /** Uniform integer in [min, max], both inclusive. */
  int(min: number, max: number): number;
  /** Uniform choice. Throws on an empty list — picking from nothing is a bug, not a state. */
  pick<T>(items: readonly T[]): T;
  /** Fisher-Yates on a copy; the input array is never mutated. */
  shuffle<T>(items: readonly T[]): T[];
  /** Box-Muller normal draw; `sd <= 0` collapses to the mean. */
  gaussian(mean?: number, sd?: number): number;
  /** A decorrelated child stream derived from this one's seed plus `tag`. */
  fork(tag: string): Rng;
}

/**
 * Build an `Rng` from a seed and any number of key parts.
 *
 * Parts are joined with a separator that cannot appear in a normal id, so
 * `createRng(1, "ab", "c")` and `createRng(1, "a", "bc")` produce different
 * streams rather than colliding.
 */
export function createRng(...parts: readonly (string | number)[]): Rng {
  const joined = parts.map((p) => String(p)).join("\u241f");
  const seed = hashString(joined);
  const nextFn = mulberry32(seed);

  const next = (): number => nextFn();

  const range = (min: number, max: number): number => {
    if (max < min) return min;
    return min + next() * (max - min);
  };

  const int = (min: number, max: number): number => {
    if (max < min) return min;
    return min + Math.floor(next() * (max - min + 1));
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) {
      throw new RangeError("rng.pick: cannot pick from an empty list");
    }
    const index = Math.min(items.length - 1, Math.floor(next() * items.length));
    const value = items[index];
    // `index` is bounded by the guard above, so this is a total function; the
    // check exists only to satisfy `noUncheckedIndexedAccess` honestly.
    if (value === undefined && !items.includes(value as T)) {
      throw new RangeError("rng.pick: index out of range");
    }
    return value as T;
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      const a = out[i];
      const b = out[j];
      if (a === undefined || b === undefined) continue;
      out[i] = b;
      out[j] = a;
    }
    return out;
  };

  const gaussian = (mean = 0, sd = 1): number => {
    if (sd <= 0) return mean;
    // Box-Muller: u1 is shifted off zero because log(0) is -Infinity.
    let u1 = next();
    if (u1 < Number.EPSILON) u1 = Number.EPSILON;
    const u2 = next();
    return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  const fork = (tag: string): Rng => createRng(seed, tag);

  return { next, range, int, pick, shuffle, gaussian, fork };
}

/** Convenience for tests and reports: the mean of `n` uniform draws. */
export function expectedMean(samples: readonly number[]): number {
  return sum(samples) / Math.max(1, samples.length);
}