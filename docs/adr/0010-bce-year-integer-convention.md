# ADR 0010 — Years are signed integers; negative means BCE

**Status:** Accepted (2026-05)
**Deciders:** core maintainers
**Applies to:** `packages/seed/src/types.ts` (every `z.number().int()` year field), `packages/core/src/chronicle/timeline.ts`, `apps/web/src/components/atlas/format.ts`, `scripts/gen-assets.mjs`, `scripts/gen-diagrams.mjs`, `docs/diagrams/chronicle-timeline.mmd`

---

## Context

Nooreign's chronicle runs from `-470` (Socrates at Athens) to `2026` (the frontier
era). The dataset also contains Aristotle's *Nicomachean Ethics* at `-340`, the
*Analects* at `-400`, the *Dhammapada* and Mozi at `-300`, and Ashoka's edicts at
`-260`. Roughly a fifth of the corpus is pre-Christian.

Four candidate encodings were considered.

**A. Signed integers.** `-470` is 470 BCE, `170` is 170 CE, and year `0` is an
astronomical year number that never appears in the dataset. Arithmetic works
(`endYear - startYear`), sorting works with a default comparator, and `Math.abs()`
plus a sign check renders a label.

**B. Separate `era` field plus `year`.** `startYear: 470, era: "BCE"`. More
explicit, and it makes the BCE/CE divide impossible to miss. But every comparison,
every sort, every range and every span has to carry the era with it, and the first
mistake is a silent wrong answer rather than a type error.

**C. `proleptic` ISO strings** (`"-0470-01-01"`, `"1703-04-09"`). Unambiguous and
sortable, and it carries month and day precision the atlas does not have. It also
means `new Date()` anywhere near the data, which introduces a timezone-dependent
behaviour into what must be a pure computation.

**D. Astral / Tera-style epoch** (`eraStart: -473`, `durationDays: 27324`). The most
precise, and completely unreadable in a data file a human is expected to edit.

There is one extra consideration that decided it. `packages/core/src/chronicle/timeline.ts`
needs to answer "which era contains this year" and "what is on the stack at this
year" on every scrubber frame, with no allocation and no folds. A single numeric
comparisons chain is the cheapest possible implementation:

```ts
export function eraAtYear(eras: readonly Era[], year: number): Era | null {
  let best: Era | null = null;
  for (const era of eras) {
    if (year >= era.startYear && year <= era.endYear) {
      if (best === null || era.startYear >= best.startYear) best = era;
    }
  }
  return best;
}

export function stackAtYear(techniques: readonly Technique[], year: number): Technique[] {
  return techniques.filter((t) => t.introduced <= year).sort(byYearThenId);
}
```

With a split `era` field, both of those become two comparisons plus a string
comparison, on a hot path, forever.

## Decision

**Every year in the dataset is a signed integer. Negative is BCE. The BCE/CE
divide is at year `1`, not year `0`.**

```ts
// packages/seed/src/types.ts — representative; the same shape is used by
// kingdomSchema.founded, advisorSchema.born / .died, eraSchema.startYear /
// .endYear, landmark.year, advisorSchema.works[].year, textSchema.year,
// techniqueSchema.introduced, experimentSchema.year, dilemma reference year.
export const eraSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  label: z.string().min(1),
  title: z.string().min(1),
  startYear: z.number().int(),
  endYear: z.number().int(),
  // …
});
```

Five rules follow from the decision and are enforced by convention and by the
seed test suite.

**Rule 1 — the divider is year 1.** `Era.epochYear` is typed as the literal `1`:

```ts
export interface Rail {
  readonly stops: readonly RailStop[];
  readonly minYear: number;
  readonly maxYear: number;
  /** The year drawn at the BCE/CE divide. Year 0 is astronomical; year 1 is 1 AD. */
  readonly epochYear: 1;
  /** Where that divide falls on the rail, 0..1. */
  readonly epochPosition: number;
}
```

Year `0` never appears in the seed data. `timeline.ts` says so in its header: *"-399
is 399 BC and 0 is not a real year in the seed, so the rail has to cross zero
without folding."*

**Rule 2 — no format function branches on `year === 0`.** Display is one helper:

```ts
kingdom.founded < 0 ? `${Math.abs(kingdom.founded)} BCE` : kingdom.founded
```

which is exactly what `apps/web/src/components/atlas/format.ts` (`formatYear`,
`formatSpan`) does, and what `scripts/gen-assets.mjs` and `scripts/gen-diagrams.mjs`
do inline.

**Rule 3 — spans are `endYear - startYear`, and spans may be zero.** `e20` (Sen on
Universalizability) and `e21` (Asilomar 1986) are single-year eras with
`startYear === endYear`. That is a fact about history, not a data error, and the
schema must accept it.

**Rule 4 — contiguity beats a declared end.** An era's `endYear` is advisory for
the scrubber:

```ts
const endYear =
  next === undefined
    ? Math.max(era.startYear, era.endYear)
    : Math.max(era.startYear, next.startYear - 1);
```

because a visible gap in a chronology is indistinguishable from a loading failure
when the user is dragging a scrubber through it.

**Rule 5 — the chart layer compresses, the data layer does not.** Gantt and
timeline visualisations cannot plot a negative calendar year, so
`docs/diagrams/chronicle-timeline.mmd` maps the signed year onto a synthetic axis
and says so in the file, with the real signed year printed on every bar. The
compression lives in the diagram, never in the dataset.

**Named trade-off:** signed integers are *wrong* under astronomical numbering for
exactly one boundary — there is no year 0 in the historical calendar — and anyone
porting this to a library that uses astronomical year numbering will get a one-year
error at the CE/BCE seam. The alternative (B) removes that class of error entirely
at the cost of making every comparison a two-part expression. We chose the error
that is bounded to one boundary and invisible in the rendering, over the error
that is everywhere and silent.

## Consequences

**Positive**

- Every comparison in the engine is `<`, `>=` or `-`. No helper, no branch, no
  string compare, and no timezone.
- `Array.prototype.sort((a, b) => a.startYear - b.startYear)` is correct by
  default. `sortEras` relies on this.
- JSON round-trips with no transformation. A `.db` file, an API payload and an OG
  image all carry the same number.
- Arithmetic on spans works directly: `era.endYear - era.startYear`,
  `b.startYear - a.startYear` in `diffEras`, `positionToYear(rail, p)`.
- One rendering rule for the whole product, and it is one ternary.
- The `z.number().int()` constraint rejects `1781.5` and `"1781"` at the schema.
- Sorting is stable in the one case that matters: two eras beginning in the same
  year keep the order the dataset gave them, because `Array.prototype.sort` has
  been specified as stable since ES2019.

**Negative**

- A year `0` is representable and would mean 1 BCE, not "no year". Nothing in the
  schema prevents it; only the convention and the seed test do. This is a real
  footgun for anyone adding a dataset.
- Astronomical-numbering libraries disagree with us at the seam, as above.
- Reading a raw data file is slightly harder: `-470` requires a moment's thought
  before it means 470 BCE. Mitigation: every kingdom page, advisor page and era
  page renders the formatted year immediately.
- Charts cannot show negative calendar years, so every visualisation that is not
  a horizontal scrubber needs an explicit mapping and a comment saying what it did.
- Historical dates before roughly 1000 CE are approximate across sources anyway.
  A signed integer makes a rough date look exactly as precise as a well-attested
  one. That is an editorial honesty issue, not a schema one, and it is handled in
  [`docs/data-sources.md`](../data-sources.md).

## Alternatives considered

| Option | Why rejected |
| --- | --- |
| **`year` + `era: "BCE" \| "CE"`** | Explicit and impossible to misread. Rejected because every comparison becomes a two-part expression on a hot path, and the failure mode of getting it wrong is a silently wrong era rather than a type error. |
| **Proleptic ISO date strings** | Sortable, unambiguous, standard. Rejected: needs `new Date()` near the data, introduces timezone-dependent behaviour into a pure computation, and buys month/day precision the atlas does not have. |
| **Astral epoch plus duration** (`eraStart`, `durationDays`) | Most precise and the basis for a real timeline. Rejected as unreadable in a file humans edit, and as overkill for 32 coarse eras. |
| **A named era table** (`era: "classical" \| "medieval" \| …`) | Useful for grouping and orthogonal to the year. Rejected as *the* year encoding; `eraSchema.domain` already provides a comparable grouping. |
| **BC/AD suffixes in the number itself** (`"470 BC"`) | Rejected immediately: not a number, so no arithmetic. |
