# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The **Verdict** column matters: because every deliberation is a pure function of
`(seed, dilemmaId, optionId)`, some changes are *breaking* in the ordinary sense
even when no API changed. A verdict change is called out explicitly.

## [Unreleased]

Nothing yet.

## [0.1.0] — 2026

The first release of the Nooreign atlas. This is an **alpha**: a complete,
navigable front-end over a deterministic deliberation engine, not a finished
philosophical work and not a product.

### Added

#### The engine (`packages/core`)

- **Six-axis moral calculus** — every actor is a vector over `welfare`, `rights`,
  `virtue`, `care`, `justice`, `agency`; every option is a vector of how much of
  each it honours. Scores are normalised inner products.
- **Deliberation council** — advisors deliberate, arguments are composed and
  graphed, and a verdict is produced from the ballot rather than authored.
- **Deterministic RNG** — `createRng(seed, "r1", advisorId, optionId)` yields the
  same stream every time. Every rendered verdict is reproducible from the seed.
- **Verdict pipeline** — consensus, argument graph, tie-breaking, and maturity.
- **Search index** and **chronicle timeline** over the eras.
- **Experiments simulator** and utility types (`Result`, vector maths, RNG).

#### The atlas (`packages/seed`)

- **12 kingdoms**, each a school of thought rendered as a place on the atlas
  plane — with terrain, crest, motto, capital, landmarks, axioms, temperament
  and relations to its neighbours.
- **28 advisors**, one per historical figure, each carrying their own moral
  weights and temperament.
- **20 dilemmas** — hard cases with no clean answer, each with 2–5 options, six
  -axis option deltas, stakeholders, a lesson and canon references.
- **32 eras**, **20 techniques**, **28 canon texts**, **120 glossary entries**, and
  **8 experiments**.
- Zod validation of every record, plus integrity checks (`validateSeed()`).

#### The application (`apps/web`, `packages/ui`, `packages/i18n`, `packages/sdk`)

- Next.js 15 App Router site, React 19, TypeScript strict, Tailwind v4.
- A component library (`packages/ui`) and generated SVG artwork — crests,
  portraits, terrain — all reproducible from seed 2406.
- Optional Python deliberation service (`services/agents`) and a Rust reference
  engine (`crates/engine`).

#### Project infrastructure

- Monorepo CI across Linux and Windows: typecheck, lint, test, build, e2e, a
  scale guardrail, Python and Rust jobs, and a secrets scan.
- CodeQL for TypeScript and Python; Dependabot for npm, Actions and Docker.
- Docker (multi-stage Bun → Next.js standalone), plus Vercel, Fly, Render and
  Railway deployment configs.

### What this release is not

Stated plainly, because the name invites the wrong expectation:

- **It is not a moral authority.** Nooreign models competing traditions and makes
  their disagreements legible. It does not adjudicate them, and a verdict is an
  output of arithmetic over authored weights — the weights encode a point of
  view, and reasonable people weigh them differently.
- **It is not trained on or connected to any model.** There is no inference, no
  API call, no model weights. The advisors are rule-based agents over vectors.
- **It is not scientifically validated.** The deliberation model is a deliberate
  simplification, chosen for transparency and determinism, not for empirical
  fidelity to how any group actually reasons.
- **It is not complete.** The atlas ships with twelve kingdoms of a possible
  many; dilemmas are the most actively expanded part.

[Unreleased]: https://github.com/aniruddhaadak80/nooreign/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/aniruddhaadak80/nooreign/releases/tag/v0.1.0