import { describe, expect, it } from "vitest";
import {
  AXIOM_COLORS,
  PALETTE,
  contrastLevel,
  contrastRatio,
  hexToRgb,
  mix,
  readableInk,
  relativeLuminance,
  rgbToHex,
  shade,
  withAlpha,
} from "./palette";

describe("hexToRgb / rgbToHex", () => {
  it("parses six digit hex", () => {
    expect(hexToRgb("#D9A441")).toEqual({ r: 217, g: 164, b: 65 });
  });

  it("parses short hex and the no-hash form", () => {
    expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb("C8483F")).toEqual({ r: 200, g: 72, b: 63 });
  });

  it("round-trips through rgbToHex", () => {
    expect(rgbToHex(hexToRgb("#4FA88B"))).toBe("#4FA88B");
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
  });

  it("throws on nonsense input", () => {
    expect(() => hexToRgb("rebeccapurple")).toThrow(/hex/i);
  });
});

describe("withAlpha", () => {
  it("emits an rgba() string with rounded channels", () => {
    expect(withAlpha("#D9A441", 0.4)).toBe("rgba(217, 164, 65, 0.4)");
    expect(withAlpha("#000000", 2)).toBe("rgba(0, 0, 0, 1)");
    expect(withAlpha("#000000", -1)).toBe("rgba(0, 0, 0, 0)");
  });
});

describe("mix", () => {
  it("returns the endpoints at t=0 and t=1", () => {
    expect(mix("#000000", "#FFFFFF", 0)).toBe("#000000");
    expect(mix("#000000", "#FFFFFF", 1)).toBe("#FFFFFF");
  });

  it("interpolates the midpoint and clamps out-of-range t", () => {
    expect(mix("#000000", "#FFFFFF", 0.5)).toBe("#808080");
    expect(mix("#000000", "#FFFFFF", 5)).toBe("#FFFFFF");
    expect(mix("#000000", "#FFFFFF", -5)).toBe("#000000");
  });
});

describe("WCAG luminance and contrast", () => {
  it("computes relative luminance at the extremes", () => {
    expect(relativeLuminance("#ffffff")).toBe(1);
    expect(relativeLuminance("#000000")).toBe(0);
  });

  it("computes the textbook 21:1 black-on-white ratio", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBe(21);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#D9A441", "#070B18")).toBe(contrastRatio("#070B18", "#D9A441"));
  });

  it("picks the legible ink for both ends of the observatory", () => {
    expect(readableInk(PALETTE.abyss)).toBe(PALETTE.parchment);
    expect(readableInk(PALETTE.parchment)).toBe(PALETTE.ink);
  });

  it("labels contrast bands", () => {
    expect(contrastLevel(21)).toBe("AAA");
    expect(contrastLevel(5)).toBe("AA");
    expect(contrastLevel(3.2)).toBe("AA Large");
    expect(contrastLevel(1.1)).toBe("fail");
  });
});

describe("shade", () => {
  it("darkens on positive amounts and lightens on negative", () => {
    expect(shade("#808080", 1)).toBe("#000000");
    expect(shade("#808080", -1)).toBe("#FFFFFF");
    expect(shade("#808080", 0)).toBe("#808080");
  });

  it("is monotonic", () => {
    const half = relativeLuminance(shade("#D9A441", 0.4));
    const full = relativeLuminance(shade("#D9A441", 0.8));
    expect(half).toBeGreaterThan(full);
  });
});

describe("palette tokens", () => {
  it("gives every axiom its own hue", () => {
    const hues = Object.values(AXIOM_COLORS);
    expect(new Set(hues).size).toBe(hues.length);
  });
});