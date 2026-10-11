import type { Metadata } from "next";
import Link from "next/link";
import { ATLAS_STATS, AXIOM_KEYS, DIMENSION_META, SEED } from "@repo/seed";
import { JITTER } from "@repo/core";

export const metadata: Metadata = {
  title: "Method",
  description:
    "How Nooreign computes a verdict: six moral axes, dot products, seeded argument graphs, and why the trace you read is the answer rather than an explanation of one.",
};

export default function MethodPage() {
  return (
    <div className="flex flex-col gap-14">
      <header className="max-w-3xl">
        <p className="eyebrow">Method</p>
        <h1 className="serif mt-4 text-4xl leading-tight text-parchment">
          How a verdict is computed, and why you can check it
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-parchment-dim">
          Most systems that show you &ldquo;their reasoning&rdquo; show you a narration generated after the
          fact. Nooreign does not have a model to narrate. A deliberation is arithmetic, and the trace
          you read on the council page is the arithmetic itself — the same products, the same rounding,
          the same seeded jitter.
        </p>
      </header>

      {/* ------------------------------- 1. Axes ------------------------------ */}
      <section>
        <p className="eyebrow">Step one</p>
        <h2 className="serif mt-3 text-2xl text-parchment">Six axes, because six is what fits on a page and four is a lie</h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-parchment-dim">
          Every advisor and every option is reduced to a weighting over the same six dimensions. The
          compression is deliberate and lossy; the page below says what each axis means and which
          tradition tends to load it.
        </p>
        <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {AXIOM_KEYS.map((key) => {
            const meta = DIMENSION_META[key];
            return (
              <li key={key} className="plate rounded-realm p-5">
                <h3 className="serif text-lg text-parchment">{meta.label}</h3>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-gold">
                  {meta.pole[0]} ← → {meta.pole[1]}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-parchment-dim">{meta.gloss}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ------------------------------ 2. Scores ----------------------------- */}
      <section>
        <p className="eyebrow">Step two</p>
        <h2 className="serif mt-3 text-2xl text-parchment">The score is a dot product, and it is on the page</h2>
        <div className="plate mt-6 overflow-x-auto rounded-realm p-6">
          <pre className="font-mono text-sm leading-relaxed text-parchment">
            <code>{`for each advisor a, each option o:
    contributions = AXIS_KEYS.map(k => ({
        axis:    k,
        weight:  a.axioms[k],          // how much this advisor cares
        delta:   o.deltas[k],          // how much this option honours it
        product: round(a.axioms[k] * o.deltas[k], 4)
    }))

    subtotal = Σ contributions.product / Σ a.axioms[k]   // normalised, div-by-zero guarded
    jitter   = seeded(seed, a.id, o.id) * ${JITTER}          // ± ${JITTER}, decorrelated streams
    total    = round(subtotal + jitter, 4)

position(a) = argmax_o total(a, o)
winner      = argmax_o Σ_a total(a, o)   // tie-break: mean score, then lower risk, then id`}</code>
          </pre>
        </div>
        <p className="mt-3 font-mono text-[11px] text-parchment-dim/70">
          The jitter bound above is read from <code className="text-gold">JITTER</code> in{" "}
          <code className="text-gold">packages/core/src/council/deliberation.ts</code> at render time, so this
          page cannot drift away from the engine it documents.
        </p>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-parchment-dim">
          The contributions array is rendered verbatim on the council page. If a verdict looks wrong, the
          numbers that made it are on screen, and changing an advisor&rsquo;s weighting in
          <code className="mx-1 font-mono text-[13px] text-gold">packages/seed</code> changes the verdict
          reproducibly.
        </p>
      </section>

      {/* ------------------------------ 3. Rounds ---------------------------- */}
      <section>
        <p className="eyebrow">Step three</p>
        <h2 className="serif mt-3 text-2xl text-parchment">Three rounds, each seeded separately</h2>
        <ol className="mt-6 space-y-4">
          {[
            {
              round: "Round one — positions",
              body: "Each advisor scores every option and commits to a favourite, attaching the argument moves whose tags match the dilemma. This is where the numbers live.",
            },
            {
              round: "Round two — objections",
              body: "Each advisor answers their strongest rival option with their heaviest objection move, recording which option it answers. An objection that targets nothing is dropped rather than silently kept.",
            },
            {
              round: "Round three — appeals",
              body: "Advisors who lost narrowly commit an appeal or a synthesis move. Conviction is scaled by how close the vote was, so a 51–49 split is visibly more contested than a 90–10 one.",
            },
          ].map((entry) => (
            <li key={entry.round} className="plate rounded-realm p-6">
              <h3 className="serif text-lg text-parchment">{entry.round}</h3>
              <p className="mt-2 text-sm leading-relaxed text-parchment-dim">{entry.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* -------------------------- 4. What it is not ------------------------- */}
      <section>
        <p className="eyebrow">Limits</p>
        <h2 className="serif mt-3 text-2xl text-parchment">What this simulation is not</h2>
        <ul className="mt-6 space-y-4">
          {[
            "It is not a philosopher. An advisor is six weights and four paragraphs; the real positions are richer, internally inconsistent, and change across a career. Kant in 1781 and Kant in 1797 are not the same object, and this atlas cannot show you that.",
            "It is not an alignment argument. Showing that a dilemma splits a court is a fact about the dilemma. It says nothing about which split is correct, and nothing about whether a system that scores well here would be safe.",
            "It is not evidence about minds. Whether any of these systems experience anything is precisely the open question this repository refuses to answer by assertion.",
            "The six axes are not a theory of ethics. They are a rendering constraint chosen so that a radar chart has room. Real moral disagreement does not come in six neat columns.",
          ].map((item) => (
            <li key={item} className="flex gap-3 text-base leading-relaxed text-parchment-dim">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-crimson" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------ 5. Data ------------------------------- */}
      <section>
        <p className="eyebrow">Provenance</p>
        <h2 className="serif mt-3 text-2xl text-parchment">Where the data comes from</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="plate rounded-realm p-6">
            <h3 className="serif text-lg text-parchment">Offline, typed, validated</h3>
            <p className="mt-2 text-sm leading-relaxed text-parchment-dim">
              {ATLAS_STATS.kingdoms} kingdoms, {ATLAS_STATS.advisors} advisors, {ATLAS_STATS.eras} eras,{" "}
              {ATLAS_STATS.dilemmas} dilemmas, {ATLAS_STATS.techniques} techniques and{" "}
              {ATLAS_STATS.glossary} glossary entries are plain TypeScript literals behind zod schemas.
              Foreign keys are checked at import; a malformed edit fails loudly instead of rendering as an
              empty page. A cold clone needs no network and no keys.
            </p>
          </div>
          <div className="plate rounded-realm p-6">
            <h3 className="serif text-lg text-parchment">Generated from seed {SEED}</h3>
            <p className="mt-2 text-sm leading-relaxed text-parchment-dim">
              Every stochastic path in the repository — jitter, sweeps, prompt selection, search
              ordering — derives from a single recorded seed through a mulberry32 PRNG. Regenerating with
              the same seed reproduces this repository exactly.
            </p>
          </div>
        </div>
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-parchment-dim/80">
          Historical claims (dates, titles, attributions) were written to be checkable against the primary
          record. Where an exact quotation was not certain, the entry is marked as a paraphrase rather
          than dressed up as verbatim. If you find an error, it is a bug and the
          <Link href="https://github.com/aniruddhaadak80/nooreign/issues" className="mx-1 text-gold hover:underline" rel="noreferrer noopener" target="_blank">
            issue tracker
          </Link>
          is the right place to say so.
        </p>
      </section>

      <nav className="flex flex-wrap gap-4 border-t border-abyss-border pt-8" aria-label="Method navigation">
        <Link href="/council" className="font-mono text-xs uppercase tracking-[0.18em] text-gold hover:text-parchment">
          See it running →
        </Link>
        <Link href="/chronicle" className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold">
          The chronicle
        </Link>
      </nav>
    </div>
  );
}
