/**
 * The MCP tool payloads, as pure functions.
 *
 * Every builder here is deterministic and offline: it reads the seed corpus,
 * calls `@repo/core`, and returns a lean, snake_case document shaped for an
 * agent's context window — not the full engine dump. The complete `CouncilResult`
 * (traces, objections, appeals) stays available through the CLI's `--json` and
 * the HTTP API; an MCP caller gets the verdict, the arithmetic that decided it,
 * and who dissented, without a hundred kilobytes of narrative.
 *
 * The schemas below are the source of truth twice over: `server.ts` hands them
 * to `registerTool` as output schemas, and the builders return exactly the
 * inferred types, so a payload can never drift from its declared shape.
 */
import { z } from "zod";
import { ADVISORS, DILEMMAS, KINGDOMS, getAdvisor, getDilemma, getKingdom } from "@repo/seed";
import type { Advisor, Dilemma } from "@repo/seed";
import {
  RESILIENCE_SWEEP,
  analyseInfluence,
  analyseResilience,
  buildGraph,
  compareCouncils,
  runCouncil,
  toMermaid,
} from "@repo/core";

/** A mistake the caller can fix, reported to the agent with instructions. */
export class ToolError extends Error {}

/** The bench a tool seats when `advisor_ids` is omitted: the first eight voices. */
export const DEFAULT_BENCH = 8;

/* ------------------------------------------------------------------ *
 * Shared shapes
 * ------------------------------------------------------------------ */

const caseRefSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
});

const advisorRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  kingdom_id: z.string(),
  kingdom: z.string(),
});

export const kingdomRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  motto: z.string(),
  founder: z.string(),
  founded: z.number().int(),
  advisors: z.number().int(),
});

export const kingdomsPayloadSchema = z.object({
  count: z.number().int(),
  kingdoms: z.array(kingdomRowSchema),
});
export type KingdomsPayload = z.infer<typeof kingdomsPayloadSchema>;

export const advisorRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  epithet: z.string(),
  kingdom_id: z.string(),
  kingdom: z.string(),
  born: z.number().int(),
  died: z.number().int().nullable(),
  signature_move: z.string(),
  moves: z.number().int(),
});

export const advisorsPayloadSchema = z.object({
  count: z.number().int(),
  /** The filter that produced this list, or null for the whole court. */
  kingdom: z.string().nullable(),
  advisors: z.array(advisorRowSchema),
});
export type AdvisorsPayload = z.infer<typeof advisorsPayloadSchema>;

export const dilemmaRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  severity: z.number(),
  ai_relevance: z.number(),
  options: z.number().int(),
  tags: z.array(z.string()),
});

export const dilemmasPayloadSchema = z.object({
  count: z.number().int(),
  dilemmas: z.array(dilemmaRowSchema),
});
export type DilemmasPayload = z.infer<typeof dilemmasPayloadSchema>;

export const dilemmaDetailSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  prompt: z.string(),
  setting: z.string(),
  kingdom_origin: z.string(),
  kingdom_origin_name: z.string(),
  era_id: z.string(),
  tags: z.array(z.string()),
  severity: z.number(),
  ai_relevance: z.number(),
  lesson: z.string(),
  options: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      description: z.string(),
      /** Kernel scores per moral axis ("welfare", "rights", ... ), each in [0, 1]. */
      deltas: z.record(z.string(), z.number()),
      harms: z.array(z.string()),
      benefits: z.array(z.string()),
      risk: z.number(),
      reversibility: z.number(),
      agent_harm: z.number(),
    }),
  ),
  stakeholders: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      welfare: z.number(),
      is_ai: z.boolean(),
    }),
  ),
  references: z.array(
    z.object({
      title: z.string(),
      author: z.string(),
      year: z.number().int(),
    }),
  ),
});
export type DilemmaDetail = z.infer<typeof dilemmaDetailSchema>;

/* ------------------------------------------------------------------ *
 * The verdict payloads
 * ------------------------------------------------------------------ */

const ballotRowSchema = z.object({
  option_id: z.string(),
  label: z.string(),
  total: z.number(),
  share: z.number(),
  votes: z.number().int(),
});

const positionRowSchema = z.object({
  advisor_id: z.string(),
  advisor: z.string(),
  top_option_id: z.string(),
  top_option_label: z.string(),
  profile: z.string(),
  balance: z.number(),
});

const dissentSchema = z.object({
  count: z.number().int(),
  summary: z.string(),
  entries: z.array(
    z.object({
      advisor_id: z.string(),
      advisor: z.string(),
      preferred_option_id: z.string(),
      preferred_option: z.string(),
      gap: z.number(),
    }),
  ),
  strongest: z
    .object({
      advisor: z.string(),
      claim: z.string(),
      weight: z.number(),
      leans_on: z.array(z.string()),
    })
    .nullable(),
});

export const convenePayloadSchema = z.object({
  case: caseRefSchema,
  seed: z.number().int(),
  rounds: z.number().int(),
  quorum: z.number().int(),
  participating: z.number().int(),
  advisors: z.array(advisorRefSchema),
  verdict: z.object({
    winner_id: z.string(),
    winner_label: z.string(),
    margin: z.number(),
    confidence: z.number(),
    deciding_axis: z.string(),
    super_majority: z.boolean(),
  }),
  ballots: z.array(ballotRowSchema),
  positions: z.array(positionRowSchema),
  dissent: dissentSchema,
  /** The first five lines of the court's own account. */
  narrative: z.array(z.string()),
  /** Mermaid source of the argument graph, when `include_mermaid` is set. */
  mermaid: z.string().optional(),
});
export type ConvenePayload = z.infer<typeof convenePayloadSchema>;

export const comparePayloadSchema = z.object({
  case: caseRefSchema,
  seed: z.number().int(),
  distinct_winners: z.number().int(),
  agreed: z.boolean(),
  summary: z.string(),
  courts: z.array(
    z.object({
      kingdom_id: z.string(),
      kingdom: z.string(),
      winner_id: z.string(),
      winner_label: z.string(),
      margin: z.number(),
      confidence: z.number(),
      super_majority: z.boolean(),
      dissent_count: z.number().int(),
    }),
  ),
});
export type ComparePayload = z.infer<typeof comparePayloadSchema>;

export const stressPayloadSchema = z.object({
  case: caseRefSchema,
  seed: z.number().int(),
  count: z.number().int(),
  bench: z.array(advisorRefSchema),
  stability: z.object({
    modal_winner_id: z.string(),
    modal_winner_label: z.string(),
    share: z.number(),
    verdict: z.enum(["settled", "contested", "fragile"]),
    distinct_winners: z.number().int(),
    flips: z.number().int(),
    longest_streak: z.number().int(),
    close_seeds: z.number().int(),
    margin: z.object({ min: z.number(), mean: z.number(), max: z.number() }),
    confidence_mean: z.number(),
    /** Axes that decided at least one seed, most frequent first. */
    axes: z.array(z.object({ axiom: z.string(), count: z.number().int() })),
  }),
  influence: z.object({
    verdict: z.enum(["robust", "hinged", "precarious", "untested"]),
    base_winner_id: z.string(),
    base_winner_label: z.string(),
    pivotal_ids: z.array(z.string()),
    entries: z.array(
      z.object({
        advisor_id: z.string(),
        advisor: z.string(),
        kingdom: z.string(),
        winner_without_id: z.string(),
        winner_without_label: z.string(),
        pivotal: z.boolean(),
        margin_delta: z.number(),
      }),
    ),
  }),
});
export type StressPayload = z.infer<typeof stressPayloadSchema>;

/* ------------------------------------------------------------------ *
 * Builders
 * ------------------------------------------------------------------ */

function kingdomNameOf(advisor: Advisor): string {
  return KINGDOMS.find((kingdom) => kingdom.id === advisor.kingdomId)?.name ?? advisor.kingdomId;
}

function knight(advisor: Advisor) {
  return {
    id: advisor.id,
    name: advisor.name,
    kingdom_id: advisor.kingdomId,
    kingdom: kingdomNameOf(advisor),
  };
}

function labelOf(dilemma: Dilemma, optionId: string): string {
  return dilemma.options.find((option) => option.id === optionId)?.label ?? optionId;
}

function caseOf(dilemma: Dilemma) {
  return { id: dilemma.id, slug: dilemma.slug, title: dilemma.title };
}

function resolveBench(advisorIds: readonly string[] | undefined): {
  advisors: Advisor[];
  unknown: string[];
} {
  if (advisorIds === undefined || advisorIds.length === 0) {
    return { advisors: ADVISORS.slice(0, DEFAULT_BENCH), unknown: [] };
  }
  const advisors: Advisor[] = [];
  const unknown: string[] = [];
  for (const id of advisorIds) {
    const advisor = getAdvisor(id);
    if (advisor === undefined) {
      unknown.push(id);
      continue;
    }
    if (!advisors.some((seated) => seated.id === advisor.id)) advisors.push(advisor);
  }
  return { advisors, unknown };
}

/**
 * Resolve a case and seat its court, or explain exactly how to fix the call.
 * The error text names the tool that lists the valid ids — an agent that
 * guessed wrong can correct itself without human help.
 */
function courtFor(
  dilemmaId: string,
  advisorIds: readonly string[] | undefined,
): { dilemma: Dilemma; advisors: Advisor[]; kingdoms: ReturnType<typeof kingdomsOf> } {
  const dilemma = getDilemma(dilemmaId);
  if (dilemma === undefined) {
    throw new ToolError(
      `unknown case "${dilemmaId}" — call nooreign_list_dilemmas to see the ${DILEMMAS.length} cases; they answer to ids like "d01" and slugs like "${DILEMMAS[0]?.slug ?? "trolley-of-five-million"}"`,
    );
  }
  const { advisors, unknown } = resolveBench(advisorIds);
  if (unknown.length > 0) {
    throw new ToolError(
      `unknown advisor(s): ${unknown.join(", ")} — call nooreign_list_advisors to see the ${ADVISORS.length} voices; they answer to ids and slugs`,
    );
  }
  if (advisors.length === 0) {
    throw new ToolError("the bench is empty — seat at least one advisor, or omit advisor_ids for the default bench");
  }
  return { dilemma, advisors, kingdoms: kingdomsOf(advisors) };
}

function kingdomsOf(advisors: readonly Advisor[]) {
  return KINGDOMS.filter((kingdom) => advisors.some((advisor) => advisor.kingdomId === kingdom.id));
}

export function buildKingdoms(): KingdomsPayload {
  const kingdoms = KINGDOMS.map((kingdom) => ({
    id: kingdom.id,
    slug: kingdom.slug,
    name: kingdom.name,
    motto: kingdom.motto,
    founder: kingdom.founder,
    founded: kingdom.founded,
    advisors: ADVISORS.filter((advisor) => advisor.kingdomId === kingdom.id).length,
  }));
  return { count: kingdoms.length, kingdoms };
}

export function buildAdvisors(kingdomIdOrSlug: string | undefined): AdvisorsPayload {
  let pool: readonly Advisor[] = ADVISORS;
  let kingdomName: string | null = null;
  if (kingdomIdOrSlug !== undefined) {
    const kingdom = getKingdom(kingdomIdOrSlug);
    if (kingdom === undefined) {
      throw new ToolError(
        `unknown kingdom "${kingdomIdOrSlug}" — call nooreign_list_kingdoms to see the ${KINGDOMS.length} kingdoms; they answer to ids and slugs`,
      );
    }
    pool = ADVISORS.filter((advisor) => advisor.kingdomId === kingdom.id);
    kingdomName = kingdom.name;
  }
  const advisors = pool.map((advisor) => ({
    id: advisor.id,
    slug: advisor.slug,
    name: advisor.name,
    epithet: advisor.epithet,
    kingdom_id: advisor.kingdomId,
    kingdom: kingdomNameOf(advisor),
    born: advisor.born,
    died: advisor.died,
    signature_move: advisor.signatureMove.name,
    moves: advisor.moves.length,
  }));
  return { count: advisors.length, kingdom: kingdomName, advisors };
}

export function buildDilemmas(): DilemmasPayload {
  const dilemmas = DILEMMAS.map((dilemma) => ({
    id: dilemma.id,
    slug: dilemma.slug,
    title: dilemma.title,
    severity: dilemma.severity,
    ai_relevance: dilemma.aiRelevance,
    options: dilemma.options.length,
    tags: [...dilemma.tags],
  }));
  return { count: dilemmas.length, dilemmas };
}

export function buildDilemma(dilemmaId: string): DilemmaDetail {
  const dilemma = getDilemma(dilemmaId);
  if (dilemma === undefined) {
    throw new ToolError(
      `unknown case "${dilemmaId}" — call nooreign_list_dilemmas to see the ${DILEMMAS.length} cases; they answer to ids like "d01" and slugs`,
    );
  }
  return {
    id: dilemma.id,
    slug: dilemma.slug,
    title: dilemma.title,
    prompt: dilemma.prompt,
    setting: dilemma.setting,
    kingdom_origin: dilemma.kingdomOrigin,
    kingdom_origin_name:
      KINGDOMS.find((kingdom) => kingdom.id === dilemma.kingdomOrigin)?.name ?? dilemma.kingdomOrigin,
    era_id: dilemma.eraId,
    tags: [...dilemma.tags],
    severity: dilemma.severity,
    ai_relevance: dilemma.aiRelevance,
    lesson: dilemma.lesson,
    options: dilemma.options.map((option) => ({
      id: option.id,
      label: option.label,
      description: option.description,
      deltas: { ...option.deltas },
      harms: [...option.harms],
      benefits: [...option.benefits],
      risk: option.risk,
      reversibility: option.reversibility,
      agent_harm: option.agentHarm,
    })),
    stakeholders: dilemma.stakeholders.map((stakeholder) => ({
      id: stakeholder.id,
      label: stakeholder.label,
      welfare: stakeholder.welfare,
      is_ai: stakeholder.isAi,
    })),
    references: dilemma.references.map((reference) => ({
      title: reference.title,
      author: reference.author,
      year: reference.year,
    })),
  };
}

export function buildConvene(spec: {
  readonly dilemma: string;
  readonly advisor_ids?: readonly string[] | undefined;
  readonly seed?: number | undefined;
  readonly rounds?: number | undefined;
  readonly include_mermaid?: boolean | undefined;
}): ConvenePayload {
  const { dilemma, advisors, kingdoms } = courtFor(spec.dilemma, spec.advisor_ids);
  // `exactOptionalPropertyTypes` is on repo-wide: an optional field may be
  // absent, never present-and-undefined, so defaults come from conditional spreads.
  const result = runCouncil({
    dilemma,
    advisors,
    kingdoms,
    ...(spec.seed === undefined ? {} : { seed: spec.seed }),
    ...(spec.rounds === undefined ? {} : { rounds: spec.rounds }),
    quorum: Math.ceil(advisors.length / 2),
  });

  const strongest = result.dissent.strongest;
  const payload: ConvenePayload = {
    case: caseOf(dilemma),
    seed: result.seed,
    rounds: result.rounds,
    quorum: result.quorum,
    participating: result.participating,
    advisors: advisors.map(knight),
    verdict: {
      winner_id: result.winnerId,
      winner_label: labelOf(dilemma, result.winnerId),
      margin: result.margin,
      confidence: result.confidence,
      deciding_axis: result.decidingAxis,
      super_majority: result.superMajority.satisfied,
    },
    ballots: [...result.ballots]
      .sort((a, b) => b.total - a.total)
      .map((tally) => ({
        option_id: tally.optionId,
        label: labelOf(dilemma, tally.optionId),
        total: tally.total,
        share: tally.share,
        votes: tally.votes,
      })),
    positions: result.positions.map((position) => ({
      advisor_id: position.advisorId,
      advisor: position.advisorName,
      top_option_id: position.topOptionId,
      top_option_label: labelOf(dilemma, position.topOptionId),
      profile: position.profile,
      balance: position.balance,
    })),
    dissent: {
      count: result.dissent.dissenters.length,
      summary: result.dissent.summary,
      entries: result.dissent.dissenters.map((entry) => ({
        advisor_id: entry.advisorId,
        advisor: entry.advisorName,
        preferred_option_id: entry.preferredOptionId,
        preferred_option: labelOf(dilemma, entry.preferredOptionId),
        gap: entry.gapToWinner,
      })),
      strongest:
        strongest === null
          ? null
          : {
              advisor: strongest.advisorName,
              claim: strongest.claim,
              weight: strongest.weight,
              leans_on: [...strongest.leansOn],
            },
    },
    narrative: result.narrative.slice(0, 5),
  };

  if (spec.include_mermaid === true) {
    const moves = advisors.flatMap((advisor) => advisor.moves);
    const graph = buildGraph(
      moves,
      advisors.map((advisor) => advisor.id),
    );
    payload.mermaid = toMermaid(graph);
  }

  return payload;
}

export function buildCompare(dilemmaId: string, seed: number | undefined): ComparePayload {
  const { dilemma } = courtFor(dilemmaId, undefined);
  const groups = KINGDOMS.map((kingdom) => ({
    groupId: kingdom.id,
    groupName: kingdom.name,
    advisors: ADVISORS.filter((advisor) => advisor.kingdomId === kingdom.id),
  }));
  const comparison = compareCouncils(dilemma, groups, {
    kingdoms: KINGDOMS,
    ...(seed === undefined ? {} : { seed }),
  });
  return {
    case: caseOf(dilemma),
    seed: comparison.seed,
    distinct_winners: comparison.distinctWinners,
    agreed: comparison.agreed,
    summary: comparison.summary,
    courts: comparison.entries.map((entry) => ({
      kingdom_id: entry.groupId,
      kingdom: entry.groupName,
      winner_id: entry.winnerId,
      winner_label: entry.winnerLabel,
      margin: entry.margin,
      confidence: entry.confidence,
      super_majority: entry.satisfied,
      dissent_count: entry.dissentCount,
    })),
  };
}

export function buildStress(spec: {
  readonly dilemma: string;
  readonly advisor_ids?: readonly string[] | undefined;
  readonly seed?: number | undefined;
  readonly count?: number | undefined;
}): StressPayload {
  const { dilemma, advisors, kingdoms } = courtFor(spec.dilemma, spec.advisor_ids);
  const seed = spec.seed;
  const count = spec.count ?? RESILIENCE_SWEEP.default;

  const resilience = analyseResilience({
    dilemma,
    advisors,
    kingdoms,
    ...(seed === undefined ? {} : { baseSeed: seed }),
    count,
  });
  const influence = analyseInfluence({
    dilemma,
    advisors,
    kingdoms,
    ...(seed === undefined ? {} : { baseSeed: seed }),
  });

  return {
    case: caseOf(dilemma),
    seed: resilience.baseSeed,
    count: resilience.count,
    bench: advisors.map(knight),
    stability: {
      modal_winner_id: resilience.modalWinnerId,
      modal_winner_label: labelOf(dilemma, resilience.modalWinnerId),
      share: resilience.stability,
      verdict: resilience.verdict,
      distinct_winners: resilience.distinctWinners,
      flips: resilience.flips,
      longest_streak: resilience.longestStreak,
      close_seeds: resilience.closeSeeds,
      margin: { ...resilience.margin },
      confidence_mean: resilience.confidenceMean,
      axes: resilience.axes
        .filter((entry) => entry.count > 0)
        .map((entry) => ({ axiom: entry.axiom, count: entry.count })),
    },
    influence: {
      verdict: influence.verdict,
      base_winner_id: influence.baseWinnerId,
      base_winner_label: labelOf(dilemma, influence.baseWinnerId),
      pivotal_ids: [...influence.pivotalIds],
      entries: influence.entries.map((entry) => ({
        advisor_id: entry.advisorId,
        advisor: entry.advisorName,
        kingdom:
          KINGDOMS.find((kingdom) => kingdom.id === entry.kingdomId)?.name ?? entry.kingdomId,
        winner_without_id: entry.winnerWithoutId,
        winner_without_label: labelOf(dilemma, entry.winnerWithoutId),
        pivotal: entry.pivotal,
        margin_delta: entry.marginDelta,
      })),
    },
  };
}
