"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { GlossaryEntry, CanonText } from "@repo/seed";

/**
 * The codex index is a client island so a hundred and twenty entries stay
 * searchable without shipping every definition into the HTML of the landing page.
 */
export function CodexBrowser({ glossary, texts }: { glossary: GlossaryEntry[]; texts: CanonText[] }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<string | null>(null);

  const kinds = useMemo(() => [...new Set(glossary.map((entry) => entry.kind))].sort(), [glossary]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return glossary.filter((entry) => {
      if (kind && entry.kind !== kind) return false;
      if (!needle) return true;
      return `${entry.term} ${entry.short} ${entry.long}`.toLowerCase().includes(needle);
    });
  }, [glossary, query, kind]);

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex-1">
          <span className="sr-only">Search the codex</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search terms, definitions, doctrine…"
            className="w-full rounded-realm border border-abyss-border bg-abyss-raised/70 px-4 py-2.5 text-sm text-parchment placeholder:text-parchment-dim/50 focus:border-gold focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by kind">
          {kinds.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={kind === option}
              onClick={() => setKind((current) => (current === option ? null : option))}
              className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                kind === option
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-abyss-border text-parchment-dim/70 hover:border-parchment-dim"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 font-mono text-[11px] text-parchment-dim/70" aria-live="polite">
        {results.length} of {glossary.length} terms
      </p>

      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {results.map((entry) => (
          <li key={entry.slug}>
            <Link
              href={`/codex/${entry.slug}`}
              className="plate flex h-full flex-col gap-2 rounded-realm p-5 transition-colors hover:border-gold/50"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="serif text-lg leading-tight text-parchment">{entry.term}</h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-parchment-dim/60">
                  {entry.kind}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-parchment-dim">{entry.short}</p>
            </Link>
          </li>
        ))}
      </ul>

      {results.length === 0 ? (
        <p className="mt-10 rounded-realm border border-dashed border-abyss-border p-8 text-center text-sm text-parchment-dim">
          Nothing in the codex matches that. The Moorean response is: so far, no one has.
        </p>
      ) : null}

      <section className="mt-20">
        <h2 className="serif text-2xl text-parchment">Canon</h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-parchment-dim">
          The primary texts the kingdoms stand on. Excerpts are quoted only where the wording is certain;
          everything else is marked as a paraphrase rather than dressed up as verbatim.
        </p>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {texts.map((text) => (
            <li key={text.id} className="plate rounded-realm p-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-parchment-dim/60">
                  {text.year < 0 ? `${Math.abs(text.year)} BCE` : text.year} · {text.kind}
                </p>
              </div>
              <h3 className="serif mt-1 text-lg text-parchment">{text.title}</h3>
              <p className="mt-1 text-sm text-parchment-dim">{text.author}</p>
              <p className="mt-3 border-l-2 border-gold/40 pl-3 text-sm italic leading-relaxed text-parchment-dim/90">
                “{text.excerpt}”
              </p>
              <p className="mt-3 text-sm leading-relaxed text-parchment-dim/80">{text.summary}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
