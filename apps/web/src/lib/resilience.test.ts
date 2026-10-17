import { describe, expect, it } from "vitest";
import { DILEMMAS, SEED } from "@repo/seed";
import { RESILIENCE_SWEEP } from "@repo/core";
import { defaultPanelFor } from "./convene";
import { STRESS_SEEDS, resolvePanel, stressAtlas, stressFor, stressRequestSchema } from "./resilience";

const firstCase = DILEMMAS[0];
if (firstCase === undefined) throw new Error("seed dataset is empty");

describe("the stress layer", () => {
  it("stresses every case in the atlas with its own default bench", () => {
    const atlas = stressAtlas();
    expect(atlas).toHaveLength(DILEMMAS.length);
    for (const stress of atlas) {
      expect(stress.resilience.baseSeed).toBe(SEED);
      expect(stress.resilience.count).toBe(STRESS_SEEDS);
      expect(stress.resilience.outcomes).toHaveLength(STRESS_SEEDS);
      expect(stress.optionLabels.length).toBeGreaterThanOrEqual(2);
      // Leave-one-out runs once per seated advisor.
      expect(stress.influence.entries).toHaveLength(stress.panel.length);
    }
  });

  it("is a pure function of the case it is given", () => {
    expect(stressFor(firstCase.id)).toEqual(stressFor(firstCase.id));
  });

  it("refuses an unknown case and a panel that resolves to nobody", () => {
    expect(stressFor("dm-does-not-exist")).toBeNull();
    expect(stressFor(firstCase.id, { advisorIds: ["no-such-advisor"] })).toBeNull();
  });

  it("keeps the default bench in step with the case page's default panel", () => {
    const stress = stressFor(firstCase.id);
    expect(stress?.panel.map((member) => member.id)).toEqual(defaultPanelFor(firstCase.id));
  });

  it("defaults the transport schema to the same window the pages use", () => {
    const parsed = stressRequestSchema.safeParse({ dilemmaId: "d01" });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.seed).toBe(SEED);
    expect(parsed.data.count).toBe(STRESS_SEEDS);
    expect(parsed.data.advisorIds).toBeUndefined();

    // The window clamps at both ends of the sweep contract.
    expect(stressRequestSchema.safeParse({ dilemmaId: "d01", count: 1 }).success).toBe(false);
    expect(stressRequestSchema.safeParse({ dilemmaId: "d01", count: 9999 }).success).toBe(false);
    expect(
      stressRequestSchema.safeParse({ dilemmaId: "d01", count: RESILIENCE_SWEEP.min }).success,
    ).toBe(true);
  });

  it("resolves a panel into advisors and only the kingdoms they come from", () => {
    const { advisors, kingdoms } = resolvePanel(defaultPanelFor("d01"));
    expect(advisors.length).toBeGreaterThanOrEqual(2);
    expect(kingdoms).toHaveLength(new Set(advisors.map((advisor) => advisor.kingdomId)).size);
    for (const kingdom of kingdoms) {
      expect(advisors.some((advisor) => advisor.kingdomId === kingdom.id)).toBe(true);
    }
  });
});
