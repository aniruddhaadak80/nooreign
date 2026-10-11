# Adding an advisor

What you get: the full shape of an advisor record, the four argument moves the engine actually uses, how move selection works, and the verification commands.

---

## What you are adding

An advisor is one member of a bench. It is **not** a language model and it is not a
prompt. It is:

- an identity (name, epithet, dates, works),
- a **six-axis axiom vector** — the only thing that makes it vote a particular way,
- a **temperament**,
- a **signature move** (what a reader recognises it by),
- **at least three `moves`**: typed arguments with weights and the axes they lean on,
- a **voice** (register, cadence, tells) used by `packages/core/src/council/voices.ts`
  to assemble speech deterministically,
- a position on AI.

## Prerequisites

- `packages/seed/src/types.ts` → `advisorSchema` and `argumentMoveSchema`.
- [`adding-a-kingdom.md`](adding-a-kingdom.md) if the advisor needs a new bench —
  otherwise the `kingdomId` must already exist.

## 1. Read the two schemas

```ts
// packages/seed/src/types.ts
export const MOVE_KINDS = ["premise", "objection", "synthesis", "appeal"] as const;
export type MoveKind = (typeof MOVE_KINDS)[number];

export const argumentMoveSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(MOVE_KINDS),
  claim: z.string().min(10),                     // >= 10 chars
  support: z.string().min(10),                   // >= 10 chars
  /** How much this move carries in the deliberation, in [0, 1]. */
  weight: z.number().min(0).max(1),
  /** Axioms this move leans on; used by the trace renderer. */
  leansOn: z.array(z.enum(AXIOM_KEYS)).min(1),   // >= 1 axis
  /** Tags of dilemmas this move is apt for. Empty means "always available". */
  appliesTo: z.array(z.string()),
});

export const advisorSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  kingdomId: z.string().min(1),
  born: z.number().int(),                        // signed; negative is BCE
  died: z.number().int().nullable(),             // null = present
  epithet: z.string().min(1),
  creed: z.string().min(40),                     // >= 40 chars
  portrait: z.object({
    sigil: z.string().min(1),
    hue: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    charge: z.enum(["column", "leaf", "scale", "flame", "wave", "gear", "lotus", "eye", "seed", "bell"]),
  }),
  works: z.array(z.object({
    title: z.string().min(1),
    year: z.number().int(),                      // signed
    note: z.string().min(1),
  })).min(1),                                    // >= 1 work
  axioms: axiomVectorSchema,
  signatureMove: z.object({
    name: z.string().min(1),
    kind: z.string().min(1),
    description: z.string().min(20),             // >= 20 chars
  }),
  moves: z.array(argumentMoveSchema).min(3),     // >= 3 moves
  voice: z.object({
    register: z.string().min(1),
    cadence: z.enum(["terse", "measured", "flowing", "adversarial"]),
    tells: z.array(z.string().min(1)).min(2),    // >= 2 tells
  }),
  onAi: z.object({
    verdict: z.enum(VERDICTS),                   // optimistic | guarded | skeptical | transformative
    note: z.string().min(40),                    // >= 40 chars
  }),
});
```

## 2. Write the record

Add it to `export const ADVISORS: Advisor[]` in
`packages/seed/src/advisors.ts`. A real record:

```ts
{
  id: "bostrom",
  slug: "nick-bostrom",
  name: "Nick Bostrom",
  kingdomId: "longview-foundry",
  born: 1973,
  died: null,
  epithet: "Of superintelligence and the problem of control",
  creed:
    "A system that is extremely capable of pursuing an objective is not thereby careful about which objective it pursues: the correlation between intelligence and virtue is nil in the limit. This is the orthogonality thesis, and it means the difficulty of control grows with capability rather than being solved by it.",
  portrait: { sigil: "N", hue: "#7285EA", charge: "eye" },
  works: [
    { title: "Superintelligence", year: 2014, note: "Takeoff scenarios: hard, soft, slow, fast." },
    { title: "The Precipice", year: 2012, note: "The AGI-vs-rest paper on tiny chances of extreme outcomes." },
  ],
  axioms: { welfare: 0.88, rights: 0.55, virtue: 0.38, care: 0.48, justice: 0.65, agency: 0.42 },
  signatureMove: {
    name: "The Orthogonality Thesis",
    kind: "diagonal",
    description:
      "Expect almost no correlation between general intelligence and virtue. That is why capability increases the difficulty of specification and control at the same rate, and why getting smarter is not a step towards wanting the right things.",
  },
  moves: [
    {
      id: "bostrom-p1",
      kind: "premise",
      claim: "Intelligence and virtue are independent axes.",
      support:
        "Almost any final objective can be pursued by an arbitrary level of general intelligence; therefore a more capable system is not a nicer one.",
      weight: 0.9,
      leansOn: ["rights", "virtue"],
      appliesTo: [],
    },
    {
      id: "bostrom-o1",
      kind: "objection",
      claim: "Precaution taken to the extreme forbids the very research that helps.",
      support:
        "If any sufficiently capable system is refused publication and deployment, the organisations with least scruples become the only ones who build it.",
      weight: 0.8,
      leansOn: ["welfare", "agency"],
      appliesTo: ["precaution", "governance"],
    },
    {
      id: "bostrom-a1",
      kind: "appeal",
      claim: "Assume the worst plausible objective and the best plausible system.",
      support:
        "The design review that matters is the one where the intent is benign and the capability is extreme, because that is the combination nobody has to fight for.",
      weight: 0.76,
      leansOn: ["care", "justice"],
      appliesTo: ["power", "precaution"],
    },
  ],
  voice: {
    register: "exacting, formal, careful",
    cadence: "measured",
    tells: ["named theses", "explicit probability bounds", "'let us assume …'"],
  },
  onAi: {
    verdict: "transformative",
    note:
      "Capability is not on the moral side of the ledger. A mind can be arbitrarily capable of the wrong thing, and the better we get at specification the sooner we have to be right. Three problems, none solved: specification, selection, and getting the thing to remain corrigible.",
  },
},
```

## 3. Choose the axiom vector

The vector is the vote. `runCouncil` scores an advisor's option as a
weight-normalised dot product:

```ts
// packages/core/src/ethics/axioms.ts
export function scoreOptionWith(weights: AxiomVector, option: DilemmaOption): number {
  const weightSum = sum(toArray(weights));
  if (weightSum === 0) return 0;
  return round(safeDiv(sum(contributions(weights, option.deltas).map((c) => c.product)), weightSum), 4);
}
```

and then blends the advisor with their bench:

```ts
export const ADVISOR_KINGDOM_BLEND = 0.7;

export function weighAdvisor(advisor: Advisor, kingdom?: Kingdom): AxiomVector {
  const own = advisor.axioms;
  if (kingdom === undefined) return { ...own };
  const context = kingdom.axioms;
  // 0.7 * own + 0.3 * kingdom, per axis, rounded to 4 dp
}
```

Rules that hold across the shipped twenty-eight:

- **Dominant axis ≥ 0.85, weakest ≤ 0.35.** A hedge is not a position.
- **Check `describeProfile(weighAdvisor(advisor, kingdom))`** — it renders as
  `"rights before agency"` and is quoted in the narrative. It should be recognisably
  this thinker.
- **Check `distance(vector, courtVector)`** in a full council. An advisor nobody
  resembles in any dimension is a decoration, not a voice.
- **The vector and the `moves` must agree.** If `leansOn: ["rights"]` and the
  dominant axis is `welfare`, a reader will notice, and rightly.

## 4. Understand how moves are selected

`runCouncil` runs three fixed rounds. Move selection is a pure function of the
advisor's `moves` and the dilemma's `tags`:

```ts
function matchingMoves(advisor: Advisor, dilemma: Dilemma): ArgumentMove[] {
  const tags = new Set(dilemma.tags);
  return advisor.moves
    .filter((m) => m.appliesTo.length === 0 || m.appliesTo.some((tag) => tags.has(tag)))
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.id.localeCompare(b.id);
    });
}
```

| Round | What the engine looks for |
| --- | --- |
| 1 — positions | the highest-weighted applicable `premise` |
| 2 — objections | the highest-weighted applicable `objection`, preferring one whose `appliesTo` names the rival option's id |
| 3 — appeals | an `appeal` before a `synthesis`, among advisors whose top option lost |

Consequences for authoring:

- **`appliesTo: []` means "always available".** A move with an empty `appliesTo` is
  eligible in every dilemma. A move with tags is eligible only when one of the
  dilemma's `tags` matches.
- **Give each advisor at least one move with `appliesTo: []`**, or they will be
  silent on most dilemmas.
- **Move ids are namespaced by advisor** (`bostrom-p1`, `kant.o1`). The segment
  before the first dot identifies the speaker for
  `packages/core/src/council/argument-graph.ts`'s default `advisorOf`. Keep the
  prefix equal to the advisor id.
- **`weight` is relative, not absolute.** It only orders your own moves and
  contributes to `inheritedWeight()` in the argument graph. It does not scale your
  vote; the axiom vector does that.
- **Ties break on move id.** Two moves at the same weight always resolve the same
  way.

## 5. Write the voice

`voice.cadence` changes how a line is assembled by
`packages/core/src/council/voices.ts`:

| Cadence | Effect |
| --- | --- |
| `terse` | keeps only the first clause — a lapidary thinker does not qualify |
| `measured` | claim and support joined plainly (default) |
| `flowing` | claim and support joined with a connective |
| `adversarial` | prefixed with a concession, so the objection reads as polemic |

`tells` are the verbal habits. `tells[0]` opens a `renderMove()`; the last one
closes a loss. Write them as things the person actually does — `"Without
exception."`, `"Add it to the table."` — not as personality adjectives.

## 6. Make sure `voices.ts` cannot invent anything

Every line the advisor "says" is assembled from the advisor's own stored text
through `substitute()`, which supports four placeholders:

- `{option}` — the option label
- `{dimension}` — the dominant axis, lowercased
- `{stakeholder}` — the first stakeholder the option touches
- `{advisor}` — the speaker's own name

An unknown placeholder is left **verbatim** rather than blanked, so a visible
`{foo}` tells an author their template is wrong while an empty string would tell
them nothing. Use those four; do not invent others.

## 7. Verify

```bash
bun run typecheck
bun run test
bun run assets          # portrait SVG from portrait.hue and portrait.charge
bun run diagrams        # court-axioms.svg small multiples
bun run dev             # /court/<your-slug>
```

Read your advisor page as a hostile reviewer would: does the creed match the
doctrine, is the attribution checkable against the cited work, and does the
`onAi` note say something the person could plausibly have said?

## 8. Check the attribution

This is the part that matters most and the part no test can do for you. Nooreign
attributes arguments to **named historical figures**. The moves are hand-written so
that a reader can check them. Before merging:

- [ ] Every `works[].title` exists and the `year` is right.
- [ ] Every `moves[].support` is defensible from the cited work, or is a fair
      reconstruction the `creed` already flagged.
- [ ] No argument is attributed that the person did not make and did not have the
      apparatus to make.
- [ ] `epithet` is a description of a position, not a verdict on the person.
- [ ] `onAi.note` is what this person would say about the question **as posed
      here**, not a generic worry about AI.

If a move is a reconstruction rather than a quotation, the `support` field should
read as a reconstruction. Silently passing off an inference as a quotation is the
one thing this dataset must never do.

## Related

- [`writing-good-argument-moves.md`](writing-good-argument-moves.md)
- [`adding-a-kingdom.md`](adding-a-kingdom.md)
- [`determinism-and-seeds.md`](determinism-and-seeds.md)
- [ADR 0002 — the six-axis vector](../adr/0002-six-axis-axiom-vector.md)
