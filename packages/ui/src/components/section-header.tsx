import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Section eyebrow + rule. The wide-tracked uppercase label is the atlas's
 * connective tissue: it tells the reader which of the four movements
 * (kingdom, court, chronicle, stack) they are standing in.
 */
export interface SectionHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Heading level, so a page can keep a correct outline. */
  as?: "h2" | "h3" | "h4";
  align?: "start" | "center";
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  as: Heading = "h2",
  align = "start",
  className,
}: SectionHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-2", align === "center" && "items-center text-center", className)}>
      {eyebrow === undefined ? null : (
        <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.24em] text-gold">
          <span aria-hidden="true" className="inline-block h-px w-6 bg-gold/60" />
          {eyebrow}
        </p>
      )}
      <div
        className={cn(
          "flex w-full flex-wrap items-end justify-between gap-3",
          align === "center" && "justify-center",
        )}
      >
        <Heading className="font-display text-[22px] leading-tight tracking-[0.02em] text-parchment">{title}</Heading>
        {actions === undefined ? null : <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {description === undefined ? null : (
        <p className={cn("max-w-[68ch] text-[13px] leading-relaxed text-parchment-dim", align === "center" && "mx-auto")}>
          {description}
        </p>
      )}
      <span aria-hidden="true" className="mt-1 block h-px w-full bg-abyss-border" />
    </header>
  );
}