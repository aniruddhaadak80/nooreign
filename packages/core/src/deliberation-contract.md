# The deliberation contract

**What this document is.** The rules the council engine follows, stated once, so that the TypeScript
implementation (`packages/core/src/council/`), the Python mirror (`services/agents/app/`) and the Rust
reference (`crates/engine/`) cannot drift apart silently, and so a reader can predict a verdict without
running one.

If you change the algorithm, change this document in the same commit. If you change this document
without changing the algorithm, the tests will tell you.

---

## 1. The inputs

```ts
runCouncil({
  dilemma,          // options carry six deltas each, plus risk / reversibility / agentHarm
  advisors,         // each carries six axiom weights, a temperament and argument moves
  kingdoms,         // the realms those advisors belong to
  seed = 0,         // the only source of variation
  rounds = 3,       // clamped to [1, 3]
  quorum,           // reported, never enforced
})
```

Nothing else is consulted. There is no clock, no `Math.random`, no iteration-order dependence, and no
read of anything outside these objects. A sitting is a pure function of its arguments.

## 2. The scoring function

For each advisor `a` and option `o`:

```
weights(a)  = 0.7 * a.axioms + 0.3 * kingdom(a).axioms      # the realm has a seat too
contributions = AXIOM_KEYS.map(k => ({
    axis:    k,
    weight:  weights(a)[k],
    delta:   o.deltas[k],
    product: round4(weight * delta),
}))
subtotal = Σ products / Σ weights            # normalised; guarded against a zero sum
jitter   = createRng(seed, "r1", a.id, o.id) * JITTER       # JITTER = 0.05
score    = round4(subtotal + jitter)
total    = round4(Σ products + jitter)
```

Two numbers are reported and they are **not** redundant:

- `total` is the raw dot product — what the trace on screen shows you adding up.
- `score` is the weight-normalised number — what the ballot ranks, because a court of six and a court of
  three have to be comparable.

`JITTER` is deliberately tiny. A philosopher who is off by a twentieth of their own confidence is still a
philosopher with a view; anything larger would let the seed decide verdicts, which would defeat the
purpose of a transparent engine.

**Rounding is half-away-from-zero at four decimal places** in both TypeScript and Rust. This matters:
`Math.round` alone rounds half toward +∞, so the implementations take the absolute value, round, and
re-sign.

## 3. The three rounds

| Round | Name | What runs |
|---|---|---|
| 1 | positions | Every advisor scores every option, ranks them, and attaches the argument moves whose `appliesTo` is empty or intersects the dilemma's tags. |
| 2 | objections | Each advisor answers their strongest rival option with their heaviest `objection` move, recording which option it presses against and whose position it answers. An objection that targets nothing is dropped, not kept. |
| 3 | appeals | Advisors whose option lost narrowly commit an `appeal` or `synthesis` move. Conviction is scaled by how close the vote was. |

Round 2 and 3 draw from **separate** PRNG streams (`"r2"`, `"r3"`). A reseed that changes round 1 must
not silently change which objection an advisor reaches for, or the council stops being reproducible
under a change of seed in exactly the place a reader would check.

## 4. The ballot and the tie-break

`weightedBallot` sums `score` per option. The winner is decided in a fixed order, each step fully
determining the next:

1. highest total;
2. highest mean score per advisor — a unanimous preference beats a split one carrying the same total;
3. lowest `risk` — the court does not hand a tied victory to the more dangerous course;
4. lexicographically smallest id — a total tie-break, so two councils with identical numbers always
   produce identical output.

**Compare ids byte-wise, never with `localeCompare`.** ICU collation depends on the host's locale data,
and a verdict that depends on which ICU build is installed is not reproducible.

## 5. The synthesis

The court's settling statement is drawn from the advisors' own `moves` arrays, never written fresh.

- `close = margin < CLOSE_MARGIN` (`CLOSE_MARGIN = 0.25`).
- **Close** — the court was split — draws from the *dissenters'* `appeal` / `synthesis` moves: the bridge
  that actually had to be built.
- **Decisive** — the court agreed — draws from the *winning side's* `premise` moves.

Within the eligible pool the highest `weight` wins; ties break on advisor id, then move id.

> This threshold direction is pinned by `packages/core/src/council/consensus.ts` and was implemented
> inverted in the Python mirror for one commit. The parity fixtures exist because of exactly that class
> of bug. If you are porting this engine, get this line right or a council will confidently explain the
> losing side.

With no recorded ballots there is no winning side, and `synthesis` returns `None` rather than inventing a
quote.

## 6. Minority report and supermajority

- `superMajority` counts advisors whose own top option matches the winner as `yes`, those who preferred
  something else as `no`, and everyone else as `abstainers`. It is **reported, never enforced** — this
  engine takes a position, not a vote.
- `minorityReport` names the dissenters ordered by how close they came, and surfaces the single strongest
  argument against the winner, including the advisor, the move id and the axes it leans on.

## 7. What the trace guarantees

Every `TraceEntry` satisfies, and the test suite asserts:

```
len(contributions) == 6
contributions.every(c => c.product === round4(c.weight * c.delta))
Σ contributions.product === subtotal          (to 4 dp)
total === round4(subtotal + jitter)
score === round4(normalized + jitter)
|jitter| <= JITTER
```

The UI renders `contributions`, `subtotal`, `jitter` and `total` verbatim. That is the whole point: the
trace is the arithmetic, not a story told after the fact.

## 8. Determinism checklist for any change here

- [ ] No `Date.now()`, no `Math.random()`, no `crypto`.
- [ ] No iteration over an object whose key order you did not control, or an explicit sort by id.
- [ ] Every new random draw gets its own tagged stream (`createRng(seed, "rN", ...)`).
- [ ] Rounding at 4 dp, half away from zero, identically in every language.
- [ ] No `localeCompare` on anything that can reach a verdict.
- [ ] A new field in `CouncilResult` is mirrored in the Python response model and in the Rust fixture.
- [ ] `bun run verify` passes, and `cargo test --manifest-path crates/engine/Cargo.toml` still reproduces
      the same fixture hash.
