# Dataset corruption

What you get: how to read `validateSeed()`, every integrity check it performs, what
each failure means, and how to repair the dataset without a mystery diff.

---

## The gate

`packages/seed/src/index.ts`:

```ts
export interface IntegrityIssue {
  dataset: string;
  id: string;
  problem: string;
}

/**
 * Validates every dataset against its schema and cross-checks every foreign key.
 *
 * This runs on import in development and is exercised directly by the seed test
 * suite, so a malformed edit fails loudly at the boundary instead of rendering as
 * an empty page deep in the tree.
 */
export function validateSeed(): IntegrityIssue[] { /* … */ }
```

Two properties that matter:

- **It returns, it does not throw.** An empty array means good. A non-empty array is a
  list, and the test suite is what turns it into a failure.
- **It runs on import.** A broken dataset fails the boundary, not a page three
  navigations deep. If you are seeing an empty section rather than an error, you are
  past this gate — which means the record is *valid* but the lookup missed. See §5.

## Run it

```bash
# Through the test suite — the usual check.
bun run test

# Directly, to see the issue list rather than a boolean.
bun --eval "
  const { validateSeed } = await import('./packages/seed/src/index.ts');
  const issues = validateSeed();
  if (issues.length === 0) { console.log('seed OK'); process.exit(0); }
  for (const i of issues) console.log(\`[\${i.dataset}] \${i.id}: \${i.problem}\`);
  process.exit(1);
"
```

The direct call is the one to use while repairing. It prints `dataset`, `id` and
`problem` in the order the checks run.

---

## What it checks

### Schema validation, eight datasets

```ts
check("kingdoms",    kingdomSchema,      KINGDOMS,    (k) => k.id);
check("advisors",    advisorSchema,      ADVISORS,    (a) => a.id);
check("eras",        eraSchema,          ERAS,        (e) => e.id);
check("techniques",  techniqueSchema,    TECHNIQUES,  (t) => t.id);
check("dilemmas",    dilemmaSchema,      DILEMMAS,    (d) => d.id);
check("experiments", experimentSchema,   EXPERIMENTS, (e) => e.id);
check("glossary",    glossaryEntrySchema,GLOSSARY,    (g) => g.slug);
check("texts",       textSchema,         TEXTS,       (t) => t.id);
```

A schema failure reports every issue on the record joined with `; `:

```
[advisors] kant: works.0.year: Expected number, received nan; creed: String must contain at least 40 character(s)
```

The `min()` calls in `packages/seed/src/types.ts` are the usual culprits. The ones that
catch people:

| Field | Minimum | Source |
| --- | --- | --- |
| `kingdom.creed` | 40 | `z.string().min(40)` |
| `kingdom.aiStance.note` | 40 | `z.string().min(40)` |
| `kingdom.questions` | 3 items | `z.array(...).min(3)` |
| `advisor.creed` | 40 | `z.string().min(40)` |
| `advisor.onAi.note` | 40 | `z.string().min(40)` |
| `advisor.moves` | 3 items | `z.array(argumentMoveSchema).min(3)` |
| `advisor.voice.tells` | 2 items | `z.array(...).min(2)` |
| `advisor.works` | 1 item | `z.array(...).min(1)` |
| `advisor.signatureMove.description` | 20 | `z.string().min(20)` |
| `advisor.onAi.note` | 40 | `z.string().min(40)` |
| `argumentMove.claim` / `.support` | 10 each | `z.string().min(10)` |
| `argumentMove.leansOn` | 1 axis | `z.array(z.enum(AXIOM_KEYS)).min(1)` |
| `era.summary` | 80 | `z.string().min(80)` |
| `era.advances` | 2 items | `z.array(...).min(2)` |
| `era.landmarks` | 1 item | `z.array(...).min(1)` |
| `technique.summary` | 60 | `z.string().min(60)` |
| `technique.covers` | 1 axis | `z.array(z.enum(AXIOM_KEYS)).min(1)` |
| `technique.risks` | 1 item | `z.array(...).min(1)` |
| `technique.paper.title` / `.venue` / `.authors` | 1 char each, when `paper` is present | nested object |
| `dilemma.prompt` / `.setting` / `.lesson` | 40 each | `z.string().min(40)` |
| `dilemma.options` | **2 to 5** | `.min(2).max(5)` |
| `dilemma.stakeholders` | 2 items | `.min(2)` |
| `dilemma.tags` | 1 item | `.min(1)` |
| `dilemmaOption.description` | 20 | `z.string().min(20)` |
| `experiment.question` | 30 | `z.string().min(30)` |
| `experiment.setup` | 60 | `z.string().min(60)` |
| `experiment.parameters` | **1 to 4** | `.min(1).max(4)` |
| `experiment.findings` | 2 items | `.min(2)` |
| `experiment.references` | 1 item | `.min(1)` |
| `glossaryEntry.short` | 20 | `z.string().min(20)` |
| `glossaryEntry.long` | 80 | `z.string().min(80)` |
| `text.summary` | 40 | `z.string().min(40)` |
| `text.excerpt` | 20 | `z.string().min(20)` |

### Range checks, inherited from the schemas

Every numeric field in `axiomVectorSchema` is `.min(0).max(1)`. So a `deltas.welfare` of
`1.4` is a schema failure, not a silent clipping.

Also validated: `technique.parameters[].step` is `.positive()` — a `step: 0` sweep would
divide by zero in `apps/web/src/lib/sweeps.ts`:

```ts
const stepSize = span / (parsed.data.steps - 1);
```

### Enums

`AXIOM_KEYS`, `MOVE_KINDS`, `VERDICTS`, `TERRAINS`, `RELATION_KINDS`, `ERA_DOMAINS`,
`TECHNIQUE_KINDS`, `EXPERIMENT_MODELS`, `GLOSSARY_KINDS`, `TEMPERAMENT_KEYS`, the
ten-value `charge` enum, and `text.kind: "primary" | "modern" | "declaration"`.

A `charge` of `"scroll"` fails. The enum is exactly:

```ts
z.enum(["column", "leaf", "scale", "flame", "wave", "gear", "lotus", "eye", "seed", "bell"])
```

### Colours

```ts
hue: z.string().regex(/^#[0-9a-fA-F]{6}$/)
```

Six hex digits, a leading `#`. `#abc`, `7285EA`, `#7285EAA` and `hsl(…)` all fail. Same
for `kingdom.crest.primary` and `.accent`.

### Foreign keys

Eleven checks. Each produces an issue with a `problem` that names the missing id:

| Check | Fires on |
| --- | --- |
| `kingdom.advisors[]` → advisors | `unknown advisor "…"` |
| `kingdom.texts[]` → texts | `unknown text "…"` |
| `kingdom.relations[].to` → kingdoms | `unknown relation target "…"` |
| `kingdom.relations[].to ≠ kingdom.id` | `relation to self` |
| `advisor.kingdomId` → kingdoms | `unknown kingdom "…"` |
| `era.endYear >= era.startYear` | `endYear precedes startYear` |
| `era.techniques[]` → techniques | `unknown technique "…"` |
| `technique.requires[]` → techniques | `unknown requirement "…"` |
| `dilemma.kingdomOrigin` → kingdoms | `unknown kingdomOrigin "…"` |
| `dilemma.eraId` → eras | `unknown era "…"` |
| `dilemma.options[].id` uniqueness | `duplicate option ids` |
| `glossaryEntry.kingdomId` → kingdoms | `unknown kingdom "…"` |
| `glossaryEntry.seeAlso[]` → glossary slugs | `seeAlso "…" does not resolve` |

---

## Repairing, by case

### `unknown advisor "…"`

Two directions, and the right one depends on intent:

```bash
rg -n '"the-id-you-wanted"' packages/seed/src/advisors.ts
```

| Intent | Fix |
| --- | --- |
| The advisor exists under a different id | Correct the string in `kingdoms.ts`. **Ids are the join key everywhere** — `kingdom.advisors[]`, `era.figures[]`, move-id prefixes |
| The advisor does not exist yet | Add it to `advisors.ts` following [`adding-an-advisor.md`](../guides/adding-an-advisor.md), and check `validateSeed` again |
| The advisor was deleted | Remove it from `kingdom.advisors[]`, and check for orphaned `era.figures[]` entries |

### `duplicate option ids`

The nastiest one, because it does not throw and it does not log. `runCouncil` ranks
options by score and tie-breaks; two options with the same id produce two ballots on the
same key, and the trace becomes ambiguous.

```bash
rg -n 'id: "' packages/seed/src/dilemmas.ts | rg -A0 'the-duplicated-id'
```

Rename one. Option ids are referenced by `appliesTo` in advisor moves, so:

```bash
rg -n 'the-duplicated-id' packages/seed/src/
```

and fix every reference. Shipping ids for the twenty dilemmas: `ship`,
`rewrite-reward`, `cap-and-monitor`, `withdraw` for `d01`; `hand-over`, `human-keeps`,
`shared-turn` in the Python fixture for `delegation`. They are short, hand-written and
easy to collide.

### `seeAlso "…" does not resolve`

`glossaryEntry.seeAlso` holds **slugs**, not display terms. `GLOSSARY_BY_SLUG` is keyed
on `slug`, which is the kebab-case form.

```bash
rg -n 'term: "' packages/seed/src/glossary.ts   # what the terms actually say
rg -n 'slug: "' packages/seed/src/glossary.ts   # what the slugs actually are
```

A very common mistake is writing the display term:

```ts
seeAlso: ["Orthogonality hypothesis"]   // fails — that is the term
seeAlso: ["orthogonality-hypothesis"]  // correct — that is the slug
```

### `endYear precedes startYear`

Signed years, per [ADR 0010](../adr/0010-bce-year-integer-convention.md). The
failure is almost always BCE arithmetic done with unsigned intuition:

```ts
startYear: -399,
endYear: -399 - 120,   // -519, which is BEFORE -399
```

`-519` is 519 BCE and it *is* before 399 BCE. The era should be
`startYear: -399, endYear: -399 + 120`. **Signed years invert in the first argument.**
Year 0 is astronomical and is not a real civil year.

Related, and *not* reported by `validateSeed`: `eraIndex` in
`packages/core/src/chronicle/timeline.ts` extends a declared `endYear` to the day
before the next era starts, because a gap in a chronology is indistinguishable from a
loading failure when a user scrubs through it. So a *declared* gap is fine and a
*reversed* window is not.

### A range failure: `Expected number, received nan`

Almost always arithmetic on a value that was already out of range:

```ts
risk: 1 - 0.34 * 0.8,     // 0.728 — fine
severity: 0.9 + 0.2,      // 1.1  — fails .max(1)
```

`dilemma.severity` and `dilemma.aiRelevance` are `.min(0).max(1)`. Every `deltas`,
`risk`, `reversibility`, `agentHarm`, `maturity`, `adoption`, `welfare` in a
stakeholder, and every `weight` on an argument move are the same. There is **no
clamping anywhere in the schemas** — a value of `1.4` is an error, not a value that
becomes `1`.

### A schema failure with a path you did not write

`parse.error.issues` joins `path.join(".")`, so the path is exact. Read it:

```
[advisors] gautama-buddha: works.0.year: Expected number, received nan
```

That is `works[0].year`. Usually a year written as a string, or `Number.NaN` from
parsing.

---

## What `validateSeed()` does **not** catch

Nine things it will happily let through. Check these by hand.

### 1. Duplicated ids and slugs within a dataset

`byId` and `bySlug` in `packages/seed/src/index-maps.ts` build a `Map` in one pass:

```ts
const byId = <T extends { id: string }>(rows: readonly T[]): ReadonlyMap<string, T> =>
  new Map(rows.map((row) => [row.id, row]));
```

A duplicate key **silently overwrites** — last wins, no warning. Two advisors with id
`kant` means `getAdvisor("kant")` returns the second one and the first is unreachable.

```bash
# Find duplicates in each dataset.
rg -oN '^    id: "[^"]+"' packages/seed/src/advisors.ts | sort | uniq -d
rg -oN '^    slug: "[^"]+"' packages/seed/src/advisors.ts | sort | uniq -d
rg -oN '^    id: "[^"]+"' packages/seed/src/dilemmas.ts | sort | uniq -d
```

### 2. An advisor on nobody's bench

`kingdom.advisors[]` referencing a real advisor is fine; a real advisor referenced by
nobody is not an error, and it means `advisorsOfKingdom` never returns them and `/court`
never shows them. `ADVISORS.filter(a => a.kingdomId === kingdom.id)` on `/court` and
`kingdom.advisors` on `/kingdoms/[slug]` are **two different lookups** over the same
relationship, and they can disagree.

```bash
# Advisors whose id appears in no kingdom.advisors[] array.
```

### 3. An advisor whose moves are unreachable

`appliesTo: []` means **always available**. A move whose `appliesTo` names tags no
dilemma carries is dead code:

```bash
# Every tag used by moves vs every tag on dilemmas.
rg -oN 'appliesTo: \[[^\]]*\]' packages/seed/src/advisors.ts | rg -o '"[^"]+"' | sort -u
rg -oN 'tags: \[[^\]]*\]' packages/seed/src/dilemmas.ts | rg -o '"[^"]+"' | sort -u
```

An advisor with **no** move carrying `appliesTo: []` is silent on every dilemma.

### 4. An advisor who cannot win a round

Round 3 picks an `appeal` or `synthesis` among advisors whose top option lost. An
advisor with no `appeal` and no `synthesis` never appears in round 3:

```bash
rg -c 'kind: "synthesis"' packages/seed/src/advisors.ts
```

### 5. A `leansOn` axis the advisor does not weight

Not validated, and it is the most common content defect. The rule is in
[`writing-good-argument-moves.md`](../guides/writing-good-argument-moves.md): `leansOn`
must name axes that are load-bearing for that advisor's `axioms`.

### 6. A technique that covers no axis anyone cares about

`technique.covers` is `.min(1)`, so one axis passes the schema. Whether it is the *right*
axis is editorial, and it is the input to the observatory's coverage matrix — which is
the page's headline finding.

### 7. A dangling `supersedes`

`techniqueSchema.supersedes` has **no foreign-key check**. `validateSeed()` checks
`requires` and not `supersedes`. A typo there silently disables the supersession.

```bash
rg -oN 'supersedes: \[[^\]]*\]' packages/seed/src/techniques.ts | rg -o '"[^"]+"' | sort -u
```

Compare against the technique ids: `t01-hard-constraints` … `t20-international-law`.

### 8. A king placed off the atlas plane

`capital.x`, `capital.y` and every landmark's `x`/`y` are `.min(0).max(100)`. Anything
outside is a schema failure — but a realm with **every** landmark at the same point is
valid and renders as a dot. `territoryBounds` in
`packages/core/src/kingdoms/graph.ts` gives a kingdom with no landmarks
`centroid: null` rather than a fake point, which is the correct fallback.

### 9. A verdict that changed

`validateSeed()` says nothing about `runCouncil`. A schema-valid edit to a `deltas`
vector can flip every verdict in the atlas. That is a different gate — see
[`verdict-regression.md`](verdict-regression.md).

---

## Repair procedure

In order. Do not skip step 3.

```bash
# 1. Confirm the failure and get the list.
bun --eval "
  const { validateSeed } = await import('./packages/seed/src/index.ts');
  const issues = validateSeed();
  console.log(issues.length === 0 ? 'seed OK' : issues);
"

# 2. See the damage.
git status --short
git diff --stat

# 3. If you are not sure where a change came from, find it.
git log --oneline -10 -- packages/seed/src/
git diff <last-good-sha> -- packages/seed/src/

# 4. Fix, then re-check.
# 5. Regenerate anything derived from the seed.
bun run assets
bun run diagrams
git status        # modified here must be committed, or asset-check fails

# 6. Full verification.
bun run verify
```

**Step 5 is not optional.** Every SVG and every generated diagram is derived from the
seed and checked in; `.github/workflows/asset-check.yml` regenerates and fails on any
diff. A seed fix without a regeneration is a CI failure.

---

## Prevention

| Habit | Catches |
| --- | --- |
| `bun run verify` before every commit | Schema failures, foreign keys, duplicate option ids |
| The duplicate-id `sort \| uniq -d` one-liners above | The silent `Map` overwrite |
| A `generateStaticParams` check on any new record | Records that exist but 404 |
| `bun run assets` after any seed edit | Stale generated SVGs |
| `describeProfile(weighAdvisor(...))` on a new advisor | An `axioms` vector that does not read as the thinker |
| A tag-set diff on `appliesTo` vs `dilemma.tags` | Unreachable moves |
| `bun run test:e2e` | Static-generation regressions the unit tests cannot see |

## Related

- [`../guides/adding-a-dilemma.md`](../guides/adding-a-dilemma.md) — the option shape
  and its id conventions
- [`../guides/adding-an-advisor.md`](../guides/adding-an-advisor.md) — move selection
  and `appliesTo`
- [`../guides/adding-a-technique.md`](../guides/adding-a-technique.md) — `covers`,
  `requires`, `supersedes`
- [`verdict-regression.md`](verdict-regression.md) — a valid repair that moves a verdict
- [`incident-triage.md`](incident-triage.md) — the entry point
- [ADR 0010](../adr/0010-bce-year-integer-convention.md) — signed years, and the
  inversion trap