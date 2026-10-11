# ADR 0001 — A Turborepo monorepo whose packages ship raw TypeScript

**Status:** Accepted (2026-05)
**Deciders:** core maintainers
**Applies to:** `turbo.json`, `package.json`, every `packages/*/package.json`, `apps/web/next.config.ts`

---

## Context

Nooreign has four kinds of artefact in one repository:

- a Next.js 15 App Router application (`apps/web`);
- a design system that lives outside the app directory (`packages/ui`);
- pure domain logic that must run in a browser, in Node and in a test runner
  (`packages/core`, `packages/seed`);
- one optional Python service (`services/agents`) and one Rust reference crate
  (`crates/engine`) that are not part of the JS dependency graph at all.

The classic failure mode for a project with this shape is a **build-step monorepo**:
every workspace package gets a `tsc -b` producing `dist/`, an `exports` map pointing
at `dist/index.js`, a `"types"` pointing at `dist/index.d.ts`, and a `clean` script.
That buys two things — published artefacts and a hard boundary between a package's
public and private surface — and it costs three that matter more here:

1. **A watch-mode rebuild loop.** Editing `packages/core/src/ethics/axioms.ts`
   triggers `tsc` in `core`, then a dependent rebuild in `apps/web`. On Windows
   with an NTFS watcher this is the difference between a 400 ms reload and a
   9-second one. The repository develops primarily on Windows and CI runs a
   mandatory `windows-latest` leg, so this is not an aesthetic concern.
2. **Declaration drift.** `dist/*.d.ts` is a *copy* of the source contract. With
   `verbatimModuleSyntax` and `exactOptionalPropertyTypes` on, a `.d.ts` emitted
   from a build that ran before a type fix is a lie the compiler will happily
   consume downstream.
3. **A second thing to keep correct.** A `dist` directory means a `clean` story,
   a `prepublishOnly` story, and a "why is `dist` stale" story. For a private
   workspace with exactly one consumer, there is nobody to serve.

The opposite extreme — one application directory with folders inside it — was
rejected immediately: `packages/seed` is the single source of truth for the
zod schemas, and the Python and Rust sides quote those schemas. It has to be a
package with its own name, its own tests and its own `package.json`.

What we actually need is: real packages, real test isolation, real turbo task
graph — and **no `dist` anywhere**.

## Decision

A Bun-workspaced Turborepo in which every TypeScript workspace package points
`main`, `types` and `exports` at its **source** `.ts` file.

Every workspace package follows this shape:

```jsonc
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
  }
}
```

`apps/web/next.config.ts` tells the bundler to compile those sources into the app's
own chunks:

```ts
transpilePackages: ["@repo/core", "@repo/i18n", "@repo/sdk", "@repo/seed", "@repo/ui"],
```

`tsconfig.base.json` is shared from `packages/config/tsconfig.base.json` with
`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`verbatimModuleSyntax`, `isolatedModules` and `noEmit`. Strictness is the
substitute for a build boundary: a package cannot leak an untyped escape hatch
because there is no boundary to leak through.

`turbo.json` declares `build`, `dev`, `start`, `lint`, `typecheck`, `test`, with
`build` depending on `^build`, `lint`/`typecheck` depending on `^build`, and `dev`
and `start` uncached and persistent.

**Named trade-off:** we give up the ability to `npm publish` any workspace package
as-is, and we give up a compile-time-enforced public/private split inside a
package. In exchange every edit is one compiler pass in one process. For a
private monorepo whose only consumer is a sibling app, this is the right trade;
for a library intended for public consumption it would not be.

## Consequences

**Positive**

- Edit-to-reload is a single pass. There is no `dist` staleness class of bug
  because there is no `dist`.
- Types cannot drift from source: the file the compiler reads is the file the
  editor reads is the file the bundler reads.
- `bun run typecheck`, `bun run lint`, `bun run test` and `bun run build` all
  work from the repo root with no per-package bootstrap, because turbo resolves
  the graph from the workspace manifests.
- `bun install --frozen-lockfile` is all CI needs; there is no build cache to warm
  before the first real check.
- Vitest runs each package's `src/**/*.test.ts` under its own project name
  (`core`, `seed`, `ui`, `web`) via the root `vitest.config.ts` `projects` list.

**Negative**

- `bun test`, `ts-node`-style direct execution and any consumer that expects
  `dist/` will not work. Anything wanting compiled output must run a bundler
  first. This is a real cost for anyone dropping into the repo from a background
  that assumes `dist`.
- Node cannot `require()`/`import` these packages without a TypeScript-aware
  loader. The Python service and the Rust crate therefore re-declare the wire
  contracts independently (`services/agents/app/models.py`, `crates/engine`),
  and parity has to be tested rather than inherited.
- `optimizePackageImports` and `transpilePackages` become load-bearing config. If
  a new workspace package is added and forgotten in the `transpilePackages` list,
  the failure is a confusing runtime module-resolution error, not a type error.
- The bundler now parses every workspace source on every cold build, which is
  slower than reading prebuilt JS. This is paid on cold builds and not on warm
  ones.

## Alternatives considered

| Option | Why rejected |
| --- | --- |
| **pnpm/turborepo with `dist` output per package** | Solves a problem this repo does not have (publishing) and creates the two it does (watch latency, declaration drift). Adds a `clean` story to maintain. |
| **A single Next.js app with `src/lib`, `src/data`, `src/domain`** | Fastest to set up, and it is what most Next projects do. Rejected because `packages/seed` is quoted by two non-JS runtimes; a folder cannot be depended on by Python or Rust, and the schema ownership would become implicit. |
| **Nx with project graph inference** | Better graph modelling and generators, at the cost of a plugin ecosystem and a decorator-laden config style. Overkill for five packages. |
| **Bun workspaces only, no turbo** | Works. Rejected because turbo gives the `dependsOn: ["^build"]` ordering, the shared `globalEnv`, and one root command for four checks, all of which the CI workflow depends on. |
| **Precompiled `.d.ts` only (declaration-only build)** | Considered as a middle ground. Rejected: it still needs a build step, a `clean` step and an ordering guarantee, in exchange for catching type errors that `tsc --noEmit` in the consuming app already catches. |
