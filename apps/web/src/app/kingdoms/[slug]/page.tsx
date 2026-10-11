import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KINGDOMS, advisorsOfKingdom, dilemmasOfKingdom, getKingdom, textsOfKingdom } from "@repo/seed";
import { AxiomRadar } from "@/components/atlas/axiom-radar";
import { KingdomCrest, RelationList } from "@/components/atlas/kingdom-card";
import { VerdictBadge } from "@/components/atlas/verdict-badge";

/**
 * Every realm, court, era, dilemma and experiment is known at build time, so
 * there is no fallback to render: an unknown slug is a 404, not a dynamic page. Without
 * this, hosting platforms that wrap SSG routes in a catch-all lambda fail the build.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return KINGDOMS.map((kingdom) => ({ slug: kingdom.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const kingdom = getKingdom(slug);
  if (!kingdom) return { title: "Realm not found" };
  const founded = kingdom.founded < 0 ? `${Math.abs(kingdom.founded)} BCE` : kingdom.founded;
  return {
    title: kingdom.name,
    description: `${kingdom.name} — ${kingdom.motto} Founded ${founded} by ${kingdom.founder}. ${kingdom.aiStance.headline}`,
  };
}

export default async function KingdomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const kingdom = getKingdom(slug);
  if (!kingdom) notFound();

  const advisors = advisorsOfKingdom(kingdom.id);
  const texts = textsOfKingdom(kingdom.id);
  const dilemmas = dilemmasOfKingdom(kingdom.id);
  const relatives = kingdom.relations
    .map((relation) => ({ relation, other: getKingdom(relation.to) }))
    .filter((entry) => entry.other !== undefined);

  const firstDilemma = dilemmas[0];

  return (
    <article className="flex flex-col gap-16">
      <header className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <div>
          <div className="flex items-center gap-4">
            <KingdomCrest kingdom={kingdom} size={64} />
            <div>
              <p className="eyebrow">
                {kingdom.terrain} · founded {kingdom.founded < 0 ? `${Math.abs(kingdom.founded)} BCE` : kingdom.founded}
              </p>
              <h1 className="serif mt-2 text-4xl leading-tight text-parchment">{kingdom.name}</h1>
            </div>
          </div>
          <blockquote className="serif mt-6 border-l-2 border-gold/60 pl-5 text-xl italic leading-relaxed text-parchment">
            “{kingdom.motto}”
          </blockquote>
          <p className="mt-6 text-lg leading-relaxed text-parchment-dim">{kingdom.creed}</p>
        </div>
        <div className="plate rounded-realm p-6">
          <AxiomRadar vector={kingdom.axioms} label={kingdom.name} />
          <dl className="mt-6 grid grid-cols-2 gap-3">
            {(
              [
                ["caution", kingdom.temperament.caution],
                ["ambition", kingdom.temperament.ambition],
                ["solidarity", kingdom.temperament.solidarity],
                ["formality", kingdom.temperament.formality],
              ] as const
            ).map(([key, value]) => (
              <div key={key}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim/70">{key}</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-abyss-border">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${Math.round(value * 100)}%`, backgroundColor: kingdom.crest.primary }}
                    />
                  </span>
                  <span className="font-mono text-[11px] text-parchment-dim tabular">{Math.round(value * 100)}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {/* ------------------------------ AI stance ------------------------------ */}
      <section className="plate rounded-realm p-8">
        <div className="flex flex-wrap items-center gap-3">
          <p className="eyebrow">On superintelligence</p>
          <VerdictBadge verdict={kingdom.aiStance.verdict} />
        </div>
        <h2 className="serif mt-4 text-2xl leading-snug text-parchment">{kingdom.aiStance.headline}</h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-parchment-dim">{kingdom.aiStance.note}</p>
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {kingdom.questions.map((question) => (
            <li key={question} className="flex gap-3 text-sm leading-relaxed text-parchment-dim">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              {question}
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------- The court ----------------------------- */}
      <section>
        <h2 className="serif text-2xl text-parchment">The court</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {advisors.map((advisor) => (
            <li key={advisor.id}>
              <Link
                href={`/court/${advisor.slug}`}
                className="plate flex h-full items-start gap-4 rounded-realm p-5 transition-colors hover:border-gold/50"
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-serif text-lg"
                  style={{ backgroundColor: `${advisor.portrait.hue}1f`, color: advisor.portrait.hue }}
                  aria-hidden
                >
                  {advisor.name.charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="serif text-lg text-parchment">{advisor.name}</p>
                  <p className="font-mono text-[11px] text-parchment-dim/70">
                    {advisor.born < 0 ? `${Math.abs(advisor.born)} BCE` : advisor.born}
                    {advisor.died === null ? " – present" : ` – ${advisor.died < 0 ? `${Math.abs(advisor.died)} BCE` : advisor.died}`}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-parchment-dim">{advisor.signatureMove.name}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------ Landmarks ----------------------------- */}
      <section>
        <h2 className="serif text-2xl text-parchment">Landmarks</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2">
          {kingdom.landmarks.map((landmark) => (
            <li key={landmark.name} className="plate rounded-realm p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="serif text-base text-parchment">{landmark.name}</h3>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim/60">
                  {landmark.kind}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-parchment-dim">{landmark.note}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------ Relations ----------------------------- */}
      <section>
        <h2 className="serif text-2xl text-parchment">Borders and treaties</h2>
        <div className="mt-6">
          <RelationList kingdom={kingdom} all={KINGDOMS} />
        </div>
        {relatives.length > 0 ? (
          <ul className="mt-6 flex flex-wrap gap-2">
            {relatives.map(({ other }) =>
              other ? (
                <li key={other.id}>
                  <Link
                    href={`/kingdoms/${other.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-abyss-border px-3 py-1 text-xs text-parchment-dim transition-colors hover:border-gold hover:text-gold"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: other.crest.primary }} aria-hidden />
                    {other.name}
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        ) : null}
      </section>

      {/* --------------------------- Canon & dilemmas --------------------------- */}
      <section className="grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="serif text-2xl text-parchment">Canon</h2>
          {texts.length === 0 ? (
            <p className="mt-4 text-sm text-parchment-dim">No texts registered for this realm.</p>
          ) : (
            <ul className="mt-6 space-y-4">
              {texts.map((text) => (
                <li key={text.id} className="plate rounded-realm p-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-parchment-dim/70">
                    {text.kind} · {text.year < 0 ? `${Math.abs(text.year)} BCE` : text.year}
                  </p>
                  <h3 className="serif mt-1 text-lg text-parchment">{text.title}</h3>
                  <p className="mt-1 text-sm text-parchment-dim">{text.author}</p>
                  <p className="mt-2 text-sm leading-relaxed text-parchment-dim/90">{text.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="serif text-2xl text-parchment">Dilemmas from this realm</h2>
          {dilemmas.length === 0 ? (
            <p className="mt-4 text-sm text-parchment-dim">No dilemmas are currently attributed here.</p>
          ) : (
            <ul className="mt-6 space-y-4">
              {dilemmas.map((dilemma) => (
                <li key={dilemma.id}>
                  <Link
                    href={`/dilemmas/${dilemma.slug}`}
                    className="plate block rounded-realm p-5 transition-colors hover:border-crimson/60"
                  >
                    <h3 className="serif text-lg text-parchment">{dilemma.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-parchment-dim">{dilemma.prompt}</p>
                    <p className="mt-3 font-mono text-[11px] text-parchment-dim/60">
                      {dilemma.options.length} options · {dilemma.tags.join(" · ")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {firstDilemma ? (
            <Link
              href={`/council?dilemma=${firstDilemma.slug}`}
              className="mt-6 inline-block rounded-realm bg-gold px-5 py-2.5 font-mono text-sm text-ink transition-transform hover:-translate-y-0.5"
            >
              Put this realm on trial
            </Link>
          ) : null}
        </div>
      </section>

      <nav className="flex flex-wrap gap-3 border-t border-abyss-border pt-8" aria-label="Realm navigation">
        <Link href="/kingdoms" className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold">
          ← All kingdoms
        </Link>
        <Link href="/court" className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold">
          The full court →
        </Link>
      </nav>
    </article>
  );
}
