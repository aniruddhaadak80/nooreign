import type {
  ApiError,
  DeliberateRequest,
  Deliberation,
  HealthReport,
  SweepRequest,
  SweepResult,
} from "./types";

/**
 * A typed client for the Nooreign web API.
 *
 * Why it exists: the council page, the experiment bench and any third-party
 * integration all talk to the same three endpoints, and all three deserve the
 * same error handling. `ApiClientError` exists so a caller never has to `try` a
 * `catch` around a `.json()` that might be a 422 with a useful message in it.
 */

export class ApiClientError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.body = body;
  }
}

export interface ClientOptions {
  /** Defaults to a same-origin relative path, i.e. the Next.js app itself. */
  baseUrl?: string;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

const isApiError = (value: unknown): value is ApiError =>
  typeof value === "object" && value !== null && "error" in value && typeof (value as ApiError).error === "string";

export class NooreignClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "").replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  /** Liveness plus the manifest of what is actually loaded. */
  async health(): Promise<HealthReport> {
    return this.get<HealthReport>("/api/healthz");
  }

  /**
   * Convene a court.
   *
   * Server-side deliberation rather than a client-side reimplementation: the
   * engine imports the typed datasets, and the trace has to be the same object
   * the server would have rendered.
   */
  async deliberate(request: DeliberateRequest): Promise<Deliberation> {
    return this.post<Deliberation>("/api/deliberate", {
      dilemmaId: request.dilemmaId,
      advisorIds: request.advisorIds,
      seed: request.seed,
    });
  }

  /** Sweep one parameter of a thought experiment. */
  async sweep(request: SweepRequest): Promise<SweepResult> {
    return this.post<SweepResult>("/api/experiment", {
      experimentId: request.experimentId,
      key: request.key,
      overrides: request.overrides ?? {},
      seed: request.seed,
      steps: request.steps,
    });
  }

  private async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }

    if (!response.ok) {
      // 422 responses from the zod layer are the common case and the most
      // useful: they name the field that failed.
      const message = isApiError(payload)
        ? payload.error
        : `request to ${path} failed with status ${response.status}`;
      throw new ApiClientError(message, response.status, payload);
    }

    return payload as T;
  }
}
