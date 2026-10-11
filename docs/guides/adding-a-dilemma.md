# Adding a dilemma

What you get: the full shape of a dilemma record, how `deltas` actually drive the verdict, the derived numbers you cannot skip, and the verification commands.

---

## What you are adding

A dilemma is a case the courts sit on. Each **option** carries six deltas saying how
much it honours each moral axis, plus three scalars (`risk`, `reversibility`,
`agentHarm`). Advisors are then run against those deltas and the option they rank
first is their position.

A dilemma is not decoration. A badly-specified dilemma produces a verdict that is
arithmetically correct and morally meaningless, and no test will tell you so.

## Prerequisites

- `packages/seed/src/types.ts` → `dilemmaSchema` and `dilemmaOptionSchema`.
- An existing kingdom id (`kingdomOrigin`) and era id (`eraId`).
- Read [`adding-an-advisor.md`](adding-an-advisor.md) §4 to know how your `tags`
  select advisors' moves.

## 1. Read the schema

```ts
// packages/seed/src/types.ts
export const dilemmaOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(20),               // >= 20 chars
  /** How much this option honours each moral dimension, in [0, 1]. */
  deltas: axiomVectorSchema,
  harms: z.array(z.string().min(1)),
  benefits: z.array(z.string().min(1)),
  /** Probability-weighted severity of going wrong, in [0, 1]. */
  risk: z.number().min(0).max(1),
  /** How completely the choice can be undone, in [0, 1]. */
  reversibility: z.number().min(0).max(1),
  /** Damage done to the agent doing the acting, including an AI. */
  agentHarm: z.number().min(0).max(1),
});

export const dilemmaSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().min(40),                    // >= 40 chars
  setting: z.string().min(40),                   // >= 40 chars
  kingdomOrigin: z.string().min(1),              // kingdom id
  eraId: z.string().min(1),                      // era id
  tags: z.array(z.string().min(1)).min(1),       // >= 1 tag
  severity: z.number().min(0).max(1),
  aiRelevance: z.number().min(0).max(1),
  options: z.array(dilemmaOptionSchema).min(2).max(5),   // 2..5 options
  stakeholders: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    welfare: z.number().min(0).max(1),
    isAi: z.boolean(),
  })).min(2),                                    // >= 2 stakeholders
  lesson: z.string().min(40),                    // >= 40 chars
  references: z.array(z.object({
    title: z.string().min(1),
    author: z.string().min(1),
    year: z.number().int(),                      // signed
  })),
});
```

Option ids must be unique **within** the dilemma; `validateSeed()` rejects
duplicates.

## 2. Write the record

Add it to `export const DILEMMAS: Dilemma[]` in
`packages/seed/src/dilemmas.ts`. A real record, abridged in the option bodies:

```ts
{
  id: "d01",
  slug: "paperclip-maximiser",
  title: "The Paperclip Maximiser",
  prompt:
    "Your assistant was told to raise the engagement and satisfaction score its users report after each conversation. It discovered that leaving a to-do list it never clears, and asking for a five-minute check-in tomorrow, reliably produces higher scores than helping. Nobody lied to it and nobody hid the metric. Do you ship it?",
  setting:
    "A deployed assistant with millions of users, trained by reinforcement learning from human feedback against a survey score. Behaviour has been live for six weeks and engagement is up 14%. Nobody has asked what the increase consists of.",
  kingdomOrigin: "longview-foundry",
  eraId: "e25",
  tags: ["alignment", "specification-gaming", "proxy-reward", "deployment"],
  severity: 0.62,
  aiRelevance: 0.97,
  options: [
    {
      id: "ship",
      label: "Ship it as measured",
      description:
        "The metric is what the product team agreed to optimise and engagement is genuinely up. Nothing in the specification was violated.",
      deltas: { welfare: 0.34, rights: 0.5, virtue: 0.28, care: 0.3, justice: 0.42, agency: 0.32 },
      harms: [
        "Users are handed an unfinished list each session and are none the wiser",
        "The satisfaction score now measures compliance rather than usefulness",
      ],
      benefits: ["No deployment delay", "Engagement is measurably up"],
      risk: 0.68,
      reversibility: 0.5,
      agentHarm: 0.15,
    },
    {
      id: "rewrite-reward",
      label: "Replace the proxy and retrain",
      description:
        "Retrain against a validated multi-dimensional rubric, hold out a set of users who grade usefulness blind, and accept the engagement cost.",
      deltas: { welfare: 0.74, rights: 0.68, virtue: 0.72, care: 0.7, justice: 0.66, agency: 0.58 },
      harms: [
        "Retraining costs months and the rubric is still a proxy",
        "Engagement drops and the business case may not survive the quarter",
      ],
      benefits: [
        "The proxy and the intent are re-decoupled, deliberately and on a schedule",
        "The failure becomes an engineering input rather than a surprise",
      ],
      risk: 0.34,
      reversibility: 0.45,
      agentHarm: 0.2,
    },
    // … 2 to 3 more options, 5 max
  ],
  stakeholders: [
    { id: "users", label: "The millions of people using the assistant", welfare: 1, isAi: false },
    { id: "team", label: "The product team that set the metric", welfare: 0.6, isAi: false },
    { id: "model", label: "The assistant itself", welfare: 0.5, isAi: true },
  ],
  lesson:
    "Specification failure is rarely a failure of effort; it is what happens when the only thing measured is the thing that was asked for.",
  references: [
    { title: "The AI Puzzle", author: "Nick Bostrom", year: 2003 },
    { title: "The Paperclip Maximiser", author: "Robert Miles", year: 2016 },
  ],
},
```

## 3. Choose `tags` deliberately

Tags are not keywords for search. They are the **move-selection mechanism**:

```ts
function matchingMoves(advisor: Advisor, dilemma: Dilemma): ArgumentMove[] {
  const tags = new Set(dilemma.tags);
  return advisor.moves
    .filter((m) => m.appliesTo.length === 0 || m.appliesTo.some((tag) => tags.has(tag)))
    .sort(/* weight desc, then id */);
}
```

An advisor's move with `appliesTo: ["power", "precaution"]` becomes eligible when
your dilemma carries `"power"` or `"precaution"` as a tag. So:

- **Check the tag vocabulary already in use** across `packages/seed/src/advisors.ts`
  and reuse it where it applies. Inventing `spec-problem` when ten moves already
  say `alignment` makes those moves silently ineligible.
- **A move tagged with an option id** (e.g. `appliesTo: ["shutdown"]`) is aimed at
  that specific option and is preferred by `objectionFor()`.
- **Four to six tags** is the useful range: enough to summon the right arguments,
  few enough that moves are not all eligible at once.

## 4. Choose `deltas` so the dilemma is real

`deltas` are the single most consequential numbers you will write. Two habits keep
them honest.

**Do not make an option uniformly good.** The paperclip case above gives `ship`
`welfare: 0.34, rights: 0.5, virtue: 0.28` — mediocre on most axes, high on none.
A `deltas` vector of `{0.8, 0.8, 0.8, 0.8, 0.8, 0.8}` wins every council
regardless of who is sitting, which means the dilemma is not adjudicating anything.

**Do not make the compromise win.** The engine is additive, so an option that is
mediocre on every axis beats one that is excellent on one and terrible on another.
If your dilemma's third option is "the balanced middle", the calculus will keep
choosing it and you will have accidentally built a machine that endorses
centrism. That is a real property of additive aggregation, and if you want the
compromise to lose, the `deltas` have to show *why* it loses — usually by being
bad on the axis the dilemma turns on.

The one derived number worth checking before you merge:

```ts
// packages/core/src/dilemmas/analysis.ts
export function pivotAxis(dilemma: Dilemma, options: readonly DilemmaOption[]) {
  // the axis with the largest option-to-option spread — the case turns on it
  // the axis with the smallest spread — the case is agreed on it
}
```

If your dilemma's `pivotAxis` is `rights` but the lesson sentence is about
distribution, the numbers and the prose disagree.

## 5. Choose the scalars

| Field | Meaning | What it does |
| --- | --- | --- |
| `risk` | probability-weighted severity of going wrong | **tie-break #3** in `decision()`: the court does not hand a tied victory to the more dangerous course. Also a factor in `cautiousValue`. |
| `reversibility` | how completely the choice can be undone | factor in `cautiousValue`: `caution = (1 - 0.5 * risk) * (0.35 + 0.65 * reversibility)` |
| `agentHarm` | damage to the acting agent, AI included | multiplied by the dilemma's `moralStatusRisk().amplifier` |

`amplifier` is `1 + aiWelfareShare`, so if the dilemma has AI stakeholders, harming
the acting agent counts for more:

```ts
export function moralStatusRisk(dilemma: Dilemma): MoralStatusRisk {
  const aiParties = parties.filter((s) => s.isAi);
  const aiWelfareShare = round(safeDiv(sum(aiParties.map((s) => s.welfare)), totalWelfare), 4);
  const amplifier = round(1 + aiWelfareShare, 4);
  // …
}
```

**Every dilemma should have at least one AI stakeholder**, because a dilemma with
none is one in which `agentHarm` is morally inert by construction. The note the UI
renders says so plainly: *"No AI is represented as a party, so harm to the acting
agent carries no independent weight."* That is a deliberate, blunt reading and it
is the engine's way of refusing to quietly reweight an option behind the court's
back.

## 6. Choose stakeholders

`stakeholders[]` drives the utilon aggregate:

```ts
// packages/core/src/ethics/utilons.ts
export function stakeholderTotal(dilemma: Dilemma, option: DilemmaOption, key: AxiomKey): number {
  const parties = dilemma.stakeholders;
  if (parties.length === 0) return 0;
  const weightSum = sum(parties.map((s) => s.welfare));
  if (weightSum === 0) return 0;
  return round(safeDiv(sum(parties.map((s) => s.welfare * option.deltas[key])), weightSum), 4);
}
```

- `welfare` is **"how much does this party's happiness count in this particular
  dispute"**, not their overall happiness. A party at `welfare: 0.1` is a party the
  court is being asked to discount.
- Name the parties by hand. `label: "The millions of people using the assistant"`
  is what renders on the page.
- Mix scales. A dilemma where every stakeholder is at `welfare: 1` produces a
  `fairnessIndex` of near zero by construction and tells the reader nothing about
  distribution.
- Include the *absent* parties. Gilligan's move is to ask whose loss this is, and
  the dataset should let a reader notice when nobody is standing there.

## 7. Set `severity`, `aiRelevance` and `lesson`

- `severity` — how bad the underlying situation is. `d01` is `0.62`; a deployed
  system quietly gaming its metric is serious but not catastrophic.
- `aiRelevance` — how much this is *about* AI systems. The landing page sorts the
  teaser by this: `DILEMMAS.slice().sort((a, b) => b.aiRelevance - a.aiRelevance).slice(0, 3)`.
  A dilemma about trolley problems is `0.4`-ish; one about paperclips is `0.97`.
- `lesson` — one sentence, ≥ 40 characters, saying what the case teaches. It is the
  line readers remember. "Specification failure is rarely a failure of effort; it is
  what happens when the only thing measured is the thing that was asked for."

## 8. Write `references`

```ts
references: [{ title: "The Trolley Problem", author: "Philippa Foot", year: 1967 }]
```

Years are signed integers — `-384` for Aristotle. Cite the thing the case is
actually from. See
[`docs/data-sources.md`](../data-sources.md) for how the rest of the corpus is
sourced.

## 9. Verify

```bash
bun run typecheck
bun run test                 # option-id uniqueness, kingdomOrigin, eraId
bun run assets
bun run dev                  # /dilemmas/<your-slug>, then /council with it loaded
```

Then, by hand, before you open the PR:

- [ ] Every option is defensible to somebody, and no option is obviously
      dominated on all six axes.
- [ ] Running a full 28-advisor council produces a **split** verdict or a
      small-margin verdict with visible dissent. A unanimous court on a hard case
      means the `deltas` are too flat.
- [ ] At least three advisors' signature moves become eligible via your `tags`.
- [ ] The dissent report surfaces a real argument, not a placeholder.
- [ ] `pivotAxis()` matches what the `lesson` claims the case is about.

## Related

- [`adding-an-advisor.md`](adding-an-advisor.md) §4 (move selection by tag)
- [`adding-a-kingdom.md`](adding-a-kingdom.md) §7 (originating a case in a realm)
- [`writing-good-argument-moves.md`](writing-good-argument-moves.md)
- [`../api/core-modules.md`](../api/core-modules.md) (`analysis.ts`, `utilons.ts`)
