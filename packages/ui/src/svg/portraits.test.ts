import { describe, expect, it } from "vitest";
import type { Advisor } from "@repo/seed/types";
import { initialPath, portraitSvg, sigilInitials } from "./portraits";

const ADVISOR: Advisor = {
  id: "adv-1",
  slug: "soren-kierkegaard",
  name: "Søren Kierkegaard",
  kingdomId: "kgd-1",
  born: 1813,
  died: 1855,
  epithet: "The Knight of Existential Dread",
  creed: "Truth is subjectivity, and subjectivity is a leap that no theorem can ground.",
  portrait: { sigil: "Fear and Trembling", hue: "#4FA88B", charge: "bell" },
  works: [{ title: "Either/Or", year: 1843, note: "The aesthetic and the ethical stages of life." }],
  axioms: { welfare: 0.4, rights: 0.3, virtue: 0.8, care: 0.5, justice: 0.4, agency: 0.9 },
  signatureMove: { name: "The Leap", kind: "objection", description: "Refuses the transition to the ethical on rational grounds alone." },
  moves: [],
  voice: { register: "pastoral", cadence: "terse", tells: ["as though", "the individual"] },
  onAi: { verdict: "guarded", note: "Systems that reason without a self cannot be forgiven, only obeyed." },
};

describe("initialPath", () => {
  it("frames a letterform in a square viewBox with a scaled stroke", () => {
    const glyph = initialPath("K", 32);
    expect(glyph.viewBox).toBe("0 0 32 32");
    expect(glyph.path.startsWith("M")).toBe(true);
    expect(glyph.strokeWidth).toBeCloseTo(2.88, 2);
  });

  it("is case-insensitive and diacritic tolerant", () => {
    expect(initialPath("k", 32).path).toBe(initialPath("K", 32).path);
    expect(initialPath("é", 32).path).toBe(initialPath("E", 32).path);
  });

  it("draws every letter of the alphabet as geometry, not text", () => {
    const shapes = new Set<string>();
    for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      const glyph = initialPath(letter, 24);
      expect(glyph.path.length).toBeGreaterThan(0);
      // Only path commands may appear — no <text>, no stray words.
      expect(glyph.path).not.toMatch(/[<>]/u);
      expect(glyph.path).not.toMatch(/NaN|Infinity/);
      shapes.add(glyph.path);
    }
    expect(shapes.size).toBe(26);
  });

  it("falls back to a lozenge for unknown scripts", () => {
    const fallback = initialPath("東", 24);
    expect(fallback.path.startsWith("M")).toBe(true);
    expect(fallback.path).not.toMatch(/NaN/);
  });
});

describe("sigilInitials", () => {
  it("takes at most two distinct initials from a multi-word sigil", () => {
    expect(sigilInitials("Fear and Trembling")).toEqual(["F", "T"]);
    expect(sigilInitials("Bell of the Deep Well")).toEqual(["B", "D"]);
  });

  it("never repeats and never returns empty", () => {
    expect(sigilInitials("Sun Sun")).toEqual(["S"]);
    expect(sigilInitials("!!!")).toEqual(["?"]);
  });
});

describe("portraitSvg", () => {
  it("is deterministic for one advisor", () => {
    const first = portraitSvg(ADVISOR, 96);
    const second = portraitSvg(ADVISOR, 96);
    expect(second.ring).toBe(first.ring);
    expect(second.silhouette).toBe(first.silhouette);
    expect(second.charge.path).toBe(first.charge.path);
  });

  it("carries the advisor's own hue and charge", () => {
    const art = portraitSvg(ADVISOR, 64);
    expect(art.hue).toBe("#4FA88B");
    expect(art.charge.viewBox).toBe("0 0 64 64");
    expect(art.viewBox).toBe("0 0 64 64");
  });

  it("renders the sigil initials as paths", () => {
    const art = portraitSvg(ADVISOR, 48);
    expect(art.initials.map((glyph) => glyph.viewBox)).toEqual(["0 0 48 48", "0 0 48 48"]);
    expect(art.initials[0]?.path).toBe(initialPath("F", 48).path);
  });

  it("gives different sigils different busts", () => {
    const other: Advisor = { ...ADVISOR, portrait: { ...ADVISOR.portrait, sigil: "The Bell and the Sea" } };
    expect(portraitSvg(other, 96).silhouette).not.toBe(portraitSvg(ADVISOR, 96).silhouette);
  });

  it("defaults to a 96px plate", () => {
    expect(portraitSvg(ADVISOR).viewBox).toBe("0 0 96 96");
  });
});