# ADR 0005 — Next.js 15, not 16

**Status:** Accepted (2026-05)
**Deciders:** core maintainers
**Applies to:** `apps/web/package.json` (`"next": "^15.0.0"`), `apps/web/src/app/**`

---

## Context

Nooreign is an App Router application with 14 page routes, one Route Handler
(`/api/healthz`), a planned OG image route, `generateStaticParams` on every dynamic
segment, and `output: "standalone"` for the Docker image. The React version is 19.

Every one of those is a moving target across a major version. The question is
which version's *route contract* the codebase is written against.

Three Next 16 changes matter to this repo specifically.

**1. `params` and `searchParams` are asynchronous.** Next 15 already made this
the recommended shape — a `Promise` you `await` — and Next 16 makes the synchronous
form an error. Every dynamic route in this repo is already written against the
asynchronous contract:

```tsx
// apps/web/src/app/kingdoms/[slug]/page.tsx
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

`notFound()` and `generateStaticParams` are unchanged between the two majors, so
the static route tree behaves the same.

**2. Root-route typings.** Next 15 added a typed `PageProps`/`LayoutProps` helper
surface and generated route types under `.next/types`. Next 16 extends and, in
places, moves it. `apps/web/tsconfig.json` already includes
``.next/types/**/*.ts` in its `include`, so the generated validator participates in
`tsc --noEmit`; a changed root-route typing shows up as a typecheck failure in this
repo rather than at request time.

**3. `next lint` and Turbopack defaults.** `next lint` is on its way out; Next 16
pushes ESLint to a direct invocation. This repo's `"lint"` script is
`next lint --max-warnings=0`, and CI depends on `--max-warnings=0` being enforced
rather than advisory.

The version pin interacts with two more constraints:

- **The Docker build must be reproducible.** `Dockerfile` runs `bun install
  --frozen-lockfile` then `bun run build`. A caret range of `^15.0.0` resolves
  against `bun.lock`, so the lockfile is the real pin; the `package.json` range is
  the human-facing intent.
- **The dev loop is `next dev --turbopack`.** Turbopack's behaviour across
  15.x minors has been stable for the parts this app uses (RSC, CSS via PostCSS,
  `optimizePackageImports`), but a major bump is where that changes.

## Decision

**Pin `next` to `^15.0.0` and stay on 15.x.** Write every dynamic route against
the asynchronous `params: Promise<{ … }>` contract, include `.next/types/**/*.ts`
in the app's `tsconfig.json`, and keep `next lint --max-warnings=0` until the
script is genuinely removed from the installed major.

When 16 is adopted, the expected shape of the migration is:

1. Audit every `params`/`searchParams` for synchronous reads; the ones already in
   the repo are already correct.
2. Replace `next lint --max-warnings=0` with a direct `eslint` invocation carrying
   the same `--max-warnings=0`, in both `apps/web/package.json` and
   `.github/workflows/ci.yml` if the workflow shells out to it (it currently runs
   `bun run lint`, so the change is confined to the script).
3. Re-run `bun run build` and confirm the standalone output still nests the
   workspace packages — this is the check that `transpilePackages` still works.
4. Confirm `/api/healthz` still answers under the Docker `HEALTHCHECK`.

**Named trade-off:** pinning to 15 means deferring security and performance fixes
that ship only in 16, and accepting that the upgrade is a scheduled piece of work
rather than a free `bun upgrade`. The deferral is bounded — the async-`params`
migration, which is the part of the 15→16 diff that touches the most files, is
already done.

## Consequences

**Positive**

- The route tree compiles against a contract that is forward-compatible with 16.
  There is no "upgrade Next" branch that rewrites fourteen page files.
- Reproducible Docker and CI builds: `bun.lock` resolves the exact version and
  `--frozen-lockfile` fails loudly rather than silently installing something else.
- `output: "standalone"` and `transpilePackages` are verified behaviour in this
  major, and the Dockerfile depends on the standalone bundle containing the
  workspace sources.
- React 19 with Next 15 is a supported pairing; React 19 with a newer major may
  not be at the time of writing.
- Generated route types participate in `tsc --noEmit`, so a route-shape change is
  a build failure rather than a runtime 404.

**Negative**

- No access to 16-only fixes. Anything patched in 16 waits for the bump, and a
  CVE fixed only in 16 is a CVE the deployment is carrying until then.
- The caret range looks newer than the lockfile is. Someone reading
  `apps/web/package.json` will assume they are on the latest 15.x when they may
  not be; the lockfile is the truth and `bun.lock` is committed for exactly that
  reason.
- `next lint` is a deprecating surface. Pinning to 15 means pinning to a script
  that will disappear, which adds a step to the eventual upgrade that does not
  exist for teams already on 16.
- Turbopack fixes land in the 15.x line only when backported; a build artefact
  problem may be fixed in 16 first.

## Alternatives considered

| Option | Why rejected |
| --- | --- |
| **Start on Next 16** | The route contract churn lands before the repo has any routes to migrate, which is the best possible time for it — but the standing risk is that 16 was still moving while this repo was being built, and the Dockerfile's standalone-bundle assumptions are verified against 15. Revisit at the v0.3 milestone. |
| **Pin an exact version (`15.1.7`, no caret)** | Maximum reproducibility, at the cost of a Dependabot PR for every security patch and a merge conflict waiting in every long-lived branch. The lockfile already provides the reproducibility. |
| **Stay on Next 14** | Loses the App Router's matured caching, the async-`params` contract, and React 19 support. Not a real option. |
| **Next 15 pages router for content routes** | Would mean two rendering models and two metadata conventions in one app. Rejected: RSC is the right fit for a read-mostly atlas. |
