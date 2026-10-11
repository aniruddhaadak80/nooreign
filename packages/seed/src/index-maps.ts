/**
 * Derived lookup tables.
 *
 * They live in their own module so `index.ts` can stay a thin barrel: datasets
 * declare rows, this module indexes them. Nothing here adds behaviour, and every
 * map is built once at module load — the atlas reads these on every server render.
 */
import { ERAS } from "./eras";
import { TECHNIQUES } from "./techniques";
import { DILEMMAS } from "./dilemmas";
import { EXPERIMENTS } from "./experiments";
import { GLOSSARY } from "./glossary";
import { TEXTS } from "./texts";
import type { CanonText, Dilemma, Era, Experiment, GlossaryEntry, Technique } from "./types";

export { ERAS } from "./eras";
export { TECHNIQUES } from "./techniques";
export { DILEMMAS } from "./dilemmas";
export { EXPERIMENTS } from "./experiments";
export { GLOSSARY } from "./glossary";
export { TEXTS } from "./texts";

const byId = <T extends { id: string }>(rows: readonly T[]): ReadonlyMap<string, T> =>
  new Map(rows.map((row) => [row.id, row]));

const bySlug = <T extends { slug: string }>(rows: readonly T[]): ReadonlyMap<string, T> =>
  new Map(rows.map((row) => [row.slug, row]));

export const ERAS_BY_ID = byId<Era>(ERAS);
export const ERAS_BY_SLUG = bySlug<Era>(ERAS);

export const TECHNIQUES_BY_ID = byId<Technique>(TECHNIQUES);
export const TECHNIQUES_BY_SLUG = bySlug<Technique>(TECHNIQUES);

export const DILEMMAS_BY_ID = byId<Dilemma>(DILEMMAS);
export const DILEMMAS_BY_SLUG = bySlug<Dilemma>(DILEMMAS);

export const EXPERIMENTS_BY_ID = byId<Experiment>(EXPERIMENTS);
export const EXPERIMENTS_BY_SLUG = bySlug<Experiment>(EXPERIMENTS);

export const GLOSSARY_BY_SLUG: ReadonlyMap<string, GlossaryEntry> = new Map(GLOSSARY.map((g) => [g.slug, g]));

export const TEXTS_BY_ID = byId<CanonText>(TEXTS);
export const TEXTS_BY_SLUG = bySlug<CanonText>(TEXTS);
