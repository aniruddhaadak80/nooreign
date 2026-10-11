import { describe, expect, it } from "vitest";

import {
  clamp,
  cosineSimilarity,
  dot,
  lerp,
  maxOf,
  mean,
  minOf,
  movingAverage,
  normalize,
  partition,
  range,
  round,
  safeDiv,
  sign,
  softmax,
  sum,
  weightedMean,
} from "./math";

describe("math / clamp", () => {
  it("bounds values and collapses NaN to the minimum", () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(Number.NaN, 0, 1)).toBe(0);
  });
});

describe("math / round", () => {
  it("kills binary floating point dust", () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(round(0.1 + 0.2, 10)).toBe(0.3);
    expect(round(1.23456789, 3)).toBe(1.235);
  });

  it("rounds half away from zero symmetrically", () => {
    expect(round(0.125, 2)).toBe(0.13);
    expect(round(-0.125, 2)).toBe(-0.13);
    expect(round(2.5, 0)).toBe(3);
  });
});

describe("math / aggregation", () => {
  it("sums, means and handles the empty case", () => {
    expect(sum([1, 2, 3])).toBe(6);
    expect(sum([])).toBe(0);
    expect(mean([2, 4, 6])).toBe(4);
    expect(mean([])).toBe(0);
  });

  it("takes extrema with a zero fallback", () => {
    expect(minOf([3, -1, 7])).toBe(-1);
    expect(maxOf([3, -1, 7])).toBe(7);
    expect(minOf([])).toBe(0);
    expect(maxOf([])).toBe(0);
  });

  it("partitions while preserving order", () => {
    const [even, odd] = partition([1, 2, 3, 4, 5, 6], (n) => n % 2 === 0);
    expect(even).toEqual([2, 4, 6]);
    expect(odd).toEqual([1, 3, 5]);
  });
});

describe("math / vector", () => {
  it("computes dot products and truncates on length mismatch", () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
    expect(dot([1, 2, 3], [1])).toBe(1);
  });

  it("hand-computes cosine similarity on orthogonal and aligned vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    // 10 / (sqrt(5) * sqrt(20)) — exact in real arithmetic, dust in floating point.
    expect(cosineSimilarity([1, 2], [2, 4])).toBeCloseTo(1, 12);
    expect(cosineSimilarity([1, 0], [-1, 0])).toBe(-1);
    // 1*1 + 1*0 = 1 over sqrt(2)*sqrt(1)
    expect(cosineSimilarity([1, 1], [1, 0])).toBeCloseTo(Math.SQRT1_2, 12);
  });

  it("treats a zero vector as having no direction", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
    expect(normalize([0, 0])).toEqual([0, 0]);
    expect(normalize([3, 4])).toEqual([0.6, 0.8]);
  });
});

describe("math / weightedMean", () => {
  it("falls back to the plain mean when all weights are zero", () => {
    expect(weightedMean([1, 3], [0, 0])).toBe(2);
    expect(weightedMean([1, 3], [1, 3])).toBe(2.5);
    expect(weightedMean([], [1])).toBe(0);
  });
});

describe("math / softmax", () => {
  it("sums to one and is shift-invariant", () => {
    const p = softmax([1, 2, 3], 1);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(softmax([11, 12, 13], 1)[2]).toBeCloseTo(p[2] ?? 0, 12);
  });

  it("collapses to argmax at temperature zero", () => {
    expect(softmax([1, 5, 2], 0)).toEqual([0, 1, 0]);
    expect(softmax([5, 5, 2], 0)).toEqual([0.5, 0.5, 0]);
    expect(softmax([], 1)).toEqual([]);
  });

  it("flattens towards uniform as temperature grows", () => {
    const cold = softmax([0, 10], 0.1)[0] ?? 0;
    const warm = softmax([0, 10], 10)[0] ?? 0;
    const hot = softmax([0, 10], 10_000)[0] ?? 0;
    expect(cold).toBeLessThan(0.5);
    expect(warm).toBeGreaterThan(cold);
    // At T = 10_000 the ratio is exp(0.001), so p(0) = 1 / (1 + e^0.001) ~ 0.4998.
    expect(hot).toBeCloseTo(1 / (1 + Math.exp(0.001)), 12);
  });
});

describe("math / range", () => {
  it("is inclusive of the endpoint and guards against step <= 0", () => {
    expect(range(0, 1, 0.25)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(range(0, 3, 1)).toEqual([0, 1, 2, 3]);
    expect(range(0, 1, 0)).toEqual([]);
    expect(range(0, 1, -0.5)).toEqual([]);
    expect(range(2, 1, 1)).toEqual([]);
  });
});

describe("math / movingAverage", () => {
  it("averages the trailing window, padding the head with the available prefix", () => {
    expect(movingAverage([1, 2, 3, 4], 2)).toEqual([1, 1.5, 2.5, 3.5]);
    expect(movingAverage([2, 4, 6], 3)).toEqual([2, 3, 4]);
  });

  it("is empty for a degenerate window or input", () => {
    expect(movingAverage([1, 2], 0)).toEqual([]);
    expect(movingAverage([], 3)).toEqual([]);
  });
});

describe("math / safeDiv and sign", () => {
  it("never returns Infinity or NaN", () => {
    expect(safeDiv(5, 0)).toBe(0);
    expect(safeDiv(6, 3)).toBe(2);
    expect(sign(-9)).toBe(-1);
    expect(sign(0)).toBe(0);
    expect(sign(9)).toBe(1);
    expect(sign(Number.NaN)).toBe(0);
  });
});

describe("math / lerp", () => {
  it("interpolates linearly and does not clamp t", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 2)).toBe(20);
  });
});