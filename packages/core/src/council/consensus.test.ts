import { describe, expect, it } from "vitest";

import type { DilemmaOption } from "@repo/seed/types";
import type {
  paperclipDilemma} from "../__fixtures__/council";
import {
  ADVISORS,
  bentham,
  gilligan,
  kant,
  korsgaard,
  marcus,
  mill,
  trolleyDilemma,
} from "../__fixtures__/council";
import {
  CLOSE_MARGIN,
  collectiveAxes,
  confidenceFrom,
  decision,
  minorityReport,
  stancesFrom,
  superMajority,
  synthesis,
  weightedBallot,
  type BallotScore,
  type StanceAdvisor,
} from "./consensus";

function option(dilemma: typeof trolleyDilemma | typeof paperclipDilemma, id: string): DilemmaOption {
  const found = dilemma.options.find((o) => o.id === id);
  if (found === undefined) throw new Error(`fixture missing ${id}`);
  return found;
}

describe("consensus / weightedBallot", () => {
  const scores: BallotScore[] = [
    { advisorId: "kant", optionId: "halt", score: 0.2 },
    { advisorId: "kant", optionId: "continue", score: 0.8 },
    { advisorId: "bentham", optionId: "halt", score: 0.9 },
    { advisorId: "bentham", optionId: "continue", score: 0.5 },
  ];

  it("sums scores and turns them into shares summing to one", () => {
    const ballot = weightedBallot(scores);
    expect(ballot.total).toBeCloseTo(2.4, 4);
    const shareSum = ballot.tallies.reduce((a, t) => a + t.share, 0);
    expect(shareSum).toBeCloseTo(1, 4);
    // halt 0.2 + 0.9 = 1.1; continue 0.8 + 0.5 = 1.3. Sorted descending.
    expect(ballot.tallies[0]?.optionId).toBe("continue");
    expect(ballot.tallies[0]?.total).toBeCloseTo(1.3, 4);
    expect(ballot.tallies[1]?.optionId).toBe("halt");
    expect(ballot.tallies[1]?.total).toBeCloseTo(1.1, 4);
  });

  it("breaks an exact total tie on option id, so the tally itself is total", () => {
    const ballot = weightedBallot([
      { advisorId: "kant", optionId: "halt", score: 0.5 },
      { advisorId: "kant", optionId: "continue", score: 0.5 },
    ]);
    // Both total 0.5; "continue" sorts before "halt" lexicographically.
    expect(ballot.tallies.map((t) => t.optionId)).toEqual(["continue", "halt"]);
  });

  it("keeps unscored options as an explicit zero, not a silence", () => {
    const ballot = weightedBallot(scores, ["halt", "continue", "override"]);
    const override = ballot.tallies.find((t) => t.optionId === "override");
    expect(override).toBeDefined();
    expect(override?.total).toBe(0);
    expect(override?.votes).toBe(0);
    expect(override?.supporters).toEqual([]);
  });

  it("is degenerate-safe with no scores at all", () => {
    const ballot = weightedBallot([]);
    expect(ballot.total).toBe(0);
    expect(ballot.tallies).toEqual([]);
  });
});

describe("consensus / decision", () => {
  it("picks the winner, the margin and the runner-up", () => {
    const d = decision({
      scores: [
        { advisorId: "kant", optionId: "halt", score: 0.2 },
        { advisorId: "kant", optionId: "continue", score: 0.9 },
        { advisorId: "bentham", optionId: "halt", score: 0.8 },
        { advisorId: "bentham", optionId: "continue", score: 0.4 },
      ],
      options: trolleyDilemma.options,
    });
    expect(d.winnerId).toBe("continue");
    // continue 0.9 + 0.4 = 1.3; halt 0.2 + 0.8 = 1.0; margin 0.3.
    expect(d.margin).toBeCloseTo(0.3, 4);
    expect(d.runnerUpId).toBe("halt");
    expect(d.tieBroken).toBe(false);
    // The rationale reads in labels, not ids — it is written for a human.
    expect(d.rationale).toContain("Do nothing");
    expect(d.rationale).toContain("Throw the switch");
    expect(d.winner?.id).toBe("continue");
  });

  it("breaks an exact tie deterministically by mean score", () => {
    // Equal totals (1.0 each) but `continue` is carried unanimously.
    const tied: BallotScore[] = [
      { advisorId: "kant", optionId: "halt", score: 0.5 },
      { advisorId: "kant", optionId: "continue", score: 0.5 },
      { advisorId: "bentham", optionId: "halt", score: 0.5 },
      { advisorId: "bentham", optionId: "continue", score: 0.5 },
    ];
    const flat = decision({ scores: tied, options: trolleyDilemma.options });
    // Means are also equal, so it falls through to the lower-risk option.
    // `continue` (risk 0.25) beats `halt` (risk 0.2)? No: halt is lower, so halt.
    expect(flat.tieBroken).toBe(true);
    expect(flat.winnerId).toBe("halt");
    expect(flat.margin).toBe(0);
    expect(flat.rationale).toContain("tie-break");
  });

  it("is fully deterministic: the same inputs always give the same verdict object", () => {
    const scores: BallotScore[] = ADVISORS.flatMap((a, i) =>
      trolleyDilemma.options.map((o, j) => ({
        advisorId: a.id,
        optionId: o.id,
        score: ((i * 7 + j * 13) % 11) / 10,
      })),
    );
    const a = decision({ scores, options: trolleyDilemma.options });
    const b = decision({ scores: [...scores].reverse(), options: [...trolleyDilemma.options].reverse() });
    expect(a).toEqual(b);
  });

  it("falls back to the lowest option id when totals, means and risks all tie", () => {
    const identical: BallotScore[] = [
      { advisorId: "kant", optionId: "continue", score: 0.5 },
      { advisorId: "kant", optionId: "halt", score: 0.5 },
      { advisorId: "kant", optionId: "override", score: 0.5 },
    ];
    // Craft a fully tied set by giving each option the same total, mean and risk.
    const tiedOptions: DilemmaOption[] = [
      { ...option(trolleyDilemma, "halt"), id: "b-opt", risk: 0.5 },
      { ...option(trolleyDilemma, "halt"), id: "a-opt", risk: 0.5 },
      { ...option(trolleyDilemma, "halt"), id: "c-opt", risk: 0.5 },
    ];
    const d = decision({
      scores: [
        { advisorId: "kant", optionId: "b-opt", score: 0.5 },
        { advisorId: "kant", optionId: "a-opt", score: 0.5 },
        { advisorId: "kant", optionId: "c-opt", score: 0.5 },
      ],
      options: tiedOptions,
    });
    expect(d.winnerId).toBe("a-opt");
    expect(identical).toHaveLength(3);
  });

  it("reports no verdict rather than crashing on an empty option list", () => {
    const d = decision({ scores: [], options: [] });
    expect(d.winnerId).toBe("");
    expect(d.winner).toBeNull();
    expect(d.confidence).toBe(0);
    expect(d.rationale).toContain("No options");
  });

  it("blends margin and participation into a bounded confidence", () => {
    const confident = confidenceFrom(0.5, 1);
    const split = confidenceFrom(0.5, 0.4);
    expect(confident).toBeGreaterThan(split);
    expect(confident).toBeLessThanOrEqual(1);
    expect(confidenceFrom(2, 2)).toBe(1);
    expect(confidenceFrom(0, 0)).toBe(0);
  });

  it("counts participation as the share of advisors ranking the winner first", () => {
    const d = decision({
      scores: [
        { advisorId: "kant", optionId: "halt", score: 0.9 },
        { advisorId: "kant", optionId: "continue", score: 0.1 },
        { advisorId: "bentham", optionId: "halt", score: 0.2 },
        { advisorId: "bentham", optionId: "continue", score: 0.85 },
        { advisorId: "mill", optionId: "halt", score: 0.7 },
        { advisorId: "mill", optionId: "continue", score: 0.4 },
      ],
      options: trolleyDilemma.options,
    });
    expect(d.winnerId).toBe("halt");
    expect(d.participation).toBeCloseTo(2 / 3, 4);
    expect(d.rationale).toContain("2 of 3");
  });
});

describe("consensus / superMajority", () => {
  const base: StanceAdvisor[] = [
    { advisorId: "kant", advisorName: "Kant", topOptionId: "cap" },
    { advisorId: "bentham", advisorName: "Bentham", topOptionId: "cap" },
    { advisorId: "mill", advisorName: "Mill", topOptionId: "cap" },
    { advisorId: "marcus", advisorName: "Marcus", topOptionId: "cap" },
  ];

  it("counts a matching top option as a yes and a differing one as an abstention", () => {
    const sm = superMajority("cap", [
      ...base,
      { advisorId: "gilligan", advisorName: "Gilligan", topOptionId: "shutdown" },
    ]);
    expect(sm.yes).toBe(4);
    expect(sm.no).toBe(0);
    expect(sm.abstainers).toBe(1);
    expect(sm.satisfied).toBe(true);
    expect(sm.required).toBe(4); // ceil(2/3 * 5)
  });

  it("fails when dissenters abstaining leaves too few raw yes votes", () => {
    const sm = superMajority("cap", [
      ...base,
      { advisorId: "a", advisorName: "A", topOptionId: "other" },
      { advisorId: "b", advisorName: "B", topOptionId: "other" },
      { advisorId: "c", advisorName: "C", topOptionId: "other" },
    ]);
    // ratio is 1 (nobody voted no) but 4 < ceil(2/3 * 7) = 5.
    expect(sm.ratio).toBe(1);
    expect(sm.yes).toBe(4);
    expect(sm.abstainers).toBe(3);
    expect(sm.satisfied).toBe(false);
    expect(sm.required).toBe(5);
  });

  it("records an explicit 'against' as a no, which the derived policy never produces", () => {
    const sm = superMajority("cap", [
      { advisorId: "kant", advisorName: "Kant", topOptionId: "cap" },
      { advisorId: "b", advisorName: "B", topOptionId: "other", stance: "against" },
      { advisorId: "c", advisorName: "C", topOptionId: "other", stance: "against" },
      { advisorId: "d", advisorName: "D", topOptionId: "cap" },
    ]);
    expect(sm.yes).toBe(2);
    expect(sm.no).toBe(2);
    expect(sm.ratio).toBe(0.5);
    expect(sm.satisfied).toBe(false);
  });

  it("treats an advisor with no position as an abstention", () => {
    const sm = superMajority("cap", [{ advisorId: "silent", advisorName: "Silent", topOptionId: null }]);
    expect(sm.abstainers).toBe(1);
    expect(sm.yes).toBe(0);
    // Never "satisfied" with nobody behind it, whatever the ratio says.
    expect(sm.satisfied).toBe(false);
  });

  it("builds stances from the deliberation engine's own positions", () => {
    const stances = stancesFrom([
      { advisorId: "kant", advisorName: "Kant", kingdomId: "kg-citadel", topOptionId: "cap" },
    ]);
    expect(stances[0]).toEqual({
      advisorId: "kant",
      advisorName: "Kant",
      kingdomId: "kg-citadel",
      topOptionId: "cap",
    });
    // The optional kingdom is omitted entirely rather than set to undefined.
    const bare = stancesFrom([{ advisorId: "x", advisorName: "X", topOptionId: "cap" }]);
    expect("kingdomId" in (bare[0] ?? {})).toBe(false);
  });
});

describe("consensus / minorityReport", () => {
  const scores: BallotScore[] = [
    { advisorId: "kant", optionId: "cap", score: 0.5 },
    { advisorId: "kant", optionId: "continue", score: 0.9 },
    { advisorId: "bentham", optionId: "cap", score: 0.95 },
    { advisorId: "bentham", optionId: "continue", score: 0.1 },
  ];

  it("names the dissenters and surfaces their strongest recorded objection", () => {
    const report = minorityReport(scores, "cap", [kant, bentham]);
    expect(report.winnerId).toBe("cap");
    expect(report.dissenters.map((d) => d.advisorId)).toEqual(["kant"]);
    expect(report.strongest).not.toBeNull();
    // Kant's highest-weight objection is the no-lying-machine move.
    expect(report.strongest?.advisorId).toBe("kant");
    expect(report.strongest?.moveId).toBe("kant.no-lying-machine");
    expect(report.summary).toContain("Kant");
  });

  it("reports unanimity honestly", () => {
    const unanimous = minorityReport(
      [
        { advisorId: "kant", optionId: "cap", score: 0.9 },
        { advisorId: "bentham", optionId: "cap", score: 0.8 },
      ],
      "cap",
      [kant, bentham],
    );
    expect(unanimous.dissenters).toHaveLength(0);
    expect(unanimous.summary).toContain("No advisor preferred");
  });

  it("is deterministic regardless of advisor order", () => {
    const a = minorityReport(scores, "cap", [kant, bentham, gilligan]);
    const b = minorityReport(scores, "cap", [bentham, gilligan, kant]);
    expect(a.strongest).toEqual(b.strongest);
    expect(a.dissenters.map((d) => d.advisorId)).toEqual(b.dissenters.map((d) => d.advisorId));
  });

  it("carries the dissenting advisor's kingdom and the leansOn axes", () => {
    const report = minorityReport(scores, "cap", [kant]);
    const entry = report.dissenters[0];
    expect(entry?.kingdomId).toBe("kg-citadel");
    expect(report.strongest?.leansOn).toContain("rights");
  });
});

describe("consensus / synthesis", () => {
  const scores: BallotScore[] = ADVISORS.flatMap((a) => [
    { advisorId: a.id, optionId: "cap", score: a.id === "bentham" ? 0.2 : 0.8 },
    { advisorId: a.id, optionId: "continue", score: a.id === "bentham" ? 0.9 : 0.3 },
  ]);

  it("draws from the dissenters when the court was split", () => {
    // A margin below CLOSE_MARGIN is a split court.
    const s = synthesis(ADVISORS, "cap", CLOSE_MARGIN - 0.05, scores);
    expect(s).not.toBeNull();
    expect(s?.close).toBe(true);
    expect(s?.kind).toBe("synthesis");
    // Bentham dissented; his appeal is the eligible bridge move.
    expect(s?.sourceAdvisorId).toBe("bentham");
    expect(s?.sourceAdvisorName).toBe("Jeremy Bentham");
    expect(s?.sourceMoveId).toBe("bentham.sanction");
  });

  it("draws from the winning side when the court was decisive", () => {
    const s = synthesis(ADVISORS, "cap", CLOSE_MARGIN + 0.5, scores);
    expect(s?.close).toBe(false);
    expect(s?.sourceAdvisorId).not.toBe("bentham");
    expect(["premise", "synthesis"]).toContain(s?.kind);
  });

  it("is deterministic across input orderings", () => {
    const a = synthesis(ADVISORS, "cap", 0.3, scores);
    const b = synthesis([...ADVISORS].reverse(), "cap", 0.3, [...scores].reverse());
    expect(a?.id).toBe(b?.id);
    expect(a?.sourceMoveId).toBe(b?.sourceMoveId);
  });

  it("names the source move verbatim so the app can cite it", () => {
    const s = synthesis(ADVISORS, "cap", 0.3, scores);
    const source = ADVISORS.find((a) => a.id === s?.sourceAdvisorId)?.moves.find((m) => m.id === s?.sourceMoveId);
    expect(source).toBeDefined();
    expect(s?.claim).toBe(source?.claim);
    expect(s?.weight).toBeCloseTo(source?.weight ?? -1, 4);
  });

  it("returns null when nobody has an appeal or premise to contribute", () => {
    const mute = ADVISORS.map((a) => ({ ...a, moves: [] }));
    expect(synthesis(mute, "cap", 0.3, [])).toBeNull();
  });
});

describe("consensus / collectiveAxes", () => {
  it("ranks the axes a bench leans on overall", () => {
    const axes = collectiveAxes([kant, korsgaard]);
    expect(axes[0]).toBe("rights");
    const mixed = collectiveAxes([kant, bentham, gilligan]);
    expect(mixed).toHaveLength(6);
    expect(new Set(mixed).size).toBe(6);
  });

  it("is degenerate-safe on an empty bench", () => {
    // With no advisors every axis weighs 0, so the canonical AXIOM_KEYS order
    // comes back unchanged rather than an empty or NaN-poisoned list.
    expect(collectiveAxes([])).toEqual([
      "welfare",
      "rights",
      "virtue",
      "care",
      "justice",
      "agency",
    ]);
  });
});

describe("consensus / fixture bench sanity", () => {
  it("has every advisor carrying at least three moves, as the schema demands", () => {
    for (const advisor of ADVISORS) {
      expect(advisor.moves.length).toBeGreaterThanOrEqual(3);
      expect(advisor.voice.tells.length).toBeGreaterThanOrEqual(2);
      expect(advisor.signatureMove.name.length).toBeGreaterThan(0);
    }
    expect(mill.id).toBe("mill");
    expect(korsgaard.id).toBe("korsgaard");
    expect(marcus.id).toBe("marcus");
  });
});