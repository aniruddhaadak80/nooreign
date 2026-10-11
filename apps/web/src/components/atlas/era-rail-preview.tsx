import Link from "next/link";
import type { Era } from "@repo/seed";

/**
 * A compressed view of the chronicle: the eras that changed what alignment meant,
 * laid out on the same rail the full time machine uses.
 */
export function EraRailPreview({ eras }: { eras: readonly Era[] }) {
  if (eras.length === 0) return null;
  return (
    <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {eras.map((era) => (
        <li key={era.id}>
          <Link
            href={`/chronicle/${era.slug}`}
            className="plate group flex h-full flex-col gap-2 rounded-realm p-4 transition-colors hover:border-gold/60"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-xs text-gold tabular">
                {era.startYear < 0 ? `${Math.abs(era.startYear)} BCE` : era.startYear}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-parchment-dim/70">
                {era.domain}
              </span>
            </div>
            <h3 className="serif text-base leading-snug text-parchment group-hover:text-gold">{era.title}</h3>
            <p className="line-clamp-3 text-sm leading-relaxed text-parchment-dim">{era.summary}</p>
            <span className="mt-auto pt-2 font-mono text-[11px] text-parchment-dim/60">
              {era.landmarks.length} milestone{era.landmarks.length === 1 ? "" : "s"}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
