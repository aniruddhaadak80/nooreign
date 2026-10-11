import type { Metadata } from "next";
import Link from "next/link";
import { DILEMMAS, getKingdom } from "@repo/seed";

export const metadata: Metadata = {
  title: "Dilemmas",
  description:
    "Twenty cases where the moral calculus breaks down: the paperclip maximiser, the oracle, the genie, digital minds, the alignment tax, the longtermist harvest — and the courts that have to rule on them.",
};

export default function DilemmasPage() {
  const sorted = [...DILEMMAS].sort((a, b) => b.aiRelevance - a.aiRelevance);
  const tags = [...new Set(DILEMMAS.flatMap((dilemma) => dilemma.tags))].sort();

  return (
    <div>
      <header className="max-w-3xl">
        <p className="eyebrow">Atlas · dilemmas</p>
        <h1 className="serif mt-4 text-4xl leading-tight text-parchment">Twenty cases where the calculus breaks</h1>
        <p className="mt-5 text-lg leading-relaxed text-parchment-dim">
          A dilemma here is not a puzzle with an answer. Each one is a situation where every option honours
          some axis and violates another, the stakeholders include entities that cannot object, and the
          outcome is not fully reversible. The court can tell you how the advisors split — that is all it
          can tell you.
        </p>
      </header>

      <ul className="mt-8 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <li
            key={tag}
            className="rounded-full border border-abyss-border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-parchment-dim"
          >
            {tag}
          </li>
        ))}
      </ul>

      <ul className="mt-10 grid gap-4 md:grid-cols-2">
        {sorted.map((dilemma) => {
          const kingdom = getKingdom(dilemma.kingdomOrigin);
          return (
            <li key={dilemma.id}>
              <Link
                href={`/dilemmas/${dilemma.slug}`}
                className="plate flex h-full flex-col gap-3 rounded-realm p-6 transition-colors hover:border-crimson/60"
                style={kingdom ? { borderLeft: `3px solid ${kingdom.crest.primary}` } : undefined}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim/70">
                    {kingdom?.name ?? "unassigned"}
                  </span>
                  <span className="flex gap-3 font-mono text-[10px] text-parchment-dim/70">
                    <span className="text-crimson">sev {Math.round(dilemma.severity * 100)}</span>
                    <span className="text-verdigris">ai {Math.round(dilemma.aiRelevance * 100)}</span>
                  </span>
                </div>
                <h2 className="serif text-xl leading-snug text-parchment">{dilemma.title}</h2>
                <p className="text-sm leading-relaxed text-parchment-dim">{dilemma.prompt}</p>
                <div className="mt-auto flex items-center justify-between pt-3 font-mono text-[11px] text-parchment-dim/60">
                  <span>
                    {dilemma.options.length} options · {dilemma.stakeholders.length} stakeholders
                  </span>
                  <span className="text-gold">put it to the court →</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
