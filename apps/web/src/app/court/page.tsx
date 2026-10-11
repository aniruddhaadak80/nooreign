import type { Metadata } from "next";
import Link from "next/link";
import { ADVISORS, KINGDOMS, getKingdom } from "@repo/seed";

export const metadata: Metadata = {
  title: "The Court",
  description:
    "Twenty-eight advisors across twelve kingdoms: Aristotle, Kant, Bentham, Mozi, the Buddha, Williams, Held, Rawls, Tuttle, Bostrom and more — each with a signature move the council engine actually uses.",
};

export default function CourtPage() {
  return (
    <div>
      <header className="max-w-3xl">
        <p className="eyebrow">Atlas · the court</p>
        <h1 className="serif mt-4 text-4xl leading-tight text-parchment">Twenty-eight advisors, in twelve courts</h1>
        <p className="mt-5 text-lg leading-relaxed text-parchment-dim">
          Nobody here is a language model. Each advisor is a six-axis weight vector, a temperament, and
          four argument moves written so a reader can check the attribution — Kant really does reach for
          universalisation, Mozi really does run the impartiality test. When they disagree in the council
          chamber, you can always find the premise that moved them.
        </p>
      </header>

      <div className="mt-14 flex flex-col gap-14">
        {KINGDOMS.map((kingdom) => {
          const advisors = ADVISORS.filter((advisor) => advisor.kingdomId === kingdom.id);
          if (advisors.length === 0) return null;
          return (
            <section key={kingdom.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-abyss-border pb-3">
                <h2 className="serif text-2xl text-parchment" style={{ color: kingdom.crest.primary }}>
                  {kingdom.name}
                </h2>
                <Link
                  href={`/kingdoms/${kingdom.slug}`}
                  className="font-mono text-[11px] uppercase tracking-[0.16em] text-parchment-dim hover:text-gold"
                >
                  Enter the realm →
                </Link>
              </div>
              <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {advisors.map((advisor) => (
                  <li key={advisor.id}>
                    <Link
                      href={`/court/${advisor.slug}`}
                      className="plate flex h-full flex-col gap-3 rounded-realm p-5 transition-colors hover:border-gold/50"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-serif text-lg"
                          style={{ backgroundColor: `${advisor.portrait.hue}1f`, color: advisor.portrait.hue }}
                          aria-hidden
                        >
                          {advisor.portrait.sigil.slice(0, 2)}
                        </span>
                        <div className="min-w-0">
                          <p className="serif text-lg leading-tight text-parchment">{advisor.name}</p>
                          <p className="font-mono text-[11px] text-parchment-dim/70">
                            {advisor.born < 0 ? `${Math.abs(advisor.born)} BCE` : advisor.born}
                            {advisor.died === null ? " – present" : ` – ${advisor.died < 0 ? `${Math.abs(advisor.died)} BCE` : advisor.died}`}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-parchment-dim">{advisor.epithet}</p>
                      <div className="mt-auto border-t border-abyss-border/70 pt-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
                          {advisor.signatureMove.name}
                        </p>
                        <p className="mt-1.5 text-sm leading-relaxed text-parchment-dim/90">
                          {advisor.signatureMove.description}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="mt-16 rounded-realm border border-dashed border-abyss-border p-6 text-sm leading-relaxed text-parchment-dim">
        A note on omissions: the courts here are almost entirely the tradition of Western and Chinese
        moral philosophy plus the modern alignment literature. The gaps are real — Indian, African,
        Islamic and indigenous traditions are represented through their most-cited modern commentators
        rather than from within. The Ubuntu Weave is the thinnest of the twelve and the most
        consequential omission in this repository.
      </p>

      <nav className="mt-10 flex flex-wrap gap-3 border-t border-abyss-border pt-8" aria-label="Court navigation">
        <Link href="/council" className="font-mono text-xs uppercase tracking-[0.18em] text-gold hover:text-parchment">
          Convene them →
        </Link>
        <Link href="/kingdoms" className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold">
          ← The kingdoms
        </Link>
      </nav>
      <p className="sr-only">
        {ADVISORS.length} advisors across {KINGDOMS.length} kingdoms; every advisor belongs to{" "}
        {getKingdom(ADVISORS[0]?.kingdomId ?? "")?.name ?? "a kingdom"}.
      </p>
    </div>
  );
}
