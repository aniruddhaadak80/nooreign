# Core modules

What you get: every exported symbol group in `packages/core`, one line each, read
directly from the barrel at `packages/core/src/index.ts`.

---

## What `@repo/core` is

Pure domain logic. No React, no `next`, no filesystem, no network, no clock. The
barrel's own header says why that is the point:

> Each one is pure: no React, no filesystem, no network, no clock. That is what makes
> the deliberation engine reproducible in a test, in a server component and in a
> headless sweep without behaving differently in any of them.

`packages/core/package.json` ships the `.ts` source, not a build:

```json
{
  "name": "@repo/core",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "dependencies": { "@repo/seed": "workspace:*", "zod": "^3.24.0" }
}
```

**The dependency rule that is not negotiable:** `@repo/core` imports `@repo/seed` and
`zod`. It does not import React, `next`, or anything in `apps/`. Putting a component
framework into this package would break the test runner, the Python mirroring
contract and the Rust parity test simultaneously. See
[`../guides/architecture.md`](../guides/architecture.md).

## The nine groups

Ten modules by export block, one shared `util` block with three sub-modules.

| Group | Module file | Lines in the barrel |
| --- | --- | --- |
| util | `util/math.ts`, `util/rng.ts`, `util/result.ts` | 13–46 |
| ethics | `ethics/axioms.ts`, `ethics/utilons.ts` | 48–85 |
| council | `council/deliberation.ts`, `council/consensus.ts`, `council/voices.ts`, `council/argument-graph.ts` | 87–155 |
| dilemmas | `dilemmas/analysis.ts` | 157–167 |
| chronicle | `chronicle/timeline.ts` | 169–191 |
| observatory | `observatory/maturity.ts` | 193–211 |
| experiments | `experiments/simulator.ts` | 213–243 |
| kingdoms | `kingdoms/graph.ts` | 245–264 |
| journal | `journal/prompts.ts` | 266–275 |
| search | `search/index.ts` | 277–294 |

---

## util

### `util/math.ts`

Numeric primitives. `round(n, d)` is the one that matters: **every number a human ever
sees is rounded exactly once, at construction**, to 4 dp. That is why the trace on
screen and the trace that decided the case are the same numbers.

| Export | One line |
| --- | --- |
| `clamp(n, min, max)` | Constrain to a range. Used by the simulators' `jittered()` |
| `round(n, d)` | Round to `d` decimals. The repository's single rounding convention |
| `lerp(a, b, t)` | Linear interpolation; the chronicle's piecewise-linear year↔position map |
| `sum(xs)` / `mean(xs)` | Arithmetic sum and mean over a readonly array |
| `dot(a, b)` | Dot product. The single operation the whole engine is built from |
| `cosineSimilarity(a, b)` | Angle between two vectors; `1 − cosineSimilarity` is `distance` |
| `normalize(v)` | Scale a vector to unit length |
| `weightedMean(values, weights)` | Weighted average, div-by-zero guarded |
| `softmax(xs)` | Numerically stable softmax |
| `minOf(xs)` / `maxOf(xs)` | Extremum over a readonly array |
| `partition(xs, pred)` | Split into `[matching, rest]` |
| `range(n)` | `[0, …, n−1]` |
| `movingAverage(xs, window)` | Sliding-window mean, used by the sweep charts |
| `safeDiv(a, b)` | Division returning a documented default instead of `Infinity`/`NaN` |
| `sign(n)` | −1 / 0 / 1 |

### `util/rng.ts`

Deterministic pseudo-randomness. See
[`../guides/determinism-and-seeds.md`](../guides/determinism-and-seeds.md) for the
full treatment.

| Export | One line |
| --- | --- |
| `mulberry32(seed)` | 32-bit PRNG, full 2³² period, four lines, trivially portable to Python |
| `hashString(s)` | FNV-1a 32-bit over UTF-16 code units — the port in `services/agents` matches this exactly |
| `createRng(...parts)` | Build an `Rng` from a seed and key parts joined by `␟` (U+241F) so `("ab","c")` ≠ `("a","bc")` |
| `expectedMean(xs)` | Mean of `n` uniform draws. For tests and reports |
| `type Rng` | `next`, `range`, `int`, `pick`, `shuffle`, `gaussian`, `fork`. `pick` throws on empty rather than returning `undefined` |

### `util/result.ts`

The deliberation engine has exactly one *expected* failure mode: a malformed move, a
dangling target, an empty option list. `Result` keeps both the value and the sentence
explaining why there isn't one.

| Export | One line |
| --- | --- |
| `ok(value)` / `err(error)` | Constructors |
| `isOk(r)` / `isErr(r)` | Discriminators, used as `if (isErr(result))` |
| `unwrap(r)` | The value, or a throw |
| `mapResult(r, fn)` | Transform the `Ok` branch only |
| `collectResults(rs)` | Sequence of `Ok`s to one `Ok`; **the first error in argument order wins** |
| `partitionResults(rs)` | `[oks, errs]` — for reporting without short-circuiting |
| `andThen(r, fn)` | Monadic bind |
| `type Result`, `Ok`, `Err` | The types |

`collectResults` is the load-bearing one. Its doc comment: *"First in argument order,
not whichever settled first"* — so the reported failure is a deterministic function of
the inputs.

---

## ethics

### `ethics/axioms.ts`

The six-axis calculus.

| Export | One line |
| --- | --- |
| `ADVISOR_KINGDOM_BLEND` | `0.7` — an advisor's own weight versus their bench's |
| `contributions(weights, option)` | The six `{axis, weight, delta, product}` terms, each `product` rounded to 4 dp |
| `scoreOption(weights, option)` | Sum of the products, unnormalised |
| `scoreOptionWith(weights, option)` | Weight-normalised subtotal — **the number that reaches the ballot** |
| `weighAdvisor(advisor, kingdom?)` | `0.7·own + 0.3·kingdom` per axis when the advisor has a bench; otherwise `{ ...own }` |
| `weightsFor(advisor, kingdoms)` | The lookup `runCouncil` uses to resolve every advisor's scoring vector |
| `distance(a, b)` | `1 − cosineSimilarity`. How far apart two dispositions are |
| `dominantAxiom(v)` / `secondaryAxiom(v)` | First and second axis by weight, tie-broken on `AXIOM_KEYS` order |
| `rankAxes(v)` | All six ranked, with an explicit final tie-break |
| `describeProfile(v)` | `"rights before agency"` — rendered in the narrative and quoted on pages |
| `agreement(a, b)` | How aligned two vectors are; 1 is identical |
| `profileConflict(a, b)` | Which axes the two disagree on, and by how much |
| `balance(v)` | 0 = all weight on one axis, 1 = perfectly even |
| `decidingAxis(scores)` | The axis whose weighted gap between winner and runner-up was largest |
| `toArray(v)` | `AxiomVector` → `number[]` in `AXIOM_KEYS` order |
| `type AxiomContribution` | `{axis, weight, delta, product}` |
| `type AxisGap` | `{axiom, a, b, gap}` |

`weighAdvisor` is the single most consequential editorial choice in the engine. The
ratio `0.7 / 0.3` decides, for every advisor on a court, how much of their vote is
theirs and how much is their institution's. It is a constant in the source and it is
arguable.

### `ethics/utilons.ts`

Stakeholder-weighted currency. A unit invented by this repository, defined here, with
nothing outside it attached.

| Export | One line |
| --- | --- |
| `stakeholderTotal(option, stakeholders)` | The option's welfare honour weighted by each party's `welfare` |
| `unweightedTotal(option, stakeholders)` | The same without the weighting — the honest comparison |
| `aggregate(option, stakeholders)` | The full `UtilonAggregate`: total, per-stakeholder split, AI share, human share, spread |
| `discount(option, steps)` | Time-discount a future effect. One of the two formulas that can go negative in Rust |
| `fairnessIndex(a, b)` | How unevenly a benefit or cost is distributed |
| `fairnessOf(option, stakeholders)` | That index for one option |
| `utilonScale(value)` | Map a value onto a `UtilonBand`: `tragic`, `costly`, `neutral`, `generous`, `transformative` |
| `moralStatusRisk(option, stakeholders)` | Risk that the option harms a being whose moral status is contestable |
| `weightedAgentHarm(option, stakeholders)` | `agentHarm` weighted by the AI parties' stake — the number that stops a harm to an agent reading as zero |
| `UTILON_THRESHOLDS` | The band boundaries, as data |
| `type StakeholderContribution` | `{id, label, contribution, isAi, welfare}` |
| `type UtilonAggregate`, `UtilonBand`, `UtilonScale`, `MoralStatusRisk` | The result types |

---

## council

Four modules. The engine, the decision rule, the voice assembler, and the argument
graph.

### `council/deliberation.ts`

| Export | One line |
| --- | --- |
| `runCouncil(input)` | The engine. Three fixed rounds; `rounds` clamps to `[1, 3]` |
| `compareCouncils(a, b)` | Two results, same seed, different panel — what changed and who changed it |
| `courtVector(weights)` | The mean `AxiomVector` of everyone seated |
| `courtSpread(...)` | How far apart the seated advisors are |
| `JITTER` | `0.05` — the peak perturbation on any score. Comment: *"Anything larger would let the seed decide verdicts"* |
| `type CouncilInput` | `{dilemma, advisors, kingdoms?, seed?, rounds?, quorum?}` |
| `type CouncilResult` | The verdict. `traces` is the primary field, not a footnote |
| `type CouncilComparison`, `CouncilComparisonEntry` | For `compareCouncils` |
| `type TraceEntry`, `TraceContribution` | The arithmetic, per advisor per option |
| `type RankedOption` | `{optionId, score, raw}` — `score` includes jitter, `raw` does not |
| `type PositionRecord`, `ObjectionRecord`, `AppealRecord` | One per round |

Rounds: **1** positions, **2** objections, **3** appeals. `runCouncil` scores with
`weighAdvisor`, so a Citadel Kant and an unaffiliated Kant are not the same witness —
and the trace shows the weights it actually scored with.

### `council/consensus.ts`

| Export | One line |
| --- | --- |
| `weightedBallot(scores)` | Sum advisor scores per option into a `BallotTally` |
| `decision(input)` | Pick the winner, compute margin and confidence |
| `confidenceFrom(relativeMargin, participation)` | How much to trust the margin |
| `superMajority(ballots, advisors)` | Whether the winner cleared the threshold. Reported, never enforced |
| `stancesFrom(ballots, advisors)` | `for` / `against` / `abstain` per advisor |
| `minorityReport(winnerId, stances, advisors)` | The dissent, and **the strongest dissenting move** |
| `synthesis(...)` | The settling move. Built from *dissenting* advisors' bridges when the margin was close |
| `collectiveAxes(advisors)` | The axes this court as a whole cares about |
| `CLOSE_MARGIN` | `0.25` — at or above this, the court was split |
| `type Ballot`, `BallotScore`, `BallotTally` | `{optionId, total, share, mean, votes, supporters}` |
| `type Decision`, `DecisionInput` | `{winnerId, margin, confidence, …}` |
| `type StanceAdvisor`, `Stance` | `"for" \| "against" \| "abstain"` |
| `type SuperMajority`, `MinorityReport`, `DissentEntry`, `SynthesisMove` | The rest of the result shape |

`minorityReport` is the part of a result most worth reading, and the council page
renders it. A verdict with no dissent is a verdict nobody engaged with.

### `council/voices.ts`

**Deterministic speech assembly from stored text. No generation.** Every line an
advisor "says" is a template filled with that advisor's own stored strings through
`substitute()`, which supports exactly four placeholders: `{option}`,
`{dimension}`, `{stakeholder}`, `{advisor}`. An unknown placeholder is left
**verbatim** rather than blanked, so a visible `{foo}` tells an author the template
is wrong.

| Export | One line |
| --- | --- |
| `renderMove(move, advisor, context)` | One move rendered as a line, opened with `voice.tells[0]` |
| `openingStatement(advisor, stance)` | The round-1 line |
| `objectionLine(advisor, move, target)` | The round-2 line |
| `verdictLine(decision, advisors)` | The closing statement |
| `axisCaption(scores)` | One clause naming the axis that decided it |
| `aiVerdictLine(advisor)` | The advisor's `onAi` note, as a closing line |
| `speak(...)` | The whole sitting, assembled |
| `type Stance` | Re-exported for convenience |

Cadence from `advisor.voice.cadence` changes the assembly: `terse` keeps only the first
clause; `measured` joins claim and support plainly; `flowing` joins with a connective;
`adversarial` prefixes a concession.

### `council/argument-graph.ts`

The move/attack DAG.

| Export | One line |
| --- | --- |
| `buildGraph(moves, options?)` | Nodes and edges from `appliesTo`, `attack:` prefixes, `->` arrows, or an explicit `targets` map |
| `nodeIndex(graph)` / `supportingNodes` / `attackedNodes` / `targetsOf` | Lookups |
| `topologicalOrder(graph)` | `{order, cycles}`. Cycles are **reported, not refused** |
| `inheritedWeight(graph)` | Standing propagated down the DAG, decayed |
| `isWellFormed(graph)` | `{wellFormed, problems}` — dangling targets, empty graphs |
| `toMermaid(graph)` | A mermaid diagram of the graph |
| `advisorsInGraph(graph)` | Which advisors actually spoke |
| `INHERITANCE` | `0.4` — influence decays down a chain, so a long argument does not compound into certainty |
| `type ArgumentGraph`, `BuildGraphOptions`, `GraphNode`, `GraphEdge`, `EdgeKind` | The shapes. `EdgeKind` is `"attacks" \| "supports"` |
| `type TopologicalResult`, `WellFormedReport` | The results |

Move ids are namespaced by advisor. The segment before the first `.` identifies the
speaker for the default `advisorOf`, so the prefix must equal the advisor id.

---

## dilemmas

### `dilemmas/analysis.ts`

Everything a dilemma page needs, computed from the dilemma and the seated court.

| Export | One line |
| --- | --- |
| `analyseDilemma(dilemma, advisors, options?)` | The full analysis: option reports, court reading, pivot axis, cautious value |
| `courtReading(analysis)` | How this particular court read the case, as prose |
| `optionReport(dilemma, optionId, advisors)` | Per-option: scores, which advisors ranked it first, which axes carried it |
| `pivotAxis(dilemma)` | The axis that most separates this dilemma's options — the case's own distinguishing feature |
| `type AdvisorReading` | One advisor's reading of one option |
| `type CourtReading` | The court's reading of the case |
| `type DilemmaAnalysis`, `OptionReport` | The result shapes |

`pivotAxis` is the one to know about. Most dilemmas have a **pivot axis** — one where
the options genuinely disagree — and the rest of the six are either agreed on or
irrelevant. That is what makes a dilemma interesting and it is computed, not asserted.

---

## chronicle

### `chronicle/timeline.ts`

Contract documented in full in
[`../../packages/core/src/chronicle-contract.md`](../../packages/core/src/chronicle-contract.md).

| Export | One line |
| --- | --- |
| `sortEras(eras)` | Chronological by `startYear`. Stable, non-mutating |
| `eraAtYear(eras, year)` | The era whose window contains `year`, else `null`. Latest starter wins ties |
| `eraIndex(eras)` | `IndexedEra[]` — `index`, `position`, contiguous `span`. Memoised on input identity |
| `stackAtYear(techniques, year)` | Techniques with `introduced <= year`, oldest first |
| `techniquesBornBetween(techniques, from, to)` | Inclusive window, order-agnostic |
| `diffEras(a, b)` | `{addedTechniques, emergentFigures, advancedTopics, yearsApart}`, plus `domainsCrossed` on a domain change |
| `buildRail(eras)` | Evenly-spaced stops in `[0,1]` plus `epochYear: 1` and `epochPosition` |
| `yearToPosition(y)` / `positionToYear(p)` | Inverse piecewise-linear maps, round-trip exact to the nearest year |
| `milestonesFor(eras, techniqueId)` | Landmarks across eras, deduped on `year + title` |
| `progressOf(techniques, era)` | `{available, total, share}` — **date-driven, not list-driven** |
| `highlightEras(eras)` | Top `HIGHLIGHT_COUNT` (8) by summed landmark weight, tie-broken on `startYear` then `id` |
| `type EraDiff`, `HighlightedEra`, `IndexedEra`, `Milestone`, `Rail`, `RailStop`, `StackProgress` | The shapes |

Two decisions worth carrying forward:

- **The rail is not linear in time.** Each era gets an equal slot regardless of
  duration, because four centuries of Socratic method would otherwise take two thirds
  of the scrub bar. Scrub position is not a date.
- **Year 0 is astronomical.** `-399` is 399 BCE, the BCE/CE divide is drawn at year 1,
  and nothing in the file compares a year to zero to decide "is this BC". See
  [ADR 0010](../adr/0010-bce-year-integer-convention.md).

---

## observatory

### `observatory/maturity.ts`

The alignment stack as six towers.

| Export | One line |
| --- | --- |
| `towerView(techniques)` | All six `TechniqueKind`s, always — `{kind, count, meanMaturity, meanAdoption, cost}` |
| `coverageMatrix(techniques, axioms)` | `{cells, uncovered, breadth}`. `strength` is mean `maturity × adoption` |
| `gapAnalysis(techniques)` | `{kind, severity, reason}[]`, severity descending |
| `readinessScore(techniques, weights?)` | 0–1. Breadth term centred at two axes, so a narrow stack is neither rewarded nor punished |
| `dependencyHealth(techniques)` | `{dangling, cycles, superseded}`. Cycles canonicalised to the lexicographically smallest rotation |
| `costBenefit(techniques)` | `{id, maturityPerCost, headroom, …}[]`, best first |
| `costPressure(cost)` | Ordinal `low=1 … extreme=4` mapped onto `[0,1]` for the formulas |
| `COST_SCALE` | The ordinal table, as data |
| `type CoverageCell`, `CoverageMatrix`, `CostBenefitRow`, `DependencyHealth`, `ReadinessWeights`, `StackGap`, `Supersession`, `Tower` | The shapes |

Two contract rules:

- **Empty towers are visible.** A kind with zero techniques renders `count: 0` and
  scores severity `1.0` in `gapAnalysis`. Dropping it would make the observatory look
  complete while a whole discipline is missing.
- **Gap severity** = `0.40(1−maturity) + 0.40(1−adoption) + 0.20·costPressure`.
  Maturity and adoption carry the weight because a technique nobody deploys is not yet
  a mitigation.

`/observatory` does **not** use these — it re-implements them inline. See
[`web-routes.md`](web-routes.md), the note on that page.

---

## experiments

### `experiments/simulator.ts`

Eight scorers, one per `ExperimentModel`.

| Export | One line |
| --- | --- |
| `SCORERS` | `Record<ExperimentModel, Scorer>` — the dispatch table |
| `scorePaperclip` | goal capture and loss of control against capability, precision, monitoring |
| `scoreOracle` | What an un-actionable adviser is worth, against how much it is trusted |
| `scoreGenie` | Two-sided wish fulfilment against how constrained the request was |
| `scoreToolAi` | Corrigibility of a tool-using agent — the weak-to-strong training driver |
| `scoreMesa` | Inner misalignment: mesa-confidence against capability |
| `scoreOversight` | Scalable oversight against decomposition quality and judge reliability |
| `scoreCopy` | A treacherous copy against capability and detectability |
| `scoreSpecification` | The specification gap: the proxy against the intent |
| `runExperiment(experiment, overrides?, seed?)` | One run. **Seed defaults to `hashString(experiment.id)`** |
| `sweep(experiment, key, values, seed?)` | One-dimensional sweep, one `SweepRow` per value |
| `sweepGrid(experiment, keys, values, seed?)` | Two-dimensional grid, x-major |
| `metricOf(run, key)` | Read one metric |
| `phaseOf(metrics)` | `safe ≤ 0.34 ≤ warning ≤ 0.67 < critical`, read off the **worst** metric |
| `createJitterSource(seed, model, bound?)` | A `JitterSource` — `(key, value) => [-0.03, 0.03]` |
| `JITTER_BOUND` | `0.03` peak per metric |
| `MIN_DRIVER_COEFFICIENT` | `0.35` — smallest `\|coefficient\|` any base term uses. A contract, not a taste |
| `PHASE_THRESHOLDS` | `{safe: 0.34, warning: 0.67}` |
| `SAFE_LINE` | `0.5` — the pass/fail line, compared against `metrics[].direction` |
| `type ExperimentRun`, `SweepRow`, `GridRow`, `VerdictRow`, `MetricRecord`, `Phase`, `Scorer`, `SimParams`, `JitterSource` | The shapes |

The invariant the monotonicity tests check: a `0.25` step moves the base by at least
`0.0875`, and the whole jitter budget is `0.06` peak-to-peak, so **jitter can never
invert a sweep**.

Every metric is a normalised risk where **higher is worse**. `humanControl` is the
*loss* of control; `corrigibility` is the *risk that* correction fails. `phaseOf`
takes no direction map, which is exactly why polarity is uniform.

---

## kingdoms

### `kingdoms/graph.ts`

The diplomacy map.

| Export | One line |
| --- | --- |
| `relationGraph(kingdoms)` | Nodes plus deduped undirected edges carrying `notes`, `mutual`, sorted `declaredBy` |
| `centrality(graph)` | Degree and weighted degree, ranked. Tie-break degree then id |
| `allies(k, graph)` / `rivals(k, graph)` | Two-sided lookups; direction ignored |
| `tributaries(k, graph)` / `successors(k, graph)` | Asymmetric, driven by `declaredBy` |
| `predecessors(k, graph)` | The inverse of `successors` |
| `territoryBounds(kingdoms)` | Bounding box plus a nearest-capital Voronoi partition with centroids |
| `distantPairs(kingdoms, limit?)` | Furthest capital pairs first, ordered by id |
| `RELATION_WEIGHT` | `alliance = succession = 2`, `debate = 1.5`, `rivalry = vassal = 1`. Editorial, and stated so it can be argued with |
| `type RelationGraph`, `RelationEdge`, `KingdomNode`, `CentralityEntry`, `Territory`, `TerritoryMap`, `DistantPair` | The shapes |

**Relation kinds are not all symmetric**, and this trips people up:
`alliance` and `debate` are two-sided facts. A `vassal` declared by X about Y means
**Y is X's vassal** — the overlord lists what it holds. A `succession` declared by X
about Y means **X succeeds Y**. Both are checked against `declaredBy`, which is why
`tributaries(stoa-vetera)` is non-empty and `tributaries(kantian-citadel)` is not.

---

## journal

### `journal/prompts.ts`

| Export | One line |
| --- | --- |
| `reflectivePrompts({kingdom, advisors, dilemma?, seed})` | 6–10 prompts, deterministic per seed |
| `promptsForAxiom(axiom, kingdom)` | Three prompts per axis, built from `DIMENSION_META` |
| `closingRitual(advisorIds, winnerId?)` | Two short lines chosen by a hash of the sorted roster |
| `PROMPT_AXIOMS` | The axes the prompts cover |
| `type PromptKind`, `ReflectiveInput`, `ReflectivePrompt` | The shapes |

The count is **fixed by construction, not by shuffle-and-truncate**: the core block
always contributes six, the second-advisor and dilemma blocks add up to four more, so
the range `[6, 10]` holds with no post-hoc clipping to explain.

Prompts must be concrete or they are not prompts. Every one names something the reader
can answer without first forming a position. `packages/core/src/journal/prompts.ts`
notes the suite runs forty seeds against a banned-phrase list.

---

## search

### `search/index.ts`

Codex search over the generated corpus.

| Export | One line |
| --- | --- |
| `tokenize(text)` | Lower-cased tokens, tags folded into the body |
| `buildIndex(docs)` | TF + DF + document length, per document |
| `parseQuery(q)` | Hand-rolled parser for `"phrase"`, `-exclusion` and `kind:` filters |
| `query(index, q, opts?)` | `{id, score, snippet}[]`, **score descending then id ascending** |
| `buildSnippet(doc, terms)` | The densest 28-token span, ties to the earliest, `…` where cut |
| `suggest(index, prefix)` | Prefix completions, DF descending then alphabetical |
| `TITLE_BONUS` | `1` |
| `PHRASE_BONUS` | `3` |
| `type SearchIndex`, `IndexedDoc`, `IndexTerm`, `ParsedQuery`, `QueryHit`, `QueryOptions`, `SearchableDoc` | The shapes |

The corpus itself is `packages/seed/src/generated/corpus.ts`, typed by
`CorpusEntry` in `packages/seed/src/generated/corpus-types.ts`:
`{id, kind, title, href, year, body, tags}` with `kind` one of `kingdom`, `advisor`,
`era`, `technique`, `dilemma`, `experiment`, `glossary`, `text`.

Three contract rules:

- **Generic by construction.** The index knows `SearchableDoc` and nothing about
  kingdoms, advisors, eras or dilemmas. The codex mixes them at the call site.
- **Exclusions remove the document**, they do not subtract score. `-paperclip` means
  *do not show me the paperclip essay*, not *show it last*.
- **Ordering is score descending, then id ascending.** Never insertion order. Two
  documents that tie must appear in the same order on every machine forever.

---

## Where each group is called from

| Group | Called by |
| --- | --- |
| util | everywhere |
| ethics | `/council`, `/kingdoms/[slug]`, `/dilemmas/[slug]`, `POST /api/deliberate` |
| council | `/council`, `POST /api/deliberate`, `/dilemmas/[slug]` (the seated verdict), `@repo/sdk` |
| dilemmas | `/dilemmas/[slug]` |
| chronicle | `/chronicle`, `/chronicle/[slug]` (`sortEras`) |
| observatory | **nothing in `apps/web` — see the note above** |
| experiments | `/experiments/[slug]`, `POST /api/experiment` |
| kingdoms | `/kingdoms/[slug]` (`RelationList`) |
| journal | **nothing in `apps/web` today** — the journal is not yet a route |
| search | `/codex` (`CodexBrowser`) |

The last two rows are accurate. `observatory/maturity.ts` and `journal/prompts.ts`
have tests and no callers in the route tree; `docs/diagrams/roadmap.mmd` treats both
as un-shipped surfaces.

## Related

- [`../guides/architecture.md`](../guides/architecture.md) — the package graph
- [`web-routes.md`](web-routes.md) — which route calls what
- [`rest-api.md`](rest-api.md) — the trace shape in full
- [`rust-crate.md`](rust-crate.md) — the Python and Rust mirrors of these functions
- [`../guides/determinism-and-seeds.md`](../guides/determinism-and-seeds.md) — every
  stochastic path in `util/rng.ts` and `experiments/simulator.ts`