"use client";

import type { ChangeEvent, FormEvent } from "react";

/**
 * The codex query box.
 *
 * The query language is the feature, so the field teaches it: three worked examples sit under the
 * input, each one a button that types itself, and the grammar is spelled out rather than left for the
 * reader to infer from a placeholder. Counts are announced politely because they change on every
 * keystroke and a screen reader user has no other way to know the result set moved.
 */
export interface CodexCounts {
  readonly terms: number;
  readonly texts: number;
  readonly totalTerms: number;
  readonly totalTexts: number;
}

export interface SearchFieldProps {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly suggestions: readonly string[];
  readonly counts: CodexCounts;
}

/** Worked examples, chosen to show each part of the grammar at once. */
const EXAMPLES: readonly { readonly label: string; readonly query: string }[] = [
  { label: '"instrumental convergence"', query: '"instrumental convergence"' },
  { label: "corrigibility -goodhart", query: "corrigibility -goodhart" },
  { label: "kind:ethics oversight", query: "kind:ethics oversight" },
];

export function SearchField({ value, onChange, suggestions, counts }: SearchFieldProps) {
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    // Search is live; there is nothing to submit to.
    event.preventDefault();
  };

  return (
    <form role="search" aria-label="Search the codex" onSubmit={submit}>
      <label htmlFor="codex-q" className="sr-only">
    Search terms, definitions and canon texts
      </label>
      <input
        id="codex-q"
        data-testid="codex-search"
        type="search"
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        placeholder="oversight, &quot;scalable oversight&quot;, -paperclip, kind:ethics"
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-realm border border-abyss-border bg-abyss-raised/70 px-4 py-3 font-mono text-sm text-parchment placeholder:text-parchment-dim/40 focus:border-gold focus:outline-none"
      />

      <p className="mt-3 font-mono text-[11px] leading-relaxed text-parchment-dim/70">
        Query language: <code className="text-parchment-dim">word</code> matches any indexed text ·{" "}
        <code className="text-parchment-dim">&quot;two words&quot;</code> scores the phrase as one ·{" "}
        <code className="text-parchment-dim">-word</code> removes a term ·{" "}
        <code className="text-parchment-dim">kind:ethics</code> keeps one kind only
      </p>

      <ul className="mt-3 flex flex-wrap items-center gap-2" aria-label="Query examples">
        {EXAMPLES.map((example) => (
          <li key={example.query}>
            <button
              type="button"
              onClick={() => onChange(example.query)}
              className="rounded-realm border border-abyss-border px-2.5 py-1 font-mono text-[11px] text-parchment-dim transition-colors hover:border-gold hover:text-gold"
            >
              {example.label}
            </button>
          </li>
        ))}
      </ul>

      {suggestions.length === 0 ? null : (
        <ul className="mt-3 flex flex-wrap items-center gap-2" aria-label="Completions for the last word">
          {suggestions.map((term) => (
            <li key={term}>
              <button
                type="button"
                onClick={() => onChange(term)}
                className="rounded-full border border-verdigris/40 bg-verdigris/5 px-2.5 py-0.5 font-mono text-[11px] text-verdigris transition-colors hover:border-verdigris"
              >
                {term}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p
        data-testid="codex-result-count"
        aria-live="polite"
        className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-parchment-dim"
      >
        {counts.terms} of {counts.totalTerms} terms · {counts.texts} of {counts.totalTexts} texts
      </p>
    </form>
  );
}