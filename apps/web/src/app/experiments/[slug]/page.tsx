import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EXPERIMENTS, getExperiment } from "@repo/seed";
import { ExperimentBench } from "@/components/experiments/experiment-bench";

export function generateStaticParams() {
  return EXPERIMENTS.map((experiment) => ({ slug: experiment.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const experiment = getExperiment(slug);
  if (!experiment) return { title: "Experiment not found" };
  return { title: experiment.name, description: experiment.question };
}

export default async function ExperimentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const experiment = getExperiment(slug);
  if (!experiment) notFound();

  return (
    <article className="flex flex-col gap-14">
      <header>
        <p className="eyebrow">
          {experiment.model} · {experiment.authors}
        </p>
        <h1 className="serif mt-4 text-4xl leading-tight text-parchment">{experiment.name}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-parchment-dim">{experiment.question}</p>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-parchment-dim/90">{experiment.setup}</p>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-parchment-dim/60">
          first published {experiment.year < 0 ? `${Math.abs(experiment.year)} BCE` : experiment.year} · {experiment.origin}
        </p>
      </header>

      <ExperimentBench experiment={experiment} />

      <section>
        <h2 className="serif text-2xl text-parchment">What the sweep shows</h2>
        <ul className="mt-6 space-y-3">
          {experiment.findings.map((finding) => (
            <li key={finding} className="plate rounded-realm border-l-2 border-verdigris/60 p-5 text-sm leading-relaxed text-parchment-dim">
              {finding}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="serif text-2xl text-parchment">Sources</h2>
        <ul className="mt-6 space-y-2">
          {experiment.references.map((reference) => (
            <li key={reference} className="text-sm text-parchment-dim">
              — {reference}
            </li>
          ))}
        </ul>
      </section>

      <nav className="flex flex-wrap gap-3 border-t border-abyss-border pt-8" aria-label="Experiment navigation">
        <Link href="/experiments" className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold">
          ← All experiments
        </Link>
        <Link href="/method" className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold">
          How the models work →
        </Link>
      </nav>
    </article>
  );
}
