import type { Metadata } from "next";
import Link from "next/link";
import { DIMENSION_META, getDilemma } from "@repo/seed";
import { defaultPanelFor } from "@/lib/convene";
import { briefDilemma } from "@/lib/courts";

export const metadata: Metadata = {
  title: "Dilemma engine",
  description:
    "What each case is actually about before anyone argues about it: the axis it pivots on, the axis nobody disputes, the moral currency of every option, and how far each advisor sits from the court mean.",
};

export const dynamic = "force-dynamic";

export default function EnginePage() {
  return <EngineView />;
}

function EngineView() {
  // The hardest AI-relevant case by default; the reader can move to any other
  // through the table below.
  const focus = "d01";
  const dilemma = getDilemma(focus);
  if (!dilemma) return <p className="mt-10 text-crimson">No dilemma loaded.</p>;

  const brief = briefDilemma(focus, defaultPanelFor(focus));
  if (!brief) return <p className="mt-10 text-crimson">Could not analyse that case.</p>;

  const { analysis, reading } = brief;
  const pivot = DIMENSION_META[analysis.pivotAxis];
  const settled = DIMENSION_META[analysis.settledAxis];
  const label = (id: string) => dilemma.options.find((option) => option.id === id)?.label ?? id;

  return (
    <div className="flex flex-col gap-14">
      <header className="max-w-3xl">
        <p className="eyebrow">The engine beneath the council</p>
        <h1 className="serif mt-4 text-4xl leading-tight text-parchment">What the case is actually about</h1>
        <p className="mt-5 text-lg leading-relaxed text-parchment-dim">
          Before anyone argues, a case has a shape. This page computes it: the axis the options most
          disagree on, the axis they barely touch, the moral currency and fairness of each option, and
          how far each advisor sits from the court&rsquo;s centre of gravity.
        </p>
      </header>

      <section className="plate rounded-realm p-8" data-testid="engine-brief">
        <p className="eyebrow">{dilemma.title}</p>
        <div className="mt-5 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="serif text-xl text-gold">It pivots on {pivot.label}</h2>
            <p className="mt-2 text-sm leading-relaxed text-parchment-dim">{pivot.gloss}</p>
            <p className="mt-3 text-xs leading-relaxed text-parchment-dim/70">{analysis.summary}</p>
          </div>
          <div>
            <h2 className="serif text-xl text-verdigris">Nobody disputes {settled.label}</h2>
            <p className="mt-2 text-sm leading-relaxed text-parchment-dim">{settled.gloss}</p>
            <p className="mt-3 text-xs leading-relaxed text-parchment-dim/70">
              Total moral currency across the options spans {analysis.totalSpread.toFixed(3)} — the
              narrower this is, the more the real disagreement lives in the argument rather than the
              arithmetic.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------- options ------------------------------- */}
      <section>
        <h2 className="serif text-2xl text-parchment">The options, costed</h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-abyss-border">
                <th scope="col" className="eyebrow px-3 py-2">option</th>
                <th scope="col" className="eyebrow px-3 py-2 text-right">currency</th>
                <th scope="col" className="eyebrow px-3 py-2">band</th>
                <th scope="col" className="eyebrow px-3 py-2 text-right">fairness</th>
                <th scope="col" className="eyebrow px-3 py-2 text-right">agent harm</th>
                <th scope="col" className="eyebrow px-3 py-2 text-right">risk</th>
              </tr>
            </thead>
            <tbody>
              {analysis.options.map((option) => (
                <tr key={option.option.id} className="border-b border-abyss-border/50 align-top" data-testid="engine-option">
                  <td className="px-3 py-4">
                    <Link href={`/dilemmas/${dilemma.slug}`} className="text-parchment hover:text-gold">
                      {option.option.label}
                    </Link>
                    <p className="mt-1 max-w-sm text-xs leading-relaxed text-parchment-dim/80">
                      {option.option.description}
                    </p>
                  </td>
                  <td className="px-3 py-4 text-right font-mono text-xs text-parchment tabular">
                    {option.total.toFixed(3)}
                  </td>
                  <td className="px-3 py-4">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
                        option.band === "generous" || option.band === "transformative"
                          ? "border-verdigris/60 text-verdigris"
                          : option.band === "tragic" || option.band === "costly"
                            ? "border-crimson/60 text-crimson"
                            : "border-gold/60 text-gold"
                      }`}
                    >
                      {option.bandLabel}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-right font-mono text-xs text-parchment-dim tabular">
                    {(1 - option.fairness).toFixed(3)}
                  </td>
                  <td className="px-3 py-4 text-right font-mono text-xs text-parchment-dim tabular">
                    {option.option.agentHarm.toFixed(2)}
                  </td>
                  <td className="px-3 py-4 text-right font-mono text-xs text-crimson tabular">
                    {option.option.risk.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------- the court ------------------------------ */}
      <section>
        <h2 className="serif text-2xl text-parchment">How far each advisor sits from the mean</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-parchment-dim">
          {reading.profile}, with a balance of {reading.balance.toFixed(2)}. Unanimity is{" "}
          {reading.unanimity.toFixed(2)} — zero is a single mind, one is a room of strangers. The most
          isolated advisor is the one whose verdict carries the least weight in the consensus and the
          most information about where the consensus came from.
        </p>
        <ul className="mt-6 space-y-3">
          {[...reading.readings]
            .sort((a, b) => b.isolation - a.isolation)
            .map((advisor) => (
              <li key={advisor.advisorId} className="plate rounded-realm p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <Link
                      href={`/court/${advisor.advisorId}`}
                      className="text-sm text-parchment hover:text-gold"
                    >
                      {advisor.advisorName}
                    </Link>
                    <span className="ml-3 font-mono text-[11px] text-parchment-dim/60">
                      {advisor.profile}
                    </span>
                  </div>
                  <span className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-parchment-dim">{label(advisor.favouriteOptionId)}</span>
                    <span className="tabular text-gold">{advisor.favouriteScore.toFixed(3)}</span>
                    <span className="tabular text-crimson">Δ{advisor.isolation.toFixed(3)}</span>
                  </span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-abyss-border">
                  <div
                    className="h-full rounded-full bg-indigo-glow/70"
                    style={{ width: `${Math.min(100, (advisor.isolation / 2) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
        </ul>
      </section>

      <nav className="flex flex-wrap gap-4 border-t border-abyss-border pt-8">
        <Link href="/compare" className="font-mono text-xs uppercase tracking-[0.18em] text-gold hover:text-parchment">
          Twelve separate courts →
        </Link>
        <Link href="/council" className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold">
          Convene one →
        </Link>
      </nav>
    </div>
  );
}
