import { describe, expect, it } from "vitest";
import { CHARGES, crestPath, isCharge, shieldPath } from "./crests";

describe("crestPath", () => {
  it("frames every charge in a square viewBox", () => {
    for (const charge of CHARGES) {
      const crest = crestPath(charge, 32);
      expect(crest.viewBox).toBe("0 0 32 32");
      expect(crest.path.length).toBeGreaterThan(0);
    }
  });

  it("scales the construction grid to the requested size", () => {
    expect(crestPath("bell", 64).viewBox).toBe("0 0 64 64");
    expect(crestPath("bell", 24).viewBox).toBe("0 0 24 24");
  });

  it("keeps geometry inside the box at small and large sizes", () => {
    for (const charge of CHARGES) {
      for (const size of [16, 32, 320]) {
        const numbers = crestPath(charge, size)
          .path.replace(/[A-Za-z]/g, " ")
          .split(/[ ,]+/u)
          .filter((token) => token.length > 0)
          .map(Number)
          .filter((value) => Number.isFinite(value));
        expect(numbers.length).toBeGreaterThan(0);
        for (const value of numbers) {
          expect(value).toBeGreaterThanOrEqual(-0.5);
          expect(value).toBeLessThanOrEqual(size + 0.5);
        }
      }
    }
  });

  it("is deterministic for a charge", () => {
    expect(crestPath("eye", 48).path).toBe(crestPath("eye", 48).path);
  });

  it("gives every charge a distinct silhouette", () => {
    const paths = new Set(CHARGES.map((charge) => crestPath(charge, 32).path));
    expect(paths.size).toBe(CHARGES.length);
  });

  it("emits only path commands — no text, no images", () => {
    for (const charge of CHARGES) {
      expect(crestPath(charge, 32).path).not.toMatch(/[<>]|NaN|Infinity/);
    }
  });
});

describe("isCharge", () => {
  it("narrows the ten charges and rejects anything else", () => {
    expect(isCharge("lotus")).toBe(true);
    expect(isCharge("dragon")).toBe(false);
  });
});

describe("shieldPath", () => {
  it("shares the crest grid", () => {
    const shield = shieldPath(40);
    expect(shield.viewBox).toBe("0 0 40 40");
    expect(shield.path.startsWith("M")).toBe(true);
  });
});