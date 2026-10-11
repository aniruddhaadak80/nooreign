import { describe, expect, it } from "vitest";
import type { Kingdom } from "@repo/seed/types";
import { AXIOM_KEYS, DIMENSION_META } from "@repo/seed/types";
import { ADVISORS, DILEMMA, KINGDOMS } from "../chronicle/fixtures";
import { closingRitual, promptsForAxiom, reflectivePrompts } from "./prompts";

const kingdom = (id: string): Kingdom => {
  const found = KINGDOMS.find((k) => k.id === id);
  if (found === undefined) throw new Error(`no kingdom ${id}`);
  return found;
};

const STOIC = kingdom("stoic-republic");
const ZENO = ADVISORS[0]!;
const MORE = ADVISORS[1]!;
const ARENDT = ADVISORS[2]!;

/** Prompt text that cannot be answered without first forming a position — banned by the design. */
const FILLER = [/^what are your values\??$/i, /^what do you value\??$/i, /^what matters to you\??$/i, /^why\?$/i];

describe("reflectivePrompts", () => {
  const base = { kingdom: STOIC, advisors: [ZENO, MORE], seed: 1337 };

  it("returns between six and ten prompts", () => {
    expect(reflectivePrompts(base).length).toBeGreaterThanOrEqual(6);
    expect(reflectivePrompts(base).length).toBeLessThanOrEqual(10);
    expect(reflectivePrompts({ ...base, dilemma: DILEMMA }).length).toBeLessThanOrEqual(10);
    expect(reflectivePrompts({ ...base, dilemma: DILEMMA }).length).toBeGreaterThanOrEqual(6);
  });

  it("is stable for a fixed seed and varies across seeds", () => {
    const a = reflectivePrompts(base);
    const b = reflectivePrompts(base);
    expect(a).toEqual(b);
    const differentSeed = reflectivePrompts({ ...base, seed: 2026 }).map((p) => p.text).join("|");
    expect(differentSeed).not.toBe(a.map((p) => p.text).join("|"));
  });

  it("gives distinct prompts for two different advisors", () => {
    const withZeno = reflectivePrompts({ kingdom: STOIC, advisors: [ZENO], seed: 7 }).map((p) => p.text);
    const withMore = reflectivePrompts({ kingdom: KINGDOMS[1] as Kingdom, advisors: [MORE], seed: 7 }).map((p) => p.text);
    expect(withZeno.some((t) => t.includes(ZENO.name))).toBe(true);
    expect(withMore.some((t) => t.includes(MORE.name))).toBe(true);
    expect(withZeno.some((t) => withMore.includes(t))).toBe(false);
  });

  it("mixes the four required kinds", () => {
    const prompts = reflectivePrompts({ ...base, advisors: [ZENO, MORE, ARENDT], dilemma: DILEMMA });
    const kinds = new Set(prompts.map((p) => p.kind));
    expect(kinds.has("kingdom")).toBe(true);
    expect(kinds.has("advisor")).toBe(true);
    expect(kinds.has("dilemma")).toBe(true);
    expect(kinds.has("revision")).toBe(true);
  });

  it("attributes advisor prompts to the advisor who pressed", () => {
    const prompts = reflectivePrompts({ ...base, advisors: [ZENO], dilemma: DILEMMA });
    const advisorPrompts = prompts.filter((p) => p.kind === "advisor");
    expect(advisorPrompts.length).toBeGreaterThan(0);
    for (const prompt of advisorPrompts) expect(prompt.sourceId).toBe(ZENO.id);
  });

  it("drops the dilemma block when no dilemma is in play", () => {
    expect(reflectivePrompts(base).some((p) => p.kind === "dilemma")).toBe(false);
    expect(reflectivePrompts({ ...base, dilemma: DILEMMA }).some((p) => p.kind === "dilemma")).toBe(true);
  });

  it("never emits filler questions", () => {
    for (let seed = 0; seed < 40; seed += 1) {
      for (const prompt of reflectivePrompts({ ...base, dilemma: DILEMMA, seed })) {
        for (const banned of FILLER) expect(prompt.text).not.toMatch(banned);
        expect(prompt.text.length).toBeGreaterThan(30);
      }
    }
  });

  it("still returns a usable block with no advisors at all", () => {
    const prompts = reflectivePrompts({ kingdom: STOIC, advisors: [], seed: 5 });
    expect(prompts.length).toBeGreaterThanOrEqual(6);
    expect(prompts.every((p) => p.kind !== "advisor")).toBe(true);
  });

  it("gives every prompt a unique id within a block", () => {
    const prompts = reflectivePrompts({ ...base, advisors: [ZENO, MORE, ARENDT], dilemma: DILEMMA });
    expect(new Set(prompts.map((p) => p.id)).size).toBe(prompts.length);
  });
});

describe("promptsForAxiom", () => {
  it("gives at least two prompts for every axis", () => {
    for (const axiom of AXIOM_KEYS) {
      const prompts = promptsForAxiom(axiom, STOIC);
      expect(prompts.length, axiom).toBeGreaterThanOrEqual(2);
      expect(new Set(prompts).size, axiom).toBe(prompts.length);
    }
  });

  it("never repeats a prompt across two different axes", () => {
    const seen = new Set<string>();
    for (const axiom of AXIOM_KEYS) {
      for (const prompt of promptsForAxiom(axiom, STOIC)) {
        expect(seen.has(prompt), `${axiom}: ${prompt}`).toBe(false);
        seen.add(prompt);
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(AXIOM_KEYS.length * 2);
  });

  it("names the kingdom and the axis it is working on", () => {
    const prompts = promptsForAxiom("care", STOIC);
    expect(prompts.some((p) => p.includes(STOIC.name))).toBe(true);
    expect(prompts.some((p) => p.includes(DIMENSION_META.care.label))).toBe(true);
  });

  it("changes with the kingdom but not with the call site", () => {
    const a = promptsForAxiom("justice", STOIC);
    const b = promptsForAxiom("justice", kingdom("civic-hedonists"));
    expect(a).not.toEqual(b);
    expect(promptsForAxiom("justice", STOIC)).toEqual(a);
  });

  it("produces no filler for any axis", () => {
    for (const axiom of AXIOM_KEYS) {
      for (const prompt of promptsForAxiom(axiom, kingdom("law-and-order"))) {
        for (const banned of FILLER) expect(prompt).not.toMatch(banned);
      }
    }
  });
});

describe("closingRitual", () => {
  it("is deterministic for the same roster and verdict", () => {
    const a = closingRitual([ZENO.id, MORE.id], ARENDT.id);
    const b = closingRitual([ZENO.id, MORE.id], ARENDT.id);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(2);
    expect(a.join(" ")).toContain("Arendt");
  });

  it("sorts the roster so argument order does not change the line", () => {
    expect(closingRitual([MORE.id, ZENO.id], ARENDT.id)).toEqual(closingRitual([ZENO.id, MORE.id], ARENDT.id));
  });

  it("changes when the verdict changes", () => {
    const withWinner = closingRitual([ZENO.id, MORE.id], ZENO.id).join(" ");
    const without = closingRitual([ZENO.id, MORE.id]).join(" ");
    expect(withWinner).not.toBe(without);
    expect(without).not.toContain("carries the argument");
  });

  it("stays short enough to read as a closing beat", () => {
    for (const line of closingRitual([ZENO.id], MORE.id)) expect(line.length).toBeLessThan(120);
  });
});