import type { Era } from "@repo/seed/types";
import { formatSpan } from "../lib/format";
import { cn } from "../lib/cn";
import { Badge } from "./badge";
import { Card } from "./card";

/**
 * One era of the chronicle. The landmark count and the technique count are the
 * two things a reader scanning the rail needs before the prose.
 */
export interface EraCardProps {
  era: Era;
  href?: string;
  /** Marks the era the time machine is parked in. */
  current?: boolean;
  className?: string;
}

export function EraCard({ era, href, current = false, className }: EraCardProps) {
  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2 p-4">
        <span className="font-mono text-[10px] tabular-nums tracking-[0.12em] text-gold">
          {formatSpan(era.startYear, era.endYear)}
        </span>
        <Badge tone="neutral">{era.domain}</Badge>
        {current ? <Badge tone="gold">Now</Badge> : null}
      </div>
      <div className="px-4">
        <h3 className="font-display text-[16px] leading-tight tracking-[0.02em] text-parchment">{era.title}</h3>
        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-parchment-dim">{era.label}</p>
      </div>
      <p className="mt-3 px-4 text-[12px] leading-relaxed text-parchment-dim">{era.summary}</p>
      {era.quote === null ? null : (
        <blockquote className="mx-4 mt-3 border-l-2 border-gold/50 pl-3 text-[12px] italic leading-relaxed text-parchment-dim">
          “{era.quote.text}”
          <footer className="mt-1 not-italic text-[10px] uppercase tracking-[0.14em] text-parchment-dim/80">
            — {era.quote.attribution}
          </footer>
        </blockquote>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-abyss-border px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-parchment-dim">
        <span>{era.landmarks.length} landmarks</span>
        <span>{era.techniques.length} techniques</span>
        <span>{era.figures.length} figures</span>
        <span className="ml-auto font-mono tabular-nums">{era.advances.length} advances</span>
      </div>
    </>
  );

  return (
    <Card
      as="li"
      interactive={href !== undefined}
      className={cn("h-full list-none", current && "border-gold/60", className)}
    >
      {href === undefined ? (
        body
      ) : (
        <a
          href={href}
          className="flex h-full flex-col focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
        >
          {body}
        </a>
      )}
    </Card>
  );
}