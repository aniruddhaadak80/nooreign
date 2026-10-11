# Performance

What you get: where the time actually goes in this repository, which "slow" symptoms
are not performance problems, and the three changes worth making if one of them is.

---

## First: is it slow, or is it wrong?

**This repository is not supposed to have a performance problem.** Every content route
is statically generated, the dataset is a compile-time constant, and the heaviest
computation is a six-element dot product per advisor per option. Before you optimise
anything, rule out these four:

| Symptom | What it probably is | Go to |
| --- | --- | --- |
| One page is slow, the rest are fine | A client component doing work in a loop | §4 |
| **Everything** got slower at once | A seed edit that raised a record count | §3 |
| The **build** is slow | Static generation of ~200 parameterised routes | §2 |
| Two runs of the same page differ | **Not performance. Determinism.** | §5 |
| The server is slow on `/council` only | It is `force-dynamic` by design | §1 |

---

## 1. Baseline: what "fast" means here

A deliberation is six multiplications per advisor per option, three rounds. For the
default four-advisor panel on a four-option dilemma that is:

- round 1: 4 advisors × 4 options × 6 axes = 96 multiplications
- rounds 2 and 3: comparable, with the scoring already available
- plus a ballot, a super-majority check, a dissent and a synthesis

The total is microseconds. `ADR 0008` says it outright:

> Nooreign's verdict is six multiplications. The TypeScript engine in `packages/core`
> does it in microseconds and will never be the bottleneck.

**So no profiling of the engine is warranted.** If `runCouncil` is slow, something is
wrong with the input, not with the arithmetic. Check:

```bash
# How many advisors and options are you actually seating?
curl -s -X POST http://localhost:3000/api/deliberate \
  -H 'content-type: application/json' \
  -d '{"dilemmaId":"d01","advisorIds":["kant"],"seed":2406}' \
  | jq '{participating, traces: (.traces | length)}'

# 12 advisors is the ceiling the schema allows.
curl -s -X POST http://localhost:3000/api/deliberate \
  -H 'content-type: application/json' \
  -d '{"dilemmaId":"d01","advisorIds":["kant","bentham","bostrom","held","mill","aristotle","rawls","scanlon","mozi","tutu","held","held"],"seed":2406}' \
  | jq '{participating, traces: (.traces | length)}'
```

`conveneRequestSchema` caps `advisorIds` at `.max(12)`. Twelve advisors on a five-option
dilemma is 360 round-1 traces plus rounds 2 and 3. That is the practical ceiling, and
it is small.

### `/council` is the one dynamic route

```tsx
// apps/web/src/app/council/page.tsx
export const dynamic = "force-dynamic";
```

Everything else is statically generated. That is deliberate and correct — the council
page's server render convenes the default court so the client has something to hydrate,
and the client then re-runs it locally as you change the panel and the seed. The
per-request work is one `convene()` on four advisors.

---

## 2. Slow builds

```bash
bun run build        # turbo build
```

Most of the time is `next build` statically generating the parameterised routes:

| Route | Pages |
| --- | --- |
| `/kingdoms/[slug]` | 12 |
| `/court/[slug]` | 28 |
| `/dilemmas/[slug]` | 20 |
| `/chronicle/[slug]` | 32 |
| `/experiments/[slug]` | 8 |
| Section index pages | 8 |
| `/`, `/method`, `/observatory`, `/codex`, `/council` | 5 |
| **Total content pages** | **113** |

100 dynamic pages from those five arrays, plus 10 static content pages (`/`,
`/kingdoms`, `/court`, `/council`, `/dilemmas`, `/chronicle`, `/observatory`,
`/experiments`, `/codex`, `/method`), plus the 3 API routes and `layout` / `not-found` /
`error`. **About 115 routes in total**, not the "~200" that `getting-started.md` and
`playwright.config.ts` round to. The number matters only because it is the build's
dominant cost.

### Why the build is slower on Windows

Not a misconfiguration. `.github/workflows/ci.yml`:

> This repo is developed primarily on Windows, so the Windows leg is not optional: path
> separators, CRLF and the Turbo/Next file watcher all behave differently there.

And `apps/web/next.config.ts` documents the standalone symlink problem:

> Next traces the server bundle by copying `node_modules` entries as symlinks, and
> Windows refuses to create symlinks without Developer Mode or an elevated shell — so
> enabling it unconditionally makes `next build` fail on the platform half this project
> is developed on.

### If the build genuinely regressed

```bash
# 1. Is it turbo's dependency graph, or Next?
bun run build --filter=@repo/web      # scope to the app
# or bypass turbo entirely:
cd apps/web && bunx next build
```

```bash
# 2. Did a record count move?
curl -s http://localhost:3000/api/healthz | jq '.datasets'
# or, without a server:
bun --eval "const {ATLAS_STATS}=await import('./packages/seed/src/index.ts'); console.log(ATLAS_STATS)"
```

```bash
# 3. Did transpilePackages grow?
rg -n 'transpilePackages' apps/web/next.config.ts
```

`transpilePackages` is `["@repo/core", "@repo/i18n", "@repo/sdk", "@repo/seed",
"@repo/ui"]`. Every workspace package ships raw `.ts` and Next compiles it into the app's
own chunks, which is the architecture, not an accident —
[ADR 0001](../adr/0001-turborepo-raw-typescript-packages.md).

---

## 3. Everything got slower at once

Almost always a record count. `ATLAS_STATS` is computed at module load from the array
lengths:

```ts
export const ATLAS_STATS = {
  kingdoms: KINGDOMS.length,
  advisors: ADVISORS.length,
  // …
} as const;
```

`/api/healthz` returns it. Check it against the known baseline:

| Field | Expected |
| --- | --- |
| `kingdoms` | 12 |
| `advisors` | 28 |
| `eras` | 32 |
| `techniques` | 20 |
| `dilemmas` | 20 |
| `experiments` | 8 |
| `glossary` | 120 |
| `texts` | 28 |
| `dimensions` | 6 |

```bash
curl -s http://localhost:3000/api/healthz | jq '.datasets'
```

A dataset that doubled will double the index-build cost, the territory partition, the
corpus size and the number of static routes — all at once.

### Search index growth

`packages/seed/src/generated/corpus.ts` is a generated file, currently ~260 KB of
source. `buildIndex` in `packages/core/src/search/index.ts` tokenises every document at
load. It is built once, in the browser, on `/codex`.

If the corpus has doubled, `/codex` will feel it first, because that is the only page
that pays the whole index cost.

```bash
# Corpus size and document count.
wc -c packages/seed/src/generated/corpus.ts
rg -c '^  \{' packages/seed/src/generated/corpus.ts
```

### Regenerating the corpus

The corpus is generated, not hand-written, and it is what powers codex search:

```bash
bun run generate      # bun scripts/generate.ts
bun run assets
git status
```

---

## 4. One page is slow

Almost always a client component. Three suspects in this repository.

### A sort inside a render

`apps/web/src/app/page.tsx` sorts on the landing page, every render:

```tsx
const highlightEras = [...ERAS]
  .sort((a, b) => {
    const weightA = a.landmarks.reduce((sum, l) => sum + l.weight, 0);
    const weightB = b.landmarks.reduce((sum, l) => sum + l.weight, 0);
    return weightB - weightA || a.startYear - b.startYear;
  })
  .slice(0, 6);

const teaser = DILEMMAS.slice()
  .sort((a, b) => b.aiRelevance - a.aiRelevance)
  .slice(0, 3);
```

`[...ERAS]` and `.slice()` are correct — the source arrays are not mutated, which is the
rule in `chronicle-contract.md`. The landmark reduction is `O(eras × landmarks)` per
render, and `ERAS` is 32. At that size it is free.

**If you ever make this a client component**, memoise it or move it to the server. A
client island that re-sorts on every keystroke is the classic cause of "one page feels
stuck".

### The sweep grid

`POST /api/experiment` with `steps: 60` on a 5-parameter experiment is 60 evaluations,
each with one jitter draw per metric per setting. `sweepGrid` is the two-dimensional
case and is `steps²` — at 60 that is 3,600 evaluations. The route server is the right
place for it (`apps/web/src/lib/sweeps.ts` says exactly why):

> The models live in `@repo/core` next to the tests that pin their monotonicity, and
> shipping a second implementation to the browser would let the chart and the test suite
> disagree without either noticing.

If a grid sweep is slow, lower `steps`. The schema caps it at 60 on purpose.

```bash
curl -s -X POST http://localhost:3000/api/experiment \
  -H 'content-type: application/json' \
  -d '{"experimentId":"x01","key":"supervisionInterval","steps":60,"seed":2406}' \
  | jq '.rows | length'
```

### The chronicle machine

`ChronicleMachine` is the only genuinely interactive component, and it recomputes the
whole stack as you scrub. `stackAtYear(techniques, year)` filters `TECHNIQUES` on every
position — 20 items, trivial. `buildRail(eras)` is memoised on input identity.

If scrubbing stutters, the cause is almost certainly that a memoisation was lost when a
function's input identity stopped being stable — for example if an intermediate array is
rebuilt each frame. `chronicle-contract.md` is explicit that `eraIndex` is "memoised on
input identity", which means **the identity must be preserved**.

---

## 5. Two runs differ

**This is not a performance issue and it is more important than any of the above.**

```bash
a=$(curl -s -X POST http://localhost:3000/api/deliberate -H 'content-type: application/json' \
      -d '{"dilemmaId":"d01","advisorIds":["kant","bentham"],"seed":2406}')
b=$(curl -s -X POST http://localhost:3000/api/deliberate -H 'content-type: application/json' \
      -d '{"dilemmaId":"d01","advisorIds":["kant","bentham"],"seed":2406}')
diff <(echo "$a" | jq -S .) <(echo "$b" | jq -S .) && echo identical || echo DIVERGED
```

If those differ, something outside the seeded streams is feeding the result. The usual
culprits:

| Culprit | Where it would be |
| --- | --- |
| `Math.random()` or `Date.now()` | Anywhere in `packages/core` — forbidden by the module headers |
| An unordered `Object.keys` iteration feeding a sum | Any aggregator |
| `Set` or `Map` iteration order used for output order | Any renderer |
| A sort without a final tie-break | Any ordering |
| `new Date()` in a rendered string | `/api/healthz`'s `timestamp` is the **one** allowed instance |

See [`../guides/determinism-and-seeds.md`](../guides/determinism-and-seeds.md) for every
legitimate stochastic path and
[`../guides/contributing-guide.md`](../guides/contributing-guide.md) for the rule.

---

## 6. Deployed-site performance

### Vercel

| Setting | Value | Note |
| --- | --- | --- |
| `regions` | `["iad1", "bom1"]` | No database to be close to; `bom1` is latency for the reader base |
| `ignoreCommand` | excludes `services/`, `crates/`, `docs/` | Smaller upload |
| `installCommand` | `bun install --frozen-lockfile` | Bun is materially faster than npm here |
| Deploy | `vercel build --prod` then `vercel deploy --prebuilt` | *"the artifact we ship is exactly the artifact we tested"* |

`optimizePackageImports` in `next.config.ts` covers `lucide-react`, `recharts` and
`d3-scale` — tree-shaking the three chart libraries, which is where the client bundle
goes.

### Fly.io

`min_machines_running = 0` and `auto_stop_machines = "stop"`, with the reasoning stated:

> Scale to zero: a philosophical atlas is not a trading desk, and a stopped machine costs
> nothing while the content is fully static.

`shared-cpu-1x`, `512mb`, `1 cpu`. For six multiplications that is generous by two
orders of magnitude. Raising it will not help.

### Docker

The runner is `oven/bun:1-slim` — no toolchain, no workspace sources, no dev
dependencies, only the Next standalone server. Three-stage, so the image carries
neither `next` nor `node_modules` beyond the traced bundle.

If image size matters, check that the `deps` stage's `COPY package.json` list still
covers every workspace package. Bun needs to see every `package.json` in the workspace
to resolve `workspace:*`, so a missing one fails the install rather than producing a
bigger image — which is the better failure.

---

## 7. Measuring

There is no benchmark script in this repository, and adding one would be out of scope —
there is nothing to benchmark. Measure with what is there:

```bash
# Build timing, per package, through turbo.
bun run build -- --timings

# End-to-end, which boots a production build and runs against it.
bun run test:e2e

# Route render time, from the server side.
curl -s -o /dev/null -w '%{time_total}\n' http://localhost:3000/chronicle

# The API, which is where an actual payload exists.
curl -s -o /dev/null -w '%{time_total}\n' -X POST http://localhost:3000/api/deliberate \
  -H 'content-type: application/json' \
  -d '{"dilemmaId":"d01","advisorIds":["kant","bentham","bostrom","held"],"seed":2406}'
```

If you add a benchmark, it belongs in `packages/core/src/**/*.test.ts` as a timing
assertion with a generous bound, or not at all. A flaky performance test in CI costs
more than it saves — and the CI matrix runs the same tests on ubuntu and windows, which
have very different performance characteristics.

---

## What is not worth optimising

| Thing | Why |
| --- | --- |
| `scoreOptionWith` | Six multiplications. It runs in a loop over advisors and options, which is how you notice a bug, not a cost |
| `mulberry32` | Four lines |
| `buildIndex` | Runs once per page load on `/codex`, over ~200 documents |
| `validateSeed()` | Runs on import, in development. The cost is milliseconds and the alternative is a corrupt dataset rendering as an empty page |
| The static generation of 100 routes | It happens once, at build, in CI, on Linux |
| Docker image size | The runner is already minimal; the savings would be in `shared-cpu-1x`, which is free |

**The performance budget in this repository is already spent.** The interesting costs
are editorial — whether the dataset is right, whether a verdict moved, whether an
attribution is defensible. `ADR 0008` rejecting Rust-as-performance is the same
argument in a different form: *do not pay real complexity for a fake problem.*

## Related

- [`../guides/determinism-and-seeds.md`](../guides/determinism-and-seeds.md) — §5 above
  in full; every stochastic path and what must never vary
- [`../guides/deploying.md`](../guides/deploying.md) — the five targets and their
  scaling settings
- [`../api/core-modules.md`](../api/core-modules.md) — what each function costs
- [`incident-triage.md`](incident-triage.md) — if it is an error, not a slowness
- [ADR 0001](../adr/0001-turborepo-raw-typescript-packages.md) — why packages ship
  raw TypeScript, which is the build-time cost
- [ADR 0008](../adr/0008-rust-reference-engine-parity.md) — why the Rust crate is
  explicitly not a speed path