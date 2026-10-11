/**
 * Turning scored opinions into a verdict.
 *
 * WHY this is separate from the deliberation loop: the court's *procedure* is
 * the thing that must be auditable. Who voted, who won, by how much, on what
 * tie-break, and who said nothing at all — each of those is a question with a
 * checkable answer, and each has a different honest answer. Lumping them into
 * the deliberation loop would make the verdict unauditable.
 */
import type { Advisor, ArgumentMove, AxiomKey, DilemmaOption, MoveKind } from "../../../seed/src/types";
import { AXIOM_KEYS } from "../../../seed/src/types";
import { clamp, mean, round, safeDiv, sum } from "../util/math";

/* ------------------------------------------------------------------ *
 * Ballots
 * ------------------------------------------------------------------ */

export interface BallotScore {
  readonly advisorId: string;
  readonly optionId: string;
  /** Conviction in [0, 1]. Higher means more certain, not more agreeable. */
  readonly score: number;
}

export interface BallotTally {
  readonly optionId: string;
  /** Sum of every advisor's score for this option. */
  readonly total: number;
  /** `total` as a share of all scores cast, in [0, 1]. */
  readonly share: number;
  /** Mean score per advisor who scored this option. */
  readonly mean: number;
  /** How many advisors scored this option at all. */
  readonly votes: number;
  /** Advisor ids backing it, sorted for stable rendering. */
  readonly supporters: readonly string[];
}

export interface Ballot {
  readonly tallies: readonly BallotTally[];
  /** Every score cast, summed. 0 when nobody scored anything. */
  readonly total: number;
}

/**
 * Tally scores into per-option totals and shares.
 *
 * Options nobody scored are kept, with a zero tally — the council has to be able
 * to say "this option was available and no one wanted it", which is a fact and
 * not a silence.
 */
export function weightedBallot(
  scores: readonly BallotScore[],
  optionIds: readonly string[] = [],
): Ballot {
  const ids = [...new Set([...optionIds, ...scores.map((s) => s.optionId)])].sort();

  const tallies: BallotTally[] = ids.map((optionId) => {
    const cast = scores.filter((s) => s.optionId === optionId);
    const total = round(sum(cast.map((s) => s.score)), 4);
    return {
      optionId,
      total,
      share: 0,
      mean: round(cast.length === 0 ? 0 : mean(cast.map((s) => s.score)), 4),
      votes: cast.length,
      supporters: cast.map((s) => s.advisorId).sort(),
    };
  });

  const total = round(sum(tallies.map((t) => t.total)), 4);
  const withShares = tallies
    .map((t) => ({ ...t, share: round(safeDiv(t.total, total), 4) }))
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.optionId.localeCompare(b.optionId);
    });

  return { tallies: withShares, total };
}

/* ------------------------------------------------------------------ *
 * Decision
 * ------------------------------------------------------------------ */

export interface DecisionInput {
  readonly scores: readonly BallotScore[];
  readonly options: readonly DilemmaOption[];
}

export interface Decision {
  readonly winnerId: string;
  readonly winner: DilemmaOption | null;
  /** Winner's total minus the runner-up's total. 0 in a dead heat. */
  readonly margin: number;
  /** Winner total as a fraction of the runner-up's, [0, 1]-ish; 1 when tied. */
  readonly ratio: number;
  /** Blended margin + turnout, in [0, 1]. See `confidenceFrom`. */
  readonly confidence: number;
  /** Share of advisors whose own top option was the winner, in [0, 1]. */
  readonly participation: number;
  readonly runnerUpId: string | null;
  readonly ranked: readonly BallotTally[];
  /** True when the winner was decided by a tie-break rather than by the totals. */
  readonly tieBroken: boolean;
  /** Human-readable account of why the winner won. */
  readonly rationale: string;
}

/**
 * **Confidence** blends how decisive the numbers were with how many advisors
 * actually backed the winner. A 60/40 split that every advisor agrees on is a
 * firmer verdict than the same split produced by two camps — and a unanimous
 * court that barely scored anything is not a firm verdict at all.
 */
export function confidenceFrom(relativeMargin: number, participation: number): number {
  return round(clamp(0.6 * clamp(relativeMargin, 0, 1) + 0.4 * clamp(participation, 0, 1), 0, 1), 4);
}

/**
 * Decide.
 *
 * **Tie-break policy, in order** (each step fully determines the next, so the
 * result is a pure function of its inputs):
 *   1. highest ballot total;
 *   2. highest mean score per advisor — a unanimous preference beats a split one
 *      carrying the same total;
 *   3. lowest `risk` — the court does not hand a tied victory to the more
 *      dangerous course;
 *   4. lexicographically smallest `id` — a total tie-break, so that two councils
 *      with identical numbers always produce identical output.
 */
export function decision(input: DecisionInput): Decision {
  const { scores, options } = input;
  const ballot = weightedBallot(scores, options.map((o) => o.id));

  if (ballot.tallies.length === 0) {
    return {
      winnerId: "",
      winner: null,
      margin: 0,
      ratio: 1,
      confidence: 0,
      participation: 0,
      runnerUpId: null,
      ranked: [],
      tieBroken: false,
      rationale: "No options were put to the court, so there is no verdict to record.",
    };
  }

  const byId = new Map(options.map((o) => [o.id, o]));
  const ranked = [...ballot.tallies].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.mean !== a.mean) return b.mean - a.mean;
    const ra = byId.get(a.optionId)?.risk ?? 0;
    const rb = byId.get(b.optionId)?.risk ?? 0;
    if (ra !== rb) return ra - rb;
    return a.optionId.localeCompare(b.optionId);
  });

  const first = ranked[0];
  const second = ranked[1];
  if (first === undefined) {
    return {
      winnerId: "",
      winner: null,
      margin: 0,
      ratio: 1,
      confidence: 0,
      participation: 0,
      runnerUpId: null,
      ranked: [],
      tieBroken: false,
      rationale: "No options were put to the court, so there is no verdict to record.",
    };
  }

  const margin = round((first?.total ?? 0) - (second?.total ?? 0), 4);
  const tiedOnTotal = second !== undefined && (first?.total ?? 0) === (second?.total ?? 0);
  const relativeMargin = round(clamp(safeDiv(margin, Math.max(first?.total ?? 0, 1e-9)), 0, 1), 4);

  // Participation: the share of advisors whose personal top option was the winner.
  const tops = new Map<string, string>();
  for (const advisorId of [...new Set(scores.map((s) => s.advisorId))]) {
    const own = scores.filter((s) => s.advisorId === advisorId);
    let bestId = "";
    let bestScore = -Infinity;
    for (const s of own) {
      if (s.score > bestScore) {
        bestScore = s.score;
        bestId = s.optionId;
      }
    }
    tops.set(advisorId, bestId);
  }
  const backing = [...tops.values()].filter((id) => id === first.optionId).length;
  const participation = round(safeDiv(backing, tops.size), 4);

  const winner = byId.get(first.optionId) ?? null;
  const runnerUp = second?.optionId ?? null;
  const confidence = confidenceFrom(relativeMargin, participation);

  const rationaleParts = [
    `${winner?.label ?? first.optionId} carried ${round(first.share * 100, 1)}% of the court's conviction`,
  ];
  if (second !== undefined) {
    rationaleParts.push(
      `a margin of ${round(margin, 4)} over ${byId.get(second.optionId)?.label ?? second.optionId}`,
    );
  }
  if (tiedOnTotal) rationaleParts.push("the totals were level and the tie-break decided it");
  rationaleParts.push(`${backing} of ${tops.size} advisors put it first`);

  return {
    winnerId: first.optionId,
    winner,
    margin,
    ratio: round(safeDiv(first.total, Math.max(second?.total ?? 0, 1e-9)), 4),
    confidence,
    participation,
    runnerUpId: runnerUp,
    ranked,
    tieBroken: tiedOnTotal,
    rationale: `${rationaleParts.join(", ")}.`,
  };
}

/* ------------------------------------------------------------------ *
 * Super-majority
 * ------------------------------------------------------------------ */

export type Stance = "for" | "against" | "abstain";

export interface StanceAdvisor {
  readonly advisorId: string;
  readonly advisorName: string;
  readonly kingdomId?: string;
  /** The advisor's own first-ranked option, or `null` when they did not vote. */
  readonly topOptionId: string | null;
  /**
   * Explicit override. The derived policy puts every advisor whose top option
   * differs into `abstain`, so `against` is only ever recorded when a caller
   * deliberately pins a negative vote (the app's "cast against" control).
   */
  readonly stance?: Stance;
}

export interface SuperMajority {
  readonly optionId: string;
  readonly satisfied: boolean;
  readonly threshold: number;
  readonly yes: number;
  readonly no: number;
  readonly abstainers: number;
  /** yes / (yes + no). 0 when nobody voted for or against. */
  readonly ratio: number;
  /** yes / total advisors, in [0, 1]. */
  readonly support: number;
  /** The raw count of yes votes the threshold demands. */
  readonly required: number;
}

/**
 * Did the court actually agree?
 *
 * **Policy.** An advisor whose own top option differs from the one on the table
 * abstains: they were asked about a course they had already ranked below
 * another, and counting them as opposition would manufacture a conflict the
 * deliberation did not produce. Abstentions therefore do not enter the ratio
 * (the standard parliamentary convention) but *do* count against a raw floor,
 * so a court of ten with three silent members cannot clear a two-thirds bar on
 * seven votes alone.
 *
 * `satisfied` requires both `ratio >= threshold` and `yes >= required`, where
 * `required = ceil(threshold * advisors)`.
 */
export function superMajority(
  optionId: string,
  advisors: readonly StanceAdvisor[],
  threshold = 2 / 3,
): SuperMajority {
  let yes = 0;
  let no = 0;
  let abstainers = 0;
  for (const advisor of advisors) {
    const stance = advisor.stance ?? (advisor.topOptionId === null ? "abstain" : advisor.topOptionId === optionId ? "for" : "abstain");
    if (stance === "for") yes += 1;
    else if (stance === "against") no += 1;
    else abstainers += 1;
  }

  const ratio = round(safeDiv(yes, yes + no), 4);
  const support = round(safeDiv(yes, advisors.length), 4);
  const required = Math.ceil(threshold * advisors.length);
  return {
    optionId,
    satisfied: yes > 0 && ratio >= threshold && yes >= required,
    threshold: round(threshold, 4),
    yes,
    no,
    abstainers,
    ratio,
    support,
    required,
  };
}

/** Build the stances the deliberation engine knows, from its recorded positions. */
export function stancesFrom(
  positions: readonly { advisorId: string; advisorName: string; kingdomId?: string; topOptionId: string }[],
): StanceAdvisor[] {
  return positions.map((p) => ({
    advisorId: p.advisorId,
    advisorName: p.advisorName,
    ...(p.kingdomId !== undefined ? { kingdomId: p.kingdomId } : {}),
    topOptionId: p.topOptionId,
  }));
}

/* ------------------------------------------------------------------ *
 * Dissent
 * ------------------------------------------------------------------ */

export interface DissentEntry {
  readonly advisorId: string;
  readonly advisorName: string;
  readonly kingdomId?: string;
  readonly preferredOptionId: string;
  readonly gapToWinner: number;
}

export interface MinorityReport {
  readonly winnerId: string;
  readonly dissenters: readonly DissentEntry[];
  /** The single strongest argument against the winner, if anyone made one. */
  readonly strongest: {
    readonly advisorId: string;
    readonly advisorName: string;
    readonly moveId: string;
    readonly claim: string;
    readonly support: string;
    readonly weight: number;
    readonly leansOn: readonly AxiomKey[];
  } | null;
  readonly summary: string;
}

/**
 * The minority report: who dissented, and what their best argument was.
 *
 * "Strongest" is the highest-weighted move an objecting advisor made, with ties
 * broken on advisor id then move id — so the same sitting always surfaces the
 * same objection, never whichever one happened to be enumerated last.
 */
export function minorityReport(
  scores: readonly BallotScore[],
  winnerId: string,
  advisors: readonly Advisor[],
): MinorityReport {
  const tops = new Map<string, { top: string; score: number }>();
  for (const advisor of advisors) {
    const own = scores.filter((s) => s.advisorId === advisor.id);
    if (own.length === 0) continue;
    let top = "";
    let best = -Infinity;
    for (const s of own) {
      if (s.score > best) {
        best = s.score;
        top = s.optionId;
      }
    }
    tops.set(advisor.id, { top, score: best });
  }

  const winnerScores = scores.filter((s) => s.optionId === winnerId);
  const winnerMean = winnerScores.length === 0 ? 0 : mean(winnerScores.map((s) => s.score));

  const dissenters: DissentEntry[] = advisors
    .filter((a) => {
      const own = tops.get(a.id);
      return own !== undefined && own.top !== winnerId;
    })
    .map((a) => {
      const own = tops.get(a.id);
      return {
        advisorId: a.id,
        advisorName: a.name,
        ...(a.kingdomId !== undefined ? { kingdomId: a.kingdomId } : {}),
        preferredOptionId: own?.top ?? "",
        gapToWinner: round(Math.max(0, (own?.score ?? 0) - winnerMean), 4),
      };
    })
    .sort((x, y) => {
      if (y.gapToWinner !== x.gapToWinner) return y.gapToWinner - x.gapToWinner;
      return x.advisorId.localeCompare(y.advisorId);
    });

  const dissentIds = new Set(dissenters.map((d) => d.advisorId));
  const candidates: { advisor: Advisor; m: ArgumentMove }[] = [];
  for (const advisor of advisors) {
    if (!dissentIds.has(advisor.id)) continue;
    for (const m of advisor.moves) {
      if (m.kind === "objection" || m.kind === "appeal") candidates.push({ advisor, m });
    }
  }
  candidates.sort((x, y) => {
    if (y.m.weight !== x.m.weight) return y.m.weight - x.m.weight;
    if (x.advisor.id !== y.advisor.id) return x.advisor.id.localeCompare(y.advisor.id);
    return x.m.id.localeCompare(y.m.id);
  });
  const best = candidates[0];

  const strongest =
    best === undefined
      ? null
      : {
          advisorId: best.advisor.id,
          advisorName: best.advisor.name,
          moveId: best.m.id,
          claim: best.m.claim,
          support: best.m.support,
          weight: round(best.m.weight, 4),
          leansOn: best.m.leansOn,
        };

  const summary =
    dissenters.length === 0
      ? "No advisor preferred a different course."
      : `${dissenters.length} advisor${dissenters.length === 1 ? "" : "s"} preferred another course; ${
          strongest?.advisorName ?? "the minority"
        } put it best as "${strongest?.claim ?? "no recorded objection"}".`;

  return { winnerId, dissenters, strongest, summary };
}

/* ------------------------------------------------------------------ *
 * Synthesis
 * ------------------------------------------------------------------ */

export interface SynthesisMove extends ArgumentMove {
  readonly kind: MoveKind;
  readonly sourceAdvisorId: string;
  readonly sourceMoveId: string;
  readonly sourceAdvisorName: string;
  readonly close: boolean;
}

/**
 * The court's settling statement, drawn from the advisors' own `moves` arrays.
 *
 * **Rule.** A margin *below* `CLOSE_MARGIN` means the court was split, so the
 * synthesis is drawn from the *dissenting* advisors' `appeal` or `synthesis`
 * moves — the bridge that actually had to be built. At or above that margin the
 * court was decisive and the synthesis is drawn from the winning side's
 * `premise` moves, which is what a settled court says. Within the eligible pool
 * the highest `weight` wins, ties broken on advisor id then move id.
 */
export const CLOSE_MARGIN = 0.25;

export function synthesis(
  advisors: readonly Advisor[],
  winnerId: string,
  margin: number,
  scores: readonly BallotScore[] = [],
): SynthesisMove | null {
  const close = margin < CLOSE_MARGIN;
  const tops = new Map<string, string>();
  for (const advisor of advisors) {
    const own = scores.filter((s) => s.advisorId === advisor.id);
    let top = "";
    let best = (0 - Infinity);
    for (const s of own) {
      if (s.score > best) {
        best = s.score;
        top = s.optionId;
      }
    }
    if (top !== "") tops.set(advisor.id, top);
  }

  const pool: { advisor: Advisor; m: ArgumentMove }[] = [];
  for (const advisor of advisors) {
    const backed = close ? tops.get(advisor.id) !== winnerId : tops.get(advisor.id) === winnerId;
    if (!backed) continue;
    const kinds = close ? ["appeal", "synthesis"] : ["premise", "synthesis"];
    for (const m of advisor.moves) {
      if (kinds.includes(m.kind)) pool.push({ advisor, m });
    }
  }
  if (pool.length === 0 && close) {
    // No dissenting advisor offered a bridge move; fall back to the whole court
    // so the council always records *something* it can render.
    for (const advisor of advisors) {
      for (const m of advisor.moves) {
        if (m.kind === "appeal" || m.kind === "synthesis") {
          pool.push({ advisor, m });
        }
      }
    }
  }

  pool.sort((x, y) => {
    if (y.m.weight !== x.m.weight) return y.m.weight - x.m.weight;
    if (x.advisor.id !== y.advisor.id) return x.advisor.id.localeCompare(y.advisor.id);
    return x.m.id.localeCompare(y.m.id);
  });
  const best = pool[0];
  if (best === undefined) return null;

  return {
    id: `synthesis.${best.advisor.id}.${best.m.id}`,
    kind: "synthesis",
    claim: best.m.claim,
    support: best.m.support,
    weight: round(best.m.weight, 4),
    leansOn: best.m.leansOn,
    appliesTo: [...best.m.appliesTo],
    sourceAdvisorId: best.advisor.id,
    sourceMoveId: best.m.id,
    sourceAdvisorName: best.advisor.name,
    close,
  };
}

/** The axes a set of advisors collectively leaned on, strongest first. */
export function collectiveAxes(advisors: readonly Advisor[]): AxiomKey[] {
  const totals = AXIOM_KEYS.map((axiom) => ({
    axiom,
    weight: safeDiv(sum(advisors.map((a) => a.axioms[axiom])), advisors.length),
  }));
  return totals
    .sort((x, y) => (y.weight !== x.weight ? y.weight - x.weight : AXIOM_KEYS.indexOf(x.axiom) - AXIOM_KEYS.indexOf(y.axiom)))
    .map((t) => t.axiom);
}
