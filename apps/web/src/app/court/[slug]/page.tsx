import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ADVISORS, getAdvisor, getKingdom } from "@repo/seed";
import { AxiomRadar } from "@/components/atlas/axiom-radar";
import { VerdictBadge } from "@/components/atlas/verdict-badge";

export function generateStaticParams() {
  return ADVISORS.map((advisor) => ({ slug: advisor.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const advisor = getAdvisor(slug);
  if (!advisor) return { title: "Advisor not found" };
  return {
    title: advisor.name,
    description: `${advisor.name} — ${advisor.epithet}. Signature move: ${advisor.signatureMove.name}. ${advisor.onAi.verdict} about superintelligence.`,
  };
}

const MOVE_KIND_STYLES: Record<string, string> = {
  premise: "border-indigo-glow/50",
  objection: "border-crimson/50",
  appeal: "border-verdigris/50",
  synthesis: "border-gold/50",
};

export default async function AdvisorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const advisor = getAdvisor(slug);
  if (!advisor) notFound();
  const kingdom = getKingdom(advisor.kingdomId);

  return (
    <article className="flex flex-col gap-14">
      <header className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <div>
          {kingdom ? (
            <Link
              href={`/kingdoms/${kingdom.slug}`}
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] hover:text-gold"
              style={{ color: kingdom.crest.primary }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: kingdom.crest.primary }} aria-hidden />
              {kingdom.name}
            </Link>
          ) : null}
          <h1 className="serif mt-4 text-4xl leading-tight text-parchment">{advisor.name}</h1>
          <p className="mt-2 font-mono text-xs text-parchment-dim/70">
            {advisor.born < 0 ? `${Math.abs(advisor.born)} BCE` : advisor.born}
            {advisor.died === null ? " – present" : ` – ${advisor.died < 0 ? `${Math.abs(advisor.died)} BCE` : advisor.died}`} ·{" "}
            {advisor.epithet}
          </p>
          <p className="mt-6 text-lg leading-relaxed text-parchment-dim">{advisor.creed}</p>
        </div>
        <div className="plate rounded-realm p-6">
          <AxiomRadar
            vector={advisor.axioms}
            label={advisor.name}
            {...(kingdom ? { compare: { vector: kingdom.axioms, label: kingdom.name, color: kingdom.crest.primary } } : {})}
          />
          <p className="mt-4 text-center text-xs leading-relaxed text-parchment-dim/70">
            Gold is this advisor; the dashed outline{kingdom ? ` is ${kingdom.name}` : "is the kingdom"}’s own weighting.
          </p>
        </div>
      </header>

      {/* ---------------------------- Signature move --------------------------- */}
      <section className="plate rounded-realm p-8">
        <p className="eyebrow">Signature move</p>
        <h2 className="serif mt-3 text-2xl text-parchment">{advisor.signatureMove.name}</h2>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-parchment-dim/70">
          {advisor.signatureMove.kind}
        </p>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-parchment-dim">{advisor.signatureMove.description}</p>
      </section>

      {/* -------------------------------- Works -------------------------------- */}
      <section>
        <h2 className="serif text-2xl text-parchment">Works</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {advisor.works.map((work) => (
            <li key={work.title} className="plate rounded-realm p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-parchment-dim/70">
                {work.year < 0 ? `${Math.abs(work.year)} BCE` : work.year}
              </p>
              <h3 className="serif mt-1 text-lg text-parchment">{work.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-parchment-dim">{work.note}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* --------------------------- Argument moves --------------------------- */}
      <section>
        <h2 className="serif text-2xl text-parchment">Argument moves</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-parchment-dim">
          These four moves are what the council engine actually draws on. Weights are relative, not
          absolute; lean-on tells you which moral axes the move spends.
        </p>
        <ul className="mt-6 space-y-4">
          {advisor.moves.map((move) => (
            <li key={move.id} className={`plate rounded-realm border-l-2 p-5 ${MOVE_KIND_STYLES[move.kind] ?? ""}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">{move.kind}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-parchment-dim/60">
                  leans on {move.leansOn.join(" · ")}
                </span>
                <span className="font-mono text-[10px] text-parchment-dim/60 tabular">weight {move.weight.toFixed(2)}</span>
              </div>
              <h3 className="serif mt-2 text-lg leading-snug text-parchment">{move.claim}</h3>
              <p className="mt-2 text-sm leading-relaxed text-parchment-dim">{move.support}</p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-abyss-border">
                <div className="h-full rounded-full bg-gold/70" style={{ width: `${Math.round(move.weight * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* -------------------------------- Voice -------------------------------- */}
      <section className="grid gap-8 md:grid-cols-2">
        <div className="plate rounded-realm p-6">
          <p className="eyebrow">Voice</p>
          <p className="mt-3 text-base text-parchment">{advisor.voice.register}</p>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.16em] text-parchment-dim/70">
            cadence: {advisor.voice.cadence}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {advisor.voice.tells.map((tell) => (
              <li key={tell} className="rounded-full border border-abyss-border px-2.5 py-1 font-mono text-[10px] text-parchment-dim">
                {tell}
              </li>
            ))}
          </ul>
        </div>
        <div className="plate rounded-realm p-6">
          <div className="flex items-center gap-3">
            <p className="eyebrow">On superintelligence</p>
            <VerdictBadge verdict={advisor.onAi.verdict} />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-parchment-dim">{advisor.onAi.note}</p>
          <Link
            href={`/council?advisor=${advisor.slug}`}
            className="mt-5 inline-block font-mono text-[11px] uppercase tracking-[0.16em] text-gold hover:text-parchment"
          >
            Seat them in the council →
          </Link>
        </div>
      </section>

      <nav className="flex flex-wrap gap-3 border-t border-abyss-border pt-8" aria-label="Advisor navigation">
        <Link href="/court" className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold">
          ← The full court
        </Link>
        {kingdom ? (
          <Link href={`/kingdoms/${kingdom.slug}`} className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold">
            {kingdom.name} →
          </Link>
        ) : null}
      </nav>
    </article>
  );
}
