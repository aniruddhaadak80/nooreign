import type { Metadata } from "next";
import Link from "next/link";
import { ADVISORS, DILEMMAS, KINGDOMS, SEED, getKingdom } from "@repo/seed";
import { convene, defaultPanelFor } from "@/lib/convene";
import { CouncilChamber } from "@/components/council/council-chamber";

export const metadata: Metadata = {
  title: "Council chamber",
  description:
    "Convene twenty-eight advisors on any dilemma about superintelligence and read the verdict with the full reasoning trace: every axis weight, every product, every seeded jitter.",
};

export const dynamic = "force-dynamic";

export default function CouncilPage() {
  const dilemma = DILEMMAS[0];
  if (!dilemma) {
    return <p className="mt-10 text-parchment-dim">No dilemmas are loaded. The seed datasets are compiled in; a missing dilemma means the seed package failed to import.</p>;
  }

  const panel = defaultPanelFor(dilemma.id);
  const seated = convene({ dilemmaId: dilemma.id, advisorIds: panel, seed: SEED });
  if ("error" in seated) {
    return <p className="mt-10 text-crimson">Could not convene the default court: {seated.error}</p>;
  }

  return (
    <div>
      <header className="max-w-3xl">
        <p className="eyebrow">Council chamber</p>
        <h1 className="serif mt-4 text-4xl leading-tight text-parchment">Convene a court, then read the arithmetic</h1>
        <p className="mt-5 text-lg leading-relaxed text-parchment-dim">
          Seat any combination of advisors, change the seed, and watch the verdict move. The trace is not
          a post-hoc explanation: it is six multiplications per advisor per option, a normalised subtotal,
          and a seeded perturbation no larger than ±0.05.
        </p>
      </header>

      <CouncilChamber
        initial={seated}
        defaultSeed={SEED}
        dilemmas={DILEMMAS.map((entry) => ({
          id: entry.id,
          slug: entry.slug,
          title: entry.title,
          kingdomOrigin: entry.kingdomOrigin,
        }))}
        advisors={ADVISORS.map((advisor) => ({
          id: advisor.id,
          name: advisor.name,
          kingdomId: advisor.kingdomId,
          kingdomName: getKingdom(advisor.kingdomId)?.name ?? advisor.kingdomId,
          glyph: getKingdom(advisor.kingdomId)?.glyph ?? "·",
        }))}
      />

      <aside className="mt-16 grid gap-4 sm:grid-cols-3">
        {KINGDOMS.slice(0, 3).map((kingdom) => (
          <div key={kingdom.id} className="plate rounded-realm p-5">
            <p className="eyebrow" style={{ color: kingdom.crest.primary }}>
              {kingdom.name}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-parchment-dim">{kingdom.aiStance.headline}</p>
            <Link
              href={`/kingdoms/${kingdom.slug}`}
              className="mt-3 inline-block font-mono text-[11px] uppercase tracking-[0.16em] text-gold hover:text-parchment"
            >
              Enter the realm →
            </Link>
          </div>
        ))}
      </aside>
    </div>
  );
}
