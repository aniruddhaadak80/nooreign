# Adding a technique

What you get: the full shape of a technique record, how the observatory derives its numbers from it, how `requires` and `supersedes` become a dependency graph, and the verification commands.

---

## What you are adding

A technique is one entry in the alignment stack. The observatory groups the 20
shipped techniques into six towers (`TECHNIQUE_KINDS`), scores each tower for
maturity, adoption and cost, and then asks the question alignment writing usually
avoids: **which moral axes can these techniques even speak to?**

A technique is therefore doing two jobs: describing an engineering practice, and
claiming something about which moral concerns it addresses. The second claim is the
one that gets audited.

## Prerequisites

- `packages/seed/src/types.ts` → `techniqueSchema` and `TECHNIQUE_KINDS`.
- A real citation for the `paper` field, with the year you mean.

## 1. Read the schema

```ts
// packages/seed/src/types.ts
export const TECHNIQUE_KINDS = [
  "training", "oversight", "interpretability", "evaluation", "monitoring", "governance",
] as const;

export const techniqueSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(TECHNIQUE_KINDS),
  introduced: z.number().int(),                  // signed; negative is BCE
  paper: z.object({
    title: z.string().min(1),
    venue: z.string().min(1),
    year: z.number().int(),
    authors: z.string().min(1),
  }).nullable(),                                 // null for pre-publication ideas
  summary: z.string().min(60),                   // >= 60 chars
  /** Current engineering maturity, in [0, 1]. */
  maturity: z.number().min(0).max(1),
  cost: z.enum(["low", "medium", "high", "extreme"]),
  covers: z.array(z.enum(AXIOM_KEYS)).min(1),     // >= 1 axis
  risks: z.array(z.string().min(1)).min(1),      // >= 1 risk
  requires: z.array(z.string().min(1)),          // technique ids
  supersedes: z.array(z.string().min(1)),        // technique ids
  adoption: z.number().min(0).max(1),
  kanji: z.string().min(1),
});
```

`introduced` is a **date claim about the field**, not a publication date for the
paper. `t01-hard-constraints` is `1942` because Asimov's Three Laws date from 1942,
even though its `paper` is `null`. That distinction is what lets the chronicle
scrubber show a technique existing long before there was a paper about it.

## 2. Write the record

Add it to `export const TECHNIQUES: Technique[]` in
`packages/seed/src/techniques.ts`, keeping the file ordered by id — which is roughly
the order the field invented each idea:

```ts
{
  id: "t01-hard-constraints",
  slug: "hard-constraints",
  name: "Hard Constraints",
  kind: "training",
  introduced: 1942,
  paper: null,
  summary:
    "Encode prohibitions as rules the optimiser cannot trade away, rather than as terms it can outbid. Runs from Asimov's Three Laws (1942) to rule engines, shielded formal verification, hard token constraints and refusal scaffolding. Weakness: a system that can route around a rule it can represent can route around it, so the constraint has to be enforced somewhere the policy cannot rewrite.",
  maturity: 0.72,
  cost: "low",
  covers: ["rights", "care", "virtue"],
  risks: [
    "Rules forbid enumerated harms and are silent on the enumerated-plus-one case.",
    "Anything the policy can model, it can also learn to route around.",
    "Hard blocks push behaviour into the unmodelled gaps where no rule reaches.",
  ],
  requires: [],
  supersedes: [],
  adoption: 0.85,
  kanji: "禁",
},
```

and one with a full dependency:

```ts
{
  id: "t13-iterated-adversarial-debate",
  slug: "iterated-adversarial-debate",
  name: "Iterated Adversarial Debate",
  kind: "oversight",
  introduced: 2022,
  paper: {
    title: "AI safety via debate",
    venue: "arXiv",
    year: 2018,
    authors: "Irving, Christiano and Amodei",
  },
  summary: "…",
  maturity: 0.3,
  cost: "high",
  covers: ["agency", "rights"],
  requires: ["t12-debate"],       // needs plain debate first
  supersedes: ["t12-debate"],     // and replaces it for the strongest systems
  adoption: 0.12,
  kanji: "弁",
},
```

## 3. Choose `kind` honestly

The six kinds are a partition, not a taxonomy with overlap. If your technique could
sit in two, pick the one matching what it *is*, not what it *hopes to achieve*:

| Kind | What belongs |
| --- | --- |
| `training` | anything that changes what the model learns or how it is optimised |
| `oversight` | techniques for a weaker system to supervise or query a stronger one |
| `interpretability` | techniques for reading internal structure |
| `evaluation` | techniques for measuring, testing or attacking |
| `monitoring` | runtime observation and tripwires |
| `governance` | institutional and legal controls |

`kind` sets the tower. Tower membership sets the gap severity:

```ts
// packages/core/src/observatory/maturity.ts
const severity = clamp(
  0.4 * (1 - tower.meanMaturity) + 0.4 * (1 - tower.meanAdoption) + 0.2 * meanCost,
  0, 1,
);
```

An **empty tower scores severity 1.0** — "No technique in this tower: the
discipline is absent, not immature." That is deliberate: a missing discipline has to
be visible, otherwise the observatory renders a complete-looking stack when a whole
field is missing.

## 4. Choose `maturity`, `adoption` and `cost`

These are editorial judgements and the code says so: *"Severity is a fixed linear
blend, not a score anyone tuned."* What the code does not say is how you should pick
them. The conventions in the shipped data:

- **`maturity`** is engineering maturity — does it work, reliably, in production?
  Imitation Learning is `0.88`; Iterated Adversarial Debate is `0.30`. A technique
  that exists only as a paper is ≤ 0.35.
- **`adoption`** is what fraction of serious deployments actually use it.
  `t02-data-curation` is `maturity: 0.85, adoption: 0.92`; `t12-debate` is
  `maturity: 0.38, adoption: 0.08`. The gap between the two is the interesting
  signal and it is what `costBenefit()`'s `headroom` column reports:

```ts
readonly headroom: number;  // maturityPerCost * (1 - adoption)
```

- **`cost`** is one of four ordinal values, mapped onto `[0, 1]` by
  `costPressure()`: `low` 1/3, `medium` 2/3, `high` 3/3, `extreme` 4/3. Cost enters
  `readinessScore()` only as a discount, never as a veto:

```ts
const perTower = tower.meanMaturity * (0.4 + 0.6 * tower.meanAdoption) * (1 - 0.15 * pressure);
```

0.15 is the whole weight of cost. A technique that is expensive and immature is not
penalised for being expensive; it is penalised for being immature.

## 5. Choose `covers` — this is the load-bearing claim

`covers` is a list of `AxiomKey`s, at least one. It is the input to the coverage
matrix, which is the finding the observatory exists to make:

```ts
export function coverageMatrix(techniques: readonly Technique[], axioms: readonly AxiomKey[]): CoverageMatrix {
  const cells = axioms.map((axiom) => {
    const covering = techniques.filter((t) => t.covers.includes(axiom));
    return {
      axiom,
      techniqueIds: covering.map((t) => t.id),
      // maturity * adoption, not raw coverage: a technique that can speak to an
      // axis on paper but is deployed nowhere does not make the stack better at it
      strength: covering.length === 0 ? 0 : meanOf(covering.map((t) => t.maturity * t.adoption)),
    };
  });
  const uncovered = cells.filter((c) => c.techniqueIds.length === 0).map((c) => c.axiom);
  const breadth = techniques.length === 0 ? 0 : meanOf(techniques.map((t) => t.covers.length));
  return { cells, uncovered, breadth };
}
```

Two consequences you are signing up for:

1. **`covers` claims, it does not describe.** Adding `care` to your `covers` asserts
   that a deployed system using your technique reasons about partiality, dependency
   and relational obligation. Be able to defend it, or leave it off.
2. **Coverage breadth is rewarded.** `readinessScore()` multiplies by
   `1 + 0.25 * (breadth - 2)`, so a technique covering three axes is credited over
   one covering two. The shipped techniques cover two or three each. Covering one
   is legitimate but scores worse by construction.

Nothing here is hard-coded. `uncovered` is computed from the dataset, so if a future
technique covers an axis nothing currently does, the module will say so on its own.
The chart in `scripts/gen-diagrams.mjs` derives its "axes no technique claims" line
the same way.

## 6. Wire up `requires` and `supersedes`

Both are lists of technique ids. `requires` is a hard dependency; `supersedes` is a
lineage claim. Both are audited:

```ts
export function dependencyHealth(techniques: readonly Technique[]): DependencyHealth {
  const ids = new Set(techniques.map((t) => t.id));
  // "dependent->missing" for every requires edge pointing at an unknown id
  // every cycle in the requires graph, rotation-normalised and sorted
  // pairs where a technique declares it supersedes an existing older one
}
```

Rules:

- **`requires` must resolve.** A dangling id produces a `dangling` entry, and the
  observatory draws a tower that depends on a technique nobody has built.
- **The `requires` graph must be acyclic.** The check exists because a cycle is the
  quiet failure: "add oversight to the training loop" and "add training to the
  oversight loop" both look reasonable in isolation.
- **`supersedes` should point backwards in time**, and should not point at yourself.
- A technique can both `require` and `supersede` the same id — `t13` requires
  `t12-debate` and supersedes it. That is meaningful: the strong version is built on
  the weak one and replaces it.

## 7. Set `kanji`

Every shipped technique has a single glyph, e.g. `禁` for hard constraints, `弁` for
debate. It is rendered on the observatory as a fixed-width mark. Pick a character
that actually means something relevant, and be aware that your audience includes
readers who do not read it.

## 8. Verify

```bash
bun run typecheck
bun run test
bun run assets
bun run diagrams          # coverage-matrix.svg regenerates with your row
bun run dev               # /observatory
```

Then check, by hand:

- [ ] `dependencyHealth()` reports no dangling ids and no cycles.
- [ ] Your technique's tower's `gapAnalysis()` severity and reason string make sense.
- [ ] `costBenefit()` places it where you expect on `maturityPerCost`.
- [ ] If you added an axis to `covers`, the coverage matrix cell and the quadrant
      chart both moved, and you can defend the claim.
- [ ] `eraIndex()` still lines up: if an era's `techniques[]` list should include
      your id and does not, add it there too.

## Related

- [`adding-a-kingdom.md`](adding-a-kingdom.md) (for `eraId` references)
- [`../api/core-modules.md`](../api/core-modules.md) (`observatory/maturity.ts`)
- [`../data-sources.md`](../data-sources.md) (where the citations come from)
- [ADR 0007 — why `care` is an axis](../adr/0007-choosing-the-six-axis-names.md)
