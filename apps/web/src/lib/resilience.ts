import { z } from "zod";
import { DILEMMAS, KINGDOMS, SEED, getAdvisor, getDilemma } from "@repo/seed";
import type { Advisor, Kingdom } from "@repo/seed";
import {
  analyseInfluence,
  analyseResilience,
  RESILIENCE_SWEEP,
  type InfluenceReport,
  type ResilienceReport,
} from "@repo/core";
import { defaultPanelFor } from "./convene";

/**
 * How the atlas stress-tests its own verdicts.
 *
 * Every case is decided far more times than it is read: once across a window
 * of consecutive seeds (would a different tie-break alone have changed the
 * winner?) and once with each seated advisor removed (whose absence would?).
 * Both readings come from `@repo/core` — the same `runCouncil` the council
 * page runs — so a report can never disagree with the court it describes.
 *
 * The bench is the case page's own default panel, so the report is about the
 * court a reader would actually meet, not a bench chosen to make a point.
 */

/** The default sweep window. Matches `RESILIENCE_SWEEP.default` in `@repo/core`. */
export const STRESS_SEEDS = RESILIENCE_SWEEP.default;

export interface StressPanelMember {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly kingdomId: string;
}

export interface VerdictStress {
  readonly dilemmaId: string;
  readonly slug: string;
  readonly title: string;
  /** The first seed of the sweep; `seed .. seed + count - 1` were deliberated. */
  readonly seed: number;
  readonly panel: readonly StressPanelMember[];
  readonly optionLabels: readonly { readonly id: string; readonly label: string }[];
  readonly resilience: ResilienceReport;
  readonly influence: InfluenceReport;
}

export interface StressOptions {
  readonly advisorIds?: readonly string[] | undefined;
  readonly seed?: number | undefined;
  readonly count?: number | undefined;
}

/** Resolve advisor ids into the advisors and kingdoms a court needs. */
export function resolvePanel(advisorIds: readonly string[]): {
  advisors: Advisor[];
  kingdoms: Kingdom[];
} {
  const advisors = advisorIds
    .map((id) => getAdvisor(id))
    .filter((advisor): advisor is Advisor => advisor !== undefined);
  const kingdoms = KINGDOMS.filter((kingdom) =>
    advisors.some((advisor) => advisor.kingdomId === kingdom.id),
  );
  return { advisors, kingdoms };
}

/**
 * Sweep one case and thin its bench. Returns `null` for an unknown dilemma or
 * a panel with no resolvable advisors — there is nothing honest to report
 * about a court that cannot be seated.
 */
export function stressFor(dilemmaId: string, options: StressOptions = {}): VerdictStress | null {
  const dilemma = getDilemma(dilemmaId);
  if (!dilemma) return null;

  const advisorIds = options.advisorIds ?? defaultPanelFor(dilemmaId);
  const { advisors, kingdoms } = resolvePanel(advisorIds);
  if (advisors.length === 0) return null;

  const seed = options.seed ?? SEED;
  const count = options.count ?? STRESS_SEEDS;

  const resilience = analyseResilience({ dilemma, advisors, kingdoms, baseSeed: seed, count });
  const influence = analyseInfluence({ dilemma, advisors, kingdoms, baseSeed: seed });

  return {
    dilemmaId: dilemma.id,
    slug: dilemma.slug,
    title: dilemma.title,
    seed,
    panel: advisors.map((advisor) => ({
      id: advisor.id,
      slug: advisor.slug,
      name: advisor.name,
      kingdomId: advisor.kingdomId,
    })),
    optionLabels: dilemma.options.map((option) => ({ id: option.id, label: option.label })),
    resilience,
    influence,
  };
}

/** Every case in the atlas, stressed with its own default bench. */
export function stressAtlas(): VerdictStress[] {
  return DILEMMAS.map((dilemma) => stressFor(dilemma.id)).filter(
    (stress): stress is VerdictStress => stress !== null,
  );
}

/* ------------------------------------------------------------------ *
 * Transport schema
 * ------------------------------------------------------------------ */

export const stressRequestSchema = z.object({
  dilemmaId: z.string().min(1),
  advisorIds: z.array(z.string().min(1)).min(1).max(12).optional(),
  seed: z.number().int().min(0).max(1_000_000).default(SEED),
  count: z.number().int().min(RESILIENCE_SWEEP.min).max(RESILIENCE_SWEEP.max).default(STRESS_SEEDS),
});

export type StressRequest = z.infer<typeof stressRequestSchema>;
