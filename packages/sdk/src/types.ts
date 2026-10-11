/**
 * Wire types for the Nooreign REST surfaces.
 *
 * These are hand-written rather than generated so that the package has no build
 * step: the repo compiles raw TypeScript everywhere (see ADR 0001), and a client
 * that needs `openapi-typescript` before it can exist would contradict that.
 * `openapi.json` in this directory is the same contract in machine-readable form,
 * and `rest.test.ts` asserts the two agree on every endpoint.
 */

/** The six moral axes. Kept as a literal union so a typo is a compile error. */
export type AxiomKey = "welfare" | "rights" | "virtue" | "care" | "justice" | "agency";

export interface TraceContribution {
  axiom: AxiomKey;
  weight: number;
  delta: number;
  product: number;
}

export interface TraceEntry {
  advisorId: string;
  advisorName: string;
  kingdomId?: string;
  round: 1 | 2 | 3;
  kind: "premise" | "objection" | "synthesis" | "appeal" | null;
  optionId: string;
  moveId: string | null;
  claim: string | null;
  premise: string | null;
  leansOn: AxiomKey[];
  contributions: readonly TraceContribution[];
  subtotal: number;
  jitter: number;
  total: number;
}

export interface RankedOption {
  optionId: string;
  score: number;
  raw: number;
}

export interface PositionRecord {
  advisorId: string;
  advisorName: string;
  kingdomId?: string;
  topOptionId: string;
  ranking: readonly RankedOption[];
  premiseMoveIds: readonly string[];
  profile: string;
  balance: number;
}

export interface ObjectionRecord {
  advisorId: string;
  advisorName: string;
  kingdomId?: string;
  defendedOptionId: string;
  targetedOptionId: string;
  adversaryId: string;
  adversaryName: string;
  moveId: string;
  claim: string;
}

export interface AppealRecord {
  advisorId: string;
  advisorName: string;
  kingdomId?: string;
  optionId: string;
  kind: "premise" | "objection" | "synthesis" | "appeal";
  moveId: string;
  claim: string;
  conviction: number;
}

export interface BallotTally {
  optionId: string;
  total: number;
  share: number;
  mean: number;
  votes: number;
  supporters: readonly string[];
}

export interface SuperMajority {
  optionId: string;
  satisfied: boolean;
  threshold: number;
  yes: number;
  no: number;
  abstainers: number;
  ratio: number;
}

export interface MinorityReport {
  winnerId: string;
  dissenters: readonly { advisorId: string; advisorName: string; preferredOptionId: string; gapToWinner: number }[];
  strongest: { advisorId: string; advisorName: string; moveId: string; claim: string; weight: number } | null;
  summary: string;
}

export interface SynthesisMove {
  id: string;
  kind: "synthesis";
  claim: string;
  support: string;
  weight: number;
  leansOn: readonly AxiomKey[];
  sourceAdvisorId: string;
  sourceMoveId: string;
}

/** `POST /api/deliberate` — the sitting, in full. */
export interface Deliberation {
  dilemmaId: string;
  dilemmaTitle: string;
  seed: number;
  rounds: number;
  quorum: number;
  participating: number;
  positions: readonly PositionRecord[];
  objections: readonly ObjectionRecord[];
  appeals: readonly AppealRecord[];
  ballots: readonly BallotTally[];
  winnerId: string;
  margin: number;
  confidence: number;
  superMajority: SuperMajority;
  dissent: MinorityReport;
  synthesis: SynthesisMove | null;
  traces: readonly TraceEntry[];
  narrative: readonly string[];
  decidingAxis: AxiomKey;
  optionLabels: readonly { id: string; label: string }[];
  advisors: readonly { id: string; name: string; kingdomId: string; glyph: string }[];
  kingdomLabels: Record<string, string>;
}

export interface SweepRow {
  key: string;
  value: number;
  metrics: Record<string, number>;
  score: number;
  phase: "safe" | "warning" | "critical";
  ok: boolean;
}

/** `POST /api/experiment` — one parameter swept against the metrics. */
export interface SweepResult {
  experimentId: string;
  key: string;
  rows: readonly SweepRow[];
  current: { params: Record<string, number>; metrics: Record<string, number>; phase: string; notes: readonly string[] };
  phaseThresholds: { safe: number; warning: number };
}

export interface HealthReport {
  status: string;
  service: string;
  seed: number;
  deterministic: boolean;
  datasets: Record<string, number>;
  timestamp: string;
}

export interface DeliberateRequest {
  dilemmaId: string;
  advisorIds: readonly string[];
  seed?: number;
}

export interface SweepRequest {
  experimentId: string;
  key: string;
  overrides?: Record<string, number>;
  seed?: number;
  steps?: number;
}

/** The error envelope every endpoint returns on failure. */
export interface ApiError {
  error: string;
}
