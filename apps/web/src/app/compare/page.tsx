import type { Metadata } from "next";
import Link from "next/link";
import { DILEMMAS, SEED } from "@repo/seed";
import { compareRealms } from "@/lib/courts";

export const metadata: Metadata = {
  description:
    "Twelve separate courts, one per kingdom, each ruling on the same dilemma alone — where the realms disagree is the finding.",
};

export const dynamic = "force-dynamic";

/** The index is the first dilemma, so `/compare` and `/compare/<first-slug>` agree. */
export default async function CompareIndexPage() {
  const first = DILEMMAS[0];
  if (!first) return <p className="mt-10 text-crimson">No dilemmas loaded.</p>;

  const result = compareRealms(first.id, SEED);
  const realms = result?.realms ?? [];

  return (
    <div className="flex flex-col gap-10">
      <header className="max-w-3xl">
        <p className="eyebrow">Realm comparison</p>
        <h1 className="serif mt-4 text-4xl leading-tight text-parchment">How would each kingdom rule?</h1>
        <p className="mt-5 text-lg leading-relaxed text-parchment-dim">
          Twelve realms, twelve separate sittings on the same dilemma at the same seed. Pick a case and
          see where the moral traditions part company.
        </p>
      </header>

      <ul className="grid gap-3 md:grid-cols-2">
        {DILEMMAS.map((dilemma) => (
          <li key={dilemma.id}>
            <Link
              href={`/compare/${dilemma.slug}`}
              className="plate flex items-center justify-between gap-4 rounded-realm p-4 transition-colors hover:border-gold/50"
            >
              <span className="text-parchment">{dilemma.title}</span>
              <span className="font-mono text-[11px] text-parchment-dim/70">
                {dilemma.options.length} options
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <aside className="plate rounded-realm p-6">
        <p className="eyebrow">On the default case</p>
        <p className="mt-3 text-sm leading-relaxed text-parchment-dim">
          {realms.length} realms returned verdicts; {result?.comparison.distinctWinners ?? 0} distinct
          options won. {result?.comparison.summary}
        </p>
      </aside>
    </div>
  );
}
