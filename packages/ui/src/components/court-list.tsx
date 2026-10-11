import type { Advisor } from "@repo/seed/types";
import { cn } from "../lib/cn";
import { AdvisorPortrait } from "./advisor-portrait";
import { Badge } from "./badge";

/**
 * The roll of a court. A `<ul>` because the order *is* the seniority order the
 * seed data defines, and screen readers announce position in a set.
 */
export interface CourtListProps {
  advisors: readonly Advisor[];
  /** Marks the advisor currently holding the floor. */
  speakingId?: string;
  /** Compact rows drop the epithet and the cadence. */
  density?: "comfortable" | "compact";
  /** Optional link per advisor. */
  hrefFor?: (advisor: Advisor) => string | undefined;
  className?: string;
  label?: string;
}

export function CourtList({
  advisors,
  speakingId,
  density = "comfortable",
  hrefFor,
  className,
  label = "The court",
}: CourtListProps) {
  if (advisors.length === 0) return null;
  const compact = density === "compact";

  return (
    <ul aria-label={label} className={cn("flex flex-col gap-2", className)}>
      {advisors.map((advisor, index) => {
        const speaking = advisor.id === speakingId;
        const href = hrefFor?.(advisor);
        return (
          <li key={advisor.id}>
            <div
              className={cn(
                "flex items-center gap-3 rounded-[8px] border px-3",
                compact ? "py-2" : "py-2.5",
                speaking ? "border-gold/70 bg-gold/5" : "border-abyss-border bg-abyss-raised",
              )}
            >
              <span
                aria-hidden="true"
                className="w-4 shrink-0 text-right font-mono text-[10px] tabular-nums text-parchment-dim"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <AdvisorPortrait advisor={advisor} size={compact ? 28 : 40} hideInitials={compact} />
              <div className="min-w-0 flex-1">
                {href === undefined ? (
                  <p className={cn("truncate text-parchment", compact ? "text-[12px]" : "text-[13px]")}>
                    {advisor.name}
                  </p>
                ) : (
                  <a
                    href={href}
                    className="block truncate text-parchment transition-colors hover:text-gold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
                  >
                    {advisor.name}
                  </a>
                )}
                {compact ? null : (
                  <p className="truncate text-[11px] uppercase tracking-[0.12em] text-parchment-dim">{advisor.epithet}</p>
                )}
              </div>
              {speaking ? <Badge tone="gold">Speaking</Badge> : null}
              {compact ? null : (
                <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-parchment-dim sm:inline">
                  {advisor.voice.cadence}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}