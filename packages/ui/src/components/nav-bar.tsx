import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Logo } from "./logo";

/**
 * Atlas masthead.
 *
 * Server-safe: the active link is passed in rather than derived from a
 * `usePathname`, so the nav can be rendered from a server component without a
 * client boundary. `aria-current="page"` carries the state for assistive tech.
 */
export interface NavLink {
  label: string;
  href: string;
  /** Small counter rendered after the label. */
  count?: number;
}

export interface NavBarProps {
  links: readonly NavLink[];
  /** `href` of the current page. */
  activeHref?: string;
  /** Trailing slot, e.g. a search field or a sign-in link. */
  trailing?: ReactNode;
  /** Second row: the kingdom selector or era scrubber. */
  secondary?: ReactNode;
  brandHref?: string;
  className?: string;
}

export function NavBar({ links, activeHref, trailing, secondary, brandHref = "/", className }: NavBarProps) {
  return (
    <header className={cn("sticky top-0 z-40 border-b border-abyss-border bg-abyss/95 backdrop-blur", className)}>
      <div className="mx-auto flex w-full max-w-[1200px] items-center gap-6 px-6 py-3 lg:px-10">
        <Logo href={brandHref} />
        <nav aria-label="Primary" className="min-w-0 flex-1">
          <ul className="flex items-center gap-1 overflow-x-auto">
            {links.map((link) => {
              const active = link.href === activeHref;
              return (
                <li key={link.href} className="shrink-0">
                  <a
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-[6px] px-3 py-2 text-[11px] uppercase tracking-[0.16em]",
                      "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                      active ? "text-gold" : "text-parchment-dim hover:text-parchment",
                    )}
                  >
                    {link.label}
                    {link.count === undefined ? null : (
                      <span className="font-mono text-[9px] tabular-nums text-parchment-dim/70">{link.count}</span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        {trailing === undefined ? null : <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
      </div>
      {secondary === undefined ? null : (
        <div className="border-t border-abyss-border/60 bg-abyss-raised/60">{secondary}</div>
      )}
    </header>
  );
}