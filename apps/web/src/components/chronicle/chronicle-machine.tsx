"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Era, Technique } from "@repo/seed";
import { formatYear } from "@/components/atlas/format";
import { eraAtYear, progressOf, stackAtYear } from "@repo/core";

/**
 * The time machine: scrub the year and the alignment stack rebuilds itself.
 *
 * Everything here is derived from the seed data plus the pure timeline functions —
 * there is no fetch, no client cache and no LLM. Scrubbing is instant because the
 * answer for any year is a filter over 32 eras and 20 techniques.
 */
export function ChronicleMachine({ eras, techniques }: { eras: readonly Era[]; techniques: readonly Technique[] }) {
  const ordered = useMemo(() => [...eras].sort((a, b) => a.startYear - b.startYear), [eras]);
  const [year, setYear] = useState(2026);

  const active = eraAtYear(ordered, year);
  const stack = stackAtYear(techniques, year);
  const stackIds = new Set(stack.map((t) => t.id));

  const era = active ?? undefined;
  const progress = era ? progressOf(techniques, era) : undefined;

  // Every milestone that has already happened at the current year.
  const milestones = ordered
    .flatMap((e) => e.landmarks.map((l) => ({ ...l, era: e })))
    .filter((l) => l.year <= year)
    .sort((a, b) => b.year - a.year)
    .slice(0, 8);

  return (
    <div className="mt-10">
      <div className="plate rounded-realm p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="eyebrow">Scrub the year</p>
          <output
            className="serif text-4xl text-gold tabular"
            aria-live="polite"
            aria-label={`Selected year ${formatYear(year)}`}
            data-testid="year-display"
          >
            {formatYear(year)}
          </output>
        </div>

        <label className="mt-6 block">
          <span className="sr-only">Scrub the year</span>
          <input
            data-testid="year-slider"
            type="range"
            min={ordered[0]?.startYear ?? -500}
            max={2026}
            step={1}
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="w-full accent-gold"
          />
        </label>

        <div className="mt-2 flex justify-between font-mono text-[11px] text-parchment-dim/70">
          <span>{formatYear(ordered[0]?.startYear ?? -500)}</span>
          <span>{formatYear(2026)}</span>
        </div>

        {era ? (
          <div className="mt-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-indigo-glow/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-indigo-glow">
                {era.domain}
              </span>
              <Link href={`/chronicle/${era.slug}`} className="serif text-xl text-parchment hover:text-gold">
                {era.title}
              </Link>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-parchment-dim">{era.summary}</p>
            <div className="mt-6">
              <div className="flex items-baseline justify-between font-mono text-[11px] text-parchment-dim/70">
                <span>alignment stack available</span>
                <span className="tabular">
                  {progress ? `${progress.available}/${progress.total}` : `${stack.length}/${techniques.length}`}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-abyss-border">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-glow to-gold"
                  style={{ width: `${progress ? Math.round(progress.share * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-8 text-sm leading-relaxed text-parchment-dim">
            Between recorded eras. The methods in use at this point are the ones already available; the
            argument in progress is whatever the last milestone implied.
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="plate rounded-realm p-6">
          <h2 className="eyebrow">Techniques in existence ({stack.length})</h2>
          <ul className="mt-4 space-y-1.5">
            {techniques.map((technique) => {
              const available = stackIds.has(technique.id);
              return (
                <li
                  key={technique.id}
                  className={`flex items-baseline justify-between gap-3 text-sm ${
                    available ? "text-parchment" : "text-parchment-dim/35"
                  }`}
                >
                  <span>
                    {available ? "◈" : "◇"} {technique.name}
                  </span>
                  <span className="font-mono text-[11px] tabular">
                    {technique.introduced < 0 ? `${Math.abs(technique.introduced)} BCE` : technique.introduced}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="plate rounded-realm p-6">
          <h2 className="eyebrow">Most recent milestones</h2>
          <ol className="mt-4 space-y-3">
            {milestones.map((milestone) => (
              <li key={`${milestone.era.id}-${milestone.title}`} className="border-l border-abyss-border pl-4">
                <p className="font-mono text-[11px] text-gold tabular">{formatYear(milestone.year)}</p>
                <p className="text-sm text-parchment">{milestone.title}</p>
                <p className="text-xs leading-relaxed text-parchment-dim/80">{milestone.note}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
