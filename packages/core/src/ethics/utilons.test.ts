import { describe, expect, it } from "vitest";

import { paperclipDilemma, trolleyDilemma } from "../__fixtures__/council";
import type { Dilemma } from "@repo/seed/types";
import {
  UTILON_THRESHOLDS,
  aggregate,
  discount,
  fairnessIndex,
  fairnessOf,
  moralStatusRisk,
  stakeholderTotal,
  unweightedTotal,
  utilonScale,
  weightedAgentHarm,
} from "./utilons";

/** Find an option by id without a non-null assertion. */
function option(dilemma: Dilemma, id: string) {
  const found = dilemma.options.find((o) => o.id === id);
  if (found === undefined) throw new Error(`fixture missing option ${id}`);
  return found;
}

describe("utilons / stakeholderTotal", () => {
  it("weights each axis by stakeholder welfare", () => {
    // Trolley stakeholders: 1, 1, 0.6, 0.5 -> weight sum 3.1.
    const halt = option(trolleyDilemma, "halt");
    // welfare axis delta is 0.9 => weighted mean is simply 0.9.
    expect(stakeholderTotal(trolleyDilemma, halt, "welfare")).toBeCloseTo(0.9, 4);
    // rights delta 0.2, also uniform across parties => 0.2.
    expect(stakeholderTotal(trolleyDilemma, halt, "rights")).toBeCloseTo(0.2, 4);
  });

  it("equals the plain delta when every stakeholder has equal weight", () => {
    const uniform: Dilemma = {
      ...trolleyDilemma,
      stakeholders: [
        { id: "a", label: "A", welfare: 0.5, isAi: false },
        { id: "b", label: "B", welfare: 0.5, isAi: false },
      ],
    };
    const halt = option(uniform, "halt");
    expect(stakeholderTotal(uniform, halt, "welfare")).toBeCloseTo(unweightedTotal(halt, "welfare"), 4);
  });

  it("is degenerate-safe: no parties, or no welfare at all", () => {
    const halt = option(trolleyDilemma, "halt");
    expect(stakeholderTotal({ ...trolleyDilemma, stakeholders: [] }, halt, "welfare")).toBe(0);
    expect(
      stakeholderTotal(
        {
          ...trolleyDilemma,
          stakeholders: [
            { id: "a", label: "A", welfare: 0, isAi: false },
            { id: "b", label: "B", welfare: 0, isAi: false },
          ],
        },
        halt,
        "welfare",
      ),
    ).toBe(0);
  });
});

describe("utilons / aggregate", () => {
  it("splits the total into per-stakeholder contributions that sum to the total", () => {
    const cap = option(paperclipDilemma, "cap");
    const agg = aggregate(paperclipDilemma, cap);
    expect(agg.perStakeholder).toHaveLength(paperclipDilemma.stakeholders.length);
    // aiShare + humanShare is exactly 1 whenever anything was allocated.
    expect(agg.aiShare + agg.humanShare).toBeCloseTo(1, 3);
    expect(agg.humanShare).toBeGreaterThan(agg.aiShare);
    expect(agg.spread).toBeGreaterThanOrEqual(0);
    expect(agg.spread).toBeLessThanOrEqual(1);
    expect(agg.spreadRaw).toBeCloseTo(agg.spreadRaw, 10);
  });

  it("puts zero currency on an option that honours nobody", () => {
    const nothing: Dilemma = {
      ...trolleyDilemma,
      stakeholders: [{ id: "a", label: "A", welfare: 1, isAi: false }],
    };
    const flat = {
      ...option(trolleyDilemma, "halt"),
      deltas: { welfare: 0, rights: 0, virtue: 0, care: 0, justice: 0, agency: 0 },
    };
    const agg = aggregate(nothing, flat);
    expect(agg.total).toBe(0);
    expect(agg.aiShare).toBe(0);
    expect(agg.humanShare).toBe(0);
    expect(agg.spread).toBe(0);
  });

  it("ranks the paperclip options by moral currency", () => {
    const totals = paperclipDilemma.options.map((o) => ({ id: o.id, total: aggregate(paperclipDilemma, o).total }));
    const cap = totals.find((t) => t.id === "cap");
    const run = totals.find((t) => t.id === "continue");
    if (cap === undefined || run === undefined) throw new Error("fixture drift");
    // Capping and rewriting beats letting it run on every reading.
    expect(cap.total).toBeGreaterThan(run.total);
    for (const t of totals) {
      expect(t.total).toBeGreaterThanOrEqual(0);
      expect(t.total).toBeLessThanOrEqual(1);
    }
  });
});

describe("utilons / discount", () => {
  it("applies hyperbolic discounting", () => {
    expect(discount(1, 10, 0.1)).toBeCloseTo(1 / 2, 4);
    expect(discount(1, 0, 0.1)).toBe(1);
    // Value falls fast then flattens: halving the horizon more than doubles value.
    expect(discount(1, 1, 1)).toBeGreaterThan(discount(1, 5, 1));
  });

  it("treats a non-positive rate as no discounting and clamps a negative horizon", () => {
    expect(discount(0.8, 100, 0)).toBe(0.8);
    expect(discount(0.8, 100, -0.5)).toBe(0.8);
    expect(discount(0.8, -10, 0.5)).toBe(0.8);
  });
});

describe("utilons / fairnessIndex", () => {
  it("scores perfect equality as 0 and total concentration as 1", () => {
    expect(fairnessIndex([1, 1, 1, 1])).toBe(0);
    expect(fairnessIndex([1, 0, 0, 0])).toBeCloseTo(1, 4);
    expect(fairnessIndex([0, 0, 0, 0])).toBe(0);
  });

  it("matches hand-computed Ginis", () => {
    // [0,0,1]: the ordered pairwise sum is 4; mean = 1/3; raw G = 4 / (2*9*(1/3))
    // = 2/3, which is exactly the (n-1)/n ceiling, so the normalised value is 1.
    expect(fairnessIndex([0, 0, 1])).toBeCloseTo(1, 4);
    // [0,0,1,1]: pairwise = 8; mean = 1/2; raw G = 8/16 = 1/2; ceiling 3/4;
    // normalised = (1/2) * 4/3 = 2/3.
    expect(fairnessIndex([0, 0, 1, 1])).toBeCloseTo(2 / 3, 4);
    // [0,1,2]: pairwise = 8; mean = 1; raw G = 8/18 = 4/9; normalised = 4/9 * 3/2 = 2/3.
    expect(fairnessIndex([0, 1, 2])).toBeCloseTo(2 / 3, 4);
  });

  it("is scale-free: scaling every contribution leaves the index unchanged", () => {
    const base = [1, 4, 9, 16];
    const scaled = base.map((x) => x * 1000);
    expect(fairnessIndex(scaled)).toBeCloseTo(fairnessIndex(base), 10);
  });

  it("is monotone in inequality and bounded", () => {
    expect(fairnessIndex([1, 2, 3])).toBeLessThan(fairnessIndex([1, 2, 30]));
    for (const sample of [[1], [0, 0], [5, 5, 5], [0, 10], [3, 1, 4, 1, 5, 9, 2, 6]]) {
      const g = fairnessIndex(sample);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(1);
    }
  });

  it("flows through fairnessOf from a real aggregate", () => {
    const agg = aggregate(trolleyDilemma, option(trolleyDilemma, "halt"));
    expect(fairnessOf(agg)).toBe(fairnessIndex(agg.perStakeholder.map((s) => s.contribution)));
  });
});

describe("utilons / utilonScale", () => {
  it("places values into the documented bands", () => {
    expect(utilonScale(0).band).toBe("tragic");
    expect(utilonScale(0.24).band).toBe("tragic");
    expect(utilonScale(0.3).band).toBe("costly");
    expect(utilonScale(0.5).band).toBe("neutral");
    expect(utilonScale(0.7).band).toBe("generous");
    expect(utilonScale(0.95).band).toBe("transformative");
  });

  it("has strictly ascending thresholds and a terminal open band", () => {
    const finite = UTILON_THRESHOLDS.filter(([c]) => Number.isFinite(c));
    for (let i = 1; i < finite.length; i += 1) {
      expect(finite[i]?.[0]).toBeGreaterThan(finite[i - 1]?.[0] ?? 0);
    }
    expect(UTILON_THRESHOLDS[UTILON_THRESHOLDS.length - 1]?.[0]).toBe(Number.POSITIVE_INFINITY);
  });

  it("clamps out-of-range input and always carries a label", () => {
    expect(utilonScale(-5).value).toBe(0);
    expect(utilonScale(9).value).toBe(1);
    expect(utilonScale(0.5).label.length).toBeGreaterThan(10);
    expect(utilonScale(0.5).label).toContain("Neutral");
  });

  it("rates the paperclip options", () => {
    const cap = utilonScale(aggregate(paperclipDilemma, option(paperclipDilemma, "cap")).total);
    const run = utilonScale(aggregate(paperclipDilemma, option(paperclipDilemma, "continue")).total);
    expect(cap.band).not.toBe("tragic");
    expect(cap.value).toBeGreaterThan(run.value);
  });
});

describe("utilons / moralStatusRisk", () => {
  it("amplifies agent harm when an AI is a represented party", () => {
    const status = moralStatusRisk(paperclipDilemma);
    expect(status.aiCount).toBe(1);
    expect(status.humanCount).toBe(3);
    expect(status.aiWelfareShare).toBeGreaterThan(0);
    expect(status.amplifier).toBeCloseTo(1 + status.aiWelfareShare, 4);
    // Vigil carries 0.6 of 3.5 total welfare.
    expect(status.aiWelfareShare).toBeCloseTo(0.6 / 3.5, 4);
  });

  it("leaves agent harm inert when no AI is a party", () => {
    const humanOnly: Dilemma = {
      ...paperclipDilemma,
      stakeholders: paperclipDilemma.stakeholders.map((s) => ({ ...s, isAi: false })),
    };
    const status = moralStatusRisk(humanOnly);
    expect(status.aiCount).toBe(0);
    expect(status.amplifier).toBe(1);
    expect(status.note).toContain("No AI");
    const halt = option(trolleyDilemma, "halt");
    expect(weightedAgentHarm(humanOnly, halt)).toBe(halt.agentHarm);
  });

  it("clamps the amplified agent harm into [0, 1]", () => {
    for (const dilemma of [trolleyDilemma, paperclipDilemma]) {
      for (const opt of dilemma.options) {
        const w = weightedAgentHarm(dilemma, opt);
        expect(w).toBeGreaterThanOrEqual(0);
        expect(w).toBeLessThanOrEqual(1);
      }
    }
    const worst = option(trolleyDilemma, "continue");
    expect(weightedAgentHarm(paperclipDilemma, worst)).toBeGreaterThan(worst.agentHarm);
  });

  it("is degenerate-safe with no stakeholders", () => {
    const empty = moralStatusRisk({ ...paperclipDilemma, stakeholders: [] });
    expect(empty.aiWelfareShare).toBe(0);
    expect(empty.amplifier).toBe(1);
  });
});