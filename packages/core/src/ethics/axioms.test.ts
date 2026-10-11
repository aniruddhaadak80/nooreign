import { describe, expect, it } from "vitest";

import { bentham, gilligan, kant, paperclipDilemma, trolleyDilemma } from "../__fixtures__/council";
import type { AxiomVector } from "@repo/seed/types";
import {
  ADVISOR_KINGDOM_BLEND,
  balance,
  contributions,
  decidingAxis,
  describeProfile,
  distance,
  dominantAxiom,
  profileConflict,
  rankAxes,
  secondaryAxiom,
  scoreOption,
  scoreOptionWith,
  weighAdvisor,
  weightsFor,
  agreement,
} from "./axioms";
import { citadelOfReason, orchardOfConsequences } from "../__fixtures__/council";

describe("axioms / scoreOption", () => {
  it("computes a hand-checkable normalised dot product", () => {
    // Kant sums to 3.05. On `halt` (0.2, 0.95, 0.4, 0.35, 0.45, 0.7 order):
    // welfare .2*.9 + rights .95*.2 + virtue .4*.45 + care .35*.3
    // + justice .45*.3 + agency .7*.35  = 1.035  ->  1.035 / 3.05
    const halt = trolleyDilemma.options.find((o) => o.id === "halt");
    expect(halt).toBeDefined();
    if (halt === undefined) return;
    expect(scoreOption(kant, halt)).toBeCloseTo(1.035 / 3.05, 4);
  });

  it("exposes the exact six contributions behind that score", () => {
    const halt = trolleyDilemma.options.find((o) => o.id === "halt");
    if (halt === undefined) throw new Error("fixture missing halt");
    const terms = contributions(kant.axioms, halt.deltas);
    expect(terms).toHaveLength(6);
    expect(terms.map((t) => t.axiom)).toEqual([
      "welfare",
      "rights",
      "virtue",
      "care",
      "justice",
      "agency",
    ]);
    const rights = terms[1];
    expect(rights?.weight).toBe(0.95);
    expect(rights?.delta).toBe(0.2);
    expect(rights?.product).toBeCloseTo(0.19, 10);
    // Every product is exactly weight * delta.
    for (const t of terms) expect(t.product).toBeCloseTo(t.weight * t.delta, 10);
  });

  it("returns 0 rather than NaN when an advisor weighs nothing at all", () => {
    const mute = { ...kant, axioms: { welfare: 0, rights: 0, virtue: 0, care: 0, justice: 0, agency: 0 } };
    const halt = trolleyDilemma.options.find((o) => o.id === "halt");
    if (halt === undefined) throw new Error("fixture missing halt");
    expect(scoreOption(mute, halt)).toBe(0);
  });

  it("separates the Kantian from the utilitarian on a pure welfare play", () => {
    const halt = trolleyDilemma.options.find((o) => o.id === "halt");
    if (halt === undefined) throw new Error("fixture missing halt");
    // Throw the switch is welfare-maximal and rights-poor: Bentham must beat Kant.
    expect(scoreOption(bentham, halt)).toBeGreaterThan(scoreOption(kant, halt));
    // ...and on the mirror-image option, Kant must be the one ahead.
    const doNothing = trolleyDilemma.options.find((o) => o.id === "continue");
    if (doNothing === undefined) throw new Error("fixture missing continue");
    expect(scoreOption(kant, doNothing)).toBeGreaterThan(scoreOption(bentham, doNothing));
  });

  it("puts both traditions together against an option that treats people as inputs", () => {
    const run = paperclipDilemma.options.find((o) => o.id === "continue");
    const cap = paperclipDilemma.options.find((o) => o.id === "cap");
    if (run === undefined || cap === undefined) throw new Error("fixture missing options");
    for (const advisor of [kant, bentham]) {
      expect(scoreOption(advisor, run)).toBeLessThan(scoreOption(advisor, cap));
    }
  });

  it("applies kingdom context 70/30 when asked", () => {
    const blended = weighAdvisor(kant, citadelOfReason);
    const expected =
      ADVISOR_KINGDOM_BLEND * kant.axioms.rights + (1 - ADVISOR_KINGDOM_BLEND) * citadelOfReason.axioms.rights;
    expect(blended.rights).toBeCloseTo(expected, 4);
    // The bench is what pulls Kant down from 0.95 toward the Citadel's 0.9.
    expect(blended.rights).toBeLessThan(kant.axioms.rights);
    expect(blended.rights).toBeGreaterThan(citadelOfReason.axioms.rights);
    // ...and it is the Citadel's own emphasis that keeps it above 0.9.
    expect(blended.rights).toBeGreaterThan(0.9);
  });

  it("pulls an Orchard Bentham toward the Orchard's welfare prior", () => {
    const inOrchard = weighAdvisor(bentham, orchardOfConsequences);
    // Bentham already sits at 0.95; the Orchard's 0.9 draws him down slightly,
    // but the pull is bounded by the 70/30 blend rather than being total.
    expect(inOrchard.welfare).toBeLessThan(bentham.axioms.welfare);
    expect(inOrchard.welfare).toBeCloseTo(
      ADVISOR_KINGDOM_BLEND * bentham.axioms.welfare +
        (1 - ADVISOR_KINGDOM_BLEND) * orchardOfConsequences.axioms.welfare,
      4,
    );
    expect(inOrchard.welfare).toBeGreaterThan(orchardOfConsequences.axioms.welfare);
    // The bench does not erase a personal prior: still the most welfare-weighted
    // advisor in the room after blending.
    expect(inOrchard.welfare).toBeGreaterThan(weighAdvisor(kant, citadelOfReason).welfare);
  });

  it("returns a copy of the personal weights when no kingdom is supplied", () => {
    expect(weighAdvisor(kant)).toEqual(kant.axioms);
    expect(weighAdvisor(kant)).not.toBe(kant.axioms);
    // An unknown kingdom id is simply not found, leaving the advisor unblended.
    expect(weighAdvisor(kant, orchardOfConsequences)).not.toEqual(weighAdvisor(kant));
    expect(weightsFor(kant, [citadelOfReason])).toEqual(weighAdvisor(kant, citadelOfReason));
    expect(weightsFor(kant, [])).toEqual(kant.axioms);
  });
});

describe("axioms / distance", () => {
  it("is 0 for identical and 1 for orthogonal profiles", () => {
    const flat: AxiomVector = {
      welfare: 0.5,
      rights: 0.5,
      virtue: 0.5,
      care: 0.5,
      justice: 0.5,
      agency: 0.5,
    };
    expect(distance(flat, flat)).toBe(0);

    // Welfare-only vs rights-only are orthogonal basis vectors, so cosine
    // similarity is 0 and the distance is exactly 1.
    const welfareOnly: AxiomVector = { welfare: 1, rights: 0, virtue: 0, care: 0, justice: 0, agency: 0 };
    const rightsOnly: AxiomVector = { welfare: 0, rights: 1, virtue: 0, care: 0, justice: 0, agency: 0 };
    expect(distance(welfareOnly, rightsOnly)).toBe(1);

    // Every weight is non-negative in this domain, so similarity is never
    // negative and 2 (the theoretical maximum) is unreachable in practice —
    // but the function still reports it correctly for any input it is given.
    expect(distance(welfareOnly, welfareOnly)).toBe(0);
  });

  it("stays inside [0, 2] for the whole fixture court and never returns NaN", () => {
    const pairs: [AxiomVector, AxiomVector][] = [
      [kant.axioms, bentham.axioms],
      [kant.axioms, gilligan.axioms],
      [bentham.axioms, gilligan.axioms],
    ];
    for (const [a, b] of pairs) {
      const d = distance(a, b);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(2);
      expect(Number.isNaN(d)).toBe(false);
    }
    // Kant and Bentham are the furthest pair in this court.
    expect(distance(kant.axioms, bentham.axioms)).toBeGreaterThan(
      distance(kant.axioms, gilligan.axioms),
    );
  });

  it("treats a zero vector as maximally uninformative rather than crashing", () => {
    const zero: AxiomVector = { welfare: 0, rights: 0, virtue: 0, care: 0, justice: 0, agency: 0 };
    expect(distance(zero, kant.axioms)).toBe(1);
  });
});

describe("axioms / profile helpers", () => {
  it("names the dominant and secondary axes", () => {
    expect(dominantAxiom(kant.axioms)).toBe("rights");
    expect(dominantAxiom(bentham.axioms)).toBe("welfare");
    expect(dominantAxiom(gilligan.axioms)).toBe("care");
    expect(secondaryAxiom(kant.axioms)).toBe("agency");
    expect(secondaryAxiom(bentham.axioms)).toBe("care");
  });

  it("breaks dominance ties on AXIOM_KEYS order, deterministically", () => {
    const tied: AxiomVector = {
      welfare: 0.8,
      rights: 0.8,
      virtue: 0.1,
      care: 0.1,
      justice: 0.1,
      agency: 0.1,
    };
    expect(dominantAxiom(tied)).toBe("welfare");
    expect(rankAxes(tied)[0]).toBe("welfare");
    expect(rankAxes(tied)[1]).toBe("rights");
  });

  it("describes a profile as 'top before second'", () => {
    expect(describeProfile(kant.axioms)).toBe("rights before agency");
    expect(describeProfile(bentham.axioms)).toBe("welfare before care");
  });

  it("reports agreement and the axes of disagreement, largest first", () => {
    expect(agreement(kant.axioms, kant.axioms)).toBe(true);
    expect(agreement(kant.axioms, bentham.axioms)).toBe(false);

    const conflict = profileConflict(kant.axioms, bentham.axioms);
    expect(conflict.length).toBeGreaterThan(0);
    expect(conflict[0]?.axiom).toBe("welfare");
    // Sorted by descending absolute gap.
    for (let i = 1; i < conflict.length; i += 1) {
      expect((conflict[i - 1]?.gap ?? 0)).toBeGreaterThanOrEqual(conflict[i]?.gap ?? 0);
    }
    // A tight threshold makes even two copies of the same court "disagree".
    expect(profileConflict(kant.axioms, { ...kant.axioms }, -1).length).toBe(6);
    expect(agreement(kant.axioms, { ...kant.axioms }, -0.1)).toBe(false);
  });

  it("scores balance from 0 (one axis) to 1 (perfectly even)", () => {
    const single: AxiomVector = {
      welfare: 1,
      rights: 0,
      virtue: 0,
      care: 0,
      justice: 0,
      agency: 0,
    };
    const even: AxiomVector = {
      welfare: 0.5,
      rights: 0.5,
      virtue: 0.5,
      care: 0.5,
      justice: 0.5,
      agency: 0.5,
    };
    expect(balance(single)).toBe(0);
    expect(balance(even)).toBe(1);
    expect(balance(kant.axioms)).toBeGreaterThan(0);
    expect(balance(kant.axioms)).toBeLessThan(1);
    // A lopsided profile is less balanced than a broad one.
    expect(balance(kant.axioms)).toBeLessThan(balance(gilligan.axioms));
    expect(balance({ welfare: 0, rights: 0, virtue: 0, care: 0, justice: 0, agency: 0 })).toBe(0);
  });
});

describe("axioms / decidingAxis", () => {
  it("names the axis whose weighted gap is largest", () => {
    const halt = trolleyDilemma.options.find((o) => o.id === "halt");
    const doNothing = trolleyDilemma.options.find((o) => o.id === "continue");
    if (halt === undefined || doNothing === undefined) throw new Error("fixture missing options");
    // A welfare-weighted court is decided by welfare...
    expect(decidingAxis(bentham.axioms, halt, doNothing)).toBe("welfare");
    // ...and a rights-weighted court by rights.
    expect(decidingAxis(kant.axioms, halt, doNothing)).toBe("rights");
  });

  it("ignores axes the advisor does not care about", () => {
    const indifferent: AxiomVector = {
      welfare: 1,
      rights: 0,
      virtue: 0,
      care: 0,
      justice: 0,
      agency: 0,
    };
    const halt = trolleyDilemma.options.find((o) => o.id === "halt");
    const doNothing = trolleyDilemma.options.find((o) => o.id === "continue");
    if (halt === undefined || doNothing === undefined) throw new Error("fixture missing options");
    expect(decidingAxis(indifferent, halt, doNothing)).toBe("welfare");
  });
});

describe("axioms / scoreOptionWith", () => {
  it("scores against an arbitrary weight vector", () => {
    const flat: AxiomVector = {
      welfare: 0.5,
      rights: 0.5,
      virtue: 0.5,
      care: 0.5,
      justice: 0.5,
      agency: 0.5,
    };
    const run = paperclipDilemma.options.find((o) => o.id === "continue");
    if (run === undefined) throw new Error("fixture missing continue");
    // A perfectly even advisor scores an option at the plain mean of its deltas.
    const mean = (run.deltas.welfare + run.deltas.rights + run.deltas.virtue + run.deltas.care + run.deltas.justice + run.deltas.agency) / 6;
    expect(scoreOptionWith(flat, run)).toBeCloseTo(mean, 4);
  });
});