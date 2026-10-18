import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ADVISORS, DILEMMAS, KINGDOMS, SEED } from "@repo/seed";
import { RESILIENCE_SWEEP, runCouncil } from "@repo/core";
import { createServer } from "./server";
import type {
  AdvisorsPayload,
  ComparePayload,
  ConvenePayload,
  DilemmaDetail,
  DilemmasPayload,
  KingdomsPayload,
  StressPayload,
} from "./tools";

/**
 * These tests speak the actual protocol: a real `Client` from the MCP SDK
 * connected to the server over an in-memory transport pair. That means the
 * assertions below cover the whole path â€” zod schemas, JSON-schema conversion,
 * output-schema validation, handler dispatch, and rendering â€” rather than the
 * builders in isolation.
 */

async function connected(): Promise<Client> {
  const server = createServer();
  const client = new Client({ name: "nooreign-test-client", version: "0.0.1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

/**
 * Calling a tool. The SDK types `callTool`'s return as a union of the current
 * result shape and the pre-2024-11-05 compatibility shape (`toolResult`
 * instead of `content`), so the helpers below reach into whichever shape
 * arrived. At runtime this dialect client is always served the current shape;
 * the helpers simply refuse to guess if they ever see otherwise.
 */
async function call(client: Client, name: string, args: Record<string, unknown>) {
  return client.callTool({ name, arguments: args });
}

type RawReply = Awaited<ReturnType<typeof call>>;

function textOf(reply: RawReply): string {
  const content = (reply as { content?: unknown }).content;
  if (!Array.isArray(content)) return "";
  for (const block of content) {
    if (
      typeof block === "object" &&
      block !== null &&
      (block as { type?: unknown }).type === "text" &&
      typeof (block as { text?: unknown }).text === "string"
    ) {
      return (block as { text: string }).text;
    }
  }
  return "";
}

function structuredOf<T>(reply: RawReply): T {
  const payload = (reply as { structuredContent?: unknown }).structuredContent;
  if (payload === undefined) throw new Error("reply carried no structured content");
  return payload as T;
}

function isErrorOf(reply: RawReply): boolean {
  return (reply as { isError?: unknown }).isError === true;
}

const firstCase = DILEMMAS[0];
if (firstCase === undefined) throw new Error("seed dataset is empty");

describe("the nooreign MCP server", () => {
  it("exposes its toolbox with honest annotations", async () => {
    const client = await connected();
    const listing = await client.listTools();
    const tools = listing.tools;

    expect(tools).toHaveLength(7);
    for (const tool of tools) {
      expect(tool.name.startsWith("nooreign_")).toBe(true);
      expect((tool.description ?? "").length).toBeGreaterThan(100);
      expect(tool.inputSchema).toBeTruthy();
      expect(tool.outputSchema).toBeTruthy();
      expect(tool.annotations?.readOnlyHint).toBe(true);
      expect(tool.annotations?.destructiveHint).toBe(false);
      expect(tool.annotations?.idempotentHint).toBe(true);
      expect(tool.annotations?.openWorldHint).toBe(false);
    }
    expect(new Set(tools.map((tool) => tool.name)).size).toBe(tools.length);
  });

  it("lists the kingdoms in both formats", async () => {
    const client = await connected();
    const reply = await call(client, "nooreign_list_kingdoms", {});
    const payload = structuredOf<KingdomsPayload>(reply);
    expect(payload.count).toBe(KINGDOMS.length);
    expect(payload.kingdoms).toHaveLength(KINGDOMS.length);
    expect(textOf(reply)).toContain("Nooreign");

    const json = await call(client, "nooreign_list_kingdoms", { response_format: "json" });
    const parsed = JSON.parse(textOf(json)) as KingdomsPayload;
    expect(parsed.count).toBe(KINGDOMS.length);
  });

  it("filters advisors by kingdom and refuses unknown kingdoms with instructions", async () => {
    const client = await connected();
    const kingdom = KINGDOMS[0];
    if (kingdom === undefined) throw new Error("seed dataset has no kingdoms");

    const reply = await call(client, "nooreign_list_advisors", { kingdom: kingdom.slug });
    const payload = structuredOf<AdvisorsPayload>(reply);
    expect(payload.kingdom).toBe(kingdom.name);
    expect(payload.count).toBeGreaterThan(0);
    for (const advisor of payload.advisors) expect(advisor.kingdom_id).toBe(kingdom.id);

    const miss = await call(client, "nooreign_list_advisors", { kingdom: "atlantis" });
    expect(isErrorOf(miss)).toBe(true);
    expect(textOf(miss)).toContain("nooreign_list_kingdoms");
  });

  it("lists every case and details one", async () => {
    const client = await connected();
    const list = await call(client, "nooreign_list_dilemmas", {});
    expect(structuredOf<DilemmasPayload>(list).count).toBe(DILEMMAS.length);

    const detail = await call(client, "nooreign_get_dilemma", { dilemma: firstCase.id });
    const payload = structuredOf<DilemmaDetail>(detail);
    expect(payload.id).toBe(firstCase.id);
    expect(payload.options).toHaveLength(firstCase.options.length);
    expect(payload.options[0]?.deltas).toBeDefined();
    expect(payload.stakeholders.length).toBeGreaterThanOrEqual(2);

    const miss = await call(client, "nooreign_get_dilemma", { dilemma: "dm-nope" });
    expect(isErrorOf(miss)).toBe(true);
    expect(textOf(miss)).toContain("nooreign_list_dilemmas");
  });

  it("convenes the default court and returns the engine's own verdict", async () => {
    const client = await connected();
    const reply = await call(client, "nooreign_convene", {
      dilemma: firstCase.id,
      response_format: "json",
    });
    const payload = structuredOf<ConvenePayload>(reply);

    // The same arithmetic, derived independently through the shared engine.
    const bench = ADVISORS.slice(0, 8);
    const kingdoms = KINGDOMS.filter((kingdom) =>
      bench.some((advisor) => advisor.kingdomId === kingdom.id),
    );
    const expected = runCouncil({
      dilemma: firstCase,
      advisors: bench,
      kingdoms,
      seed: SEED,
      rounds: 3,
      quorum: Math.ceil(bench.length / 2),
    });

    expect(payload.verdict.winner_id).toBe(expected.winnerId);
    expect(payload.verdict.margin).toBe(expected.margin);
    expect(payload.verdict.confidence).toBe(expected.confidence);
    expect(payload.ballots).toHaveLength(firstCase.options.length);
    expect(payload.positions).toHaveLength(bench.length);
    expect(payload.mermaid).toBeUndefined();
  });

  it("adds the argument graph only when asked", async () => {
    const client = await connected();
    const reply = await call(client, "nooreign_convene", {
      dilemma: firstCase.slug,
      include_mermaid: true,
    });
    const payload = structuredOf<ConvenePayload>(reply);
    expect(payload.mermaid?.startsWith("flowchart TD")).toBe(true);
  });

  it("refuses unknown cases and advisors by naming the list tool", async () => {
    const client = await connected();

    const unknownCase = await call(client, "nooreign_convene", { dilemma: "dm-nope" });
    expect(isErrorOf(unknownCase)).toBe(true);
    expect(textOf(unknownCase)).toContain("nooreign_list_dilemmas");

    const unknownAdvisor = await call(client, "nooreign_convene", {
      dilemma: firstCase.id,
      advisor_ids: ["no-such-voice"],
    });
    expect(isErrorOf(unknownAdvisor)).toBe(true);
    expect(textOf(unknownAdvisor)).toContain("nooreign_list_advisors");
  });

  it("rejects arguments that violate the declared schema", async () => {
    const client = await connected();
    // The protocol may reject (JSON-RPC error) or the handler may answer with
    // an error result; both outcomes are failures the caller can see.
    const outcome = await client
      .callTool({ name: "nooreign_convene", arguments: { dilemma: firstCase.id, seed: -1 } })
      .then((reply) => (isErrorOf(reply) ? "error" : "ok"))
      .catch(() => "error");
    expect(outcome).toBe("error");
  });

  it("sits every kingdom alone on one case", async () => {
    const client = await connected();
    const reply = await call(client, "nooreign_compare_kingdoms", { dilemma: firstCase.id });
    const payload = structuredOf<ComparePayload>(reply);
    expect(payload.courts).toHaveLength(KINGDOMS.length);
    expect(payload.distinct_winners).toBeGreaterThanOrEqual(1);
    expect(typeof payload.agreed).toBe("boolean");
  });

  it("stresses a verdict across seeds and names the pivotal bench", async () => {
    const client = await connected();
    const reply = await call(client, "nooreign_stress_verdict", {
      dilemma: firstCase.id,
      count: RESILIENCE_SWEEP.min,
      response_format: "json",
    });
    const payload = structuredOf<StressPayload>(reply);

    expect(payload.count).toBe(RESILIENCE_SWEEP.min);
    expect(payload.seed).toBe(SEED);
    expect(payload.bench).toHaveLength(8);
    expect(payload.stability.share).toBeGreaterThan(0);
    expect(payload.stability.share).toBeLessThanOrEqual(1);
    expect(["settled", "contested", "fragile"]).toContain(payload.stability.verdict);
    expect(["robust", "hinged", "precarious", "untested"]).toContain(payload.influence.verdict);
    expect(payload.influence.entries).toHaveLength(8);

    const optionIds = new Set(firstCase.options.map((option) => option.id));
    expect(optionIds.has(payload.stability.modal_winner_id)).toBe(true);
    for (const entry of payload.influence.entries) {
      if (entry.pivotal) expect(payload.influence.pivotal_ids).toContain(entry.advisor_id);
      else expect(payload.influence.pivotal_ids).not.toContain(entry.advisor_id);
    }
  });
});
