/**
 * `@repo/sdk` — typed clients for both Nooreign REST surfaces.
 *
 * The web API (`/api/deliberate`, `/api/experiment`, `/api/healthz`) and the
 * Python service (`services/agents`) speak the same camelCase wire format on
 * purpose: the Python service is a mirror of the TypeScript engine, and a
 * consumer that had to translate between them would be a place for the two to
 * quietly diverge.
 */

export type {
  ApiError,
  AppealRecord,
  AxiomKey,
  BallotTally,
  DeliberateRequest,
  Deliberation,
  HealthReport,
  MinorityReport,
  ObjectionRecord,
  PositionRecord,
  RankedOption,
  SuperMajority,
  SweepRequest,
  SweepResult,
  SweepRow,
  SynthesisMove,
  TraceContribution,
  TraceEntry,
} from "./types";

export { ApiClientError, NooreignClient, type ClientOptions } from "./rest";

export {
  NooreignAgentsClient,
  PythonServiceError,
  type PythonClientOptions,
  type PythonDecision,
  type PythonDeliberation,
  type PythonHealth,
} from "./python";
