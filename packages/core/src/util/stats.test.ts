import { describe, expect, it } from "vitest";

import {
  gini,
  median,
  normalizedEntropy,
  quantile,
  stdDev,
  summary,
  variance,
  zScores,
} from "./stats";

const close = (a: number, b: number, tol = 1e-9): boolean => Math.abs(a - b) < tol;

describe("stats / median", () => {
  it("takes the middle for an odd count and averages for an even count", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it("collapses the empty sample to 0", () => {
    expect(median([])).toBe(0);
  });

  it("does not mutate its input", () => {
    const frozen = Object.freeze([3, 1, 2]);
    expect(median(frozen)).toBe(2);
    expect([...frozen]).toEqual([3, 1, 2]);
  });
});

describe("stats / quantile", () => {
  it("interpolates linearly between order statistics", () => {
    expect(quantile([1, 2, 3, 4], 0.25)).toBe(1.75);
    expect(quantile([1, 2, 3, 4], 0.75)).toBe(3.25);
  });

  it("agrees with the median at q = 0.5", () => {
    expect(quantile([9, 1, 5, 3], 0.5)).toBe(median([9, 1, 5, 3]));
  });

  it("clamps q outside [0, 1] to the extremes", () => {
    expect(quantile([1, 2, 3], -2)).toBe(1);
    expect(quantile([1, 2, 3], 7)).toBe(3);
  });

  it("handles the degenerate samples", () => {
    expect(quantile([], 0.5)).toBe(0);
    expect(quantile([42], 0.5)).toBe(42);
  });
});

describe("stats / variance and stdDev", () => {
  it("uses the population form (divides by n)", () => {
    expect(close(variance([1, 2, 3, 4]), 1.25)).toBe(true);
  });

  it("is zero for a constant sample and for the empty sample", () => {
    expect(variance([5, 5, 5])).toBe(0);
    expect(stdDev([5, 5, 5])).toBe(0);
    expect(variance([])).toBe(0);
    expect(stdDev([])).toBe(0);
  });

  it("takes the square root of the variance", () => {
    expect(close(stdDev([1, 2, 3, 4]), Math.sqrt(1.25))).toBe(true);
  });
});

describe("stats / gini", () => {
  it("is 0 for a perfectly even distribution", () => {
    expect(close(gini([1, 1, 1, 1]), 0)).toBe(true);
    expect(close(gini([7, 7]), 0)).toBe(true);
  });

  it("is 1 - 1/n for a perfectly concentrated one", () => {
    expect(close(gini([0, 0, 0, 10]), 0.75)).toBe(true);
  });

  it("matches the hand-computed textbook example", () => {
    // Weights 1..5: G = 0.2666...
    expect(close(gini([1, 2, 3, 4, 5]), 0.26666666666666666)).toBe(true);
  });

  it("treats negatives as zero and all-zero samples as 0", () => {
    expect(close(gini([-5, 1]), gini([0, 1]))).toBe(true);
    expect(gini([0, 0, 0])).toBe(0);
    expect(gini([])).toBe(0);
  });
});

describe("stats / normalizedEntropy", () => {
  it("is 1 when every bucket carries equal mass", () => {
    expect(close(normalizedEntropy([1, 1, 1, 1]), 1)).toBe(true);
    expect(close(normalizedEntropy([2, 2]), 1)).toBe(true);
  });

  it("is 0 when all mass sits on one bucket", () => {
    expect(normalizedEntropy([9, 0, 0, 0])).toBe(0);
    expect(normalizedEntropy([0, 0, 0])).toBe(0);
  });

  it("normalises so corpora of different sizes are comparable", () => {
    // 4:1 split has H = 0.7219 bits, the ceiling for two buckets.
    expect(close(normalizedEntropy([4, 1]), 0.7219280948873623, 1e-12)).toBe(true);
  });

  it("treats the degenerate cases explicitly", () => {
    expect(normalizedEntropy([])).toBe(0);
    expect(normalizedEntropy([42])).toBe(1);
  });
});

describe("stats / zScores", () => {
  it("standardises around the mean", () => {
    const z = zScores([1, 3, 5]);
    expect(z.length).toBe(3);
    expect(close(z[0] ?? 0, -1.224744871391589)).toBe(true);
    expect(close(z[1] ?? 0, 0)).toBe(true);
    expect(close(z[2] ?? 0, 1.224744871391589)).toBe(true);
  });

  it("returns zeros when the sample has no spread instead of NaN", () => {
    expect(zScores([4, 4, 4])).toEqual([0, 0, 0]);
    expect(zScores([])).toEqual([]);
  });
});

describe("stats / summary", () => {
  it("reports the five-number flavour in one row", () => {
    const s = summary([1, 2, 3, 4]);
    expect(s.count).toBe(4);
    expect(s.min).toBe(1);
    expect(s.max).toBe(4);
    expect(s.mean).toBe(2.5);
    expect(s.median).toBe(2.5);
    expect(s.p25).toBe(1.75);
    expect(s.p75).toBe(3.25);
    expect(close(s.stdDev, Math.sqrt(1.25))).toBe(true);
  });

  it("returns an all-zero row for the empty sample", () => {
    expect(summary([])).toEqual({ count: 0, min: 0, max: 0, mean: 0, median: 0, p25: 0, p75: 0, stdDev: 0 });
  });
});

describe("stats / purity", () => {
  it("never mutates the sample it is given", () => {
    const frozen = Object.freeze([5, 1, 4, 2, 3]);
    expect(() => {
      median(frozen);
      quantile(frozen, 0.3);
      variance(frozen);
      stdDev(frozen);
      gini(frozen);
      normalizedEntropy(frozen);
      zScores(frozen);
      summary(frozen);
    }).not.toThrow();
    expect([...frozen]).toEqual([5, 1, 4, 2, 3]);
  });
});
