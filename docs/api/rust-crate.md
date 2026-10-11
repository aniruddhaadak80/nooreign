# Rust crate — `crates/engine`

What you get: the intended surface of the reference crate, the parity contract it
exists to enforce, and an honest statement of what is and is not in the tree today.

---

## Status, stated up front

**`crates/` is an empty directory as of this writing.** There is no `Cargo.toml`,
no `src/`, no `axiom.rs`. `packages/core/src/chronicle/timeline.ts`'s sibling
contract file `packages/core/src/deliberation-contract.md` does not exist either;
`chronicle-contract.md` is the only engine contract document present.

Everything below is therefore one of two things, and each is marked:

| Marking | Meaning |
| --- | --- |
| **Present** | Read from a file in the repository |
| **Specified** | Written in [ADR 0008](../adr/0008-rust-reference-engine-parity.md); the implementation is planned, not written |

This document does not invent signatures. Where a function does not exist, it says
"reference implementation, see README" and points at the ADR.

## What CI already expects

This is the sharpest fact, because **CI is already written for a crate that is not
there**. `.github/workflows/ci.yml`, job `rust`:

```yaml
rust:
  name: rust (crates/engine)
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: dtolnay/rust-toolchain@stable
      with:
        components: clippy
    - uses: Swatinem/rust-cache@v2
      with:
        workspaces: crates/engine -> target
    - name: Test
      run: cargo test --manifest-path crates/engine/Cargo.toml
    - name: Clippy
      run: cargo clippy --manifest-path crates/engine/Cargo.toml -- -D warnings
```

Both commands fail on a checkout where `crates/engine/Cargo.toml` does not exist.
`package.json` exposes the first as a script:

```json
"crate:engine": "cargo test --manifest-path crates/engine/Cargo.toml"
```

So `bun run crate:engine` is a real command with a real failure mode today. See
[`../runbooks/incident-triage.md`](../runbooks/incident-triage.md).

`.env.example` carries the one env var in the repo that belongs to this crate and
nothing else:

```bash
# Rust log filter for crates/engine. App/framework logs ignore this.
RUST_LOG=info
```

ADR 0008 calls that a deliberate marker: *"the only env var in the file that is not
for the Next.js app or the Python service — a deliberate marker that this crate is a
different world."*

---

## Why it exists at all

ADR 0008's argument, in three steps:

1. **The same arithmetic has to exist in three runtimes.** TypeScript runs in the
   browser; Python runs headless over HTTP; Rust is the third. And Rust is the one
   that is **not** a port — it is written from the specification rather than from the
   TypeScript. That is what makes it a test.
2. **Divergence between two ports is invisible; divergence from a specification is
   not.** Two ports agreeing proves only that the translation was faithful. A third
   implementation written independently catches the class of bug where a formula is
   wrong in *all* ports the same way.
3. **It forces the formulas to be written down.** Writing `score_option` in a
   language with no `zod` and no `Partial<T>` forces the axis order, the
   normalisation and the rounding rule to be stated explicitly rather than inferred
   from a TypeScript type.

**It is not for speed.** Six multiplications are not a bottleneck, and ADR 0008
rejects the WASM production path explicitly:

> Rejected because it would make Rust load-bearing and slow down every change to the
> formula. The performance argument is fictitious.

---

## The contract, from ADR 0008

> It is a `#![forbid(unsafe_code)]` crate whose only job is to compute the axiom
> vector, the utilon aggregate and the outcome tree, and to emit numbers that are
> compared against the TypeScript engine's output on fixed input vectors.

Three modules are in scope:

| Module | Functions | Mirrors |
| --- | --- | --- |
| `axiom.rs` | `AxiomVector`, `score_option`, `weigh_advisor`, `deciding_axis`, `distance`, `balance` | `packages/core/src/ethics/axioms.ts` |
| `utilon.rs` | `stakeholder_total`, `aggregate`, `fairness_index`, `utilon_scale`, `moral_status_risk` | `packages/core/src/ethics/utilons.ts` |
| `outcome_tree.rs` | Enumerate outcomes over an option set for a given dilemma, for combinatorial checks | nothing in TypeScript — this one is new |

**These names are specified, not observed.** Read them as the ADR's naming, which
follows Rust snake_case from the camelCase TypeScript exports. If you implement the
crate, these are the names the ADR expects; changing them is a change to the ADR.

`outcome_tree.rs` is the one to read twice. It has no counterpart in `packages/core`
— the TypeScript engine scores a fixed option list and never enumerates the product
space. So it is not a parity oracle for anything; it is a combinatorial checker that
the TypeScript side has no answer for. That asymmetry is intentional and is the most
interesting thing about the crate.

## Where the parity fixtures live

ADR 0008 is emphatic:

> The parity fixtures are **shared, not duplicated**. The same JSON vectors live in
> one place and are read by both the Rust test and the TypeScript test. A parity test
> that uses different fixtures on each side is two tests, not one.

**The fixture location is not specified and the file does not exist.** ADR 0008 names
the principle but not the path. A contributor implementing the crate must choose one
and then make both sides read it. Two candidates, both defensible:

| Candidate | For | Against |
| --- | --- | --- |
| `crates/engine/tests/parity.json` | The Rust test owns it | The TypeScript test would read into `crates/`, crossing the package boundary |
| `packages/core/src/__fixtures__/parity.json` | `packages/core` owns the reference outputs | A Rust test reading into `packages/` is unusual but legal |

**Whichever you pick, write it in the ADR.** ADR 0008 already flags this as friction:

> The parity fixtures become a contract of their own. Changing the dataset's axioms
> changes expected values, and the fixtures must be regenerated in both languages or
> CI fails. That is correct but it is friction on every content PR.

## The rounding trap, stated explicitly

ADR 0008 lists this as a named negative consequence:

> Three languages means three rounding conventions to reconcile. TypeScript's
> `Math.round(n * 10^d) / 10^d` and Rust's `f64::round` differ on negative halves.
> Every formula that can go negative (`discount`, `sibling` gaps) needs an explicit
> convention and a test that pins it.

Which formulas can go negative in `packages/core` today:

| Formula | Can go negative | Notes |
| --- | --- | --- |
| `discount(option, steps)` — `ethics/utilons.ts` | yes | The obvious one |
| `sign(n)` — `util/math.ts` | n/a | Returns −1/0/1 |
| Any axis gap | yes | `AxisGap.gap` is signed |
| `signed` terms in the simulators | yes | `scorePaperclip` subtracts precision and monitoring from a base |

The Python service already declares its convention in `services/agents/app/axioms.py`:

> **No NaN, no Infinity.** A verdict engine that can emit `NaN` can render "NaN%" in
> the UI and poison every aggregate upstream. Degenerate inputs (empty courts, zero
> denominators, zero-weight advisors) get an explicit, documented default instead.

And:

> **Round early, round to 4 dp.** Every intermediate that a human will ever see is
> rounded exactly once, at construction.

The Rust crate needs both, stated in the same words.

## The port fidelity requirement

`services/agents/app/deliberation.py` documents the standard the Rust crate has to
match:

> The PRNG here is a port of the TypeScript `mulberry32` in
> `packages/core/src/util/rng.ts`, down to the FNV-1a string hash over UTF-16 code
> units.

| Component | TypeScript source | Requirement |
| --- | --- | --- |
| PRNG | `mulberry32(seed)` in `packages/core/src/util/rng.ts` | Same 32-bit state update: `a = (a + 0x6D2B79F5) >>> 0`, then the two `Math.imul` xor-shift rounds, then `/ 4294967296` |
| String hash | `hashString(s)`, FNV-1a 32-bit | Same offset basis `0x811c9dc5`, same prime `0x01000193`, and the same **UTF-16 code unit** iteration — not UTF-8 bytes. `deliberation.py` calls this out by name: "ids containing astral-plane characters must fold the same way here as they do there" |
| Stream keying | `createRng(...parts)` | Parts joined with U+241F `␟`, not a comma or a null byte |
| Axis order | `AXIOM_KEYS` | A fixed-order array constant. Reordering changes every total in the product |

Rust's `String` is UTF-8. To match FNV-1a over UTF-16 code units you have to encode
to UTF-16 explicitly (`str::encode_utf16()`) before hashing, and fold surrogate pairs
as two separate `u16` values. Getting this wrong produces a hash that is correct for
BMP ids and silently wrong for anything outside it. `deliberation.py` says the same
thing and has a test for it; the crate needs one too.

## What the crate must not do

| Rule | Source |
| --- | --- |
| Not `#![forbid(unsafe_code)]` violations | ADR 0008 — the crate is `#![forbid(unsafe_code)]` |
| Not be imported by `apps/web` | ADR 0008: "Nothing in `apps/web` imports it" |
| Not be in the Docker image | `Dockerfile` copies only `apps/web/.next/standalone`, `.next/static` and `public` |
| Not pass `clippy` with warnings | `clippy -- -D warnings` is non-negotiable: "a clean build is the contract for a crate whose output is compared byte-for-byte against a baseline" |
| Not use a second fixture set | ADR 0008: "shared, not duplicated" |

## The rot risk, named by the ADR

ADR 0008 is unusually honest about the main failure mode:

> A maintained-unused crate invites rot. Nothing imports it, so nothing fails when it
> drifts from the engine it mirrors — except the parity test, which only checks the
> vectors someone thought to add. Coverage of the parity suite is a discipline, not a
> guarantee.

This is the real risk with the crate as planned, and it is not fixed by CI. The
mitigation is vector coverage: **every exported function in `ethics/axioms.ts` and
`ethics/utilons.ts` needs at least one parity vector, or the crate is testing itself.**
ADR 0008's own list of in-scope surfaces is the checklist.

## Implementing it

If you pick this up, the order that avoids wasted work:

1. `Cargo.toml` at `crates/engine/Cargo.toml`, no dependencies beyond `serde_json` for
   the fixtures. `#![forbid(unsafe_code)]` at the crate root.
2. `src/axiom.rs` — the fixed-order `AXIOM_KEYS` array, `AxiomVector`, `score_option`,
   `weigh_advisor` with `ADVISOR_KINGDOM_BLEND = 0.7`, `deciding_axis`, `distance`,
   `balance`.
3. `src/utilon.rs` — the five functions, with the rounding convention stated in the
   module header.
4. `src/outcome_tree.rs` — the enumeration; it needs no TypeScript counterpart.
5. The shared fixture file, and a TypeScript test in `packages/core` that reads it.
6. `src/lib.rs` or `src/main.rs` re-exporting the three modules — the ADR does not
   specify which, and that is a choice to record.
7. Confirm `bun run crate:engine` and `cargo clippy -- -D warnings` both pass.

Read [`../guides/determinism-and-seeds.md`](../guides/determinism-and-seeds.md)
before step 2. The PRNG port has no shortcuts.

## Related

- [ADR 0008](../adr/0008-rust-reference-engine-parity.md) — the full decision
- [`python-service.md`](python-service.md) — the second implementation, which *is*
  present, and the port-fidelity notes come from it
- [`core-modules.md`](core-modules.md) — the TypeScript functions `axiom.rs` and
  `utilon.rs` mirror
- [`../guides/determinism-and-seeds.md`](../guides/determinism-and-seeds.md) — the
  streams a faithful port has to reproduce
- [`../runbooks/incident-triage.md`](../runbooks/incident-triage.md) — the
  `bun run crate:engine` failure on a clean checkout