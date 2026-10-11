/**
 * `runCouncil` — the deliberation engine.
 *
 * WHY this shape: Nooreign's central promise is a verdict that is *explainable*.
 * A language model can tell you an answer is defensible; this engine tells you
 * which six multiplications produced it, who objected, and what they said. So
 * the module is organised around producing an audit trail first and a verdict
 * second — `traces` is the primary output and the winner is derived from it.
 *
 * Determinism is load-bearing. Identical inputs produce a deep-equal result:
 * every source of variation (tie-breaks, "best move" selection, the jitter that
 * stops every advisor being perfectly rational) is drawn from a seeded stream
 * keyed on ids, never from iteration order or wall-clock time.
 */
import type {
  Advisor,
  ArgumentMove,
  AxiomKey,
  AxiomVector,
  Dilemma,
  DilemmaOption,
  Kingdom,
  MoveKind,
} from "../../../seed/src/types";
import { AXIOM_KEYS } from "../../../seed/src/types";
import {
  balance,
  contributions as axiomContributions,
  decidingAxis,
  describeProfile,
  distance,
  dominantAxiom,
  rankAxes,
  scoreOptionWith,
  weighAdvisor,
} from "../ethics/axioms";
import { utilonScale, type UtilonBand } from "../ethics/utilons";
import { clamp, maxOf, round, sum } from "../util/math";
import { createRng } from "../util/rng";
import {
  decision,
  minorityReport,
  stancesFrom,
  superMajority,
  synthesis,
  weightedBallot,
  type BallotScore,
  type BallotTally,
  type MinorityReport,
  type StanceAdvisor,
  type SuperMajority,
  type SynthesisMove,
} from "./consensus";

/* ------------------------------------------------------------------ *
 * Public types
 * ------------------------------------------------------------------ */

export interface CouncilInput {
  readonly dilemma: Dilemma;
  readonly advisors: readonly Advisor[];
  readonly kingdoms?: readonly Kingdom[];
  readonly seed?: number;
  readonly rounds?: number;
  /** Minimum advisors who must score an option for the court to act; reported, never enforced. */
  readonly quorum?: number;
}

export interface TraceContribution {
  readonly axiom: AxiomKey;
  readonly weight: number;
  readonly delta: number;
  readonly product: number;
}

/**
 * One scored move together with the arithmetic behind it.
 *
 * The invariant the UI depends on:
 *   `Σ contributions[].product === subtotal`  and  `total === subtotal + jitter`.
 */
export interface TraceEntry {
  readonly advisorId: string;
  readonly advisorName: string;
  readonly kingdomId?: string;
  readonly round: 1 | 2 | 3;
  readonly kind: MoveKind;
  readonly optionId: string;
  /** The move's supporting argument, quoted verbatim. */
  readonly premise: string;
  readonly claim: string;
  readonly moveId: string;
  readonly leansOn: readonly AxiomKey[];
  readonly contributions: readonly TraceContribution[];
  readonly subtotal: number;
  readonly jitter: number;
  readonly total: number;
}

export interface RankedOption {
  readonly optionId: string;
  /** Final score including jitter. */
  readonly score: number;
  /** Score before jitter — the pure moral arithmetic. */
  readonly raw: number;
}

export interface PositionRecord {
  readonly advisorId: string;
  readonly advisorName: string;
  readonly kingdomId?: string;
  /** The advisor's first-ranked option. */
  readonly topOptionId: string;
  /** Every option with its final and raw score, best first. */
  readonly ranking: readonly RankedOption[];
  /** The moves whose premises this advisor attached, best first. */
  readonly premiseMoveIds: readonly string[];
  /** "justice before care" — the two axes that decide this advisor. */
  readonly profile: string;
  /** 0 = all weight on one axis, 1 = perfectly even. */
  readonly balance: number;
}

export interface ObjectionRecord {
  readonly advisorId: string;
  readonly advisorName: string;
  readonly kingdomId?: string;
  /** The option the advisor is defending. */
  readonly defendedOptionId: string;
  /** The option the objection presses against. */
  readonly targetedOptionId: string;
  /** The advisor whose position this objection answers. */
  readonly adversaryId: string;
  readonly adversaryName: string;
  readonly moveId: string;
  readonly claim: string;
  readonly trace: TraceEntry;
}

export interface AppealRecord {
  readonly advisorId: string;
  readonly advisorName: string;
  readonly kingdomId?: string;
  readonly optionId: string;
  readonly kind: MoveKind;
  readonly moveId: string;
  readonly claim: string;
  /** How hard the advisor pressed, in [0, 1]: closeness of the vote x move weight. */
  readonly conviction: number;
  readonly trace: TraceEntry;
}

export interface CouncilResult {
  readonly dilemmaId: string;
  readonly seed: number;
  readonly rounds: number;
  readonly quorum: number;
  readonly participating: number;
  readonly positions: readonly PositionRecord[];
  readonly objections: readonly ObjectionRecord[];
  readonly appeals: readonly AppealRecord[];
  readonly ballots: readonly BallotTally[];
  readonly winnerId: string;
  readonly margin: number;
  readonly confidence: number;
  readonly superMajority: SuperMajority;
  readonly dissent: MinorityReport;
  readonly synthesis: SynthesisMove | null;
  readonly traces: readonly TraceEntry[];
  readonly narrative: readonly string[];
  /** The axis whose weighted gap between winner and runner-up was largest. */
  readonly decidingAxis: AxiomKey;
  readonly utilonBand: UtilonBand;
}

/**
 * The largest perturbation any score may receive, in either direction.
 *
 * Deliberately tiny: a philosopher who is off by a twentieth of their own
 * confidence is still a philosopher with a view. Anything larger would let the
 * seed decide verdicts, which would defeat the point of a transparent engine.
 */
export const JITTER = 0.05;

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

/**
 * Convene a court.
 *
 * Rounds are fixed by contract — 1 = positions, 2 = objections, 3 = appeals. A
 * `rounds` below 1 is clamped to 1 and above 3 to 3, because a fourth round
 * would have no new procedure to run and would only invent variation.
 *
 * The ballot uses each advisor's *kingdom-weighted* vector (`weighAdvisor`), so
 * a Citadel Kant and an unaffiliated Kant are not the same witness. The
 * trace shows the same weights it scored with, so the arithmetic on screen is
 * the arithmetic that decided the case.
 */
export function runCouncil(input: CouncilInput): CouncilResult {
  const dilemma = input.dilemma;
  const advisors = input.advisors;
  const kingdoms = input.kingdoms ?? [];
  const seed = input.seed ?? 0;
  const rounds = clamp(Math.trunc(input.rounds ?? 3), 1, 3);

  const weights = new Map<string, AxiomVector>(
    advisors.map((advisor) => [
      advisor.id,
      weighAdvisor(advisor, kingdoms.find((k) => k.id === advisor.kingdomId)),
    ]),
  );
  const vectorOf = (advisor: Advisor): AxiomVector => weights.get(advisor.id) ?? advisor.axioms;

  const traces: TraceEntry[] = [];
  const positions: PositionRecord[] = [];
  const objections: ObjectionRecord[] = [];
  const appeals: AppealRecord[] = [];
  const ballotScores: BallotScore[] = [];

  /* ---- Round 1: positions ------------------------------------------- */
  for (const advisor of advisors) {
    const vector = vectorOf(advisor);
    const scored = dilemma.options.map((option) => {
      const raw = scoreOptionWith(vector, option);
      const jitter = jitterFor(seed, "r1", advisor.id, option.id);
      return { optionId: option.id, raw: round(raw, 4), score: round(raw + jitter, 4) };
    });
    for (const entry of scored) {
      ballotScores.push({ advisorId: advisor.id, optionId: entry.optionId, score: entry.score });
    }

    const ranking = [...scored].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.optionId.localeCompare(b.optionId);
    });
    const topOptionId = ranking[0]?.optionId ?? dilemma.options[0]?.id ?? "";
    const premiseMoves = premisesFor(advisor, dilemma);

    positions.push({
      advisorId: advisor.id,
      advisorName: advisor.name,
      kingdomId: advisor.kingdomId,
      topOptionId,
      ranking,
      premiseMoveIds: premiseMoves.map((m) => m.id),
      profile: describeProfile(vector),
      balance: balance(vector),
    });

    const topOption = dilemma.options.find((o) => o.id === topOptionId);
    const bestPremise = premiseMoves[0];
    if (bestPremise !== undefined && topOption !== undefined) {
      traces.push(
        traceEntry({
          advisor,
          vector,
          option: topOption,
          round: 1,
          kind: "premise",
          move: bestPremise,
          jitter: jitterFor(seed, "r1", advisor.id, topOptionId),
        }),
      );
    }
  }

  /* ---- Round 2: objections ------------------------------------------ */
  if (rounds >= 2) {
    for (const advisor of advisors) {
      const own = positions.find((p) => p.advisorId === advisor.id);
      if (own === undefined) continue;
      // The strongest rival is the best option that is not the advisor's own.
      const rival = own.ranking.find((r) => r.optionId !== own.topOptionId);
      if (rival === undefined) continue;

      const move = objectionFor(advisor, dilemma, rival.optionId);
      if (move === undefined) continue;
      const defendedOption = dilemma.options.find((o) => o.id === own.topOptionId);
      if (defendedOption === undefined) continue;

      // The objection *answers* whoever ranked that rival first: a deliberation
      // is a conversation, and an argument nobody replies to is not one.
      const adversary = positions
        .filter((p) => p.topOptionId === rival.optionId && p.advisorId !== advisor.id)
        .sort((a, b) => a.advisorId.localeCompare(b.advisorId))[0];

      const trace = traceEntry({
        advisor,
        vector: vectorOf(advisor),
        option: defendedOption,
        round: 2,
        kind: "objection",
        move,
        jitter: jitterFor(seed, "r2", advisor.id, rival.optionId),
      });
      objections.push({
        advisorId: advisor.id,
        advisorName: advisor.name,
        kingdomId: advisor.kingdomId,
        defendedOptionId: own.topOptionId,
        targetedOptionId: rival.optionId,
        adversaryId: adversary?.advisorId ?? "",
        adversaryName: adversary?.advisorName ?? "the advocates of that course",
        moveId: move.id,
        claim: move.claim,
        trace,
      });
      traces.push(trace);
    }
  }

  /* ---- Round 3: appeals --------------------------------------------- */
  if (rounds >= 3) {
    const provisional = decision({ scores: ballotScores, options: dilemma.options });
    // Conviction is weighted by how close the vote was: a court that was nearly
    // split hears the appeals, a court that was not does not need them.
    const leaderTotal = provisional.ranked[0]?.total ?? 1;
    const closeness = clamp(1 - safeRatio(provisional.margin, leaderTotal), 0, 1);
    const losers = new Set(provisional.ranked.slice(1).map((t) => t.optionId));

    for (const advisor of advisors) {
      const own = positions.find((p) => p.advisorId === advisor.id);
      if (own === undefined || !losers.has(own.topOptionId)) continue;
      const move = appealFor(advisor, dilemma);
      if (move === undefined) continue;
      const option = dilemma.options.find((o) => o.id === own.topOptionId);
      if (option === undefined) continue;

      const trace = traceEntry({
        advisor,
        vector: vectorOf(advisor),
        option,
        round: 3,
        kind: move.kind,
        move,
        jitter: jitterFor(seed, "r3", advisor.id, own.topOptionId),
      });
      appeals.push({
        advisorId: advisor.id,
        advisorName: advisor.name,
        kingdomId: advisor.kingdomId,
        optionId: own.topOptionId,
        kind: move.kind,
        moveId: move.id,
        claim: move.claim,
        conviction: round(clamp(closeness * move.weight, 0, 1), 4),
        trace,
      });
      traces.push(trace);
    }
  }

  /* ---- Decision ------------------------------------------------------ */
  const verdict = decision({ scores: ballotScores, options: dilemma.options });
  const stances: StanceAdvisor[] = stancesFrom(
    positions.map((p) => ({
      advisorId: p.advisorId,
      advisorName: p.advisorName,
      ...(p.kingdomId !== undefined ? { kingdomId: p.kingdomId } : {}),
      topOptionId: p.topOptionId,
    })),
  );
  const majority = superMajority(verdict.winnerId, stances);
  const dissent = minorityReport(ballotScores, verdict.winnerId, advisors);
  const settling = synthesis(advisors, verdict.winnerId, verdict.margin, ballotScores);

  // Which axis decided it: the winner-vs-runner-up gap weighted by the *court's*
  // blended view, so kingdom context shows up in the narrative too.
  const courtWeights = courtVector(weights);
  const winnerOption = dilemma.options.find((o) => o.id === verdict.winnerId);
  const runnerUpOption = dilemma.options.find((o) => o.id === verdict.runnerUpId);
  const deciding =
    winnerOption !== undefined && runnerUpOption !== undefined
      ? decidingAxis(courtWeights, winnerOption, runnerUpOption)
      : dominantAxiom(courtWeights);

  const band = utilonScale(
    winnerOption === undefined ? 0 : utilonTotal(dilemma, winnerOption),
  ).band;

  return {
    dilemmaId: dilemma.id,
    seed,
    rounds,
    quorum: clamp(Math.trunc(input.quorum ?? Math.ceil(advisors.length / 2)), 0, advisors.length),
    participating: advisors.length,
    positions,
    objections,
    appeals,
    ballots: weightedBallot(ballotScores, dilemma.options.map((o) => o.id)).tallies,
    winnerId: verdict.winnerId,
    margin: verdict.margin,
    confidence: verdict.confidence,
    superMajority: majority,
    dissent,
    synthesis: settling,
    traces,
    narrative: narrate({
      dilemma,
      advisors,
      positions,
      objections,
      appeals,
      verdict,
      majority,
      dissent,
      deciding,
      courtWeights,
      band,
      seed,
      rounds,
    }),
    decidingAxis: deciding,
    utilonBand: band,
  };
}

/* ------------------------------------------------------------------ *
 * Comparison across courts
 * ------------------------------------------------------------------ */

export interface CouncilComparisonEntry {
  readonly groupId: string;
  readonly groupName: string;
  readonly winnerId: string;
  readonly winnerLabel: string;
  readonly margin: number;
  readonly confidence: number;
  readonly satisfied: boolean;
  readonly dissentCount: number;
  readonly result: CouncilResult;
}

export interface CouncilComparison {
  readonly dilemmaId: string;
  readonly seed: number;
  readonly entries: readonly CouncilComparisonEntry[];
  /** How many distinct winners there are, and which options won. */
  readonly distinctWinners: number;
  readonly agreed: boolean;
  readonly summary: string;
}

/**
 * Sit the same dilemma before several separate courts (one per kingdom, or any
 * other grouping) and rank the verdicts.
 *
 * This powers "how would each kingdom rule?". The interesting output is not the
 * winner list but `agreed`: five kingdoms returning the same option for five
 * entirely different reasons is a very different object from five kingdoms
 * splitting, and the app renders both.
 */
export function compareCouncils(
  dilemma: Dilemma,
  advisorGroups: readonly { groupId: string; groupName: string; advisors: readonly Advisor[] }[],
  options: { seed?: number; kingdoms?: readonly Kingdom[]; rounds?: number } = {},
): CouncilComparison {
  const seed = options.seed ?? 0;
  const entries: CouncilComparisonEntry[] = advisorGroups
    .filter((group) => group.advisors.length > 0)
    .map((group) => {
      const result = runCouncil({
        dilemma,
        advisors: group.advisors,
        kingdoms: options.kingdoms ?? [],
        seed,
        ...(options.rounds !== undefined ? { rounds: options.rounds } : {}),
      });
      return {
        groupId: group.groupId,
        groupName: group.groupName,
        winnerId: result.winnerId,
        winnerLabel: dilemma.options.find((o) => o.id === result.winnerId)?.label ?? result.winnerId,
        margin: result.margin,
        confidence: result.confidence,
        satisfied: result.superMajority.satisfied,
        dissentCount: result.dissent.dissenters.length,
        result,
      };
    })
    .sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      if (b.margin !== a.margin) return b.margin - a.margin;
      return a.groupId.localeCompare(b.groupId);
    });

  const winners = [...new Set(entries.map((e) => e.winnerId))];
  const agreed = winners.length <= 1;
  const summary = agreed
    ? `All ${entries.length} courts returned "${entries[0]?.winnerLabel ?? "nothing"}".`
    : `${winners.length} distinct verdicts across ${entries.length} courts: ${winners.join(", ")}.`;

  return {
    dilemmaId: dilemma.id,
    seed,
    entries,
    distinctWinners: winners.length,
    agreed,
    summary,
  };
}

/* ------------------------------------------------------------------ *
 * Deterministic jitter
 * ------------------------------------------------------------------ */

/**
 * A signed perturbation in [-JITTER, +JITTER], derived from the seed and the ids
 * involved. Keying on ids means the same advisor/option pair jitters identically
 * even when the rest of the court changes — a stable court is a court you can
 * compare across sessions.
 */
function jitterFor(seed: number, tag: string, advisorId: string, optionId: string): number {
  const rng = createRng(seed, tag, advisorId, optionId);
  return round((rng.next() * 2 - 1) * JITTER, 4);
}

/* ------------------------------------------------------------------ *
 * Move selection
 * ------------------------------------------------------------------ */

/**
 * Moves apt for this dilemma: a move with no `appliesTo` is always available;
 * otherwise one of the dilemma's tags must match. Sorted by weight, then id.
 */
function matchingMoves(advisor: Advisor, dilemma: Dilemma): ArgumentMove[] {
  const tags = new Set(dilemma.tags);
  return advisor.moves
    .filter((m) => m.appliesTo.length === 0 || m.appliesTo.some((tag) => tags.has(tag)))
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.id.localeCompare(b.id);
    });
}

/** Round 1 premises: the advisor's best-matching non-attacking moves. */
function premisesFor(advisor: Advisor, dilemma: Dilemma): ArgumentMove[] {
  return matchingMoves(advisor, dilemma).filter((m) => m.kind === "premise");
}

/**
 * Round 2: the advisor's strongest applicable `objection`.
 *
 * A move tagged with the rival's own option id is aimed at that option
 * specifically; otherwise the top objection answers the strongest rival.
 */
function objectionFor(
  advisor: Advisor,
  dilemma: Dilemma,
  rivalOptionId: string,
): ArgumentMove | undefined {
  const matching = matchingMoves(advisor, dilemma).filter((m) => m.kind === "objection");
  return matching.find((m) => m.appliesTo.includes(rivalOptionId)) ?? matching[0];
}

/**
 * Round 3: an `appeal` or `synthesis` move — appeals first, because a losing
 * advisor asking for a re-hearing is more characteristic of a deliberation
 * than a synthesis, which is what you offer once you already hold the floor.
 */
function appealFor(advisor: Advisor, dilemma: Dilemma): ArgumentMove | undefined {
  return matchingMoves(advisor, dilemma)
    .filter((m) => m.kind === "appeal" || m.kind === "synthesis")
    .sort((a, b) => {
      const rank = (m: ArgumentMove): number => (m.kind === "appeal" ? 0 : 1);
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.id.localeCompare(b.id);
    })[0];
}

/* ------------------------------------------------------------------ *
 * Traces
 * ------------------------------------------------------------------ */

function traceEntry(args: {
  advisor: Advisor;
  vector: AxiomVector;
  option: DilemmaOption;
  round: 1 | 2 | 3;
  kind: MoveKind;
  move: ArgumentMove;
  jitter: number;
}): TraceEntry {
  // `round` is aliased: destructuring `args.round` would shadow the `round()`
  // helper used on the two lines below.
  const { advisor, vector, option, kind, move, jitter, round: stage } = args;
  const contributions = axiomContributions(vector, option.deltas).map((c) => ({
    axiom: c.axiom,
    weight: c.weight,
    delta: c.delta,
    product: c.product,
  }));
  const subtotal = round(sum(contributions.map((c) => c.product)), 4);

  return {
    advisorId: advisor.id,
    advisorName: advisor.name,
    kingdomId: advisor.kingdomId,
    round: stage,
    kind,
    optionId: option.id,
    premise: move.support,
    claim: move.claim,
    moveId: move.id,
    leansOn: move.leansOn,
    contributions,
    subtotal,
    jitter,
    total: round(subtotal + jitter, 4),
  };
}

/* ------------------------------------------------------------------ *
 * Narrative
 * ------------------------------------------------------------------ */

/**
 * Between four and eight prose lines describing the sitting.
 *
 * Every line is derived from a number the engine computed. There is no random
 * prose and no sentence that could not be reconstructed from the result object,
 * which is what lets the app show prose and arithmetic side by side without the
 * two ever disagreeing.
 *
 * The line budget is respected by *merging*, not by truncating: the appeals line
 * is folded into the objection line when both would fire, so nothing the engine
 * computed is ever silently dropped on the floor.
 */
function narrate(ctx: {
  dilemma: Dilemma;
  advisors: readonly Advisor[];
  positions: readonly PositionRecord[];
  objections: readonly ObjectionRecord[];
  appeals: readonly AppealRecord[];
  verdict: ReturnType<typeof decision>;
  majority: SuperMajority;
  dissent: MinorityReport;
  deciding: AxiomKey;
  courtWeights: AxiomVector;
  band: UtilonBand;
  seed: number;
  rounds: number;
}): string[] {
  const { dilemma, positions, objections, appeals, verdict, majority, dissent, deciding, courtWeights } = ctx;
  const lines: string[] = [];
  const winner = dilemma.options.find((o) => o.id === verdict.winnerId);
  const runnerUp = dilemma.options.find((o) => o.id === verdict.runnerUpId);

  lines.push(
    `The court of ${positions.length} sat on "${dilemma.title}" for ${ctx.rounds} round${ctx.rounds === 1 ? "" : "s"}, seed ${ctx.seed}.`,
  );

  if (winner !== undefined) {
    lines.push(
      `They returned "${winner.label}" at ${round(verdict.confidence * 100, 0)}% confidence, by a margin of ${round(verdict.margin, 4)}${runnerUp !== undefined ? ` over "${runnerUp.label}"` : ""}.`,
    );
  } else {
    lines.push("No option could be returned: the court scored nothing at all.");
  }

  // Names are listed in advisor-id order rather than seating order, so the prose
  // is identical no matter who was seated where.
  const backing = positions
    .filter((p) => p.topOptionId === verdict.winnerId)
    .sort((a, b) => a.advisorId.localeCompare(b.advisorId));
  if (backing.length > 0) {
    const share = positions.length === 0 ? 0 : round((backing.length / positions.length) * 100, 0);
    lines.push(
      `${backing.map((p) => p.advisorName).join(", ")} carried it — ${backing.length} of ${positions.length}, ${share}% of the bench.`,
    );
  }

  lines.push(
    `The axis that decided the sitting was ${deciding}, at ${round(courtWeights[deciding], 2)} court weight; the next two were ${rankAxes(courtWeights).slice(1, 3).join(" and ")}.`,
  );

  // Objections and appeals share one line: a court that both objected and
  // appealed is telling you the same thing twice, and the budget is eight.
  const rounds2: string[] = [];
  if (objections.length > 0) {
    const targets = [...new Set(objections.map((o) => o.targetedOptionId))].sort();
    rounds2.push(
      `${objections.length} objection${objections.length === 1 ? " was" : "s were"} lodged against ${targets.join(", ")}`,
    );
  } else {
    rounds2.push("No objection was lodged; every advisor found a course they could defend without one");
  }
  if (appeals.length > 0) {
    rounds2.push(
      `${appeals.length} appeal${appeals.length === 1 ? "" : "s"} followed in the third round`,
    );
  }
  lines.push(`${rounds2.join("; ")}.`);

  if (majority.satisfied) {
    lines.push(
      `The verdict clears the super-majority: ${majority.yes} for, ${majority.no} against, ${majority.abstainers} abstaining.`,
    );
  } else {
    lines.push(
      `The verdict does not clear a super-majority: ${majority.yes} for, ${majority.no} against, ${majority.abstainers} abstaining, and ${majority.required} were needed.`,
    );
  }

  const dissenterIds = [...dissent.dissenters]
    .sort((a, b) => a.advisorId.localeCompare(b.advisorId))
    .map((d) => d.advisorName);
  if (dissenterIds.length > 0) {
    lines.push(
      `${dissenterIds.join(", ")} sat elsewhere; the sharpest objection was "${dissent.strongest?.claim ?? "unrecorded"}".`,
    );
  } else {
    lines.push("No advisor preferred a different course, so the bench was unanimous on first reading.");
  }

  lines.push(
    `On the utilon scale the outcome is ${ctx.band}; the court sits at ${describeProfile(courtWeights)} with a balance of ${round(balance(courtWeights), 2)}.`,
  );

  return lines;
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const ZERO_VECTOR: AxiomVector = {
  welfare: 0,
  rights: 0,
  virtue: 0,
  care: 0,
  justice: 0,
  agency: 0,
};

/** The court's blended view: the mean of every advisor's weighed vector. */
export function courtVector(weights: ReadonlyMap<string, AxiomVector>): AxiomVector {
  const vectors = [...weights.values()];
  if (vectors.length === 0) return { ...ZERO_VECTOR };
  const out: Record<AxiomKey, number> = {} as Record<AxiomKey, number>;
  for (const key of AXIOM_KEYS) {
    out[key] = round(sum(vectors.map((v) => v[key])) / vectors.length, 4);
  }
  return out as AxiomVector;
}

/** Utilon total for an option — the same number `aggregate()` reports. */
function utilonTotal(dilemma: Dilemma, option: DilemmaOption): number {
  const parties = dilemma.stakeholders;
  if (parties.length === 0) return 0;
  const weightSum = sum(parties.map((s) => s.welfare));
  if (weightSum === 0) return 0;
  const perAxis = AXIOM_KEYS.map(
    (key) => sum(parties.map((s) => s.welfare * option.deltas[key])) / weightSum,
  );
  return round(sum(perAxis) / AXIOM_KEYS.length, 4);
}

/** How far the most distant advisor sits from the court's blended position. */
export function courtSpread(
  advisors: readonly Advisor[],
  weights: ReadonlyMap<string, AxiomVector>,
): number {
  if (advisors.length === 0) return 0;
  const court = courtVector(weights);
  return round(
    maxOf(advisors.map((advisor) => distance(vectorOfAdvisor(advisor), court))),
    4,
  );
}

function vectorOfAdvisor(advisor: Advisor): AxiomVector {
  return advisor.axioms;
}

function safeRatio(n: number, d: number): number {
  return d === 0 ? 0 : n / d;
}