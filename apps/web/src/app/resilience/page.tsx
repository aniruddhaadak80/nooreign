import type { Metadata } from "next";
import Link from "next/link";
import type { InfluenceVerdict, ResilienceVerdict } from "@repo/core";
import { STRESS_SEEDS, stressAtlas } from "@/lib/resilience";

export const metadata: Metadata = {
  title: "Verdict resilience",
  description:
    "Every case in the atlas swept across consecutive seeds and thinned one advisor at a time: how much of a verdict is the argument, and how much is the draw.",
};

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

/**
 * The atlas-wide stress report.
 *
 * WHY a page and not a paragraph on `/method`: the method page argues the
 * engine is reproducible; this page demonstrates the one place where that
 * claim has teeth — the seed. A reader who suspects the verdict is an artifact
 * of the tie-break can read twenty answers to that suspicion instead of
 * taking one on faith.
 */
export default function ResiliencePage() {
  const atlas = stressAtlas();

  // Every verdict this page stands on, counted the honest way: the sweep, the
  // seated court, and one court per leave-one-out counterfactual.
  const deliberated = atlas.reduce(
    (total, stress) => total + stress.resilience.count + 1 + stress.influence.entries.length,
    0,
  );

  const tally: Record<ResilienceVerdict, number> = { settled: 0, contested: 0, fragile: 0 };
  for (const stress of atlas) tally[stress.resilience.verdict] += 1;
  const robustBenches = atlas.filter((stress) => stress.influence.verdict === "robust").length;

  return (
    <div className="flex flex-col gap-14">
      <header className="max-w-3xl">
        <p className="eyebrow">The atlas under its own engine</p>
        <h1 className="serif mt-4 text-4xl leading-tight text-parchment">
          How much of a verdict is chance?
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-parchment-dim">
          The council is deterministic, but not seedless: every advisor carries a small jitter, so the
          same court can reach a different verdict on a different draw. This page asks the two
          questions that follow. Would another draw have decided the case differently — every case
          re-deliberated across {STRESS_SEEDS} consecutive seeds. And who on the bench is
          load-bearing — every case re-deliberated once more with each advisor removed in turn.
          {" "}
          {deliberated} verdicts were computed to write this page, all of them locally, none of them
          stored.
        </p>
      </header>

      {/* ------------------------------ the tally ------------------------------ */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="resilience-summary">
        <div className="plate rounded-realm p-6">
          <p className="eyebrow">Settled</p>
          <p className="serif mt-2 text-4xl text-verdigris tabular">{tally.settled}</p>
          <p className="mt-2 text-xs leading-relaxed text-parchment-dim/80">
            cases where the draw is not deciding anything — the same option wins every swept seed
          </p>
        </div>
        <div className="plate rounded-realm p-6">
          <p className="eyebrow">Contested</p>
          <p className="serif mt-2 text-4xl text-gold tabular">{tally.contested}</p>
          <p className="mt-2 text-xs leading-relaxed text-parchment-dim/80">
            cases where the verdict survives the sweep but the margins and the deciding axis move under it
          </p>
        </div>
        <div className="plate rounded-realm p-6">
          <p className="eyebrow">Fragile</p>
          <p className="serif mt-2 text-4xl text-crimson tabular">{tally.fragile}</p>
          <p className="mt-2 text-xs leading-relaxed text-parchment-dim/80">
            cases where a different draw hands the verdict to a different option — the seed is
            deciding, and the report says so
          </p>
        </div>
        <div className="plate rounded-realm p-6">
          <p className="eyebrow">Robust benches</p>
          <p className="serif mt-2 text-4xl text-parchment tabular">{robustBenches}</p>
          <p className="mt-2 text-xs leading-relaxed text-parchment-dim/80">
            cases where no single advisor&rsquo;s absence would flip the verdict on the default seed
          </p>
        </div>
      </section>

      {/* ------------------------------ the table ------------------------------ */}
      <section>
        <h2 className="serif text-2xl text-parchment">Every case, under the sweep</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-parchment-dim">
          Stability is the share of swept seeds won by the modal verdict. Flips count adjacent seeds
          that disagree. The bench column reports what leave-one-out found: a pivotal count means that
          many advisors each flip the case alone.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-abyss-border">
                <th scope="col" className="eyebrow px-3 py-2">case</th>
                <th scope="col" className="eyebrow px-3 py-2">modal verdict</th>
                <th scope="col" className="eyebrow px-3 py-2">stability</th>
                <th scope="col" className="eyebrow px-3 py-2 text-right">flips</th>
                <th scope="col" className="eyebrow px-3 py-2 text-right">close seeds</th>
                <th scope="col" className="eyebrow px-3 py-2">bench</th>
              </tr>
            </thead>
            <tbody>
              {atlas.map((stress) => {
                const resilience = stress.resilience;
                const modal = stress.optionLabels.find(
                  (option) => option.id === resilience.modalWinnerId,
                );
                const pivots = stress.influence.pivotalIds.length;
                return (
                  <tr
                    key={stress.dilemmaId}
                    className="border-b border-abyss-border/50 align-top"
                    data-testid="resilience-case"
                  >
                    <td className="px-3 py-4">
                      <Link href={`/resilience/${stress.slug}`} className="text-parchment hover:text-gold">
                        {stress.title}
                      </Link>
                      <p className="mt-1 font-mono text-[11px] text-parchment-dim/60">
                        {stress.panel.length} advisors · seeds {stress.seed}–{stress.seed + resilience.count - 1}
                      </p>
                    </td>
                    <td className="px-3 py-4 text-parchment-dim">{modal?.label ?? "no verdict"}</td>
                    <td className="px-3 py-4">
                      <span className="flex items-center gap-3">
                        <span className="w-12 shrink-0 font-mono text-xs text-parchment tabular">
                          {Math.round(resilience.stability * 100)}%
                        </span>
                        <span className="h-1 w-24 overflow-hidden rounded-full bg-abyss-border">
                          <span
                            className={`block h-full rounded-full ${
                              resilience.verdict === "settled"
                                ? "bg-verdigris/80"
                                : resilience.verdict === "contested"
                                  ? "bg-gold/80"
                                  : "bg-crimson/80"
                            }`}
                            style={{ width: `${Math.round(resilience.stability * 100)}%` }}
                          />
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${VERDICT_STYLE[resilience.verdict]}`}
                        >
                          {resilience.verdict}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-4 text-right font-mono text-xs text-parchment-dim tabular">
                      {resilience.flips}
                    </td>
                    <td className="px-3 py-4 text-right font-mono text-xs text-parchment-dim tabular">
                      {resilience.closeSeeds}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${BENCH_STYLE[stress.influence.verdict]}`}
                      >
                        {stress.influence.verdict}
                        {pivots > 0 ? ` ×${pivots}` : ""}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <nav className="flex flex-wrap gap-4 border-t border-abyss-border pt-8">
        <Link
          href="/council"
          className="font-mono text-xs uppercase tracking-[0.18em] text-gold hover:text-parchment"
        >
          Convene a court →
        </Link>
        <Link
          href="/method"
          className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold"
        >
          How determinism works →
        </Link>
        <Link
          href="/engine"
          className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold"
        >
          What a case is about →
        </Link>
      </nav>
    </div>
  );
}
