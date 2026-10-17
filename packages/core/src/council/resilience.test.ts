import { describe, expect, it } from "vitest";

import {
  ADVISORS,
  DILEMMAS,
  KINGDOMS,
  paperclipDilemma,
  trolleyDilemma,
} from "../__fixtures__/council";
import { AXIOM_KEYS } from "../../../seed/src/types";
import { round } from "../util/math";
import { CLOSE_MARGIN } from "./consensus";
import { runCouncil } from "./deliberation";
import {
  analyseInfluence,
  analyseResilience,
  INFLUENCE_THRESHOLDS,
  RESILIENCE_SWEEP,
  RESILIENCE_THRESHOLDS,
  type ResilienceInput,
} from "./resilience";

/** The bench the deliberation tests sit: seven named fixtures across three kingdoms. */
const courtBase: ResilienceInput = {
  dilemma: trolleyDilemma,
  advisors: ADVISORS,
  kingdoms: KINGDOMS,
  baseSeed: 20261011,
};

const court: ResilienceInput = { ...courtBase, count: 12 };

describe("resilience / the sweep", () => {
  it("is a pure function of its input", () => {
    expect(analyseResilience(court)).toEqual(analyseResilience(court));
  });

  it("deliberates once per consecutive seed, in ascending order", () => {
    const report = analyseResilience(court);
    expect(report.count).toBe(12);
    expect(report.outcomes).toHaveLength(12);
    expect(report.outcomes.map((outcome) => outcome.seed)).toEqual([
      20261011, 20261012, 20261013, 20261014, 20261015, 20261016, 20261017, 20261018, 20261019,
      20261020, 20261021, 20261022,
    ]);
  });

  it("every outcome is the verdict runCouncil would have given that seed", () => {
    const report = analyseResilience(court);
    for (const outcome of report.outcomes) {
      const result = runCouncil({
        dilemma: court.dilemma,
        advisors: court.advisors,
        kingdoms: KINGDOMS,
        seed: outcome.seed,
      });
      expect(outcome.winnerId).toBe(result.winnerId);
      expect(outcome.margin).toBe(result.margin);
      expect(outcome.decidingAxis).toBe(result.decidingAxis);
    }
  });

  it("clamps its window and defaults to the documented sweep", () => {
    expect(analyseResilience(courtBase).count).toBe(RESILIENCE_SWEEP.default);
    // Below two seeds there is nothing to compare, so the window refuses to shrink.
    expect(analyseResilience({ ...court, count: 1 }).count).toBe(RESILIENCE_SWEEP.min);
    expect(analyseResilience({ ...court, count: 0 }).count).toBe(RESILIENCE_SWEEP.min);
    expect(analyseResilience({ ...court, count: -7 }).count).toBe(RESILIENCE_SWEEP.min);
  });

  it("tallies every seed exactly once and shares that sum to one", () => {
    const report = analyseResilience(court);
    const wins = report.options.reduce((total, option) => total + option.wins, 0);
    expect(wins).toBe(report.count);
    expect(report.options.reduce((total, option) => total + option.share, 0)).toBeCloseTo(1, 3);
    // Every option of the case is on the table, even one that never won.
    expect(new Set(report.options.map((option) => option.optionId))).toEqual(
      new Set(court.dilemma.options.map((option) => option.id)),
    );
  });

  it("names as modal the option that won the most seeds, ties to the case's own order", () => {
    const report = analyseResilience(court);
    const best = Math.max(...report.options.map((option) => option.wins));
    const modal = report.options.find((option) => option.optionId === report.modalWinnerId);
    expect(modal?.wins).toBe(best);
    if (best > 0) {
      const firstListed = report.options.find((option) => option.wins === best);
      expect(report.modalWinnerId).toBe(firstListed?.optionId);
    }
  });

  it("counts flips, streaks and the close band from the outcomes themselves", () => {
    const report = analyseResilience(court);

    let flips = 0;
    for (let i = 1; i < report.outcomes.length; i += 1) {
      if (report.outcomes[i]?.winnerId !== report.outcomes[i - 1]?.winnerId) flips += 1;
    }
    expect(report.flips).toBe(flips);

    let longest = 0;
    let streak = 0;
    for (const outcome of report.outcomes) {
      streak = outcome.winnerId === report.modalWinnerId && report.modalWinnerId !== "" ? streak + 1 : 0;
      if (streak > longest) longest = streak;
    }
    expect(report.longestStreak).toBe(longest);

    expect(report.closeSeeds).toBe(report.outcomes.filter((o) => o.margin <= CLOSE_MARGIN).length);
  });

  it("brackets every outcome with its margin statistics", () => {
    const report = analyseResilience(court);
    for (const outcome of report.outcomes) {
      expect(outcome.margin).toBeGreaterThanOrEqual(report.margin.min);
      expect(outcome.margin).toBeLessThanOrEqual(report.margin.max);
    }
    expect(report.margin.min).toBeLessThanOrEqual(report.margin.mean);
    expect(report.margin.mean).toBeLessThanOrEqual(report.margin.max);
  });

  it("accounts for every deciding axis, most frequent first", () => {
    const report = analyseResilience(court);
    expect(report.axes.reduce((total, entry) => total + entry.count, 0)).toBe(report.count);
    expect(new Set(report.axes.map((entry) => entry.axiom))).toEqual(new Set(AXIOM_KEYS));
    for (let i = 1; i < report.axes.length; i += 1) {
      expect(report.axes[i - 1]?.count ?? 0).toBeGreaterThanOrEqual(report.axes[i]?.count ?? 0);
    }
  });

  it("derives its verdict from stability through the documented thresholds", () => {
    for (const dilemma of DILEMMAS) {
      const report = analyseResilience({ ...court, dilemma, count: 6 });
      const expected =
        report.stability >= RESILIENCE_THRESHOLDS.settled
          ? "settled"
          : report.stability >= RESILIENCE_THRESHOLDS.contested
            ? "contested"
            : "fragile";
      expect(report.verdict).toBe(expected);
      expect(report.distinctWinners).toBe(report.options.filter((option) => option.wins > 0).length);
    }
  });
});

describe("resilience / influence", () => {
  it("reports the verdict the full bench reaches before removing anyone", () => {
    const report = analyseInfluence(court);
    const base = runCouncil({
      dilemma: court.dilemma,
      advisors: court.advisors,
      kingdoms: KINGDOMS,
      seed: court.baseSeed ?? 0,
    });
    expect(report.baseWinnerId).toBe(base.winnerId);
    expect(report.baseMargin).toBe(base.margin);
    expect(report.baseConfidence).toBe(base.confidence);
  });

  it("leaves out exactly one advisor at a time and tells the whole truth about each", () => {
    const report = analyseInfluence(court);
    expect(report.entries).toHaveLength(ADVISORS.length);

    for (const entry of report.entries) {
      const bench = ADVISORS.filter((advisor) => advisor.id !== entry.advisorId);
      const without = runCouncil({
        dilemma: court.dilemma,
        advisors: bench,
        kingdoms: KINGDOMS,
        seed: court.baseSeed ?? 0,
      });
      expect(entry.winnerWithoutId).toBe(without.winnerId);
      expect(entry.marginWithout).toBe(without.margin);
      expect(entry.confidenceWithout).toBe(without.confidence);
      expect(entry.pivotal).toBe(entry.winnerWithoutId !== report.baseWinnerId);
      // marginDelta is exactly the base margin minus the margin without them.
      expect(entry.marginDelta).toBe(round(report.baseMargin - entry.marginWithout, 4));
    }
  });

  it("orders pivots first and names them in pivotalIds", () => {
    const report = analyseInfluence(court);
    expect(report.pivotalIds).toEqual(
      report.entries.filter((entry) => entry.pivotal).map((entry) => entry.advisorId),
    );
    const firstNonPivot = report.entries.findIndex((entry) => !entry.pivotal);
    if (firstNonPivot !== -1) {
      for (let i = firstNonPivot; i < report.entries.length; i += 1) {
        expect(report.entries[i]?.pivotal).toBe(false);
      }
    }
  });

  it("classifies the bench by how many advisors could flip the verdict alone", () => {
    const report = analyseInfluence(court);
    const expected =
      report.pivotalIds.length === 0
        ? "robust"
        : report.pivotalIds.length <= INFLUENCE_THRESHOLDS.hinged
          ? "hinged"
          : "precarious";
    expect(report.verdict).toBe(expected);
  });

  it("is a pure function of its input", () => {
    expect(analyseInfluence(court)).toEqual(analyseInfluence(court));
  });

  it("cannot run a counterfactual on a court below two, and says so", () => {
    const first = ADVISORS[0];
    if (first === undefined) throw new Error("fixture bench is empty");
    const lone: ResilienceInput = { dilemma: paperclipDilemma, advisors: [first], kingdoms: KINGDOMS };
    const report = analyseInfluence(lone);
    expect(report.entries).toEqual([]);
    expect(report.pivotalIds).toEqual([]);
    expect(report.verdict).toBe("untested");
    // The base reading is still the real verdict of the one-advisor court.
    expect(report.baseWinnerId).toBe(runCouncil(lone).winnerId);
  });
});
