import type { Metadata } from "next";
import Link from "next/link";
import { CHRONICLE_SPAN, ERAS, TECHNIQUES } from "@repo/seed";
import { sortEras } from "@repo/core";
import { ChronicleMachine } from "@/components/chronicle/chronicle-machine";
import { formatSpan, formatYear } from "@/components/atlas/format";

export const metadata: Metadata = {
  title: "Chronicle — how we aligned",
  description:
    "Thirty-two eras of alignment, from Socrates and the dialogue method to RLHF, Constitutional AI, weak-to-strong generalisation and the frontier reasoning era — scrub the year and watch the stack rebuild.",
};

export default function ChroniclePage() {
  const ordered = sortEras(ERAS);

  return (
    <div>
      <header className="max-w-3xl">
        <p className="eyebrow">Chronicle · {formatYear(CHRONICLE_SPAN.from)} to {formatYear(CHRONICLE_SPAN.to)}</p>
        <h1 className="serif mt-4 text-4xl leading-tight text-parchment">How we aligned</h1>
        <p className="mt-5 text-lg leading-relaxed text-parchment-dim">
          Alignment did not start in 2023 and it is not a technical problem that appeared with
          computers. It is at least as old as the argument about whether you should do what you can. This
          is the whole run: which methods existed, what was argued, and what was decided — with the
          stack itself rebuilding as you scrub.
        </p>
        <p className="mt-4 text-base leading-relaxed text-parchment-dim/90">
          The honest reading is that the last decade moved the implementation enormously and the
          disagreement not at all.
        </p>
      </header>

      <ChronicleMachine eras={ordered} techniques={TECHNIQUES} />

      <section className="mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="serif text-2xl text-parchment">Every era</h2>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-parchment-dim/70">
            {ordered.length} eras
          </span>
        </div>
        <ol className="mt-8 border-l border-abyss-border">
          {ordered.map((era) => (
            <li key={era.id} className="relative pb-8 pl-8">
              <span
                className="absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full bg-gold"
                aria-hidden
              />
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-parchment-dim/70">
                {formatSpan(era.startYear, era.endYear)} · {era.domain}
              </p>
              <Link href={`/chronicle/${era.slug}`} className="serif mt-1 block text-xl text-parchment hover:text-gold">
                {era.title}
              </Link>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-parchment-dim">{era.summary}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
