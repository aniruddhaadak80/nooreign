import Link from "next/link";
import type { NavSection } from "@/lib/navigation";
import { Logo } from "./logo";

/**
 * Site chrome lives in the app rather than the design system: the header needs the
 * nav model and the footer needs the repo's own links, neither of which the
 * primitives should know about.
 */
export function AppHeader({ sections }: { sections: NavSection[] }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-abyss-border bg-abyss/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Nooreign — home">
          <Logo size={28} />
          <span className="serif text-lg tracking-wide text-parchment">Nooreign</span>
        </Link>
        <nav aria-label="Atlas sections">
          <ul className="hidden items-center gap-1 md:flex">
            {sections.map((section) => (
              <li key={section.href}>
                <Link
                  href={section.href}
                  className="rounded px-2.5 py-1.5 font-mono text-xs uppercase tracking-[0.16em] text-parchment-dim transition-colors hover:bg-abyss-raised hover:text-gold"
                >
                  {section.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <details className="relative md:hidden">
          <summary className="cursor-pointer list-none rounded border border-abyss-border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.16em] text-parchment-dim">
            Atlas
          </summary>
          <ul className="absolute right-0 z-50 mt-2 w-56 rounded border border-abyss-border bg-abyss-raised p-2 shadow-lg">
            {sections.map((section) => (
              <li key={section.href}>
                <Link
                  href={section.href}
                  className="block rounded px-3 py-2 text-sm text-parchment-dim hover:bg-abyss hover:text-gold"
                >
                  {section.label}
                  <span className="mt-0.5 block text-xs text-parchment-dim/60">{section.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </header>
  );
}

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Atlas",
    links: [
      { href: "/kingdoms", label: "Kingdoms" },
      { href: "/court", label: "Court of advisors" },
      { href: "/council", label: "Council chamber" },
      { href: "/dilemmas", label: "Dilemma engine" },
    ],
  },
  {
    title: "History",
    links: [
      { href: "/chronicle", label: "Chronicle" },
      { href: "/observatory", label: "Alignment observatory" },
      { href: "/experiments", label: "Thought experiments" },
      { href: "/codex", label: "Codex" },
    ],
  },
  {
    title: "Repository",
    links: [
      { href: "/method", label: "Method & determinism" },
      { href: "https://github.com/aniruddhaadak80/nooreign", label: "Source" },
      { href: "https://github.com/aniruddhaadak80/nooreign/blob/main/CONTRIBUTING.md", label: "Contributing" },
      { href: "https://github.com/aniruddhaadak80/nooreign/issues", label: "Issues" },
    ],
  },
];

export function AppFooter() {
  return (
    <footer className="border-t border-abyss-border bg-abyss/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 sm:px-8 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <Logo size={26} />
            <span className="serif text-base text-parchment">Nooreign</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-parchment-dim">
            The philosophical atlas of aligning intelligence. Twelve kingdoms, twenty-eight advisors,
            twenty dilemmas, and the whole history of how we tried to line up our values with a mind
            that might not share them.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h2 className="eyebrow">{column.title}</h2>
            <ul className="mt-4 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith("http") ? (
                    <a
                      href={link.href}
                      className="text-sm text-parchment-dim transition-colors hover:text-gold"
                      rel="noreferrer noopener"
                      target="_blank"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="text-sm text-parchment-dim transition-colors hover:text-gold">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-abyss-border/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 font-mono text-[11px] text-parchment-dim/70 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            Deterministic by design · every deliberation is computed locally from axiom vectors and
            seeded argument graphs · no API keys
          </p>
          <p>MIT licensed · built with Next.js 15, React 19, TypeScript strict and Bun</p>
        </div>
      </div>
    </footer>
  );
}
