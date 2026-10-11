import Link from "next/link";
import type { Dilemma } from "@repo/seed";
import { getKingdom } from "@repo/seed";

/** Three hard cases, each linked to the realm its problem came out of. */
export function DilemmaTeaser({ dilemmas }: { dilemmas: readonly Dilemma[] }) {
  return (
    <ul className="mt-8 grid gap-4 md:grid-cols-3">
      {dilemmas.map((dilemma) => {
        const kingdom = getKingdom(dilemma.kingdomOrigin);
        return (
          <li key={dilemma.id}>
            <Link
              href={`/dilemmas/${dilemma.slug}`}
              className="plate flex h-full flex-col gap-3 rounded-realm p-5 transition-colors hover:border-crimson/70"
            >
              <div className="flex items-center gap-2">
                {kingdom ? (
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold"
                    style={{ backgroundColor: `${kingdom.crest.primary}22`, color: kingdom.crest.primary }}
                    aria-hidden
                  >
                    {kingdom.glyph}
                  </span>
                ) : null}
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-parchment-dim/70">
                  {kingdom?.name ?? "unassigned"}
                </span>
              </div>
              <h3 className="serif text-lg leading-snug text-parchment">{dilemma.title}</h3>
              <p className="line-clamp-4 text-sm leading-relaxed text-parchment-dim">{dilemma.prompt}</p>
              <div className="mt-auto flex items-center justify-between pt-3 font-mono text-[11px] text-parchment-dim/60">
                <span>{dilemma.options.length} options</span>
                <span className="text-verdigris">severity {Math.round(dilemma.severity * 100)}%</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
