import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * The base surface. One hairline border, one inset gilding line at the top —
 * the "pressed plate" look that makes a card feel engraved rather than raised.
 * Deliberately server-safe: no state, no effects, no ref.
 */
export interface CardProps {
  /** Renders `li` inside a kingdom grid, `article` when standalone. */
  as?: "div" | "article" | "li" | "section";
  /** Optional crest or glyph slot in the top-left corner. */
  crest?: ReactNode;
  eyebrow?: string;
  footer?: ReactNode;
  interactive?: boolean;
  children?: ReactNode;
  id?: string;
  className?: string;
  /** Pass through the two ARIA attributes a card realistically needs. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function Card({
  crest,
  eyebrow,
  footer,
  as: Tag = "div",
  interactive = false,
  className,
  children,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: CardProps) {
  const hasHeader = crest !== undefined || eyebrow !== undefined;
  return (
    <Tag
      id={id}
      {...(ariaLabel === undefined ? {} : { "aria-label": ariaLabel })}
      {...(ariaLabelledBy === undefined ? {} : { "aria-labelledby": ariaLabelledBy })}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[10px] border border-abyss-border bg-abyss-raised",
        "shadow-[0_1px_0_rgba(255,255,255,0.04)]",
        interactive && "transition-colors duration-150 hover:border-gold/60 focus-within:border-gold/60",
        className,
      )}
    >
      {/* Engraved top edge — the only "shadow" the system allows. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gold/25" />
      {hasHeader ? (
        <header className="flex items-center gap-3 px-4 pt-4">
          {crest}
          {eyebrow === undefined ? null : (
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-parchment-dim">{eyebrow}</span>
          )}
        </header>
      ) : null}
      <div className={cn("flex flex-1 flex-col", hasHeader ? "px-4 pt-3 pb-4" : "p-4")}>{children}</div>
      {footer === undefined ? null : <footer className="border-t border-abyss-border px-4 py-3">{footer}</footer>}
    </Tag>
  );
}