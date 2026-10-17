/**
 * `analyseResilience` and `analyseInfluence` — how much does the verdict depend
 * on things that were never part of the argument?
 *
 * WHY this exists: `runCouncil` answers "who wins, and why". It cannot answer
 * the two questions a reader asks next. First: the engine adds a seeded jitter
 * so that no advisor is perfectly rational, and a reader is entitled to ask
 * whether a different tie-break would have changed the answer — so sweep the
 * seed and read the distribution the verdict was actually drawn from. Second:
 * a bench is a choice, and a reader is entitled to ask who on it was
 * load-bearing — so leave one advisor out at a time and see whether the
 * verdict survives their absence.
 *
 * Both analyses are pure functions OF `runCouncil` — no new arithmetic, no
 * second implementation — so a court's stability can never disagree with the
 * court's own verdicts. Sweeping N seeds is exactly N deliberations; the
 * numbers on a resilience report are the answers the engine would have given
 * those courts.
 */
import type { Advisor, AxiomKey, Dilemma, Kingdom } from "../../../seed/src/types";
import { AXIOM_KEYS } from "../../../seed/src/types";
import { clamp, maxOf, mean, minOf, round, safeDiv } from "../util/math";
import { CLOSE_MARGIN } from "./consensus";
import { runCouncil, type CouncilInput } from "./deliberation";

/* ------------------------------------------------------------------ *
 * Shared input
 * ------------------------------------------------------------------ */

export interface ResilienceInput {
  readonly dilemma: Dilemma;
  readonly advisors: readonly Advisor[];
  readonly kingdoms?: readonly Kingdom[];
  /** How many seeds to sweep. Clamped to `RESILIENCE_SWEEP`. */
  readonly count?: number;
  /** The first seed of the sweep; the sweep is `baseSeed .. baseSeed + count - 1`. */
  readonly baseSeed?: number;
  readonly rounds?: number;
}

/**
 * The sweep window. Two seeds is the smallest number that can disagree, and
 * 512 deliberates in about a coffee sip, so the clamp is generous enough for
 * every honest use and tight enough that a URL parameter cannot ask the
 * server to run forever.
 */
export const RESILIENCE_SWEEP = { default: 24, min: 2, max: 512 } as const;

/** Stability at or above `settled` is a verdict the seed is not deciding. */
export const RESILIENCE_THRESHOLDS = { settled: 0.9, contested: 0.6 } as const;

function sweepCount(count: number | undefined): number {
  return clamp(Math.trunc(count ?? RESILIENCE_SWEEP.default), RESILIENCE_SWEEP.min, RESILIENCE_SWEEP.max);
}

/**
 * The repository compiles with `exactOptionalPropertyTypes`, so a present-but-
 * undefined optional field is not a court. This bridge seats only the fields
 * the caller actually provided and leaves the rest absent.
 */
function courtOf(input: ResilienceInput, seed: number, advisors: readonly Advisor[]): CouncilInput {
  return {
    dilemma: input.dilemma,
    advisors,
    seed,
    ...(input.kingdoms !== undefined ? { kingdoms: input.kingdoms } : {}),
    ...(input.rounds !== undefined ? { rounds: input.rounds } : {}),
  };
}

/* ------------------------------------------------------------------ *
 * Resilience: the same court, a different tie-break
 * ------------------------------------------------------------------ */

export interface SeedOutcome {
  readonly seed: number;
  readonly winnerId: string;
  readonly margin: number;
  readonly confidence: number;
  readonly decidingAxis: AxiomKey;
}

export interface OptionStability {
  readonly optionId: string;
  readonly wins: number;
  /** `wins / count`, in [0, 1]. */
  readonly share: number;
  /** The first seed (lowest) at which this option won; null if it never did. */
  readonly firstSeed: number | null;
}

/**
 * `settled` — the seed is not deciding anything; `contested` — the verdict
 * survives but the margins move; `fragile` — a different tie-break hands the
 * case to a different option, which is the single most important thing a
 * reader can know about a verdict.
 */
export type ResilienceVerdict = "settled" | "contested" | "fragile";

export interface ResilienceReport {
  readonly dilemmaId: string;
  readonly baseSeed: number;
  readonly count: number;
  /** One entry per seed, in ascending seed order. */
  readonly outcomes: readonly SeedOutcome[];
  /** Every option of the dilemma, winners first, then by the case's own order. */
  readonly options: readonly OptionStability[];
  /**
   * The winner of the most seeds. Ties go to the option the dilemma lists
   * first, and a sweep that never produced a verdict reports `""` rather than
   * inventing one.
   */
  readonly modalWinnerId: string;
  /** Share of seeds won by `modalWinnerId`, in [0, 1]. */
  readonly stability: number;
  /** How many options won at least one seed. 1 means the sweep never split. */
  readonly distinctWinners: number;
  /** Adjacent seeds with different winners. */
  readonly flips: number;
  /** Longest unbroken run of `modalWinnerId`, in seeds. */
  readonly longestStreak: number;
  /** Seeds whose margin fell inside the engine's close band. */
  readonly closeSeeds: number;
  readonly margin: { readonly min: number; readonly mean: number; readonly max: number };
  readonly confidenceMean: number;
  /** The deciding axis of each outcome, most frequent first. */
  readonly axes: readonly { readonly axiom: AxiomKey; readonly count: number }[];
  readonly verdict: ResilienceVerdict;
}

/**
 * Sweep the seed and report how much of the verdict is seed and how much is
 * arithmetic.
 *
 * The sweep is consecutive seeds from `baseSeed` because consecutive streams
 * are the honest sample: picking decorative seeds (primes, the date, 42) would
 * be a second, undocumented source of variation, and a report about
 * reproducibility may not introduce any.
 */
export function analyseResilience(input: ResilienceInput): ResilienceReport {
  const count = sweepCount(input.count);
  const baseSeed = Math.trunc(input.baseSeed ?? 0);

  const outcomes: SeedOutcome[] = [];
  for (let i = 0; i < count; i += 1) {
    const seed = baseSeed + i;
    const result = runCouncil(courtOf(input, seed, input.advisors));
    outcomes.push({
      seed,
      winnerId: result.winnerId,
      margin: result.margin,
      confidence: result.confidence,
      decidingAxis: result.decidingAxis,
    });
  }

  /* ---- per-option tallies, in the dilemma's own option order -------- */
  const options: OptionStability[] = input.dilemma.options.map((option) => ({
    optionId: option.id,
    wins: 0,
    share: 0,
    firstSeed: null,
  }));
  const index = new Map(options.map((option, i) => [option.optionId, i]));

  for (const outcome of outcomes) {
    const at = index.get(outcome.winnerId);
    if (at === undefined) continue;
    const option = options[at];
    if (option === undefined) continue;
    options[at] = {
      optionId: option.optionId,
      wins: option.wins + 1,
      share: 0,
      firstSeed: option.firstSeed ?? outcome.seed,
    };
  }

  for (let i = 0; i < options.length; i += 1) {
    const option = options[i];
    if (option === undefined) continue;
    options[i] = { ...option, share: round(safeDiv(option.wins, count), 4) };
  }

  const ranked = [...options].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return (index.get(a.optionId) ?? 0) - (index.get(b.optionId) ?? 0);
  });

  const modal = ranked[0];
  const modalWinnerId = modal !== undefined && modal.wins > 0 ? modal.optionId : "";
  const stability = round(safeDiv(modal?.wins ?? 0, count), 4);

  let flips = 0;
  let longestStreak = 0;
  let streak = 0;
  for (let i = 0; i < outcomes.length; i += 1) {
    const outcome = outcomes[i];
    if (outcome === undefined) continue;
    const previous = outcomes[i - 1];
    if (previous !== undefined && previous.winnerId !== outcome.winnerId) flips += 1;
    streak = outcome.winnerId === modalWinnerId && modalWinnerId !== "" ? streak + 1 : 0;
    if (streak > longestStreak) longestStreak = streak;
  }

  const margins = outcomes.map((outcome) => outcome.margin);
  const confidences = outcomes.map((outcome) => outcome.confidence);
  const closeSeeds = outcomes.filter((outcome) => outcome.margin <= CLOSE_MARGIN).length;

  const axes = AXIOM_KEYS.map((axiom) => ({
    axiom,
    count: outcomes.filter((outcome) => outcome.decidingAxis === axiom).length,
  })).sort((a, b) => b.count - a.count || AXIOM_KEYS.indexOf(a.axiom) - AXIOM_KEYS.indexOf(b.axiom));

  const verdict: ResilienceVerdict =
    stability >= RESILIENCE_THRESHOLDS.settled
      ? "settled"
      : stability >= RESILIENCE_THRESHOLDS.contested
        ? "contested"
        : "fragile";

  return {
    dilemmaId: input.dilemma.id,
    baseSeed,
    count,
    outcomes,
    options: ranked,
    modalWinnerId,
    stability,
    distinctWinners: options.filter((option) => option.wins > 0).length,
    flips,
    longestStreak,
    closeSeeds,
    margin: {
      min: round(minOf(margins), 4),
      mean: round(mean(margins), 4),
      max: round(maxOf(margins), 4),
    },
    confidenceMean: round(mean(confidences), 4),
    axes,
    verdict,
  };
}

/* ------------------------------------------------------------------ *
 * Influence: the same seed, a different bench
 * ------------------------------------------------------------------ */

export interface InfluenceEntry {
  readonly advisorId: string;
  readonly advisorName: string;
  readonly kingdomId: string;
  /** The winner of the court that does not include this advisor. */
  readonly winnerWithoutId: string;
  /** True when removing this advisor alone changes the verdict. */
  readonly pivotal: boolean;
  readonly marginWithout: number;
  /** Base margin minus the margin without this advisor: positive = without them the court is closer. */
  readonly marginDelta: number;
  readonly confidenceWithout: number;
}

/**
 * `robust` — no single advisor flips the verdict; `hinged` — one or two do;
 * `precarious` — three or more do, which says the bench is the verdict;
 * `untested` — the court is below two advisors, so removing anyone is not a
 * counterfactual the engine can run.
 */
export type InfluenceVerdict = "robust" | "hinged" | "precarious" | "untested";

export const INFLUENCE_THRESHOLDS = { hinged: 2 } as const;

export interface InfluenceReport {
  readonly dilemmaId: string;
  readonly seed: number;
  readonly baseWinnerId: string;
  readonly baseMargin: number;
  readonly baseConfidence: number;
  /** Most load-bearing first: pivots, then largest swing in margin, then id. */
  readonly entries: readonly InfluenceEntry[];
  readonly pivotalIds: readonly string[];
  readonly verdict: InfluenceVerdict;
}

/**
 * Leave one advisor out at a time.
 *
 * This is a counterfactual, not an attribution: it answers "does the verdict
 * survive without this voice", not "did this voice cause the verdict" — a
 * distinction the report keeps by ordering on outcome (pivot first), not on
 * some invented causal score.
 */
export function analyseInfluence(input: ResilienceInput): InfluenceReport {
  const seed = Math.trunc(input.baseSeed ?? 0);
  const base = runCouncil(courtOf(input, seed, input.advisors));

  if (input.advisors.length < 2) {
    return {
      dilemmaId: input.dilemma.id,
      seed,
      baseWinnerId: base.winnerId,
      baseMargin: base.margin,
      baseConfidence: base.confidence,
      entries: [],
      pivotalIds: [],
      verdict: "untested",
    };
  }

  const entries: InfluenceEntry[] = [];
  for (const advisor of input.advisors) {
    const bench = input.advisors.filter((other) => other.id !== advisor.id);
    const without = runCouncil(courtOf(input, seed, bench));
    entries.push({
      advisorId: advisor.id,
      advisorName: advisor.name,
      kingdomId: advisor.kingdomId,
      winnerWithoutId: without.winnerId,
      pivotal: without.winnerId !== base.winnerId,
      marginWithout: without.margin,
      marginDelta: round(base.margin - without.margin, 4),
      confidenceWithout: without.confidence,
    });
  }

  entries.sort((a, b) => {
    if (a.pivotal !== b.pivotal) return a.pivotal ? -1 : 1;
    if (a.marginDelta !== b.marginDelta) return b.marginDelta - a.marginDelta;
    return a.advisorId.localeCompare(b.advisorId);
  });

  const pivotalIds = entries.filter((entry) => entry.pivotal).map((entry) => entry.advisorId);
  const verdict: InfluenceVerdict =
    pivotalIds.length === 0
      ? "robust"
      : pivotalIds.length <= INFLUENCE_THRESHOLDS.hinged
        ? "hinged"
        : "precarious";

  return {
    dilemmaId: input.dilemma.id,
    seed,
    baseWinnerId: base.winnerId,
    baseMargin: base.margin,
    baseConfidence: base.confidence,
    entries,
    pivotalIds,
    verdict,
  };
}
