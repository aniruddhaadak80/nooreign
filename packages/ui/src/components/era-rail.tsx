import type { Era } from "@repo/seed/types";
import { formatSpan } from "../lib/format";
import { cn } from "../lib/cn";

/**
 * The chronicle as a rail: eras laid out on a linear time axis with a survey
 * line under each. Widths come from the era's real duration so the rail is a
 * timeline rather than a row of equal chips.
 */
export interface EraRailProps {
  eras: readonly Era[];
  activeEraId?: string;
  hrefFor?: (era: Era) => string | undefined;
  /** Renders every era at the same width. */
  uniform?: boolean;
  className?: string;
  label?: string;
}

const round = (value: number): number => Math.round(value * 100) / 100;

export function EraRail({ eras, activeEraId, hrefFor, uniform = false, className, label = "Chronicle" }: EraRailProps) {
  if (eras.length === 0) return null;

  const ordered = [...eras].sort((a, b) => a.startYear - b.startYear);
  const spanStart = ordered[0]?.startYear ?? 0;
  const spanEnd = Math.max(...ordered.map((era) => era.endYear), spanStart + 1);
  const span = spanEnd - spanStart;
  const widths = uniform
    ? ordered.map(() => 100 / ordered.length)
    : ordered.map((era) => ((era.endYear - era.startYear) / span) * 100);

  let cursor = 0;
  const segments = ordered.map((era, index) => {
    const width = widths[index] ?? 0;
    const offset = cursor;
    cursor += width;
    return { era, offset, width };
  });

  return (
    <nav aria-label={label} className={cn("flex w-full flex-col gap-3", className)}>
      <ol className="flex w-full items-stretch gap-1">
        {segments.map(({ era, width }) => {
          const active = era.id === activeEraId;
          const href = hrefFor?.(era);
          const inner = (
            <>
              <span className="font-mono text-[9px] tabular-nums tracking-[0.1em] text-parchment-dim">
                {formatSpan(era.startYear, era.endYear)}
              </span>
              <span
                className={cn(
                  "font-display text-[12px] leading-tight tracking-[0.02em]",
                  active ? "text-gold" : "text-parchment-dim",
                )}
              >
                {era.label}
              </span>
              <span aria-hidden="true" className="mt-auto block h-0.5 w-full bg-abyss-border" />
              <span
                aria-hidden="true"
                className={cn("block h-0.5 w-full", active ? "bg-gold" : "bg-transparent")}
              />
            </>
          );
          const shared =
            "flex min-w-0 flex-1 flex-col items-start gap-1 rounded-[4px] border px-2 py-2 text-left transition-colors duration-150";
          return (
            <li key={era.id} style={{ flexBasis: `${round(width)}%` }} className="min-w-0">
              {href === undefined ? (
                <span
                  aria-current={active ? "true" : undefined}
                  className={cn(shared, active ? "border-gold/70 bg-gold/5" : "border-abyss-border bg-abyss-raised")}
                >
                  {inner}
                </span>
              ) : (
                <a
                  href={href}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    shared,
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold",
                    active ? "border-gold/70 bg-gold/5" : "border-abyss-border bg-abyss-raised hover:border-parchment-dim/60",
                  )}
                >
                  {inner}
                </a>
              )}
            </li>
          );
        })}
      </ol>
      <div aria-hidden="true" className="relative h-px w-full bg-abyss-border">
        {segments.map(({ era, offset, width }) => (
          <span
            key={era.id}
            className="absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-parchment-dim"
            style={{ left: `${round(offset + width / 2)}%` }}
          />
        ))}
      </div>
      <p className="flex justify-between font-mono text-[10px] tabular-nums text-parchment-dim">
        <span>{formatSpan(spanStart, spanStart)}</span>
        <span>{formatSpan(spanEnd, spanEnd)}</span>
      </p>
    </nav>
  );
}