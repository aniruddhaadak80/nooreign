# ADR 0008 — `crates/engine` is a Rust reference implementation used for parity, not for speed

**Status:** Accepted (2026-05, planned implementation)
**Deciders:** core maintainers
**Applies to:** `crates/engine/**`, `.github/workflows/ci.yml` (rust job), `package.json` (`crate:engine`)

---

## Context

Nooreign's verdict is six multiplications. The TypeScript engine in
`packages/core` does it in microseconds and will never be the bottleneck. So the
honest question is: **why a second implementation at all?**

Three reasons, in descending order of importance.

**1. The same arithmetic has to exist in three runtimes.** The TypeScript engine
runs in the browser. The Python service (`services/agents`) runs headless and
speaks HTTP. A Rust crate is the third implementation, and it is the one that is
*not* a port of the others: it is written from the specification rather than from
the TypeScript. That is what makes it a test.

**2. Divergence between two ports is invisible; divergence from a specification is
not.** If the Python service is a translation of the TypeScript, then the two
agree by construction and testing them against each other proves only that the
translation is faithful. A third implementation written independently, against the
same written formulas, and compared against fixed input vectors, catches the class
of bug where a formula is wrong in *all* ports the same way.

**3. It forces the formulas to be written down.** Writing `score_option` in a
language with no `zod` and no `Partial<T>` forces the axis order, the
normalisation and the rounding rule to be stated explicitly rather than inferred
from a TypeScript type. That is a documentation win disguised as an engineering
one.

The obvious counter-argument is duplication. Three implementations of a dot
product is three places for a rounding rule to differ, and someone will eventually
change one and not the others.

## Decision

`crates/engine` is a **reference implementation and parity oracle**, never a
production dependency.

- It is a `#![forbid(unsafe_code)]` crate whose only job is to compute the axiom
  vector, the utilon aggregate and the outcome tree, and to emit numbers that are
  compared against the TypeScript engine's output on fixed input vectors.
- The parity fixtures are **shared, not duplicated**. The same JSON vectors live
  in one place and are read by both the Rust test and the TypeScript test. A
  parity test that uses different fixtures on each side is two tests, not one.
- It is **not** wired into the web app, the SDK or the Docker image. Nothing in
  `apps/web` imports it. `package.json` exposes exactly one command,
  `crate:engine` → `cargo test --manifest-path crates/engine/Cargo.toml`.
- CI treats it as a first-class job with a stricter bar than the TypeScript
  packages:

```yaml
rust:
  name: rust (crates/engine)
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: dtolnay/rust-toolchain@stable
      with:
        { components: clippy }
    - uses: Swatinem/rust-cache@v2
      with:
        { workspaces: crates/engine -> target }
    - name: Test
      run: cargo test --manifest-path crates/engine/Cargo.toml
    # -D warnings: a clean build is the contract for a crate whose output is
    # compared byte-for-byte against a baseline.
    - name: Clippy
      run: cargo clippy --manifest-path crates/engine/Cargo.toml -- -D warnings
```

`clippy -- -D warnings` is non-negotiable, because a crate whose output is compared
against a baseline cannot afford a warning: the reviewer needs every line of the diff
to be semantic.

- `RUST_LOG=info` appears in `.env.example` and is the **only** env var in the file
  that is not for the Next.js app or the Python service — a deliberate marker that
  this crate is a different world.

Three surfaces are in scope:

| Surface | Purpose |
| --- | --- |
| `axiom.rs` | `AxiomVector`, `score_option`, `weigh_advisor`, `deciding_axis`, `distance`, `balance` |
| `utilon.rs` | `stakeholder_total`, `aggregate`, `fairness_index`, `utilon_scale`, `moral_status_risk` |
| `outcome_tree.rs` | Enumerate outcomes over the option set for a given dilemma, for combinatorial checks |

**Named trade-off:** the crate is a permanent second implementation to maintain. If
the TypeScript formula changes and the Rust one is not updated, the parity test
fails — which is the point — but it means a formula change costs two edits and a
toolchain install instead of one. We accept that, because the alternative is a
single implementation whose correctness rests entirely on its author's reading of
their own code.

## Consequences

**Positive**

- Formula changes are caught in two languages at once. A rounding-rule drift or an
  axis-order slip fails CI before it reaches a reader.
- The formulas are written down in a language that cannot hide intent behind type
  inference, which improves the documentation of the engine as a side effect.
- The crate is a genuinely independent check on the Python service as well, since
  both are compared against the TypeScript on the same vectors.
- Rust's numeric types make the `[0, 1]` bounds and the `round(n, 4)` convention
  explicit and checkable.
- `#![forbid(unsafe_code)]` and `clippy -- -D warnings` mean the crate has a
  quality bar higher than the TypeScript packages, which is appropriate for
  something acting as an oracle.
- A future contributor who wants to implement the engine in a fourth language has
  a written specification and a test vector set to work from.

**Negative**

- **CI time and a second toolchain.** The rust job is separate from the TypeScript
  matrix and needs `dtolnay/rust-toolchain` plus a `Swatinem/rust-cache` layer.
- **The parity fixtures become a contract of their own.** Changing the dataset's
  axioms changes expected values, and the fixtures must be regenerated in both
  languages or CI fails. That is correct but it is friction on every content PR.
- **A maintained-unused crate invites rot.** Nothing imports it, so nothing fails
  when it drifts from the engine it mirrors — except the parity test, which only
  checks the vectors someone thought to add. Coverage of the parity suite is a
  discipline, not a guarantee.
- **Three languages means three rounding conventions to reconcile.** TypeScript's
  `Math.round(n * 10^d) / 10^d` and Rust's `f64::round` differ on negative halves.
  Every formula that can go negative (`discount`, `sibling` gaps) needs an explicit
  convention and a test that pins it.
- Contributors who only know TypeScript now have to learn enough Rust to fix a
  parity failure, or ask for help.

## Alternatives considered

| Option | Why rejected |
| --- | --- |
| **One implementation, in TypeScript only** | The default, and it is defensible. Rejected because a single implementation's correctness is a matter of trust in its author, and this project's whole premise is that the arithmetic should be checkable by something that is not the arithmetic. |
| **Rust as the *production* engine via WASM** | Would make Rust load-bearing and slow down every change to the formula. The performance argument is fictitious — six multiplications are not a bottleneck — so this would be paying real complexity for a fake problem. |
| **Python as the parity oracle (already exists)** | Kept, but it is a *port*, so it shares the TypeScript implementation's blind spots by construction. Two ports agreeing is weaker evidence than a port and an independent implementation agreeing. |
| **Property-based testing only (no second language)** | Considered and adopted as a complement. Not a substitute: property tests say "the normalisation is monotone", not "the normalisation is the one the writer intended". |
| **A shared WASM core compiled from Rust, used by all three** | The maximum-consistency design. Rejected for now: it inverts the dependency direction (the oracle would become the source of truth), adds a toolchain to the critical path, and makes the TypeScript engine untypeable from its own types. |
