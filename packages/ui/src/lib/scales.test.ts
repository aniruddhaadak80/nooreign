import { describe, expect, it } from "vitest";
import {
  arcPath,
  areaPath,
  bandScale,
  clampScale,
  curveTension,
  ordinalColors,
  radialPosition,
  ringAngles,
  sparklinePath,
} from "./scales";

const countPairs = (path: string): number => (path.match(/-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/g) ?? []).length;

describe("clampScale", () => {
  it("maps the domain onto the range", () => {
    const scale = clampScale([0, 1], [0, 100]);
    expect(scale(0)).toBe(0);
    expect(scale(0.5)).toBe(50);
    expect(scale(1)).toBe(100);
  });

  it("clamps out-of-domain input", () => {
    const scale = clampScale([0, 1], [0, 100]);
    expect(scale(-5)).toBe(0);
    expect(scale(9)).toBe(100);
  });

  it("supports an inverted range for meters that drain right-to-left", () => {
    const scale = clampScale([0, 1], [100, 0]);
    expect(scale(1)).toBe(0);
  });
});

describe("bandScale", () => {
  it("splits width across bands, keeping padding as the gutter fraction", () => {
    const bands = bandScale(5, 100, 0.2);
    expect(bands.step).toBe(20);
    expect(bands.bandwidth).toBe(16);
  });

  it("places bands edge to edge and centres within them", () => {
    const bands = bandScale(5, 100, 0);
    expect(bands.bandwidth).toBe(20);
    expect(bands.index(2)).toBe(40);
    expect(bands.center(2)).toBe(50);
  });

  it("degrades safely for an empty series", () => {
    const bands = bandScale(0, 100, 0.2);
    expect(bands.step).toBe(0);
    expect(bands.index(3)).toBe(0);
  });
});

describe("radialPosition", () => {
  it("uses compass convention with zero at twelve o'clock", () => {
    expect(radialPosition(0, 10, 50, 50)).toEqual({ x: 50, y: 40 });
    expect(radialPosition(90, 10, 50, 50)).toEqual({ x: 60, y: 50 });
    expect(radialPosition(180, 10, 50, 50)).toEqual({ x: 50, y: 60 });
  });

  it("spreads a ring evenly", () => {
    expect(ringAngles(4)).toEqual([0, 90, 180, 270]);
    expect(ringAngles(0)).toEqual([]);
  });
});

describe("ordinalColors", () => {
  const palette = ["#D9A441", "#C8483F", "#4FA88B", "#5A6FD6", "#EDE4D3", "#9B7BC9"];

  it("assigns five items five distinct colours", () => {
    const colours = ordinalColors(["a", "b", "c", "d", "e"], palette);
    expect(colours.size).toBe(5);
    const values = [...colours.values()];
    expect(new Set(values).size).toBe(5);
  });

  it("is stable across reordering of the same items", () => {
    const first = ordinalColors(["b", "a", "c"], palette);
    const second = ordinalColors(["c", "b", "a"], palette);
    expect(first.get("a")).toBe(second.get("a"));
    expect(first.get("b")).toBe(second.get("b"));
    expect(first.get("c")).toBe(second.get("c"));
  });

  it("is idempotent for repeated items and safe with no palette", () => {
    expect(ordinalColors(["a", "a", "a"], palette).size).toBe(1);
    expect(ordinalColors(["a"], []).size).toBe(0);
  });
});

describe("curveTension", () => {
  it("clamps into the unit range", () => {
    expect(curveTension()).toBe(0.2);
    expect(curveTension(-1)).toBe(0);
    expect(curveTension(4)).toBe(1);
    expect(curveTension(Number.NaN)).toBe(0);
  });
});

describe("sparklinePath", () => {
  it("emits one coordinate pair per value", () => {
    const path = sparklinePath([0, 1, 0]);
    expect(path.startsWith("M")).toBe(true);
    expect(countPairs(path)).toBe(3);
  });

  it("scales into the requested box", () => {
    const path = sparklinePath([0, 1], 200, 40);
    expect(path).toContain("L200,0");
  });

  it("parks a flat series on the midline", () => {
    const path = sparklinePath([5, 5, 5], 100, 32);
    expect(path).toBe("M0,16 L50,16 L100,16");
  });

  it("is empty for an empty series and survives non-finite input", () => {
    expect(sparklinePath([])).toBe("");
    expect(sparklinePath([Number.NaN, 1]).startsWith("M")).toBe(true);
  });

  it("switches to cubics only when asked", () => {
    expect(sparklinePath([0, 1, 0], 100, 32, { smooth: true })).toContain("C");
  });
});

describe("areaPath", () => {
  it("closes the outline down to the baseline", () => {
    const path = areaPath([0, 1, 0]);
    expect(path.startsWith("M")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path).toContain("L100,32");
  });

  it("is empty for an empty series", () => {
    expect(areaPath([])).toBe("");
  });
});

describe("arcPath", () => {
  it("draws a quarter arc between the twelve and three o'clock positions", () => {
    expect(arcPath(0, 0, 10, 0, 90)).toBe("M0,-10 A10,10 0 0 1 10,0");
  });

  it("switches the large-arc flag past a half turn", () => {
    expect(arcPath(0, 0, 10, 0, 240)).toContain("0 1 1");
  });
});