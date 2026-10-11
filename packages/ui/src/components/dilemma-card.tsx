import type { Dilemma } from "@repo/seed/types";
import { formatPercent } from "../lib/format";
import { cn } from "../lib/cn";
import { Badge } from "./badge";
import { ProgressBar } from "./progress-bar";
import { TagRow } from "./tag-row";

/**
 * The case a court sits on. Severity and AI relevance are shown as paired
 * instrument bars because a dilemma that is existentially grave but has nothing
 * to do with machines is a different creature from its inverse.
 */
export interface DilemmaCardProps {
  dilemma: Dilemma;
  /** Kingdom display name for the origin, resolved by the caller. */
  kingdomName?: string;
  eraLabel?: string;
  /** Currently selected option id, if the council is mid-deliberation. */
  selectedOptionId?: string;
  onOpen?: (dilemma: Dilemma) => void;
  className?: string;
  expanded?: boolean;
}

export function DilemmaCard({
  dilemma,
  kingdomName,
  eraLabel,
  selectedOptionId,
  onOpen,
  className,
  expanded = false,
}: DilemmaCardProps) {
  const body = (
    <>
      <header className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-crimson">
            {kingdomName ?? "Unassigned kingdom"}
          </p>
          <h3 className="mt-1 font-display text-[17px] leading-tight tracking-[0.02em] text-parchment">{dilemma.title}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {eraLabel === undefined ? null : <Badge tone="neutral">{eraLabel}</Badge>}
          <Badge tone="gold">{dilemma.options.length} options</Badge>
        </div>
      </header>

      <p className="px-4 text-[13px] leading-relaxed text-parchment-dim">{dilemma.prompt}</p>

      {expanded ? (
        <p className="mt-3 px-4 text-[12px] leading-relaxed text-parchment-dim/80">{dilemma.setting}</p>
      ) : null}

      <div className="mt-4 grid gap-3 px-4 sm:grid-cols-2">
        <ProgressBar
          label="Severity"
          value={dilemma.severity}
          valueLabel={formatPercent(dilemma.severity)}
          tone="crimson"
          size="sm"
        />
        <ProgressBar
          label="AI relevance"
          value={dilemma.aiRelevance}
          valueLabel={formatPercent(dilemma.aiRelevance)}
          tone="glow"
          size="sm"
        />
      </div>

      {expanded ? (
        <div className="mt-4 flex flex-col gap-2 px-4">
          {dilemma.options.map((option) => (
            <div
              key={option.id}
              className={cn(
                "rounded-[6px] border px-3 py-2",
                option.id === selectedOptionId ? "border-gold/70 bg-gold/5" : "border-abyss-border",
              )}
            >
              <p className="text-[12px] text-parchment">{option.label}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-parchment-dim">{option.description}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-auto px-4 pb-4 pt-4">
        <TagRow items={dilemma.tags.map((tag) => ({ id: tag, node: <Badge tone="neutral">{tag}</Badge> }))} />
      </div>
    </>
  );

  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[10px] border border-abyss-border bg-abyss-raised",
        "shadow-[0_1px_0_rgba(255,255,255,0.04)]",
        onOpen !== undefined && "cursor-pointer transition-colors hover:border-crimson/70",
        className,
      )}
      onClick={onOpen === undefined ? undefined : () => onOpen(dilemma)}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-crimson/40" />
      {body}
    </article>
  );
}