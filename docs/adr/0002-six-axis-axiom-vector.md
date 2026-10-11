# ADR 0002 — The six-axis axiom vector is the compression, and the compression is the product

**Status:** Accepted (2026-05)
**Deciders:** core maintainers
**Applies to:** `packages/seed/src/types.ts` (`AXIOM_KEYS`, `axiomVectorSchema`), `packages/core/src/ethics/axioms.ts`, `packages/core/src/ethics/utilons.ts`, `packages/core/src/council/deliberation.ts`

---

## Context

Nooreign's central claim is that a verdict can be *explained* rather than merely
produced. The requirement that follows from that claim is narrow and brutal:

> Every number a reader sees on a council page must be reconstructible from other
> numbers on the same page, by arithmetic the reader can perform.

That rules out the obvious alternative. A language model can produce a fluent
justification for a verdict it reached by some other route; the justification is
generated after the fact and is not load-bearing. If the trace is narration, the
product is a mood.

So the verdict must be arithmetic. The question this ADR answers is: **arithmetic
over what?**

Candidates considered:

- **Free prose per dilemma.** One advisor writes "on this case, I would weigh the
  guard's death more heavily than the four saved." No two vectors, no dot
  product, nothing to compute, and no way to answer "what changed?" when the
  reader moves a dial.
- **Full numeric utilitarianism** (a single welfare scalar per advisor). Clean,
  famous, and it cannot express any of the traditions in the atlas except one.
  Bentham and Mill become the same person. Kant, Rawls, Gilligan and Appiah have
  nowhere to go, and the atlas would be a calculator wearing twelve hats.
- **A named-category vector** (rights, welfare, virtue, care, justice, agency, and
  more). Faithful but unusable. Twenty advisors × twenty dilemmas × a
  twenty-dimensional vector is a table nobody can read and an engine nobody can
  debug.
- **Six axes.** Compressed, lossy, and — crucially — *readable in full on one
  screen*, with a loss pattern that is itself worth stating.

## Decision

Every advisor, every kingdom and every dilemma option is a six-vector over a
fixed, ordered axis set. The order is a contract, not a convenience:

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

export const axiomVectorSchema = z.object({
  welfare: z.number().min(0).max(1),
  rights: z.number().min(0).max(1),
  virtue: z.number().min(0).max(1),
  care: z.number().min(0).max(1),
  justice: z.number().min(0).max(1),
  agency: z.number().min(0).max(1),
});
```

The score of an option for an advisor is the **weight-normalised dot product**:

```ts
// packages/core/src/ethics/axioms.ts
export function scoreOptionWith(weights: AxiomVector, option: DilemmaOption): number {
  const weightSum = sum(toArray(weights));
  if (weightSum === 0) return 0;               // no opinion, not NaN
  return round(
    safeDiv(sum(contributions(weights, option.deltas).map((c) => c.product)), weightSum),
    4,
  );
}
```

Normalising by `weightSum` rather than by `6` is what makes a lopsided Citadel
Kant and a broad Orchard Bentham comparable: each is scored as *how well this
option does on the things I care about*, not as an absolute moral score. Sums are
deliberately unconstrained — no tradition agrees on a budget for the six axes, so
imposing one would smuggle in a seventh, unstated, assumption.

A kingdom supplies priors and an advisor is scored 70/30 against the court they
sit on (`ADVISOR_KINGDOM_BLEND = 0.7`), which is why two utilitarians in
different kingdoms are not the same witness and why an unaffiliated advisor
scores with their own weights and nobody else's.

The trace keeps every term of the dot product:

```ts
export interface TraceContribution {
  readonly axiom: AxiomKey;
  readonly weight: number;   // advisor's weight on this axis
  readonly delta: number;    // option's honour on this axis
  readonly product: number;  // exactly weight * delta
}
```

so the UI can assert `Σ contributions[].product === subtotal` and
`total === subtotal + jitter`, and the displayed arithmetic is the deciding
arithmetic.

**Named trade-off:** six axes cannot represent loyalty to a particular person,
obligation to a community that is not my own, duties owed to future people
specifically, or professional and institutional roles. Gilligan's "say whose loss
this is, by name" is *partly* representable on `care` and not representable at
all as a first-class operation. The compression throws away the specific, and the
specific is usually where the interesting argument lives.

## Consequences

**Positive**

- The verdict is a total function of its inputs. Two readers, two machines, two
  days, same court, same numbers.
- A trace is six multiplications. It fits on a card, it is checkable by hand, and
  it does not need a post-hoc explanation because it is the explanation.
- Every disagreement in the product is *locatable*: two courts disagree, and the
  trace shows which product differed and by how much.
- Adding a kingdom is adding a row, not adding a theory of how to combine
  theories.
- Cross-language parity is tractable. `services/agents/app/models.py` and
  `crates/engine` re-declare the same six keys in the same order, and that
  re-declaration is testable.

**Negative**

- **Lossy, and knowingly so.** "Why six?" is a fair question and
  `/kingdoms` answers it in prose: four is a lie, six is what fits on a page.
- The dot product is **additive and commensurable**. It cannot represent
  lexicographic priority ("never do X, regardless of totals"), threshold
  constraints, vetoes, or genuine incommensurability between value types. Kant's
  rights-heavy position is modelled as a *large weight*, not as a *rule that
  trumps*. A weight of 0.95 and a weight of 1.0 are the same kind of thing; Kant
  would say the difference between them and 0.6 is categorical. This is the
  single largest representational cost in the system.
- Axis names are English moral vocabulary applied to non-English traditions. The
  `Middle Kingdom`, `Sangha Terraces` and `Ubuntu Weave` are being scored in a
  rubric that is not theirs.
- The normalisation means an advisor with an extreme vector is not penalised for
  intensity; only the *shape* of the profile is visible. Two advisors with very
  different absolute commitments can have identical scores.
- The `care` axis has no technique in the alignment stack that can honestly
  claim to speak to it at operational strength — see
  [ADR 0007](0007-choosing-the-six-axis-names.md).

## Alternatives considered

| Option | Why rejected |
| --- | --- |
| **Single welfare scalar (total utilitarianism)** | Only expresses one of the twelve courts honestly, and does so at the cost of the other eleven. |
| **Free-prose positions with no arithmetic** | Cannot satisfy the "explainable verdict" requirement; the explanation would be generated after the fact. |
| **Twelve or more axes** | Unreadable on a card, untestable at a glance, and every extra axis is a new place for a silent editorial judgement to hide. |
| **Six axes + a lexicographic priority field** | Attractive, and it is the honest fix for the veto problem. Rejected for now because a partial lexicographic engine is worse than an honestly additive one: it would make `scoreOptionWith` un-total, and the trace invariant would break. Revisit if someone wants to model hard constraints explicitly. |
| **Learned embeddings of advisors** | Interesting, opaque, and destroys the property the whole product is sold on. |
