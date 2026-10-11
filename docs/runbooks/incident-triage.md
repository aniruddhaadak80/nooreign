# Incident triage

What you get: symptom → diagnosis → fix for the failures that actually happen in this
repository, ordered by how often you will hit them.

---

## Triage order

Work top-down. Steps 1–4 catch most incidents and take under a minute.

| # | Check | Command | Time |
| --- | --- | --- | --- |
| 1 | Is the seed data valid? | `bun run test` — the seed test | 10 s |
| 2 | Do the four checks pass? | `bun run verify` | 2–5 min |
| 3 | Does the server boot? | `bun run build && bun run start`, then `curl /api/healthz` | 2 min |
| 4 | Are the committed assets current? | `bun run assets && git status` | 20 s |
| 5 | Did a verdict move? | [`verdict-regression.md`](verdict-regression.md) | — |
| 6 | Is the seed data corrupt? | [`dataset-corruption.md`](dataset-corruption.md) | — |
| 7 | Is it slow? | [`performance.md`](performance.md) | — |

---

## Symptom index

| Symptom | Go to |
| --- | --- |
| `The court adjourned` / "Something broke while tabulating the verdict" | §1 |
| A page 404s that exists in the seed | §2 |
| `/council` renders "No dilemmas are loaded. Run `bun run seed`." | §3 |
| CI: asset-check fails | §4 |
| CI: `bun run crate:engine` fails on a clean checkout | §5 |
| CI: python job fails | §6 |
| CI: the LOC floor fails | §7 |
| CI: the secrets scan fails | §8 |
| `Module not found: Cannot find module '@repo/sdk'` | §9 |
| `tsc` fails in `packages/sdk` | §10 |
| `/api/deliberate` returns 404 for a known dilemma | §11 |
| Docker container boots, every route 404s | §12 |
| Playwright fails with a 45 s timeout | §13 |
| `bun install` resolves a different tree than `bun.lock` | §14 |

---

## 1. `error.tsx` fires: "Something broke while tabulating the verdict"

**This is a bug, not a moral uncertainty.** `apps/web/src/app/error.tsx` says so
directly, and it is correct: the engine is a pure function of `(seed, ids)`.

### Diagnose

```bash
# 1. The seed test — does any record fail its schema or a foreign key?
bun run test

# 2. Does the specific record load?
bun --eval "const s = await import('./packages/seed/src/index.ts'); console.log(s.getKingdom('stoa-vetera')?.name)"
```

If `bun --eval` cannot resolve the TS path, that is your first problem, not the app's —
use a `.test.ts` file instead.

`validateSeed()` returns `IntegrityIssue[]`:

```ts
export interface IntegrityIssue {
  dataset: string;
  id: string;
  problem: string;
}
```

Run it and print the array. Every issue has a `dataset`, an `id` and a `problem`
string; the problems are the useful part.

### Fix

| What `validateSeed()` reports | Cause | Fix |
| --- | --- | --- |
| `unknown advisor "…"` on a `kingdoms` row | `kingdom.advisors[]` names a missing id | Add the advisor to `advisors.ts`, or remove the entry |
| `unknown text "…"` on a `kingdoms` row | `kingdom.texts[]` names a missing id | Add to `texts.ts`, or correct the id |
| `relation to self` | `kingdom.relations[].to === kingdom.id` | Remove the self-relation |
| `endYear precedes startYear` | An era's window is inverted | Correct the year |
| `duplicate option ids` | Two options in one dilemma share an `id` | Rename one. This one also silently breaks `runCouncil` ties |
| `unknown parameter "…"` | `technique.requires[]` names a missing id | Add the technique, or fix the id |
| `seeAlso "…" does not resolve` | A glossary cross-reference is dangling | Fix the slug in `glossary.ts` |
| A zod issue path | Schema violation — usually a length minimum | The message names the field and the minimum |

Anything not in that table: read the `problem` string, fix it, run
[`dataset-corruption.md`](dataset-corruption.md) if it is structural.

---

## 2. A page 404s for a record that exists

**Almost always `generateStaticParams`.** There is no database and no request-time
fetch: every content route is statically generated, and `generateStaticParams()` is
the manifest of paths that will exist.

### Diagnose

```bash
# Is the record there?
bun --eval "const {ADVISORS}=await import('./packages/seed/src/index.ts'); console.log(ADVISORS.length)"

# Is the slug in generateStaticParams?
rg -n 'generateStaticParams' apps/web/src/app
```

Every dynamic route returns its dataset mapped to a slug:

```tsx
export function generateStaticParams() {
  return ADVISORS.map((advisor) => ({ slug: advisor.slug }));
}
```

### Fix

Add the array to `generateStaticParams`, rebuild, and check:

```bash
bun run build && bun run dev
```

**Also check the params Promise.** In Next 15, `params` is a Promise. Writing the
Next 14 shape gives you `undefined` where you expected a slug, which produces a 404
for *every* record and no error message:

```tsx
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;   // ← missing await = 404 on every slug
  // …
}
```

See [ADR 0005](../adr/0005-nextjs-15-not-16.md).

---

## 3. `/council` renders "No dilemmas are loaded. Run `bun run seed`."

That string is in `apps/web/src/app/council/page.tsx`, inside:

```tsx
const dilemma = DILEMMAS[0];
if (!dilemma) {
  return <p className="mt-10 text-parchment-dim">No dilemmas are loaded. Run `bun run seed`.</p>;
}
```

`DILEMMAS` is a compile-time array literal. It cannot be empty at runtime unless
`packages/seed/src/dilemmas.ts` was emptied.

**The suggestion in the copy is misleading.** `bun run seed` is
`bun scripts/seed.ts`; it does not populate `DILEMMAS`. Nothing fetches the seed. The
real causes are:

| Cause | Check |
| --- | --- |
| `dilemmas.ts` emptied or truncated | `git diff --stat packages/seed/src/dilemmas.ts` |
| The array literal was renamed | `rg -n 'export const DILEMMAS' packages/seed/src/` |
| An import was changed to a type-only import | `rg -n 'DILEMMAS' packages/seed/src/index-maps.ts` |

Fix the import or the literal. Do not run `bun run seed` expecting it to help.

---

## 4. CI asset-check fails

```
::error::Generated assets are out of date. Run 'bun run assets' locally and commit the result.
```

Every committed SVG is generated from seed `2406`. `.github/workflows/asset-check.yml`
regenerates and fails on any diff, so a hand-edited asset or a generator change that
was not re-run can never merge.

### Fix

```bash
bun run assets
bun run diagrams
git status
git add apps/web/public/images docs/images/generated
git commit -m "chore: regenerate assets"
```

If `git status` is clean after `bun run assets` and CI still fails, the generators are
non-deterministic. That is a real bug in `scripts/gen-assets.mjs` — check for
`Date.now()`, `Math.random()`, or an unordered `Object.keys` iteration feeding an SVG
attribute order.

---

## 5. CI: `bun run crate:engine` fails on a clean checkout

**Expected today. `crates/` is an empty directory.**

```json
"crate:engine": "cargo test --manifest-path crates/engine/Cargo.toml"
```

Both CI's `cargo test` and `cargo clippy -- -D warnings` fail because there is no
`Cargo.toml`.

Two honest fixes:

| Option | When |
| --- | --- |
| Implement the crate | See [`../api/rust-crate.md`](../api/rust-crate.md). [ADR 0008](../adr/0008-rust-reference-engine-parity.md) specifies the three modules |
| Remove the CI job and the `crate:engine` script, and record why in a new ADR | If the crate is not being built. Leaving CI broken silently is the only unacceptable option |

Do not delete the job without saying so. An ADR that says "the crate is deferred" is a
decision; a red CI job is an accident.

---

## 6. CI: the python job fails

```bash
pip install -e "services/agents[dev]"
pytest services/agents/tests -q
ruff check services/agents
```

| Error | Cause | Fix |
| --- | --- | --- |
| `ModuleNotFoundError: No module named 'app'` | `PYTHONPATH` not set | Run from the repo root, or `cd services/agents` |
| `AttributeError: 'Contract' object has no attribute ...` | A field added to a model without regenerating | Check `models.py` — every model inherits `extra="forbid"` |
| A wire test fails on camelCase | An alias generator change | Every model must keep `alias_generator=to_camel` |
| A parity test fails on an astral-plane id | The FNV-1a fold diverged | `hash_string` must iterate UTF-16 code units, not UTF-8 bytes |
| `ruff` E501 | A long line | `ruff check --fix`, then review |

`services/agents/app/axioms.py` states the two rules every fixture must hold:

> **Round early, round to 4 dp.** Every intermediate that a human will ever see is
> rounded exactly once, at construction.
>
> **No NaN, no Infinity.** … Degenerate inputs get an explicit, documented default
> instead.

---

## 7. CI: the LOC floor fails

```
::error::Line count regressed: N < floor. The atlas is meant to grow.
```

The `scale` job fails if the total drops more than 10% below `LOC_BASELINE`.

```bash
bun run loc --json | jq '.totalLines'
```

If the deletion was deliberate, raise `LOC_BASELINE` in
*Repo → Settings → Secrets and variables → Actions → Variables*. Expect to justify the
deletion in review — the comment in `ci.yml` is explicit that shrinking the atlas is a
regression "even when every test still passes".

---

## 8. CI: the secrets scan fails

The scan greps **full history** (`fetch-depth: 0`) for credential-shaped strings:
GitHub tokens, AWS keys, `sk-…`, Slack tokens, Google API keys, PEM private key
blocks, and `vercel_…` tokens.

```bash
# Reproduce locally
git grep -nIE '(gh[pousr]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,}|-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----|vercel_[A-Za-z0-9]{20,})' -- . ':!*.lock' ':!bun.lock' ':!.github/workflows/*' ':!.env.example'
```

**A match here means somebody committed a real key. Revoke it first**, then open a PR
removing it. This repo holds no production secrets by design; see `SECURITY.md`.

The workflow file itself and `.env.example` are excluded, so the pattern appearing in
documentation will not fail the build.

---

## 9. `Cannot find module '@repo/sdk'`

`packages/sdk/package.json` points `main` and `exports` at `./src/index.ts`, and
**`packages/sdk/src/` does not exist**.

Nothing in `apps/web` imports `@repo/sdk` today, so this only fires if you added an
import. `apps/web/next.config.ts` lists it in `transpilePackages`, which does not
create it.

Three ways out:

| Fix | Cost |
| --- | --- |
| Do not import it. Use `@repo/core` directly | Nothing. **Recommended** |
| Build a minimal `packages/sdk/src/index.ts` | See [`../api/sdk.md`](../api/sdk.md). Remember `fetch` must be injected, never called at import |
| Point `main` at a real file | Removes the promise; also edit `apps/web/next.config.ts`'s `transpilePackages` |

Do not create an empty `src/index.ts` to silence it. A package that resolves to nothing
is worse than one that fails to resolve.

---

## 10. `tsc` fails in `packages/sdk`

`packages/sdk` has a tsconfig, an eslint config and a vitest config, and no sources.
Depending on the tsconfig's `include`, `tsc --noEmit` reports `No inputs were found`.

That is a broken package, not a broken build. The options are the same as §9, plus:

```bash
cd packages/sdk && npx tsc --noEmit --listFiles | head
```

If the intent was to have an empty package that `tsc` accepts, `include` needs to
match something real — and then the package has no reason to exist. Filling it in is
the better answer; [`../api/sdk.md`](../api/sdk.md) has the build order.

---

## 11. `/api/deliberate` returns 404 for a dilemma you know exists

Check what you sent. `getDilemma` resolves **id or slug**:

```ts
export const getDilemma = (idOrSlug: string): Dilemma | undefined =>
  DILEMMAS_BY_ID.get(idOrSlug) ?? DILEMMAS_BY_SLUG.get(idOrSlug);
```

Real dilemma ids are `d01` … `d20`. Slugs are `paperclip-maximiser`,
`trolley-of-five-million`, and so on. They do not compose.

```bash
# Correct
-d '{"dilemmaId":"d01","advisorIds":["kant"]}'
-d '{"dilemmaId":"paperclip-maximiser","advisorIds":["kant"]}'

# Both 404 — neither map has this key
-d '{"dilemmaId":"d01-paperclip-maximiser","advisorIds":["kant"]}'
```

**The `GET /api/deliberate` self-description contains exactly that wrong example.** So
does `GET /api/experiment`, and its example also uses a `key` that is not a parameter of
the experiment it names. Both are documented in
[`../api/rest-api.md`](../api/rest-api.md).

Fixing them is a two-line change to each route handler:

```ts
example: {
  dilemmaId: "d01",
  advisorIds: ["kant", "bentham", "bostrom", "held"],
  seed: 2406,
},
```

A second 404 worth knowing: `"no known advisors were selected"`. That means **every**
advisor id was unknown. Partial typos are dropped silently — `convene()` filters with
`.filter(a => a !== undefined)` and seats whatever is left.

---

## 12. Docker container boots, every route 404s

Two `COPY` lines in the `Dockerfile`, and a wrong entrypoint, are the three ways this
happens.

```dockerfile
# The standalone output nests the app under a path mirroring the repo layout, so
# the server entrypoint lives at apps/web/server.js inside it.
CMD ["bun", "apps/web/server.js"]

# .next/static and public are NOT bundled into standalone by design.
COPY --from=builder --chown=bun:bun /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=bun:bun /repo/apps/web/public ./apps/web/public
```

Diagnose:

```bash
docker run --rm -p 3000:3000 nooreign/web:latest &
sleep 3
curl -s http://localhost:3000/api/healthz | jq      # 200 → routing works, assets missing
curl -sI http://localhost:3000/ | head -3          # look for a 404 on /_next/static/*
docker run --rm --entrypoint ls nooreign/web:latest -la apps/web/.next/static
```

| Symptom | Cause |
| --- | --- |
| Every route 404s, healthcheck works | `apps/web/server.js` missing or the `WORKDIR` is wrong |
| HTML loads, CSS/JS 404 | `.next/static` or `public` not copied |
| Server exits immediately | `output: "standalone"` not enabled — needs `NOOREIGN_STANDALONE=1` in the builder stage |

---

## 13. Playwright times out at 45 s

`playwright.config.ts` runs against a production build:

```ts
webServer: {
  command: "bun run build && bun run start",
  url: `${baseURL}/api/healthz`,
  timeout: 600_000,
}
```

| Symptom | Cause | Fix |
| --- | --- | --- |
| Webserver never becomes ready | The build failed | Run `bun run build` and read the output |
| 45 s per-test timeouts | A route is very slow | [`performance.md`](performance.md) |
| Hydration errors in the trace | A client island reads `Math.random()` or the clock | Use the seeded streams — [`determinism-and-seeds.md`](../guides/determinism-and-seeds.md) |
| Port already in use | A `dev` server is on 3000 | `PORT=3100 bun run test:e2e`, and set `E2E_BASE_URL` if you want to reuse a server |
| Browsers missing | — | `bun run e2e:install` |

CI runs `bun run test:e2e apps/web/tests/e2e` and uploads the Playwright report on
failure.

---

## 14. `bun install` resolves a different tree

CI uses `--frozen-lockfile`, so this never happens there. Locally:

```bash
rm -rf node_modules
bun install --frozen-lockfile
```

If that fails, `bun.lock` is stale relative to `package.json` — most often because a
dependency was added without committing the lockfile update. Commit `bun.lock` with the
manifest change.

Never edit `bun.lock` by hand.

---

## When you cannot reproduce

```bash
# 1. What is actually loaded?
curl -s http://localhost:3000/api/healthz | jq '.datasets, .seed'

# 2. Do the committed artefacts match what the generators produce?
bun run assets && git diff --stat

# 3. What changed since the last green build?
git log --oneline -20
git diff main...HEAD --stat

# 4. Which dataset?
bun run test -- --reporter=verbose 2>&1 | rg -i 'seed|integrity'
```

`/api/healthz`'s `datasets` field is `ATLAS_STATS` and it tells you immediately whether
a record count moved. `seed` is a hard-coded literal there rather than the `SEED`
constant, so if it says `2406` and the constant says something else, that is one of your
findings.

## Escalation

| Level | Where |
| --- | --- |
| Content error (a date, a title, an attribution) | The issue tracker. `apps/web/src/app/method/page.tsx` links to it directly |
| Security issue | `SECURITY.md`. **Not** the issue tracker |
| Historical claim disputed | The issue tracker, with a citation. Do not open a PR asserting a change without one — see [`../data-sources.md`](../data-sources.md) |

## Related

- [`verdict-regression.md`](verdict-regression.md) — a verdict changed
- [`dataset-corruption.md`](dataset-corruption.md) — the seed itself is the problem
- [`performance.md`](performance.md) — it is slow
- [`release.md`](release.md) — it is blocking a release
- [`../limitations.md`](../limitations.md) — before you argue the engine is wrong,
  read what it claims