# `nooreign-ethics` — the Rust reference implementation

The reference implementation of **Nooreign's** verdict engine: the axiom
calculus, the utilon currency, and the three-round deliberation council.

Nooreign's central promise is that a verdict is *explainable*. A language model
can tell you an answer is defensible; this engine tells you which six
multiplications produced it, who objected, and what they said.

## The parity story

**Rust is the reference. TypeScript is tested against it.**

The engine also exists in TypeScript at `packages/core`, and that is the code
that runs in the app. But `fixtures/parity.json` in this directory is
generated *here*, and the TypeScript suite asserts that its own `runCouncil`,
`scoreOption`, `weighAdvisor`, `aggregate`, `fairnessIndex` and `utilonScale`
reproduce every number in it. Neither side may "improve" a formula, because the
other side's fixture would stop being evidence.

Where a formula could reasonably be written differently — the direction of a
round, the shape of a Gini, whether JS's `Math.round` agrees with Rust's
`f64::round` — the choice made here is documented at the function that makes it,
and the TypeScript file it ports is named. **There are no improvements in this
crate; there are only ports.**

### Zero dependencies

Not `serde`, not `rand`, not anything. The PRNG is a hand-rolled
[mulberry32](src/rng.rs) and the JSON emitter is ~150 lines in
[`src/json.rs`](src/json.rs). Both exist because a parity fixture is only
evidence if every byte of it is accounted for: a third-party float formatter or
hash that changed between versions would silently invalidate the comparison.

## Running it

```sh
cargo test  --manifest-path crates/engine/Cargo.toml
cargo build --manifest-path crates/engine/Cargo.toml
cargo run --quiet --manifest-path crates/engine/Cargo.toml --bin fixtures
```

The binary writes `crates/engine/fixtures/parity.json`. Running it twice
produces a byte-identical file — the test
`the_committed_fixture_matches_a_freshly_rendered_document` fails if the
committed fixture ever drifts from the engine, and
`rendering_the_parity_document_twice_is_byte_identical` fails if the writer ever
stops being deterministic.

> **If `cargo build` fails with ``linker `link.exe` not found``** you are on a
> Windows host without the MSVC toolchain. Build against the GNU target instead:
> `cargo build --manifest-path crates/engine/Cargo.toml --target x86_64-pc-windows-gnu`.

## Layout

| File | What it is | TypeScript it mirrors |
|---|---|---|
| `src/lib.rs` | module wiring + crate docs | — |
| `src/math.rs` | `clamp`, `round4`, `dot`, `mean`, `weighted_mean`, `safe_div` | `src/util/math.ts` |
| `src/rng.rs` | `mulberry32`, `hash_string` (FNV-1a), `create_rng` | `src/util/rng.ts` |
| `src/axiom.rs` | `AxiomVector`, `AXIS_NAMES`, `score_option`, `contributions`, `weigh_advisor`, `distance`, `dominant_axis`, `describe_profile`, `balance` | `src/ethics/axioms.ts` |
| `src/utilon.rs` | `aggregate`, `stakeholder_total`, `discount`, `fairness_index`, `utilon_scale` | `src/ethics/utilons.ts` |
| `src/deliberation.rs` | `TraceContribution`, `TraceEntry`, `CouncilResult`, `run_council`, `JITTER` | `src/council/deliberation.ts` |
| `src/json.rs` | a minimal JSON value + writer | — |
| `src/bin/fixtures.rs` | writes `fixtures/parity.json` | — |
| `tests/parity_shapes.rs` | integration tests on the public API + fixture round-trip | — |

## The arithmetic contract

Two invariants hold for **every** trace, to four decimal places. They are
asserted in the unit tests, in the integration tests, and structurally in the
fixture itself:

```text
Σ contributions[].product == subtotal
total == subtotal + jitter
```

`product` is exactly `round(weight * delta, 4)`, and `weight` and `delta` are
each rounded to 4 dp *before* being written out. The winner is derived *from*
the traces, never asserted alongside them.

### Two rounding notes worth knowing

**`Math.round` vs `f64::round`.** JavaScript's `Math.round` is specified as half
*toward +∞* (`Math.round(-2.5) === -2`). The TS `round` never exposes that,
because it feeds `Math.round` a non-negative value (`Math.abs(scaled)`) and
re-applies the sign afterwards with `Math.sign(scaled)` — so its effective
behaviour is half-away-from-zero, which is exactly what Rust's `f64::round`
does. See `src/math.rs`.

**`1 - ADVISOR_KINGDOM_BLEND` is `0.30000000000000004` in IEEE-754.** The blend
is written in Rust as `(1.0 - ADVISOR_KINGDOM_BLEND)` rather than as the
literal `0.3`, because the TS expression multiplies *that exact double*.
Simplifying it would change the last bit of every blended axis and break parity
on a value that looks identical when printed. See `axiom::weigh_advisor`.

### Tie-breaks are byte-ordered

The TS breaks ballot ties with `String.prototype.localeCompare`, which is
ICU-collation-dependent and therefore not a reproducible ordering. This port
uses Rust's byte-wise `Ord`. For every id in the parity fixture the two agree,
because the ids are plain lowercase ASCII. A TS parity test that wants to be
safe against a future id containing a hyphen should compare with byte ordering
rather than `localeCompare`.

## The fixture schema

`fixtures/parity.json` is a single JSON object. Keys appear in the order given
below; the writer emits insertion order, never hash order, so the file is
byte-stable. Numbers are `f64` rendered at shortest round-trip precision — every
one has been through `round4`, so `0.3393` prints as `0.3393`. Non-ASCII is
emitted as raw UTF-8, and `\n` line endings are written literally (never
`\r\n`), so a Windows checkout cannot perturb the file's hash.

### Top level

```ts
{
  schema: "nooreign.parity/1.0.0",   // assert this first; bump on any schema change
  generator: string,                 // provenance
  source: string,                    // the TS paths this mirrors
  seed: number,                      // 20261011
  rounds: number,                    // 3
  axisNames: string[],               // the canonical 6, in index order
  kingdoms: Kingdom[],
  advisors: Advisor[],
  dilemmas: Dilemma[],
  councils: Council[],               // one per dilemma, same order as `dilemmas`
}
```

### `Kingdom`

```ts
{ id: string, name: string, axioms: number[] }   // 6 numbers, AXIS_NAMES order
```

### `Advisor`

```ts
{
  id: string,                                  // e.g. "kant"
  name: string,
  kingdomId: string | null,
  axioms: number[],                            // the advisor's own 6 weights
  weighedAxioms: number[],                     // after the 70/30 kingdom blend
  dominantAxis: string,
  secondaryAxis: string,
  profile: string,                             // "rights before agency"
  balance: number,                             // 0 = one axis, 1 = perfectly even
  moves: Move[],
}
```

### `Move`

```ts
{
  id: string,
  kind: "premise" | "objection" | "appeal" | "synthesis",
  claim: string,
  support: string,
  weight: number,
  leansOn: string[],                           // axis names
  appliesTo: string[],                         // dilemma tags or option ids
}
```

### `Dilemma`

```ts
{
  id: string,
  title: string,
  tags: string[],
  options: DilemmaOption[],                    // exactly 3
  stakeholders: Stakeholder[],
}
```

`DilemmaOption` is `{ id, label, deltas: number[6], risk: number }`.
`Stakeholder` is `{ id, label, welfare, isAi }`.

### `Council`

The verdict plus the whole audit trail.

```ts
{
  dilemmaId: string,
  seed: number,
  rounds: 1 | 2 | 3,
  quorum: number,                              // reported, never enforced
  participating: number,
  winnerId: string,
  runnerUpId: string | null,
  margin: number,                              // winner total - runner-up total
  confidence: number,                          // in [0, 1]
  participation: number,                       // in [0, 1]
  tieBroken: boolean,                          // decided by tie-break, not totals
  decidingAxis: string,
  utilonBand: "tragic" | "costly" | "neutral" | "generous" | "transformative",
  courtVector: number[],                       // mean of every weighed advisor
  courtProfile: string,
  courtBalance: number,
  superMajority: {
    optionId: string, satisfied: boolean, threshold: number,
    yes: number, no: number, abstainers: number,
    ratio: number, support: number, required: number,
  },
  ballots: BallotTally[],
  positions: Position[],
  objections: Objection[],
  appeals: Appeal[],
  dissent: {
    winnerId: string,
    dissenters: { advisorId, advisorName, preferredOptionId, gapToWinner }[],
    strongest: {                               // null iff dissenters is empty
      advisorId, advisorName, moveId, claim, support, weight,
      leansOn: string[],
    } | null,
  },
  traces: Trace[],
  utilons: Utilon[],
  utilonScale: { value: number, band: string, label: string } | null,
}
```

`BallotTally` is
`{ optionId, total, share, mean, votes, supporters: string[] }`, best first.

`Position` is:

```ts
{
  advisorId, advisorName, kingdomId,
  topOptionId: string,
  ranking: { optionId, score, raw }[],         // score includes jitter; raw does not
  premiseMoveIds: string[],
  profile: string,
  balance: number,
}
```

`Objection` is `{ advisorId, advisorName, kingdomId, defendedOptionId,
targetedOptionId, adversaryId, adversaryName, moveId, claim }`.
`Appeal` is `{ advisorId, advisorName, kingdomId, optionId, kind, moveId,
claim, conviction }`.

`Utilon` is `{ optionId, total, aiShare, humanShare, spread, spreadRaw,
fairness, band, stakeholderTotals: number[6], unweightedTotals: number[6] }`.

### `Trace` — the primary output

```ts
{
  advisorId: string,
  advisorName: string,
  kingdomId: string | null,
  round: 1 | 2 | 3,                             // 1 positions, 2 objections, 3 appeals
  kind: Move["kind"],
  optionId: string,
  premise: string,                              // move.support, quoted verbatim
  claim: string,                                // move.claim
  moveId: string,
  leansOn: string[],
  contributions: {                              // always exactly 6, AXIS_NAMES order
    axiom: string,
    weight: number,                             // round(advisorWeight, 4)
    delta: number,                              // round(optionDelta, 4)
    product: number,                            // round(weight * delta, 4)
  }[],
  subtotal: number,                             // round(Σ product, 4)
  jitter: number,                               // in [-0.05, +0.05], round 4 dp
  total: number,                                // round(subtotal + jitter, 4)
}
```

### What a TypeScript parity test should assert

1. `schema` is `"nooreign.parity/1.0.0"`.
2. For every trace, `round(Σ contributions[].product, 4) === subtotal`.
3. For every trace, `round(subtotal + jitter, 4) === total`.
4. For every trace, `contributions[i].product === round(weight * delta, 4)`.
5. `contributions[i].weight` equals the advisor's `weighedAxioms[i]`.
6. `margin === round(ballots[0].total - ballots[1].total, 4)`.
7. Your `runCouncil` returns the same `winnerId`, `margin`, `confidence`,
   `decidingAxis` and `utilonBand` for each dilemma at `seed`.

Note for step 2: `Σ` over six 4 dp doubles is not exactly `subtotal` in
binary floating point — that is why the contract is stated in terms of `round4`.

## Deliberately not ported

* **`narrate()`** — the prose assembled from a verdict.
* **`synthesis()`** — the settling statement.
* **`compareCouncils()`** — several courts over one dilemma.
* **`packages/core/src/experiments/simulator.ts`** — a different set of
  formulas (dial-driven thought experiments with `JITTER_BOUND = 0.03`), not
  council deliberation.

All four are presentation or separate-domain layers. None of them feeds a
number back into a verdict. Everything that *computes* is here, and the parity
fixture is built from the computing half — so a TS test that agrees with these
fixtures agrees on the arithmetic.