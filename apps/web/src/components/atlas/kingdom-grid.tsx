"use client";

import { useMemo, useState } from "react";
import type { Kingdom } from "@repo/seed";
import { KingdomCard } from "./kingdom-card";
import { VerdictBadge } from "./verdict-badge";

const VERDICTS = ["optimistic", "guarded", "skeptical", "transformative"] as const;

/**
 * Filtering is the only interactive part of the atlas index: twelve realms is a
 * list a person can read, but the interesting question is "who is optimistic about
 * superintelligence", which is one click.
 */
export function KingdomGrid({ kingdoms }: { kingdoms: readonly Kingdom[] }) {
  const [query, setQuery] = useState("");
  const [verdict, setVerdict] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return kingdoms.filter((kingdom) => {
      if (verdict && kingdom.aiStance.verdict !== verdict) return false;
      if (!needle) return true;
      const haystack = [
        kingdom.name,
        kingdom.motto,
        kingdom.founder,
        kingdom.terrain,
        kingdom.aiStance.headline,
        kingdom.aiStance.note,
        kingdom.questions.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [kingdoms, query, verdict]);

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex flex-1 items-center gap-3">
          <span className="sr-only">Search kingdoms</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search realms, founders, doctrines…"
            className="w-full rounded-realm border border-abyss-border bg-abyss-raised/70 px-4 py-2.5 text-sm text-parchment placeholder:text-parchment-dim/50 focus:border-gold focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by verdict">
          {VERDICTS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={verdict === option}
              onClick={() => setVerdict((current) => (current === option ? null : option))}
              className="rounded-full transition-transform hover:scale-[1.03]"
            >
              <VerdictBadge verdict={option} className={verdict === option ? "ring-2 ring-gold/60" : "opacity-60"} />
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 font-mono text-[11px] text-parchment-dim/70" aria-live="polite">
        {filtered.length} of {kingdoms.length} realms shown
      </p>

      <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((kingdom) => (
          <li key={kingdom.id}>
            <KingdomCard kingdom={kingdom} />
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <p className="mt-10 rounded-realm border border-dashed border-abyss-border p-8 text-center text-sm text-parchment-dim">
          No realm matches that. The Stoa would call it a well-formed question with an unhelpful answer.
        </p>
      ) : null}
    </div>
  );
}
