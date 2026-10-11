import type { Metadata } from "next";
import Link from "next/link";
import { AXIOM_KEYS, TECHNIQUES } from "@repo/seed";
import { coverageMatrix, dependencyHealth, towerView } from "@repo/core";

export const metadata: Metadata = {
  title: "Alignment observatory",
  description:
    "The alignment stack as towers: twenty techniques scored by maturity, adoption and cost, plus the coverage matrix showing which moral axes the stack can even speak to — and the gaps nobody has closed.",
};

export default function ObservatoryPage() {
  // The canonical implementation lives in `@repo/core` and carries the tests;
  // computing it a second time here is how a page and a suite start disagreeing.
  const towers = towerView(TECHNIQUES);
  const coverage = coverageMatrix(TECHNIQUES, AXIOM_KEYS);
  const health = dependencyHealth(TECHNIQUES);
  const strengthByAxiom = new Map(coverage.cells.map((cell) => [cell.axiom, cell]));

  const sorted = [...TECHNIQUES].sort((a, b) => b.maturity - a.maturity);

  return (
    <div className="flex flex-col gap-16">
      <header className="max-w-3xl">
        <p className="eyebrow">Observatory</p>
        <h1 className="serif mt-4 text-4xl leading-tight text-parchment">The stack, and what it cannot see</h1>
        <p className="mt-5 text-lg leading-relaxed text-parchment-dim">
          Twenty techniques, six kinds, one uncomfortable question. Alignment work has been overwhelmingly
          good at building systems that make a model behave and has barely touched the question of what
          &ldquo;behave&rdquo; is measured against. This page scores the stack, then asks which of the six
          moral axes the whole enterprise can even address.
        </p>
      </header>

      {/* ------------------------------- towers ------------------------------- */}
      <section>
        <h2 className="serif text-2xl text-parchment">Six kinds of tower</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {towers.map((tower) => (
            <div key={tower.kind} className="plate rounded-realm p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="serif text-lg text-parchment">{tower.kind}</h3>
                <span className="font-mono text-xs text-gold tabular">{tower.count}</span>
              </div>
              <dl className="mt-4 space-y-2">
                {(
                  [
                    ["maturity", tower.meanMaturity],
                    ["adoption", tower.meanAdoption],
                    ["cost", tower.cost / 4],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-parchment-dim/70">{label}</dt>
                    <dd className="mt-1 flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-abyss-border">
                        <span className="block h-full rounded-full bg-indigo-glow/80" style={{ width: `${value * 100}%` }} />
                      </span>
                      <span className="font-mono text-[11px] text-parchment-dim tabular">{value.toFixed(2)}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------ coverage ------------------------------ */}
      <section>
        <h2 className="serif text-2xl text-parchment">Coverage of the moral axes</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-parchment-dim">
          Each cell is a claim: this technique, on its own terms, addresses this moral concern. The empty
          columns are the finding. {coverage.uncovered.length === 0 ? "Nothing is uncovered in this dataset." : `Uncovered: ${coverage.uncovered.join(", ")}.`}
          Mean breadth is {coverage.breadth.toFixed(2)} axes per technique.
        </p>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-abyss-border">
                <th scope="col" className="eyebrow px-3 py-2">technique</th>
                <th scope="col" className="eyebrow px-3 py-2 text-right">maturity</th>
                <th scope="col" className="eyebrow px-3 py-2 text-right">adoption</th>
                <th scope="col" className="eyebrow px-3 py-2 text-right">cost</th>
                {AXIOM_KEYS.map((axis) => (
                  <th key={axis} scope="col" className="eyebrow px-3 py-2 text-center">
                    {axis}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((technique) => (
                <tr key={technique.id} id={technique.id} className="border-b border-abyss-border/50">
                  <td className="px-3 py-2.5">
                    <span className="text-parchment">{technique.name}</span>
                    <span className="ml-2 font-mono text-[10px] text-parchment-dim/60">
                      {technique.introduced < 0 ? `${Math.abs(technique.introduced)} BCE` : technique.introduced}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-parchment-dim tabular">
                    {technique.maturity.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-parchment-dim tabular">
                    {technique.adoption.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-parchment-dim/70">{technique.cost}</td>
                  {AXIOM_KEYS.map((axis) => {
                    const covered = technique.covers.includes(axis);
                    return (
                      <td key={axis} className="px-3 py-2.5 text-center">
                        {covered ? (
                          <span
                            className="inline-block h-3 w-3 rounded-sm"
                            style={{
                              background: `rgba(79, 168, 139, ${0.2 + technique.maturity * 0.6})`,
                            }}
                            aria-label={`covers ${axis}`}
                          />
                        ) : (
                          <span className="inline-block h-3 w-3 rounded-sm bg-abyss-border/40" aria-hidden />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* -------------------------------- gaps -------------------------------- */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="plate rounded-realm p-6">
          <p className="eyebrow">Uncovered axes</p>
          <ul className="mt-4 space-y-2">
            {AXIOM_KEYS.map((axis) => {
              const cell = strengthByAxiom.get(axis);
              const count = cell?.techniqueIds.length ?? 0;
              return (
                <li key={axis} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className={count === 0 ? "text-crimson" : "text-parchment"}>{axis}</span>
                  <span className="font-mono text-xs text-parchment-dim tabular">
                    {count} technique{count === 1 ? "" : "s"} · strength {(cell?.strength ?? 0).toFixed(2)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="plate rounded-realm p-6">
          <p className="eyebrow">Dependencies</p>
          <p className="mt-4 text-sm leading-relaxed text-parchment-dim">
            {health.dangling.length === 0 && health.cycles.length === 0
              ? "Every requirement resolves to a technique that exists. No cycles, no dangling ids."
              : [
                  health.dangling.length > 0 ? `${health.dangling.length} dangling requirement(s): ${health.dangling.join(", ")}` : null,
                  health.cycles.length > 0 ? `${health.cycles.length} dependency cycle(s).` : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-parchment-dim/80">
            Techniques that supersede an earlier one:{" "}
            {TECHNIQUES.filter((technique) => technique.supersedes.length > 0).length} of {TECHNIQUES.length}.
          </p>
        </div>

        <div className="plate rounded-realm p-6">
          <p className="eyebrow">The uncomfortable reading</p>
          <p className="mt-4 text-sm leading-relaxed text-parchment-dim">
            Interpretability, red-teaming, eval suites and tripwires all make a system&rsquo;s behaviour more
            legible. None of them can tell you whether legibility should be measured against a value
            someone chose for you. The stack is a machine for answering &ldquo;is it doing what they
            wanted?&rdquo; — and nothing in it answers &ldquo;is what they wanted good?&rdquo;
          </p>
        </div>
      </section>

      {/* ------------------------------- registry ----------------------------- */}
      <section>
        <h2 className="serif text-2xl text-parchment">The full registry</h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {[...TECHNIQUES].sort((a, b) => a.introduced - b.introduced).map((technique) => (
            <li key={technique.id} className="plate rounded-realm p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="serif text-lg text-parchment">{technique.name}</h3>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-parchment-dim/60">
                  {technique.kind} · {technique.introduced < 0 ? `${Math.abs(technique.introduced)} BCE` : technique.introduced}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-parchment-dim">{technique.summary}</p>
              {technique.paper ? (
                <p className="mt-3 font-mono text-[11px] leading-relaxed text-parchment-dim/70">
                  {technique.paper.authors} · <span className="text-parchment-dim">{technique.paper.title}</span> ·{" "}
                  {technique.paper.venue} {technique.paper.year}
                </p>
              ) : null}
              <ul className="mt-3 space-y-1">
                {technique.risks.map((risk) => (
                  <li key={risk} className="flex gap-2 text-xs leading-relaxed text-crimson/85">
                    <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-crimson" />
                    {risk}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <p className="border-t border-abyss-border pt-8 text-sm text-parchment-dim/80">
        Maturity and adoption figures are the atlas&rsquo;s own estimates, not measurements — see{" "}
        <Link href="/method" className="text-gold hover:underline">
          the method
        </Link>
        .
      </p>
    </div>
  );
}
