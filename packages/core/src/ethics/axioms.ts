/**
 * The axiom calculus: how an advisor's moral weights meet an option's effects.
 *
 * WHY this is the centre of the whole engine: Nooreign's verdict is not an
 * opinion, it is arithmetic. An advisor is a six-vector over welfare, rights,
 * virtue, care, justice and agency; an option is another six-vector of how much
 * of each it honours. `scoreOption` is the normalised dot product of the two,
 * and every downstream number — the ballot, the margin, the dissent — is
 * derived from it rather than from a hand-written opinion about any dilemma.
 */
import type { Advisor, AxiomKey, AxiomVector, DilemmaOption, Kingdom } from "../../../seed/src/types";
import { AXIOM_KEYS } from "../../../seed/src/types";
import { clamp, maxOf, round, safeDiv, sum } from "../util/math";

/** One term of a dot product, kept so the UI can render the exact arithmetic. */
export interface AxiomContribution {
  readonly axiom: AxiomKey;
  /** The advisor's weight on this axis, in [0, 1]. */
  readonly weight: number;
  /** The option's honour for this axis, in [0, 1]. */
  readonly delta: number;
  /** Exactly `weight * delta`. */
  readonly product: number;
}

/**
 * How much of an advisor's judgement is their own and how much is their court.
 * A philosopher sitting on a kingdom's bench is never a free agent; 70/30 keeps
 * the individual legible while still letting the institution move the needle.
 */
export const ADVISOR_KINGDOM_BLEND = 0.7;

/** Expand a six-vector into `[welfare, rights, virtue, care, justice, agency]`. */
export function toArray(v: AxiomVector): number[] {
  return AXIOM_KEYS.map((key) => v[key]);
}

/**
 * The six `weight * delta` terms, in the canonical `AXIOM_KEYS` order.
 * Rounded to 4 dp so the rendered trace and the computed total agree exactly.
 */
export function contributions(
  weights: AxiomVector,
  deltas: AxiomVector,
): AxiomContribution[] {
  return AXIOM_KEYS.map((axiom) => {
    const weight = weights[axiom];
    const delta = deltas[axiom];
    return {
      axiom,
      weight: round(weight, 4),
      delta: round(delta, 4),
      product: round(weight * delta, 4),
    };
  });
}

/**
 * Score an option for an advisor: the weight-mean of the option's six deltas.
 *
 * Normalising by the sum of weights (rather than by 6) is what lets a Citadel
 * advisor, whose vector is lopsided, and an Orchard advisor, whose vector is
 * broad, both be compared on the same scale: each is scored as *how well this
 * option does on the things I care about*, not as an absolute moral score.
 */
export function scoreOption(advisor: Advisor, option: DilemmaOption): number {
  return scoreOptionWith(weighAdvisor(advisor), option);
}

/** Same arithmetic, against an arbitrary weight vector. */
export function scoreOptionWith(weights: AxiomVector, option: DilemmaOption): number {
  const weightSum = sum(toArray(weights));
  if (weightSum === 0) {
    // An advisor who weighs nothing ranks everything equally; 0 is the neutral
    // "no opinion" score rather than a NaN that would poison the ballot.
    return 0;
  }
  return round(safeDiv(sum(contributions(weights, option.deltas).map((c) => c.product)), weightSum), 4);
}

/**
 * Blend an advisor's personal weights with their kingdom's.
 *
 * The kingdom is the court they sit on: it supplies priors about which
 * questions are load-bearing, and it is why two utilitarians in different
 * kingdoms do not simply clone each other.
 */
export function weighAdvisor(advisor: Advisor, kingdom?: Kingdom): AxiomVector {
  const own = advisor.axioms;
  if (kingdom === undefined) return { ...own };
  const context = kingdom.axioms;
  const blend: Record<AxiomKey, number> = {} as Record<AxiomKey, number>;
  for (const key of AXIOM_KEYS) {
    blend[key] = round(ADVISOR_KINGDOM_BLEND * own[key] + (1 - ADVISOR_KINGDOM_BLEND) * context[key], 4);
  }
  return blend as AxiomVector;
}

/** The weights actually used for an advisor, with the kingdom context applied. */
export function weightsFor(advisor: Advisor, kingdoms?: readonly Kingdom[]): AxiomVector {
  const kingdom = kingdoms?.find((k) => k.id === advisor.kingdomId);
  return weighAdvisor(advisor, kingdom);
}

/**
 * Cosine distance in [0, 2]: `0` means two advisors lean the same way, `1` means
 * they are orthogonal, `2` means exact opposites. Used to place advisors on the
 * atlas and to report how fractured a court is.
 */
export function distance(a: AxiomVector, b: AxiomVector): number {
  const va = toArray(a);
  const vb = toArray(b);
  const denom = Math.sqrt(sum(va.map((x) => x * x))) * Math.sqrt(sum(vb.map((x) => x * x)));
  if (denom === 0) return 1;
  const similarity = safeDiv(sum(va.map((x, i) => x * (vb[i] ?? 0))), denom);
  return round(clamp(1 - clamp(similarity, -1, 1), 0, 2), 4);
}

/**
 * The axis an advisor leans on hardest.
 *
 * Ties break toward the earlier key in `AXIOM_KEYS`, which keeps the answer
 * stable across runs — important, because this name is rendered in prose.
 */
export function dominantAxiom(v: AxiomVector): AxiomKey {
  let best: AxiomKey = AXIOM_KEYS[0];
  let bestValue = Number.NEGATIVE_INFINITY;
  for (const key of AXIOM_KEYS) {
    const value = v[key];
    if (value > bestValue) {
      bestValue = value;
      best = key;
    }
  }
  return best;
}

/** The runner-up axis — the one that actually competes with `dominantAxiom`. */
export function secondaryAxiom(v: AxiomVector): AxiomKey {
  const ranked = rankAxes(v);
  return ranked[1] ?? AXIOM_KEYS[1] ?? "rights";
}

export interface AxisGap {
  readonly axiom: AxiomKey;
  readonly a: number;
  readonly b: number;
  /** Absolute difference, rounded for stable rendering. */
  readonly gap: number;
}

/** Axes ordered by weight, descending; ties break on `AXIOM_KEYS` order. */
export function rankAxes(v: AxiomVector): AxiomKey[] {
  return [...AXIOM_KEYS].sort((x, y) => {
    const delta = v[y] - v[x];
    if (delta !== 0) return delta;
    return AXIOM_KEYS.indexOf(x) - AXIOM_KEYS.indexOf(y);
  });
}

/** "justice before care" — the two axes that decide this profile. */
export function describeProfile(v: AxiomVector): string {
  const ranked = rankAxes(v);
  const first = ranked[0] ?? "welfare";
  const second = ranked[1] ?? "rights";
  return `${first} before ${second}`;
}

/**
 * Whether two profiles agree on every axis within `threshold`.
 *
 * The default threshold is 0.15 — roughly "these two traditions differ, but not
 * so much that they are arguing about different things".
 */
export function agreement(a: AxiomVector, b: AxiomVector, threshold = 0.15): boolean {
  return profileConflict(a, b, threshold).length === 0;
}

/** The axes on which two profiles disagree, largest disagreement first. */
export function profileConflict(a: AxiomVector, b: AxiomVector, threshold = 0.15): AxisGap[] {
  return AXIOM_KEYS.map((axiom) => ({
    axiom,
    a: a[axiom],
    b: b[axiom],
    gap: round(Math.abs(a[axiom] - b[axiom]), 4),
  }))
    .filter((entry) => entry.gap > threshold)
    .sort((x, y) => {
      if (y.gap !== x.gap) return y.gap - x.gap;
      return AXIOM_KEYS.indexOf(x.axiom) - AXIOM_KEYS.indexOf(y.axiom);
    });
}

/**
 * How evenly a profile is spread across all six axes.
 *
 * `0` means the entire profile sits on one axis; `1` means all six are equally
 * weighted. This is the `(max - min) / max` form rather than a Gini, because it
 * has the exact endpoints the observatory chart needs and stays interpretable
 * next to the raw weights.
 */
export function balance(v: AxiomVector): number {
  const values = toArray(v);
  const peak = maxOf(values);
  if (peak === 0) return 0;
  const floor = Math.min(...values);
  return round(clamp(1 - safeDiv(peak - floor, peak), 0, 1), 4);
}

/**
 * Which single axis decided a head-to-head between two options, given an
 * advisor's weights. This is what the narrative reports as "the axis that
 * carried the sitting", so it must be a real contributor, not the largest delta.
 */
export function decidingAxis(
  weights: AxiomVector,
  a: AxiomOptionish,
  b: AxiomOptionish,
): AxiomKey {
  const gaps = AXIOM_KEYS.map((axiom) => ({
    axiom,
    // Weight the gap by how much the advisor cares, so a 0.6 swing on an axis
    // they ignore is correctly reported as not having decided anything.
    gap: Math.abs(weights[axiom] * (a.deltas[axiom] - b.deltas[axiom])),
  }));
  let best: AxiomKey = "welfare";
  let bestGap = Number.NEGATIVE_INFINITY;
  for (const entry of gaps) {
    if (entry.gap > bestGap) {
      bestGap = entry.gap;
      best = entry.axiom;
    }
  }
  return best;
}

type AxiomOptionish = Pick<DilemmaOption, "deltas">;