# Contributing guide

What you get: the branch, commit, verification and review conventions for this
repository, and the one rule that will get a PR held.

---

## The one rule

Read this before you write a line.

> A deliberation is a **pure function of `(seed, dilemmaId, optionId)`**. The committed
> seed is `2406`. That guarantee is what makes the atlas a simulation rather than an
> opinion — and it is why **any change that alters a verdict is a breaking change**,
> even if every test still passes.

From `CONTRIBUTING.md`:

> If your change can move a verdict:
>
> 1. State the **seed**, the **dilemma id** and the **option id**.
> 2. State the **verdict before** and the **verdict after**.
> 3. Say **why** the old verdict was wrong, or acknowledge that you are deliberately
>    changing a canon verdict.
>
> A pull request that changes deliberation output without that block will be held for
> clarification. This is not bureaucracy; an unexplained flip in a verdict is the exact
> bug this repo exists to not have.

Concretely, a PR that moves `d01`'s verdict must say:

```
seed:     2406
dilemma:  d01 (The Paperclip Maximiser)
option:   cap-and-monitor
before:   winnerId "withdraw", margin 0.112, decidingAxis "rights"
after:    winnerId "cap-and-monitor", margin 0.094, decidingAxis "care"
why:      Deliberate change. `withdraw.deltas.care` was 0.66; the option's whole
          argument is a sustained obligation to people who used the assistant, and
          0.66 understates it. See issue #NNN.
```

The bisecting procedure is
[`../runbooks/verdict-regression.md`](../runbooks/verdict-regression.md).

## Setup

```bash
git clone https://github.com/aniruddhaadak80/nooreign.git
cd nooreign
bun install
bun run dev
```

**Bun 1.3.x is required** — `package.json` pins `"packageManager": "bun@1.3.14"` and
the workspaces use `workspace:*`. npm and yarn will not resolve that correctly.

```bash
# optional, only if you are touching them
bun run service:agents     # Python deliberation service on :8080
bun run crate:engine       # Rust reference tests
```

Node `>=20.11.0` is declared in `engines`; Next runs on Node even though Bun installs
the dependencies.

## Branching

| Branch | Role |
| --- | --- |
| `main` | Protected. The branch that deploys. Never commit straight to it |
| `develop` | The default target for day-to-day work |

Branch names: `feat/…`, `fix/…`, `docs/…`.

```bash
git checkout develop
git checkout -b feat/ubuntu-weave-court
# …
git push -u origin feat/ubuntu-weave-court
```

Flow: branch off `develop`, PR into `develop`, merge. Releases tag `main`.

## Commits

Conventional Commits, because the release changelog is generated from them
(`.github/workflows/release.yml` runs `git log --pretty=format:'- %s (%h)'` over the
range between tags).

```
feat: add the ubuntu-weave council
fix: keep verdict tie-breaking stable across platforms
docs: explain the six axes in the guide
refactor(core): extract the ballot tally
chore(deps): bump next to 15.1.0
```

Types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`,
`revert`. Optional scope in parentheses. Imperative mood, no trailing period.

## Verify before you push

```bash
bun run verify     # typecheck && lint && test && build
```

That is exactly what CI runs, in that order. Individually:

```bash
bun run typecheck     # turbo typecheck -> tsc --noEmit per package
bun run lint          # turbo lint -> eslint src --max-warnings=0
bun run test          # turbo test -> vitest run per package
bun run test:watch    # vitest --watch, turbo bypassed
bun run build         # turbo build -> next build
```

End-to-end, which needs the browser once:

```bash
bun run e2e:install   # playwright install chromium
bun run test:e2e      # playwright test
```

`bun run test:e2e` runs against a **production build**, not the dev server, because
most of what breaks in this app only breaks in the build: static generation of ~200
parameterised routes, client-island hydration, and the metadata the social card
depends on. `playwright.config.ts` boots `bun run build && bun run start` itself, so
there is no port juggling.

Chromium only. CI's comment: *"the atlas is a single-page, no-native-module app, so the
full browser matrix would triple CI time for no extra signal."*

## Regenerating committed assets

Every SVG and every generated diagram is derived from seed `2406` and is checked in.
`.github/workflows/asset-check.yml` regenerates and fails on any diff.

```bash
bun run assets      # scripts/gen-assets.mjs — every SVG
bun run diagrams    # scripts/gen-diagrams.mjs
bun run loc         # scripts/loc-count.mjs — also the CI scale guardrail
```

If `asset-check` fails, the fix is always the same: run `bun run assets` locally and
commit the result.

## Code style

- TypeScript **strict** everywhere: `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`. Do not weaken these in a local `tsconfig`.
  `packages/config/tsconfig.base.json` is the single place they live.
- **No `any`.** Use `unknown` and narrow, or a `Result` from
  `packages/core/src/util/result.ts`.
- `import type { … }` for type-only imports — `verbatimModuleSyntax` is on.
- Named exports. Match the surrounding file's style over personal taste.
- Comments explain **why**, not **what**. The code already says what.
- **Readonly in, fresh array out.** No module in `packages/core` mutates a caller's
  array. `chronicle-contract.md` gives the reason: *"a function that sorts in place is
  a frame-rate bug waiting for a second caller."*
- **Every ordering has an explicit final tie-break.** Two runs must produce
  byte-identical renders, or a reader cannot cite them.

`noUncheckedIndexedAccess` is the flag that shows up most in review. It is why
`ranked[0]?.optionId ?? dilemma.options[0]?.id ?? ""` appears in
`packages/core/src/council/deliberation.ts` rather than `ranked[0].optionId`. That is
not defensive noise; it is the compiler telling you the array might be empty.

## Adding to the atlas

Content lives in `packages/seed/src/`, validated by zod schemas in
`packages/seed/src/types.ts`. `validateSeed()` in `packages/seed/src/index.ts` checks
every record against its schema **and** every foreign key, on import.

| Adding | File | Guide |
| --- | --- | --- |
| A realm | `kingdoms.ts` | [`adding-a-kingdom.md`](adding-a-kingdom.md) |
| A thinker | `advisors.ts` | [`adding-an-advisor.md`](adding-an-advisor.md) |
| A case | `dilemmas.ts` | [`adding-a-dilemma.md`](adding-a-dilemma.md) |
| A technique | `techniques.ts` | [`adding-a-technique.md`](adding-a-technique.md) |
| An era | `eras.ts` | — |
| An experiment | `experiments.ts` | — |
| A term | `glossary.ts` | — |
| A canon text | `texts.ts` | — |

The six moral axes are `welfare`, `rights`, `virtue`, `care`, `justice`, `agency`.
Weights are in `[0, 1]` and **their sum is intentionally unconstrained** — no tradition
agrees on a budget.

Before you add an advisor, read
[`writing-good-argument-moves.md`](writing-good-argument-moves.md). Before you add
anything that might move a verdict, read
[`determinism-and-seeds.md`](determinism-and-seeds.md).

Propose a new dilemma with the **Dilemma proposal** issue template
(`.github/ISSUE_TEMPLATE/dilemma_proposal.yml`); it captures every field and records
that historical accuracy is checked.

## What makes a content PR hard

Not the mechanics — the attribution. `packages/seed/src/advisors.ts` puts words in
named historical figures' mouths. That is checkable, and a reader will check it.

- Every `works[].title` must exist and the `year` must be right.
- Every `moves[].support` must be defensible from the cited work **or** a
  reconstruction the prose already signals.
- `epithet` describes a position, not a verdict on the person.
- `onAi.note` is what the person would say about the question **as posed here** — and
  every one of them is an application, because none of them had this question.
- If you cannot find the sentence, it is a reconstruction. Say so in the prose.

**Silently passing off an inference as a quotation is the one thing this dataset must
never do.** That sentence is the standard every move is held to. The full test data
and the long-form version are in [`../data-sources.md`](../data-sources.md).

## Good first issues

Each of these is genuinely small, and the rule of thumb is: *if you can `bun run
verify` and get green, you can ship it.*

| Task | File | Notes |
| --- | --- | --- |
| Add one glossary entry | `packages/seed/src/glossary.ts` | No engine changes; the shape is already validated |
| Add a landmark to a realm | `packages/seed/src/kingdoms.ts` | Foreign key only |
| Add a canon text | `packages/seed/src/texts.ts` | Then link it from a kingdom's `texts[]` |
| Fix a `docs/` typo or broken link | `docs/**` | A good way to learn the layout |
| Add a unit test for an untested helper | `packages/core/src/util/` | `observatory/maturity.ts` and `journal/prompts.ts` both have tests and no callers today |
| Fill in `packages/sdk/src/` | see [`../api/sdk.md`](../api/sdk.md) | Manifest exists, source does not. Biggest well-scoped gap in the repo |
| Implement `crates/engine` | see [`../api/rust-crate.md`](../api/rust-crate.md) | The hardest scoped task in the repo |

## Pull requests

`.github/PULL_REQUEST_TEMPLATE.md` is the form. The short version:

- `bun run verify` green.
- New behaviour has a test.
- **If a verdict moved, the determinism block is in the description.** This is the one
  that gets PRs held.
- No secrets. If you added an env var, update `.env.example`.
- Docs updated if a reader can see the change.
- Screenshots for visual changes.
- `bun run assets` run and the result committed, if you touched anything that renders
  a generated SVG.

## What CI will check

Seven jobs in `.github/workflows/ci.yml`, plus four more workflows:

| Job | What | Where |
| --- | --- | --- |
| `quality` | typecheck, lint, test, build on **ubuntu and windows** | `ci.yml` |
| `e2e` | `bun run test:e2e apps/web/tests/e2e` after `bun run e2e:install` | `ci.yml` |
| `scale` | `bun run loc --json` against `LOC_BASELINE` | `ci.yml` |
| `python` | `pytest services/agents/tests -q` and `ruff check services/agents` | `ci.yml` |
| `rust` | `cargo test` and `cargo clippy -- -D warnings` | `ci.yml` |
| `secrets-scan` | `git grep` over full history for credential shapes | `ci.yml` |
| assets | regenerate and fail on diff | `asset-check.yml` |
| CodeQL | — | `codeql.yml` |
| Vercel deploy | on push to `main` | `deploy-vercel.yml` |
| Release | on `v*` tag | `release.yml` |

**Two of those will fail on a clean checkout today,** because the things they test are
not in the tree:

- The `rust` job runs `cargo test --manifest-path crates/engine/Cargo.toml` and
  `crates/` is empty.
- The `python` job's `pytest` and `ruff` commands do work — `services/agents` is
  complete.

Fix the rust job by implementing the crate
([`../api/rust-crate.md`](../api/rust-crate.md)) or by removing the job and saying so in
an ADR. Do not leave it silently broken.

### The Windows leg is not optional

From `ci.yml`:

> This repo is developed primarily on Windows, so the Windows leg is not optional: path
> separators, CRLF and the Turbo/Next file watcher all behave differently there. Green
> on both is the bar.

If a test only passes on Linux, it is a Windows bug.

### The scale guardrail

The `scale` job fails if the total line count drops more than 10% below
`LOC_BASELINE` (a repo variable; the fallback is `30029`). The comment is blunt:

> The atlas is a scale-engineered repo: shrinking it is a regression even when every
> test still passes.

So a deletion PR that does not add lines anywhere **will fail CI**. If your deletion
was intentional, raise `LOC_BASELINE` in the repository variables, and expect to
justify the deletion in review.

```bash
bun run loc --json | jq '.totalLines'
```

## Code of conduct

`CODE_OF_CONDUCT.md` — Contributor Covenant v2.1. Please read it. Security issues go
to `SECURITY.md`, not the issue tracker.

## Licence

MIT, [`LICENSE`](../../LICENSE). Contributions are accepted under the same terms.

## Related

- [`../limitations.md`](../limitations.md) — what the atlas is not, before you propose
  extending it
- [`../index.md`](../index.md) — the documentation map
- [`determinism-and-seeds.md`](determinism-and-seeds.md) — every stochastic path
- [`writing-good-argument-moves.md`](writing-good-argument-moves.md) — the attribution
  standard
- [`../runbooks/verdict-regression.md`](../runbooks/verdict-regression.md) — bisecting
  a verdict change
- [`../api/core-modules.md`](../api/core-modules.md) — what already exists, so you do
  not write it twice