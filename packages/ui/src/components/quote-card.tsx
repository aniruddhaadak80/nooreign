import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Parchment quote. The opening mark is drawn with type, not an SVG, so the
 * whole card stays selectable text — quotes are the one place in the atlas
 * where copy/paste matters.
 */
export interface QuoteCardProps {
  children: ReactNode;
  attribution?: string;
  work?: string;
  year?: string;
  tone?: "parchment" | "council";
  className?: string;
}

export function QuoteCard({ children, attribution, work, year, tone = "parchment", className }: QuoteCardProps) {
  const gilded = tone === "council";
  return (
    <figure
      className={cn(
        "relative overflow-hidden rounded-[10px] border px-5 py-5",
        gilded ? "border-gold/40 bg-abyss-raised" : "border-abyss-border bg-parchment text-ink",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -top-2 left-3 font-display text-[64px] leading-none",
          gilded ? "text-gold/20" : "text-ink/10",
        )}
      >
        “
      </span>
      <blockquote
        className={cn(
          "relative font-display text-[16px] leading-[1.6] tracking-[0.01em]",
          gilded ? "text-parchment" : "text-ink",
        )}
      >
        {children}
      </blockquote>
      {attribution === undefined ? null : (
        <figcaption
          className={cn(
            "mt-3 border-t pt-2 text-[11px] uppercase tracking-[0.18em]",
            gilded ? "border-abyss-border text-parchment-dim" : "border-ink/20 text-ink/70",
          )}
        >
          — {attribution}
          {work === undefined ? null : `, ${work}`}
          {year === undefined ? null : ` (${year})`}
        </figcaption>
      )}
    </figure>
  );
}