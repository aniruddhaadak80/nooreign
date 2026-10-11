import { Logo } from "./logo";
import { cn } from "../lib/cn";

/**
 * Atlas colophon. Server-safe — no state, no listeners.
 */
export interface FooterProps {
  links?: readonly { label: string; href: string }[];
  note?: string;
  /** Build or seed version stamp. */
  revision?: string;
  className?: string;
}

export function Footer({ links, note, revision, className }: FooterProps) {
  return (
    <footer className={cn("border-t border-abyss-border bg-abyss", className)}>
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 py-10 lg:flex-row lg:items-start lg:justify-between lg:px-10">
        <div className="flex max-w-[46ch] flex-col gap-3">
          <Logo size={28} title="Nooreign" />
          <p className="text-[12px] leading-relaxed text-parchment-dim">
            {note ??
              "An interactive atlas of human-versus-superintelligence alignment. Kingdoms are schools of thought; their courts deliberate; the chronicle records how we aligned."}
          </p>
          {revision === undefined ? null : (
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim/70">Seed {revision}</p>
          )}
        </div>
        {links === undefined || links.length === 0 ? null : (
          <nav aria-label="Footer" className="flex flex-col gap-6 sm:flex-row sm:gap-12">
            {["Atlas", "Courts", "Chronicle", "Stack"].map((heading, groupIndex) => {
              const group = links.filter((_, index) => index % 4 === groupIndex);
              if (group.length === 0) return null;
              return (
                <div key={heading} className="flex flex-col gap-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-parchment-dim">{heading}</p>
                  <ul className="flex flex-col gap-1.5">
                    {group.map((link) => (
                      <li key={link.href}>
                        <a
                          href={link.href}
                          className="text-[12px] text-parchment transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>
        )}
      </div>
      <div className="border-t border-abyss-border/60">
        <p className="mx-auto w-full max-w-[1200px] px-6 py-4 text-[10px] uppercase tracking-[0.18em] text-parchment-dim/70 lg:px-10">
          Nooreign · The Kingdoms of Mind
        </p>
      </div>
    </footer>
  );
}