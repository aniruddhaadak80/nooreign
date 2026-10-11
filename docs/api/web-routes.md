# Web routes

What you get: every route file that exists under `apps/web/src/app`, its params, its
metadata, its data source, and the two Next 15 footguns that break the obvious code.

---

## The footgun, stated once

**In Next 15, `params` and `searchParams` are Promises.**

Every dynamic route in this repo is written like this:

```tsx
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const kingdom = getKingdom(slug);
  if (!kingdom) return { title: "Realm not found" };
  return { title: kingdom.name, description: `…` };
}

export default async function KingdomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const kingdom = getKingdom(slug);
  if (!kingdom) notFound();
  // …
}
```

Writing `{ params: { slug: string } }` — the Next 14 shape — type-checks in neither
version but *silently* gives you a Promise object where you expected a plain object,
so `params.slug` is `undefined`, `getKingdom(undefined)` returns `undefined`, and the
page renders `not-found` for every slug in the dataset. There is no error. That is
why every dynamic route here is `async` and every one `await`s before reading.

The same applies to `searchParams` if you add one. `/council` currently reads its
dilemma on the client; `not-found.tsx` and `error.tsx` take no params at all.

See [ADR 0005](../adr/0005-nextjs-15-not-16.md) for why the project is on 15.

## The second footgun: `generateStaticParams` is the route manifest

There is no database and no request-time data fetch. **Every content route is
statically generated at build time**, and `generateStaticParams()` is the list of
paths that will exist. Add a record to `packages/seed/src/` and forget to return it
from `generateStaticParams` and the page 404s on that record while the index page
links to it.

## Full route inventory

23 files under `apps/web/src/app/`: **15 content routes**, 3 API routes, 4 special
files (`layout.tsx`, `not-found.tsx`, `error.tsx`, `globals.css`) and `favicon.ico`.

---

### `/` — `app/page.tsx`

| | |
| --- | --- |
| Type | Server component, synchronous |
| Params | none |
| `generateStaticParams` | none |
| `export const dynamic` | not set (default) |
| Data source | `ATLAS_STATS`, `DILEMMAS`, `ERAS`, `KINGDOMS`, `getKingdom` from `@repo/seed` |
| Components | `AtlasPlate`, `DilemmaTeaser`, `EraRailPreview` from `@/components/atlas/` |
| Metadata | none exported — inherits the root layout's default title |

Sorting happens inline in the component: eras are ranked by summed `landmarks[].weight`
descending then `startYear` ascending, top 6; dilemmas are ranked by `aiRelevance`
descending, top 3. Both tie-breaks are explicit because both arrays are re-sorted
per render.

---

### `/kingdoms` — `app/kingdoms/page.tsx`

| | |
| --- | --- |
| Params | none |
| `export const metadata` | `title: "The Kingdoms"` |
| Data source | `KINGDOMS` |
| Component | `KingdomGrid` from `@/components/atlas/kingdom-grid` |

---

### `/kingdoms/[slug]` — `app/kingdoms/[slug]/page.tsx`

| | |
| --- | --- |
| Params | `slug` — `kingdom.slug` |
| `generateStaticParams` | `KINGDOMS.map(k => ({ slug: k.slug }))` |
| `export const metadata` | Dynamic, via `generateMetadata` |
| Data source | `getKingdom(slug)`, `advisorsOfKingdom`, `textsOfKingdom`, `dilemmasOfKingdom` |
| Components | `AxiomRadar`, `KingdomCrest`, `RelationList`, `VerdictBadge` |
| Failure path | `notFound()` when `getKingdom` returns `undefined` |

Title is `kingdom.name`. Description is
`` `${kingdom.name} — ${kingdom.motto} Founded ${founded} by ${kingdom.founder}. ${kingdom.aiStance.headline}` ``
where `founded` is `Math.abs(kingdom.founded) + " BCE"` when negative.

`getKingdom` accepts **either an id or a slug** — `packages/seed/src/index.ts`
resolves `KINGDOMS_BY_ID.get(x) ?? KINGDOMS_BY_SLUG.get(x)`. That holds for every
`get*` helper: `getAdvisor`, `getEra`, `getTechnique`, `getDilemma`, `getExperiment`,
`getText`.

---

### `/court` — `app/court/page.tsx`

| | |
| --- | --- |
| Params | none |
| `export const metadata` | `title: "The Court"` |
| Data source | `ADVISORS`, `KINGDOMS`, `getKingdom` |
| Shape | Groups `ADVISORS` by `advisor.kingdomId` under each kingdom heading; kingdoms with no advisors render nothing |

---

### `/court/[slug]` — `app/court/[slug]/page.tsx`

| | |
| --- | --- |
| Params | `slug` — `advisor.slug` |
| `generateStaticParams` | `ADVISORS.map(a => ({ slug: a.slug }))` |
| Data source | `getAdvisor(slug)`, `getKingdom(advisor.kingdomId)` |
| Components | `AxiomRadar`, `VerdictBadge` |

Renders all of `advisor.moves`, each coloured by `kind` through a local
`MOVE_KIND_STYLES` record: `premise` → indigo, `objection` → crimson, `appeal` →
verdigris, `synthesis` → gold.

---

### `/council` — `app/council/page.tsx`

| | |
| --- | --- |
| Params | none |
| `export const dynamic` | **`"force-dynamic"`** |
| `export const metadata` | `title: "Council chamber"` |
| Data source | `DILEMMAS`, `ADVISORS`, `KINGDOMS`, `SEED`, and `convene()` + `defaultPanelFor()` from `@/lib/convene` |
| Component | `CouncilChamber` from `@/components/council/council-chamber` |

**This is the only route with `force-dynamic`.** Everything else is statically
generated; this one is server-rendered per request because the reader controls the
panel and the seed from the client and the chamber posts to `/api/deliberate`.

The server render seats the default court for `DILEMMAS[0]` at `seed: SEED`, then
hands `CouncilChamber` the props it needs: the dilemma list trimmed to
`{id, slug, title, kingdomOrigin}`, and the advisor list trimmed to
`{id, name, kingdomId, kingdomName, glyph}`.

`defaultPanelFor(dilemmaId)` (`apps/web/src/lib/convene.ts`) takes the first advisor
from each distinct kingdom until it has four, then **replaces the last seat** with an
advisor from `dilemma.kingdomOrigin` if that kingdom was not already represented. The
reason is in the source: *"its origin tradition has the strongest claim to be heard on
it."*

---

### `/dilemmas` — `app/dilemmas/page.tsx`

| | |
| --- | --- |
| Params | none |
| `export const metadata` | `title: "Dilemmas"` |
| Data source | `DILEMMAS`, `getKingdom` |
| Shape | Sorted by `aiRelevance` descending; a tag chip row built from `new Set(DILEMMAS.flatMap(d => d.tags))` sorted alphabetically |

---

### `/dilemmas/[slug]` — `app/dilemmas/[slug]/page.tsx`

| | |
| --- | --- |
| Params | `slug` — `dilemma.slug` |
| `generateStaticParams` | `DILEMMAS.map(d => ({ slug: d.slug }))` |
| Data source | `getDilemma(slug)`, `getKingdom`, `getEra`, `ADVISORS`, and `convene()` at **`seed: 2406` literal** |
| Notable | Calls `convene()` at module render and renders the verdict inline |

The `seed: 2406` is a **hard-coded literal**, not `SEED`. It appears because the
verdict block on this page is meant to be the canonical, citable one — and
`packages/seed/src/index.ts` exports `SEED = 2406`, so the two agree today. If you
change one, change both, and see
[`runbooks/verdict-regression.md`](../runbooks/verdict-regression.md).

The page renders the closing line *"A verdict is a fact about the court, not about the
world."* under the ballot table. That sentence is the single most important string in
the application.

---

### `/chronicle` — `app/chronicle/page.tsx`

| | |
| --- | --- |
| Params | none |
| `export const metadata` | `title: "Chronicle — how we aligned"` |
| Data source | `CHRONICLE_SPAN`, `ERAS`, `TECHNIQUES`, and `sortEras` from `@repo/core` |
| Components | `ChronicleMachine`, `formatSpan`, `formatYear` |

This is the only route that calls into `@repo/core` at the top level. `sortEras`
orders chronologically by `startYear`, stable and non-mutating
(`packages/core/src/chronicle/timeline.ts` via `chronicle-contract.md`).

---

### `/chronicle/[slug]` — `app/chronicle/[slug]/page.tsx`

| | |
| --- | --- |
| Params | `slug` — `era.slug` |
| `generateStaticParams` | `ERAS.map(e => ({ slug: e.slug }))` |
| Data source | `getEra(slug)`, `getAdvisor`, `getKingdom`, `getTechnique`, `techniquesAtEndOfEra(era)` |

Title is `` `${era.title} (${formatSpan(era.startYear, era.endYear)})` ``. Description
is `era.summary.slice(0, 180)`.

Note `techniquesAtEndOfEra` filters on `technique.introduced <= era.endYear`, not on
the curated `era.techniques` array. That is deliberate: `chronicle-contract.md` says
`progressOf` is "date-driven, not list-driven" because *`introduced` is a fact and the
curated list is an editorial claim*.

---

### `/observatory` — `app/observatory/page.tsx`

| | |
| --- | --- |
| Params | none |
| `export const metadata` | `title: "Alignment observatory"` |
| Data source | `TECHNIQUES`, `AXIOM_KEYS` from `@repo/seed` |
| Local logic | `buildTowers()`, `COST_WEIGHT`, `uncovered`, `dangling` — all defined in the file |

**This route does not use `@repo/core`.** It re-implements `towerView`, the coverage
computation and the dependency check inline, against a local
`COST_WEIGHT = { low: 1, medium: 2, high: 3, extreme: 4 }`. Meanwhile
`packages/core/src/observatory/maturity.ts` exports `towerView`, `coverageMatrix`,
`gapAnalysis` and `dependencyHealth` with the same purpose and a documented
`COST_SCALE`.

**This is a known duplication.** The page was written before the module existed and
was not migrated. Two places to change if `COST_SCALE` ever changes. The page's
coverage cell opacity formula (`0.2 + maturity * 0.6`) also differs from
`coverageMatrix`'s mean `maturity × adoption`. Treat the module as canonical.

---

### `/experiments` — `app/experiments/page.tsx`

| | |
| --- | --- |
| Params | none |
| `export const metadata` | `title: "Thought experiments"` |
| Data source | `EXPERIMENTS` |
| Shape | Cards with `model`, signed `year`, `question`, and a chip per `parameters[].label` |

---

### `/experiments/[slug]` — `app/experiments/[slug]/page.tsx`

| | |
| --- | --- |
| Params | `slug` — `experiment.slug` |
| `generateStaticParams` | `EXPERIMENTS.map(e => ({ slug: e.slug }))` |
| Data source | `getExperiment(slug)` |
| Component | `ExperimentBench` from `@/components/experiments/experiment-bench` |

`ExperimentBench` is a client component; it calls `POST /api/experiment` for sweeps.
Description is `experiment.question` (uncapped, unlike the chronicle page).

---

### `/codex` — `app/codex/page.tsx`

| | |
| --- | --- |
| Params | none |
| `export const metadata` | `title: "Codex"` |
| Data source | `GLOSSARY`, `TEXTS` |
| Component | `CodexBrowser` from `@/components/codex/codex-browser` |

`CodexBrowser` builds the search index over the generated corpus from
`packages/seed/src/generated/corpus.ts` using `buildIndex` / `query` / `suggest` from
`@repo/core`. See [`core-modules.md`](core-modules.md) § search.

---

### `/method` — `app/method/page.tsx`

| | |
| --- | --- |
| Params | none |
| `export const metadata` | `title: "Method"` |
| Data source | `ATLAS_STATS`, `AXIOM_KEYS`, `DIMENSION_META`, `SEED` |

Fully static prose plus four code blocks. It renders the score formula as a literal
string:

```
jitter = seeded(seed, a.id, o.id) * 0.05    # ± 0.05, decorrelated streams
total  = round(subtotal + jitter, 4)
```

That matches `JITTER = 0.05` in `packages/core/src/council/deliberation.ts`. **If you
change `JITTER`, this page lies**, and nothing will tell you. Add it to
[`runbooks/verdict-regression.md`](../runbooks/verdict-regression.md).

---

### `app/layout.tsx`

| | |
| --- | --- |
| Exports | `metadata`, `viewport`, default `RootLayout` |
| Fonts | `Cinzel` (serif), `Inter` (body), `JetBrains_Mono` (mono), all `next/font/google`, all `display: "swap"` |
| Chrome | `AppHeader`, `AppFooter` from `@/components/shell`, navigated by `NAV_SECTIONS` |
| `metadataBase` | `https://nooreign.vercel.app` |
| Title template | `"%s · Nooreign"` |
| `viewport` | `themeColor: "#070b18"`, `colorScheme: "dark"` |

---

### `app/not-found.tsx`

Renders for any unmatched path *and* for every `notFound()` call in a dynamic route.
Three links out: `/kingdoms`, `/council`, `/`.

### `app/error.tsx`

Client component (`"use client"`). Receives `{ error, reset }`. Logs via
`console.error("[nooreign] unhandled route error", error)` in a `useEffect` — kept to
`console.error` deliberately so no error-reporting dependency ships to the browser.
Renders `error.digest` when present. **Its copy states the diagnosis directly:**

> The atlas itself is deterministic, so this is a bug rather than a moral uncertainty.

If you ever see this page in production, it is a bug. Go to
[`runbooks/incident-triage.md`](../runbooks/incident-triage.md).

### `app/globals.css`

Tailwind v4 entry. Theme tokens are defined here, not in `tailwind.config` — see
[ADR 0006](../adr/0006-tailwind-v4-theme-tokens.md).

---

## API routes

Three, all under `app/api/`. Full request and response shapes are in
[`rest-api.md`](rest-api.md).

| Route | Methods | Body schema | Source |
| --- | --- | --- | --- |
| `/api/healthz` | `GET` | none | inline; returns `ATLAS_STATS` |
| `/api/deliberate` | `POST`, `GET` | `conveneRequestSchema` | `@/lib/convene` |
| `/api/experiment` | `POST`, `GET` | `sweepRequestSchema` | `@/lib/sweeps` |

Both `GET` handlers return a self-describing contract document rather than 405, so the
endpoints are discoverable from the browser without the docs site.

### One bug to know about

Both `GET` self-descriptions contain example ids that **do not exist**:

| Endpoint | Its `GET` says | The real ids |
| --- | --- | --- |
| `/api/deliberate` | `dilemmaId: "d01-paperclip-maximiser"` | `d01` (slug: `paperclip-maximiser`) |
| `/api/experiment` | `experimentId: "x01-paperclip-sweep"` | `x01` (slug: `paperclip-sweep`) |

`getDilemma("d01-paperclip-maximiser")` resolves neither the id map nor the slug map
and returns `undefined`, so copying the example verbatim yields `404 {"error": …}`.
The slugs *do* work — `paperclip-maximiser` and `paperclip-sweep` both resolve.
See [`rest-api.md`](rest-api.md) for corrected examples and
[`runbooks/incident-triage.md`](../runbooks/incident-triage.md) for the fix.

---

## Route coverage against the rest of the app

| Thing | Where it lives | Route |
| --- | --- | --- |
| Command palette | `@/components/shell` | all |
| Council chamber controls | `@/components/council/council-chamber` | `/council` |
| Sweep charts | `@/components/experiments/experiment-bench` | `/experiments/[slug]` |
| Codex search UI | `@/components/codex/codex-browser` | `/codex` |
| Language switcher | `packages/i18n` | all |
| Sitemap / robots | `robots: { index: true, follow: true }` in `layout.tsx` | — |
| `/glossary`, `/about`, `/roadmap` | **not present** in `apps/web/src/app` | — |

The last row is real: `docs/diagrams/roadmap.mmd` exists and `getting-started.md`
says "routes marked *planned* in the roadmap are not yet present in
`apps/web/src/app`". That sentence is accurate.

## Adding a route

| Step | Where |
| --- | --- |
| 1 | `apps/web/src/app/<section>/[slug]/page.tsx` |
| 2 | Add to `NAV_SECTIONS` in `apps/web/src/lib/navigation.ts` if it is a top-level section |
| 3 | `generateStaticParams()` from the seed array — **do not skip this** |
| 4 | `generateMetadata` with `params: Promise<{ slug: string }>` |
| 5 | `bun run typecheck && bun run test && bun run build` |

## Related

- [`rest-api.md`](rest-api.md) — the three API routes in full
- [`core-modules.md`](core-modules.md) — what `@repo/core` gives each route
- [`guides/architecture.md`](../guides/architecture.md) — the request flow
- [ADR 0005](../adr/0005-nextjs-15-not-16.md) — why params are Promises