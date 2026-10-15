"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LOCALES } from "@repo/i18n";
import type { NavSection } from "@/lib/navigation";
import { CommandPalette } from "./command-palette";
import { useChromeLocale } from "./chrome-locale";
import { Logo } from "./logo";

/**
 * Site chrome lives in the app rather than the design system: the header needs
 * the nav model and the footer needs the repo's own links, neither of which the
 * primitives should know about.
 *
 * The header is a client island because it carries the two pieces of state the
 * atlas has: the command palette and the active locale.
 */
export function AppHeader({ sections }: { sections: NavSection[] }) {
  const locale = useChromeLocale();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-abyss-border bg-abyss/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Nooreign — home">
          <Logo size={28} />
          <span className="serif hidden text-lg tracking-wide text-parchment sm:inline">Nooreign</span>
        </Link>

        <nav aria-label={locale.t("nav.atlas_sections")} className="hidden lg:block">
          <ul className="flex items-center gap-0.5">
            {sections.map((section) => (
              <li key={section.href}>
                <Link
                  href={section.href}
                  className="rounded px-2.5 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-parchment-dim transition-colors hover:bg-abyss-raised hover:text-gold"
                >
                  {locale.navLabel(section.href)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <CommandPalette />
          <LocaleMenu />
          <details className="relative lg:hidden">
            <summary className="cursor-pointer list-none rounded border border-abyss-border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-parchment-dim">
              {locale.t("nav.menu")}
            </summary>
            <ul className="absolute right-0 z-50 mt-2 w-60 rounded border border-abyss-border bg-abyss-raised p-2 shadow-lg">
              {sections.map((section) => (
                <li key={section.href}>
                  <Link
                    href={section.href}
                    className="block rounded px-3 py-2 text-sm text-parchment-dim hover:bg-abyss hover:text-gold"
                  >
                    {locale.navLabel(section.href)}
                    <span className="mt-0.5 block text-xs text-parchment-dim/60">{section.hint}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </header>
  );
}

/**
 * Locale picker. A `details` element rather than a bespoke popover: it is
 * keyboard-operable and screen-reader-legible with no ARIA to get wrong.
 */
function LocaleMenu() {
  const locale = useChromeLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        data-testid="locale-trigger"
        className="rounded border border-abyss-border px-2.5 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-parchment-dim transition-colors hover:border-gold hover:text-gold"
      >
        {locale.code}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Language"
          className="absolute right-0 z-50 mt-2 max-h-80 w-48 overflow-y-auto rounded border border-abyss-border bg-abyss-raised p-1 shadow-lg"
        >
          {LOCALES.map((entry) => (
            <button
              key={entry.code}
              type="button"
              role="menuitemradio"
              aria-checked={entry.code === locale.code}
              onClick={() => {
                locale.setLocale(entry.code);
                setOpen(false);
              }}
              className={`flex w-full items-baseline justify-between gap-3 rounded px-3 py-2 text-left text-sm transition-colors hover:bg-abyss ${
                entry.code === locale.code ? "text-gold" : "text-parchment-dim"
              }`}
            >
              <span>{entry.nativeName}</span>
              <span className="font-mono text-[10px] uppercase opacity-60">{entry.code}</span>
            </button>
          ))}
          <p className="mt-2 border-t border-abyss-border px-3 py-2 text-[11px] leading-relaxed text-parchment-dim/70">
            The interface is translated. The philosophy is not — it stays in the language it was written
            in.
          </p>
        </div>
      ) : null}
    </div>
  );
}

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Atlas",
    links: [
      { href: "/kingdoms", label: "Kingdoms" },
      { href: "/court", label: "Court of advisors" },
      { href: "/council", label: "Council chamber" },
      { href: "/compare", label: "How each realm rules" },
      { href: "/dilemmas", label: "Dilemma engine" },
      { href: "/engine", label: "What the case is about" },
    ],
  },
  {
    title: "History",
    links: [
      { href: "/chronicle", label: "Chronicle" },
      { href: "/observatory", label: "Alignment observatory" },
      { href: "/experiments", label: "Thought experiments" },
      { href: "/cartographer", label: "Argument cartographer" },
      { href: "/codex", label: "Codex" },
    ],
  },
  {
    title: "Repository",
    links: [
      { href: "/method", label: "Method & determinism" },
      { href: "/journal", label: "Reflective journal" },
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
