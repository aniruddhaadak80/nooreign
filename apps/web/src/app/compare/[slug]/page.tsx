import type { Metadata } from "next";
import Link from "next/link";
import { DILEMMAS, SEED } from "@repo/seed";
import { compareRealms } from "@/lib/courts";
import type { RealmVerdict } from "@/lib/courts";

export const metadata: Metadata = {
  title: "How each realm rules",
  description:
    "Twelve separate courts, one per kingdom, each deciding the same dilemma alone — the only interesting output is where the realms disagree with each other.",
};

/** Every dilemma gets its own comparison table; twenty is enough to render statically. */
export function generateStaticParams() {
  return DILEMMAS.map((dilemma) => ({ slug: dilemma.slug }));
}

export const dynamicParams = false;

export default function ComparePage({ params }: { params: Promise<{ slug?: string }> }) {
  return <CompareView params={params} />;
}

async function CompareView({ params }: { params: Promise<{ slug?: string }> }) {
  const { slug } = await params;
  const dilemma = slug ? DILEMMAS.find((entry) => entry.slug === slug) : undefined;
  const subject = dilemma ?? DILEMMAS[0];
  if (!subject) {
    return <p className="mt-10 text-crimson">No dilemma loaded.</p>;
  }

  const result = compareRealms(subject.id, SEED);
  if (!result) {
    return <p className="mt-10 text-crimson">No realm verdicts computed.</p>;
  }

  const { comparison, realms } = result;

  // Group the verdicts by which option won them: the shape of the disagreement
  // is the finding, not the individual rows.
  const byOption = new Map<string, typeof realms>();
  for (const realm of realms) {
    const bucket = byOption.get(realm.winnerId) ?? [];
    bucket.push(realm);
    byOption.set(realm.winnerId, bucket);
  }

  return (
    <div className="flex flex-col gap-14">
      <header className="max-w-3xl">
        <p className="eyebrow">Twelve courts, one case each</p>
        <h1 className="serif mt-4 text-4xl leading-tight text-parchment">How each realm rules</h1>
        <p className="mt-5 text-lg leading-relaxed text-parchment-dim">
          Every advisor seated in their own kingdom, deciding alone, on the same dilemma and the same
          seed. There is no majority and no chair: the useful output is the split.
        </p>
        <p className="mt-4 text-base leading-relaxed text-parchment-dim/90">{comparison.summary}</p>
      </header>

      {/* ------------------------------ case picker ----------------------------- */}
      <nav aria-label="Choose a dilemma" className="flex flex-wrap gap-2 border-y border-abyss-border py-5">
        {DILEMMAS.map((entry) => (
          <Link
            key={entry.id}
            href={entry.slug === subject.slug ? "/compare" : `/compare/${entry.slug}`}
            aria-current={entry.slug === subject.slug ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              entry.slug === subject.slug
                ? "border-gold bg-gold/15 text-gold"
                : "border-abyss-border text-parchment-dim hover:border-parchment-dim hover:text-parchment"
            }`}
          >
            {entry.title}
          </Link>
        ))}
      </nav>

      {/* -------------------------------- verdict ------------------------------- */}
      <section className="grid gap-4 sm:grid-cols-3" data-testid="compare-verdict">
        <div className="plate rounded-realm p-6">
          <p className="eyebrow">Distinct verdicts</p>
          <p className="serif mt-2 text-4xl text-gold tabular">{comparison.distinctWinners}</p>
          <p className="mt-2 text-xs text-parchment-dim/80">
            across {realms.length} realms, on {subject.options.length} options
          </p>
        </div>
        <div className="plate rounded-realm p-6">
          <p className="eyebrow">Agreement</p>
          <p className="serif mt-2 text-4xl text-parchment">{comparison.agreed ? "unanimous" : "split"}</p>
          <p className="mt-2 text-xs text-parchment-dim/80">seed {SEED}</p>
        </div>
        <div className="plate rounded-realm p-6">
          <p className="eyebrow">Where they split</p>
          <ul className="mt-2 space-y-1">
            {[...byOption.entries()].map(([optionId, holders]) => (
              <li key={optionId} className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate text-parchment-dim">{holders[0]?.winnerLabel ?? optionId}</span>
                <span className="font-mono text-gold tabular">{holders.length}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------ realms grid ----------------------------- */}
      <section>
        <h2 className="serif text-2xl text-parchment">Every realm, in its own voice</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...realms]
            .sort((a, b) => b.margin - a.margin)
            .map((realm) => (
              <li key={realm.kingdomId} className="plate rounded-realm p-5" data-testid="realm-verdict">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm"
                    style={{ backgroundColor: `${realm.colour}1f`, color: realm.colour }}
                    aria-hidden
                  >
                    {realm.glyph}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/kingdoms/${realm.kingdomId}`}
                      className="serif text-base text-parchment hover:text-gold"
                    >
                      {realm.kingdomName}
                    </Link>
                    <p className="font-mono text-[10px] text-parchment-dim/70">{realm.advisors.join(", ")}</p>
                  </div>
                </div>
                <p className="serif mt-4 text-lg leading-snug text-gold">{realm.winnerLabel}</p>
                <dl className="mt-3 grid grid-cols-3 gap-2 font-mono text-[11px] text-parchment-dim">
                  <div>
                    <dt className="uppercase tracking-[0.14em] opacity-60">margin</dt>
                    <dd className="tabular">{realm.margin.toFixed(3)}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.14em] opacity-60">conf</dt>
                    <dd className="tabular">{realm.confidence.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.14em] opacity-60">dissent</dt>
                    <dd className="tabular">{realm.dissentCount}</dd>
                  </div>
                </dl>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-parchment-dim/60">
                  decided on {realm.decidingAxis}
                  {realm.superMajority ? " · super-majority" : " · no super-majority"}
                </p>
              </li>
            ))}
        </ul>
      </section>

      {/* -------------------------- where the realms pair ------------------------ */}
      <section>
        <h2 className="serif text-2xl text-parchment">Where the realms disagree most</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-parchment-dim">
          Two realms whose margin sits on opposite sides of the case, ranked by how far apart their
          confidence is. A realm that rules decisively for an option that its rival rejects confidently
          is a more interesting object than either verdict alone.
        </p>
        <ul className="mt-6 space-y-3">
          {pairsOf(realms).map((pair) => (
            <li key={pair.key} className="plate rounded-realm p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span style={{ color: pair.a.colour }} className="serif">
                  {pair.a.kingdomName}
                </span>
                <span className="text-crimson" aria-label="versus">
                  vs
                </span>
                <span style={{ color: pair.b.colour }} className="serif">
                  {pair.b.kingdomName}
                </span>
                <span className="ml-auto font-mono text-xs text-parchment-dim tabular">
                  gap {pair.gap.toFixed(3)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-parchment-dim">
                {pair.a.kingdomName} rules for <span className="text-gold">{pair.a.winnerLabel}</span>;{" "}
                {pair.b.kingdomName} for{" "}
                <span className="text-gold">{pair.b.winnerLabel}</span>.{" "}
                {pair.a.decidingAxis === pair.b.decidingAxis
                  ? "Both decided it on the same axis, from opposite directions."
                  : `One decided it on ${pair.a.decidingAxis}, the other on ${pair.b.decidingAxis}.`}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <nav className="flex flex-wrap gap-4 border-t border-abyss-border pt-8">
        <Link href="/council" className="font-mono text-xs uppercase tracking-[0.18em] text-gold hover:text-parchment">
          Seat one big court →
        </Link>
        <Link href={`/dilemmas/${subject.slug}`} className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold">
          Read the case itself →
        </Link>
      </nav>
    </div>
  );
}

interface Pair {
  key: string;
  a: RealmVerdict;
  b: RealmVerdict;
  gap: number;
}

/**
 * The sharpest available disagreements: realms that ruled for *different*
 * options, ordered by how confident each was.
 */
function pairsOf(realms: RealmVerdict[]): Pair[] {
  const pairs: Pair[] = [];
  for (let i = 0; i < realms.length; i += 1) {
    for (let j = i + 1; j < realms.length; j += 1) {
      const a = realms[i];
      const b = realms[j];
      if (!a || !b || a.winnerId === b.winnerId) continue;
      const gap = Math.abs(a.confidence - b.confidence) + Math.abs(a.margin - b.margin);
      pairs.push({ key: `${a.kingdomId}-${b.kingdomId}`, a, b, gap });
    }
  }
  return pairs.sort((x, y) => y.gap - x.gap).slice(0, 5);
}
