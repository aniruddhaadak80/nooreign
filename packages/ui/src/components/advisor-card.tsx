import type { Advisor } from "@repo/seed/types";
import { formatConfidence, formatYear } from "../lib/format";
import { cn } from "../lib/cn";
import { AXIOM_COLORS } from "../lib/palette";
import { Badge } from "./badge";
import { Card } from "./card";
import { AdvisorPortrait } from "./advisor-portrait";

/**
 * One advisor of a court: portrait, epithet, stance, and the six moral
 * dimensions as a compact reading. The axiom row is the fingerprint — two
 * advisors who agree on verdict can still read very differently.
 */
export interface AdvisorCardProps {
  advisor: Advisor;
  href?: string;
  /** Shows the signature move description. */
  expanded?: boolean;
  className?: string;
}

export function AdvisorCard({ advisor, href, expanded = false, className }: AdvisorCardProps) {
  const body = (
    <>
      <div className="flex items-start gap-3 p-4">
        <AdvisorPortrait advisor={advisor} size={64} />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[15px] tracking-[0.03em] text-parchment">{advisor.name}</h3>
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-gold">{advisor.epithet}</p>
          <p className="mt-1 font-mono text-[10px] tabular-nums text-parchment-dim">
            {formatYear(advisor.born)} – {advisor.died === null ? "present" : formatYear(advisor.died)}
          </p>
        </div>
      </div>

      <p className="px-4 text-[12px] leading-relaxed text-parchment-dim">
        {expanded ? advisor.creed : `${advisor.creed.slice(0, 118)}${advisor.creed.length > 118 ? "…" : ""}`}
      </p>

      {expanded ? (
        <div className="mt-3 px-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-parchment-dim">Signature move</p>
          <p className="mt-1 text-[12px] leading-relaxed text-parchment">
            <span className="text-gold">{advisor.signatureMove.name}</span> — {advisor.signatureMove.description}
          </p>
        </div>
      ) : null}

      <ul aria-label="Moral dimensions" className="mt-4 grid grid-cols-6 gap-1 px-4">
        {Object.entries(advisor.axioms).map(([key, value]) => (
          <li key={key} className="flex flex-col items-center gap-1">
            <span
              aria-hidden="true"
              className="h-1 w-full rounded-full bg-abyss-border"
              style={{ background: `linear-gradient(to top, ${AXIOM_COLORS[key as keyof typeof AXIOM_COLORS] ?? "#D9A441"} ${value * 100}%, var(--color-abyss-border) ${value * 100}%)` }}
            />
            <span className="text-[9px] uppercase tracking-[0.1em] text-parchment-dim">{key.slice(0, 3)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-abyss-border px-4 py-3">
        <Badge tone={advisor.onAi.verdict === "skeptical" ? "crimson" : advisor.onAi.verdict === "optimistic" ? "verdigris" : "gold"}>
          {advisor.onAi.verdict}
        </Badge>
        <span className="text-[10px] uppercase tracking-[0.16em] text-parchment-dim">
          {formatConfidence(advisor.moves.length === 0 ? 0.4 : Math.min(1, advisor.moves.length / 6))}
        </span>
        <span className="ml-auto font-mono text-[10px] tabular-nums text-parchment-dim">{advisor.moves.length} moves</span>
      </div>
    </>
  );

  return (
    <Card as="li" interactive={href !== undefined} className={cn("h-full list-none", className)}>
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