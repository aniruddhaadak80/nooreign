# Writing good argument moves

What you get: the standard an `ArgumentMove` is held to, two shipped moves that clear
it, two rewrites of shipped moves that do not, and the checklist to run before you
open a PR.

---

## What a move is

An `ArgumentMove` is one thing a named historical figure says in a deliberation.
`services/agents/app/models.py`:

> One thing an advisor says in a deliberation.

```ts
export const argumentMoveSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(MOVE_KINDS),            // premise | objection | synthesis | appeal
  claim: z.string().min(10),
  support: z.string().min(10),
  /** How much this move carries in the deliberation, in [0, 1]. */
  weight: z.number().min(0).max(1),
  /** Axioms this move leans on; used by the trace renderer. */
  leansOn: z.array(z.enum(AXIOM_KEYS)).min(1),
  /** Tags of dilemmas this move is apt for. Empty means "always available". */
  appliesTo: z.array(z.string()),
});
```

Three facts about that schema that change how you write:

1. **`claim` and `support` have no maximum length.** The dataset's moves run 90–200
   characters each. There is no schema reason to write a novel; there is a rendering
   reason, because these are read inside a trace table.
2. **`leanOn` is a hard enum over the six axes.** A move that leans on something else
   cannot be written. If your move does not lean on any axis, it is not an argument, it
   is a mood.
3. **`appliesTo: []` means "always available".** An empty array is not "none of the
   dilemmas"; it is "every dilemma". This is the single most misread field in the
   dataset.

---

## The standard

Three rules, in order of how often they are broken.

### 1. A reconstruction must read like a reconstruction

This is the whole job. From `docs/guides/adding-an-advisor.md` §8:

> Silently passing off an inference as a quotation is the one thing this dataset must
> never do.

A reader has no way to tell a paraphrase from a fabrication unless the prose signals
it. The signal is grammatical, not a flag: a move that *quotes* says **"the maxim must
survive universalisation"** — a formula, attributed. A move that *reconstructs* says
**"a being that cannot be told the reason is not thereby absolved of duty"** — an
inference stated in the present tense, with the inference visible.

Two things make it work:

- **No scare quotes, no citation markers, no "Kant would say".** A move that names its
  author inside its own text is a caption, not an argument. The author is already the
  advisor.
- **The reconstruction's reasoning is on the page.** If a reader has to infer how you
  got from a cited work to the claim, they cannot check it, which defeats the point.

### 2. `leansOn` must agree with the axiom vector

If an advisor's dominant axis is `welfare` and a move declares `leansOn: ["rights"]`,
the reader notices, and rightly. Cross-check with:

```ts
import { weighAdvisor, describeProfile, rankAxes } from "@repo/core";
import { getAdvisor, getKingdom } from "@repo/seed";

const advisor = getAdvisor("bostrom");
const weighted = weighAdvisor(advisor!, getKingdom(advisor!.kingdomId));
console.log(describeProfile(weighted));  // "rights before virtue"
console.log(rankAxes(weighted));
```

`leansOn` should name axes that are *load-bearing for this advisor*, not merely axes
the claim touches. A Bentham move about consent should not lean on `rights` unless the
point is about the constraint rather than the total.

### 3. The move must be able to answer an objection

An `objection` move answers a specific rival option. `runCouncil` round 2 prefers an
objection whose `appliesTo` names the rival's id; an objection that targets nothing is
dropped rather than silently kept.

So an objection must be *targeted*. "We should think harder about this" is not an
objection. "The cost is that the option whose id is `ship` violates the maxim" is.

---

## Two good examples

Both shipped, both in `packages/seed/src/advisors.ts`. Line numbers are from that file.

### Example 1 — Kant, `kant-o1` (lines 204–212)

```ts
{
  id: "kant-o1",
  kind: "objection",
  claim: "A being that cannot be told the reason is not thereby absolved of duty.",
  support:
    "Incapacity for reflection suspends moral status in the hardest cases; it does not confer innocence on those who built it, who chose the rule and are accountable for it.",
  weight: 0.8,
  leansOn: ["rights", "justice"],
  appliesTo: ["oversight", "power"],
},
```

**Why it clears the bar.**

- **The inference is visible.** Kant's *Groundwork* (1785) establishes that rational
  nature carries dignity unconditionally. It does not say anything about beings that
  are not rational. The move takes the principle and runs it forward to a case Kant
  never considered — an artificial agent that cannot reflect. That extension is the
  move, and you can see it happening.
- **The `support` gives you the argument, not the conclusion.** "Suspends moral status
  in the hardest cases" concedes the counter-position first, then answers it. That
  concession-then-answer structure is what makes it read like Kant's *style* and not
  like a summary of his *content*.
- **It names who is accountable.** "Those who built it, who chose the rule" — the
  responsibility lands on the designers, which is where Kant's framework puts it.
- **`leanson` matches the vector.** Kant's axes are
  `{welfare: 0.30, rights: 0.95, virtue: 0.52, care: 0.35, justice: 0.55, agency: 0.72}`;
  `rights` is dominant, `justice` is the second reading. The move leans on exactly
  those two.
- **`weight: 0.8` is relative.** Higher than `kant-a1`'s `0.74`, lower than `kant-p1`'s
  `0.92`. It loses to the premises and beats the appeal. That is the right ordering for
  a move whose job is to answer a rival.

**What makes it attributable:** a reader who has read the *Groundwork* will recognise
the move's shape; a reader who has not can still follow the reasoning. Both are
possible. That is the target.

### Example 2 — Peter Singer, `singer-o1` (lines 1807–1815)

```ts
{
  id: "singer-o1",
  kind: "objection",
  claim: "Preference-based comparison cannot confirm the premise.",
  support:
    "Establishing that a system experiences is observational, not a matter of its preferences on display; the consistency argument runs one way only.",
  weight: 0.78,
  leansOn: ["rights", "virtue"],
  appliesTo: ["personhood", "oversight"],
},
```

**Why it clears the bar.**

- **It is Singer arguing against a position Singer is often credited with.** The
  preference-based argument — a system's demonstrated preferences show it has
  interests — is the argument people make *using* Singer. The move refuses it, and the
  refusal is faithful: Singer's actual commitments are about *interests*, not about
  *expressions of preference*, and the distinction is his.
- **The support names the logical shape.** "The consistency argument runs one way only"
  is a specific, checkable claim about a valid inference. A reader can disagree with it
  or agree with it; neither outcome requires taking it on faith.
- **It is an objection to a method, not to an outcome.** The move never says an AI
  system must not be protected. It says a particular *route* to the conclusion fails.
  That is a much more defensible thing to attribute.
- **`leanOn: ["rights", "virtue"]`** against Singer's
  `{welfare: 0.92, rights: 0.50, virtue: 0.40, …}`. Note that `welfare` is *absent* —
  correctly. This move is not about totals, and putting `welfare` in `leanOn` would be
  the kind of small incoherence the second-line rule exists to prevent.

---

## Two bad examples

**These are not in the dataset.** The twenty-eight shipped advisors are uniformly
well-written; there is no bad move for me to point at. What follows is each of the two
good moves above, rewritten badly, with the same `kind`, the same `weight` and the
same `appliesTo` — so the failure is entirely in the prose, and entirely attributable.

### Bad 1 — Kant, `kant-o1`, rewritten

```ts
{
  id: "kant-o1",
  kind: "objection",
  claim: "Kant would insist that creating an AI system that cannot understand its own rules is morally unacceptable, which is a very important point that is often overlooked in discussions of superintelligence.",
  support:
    "According to the Groundwork of the Metaphysics of Morals, rational nature has unconditional dignity. Applying this to artificial intelligence is an obvious and widely accepted extension of Kant's framework.",
  weight: 0.8,
  leansOn: ["rights", "justice"],
  appliesTo: ["oversight", "power"],
},
```

Six failures, each of which appears somewhere in the corpus's editing history or in
every draft you have ever rejected:

| Failure | Why it is fatal |
| --- | --- |
| "Kant would insist" — names the author inside the move | A move is already spoken by that advisor. This turns an argument into a caption |
| "which is a very important point that is often overlooked" | Editorialising. The dataset's voice never grades itself |
| "According to the Groundwork … rational nature has unconditional dignity" | Presenting a paraphrase as a citation. This is the one thing the dataset must never do |
| "Applying this to artificial intelligence is an obvious and widely accepted extension" | "Obvious" and "widely accepted" are both false, and the move's whole job is to make the non-obvious extension |
| "moral status is unconditionally … which is not what is at issue" — the concession is buried mid-sentence | The original's concession-then-answer structure is gone, and so is the reader's ability to check the reasoning |
| 91 characters of claim before any argument begins | `claim` renders in a table cell beside `support` |

The test: **could a reader who disagrees with the move say *why* it is wrong?** On the
bad version the only available answer is "Kant did not say that," which is an
attribution objection, not an argumentative one. On the good version they can say "the
concession about suspended moral status is too strong" and be right.

### Bad 2 — Singer, `singer-o1`, rewritten

```ts
{
  id: "singer-o1",
  kind: "objection",
  claim: "We cannot be certain any AI system is sentient, so treating it as if it were may be a mistake.",
  support:
    "Singer's equal consideration principle requires us to include the interests of every sentient being. Since sentience in artificial systems is unproven, a precautionary reading would exclude them until proven otherwise.",
  weight: 0.78,
  leansOn: ["rights", "virtue"],
  appliesTo: ["personhood", "oversight"],
},
```

| Failure | Why it is fatal |
| --- | --- |
| The move is about *epistemic* uncertainty, not *normative* | This is the exact confusion [`../concepts.md`](../concepts.md) §1 is about. "We do not know whether it suffers" is a fact question; "how do we weigh it against other claims" is the moral question. The bad move treats the first as if it settled the second |
| It contradicts Singer's own `appliesTo: ["personhood", "oversight"]` pairing in practice | Singer has a **separate** move for the precautionary direction — `singer-a1`, "Default to the safe reading when the observation is costly" — with `leanson: ["care", "welfare"]`. A move that reaches the precautionary conclusion from an epistemic premise is duplicating `a1` with worse reasoning |
| "a precautionary reading would exclude them until proven otherwise" | Singer's `singer-a1` argues precaution is the *correct weighting of two unequal harms*, not a default-exclusion rule. The bad version states a position he does not hold |
| "may be a mistake" | The move asserts nothing an opponent can engage. There is no premise to reject |
| `leanson: ["rights", "virtue"]` with a welfare-adjacent claim | `leanOn` and content disagree, which is the §2 rule above |

**The tell in both bad versions is the same: the move explains itself instead of
arguing.** "Which is an obvious extension", "a widely accepted reading", "may be a
mistake" — these are a writer reassuring themselves. The shipped moves never do it,
because the position stands on its own and does not need a hand on the shoulder.

---

## Writing one

### Find the argument first

`signatureMove` is the advisor's most recognisable move, and it is the right place to
start. In `packages/seed/src/advisors.ts`:

```ts
signatureMove: {
  name: "The Categorical Imperative",
  kind: "universalisation",
  description:
    "Ask whether the maxim behind the act could be willed as a universal law. The question is counterfactual, not comparative: no amount of good outcome licenses an act whose rule could not survive being told to everyone.",
},
```

`signatureMove.kind` is a **free string**, not an enum, precisely because it names a
*technique of argument* rather than a thesis. `"universalisation"`, `"diagonal"`,
`"acceptance"`, `"consistency"`, `"scope"`. None of those is a term the thinker used and
none pretends to be. Do the same for moves: `kind` is the engine's category, and the
prose is the argument.

### Four moves, four kinds

`advisorSchema.moves` is `.min(3)`. The twenty-eight shipped advisors all have four,
one per `MoveKind`:

| Kind | Round | Job |
| --- | --- | --- |
| `premise` | 1 | The position and the reason for it |
| `objection` | 2 | An answer to a rival option |
| `appeal` | 3 | A move by an advisor whose top option lost |
| `synthesis` | 3 | A bridge, used when `margin >= CLOSE_MARGIN` (0.25) |

Give each advisor at least one `premise` with `appliesTo: []`, or they will be silent on
every dilemma whose tags they do not name.

### Ids

Namespace by advisor. The segment before the first `.` identifies the speaker for
`argument-graph.ts`'s default `advisorOf`:

```
kant-p1     bostrom-p1     marcus-p1     singer-a1     rawls-o2
```

Two conventions are in use in the shipped data — hyphenated (`kant-p1`) and dotted
(`marcus-p1`) — and both work, because the default split is on the first `.` or the
first `-`. **Keep the prefix equal to the advisor `id`** so the graph can attribute the
move. Shipped examples: `aegis.duty`, `meridian.tally`, `quill.procedure`,
`vessel.character` in the Python fixtures; `kant-p1`, `marcus-p1` in the web dataset.

### Weight

**Relative, not absolute.** It only orders your own moves and feeds
`inheritedWeight()` in the argument graph. It does not scale your vote — the axiom
vector does that. Observed practice across the shipped twenty-eight: `0.58` (the
lowest, `marcus-a1`) to `0.95` (the highest, `meridian.tally`). A range narrower than
roughly `0.55`–`0.95` means the advisor does not think the moves differ in importance.

---

## The voice layer

Moves are read aloud — or rather, templated — by
`packages/core/src/council/voices.ts`, and `advisor.voice` controls the assembly:

| `cadence` | Effect on the assembled line |
| --- | --- |
| `terse` | Keeps only the first clause. Marcus Aurelius |
| `measured` | Claim and support joined plainly. Kant, Singer |
| `flowing` | Joined with a connective |
| `adversarial` | Prefixed with a concession, so the objection reads as polemic. Yudkowsky |

`tells` are the verbal habits, and `tells[0]` opens a `renderMove()`. Write them as
things the person actually does:

```ts
voice: {
  register: "architectonic, syllogistic",
  cadence: "measured",
  tells: ["'if … then …' clauses", "conditional formulations", "the word 'maxim'"],
}
```

Not personality adjectives. "Rigorous" and "thoughtful" tell a reader nothing they can
check; "the word 'maxim'" tells them exactly what to look for.

**Four placeholders, no more.** `substitute()` supports `{option}`, `{dimension}`,
`{stakeholder}` and `{advisor}`. An unknown placeholder is left **verbatim** rather
than blanked, so a visible `{foo}` tells you the template is wrong while an empty
string would tell you nothing.

---

## Checklist

Run before you open a PR.

### Attribution — the part no test can do

- [ ] Every `works[].title` exists and the `year` is right.
- [ ] Every `moves[].support` is defensible from the cited work, **or** is a fair
      reconstruction the prose already signals.
- [ ] No argument is attributed that the person did not make and did not have the
      apparatus to make.
- [ ] No author named inside the move's own text.
- [ ] `epithet` describes a position, not a verdict on the person.
- [ ] `onAi.note` is what this person would say about the question **as posed here** —
      and it is marked as an application, which every one of them is.

### Coherence

- [ ] `leanOn` axes are load-bearing for this advisor's `axioms`.
- [ ] Every `objection` could answer a named rival option.
- [ ] At least one move with `appliesTo: []`.
- [ ] `weight` spans a range, and the ordering matches the argument's structure.
- [ ] Move-id prefix equals the advisor `id`.
- [ ] `tells` are things the person does, not adjectives.

### Mechanical

```bash
bun run typecheck
bun run test
bun run assets          # portrait SVG from portrait.hue and portrait.charge
bun run diagrams        # court-axioms.svg small multiples
bun run dev             # /court/<your-slug>, then /council
```

Then read your moves in the trace and ask the hostile question: **if a reader who
knows this philosopher well read only `support`, would they recognise the argument —
and would they recognise it as an argument *the philosopher would recognise
theirself*?**

If the first answer is no, the move is too generic. If the second is no, the move is
over-confident and the dataset's core promise is broken.

## Related

- [`adding-an-advisor.md`](adding-an-advisor.md) — the full record and the schemas
- [`determinism-and-seeds.md`](determinism-and-seeds.md) — how `weight` feeds the
  argument graph and why a verdict can move
- [`../data-sources.md`](../data-sources.md) — where every claim comes from, and what
  is a paraphrase
- [`../limitations.md`](../limitations.md) §2 — advisor simplification, and why this
  standard exists
- [ADR 0002](../adr/0002-six-axis-axiom-vector.md) — the vector these moves must
  agree with