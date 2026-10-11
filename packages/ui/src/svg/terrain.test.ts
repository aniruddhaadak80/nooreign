import { describe, expect, it } from "vitest";
import { TERRAINS } from "@repo/seed/types";
import { hashSeed, terrainPath } from "./terrain";

const SEEDS = [1, 7, 42, 1337, 90210] as const;

describe("terrainPath", () => {
  it("covers all twelve terrains from the seed contract", () => {
    expect(TERRAINS.length).toBe(12);
  });

  it("returns drawable geometry for every terrain and seed", () => {
    for (const terrain of TERRAINS) {
      for (const seed of SEEDS) {
        const plate = terrainPath(terrain, 320, 180, seed);
        expect(plate.path.length).toBeGreaterThan(0);
        expect(plate.path.startsWith("M")).toBe(true);
        expect(plate.accents.startsWith("M")).toBe(true);
        expect(plate.viewBox).toBe("0 0 320 180");
        expect(plate.terrain).toBe(terrain);
      }
    }
  });

  it("is byte-identical for the same seed", () => {
    for (const terrain of TERRAINS) {
      const first = terrainPath(terrain, 240, 160, 42);
      const second = terrainPath(terrain, 240, 160, 42);
      expect(second.path).toBe(first.path);
      expect(second.accents).toBe(first.accents);
    }
  });

  it("differs across seeds for every terrain", () => {
    for (const terrain of TERRAINS) {
      const paths = new Set(SEEDS.map((seed) => terrainPath(terrain, 240, 160, seed).path));
      expect(paths.size).toBe(SEEDS.length);
    }
  });

  it("keeps every coordinate inside the requested box", () => {
    for (const terrain of TERRAINS) {
      const plate = terrainPath(terrain, 200, 120, 5);
      const numbers = plate.path
        .replace(/[A-Za-z-]/g, " ")
        .split(/[ ,]+/u)
        .filter((token) => token.length > 0)
        .map(Number)
        .filter((value) => Number.isFinite(value));
      for (const value of numbers) {
        expect(Math.abs(value)).toBeLessThanOrEqual(400);
      }
    }
  });

  it("never emits NaN into the path data", () => {
    for (const terrain of TERRAINS) {
      for (const seed of SEEDS) {
        const plate = terrainPath(terrain, 320, 180, seed);
        expect(plate.path).not.toContain("NaN");
        expect(plate.accents).not.toContain("NaN");
      }
    }
  });

  it("defaults to a plate size when none is given", () => {
    const plate = terrainPath("observatory");
    expect(plate.viewBox).toBe("0 0 320 180");
    expect(plate.width).toBe(320);
    expect(plate.height).toBe(180);
  });
});

describe("hashSeed", () => {
  it("is stable and well distributed across ids", () => {
    expect(hashSeed("meridian-court")).toBe(hashSeed("meridian-court"));
    expect(hashSeed("meridian-court")).not.toBe(hashSeed("tideline-guild"));
    const seeds = ["a", "b", "c", "d", "e", "f"].map(hashSeed);
    expect(new Set(seeds).size).toBe(seeds.length);
  });
});