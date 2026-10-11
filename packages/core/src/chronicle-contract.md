# Chronicle, observatory, simulation — design contract

Six modules in `packages/core/src`, all pure functions over the seed contracts. No React, no I/O,
no seed imports outside of fixtures. Everything below is a decision someone could reasonably have
made differently, with the reason it went the way it did.

## Conventions that apply to all six

- **Readonly in, fresh array out.** Functions take `readonly T[]` and never mutate the caller's array.
  The UI holds one frozen dataset and calls these every frame; a function that sorts in place is a
  frame-rate bug waiting for a second caller.
- **Determinism is a feature, not a nicety.** Every ordering has an explicit final tie-break. Two
  runs of the same repo must produce byte-identical renders, or a reader cannot cite them.
- **Data-driven, never hard-coded.** The finding that no technique covers *care* is read out of
  `technique.covers`, not asserted. A suite that hard-codes the finding is a suite that breaks when
  the dataset improves.

## `chronicle/timeline.ts` — the time machine

| Export | Contract |
| --- | --- |
| `sortEras(eras)` | Chronological by `startYear`; stable; non-mutating. |
| `eraAtYear(eras, year)` | Era whose declared window contains `year`, else `null`. Latest starter wins ties. |
| `eraIndex(eras)` | `IndexedEra[]` — `index`, `position`, contiguous `span`. Memoised on input identity. |
| `stackAtYear(techniques, year)` | Techniques with `introduced <= year`, oldest first. |
| `techniquesBornBetween(techniques, from, to)` | Inclusive window, order-agnostic. |
| `diffEras(a, b)` | `{ addedTechniques, emergentFigures, advancedTopics, yearsApart }` + `domainsCrossed` only on a domain change. |
| `buildRail(eras)` | Evenly-spaced stops in 0..1 plus `epochYear: 1` and `epochPosition`. |
| `yearToPosition` / `positionToYear` | Inverse piecewise-linear maps; round-trip exact to the nearest year. |
| `milestonesFor(eras, techniqueId)` | Landmarks across eras, deduped on `year + title`, ordered. |
| `progressOf(techniques, era)` | `{ available, total, share }`. |
| `highlightEras(eras)` | Top 8 by summed landmark weight, tie-broken on `startYear` then `id`. |

**Signed years.** Years are signed integers, `-399` is 399 BC, and year 0 is astronomical rather than
a real year. The BCE/CE divide is therefore drawn at **year 1**, and `epochPosition` is where that
lands on the rail. Nothing in the file compares a year to zero to decide "is this BC".

**Contiguous windows.** An era's declared `endYear` is advisory. `eraIndex` extends it to the day
before the next era starts, because a gap in a chronology is indistinguishable from a loading failure
when the user scrubs through it. The last era keeps its declared end.

**Rail shape.** Each era gets an equally sized slot regardless of duration. Linear-in-time positions
would give four centuries of Socratic method two thirds of the scrub bar and the twentieth century a
sliver. The year→position map is piecewise-linear through those stops, which keeps it strictly
increasing and therefore invertible. When two eras share a `startYear`, the later stop is nudged up
by the minimum necessary to preserve that invertibility — a tie-break the UI cannot observe, unlike a
rail that silently folds.

**`progressOf` is date-driven, not list-driven.** The curated `era.techniques` list is an editorial
claim; `introduced` is a fact. A scrubber that answered differently depending on which field it read
would be a scrubber nobody trusts. Use `diffEras` for "what did this era care about".

## `observatory/maturity.ts` — the stack as towers

| Export | Contract |
| --- | --- |
| `towerView(techniques)` | All six `TechniqueKind`s, always — `{ kind, count, meanMaturity, meanAdoption, cost }`. |
| `coverageMatrix(techniques, axioms)` | `{ cells, uncovered, breadth }`; `strength` is mean `maturity × adoption`. |
| `gapAnalysis(techniques)` | `{ kind, severity, reason }[]`, severity descending. |
| `readinessScore(techniques, weights?)` | 0..1, formula documented in source. |
| `dependencyHealth(techniques)` | `{ dangling, cycles, superseded }`. |
| `costBenefit(techniques)` | `{ id, maturityPerCost, headroom, … }[]`, best first. |

**Empty towers are visible.** A kind with zero techniques renders with `count: 0` and scores severity
1.0 in `gapAnalysis`. Dropping it would make the observatory render a complete-looking stack while a
whole discipline is missing.

**Cost is ordinal.** `low=1 … extreme=4`. `towerView.cost` is the mean ordinal; `costPressure` maps
it onto `[0, 1]` for the formulas.

**Gap severity** = `0.40(1−maturity) + 0.40(1−adoption) + 0.20·costPressure`. Maturity and adoption
carry the weight because a technique nobody deploys is not yet a mitigation; cost delays, it does not
make a technique wrong.

**Readiness** = `Σ w_k·perTower_k / Σ w_k × (1 + 0.25·(meanAxesPerTechnique − 2))`, clamped to `[0,1]`,
where `perTower = maturity × (0.4 + 0.6·adoption) × (1 − 0.15·costPressure)`. The breadth term is
centred at two axes, so a deliberately narrow stack is neither rewarded nor punished by construction.

**Dependency health** emits `dangling` as `"dependent->missing"` strings — the bare id loses the
referent. Cycles are DFS-found and canonicalised to the lexicographically smallest rotation, so
`a→b→a` and `b→a→b` are one finding. Self-dependencies are cycles.

## `experiments/simulator.ts` — thought experiments with dials

| Export | Contract |
| --- | --- |
| `scorePaperclip` … `scoreSpecification` | `(params, jitterSource) => { metrics, notes }` |
| `SCORERS` | `Record<ExperimentModel, Scorer>` |
| `runExperiment(experiment, overrides, seed?)` | `{ params, metrics, notes, verdicts, phase }` |
| `sweep` / `sweepGrid` | Chart rows; grid is x-major. |
| `phaseOf(metrics)` | `safe` ≤ 0.34 ≤ `warning` ≤ 0.67 < `critical`, read off the worst metric. |

**Every metric is a normalised risk; higher is worse.** `humanControl` is the *loss* of control,
`corrigibility` is the *risk that* correction fails, `capability` is raw capability misused. `phaseOf`
takes no direction map, so mixed polarity would make it meaningless. The seed's `direction` field
records what the tradition *wants*, not what the number means: a metric passes when it sits on the
desirable side of `SAFE_LINE = 0.5` for its declared direction.

**Formulas are additive, not multiplicative.** Every driver contributes an independent signed term
with `|coefficient| ≥ MIN_DRIVER_COEFFICIENT = 0.35`. A product term reads better but annihilates one
driver's influence at the other's extreme, and a sweep then reads as non-monotonic when the theory is
not. The invariant: a 0.25 step moves the base by ≥ 0.0875, the jitter budget is 0.06 peak-to-peak,
so jitter can never invert a sweep. The test suite asserts that invariant per driver rather than
inferring it from noisy output.

**Jitter is keyed on the parameter value.** `createRng(seed, model, key, value)` — one draw per
metric per setting — so sweeping a driver walks independent noise instead of a smooth curve. Scorers
receive a `JitterSource` (`(key, value) => number` in `[-0.03, 0.03]`) rather than a raw `Rng`: a
single stream would make `goalCapture`'s noise a function of how many draws `humanControl` took.

**Unseeded runs are still reproducible.** `runExperiment` defaults the seed to `hashString(experiment.id)`.
The one thing a replayable experiment may not be is "the same when you reload".

## `kingdoms/graph.ts` — the diplomacy map

| Export | Contract |
| --- | --- |
| `relationGraph(kingdoms)` | Nodes + deduped undirected `RelationEdge`s carrying `notes`, `mutual`, sorted `declaredBy`. |
| `centrality(graph)` | Degree + weighted degree, ranked; tie-break degree then id. |
| `allies` / `rivals` | Two-sided lookups, direction ignored. |
| `tributaries` / `successors` | Asymmetric lookups driven by `declaredBy`. |
| `territoryBounds(kingdoms)` | Bounding box + nearest-capital landmark partition with centroids. |
| `distantPairs(kingdoms, limit=1)` | Furthest capital pairs first, ordered by id. |

**Relation kinds are not all symmetric.** `alliance` and `debate` are two-sided facts. `vassal` is not:
a `vassal` declared by X about Y means **Y is X's vassal** — the overlord lists what it holds, the
way every historical record of a dependency is written. `succession` runs the other way: declared by X
about Y means **X succeeds Y**, so lineage reads from successor back to what it followed. Both are
checked against `declaredBy`, which is what makes `tributaries(stoic)` non-empty and
`tributaries(compact)` empty.

**Weights.** `alliance = succession = 2`, `debate = 1.5`, `rivalry = vassal = 1`. Editorial, stated in
`RELATION_WEIGHT` so it can be argued with.

**Territory is a Voronoi by nearest capital**, not by ownership: a landmark belongs to whoever is
closest. The bounding box is over landmarks (that is what the viewport needs), and a kingdom with no
landmarks gets `centroid: null` rather than a fake point at its capital.

## `journal/prompts.ts` — reflective journaling

| Export | Contract |
| --- | --- |
| `reflectivePrompts({ kingdom, advisors, dilemma, seed })` | 6–10 `ReflectivePrompt`s, deterministic per seed. |
| `promptsForAxiom(axiom, kingdom)` | Three prompts per axis, built from `DIMENSION_META`. |
| `closingRitual(advisorIds, winnerId?)` | Two short lines, chosen by a hash of the sorted roster. |

**The count is fixed by construction**, not by shuffle-and-truncate: the core block always contributes
six, the second advisor and the dilemma block add up to four more. `[6, 10]` with no post-hoc clipping
to explain.

**Prompts are concrete or they are not prompts.** Every one names something the reader can answer
without first forming a position — *who did the advisors assume was paying*, *which case made you move* —
never *what are your values*. The suite runs forty seeds against a banned-phrase list.

**Advisor prompts are attributed.** Built from that advisor's `signatureMove`, so the journal records
what this court pressed rather than a generic philosopher's question. `sourceId` is set on the prompt.

## `search/index.ts` — codex search

| Export | Contract |
| --- | --- |
| `tokenize` / `buildIndex` | Lower-cased tokens, tags folded into the body, TF + DF + length. |
| `parseQuery` / `query` | `"phrase"`, `-exclusion`, `kind:` filters; `{ id, score, snippet }[]`. |
| `suggest` | Prefix completions, DF descending then alphabetical. |

**Generic by construction.** The index knows `SearchableDoc` and nothing about kingdoms, advisors,
eras or dilemmas. The codex mixes them at the call site; a search engine that knows the schema cannot
be reused for the glossary.

**Scoring** is `Σ idf · (1 + log tf) / √length`, plus `TITLE_BONUS` for title hits and a large
`PHRASE_BONUS` for an exact phrase in the body. Exclusions remove the document outright rather than
subtracting score — `-paperclip` means *do not show me the paperclip essay*, not *show it last*.

**The parser is hand-rolled.** Quoted phrases, `-exclusion` and `kind:` filters overlap, and one
regex for three interleaved syntaxes is a bug generator.

**Ordering is score descending, then id ascending.** Never insertion order. Two documents that tie
must appear in the same order on every machine, every render, forever; the suite proves it with two
word-for-word identical documents.

**Snippets are token-normalised**, so they come back lower-cased without stopwords. The window is the
densest 28-token span, ties resolved to the earliest, with `…` where it was cut.