import { describe, expect, it } from "vitest";

import { createRng, expectedMean, hashString, mulberry32 } from "./rng";

describe("rng / mulberry32", () => {
  it("is a pure function of its seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const left = [a(), a(), a(), a()];
    const right = [b(), b(), b(), b()];
    expect(left).toEqual(right);
  });

  it("stays inside [0, 1) and diverges for different seeds", () => {
    const r = mulberry32(7);
    const draws = Array.from({ length: 500 }, () => r());
    for (const d of draws) {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThan(1);
    }
    expect(draws[0]).not.toBe(mulberry32(8)());
  });
});

describe("rng / hashString", () => {
  it("matches the FNV-1a reference values", () => {
    expect(hashString("")).toBe(0x811c9dc5);
    expect(hashString("a")).toBe(0xe40c292c);
    expect(hashString("foobar")).toBe(0xbf9cf968);
  });

  it("is stable and collision-free across our separators", () => {
    expect(hashString("round")).toBe(hashString("round"));
    // The unit separator is what stops ("ab","c") colliding with ("a","bc").
    expect(hashString("ab␟c")).not.toBe(hashString("a␟bc"));
  });
});

describe("rng / createRng", () => {
  it("reproduces an identical stream for identical inputs", () => {
    const a = createRng(11, "r1", "kant", "opt-a");
    const b = createRng(11, "r1", "kant", "opt-a");
    expect([a.next(), a.next(), a.range(0, 5), a.int(0, 9)]).toEqual([
      b.next(),
      b.next(),
      b.range(0, 5),
      b.int(0, 9),
    ]);
  });

  it("decorrelates different tags and different seeds", () => {
    const x = createRng(1, "r1").next();
    const y = createRng(1, "r2").next();
    const z = createRng(2, "r1").next();
    expect(new Set([x, y, z]).size).toBe(3);
  });

  it("bounds range and int inclusively", () => {
    const r = createRng(99, "bounds");
    for (let i = 0; i < 300; i += 1) {
      const v = r.range(0.1, 0.2);
      expect(v).toBeGreaterThanOrEqual(0.1);
      expect(v).toBeLessThan(0.2);
      const n = r.int(3, 5);
      expect([3, 4, 5]).toContain(n);
    }
    // Degenerate ranges collapse rather than producing NaN.
    expect(r.range(4, 4)).toBe(4);
    expect(r.int(9, 2)).toBe(9);
  });

  it("picks and shuffles deterministically without mutating the source", () => {
    const items = ["a", "b", "c", "d"] as const;
    const r1 = createRng(5, "pick");
    const r2 = createRng(5, "pick");
    expect(r1.pick(items)).toBe(r2.pick(items));

    const s1 = createRng(5, "shuffle").shuffle(items);
    const s2 = createRng(5, "shuffle").shuffle(items);
    expect(s1).toEqual(s2);
    expect([...items]).toEqual(["a", "b", "c", "d"]);
    expect([...s1].sort()).toEqual([...items].sort());
  });

  it("throws when picking from nothing rather than returning undefined", () => {
    expect(() => createRng(1, "empty").pick([])).toThrow(RangeError);
  });

  it("draws a normal with roughly the requested mean and spread", () => {
    const r = createRng(3, "gauss");
    const samples = Array.from({ length: 4000 }, () => r.gaussian(10, 2));
    const mean = expectedMean(samples);
    expect(mean).toBeGreaterThan(9.7);
    expect(mean).toBeLessThan(10.3);
    const sd = Math.sqrt(expectedMean(samples.map((s) => (s - mean) ** 2)));
    expect(sd).toBeGreaterThan(1.7);
    expect(sd).toBeLessThan(2.3);
    // Zero spread degenerates cleanly.
    expect(createRng(3, "g").gaussian(4, 0)).toBe(4);
  });

  it("fork produces an independent but reproducible sub-stream", () => {
    const parent = createRng(77, "council");
    const childA = parent.fork("r1");
    const childB = createRng(77, "council").fork("r1");
    expect([childA.next(), childA.next()]).toEqual([childB.next(), childB.next()]);
    expect(createRng(77, "council").fork("r1").next()).not.toBe(
      createRng(77, "council").fork("r2").next(),
    );
  });
});