/**
 * `@repo/core` barrel.
 *
 * Everything the app, the CLI tools and the Python/Rust parity tests import comes
 * from here. The modules are deliberately split by concern (ethics, council,
 * chronicle, observatory, experiments, kingdoms, journal, search) and each one is
 * pure: no React, no filesystem, no network, no clock. That is what makes the
 * deliberation engine reproducible in a test, in a server component and in a
 * headless sweep without behaving differently in any of them.
 */

/* ---------------------------------- util ---------------------------------- */
export {
  clamp,
  round,
  lerp,
  sum,
  mean,
  dot,
  cosineSimilarity,
  normalize,
  weightedMean,
  softmax,
  minOf,
  maxOf,
  partition,
  range,
  movingAverage,
  safeDiv,
  sign,
} from "./util/math";
export { mulberry32, hashString, createRng, expectedMean, type Rng } from "./util/rng";
export {
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  mapResult,
  collectResults,
  partitionResults,
  andThen,
  type Result,
  type Ok,
  type Err,
} from "./util/result";

/* --------------------------------- ethics --------------------------------- */
export {
  ADVISOR_KINGDOM_BLEND,
  contributions,
  scoreOption,
  scoreOptionWith,
  weighAdvisor,
  weightsFor,
  distance,
  dominantAxiom,
  secondaryAxiom,
  rankAxes,
  describeProfile,
  agreement,
  profileConflict,
  balance,
  decidingAxis,
  toArray,
  type AxiomContribution,
  type AxisGap,
} from "./ethics/axioms";
export {
  stakeholderTotal,
  unweightedTotal,
  aggregate,
  discount,
  fairnessIndex,
  fairnessOf,
  utilonScale,
  moralStatusRisk,
  weightedAgentHarm,
  UTILON_THRESHOLDS,
  type StakeholderContribution,
  type UtilonAggregate,
  type UtilonBand,
  type UtilonScale,
  type MoralStatusRisk,
} from "./ethics/utilons";

/* -------------------------------- council --------------------------------- */
export {
  runCouncil,
  compareCouncils,
  courtVector,
  courtSpread,
  JITTER,
  type CouncilInput,
  type CouncilResult,
  type CouncilComparison,
  type CouncilComparisonEntry,
  type TraceEntry,
  type TraceContribution,
  type RankedOption,
  type PositionRecord,
  type ObjectionRecord,
  type AppealRecord,
} from "./council/deliberation";
export {
  weightedBallot,
  decision,
  confidenceFrom,
  superMajority,
  stancesFrom,
  minorityReport,
  synthesis,
  collectiveAxes,
  CLOSE_MARGIN,
  type Ballot,
  type BallotScore,
  type BallotTally,
  type Decision,
  type DecisionInput,
  type StanceAdvisor,
  type SuperMajority,
  type MinorityReport,
  type DissentEntry,
  type SynthesisMove,
} from "./council/consensus";
export {
  renderMove,
  openingStatement,
  objectionLine,
  verdictLine,
  axisCaption,
  aiVerdictLine,
  speak,
  type Stance,
} from "./council/voices";
export {
  buildGraph,
  nodeIndex,
  supportingNodes,
  attackedNodes,
  targetsOf,
  topologicalOrder,
  inheritedWeight,
  isWellFormed,
  toMermaid,
  advisorsInGraph,
  INHERITANCE,
  type ArgumentGraph,
  type BuildGraphOptions,
  type EdgeKind,
  type GraphEdge,
  type GraphNode,
  type TopologicalResult,
  type WellFormedReport,
} from "./council/argument-graph";
export {
  analyseInfluence,
  analyseResilience,
  INFLUENCE_THRESHOLDS,
  RESILIENCE_SWEEP,
  RESILIENCE_THRESHOLDS,
  type InfluenceEntry,
  type InfluenceReport,
  type InfluenceVerdict,
  type OptionStability,
  type ResilienceInput,
  type ResilienceReport,
  type ResilienceVerdict,
  type SeedOutcome,
} from "./council/resilience";

/* -------------------------------- dilemmas -------------------------------- */
export {
  analyseDilemma,
  courtReading,
  optionReport,
  pivotAxis,
  type AdvisorReading,
  type CourtReading,
  type DilemmaAnalysis,
  type OptionReport,
} from "./dilemmas/analysis";

/* ------------------------------- chronicle -------------------------------- */
export {
  sortEras,
  eraAtYear,
  eraIndex,
  stackAtYear,
  techniquesBornBetween,
  diffEras,
  buildRail,
  yearToPosition,
  positionToYear,
  milestonesFor,
  progressOf,
  highlightEras,
  HIGHLIGHT_COUNT,
  type EraDiff,
  type HighlightedEra,
  type IndexedEra,
  type Milestone,
  type Rail,
  type RailStop,
  type StackProgress,
} from "./chronicle/timeline";

/* ------------------------------ observatory ------------------------------- */
export {
  COST_SCALE,
  costPressure,
  towerView,
  coverageMatrix,
  gapAnalysis,
  readinessScore,
  dependencyHealth,
  costBenefit,
  type CostBenefitRow,
  type CoverageCell,
  type CoverageMatrix,
  type DependencyHealth,
  type ReadinessWeights,
  type StackGap,
  type Supersession,
  type Tower,
} from "./observatory/maturity";

/* ------------------------------ experiments ------------------------------- */
export {
  createJitterSource,
  SCORERS,
  scorePaperclip,
  scoreOracle,
  scoreGenie,
  scoreToolAi,
  scoreMesa,
  scoreOversight,
  scoreCopy,
  scoreSpecification,
  phaseOf,
  runExperiment,
  sweep,
  sweepGrid,
  metricOf,
  JITTER_BOUND,
  MIN_DRIVER_COEFFICIENT,
  PHASE_THRESHOLDS,
  SAFE_LINE,
  type ExperimentRun,
  type GridRow,
  type JitterSource,
  type MetricRecord,
  type Phase,
  type Scorer,
  type SimParams,
  type SweepRow,
  type VerdictRow,
} from "./experiments/simulator";

/* ------------------------------- kingdoms -------------------------------- */
export {
  relationGraph,
  centrality,
  allies,
  rivals,
  tributaries,
  successors,
  predecessors,
  territoryBounds,
  distantPairs,
  RELATION_WEIGHT,
  type CentralityEntry,
  type DistantPair,
  type KingdomNode,
  type RelationEdge,
  type RelationGraph,
  type Territory,
  type TerritoryMap,
} from "./kingdoms/graph";

/* -------------------------------- journal --------------------------------- */
export {
  reflectivePrompts,
  promptsForAxiom,
  closingRitual,
  PROMPT_AXIOMS,
  type PromptKind,
  type ReflectiveInput,
  type ReflectivePrompt,
} from "./journal/prompts";

/* --------------------------------- search --------------------------------- */
export {
  tokenize,
  buildIndex,
  parseQuery,
  buildSnippet,
  query,
  suggest,
  PHRASE_BONUS,
  TITLE_BONUS,
  type IndexedDoc,
  type IndexTerm,
  type ParsedQuery,
  type QueryHit,
  type QueryOptions,
  type SearchIndex,
  type SearchableDoc,
} from "./search/index";
