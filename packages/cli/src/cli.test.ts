import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ADVISORS, DILEMMAS, KINGDOMS, SEED } from "@repo/seed";
import { runCouncil, type CouncilComparison, type CouncilResult, type InfluenceReport, type ResilienceReport } from "@repo/core";
import { run, USAGE, VERSION, type CliIO } from "./cli";

/**
 * The terminal is driven in-process here: `run` takes its sinks as a
 * parameter, so every assertion below is on the exact text or JSON a user
 * would see, with no subprocess and no shell quoting in the way.
 */

function captured(): { io: CliIO; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { out: (line) => out.push(line), err: (line) => err.push(line) }, out, err };
}

interface ConvenePayload {
  readonly case: { readonly id: string; readonly slug: string; readonly title: string };
  readonly seed: number;
  readonly rounds: number;
  readonly advisors: readonly { readonly id: string; readonly name: string; readonly kingdomId: string }[];
  readonly optionLabels: readonly { readonly id: string; readonly label: string }[];
  readonly result: CouncilResult;
}

interface ComparePayload {
  readonly seed: number;
  readonly comparison: CouncilComparison;
}

interface ResiliencePayload {
  readonly count: number;
  readonly resilience: ResilienceReport;
  readonly influence: InfluenceReport;
}

const firstCase = DILEMMAS[0];
if (firstCase === undefined) throw new Error("seed dataset is empty");

describe("the terminal", () => {
  it("prints its usage when asked, without touching the engine", async () => {
    const { io, out, err } = captured();
    await expect(run([], io)).resolves.toBe(0);
    expect(out.join("\n")).toBe(USAGE);
    expect(err).toEqual([]);
  });

  it("keeps its version in lock-step with package.json", async () => {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { version: string };
    expect(VERSION).toBe(pkg.version);
  });

  it("lists the whole atlas when asked", async () => {
    for (const [command, expected] of [
      ["kingdoms", KINGDOMS.length],
      ["advisors", ADVISORS.length],
      ["dilemmas", DILEMMAS.length],
    ] as const) {
      const { io, out, err } = captured();
      await expect(run([command, "--json"], io)).resolves.toBe(0);
      const rows = JSON.parse(out.join("\n")) as unknown[];
      expect(rows).toHaveLength(expected);
      expect(err).toEqual([]);
    }
  });

  it("filters advisors by kingdom", async () => {
    const kingdom = KINGDOMS[0];
    if (kingdom === undefined) throw new Error("no kingdoms");
    const { io, out } = captured();
    await expect(run(["advisors", "--kingdom", kingdom.slug, "--json"], io)).resolves.toBe(0);
    const rows = JSON.parse(out.join("\n")) as { kingdomId: string }[];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row.kingdomId).toBe(kingdom.id);
  });

  it("convenes a court and returns the exact verdict the engine computed", async () => {
    const { io, out, err } = captured();
    await expect(run(["convene", firstCase.slug, "--json"], io)).resolves.toBe(0);
    expect(err).toEqual([]);

    const payload = JSON.parse(out.join("\n")) as ConvenePayload;
    expect(payload.case.id).toBe(firstCase.id);

    // The same arithmetic, derived independently: the default bench, the
    // kingdoms it comes from, and the same quorum the web council uses.
    const bench = ADVISORS.slice(0, 8);
    const kingdoms = KINGDOMS.filter((kingdom) =>
      bench.some((advisor) => advisor.kingdomId === kingdom.id),
    );
    const expected = runCouncil({
      dilemma: firstCase,
      advisors: bench,
      kingdoms,
      seed: SEED,
      rounds: 3,
      quorum: Math.ceil(bench.length / 2),
    });
    expect(payload.result).toEqual(expected);
  });

  it("is deterministic: the same invocation twice is the same bytes", async () => {
    const first = captured();
    const second = captured();
    await run(["convene", firstCase.slug, "--json"], first.io);
    await run(["convene", firstCase.slug, "--json"], second.io);
    expect(first.out.join("\n")).toBe(second.out.join("\n"));
  });

  it("prints the verdict as text by default", async () => {
    const { io, out } = captured();
    await expect(run(["convene", firstCase.slug], io)).resolves.toBe(0);
    const text = out.join("\n");
    expect(text).toContain("nooreign convene");
    expect(text).toContain("verdict");
    expect(text).toContain("ballots");
  });

  it("exports the argument graph as mermaid source", async () => {
    const { io, out, err } = captured();
    await expect(run(["convene", firstCase.slug, "--mermaid"], io)).resolves.toBe(0);
    expect(err).toEqual([]);
    expect(out[0]).toBe("flowchart TD");
    expect(out.length).toBeGreaterThan(1);
  });

  it("sits every kingdom alone on the same case", async () => {
    const { io, out } = captured();
    await expect(run(["compare", firstCase.slug, "--json"], io)).resolves.toBe(0);
    const payload = JSON.parse(out.join("\n")) as ComparePayload;
    expect(payload.comparison.entries).toHaveLength(KINGDOMS.length);
    expect(payload.comparison.distinctWinners).toBeGreaterThanOrEqual(1);
    expect(typeof payload.comparison.agreed).toBe("boolean");
  });

  it("sweeps a case across the requested seeds and thins its bench", async () => {
    const { io, out } = captured();
    await expect(run(["resilience", firstCase.slug, "--count", "6", "--json"], io)).resolves.toBe(0);
    const payload = JSON.parse(out.join("\n")) as ResiliencePayload;
    expect(payload.resilience.count).toBe(6);
    expect(payload.resilience.outcomes).toHaveLength(6);
    expect(payload.resilience.baseSeed).toBe(SEED);
    // Leave-one-out runs once per seated advisor.
    expect(payload.influence.entries).toHaveLength(8);
    expect(payload.count).toBe(6);
  });

  it("renders the sweep as text too", async () => {
    const { io, out } = captured();
    await expect(run(["resilience", firstCase.slug, "--count", "6"], io)).resolves.toBe(0);
    const text = out.join("\n");
    expect(text).toContain("stability");
    expect(text).toContain("bench");
    expect(text).toMatch(/seeds \d+–\d+/);
  });

  it("refuses unknown cases, unknown advisors and doubled seats", async () => {
    const first = ADVISORS[0];
    if (first === undefined) throw new Error("no advisors");

    const unknownCase = captured();
    await expect(run(["convene", "dm-does-not-exist"], unknownCase.io)).resolves.toBe(1);
    expect(unknownCase.err.join("\n")).toContain("unknown case");

    const unknownAdvisor = captured();
    await expect(
      run(["convene", firstCase.slug, "--advisors", "no-such-advisor"], unknownAdvisor.io),
    ).resolves.toBe(1);
    expect(unknownAdvisor.err.join("\n")).toContain("unknown advisor");

    const doubled = captured();
    await expect(
      run(["convene", firstCase.slug, "--advisors", `${first.id},${first.id}`], doubled.io),
    ).resolves.toBe(1);
    expect(doubled.err.join("\n")).toContain("seated twice");
  });

  it("refuses flags a command does not have", async () => {
    const { io, err } = captured();
    await expect(run(["convene", firstCase.slug, "--count", "4"], io)).resolves.toBe(1);
    expect(err.join("\n")).toContain("--count");
  });

  it("refuses an unknown command and points at help", async () => {
    const { io, err } = captured();
    await expect(run(["summon"], io)).resolves.toBe(1);
    expect(err.join("\n")).toContain("summon");
    expect(err.join("\n")).toContain("nooreign help");
  });

  it("accepts a custom bench by id and by slug", async () => {
    const first = ADVISORS[0];
    const second = ADVISORS[1];
    if (first === undefined || second === undefined) throw new Error("not enough advisors");
    const { io, out } = captured();
    await expect(
      run(["convene", firstCase.slug, "--advisors", `${first.id},${second.slug}`, "--json"], io),
    ).resolves.toBe(0);
    const payload = JSON.parse(out.join("\n")) as ConvenePayload;
    expect(payload.advisors.map((advisor) => advisor.id)).toEqual([first.id, second.id]);
  });
});
