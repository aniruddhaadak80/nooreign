# Getting started

What you get: a working Nooreign dev server on a cold clone, the command map for the whole repo, and the four commands that matter.

---

## Prerequisites

| Tool | Version | Why |
| --- | --- | --- |
| [Bun](https://bun.sh) | `1.3.14` (pinned by `packageManager`) | The workspace package manager, the script runner, and the test runner. `package.json` declares `"packageManager": "bun@1.3.14"`. |
| Node.js | `>=20.11.0` (declared in `engines`) | Next.js runs on Node even when Bun installs the dependencies. |
| Git | any recent | Workspaces, seed history and `git bisect` are all load-bearing here. |

**No database. No Docker. No API key. No Python. No Rust toolchain.** Four of the
six optional runtimes are genuinely optional — see
[ADR 0009](../adr/0009-optional-python-agents-service.md) and
[ADR 0008](../adr/0008-rust-reference-engine-parity.md).

## 1. Clone and install

```bash
git clone https://github.com/anomalyco/nooreign.git
cd nooreign
bun install
```

`bun install` reads the `workspaces` globs at the root of `package.json`:

```json
"workspaces": ["apps/*", "packages/*"]
```

so it links `apps/web` and every directory under `packages/`.

## 2. Run the development server

```bash
bun run dev
```

This is `turbo dev`, which runs `dev` in every package that defines it. In practice
that is `apps/web`:

```json
"dev": "next dev --turbopack"
```

Open <http://localhost:3000>. The landing page renders entirely from the compiled
seed data — no request leaves the process.

## 3. The four checks

```bash
bun run typecheck   # turbo typecheck -> tsc --noEmit, per package
bun run lint        # turbo lint -> next lint --max-warnings=0 / eslint src
bun run test        # turbo test -> vitest run, per package
bun run build       # turbo build -> next build
```

`bun run verify` chains all four in that order:

```json
"verify": "bun run typecheck && bun run lint && bun run test && bun run build"
```

Run `bun run verify` before you open a PR. CI runs the same four.

Watch tests directly (bypassing turbo):

```bash
bun run test:watch
```

## 4. Optional: the other runtimes

Only if you are touching them.

```bash
# Python deliberation service (FastAPI) — optional at runtime
bun run service:agents      # python -m uvicorn services.agents.app.main:app --reload --port 8080

# Rust reference crate — parity tests only, never imported by the app
bun run crate:engine        # cargo test --manifest-path crates/engine/Cargo.toml
```

Both are empty-by-default in `.env.example`:

```bash
NOOREIGN_SERVICE_URL=            # left empty on purpose
NEXT_PUBLIC_NOOREIGN_SERVICE_URL=
```

## 5. Regenerating committed assets

Every SVG and every generated diagram in this repo is derived from seed `2406` and
is checked in. If you change the dataset, regenerate:

```bash
bun run assets     # scripts/gen-assets.mjs
bun run diagrams   # scripts/gen-diagrams.mjs
bun run loc        # scripts/loc-count.mjs — also the CI scale guardrail
```

CI enforces this: `.github/workflows/asset-check.yml` regenerates and fails on any
diff.

## Repository layout

```
nooreign/
├── apps/
│   └── web/                    Next.js 15 App Router, RSC, Tailwind v4
│       ├── src/app/            the route tree
│       ├── src/components/     atlas / chronicle / shell components
│       ├── src/lib/            navigation.ts and route helpers
│       ├── next.config.ts      transpilePackages, standalone output, headers
│       └── public/images/      generated SVG, banner/logo/og/screens
├── packages/
│   ├── config/                 tsconfig.base.json (shared strictness)
│   ├── seed/                   zod schemas + all 250 typed records
│   ├── core/                   ethics, council, chronicle, observatory, experiments
│   ├── ui/                     design system: components, palette, SVG generators
│   ├── i18n/                   translation keys
│   └── sdk/                    typed clients for the web and Python APIs
├── services/agents/            optional FastAPI service (pydantic contracts)
├── crates/engine/              Rust reference implementation for parity
├── scripts/                    gen-assets, gen-diagrams, loc-count
├── docs/                       the documentation set you are reading
├── turbo.json                  task graph and globalEnv
└── Dockerfile                  3-stage build -> Next standalone runner
```

## The route tree

| Route | What it is |
| --- | --- |
| `/` | Landing page: the atlas plate, the stats, six capability links |
| `/kingdoms`, `/kingdoms/[slug]` | The twelve realms and one realm's doctrine |
| `/court`, `/court/[slug]` | Twenty-eight advisors grouped by kingdom, and one advisor |
| `/council` | Convene a court, read the verdict and the trace |
| `/dilemmas`, `/dilemmas/[slug]` | Twenty cases and one case's options and stakeholders |
| `/chronicle`, `/chronicle/[slug]` | The 32-era time machine and one era |
| `/observatory` | The alignment stack as six towers, with the coverage matrix |
| `/experiments`, `/experiments/[slug]` | Eight parameter sweeps over the classic thought experiments |
| `/codex`, `/codex/[slug]` | Glossary, canon texts, method |
| `/method` | How a verdict is computed |
| `/api/healthz` | `GET` — liveness plus an `ATLAS_STATS` manifest |

Routes marked "planned" in the roadmap are not yet present in `apps/web/src/app`.

## What to read next

| If you want to… | Read |
| --- | --- |
| Understand the packages | [`architecture.md`](architecture.md) |
| Add a realm | [`adding-a-kingdom.md`](adding-a-kingdom.md) |
| Add a thinker | [`adding-an-advisor.md`](adding-an-advisor.md) |
| Add a case | [`adding-a-dilemma.md`](adding-a-dilemma.md) |
| Add a technique | [`adding-a-technique.md`](adding-a-technique.md) |
| Add a locale | [`adding-a-locale.md`](adding-a-locale.md) |
| Understand determinism | [`determinism-and-seeds.md`](determinism-and-seeds.md) |
| Contribute | [`contributing-guide.md`](contributing-guide.md) |
