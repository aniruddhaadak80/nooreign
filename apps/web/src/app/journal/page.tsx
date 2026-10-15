import type { Metadata } from "next";
import Link from "next/link";
import { DILEMMAS, DIMENSION_META, SEED, getAdvisor, getDilemma, getKingdom } from "@repo/seed";
import type { Advisor } from "@repo/seed";
import { analyseDilemma, closingRitual, promptsForAxiom, reflectivePrompts } from "@repo/core";
import { convene, defaultPanelFor } from "@/lib/convene";
import { JournalIsland, type JournalPrompt } from "@/components/journal/journal-island";
import { JOURNAL_STORAGE_KEY } from "@/lib/journal-store";

export const metadata: Metadata = {
  title: "Reflective journal",
  description:
    "Sit with a dilemma and answer the questions the court actually pressed. Six to ten prompts, generated from the advisors' own signature moves and the axis the case turns on — written in your browser and never sent anywhere.",
};

/** The sitting depends on the dilemma in the query string, so this route renders per request. */
export const dynamic = "force-dynamic";

type SearchParams = Readonly<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  return value?.[0];
}

function isAdvisor(value: Advisor | undefined): value is Advisor {
  return value !== undefined;
}

/**
 * The reflective journal.
 *
 * The engine is a server-side concern here: the prompts, the reserve of axis questions and the
 * closing line are all derived from the sitting the council just held, and passing them down as
 * plain data keeps the client island holding nothing but the reader's words.
 *
 * The privacy claim is not decoration. It is true because the module that stores the answers has
 * no request primitive in it, and a test reads that module off disk to keep it that way — so the
 * claim is made here in the same words the test enforces.
 */
export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const requested = first(params["dilemma"]);
  const resolved = requested === undefined ? undefined : getDilemma(requested);
  const dilemma = resolved ?? DILEMMAS[0];

  if (!dilemma) {
    return (
      <p className="mt-10 text-parchment-dim">
        No dilemmas are loaded. The seed datasets are compiled in; a missing dilemma means the seed
        package failed to import.
      </p>
    );
  }

  const kingdom = getKingdom(dilemma.kingdomOrigin);
  if (!kingdom) {
    return (
      <p className="mt-10 text-crimson">
        The realm this dilemma came from is missing from the seed data, so there is no creed to
        hold it against.
      </p>
    );
  }

  const panel = defaultPanelFor(dilemma.id);
  const seated = convene({ dilemmaId: dilemma.id, advisorIds: panel, seed: SEED });
  if ("error" in seated) {
    return <p className="mt-10 text-crimson">Could not convene the default court: {seated.error}</p>;
  }

  const advisors = panel.map((id) => getAdvisor(id)).filter(isAdvisor);
  const prompts: readonly JournalPrompt[] = reflectivePrompts({
    kingdom,
    advisors,
    dilemma,
    seed: SEED,
  }).map((prompt) => ({
    id: prompt.id,
    kind: prompt.kind,
    text: prompt.text,
    ...(prompt.sourceId === undefined ? {} : { sourceId: prompt.sourceId }),
  }));

  const pivotAxis = analyseDilemma(dilemma).pivotAxis;
  const reserve = promptsForAxiom(pivotAxis, kingdom);
  const closing = closingRitual(panel, seated.winnerId);
  const axis = DIMENSION_META[pivotAxis];
  const opening = prompts[0];

  return (
    <article className="flex flex-col gap-14">
      <header className="max-w-3xl">
        <p className="eyebrow">Reflective journal</p>
        <h1 className="serif mt-4 text-4xl leading-tight text-parchment">
          Answer the questions this court actually pressed
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-parchment-dim">
          A verdict tells you which option won. It does not tell you what it cost to be the kind of
          person who chose it. So the atlas keeps a second surface: after a sitting, the
          advisors&rsquo; own signature moves are turned back into questions you can answer without
          first forming a position, and the answers are yours to keep or destroy.
        </p>
      </header>

      {requested !== undefined && resolved === undefined ? (
        <p role="status" className="rounded-realm border border-crimson/50 bg-crimson/10 p-4 text-sm text-crimson">
          No dilemma is called &ldquo;{requested}&rdquo; in the seed data, so this is the first case
          instead.
        </p>
      ) : null}

      {/* ------------------------------ privacy ------------------------------- */}
      <section className="plate rounded-realm border-l-2 border-verdigris p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-verdigris">
          Where your words go
        </p>
        <p className="mt-3 text-base leading-relaxed text-parchment">
          They stay in this browser. Every answer is written to a single{" "}
          <code className="font-mono text-[13px] text-gold">{JOURNAL_STORAGE_KEY}</code> key in this
          page&rsquo;s <code className="font-mono text-[13px] text-gold">localStorage</code>, and the
          module that holds them contains no request primitive of any kind &mdash; there is nowhere
          for them to go. No account, no sync, no analytics, no server write. Exporting produces a
          file in your downloads folder, and erasing destroys it permanently.
        </p>
      </section>

      {/* ------------------------------ the case ------------------------------ */}
      <section>
        <h2 className="serif text-2xl text-parchment">{dilemma.title}</h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-parchment-dim">{dilemma.prompt}</p>

        <form method="get" action="/journal" className="mt-6 flex flex-wrap items-end gap-4">
          <label className="flex min-w-64 flex-col gap-2">
            <span className="eyebrow">The case you sit with</span>
            <select
              name="dilemma"
              defaultValue={dilemma.id}
              className="rounded-realm border border-abyss-border bg-abyss-raised/70 px-4 py-2.5 text-sm text-parchment focus:border-gold focus:outline-none"
            >
              {DILEMMAS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-realm bg-gold px-5 py-2.5 font-mono text-sm text-ink transition-opacity hover:opacity-90"
          >
            Sit with it
          </button>
        </form>

        <dl className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="plate rounded-realm p-5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim/70">
              Realm holding the question
            </dt>
            <dd className="serif mt-2 text-lg text-parchment">{kingdom.name}</dd>
            <dd className="mt-1 text-xs leading-relaxed text-parchment-dim/80">
              &ldquo;{kingdom.motto}&rdquo;
            </dd>
          </div>
          <div className="plate rounded-realm p-5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim/70">
              The court that sat
            </dt>
            <dd className="mt-2 text-sm text-parchment">
              {seated.advisors.map((advisor) => advisor.name).join(", ")}
            </dd>
            <dd className="mt-1 text-xs leading-relaxed text-parchment-dim/80">
              returned {seated.optionLabels.find((option) => option.id === seated.winnerId)?.label ?? seated.winnerId}
            </dd>
          </div>
          <div className="plate rounded-realm p-5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim/70">
              The axis the case turns on
            </dt>
            <dd className="serif mt-2 text-lg text-gold">{axis.label}</dd>
            <dd className="mt-1 font-mono text-[11px] text-parchment-dim/80">
              {axis.pole[0]} ← → {axis.pole[1]}
            </dd>
          </div>
          <div className="plate rounded-realm p-5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim/70">
              Reproducibility
            </dt>
            <dd className="tabular mt-2 font-mono text-sm text-parchment">seed {SEED}</dd>
            <dd className="mt-1 text-xs leading-relaxed text-parchment-dim/80">
              {prompts.length} prompts, reproducible from this seed alone.
            </dd>
          </div>
        </dl>
      </section>

      {/* ---------------------------- no-JavaScript --------------------------- */}
      <noscript>
        <section className="plate rounded-realm p-6">
          <p className="eyebrow">Without JavaScript</p>
          <p className="mt-3 text-base leading-relaxed text-parchment-dim">
            The answer boxes need JavaScript, and without it nothing you could type here would be
            saved. The questions do not, so the sitting still works as a reading exercise &mdash; and
            you can still read the{" "}
            <Link href={`/dilemmas/${dilemma.slug}`} className="text-gold hover:underline">
              full case
            </Link>
            ,{" "}
            <Link href="/council" className="text-gold hover:underline">
              the verdict
            </Link>{" "}
            or{" "}
            <Link href="/cartographer" className="text-gold hover:underline">
              the argument graph
            </Link>
            .
          </p>
          {opening ? (
            <>
              <h3 className="eyebrow mt-6">Opening prompt</h3>
              <p className="serif mt-2 text-xl leading-snug text-parchment">{opening.text}</p>
            </>
          ) : null}
          <h3 className="eyebrow mt-6">The rest of the sitting</h3>
          <ol className="mt-3 space-y-3">
            {prompts.slice(1).map((prompt) => (
              <li key={prompt.id} className="text-sm leading-relaxed text-parchment-dim">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
                  {prompt.kind}
                </span>
                <span className="mt-1 block text-parchment">{prompt.text}</span>
              </li>
            ))}
          </ol>
        </section>
      </noscript>

      <JournalIsland
        dilemmaId={dilemma.id}
        dilemmaTitle={dilemma.title}
        kingdomName={kingdom.name}
        advisorNames={seated.advisors.map((advisor) => advisor.name)}
        prompts={prompts}
        pivotAxis={pivotAxis}
        reserve={reserve}
        seed={SEED}
        closing={closing}
      />

      <nav
        className="flex flex-wrap gap-4 border-t border-abyss-border pt-8"
        aria-label="Journal navigation"
      >
        <Link
          href="/council"
          className="font-mono text-xs uppercase tracking-[0.18em] text-gold hover:text-parchment"
        >
          Reopen the council →
        </Link>
        <Link
          href="/cartographer"
          className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold"
        >
          See the argument as a graph
        </Link>
        <Link
          href="/method"
          className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold"
        >
          How a verdict is computed
        </Link>
      </nav>
    </article>
  );
}
