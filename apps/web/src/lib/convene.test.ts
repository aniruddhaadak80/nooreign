import { describe, expect, it } from "vitest";
import { DILEMMAS, getDilemma, SEED } from "@repo/seed";
import { convene, conveneRequestSchema, defaultPanelFor } from "./convene";

/**
 * The web layer's job is narrow: validate the request, resolve it against the
 * datasets, and hand the engine a sitting. These tests pin that contract, and —
 * more importantly — pin the two properties the product actually promises:
 * determinism, and a trace that adds up.
 */

describe("conveneRequestSchema", () => {
  it("accepts a well-formed request", () => {
    const parsed = conveneRequestSchema.safeParse({
      dilemmaId: "d01",
      advisorIds: ["kant"],
      seed: 2406,
    });
    expect(parsed.success).toBe(true);
  });

  it("defaults the seed to the repository seed", () => {
    const parsed = conveneRequestSchema.parse({ dilemmaId: "d01", advisorIds: ["kant"] });
    expect(parsed.seed).toBe(SEED);
  });

  it("rejects an empty panel", () => {
    expect(conveneRequestSchema.safeParse({ dilemmaId: "d01", advisorIds: [] }).success).toBe(false);
  });

  it("caps the panel at twelve advisors", () => {
    const advisors = Array.from({ length: 13 }, (_, index) => `a${index}`);
    expect(conveneRequestSchema.safeParse({ dilemmaId: "d01", advisorIds: advisors }).success).toBe(false);
  });

  it("rejects a non-integer seed", () => {
    expect(conveneRequestSchema.safeParse({ dilemmaId: "d01", advisorIds: ["k"], seed: 1.5 }).success).toBe(false);
  });
});

describe("convene", () => {
  const panel = ["kant", "bentham", "bostrom", "held"];

  it("returns a full sitting with labels resolved", () => {
    const result = convene({ dilemmaId: DILEMMAS[0]?.id ?? "d01", advisorIds: panel, seed: SEED });

    if ("error" in result) throw new Error(result.error);

    expect(result.participating).toBe(panel.length);
    expect(result.traces.length).toBeGreaterThan(0);
    expect(result.optionLabels.length).toBeGreaterThan(0);
    expect(result.advisors).toHaveLength(panel.length);
    expect(Object.keys(result.kingdomLabels).length).toBeGreaterThan(0);
  });

  it("is deep-equal across calls — same inputs, same verdict", () => {
    const dilemmaId = DILEMMAS[0]?.id ?? "d01";
    expect(convene({ dilemmaId, advisorIds: panel, seed: SEED })).toEqual(
      convene({ dilemmaId, advisorIds: panel, seed: SEED }),
    );
  });

  it("reports the seed it actually used", () => {
    const dilemmaId = DILEMMAS[0]?.id ?? "d01";
    const a = convene({ dilemmaId, advisorIds: panel, seed: 1 });
    const b = convene({ dilemmaId, advisorIds: panel, seed: 2 });

    if ("error" in a || "error" in b) throw new Error("expected a sitting");
    expect(a.seed).toBe(1);
    expect(b.seed).toBe(2);
  });

  it("keeps every trace's arithmetic self-consistent", () => {
    const dilemmaId = DILEMMAS[0]?.id ?? "d01";
    const result = convene({ dilemmaId, advisorIds: panel, seed: SEED });
    if ("error" in result) throw new Error(result.error);

    for (const trace of result.traces) {
      const products = trace.contributions.reduce((sum, contribution) => sum + contribution.product, 0);
      // The products are rounded to 4dp before summing, so compare at that scale.
      expect(Math.abs(products - trace.subtotal)).toBeLessThanOrEqual(trace.contributions.length * 5e-5);
      expect(Math.abs(trace.total - (trace.subtotal + trace.jitter))).toBeLessThan(1e-4);
      expect(Math.abs(trace.jitter)).toBeLessThanOrEqual(0.05 + 1e-9);
      expect(trace.contributions).toHaveLength(6);
    }
  });

  it("gives every option a share that sums to one", () => {
    const dilemmaId = DILEMMAS[0]?.id ?? "d01";
    const result = convene({ dilemmaId, advisorIds: panel, seed: SEED });
    if ("error" in result) throw new Error(result.error);

    const shares = result.ballots.reduce((sum, ballot) => sum + ballot.share, 0);
    expect(shares).toBeCloseTo(1, 6);
  });

  it("names an option that exists in the dilemma", () => {
    const dilemma = DILEMMAS[0];
    if (!dilemma) throw new Error("no dilemmas in the seed data");

    const result = convene({ dilemmaId: dilemma.id, advisorIds: panel, seed: SEED });
    if ("error" in result) throw new Error(result.error);

    expect(dilemma.options.some((option) => option.id === result.winnerId)).toBe(true);
  });

  it("surfaces an unknown dilemma as an error rather than an empty verdict", () => {
    const result = convene({ dilemmaId: "not-a-dilemma", advisorIds: ["kant"], seed: SEED });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toMatch(/unknown dilemma/);
  });

  it("ignores unknown advisor ids rather than dropping the whole request", () => {
    const result = convene({ dilemmaId: DILEMMAS[0]?.id ?? "d01", advisorIds: ["kant", "nobody"], seed: SEED });
    if ("error" in result) throw new Error(result.error);
    expect(result.participating).toBe(1);
  });

  it("errors when no requested advisor is known", () => {
    const result = convene({ dilemmaId: DILEMMAS[0]?.id ?? "d01", advisorIds: ["nobody"], seed: SEED });
    expect("error" in result).toBe(true);
  });

  it("accepts slugs as well as ids", () => {
    const dilemma = getDilemma(DILEMMAS[0]?.slug ?? "");
    expect(dilemma).toBeDefined();
    const bySlug = convene({ dilemmaId: dilemma?.slug ?? "", advisorIds: panel, seed: SEED });
    const byId = convene({ dilemmaId: dilemma?.id ?? "", advisorIds: panel, seed: SEED });
    expect(bySlug).toEqual(byId);
  });
});

describe("defaultPanelFor", () => {
  it("returns between one and four advisors for every dilemma", () => {
    for (const dilemma of DILEMMAS) {
      const panel = defaultPanelFor(dilemma.id);
      expect(panel.length).toBeGreaterThanOrEqual(1);
      expect(panel.length).toBeLessThanOrEqual(4);
      expect(new Set(panel).size).toBe(panel.length);
    }
  });

  it("always seats someone from the dilemma's home kingdom", () => {
    for (const dilemma of DILEMMAS) {
      const panel = defaultPanelFor(dilemma.id);
      const result = convene({ dilemmaId: dilemma.id, advisorIds: panel, seed: SEED });
      if ("error" in result) throw new Error(result.error);
      expect(result.advisors.some((advisor) => advisor.kingdomId === dilemma.kingdomOrigin)).toBe(true);
    }
  });

  it("prefers distinct kingdoms so the sitting is not four of the same voice", () => {
    const panel = defaultPanelFor(DILEMMAS[0]?.id ?? "d01");
    const kingdoms = panel.map((id) => {
      const sitting = convene({ dilemmaId: DILEMMAS[0]?.id ?? "d01", advisorIds: [id], seed: SEED });
      if ("error" in sitting) throw new Error(sitting.error);
      return sitting.advisors[0]?.kingdomId;
    });
    expect(new Set(kingdoms).size).toBeGreaterThan(1);
  });
});
