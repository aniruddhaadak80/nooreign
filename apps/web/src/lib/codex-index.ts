/**
 * The codex search index, built once per server process.
 *
 * The documents come from the generated corpus rather than from `GLOSSARY` and `TEXTS` directly,
 * because the corpus is what `bun run seed` promises stays in step with the rest of the atlas: one
 * flat, flat-typed list of everything that can be found. The seed is layered back on top to supply
 * the fields the corpus flattens away — the realm a term belongs to, the cross-references, the
 * curated one-line teaser — and those cross-references are folded into the searchable tags, so
 * "which other terms point here" is a query rather than a lookup.
 *
 * The index is a module-level singleton on purpose: `searchCodex` is called from server components,
 * and building an inverted index over a hundred and forty-eight documents on every render would be
 * the kind of waste nobody notices until the build gets slow. It is still just `buildIndex` from
 * `@repo/core` over plain objects — no cache to invalidate, nothing to warm, nothing to tear down.
 */
import { buildIndex, suggest } from "@repo/core";
import type { SearchIndex } from "@repo/core";
import { GLOSSARY, KINGDOMS, TEXTS } from "@repo/seed";
import type { CanonText } from "@repo/seed";
import { CORPUS } from "../../../../packages/seed/src/generated/corpus";
import type { CorpusEntry } from "../../../../packages/seed/src/generated/corpus-types";
import { rankCodex, toSearchableDocs } from "@/components/codex/term-card";
import type { CodexDoc, CodexResult, RankOptions } from "@/components/codex/term-card";

const isCodexCorpusKind = (entry: CorpusEntry): boolean => entry.kind === "glossary" || entry.kind === "text";

const GLOSSARY_BY_SLUG = new Map(GLOSSARY.map((entry) => [entry.slug, entry]));
const TEXTS_BY_ID = new Map(TEXTS.map((text) => [text.id, text]));
const REALM_NAMES = new Map(KINGDOMS.map((kingdom) => [kingdom.id, kingdom.name]));

/** The `kind:` values each half of the codex is filterable by: five glossary kinds, three canon kinds. */
const GLOSSARY_KINDS: readonly string[] = [...new Set(GLOSSARY.map((entry) => entry.kind))].sort();
const TEXT_KINDS: readonly string[] = [...new Set(TEXTS.map((text) => text.kind))].sort();

function realmName(kingdomId: string | null | undefined): string | null {
  if (kingdomId === null || kingdomId === undefined) return null;
  return REALM_NAMES.get(kingdomId) ?? null;
}

/**
 * Cross-reference a corpus row with its seed entry.
 *
 * The seed lookup is allowed to miss without dropping the row: a corpus row with no glossary entry
 * behind it still has a title, a body and an href, and the codex would rather show a slightly plainer
 * entry than silently lose one. `corpus.test.ts`-style completeness is asserted in the test suite
 * instead of being enforced by a filter here.
 */
function toDoc(entry: CorpusEntry): CodexDoc {
  const glossary = entry.kind === "glossary" ? GLOSSARY_BY_SLUG.get(entry.id) : undefined;
  const text = entry.kind === "text" ? TEXTS_BY_ID.get(entry.id) : undefined;
  const realm = realmName(glossary?.kingdomId ?? text?.kingdomId);

  const tags = [
    ...(glossary !== undefined ? glossary.seeAlso : []),
    ...(text !== undefined ? [text.author] : []),
    ...(realm === null ? [] : [realm]),
  ];

  return {
    id: entry.id,
    family: entry.kind === "glossary" ? "term" : "text",
    kind: glossary?.kind ?? text?.kind ?? entry.kind,
    title: entry.title,
    href: entry.href,
    year: entry.year,
    teaser: glossary?.short ?? text?.summary ?? "",
    body: entry.body,
    tags,
    realm,
  };
}

const DOCS: readonly CodexDoc[] = CORPUS.filter(isCodexCorpusKind).map(toDoc);

/** Every document the codex can find, in the atlas's own curated order. */
export function codexDocs(): readonly CodexDoc[] {
  return DOCS;
}

let cachedIndex: SearchIndex | null = null;

/** The inverted index. Built on first use and shared by every caller in the process. */
export function getCodexIndex(): SearchIndex {
  if (cachedIndex === null) cachedIndex = buildIndex(toSearchableDocs(DOCS));
  return cachedIndex;
}

export interface CodexFacet {
  readonly kind: string;
  readonly count: number;
}

export interface CodexStats {
  readonly documents: number;
  readonly terms: number;
  readonly texts: number;
  /** Distinct searchable tokens: the vocabulary the index can complete. */
  readonly indexedTerms: number;
  readonly facets: readonly CodexFacet[];
}

/** What the index page needs to describe what it is searching, without counting anything twice. */
export function codexStats(): CodexStats {
  // Insertion order is the atlas's own order, which puts the glossary kinds before the canon kinds.
  const counts = new Map<string, number>();
  for (const doc of DOCS) counts.set(doc.kind, (counts.get(doc.kind) ?? 0) + 1);

  return {
    documents: DOCS.length,
    terms: DOCS.filter((doc) => doc.family === "term").length,
    texts: DOCS.filter((doc) => doc.family === "text").length,
    indexedTerms: getCodexIndex().terms.size,
    facets: [...counts].map(([kind, count]) => ({ kind, count })),
  };
}

/** Rank the codex. `kinds`, `family` and `limit` are applied exactly as `rankCodex` documents. */
export function searchCodex(q: string, opts: RankOptions = {}): CodexResult[] {
  return rankCodex(getCodexIndex(), DOCS, q, opts);
}

/** Term completions for a prefix, most common first. */
export function codexSuggest(prefix: string, limit = 6): string[] {
  return suggest(getCodexIndex(), prefix, limit);
}

/** The canon texts that discuss a given term, ranked by how much of the text's own language it shares. */
export function canonCiting(term: string, limit = 4): readonly CodexResult[] {
  return searchCodex(term, { kinds: TEXT_KINDS, family: "text", limit });
}

/** The glossary terms a canon text reaches for, ranked against its own summary. */
export function termsTouching(text: CanonText, limit = 5): readonly CodexResult[] {
  return searchCodex(text.summary, { kinds: GLOSSARY_KINDS, family: "term", limit });
}

/** The realms that own vocabulary or canon of a given kind, by name. */
export function realmsLeaningOn(kind: string): readonly string[] {
  const names = new Set<string>();
  for (const entry of GLOSSARY) {
    if (entry.kind !== kind) continue;
    const realm = realmName(entry.kingdomId);
    if (realm !== null) names.add(realm);
  }
  for (const text of TEXTS) {
    if (text.kind !== kind) continue;
    const realm = realmName(text.kingdomId);
    if (realm !== null) names.add(realm);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** One sentence per glossary kind, in the voice of the atlas rather than the voice of a dictionary. */
const KIND_GLOSS: Readonly<Record<string, string>> = {
  alignment:
    "Every realm has to keep a system honest. These are the terms that say out loud what the other kinds keep implicit.",
  ethics: "Ethics is where the realms argue about what counts: the parties, the pleasures, the duties, the care.",
  philosophy:
    "Philosophy carries the arguments the other four kinds are downstream of — what an agent is, what a person owes, what a rule is for.",
  governance: "Procedure, not conviction. This is the vocabulary of constitutions, audits and the people who have to sign.",
  technical: "The vocabulary of measurement, and therefore of the disagreements measurement cannot settle.",
};

/** Fallback for a kind with no written gloss — the canon kinds, which never ask for one. */
export const DEFAULT_KIND_GLOSS = "No realm has written down what this kind obliges them to.";

export function kindGloss(kind: string): string {
  return KIND_GLOSS[kind] ?? DEFAULT_KIND_GLOSS;
}