import Link from "next/link";
import { ATLAS_STATS, DILEMMAS, ERAS, KINGDOMS } from "@repo/seed";
import { AtlasPlate } from "@/components/atlas/atlas-plate";
import { DilemmaTeaser } from "@/components/atlas/dilemma-teaser";
import { EraRailPreview } from "@/components/atlas/era-rail-preview";

const CAPABILITIES: { want: string; open: string; get: string }[] = [
  {
    want: "see how a moral tradition would rule on superintelligence",
    open: "/council",
    get: "a convened court, a verdict, and every number that produced it",
  },
  {
    want: "read the reasoning, not the conclusion",
    open: "/council",
    get: "per-advisor traces with the six-axis arithmetic shown",
  },
  {
    want: "understand where a school of thought came from",
    open: "/chronicle",
    get: "thirty-two eras, Socrates to frontier reasoning models",
  },
  {
    want: "check what the alignment stack can actually see",
    open: "/observatory",
    get: "a coverage matrix over the moral axes — and the gaps nobody has closed",
  },
  {
    want: "grind the classic thought experiments",
    open: "/experiments",
    get: "parameter sweeps with monotone, defensible models",
  },
  {
    want: "look a term up",
    open: "/codex",
    get: "a hundred and twenty entries, no jargon left undefined",
  },
];

export default function LandingPage() {
  const highlightEras = [...ERAS]
    .sort((a, b) => {
      const weightA = a.landmarks.reduce((sum, l) => sum + l.weight, 0);
      const weightB = b.landmarks.reduce((sum, l) => sum + l.weight, 0);
      return weightB - weightA || a.startYear - b.startYear;
    })
    .slice(0, 6);

  const teaser = DILEMMAS.slice()
    .sort((a, b) => b.aiRelevance - a.aiRelevance)
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-24">
      {/* ---------------------------------------------------------------- */}
      <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="eyebrow">An atlas of alignment · est. {ATLAS_STATS.kingdoms} realms</p>
          <h1 className="serif mt-5 text-4xl leading-[1.08] tracking-tight text-parchment sm:text-5xl lg:text-[3.4rem]">
            The ethics of human versus superintelligence, laid out as a country you can walk.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-parchment-dim">
            Twelve kingdoms of moral thought. Twenty-eight advisors who actually held the positions they
            are given here. Twenty dilemmas where the calculus breaks. And a time machine that replays
            how we tried to align — from Aristotle&rsquo;s mean to Constitutional AI — with the whole
            stack rebuilding itself as you scrub.
          </p>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-parchment-dim/80">
            Every deliberation on this site is computed locally from axiom vectors and seeded argument
            graphs. No API keys, no model calls, no telemetry. The same court always returns the same
            verdict, and you can read the arithmetic that got there.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/kingdoms"
              className="rounded-realm bg-gold px-5 py-2.5 font-mono text-sm font-medium tracking-wide text-ink transition-transform hover:-translate-y-0.5"
            >
              Enter the atlas
            </Link>
            <Link
              href="/council"
              className="rounded-realm border border-abyss-border px-5 py-2.5 font-mono text-sm tracking-wide text-parchment transition-colors hover:border-gold hover:text-gold"
            >
              Convene a council
            </Link>
            <Link href="/method" className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim/70 hover:text-gold">
              How it decides →
            </Link>
          </div>
        </div>
        <AtlasPlate />
      </section>

      {/* ---------------------------------------------------------------- */}
      <section>
        {/*
          A list, not a definition list: a `<dl>` may only contain `dt`/`dd`
          groups, and each stat carries a descriptive note alongside its value.
          The note belongs inside the `li`, which is where the semantics allow it.
        */}
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-realm border border-abyss-border bg-abyss-border sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "kingdoms", value: ATLAS_STATS.kingdoms, note: "schools of thought" },
            { label: "advisors", value: ATLAS_STATS.advisors, note: "on the courts" },
            { label: "eras", value: ATLAS_STATS.eras, note: "2,500 years of it" },
            { label: "dilemmas", value: ATLAS_STATS.dilemmas, note: "where it breaks" },
            { label: "techniques", value: ATLAS_STATS.techniques, note: "stack towers" },
            { label: "glossary", value: ATLAS_STATS.glossary, note: "terms defined" },
          ].map((stat) => (
            <li key={stat.label} className="bg-abyss px-5 py-6">
              <p className="eyebrow">{stat.label}</p>
              <p className="serif mt-2 text-3xl text-parchment tabular">{stat.value}</p>
              <p className="mt-1 text-xs text-parchment-dim/70">{stat.note}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">The realms</p>
            <h2 className="serif mt-3 text-3xl text-parchment">Twelve kingdoms, and what each one does to a machine</h2>
          </div>
          <Link href="/kingdoms" className="font-mono text-xs uppercase tracking-[0.18em] text-gold hover:text-parchment">
            All kingdoms →
          </Link>
        </div>
        <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {KINGDOMS.map((kingdom) => (
            <li key={kingdom.id}>
              <Link
                href={`/kingdoms/${kingdom.slug}`}
                className="plate flex h-full flex-col gap-3 rounded-realm p-5 transition-colors hover:border-gold/50"
                style={{ borderLeft: `3px solid ${kingdom.crest.primary}` }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm"
                    style={{ backgroundColor: `${kingdom.crest.primary}1f`, color: kingdom.crest.primary }}
                    aria-hidden
                  >
                    {kingdom.glyph}
                  </span>
                  <div>
                    <h3 className="serif text-lg leading-tight text-parchment">{kingdom.name}</h3>
                    <p className="font-mono text-[11px] text-parchment-dim/70">
                      {kingdom.founded < 0 ? `${Math.abs(kingdom.founded)} BCE` : kingdom.founded} · {kingdom.founder}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-parchment-dim">{kingdom.motto}</p>
                <p className="mt-auto pt-2 text-xs leading-relaxed text-parchment-dim/80">{kingdom.aiStance.headline}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">How we aligned</p>
            <h2 className="serif mt-3 text-3xl text-parchment">The chronicle, from Socrates to the frontier</h2>
          </div>
          <Link href="/chronicle" className="font-mono text-xs uppercase tracking-[0.18em] text-gold hover:text-parchment">
            Open the time machine →
          </Link>
        </div>
        <EraRailPreview eras={highlightEras} />
      </section>

      {/* ---------------------------------------------------------------- */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Where the calculus breaks</p>
            <h2 className="serif mt-3 text-3xl text-parchment">Twenty dilemmas the courts cannot dodge</h2>
          </div>
          <Link href="/dilemmas" className="font-mono text-xs uppercase tracking-[0.18em] text-gold hover:text-parchment">
            All dilemmas →
          </Link>
        </div>
        <DilemmaTeaser dilemmas={teaser} />
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="eyebrow">What you can do here</p>
          <h2 className="serif mt-3 text-3xl text-parchment">Built to be used, not admired</h2>
          <div className="mt-8 overflow-hidden rounded-realm border border-abyss-border">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-abyss-border bg-abyss-raised/60">
                  <th scope="col" className="eyebrow px-5 py-3">I want to…</th>
                  <th scope="col" className="eyebrow px-5 py-3">Open</th>
                  <th scope="col" className="eyebrow hidden px-5 py-3 sm:table-cell">And get</th>
                </tr>
              </thead>
              <tbody>
                {CAPABILITIES.map((row) => (
                  <tr key={row.want} className="border-b border-abyss-border/60 last:border-0">
                    <td className="px-5 py-3.5 text-parchment">{row.want}</td>
                    <td className="px-5 py-3.5">
                      <Link href={row.open} className="font-mono text-xs text-gold hover:underline">
                        {row.open}
                      </Link>
                    </td>
                    <td className="hidden px-5 py-3.5 text-parchment-dim sm:table-cell">{row.get}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="plate rounded-realm p-6">
          <p className="eyebrow">Why it is deterministic</p>
          <h3 className="serif mt-3 text-xl text-parchment">A court that can be audited</h3>
          <p className="mt-3 text-sm leading-relaxed text-parchment-dim">
            Each advisor is a six-axis weight vector. Each option carries six deltas. A deliberation is
            the dot product, rounded and seeded — so the trace the court shows you is not a
            post-hoc explanation of a language model&rsquo;s answer; it <em>is</em> the answer.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-parchment-dim">
            Change a weight, change a verdict, and watch which advisor moved. That is the whole product
            in one sentence.
          </p>
          <Link
            href="/method"
            className="mt-5 inline-block font-mono text-xs uppercase tracking-[0.18em] text-gold hover:text-parchment"
          >
            Read the method →
          </Link>
        </aside>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section>
        <p className="eyebrow">The alignment stack</p>
        <h2 className="serif mt-3 text-3xl text-parchment">Six kinds of technique, one uncomfortable gap</h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-parchment-dim">
          The observatory scores every technique in the stack by maturity, adoption and cost, then asks
          the question alignment writing usually avoids: which moral axes can these techniques even
          speak to? The answer is not the one anyone wants.
        </p>
        <Link
          href="/observatory"
          className="mt-6 inline-block rounded-realm border border-abyss-border px-5 py-2.5 font-mono text-sm text-parchment transition-colors hover:border-gold hover:text-gold"
        >
          Open the observatory
        </Link>
      </section>
    </div>
  );
}
