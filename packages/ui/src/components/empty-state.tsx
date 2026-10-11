import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * The observatory with nothing in it. Every collection view needs one, and an
 * atlas that admits a gap is more credible than one that hides it.
 */
export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Decorative crest or glyph; kept aria-hidden because the title carries it. */
  glyph?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, glyph, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed border-abyss-border",
        "bg-abyss/40 px-6 py-12 text-center",
        className,
      )}
    >
      {glyph === undefined ? null : (
        <span aria-hidden="true" className="text-parchment-dim opacity-60">
          {glyph}
        </span>
      )}
      <p className="font-display text-[15px] tracking-[0.06em] text-parchment">{title}</p>
      {description === undefined ? null : (
        <p className="max-w-[46ch] text-[13px] leading-relaxed text-parchment-dim">{description}</p>
      )}
      {action}
    </div>
  );
}