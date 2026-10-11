import type { Kingdom } from "@repo/seed/types";
import { formatYear, titleCase } from "../lib/format";
import { cn } from "../lib/cn";
import { Badge } from "./badge";
import { Card } from "./card";
import { KingdomCrest } from "./kingdom-crest";
import { TerrainPlate } from "./terrain-plate";

/**
 * The atlas index card for one kingdom: crest, terrain plate, motto, stance.
 * Renders `as="li"` so a kingdom grid can be a real list.
 */
export interface KingdomCardProps {
  kingdom: Kingdom;
  /** Wraps the whole card in an anchor; omit for a non-interactive plate. */
  href?: string;
  /** Shows the full creed rather than a truncated one. */
  expanded?: boolean;
  landmarkCount?: number;
  className?: string;
}

const CREED_PREVIEW = 132;

export function KingdomCard({ kingdom, href, expanded = false, landmarkCount, className }: KingdomCardProps) {
  const creed =
    expanded || kingdom.creed.length <= CREED_PREVIEW
      ? kingdom.creed
      : `${kingdom.creed.slice(0, CREED_PREVIEW)}…`;

  const body = (
    <>
      <div className="relative h-24 w-full overflow-hidden border-b border-abyss-border">
        <TerrainPlate
          terrain={kingdom.terrain}
          seedKey={kingdom.id}
          primary={kingdom.crest.primary}
          accent={kingdom.crest.accent}
          width={420}
          height={160}
        />
      </div>
      <div className="flex items-start gap-3 p-4">
        <KingdomCrest
          charge={kingdom.crest.charge}
          primary={kingdom.crest.primary}
          accent={kingdom.crest.accent}
          size={40}
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[15px] tracking-[0.03em] text-parchment">{kingdom.name}</h3>
          <p className="mt-1 text-[12px] italic leading-snug text-parchment-dim">“{kingdom.motto}”</p>
        </div>
      </div>
      <p className="px-4 pb-3 text-[12px] leading-relaxed text-parchment-dim">{creed}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-abyss-border px-4 py-3">
        <Badge tone="neutral">{titleCase(kingdom.terrain)}</Badge>
        <Badge tone={kingdom.aiStance.verdict === "skeptical" ? "crimson" : "gold"}>{kingdom.aiStance.verdict}</Badge>
        <span className="ml-auto font-mono text-[10px] tabular-nums text-parchment-dim">
          {formatYear(kingdom.founded)} · {kingdom.advisors.length} advisors
          {landmarkCount === undefined ? null : ` · ${landmarkCount} landmarks`}
        </span>
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