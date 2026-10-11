/**
 * Nooreign seed barrel.
 *
 * Every dataset in this package is offline, typed and validated at import time by
 * `validateSeed()`. Nothing here touches the network, and nothing here needs an API
 * key: the atlas is fully explorable on a cold clone with no services running.
 */
import type { z } from "zod";
import { KINGDOMS, KINGDOMS_BY_ID, KINGDOMS_BY_SLUG } from "./kingdoms";
import { ADVISORS, ADVISORS_BY_ID, ADVISORS_BY_SLUG } from "./advisors";
import {
  DILEMMAS,
  DILEMMAS_BY_ID,
  DILEMMAS_BY_SLUG,
  ERAS,
  ERAS_BY_ID,
  ERAS_BY_SLUG,
  EXPERIMENTS,
  EXPERIMENTS_BY_ID,
  EXPERIMENTS_BY_SLUG,
  GLOSSARY,
  GLOSSARY_BY_SLUG,
  TECHNIQUES,
  TECHNIQUES_BY_ID,
  TECHNIQUES_BY_SLUG,
  TEXTS,
  TEXTS_BY_ID,
  TEXTS_BY_SLUG,
} from "./index-maps";
import type {
  Advisor,
  AxiomKey,
  AxiomVector,
  CanonText,
  Dilemma,
  Era,
  Experiment,
  GlossaryEntry,
  Kingdom,
  Technique,
} from "./types";
import {
  advisorSchema,
  AXIOM_KEYS,
  DIMENSION_META,
  dilemmaSchema,
  eraSchema,
  experimentSchema,
  glossaryEntrySchema,
  kingdomSchema,
  techniqueSchema,
  textSchema,
} from "./types";

/** The seed every generated artefact in this repo is derived from. */
export const SEED = 2406;

export * from "./types";
export { DIMENSION_META, AXIOM_KEYS };
export { KINGDOMS, KINGDOMS_BY_ID, KINGDOMS_BY_SLUG } from "./kingdoms";
export { ADVISORS, ADVISORS_BY_ID, ADVISORS_BY_SLUG } from "./advisors";
export { ERAS, ERAS_BY_ID, ERAS_BY_SLUG } from "./index-maps";
export { TECHNIQUES, TECHNIQUES_BY_ID, TECHNIQUES_BY_SLUG } from "./index-maps";
export { DILEMMAS, DILEMMAS_BY_ID, DILEMMAS_BY_SLUG } from "./index-maps";
export { EXPERIMENTS, EXPERIMENTS_BY_ID, EXPERIMENTS_BY_SLUG } from "./index-maps";
export { GLOSSARY, GLOSSARY_BY_SLUG } from "./index-maps";
export { TEXTS, TEXTS_BY_ID, TEXTS_BY_SLUG } from "./index-maps";

/* ------------------------------------------------------------------ *
 * Lookups
 * ------------------------------------------------------------------ */

export const getKingdom = (idOrSlug: string): Kingdom | undefined =>
  KINGDOMS_BY_ID.get(idOrSlug) ?? KINGDOMS_BY_SLUG.get(idOrSlug);

export const getAdvisor = (idOrSlug: string): Advisor | undefined =>
  ADVISORS_BY_ID.get(idOrSlug) ?? ADVISORS_BY_SLUG.get(idOrSlug);

export const getEra = (idOrSlug: string): Era | undefined => ERAS_BY_ID.get(idOrSlug) ?? ERAS_BY_SLUG.get(idOrSlug);

export const getTechnique = (idOrSlug: string): Technique | undefined =>
  TECHNIQUES_BY_ID.get(idOrSlug) ?? TECHNIQUES_BY_SLUG.get(idOrSlug);

export const getDilemma = (idOrSlug: string): Dilemma | undefined =>
  DILEMMAS_BY_ID.get(idOrSlug) ?? DILEMMAS_BY_SLUG.get(idOrSlug);

export const getExperiment = (idOrSlug: string): Experiment | undefined =>
  EXPERIMENTS_BY_ID.get(idOrSlug) ?? EXPERIMENTS_BY_SLUG.get(idOrSlug);

export const getGlossaryEntry = (slug: string): GlossaryEntry | undefined => GLOSSARY_BY_SLUG.get(slug);

export const getText = (idOrSlug: string): CanonText | undefined =>
  TEXTS_BY_ID.get(idOrSlug) ?? TEXTS_BY_SLUG.get(idOrSlug);

/** The advisors who sit on a kingdom's court, in birth order. */
export function advisorsOfKingdom(kingdomId: string): Advisor[] {
  const kingdom = getKingdom(kingdomId);
  if (!kingdom) return [];
  return kingdom.advisors
    .map((id) => getAdvisor(id))
    .filter((a): a is Advisor => a !== undefined)
    .sort((a, b) => a.born - b.born);
}

/** The eras a kingdom's thinking was shaped by, by overlapping founder dates. */
export function erasTouching(kingdomId: string): Era[] {
  const kingdom = getKingdom(kingdomId);
  if (!kingdom) return [];
  return ERAS.filter((era) => era.figures.includes(kingdom.founder) || kingdom.texts.some((t) => era.techniques.includes(t)));
}

/** Every dilemma whose origin is this kingdom, oldest era first. */
export function dilemmasOfKingdom(kingdomId: string): Dilemma[] {
  return DILEMMAS.filter((d) => d.kingdomOrigin === kingdomId);
}

/** The dilemmas tagged with any of the given tags. */
export function dilemmasByTag(tag: string): Dilemma[] {
  return DILEMMAS.filter((d) => d.tags.includes(tag));
}

/** Every technique that was already available when an era closed. */
export function techniquesAtEndOfEra(era: Era): Technique[] {
  return TECHNIQUES.filter((t) => t.introduced <= era.endYear).sort((a, b) => a.introduced - b.introduced);
}

/** The canon texts a kingdom stands on. */
export function textsOfKingdom(kingdomId: string): CanonText[] {
  const kingdom = getKingdom(kingdomId);
  if (!kingdom) return [];
  return kingdom.texts.map((id) => getText(id)).filter((t): t is CanonText => t !== undefined);
}

/** Mean axiom vector over a set of advisors — the court's collective disposition. */
export function courtAxioms(advisors: readonly Advisor[]): AxiomVector {
  const out = Object.fromEntries(AXIOM_KEYS.map((k) => [k, 0])) as unknown as AxiomVector;
  if (advisors.length === 0) return out;
  for (const advisor of advisors) {
    for (const key of AXIOM_KEYS) out[key] += advisor.axioms[key];
  }
  for (const key of AXIOM_KEYS) out[key] = round4(out[key] / advisors.length);
  return out;
}

const round4 = (n: number): number => Math.round(n * 10_000) / 10_000;

/** Corpus statistics used by the landing page and the scale report. */
export const ATLAS_STATS = {
  kingdoms: KINGDOMS.length,
  advisors: ADVISORS.length,
  eras: ERAS.length,
  techniques: TECHNIQUES.length,
  dilemmas: DILEMMAS.length,
  experiments: EXPERIMENTS.length,
  glossary: GLOSSARY.length,
  texts: TEXTS.length,
  dimensions: AXIOM_KEYS.length,
} as const;

/** The span of recorded history in the chronicle, in years. */
export const CHRONICLE_SPAN = {
  from: Math.min(...ERAS.map((e) => e.startYear)),
  to: Math.max(...ERAS.map((e) => e.endYear)),
} as const;

/* ------------------------------------------------------------------ *
 * Integrity
 * ------------------------------------------------------------------ */

export interface IntegrityIssue {
  dataset: string;
  id: string;
  problem: string;
}

/**
 * Validates every dataset against its schema and cross-checks every foreign key.
 *
 * This runs on import in development and is exercised directly by the seed test
 * suite, so a malformed edit fails loudly at the boundary instead of rendering as
 * an empty page deep in the tree.
 */
export function validateSeed(): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];

  const check = <T>(dataset: string, schema: z.ZodType<T>, rows: readonly T[], key: (row: T) => string) => {
    for (const row of rows) {
      const parsed = schema.safeParse(row);
      if (!parsed.success) {
        issues.push({ dataset, id: key(row), problem: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
      }
    }
  };

  check("kingdoms", kingdomSchema, KINGDOMS, (k) => k.id);
  check("advisors", advisorSchema, ADVISORS, (a) => a.id);
  check("eras", eraSchema, ERAS, (e) => e.id);
  check("techniques", techniqueSchema, TECHNIQUES, (t) => t.id);
  check("dilemmas", dilemmaSchema, DILEMMAS, (d) => d.id);
  check("experiments", experimentSchema, EXPERIMENTS, (e) => e.id);
  check("glossary", glossaryEntrySchema, GLOSSARY, (g) => g.slug);
  check("texts", textSchema, TEXTS, (t) => t.id);

  const kingdomIds = new Set(KINGDOMS.map((k) => k.id));
  const advisorIds = new Set(ADVISORS.map((a) => a.id));
  const techniqueIds = new Set(TECHNIQUES.map((t) => t.id));
  const eraIds = new Set(ERAS.map((e) => e.id));
  const textIds = new Set(TEXTS.map((t) => t.id));
  const glossarySlugs = new Set(GLOSSARY.map((g) => g.slug));

  for (const kingdom of KINGDOMS) {
    for (const advisorId of kingdom.advisors) {
      if (!advisorIds.has(advisorId)) issues.push({ dataset: "kingdoms", id: kingdom.id, problem: `unknown advisor "${advisorId}"` });
    }
    for (const textId of kingdom.texts) {
      if (!textIds.has(textId)) issues.push({ dataset: "kingdoms", id: kingdom.id, problem: `unknown text "${textId}"` });
    }
    for (const rel of kingdom.relations) {
      if (!kingdomIds.has(rel.to)) issues.push({ dataset: "kingdoms", id: kingdom.id, problem: `unknown relation target "${rel.to}"` });
      if (rel.to === kingdom.id) issues.push({ dataset: "kingdoms", id: kingdom.id, problem: "relation to self" });
    }
  }

  for (const advisor of ADVISORS) {
    if (!kingdomIds.has(advisor.kingdomId)) issues.push({ dataset: "advisors", id: advisor.id, problem: `unknown kingdom "${advisor.kingdomId}"` });
  }

  for (const era of ERAS) {
    if (era.endYear < era.startYear) issues.push({ dataset: "eras", id: era.id, problem: "endYear precedes startYear" });
    for (const techniqueId of era.techniques) {
      if (!techniqueIds.has(techniqueId)) issues.push({ dataset: "eras", id: era.id, problem: `unknown technique "${techniqueId}"` });
    }
  }

  for (const technique of TECHNIQUES) {
    for (const req of technique.requires) {
      if (!techniqueIds.has(req)) issues.push({ dataset: "techniques", id: technique.id, problem: `unknown requirement "${req}"` });
    }
    // `supersedes` was the one relation without a check, which meant a typo'd
    // id would silently render as "nothing supersedes anything".
    for (const superseded of technique.supersedes) {
      if (!techniqueIds.has(superseded)) {
        issues.push({ dataset: "techniques", id: technique.id, problem: `unknown superseded technique "${superseded}"` });
      }
    }
    if (technique.supersedes.includes(technique.id)) {
      issues.push({ dataset: "techniques", id: technique.id, problem: "technique supersedes itself" });
    }
  }

  for (const dilemma of DILEMMAS) {
    if (!kingdomIds.has(dilemma.kingdomOrigin)) issues.push({ dataset: "dilemmas", id: dilemma.id, problem: `unknown kingdomOrigin "${dilemma.kingdomOrigin}"` });
    if (!eraIds.has(dilemma.eraId)) issues.push({ dataset: "dilemmas", id: dilemma.id, problem: `unknown era "${dilemma.eraId}"` });
    const optionIds = new Set(dilemma.options.map((o) => o.id));
    if (optionIds.size !== dilemma.options.length) issues.push({ dataset: "dilemmas", id: dilemma.id, problem: "duplicate option ids" });
  }

  for (const entry of GLOSSARY) {
    if (entry.kingdomId !== null && !kingdomIds.has(entry.kingdomId)) issues.push({ dataset: "glossary", id: entry.slug, problem: `unknown kingdom "${entry.kingdomId}"` });
    for (const see of entry.seeAlso) {
      if (!glossarySlugs.has(see)) issues.push({ dataset: "glossary", id: entry.slug, problem: `seeAlso "${see}" does not resolve` });
    }
  }

  return issues;
}

/** The six moral dimensions with their human labels, for UI axes and legends. */
export const AXIS_LABELS: Record<AxiomKey, string> = Object.fromEntries(
  AXIOM_KEYS.map((k) => [k, DIMENSION_META[k].label]),
) as Record<AxiomKey, string>;
