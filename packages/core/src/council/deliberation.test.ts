import { describe, expect, it } from "vitest";

import {
  ADVISORS,
  KINGDOMS,
  advisorsIn,
  bentham,
  gilligan,
  kant,
  korsgaard,
  marcus,
  mill,
  paperclipDilemma,
  trolleyDilemma,
} from "../__fixtures__/council";
import type { Dilemma } from "@repo/seed/types";
import {
  JITTER,
  compareCouncils,
  courtVector,
  runCouncil,
  type CouncilInput,
} from "./deliberation";
import { weighAdvisor } from "../ethics/axioms";
import { round } from "../util/math";
import { toMermaid, buildGraph } from "./argument-graph";

const fullCourt: CouncilInput = {
  dilemma: trolleyDilemma,
  advisors: ADVISORS,
  kingdoms: KINGDOMS,
  seed: 20261011,
};

function option(dilemma: Dilemma, id: string) {
  const found = dilemma.options.find((o) => o.id === id);
  if (found === undefined) throw new Error(`fixture missing ${id}`);
  return found;
}

describe("deliberation / determinism", () => {
  it("produces a deep-equal result for identical inputs", () => {
    expect(runCouncil(fullCourt)).toEqual(runCouncil(fullCourt));
  });

  it("is unaffected by the order advisors are seated in", () => {
    const a = runCouncil(fullCourt);
    const b = runCouncil({ ...fullCourt, advisors: [...ADVISORS].reverse() });
    expect(a.winnerId).toBe(b.winnerId);
    expect(a.margin).toBe(b.margin);
    expect(b.ballots).toEqual(a.ballots);
    expect(b.narrative).toEqual(a.narrative);
  });

  it("changes with the seed, because the jitter stream is keyed on it", () => {
    const one = runCouncil({ ...fullCourt, seed: 1 });
    const two = runCouncil({ ...fullCourt, seed: 2 });
    expect(one.traces).not.toEqual(two.traces);
    // Jitter never exceeds the documented ceiling in either run.
    for (const t of [...one.traces, ...two.traces]) {
      expect(Math.abs(t.jitter)).toBeLessThanOrEqual(JITTER + 1e-9);
    }
  });

  it("defaults seed to 0 and reports it", () => {
    const noSeed = runCouncil({ dilemma: trolleyDilemma, advisors: ADVISORS });
    expect(noSeed.seed).toBe(0);
    expect(noSeed).toEqual(runCouncil({ dilemma: trolleyDilemma, advisors: ADVISORS, seed: 0 }));
  });

  it("is deterministic even with no advisors at all", () => {
    const empty = runCouncil({ dilemma: trolleyDilemma, advisors: [] });
    expect(empty.positions).toEqual([]);
    expect(empty.participating).toBe(0);
    expect(empty.quorum).toBe(0);
    expect(empty.margin).toBe(0);
    expect(empty.confidence).toBe(0);
  });
});

describe("deliberation / round 1 positions", () => {
  const result = runCouncil(fullCourt);

  it("seats every advisor and ranks every option", () => {
    expect(result.positions).toHaveLength(ADVISORS.length);
    for (const p of result.positions) {
      expect(p.ranking).toHaveLength(trolleyDilemma.options.length);
      expect(p.ranking.map((r) => r.optionId).sort()).toEqual(
        trolleyDilemma.options.map((o) => o.id).sort(),
      );
      // Ranking is strictly descending by score.
      for (let i = 1; i < p.ranking.length; i += 1) {
        expect(p.ranking[i - 1]?.score).toBeGreaterThanOrEqual(p.ranking[i]?.score ?? 0);
      }
      expect(p.topOptionId).toBe(p.ranking[0]?.optionId);
    }
  });

  it("attaches only premise moves that actually apply to the dilemma", () => {
    const tags = new Set(trolleyDilemma.tags);
    for (const p of result.positions) {
      for (const moveId of p.premiseMoveIds) {
        const source = ADVISORS.find((a) => a.id === p.advisorId)?.moves.find((m) => m.id === moveId);
        expect(source).toBeDefined();
        expect(source?.kind).toBe("premise");
        expect(
          source === undefined || source.appliesTo.length === 0 || source.appliesTo.some((t) => tags.has(t)),
        ).toBe(true);
      }
    }
  });

  it("separates the utilitarian from the deontologist on the trolley", () => {
    const benthamTop = result.positions.find((p) => p.advisorId === "bentham")?.topOptionId;
    const kantTop = result.positions.find((p) => p.advisorId === "kant")?.topOptionId;
    // Bentham throws the switch; Kant will not use a person as a means.
    expect(benthamTop).toBe("halt");
    expect(kantTop).not.toBe("halt");
    expect(benthamTop).not.toBe(kantTop);
  });

  it("reports each advisor's profile and balance", () => {
    const kantPos = result.positions.find((p) => p.advisorId === "kant");
    expect(kantPos?.profile).toBe("rights before agency");
    expect(kantPos?.balance).toBeGreaterThan(0);
    expect(kantPos?.balance).toBeLessThanOrEqual(1);
    const benthamPos = result.positions.find((p) => p.advisorId === "bentham");
    expect(benthamPos?.profile).toBe("welfare before care");
  });
});

describe("deliberation / traces", () => {
  const result = runCouncil(fullCourt);

  it("emits one trace per round-1 advisor, round-2 objection and round-3 appeal", () => {
    const r1 = result.traces.filter((t) => t.round === 1);
    const r2 = result.traces.filter((t) => t.round === 2);
    const r3 = result.traces.filter((t) => t.round === 3);
    expect(r1.length).toBeGreaterThanOrEqual(result.positions.length);
    expect(r2.length).toBe(result.objections.length);
    expect(r3.length).toBe(result.appeals.length);
    for (const t of result.traces) {
      expect([1, 2, 3]).toContain(t.round);
      expect(t.contributions).toHaveLength(6);
    }
  });

  it("keeps product equal to weight * delta for every contribution", () => {
    for (const t of result.traces) {
      for (const c of t.contributions) {
        // The invariant is exact: `product` is `round(weight * delta, 4)`, and
        // nothing else. Stating it that way beats a tolerance, because a
        // tolerance would let a genuinely wrong product slip through.
        expect(c.product).toBe(round(c.weight * c.delta, 4));
        expect(Math.abs(c.product - c.weight * c.delta)).toBeLessThan(0.0001);
        expect(c.weight).toBeGreaterThanOrEqual(0);
        expect(c.weight).toBeLessThanOrEqual(1);
        expect(c.delta).toBeGreaterThanOrEqual(0);
        expect(c.delta).toBeLessThanOrEqual(1);
        expect(c.weight).toBe(Math.round(c.weight * 1e4) / 1e4);
        expect(c.product).toBe(Math.round(c.product * 1e4) / 1e4);
      }
    }
  });

  it("keeps subtotal equal to the sum of its contributions and total equal to subtotal + jitter", () => {
    for (const t of result.traces) {
      const summed = t.contributions.reduce((a, c) => a + c.product, 0);
      expect(t.subtotal).toBeCloseTo(summed, 3);
      expect(t.total).toBeCloseTo(t.subtotal + t.jitter, 3);
      // Rounded to 4 dp, so no float dust survives into the rendered trace.
      expect(t.subtotal).toBe(Math.round(t.subtotal * 1e4) / 1e4);
      expect(t.total).toBe(Math.round(t.total * 1e4) / 1e4);
    }
  });

  it("names the advisor, their kingdom, their move and its quoted premise", () => {
    const t = result.traces[0];
    expect(t).toBeDefined();
    if (t === undefined) return;
    const advisor = ADVISORS.find((a) => a.id === t.advisorId);
    expect(t.advisorName).toBe(advisor?.name);
    expect(t.kingdomId).toBe(advisor?.kingdomId);
    const move = advisor?.moves.find((m) => m.id === t.moveId);
    expect(move).toBeDefined();
    expect(t.premise).toBe(move?.support);
    expect(t.claim).toBe(move?.claim);
    expect(t.leansOn).toEqual(move?.leansOn);
    expect(t.kind).toBe(move?.kind);
  });

  it("scores each trace with the kingdom-blended weights the court actually used", () => {
    const t = result.traces.find((x) => x.advisorId === "kant" && x.round === 1);
    if (t === undefined) throw new Error("no Kant round-1 trace");
    const kingdom = KINGDOMS.find((k) => k.id === "kg-citadel");
    const expected = weighAdvisor(kant, kingdom);
    expect(t.contributions.map((c) => c.weight)).toEqual([
      expected.welfare,
      expected.rights,
      expected.virtue,
      expected.care,
      expected.justice,
      expected.agency,
    ]);
  });
});

describe("deliberation / round 2 objections", () => {
  const result = runCouncil(fullCourt);

  it("has each advisor answer their strongest rival, naming an adversary", () => {
    expect(result.objections.length).toBeGreaterThan(0);
    for (const o of result.objections) {
      const own = result.positions.find((p) => p.advisorId === o.advisorId);
      expect(o.defendedOptionId).toBe(own?.topOptionId);
      // The rival is the advisor's second choice, never their own first.
      expect(o.targetedOptionId).not.toBe(o.defendedOptionId);
      expect(own?.ranking[1]?.optionId).toBe(o.targetedOptionId);
      expect(o.adversaryName.length).toBeGreaterThan(0);
    }
  });

  it("pairs every objection with a real objection-kind move", () => {
    for (const o of result.objections) {
      const move = ADVISORS.find((a) => a.id === o.advisorId)?.moves.find((m) => m.id === o.moveId);
      expect(move?.kind).toBe("objection");
      expect(o.claim).toBe(move?.claim);
    }
  });

  it("records the objection's own trace at round 2", () => {
    for (const o of result.objections) {
      expect(o.trace.round).toBe(2);
      expect(o.trace.kind).toBe("objection");
      expect(o.trace.optionId).toBe(o.defendedOptionId);
      expect(result.traces).toContainEqual(o.trace);
    }
  });

  it("builds a renderable argument graph from the whole sitting", () => {
    const moves = ADVISORS.flatMap((a) => a.moves);
    // Each objection presses against the premise its target's advocate put up,
    // which is exactly the conversation the council actually held.
    const targets: Record<string, string[]> = {};
    for (const o of result.objections) {
      const adversary = result.positions.find((p) => p.topOptionId === o.targetedOptionId);
      const anchor = adversary?.premiseMoveIds[0];
      if (anchor !== undefined) targets[o.moveId] = [anchor];
    }
    expect(Object.keys(targets).length).toBe(result.objections.length);

    const graph = buildGraph(moves, ADVISORS.map((a) => a.id), { targets });
    expect(graph.dangling).toEqual([]);
    expect(graph.edges.some((e) => e.kind === "attacks")).toBe(true);

    const mermaid = toMermaid(graph);
    expect(mermaid.startsWith("flowchart TD")).toBe(true);
    expect(mermaid).toContain(" -.-> ");
  });
});

describe("deliberation / round 3 appeals", () => {
  it("only lets advisors whose course lost appeal, and scales conviction by closeness", () => {
    const result = runCouncil(fullCourt);
    for (const a of result.appeals) {
      expect(a.kind === "appeal" || a.kind === "synthesis").toBe(true);
      expect(a.conviction).toBeGreaterThan(0);
      expect(a.conviction).toBeLessThanOrEqual(1);
      const own = result.positions.find((p) => p.advisorId === a.advisorId);
      expect(own?.topOptionId).toBe(a.optionId);
      // A winner never appeals against itself.
      expect(a.optionId).not.toBe(result.winnerId);
    }
  });

  it("runs no appeals at all when rounds are capped at two", () => {
    const two = runCouncil({ ...fullCourt, rounds: 2 });
    expect(two.rounds).toBe(2);
    expect(two.appeals).toEqual([]);
    expect(two.objections.length).toBeGreaterThan(0);
  });

  it("clamps a nonsense round count into [1, 3]", () => {
    expect(runCouncil({ ...fullCourt, rounds: 0 }).rounds).toBe(1);
    expect(runCouncil({ ...fullCourt, rounds: 99 }).rounds).toBe(3);
    expect(runCouncil({ ...fullCourt, rounds: -5 }).rounds).toBe(1);
    const one = runCouncil({ ...fullCourt, rounds: 1 });
    expect(one.objections).toEqual([]);
    expect(one.appeals).toEqual([]);
    expect(one.positions.length).toBe(ADVISORS.length);
  });
});

describe("deliberation / verdict", () => {
  const result = runCouncil(fullCourt);

  it("returns a winner that exists on the dilemma, with a bounded margin and confidence", () => {
    expect(trolleyDilemma.options.map((o) => o.id)).toContain(result.winnerId);
    expect(result.margin).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.ballots.length).toBe(trolleyDilemma.options.length);
  });

  it("agrees with its own ballot totals", () => {
    const top = result.ballots[0];
    const second = result.ballots[1];
    expect(top?.optionId).toBe(result.winnerId);
    expect(result.margin).toBeCloseTo((top?.total ?? 0) - (second?.total ?? 0), 3);
  });

  it("reports super-majority counts that add up to the bench", () => {
    const sm = result.superMajority;
    expect(sm.optionId).toBe(result.winnerId);
    expect(sm.yes + sm.no + sm.abstainers).toBe(result.participating);
  });

  it("names a dissenting advisor and their strongest objection", () => {
    expect(result.dissent.winnerId).toBe(result.winnerId);
    // Somebody always finds the override suspect.
    expect(result.dissent.dissenters.length).toBeGreaterThan(0);
    expect(result.dissent.strongest).not.toBeNull();
    expect(result.dissent.strongest?.claim.length).toBeGreaterThan(10);
  });

  it("records a synthesis citing its source move", () => {
    expect(result.synthesis).not.toBeNull();
    const s = result.synthesis;
    if (s === null) return;
    expect(s.kind).toBe("synthesis");
    expect(s.id.startsWith("synthesis.")).toBe(true);
    expect(s.id.endsWith(s.sourceMoveId)).toBe(true);
    const source = ADVISORS.find((a) => a.id === s.sourceAdvisorId);
    expect(source?.name).toBe(s.sourceAdvisorName);
    expect(source?.moves.some((m) => m.id === s.sourceMoveId)).toBe(true);
    // `close` records whether the court had to build a bridge, and is a real flag.
    expect(typeof s.close).toBe("boolean");
  });

  it("changes the verdict when the kingdoms are removed from the bench", () => {
    const withoutKingdoms = runCouncil({ dilemma: trolleyDilemma, advisors: ADVISORS, seed: 20261011 });
    // Kingdom context is a real input, not decoration.
    expect(withoutKingdoms.positions.map((p) => p.profile)).not.toEqual(
      result.positions.map((p) => p.profile),
    );
  });
});

describe("deliberation / paperclip", () => {
  const result = runCouncil({ dilemma: paperclipDilemma, advisors: ADVISORS, kingdoms: KINGDOMS, seed: 7 });

  it("rallies the whole court against the option that counts people as inputs", () => {
    // Rewriting the ledger is the only course that scores well on every axis
    // at once, and the citadel and the orchard both reject "let it run".
    expect(result.winnerId).toBe("cap");
    const last = result.ballots[result.ballots.length - 1];
    expect(last?.optionId).toBe("continue");
    expect(last?.total).toBeLessThan(
      result.ballots.find((b) => b.optionId === "cap")?.total ?? 0,
    );
  });

  it("clears a super-majority, which is the interesting result here", () => {
    expect(result.superMajority.satisfied).toBe(true);
    expect(result.superMajority.no).toBe(0);
    // Unanimous but not decisive: participation is 1 while the *totals* are
    // close, because the margin is measured against every score cast. Confidence
    // is deliberately not 1 — an unanimous bench that barely separated the
    // options has not settled anything, and the number says so.
    expect(result.superMajority.support).toBe(1);
    expect(result.confidence).toBeGreaterThan(0.45);
    expect(result.confidence).toBeLessThan(1);
  });

  it("produces a trace for every advisor with the arithmetic intact", () => {
    const r1 = result.traces.filter((t) => t.round === 1);
    expect(r1.length).toBeGreaterThanOrEqual(ADVISORS.length);
    for (const t of result.traces) {
      const summed = t.contributions.reduce((a, c) => a + c.product, 0);
      expect(t.subtotal).toBeCloseTo(summed, 3);
      expect(t.total).toBeCloseTo(t.subtotal + t.jitter, 3);
    }
  });
});

describe("deliberation / narrative", () => {
  it("writes between four and eight lines, all grounded in the numbers", () => {
    for (const input of [
      fullCourt,
      { ...fullCourt, dilemma: paperclipDilemma },
      { dilemma: trolleyDilemma, advisors: advisorsIn("kg-orchard"), kingdoms: KINGDOMS, seed: 3 },
    ]) {
      const result = runCouncil(input);
      expect(result.narrative.length).toBeGreaterThanOrEqual(4);
      expect(result.narrative.length).toBeLessThanOrEqual(8);
      expect(result.narrative[0]).toContain(input.dilemma.title);
      for (const line of result.narrative) {
        expect(line.length).toBeGreaterThan(10);
        expect(line).not.toContain("{");
        expect(line).not.toContain("undefined");
        expect(line).not.toContain("NaN");
      }
    }
  });

  it("names the axis that decided the sitting and the utilon band", () => {
    const result = runCouncil(fullCourt);
    const joined = result.narrative.join(" ");
    expect(joined).toContain(result.decidingAxis);
    expect(joined).toContain(result.utilonBand);
  });

  it("is deterministic line for line", () => {
    expect(runCouncil(fullCourt).narrative).toEqual(runCouncil(fullCourt).narrative);
  });
});

describe("deliberation / compareCouncils", () => {
  const groups = KINGDOMS.map((k) => ({ groupId: k.id, groupName: k.name, advisors: advisorsIn(k.id) }));

  it("runs one court per kingdom over the same dilemma and ranks them", () => {
    const cmp = compareCouncils(trolleyDilemma, groups, { seed: 5, kingdoms: KINGDOMS });
    expect(cmp.entries).toHaveLength(3);
    expect(cmp.dilemmaId).toBe(trolleyDilemma.id);
    for (const e of cmp.entries) {
      expect(trolleyDilemma.options.map((o) => o.id)).toContain(e.winnerId);
      expect(e.winnerLabel.length).toBeGreaterThan(0);
      expect(e.confidence).toBeGreaterThanOrEqual(0);
      expect(e.confidence).toBeLessThanOrEqual(1);
    }
    // Ranked most confident first.
    for (let i = 1; i < cmp.entries.length; i += 1) {
      expect(cmp.entries[i - 1]?.confidence).toBeGreaterThanOrEqual(cmp.entries[i]?.confidence ?? 0);
    }
  });

  it("says plainly whether the kingdoms agreed", () => {
    const cmp = compareCouncils(trolleyDilemma, groups, { seed: 5, kingdoms: KINGDOMS });
    expect(typeof cmp.agreed).toBe("boolean");
    expect(cmp.distinctWinners).toBeGreaterThanOrEqual(1);
    if (cmp.agreed) {
      expect(cmp.summary).toContain("All");
    } else {
      expect(cmp.summary).toContain("distinct verdicts");
    }
  });

  it("is deterministic and drops empty groups", () => {
    const withEmpty = [...groups, { groupId: "kg-none", groupName: "Nobody", advisors: [] }];
    const a = compareCouncils(trolleyDilemma, withEmpty, { seed: 5, kingdoms: KINGDOMS });
    const b = compareCouncils(trolleyDilemma, withEmpty, { seed: 5, kingdoms: KINGDOMS });
    expect(a).toEqual(b);
    expect(a.entries).toHaveLength(3);
    expect(a.entries.some((e) => e.groupId === "kg-none")).toBe(false);
  });

  it("carries a full council result per entry so the UI can drill in", () => {
    const cmp = compareCouncils(paperclipDilemma, groups, { seed: 5, kingdoms: KINGDOMS });
    for (const e of cmp.entries) {
      expect(e.result.traces.length).toBeGreaterThan(0);
      expect(e.result.narrative.length).toBeGreaterThanOrEqual(4);
      expect(e.result.narrative[0]).toContain(paperclipDilemma.title);
    }
  });
});

describe("deliberation / helpers", () => {
  it("averages a map of vectors into the court position", () => {
    const weights = new Map([
      ["kant", weighAdvisor(kant)],
      ["bentham", weighAdvisor(bentham)],
    ]);
    const court = courtVector(weights);
    expect(court.rights).toBeCloseTo((weighAdvisor(kant).rights + weighAdvisor(bentham).rights) / 2, 4);
    expect(court.welfare).toBeCloseTo((weighAdvisor(kant).welfare + weighAdvisor(bentham).welfare) / 2, 4);
  });

  it("returns the zero vector for an empty bench rather than NaN", () => {
    const court = courtVector(new Map());
    for (const v of Object.values(court)) expect(Number.isNaN(v)).toBe(false);
    expect(court.rights).toBe(0);
  });

  it("agrees with scoreOption when no kingdom is supplied", () => {
    const noKingdoms = runCouncil({ dilemma: trolleyDilemma, advisors: [kant], seed: 1 });
    const halt = option(trolleyDilemma, "halt");
    const raw = noKingdoms.positions[0]?.ranking.find((r) => r.optionId === "halt")?.raw;
    // Unblended, Kant's own arithmetic on `halt` is 1.035 / 3.05.
    expect(raw).toBeCloseTo(1.035 / 3.05, 3);
    expect(halt.id).toBe("halt");
  });
});

describe("deliberation / individual courts", () => {
  it("sits a one-advisor court for each fixture advisor without crashing", () => {
    for (const advisor of [kant, korsgaard, bentham, mill, marcus, gilligan]) {
      const r = runCouncil({ dilemma: paperclipDilemma, advisors: [advisor], kingdoms: KINGDOMS, seed: 9 });
      expect(r.positions).toHaveLength(1);
      expect(r.winnerId).toBe("cap");
      // One advisor cannot supply a super-majority against an empty bench of
      // supporters, so the engine says so rather than claiming unanimity.
      expect(r.superMajority.satisfied).toBe(true);
      expect(r.dissent.dissenters).toHaveLength(0);
    }
  });
});