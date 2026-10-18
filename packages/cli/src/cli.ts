/**
 * The Nooreign terminal.
 *
 * WHY a CLI at all: the atlas's central claim is that every verdict is
 * *computed*, not fetched — and the strongest proof of that claim is a surface
 * with no Next.js in front of it. `nooreign convene` seats a court and runs
 * the same `runCouncil` the site runs; `nooreign resilience` runs the same
 * seed sweep the resilience pages render. If the terminal and the atlas ever
 * disagreed, there would have to be two engines, and there is only one.
 *
 * Output is deliberately plain: no colour, no spinner, no network. A verdict
 * is reproducible text you can diff — which is what `--json` is for.
 */
import { parseArgs } from "node:util";
import {
  ADVISORS,
  DILEMMAS,
  KINGDOMS,
  SEED,
  getAdvisor,
  getDilemma,
  getKingdom,
} from "@repo/seed";
import type { Advisor, Dilemma } from "@repo/seed";
import {
  RESILIENCE_SWEEP,
  analyseInfluence,
  analyseResilience,
  buildGraph,
  compareCouncils,
  runCouncil,
  toMermaid,
} from "@repo/core";
import type { CouncilComparison, CouncilResult, InfluenceReport, ResilienceReport } from "@repo/core";

/* ------------------------------------------------------------------ *
 * The IO contract
 * ------------------------------------------------------------------ */

/**
 * Everything the terminal writes goes through this pair of sinks, so the test
 * suite can drive the whole CLI in-process and assert on exact lines. `bin.ts`
 * is the only place that binds them to `process.stdout` / `process.stderr`.
 */
export interface CliIO {
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
}

/** Kept in lock-step with `package.json` by a test, not by discipline. */
export const VERSION = "0.1.0";

/** The bench a command seats when `--advisors` is absent: the first eight voices. */
const DEFAULT_BENCH = 8;

const MAX_SEED = 1_000_000;

export const USAGE = `nooreign — the philosophical atlas, from a terminal

USAGE
  nooreign <command> [options]

COMMANDS
  kingdoms                   the ${KINGDOMS.length} schools of thought
  advisors [--kingdom <id>]  the ${ADVISORS.length} voices, optionally filtered
  dilemmas                   the ${DILEMMAS.length} hard cases
  convene <case>             seat a court on a case and print the verdict
  compare <case>             sit every kingdom alone on the same case
  resilience <case>          sweep a case over seeds and thin its bench
  help                       this text

OPTIONS
  --advisors a,b,c  seat this bench (advisor ids or slugs); default: the first ${DEFAULT_BENCH} voices
  --seed <n>        tie-break stream, 0..${MAX_SEED} (default ${SEED})
  --rounds <n>      deliberation rounds, 1-3 (default 3)
  --count <n>       seeds to sweep for resilience, ${RESILIENCE_SWEEP.min}..${RESILIENCE_SWEEP.max} (default ${RESILIENCE_SWEEP.default})
  --kingdom <id>    filter advisors by kingdom (id or slug)
  --json            machine-readable output
  --mermaid         export the argument graph as Mermaid source (convene)
  --help, -h        this text

Cases accept an id (d01) or a slug (trolley-of-five-million).
Every number is computed locally from the seed corpus; nothing is fetched.`;

/* ------------------------------------------------------------------ *
 * Errors and small helpers
 * ------------------------------------------------------------------ */

/** A mistake by the caller, reported as a message and a hint rather than a stack. */
class UsageError extends Error {}

/** `parseArgs` reports unknown flags as a coded TypeError; treat those as usage errors too. */
function isParseArgsError(cause: unknown): boolean {
  if (!(cause instanceof TypeError)) return false;
  const code = (cause as { code?: unknown }).code;
  return typeof code === "string" && code.startsWith("ERR_PARSE_ARGS");
}

function intFlag(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new UsageError(`--${name} expects a non-negative integer, got "${raw}"`);
  }
  return value;
}

function seedFlag(raw: string | undefined): number {
  const value = intFlag(raw, SEED, "seed");
  if (value > MAX_SEED) throw new UsageError(`--seed must be at most ${MAX_SEED}`);
  return value;
}

function roundsFlag(raw: string | undefined): number {
  const value = intFlag(raw, 3, "rounds");
  if (value < 1 || value > 3) throw new UsageError("--rounds must be 1, 2 or 3");
  return value;
}

function countFlag(raw: string | undefined): number {
  const value = intFlag(raw, RESILIENCE_SWEEP.default, "count");
  if (value < RESILIENCE_SWEEP.min || value > RESILIENCE_SWEEP.max) {
    throw new UsageError(
      `--count must be between ${RESILIENCE_SWEEP.min} and ${RESILIENCE_SWEEP.max}`,
    );
  }
  return value;
}

/** Resolve `--advisors`, or seat the default bench. Ids and slugs both resolve. */
function benchFrom(raw: string | undefined): Advisor[] {
  if (raw === undefined) return ADVISORS.slice(0, DEFAULT_BENCH);

  const ids = raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (ids.length === 0) throw new UsageError("--advisors needs at least one id or slug");

  const bench: Advisor[] = [];
  for (const id of ids) {
    const advisor = getAdvisor(id);
    if (!advisor) throw new UsageError(`unknown advisor "${id}"`);
    if (bench.some((seated) => seated.id === advisor.id)) {
      throw new UsageError(`advisor "${advisor.name}" is seated twice`);
    }
    bench.push(advisor);
  }
  return bench;
}

function caseFrom(raw: string | undefined): Dilemma {
  if (raw === undefined) throw new UsageError("a case is required, e.g. `nooreign convene d01`");
  const dilemma = getDilemma(raw);
  if (!dilemma) throw new UsageError(`unknown case "${raw}"`);
  return dilemma;
}

/** The kingdoms a bench actually comes from, so kingdom-weighted vectors apply. */
function kingdomsOf(bench: readonly Advisor[]) {
  return KINGDOMS.filter((kingdom) =>
    bench.some((advisor) => advisor.kingdomId === kingdom.id),
  );
}

const percent = (value: number): string => `${Math.round(value * 100)}%`;
const fixed = (value: number, dp = 4): string => value.toFixed(dp);

function pad(text: string, width: number): string {
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

function kingdomNameOf(advisor: Advisor): string {
  return KINGDOMS.find((kingdom) => kingdom.id === advisor.kingdomId)?.name ?? advisor.kingdomId;
}

function optionLabelOf(dilemma: Dilemma, optionId: string): string {
  return dilemma.options.find((option) => option.id === optionId)?.label ?? optionId;
}

/* ------------------------------------------------------------------ *
 * Commands
 * ------------------------------------------------------------------ */

function cmdKingdoms(args: readonly string[], io: CliIO): number {
  const { values } = parseArgs({
    args: [...args],
    options: { json: { type: "boolean", default: false } },
    allowPositionals: true,
    strict: true,
  });

  const rows = KINGDOMS.map((kingdom) => ({
    id: kingdom.id,
    slug: kingdom.slug,
    name: kingdom.name,
    motto: kingdom.motto,
    founder: kingdom.founder,
    founded: kingdom.founded,
    advisors: ADVISORS.filter((advisor) => advisor.kingdomId === kingdom.id).length,
  }));

  if (values.json) {
    io.out(JSON.stringify(rows, null, 2));
    return 0;
  }

  io.out(`nooreign kingdoms · ${rows.length} schools of thought`);
  io.out("");
  io.out(`${pad("kingdom", 24)}${pad("founder", 22)}${pad("founded", 9)}advisors`);
  for (const row of rows) {
    io.out(
      `${pad(row.name, 24)}${pad(row.founder, 22)}${pad(String(row.founded), 9)}${row.advisors}`,
    );
  }
  return 0;
}

function cmdAdvisors(args: readonly string[], io: CliIO): number {
  const { values } = parseArgs({
    args: [...args],
    options: { kingdom: { type: "string" }, json: { type: "boolean", default: false } },
    allowPositionals: true,
    strict: true,
  });

  let pool: readonly Advisor[] = ADVISORS;
  if (values.kingdom !== undefined) {
    const kingdom = getKingdom(values.kingdom);
    if (!kingdom) throw new UsageError(`unknown kingdom "${values.kingdom}"`);
    pool = ADVISORS.filter((advisor) => advisor.kingdomId === kingdom.id);
  }

  const rows = pool.map((advisor) => ({
    id: advisor.id,
    slug: advisor.slug,
    name: advisor.name,
    epithet: advisor.epithet,
    kingdomId: advisor.kingdomId,
    kingdom: kingdomNameOf(advisor),
    born: advisor.born,
    died: advisor.died,
  }));

  if (values.json) {
    io.out(JSON.stringify(rows, null, 2));
    return 0;
  }

  io.out(`nooreign advisors · ${rows.length} voices`);
  io.out("");
  io.out(`${pad("advisor", 26)}${pad("kingdom", 24)}years`);
  for (const row of rows) {
    const span = row.died === null ? `${row.born}–` : `${row.born}–${row.died}`;
    io.out(`${pad(row.name, 26)}${pad(row.kingdom, 24)}${span}`);
  }
  return 0;
}

function cmdDilemmas(args: readonly string[], io: CliIO): number {
  const { values } = parseArgs({
    args: [...args],
    options: { json: { type: "boolean", default: false } },
    allowPositionals: true,
    strict: true,
  });

  const rows = DILEMMAS.map((dilemma) => ({
    id: dilemma.id,
    slug: dilemma.slug,
    title: dilemma.title,
    severity: dilemma.severity,
    aiRelevance: dilemma.aiRelevance,
    options: dilemma.options.length,
  }));

  if (values.json) {
    io.out(JSON.stringify(rows, null, 2));
    return 0;
  }

  io.out(`nooreign dilemmas · ${rows.length} hard cases`);
  io.out("");
  io.out(`${pad("id", 6)}${pad("case", 42)}options  severity  ai-relevance`);
  for (const row of rows) {
    io.out(
      `${pad(row.id, 6)}${pad(row.title, 42)}${pad(String(row.options), 9)}${pad(
        row.severity.toFixed(2),
        10,
      )}${row.aiRelevance.toFixed(2)}`,
    );
  }
  return 0;
}

function cmdConvene(args: readonly string[], io: CliIO): number {
  const { values, positionals } = parseArgs({
    args: [...args],
    options: {
      advisors: { type: "string" },
      seed: { type: "string" },
      rounds: { type: "string" },
      json: { type: "boolean", default: false },
      mermaid: { type: "boolean", default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.json && values.mermaid) {
    throw new UsageError("choose --json or --mermaid, not both");
  }

  const dilemma = caseFrom(positionals[0]);
  const bench = benchFrom(values.advisors);
  const seed = seedFlag(values.seed);
  const rounds = roundsFlag(values.rounds);
  const kingdoms = kingdomsOf(bench);

  // ---------------------------------------------------------------- mermaid
  if (values.mermaid) {
    const moves = bench.flatMap((advisor) => advisor.moves);
    const graph = buildGraph(moves, bench.map((advisor) => advisor.id));
    for (const line of toMermaid(graph).split("\n")) io.out(line);
    return 0;
  }

  const result: CouncilResult = runCouncil({
    dilemma,
    advisors: bench,
    kingdoms,
    seed,
    rounds,
    quorum: Math.ceil(bench.length / 2),
  });

  // ---------------------------------------------------------------- json
  if (values.json) {
    const payload = {
      case: { id: dilemma.id, slug: dilemma.slug, title: dilemma.title },
      seed,
      rounds,
      advisors: bench.map((advisor) => ({
        id: advisor.id,
        slug: advisor.slug,
        name: advisor.name,
        kingdomId: advisor.kingdomId,
      })),
      optionLabels: dilemma.options.map((option) => ({ id: option.id, label: option.label })),
      result,
    };
    io.out(JSON.stringify(payload, null, 2));
    return 0;
  }

  // ---------------------------------------------------------------- text
  io.out(`nooreign convene · ${dilemma.title}`);
  io.out(
    `case ${dilemma.id} · seed ${seed} · ${bench.length} advisors · ${rounds} rounds · quorum ${result.quorum}`,
  );
  io.out("");
  io.out(`${pad("verdict", 12)}${optionLabelOf(dilemma, result.winnerId)}`);
  io.out(
    `${pad("margin", 12)}${fixed(result.margin)}   confidence ${percent(
      result.confidence,
    )}   super-majority: ${result.superMajority.satisfied ? "satisfied" : "not reached"}`,
  );
  io.out(`${pad("axis", 12)}${result.decidingAxis}`);
  io.out("");
  io.out("ballots (weighted totals)");
  const tallies = [...result.ballots].sort((a, b) => b.total - a.total);
  for (const tally of tallies) {
    const mark = tally.optionId === result.winnerId ? "←" : " ";
    io.out(
      `  ${pad(optionLabelOf(dilemma, tally.optionId), 34)}total ${pad(fixed(tally.total), 9)}share ${pad(
        percent(tally.share),
        6,
      )}votes ${pad(String(tally.votes), 4)}${mark}`,
    );
  }
  io.out("");
  io.out("dissent");
  if (result.dissent.dissenters.length === 0) {
    io.out("  unanimous — every seated advisor's first preference won.");
  } else {
    for (const entry of result.dissent.dissenters.slice(0, 6)) {
      io.out(
        `  ${entry.advisorName} preferred "${optionLabelOf(dilemma, entry.preferredOptionId)}" (gap ${fixed(
          entry.gapToWinner,
        )})`,
      );
    }
    if (result.dissent.dissenters.length > 6) {
      io.out(`  … and ${result.dissent.dissenters.length - 6} more`);
    }
  }
  const strongest = result.dissent.strongest;
  if (strongest !== null) {
    io.out(`  strongest objection by ${strongest.advisorName}: "${strongest.claim}" (weight ${fixed(strongest.weight)})`);
  }
  return 0;
}

function cmdCompare(args: readonly string[], io: CliIO): number {
  const { values, positionals } = parseArgs({
    args: [...args],
    options: { seed: { type: "string" }, json: { type: "boolean", default: false } },
    allowPositionals: true,
    strict: true,
  });

  const dilemma = caseFrom(positionals[0]);
  const seed = seedFlag(values.seed);

  const groups = KINGDOMS.map((kingdom) => ({
    groupId: kingdom.id,
    groupName: kingdom.name,
    advisors: ADVISORS.filter((advisor) => advisor.kingdomId === kingdom.id),
  }));

  const comparison: CouncilComparison = compareCouncils(dilemma, groups, { seed, kingdoms: KINGDOMS });

  if (values.json) {
    const payload = {
      case: { id: dilemma.id, slug: dilemma.slug, title: dilemma.title },
      seed,
      comparison,
    };
    io.out(JSON.stringify(payload, null, 2));
    return 0;
  }

  io.out(`nooreign compare · ${dilemma.title} · seed ${seed}`);
  io.out(
    `${comparison.entries.length} courts · ${comparison.distinctWinners} distinct verdict${
      comparison.distinctWinners === 1 ? "" : "s"
    } · agreed: ${comparison.agreed ? "yes" : "no"}`,
  );
  io.out("");
  io.out(`${pad("kingdom", 24)}${pad("verdict", 30)}${pad("margin", 9)}${pad("conf", 6)}dissent`);
  for (const entry of comparison.entries) {
    io.out(
      `${pad(entry.groupName, 24)}${pad(entry.winnerLabel, 30)}${pad(fixed(entry.margin), 9)}${pad(
        percent(entry.confidence),
        6,
      )}${entry.dissentCount}${entry.satisfied ? "" : "  (no super-majority)"}`,
    );
  }
  io.out("");
  io.out(comparison.summary);
  return 0;
}

function cmdResilience(args: readonly string[], io: CliIO): number {
  const { values, positionals } = parseArgs({
    args: [...args],
    options: {
      advisors: { type: "string" },
      seed: { type: "string" },
      count: { type: "string" },
      json: { type: "boolean", default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  const dilemma = caseFrom(positionals[0]);
  const bench = benchFrom(values.advisors);
  const seed = seedFlag(values.seed);
  const count = countFlag(values.count);
  const kingdoms = kingdomsOf(bench);

  const resilience: ResilienceReport = analyseResilience({
    dilemma,
    advisors: bench,
    kingdoms,
    baseSeed: seed,
    count,
  });
  const influence: InfluenceReport = analyseInfluence({
    dilemma,
    advisors: bench,
    kingdoms,
    baseSeed: seed,
  });

  if (values.json) {
    const payload = {
      case: { id: dilemma.id, slug: dilemma.slug, title: dilemma.title },
      seed,
      count,
      advisors: bench.map((advisor) => ({
        id: advisor.id,
        slug: advisor.slug,
        name: advisor.name,
        kingdomId: advisor.kingdomId,
      })),
      optionLabels: dilemma.options.map((option) => ({ id: option.id, label: option.label })),
      resilience,
      influence,
    };
    io.out(JSON.stringify(payload, null, 2));
    return 0;
  }

  const lastSeed = seed + count - 1;
  const modal = resilience.options.find((option) => option.optionId === resilience.modalWinnerId);
  const axisLine = resilience.axes
    .filter((entry) => entry.count > 0)
    .map((entry) => `${entry.axiom} ${entry.count}`)
    .join(" · ");

  io.out(`nooreign resilience · ${dilemma.title}`);
  io.out(`seeds ${seed}–${lastSeed} · ${bench.length} advisors · count ${count}`);
  io.out("");
  io.out(
    `${pad("stability", 12)}${percent(resilience.stability)}   "${optionLabelOf(
      dilemma,
      resilience.modalWinnerId,
    )}" won ${modal?.wins ?? 0} of ${count} — ${resilience.verdict}`,
  );
  io.out(
    `${pad("flips", 12)}${resilience.flips}   longest unbroken run ${
      resilience.longestStreak
    } · close band ${resilience.closeSeeds}`,
  );
  io.out(
    `${pad("margins", 12)}${fixed(resilience.margin.min, 3)}–${fixed(
      resilience.margin.max,
      3,
    )}   mean ${fixed(resilience.margin.mean, 3)} · confidence ${percent(resilience.confidenceMean)}`,
  );
  io.out(`${pad("axis", 12)}${axisLine}`);
  io.out("");
  io.out(
    `${pad("bench", 12)}${influence.verdict} — ${influence.pivotalIds.length} of ${
      influence.entries.length
    } advisors pivotal at seed ${seed}`,
  );
  for (const entry of influence.entries) {
    const sign = entry.marginDelta >= 0 ? "+" : "-";
    io.out(
      `  ${pad(entry.pivotal ? "pivotal" : "stands", 9)}${pad(entry.advisorName, 26)}→ "${optionLabelOf(
        dilemma,
        entry.winnerWithoutId,
      )}" (Δmargin ${sign}${fixed(Math.abs(entry.marginDelta), 3)})`,
    );
  }
  return 0;
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

/**
 * Run one invocation and return its exit code.
 *
 * The function never calls `process.exit` and never writes to the real
 * streams: `bin.ts` does both, and the tests do neither. That boundary is what
 * makes the terminal testable at all.
 */
export async function run(argv: readonly string[], io: CliIO): Promise<number> {
  const [command, ...rest] = argv;

  try {
    switch (command) {
      case undefined:
      case "help":
      case "--help":
      case "-h":
        io.out(USAGE);
        return 0;

      case "version":
      case "--version":
      case "-v":
        io.out(`nooreign ${VERSION}`);
        return 0;

      case "kingdoms":
        return cmdKingdoms(rest, io);
      case "advisors":
        return cmdAdvisors(rest, io);
      case "dilemmas":
        return cmdDilemmas(rest, io);
      case "convene":
        return cmdConvene(rest, io);
      case "compare":
        return cmdCompare(rest, io);
      case "resilience":
        return cmdResilience(rest, io);

      default:
        io.err(`error: unknown command "${command}"`);
        io.err("run `nooreign help` for usage");
        return 1;
    }
  } catch (cause) {
    if (cause instanceof UsageError || isParseArgsError(cause)) {
      io.err(`error: ${cause instanceof Error ? cause.message : String(cause)}`);
      io.err("run `nooreign help` for usage");
      return 1;
    }
    throw cause;
  }
}
