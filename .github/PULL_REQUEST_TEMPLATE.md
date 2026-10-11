<!-- Keep the top section short. Reviewers read the diff, not the essay. -->

## What changed

## Why

## How to test

Copy-pasteable, using only the real scripts:

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run test
bun run build

# or, all of the above in one:
bun run verify

# if this touches anything rendered:
bun run e2e:install
bun run test:e2e
```

<!-- If a script did not run here (e.g. you had no Rust toolchain), say which and why. -->

## Determinism

**Does this change what the council concludes?** Yes / No

- [ ] No — the change is structural, presentational, or additive with no effect on any existing verdict.
- [ ] Yes — and the seed plus before/after verdicts are below.

<!-- The atlas is a pure function of (seed, dilemmaId, optionId) at seed 2406.
     Silently flipping a verdict is a breaking change even when every test passes,
     so an unexplained diff in deliberation output is a review blocker. -->

```
seed:
dilemma id:
option id:
verdict before:
verdict after:
```

## Generated assets

- [ ] Not applicable — no SVG, diagram or crest changed.
- [ ] I ran `bun run assets` and committed the result (`asset-check` enforces this).

## Checklist

- [ ] `bun run typecheck` is green.
- [ ] `bun run lint` is green (warnings are errors here: `--max-warnings=0`).
- [ ] `bun run test` is green, and new behaviour is covered by a test.
- [ ] `bun run build` is green.
- [ ] Docs under `docs/` updated if the change is visible to readers.
- [ ] No secrets, tokens, `.env` files or real credential-shaped strings added.
- [ ] Commit message follows Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
- [ ] Branch is named `feat/…`, `fix/…` or `docs/…` and targets `develop`.
- [ ] If this changes deliberation output, the determinism block above is filled in.

## Screenshots

<!-- Required for any visual change: theme, component, layout, diagram, crest or
     typography. Before/after for a restyle. Light and dark if both changed.
     Delete this section only for non-visual changes. -->

| Before | After |
| --- | --- |
|  |  |