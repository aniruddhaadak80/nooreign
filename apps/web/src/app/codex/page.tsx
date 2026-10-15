import type { Metadata } from "next";
import Link from "next/link";
import { CodexBrowser } from "@/components/codex/codex-browser";
import { codexDocs, codexStats } from "@/lib/codex-index";

export const metadata: Metadata = {
  title: "Codex",
  description:
    "A hundred and twenty alignment, ethics, philosophy and governance terms defined without hand-waving, plus the canon texts the twelve kingdoms stand on. Every term and every text has its own page.",
  keywords: [
    "ai alignment glossary",
    "alignment terms",
    "ai ethics glossary",
    "canon texts",
    "ai governance definitions",
  ],
};

/**
 * The codex index.
 *
 * Two families, one index: a hundred and twenty glossary terms and twenty-eight canon texts, all of
 * them individually linkable. The list is rendered server-side from the same documents the search
 * island filters, so it is complete before a single byte of JavaScript runs and stays complete if
 * none ever does.
 */
export default function CodexPage() {
  const docs = codexDocs();
  const stats = codexStats();

  return (
    <div className="flex flex-col gap-10">
      <header className="max-w-3xl">
        <p className="eyebrow">Codex</p>
        <h1 className="serif mt-4 text-4xl leading-tight text-parchment">Every term, defined without hand-waving</h1>
        <p className="mt-5 text-lg leading-relaxed text-parchment-dim">
          Alignment writing has a vocabulary problem: the terms are precise inside a small community and
          mushy everywhere else. These definitions say what a term means, which realm it came from, and
          — where it is worth saying — what it does not settle.
        </p>
        <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-parchment-dim/70">
          {stats.terms} terms · {stats.texts} canon texts · {stats.indexedTerms} words indexed
        </p>
      </header>

      <nav aria-label="Codex sections" className="flex flex-wrap gap-6 border-y border-abyss-border py-3">
        <a
          href="#codex-terms"
          className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim transition-colors hover:text-gold"
        >
          The vocabulary
        </a>
        <a
          href="#codex-canon"
          className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim transition-colors hover:text-gold"
        >
          Canon
        </a>
        <Link
          href="/chronicle"
          className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim transition-colors hover:text-gold"
        >
          Where these words came from
        </Link>
      </nav>

      <CodexBrowser docs={docs} facets={stats.facets} />
    </div>
  );
}