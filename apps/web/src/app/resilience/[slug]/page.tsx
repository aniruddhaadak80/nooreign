import type { Metadata } from "next";
import Link from "next/link";
import { DILEMMAS, DIMENSION_META, getAdvisor } from "@repo/seed";
import type { InfluenceVerdict, ResilienceVerdict } from "@repo/core";
import { stressFor } from "@/lib/resilience";

/**
 * One case under the engine: the verdict swept across consecutive seeds, and
 * the bench thinned one advisor at a time. Both readings come from
 * `@repo/core`'s `analyseResilience` / `analyseInfluence`, so this page cannot
 * disagree with the council it describes.
 *
 * Twenty cases is enough to render statically — the sweep is deterministic, so
 * the report is baked at build time rather than recomputed per request.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return DILEMMAS.map((dilemma) => ({ slug: dilemma.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const dilemma = DILEMMAS.find((entry) => entry.slug === slug);
  if (!dilemma) return { title: "Verdict resilience" };
  return {
    title: `${dilemma.title} — verdict resilience`,
    description: `The verdict of ${dilemma.title} re-deliberated across consecutive seeds and with each advisor removed in turn.`,
  };
}

const VERDICT_STYLE: Record<ResilienceVerdict, string> = {
  settled: "border-verdigris/60 text-verdigris",
  contested: "border-gold/60 text-gold",
  fragile: "border-crimson/60 text-crimson",
};

const BENCH_STYLE: Record<InfluenceVerdict, string> = {
  robust: "border-verdigris/60 text-verdigris",
  hinged: "border-gold/60 text-gold",
  precarious: "border-crimson/60 text-crimson",
  untested: "border-abyss-border text-parchment-dim/70",
};

const INFLUENCE_LINE: Record<InfluenceVerdict, string> = {
  robust: "No single advisor flips this verdict: remove any one and the same option still wins.",
  hinged:
    "The bench is load-bearing at one or two seats: a single absence hands the case to another option.",
  precarious: "The bench is the verdict: several advisors each flip the case alone when removed.",
  untested: "The bench is below two advisors, so no leave-one-out court can be run.",
};

/** Up to five swatches, one per option in the case's own order. */
const SWATCHES = ["bg-gold/80", "bg-verdigris/80", "bg-crimson/80", "bg-indigo-glow/80", "bg-parchment-dim/60"] as const;

export default async function ResilienceCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dilemma = DILEMMAS.find((entry) => entry.slug === slug);
  if (!dilemma) return <p className="mt-10 text-crimson">No case loaded.</p>;

  const stress = stressFor(dilemma.id);
  if (!stress) return <p className="mt-10 text-crimson">Could not stress that case.</p>;

  const { resilience: r, influence: i } = stress;
  const optionLabel = (id: string) =>
    stress.optionLabels.find((option) => option.id === id)?.label ?? (id === "" ? "no verdict" : id);
  const swatchFor = (optionId: string) => {
    const at = stress.optionLabels.findIndex((option) => option.id === optionId);
    return at >= 0 ? (SWATCHES[at] ?? "bg-parchment-dim/60") : "bg-abyss-border";
  };
  const modalOption = r.options.find((option) => option.optionId === r.modalWinnerId);
  const lastSeed = r.baseSeed + r.count - 1;

  return (
    <div className="flex flex-col gap-14">
      <header className="max-w-3xl">
        <p className="eyebrow">Verdict resilience · the draw of chance</p>
        <h1 className="serif mt-4 text-4xl leading-tight text-parchment">
          Does the verdict survive a different draw?
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-parchment-dim">
          <Link href={`/dilemmas/${dilemma.slug}`} className="text-parchment underline-offset-4 hover:text-gold hover:underline">
            {dilemma.title}
          </Link>{" "}
          as decided by {stress.panel.length} advisors, re-deliberated on seeds {r.baseSeed}–{lastSeed},
          and once more with each advisor removed in turn. The court is the same one the case page seats
          by default.
        </p>
      </header>

      {/* ------------------------------ the sweep ------------------------------ */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="resilience-sweep">
        <div className="plate rounded-realm p-6">
          <p className="eyebrow">Stability</p>
          <p className="serif mt-2 text-4xl text-parchment tabular">
            {Math.round(r.stability * 100)}%
          </p>
          <p className="mt-2 text-xs leading-relaxed text-parchment-dim/80">
            {modalOption?.wins ?? 0} of {r.count} swept seeds
          </p>
          <span
            className={`mt-3 inline-block rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${VERDICT_STYLE[r.verdict]}`}
          >
            {r.verdict}
          </span>
        </div>
        <div className="plate rounded-realm p-6">
          <p className="eyebrow">Modal verdict</p>
          <p className="serif mt-2 text-2xl leading-snug text-gold">{optionLabel(r.modalWinnerId)}</p>
          <p className="mt-2 text-xs leading-relaxed text-parchment-dim/80">
            {r.distinctWinners === 1
              ? "the only option to win any seed"
              : `${r.distinctWinners} options won at least one seed`}
          </p>
        </div>
        <div className="plate rounded-realm p-6">
          <p className="eyebrow">Flips</p>
          <p className="serif mt-2 text-4xl text-parchment tabular">{r.flips}</p>
          <p className="mt-2 text-xs leading-relaxed text-parchment-dim/80">
            adjacent seeds that disagree · longest unbroken run {r.longestStreak}
          </p>
        </div>
        <div className="plate rounded-realm p-6">
          <p className="eyebrow">Inside the close band</p>
          <p className="serif mt-2 text-4xl text-parchment tabular">{r.closeSeeds}</p>
          <p className="mt-2 text-xs leading-relaxed text-parchment-dim/80">
            seeds with margin at or under 0.25 · margins {r.margin.min.toFixed(3)}–
            {r.margin.max.toFixed(3)}, mean {r.margin.mean.toFixed(3)} · confidence{" "}
            {Math.round(r.confidenceMean * 100)}%
          </p>
        </div>
      </section>

      {/* ------------------------------- the draw ------------------------------ */}
      <section>
        <h2 className="serif text-2xl text-parchment">The draw, seed by seed</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-parchment-dim">
          One square per seed, in order, coloured by the option that won it. A single unbroken block is
          a verdict the tie-break never touched; a patchwork is a case where the answer partly depends
          on where you happen to start the stream.
        </p>
        <ol className="mt-6 flex flex-wrap gap-1.5" aria-label={`Winning option for each seed, ${lastSeed - r.baseSeed + 1} seeds`}>
          {r.outcomes.map((outcome) => (
            <li
              key={outcome.seed}
              data-testid="seed-cell"
              data-winner={outcome.winnerId}
              title={`seed ${outcome.seed}: ${optionLabel(outcome.winnerId)} (margin ${outcome.margin.toFixed(3)})`}
              className={`h-6 w-6 rounded-sm ${swatchFor(outcome.winnerId)}`}
            />
          ))}
        </ol>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {r.options.map((option) => (
            <li key={option.optionId} className="flex items-center gap-2 text-xs text-parchment-dim">
              <span className={`h-3 w-3 rounded-sm ${swatchFor(option.optionId)}`} />
              {optionLabel(option.optionId)}
              <span className="font-mono text-parchment-dim/70 tabular">
                {option.wins}/{r.count}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------ the options ---------------------------- */}
      <section className="grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="serif text-2xl text-parchment">Every option, seed by seed</h2>
          <table className="mt-6 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-abyss-border">
                <th scope="col" className="eyebrow px-3 py-2">option</th>
                <th scope="col" className="eyebrow px-3 py-2 text-right">wins</th>
                <th scope="col" className="eyebrow px-3 py-2 text-right">share</th>
                <th scope="col" className="eyebrow px-3 py-2 text-right">first seed</th>
              </tr>
            </thead>
            <tbody>
              {r.options.map((option) => (
                <tr key={option.optionId} className="border-b border-abyss-border/50">
                  <td className="px-3 py-3 text-parchment-dim">
                    {optionLabel(option.optionId)}
                    {option.optionId === r.modalWinnerId ? (
                      <span className="ml-2 rounded-full border border-gold/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gold">
                        modal
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-parchment tabular">
                    {option.wins}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-parchment-dim tabular">
                    {(option.share * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-parchment-dim tabular">
                    {option.firstSeed ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="serif text-2xl text-parchment">Which axis decided the draws</h2>
          <p className="mt-3 text-sm leading-relaxed text-parchment-dim">
            The deciding axis reported by each of the {r.count} verdicts, most frequent first. Where one
            axis towers over the rest, the disagreement never really moved.
          </p>
          <ul className="mt-6 space-y-3">
            {r.axes.map((entry) => {
              const meta = DIMENSION_META[entry.axiom];
              return (
                <li key={entry.axiom}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-parchment-dim">{meta.label}</span>
                    <span className="font-mono text-xs text-parchment-dim/70 tabular">
                      {entry.count}/{r.count}
                    </span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-abyss-border">
                    <div
                      className="h-full rounded-full bg-indigo-glow/70"
                      style={{ width: `${Math.round((entry.count / r.count) * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ------------------------------ the bench ------------------------------ */}
      <section data-testid="influence-panel">
        <h2 className="serif text-2xl text-parchment">Who is load-bearing?</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-parchment-dim">
          {INFLUENCE_LINE[i.verdict]} With everyone seated, the court rules{" "}
          <span className="text-gold">{optionLabel(i.baseWinnerId)}</span> with margin{" "}
          {i.baseMargin.toFixed(3)} and confidence {Math.round(i.baseConfidence * 100)}%.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${BENCH_STYLE[i.verdict]}`}
          >
            bench · {i.verdict}
          </span>
          {i.entries.length > 0 ? (
            <span className="font-mono text-xs text-parchment-dim/70 tabular">
              {i.pivotalIds.length} of {i.entries.length} advisors pivotal at seed {i.seed}
            </span>
          ) : null}
        </div>
        <ul className="mt-6 space-y-3">
          {i.entries.map((entry) => (
            <li key={entry.advisorId} className="plate rounded-realm p-4" data-testid="influence-entry">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="flex flex-wrap items-baseline gap-3">
                  <Link
                    href={`/court/${getAdvisor(entry.advisorId)?.slug ?? entry.advisorId}`}
                    className="text-sm text-parchment hover:text-gold"
                  >
                    {entry.advisorName}
                  </Link>
                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
                      entry.pivotal ? "border-crimson/60 text-crimson" : "border-abyss-border text-parchment-dim/60"
                    }`}
                  >
                    {entry.pivotal ? "pivotal" : "stands"}
                  </span>
                </div>
                <span className="font-mono text-xs text-parchment-dim">
                  without them:{" "}
                  <span className={entry.pivotal ? "text-crimson" : "text-parchment-dim/80"}>
                    {optionLabel(entry.winnerWithoutId)}
                  </span>
                  <span className="ml-3 tabular">
                    Δmargin {entry.marginDelta >= 0 ? "+" : "−"}
                    {Math.abs(entry.marginDelta).toFixed(3)}
                  </span>
                </span>
              </div>
              {entry.pivotal ? (
                <p className="mt-2 text-xs leading-relaxed text-crimson/90">
                  Removing this advisor alone hands the case to {optionLabel(entry.winnerWithoutId)}.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <nav className="flex flex-wrap gap-4 border-t border-abyss-border pt-8">
        <Link
          href="/council"
          className="font-mono text-xs uppercase tracking-[0.18em] text-gold hover:text-parchment"
        >
          Convene this court →
        </Link>
        <Link
          href={`/compare/${dilemma.slug}`}
          className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold"
        >
          Twelve realms, one case →
        </Link>
        <Link
          href="/resilience"
          className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold"
        >
          All cases under the sweep →
        </Link>
      </nav>
    </div>
  );
}
