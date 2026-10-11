# Architecture

What you get: the package graph, the data flow from a URL to a verdict, the boundaries between packages, and where to put new code.

---

## The one-paragraph version

`packages/seed` is a typed constant. `packages/core` is a set of pure functions over
that constant. `apps/web` is the only place that renders. `packages/ui` is the only
place that draws. `packages/sdk` is the only place that talks to a service.
`services/agents` and `crates/engine` are both optional at runtime and both mirror
contracts rather than extend them.

## Package graph

```
apps/web ──> packages/core ──> packages/seed
    │             │                  ▲
    ├──> packages/ui ─────────────────┘
    ├──> packages/i18n
    └──> packages/sdk ──> (HTTP) ──> services/agents   [optional]

crates/engine ─── parity fixtures ─── packages/core      [optional]
packages/config ── tsconfig.base.json ──> everything
```

No arrow points back up. `packages/seed` imports only `zod`. `packages/core` imports
`@repo/seed` and `zod`. `packages/ui` imports `@repo/core` and `@repo/seed` for
types. `apps/web` imports everything.

### The dependency rules, stated

| Package | May import | May not |
| --- | --- | --- |
| `@repo/seed` | `zod` | anything else in the workspace |
| `@repo/core` | `@repo/seed`, `zod` | React, `next`, anything in `apps/` |
| `@repo/ui` | `@repo/core`, `@repo/seed`, React, `d3-scale` | anything in `apps/` |
| `@repo/sdk` | `@repo/core`, `@repo/seed` | `next`, `fetch` at import time |
| `@repo/web` | all of the above | — |

`@repo/core` importing React would be the single most damaging change anyone could
make to this repo, because it would put a component framework into a package that
has to run in a test runner, a Python-mirroring contract and a Rust parity test.
The dependency direction is the architecture.

## How packages ship source, not `dist`

Every workspace package points `main`, `types` and `exports` at its `.ts` source:

```json
// packages/core/package.json
{
  "name": "@repo/core",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --max-warnings=0",
    "test": "vitest run"
  },
  "dependencies": { "@repo/seed": "workspace:*", "zod": "^3.24.0" }
}
```

and `apps/web/next.config.ts` tells Next to compile those sources itself:

```ts
transpilePackages: ["@repo/core", "@repo/i18n", "@repo/sdk", "@repo/seed", "@repo/ui"],
```

with `output: "standalone"` so the Docker runner needs no `node` and no `next` CLI.
Full reasoning in [ADR 0001](../adr/0001-turborepo-raw-typescript-packages.md).

## Strictness is the type boundary

Since there is no build step, `packages/config/tsconfig.base.json` is what stands
between a package's internals and its consumers:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,   // xs[0] is T | undefined
    "exactOptionalPropertyTypes": true, // { a?: x } is not { a: x | undefined }
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,       // type imports must say `import type`
    "isolatedModules": true,
    "noEmit": true
  }
}
```

`noUncheckedIndexedAccess` is the one that shows up most in review. It is why
`ranked[0]?.optionId ?? dilemma.options[0]?.id ?? ""` appears in
`packages/core/src/council/deliberation.ts` rather than `ranked[0].optionId`. It is
not defensive noise; it is the compiler telling you the array might be empty.

## Request flow

```
browser
  └─> Next.js RSC route (apps/web/src/app/[section]/[slug]/page.tsx)
        ├─> generateStaticParams() from KINGDOMS.map(k => ({ slug: k.slug }))
        ├─> getKingdom(slug)              — a Map lookup, not a query
        └─> @repo/core                   — pure functions, no I/O
              └─> rendered trace + narrative
```

Dynamic routes are server components with `params` as a `Promise`:

```tsx
export function generateStaticParams() {
  return KINGDOMS.map((kingdom) => ({ slug: kingdom.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const kingdom = getKingdom(slug);
  if (!kingdom) return { title: "Realm not found" };
  return { title: kingdom.name, description: `${kingdom.name} — ${kingdom.motto} …` };
}

export default async function KingdomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const kingdom = getKingdom(slug);
  if (!kingdom) notFound();
  // …
}
```

Because there is no database and no request-time data fetch, **every content route is
statically generated**. `notFound()` is the only failure path.

## The core package, module by module

| Module | Responsibility |
| --- | --- |
| `ethics/axioms.ts` | The six-axis calculus: `scoreOptionWith`, `weighAdvisor`, `contributions`, `decidingAxis`, `distance`, `balance`, `rankAxes` |
| `ethics/utilons.ts` | Stakeholder-weighted currency: `aggregate`, `stakeholderTotal`, `fairnessIndex`, `utilonScale`, `moralStatusRisk`, `discount` |
| `council/deliberation.ts` | `runCouncil` (rounds 1–3), `compareCouncils`, `courtVector`, `courtSpread`, `JITTER` |
| `council/consensus.ts` | `decision`, `weightedBallot`, `superMajority`, `minorityReport`, `synthesis`, `CLOSE_MARGIN` |
| `council/argument-graph.ts` | `buildGraph`, `topologicalOrder`, `inheritedWeight`, `isWellFormed`, `toMermaid`, `INHERITANCE` |
| `council/voices.ts` | Deterministic speech assembly from stored text — no generation |
| `dilemmas/analysis.ts` | `analyseDilemma`, `optionReport`, `pivotAxis`, `courtReading`, `cautiousValue` |
| `chronicle/timeline.ts` | `sortEras`, `eraIndex`, `buildRail`, `yearToPosition`, `positionToYear`, `progressOf`, `diffEras`, `milestonesFor`, `highlightEras` |
| `kingdoms/graph.ts` | `relationGraph`, `centrality`, `allies`, `rivals`, `tributaries`, `successors`, `territoryBounds`, `distantPairs` |
| `observatory/maturity.ts` | `towerView`, `coverageMatrix`, `gapAnalysis`, `readinessScore`, `dependencyHealth`, `costBenefit` |
| `experiments/simulator.ts` | Eight scorers, `runExperiment`, `sweep`, `sweepGrid`, `phaseOf`, `JITTER_BOUND` |
| `search/index.ts` | `buildIndex`, `query`, `parseQuery`, `buildSnippet`, `suggest` |
| `journal/prompts.ts` | `reflectivePrompts`, `promptsForAxiom`, `closingRitual` |
| `util/math.ts` | `clamp`, `round`, `sum`, `mean`, `dot`, `cosineSimilarity`, `normalize`, `softmax`, `safeDiv`, `range`, `movingAverage` |
| `util/rng.ts` | `mulberry32`, `hashString` (FNV-1a), `createRng`, `Rng` |
| `util/result.ts` | `ok`, `err`, `isOk`, `isErr`, `unwrap`, `mapResult`, `collectResults`, `partitionResults`, `andThen` |

Full export lists per module are in [`docs/api/core-modules.md`](../api/core-modules.md).

### Why `Result` and not exceptions

`packages/core/src/util/result.ts` says it directly: the deliberation engine has
exactly one failure mode that is *expected* rather than exceptional — a malformed
move, a dangling target, an empty option list. Throwing buries that in a stack;
returning `null` erases the reason. `Result` keeps both the value and the sentence
explaining why there isn't one, with no `any` and no exceptions.

```ts
export function collectResults<T, E>(results: readonly Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];
  for (const result of results) {
    if (isErr(result)) return result;   // first error in ARGUMENT order wins
    values.push(result.value);
  }
  return ok(values);
}
```

"First in argument order, not whichever settled first" is the whole point: the
reported failure must be a deterministic function of the inputs.

## The seed package

`packages/seed/src/types.ts` is the single source of truth. Every schema is a zod
object; every dataset is typed as the parsed output. Datasets:

| File | Records |
| --- | --- |
| `kingdoms.ts` | 12 realms |
| `advisors.ts` | 28 advisors (4+ argument moves each) |
| `eras.ts` | 32 eras, `-470` to `2026` |
| `techniques.ts` | 20 techniques in 6 towers |
| `dilemmas.ts` | 20 dilemmas, 2–5 options each |
| `experiments.ts` | 8 experiments, one per `EXPERIMENT_MODEL` |
| `glossary.ts` | 120 terms |
| `texts.ts` | 28 canon texts |

`packages/seed/src/index.ts` exports the lookups and the integrity check:

```ts
export const SEED = 2406;

export function validateSeed(): IntegrityIssue[] { /* schema + foreign keys */ }
```

Design rationale in [ADR 0003](../adr/0003-no-database-typed-seed-data.md);
year handling in [ADR 0010](../adr/0010-bce-year-integer-convention.md).

## Where new code goes

| You are adding… | Put it in | And update |
| --- | --- | --- |
| A realm / thinker / case / technique / term / text | `packages/seed/src/<file>.ts` | `docs/guides/adding-a-*.md` |
| A new scoring formula | `packages/core/src/ethics/` | its test file, and the Rust parity vectors |
| A new deliberation round | `packages/core/src/council/deliberation.ts` | the state machine doc, and `ADR` if the contract changes |
| A new consensus rule | `packages/core/src/council/consensus.ts` | `packages/core/src/council/*.test.ts` |
| A new axis | `packages/seed/src/types.ts` `AXIOM_KEYS` | **everything**: seed data, Python contracts, Rust crate, tie-breaks, SVGs, palette. Needs a new ADR. |
| A component | `packages/ui/src/components/` | `apps/web` import |
| A route | `apps/web/src/app/<section>/[slug]/page.tsx` | `apps/web/src/lib/navigation.ts` if it is a top-level section |
| A wire type | `services/agents/app/models.py` | `packages/sdk`, and the OpenAPI document |
| A text or technique over HTTP | `packages/sdk/src/` | `packages/sdk/openapi.json` |

## Cross-runtime contracts

Three runtimes agree on the same wire shape, and each declares it independently:

| Runtime | Declaration | Ordering contract |
| --- | --- | --- |
| TypeScript | `packages/seed/src/types.ts` | `export const AXIOM_KEYS = [...] as const` |
| Python | `services/agents/app/models.py` | `AXIOM_KEYS: tuple[AxiomKey, ...] = (...)` |
| Rust | `crates/engine/src/axiom.rs` | a fixed-order array constant |

`models.py` states why it exists:

> The web app, the Rust reference implementation and this service all have to agree
> on the same six axes, the same four move kinds and the same trace shape, and the
> cheapest way to guarantee that is a single declarative source that a validator, an
> OpenAPI document and a test all read from.

And why the wire format is camelCase:

> `JSON.parse` in the browser and `JSON.stringify` in the TS engine both speak
> camelCase, so a service that emitted `agent_harm` would force every consumer to
> write a translation layer.

Field names are `snake_case` in Python (`axis_gap`, `agent_harm`) and camelCase on
the wire (`axisGap`, `agentHarm`), via
`ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")`.

## Diagrams

- [System architecture](../diagrams/system-architecture.mmd)
- [Request flow](../diagrams/request-flow.mmd)
- [Domain model](../diagrams/domain-model.mmd)
- [Deliberation loop](../diagrams/deliberation-loop.mmd)
- [Council round trace](../diagrams/council-round-trace.mmd)
- [Alignment stack](../diagrams/alignment-stack.mmd)
- [Kingdom relations](../diagrams/kingdom-relations.mmd)
- [Deploy pipeline](../diagrams/deploy-pipeline.mmd)
