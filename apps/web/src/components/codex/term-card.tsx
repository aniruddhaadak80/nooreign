/**
 * The client-safe half of the codex.
 *
 * `lib/codex-index.ts` owns the generated corpus and the server-side search singleton, and a client
 * island must not import it — the corpus is the whole atlas. So the document shape, the projection
 * onto the search engine's `SearchableDoc`, and the ranking the browser island performs live here
 * instead: small, pure, and free of the corpus.
 *
 * The payoff is that there is exactly one implementation of "what does this query return". The server
 * page, the client island and the vitest suite all call `rankCodex` over the same index, so the
 * no-JavaScript list, the interactive list and the tests cannot drift apart.
 */
import Link from "next/link";
import { parseQuery, query } from "@repo/core";
import type { SearchIndex, SearchableDoc } from "@repo/core";

/** Which of the codex's two families a document belongs to. */
export type CodexFamily = "term" | "text";

/** One row of the codex index: a glossary term or a canon text, flattened and made serialisable. */
export interface CodexDoc {
  readonly id: string;
  readonly family: CodexFamily;
  /** The value `kind:` filters on — the glossary kind, or the canon text's kind. */
  readonly kind: string;
  readonly title: string;
  readonly href: string;
  /** `null` for glossary terms, which are not dated. */
  readonly year: number | null;
  /** The curated one-line definition or summary. Always safe to show. */
  readonly teaser: string;
  /** Everything the index is allowed to match against. */
  readonly body: string;
  /** Realm name, cross-referenced term names and author names — folded into the searchable text. */
  readonly tags: readonly string[];
  /** The realm that owns this term or text, or null when no single realm does. */
  readonly realm: string | null;
}

/** A document plus whatever the engine had to say about why it matched. */
export interface CodexResult {
  readonly doc: CodexDoc;
  /** Dense window of the body, produced by the engine. Undefined while browsing rather than ranking. */
  readonly snippet: string | undefined;
  /** Relevance score. Null while browsing rather than ranking, where order is curated, not earned. */
  readonly score: number | null;
}

/** Projection onto the search engine. The corpus already stores `year: null`, which the engine models as absent. */
export function toSearchableDocs(docs: readonly CodexDoc[]): SearchableDoc[] {
  return docs.map((doc) => ({
    id: doc.id,
    title: doc.title,
    body: doc.body,
    kind: doc.kind,
    tags: doc.tags,
    ...(doc.year === null ? {} : { year: doc.year }),
  }));
}

/** A query the engine can actually rank: it contains at least one term or one quoted phrase. */
export function isRankingQuery(q: string): boolean {
  const parsed = parseQuery(q);
  return parsed.terms.length > 0 || parsed.phrases.length > 0;
}

export interface RankOptions {
  /** Extra kind filter, AND-ed with any `kind:` in the query string itself. */
  readonly kinds?: readonly string[];
  /** Narrow to one family. Both families still compete for rank before the filter is applied. */
  readonly family?: CodexFamily | null;
  readonly limit?: number;
}

/**
 * Rank the codex against `q`.
 *
 * A query made only of `kind:` filters and `-exclusions` has nothing to rank by, so the engine is
 * asked for every document it would otherwise score at zero (`minScore: -1`) and the codex's curated
 * order is kept. Exclusions and filters still apply, because they are the reader's intent even when
 * there is no relevance to compute.
 */
export function rankCodex(
  index: SearchIndex,
  docs: readonly CodexDoc[],
  q: string,
  opts: RankOptions = {},
): CodexResult[] {
  const ranking = isRankingQuery(q);
  const kinds = opts.kinds ?? [];
  const hits = query(index, q, {
    minScore: ranking ? 0 : -1,
    ...(kinds.length === 0 ? {} : { kinds }),
  });

  const byId = new Map(docs.map((doc) => [doc.id, doc]));
  const matched = new Map<string, CodexResult>();
  for (const hit of hits) {
    const doc = byId.get(hit.id);
    if (doc === undefined) continue;
    if (opts.family !== undefined && opts.family !== null && doc.family !== opts.family) continue;
    matched.set(doc.id, {
      doc,
      snippet: ranking ? hit.snippet : undefined,
      score: ranking ? hit.score : null,
    });
  }

  const ordered =
    ranking
      ? [...matched.values()]
      : // Curated order while browsing: the atlas decides, not the scoring function.
        docs.flatMap((doc) => {
          const result = matched.get(doc.id);
          return result === undefined ? [] : [result];
        });
  return opts.limit === undefined ? ordered : ordered.slice(0, Math.max(0, opts.limit));
}

/** Badge colours per codex kind. Mirrors `VerdictBadge`: an explicit class per key, never a computed one. */
const KIND_ACCENT: Readonly<Record<string, string>> = {
  alignment: "border-indigo-glow/60 bg-indigo-glow/10 text-indigo-glow",
  ethics: "border-verdigris/60 bg-verdigris/10 text-verdigris",
  philosophy: "border-gold/60 bg-gold/10 text-gold",
  governance: "border-crimson/60 bg-crimson/10 text-crimson",
  technical: "border-abyss-border bg-abyss/50 text-parchment-dim",
  primary: "border-abyss-border bg-abyss/50 text-parchment-dim",
  modern: "border-verdigris/40 bg-verdigris/5 text-verdigris",
  declaration: "border-crimson/40 bg-crimson/5 text-crimson",
};

export function KindBadge({ kind }: { readonly kind: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${
        KIND_ACCENT[kind] ?? "border-abyss-border text-parchment-dim"
      }`}
    >
      {kind}
    </span>
  );
}

function RealmLine({ realm, year }: { readonly realm: string | null; readonly year: number | null }) {
  if (realm === null && year === null) return null;
  return (
    <p className="mt-3 font-mono text-[11px] text-parchment-dim/60">
      {realm === null ? null : realm}
      {realm === null || year === null ? null : " · "}
      {year === null ? null : year < 0 ? `${Math.abs(year)} BCE` : year}
    </p>
  );
}

/**
 * One row of the codex. Used by the search island for ranked results and by the index page for the
 * unranked list, so the two cannot present a term differently.
 */
export function TermCard({ result }: { readonly result: CodexResult }) {
  const { doc, snippet, score } = result;
  return (
    <article
      data-testid={doc.family === "term" ? "codex-term" : "codex-text"}
      className="plate flex h-full flex-col rounded-realm p-5 transition-colors hover:border-gold/50"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="serif text-lg leading-tight text-parchment">
          <Link href={doc.href} className="transition-colors hover:text-gold">
            {doc.title}
          </Link>
        </h3>
        <KindBadge kind={doc.kind} />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-parchment-dim">{doc.teaser}</p>
      {snippet === undefined ? null : (
        <p className="mt-3 border-l-2 border-indigo-glow/40 pl-3 font-mono text-[11px] leading-relaxed text-parchment-dim/70">
          <span className="text-indigo-glow">match</span> {snippet}
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <RealmLine realm={doc.realm} year={doc.year} />
        {score === null ? null : (
          <span className="font-mono text-[11px] text-parchment-dim/50 tabular" title="Relevance score">
            {score.toFixed(2)}
          </span>
        )}
      </div>
    </article>
  );
}