/**
 * Codex search.
 *
 * A small inverted index with term frequency, a length normaliser and an IDF weight — enough to make
 * the codex feel like it has opinions about relevance, small enough to read in one sitting and to run
 * over the whole corpus on every keystroke without a worker.
 *
 * It is deliberately generic: the index knows about `SearchableDoc` and nothing about kingdoms,
 * advisors, eras or dilemmas. The codex mixes all of those into one corpus at the call site, and a
 * search engine that knows the schema cannot be reused for the glossary.
 *
 * Query grammar (the whole of it):
 *   oversight                  bare terms, OR-ed with additive scores
 *   "scalable oversight"       phrase — scored as a unit and used to pick the snippet
 *   -paperclip                 exclusion — a hit on this term removes the document entirely
 *   kind:declaration           filter on the document's kind
 */
import { clamp, safeDiv } from "../util/math";

/* ------------------------------------------------------------------ *
 * Documents and index
 * ------------------------------------------------------------------ */

export interface SearchableDoc {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly kind: string;
  readonly tags: readonly string[];
  readonly year?: number;
}

export interface IndexedDoc {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly body: string;
  readonly year: number | null;
  readonly tags: readonly string[];
  /** Body tokens in document order — phrase matching and snippets both need the sequence. */
  readonly bodyTokens: readonly string[];
  readonly titleTokens: readonly string[];
  /** Total body tokens; the length normaliser divides by this. */
  readonly length: number;
}

export interface IndexTerm {
  readonly term: string;
  /** Document frequency. */
  readonly df: number;
  readonly postings: ReadonlyMap<string, number>;
}

export interface SearchIndex {
  readonly terms: ReadonlyMap<string, IndexTerm>;
  readonly docs: ReadonlyMap<string, IndexedDoc>;
  readonly docCount: number;
  readonly avgLength: number;
}

/**
 * Deliberately tiny. A real stop list buys a little precision and costs a lot of surprise: someone
 * searching the codex for "are" or "not" should get the rows where those words carry the argument,
 * not an empty result set.
 */
const STOPWORDS: ReadonlySet<string> = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "in", "into", "is", "it",
  "its", "of", "on", "or", "that", "the", "their", "this", "to", "was", "were", "with",
]);

/** Lowercase, split on anything that is not a letter or a digit, drop stopwords and one-character noise. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

/**
 * Build the index. Title terms are indexed separately from body terms so a title hit can be scored
 * higher than a buried body hit — the cheapest relevance signal that actually works.
 */
export function buildIndex(docs: readonly SearchableDoc[]): SearchIndex {
  const terms = new Map<string, Map<string, number>>();
  const indexed = new Map<string, IndexedDoc>();
  let totalLength = 0;

  const add = (token: string, docId: string): void => {
    const posting = terms.get(token);
    if (posting === undefined) terms.set(token, new Map([[docId, 1]]));
    else posting.set(docId, (posting.get(docId) ?? 0) + 1);
  };

  for (const doc of docs) {
    const bodyTokens = tokenize(`${doc.body} ${doc.tags.join(" ")}`);
    const titleTokens = tokenize(doc.title);
    for (const token of bodyTokens) add(token, doc.id);
    for (const token of titleTokens) add(token, doc.id);

    indexed.set(doc.id, {
      id: doc.id,
      kind: doc.kind,
      title: doc.title,
      body: doc.body,
      year: doc.year ?? null,
      tags: [...doc.tags],
      bodyTokens,
      titleTokens,
      length: bodyTokens.length,
    });
    totalLength += bodyTokens.length;
  }

  const frozen: Map<string, IndexTerm> = new Map();
  for (const [term, postings] of terms) {
    frozen.set(term, { term, df: postings.size, postings: new Map(postings) });
  }

  return {
    terms: frozen,
    docs: indexed,
    docCount: docs.length,
    avgLength: safeDiv(totalLength, docs.length),
  };
}

/* ------------------------------------------------------------------ *
 * Query parsing
 * ------------------------------------------------------------------ */

export interface ParsedQuery {
  readonly terms: string[];
  readonly phrases: string[][];
  readonly exclude: string[];
  readonly kinds: string[];
}

const isSpace = (ch: string): boolean => ch === " " || ch === "\t" || ch === "\n" || ch === "\r";

/**
 * Hand-rolled scanner rather than a regex: quoted phrases, `-exclusion` and `kind:` filters overlap,
 * and a single regex for three interleaved syntaxes is a bug generator.
 */
export function parseQuery(q: string): ParsedQuery {
  const terms: string[] = [];
  const phrases: string[][] = [];
  const exclude: string[] = [];
  const kinds: string[] = [];

  let i = 0;
  while (i < q.length) {
    const ch = q.charAt(i);
    if (isSpace(ch)) {
      i += 1;
      continue;
    }

    if (ch === '"') {
      const close = q.indexOf('"', i + 1);
      const raw = close === -1 ? q.slice(i + 1) : q.slice(i + 1, close);
      const tokens = tokenize(raw);
      if (tokens.length > 0) phrases.push(tokens);
      i = close === -1 ? q.length : close + 1;
      continue;
    }

    let negated = false;
    if (ch === "-") {
      negated = true;
      i += 1;
    }

    const start = i;
    while (i < q.length && !isSpace(q.charAt(i))) i += 1;
    const raw = q.slice(start, i);
    if (raw.length === 0) continue;

    if (!negated && raw.startsWith("kind:") && raw.length > "kind:".length) {
      kinds.push(raw.slice("kind:".length).toLowerCase());
      continue;
    }

    const tokens = tokenize(raw);
    if (tokens.length === 0) continue;
    if (negated) exclude.push(...tokens);
    else terms.push(...tokens);
  }

  return { terms: [...new Set(terms)], phrases, exclude: [...new Set(exclude)], kinds };
}

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

const idf = (index: SearchIndex, term: string): number => {
  const entry = index.terms.get(term);
  if (entry === undefined) return 0;
  return Math.log(1 + index.docCount / entry.df);
};

/** Sub-linear term frequency: the tenth mention of a word is not ten times the first. */
const tfWeight = (tf: number): number => 1 + Math.log(tf);

/** Score awarded for a phrase that occurs in the body. Big on purpose: a phrase is a stronger signal than any single term. */
export const PHRASE_BONUS = 3;

/** Score awarded for a term appearing in the title rather than only in the body. */
export const TITLE_BONUS = 1;

export interface QueryOptions {
  readonly limit?: number;
  /** Additional kind filter, AND-ed with any `kind:` in the query string. */
  readonly kinds?: readonly string[];
  readonly minScore?: number;
}

export interface QueryHit {
  readonly id: string;
  readonly score: number;
  readonly snippet: string;
}

const containsPhrase = (tokens: readonly string[], phrase: readonly string[]): boolean => {
  if (phrase.length === 0 || tokens.length < phrase.length) return false;
  outer: for (let i = 0; i + phrase.length <= tokens.length; i += 1) {
    for (let j = 0; j < phrase.length; j += 1) {
      if (tokens[i + j] !== phrase[j]) continue outer;
    }
    return true;
  }
  return false;
};

/** Window size, in tokens, of a generated snippet. */
const SNIPPET_WINDOW = 28;

/**
 * The window of the body with the highest density of query terms, returned with ellipses where it was
 * cut. Ties resolve to the earliest window, so the snippet for a given document never moves.
 */
export function buildSnippet(bodyTokens: readonly string[], wanted: ReadonlySet<string>): string {
  if (bodyTokens.length === 0) return "";
  if (bodyTokens.length <= SNIPPET_WINDOW) return bodyTokens.join(" ");

  let bestStart = 0;
  let bestScore = -1;
  for (let start = 0; start + SNIPPET_WINDOW <= bodyTokens.length; start += 1) {
    let hits = 0;
    for (let k = start; k < start + SNIPPET_WINDOW; k += 1) {
      const token = bodyTokens[k];
      if (token !== undefined && wanted.has(token)) hits += 1;
    }
    if (hits > bestScore) {
      bestScore = hits;
      bestStart = start;
    }
  }

  const prefix = bestStart > 0 ? "… " : "";
  const suffix = bestStart + SNIPPET_WINDOW < bodyTokens.length ? " …" : "";
  return `${prefix}${bodyTokens.slice(bestStart, bestStart + SNIPPET_WINDOW).join(" ")}${suffix}`;
}

/**
 * Rank documents for `q`.
 *
 * Ordering is score descending, then `id` ascending — never insertion order. Two documents that tie
 * on score must appear in the same order on every machine, every render, forever.
 */
export function query(index: SearchIndex, q: string, opts: QueryOptions = {}): QueryHit[] {
  const parsed = parseQuery(q);
  const kinds = new Set([...parsed.kinds, ...(opts.kinds ?? []).map((k) => k.toLowerCase())]);
  const minScore = opts.minScore ?? 0;

  const excludedDocs = new Set<string>();
  for (const term of parsed.exclude) {
    const entry = index.terms.get(term);
    if (entry === undefined) continue;
    for (const docId of entry.postings.keys()) excludedDocs.add(docId);
  }

  const wanted = new Set<string>([...parsed.terms, ...parsed.phrases.flat()]);
  const scores = new Map<string, number>();
  const phaseOnly = parsed.terms.length === 0 && parsed.phrases.length === 0;

  for (const term of parsed.terms) {
    const entry = index.terms.get(term);
    if (entry === undefined) continue;
    const weight = idf(index, term);
    for (const [docId, tf] of entry.postings) {
      const doc = index.docs.get(docId);
      if (doc === undefined || doc.length === 0) continue;
      // Length normalisation: a 400-word glossary entry should not outrank a 40-word primary source
      // for one incidental match.
      const normalised = (weight * tfWeight(tf)) / Math.sqrt(doc.length);
      scores.set(docId, (scores.get(docId) ?? 0) + normalised);
    }
  }

  for (const phrase of parsed.phrases) {
    for (const doc of index.docs.values()) {
      if (containsPhrase(doc.bodyTokens, phrase)) scores.set(doc.id, (scores.get(doc.id) ?? 0) + PHRASE_BONUS);
    }
  }

  for (const term of parsed.terms) {
    const entry = index.terms.get(term);
    if (entry === undefined) continue;
    const weight = idf(index, term);
    for (const docId of entry.postings.keys()) {
      const doc = index.docs.get(docId);
      if (doc === undefined) continue;
      if (doc.titleTokens.includes(term)) scores.set(docId, (scores.get(docId) ?? 0) + weight + TITLE_BONUS);
    }
  }

  const hits: QueryHit[] = [];
  for (const doc of index.docs.values()) {
    if (kinds.size > 0 && !kinds.has(doc.kind.toLowerCase())) continue;
    if (excludedDocs.has(doc.id)) continue;
    const score = clamp(scores.get(doc.id) ?? 0, 0, Number.POSITIVE_INFINITY);
    if (score <= minScore) continue;
    hits.push({
      id: doc.id,
      score: Math.round(score * 10_000) / 10_000,
      snippet: phaseOnly && wanted.size === 0 ? doc.body.slice(0, 180) : buildSnippet(doc.bodyTokens, wanted),
    });
  }

  hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return opts.limit === undefined ? hits : hits.slice(0, Math.max(0, opts.limit));
}

/* ------------------------------------------------------------------ *
 * Suggestions
 * ------------------------------------------------------------------ */

/**
 * Term completions for a prefix, ranked by document frequency and then alphabetically. The `df` sort
 * is what makes typing "ov" offer "oversight" before "overlap": the corpus's own opinion about which
 * prefix the reader is more likely to have started.
 */
export function suggest(index: SearchIndex, prefix: string, limit = 8): string[] {
  const needle = prefix.trim().toLowerCase();
  if (needle.length === 0) return [];
  const out: Array<{ term: string; df: number }> = [];
  for (const [term, entry] of index.terms) {
    if (term.startsWith(needle)) out.push({ term, df: entry.df });
  }
  out.sort((a, b) => b.df - a.df || a.term.localeCompare(b.term));
  return out.slice(0, Math.max(0, limit)).map((entry) => entry.term);
}