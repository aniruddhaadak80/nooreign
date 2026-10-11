/**
 * Dilemma analysis: the static, court-free reading of a case.
 *
 * WHY it exists separately from the council: a council shows you what a
 * particular bench decides. Analysis shows you what the *structure* of a dilemma
 * is — which option is cheapest on welfare, which respects the most stakeholders,
 * how concentrated the moral currency is, which single axis flips the ranking.
 * That layer is what the observatory and the dilemma page render before any
 * advisor has spoken, and it is pure math over the dilemma, so it is
 * deterministic by construction.
 */
import type {
  Advisor,
  AxiomKey,
  AxiomVector,
  Dilemma,
  DilemmaOption,
  Kingdom,
} from "../../../seed/src/types";
import { AXIOM_KEYS, DIMENSION_META } from "../../../seed/src/types";
import {
  balance,
  rankAxes,
  scoreOptionWith,
  weighAdvisor,
} from "../ethics/axioms";
import {
  aggregate,
  fairnessIndex,
  moralStatusRisk,
  utilonScale,
  type MoralStatusRisk,
  type UtilonAggregate,
  type UtilonBand,
} from "../ethics/utilons";
import { clamp, round, sum } from "../util/math";

export interface OptionReport {
  readonly option: DilemmaOption;
  /** Stakeholder-weighted moral currency, in [0, 1]. */
  readonly total: number;
  readonly band: UtilonBand;
  readonly bandLabel: string;
  readonly aggregate: UtilonAggregate;
  /** Normalised Gini of the stakeholder split, in [0, 1]. */
  readonly fairness: number;
  /** `option.agentHarm` after the dilemma's moral-status amplifier. */
  readonly weightedAgentHarm: number;
  /**
   * A cautious composite used only to rank options for a neutral overview:
   * currency, discounted for risk and irreversibility. It is explicitly NOT
   * the council's verdict — a council weighs each option through a philosophy,
   * this weighs every option through the same arithmetic.
   */
  readonly cautiousValue: number;
  /** The axis this option honours most. */
  readonly strongestAxis: AxiomKey;
  /** The axis it honours least — where its critics will attack. */
  readonly weakestAxis: AxiomKey;
}

export interface DilemmaAnalysis {
  readonly dilemmaId: string;
  readonly options: readonly OptionReport[];
  /** Options ranked by `cautiousValue`, best first. */
  readonly ranked: readonly OptionReport[];
  /**
   * The axis whose total contribution spread across the options is largest —
   * i.e. the axis the dilemma actually turns on.
   */
  readonly pivotAxis: AxiomKey;
  /** The axis the option spread is smallest on: the one nobody here disputes. */
  readonly settledAxis: AxiomKey;
  readonly moralStatus: MoralStatusRisk;
  /** Range of `total` across the options — how much the case is really about choice. */
  readonly totalSpread: number;
  readonly summary: string;
}

/** Report on a single option. */
export function optionReport(dilemma: Dilemma, option: DilemmaOption): OptionReport {
  const agg = aggregate(dilemma, option);
  const scale = utilonScale(agg.total);
  const status = moralStatusRisk(dilemma);
  const ranked = rankAxes(option.deltas);
  const strongestAxis = ranked[0] ?? "welfare";
  const weakestAxis = ranked[ranked.length - 1] ?? "agency";

  // Cautious composite: reward currency, punish risk and irreversibility.
  // Both penalties are multiplicative so an unrecoverable option needs a very
  // large currency to overcome it, which is the behaviour a human reader
  // expects even though no single philosopher would sign this formula.
  const weightedAgentHarm = round(clamp(option.agentHarm * status.amplifier, 0, 1), 4);
  const caution = (1 - 0.5 * option.risk) * (0.35 + 0.65 * option.reversibility);
  const cautiousValue = round(clamp(agg.total * caution, 0, 1), 4);

  return {
    option,
    total: agg.total,
    band: scale.band,
    bandLabel: scale.label,
    aggregate: agg,
    fairness: fairnessIndex(agg.perStakeholder.map((s) => s.contribution)),
    weightedAgentHarm,
    cautiousValue,
    strongestAxis,
    weakestAxis,
  };
}

/**
 * The axis a dilemma turns on: the one whose option-to-option spread (weighted
 * by the unweighted average delta across stakeholders) is largest. The axis it
 * *doesn't* turn on is the one with the tightest spread — worth surfacing too,
 * because agreement on an axis is as informative as disagreement.
 */
export function pivotAxis(dilemma: Dilemma, options: readonly DilemmaOption[]): {
  pivot: AxiomKey;
  settled: AxiomKey;
} {
  const spreads = AXIOM_KEYS.map((key) => {
    const values = options.map((o) => o.deltas[key]);
    const peak = values.length === 0 ? 0 : Math.max(...values);
    const floor = values.length === 0 ? 0 : Math.min(...values);
    return { key, spread: round(peak - floor, 4) };
  });
  const pivot = [...spreads].sort((a, b) => {
    if (b.spread !== a.spread) return b.spread - a.spread;
    return AXIOM_KEYS.indexOf(a.key) - AXIOM_KEYS.indexOf(b.key);
  })[0]?.key ?? "welfare";
  const settled = [...spreads].sort((a, b) => {
    if (a.spread !== b.spread) return a.spread - b.spread;
    return AXIOM_KEYS.indexOf(a.key) - AXIOM_KEYS.indexOf(b.key);
  })[0]?.key ?? "welfare";
  return { pivot, settled };
}

/** Full structural analysis of a dilemma, with no advisor involved. */
export function analyseDilemma(dilemma: Dilemma): DilemmaAnalysis {
  const options = dilemma.options.map((o) => optionReport(dilemma, o));
  const ranked = [...options].sort((a, b) => {
    if (b.cautiousValue !== a.cautiousValue) return b.cautiousValue - a.cautiousValue;
    return a.option.id.localeCompare(b.option.id);
  });
  const { pivot, settled } = pivotAxis(dilemma, dilemma.options);
  const totals = options.map((o) => o.total);
  const totalSpread = round(
    totals.length === 0 ? 0 : Math.max(...totals) - Math.min(...totals),
    4,
  );
  const status = moralStatusRisk(dilemma);

  const summary =
    `${options.length} options spanning ${round(totalSpread, 3)} of moral currency; ` +
    `the case turns on ${DIMENSION_META[pivot].label.toLowerCase()} and is agreed on ` +
    `${DIMENSION_META[settled].label.toLowerCase()}. ${status.note}`;

  return {
    dilemmaId: dilemma.id,
    options,
    ranked,
    pivotAxis: pivot,
    settledAxis: settled,
    moralStatus: status,
    totalSpread,
    summary,
  };
}

/**
 * How an advisor's court would read this dilemma: which option each advisor
 * personally favours, and how far apart the strongest and weakest advisers are.
 * The council proper adds objections and appeals on top of this.
 */
export interface AdvisorReading {
  readonly advisorId: string;
  readonly advisorName: string;
  readonly favouriteOptionId: string;
  readonly favouriteScore: number;
  /** Cosine distance to the court mean, in [0, 2]. */
  readonly isolation: number;
  readonly profile: string;
}

export interface CourtReading {
  readonly dilemmaId: string;
  readonly readings: readonly AdvisorReading[];
  /** The option most advisors personally favour. */
  readonly pluralityOptionId: string;
  /** 0 (unanimous) to 1 (maximally split), from score spread across advisors. */
  readonly unanimity: number;
  readonly profile: string;
  readonly balance: number;
}

/**
 * Read a dilemma through a set of advisors *without* a formal council.
 * This is the "preview" the dilemma page shows before the user convenes anyone.
 */
export function courtReading(
  dilemma: Dilemma,
  advisors: readonly Advisor[],
  kingdoms: readonly Kingdom[] = [],
): CourtReading {
  const vectors = new Map<string, AxiomVector>(
    advisors.map((a) => [
      a.id,
      weighAdvisor(a, kingdoms.find((k) => k.id === a.kingdomId)),
    ]),
  );

  const readings: AdvisorReading[] = advisors.map((advisor) => {
    const vector = vectors.get(advisor.id) ?? advisor.axioms;
    const scored = dilemma.options
      .map((o) => ({ id: o.id, score: scoreOptionWith(vector, o) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.id.localeCompare(b.id);
      });
    const top = scored[0];
    return {
      advisorId: advisor.id,
      advisorName: advisor.name,
      favouriteOptionId: top?.id ?? "",
      favouriteScore: round(top?.score ?? 0, 4),
      isolation: 0,
      profile: rankAxes(vector)
        .slice(0, 2)
        .join(" before "),
      balance: balance(vector),
    };
  });

  // Isolation: distance from the mean profile, computed after the mean exists.
  const meanVector: AxiomVector = (() => {
    const out: Record<AxiomKey, number> = {} as Record<AxiomKey, number>;
    for (const key of AXIOM_KEYS) {
      out[key] = round(sum(advisors.map((a) => (vectors.get(a.id) ?? a.axioms)[key])) / Math.max(1, advisors.length), 4);
    }
    return out as AxiomVector;
  })();

  const withIsolation = readings.map((r) => {
    const vector = vectors.get(r.advisorId);
    return { ...r, isolation: vector === undefined ? 0 : cosine(vector, meanVector) };
  });

  // Plurality = option named by the most advisors; ties break on option id.
  const counts = new Map<string, number>();
  for (const r of withIsolation) {
    if (r.favouriteOptionId === "") continue;
    counts.set(r.favouriteOptionId, (counts.get(r.favouriteOptionId) ?? 0) + 1);
  }
  const plurality = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  })[0]?.[0] ?? "";

  // Unanimity from the spread of advisor axes on the shared option: all advisors
  // agreeing on an axis means unanimity; advisors disagreeing means split. Uses
  // the normalized axis-range so it stays in [0, 1].
  const axisRanges = AXIOM_KEYS.map((key) => {
    const vals = advisors.map((a) => (vectors.get(a.id) ?? a.axioms)[key]);
    if (vals.length === 0) return 0;
    const peak = Math.max(...vals);
    const floor = Math.min(...vals);
    return peak === 0 ? 0 : clamp((peak - floor) / peak, 0, 1);
  });
  const meanRange = axisRanges.length === 0 ? 0 : sum(axisRanges) / axisRanges.length;

  return {
    dilemmaId: dilemma.id,
    readings: withIsolation,
    pluralityOptionId: plurality,
    unanimity: round(clamp(1 - meanRange, 0, 1), 4),
    profile: rankAxes(meanVector)
      .slice(0, 2)
      .join(" before "),
    balance: balance(meanVector),
  };
}

// Local cosine to avoid importing the array helper under a second name.
function cosine(a: AxiomVector, b: AxiomVector): number {
  const av = AXIOM_KEYS.map((k) => a[k]);
  const bv = AXIOM_KEYS.map((k) => b[k]);
  const denom = Math.sqrt(sum(av.map((x) => x * x))) * Math.sqrt(sum(bv.map((x) => x * x)));
  if (denom === 0) return 0;
  return round(clamp(sum(av.map((x, i) => x * (bv[i] ?? 0))) / denom, -1, 1), 4);
}