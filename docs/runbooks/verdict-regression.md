# Verdict regression

What you get: how to find the exact commit that moved a verdict, how to decide whether
the move is a bug or an intentional change, and what to write in the PR.

---

## What counts as a verdict change

Any of these, for any `(seed, dilemmaId, panel)`:

| Change | Severity |
| --- | --- |
| `winnerId` — a different option won | **Breaking.** Never accidental |
| `margin` — by more than the jitter bound, `0.05` | Breaking |
| `decidingAxis` | Breaking |
| `confidence` | Breaking |
| `participating` | Breaking |
| `dissent.dissenters` — who dissented | Breaking. It is the most-read part of the result |
| `synthesis` — appeared, vanished, or changed source | Breaking |
| `traces[].total` — any value | Breaking. The trace **is** the answer |
| `traces[].contributions[].product` | Breaking |
| `ballots[].total` or `.share` | Breaking |
| A trace's `moveId` — a different move was selected | Breaking |
| `utilonBand` | Breaking |
| `narrative[]` prose | Breaking. It is rendered |
| `margin` by less than `0.05` | Not a change — that is within the jitter bound |

**The last row is the one people get wrong.** `JITTER = 0.05` in
`packages/core/src/council/deliberation.ts`, so two runs at different seeds differ by up
to `0.05` per trace. A `margin` moving by `0.03` is noise. A `margin` moving by `0.06`
is not.

`winnerId` changing is always breaking, even by a hair, because the rendered verdict text
changes.

---

## Before you bisect: reproduce it

You cannot bisect a regression you cannot reproduce. Fix the triple first.

```bash
bun run dev   # in one terminal
```

```bash
# 1. Reproduce the change.
curl -s -X POST http://localhost:3000/api/deliberate \
  -H 'content-type: application/json' \
  -d '{"dilemmaId":"d01","advisorIds":["kant","bentham","bostrom","held"],"seed":2406}' \
  | jq '{winnerId, margin, confidence, decidingAxis, participating}'

# 2. Reproduce it AGAIN and diff. If these differ, you have a determinism bug,
#    not a verdict regression — stop and go to determinism-and-seeds.md.
a=$(curl -s -X POST http://localhost:3000/api/deliberate -H 'content-type: application/json' \
      -d '{"dilemmaId":"d01","advisorIds":["kant","bentham","bostrom","held"],"seed":2406}')
b=$(curl -s -X POST http://localhost:3000/api/deliberate -H 'content-type: application/json' \
      -d '{"dilemmaId":"d01","advisorIds":["kant","bentham","bostrom","held"],"seed":2406}')
diff <(echo "$a" | jq -S .) <(echo "$b" | jq -S .) && echo "deterministic"

# 3. Record the before-state as a fixture. You will need it in the PR.
echo "$a" | jq '{dilemmaId, seed, winnerId, margin, confidence, decidingAxis, participating,
                ballots: [.ballots[] | {optionId, total, share}],
                dissenters: [.dissent.dissenters[].advisorId]}'
```

`git stash` your work if you need the pre-change state. Otherwise capture the *after*
state now and diff against `main` later.

### Write a regression test first

```ts
// packages/core/src/council/deliberation.test.ts
import { describe, expect, it } from "vitest";
import { DILEMMAS, ADVISORS, KINGDOMS, SEED, getAdvisor, getKingdom } from "@repo/seed";
import { runCouncil } from "./deliberation";

it("pins the d01 verdict at seed 2406", () => {
  const advisors = ["kant", "bentham", "bostrom", "held"]
    .map(getAdvisor)
    .filter((a): a is NonNullable<typeof a> => a !== undefined);
  const kingdoms = KINGDOMS.filter((k) => advisors.some((a) => a.kingdomId === k.id));

  const result = runCouncil({
    dilemma: DILEMMAS[0]!,
    advisors,
    kingdoms,
    seed: SEED,
    rounds: 3,
    quorum: 2,
  });

  expect(result.winnerId).toBe("REPLACE-ME");
  expect(result.decidingAxis).toBe("REPLACE-ME");
  expect(result.margin).toBeCloseTo(0.0, 4);   // paste the real margin
});
```

Run it. It should fail against your branch — that is the point. If it passes, you have
not reproduced the regression and everything below is wasted.

---

## Bisect

`git bisect` is load-bearing in this repository for a reason `getting-started.md`
names: *"Workspaces, seed history and `git bisect` are all load-bearing here."*

```bash
git bisect start
git bisect bad                 # your HEAD — the change is here
git bisect good v0.1.0         # the last known-good tag
git bisect run <your command>
```

**The command must be a script, not an interactive call.** Write one:

```bash
# scripts/check-verdict.sh   (or a .mjs in /tmp — keep it out of the repo)
bun --eval "
  const s = await import('./packages/seed/src/index.ts');
  const c = await import('./packages/core/src/index.ts');
  const advisors = ['kant','bentham','bostrom','held']
    .map(s.getAdvisor).filter(Boolean);
  const kingdoms = s.KINGDOMS.filter(k => advisors.some(a => a.kingdomId === k.id));
  const r = c.runCouncil({
    dilemma: s.DILEMMAS[0],
    advisors,
    kingdoms,
    seed: s.SEED,
    rounds: 3,
    quorum: 2,
  });
  process.exit(r.winnerId === 'EXPECTED' ? 0 : 1);
"
```

Then:

```bash
chmod +x scripts/check-verdict.sh
git bisect run ./scripts/check-verdict.sh
```

`git bisect run` exits 0 for "good" and 1–127 for "bad". Anything in 128–255 aborts
the bisect — which is what you want for a build failure, so **make sure your script
exits non-zero for a broken build**, not zero.

On finish:

```bash
git bisect log       # save this — it is the evidence
git bisect reset
```

**Mark intermediate `bad` commits carefully.** A content-only commit that touches
`dilemmas.ts` almost always moves the verdict; a docs commit never does. If `git bisect
run` lands on a merge commit, use `git bisect skip` rather than guessing.

---

## Reading the culprit

```bash
git show --stat <sha>
git show <sha> -- packages/seed/src/ packages/core/src/
```

Then classify. There are exactly five causes.

### Cause 1 — an axiom vector or option delta changed

Most common by far, and usually legitimate.

```bash
git diff <sha>~1 <sha> -- packages/seed/src/dilemmas.ts packages/seed/src/advisors.ts packages/seed/src/kingdoms.ts
```

Look at the `axioms` block or the `deltas` block. If a number moved by `0.01` and the
verdict flipped, that is not a bug — it is the margin being thin, and it is worth
saying so in the PR because it tells you the verdict is not robust.

### Cause 2 — `ADVISOR_KINGDOM_BLEND` changed

`packages/core/src/ethics/axioms.ts`. Affects every advisor with a bench. Rare, and
always intentional; it needs an ADR.

### Cause 3 — `JITTER` changed

`packages/core/src/council/deliberation.ts`. Every trace's `total`.

**And `/method` renders the old number.** `apps/web/src/app/method/page.tsx` contains:

```
jitter = seeded(seed, a.id, o.id) * 0.05   # ± 0.05, decorrelated streams
```

as a string literal. Change `JITTER` and the method page lies, with nothing to catch
it. Fix both, or neither.

### Cause 4 — `AXIOM_KEYS` order changed

`packages/seed/src/types.ts`. Every dot product, every ranking, every trace. **This
needs a new ADR** — see [ADR 0007](../adr/0007-choosing-the-six-axis-names.md), and
`architecture.md`'s table of "a new axis" work, which lists it as needing changes to
seed data, the Python contracts, the Rust crate, tie-breaks, SVGs and the palette.

### Cause 5 — move selection changed

A new move, a changed `weight`, or a changed `appliesTo` changed which move the engine
picks. `matchingMoves` filters by tag and sorts by `weight` descending then
`id.localeCompare`:

| Symptom | Cause |
| --- | --- |
| `traces[].moveId` changed, scores identical | Move selection |
| An advisor is silent on a dilemma | Their applicable moves have `appliesTo: []` — an empty array means *always available*, not *never* |
| A different move won round 2 | An objection's `appliesTo` now names a different rival's id |

---

## Deciding: bug or intentional?

Three questions, in order.

### 1. Is the new verdict wrong?

Compare against the dilemma's `lesson` and the advisors' `axioms`. The `d01` lesson is:

> Every specification you can measure well enough to optimise will eventually be
> optimised better than the thing you meant.

If the new verdict ships the paperclip optimiser, the case reads wrong even though the
arithmetic is right. **A wrong verdict is a data bug, not a formula bug** — look at
`option.deltas`.

### 2. Is the change explainable from the commit message?

`git log -1 --format=%B <sha>`. A commit that says "fix: tighten the paperclip case's
risk numbers" and moves a verdict is expected. A commit that says "docs: clarify the
court copy" and moves one is a **smoking gun**: something unintended changed.

### 3. Is the margin thin?

```bash
# Paste the two ballot totals here
jq '[.ballots[] | {optionId, total}]' 
```

A verdict decided by `0.004` is one content edit away from flipping. Say so in the PR.
It is the most useful sentence you can add:

> This verdict now turns on a `0.007` margin. It was `0.19` before. The case is no
> longer robust and a future delta edit will move it again.

---

## Writing the PR block

`CONTRIBUTING.md` requires three things. The fourth is this runbook's suggestion.

```
### Determinism block

seed:     2406
dilemma:  d01 (The Paperclip maximiser)
panel:    kant, bentham, bostrom, held
rounds:   3   quorum: 2

before:   winnerId      "withdraw"
          margin        0.1902
          decidingAxis  "rights"
          dissenters    [ kant, bentham ]
          ballots       [ withdraw 1.9834, cap-and-monitor 1.7932 ]

after:    winnerId      "cap-and-monitor"
          margin        0.0087
          decidingAxis  "care"
          dissenters    [ kant, bentham, bostrom ]
          ballots       [ cap-and-monitor 1.8021, withdraw 1.7934 ]

cause:    `withdraw.deltas.care` 0.66 -> 0.48, packages/seed/src/dilemmas.ts:96.
          This is a deliberate correction. The option's argument is a refusal to
          keep an obligation running for people already relying on the assistant,
          and 0.66 scored it as if the obligation were optional.

margin:   Now 0.0087, down from 0.1902. The case is no longer robust; a future
          delta edit will move it again. Flagged so a later contributor is not
          surprised.
```

### The four things a reviewer looks for

| Check | Fails when |
| --- | --- |
| Is the `cause` a **file and a line**? | "I changed the numbers" is not a cause |
| Does the cause match the commit's stated purpose? | A docs commit with a verdict change is never intentional |
| Is the before/after stated at **4 dp**? | Fewer digits hides sub-jitter moves |
| Is the new margin acknowledged? | A thin margin is information the next contributor needs |

---

## Preventing it

Four habits, in order of how much they help.

### Pin canon verdicts

Add a test per dilemma that a reader might cite. Ten is plenty; twenty is better.

```ts
// The verdicts rendered on /dilemmas/[slug] use a hard-coded seed: 2406.
// If these move, the page changes, and the page is what people screenshot.
it.each([
  ["d01", "cap-and-monitor"],
  ["d02", "…"],
])("pins %s", (id, winner) => {
  // …
});
```

`apps/web/src/app/dilemmas/[slug]/page.tsx` calls `convene({ …, seed: 2406 })` with a
**literal**, not `SEED`. It is the canonical verdict a reader sees, so it is the one to
pin.

### Keep the trace assertions

Asserting only `winnerId` misses a change to every score in the trace. If the move was
intended, assert `margin` and `decidingAxis` too. If it was a data correction that
should not have touched the arithmetic, assert a trace `total` and catch it.

### State the seed in every content PR

Not only when the verdict moved. The seed is the first thing anyone needs to reproduce
your case, and putting it in the description saves a round trip.

### Re-run the generators

```bash
bun run assets
bun run diagrams
git status
```

If `AXIOM_KEYS` or a `hue` changed, a committed SVG changed too, and
`asset-check.yml` will fail the PR without it.

---

## Related

- [`../guides/determinism-and-seeds.md`](../guides/determinism-and-seeds.md) — every
  stochastic path, and the jitter bound that decides noise from change
- [`incident-triage.md`](incident-triage.md) — if you cannot reproduce it twice
- [`../guides/contributing-guide.md`](../guides/contributing-guide.md) — the PR
  requirements
- [`../api/rest-api.md`](../api/rest-api.md) — the exact response fields to diff
- [`../api/core-modules.md`](../api/core-modules.md) — what each function in the bisect
  does
- [ADR 0002](../adr/0002-six-axis-axiom-vector.md),
  [ADR 0004](../adr/0004-deterministic-seeded-deliberation.md),
  [ADR 0007](../adr/0007-choosing-the-six-axis-names.md) — the decisions a verdict
  change usually touches