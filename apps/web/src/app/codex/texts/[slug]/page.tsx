import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TEXTS, getKingdom, getText } from "@repo/seed";
import { formatYear } from "@/components/atlas/format";
import { KindBadge } from "@/components/codex/term-card";
import { termsTouching } from "@/lib/codex-index";

/**
 * Every canon text has a page, generated from the same list the kingdoms read. As with the glossary,
 * an unknown slug is a 404 rather than a dynamic page.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return TEXTS.map((text) => ({ slug: text.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const text = getText(slug);
  if (!text) return { title: "Text not found" };
  return {
    title: text.title,
    description: `${text.author}, ${formatYear(text.year)} — ${text.summary}`,
    openGraph: { title: `${text.title} · Codex`, description: text.summary },
  };
}

export default async function CanonTextPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const text = getText(slug);
  if (!text) notFound();

  const kingdom = text.kingdomId === null ? undefined : getKingdom(text.kingdomId);
  const related = termsTouching(text, 6);

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
          <li>
            <Link href="/codex#codex-canon" className="transition-colors hover:text-gold">
              Canon
            </Link>
          </li>
          <li aria-hidden className="text-parchment-dim/40">
            /
          </li>
          <li aria-current="page" className="text-parchment">
            {text.title}
          </li>
        </ol>
      </nav>

      <header className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <KindBadge kind={text.kind} />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim/70 tabular">
            {formatYear(text.year)}
          </span>
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
        <h1 className="serif mt-5 text-4xl leading-tight text-parchment sm:text-5xl">{text.title}</h1>
        <p className="mt-3 text-lg text-parchment-dim">
          {text.author} · <span className="tabular">{formatYear(text.year)}</span>
        </p>
      </header>

      <section aria-labelledby="excerpt" className="max-w-3xl">
        <h2 id="excerpt" className="eyebrow">
          Excerpt
        </h2>
        <blockquote className="serif mt-4 border-l-2 border-gold/60 pl-5 text-xl italic leading-relaxed text-parchment">
          “{text.excerpt}”
        </blockquote>
      </section>

      <section aria-labelledby="summary" className="max-w-3xl">
        <h2 id="summary" className="eyebrow">
          Why the atlas keeps it
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-parchment-dim">{text.summary}</p>
      </section>

      {related.length === 0 ? null : (
        <section aria-labelledby="reaches-for">
          <h2 id="reaches-for" className="serif text-2xl text-parchment">
            Terms this text reaches for
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-parchment-dim">
            Ranked by the codex search index against the summary above, not hand-picked.
          </p>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {related.map((result) => (
              <li key={result.doc.id}>
                <Link
                  href={result.doc.href}
                  className="plate flex h-full flex-col rounded-realm p-5 transition-colors hover:border-gold/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="serif text-lg leading-tight text-parchment">{result.doc.title}</h3>
                    <KindBadge kind={result.doc.kind} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-parchment-dim">{result.doc.teaser}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

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