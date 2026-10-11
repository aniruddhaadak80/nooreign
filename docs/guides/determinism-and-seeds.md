# Determinism and seeds

What you get: every stochastic path in the repository, where the seed `2406` comes
from, exactly which stream key produces which jitter, and how to regenerate anything
that drifted.

---

## The one rule

> A deliberation is a **pure function of `(seed, dilemmaId, optionId)`**. The committed
> seed is `2406`.

From `CONTRIBUTING.md`:

> That guarantee is what makes the atlas a simulation rather than an opinion — and it
> is why **any change that alters a verdict is a breaking change**, even if every test
> still passes.

`packages/seed/src/index.ts`:

```ts
/** The seed every generated artefact in this repo is derived from. */
export const SEED = 2406;
```

CI carries the same number as an env var, with the reason in a comment:

```yaml
env:
  # Deterministic generation: every committed artefact must be reproducible
  # from this seed (packages/seed/src/index.ts SEED = 2406).
  NOOREIGN_SEED: "2406"
```

## The seed's provenance

The number is recorded, not chosen by a process anyone documented. What the repository
does say:

- It is **committed**, so a reader can cite it. `CHANGELOG.md` and the release payload's
  `BUILD_INFO.txt` carry it.
- It is **repeated in four places**, which is a maintenance hazard worth knowing about:

| Location | Form |
| --- | --- |
| `packages/seed/src/index.ts` | `export const SEED = 2406` |
| `apps/web/src/app/api/healthz/route.ts` | `seed: 2406` — a **literal** |
| `apps/web/src/app/dilemmas/[slug]/page.tsx` | `convene({ …, seed: 2406 })` — a **literal** |
| `apps/web/src/app/council/page.tsx` | `defaultSeed={SEED}` — the constant |
| `.github/workflows/ci.yml` | `NOOREIGN_SEED: "2406"` — a literal |
| `Dockerfile` build args / `docker-compose.yml` | *not present* — the seed is compile-time, not build-time |

Two of those are literals. Change `SEED` and `/api/healthz` and the dilemma page will
report and render a verdict at the old seed, silently. There is no test catching this
today. If you change it, change all four and grep:

```bash
rg -n '2406' packages/ apps/ .github/ docs/
```

**Why 2406.** The repository does not record a derivation for the number itself, and
this guide will not invent one. What is documented is its *role*: it is a fixed
identifier that must not be re-derived from content, because if the seed changed with
the dataset then every stored verdict, every generated SVG and every rendered page
would be invalidated by an unrelated content edit. Treat `2406` as an API version
number for the atlas. See [ADR 0004](../adr/0004-deterministic-seeded-deliberation.md).

---

## The PRNG

`packages/core/src/util/rng.ts`. Two primitives and a builder.

### `mulberry32(seed)`

```ts
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

Its own comment:

> Chosen because it is four lines, has no hidden tables, and is trivially portable,
> which matters more here than statistical sophistication.

### `hashString(s)` — FNV-1a, 32-bit

```ts
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
```

`charCodeAt` means **UTF-16 code units**. `services/agents/app/deliberation.py` ports
this exactly and says why it matters:

> JavaScript string hashing is over UTF-16 code units, so ids containing astral-plane
> characters must fold the same way here as they do there.

### `createRng(...parts)`

```ts
export function createRng(...parts: readonly (string | number)[]): Rng {
  const joined = parts.map((p) => String(p)).join("\u241f");
  const seed = hashString(joined);
  const nextFn = mulberry32(seed);
  // …
}
```

Parts are joined with **U+241F (SYMBOL FOR UNIT SEPARATOR)**, not a comma or a null
byte, so `createRng(1, "ab", "c")` and `createRng(1, "a", "bc")` produce different
streams. If you ever change the separator, every verdict in the repository changes.

The `Rng` interface: `next()`, `range(min, max)`, `int(min, max)`, `pick(items)`,
`shuffle(items)`, `gaussian(mean, sd)`, `fork(tag)`. Two behaviours worth knowing:

- **`pick` throws on an empty list.** `throw new RangeError("rng.pick: cannot pick from an empty list")`. Picking from nothing is a bug, not a state.
- **`shuffle` is Fisher-Yates on a copy.** The input array is never mutated.

---

## Every stochastic path

Six. Complete.

### 1. Council jitter — `JITTER = 0.05`

`packages/core/src/council/deliberation.ts`:

```ts
/** The largest perturbation any score may receive, in either direction. … */
export const JITTER = 0.05;
```

**Why it exists**, from the source: *"a philosopher who is off by a twentieth of their
own confidence is still a philosopher with a view. Anything larger would let the seed
decide verdicts, which would defeat the point of a transparent engine."*

**Stream key:** `jitterFor(seed, round, advisorId, optionId)`, i.e.
`createRng(seed, "r1", advisor.id, option.id)` for round 1. Round 2 and round 3 use
their own round label. Every draw is decorrelated — changing the option set does not
move an unrelated advisor's jitter.

**Round 1, verbatim from `runCouncil`:**

```ts
const scored = dilemma.options.map((option) => {
  const raw = scoreOptionWith(vector, option);
  const jitter = jitterFor(seed, "r1", advisor.id, option.id);
  return { optionId: option.id, raw: round(raw, 4), score: round(raw + jitter, 4) };
});
```

`raw` is the weight-normalised subtotal; `score` is `raw + jitter`, rounded to 4 dp
again. Both are carried on `RankedOption`, so you can always see what the seed did.

### 2. Experiment jitter — `JITTER_BOUND = 0.03`

`packages/core/src/experiments/simulator.ts`:

```ts
export const JITTER_BOUND = 0.03;

export const createJitterSource = (seed, model, bound = JITTER_BOUND): JitterSource => {
  return (key: string, value: number) => {
    const rng = createRng(seed, model, key, value);
    const raw = rng.next();
    const unit = Number.isFinite(raw) ? clamp(raw, 0, 1) : 0.5;
    return (unit * 2 - 1) * bound;
  };
};
```

**Stream key:** `createRng(seed, model, key, value)` — the **parameter value is part of
the seed**. The module header says why:

> one draw per metric per setting — so sweeping a driver walks independent noise
> instead of a smooth curve.

`JitterSource` is a *function*, not a raw `Rng`, and `chronicle-contract.md` explains
the design:

> Scorers receive a `JitterSource` (`(key, value) => number` in `[-0.03, 0.03]`) rather
> than a raw `Rng`: a single stream would make `goalCapture`'s noise a function of how
> many draws `humanControl` took.

**Why a function and not a number:** metric ordering inside a scorer would otherwise
leak. Each `(metric, value)` pair draws independently, so adding a metric to a scorer
cannot move an existing metric's noise.

### 3. The jitter budget cannot invert a sweep

The invariant, from `packages/core/src/chronicle-contract.md`:

> every driver contributes an independent signed term with `|coefficient| ≥
> MIN_DRIVER_COEFFICIENT = 0.35`. … a 0.25 step moves the base by ≥ 0.0875, the jitter
> budget is 0.06 peak-to-peak, so jitter can never invert a sweep.

Arithmetic: `0.35 × 0.25 = 0.0875` minimum base movement, against
`2 × 0.03 = 0.06` maximum peak-to-peak jitter. Margin: `0.0275`. The test suite asserts
this per driver rather than inferring it from noisy output.

`createJitterSource(seed, model, 0)` gives a scorer its deterministic base value, which
is how the invariant test steps through a driver without noise.

### 4. Experiment seed default — `hashString(experiment.id)`

```ts
const resolvedSeed = seed ?? hashString(experiment.id);
```

From the source: *"The one thing a replayable experiment may not be is 'the same when
you reload'."*

**This is not `SEED`.** An unseeded `/api/experiment` call uses a per-experiment hash,
not `2406`. It is still reproducible — the same experiment id always gives the same
seed — but it is a different stream from `/api/deliberate`. Pass `seed: 2406`
explicitly if you are comparing across surfaces.

### 5. Journal prompt selection

`packages/core/src/journal/prompts.ts`:

```ts
const rng = createRng(seed, kingdom.id, advisors.map((a) => a.id).join("|"));
```

**Stream key:** `(seed, kingdomId, "|"-joined sorted advisor ids)`. The joined roster
goes in the key, so the same court at the same seed always gets the same prompts, and a
different court gets different ones.

The count is fixed by construction, not by shuffle-and-truncate: the core block
contributes six, the second-advisor and dilemma blocks add up to four more, so the
range `[6, 10]` holds with no post-hoc clipping.

`closingRitual(advisorIds, winnerId?)` chooses by **a hash of the sorted roster**, so
re-ordering the input array does not change the ritual.

`packages/core/src/journal/prompts.ts` notes the suite runs forty seeds against a
banned-phrase list, which is the test that catches a prompt drifting into vagueness.

### 6. Search ordering

Not stochastic — but it is the place where determinism is most often *assumed* rather
than guaranteed, so it belongs here.

`packages/core/src/search/index.ts`:

```ts
hits.sort((a, b) => b.score - a.score || a.id.localeCompare(a.id));
```

**Score descending, then id ascending. Never insertion order.** From
`chronicle-contract.md`:

> Two documents that tie must appear in the same order on every machine, every render,
> forever; the suite proves it with two word-for-word identical documents.

`suggest` is the same shape: `b.df - a.df || a.term.localeCompare(a.term)`.

### What is *not* stochastic

For completeness, so nobody goes looking:

| Thing | Why it is deterministic |
| --- | --- |
| Every score, subtotal and total | `round(n, 4)`, no floating-point accumulation order dependence because the axis order is fixed |
| Every sort in the seed datasets | Explicit final tie-break on `id`, `slug`, `born` or `startYear` |
| Move selection | `matchingMoves` sorts by `weight` descending, then `id.localeCompare` |
| Graph topological order | Cycles canonicalised to the lexicographically smallest rotation |
| Territory partition | Nearest capital; ties by capital `id` |
| Voices | Templates over stored text; no selection at all |
| `progressOf` | Date-driven (`introduced <= endYear`), not list-driven |
| `highlightEras` | Top 8 by summed landmark weight, tie-broken on `startYear` then `id` |

---

## The determinism test suite

Not runnable as a single command — the invariants live in the per-module tests:

```bash
bun run test                 # everything, via turbo
bun run test:watch           # vitest --watch, turbo bypassed
```

The invariants asserted somewhere in `packages/core/src/**/*.test.ts`:

1. Two `runCouncil` calls with the same `CouncilInput` are deep-equal.
2. `Σ trace.contributions[].product === trace.subtotal` and `trace.total === subtotal + jitter`.
3. `|jitter| ≤ JITTER` for every trace.
4. `|experiment jitter| ≤ JITTER_BOUND` for every metric.
5. Per driver, a `0.25` step moves the base by ≥ `0.0875` — jitter cannot invert a sweep.
6. `createRng(seed, "ab", "c")` ≠ `createRng(seed, "a", "bc")`.
7. Two word-for-word identical documents return in id order.
8. Forty seeds of `reflectivePrompts` produce no banned phrase.

---

## Regenerating everything derived from the seed

Every committed artefact is derived and checked in. CI enforces it:
`.github/workflows/asset-check.yml` regenerates and fails on any diff.

```bash
bun run assets      # scripts/gen-assets.mjs — every SVG
bun run diagrams    # scripts/gen-diagrams.mjs — the generated diagrams
bun run loc         # scripts/loc-count.mjs — also the CI scale guardrail
```

Then:

```bash
bun run typecheck && bun run lint && bun run test && bun run build
# or all four:
bun run verify
```

If `asset-check` fails, the fix is always the same: run `bun run assets` locally and
commit the result. The error message in the workflow says exactly that.

---

## Reproducing a verdict yourself

With a running server:

```bash
bun run dev   # in one terminal
```

```bash
# The default panel, the committed seed.
curl -s -X POST http://localhost:3000/api/deliberate \
  -H 'content-type: application/json' \
  -d '{"dilemmaId":"d01","advisorIds":["kant","bentham","bostrom","held"],"seed":2406}' \
  | jq '{winnerId, margin, decidingAxis, participating}'

# Byte-identical twice. This is the determinism check.
a=$(curl -s -X POST http://localhost:3000/api/deliberate -H 'content-type: application/json' \
      -d '{"dilemmaId":"d01","advisorIds":["kant","bentham","held"],"seed":2406}')
b=$(curl -s -X POST http://localhost:3000/api/deliberate -H 'content-type: application/json' \
      -d '{"dilemmaId":"d01","advisorIds":["kant","bentham","held"],"seed":2406}')
[ "$a" = "$b" ] && echo "identical" || echo "DIVERGED"
```

Without a server, from a test:

```ts
import { DILEMMAS, ADVISORS, getAdvisor, KINGDOMS, SEED } from "@repo/seed";
import { runCouncil } from "@repo/core";

const dilemma = DILEMMAS[0];                       // d01
const advisors = ["kant", "bentham", "bostrom", "held"].map(getAdvisor).filter(Boolean);
const kingdoms = KINGDOMS.filter((k) =>
  advisors.some((a) => a?.kingdomId === k.id));

const result = runCouncil({ dilemma, advisors, kingdoms, seed: SEED, rounds: 3, quorum: 2 });
console.log(result.winnerId, result.margin, result.decidingAxis);
```

---

## Changing a verdict, on purpose

`CONTRIBUTING.md` is unambiguous:

> If your change can move a verdict:
>
> 1. State the **seed**, the **dilemma id** and the **option id**.
> 2. State the **verdict before** and the **verdict after**.
> 3. Say **why** the old verdict was wrong, or acknowledge that you are deliberately
>    changing a canon verdict.
>
> A pull request that changes deliberation output without that block will be held for
> clarification.

The full procedure is [`../runbooks/verdict-regression.md`](../runbooks/verdict-regression.md).

**Four edits that will move a verdict**, in rough order of blast radius:

| Change | Effect |
| --- | --- |
| `AXIOM_KEYS` order in `packages/seed/src/types.ts` | Every dot product, every ranking, every trace. Needs a new ADR — see [ADR 0007](../adr/0007-choosing-the-six-axis-names.md) |
| `ADVISOR_KINGDOM_BLEND` in `ethics/axioms.ts` | Every advisor with a bench |
| `JITTER` in `council/deliberation.ts` | Every trace's `total`, and `/method`'s rendered formula |
| Any `axioms` vector or `option.deltas` in `packages/seed/src/` | The scores that feed the ballot |

Also: **`/method` renders the score formula as a string literal.** Change `JITTER`
and the page lies, with nothing to catch it.

---

## Related

- [ADR 0004](../adr/0004-deterministic-seeded-deliberation.md) — why there is no
  model call
- [ADR 0010](../adr/0010-bce-year-integer-convention.md) — the signed-year
  convention, the other "determinism by convention" decision in the repo
- [`../runbooks/verdict-regression.md`](../runbooks/verdict-regression.md) — bisecting
  a verdict change
- [`../runbooks/dataset-corruption.md`](../runbooks/dataset-corruption.md) — when the
  seed itself is the problem
- [`../api/rest-api.md`](../api/rest-api.md) — the HTTP surface these rules protect