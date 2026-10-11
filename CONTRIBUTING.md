# Contributing to Nooreign

Nooreign is a Bun + Turborepo monorepo. Contributions are welcome, especially
content: the atlas is only as good as the dilemmas in it.

## Quickstart

```bash
git clone https://github.com/aniruddhaadak80/nooreign.git
cd nooreign
bun install
bun run dev
```

Then open the URL Turborepo prints (by default <http://localhost:3000>).

> Prerequisite: [Bun](https://bun.sh) 1.3.x. `bun install` is required — this is a
> Bun workspace and npm/yarn will not resolve `workspace:*` correctly.

Useful extras:

```bash
# the optional Python deliberation service, on :8080 (the atlas works without it)
bun run service:agents

# the Rust reference engine's tests
bun run crate:engine
```

## Verify before you push

Everything CI runs, in one command:

```bash
bun run verify     # typecheck && lint && test && build
```

Or individually:

```bash
bun run typecheck
bun run lint
bun run test
bun run test:watch
bun run build
```

End-to-end (needs the Playwright browser once):

```bash
bun run e2e:install
bun run test:e2e
```

Regenerate committed artwork when you touch anything that renders it:

```bash
bun run assets     # SVGs; CI fails if these drift (see .github/workflows/asset-check.yml)
bun run diagrams   # the diagrams under docs/images/generated
```

## Branches

- `main` — protected, and the branch that deploys. Never commit straight to it.
- `develop` — the default target for day-to-day work.
- Branch names: `feat/…`, `fix/…`, `docs/…` (e.g. `feat/ubuntu-weave-court`,
  `fix/verdict-tie-break`).

Flow: branch off `develop`, open a PR into `develop`, merge. Releases tag `main`.

## Conventional Commits

Commit messages follow Conventional Commits, because the release changelog is
generated from them:

```
feat: add the ubuntu-weave council
fix: keep verdict tie-breaking stable across platforms
docs: explain the six axes in the guide
refactor(core): extract the ballot tally
chore(deps): bump next to 15.1.0
```

Types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`,
`revert`. Optional scope in parentheses. Imperative mood, no trailing period.

## The determinism rule

This is the rule that matters most in this repo.

A deliberation is a **pure function of `(seed, dilemmaId, optionId)`**. The
committed seed is `2406`. That guarantee is what makes the atlas a simulation
rather than an opinion — and it is why **any change that alters a verdict is a
breaking change**, even if every test still passes.

If your change can move a verdict:

1. State the **seed**, the **dilemma id** and the **option id**.
2. State the **verdict before** and the **verdict after**.
3. Say **why** the old verdict was wrong, or acknowledge that you are
   deliberately changing a canon verdict.

A pull request that changes deliberation output without that block will be held
for clarification. This is not bureaucracy; an unexplained flip in a verdict is
the exact bug this repo exists to not have.

## Code style

- TypeScript **strict** everywhere (`strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`). Do not weaken these in a local `tsconfig`.
- **No `any`.** Use `unknown` and narrow, or a `Result` type from
  `packages/core/src/util/result.ts`.
- `import type { … }` for type-only imports (`verbatimModuleSyntax`).
- Prefer named exports. Match the surrounding file's style over personal taste.
- Comments should explain **why**, not **what**. The code already says what.
- Follow the existing directory conventions under `packages/*/src`.

## Adding to the atlas

Content lives in `packages/seed/src/`, validated by Zod schemas in
`packages/seed/src/types.ts`. Add:

- **A kingdom** → `kingdoms.ts`: an id, a name, a creed, a founding year, a
  capital position on the atlas plane (0–100 on both axes), a terrain, a crest, an
  `axioms` vector (the six moral weights, each in `[0,1]`), a `temperament`, its
  advisors, landmarks, relations to other kingdoms, and canon texts.
- **An advisor** → `advisors.ts`: their axiom vector and temperament. Advisors
  deliberate *by* those numbers; the prose is for humans, the weights are for the
  engine.
- **A dilemma** → `dilemmas.ts`: id, title, prompt, setting, `kingdomOrigin`,
  `eraId`, tags, `severity`, `aiRelevance`, 2–5 `options` (each with a six-axis
  `deltas` vector, `harms`, `benefits`, `risk`, `reversibility`, `agentHarm`),
  `stakeholders`, a `lesson`, and `references`.

The six moral axes are `welfare`, `rights`, `virtue`, `care`, `justice`, `agency`.
Weights are in `[0,1]` and their sum is intentionally unconstrained — no
tradition agrees on a budget.

Deeper guides live under [`docs/guides/`](docs/guides/):

- `docs/guides/kingdoms.md` — authoring a kingdom
- `docs/guides/advisors.md` — authoring an advisor and their axioms
- `docs/guides/dilemmas.md` — authoring a dilemma and its option deltas

Propose new dilemmas with the **Dilemma proposal** issue template; it captures
every field and records that historical accuracy is checked.

## Good first issues

If you are new, these are the best on-ramps. Each is genuinely small:

- **Add one glossary entry** to `packages/seed/src/glossary.ts` (id, kind, term,
  definition, and the kingdom it belongs to). No engine changes; tests already
  validate the shape.
- **Add a landmark** to an existing kingdom in `kingdoms.ts`.
- **Add a canon text** to `texts.ts` (title, author, year) and link it from a
  kingdom's `texts` array.
- **Fix a `docs/guides/` typo or a broken link** — a good way to learn the
  layout.
- **Add a unit test** for an untested helper in `packages/core/src/util/`.
- **Pick up a `good first issue` / `help wanted`** on the tracker.

The rule of thumb: if you can `bun run verify` and get green, you can ship it.

## Pull requests

Fill in the template. The short version:

- `bun run verify` green (typecheck, lint, test, build).
- New behaviour has a test.
- No secrets; `.env.example` updated if you added an env var.
- Docs updated if the change is visible to a reader.
- Screenshots for visual changes.

## Code of Conduct

Participation in this project is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
(Contributor Covenant v2.1). Please read it.

## Licence

MIT — see [LICENSE](LICENSE). Contributions are accepted under the same terms.