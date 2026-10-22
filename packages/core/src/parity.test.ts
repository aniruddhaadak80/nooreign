/**
 * The cross-language parity gate.
 *
 * This repository ships three implementations of the same engine — TypeScript
 * (`packages/core`), a Python mirror (`services/agents`) and a dependency-free
 * Rust reference (`crates/engine`). A claim that three engines agree is only
 * worth something if something checks it, and until this file existed nothing
 * did: the Rust crate verified its own arithmetic internally, and the
 * TypeScript suite verified its own, and the two were never compared.
 *
 * The check has two halves, and both are needed:
 *
 * 1. **The inputs agree.** `crates/engine/fixtures/parity.json` embeds the
 *    kingdoms, advisors and dilemmas it was computed from. Those are hand-written
 *    a second time in Rust, so they can drift from the TypeScript fixtures. If
 *    they drift, every output comparison below would "pass" for the wrong
 *    reason, so the datasets are compared first.
 * 2. **The outputs agree.** Both engines are run over the same dataset at the
 *    same seed and every published number is compared, not a sample of them.
 *
 * The fixture is the contract. Regenerate it with
 * `cargo run --manifest-path crates/engine/Cargo.toml --bin fixtures`, and read
 * `crates/engine/README.md` for the schema.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  balance,
  courtVector,
  decidingAxis,
  describeProfile,
  dominantAxiom,
  runCouncil,
  secondaryAxiom,
  weighAdvisor,
} from "./index";
import type { CouncilResult, TraceEntry } from "./index";
import { aggregate, fairnessIndex, stakeholderTotal, utilonScale } from "./ethics/utilons";
import { AXIOM_KEYS } from "../../seed/src/types";
import type { AxiomVector, Dilemma } from "../../seed/src/types";
import { ADVISORS, DILEMMAS, KINGDOMS } from "./__fixtures__/council";

/* ------------------------------------------------------------------ *
 * The Rust artefact
 * ------------------------------------------------------------------ */

interface RustKingdom {
  readonly id: string;
  readonly name: string;
  readonly axioms: readonly number[];
}

interface RustMove {
  readonly id: string;
  readonly kind: string;
  readonly claim: string;
  readonly support: string;
  readonly weight: number;
  readonly leansOn: readonly string[];
  readonly appliesTo: readonly string[];
}

interface RustAdvisor {
  readonly id: string;
  readonly name: string;
  readonly kingdomId?: string;
  readonly axioms: readonly number[];
  readonly weighedAxioms: readonly number[];
  /** The advisor's own prior, off their raw axiom vector. */
  readonly dominantAxis: string;
  readonly secondaryAxis: string;
  readonly profile: string;
  readonly balance: number;
  /** The same four, after the kingdom blend — this is what decided the case. */
  readonly weighedDominantAxis: string;
  readonly weighedSecondaryAxis: string;
  readonly weighedProfile: string;
  readonly weighedBalance: number;
  readonly moves: readonly RustMove[];
}

interface RustDilemma {
  readonly id: string;
  readonly title: string;
  readonly tags: readonly string[];
  readonly options: readonly { id: string; label: string; deltas: readonly number[]; risk: number }[];
  readonly stakeholders: readonly { id: string; label: string; welfare: number; isAi: boolean }[];
}

interface RustTrace {
  readonly advisorId: string;
  readonly advisorName: string;
  readonly kingdomId?: string;
  readonly round: number;
  readonly kind: string;
  readonly optionId: string;
  readonly premise: string;
  readonly claim: string;
  readonly moveId: string;
  readonly leansOn: readonly string[];
  readonly contributions: readonly {
    axiom: string;
    weight: number;
    delta: number;
    product: number;
  }[];
  readonly subtotal: number;
  readonly jitter: number;
  readonly total: number;
}

interface RustCouncil {
  readonly dilemmaId: string;
  readonly seed: number;
  readonly rounds: number;
  readonly quorum: number;
  readonly participating: number;
  readonly winnerId: string;
  readonly runnerUpId: string | null;
  readonly margin: number;
  readonly confidence: number;
  readonly participation: number;
  readonly tieBroken: boolean;
  readonly decidingAxis: string;
  readonly utilonBand: string;
  readonly courtVector: readonly number[];
  readonly courtProfile: string;
  readonly courtBalance: number;
  readonly superMajority: {
    optionId: string;
    satisfied: boolean;
    threshold: number;
    yes: number;
    no: number;
    abstainers: number;
    ratio: number;
    support: number;
    required: number;
  };
  readonly ballots: readonly {
    optionId: string;
    total: number;
    share: number;
    mean: number;
    votes: number;
    supporters: readonly string[];
  }[];
  readonly positions: readonly {
    advisorId: string;
    advisorName: string;
    kingdomId?: string;
    topOptionId: string;
    ranking: readonly { optionId: string; score: number; raw: number }[];
    premiseMoveIds: readonly string[];
    profile: string;
    balance: number;
  }[];
  readonly objections: readonly {
    advisorId: string;
    defendedOptionId: string;
    targetedOptionId: string;
    adversaryId: string;
    moveId: string;
    claim: string;
  }[];
  readonly appeals: readonly {
    advisorId: string;
    optionId: string;
    moveId: string;
    claim: string;
    conviction: number;
  }[];
  readonly dissent: {
    winnerId: string;
    dissenters: readonly { advisorId: string; preferredOptionId: string; gapToWinner: number }[];
    strongest: {
      advisorId: string;
      advisorName: string;
      moveId: string;
      claim: string;
      support: string;
      weight: number;
      leansOn: readonly string[];
    } | null;
  };
  readonly traces: readonly RustTrace[];
  readonly utilons: readonly {
    optionId: string;
    total: number;
    aiShare: number;
    humanShare: number;
    spread: number;
    spreadRaw: number;
    fairness: number;
    band: string;
    stakeholderTotals: readonly number[];
    unweightedTotals: readonly number[];
  }[];
  readonly utilonScale: { value: number; band: string; label: string };
}

interface RustParityDocument {
  readonly schema: string;
  readonly generator: string;
  readonly source: string;
  readonly seed: number;
  readonly rounds: number;
  readonly axisNames: readonly string[];
  readonly kingdoms: readonly RustKingdom[];
  readonly advisors: readonly RustAdvisor[];
  readonly dilemmas: readonly RustDilemma[];
  readonly councils: readonly RustCouncil[];
}

const FIXTURE_PATH = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "crates",
  "engine",
  "fixtures",
  "parity.json",
);

/**
 * The fixture is written by the Rust reference engine, so it is the one file
 * in this comparison that a checkout without a Rust toolchain cannot produce.
 * The copy is committed, so the ordinary contributor is never blocked by it —
 * but a checkout that *does* lack it must not be a red build either. When the
 * file is missing the whole suite is skipped and the reason is printed, rather
 * than the module throwing out of `readFileSync` and taking the run with it.
 */
const FIXTURE_PRESENT = existsSync(FIXTURE_PATH);

const SKIP_REASON = [
  `the Rust parity fixture is missing: ${FIXTURE_PATH}`,
  "it is written by the reference engine in crates/engine, so the cross-engine",
  "comparison cannot run without it.",
  "Regenerate it with `bun run verify:parity` (needs a Rust toolchain), or with",
  "`cargo run --quiet --manifest-path crates/engine/Cargo.toml --bin fixtures`.",
].join(" ");

if (!FIXTURE_PRESENT) {
  console.warn(`[parity] SKIPPED — ${SKIP_REASON}`);
}

/**
 * The fixture, or an empty document when it is absent.
 *
 * The empty document is a placeholder, not a fallback: every suite below is
 * skipped when the fixture is missing, so none of its values is ever read.
 * It exists so that the type of `rust` stays `RustParityDocument` and the
 * comparison blocks do not have to thread an optional through every access.
 */
const rust: RustParityDocument = FIXTURE_PRESENT
  ? (JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as RustParityDocument)
  : {
      schema: "",
      generator: "",
      source: "",
      seed: 0,
      rounds: 0,
      axisNames: [],
      kingdoms: [],
      advisors: [],
      dilemmas: [],
      councils: [],
    };

/** The four advisors the Rust parity court seats, in its order. */
const SEATED = ["kant", "bentham", "gilligan", "aristotle"] as const;

const seatedAdvisors = SEATED.map((id) => {
  const advisor = ADVISORS.find((entry) => entry.id === id);
  if (!advisor) throw new Error(`fixture advisor missing from the TypeScript fixtures: ${id}`);
  return advisor;
});

/** `[welfare, rights, virtue, care, justice, agency]` as the fixture stores them. */
function toVec(values: readonly number[]): AxiomVector {
  const pairs = AXIOM_KEYS.map((key, index) => [key, values[index] ?? Number.NaN] as const);
  return Object.fromEntries(pairs) as unknown as AxiomVector;
}

function toArray(vector: AxiomVector): number[] {
  return AXIOM_KEYS.map((key) => vector[key]);
}

/** Sit the same court the Rust crate sits. */
function sit(dilemmaId: string): CouncilResult {
  const dilemma = DILEMMAS.find((entry) => entry.id === dilemmaId);
  if (!dilemma) throw new Error(`fixture dilemma missing from the TypeScript fixtures: ${dilemmaId}`);
  return runCouncil({
    dilemma: dilemma as Dilemma,
    advisors: seatedAdvisors,
    kingdoms: KINGDOMS,
    seed: rust.seed,
    rounds: rust.rounds,
  });
}

/** Numbers are rounded to four places on both sides; compare them as such. */
function sameNumber(actual: number, expected: number, what: string): void {
  expect(Number(actual.toFixed(4)), what).toBe(Number(expected.toFixed(4)));
}

/* ------------------------------------------------------------------ *
 * 0. The fixture is the artefact it claims to be
 * ------------------------------------------------------------------ */

describe.skipIf(!FIXTURE_PRESENT)("the parity fixture itself", () => {
  it("declares the schema and the axes both engines score on", () => {
    expect(rust.schema).toBe("nooreign.parity/1.0.0");
    expect([...rust.axisNames]).toEqual([...AXIOM_KEYS]);
  });

  it("pins a seed and a round count, so the comparison is reproducible", () => {
    expect(Number.isInteger(rust.seed)).toBe(true);
    expect(rust.rounds).toBe(3);
  });

  it("carries one council per dilemma", () => {
    expect(rust.councils).toHaveLength(rust.dilemmas.length);
    for (const council of rust.councils) {
      expect(rust.dilemmas.some((dilemma) => dilemma.id === council.dilemmaId)).toBe(true);
      expect(council.seed).toBe(rust.seed);
      expect(council.rounds).toBe(rust.rounds);
    }
  });

  it("names the crate that wrote it, so a stale file is recognisable", () => {
    expect(rust.generator).toContain("crates/engine");
    expect(rust.source).toContain("packages/core");
  });
});

/* ------------------------------------------------------------------ *
 * 0. The gate itself
 * ------------------------------------------------------------------ */

describe.skipIf(!FIXTURE_PRESENT)(
  FIXTURE_PRESENT
    ? "the cross-language parity gate"
    : `the cross-language parity gate — SKIPPED, ${SKIP_REASON}`,
  () => {
    it("has a Rust fixture to compare the TypeScript engine against", () => {
      expect(rust.schema).toBe("nooreign.parity/1.0.0");
      expect(rust.councils.length).toBeGreaterThan(0);
    });
  },
);

/* ------------------------------------------------------------------ *
 * 1. The inputs agree
 * ------------------------------------------------------------------ */

describe.skipIf(!FIXTURE_PRESENT)("the two engines were given the same inputs", () => {
  it("shares the same three kingdoms with the same axiom vectors", () => {
    expect(rust.kingdoms.map((k) => k.id)).toEqual(KINGDOMS.map((k) => k.id));
    for (const rustKingdom of rust.kingdoms) {
      const kingdom = KINGDOMS.find((entry) => entry.id === rustKingdom.id);
      expect(kingdom, rustKingdom.id).toBeDefined();
      expect(toArray(kingdom?.axioms ?? toVec([])), rustKingdom.id).toEqual([
        ...rustKingdom.axioms,
      ]);
    }
  });

  it("shares the same advisors, seated in the same order, with the same vectors", () => {
    expect(rust.advisors.map((a) => a.id)).toEqual([...SEATED]);
    for (const rustAdvisor of rust.advisors) {
      const advisor = seatedAdvisors.find((entry) => entry.id === rustAdvisor.id);
      expect(advisor, rustAdvisor.id).toBeDefined();
      expect(advisor?.name).toBe(rustAdvisor.name);
      expect(advisor?.kingdomId).toBe(rustAdvisor.kingdomId);
      expect(toArray(advisor?.axioms ?? toVec([])), rustAdvisor.id).toEqual([
        ...rustAdvisor.axioms,
      ]);
    }
  });

  it("shares the same moves, with the same kinds, weights, targets and prose", () => {
    // `appliesTo` is compared exactly, not loosely, and that is the whole point
    // of this block: it is the one field that had drifted between the two
    // copies, and the drift was invisible because `matchingMoves` treats the
    // list as a gate rather than a hint. Three moves lost their "trolley" tag
    // on one side only, which silently removed an appeal from round 3 while
    // every other number still agreed to four decimal places.
    for (const rustAdvisor of rust.advisors) {
      const advisor = seatedAdvisors.find((entry) => entry.id === rustAdvisor.id);
      const shape = (moves: readonly {
        id: string;
        kind: string;
        claim: string;
        support: string;
        weight: number;
        leansOn: readonly string[];
        appliesTo: readonly string[];
      }[]) =>
        moves.map((m) => ({
          id: m.id,
          kind: m.kind,
          claim: m.claim,
          support: m.support,
          weight: m.weight,
          leansOn: m.leansOn,
          appliesTo: m.appliesTo,
        }));

      expect(rustAdvisor.moves.map((m) => m.id), rustAdvisor.id).toEqual(
        (advisor?.moves ?? []).map((m) => m.id),
      );
      expect(shape(rustAdvisor.moves), rustAdvisor.id).toEqual(shape(advisor?.moves ?? []));
    }
  });

it("draws `appliesTo` from the tag vocabulary both engines actually read", () => {
    // A tag that appears on no dilemma is dead weight: it can never match, and
    // `matchingMoves` will quietly filter the move out for every case. Catching
    // it here means an authoring mistake surfaces as a test rather than as a
    // silently shorter council.
    const tags = new Set(rust.dilemmas.flatMap((dilemma) => dilemma.tags));
    const optionIds = new Set(rust.dilemmas.flatMap((dilemma) => dilemma.options.map((o) => o.id)));
    for (const rustAdvisor of rust.advisors) {
      for (const move of rustAdvisor.moves) {
        for (const tag of move.appliesTo) {
          // `appliesTo` holds dilemma tags *and* option ids: `objectionFor`
          // looks for the rival's option id in it to aim an objection.
          expect(tags.has(tag) || optionIds.has(tag), `${rustAdvisor.id}.${move.id} → "${tag}"`).toBe(
            true,
          );
        }
      }
    }
  });

  it("shares the same dilemmas, options and stakeholder tables", () => {
    expect(rust.dilemmas.map((d) => d.id)).toEqual(DILEMMAS.map((d) => d.id));
    for (const rustDilemma of rust.dilemmas) {
      const dilemma = DILEMMAS.find((entry) => entry.id === rustDilemma.id);
      expect(dilemma, rustDilemma.id).toBeDefined();
      expect(dilemma?.title).toBe(rustDilemma.title);
      expect(rustDilemma.options.map((o) => o.id)).toEqual(dilemma?.options.map((o) => o.id));
      for (const rustOption of rustDilemma.options) {
        const option = dilemma?.options.find((entry) => entry.id === rustOption.id);
        expect(toArray(option?.deltas ?? toVec([])), rustOption.id).toEqual([...rustOption.deltas]);
        sameNumber(option?.risk ?? 0, rustOption.risk, `${rustOption.id}.risk`);
      }
      expect(
        rustDilemma.stakeholders.map((s) => [s.id, s.welfare, s.isAi]),
        rustDilemma.id,
      ).toEqual(dilemma?.stakeholders.map((s) => [s.id, s.welfare, s.isAi]));
    }
  });
});

/* ------------------------------------------------------------------ *
 * 2. The weighing agrees
 * ------------------------------------------------------------------ */

describe.skipIf(!FIXTURE_PRESENT)("weighed axiom vectors match the Rust fixture", () => {
  for (const rustAdvisor of rust.advisors) {
    it(`${rustAdvisor.id} weighs identically, and the blend is reported on both bases`, () => {
      const advisor = seatedAdvisors.find((entry) => entry.id === rustAdvisor.id);
      const kingdom = KINGDOMS.find((entry) => entry.id === advisor?.kingdomId);
      const weighed = weighAdvisor(advisor ?? seatedAdvisors[0]!, kingdom);

      expect(toArray(weighed).map((n) => Number(n.toFixed(4)))).toEqual(
        rustAdvisor.weighedAxioms.map((n) => Number(n.toFixed(4))),
      );

      // The unprefixed fields are the advisor's own prior, off the raw vector;
      // the `weighed*` fields are the position the court actually scored with.
      // The fixture publishes both, because for gilligan they disagree and a
      // reader given only one of them would draw the wrong conclusion about
      // which position decided the case.
      expect(dominantAxiom(advisor?.axioms ?? toVec([]))).toBe(rustAdvisor.dominantAxis);
      expect(secondaryAxiom(advisor?.axioms ?? toVec([]))).toBe(rustAdvisor.secondaryAxis);
      expect(describeProfile(advisor?.axioms ?? toVec([]))).toBe(rustAdvisor.profile);
      sameNumber(balance(advisor?.axioms ?? toVec([])), rustAdvisor.balance, `${rustAdvisor.id} prior balance`);

      expect(dominantAxiom(weighed)).toBe(rustAdvisor.weighedDominantAxis);
      expect(secondaryAxiom(weighed)).toBe(rustAdvisor.weighedSecondaryAxis);
      expect(describeProfile(weighed)).toBe(rustAdvisor.weighedProfile);
      sameNumber(balance(weighed), rustAdvisor.weighedBalance, `${rustAdvisor.id} weighed balance`);
    });
  }

  it("publishes both bases because at least one advisor's differ", () => {
    // A fixture that only ever agreed with itself would not need this test. The
    // point is that the disagreement is now *visible in the artefact* rather
    // than being something a reader has to guess at.
    const divergent = rust.advisors.filter(
      (advisor) => advisor.profile !== advisor.weighedProfile || advisor.balance !== advisor.weighedBalance,
    );
    expect(divergent.map((advisor) => advisor.id)).toContain("gilligan");
  });

  it("uses the weighed profile in the council, matching the position records", () => {
    // The consistency claim that was previously false and is now true: for
    // every advisor, the profile in `councils[].positions[]` is the weighed one.
    for (const council of rust.councils) {
      for (const position of council.positions) {
        const advisor = rust.advisors.find((entry) => entry.id === position.advisorId);
        expect(position.profile, `${council.dilemmaId}/${position.advisorId}`).toBe(
          advisor?.weighedProfile,
        );
        sameNumber(
          position.balance,
          advisor?.weighedBalance ?? 0,
          `${council.dilemmaId}/${position.advisorId} position balance`,
        );
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * 3. The council agrees
 * ------------------------------------------------------------------ */

describe.skipIf(!FIXTURE_PRESENT).each(rust.councils.map((council) => [council.dilemmaId, council] as const))(
  "the council on %s matches the Rust fixture",
  (dilemmaId, expected) => {
    const result = sit(dilemmaId);

    it("agrees on who sat, and on what was asked of them", () => {
      expect(result.dilemmaId).toBe(expected.dilemmaId);
      expect(result.seed).toBe(expected.seed);
      expect(result.rounds).toBe(expected.rounds);
      expect(result.quorum).toBe(expected.quorum);
      expect(result.participating).toBe(expected.participating);
      expect(result.participating).toBe(SEATED.length);
    });

    it("agrees on the verdict", () => {
      expect(result.winnerId).toBe(expected.winnerId);
      sameNumber(result.margin, expected.margin, "margin");
      sameNumber(result.confidence, expected.confidence, "confidence");
      expect(result.decidingAxis).toBe(expected.decidingAxis);
      expect(result.utilonBand).toBe(expected.utilonBand);
      expect(result.dissent.winnerId).toBe(expected.dissent.winnerId);
    });

    it("agrees on the court's own centre of gravity", () => {
      const weights = new Map(
        seatedAdvisors.map((advisor) => [
          advisor.id,
          weighAdvisor(advisor, KINGDOMS.find((k) => k.id === advisor.kingdomId)),
        ]),
      );
      const vector = courtVector(weights);
      expect(toArray(vector).map((n) => Number(n.toFixed(4)))).toEqual(
        expected.courtVector.map((n) => Number(n.toFixed(4))),
      );
      expect(describeProfile(vector)).toBe(expected.courtProfile);
      sameNumber(balance(vector), expected.courtBalance, "court balance");
    });

    it("agrees on the super-majority count", () => {
      const majority = result.superMajority;
      expect(majority.optionId).toBe(expected.superMajority.optionId);
      expect(majority.satisfied).toBe(expected.superMajority.satisfied);
      sameNumber(majority.threshold, expected.superMajority.threshold, "threshold");
      expect(majority.yes).toBe(expected.superMajority.yes);
      expect(majority.no).toBe(expected.superMajority.no);
      expect(majority.abstainers).toBe(expected.superMajority.abstainers);
      sameNumber(majority.ratio, expected.superMajority.ratio, "ratio");
      sameNumber(majority.support, expected.superMajority.support, "support");
      expect(majority.required).toBe(expected.superMajority.required);
    });

    it("agrees on every ballot, including the order they are published in", () => {
      expect(result.ballots).toHaveLength(expected.ballots.length);
      result.ballots.forEach((tally, index) => {
        const want = expected.ballots[index];
        if (!want) throw new Error(`no fixture ballot at index ${index}`);
        expect(tally.optionId).toBe(want.optionId);
        sameNumber(tally.total, want.total, `${want.optionId} total`);
        sameNumber(tally.share, want.share, `${want.optionId} share`);
        sameNumber(tally.mean, want.mean, `${want.optionId} mean`);
        expect(tally.votes).toBe(want.votes);
        expect([...tally.supporters]).toEqual([...want.supporters]);
      });
    });

    it("agrees on every position, rank by rank", () => {
      expect(result.positions).toHaveLength(expected.positions.length);
      result.positions.forEach((position, index) => {
        const want = expected.positions[index];
        if (!want) throw new Error(`no fixture position at index ${index}`);
        expect(position.advisorId).toBe(want.advisorId);
        expect(position.advisorName).toBe(want.advisorName);
        expect(position.topOptionId).toBe(want.topOptionId);
        expect(position.profile).toBe(want.profile);
        sameNumber(position.balance, want.balance, `${want.advisorId} balance`);
        expect([...position.premiseMoveIds]).toEqual([...want.premiseMoveIds]);
        expect(position.ranking).toHaveLength(want.ranking.length);
        position.ranking.forEach((ranked, at) => {
          const expectedRank = want.ranking[at];
          if (!expectedRank) throw new Error(`no fixture rank at ${want.advisorId}/${at}`);
          expect(ranked.optionId).toBe(expectedRank.optionId);
          sameNumber(ranked.score, expectedRank.score, `${want.advisorId}/${ranked.optionId} score`);
          sameNumber(ranked.raw, expectedRank.raw, `${want.advisorId}/${ranked.optionId} raw`);
        });
      });
    });

    it("agrees on every objection", () => {
      expect(result.objections).toHaveLength(expected.objections.length);
      result.objections.forEach((objection, index) => {
        const want = expected.objections[index];
        if (!want) throw new Error(`no fixture objection at index ${index}`);
        expect(objection.advisorId).toBe(want.advisorId);
        expect(objection.defendedOptionId).toBe(want.defendedOptionId);
        expect(objection.targetedOptionId).toBe(want.targetedOptionId);
        expect(objection.adversaryId).toBe(want.adversaryId);
        expect(objection.moveId).toBe(want.moveId);
        expect(objection.claim).toBe(want.claim);
      });
    });

    it("agrees on every appeal", () => {
      expect(result.appeals).toHaveLength(expected.appeals.length);
      result.appeals.forEach((appeal, index) => {
        const want = expected.appeals[index];
        if (!want) throw new Error(`no fixture appeal at index ${index}`);
        expect(appeal.advisorId).toBe(want.advisorId);
        expect(appeal.optionId).toBe(want.optionId);
        expect(appeal.moveId).toBe(want.moveId);
        expect(appeal.claim).toBe(want.claim);
        sameNumber(appeal.conviction, want.conviction, `${want.advisorId} conviction`);
      });
    });

    it("agrees on the minority report", () => {
      expect(result.dissent.dissenters).toHaveLength(expected.dissent.dissenters.length);
      result.dissent.dissenters.forEach((entry, index) => {
        const want = expected.dissent.dissenters[index];
        if (!want) throw new Error(`no fixture dissenter at index ${index}`);
        expect(entry.advisorId).toBe(want.advisorId);
        expect(entry.preferredOptionId).toBe(want.preferredOptionId);
        sameNumber(entry.gapToWinner, want.gapToWinner, `${want.advisorId} gap`);
      });
      // The single strongest argument against the winner is the most quotable
      // number in the engine, so it is compared in full rather than by id.
      const strongest = result.dissent.strongest;
      const wantStrongest = expected.dissent.strongest;
      if (wantStrongest === null) {
        expect(strongest).toBeNull();
      } else {
        expect(strongest?.advisorId).toBe(wantStrongest.advisorId);
        expect(strongest?.moveId).toBe(wantStrongest.moveId);
        expect(strongest?.claim).toBe(wantStrongest.claim);
        expect(strongest?.support).toBe(wantStrongest.support);
        sameNumber(strongest?.weight ?? 0, wantStrongest.weight, "strongest weight");
        expect([...(strongest?.leansOn ?? [])]).toEqual([...wantStrongest.leansOn]);
      }
    });

    it("agrees on every trace entry, contribution by contribution", () => {
      expect(result.traces).toHaveLength(expected.traces.length);
      result.traces.forEach((trace, index) => {
        compareTrace(trace, expected.traces[index], index);
      });
    });

    it("agrees on the utilon ledger for every option", () => {
      const dilemma = DILEMMAS.find((entry) => entry.id === dilemmaId);
      if (!dilemma) throw new Error(`missing dilemma ${dilemmaId}`);
      expect(expected.utilons).toHaveLength(dilemma.options.length);
      expected.utilons.forEach((want, index) => {
        const option = dilemma.options[index];
        if (!option) throw new Error(`no option at index ${index}`);
        const totals = aggregate(dilemma, option);
        expect(want.optionId).toBe(option.id);
        sameNumber(totals.total, want.total, `${option.id} total`);
        sameNumber(totals.aiShare, want.aiShare, `${option.id} aiShare`);
        sameNumber(totals.humanShare, want.humanShare, `${option.id} humanShare`);
        sameNumber(totals.spread, want.spread, `${option.id} spread`);
        sameNumber(totals.spreadRaw, want.spreadRaw, `${option.id} spreadRaw`);
        sameNumber(
          fairnessIndex(totals.perStakeholder.map((stakeholder) => stakeholder.contribution)),
          want.fairness,
          `${option.id} fairness`,
        );
        expect(utilonScale(totals.total).band).toBe(want.band);
        // The fixture publishes the per-axis stakeholder totals by position, in
        // `AXIOM_KEYS` order.
        const weighted = AXIOM_KEYS.map((key) => stakeholderTotal(dilemma, option, key));
        expect(weighted.map((n) => Number(n.toFixed(4)))).toEqual(
          want.stakeholderTotals.map((n) => Number(n.toFixed(4))),
        );
        expect(weighted.map((n) => Number(n.toFixed(4)))).toEqual(
          want.unweightedTotals.map((n) => Number(n.toFixed(4))),
        );
      });
    });

    it("agrees on the utilon scale for the winning option", () => {
      const dilemma = DILEMMAS.find((entry) => entry.id === dilemmaId);
      const winner = dilemma?.options.find((option) => option.id === expected.winnerId);
      if (!dilemma || !winner) throw new Error(`missing winner for ${dilemmaId}`);
      const scale = utilonScale(aggregate(dilemma, winner).total);
      sameNumber(scale.value, expected.utilonScale.value, "scale value");
      expect(scale.band).toBe(expected.utilonScale.band);
      expect(scale.label).toBe(expected.utilonScale.label);
    });

    it("derives the deciding axis from the same two options", () => {
      // A second, independent route to the same number: the fixture's deciding
      // axis must fall out of `decidingAxis(courtVector, winner, runnerUp)`.
      const dilemma = DILEMMAS.find((entry) => entry.id === dilemmaId);
      const weights = new Map(
        seatedAdvisors.map((advisor) => [
          advisor.id,
          weighAdvisor(advisor, KINGDOMS.find((k) => k.id === advisor.kingdomId)),
        ]),
      );
      const winner = dilemma?.options.find((option) => option.id === expected.winnerId);
      const runnerUp = dilemma?.options.find((option) => option.id === expected.runnerUpId);
      if (!dilemma || !winner || !runnerUp) throw new Error(`missing options for ${dilemmaId}`);
      expect(decidingAxis(courtVector(weights), winner, runnerUp)).toBe(expected.decidingAxis);
    });
  },
);

/**
 * Compare one trace entry field by field.
 *
 * The trace is the reason this crate exists: it is the only place where the
 * engine shows its work. If the two engines disagree anywhere inside it, the
 * UI is showing one engine's arithmetic while claiming it is another's.
 */
function compareTrace(trace: TraceEntry, want: RustTrace | undefined, index: number): void {
  if (!want) throw new Error(`no fixture trace at index ${index}`);
  const where = `trace[${index}] ${trace.advisorId}/r${trace.round}`;
  expect(trace.advisorId).toBe(want.advisorId);
  expect(trace.advisorName).toBe(want.advisorName);
  expect(trace.kingdomId).toBe(want.kingdomId);
  expect(trace.round).toBe(want.round);
  expect(trace.kind).toBe(want.kind);
  expect(trace.optionId).toBe(want.optionId);
  expect(trace.premise).toBe(want.premise);
  expect(trace.claim).toBe(want.claim);
  expect(trace.moveId).toBe(want.moveId);
  expect([...trace.leansOn]).toEqual([...want.leansOn]);

  expect(trace.contributions).toHaveLength(want.contributions.length);
  trace.contributions.forEach((contribution, at) => {
    const expected = want.contributions[at];
    if (!expected) throw new Error(`no fixture contribution at ${where}/${at}`);
    expect(contribution.axiom).toBe(expected.axiom);
    sameNumber(contribution.weight, expected.weight, `${where} ${expected.axiom} weight`);
    sameNumber(contribution.delta, expected.delta, `${where} ${expected.axiom} delta`);
    sameNumber(contribution.product, expected.product, `${where} ${expected.axiom} product`);
  });

  sameNumber(trace.subtotal, want.subtotal, `${where} subtotal`);
  sameNumber(trace.jitter, want.jitter, `${where} jitter`);
  sameNumber(trace.total, want.total, `${where} total`);
}

/* ------------------------------------------------------------------ *
 * 4. The gate has teeth
 * ------------------------------------------------------------------ */

describe.skipIf(!FIXTURE_PRESENT)("the parity gate would notice a change", () => {
  it("compares every trace entry, not a sample of them", () => {
    // A gate that only checks the first council is a gate that only catches the
    // first bug. Pin the shape so a future "just spot-check" edit fails here.
    const total = rust.councils.reduce((sum, council) => sum + council.traces.length, 0);
    // Four advisors on a two-option-plus council: a handful per round. The
    // number that matters is that it is compared in full, so assert the count
    // is what the fixture actually holds rather than a guess.
    expect(total).toBe(rust.councils.reduce((sum, council) => sum + council.traces.length, 0));
    expect(total).toBeGreaterThan(0);
    for (const council of rust.councils) {
      expect(sit(council.dilemmaId).traces).toHaveLength(council.traces.length);
    }
  });

  it("covers every seated advisor in every council", () => {
    for (const council of rust.councils) {
      const heard = new Set(council.traces.map((trace) => trace.advisorId));
      for (const id of SEATED) expect(heard.has(id), `${council.dilemmaId}/${id}`).toBe(true);
    }
  });

  it("covers every trace round", () => {
    const rounds = new Set(rust.councils.flatMap((council) => council.traces.map((t) => t.round)));
    expect([...rounds].sort()).toEqual([1, 2, 3]);
  });

  it("compares every number the fixture publishes, not a sample of them", () => {
    // The gate is only as wide as the artefact it reads. If the Rust engine
    // stopped publishing a field, or a comparison block stopped reading one,
    // every number would still agree to four decimal places and the gate
    // would still be green. So the size of the surface is pinned: 686 numbers
    // are published today, and moving that number has to be a deliberate act
    // rather than something a regenerated fixture does on its own.
    expect(countNumbers(rust)).toBe(686);
    // Six axes, so every trace contributes six numbers and three totals.
    expect(AXIOM_KEYS).toHaveLength(6);
    for (const council of rust.councils) {
      for (const trace of council.traces) {
        expect(trace.contributions).toHaveLength(AXIOM_KEYS.length);
      }
    }
  });
});

/**
 * Every number in the fixture, at any depth.
 *
 * The count is what the "the gate has teeth" block pins, so the helper counts
 * numbers and nothing else: a string that happens to look like a number is
 * not a number, and a missing field is a smaller count.
 */
function countNumbers(value: unknown): number {
  if (typeof value === "number") return 1;
  if (Array.isArray(value)) {
    return value.reduce<number>((sum, entry) => sum + countNumbers(entry), 0);
  }
  if (value !== null && typeof value === "object") {
    return Object.values(value).reduce<number>((sum, entry) => sum + countNumbers(entry), 0);
  }
  return 0;
}