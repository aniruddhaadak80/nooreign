# ADR 0007 — The six axis names, and why `care` is deliberately in the set

**Status:** Accepted (2026-05)
**Deciders:** core maintainers
**Applies to:** `packages/seed/src/types.ts` (`AXIOM_KEYS`, `DIMENSION_META`), `packages/core/src/ethics/axioms.ts`, `packages/core/src/observatory/maturity.ts`

---

## Context

[ADR 0002](0002-six-axis-axiom-vector.md) established that the product's
arithmetic runs over a six-axis vector. This ADR is about **which six**, which is
an editorial decision disguised as a type definition.

The constraint set was:

1. The axes have to be readable by someone who has never heard of the atlas.
2. The twelve kingdoms must be *representable* — each one must have somewhere to
   put its distinctive weight.
3. No axis may be redundant with another, because the dot product would then
   double-count.
4. Every axis must be *sayable in English* without a lecture, because it is
   rendered inside a trace label.
5. The set must not quietly exclude a way of moral life that the atlas claims to
   cover.

Draft sets that were considered and rejected:

- **`harm`, `benefit`, `fairness`, `duty`, `loyalty`, `sanctity`** — the common
  alignment-dashboard vocabulary. Rejected: `duty` and `fairness` collapse into
  `rights`/`justice`, and `loyalty` has no counterpart on the *option* side —
  options are scored by what they honour, and "honours loyalty" is not a
  well-typed quantity.
- **A capabilities set** (`autonomy`, `health`, `knowledge`, `affections`,
  `freedom`, `economic security`). Rejected: capabilities are what a person is
  *able* to do, which is not what a *council* weighs when ranking courses of
  action.
- **A single `agency` replaced by `autonomy` and `power`** — the Amodei/Russell
  "who holds the power" axis. Tempting and kept, but *inside* `agency` rather
  than beside it, because splitting it produces `agency` and `power` correlating
  on every row and re-introduces the redundancy rule's violation.

## Decision

```ts
// packages/seed/src/types.ts
export const AXIOM_KEYS = [
  "welfare",
  "rights",
  "virtue",
  "care",
  "justice",
  "agency",
] as const;
```

with each axis carrying its own poles and gloss in `DIMENSION_META`:

| Key | Label | Poles | Gloss |
| --- | --- | --- | --- |
| `welfare` | Welfare | harm ↔ flourishing | How much the total of sentient experience counts, in either direction. |
| `rights` | Rights | constraint ↔ inviolability | Whether some things are wrong regardless of the totals they produce. |
| `virtue` | Virtue | act ↔ character | Judging the agent and the disposition rather than the single act. |
| `care` | Care | principle ↔ relationship | Partiality, dependency and the obligations that only exist inside a relationship. |
| `justice` | Justice | outcome ↔ distribution | Who bears the cost, who draws the benefit, and by what fair procedure. |
| `agency` | Agency | command ↔ consent | Autonomy, consent, and the moral standing of whoever is commanded. |

**On `care` specifically.** The four "male-coded" pillars of a standard moral
foundations taxonomy — welfare, rights, virtue, justice — are exactly the four
Gilligan identified as a single "ethic of justice", and her argument is that the
omission of relationship is not neutral: it removes the relationship from view and
lets it be damaged unseen. A model of moral disagreement that cannot represent
partiality, dependency and the obligations that only exist inside a relationship is
not a neutral compression. It is a compressed version of one tradition.

`care` is in the set because:

1. **It is the axis the atlas's own charts expose.** `packages/ui/src/lib/palette.ts`
   assigns `care` a distinct hue (`#C8483F`, the crimson the app already uses for
   objections), and `DIMENSION_META.care.gloss` is rendered on `/method`.
2. **Two of the twelve kingdoms need it.** `care-weft` (Gilligan, Held) is
   otherwise unrepresentable, and `ubuntu-weave` (Tutu, Appiah) has to put its
   relational weight somewhere. Their vectors are visibly distinct *because* the
   axis exists.
3. **It is the axis the alignment stack cannot answer for.** This is the finding
   the observatory exists to make: `packages/core/src/observatory/maturity.ts`
   computes, from the dataset and from nothing hard-coded, which axes the technique
   set can actually speak to. Techniques are scored on `agency`, `rights`,
   `welfare`, `virtue` and `justice`. A technique that claims `care` coverage is
   asserting something about relational obligations in a deployed system, which is
   a harder claim than asserting it on paper.

**`care` is included precisely so that its absence from the stack is visible.**
Had the axis been left out, the gap would have been unfalsifiable — there would be
no column to be empty. That is the design intent, and it is also the most
controversial call in the schema.

The engine treats it as a first-class axis everywhere: it is in `AXIOM_KEYS`, so
it appears in every `contributions()` term, every `rankAxes()` ordering, every
`balance()` computation, every trace and every tie-break — at position 4, which
fixes its place in every tie-break for the life of the project.

**Named trade-off:** including `care` weakens the strict "six axes, clean
separation" story, because `care` and `justice` are correlated in practice — Gilligan
and Rawls are not orthogonal, they are two emphases in the same argument. It also
gives a determined dataset author a place to put anything relationship-shaped that
does not fit, which is a mild incentive to over-use it.

## Consequences

**Positive**

- All twelve kingdoms are representable with a visibly distinct profile. Dropping
  `care` would have required folding `care-weft` into `contractual-court` and
  `ubuntu-weave` into `virtue-garden`.
- The axes read as moral vocabulary rather than as a framework's internal jargon.
  A non-specialist can predict roughly which advisor will favour which option.
- The set is non-redundant enough for a dot product: `rights` (constraint) and
  `justice` (distribution) are the pair most often confused and are explicitly
  separated by their poles.
- The observatory's coverage matrix has a column that the technique set cannot fill,
  which is the atlas's central empirical-sounding finding about the field.
- `DIMENSION_META` gives every axis a human gloss and two poles, so the UI never
  has to invent a label for an axis.

**Negative**

- `care` is an English-language moral category being applied to non-English
  traditions. The `Middle Kingdom`'s *ren* and the `Sangha Terraces`' dependent
  arising are not "care" in the Western sense, and scoring them on this axis
  imports the framework into the thing it is scoring.
- `care` and `justice` correlate. Two advisors with identical `justice` weights and
  different `care` weights will often behave identically in a dilemma whose options
  differ on `justice`, which makes the extra axis inert in some cases.
- `virtue` is the weakest of the six as an *option* axis. An option cannot honour
  a disposition directly; `deltas.virtue` is an editorial judgement about what the
  act does to the agent's character, and that judgement is the least mechanical
  number in the dataset.
- The axis set is load-bearing across three languages and four runtimes. Changing
  a name or reordering `AXIOM_KEYS` is a breaking change to the seed, the engine,
  the Python contracts, the Rust crate, the committed SVGs and every tie-break.
- With six axes there is no room for the axes that were cut: loyalty, promise,
  authority, professional role, obligation to future persons, and the sacred. Each
  was a real candidate; each was cut for want of a column.

## Alternatives considered

| Option | Why rejected |
| --- | --- |
| **Five axes: drop `care`** | Rejected explicitly. It would have been simpler and the product would have been a compressed version of the ethics-of-justice tradition it claims to survey, with no column in which to notice. |
| **Seven axes: add `loyalty` or `obligation`** | `loyalty` has no well-typed counterpart on the option side. Seven also breaks the "fits on one card with the advisor's voice" layout the advisor page depends on. |
| **Moral Foundations Theory axes (care, fairness, loyalty, authority, purity, harm)** | Rejected: two of the six (purity, authority) have no product-side notion at all, and the set is explicitly a political-emotions instrument rather than a council's weighting scheme. |
| **Make the axis set per-kingdom** | Rejected: it would make every cross-kingdom comparison meaningless, and comparison is the whole point of the atlas. |
| **Let an advisor declare its own axis names** | Rejected: the dot product requires a shared basis. A per-advisor basis turns the comparison into an assertion. |
