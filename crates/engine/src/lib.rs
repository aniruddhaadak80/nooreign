//! # `nooreign-ethics` — the Rust reference implementation of Nooreign's engine
//!
//! Nooreign is an interactive philosophical atlas of human-vs-supintelligence
//! alignment. Its verdicts are not opinions: they are arithmetic over six moral
//! axes, and this crate is the *reference* implementation of that arithmetic.
//!
//! ## The direction of authority
//!
//! The TypeScript engine lives in `packages/core`. It is the thing that runs in
//! the app. **This crate is what the TypeScript is tested against.** The parity
//! fixture at `fixtures/parity.json` is generated here, and the TS suite asserts
//! that its own `runCouncil`, `scoreOption` and `utilonScale` reproduce every
//! number in it. Neither side is allowed to "improve" a formula, because the
//! other side's fixture would stop being evidence.
//!
//! Where a formula could reasonably be written differently — the direction of a
//! round, the shape of a Gini, whether `Math.round` agrees with `f64::round` —
//! the choice made here is documented at the function that makes it, and the
//! TypeScript source is named. There are no "improvements" in this crate; there
//! are only ports.
//!
//! ## Zero dependencies
//!
//! Not serde, not rand, not anything. The PRNG is a hand-rolled
//! [mulberry32](rng::mulberry32) and the JSON emitter is
//! [150 lines](json). Both exist because a parity fixture is only evidence if
//! every byte of it is accounted for: a third-party float formatter or hash
//! that changed between versions would silently invalidate the comparison.
//!
//! ## What is here
//!
//! | Module | What it is | TypeScript it mirrors |
//! |---|---|---|
//! | [`math`] | `clamp`, `round4`, `dot`, `mean`, `weighted_mean`, `safe_div` | `src/util/math.ts` |
//! | [`rng`] | mulberry32, FNV-1a, keyed streams | `src/util/rng.ts` |
//! | [`axiom`] | `AxiomVector`, `score_option`, `contributions`, `weigh_advisor` | `src/ethics/axioms.ts` |
//! | [`utilon`] | `aggregate`, `stakeholder_total`, `discount`, `fairness_index` | `src/ethics/utilons.ts` |
//! | [`deliberation`] | the three-round council and its audit trail | `src/council/deliberation.ts` |
//! | [`json`] | a minimal JSON value and writer | — (the fixture format) |
//!
//! ## The audit trail is the primary output
//!
//! [`deliberation::run_council`] produces a [`deliberation::TraceEntry`] for
//! every scored move, and each trace carries the six `weight * delta` products
//! that produced its score. Two invariants hold for every trace, to four decimal
//! places, and both are asserted in the unit tests, the integration tests and
//! the fixture:
//!
//! ```text
//! Σ contributions[].product == subtotal
//! total == subtotal + jitter
//! ```
//!
//! The winner is derived *from* those traces, never asserted alongside them.
//! That is what makes "here is why the court ruled as it did" a checkable claim
//! rather than a rhetorical one.
//!
//! ## The experiments package
//!
//! `packages/core/src/experiments/simulator.ts` is **not** ported here. It is
//! presentation over a different set of formulas (dial-driven thought
//! experiments with `JITTER_BOUND = 0.03`), not council deliberation, and it
//! consumes the same [`rng`] primitives if it is ever ported. The parity fixture
//! covers the council path, which is the one that decides verdicts.
//!
//! ## Example
//!
//! ```
//! use nooreign_ethics::axiom::{AxiomVector, contributions, score_option};
//!
//! // Immanuel Kant: rights-led. Sums to exactly 3.05.
//! let kant = AxiomVector([0.2, 0.95, 0.4, 0.35, 0.45, 0.7]);
//! // "Throw the switch": welfare-maximal, rights-poor.
//! let halt = AxiomVector([0.9, 0.2, 0.45, 0.3, 0.3, 0.35]);
//!
//! // 0.2*.9 + 0.95*.2 + 0.4*.45 + 0.35*.3 + 0.45*.3 + 0.7*.35 = 1.035
//! // 1.035 / 3.05 = 0.3393442... -> 0.3393
//! assert_eq!(score_option(&kant, &halt), 0.3393);
//!
//! // ...and the trace shows exactly those six multiplications. Each product is
//! // rounded to 4 dp individually, so the sum matches to the last displayed
//! // digit rather than exactly (1.035 is not representable in binary).
//! let terms = contributions(&kant, &halt);
//! assert_eq!(terms[1].axiom_name(), "rights");
//! assert_eq!(terms[1].product, 0.19);
//! let summed: f64 = terms.iter().map(|c| c.product).sum();
//! assert!((summed - 1.035).abs() < 1e-12);
//! ```

#![forbid(unsafe_code)]
#![warn(missing_docs)]

pub mod axiom;
pub mod deliberation;
pub mod json;
pub mod math;
pub mod rng;
pub mod utilon;
