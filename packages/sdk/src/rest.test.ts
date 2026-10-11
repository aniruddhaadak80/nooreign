import { describe, expect, it, vi } from "vitest";
import { ApiClientError, NooreignClient } from "./rest";

/**
 * The client's job is to turn three endpoints into three typed calls and to make
 * failures legible. These tests inject a fake `fetch` rather than standing up a
 * server, so they assert on the contract the client actually depends on — the
 * request it makes and the error it raises when the server says no.
 */

const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

const client = (fetchImpl: typeof fetch, baseUrl = "https://nooreign.test") =>
  new NooreignClient({ baseUrl, fetchImpl });

describe("NooreignClient", () => {
  it("calls the health endpoint and returns the manifest", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ status: "ok", service: "nooreign-web", seed: 2406, deterministic: true, datasets: {}, timestamp: "t" }),
    );

    const health = await client(fetchImpl as unknown as typeof fetch).health();

    expect(fetchImpl).toHaveBeenCalledWith("https://nooreign.test/api/healthz", expect.objectContaining({ method: "GET" }));
    expect(health.deterministic).toBe(true);
    expect(health.seed).toBe(2406);
  });

  it("defaults to a same-origin relative base url", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}));
    await new NooreignClient({ fetchImpl: fetchImpl as unknown as typeof fetch }).health();
    expect(fetchImpl).toHaveBeenCalledWith("/api/healthz", expect.objectContaining({ method: "GET" }));
  });

  it("posts a deliberation with a JSON content type", async () => {
    const sitting = { dilemmaId: "d01", winnerId: "opt-b", traces: [], ballots: [] };
    const fetchImpl = vi.fn(async () => jsonResponse(sitting));

    const result = await client(fetchImpl as unknown as typeof fetch).deliberate({
      dilemmaId: "d01",
      advisorIds: ["kant", "bentham"],
      seed: 2406,
    });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://nooreign.test/api/deliberate");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["content-type"]).toBe("application/json");
    expect(JSON.parse(String(init.body))).toEqual({ dilemmaId: "d01", advisorIds: ["kant", "bentham"], seed: 2406 });
    expect(result.winnerId).toBe("opt-b");
  });

  it("defaults the sweep overrides to an empty object", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ experimentId: "x01", rows: [] }));

    await client(fetchImpl as unknown as typeof fetch).sweep({ experimentId: "x01", key: "capability" });

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).overrides).toEqual({});
  });

  it("raises ApiClientError carrying the server's own message", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "unknown dilemma \"nope\"" }, 404));

    await expect(
      client(fetchImpl as unknown as typeof fetch).deliberate({ dilemmaId: "nope", advisorIds: ["kant"] }),
    ).rejects.toThrowError(/unknown dilemma/);
  });

  it("puts the status and body on the error for programmatic handling", async () => {
    const body = { error: "invalid" };
    const fetchImpl = vi.fn(async () => jsonResponse(body, 422));

    const error = await client(fetchImpl as unknown as typeof fetch)
      .deliberate({ dilemmaId: "x", advisorIds: [] })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiClientError);
    expect((error as ApiClientError).status).toBe(422);
    expect((error as ApiClientError).body).toEqual(body);
  });

  it("still throws when a failure body is not JSON", async () => {
    const fetchImpl = vi.fn(
      async () =>
        ({
          ok: false,
          status: 502,
          json: async () => {
            throw new Error("not json");
          },
        }) as unknown as Response,
    );

    await expect(
      client(fetchImpl as unknown as typeof fetch).sweep({ experimentId: "x01", key: "k" }),
    ).rejects.toThrowError(/failed with status 502/);
  });

  it("trims a trailing slash from the base url", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}));
    await client(fetchImpl as unknown as typeof fetch, "https://nooreign.test/").health();
    expect(fetchImpl).toHaveBeenCalledWith("https://nooreign.test/api/healthz", expect.objectContaining({ method: "GET" }));
  });
});
