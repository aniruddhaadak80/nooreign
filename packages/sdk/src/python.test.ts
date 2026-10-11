import { describe, expect, it, vi } from "vitest";
import { NooreignAgentsClient, PythonServiceError } from "./python";

const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

const client = (fetchImpl: typeof fetch) =>
  new NooreignAgentsClient({ baseUrl: "http://127.0.0.1:8080/", fetchImpl });

describe("NooreignAgentsClient", () => {
  it("reads the health report and its six axes", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        status: "ok",
        service: "nooreign-agents",
        version: "1.0.0",
        deterministic: true,
        axes: ["welfare", "rights", "virtue", "care", "justice", "agency"],
        advisorCount: 4,
        dilemmaCount: 2,
      }),
    );

    const health = await client(fetchImpl as unknown as typeof fetch).health();

    expect(fetchImpl).toHaveBeenCalledWith("http://127.0.0.1:8080/healthz", expect.objectContaining({ method: "GET" }));
    expect(health.axes).toHaveLength(6);
    expect(health.deterministic).toBe(true);
  });

  it("sends only the deliberation fields that were supplied", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ dilemmaId: "delegation" }));

    await client(fetchImpl as unknown as typeof fetch).deliberate({
      dilemmaId: "delegation",
      advisorIds: ["aegis"],
      seed: 2406,
    });

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      advisorIds: ["aegis"],
      dilemmaId: "delegation",
      seed: 2406,
    });
  });

  it("surfaces FastAPI's `detail` string as the error message", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ detail: "Unknown dilemma `nope`." }, 422));

    const error = await client(fetchImpl as unknown as typeof fetch)
      .deliberate({ dilemmaId: "nope", advisorIds: ["aegis"] })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(PythonServiceError);
    expect((error as PythonServiceError).message).toMatch(/Unknown dilemma/);
    expect((error as PythonServiceError).status).toBe(422);
  });

  it("falls back to the status line when the detail is not a string", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ detail: [{ loc: ["body", "seed"] }] }, 422));

    await expect(
      client(fetchImpl as unknown as typeof fetch).deliberate({ advisorIds: ["aegis"] }),
    ).rejects.toThrowError(/failed with status 422/);
  });

  it("requests the argument graph", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ dilemmaId: "delegation", nodes: [], edges: [], dangling: [], order: [], cycles: [], wellFormed: true, mermaid: "flowchart TD" }),
    );

    const graph = await client(fetchImpl as unknown as typeof fetch).argumentGraph({ dilemmaId: "delegation" });

    expect(graph.mermaid.startsWith("flowchart")).toBe(true);
    expect(graph.wellFormed).toBe(true);
  });
});
