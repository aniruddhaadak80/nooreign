import type {
  ApiError,
  BallotTally,
  MinorityReport,
  PositionRecord,
  PositionRecord as Position,
  SynthesisMove,
  TraceEntry,
} from "./types";

/**
 * Client for the Python deliberation service (`services/agents`).
 *
 * The service is a deliberate *mirror* of the TypeScript engine rather than a
 * wrapper, and both sides speak camelCase — so a consumer written against this
 * client can be pointed at either surface without translation. The two types that
 * differ structurally are declared separately below rather than being quietly
 * widened, because the differences are meaningful.
 */

export interface PythonClientOptions {
  /** e.g. `http://127.0.0.1:8080` */
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export interface PythonHealth {
  status: string;
  service: string;
  version: string;
  deterministic: boolean;
  axes: string[];
  advisorCount: number;
  dilemmaCount: number;
}

/** The service nests the winner inside a decision record; the web API flattens it. */
export interface PythonDecision {
  winnerId: string;
  winnerLabel: string;
  margin: number;
  ratio: number;
  confidence: number;
  participation: number;
  runnerUpId: string | null;
  tieBroken: boolean;
  rationale: string;
}

export interface PythonDeliberation {
  dilemmaId: string;
  seed: number;
  rounds: number;
  quorum: number;
  participating: number;
  positions: readonly PositionRecord[];
  ballots: readonly BallotTally[];
  decision: PythonDecision;
  dissent: MinorityReport;
  synthesis: SynthesisMove | null;
  traces: readonly TraceEntry[];
  narrative: readonly string[];
  decidingAxis: string;
  utilonBand: string;
}

export class PythonServiceError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.name = "PythonServiceError";
    this.status = status;
    this.detail = detail;
  }
}

export class NooreignAgentsClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: PythonClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  async health(): Promise<PythonHealth> {
    return this.request<PythonHealth>("GET", "/healthz");
  }

  async fixtures(): Promise<{ advisors: unknown[]; kingdoms: unknown[]; dilemmas: unknown[] }> {
    return this.request("GET", "/fixtures");
  }

  async deliberate(payload: {
    dilemmaId?: string;
    advisorIds: readonly string[];
    seed?: number;
    rounds?: number;
  }): Promise<PythonDeliberation> {
    return this.request("POST", "/deliberate", {
      advisorIds: payload.advisorIds,
      ...(payload.dilemmaId === undefined ? {} : { dilemmaId: payload.dilemmaId }),
      ...(payload.seed === undefined ? {} : { seed: payload.seed }),
      ...(payload.rounds === undefined ? {} : { rounds: payload.rounds }),
    });
  }

  async argumentGraph(payload: { dilemmaId?: string; seed?: number }): Promise<{
    dilemmaId: string;
    nodes: unknown[];
    edges: unknown[];
    dangling: string[];
    order: string[];
    cycles: string[][];
    wellFormed: boolean;
    mermaid: string;
  }> {
    return this.request("POST", "/argument-graph", payload);
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    });

    const payload: unknown = await response.json().catch(() => undefined);

    if (!response.ok) {
      // FastAPI reports validation failures as `{ detail }`, and this service
      // puts a human-readable message in there rather than a bare error code.
      const detail = payload as { detail?: unknown } | undefined;
      const message =
        typeof detail?.detail === "string"
          ? detail.detail
          : `request to ${path} failed with status ${response.status}`;
      throw new PythonServiceError(message, response.status, payload);
    }

    return payload as T;
  }
}

export type { ApiError, Position, TraceEntry };
