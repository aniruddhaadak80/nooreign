# ADR 0003 — No database. Typed offline seed data is the only source of truth

**Status:** Accepted (2026-05)
**Deciders:** core maintainers
**Applies to:** `packages/seed/**`, `.env.example` (`NOOREIGN_SERVICE_URL`), `Dockerfile`, `turbo.json` (`globalEnv`)

---

## Context

Nooreign is, at heart, a **reading** application with one interactive feature. It
has 12 kingdoms, 28 advisors, 32 eras, 20 techniques, 20 dilemmas, 8 experiments,
120 glossary entries and 28 canon texts. That is roughly 250 hand-authored records
of philosophical prose, cross-linked by foreign keys, with editorial claims baked
into the numbers (a landmark's `weight`, a technique's `maturity`, a dilemma's
`severity`).

It also has: a dilemma submission form in the issue tracker, a determinism
guarantee, a CI scale guardrail, a Docker healthcheck, and an explicit promise on
the landing page — *"No API keys, no model calls, no telemetry."*

A database is the default answer to "where does user-submitted content go?", and
it is the wrong answer for four separate reasons.

**1. The data is editorial, not transactional.** These are not records with a
lifecycle; they are arguments. A dilemma's `prompt` is not a row that gets
updated, it is a piece of writing that gets *revised in a pull request* alongside
the axioms that make it adjudicable. Review happens in the diff. A database
would move that review out of the diff and into an admin surface, which is worse
for a philosophical project and worse for reproducibility.

**2. Determinism is the product.** `SEED = 2406` is exported from
`packages/seed/src/index.ts` and every generated artefact is derived from it. If
content lived in a database, "the same court always returns the same verdict"
would become a claim about a point-in-time query, and two readers on the same URL
could see different kingdoms. The reproducibility guarantee would stop being a
property of the code and become a property of a backup schedule.

**3. Zero-credential is a design constraint, not a marketing line.** Adding a
database adds a connection string, a migration runner, a client library, and a
failure mode that shows up as a 500 on a page that should have been a static file.
The Docker healthcheck currently hits `/api/healthz`, which reads `ATLAS_STATS`
straight from the compiled dataset — no I/O, no network, no socket. With a
database, "healthy" would become a statement about a socket.

**4. Someone would have to run it.** The README's promise is that a cold clone is
explorable. "Install Bun, run `bun install`, run `bun dev`" is a two-step
onboarding. "Install Bun, start Postgres, run migrations, seed the database,
then run the app" is six steps, and the first-time visitor does none of them.

The obvious middle ground is a **SQLite file committed to the repository** —
zero-config, file-based, no server. Rejected: it still needs a client and a query
layer in the hot path of every route, it still breaks the "typed at the boundary"
story (a `.db` file is not typed), and it makes every schema change a migration
rather than a type error. TypeScript's `satisfies` plus zod `safeParse` catches a
malformed kingdom at compile time and at import time; SQLite catches it at query
time, in production.

## Decision

**There is no database. Ever, in the default configuration.**

All content is typed TypeScript constants in `packages/seed/src`, validated by
zod at the boundary, with a hand-written referential-integrity check:

```ts
// packages/seed/src/index.ts
export const SEED = 2406;

export function validateSeed(): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  // ... schema.safeParse over every dataset ...
  // ... then foreign keys: advisor.kingdomId, kingdom.advisors[],
  //     dilemma.eraId, technique.requires[], era.techniques[],
  //     glossaryEntry.seeAlso[], kingdom.relations[].to ...
  return issues;
}
```

The datasets are typed as the *parsed* output of their schemas, so a content edit
that violates a constraint is a type error in the editor, a `validateSeed()`
issue in the test suite, and a failed `bun run test` in CI — not a page that
renders empty.

Indexes (`KINGDOMS_BY_ID`, `KINGDOMS_BY_SLUG`, …) are `Map`s built at module
load from the frozen arrays, not queries. Lookup is `getKingdom("kantian-citadel")`
and it is a hash lookup.

Contribution happens in a pull request against `packages/seed/src`, reviewed in
the diff, with `.github/ISSUE_TEMPLATE/dilemma_proposal.yml` as the front door for
proposals that are not ready to be written yet.

`NOOREIGN_SERVICE_URL` in `.env.example` ships **empty**, and the app is fully
functional with it empty. That is the standing test of this ADR: if a feature
needs the service to work, it needs a seed equivalent.

## Consequences

**Positive**

- `git clone && bun install && bun dev`. No migrations, no seeds, no services, no
  credentials, nothing to forget.
- The whole corpus is a compile-time-checked constant. Renaming `kg-citadel` to
  `kantian-citadel` breaks the build at every reference site rather than producing
  a dangling kingdom at runtime.
- `bun run test` in `packages/seed` is a real gate: `chronicle.test.ts` asserts
  referential and ordering invariants a schema alone will not catch.
- A cold `next build` produces a fully static atlas. The Docker image needs no
  volume, no migration step, no init container.
- Every committed SVG figure is regenerable from the seed alone — which is what
  makes `.github/workflows/asset-check.yml` (`bun run assets` then
  `git diff --exit-code`) a meaningful reproducibility check.
- Contributors never need database access, so the contributor pool is not limited
  to people who can run a server.

**Negative**

- **No persistence for user state.** There is no saved council, no saved weight
  vector, no "my positions" profile. Every session starts from the defaults.
  Client-side storage is the only place user state can live, which means it
  cannot be shared or synced.
- **No server-side moderation.** A public submission route would be an abuse
  vector. Dilemmas arrive as issues and land as PRs, which is slower but is also
  the review we want for philosophical content.
- **Content changes require a deploy.** There is no CMS, no admin toggle, no
  "turn the fifth dilemma on for the homepage". Shipping a kingdom is a release.
- **Read amplification at build time.** A very large dataset would make every
  route bundle heavy; the mitigations in play are `generateStaticParams` on every
  dynamic route and `optimizePackageImports`. If the corpus grew by an order of
  magnitude this decision would need revisiting.
- **Team editing does not merge.** Two people writing dilemmas at once conflict in
  one 2,000-line file. `packages/seed/src/dilemmas.ts` is already the largest file
  in the repo and is the first thing that will hurt.

## Alternatives considered

| Option | Why rejected |
| --- | --- |
| **Postgres + Prisma** | Requires a server in development, a connection string, a migration story, and a generator. Breaks the zero-credential promise and turns a static read into a network round-trip on every route. |
| **SQLite file in the repo** | Zero-config, but not typed, and every schema change becomes a migration. Replaces compile-time errors with runtime ones. |
| **JSON files + zod parse at load** | Nearly as good. Rejected because JSON loses the `as const satisfies` narrowing that makes `AXIOM_KEYS` a literal type, and because a typo in a 2,000-line JSON array is a much worse editor experience than a typo in a `.ts` array. |
| **Content in MDX** | Good authoring ergonomics. Rejected because the data is relational: `dilemma.eraId`, `technique.requires[]` and `glossaryEntry.seeAlso[]` need to resolve, and a front-matter graph checked at build time is a worse version of `validateSeed()`. |
| **A hosted content API (e.g. a CMS)** | Removes the review diff, adds a network dependency to a route that should be static, and makes the site unable to render offline. |
