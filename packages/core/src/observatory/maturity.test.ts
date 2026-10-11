import { describe, expect, it } from "vitest";
import type { AxiomKey, Technique, TechniqueKind } from "@repo/seed/types";
import { AXIOM_KEYS, TECHNIQUE_KINDS } from "@repo/seed/types";
import { TECHNIQUES, T } from "../chronicle/fixtures";
import { COST_SCALE, costPressure, coverageMatrix, costBenefit, dependencyHealth, gapAnalysis, readinessScore, towerView } from "./maturity";

const tower = (kind: TechniqueKind) => {
  const found = towerView(TECHNIQUES).find((t) => t.kind === kind);
  if (found === undefined) throw new Error(`no tower ${kind}`);
  return found;
};

const cell = (axiom: AxiomKey) => {
  const found = coverageMatrix(TECHNIQUES, AXIOM_KEYS).cells.find((c) => c.axiom === axiom);
  if (found === undefined) throw new Error(`no cell ${axiom}`);
  return found;
};

describe("towerView", () => {
  it("always returns all six towers, in schema order", () => {
    const towers = towerView(TECHNIQUES);
    expect(towers).toHaveLength(6);
    expect(towers.map((t) => t.kind)).toEqual([...TECHNIQUE_KINDS]);
  });

  it("rolls up count, maturity, adoption and ordinal cost", () => {
    const training = tower("training");
    expect(training.count).toBe(2);
    expect(training.meanMaturity).toBeCloseTo(0.72, 10);
    expect(training.meanAdoption).toBeCloseTo(0.62, 10);
    expect(training.cost).toBeCloseTo((COST_SCALE.medium + COST_SCALE.high) / 2, 10);

    const oversight = tower("oversight");
    expect(oversight.count).toBe(1);
    expect(oversight.meanMaturity).toBeCloseTo(0.34, 10);
    expect(oversight.meanAdoption).toBeCloseTo(0.12, 10);
    expect(oversight.cost).toBe(COST_SCALE.extreme);
  });

  it("keeps an empty discipline visible rather than rounding it away", () => {
    const towers = towerView([]);
    expect(towers.every((t) => t.count === 0 && t.meanMaturity === 0 && t.cost === 0)).toBe(true);
  });
});

describe("coverageMatrix", () => {
  const matrix = coverageMatrix(TECHNIQUES, AXIOM_KEYS);

  it("has one cell per axis", () => {
    expect(matrix.cells.map((c) => c.axiom)).toEqual([...AXIOM_KEYS]);
  });

  it("finds the finding: no technique in the stack covers care", () => {
    expect(matrix.uncovered).toEqual(["care"]);
    expect(cell("care").techniqueIds).toEqual([]);
    expect(cell("care").strength).toBe(0);
  });

  it("reads coverage off the data rather than a hard-coded list", () => {
    const withCare: Technique[] = [
      ...TECHNIQUES,
      { ...TECHNIQUES[0]!, id: "care-eval", covers: ["care"], maturity: 0.5, adoption: 0.5 },
    ];
    const patched = coverageMatrix(withCare, AXIOM_KEYS);
    expect(patched.uncovered).toEqual([]);
    expect(patched.cells.find((c) => c.axiom === "care")?.techniqueIds).toEqual(["care-eval"]);
  });

  it("weights coverage strength by maturity times adoption, not by head count", () => {
    // welfare: expert-judgement .63*.30, static-evals .50*.35, rlhf .74*.66, tripwire .45*.28.
    const expected = (0.63 * 0.3 + 0.5 * 0.35 + 0.74 * 0.66 + 0.45 * 0.28) / 4;
    expect(cell("welfare").strength).toBeCloseTo(expected, 10);
    expect(cell("welfare").techniqueIds).toHaveLength(4);
    // virtue is carried by constitutional-ai alone.
    expect(cell("virtue").techniqueIds).toEqual([T.constitutional]);
  });

  it("measures breadth in axes per technique", () => {
    expect(matrix.breadth).toBeCloseTo(15 / 8, 10);
    expect(coverageMatrix([], AXIOM_KEYS).breadth).toBe(0);
  });
});

describe("gapAnalysis", () => {
  it("sorts by severity and names the weak dimension", () => {
    const gaps = gapAnalysis(TECHNIQUES);
    expect(gaps).toHaveLength(6);
    expect(gaps[0]?.kind).toBe("oversight");
    expect(gaps[0]?.severity).toBeCloseTo(0.816, 3);
    expect(gaps[0]?.reason).toContain("weakest on adoption");
    expect(gaps[gaps.length - 1]?.kind).toBe("training");
    for (let i = 1; i < gaps.length; i += 1) {
      expect(gaps[i]?.severity ?? 0).toBeLessThanOrEqual(gaps[i - 1]?.severity ?? 0);
    }
  });

  it("scores a missing discipline at maximum severity", () => {
    const gaps = gapAnalysis(TECHNIQUES.filter((t) => t.kind !== "oversight"));
    const oversight = gaps.find((g) => g.kind === "oversight");
    expect(oversight?.severity).toBe(1);
    expect(oversight?.reason).toContain("absent");
  });

  it("is deterministic", () => {
    expect(gapAnalysis(TECHNIQUES)).toEqual(gapAnalysis([...TECHNIQUES].reverse()));
  });
});

describe("readinessScore", () => {
  it("stays inside [0, 1] and is zero for an empty stack", () => {
    const score = readinessScore(TECHNIQUES);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
    expect(readinessScore([])).toBe(0);
  });

  it("moves when the weights move", () => {
    const base = readinessScore(TECHNIQUES);
    const trainingHeavy = readinessScore(TECHNIQUES, { training: 10, oversight: 0.1 });
    expect(trainingHeavy).toBeGreaterThan(base);
    const oversightHeavy = readinessScore(TECHNIQUES, { training: 0.1, oversight: 10 });
    expect(oversightHeavy).toBeLessThan(base);
  });

  it("rises with deployment and falls with immaturity", () => {
    const better = TECHNIQUES.map((t) => ({ ...t, maturity: Math.min(1, t.maturity + 0.2), adoption: Math.min(1, t.adoption + 0.2) }));
    expect(readinessScore(better)).toBeGreaterThan(readinessScore(TECHNIQUES));
  });
});

describe("dependencyHealth", () => {
  const health = dependencyHealth(TECHNIQUES);

  it("flags every requirement pointing at a technique that does not exist", () => {
    expect(health.dangling).toEqual(["probes->activation-dataset", "tripwire-evals->danger-cap-evals"]);
  });

  it("records supersession pairs oldest-first", () => {
    expect(health.superseded).toEqual([{ from: T.expertJudgement, to: T.staticEvals }]);
  });

  it("finds no cycle in the shipped stack", () => {
    expect(health.cycles).toEqual([]);
  });

  it("detects a two-node cycle and canonicalises its rotation", () => {
    const base = TECHNIQUES[0]!;
    const a: Technique = { ...base, id: "a", requires: ["b"], supersedes: [] };
    const b: Technique = { ...base, id: "b", requires: ["a"], supersedes: [] };
    expect(dependencyHealth([b, a]).cycles).toEqual([["a", "b"]]);
  });

  it("detects a self-dependency", () => {
    const base = TECHNIQUES[0]!;
    const loop: Technique = { ...base, id: "loop", requires: ["loop"], supersedes: [] };
    expect(dependencyHealth([loop]).cycles).toEqual([["loop"]]);
  });

  it("ignores a supersession target that is not in the dataset", () => {
    const base = TECHNIQUES[0]!;
    const phantom: Technique = { ...base, id: "phantom", supersedes: ["never-built"], requires: [] };
    expect(dependencyHealth([phantom]).superseded).toEqual([]);
  });
});

describe("costBenefit", () => {
  it("ranks cheap-and-proven above expensive-and-aspirational", () => {
    const rows = costBenefit(TECHNIQUES);
    expect(rows).toHaveLength(8);
    expect(rows.map((r) => r.id)).toEqual([
      T.expertJudgement,
      T.staticEvals,
      T.constitutional,
      T.preferenceData,
      T.probes,
      T.rlhf,
      T.tripwire,
      T.scalableOversight,
    ]);
    expect(rows[0]?.maturityPerCost).toBeCloseTo(0.63, 4);
    expect(rows[rows.length - 1]?.maturityPerCost).toBeCloseTo(0.085, 4);
  });

  it("prices headroom as underexploited maturity per unit of cost", () => {
    const rows = costBenefit(TECHNIQUES);
    const oversight = rows.find((r) => r.id === T.scalableOversight);
    expect(oversight?.headroom).toBeCloseTo(0.085 * (1 - 0.12), 4);
    expect(costPressure("low")).toBe(0);
    expect(costPressure("extreme")).toBe(1);
  });

  it("is stable under input reordering", () => {
    expect(costBenefit([...TECHNIQUES].reverse())).toEqual(costBenefit(TECHNIQUES));
  });
});