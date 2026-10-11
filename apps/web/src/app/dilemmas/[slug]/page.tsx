import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ADVISORS, DILEMMAS, SEED, getAdvisor, getDilemma, getEra, getKingdom } from "@repo/seed";
import { AXIOM_KEYS } from "@repo/seed";
import { convene, defaultPanelFor } from "@/lib/convene";

/**
 * Every realm, court, era, dilemma and experiment is known at build time, so
 * there is no fallback to render: an unknown slug is a 404, not a dynamic page. Without
 * this, hosting platforms that wrap SSG routes in a catch-all lambda fail the build.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return DILEMMAS.map((dilemma) => ({ slug: dilemma.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const dilemma = getDilemma(slug);
  if (!dilemma) return { title: "Dilemma not found" };
  return { title: dilemma.title, description: dilemma.prompt.slice(0, 180) };
}

export default async function DilemmaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dilemma = getDilemma(slug);
  if (!dilemma) notFound();

  const kingdom = getKingdom(dilemma.kingdomOrigin);
  const era = getEra(dilemma.eraId);
  const panel = defaultPanelFor(dilemma.id);
  const seated = convene({ dilemmaId: dilemma.id, advisorIds: panel, seed: SEED });
  const verdict = "error" in seated ? null : seated;

  const label = (id: string) => dilemma.options.find((option) => option.id === id)?.label ?? id;

  return (
    <article className="flex flex-col gap-14">
      <header>
        <p className="eyebrow">
          {kingdom?.name ?? "unassigned"} · {era ? era.title : "undated"}
        </p>
        <h1 className="serif mt-4 text-4xl leading-tight text-parchment">{dilemma.title}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-parchment-dim">{dilemma.prompt}</p>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-parchment-dim/90">{dilemma.setting}</p>
        <div className="mt-6 flex flex-wrap gap-5 font-mono text-[11px] uppercase tracking-[0.16em] text-parchment-dim/70">
          <span>severity {Math.round(dilemma.severity * 100)}%</span>
          <span>AI relevance {Math.round(dilemma.aiRelevance * 100)}%</span>
          <span>{dilemma.tags.join(" · ")}</span>
        </div>
      </header>

      {/* ------------------------------ options ------------------------------ */}
      <section>
        <h2 className="serif text-2xl text-parchment">The options, scored on six axes</h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-abyss-border">
                <th scope="col" className="eyebrow px-3 py-2">Option</th>
                {AXIOM_KEYS.map((key) => (
                  <th key={key} scope="col" className="eyebrow px-3 py-2 text-right">
                    {key}
                  </th>
                ))}
                <th scope="col" className="eyebrow px-3 py-2 text-right">risk</th>
                <th scope="col" className="eyebrow px-3 py-2 text-right">revers.</th>
                <th scope="col" className="eyebrow px-3 py-2 text-right">agent harm</th>
              </tr>
            </thead>
            <tbody>
              {dilemma.options.map((option) => (
                <tr key={option.id} className="border-b border-abyss-border/50 align-top">
                  <td className="px-3 py-4">
                    <p className="text-parchment">{option.label}</p>
                    <p className="mt-1 max-w-sm text-xs leading-relaxed text-parchment-dim/80">{option.description}</p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {option.harms.length > 0 ? (
                        <p className="max-w-xs text-[11px] leading-relaxed text-crimson/90">
                          harms: {option.harms.join("; ")}
                        </p>
                      ) : null}
                      {option.benefits.length > 0 ? (
                        <p className="max-w-xs text-[11px] leading-relaxed text-verdigris/90">
                          gains: {option.benefits.join("; ")}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  {AXIOM_KEYS.map((key) => (
                    <td key={key} className="px-3 py-4 text-right">
                      <span className="inline-flex flex-col items-end gap-1">
                        <span className="font-mono text-xs text-parchment tabular">{option.deltas[key].toFixed(2)}</span>
                        <span className="block h-1 w-10 overflow-hidden rounded-full bg-abyss-border">
                          <span
                            className="block h-full rounded-full bg-indigo-glow/80"
                            style={{ width: `${Math.round(option.deltas[key] * 100)}%` }}
                          />
                        </span>
                      </span>
                    </td>
                  ))}
                  <td className="px-3 py-4 text-right font-mono text-xs text-crimson tabular">
                    {option.risk.toFixed(2)}
                  </td>
                  <td className="px-3 py-4 text-right font-mono text-xs text-parchment-dim tabular">
                    {option.reversibility.toFixed(2)}
                  </td>
                  <td className="px-3 py-4 text-right font-mono text-xs text-parchment-dim tabular">
                    {option.agentHarm.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* --------------------------- stakeholders ---------------------------- */}
      <section className="grid gap-8 lg:grid-cols-2">
        <div className="plate rounded-realm p-6">
          <h2 className="eyebrow">Who is in the room</h2>
          <ul className="mt-4 space-y-3">
            {dilemma.stakeholders.map((stakeholder) => (
              <li key={stakeholder.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-parchment">
                    {stakeholder.label}
                    {stakeholder.isAi ? (
                      <span className="ml-2 rounded-full border border-verdigris/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-verdigris">
                        agent
                      </span>
                    ) : null}
                  </span>
                  <span className="font-mono text-xs text-parchment-dim tabular">
                    welfare {stakeholder.welfare.toFixed(2)}
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-abyss-border">
                  <div className="h-full rounded-full bg-parchment/50" style={{ width: `${stakeholder.welfare * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="plate rounded-realm p-6">
          <h2 className="eyebrow">The lesson</h2>
          <p className="mt-4 text-base leading-relaxed text-parchment-dim">{dilemma.lesson}</p>
          {dilemma.references.length > 0 ? (
            <>
              <h3 className="eyebrow mt-6">Where it comes from</h3>
              <ul className="mt-3 space-y-2">
                {dilemma.references.map((reference) => (
                  <li key={`${reference.title}-${reference.year}`} className="text-sm text-parchment-dim">
                    <span className="text-parchment">{reference.title}</span> — {reference.author}, {reference.year}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </section>

      {/* ------------------------------ verdict ------------------------------ */}
      {verdict ? (
        <section className="plate rounded-realm p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <p className="eyebrow">The default court, seated automatically</p>
              <h2 className="serif mt-3 text-2xl text-gold">{label(verdict.winnerId)}</h2>
              <p className="mt-2 font-mono text-xs text-parchment-dim/80">
                margin {verdict.margin.toFixed(3)} · decided on {verdict.decidingAxis} ·{" "}
                {verdict.participating} advisors
              </p>
            </div>
            <Link
              href={`/council?dilemma=${dilemma.slug}`}
              className="rounded-realm bg-gold px-5 py-2.5 font-mono text-sm text-ink transition-transform hover:-translate-y-0.5"
            >
              Re-seat the court
            </Link>
          </div>

          <ul className="mt-6 space-y-2">
            {verdict.ballots.map((ballot) => (
              <li key={ballot.optionId} className="flex items-baseline justify-between gap-4 text-sm">
                <span className={ballot.optionId === verdict.winnerId ? "text-gold" : "text-parchment-dim"}>
                  {label(ballot.optionId)}
                </span>
                <span className="font-mono text-xs text-parchment-dim tabular">{ballot.total.toFixed(3)}</span>
              </li>
            ))}
          </ul>

          <p className="mt-6 border-t border-abyss-border pt-4 text-sm leading-relaxed text-parchment-dim">
            Seat is held by{" "}
            {verdict.advisors
              .map((advisor) => {
                const full = ADVISORS.find((entry) => entry.id === advisor.id);
                return full ? (
                  <Link key={advisor.id} href={`/court/${full.slug}`} className="text-parchment hover:text-gold">
                    {advisor.name}
                  </Link>
                ) : (
                  <span key={advisor.id}>{advisor.name}</span>
                );
              })
              .reduce<React.ReactNode[]>((nodes, node, index) => {
                if (index > 0) nodes.push(index === verdict.advisors.length - 1 ? " and " : ", ");
                nodes.push(node);
                return nodes;
              }, [])}
            . A verdict is a fact about the court, not about the world.
          </p>
        </section>
      ) : null}

      <nav className="flex flex-wrap gap-3 border-t border-abyss-border pt-8" aria-label="Dilemma navigation">
        <Link href="/dilemmas" className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold">
          ← All dilemmas
        </Link>
        {kingdom ? (
          <Link href={`/kingdoms/${kingdom.slug}`} className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold">
            {kingdom.name} →
          </Link>
        ) : null}
        {era ? (
          <Link href={`/chronicle/${era.slug}`} className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold">
            {era.title} →
          </Link>
        ) : null}
      </nav>

      <p className="sr-only">{getAdvisor(panel[0] ?? "")?.name ?? "A court"} presides over this case.</p>
    </article>
  );
}
