import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GLOSSARY, getGlossaryEntry, getKingdom } from "@repo/seed";
import type { GlossaryEntry } from "@repo/seed";
import { KindBadge } from "@/components/codex/term-card";
import { canonCiting, kindGloss, realmsLeaningOn } from "@/lib/codex-index";

/**
 * Every term in the codex has a page, and every page is known at build time, so there is no fallback
 * to render: an unknown slug is a 404, not a dynamic page. Without this, hosting platforms that wrap
 * SSG routes in a catch-all lambda fail the build.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return GLOSSARY.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = getGlossaryEntry(slug);
  if (!entry) return { title: "Term not found" };
  const realm = entry.kingdomId === null ? null : getKingdom(entry.kingdomId);
  const where = realm === null || realm === undefined ? "the whole atlas" : realm.name;
  return {
    title: entry.term,
    description: `${entry.short} — a ${entry.kind} term of the Nooreign codex, ${where} leans on it.`,
    openGraph: { title: `${entry.term} · Codex`, description: entry.short },
  };
}

export default async function TermPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getGlossaryEntry(slug);
  if (!entry) notFound();

  const kingdom = entry.kingdomId === null ? undefined : getKingdom(entry.kingdomId);
  const relatives = entry.seeAlso
    .map((other) => getGlossaryEntry(other))
    .filter((other): other is GlossaryEntry => other !== undefined);
  const leaning = realmsLeaningOn(entry.kind);
  const canon = canonCiting(entry.slug, 4);

  return (
    <article className="flex flex-col gap-14">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-parchment-dim">
          <li>
            <Link href="/codex" className="transition-colors hover:text-gold">
              Codex
            </Link>
          </li>
          <li aria-hidden className="text-parchment-dim/40">
            /
          </li>
          <li aria-current="page" className="text-parchment">
            {entry.term}
          </li>
        </ol>
      </nav>

      <header className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <KindBadge kind={entry.kind} />
          {kingdom === undefined ? null : (
            <Link
              href={`/kingdoms/${kingdom.slug}`}
              className="inline-flex items-center gap-2 rounded-full border border-abyss-border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim transition-colors hover:border-gold hover:text-gold"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: kingdom.crest.primary }} aria-hidden />
              {kingdom.name}
            </Link>
          )}
        </div>
        <h1 className="serif mt-5 text-4xl leading-tight text-parchment sm:text-5xl">{entry.term}</h1>
        <p className="mt-5 text-xl leading-relaxed text-parchment">{entry.short}</p>
      </header>

      <section aria-labelledby="definition" className="max-w-3xl">
        <h2 id="definition" className="eyebrow">
          What it commits you to
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-parchment-dim">{entry.long}</p>
      </section>

      <section aria-labelledby="realms" className="plate rounded-realm p-6 sm:p-8">
        <h2 id="realms" className="serif text-xl text-parchment">
          Which realms lean on this
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-parchment-dim">{kindGloss(entry.kind)}</p>
        <p className="mt-4 text-sm leading-relaxed text-parchment-dim">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">
            {entry.kind} · {leaning.length} {leaning.length === 1 ? "realm" : "realms"}
          </span>{" "}
          {leaning.length === 0 ? (
            <>— no realm claims this vocabulary as its own; it belongs to the codex rather than to a court.</>
          ) : (
            <>— {leaning.join(", ")}.</>
          )}
        </p>
      </section>

      {canon.length === 0 ? null : (
        <section aria-labelledby="canon">
          <h2 id="canon" className="serif text-2xl text-parchment">
            Canon that discusses this
          </h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {canon.map((result) => (
              <li key={result.doc.id}>
                <Link
                  href={result.doc.href}
                  className="plate flex h-full flex-col rounded-realm p-5 transition-colors hover:border-gold/50"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim/60">
                    {result.doc.kind}
                    {result.doc.year === null ? null : ` · ${result.doc.year < 0 ? `${Math.abs(result.doc.year)} BCE` : result.doc.year}`}
                  </p>
                  <h3 className="serif mt-1 text-lg text-parchment">{result.doc.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-parchment-dim">{result.doc.teaser}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="see-also">
        <h2 id="see-also" className="serif text-2xl text-parchment">
          See also
        </h2>
        {relatives.length === 0 ? (
          <p className="mt-4 text-sm text-parchment-dim">
            Nothing in the codex cross-references this term yet, which is a gap rather than a verdict.
          </p>
        ) : (
          <ul data-testid="codex-see-also" className="mt-6 grid gap-4 md:grid-cols-2">
            {relatives.map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/codex/${other.slug}`}
                  className="plate flex h-full flex-col rounded-realm p-5 transition-colors hover:border-gold/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="serif text-lg leading-tight text-parchment">{other.term}</h3>
                    <KindBadge kind={other.kind} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-parchment-dim">{other.short}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <nav className="flex flex-wrap gap-4 border-t border-abyss-border pt-8" aria-label="Codex navigation">
        <Link
          href="/codex"
          className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim transition-colors hover:text-gold"
        >
          ← The whole codex
        </Link>
        {kingdom === undefined ? null : (
          <Link
            href={`/kingdoms/${kingdom.slug}`}
            className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim transition-colors hover:text-gold"
          >
            {kingdom.name} →
          </Link>
        )}
      </nav>
    </article>
  );
}