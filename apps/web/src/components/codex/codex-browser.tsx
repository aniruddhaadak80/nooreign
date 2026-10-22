"use client";

import { useMemo, useState } from "react";
import { buildIndex, suggest } from "@repo/core";
import type { SearchIndex } from "@repo/core";
import type { CodexFacet } from "@/lib/codex-index";
import { isRankingQuery, rankCodex, TermCard, toSearchableDocs } from "./term-card";
import type { CodexDoc, CodexResult } from "./term-card";
import { queryCorrections } from "./near-miss";
import { SearchField } from "./search-field";

/**
 * The codex browser.
 *
 * The whole index page is a client island for one reason: a hundred and twenty terms and twenty-eight
 * canon texts have to be filterable without a round trip, and the alternative — an API route — would
 * mean shipping a second implementation of the ranking to the browser anyway. The index is rebuilt
 * client-side from the same serialisable documents the server rendered from, using the same
 * `@repo/core` engine and the same `rankCodex`, so the two orderings cannot drift.
 *
 * When a query finds nothing, the strip under the field offers the closest queries the corpus can
 * actually answer (`queryCorrections`), which is the one useful thing left to say. It stays hidden
 * while results are on screen: a correction next to working results is noise.
 *
 * Without JavaScript this component still renders the complete codex: `rankCodex` treats an empty
 * query as browsing, which returns every document in the atlas's curated order.
 */

/** How many ranked results each family shows before the list becomes noise rather than a result. */
const RANKED_LIMIT = 24;

/** The word currently being typed, if any — completions only make sense for a partial word. */
const TRAILING_WORD = /([^\s"]+)$/;

function completions(index: SearchIndex, raw: string): readonly string[] {
  const token = TRAILING_WORD.exec(raw)?.[1] ?? "";
  const needle = token.startsWith("-") ? token.slice(1) : token;
  return needle.length < 2 ? [] : suggest(index, needle, 6);
}

export interface CodexBrowserProps {
  readonly docs: readonly CodexDoc[];
  readonly facets: readonly CodexFacet[];
}

export function CodexBrowser({ docs, facets }: CodexBrowserProps) {
  const [raw, setRaw] = useState("");
  const [kind, setKind] = useState<string | null>(null);

  const index = useMemo(() => buildIndex(toSearchableDocs(docs)), [docs]);
  const results = useMemo(
    () => rankCodex(index, docs, raw, kind === null ? {} : { kinds: [kind] }),
    [index, docs, raw, kind],
  );
  const ranking = useMemo(() => isRankingQuery(raw), [raw]);
  const suggestions = useMemo(() => completions(index, raw), [index, raw]);
  const corrections = useMemo(
    () => (results.length === 0 ? queryCorrections(index, raw) : []),
    [index, raw, results],
  );

  const termResults = useMemo(() => results.filter((r) => r.doc.family === "term"), [results]);
  const textResults = useMemo(() => results.filter((r) => r.doc.family === "text"), [results]);

  return (
    <div className="mt-10">
      <SearchField
        value={raw}
        onChange={setRaw}
        suggestions={suggestions}
        counts={{
          terms: termResults.length,
          texts: textResults.length,
          totalTerms: docs.filter((doc) => doc.family === "term").length,
          totalTexts: docs.filter((doc) => doc.family === "text").length,
        }}
      />

      {corrections.length === 0 ? null : (
        <div className="mt-4" aria-live="polite">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-parchment-dim/70">
            Did you mean
          </p>
          <ul
            data-testid="codex-did-you-mean"
            aria-label="Suggested corrections"
            className="mt-2 flex flex-wrap items-center gap-2"
          >
            {corrections.map((correction) => (
              <li key={correction.query}>
                <button
                  type="button"
                  onClick={() => setRaw(correction.query)}
                  className="rounded-full border border-verdigris/40 bg-verdigris/5 px-2.5 py-0.5 font-mono text-[11px] text-verdigris transition-colors hover:border-verdigris"
                >
                  {correction.query}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by kind">
        {facets.map((facet) => (
          <button
            key={facet.kind}
            type="button"
            aria-pressed={kind === facet.kind}
            onClick={() => setKind((current) => (current === facet.kind ? null : facet.kind))}
            className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
              kind === facet.kind
                ? "border-gold bg-gold/15 text-gold"
                : "border-abyss-border text-parchment-dim/70 hover:border-parchment-dim"
            }`}
          >
            {facet.kind} {facet.count}
          </button>
        ))}
      </div>

      <CodexSection
        id="codex-terms"
        heading="The vocabulary"
        total={termResults.length}
        noun="terms"
        results={ranking ? termResults.slice(0, RANKED_LIMIT) : termResults}
      />
      <CodexSection
        id="codex-canon"
        heading="Canon"
        total={textResults.length}
        noun="texts"
        results={ranking ? textResults.slice(0, RANKED_LIMIT) : textResults}
      />
    </div>
  );
}

function CodexSection({
  id,
  heading,
  total,
  noun,
  results,
}: {
  readonly id: string;
  readonly heading: string;
  readonly total: number;
  readonly noun: string;
  readonly results: readonly CodexResult[];
}) {
  const truncated = results.length < total;
  return (
    <section aria-labelledby={id} className="mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-abyss-border pb-3">
        <h2 id={id} className="serif text-2xl text-parchment">
          {heading}
        </h2>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-parchment-dim/70">
          {total} {noun}
        </p>
      </div>

      {results.length === 0 ? (
        <p className="mt-6 rounded-realm border border-dashed border-abyss-border p-8 text-sm text-parchment-dim">
          Nothing in the codex matches that. The Moorean response is: so far, no one has.
        </p>
      ) : (
        <>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {results.map((result) => (
              <li key={result.doc.id}>
                <TermCard result={result} />
              </li>
            ))}
          </ul>
          {truncated ? (
            <p className="mt-4 font-mono text-[11px] text-parchment-dim/60">
              Showing the strongest {results.length} of {total} {noun}. Narrow the query to see the rest.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}