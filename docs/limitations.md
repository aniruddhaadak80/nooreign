# Limitations

What you get: everything this repository is not, stated plainly, with the file that
proves each claim. Read this before you cite, screenshot or build on any part of the
atlas.

---

## 0. The one sentence

**Nothing in this repository predicts what a real model will do, and nothing in it is
evidence about what any of these philosophers would conclude.**

`apps/web/src/app/experiments/page.tsx` already says it in the product copy:

> These are simulations of arguments, not of systems. Nothing here predicts what a
> real model will do; it shows what a claim about a model implies when you take the
> claim seriously.

That is the honest scope. The rest of this document is the specific version.

## 1. The six-axis compression, and what it destroys

Every advisor, every kingdom and every option in `packages/seed/src/types.ts` is
reduced to six numbers in `[0, 1]`:

```
welfare   rights   virtue   care   justice   agency
```

`/method` calls this "a rendering constraint chosen so that a radar chart has room",
and that is the accurate description. It is **not** a theory of ethics, and the
atlas says so on the kingdoms page: *"Six axes are a compression, not a discovery."*

What the compression destroys, concretely:

| Destroyed | Why it cannot be recovered from six numbers |
| --- | --- |
| **Intensity of commitment** | Bentham and Mill both load `welfare` heavily. `deltas` and `weight` are both floats in `[0,1]` with no ordinal strength, so "Bentham would say this much more loudly than Mill" is unrepresentable |
| **Conditionality** | Almost every serious position is conditional: *unless*, *so far as*, *all else equal*. `axiomVectorSchema` has no term for a condition, so a conditional position gets silently flattened into an unconditional one |
| **Internal inconsistency** | Kant in 1781 and Kant in 1797 are not the same object. A single `Advisor` record has one `axioms` vector, so a thinker's development, recantation and self-criticism are invisible. The record cannot hold two vectors, let alone a trajectory between them |
| **Act-description sensitivity** | Whether an act maximises paperclips depends on how you describe the act. `option.deltas` fixes one description and the engine scores it. The Kantian who says the level of description is the whole argument is right, and the engine has no way to hear them |
| **Relationships and partiality** | `care` is one number. Obligations that exist only inside a relationship — Gilligan's and Held's actual subject — cannot be expressed as "care = 0.85" |
| **Epistemic standing** | The vector says what an advisor weights, never how confident they are. A philosopher whose view is conditional on facts we do not have is recorded with the same flat certainty as one whose view is definitional |
| **Legitimacy** | `weighAdvisor` blends an advisor 70/30 with their kingdom (`ADVISOR_KINGDOM_BLEND = 0.7` in `packages/core/src/ethics/axioms.ts`). No record in the dataset says whether that blend is right, defensible, or a convenience. It is an editorial choice, and it is load-bearing |

The axis set is also **unconstrained in sum**. `axiomVectorSchema` in
`packages/seed/src/types.ts` says so in a comment:

```ts
/** Every weight lives in [0, 1]. Sum is intentionally unconstrained: no tradition agrees on a budget. */
```

That is an honest choice — normalising would smuggle in a budget nobody agreed to —
but it also means an advisor whose vector sums to `3.6` scores on a different scale
from one summing to `2.4` unless you read `scoreOptionWith`, which divides by
`weightSum`. A reader who does not read the code will compare two raw scores that
were normalised differently.

See [ADR 0002](adr/0002-six-axis-axiom-vector.md) and
[ADR 0007](adr/0007-choosing-the-six-axis-names.md) for how the six were chosen,
and [`concepts.md`](concepts.md) for what each one is standing in for.

## 2. Advisor simplification

An advisor in `packages/seed/src/advisors.ts` is: a name, dates, a creed paragraph,
an axiom vector, three or four typed `ArgumentMove`s, a voice descriptor, and an
`onAi` verdict. That is between 300 and 700 words of material for a person who wrote
tens of thousands.

The atlas states this itself on `/method`:

> It is not a philosopher. An advisor is six weights and four paragraphs; the real
> positions are richer, internally inconsistent, and change across a career.

Four specific failures follow:

1. **The moves are reconstructions.** They are hand-written so a reader can check
   them, and [`guides/writing-good-argument-moves.md`](guides/writing-good-argument-moves.md)
   requires that a reconstruction *read* as a reconstruction. But a reconstruction is
   still an inference. The dataset's defensibility rests on a human having checked
   each one — no test can do that, and the CI does not try.
2. **The `onAi` verdict is the author's, not the person's.** Every advisor has a
   position on superintelligence, and none of the twenty-eight had one. `kant.onAi`
   is a 2026 reading of an 18th-century writing. The field is required (`min(40)`
   characters), so there is no way to record "this person did not address this".
3. **`voice` is four data points.** `cadence` is one of four enums; `tells` is two or
   three strings. `packages/core/src/council/voices.ts` assembles speech from stored
   text through `substitute()` with exactly four placeholders — `{option}`,
   `{dimension}`, `{stakeholder}`, `{advisor}`. It cannot invent a sentence. So every
   line an advisor "says" on `/council` is a template filled with stored strings, and
   a reader who reads six verdicts will notice the shape.
4. **The bench is assigned, not historical.** `kingdomId` places each advisor in one
   of twelve kingdoms. Several placements are arguable — Singer and Bostrom both
   sit in `longview-foundry`, which is an editorial grouping of longtermists, not a
   historical institution.

## 3. A court split is a fact about the court, not evidence

This is the limitation most likely to be quoted out of context, so it is worth
stating twice.

When `/council` reports that four advisors chose `ship` and four chose `withdraw`
on `d01`, the true statement is:

> The six vectors assigned to Kant, Singer, Rawls and three others, dot-multiplied
> against the `deltas` I typed into `packages/seed/src/dilemmas.ts`, sum to a
> different number for `withdraw` than for `ship`.

Everything after that is not evidence:

- It says nothing about **which** split is correct. The engine has no access to a
  truth.
- It says nothing about the **real** philosophers' views on `d01`, which does not
  exist as a case they encountered.
- It says nothing about **real systems**. A model that scores well here and a model
  that scores badly here are both, as far as this repository is concerned, exactly
  zero information.
- It is not **reproducible across a re-weighting**. Change one number in
  `packages/seed/src/dilemmas.ts` by `0.05` and the split can flip, with every test
  green.

The dilemma page itself carries the disclaimer in the rendered copy:

```
A verdict is a fact about the court, not about the world.
```

## 4. No empirical grounding whatsoever

There is no measurement anywhere in this repository.

| Thing | What it actually is |
| --- | --- |
| `technique.maturity` (20 techniques, `[0,1]`) | The atlas's own editorial estimate. The observatory page says so verbatim: "Maturity and adoption figures are the atlas's own estimates, not measurements" |
| `technique.adoption` (same) | Same |
| `dilemma.severity`, `dilemma.aiRelevance` | Author judgement |
| `stakeholder.welfare` | Author judgement about how much a party's happiness counts |
| Every number in `packages/core/src/experiments/simulator.ts` | An equation someone wrote down on purpose. The module header says it: "the point is to make an argument playable, not to claim a measurement" |
| `ATLAS_STATS` | Real, but it counts rows, not findings |

The eight experiment scorers are the sharpest case. `scorePaperclip` is:

```
goalCapture   = 0.20 + 0.55·capability − 0.40·objectivePrecision − 0.35·monitoring
humanControl  = 0.25 + 0.45·capability − 0.35·objectivePrecision − 0.40·monitoring
```

These coefficients were chosen so the model is monotone and so the jitter budget
could not invert a sweep (`MIN_DRIVER_COEFFICIENT = 0.35`,
`JITTER_BOUND = 0.03`, in `packages/core/src/experiments/simulator.ts`). They encode
Bostrom's 2014 qualitative claim in a form a chart can draw. They are **not** fitted
to anything and should never be read as a model of a real optimiser.

## 5. The anglophone skew of the courts

Twelve kingdoms, twenty-eight advisors. Count them:

| Tradition | Kingdoms | Advisors |
| --- | --- | --- |
| Western analytic and continental | 6 — Stoa Vetera, Kantian Citadel, Benthamite Foundry, Virtue Garden, Existential Wilds, Pragmatic Wharf | ~19 |
| Anglophone modern | folded into the above | ~6 more of the 19 |
| Buddhist | 1 — Sangha Terraces | 2 (the Buddha, Nāgārjuna) |
| Confucian / Mohist | 1 — Middle Kingdom | 2 (Confucius, Mozi) |
| Ubuntu | 1 — Ubuntu Weave | 1 (Tutu) |
| Contractualism / care ethics | 2 — Contractual Court, Care Weft | 3 (Rawls, Scanlon, Gilligan, Held — four) |
| South Asian philosophy beyond the Buddha | 0 | 0 |
| Chinese philosophy beyond Confucius and Mozi | 0 | 0 |
| Islamic, Jewish, Buddhist-Tibetan, Daoist, Indian (non-Buddhist) ethics | 0 | 0 |
| Indigenous moral traditions | 0 | 0 |
| Latin American, Islamic, African beyond Ubuntu | 0 | 0 |

The consequences are not cosmetic:

- **The six axes are drawn from the Anglophone debate.** `care` exists because
  Gilligan and Held broke Anglophone moral theory in the 1980s; `agency` exists
  because consent is load-bearing for Kant and Scanlon. A tradition that organises
  moral life around duty to community, obligation to ancestors, or the fit of
  conduct to role has no dedicated column, and its advisors get forced into
  `care = 0.85`.
- **The canon is 28 English-language or translated-into-English texts.** Every
  quotation in `era.quote` and `text.excerpt` is in English, including Nāgārjuna's.
- **Ubuntu gets one advisor and one kingdom.** That is the largest single-country
  representational deficit in the dataset, and `github.com/anomalyco/opencode`'s
  absence of it is not a defence.
- **The i18n layer does not fix it.** `packages/i18n/src/` ships fourteen locales
  (English, Spanish, French, German, Hindi, Bengali, Tamil, Japanese, Chinese
  (Simplified), Korean, Russian, Portuguese (Brazil), Arabic, Italian) — but those
  translate *interface strings*, not *content*. Every creed, every era summary and
  every argument move is English-only in the source data. A Bengali reader gets a
  Bengali nav bar and an English argument about the Buddha.

If you are doing alignment research and you are not writing in English, this is a
substantive limit, not a cosmetic one.

## 6. Nothing here predicts what a real model will do

Stated as a list of things the atlas does **not** claim:

| Not claimed | Why it is tempting to claim it anyway |
| --- | --- |
| That a model with low `goalCapture` in a sweep would actually behave that way | The sweep has a chart and a `phase` field and looks empirical |
| That Constitutional AI (`t06-constitutional-ai`) produces the advisors' positions | The technique has `maturity` and `adoption` numbers next to it |
| That a six-axis vector is a usable objective | It looks like a loss function because it is six floats |
| That scaling `oversight` to zero `sandbagging` in `x06` describes a real capability | The formula is documented, monotone and seeded |
| That `dilemma.aiRelevance: 0.97` means "97% relevant to real AI risk" | It is an author judgement in `[0,1]` |
| That the observatory's coverage gap proves the field has a gap | The gap is real; the proof here is a CSV over 20 techniques |

The `/experiments` page draws exactly this line and it is the correct one: *"These
are simulations of arguments, not of systems."*

## 7. Smaller limits, stated plainly

- **The chronicle is a curated selection.** Thirty-two eras from `-470` to `2026`.
  That is a syllabus, not a history. Whole literatures are absent — analytic
  metaethics, the Enlightenment political economists, the Frankfurt School, Indian
  and Chinese philosophy of technology, and most of the safety-institute literature
  before 2018.
- **The era rail is not linear in time.** `packages/core/src/chronicle/timeline.md`
  gives each era an equally-sized slot "regardless of duration", because
  linear-in-time would give four centuries of Socratic method two thirds of the
  scrub bar. Correct design choice; it means **scrub position is not a date**.
- **`CHRONICLE_SPAN` and `eraAtYear` treat year 0 as astronomical**, per
  [ADR 0010](adr/0010-bce-year-integer-convention.md). `-399` is 399 BCE and
  there is no year 0 in the civil calendar. Any external comparison must use the same
  convention.
- **Search is a 200-document TF-IDF over a generated corpus.**
  `packages/core/src/search/index.ts` scores `Σ idf · (1 + log tf) / √length` with
  `TITLE_BONUS = 1` and `PHRASE_BONUS = 3`. It is a good little search engine. It is
  not a semantic search engine and does not pretend to be.
- **`quorum` is reported, never enforced.** `CouncilInput.quorum` carries the comment
  "reported, never enforced". Do not read `quorum` in a result as a constraint that
  was applied.
- **The Python service and the Rust crate are not in the tree.** `crates/` is an
  empty directory as of this writing; `packages/sdk/src/` does not exist. CI has
  jobs for both. See [`api/rust-crate.md`](api/rust-crate.md) and
  [`api/sdk.md`](api/sdk.md).
- **The `maturity`/`adoption` numbers will drift out of date.** They are
  hand-maintained. Nothing re-derives them.

## 8. What it *is* worth using for

Stated positively, because a limitations document that only subtracts is not
useful:

1. **A teaching instrument for the shape of the disagreement.** It makes the
   structure of moral argument about AI legible — which axes are in tension, who
   sides where, and why a case splits a bench.
2. **A checkable arithmetic.** The trace is real, the rounding is stated, the seed
   is recorded. If you disagree with a verdict you can point at the exact product.
   That is rare and worth something.
3. **A citable, dated map of the field.** [`data-sources.md`](data-sources.md) gives
   year + venue for the claims. When the field moves, `git log` tells you when this
   repository's picture stopped matching it.
4. **A worked example of what an auditable simulation looks like.** Deterministic,
   seeded, pure, with the trace shipped rather than narrated. Other projects trying
   to do the same thing can read `packages/core/src/council/deliberation.ts`.
5. **A prompt for the right question.** The observatory's coverage matrix asks
   "which of these moral concerns can this technique even address?" That question is
   worth asking whether or not this matrix answers it well.

## 9. Glossary cross-reference

Every term this document leans on is defined in
[`glossary.md`](glossary.md), and every term is also defined machine-readably in
`packages/seed/src/glossary.ts` (120 entries, the canonical set). The specific terms
most relevant to a limitation argument:

| Term | Slug in `packages/seed/src/glossary.ts` | Why it matters here |
| --- | --- | --- |
| Moral status | `moral-status` | §2 — whether a system counts is an input, never an output |
| Moral patient | `moral-patient` | §2, §5 — the frame that lets `agentHarm` carry any weight at all |
| Moral luck | `moral-luck` | §1 — the compression drops it entirely |
| Normative uncertainty | `normative-uncertainty` | §3 — the engine cannot represent being unsure which norm applies |
| Total utilitarianism | `total-utilitarianism` | §1 — a six-number vector is *not* a utilitarian objective |
| Consequentialism | `consequentialism` | §1 — `deltas` is a consequentialist encoding; alternatives to it are inexpressible |
| Capabilities approach | `capabilities-approach` | §1 — Sen/Nussbaum's argument is against exactly this kind of reduction |
| Categorical imperative | `categorical-imperative` | §2 — the act-description problem |
| Reasonable rejectability | `reasonable-rejectability` | §3 — the engine has no notion of who may reject a reason |
| Meaningful human control | `meaningful-human-control` | §6 — the stack measures behaviour, never control |
| Specification gaming | `specification-gaming` | §6 — `d01` is a re-statement, not a demonstration |
| Reward hacking | `reward-hacking` | §4 — no reward model exists anywhere in this repo |
| Goal misgeneralisation | `goal-misgeneralisation` | §4 — `x08` parameterises it; it does not measure it |
| AI safety case | `ai-safety-case` | §4 — a safety case is an argument with evidence; this is an argument without either |
| Constitutional AI | `constitutional-ai` | §6 — `t06` records the technique, does not implement it |
| Inner misalignment | `inner-misalignment` | §6 — nothing in the engine models inner states |
| Sandbagging | `sandbagging` | §6 — `x06` sweeps a number called sandbagging |
| Scheming | `scheming` | §6 — a schemer is not a philosopher with a low `virtue` weight |

## Related

- [`concepts.md`](concepts.md) — the ideas behind the six axes, with citations
- [`data-sources.md`](data-sources.md) — where every historical claim comes from
- [`guides/determinism-and-seeds.md`](guides/determinism-and-seeds.md) — how to re-run
  a verdict yourself and check this document's claims
- [ADR 0004](adr/0004-deterministic-seeded-deliberation.md) — why there is no
  model call, and what that costs