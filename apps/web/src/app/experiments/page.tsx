import type { Metadata } from "next";
import Link from "next/link";
import { EXPERIMENTS } from "@repo/seed";

export const metadata: Metadata = {
  title: "Thought experiments",
  description:
    "Eight parameter sweeps over the classic AI-control thought experiments — paperclip, oracle, genie, tool AI, mesa-optimisation, scalable oversight, treacherous copy and the specification gap — with monotone, defensible models.",
};

export default function ExperimentsPage() {
  return (
    <div>
      <header className="max-w-3xl">
        <p className="eyebrow">Experiments</p>
        <h1 className="serif mt-4 text-4xl leading-tight text-parchment">Eight thought experiments, with dials</h1>
        <p className="mt-5 text-lg leading-relaxed text-parchment-dim">
          A thought experiment that cannot be varied is a parable. Each of these takes its canonical
          parameters and sweeps them: capability against goal capture, specification precision against
          gaming, oversight against sandbagging. Every model is a documented equation with the monotonicity
          the theory requires, plus seeded noise small enough not to break it.
        </p>
        <p className="mt-4 text-base leading-relaxed text-parchment-dim/90">
          These are simulations of arguments, not of systems. Nothing here predicts what a real model will
          do; it shows what a claim about a model implies when you take the claim seriously.
        </p>
      </header>

      <ul className="mt-12 grid gap-4 md:grid-cols-2">
        {EXPERIMENTS.map((experiment) => (
          <li key={experiment.id}>
            <Link
              href={`/experiments/${experiment.slug}`}
              className="plate flex h-full flex-col gap-3 rounded-realm p-6 transition-colors hover:border-gold/50"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim/70">
                  {experiment.model}
                </span>
                <span className="font-mono text-[10px] text-parchment-dim/70 tabular">
                  {experiment.year < 0 ? `${Math.abs(experiment.year)} BCE` : experiment.year}
                </span>
              </div>
              <h2 className="serif text-xl leading-snug text-parchment">{experiment.name}</h2>
              <p className="text-sm leading-relaxed text-parchment-dim">{experiment.question}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                {experiment.parameters.map((parameter) => (
                  <span
                    key={parameter.key}
                    className="rounded-full border border-abyss-border px-2.5 py-0.5 font-mono text-[10px] text-parchment-dim"
                  >
                    {parameter.label}
                  </span>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
