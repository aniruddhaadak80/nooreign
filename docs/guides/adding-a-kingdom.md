# Adding a kingdom

What you get: a complete walkthrough for adding a thirteenth realm to the atlas — the schema fields, a real record, the relations that make it appear on the diplomacy map, and the verification commands.

---

## What you are adding

A kingdom is a school of thought rendered as a place on the 0..100 atlas plane. It
carries an axiom weighting (which is the *only* thing the deliberation engine
reads), a temperament, a set of landmarks, relations to other kingdoms, the canon
texts it stands on, and a stance on AI.

The engine never reads the prose. The prose is what makes the realm worth walking
into. Both matter; only one is load-bearing for a verdict.

## Prerequisites

- Bun `1.3.14` installed, dependencies installed.
- You have read `packages/seed/src/types.ts` → `kingdomSchema`.
- You have read [`adding-an-advisor.md`](adding-an-advisor.md) enough to know that
  `kingdom.advisors[]` is a list of **advisor ids**, and that an empty bench is a
  valid but sad kingdom.

## 1. Read the schema first

```ts
// packages/seed/src/types.ts
export const TERRAINS = [
  "citadel", "garden", "foundry", "terraces", "ramparts", "weave",
  "court", "wharf", "wilds", "commons", "orchard", "observatory",
] as const;

export const VERDICTS = ["optimistic", "guarded", "skeptical", "transformative"] as const;

export const RELATION_KINDS = ["alliance", "rivalry", "vassal", "debate", "succession"] as const;

export const kingdomSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  motto: z.string().min(1),
  creed: z.string().min(40),          // >= 40 characters, enforced
  founded: z.number().int(),          // signed: negative is BCE
  founder: z.string().min(1),
  capital: z.object({
    name: z.string().min(1),
    x: z.number().min(0).max(100),    // atlas plane
    y: z.number().min(0).max(100),
  }),
  terrain: z.enum(TERRAINS),
  crest: z.object({
    sigil: z.string().min(1),
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    charge: z.enum(["column", "leaf", "scale", "flame", "wave", "gear", "lotus", "eye", "seed", "bell"]),
  }),
  axioms: axiomVectorSchema,          // six weights, each in [0, 1]
  temperament: temperamentSchema,     // caution, ambition, solidarity, formality
  advisors: z.array(z.string().min(1)),
  landmarks: z.array(z.object({
    name: z.string().min(1),
    kind: z.enum(["tower", "archive", "garden", "forge", "well", "gate", "court", "observatory"]),
    note: z.string().min(1),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  })),
  relations: z.array(z.object({
    to: z.string().min(1),
    kind: z.enum(RELATION_KINDS),
    note: z.string().min(1),
  })),
  texts: z.array(z.string().min(1)),  // canon text ids
  aiStance: z.object({
    headline: z.string().min(1),
    verdict: z.enum(VERDICTS),
    note: z.string().min(40),          // >= 40 characters
  }),
  questions: z.array(z.string().min(1)).min(3),   // >= 3 questions
  glyph: z.string().min(1),
});
```

Three constraints that are easy to trip over:

- **`founded` is a signed integer.** `-551` is 551 BCE. See
  [ADR 0010](../adr/0010-bce-year-integer-convention.md).
- **Axiom weights are independent.** They do not have to sum to 1. No tradition
  agrees on a budget for the six axes, so the schema does not impose one.
- **`terrain` and `charge` are closed enums.** Adding a terrain means editing
  `TERRAINS`, which touches `kingdomSchema`, `KingdomNode` in
  `packages/core/src/kingdoms/graph.ts`, and the SVG generator. Do not do it for a
  single kingdom.

## 2. Write the record

Add it to `export const KINGDOMS: Kingdom[]` in
`packages/seed/src/kingdoms.ts`. A real record, for shape:

```ts
{
  id: "ubuntu-weave",
  slug: "ubuntu-weave",
  name: "The Ubuntu Weave",
  motto: "I am because we are.",
  creed:
    "The weave has no centre thread. Personhood is not a possession but a relation: you become a person by being woven into others, and you lose yourself by cutting the threads. Harm is therefore always harm to a relationship, never a private loss in a ledger.",
  founded: 1985,
  founder: "Ubuntu Schools of Governance",
  capital: { name: "The Weaving Floor", x: 72, y: 86 },
  terrain: "weave",
  crest: { sigil: "◎", primary: "#4FA88B", accent: "#C8483F", charge: "wave" },
  axioms: { welfare: 0.6, rights: 0.45, virtue: 0.6, care: 0.95, justice: 0.7, agency: 0.3 },
  temperament: { caution: 0.45, ambition: 0.5, solidarity: 0.95, formality: 0.3 },
  advisors: ["tutu", "appiah"],
  landmarks: [
    { name: "The Unfinished Loom", kind: "court", note: "Every strand ends at the edge; the pattern is only ever partial.", x: 69, y: 83 },
    { name: "The Thread Test", kind: "gate", note: "Cut any single thread and ask who is diminished.", x: 77, y: 84 },
  ],
  relations: [
    { to: "middle-kingdom", kind: "alliance", note: "Relational personhood, arrived at from a different hemisphere." },
    { to: "care-weft", kind: "alliance", note: "Dependency as the ground of obligation, argued in a different register." },
    { to: "contractual-court", kind: "debate", note: "The rawlsian original position strips the history a weave is made of." },
  ],
  texts: ["ct25"],
  aiStance: {
    headline: "Ask who the system serves, not merely who it answers to.",
    verdict: "transformative",
    note:
      "The weave's distinctive move is to shift the unit of analysis from the individual to the whole a system completes. A superintelligence aligned to one kingdom, one state, or one company may satisfy every individual test and still be a catastrophe.",
  },
  questions: [
    "Whose relationships does an aligned system actually protect?",
    "Can solidarity survive being formalised into an objective?",
    "What is owed to a person who is woven into no community at all?",
  ],
  glyph: "◎",
},
```

### Choosing the axiom vector

This is the part that actually decides verdicts, and it is the part reviewers will
argue about. The rules that hold across the existing twelve:

- **The profile must be visibly distinct.** `describeProfile(v)` renders the top two
  axes as `"justice before care"`. If your new kingdom's profile string matches an
  existing one, the atlas has two realms that behave identically and the
  distinction is editorial rather than real.
- **The dominant axis should be ≥ 0.85 and the weakest ≤ 0.35.** A kingdom whose
  maximum is 0.7 is not a position, it is a hedge. `balance(v)` reports 0 for "all
  weight on one axis" and 1 for "perfectly even"; existing kingdoms sit between
  roughly 0.35 and 0.75.
- **Check the kingdom blend.** An advisor is scored
  `0.7 * advisor.axioms + 0.3 * kingdom.axioms` (`ADVISOR_KINGDOM_BLEND = 0.7`). A
  kingdom whose vector is nearly identical to its advisors' adds nothing.
- **Verify against a real dilemma.** Score two contrasting options and check that
  your kingdom lands where the doctrine says it should.

### Choosing the capital

`capital.x` and `capital.y` are in `[0, 100]`. Two consequences:

- `distantPairs()` ranks capital pairs by Euclidean distance and quotes the furthest
  one on the landing page. Crowding every new realm in one corner makes that line
  dull.
- `territoryBounds()` partitions *landmarks* by nearest capital, so a kingdom whose
  landmarks sit closer to someone else's capital will lose them on the map.

Spread the capital out and put the landmarks near it.

## 3. Declare the relations

`relations[].to` is a **kingdom id** and must resolve. `validateSeed()` checks it,
and so does the seed test suite:

```ts
for (const relation of kingdom.relations) {
  if (!kingdomIds.has(rel.to)) issues.push({ dataset: "kingdoms", id: kingdom.id, problem: `unknown relation target "${rel.to}"` });
  if (rel.to === kingdom.id) issues.push({ dataset: "kingdoms", id: kingdom.id, problem: "relation to self" });
}
```

Two things about the semantics, because they are the most common source of
confusion:

- **`alliance`, `rivalry` and `debate` are two-sided facts.** If A declares
  `rivalry` about B and B declares `rivalry` about A, `relationGraph()` folds them
  into one edge with both notes and `mutual: true`. Declaring both is correct and
  is what the shipped data does.
- **`vassal` and `succession` are asymmetric.** A `succession` relation declared by X
  about Y means **X succeeds Y**. `tributaries(graph, id)` returns the kingdoms
  that declared a `vassal` relation about `id`; `successors(graph, id)` returns the
  kingdoms that declared a `succession` relation about `id`. If you declare
  `vassal` toward another kingdom and it declares nothing back, your kingdom is the
  overlord and theirs is the tributary — reversing that is a one-word change with a
  visible effect on the map.

Do not declare a relation to yourself. `validateSeed()` rejects it.

## 4. Add advisors

`advisors: ["tutu", "appiah"]` is a list of **advisor ids** from
`packages/seed/src/advisors.ts`, not slugs and not names. Every one of them must
exist or `validateSeed()` reports `unknown advisor`. See
[`adding-an-advisor.md`](adding-an-advisor.md).

## 5. Add canon texts

`texts: ["ct25"]` is a list of `textSchema` ids from `packages/seed/src/texts.ts`.
See [`adding-a-kingdom.md` step 6](#6-add-a-canon-text-optional) below.

## 6. Add a canon text (optional)

In `packages/seed/src/texts.ts`:

```ts
export const textSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  author: z.string().min(1),
  year: z.number().int(),             // signed
  kind: z.enum(["primary", "modern", "declaration"]),
  summary: z.string().min(40),
  excerpt: z.string().min(20),
  kingdomId: z.string().nullable(),   // null for a cross-cutting declaration
});
```

`kind` is not decorative: `primary` is a pre-1900 text the advisor's own doctrine
comes from, `modern` is a post-1900 work, and `declaration` is a document like the
Asilomar principles or the EU AI Act. `kingdomId: null` is correct for a
cross-cutting declaration and is what `ct21` (the Asilomar principles) uses.

## 7. Add a dilemma of your own (optional)

`dilemma.kingdomOrigin` must be an existing kingdom id. If your realm has a
signature case, that is the best possible test of its axiom vector — see
[`adding-a-dilemma.md`](adding-a-dilemma.md).

## 8. Regenerate and verify

```bash
bun run typecheck          # the record must satisfy kingdomSchema
bun run test               # packages/seed validates every dataset and foreign key
bun run assets             # crests, terrain plates, social cards
bun run diagrams           # docs/images/generated/kingdom-relations.svg
bun run dev                # visit /kingdoms and /kingdoms/<your-slug>
```

The seed test that will catch a mistake is in
`packages/seed/src/chronicle.test.ts`, which asserts referential and ordering
invariants that the zod schema alone cannot. Its own header is worth reading:

> These assertions exist because the datasets are hand-written historical prose:
> the failure mode is not a crash, it is a dangling reference or a silently drifted
> id that renders an empty kingdom.

## Checklist before you open the PR

- [ ] `id` and `slug` are kebab-case, unique, and the same string unless you have a
      reason.
- [ ] `founded` is a signed integer; negative means BCE.
- [ ] `axioms` has a clear dominant axis (≥ 0.85) and a clear weak one (≤ 0.35).
- [ ] `describeProfile()` for your vector does not collide with an existing
      kingdom's.
- [ ] `capital` is not crowded; landmarks are near it.
- [ ] Every `relations[].to` resolves and is not your own id.
- [ ] Every `advisors[]` entry is a real advisor id.
- [ ] Every `texts[]` entry is a real text id.
- [ ] `creed`, `aiStance.note` and `questions` all clear their minimum lengths.
- [ ] `bun run typecheck`, `bun run test`, `bun run assets`, `bun run diagrams` all
      run clean, and the regenerated files are committed.
- [ ] `.github/labeler.yml` will attach `seed-content` and `dilemma-content`
      automatically from the changed paths.

## Related

- [`adding-an-advisor.md`](adding-an-advisor.md)
- [`adding-a-dilemma.md`](adding-a-dilemma.md)
- [`writing-good-argument-moves.md`](writing-good-argument-moves.md)
- [ADR 0002 — the six-axis vector](../adr/0002-six-axis-axiom-vector.md)
- [ADR 0007 — the axis names](../adr/0007-choosing-the-six-axis-names.md)
- [ADR 0010 — signed years](../adr/0010-bce-year-integer-convention.md)
