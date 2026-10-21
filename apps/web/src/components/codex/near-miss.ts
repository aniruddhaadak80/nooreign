/**
 * "Did you mean" for the codex query box.
 *
 * WHY this sits next to `term-card.tsx` rather than in `lib/codex-index.ts`: the client island must
 * not import the corpus, and this half of the query story is pure — parse, correct, serialise — so it
 * is safe in the browser bundle and testable without a DOM or a server.
 *
 * WHY the candidates are complete queries rather than bare words: the query language has structure. A
 * correction must not swallow a quoted phrase, a `kind:` filter or an exclusion, so those pass through
 * untouched and only plain terms and excluded terms are corrected. The reader gets one chip that fixes
 * every typo at once, then one per typo, so a correction can be accepted without losing the rest.
 */
import { didYouMean, parseQuery } from "@repo/core";
import type { ParsedQuery, SearchIndex } from "@repo/core";

/** One suggested replacement query for the strip under the search box. */
export interface QueryCorrection {
  /** The full query to put back in the field if the reader accepts. */
  readonly query: string;
  /** The typed word(s) this candidate changes, in query order. */
  readonly replaced: readonly string[];
}

/**
 * How many candidates the strip may offer. Three is the point where a correction stops being a nudge
 * and starts being a menu.
 */
const DEFAULT_LIMIT = 3;

interface Fix {
  readonly typed: string;
  readonly suggestion: string;
  readonly negated: boolean;
}

export function queryCorrections(index: SearchIndex, raw: string, limit = DEFAULT_LIMIT): QueryCorrection[] {
  if (limit <= 0) return [];
  const parsed = parseQuery(raw);

  const fixes = [...corrected(index, parsed.terms, false), ...corrected(index, parsed.exclude, true)];
  if (fixes.length === 0) return [];

  const candidates: QueryCorrection[] = [];
  const seen = new Set<string>();
  const offer = (applied: readonly Fix[]): void => {
    const query = serialise(parsed, applied);
    if (seen.has(query)) return;
    seen.add(query);
    candidates.push({ query, replaced: applied.map((fix) => fix.typed) });
  };

  // Fix everything first: when two words are wrong, one click beats two. The per-word chips follow so
  // the reader can disagree with a single correction without losing the rest of the query.
  if (fixes.length > 1) offer(fixes);
  for (const fix of fixes) offer([fix]);

  return candidates.slice(0, limit);
}

/** Every word the index does not contain gets its nearest index term, if one is close enough. */
function corrected(index: SearchIndex, words: readonly string[], negated: boolean): Fix[] {
  const fixes: Fix[] = [];
  for (const word of words) {
    const [suggestion] = didYouMean(index, word, { limit: 1 });
    // `didYouMean` returns an exact term first, so a word the corpus contains is never "corrected" to
    // something else — an empty result set for a real term is the query's doing, not a typo's.
    if (suggestion === undefined || suggestion === word) continue;
    fixes.push({ typed: word, suggestion, negated });
  }
  return fixes;
}

/** Rebuild the query in canonical order: filters, phrases, terms, exclusions. */
function serialise(parsed: ParsedQuery, applied: readonly Fix[]): string {
  const swapped = new Map<string, string>();
  for (const fix of applied) swapped.set(`${fix.negated ? "-" : ""}${fix.typed}`, fix.suggestion);

  const parts: string[] = [];
  for (const kind of parsed.kinds) parts.push(`kind:${kind}`);
  for (const phrase of parsed.phrases) parts.push(`"${phrase.join(" ")}"`);
  for (const term of parsed.terms) parts.push(swapped.get(term) ?? term);
  for (const term of parsed.exclude) parts.push(`-${swapped.get(`-${term}`) ?? term}`);
  return parts.join(" ");
}
