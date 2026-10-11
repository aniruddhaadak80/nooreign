import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ERAS, TECHNIQUES, getAdvisor, getEra, getKingdom, getTechnique, techniquesAtEndOfEra } from "@repo/seed";
import { formatSpan, formatYear } from "@/components/atlas/format";

/**
 * Every realm, court, era, dilemma and experiment is known at build time, so
 * there is no fallback to render: an unknown slug is a 404, not a dynamic page. Without
 * this, hosting platforms that wrap SSG routes in a catch-all lambda fail the build.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return ERAS.map((era) => ({ slug: era.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const era = getEra(slug);
  if (!era) return { title: "Era not found" };
  return {
    title: `${era.title} (${formatSpan(era.startYear, era.endYear)})`,
    description: era.summary.slice(0, 180),
  };
}

export default async function EraPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const era = getEra(slug);
  if (!era) notFound();

  const available = techniquesAtEndOfEra(era);
  const figures = era.figures.map((id) => ({ id, advisor: getAdvisor(id), kingdom: getKingdom(id) }));

  return (
    <article className="flex flex-col gap-14">
      <header>
        <p className="eyebrow">
          {era.domain} · {formatSpan(era.startYear, era.endYear)}
        </p>
        <h1 className="serif mt-4 text-4xl leading-tight text-parchment">{era.title}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-parchment-dim">{era.summary}</p>
        {era.quote ? (
          <blockquote className="serif mt-8 border-l-2 border-gold/60 pl-5 text-xl italic leading-relaxed text-parchment">
            “{era.quote.text}”
            <footer className="mt-3 font-sans text-sm not-italic text-parchment-dim/80">— {era.quote.attribution}</footer>
          </blockquote>
        ) : null}
      </header>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="plate rounded-realm p-6">
          <h2 className="eyebrow">Advances</h2>
          <ul className="mt-4 space-y-2">
            {era.advances.map((advance) => (
              <li key={advance} className="flex gap-3 text-sm leading-relaxed text-parchment-dim">
                <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-verdigris" />
                {advance}
              </li>
            ))}
          </ul>
        </div>
        <div className="plate rounded-realm p-6">
          <h2 className="eyebrow">Landmarks</h2>
          <ol className="mt-4 space-y-3">
            {era.landmarks.map((landmark) => (
              <li key={landmark.title} className="border-l border-abyss-border pl-4">
                <p className="font-mono text-[11px] text-gold tabular">{formatYear(landmark.year)}</p>
                <p className="text-sm text-parchment">{landmark.title}</p>
                <p className="text-xs leading-relaxed text-parchment-dim/80">{landmark.note}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section>
        <h2 className="serif text-2xl text-parchment">Who was arguing</h2>
        <ul className="mt-6 flex flex-wrap gap-2">
          {figures.map(({ id, advisor, kingdom }) => (
            <li key={id}>
              {advisor ? (
                <Link
                  href={`/court/${advisor.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-abyss-border px-3 py-1.5 text-sm text-parchment-dim transition-colors hover:border-gold hover:text-gold"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: advisor.portrait.hue }} aria-hidden />
                  {advisor.name}
                </Link>
              ) : kingdom ? (
                <Link
                  href={`/kingdoms/${kingdom.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-abyss-border px-3 py-1.5 text-sm text-parchment-dim transition-colors hover:border-gold hover:text-gold"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: kingdom.crest.primary }} aria-hidden />
                  {kingdom.name}
                </Link>
              ) : (
                <span className="inline-flex items-center rounded-full border border-abyss-border px-3 py-1.5 text-sm text-parchment-dim">
                  {id.replace(/-/g, " ")}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="serif text-2xl text-parchment">
          Alignment stack at {formatYear(era.endYear)} ({available.length} of {TECHNIQUES.length} techniques)
        </h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {available.map((technique) => (
            <li key={technique.id} className="plate rounded-realm p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="serif text-lg text-parchment">{technique.name}</h3>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-parchment-dim/70">
                  {technique.kind}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-parchment-dim">{technique.summary}</p>
              {technique.paper ? (
                <p className="mt-3 font-mono text-[11px] leading-relaxed text-parchment-dim/70">
                  {technique.paper.authors} · {technique.paper.title} · {technique.paper.venue} {technique.paper.year}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <nav className="flex flex-wrap gap-3 border-t border-abyss-border pt-8" aria-label="Era navigation">
        <Link href="/chronicle" className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold">
          ← The chronicle
        </Link>
        <Link href="/observatory" className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold">
          The observatory →
        </Link>
      </nav>

      <p className="sr-only">
        Techniques introduced in this era:{" "}
        {era.techniques.map((id) => getTechnique(id)?.name ?? id).join(", ")}
      </p>
    </article>
  );
}
