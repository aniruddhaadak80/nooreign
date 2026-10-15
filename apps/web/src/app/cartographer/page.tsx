import type { Metadata } from "next";
import Link from "next/link";
import { ADVISORS, DILEMMAS, KINGDOMS, SEED, getAdvisor, getDilemma, getKingdom } from "@repo/seed";
import type { Advisor, ArgumentMove } from "@repo/seed";
import { buildGraph, clamp } from "@repo/core";
import { convene, defaultPanelFor, type ConveneResponse } from "@/lib/convene";
import { GraphIsland } from "@/components/cartographer/graph-island";

export const metadata: Metadata = {
  title: "Argument cartographer",
  description:
    "A deliberation drawn as a directed acyclic graph: which move attacks which, how influence propagates and decays, whether the argument is well-formed at all, and the mermaid to paste elsewhere.",
};

/** The drawing depends on the dilemma and panel in the query string, so this renders per request. */
export const dynamic = "force-dynamic";

/**
 * "The Oracle of Delphi" is the default because its default bench actually splits: three
 * objections and three appeals land on real anchors, which is what makes a graph worth opening.
 * Any of the twenty dilemmas can be selected, and the sparse sittings are drawn as sparsely as
 * they are.
 */
const DEFAULT_DILEMMA = "d03";
const MAX_PANEL = 8;

type SearchParams = Readonly<Record<string, string | string[] | undefined>>;

function list(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).flatMap((entry) => entry.split(","));
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isAdvisor(value: Advisor | undefined): value is Advisor {
  return value !== undefined;
}

/**
 * The default bench.
 *
 * One advisor per realm is a comparison rather than a deliberation — each has nobody to answer, so
 * every objection points at nothing. So the first voice of each realm is seated and then a second
 * voice of those same realms is added, which is what turns four parallel monologues into a graph
 * with edges in it.
 */
function defaultCourt(dilemmaId: string): string[] {
  const opening = defaultPanelFor(dilemmaId);
  const taken = new Set(opening);
  const seconds = opening
    .map((id) => {
      const realm = getAdvisor(id)?.kingdomId;
      return realm === undefined
        ? undefined
        : ADVISORS.find((advisor) => advisor.kingdomId === realm && advisor.id !== id)?.id;
    })
    .filter((id): id is string => id !== undefined && !taken.has(id));
  return [...opening, ...seconds].slice(0, MAX_PANEL);
}

/* ------------------------------------------------------------------ *
 * From a sitting to a graph
 * ------------------------------------------------------------------ */

/**
 * Reduce a deliberation to the moves it actually made.
 *
 * The council records traces, not move objects, so the seed move is looked up to recover the two
 * facts the graph needs that a trace does not carry: the move's own declared weight (the trace's
 * `total` includes seeded jitter and is not a weight) and its dilemma tags. Where a move cannot be
 * found the trace is still drawn, on its own arithmetic — a sitting is not made shorter by failing
 * to find a lookup key.
 */
function movesFrom(result: ConveneResponse, advisors: readonly Advisor[]): {
  moves: ArgumentMove[];
  speakers: Record<string, string>;
} {
  const source = new Map(advisors.flatMap((advisor) => advisor.moves.map((move) => [move.id, move] as const)));
  const moves: ArgumentMove[] = [];
  const speakers: Record<string, string> = {};
  const seen = new Set<string>();

  for (const trace of result.traces) {
    if (seen.has(trace.moveId)) continue;
    seen.add(trace.moveId);
    const declared = source.get(trace.moveId);
    moves.push({
      id: trace.moveId,
      kind: trace.kind,
      claim: trace.claim,
      support: trace.premise,
      weight: declared?.weight ?? clamp(trace.total, 0, 1),
      // The trace's axes are a readonly view of the engine's; a move is a mutable record.
      leansOn: [...trace.leansOn],
      appliesTo: declared?.appliesTo ?? [],
    });
    speakers[trace.moveId] = trace.advisorId;
  }

  return { moves, speakers };
}

/**
 * Say what each move presses against.
 *
 * `ArgumentMove` has no `targets` field — a move is a claim, not an edge — so the deliberation's
 * own knowledge has to be handed to `buildGraph` explicitly. Three relations are recorded, and
 * only three, because only three are true of a sitting:
 *
 *  - an **objection attacks** the premise of whoever argued for the course it answers;
 *  - an **appeal attacks** the premise of whoever carried the winner;
 *  - a **premise supports** the later moves its own advisor made, which are the same position
 *    pressed harder.
 *
 * The fallbacks matter: an objection whose adversary never spoke has no anchor, and saying so is
 * more honest than drawing an edge to an arbitrary bystander.
 */
function targetsFrom(result: ConveneResponse): { targets: Record<string, readonly string[]>; unanchored: string[] } {
  const targets: Record<string, readonly string[]> = {};
  const unanchored: string[] = [];
  const anchorFor = (optionId: string): string | undefined =>
    result.positions.find((position) => position.topOptionId === optionId)?.premiseMoveIds[0];

  for (const objection of result.objections) {
    const anchor =
      (objection.adversaryId === ""
        ? undefined
        : result.positions.find((position) => position.advisorId === objection.adversaryId)?.premiseMoveIds[0]) ??
      anchorFor(objection.targetedOptionId);
    if (anchor === undefined) unanchored.push(objection.moveId);
    else targets[objection.moveId] = [anchor];
  }

  const winnerAnchor = anchorFor(result.winnerId);
  for (const appeal of result.appeals) {
    if (winnerAnchor === undefined) unanchored.push(appeal.moveId);
    else targets[appeal.moveId] = [winnerAnchor];
  }

  for (const trace of result.traces) {
    if (trace.round !== 1) continue;
    const later = result.traces
      .filter((other) => other.advisorId === trace.advisorId && other.round > 1)
      .map((other) => other.moveId);
    if (later.length > 0) targets[trace.moveId] = later;
  }

  return { targets, unanchored };
}

/* ------------------------------------------------------------------ *
 * Page
 * ------------------------------------------------------------------ */

/**
 * The argument cartographer.
 *
 * Choosing a panel is a plain GET form, so the sitting is re-drawn by the server and the URL says
 * exactly which court produced the graph — which matters more here than on the council page,
 * because a graph is a picture you want to be able to point at.
 *
 * The engine runs on the server and only the moves cross the boundary. The island rebuilds the
 * graph from them because the graph is the product, not an accessory to it.
 */
export default async function CartographerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const requestedDilemma = first(params["dilemma"]) ?? DEFAULT_DILEMMA;
  const dilemma = getDilemma(requestedDilemma) ?? getDilemma(DEFAULT_DILEMMA) ?? DILEMMAS[0];
  if (!dilemma) {
    return (
      <p className="mt-10 text-parchment-dim">
        No dilemmas are loaded. The seed datasets are compiled in; a missing dilemma means the seed
        package failed to import.
      </p>
    );
  }

  // Unknown ids are deliberately passed through rather than filtered here: `convene` drops them
  // and the page reports which ones went missing, which is friendlier than a shorter panel with
  // no explanation.
  const asked = list(params["panel"]);
  const panel = (asked.length > 0 ? asked : defaultCourt(dilemma.id)).slice(0, MAX_PANEL);

  const seated = convene({ dilemmaId: dilemma.id, advisorIds: panel, seed: SEED });
  if ("error" in seated) {
    return <p className="mt-10 text-crimson">Could not convene that court: {seated.error}</p>;
  }

  const advisors = panel.map((id) => getAdvisor(id)).filter(isAdvisor);
  const { moves, speakers } = movesFrom(seated, advisors);
  const { targets, unanchored } = targetsFrom(seated);
  const advisorNames: Record<string, string> = {};
  for (const advisor of advisors) advisorNames[advisor.id] = advisor.name;

  // Built once on the server purely to report the structure in prose: the island rebuilds the same
  // graph from the same moves, and the two must agree or this page is lying.
  const preview = buildGraph(moves, panel, { targets, advisorOf: (move) => speakers[move.id] ?? move.id });
  const attacks = preview.edges.filter((edge) => edge.kind === "attacks").length;
  const supports = preview.edges.length - attacks;
  const unopposed = preview.nodes.filter((node) => node.targets.length === 0).length;
  const winnerLabel =
    seated.optionLabels.find((option) => option.id === seated.winnerId)?.label ?? seated.winnerId;
  const kingdom = getKingdom(dilemma.kingdomOrigin);
  const unlinked = panel.filter((id) => !seated.advisors.some((advisor) => advisor.id === id));

  const grouped = KINGDOMS.map((realm) => ({
    kingdomId: realm.id,
    kingdomName: realm.name,
    glyph: realm.glyph,
    members: ADVISORS.filter((advisor) => advisor.kingdomId === realm.id).map((advisor) => ({
      id: advisor.id,
      name: advisor.name,
    })),
  })).filter((group) => group.members.length > 0);

  return (
    <div>
      <header className="max-w-3xl">
        <p className="eyebrow">Argument cartographer</p>
        <h1 className="serif mt-4 text-4xl leading-tight text-parchment">
          The deliberation as a graph, not a transcript
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-parchment-dim">
          A list of who said what tells you the court was busy. It does not tell you what leaned on
          what, or which move the rest of the argument was hanging from. Modelling objections as
          edges instead of prose means the engine can ask structural questions — is this argument
          well-formed, who is attacking the position that won, how far does a move&rsquo;s standing
          travel — and answer them deterministically.
        </p>
        <p className="mt-4 text-base leading-relaxed text-parchment-dim/90">
          Nothing here is a layout heuristic. The drawing is a function of the graph: columns come
          from a topological order with a declaration-order tie-break, rows come from depth, and
          there is no jitter to soften the result. The same seed draws the same picture.
        </p>
      </header>

      {/* ------------------------------- the form ----------------------------- */}
      <form method="get" action="/cartographer" className="mt-10 flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
          <label className="flex flex-col gap-2">
            <span className="eyebrow">The case</span>
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
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-realm bg-gold px-6 py-2.5 font-mono text-sm text-ink transition-opacity hover:opacity-90"
            >
              Redraw the argument
            </button>
          </div>
        </div>

        <fieldset className="plate rounded-realm p-6">
          <legend className="eyebrow">
            The court — {panel.length} seated, maximum {MAX_PANEL}
          </legend>
          <p className="mt-2 text-xs leading-relaxed text-parchment-dim/70">
            {unlinked.length > 0
              ? `${unlinked.length} requested advisor${unlinked.length === 1 ? "" : "s"} ${unlinked.length === 1 ? "is" : "are"} not in the atlas and ${unlinked.length === 1 ? "was" : "were"} ignored.`
              : "The default bench seats one advisor per realm and then a second voice from each of those realms, because one voice per realm is a comparison rather than a deliberation. Leave at least one checked."}
          </p>
          <div className="mt-4 grid max-h-80 gap-4 overflow-y-auto pr-2 sm:grid-cols-2 lg:grid-cols-3">
            {grouped.map((group) => (
              <div key={group.kingdomId}>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-parchment-dim/70">
                  <span aria-hidden className="mr-1.5 opacity-70">
                    {group.glyph}
                  </span>
                  {group.kingdomName}
                </p>
                <ul className="mt-2 space-y-1">
                  {group.members.map((member) => (
                    <li key={member.id}>
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-parchment-dim hover:text-parchment">
                        <input
                          type="checkbox"
                          name="panel"
                          value={member.id}
                          defaultChecked={panel.includes(member.id)}
                          className="size-3.5 accent-gold"
                        />
                        {member.name}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </fieldset>
      </form>

      {/* ------------------------------- context ------------------------------ */}
      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="eyebrow">{kingdom?.name ?? "unassigned realm"}</p>
            <h2 className="serif mt-3 text-2xl text-parchment">{dilemma.title}</h2>
          </div>
          <p className="font-mono text-[11px] text-parchment-dim/80 tabular">
            seed {seated.seed} · {moves.length} moves · {attacks} attacks · {supports} supports ·{" "}
            {unopposed} unopposed · {preview.dangling.length} dangling
          </p>
        </div>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-parchment-dim">{dilemma.prompt}</p>
        <ul className="mt-6 space-y-2">
          {seated.narrative.slice(0, 3).map((line) => (
            <li key={line} className="flex gap-3 text-sm leading-relaxed text-parchment-dim">
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold" />
              {line}
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------ the island ---------------------------- */}
      <GraphIsland
        moves={moves}
        targets={targets}
        speakers={speakers}
        advisorIds={panel}
        advisorNames={advisorNames}
        unanchored={unanchored}
        dilemmaTitle={dilemma.title}
        winnerLabel={winnerLabel}
        seed={seated.seed}
      />

      {/* ----------------------------- no-JavaScript -------------------------- */}
      <noscript>
        <section className="plate rounded-realm p-6">
          <p className="eyebrow">Without JavaScript</p>
          <p className="mt-3 text-base leading-relaxed text-parchment-dim">
            The drawing needs JavaScript to open a move, but the moves themselves do not. This
            sitting was {moves.length} moves:
          </p>
          <ol className="mt-4 space-y-4">
            {moves.map((move, index) => {
              const aim = targets[move.id] ?? [];
              const speakerId = speakers[move.id] ?? move.id;
              const signed = move.kind === "objection" || move.kind === "appeal";
              return (
                <li key={move.id} className="border-l-2 border-abyss-border pl-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
                    {index + 1} · {move.kind} · {advisorNames[speakerId] ?? speakerId}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-parchment">{move.claim}</p>
                  <p className="mt-1 font-mono text-[11px] text-parchment-dim/70">
                    weight {move.weight.toFixed(3)} · leans on {move.leansOn.join(", ")} ·{" "}
                    {aim.length === 0
                      ? "aimed at nothing in this sitting"
                      : `${signed ? "attacks" : "supports"} ${aim.join(", ")}`}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      </noscript>

      <nav
        className="mt-16 flex flex-wrap gap-4 border-t border-abyss-border pt-8"
        aria-label="Cartographer navigation"
      >
        <Link
          href="/council"
          className="font-mono text-xs uppercase tracking-[0.18em] text-gold hover:text-parchment"
        >
          Read the verdict and the trace →
        </Link>
        <Link
          href="/journal"
          className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold"
        >
          Answer the prompts it left
        </Link>
        <Link
          href="/method"
          className="font-mono text-xs uppercase tracking-[0.18em] text-parchment-dim hover:text-gold"
        >
          How a verdict is computed
        </Link>
      </nav>
    </div>
  );
}
