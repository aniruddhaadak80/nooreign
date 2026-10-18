/**
 * The Nooreign MCP server.
 *
 * Seven tools over one corpus: the atlas is small enough to hold in memory and
 * deterministic enough that every tool is a pure function of its arguments.
 * Nothing here fetches anything — `openWorldHint: false` is a statement of
 * fact, not a default — and every seeding decision (which defaults, which
 * clamps) matches the web app and the CLI, because all three call the same
 * `@repo/core`.
 *
 * The server is transport-agnostic on purpose: `bin.ts` binds it to stdio,
 * the test suite binds it to an in-memory pair, and both exercise the same
 * registrations.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ADVISORS, DILEMMAS, KINGDOMS, SEED } from "@repo/seed";
import { RESILIENCE_SWEEP } from "@repo/core";
import {
  DEFAULT_BENCH,
  ToolError,
  advisorsPayloadSchema,
  buildAdvisors,
  buildCompare,
  buildConvene,
  buildDilemma,
  buildDilemmas,
  buildKingdoms,
  buildStress,
  comparePayloadSchema,
  convenePayloadSchema,
  dilemmaDetailSchema,
  dilemmasPayloadSchema,
  kingdomsPayloadSchema,
  stressPayloadSchema,
} from "./tools";
import {
  renderAdvisors,
  renderCompare,
  renderConvene,
  renderDilemmaDetail,
  renderDilemmas,
  renderJson,
  renderKingdoms,
  renderStress,
} from "./render";

export const SERVER_NAME = "nooreign-mcp-server";
export const SERVER_VERSION = "0.1.0";

/** Every tool is a pure read of a local corpus: the annotations are all the same. */
const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

/**
 * The SDK's own result shape: a text block for the human, the same document
 * as `structuredContent` for the machine. The spread keeps the payload out of
 * shared mutable state, and the SDK validates it against the declared
 * `outputSchema` before it reaches a client.
 */
function ok(text: string, payload: object): CallToolResult {
  return { content: [{ type: "text", text }], structuredContent: { ...payload } };
}

/** Turn a thrown cause into a result the agent can act on. */
function failure(cause: unknown): CallToolResult {
  const message =
    cause instanceof ToolError
      ? cause.message
      : `unexpected error: ${cause instanceof Error ? cause.message : String(cause)}`;
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

const responseFormat = z
  .enum(["markdown", "json"])
  .default("markdown")
  .describe("Output format: 'markdown' for human-readable, 'json' for machine-readable (default 'markdown')");

const caseId = z
  .string()
  .min(1)
  .describe(
    `Case id (e.g. "d01") or slug (e.g. "trolley-of-five-million"). Call nooreign_list_dilemmas for all ${DILEMMAS.length} cases.`,
  );

const advisorIds = z
  .array(z.string().min(1))
  .min(1)
  .max(12)
  .optional()
  .describe(
    `Advisor ids or slugs to seat (max 12). Omit for the default bench — the first ${DEFAULT_BENCH} voices in the atlas order. Call nooreign_list_advisors for the full bench.`,
  );

const seedField = z
  .number()
  .int()
  .min(0)
  .max(1_000_000)
  .default(SEED)
  .describe(
    `Tie-break stream (default ${SEED}). The engine is a pure function of case + bench + seed, so the same arguments always produce the same verdict.`,
  );

const listKingdomsInput = z.object({ response_format: responseFormat }).strict();
const listAdvisorsInput = z
  .object({
    kingdom: z
      .string()
      .min(1)
      .optional()
      .describe("Kingdom id or slug to filter by (e.g. \"kantian-citadel\"). Omit for every voice."),
    response_format: responseFormat,
  })
  .strict();
const listDilemmasInput = z.object({ response_format: responseFormat }).strict();
const getDilemmaInput = z.object({ dilemma: caseId, response_format: responseFormat }).strict();
const conveneInput = z
  .object({
    dilemma: caseId,
    advisor_ids: advisorIds,
    seed: seedField,
    rounds: z
      .number()
      .int()
      .min(1)
      .max(3)
      .default(3)
      .describe("1 = positions, 2 = + objections, 3 = + appeals (default 3)."),
    include_mermaid: z
      .boolean()
      .default(false)
      .describe("Also return the argument graph as Mermaid source (default false)."),
    response_format: responseFormat,
  })
  .strict();
const compareInput = z
  .object({ dilemma: caseId, seed: seedField, response_format: responseFormat })
  .strict();
const stressInput = z
  .object({
    dilemma: caseId,
    advisor_ids: advisorIds,
    seed: seedField,
    count: z
      .number()
      .int()
      .min(RESILIENCE_SWEEP.min)
      .max(RESILIENCE_SWEEP.max)
      .default(RESILIENCE_SWEEP.default)
      .describe(
        `How many consecutive seeds to sweep, ${RESILIENCE_SWEEP.min}..${RESILIENCE_SWEEP.max} (default ${RESILIENCE_SWEEP.default}). Each seed is a full deliberation; the sweep is deterministic.`,
      ),
    response_format: responseFormat,
  })
  .strict();

/**
 * Build the server with every tool registered.
 *
 * A factory rather than a module-level singleton: tests create as many
 * servers as they have scenarios, and nothing here holds state between calls.
 */
export function createServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  /* ------------------------------------------------------------ the corpus */

  server.registerTool(
    "nooreign_list_kingdoms",
    {
      title: "List the kingdoms",
      description: `The schools of thought of the Nooreign atlas — ${KINGDOMS.length} moral traditions, one per kingdom, each with a founder, a motto, and the size of its court.

Use this first when you do not yet know which tradition should answer a question: the ids and slugs you get here are accepted by every other nooreign tool.

Args:
  - response_format ('markdown' | 'json'): output format (default 'markdown')

Returns: count, and per kingdom: id, slug, name, motto, founder, founded (negative is BCE), advisors (court size).

Examples:
  - "Which schools of thought are in this atlas?" -> call with no arguments
  - "Who founded the tradition behind case d01?" -> read founder and motto

Errors: none — the call always succeeds.`,
      inputSchema: listKingdomsInput,
      outputSchema: kingdomsPayloadSchema,
      annotations: READ_ONLY,
    },
    ({ response_format }) => {
      const payload = buildKingdoms();
      return ok(response_format === "json" ? renderJson(payload) : renderKingdoms(payload), payload);
    },
  );

  server.registerTool(
    "nooreign_list_advisors",
    {
      title: "List the advisors",
      description: `The ${ADVISORS.length} historical voices of the atlas — philosophers from every kingdom, each with a moral profile and their own argument moves.

Args:
  - kingdom (string, optional): filter to one kingdom by id or slug
  - response_format ('markdown' | 'json'): output format (default 'markdown')

Returns: count, the kingdom filter that was applied (or null), and per advisor: id, slug, name, epithet, kingdom, years, signature move, and how many argument moves they carry.

Examples:
  - "Which voices can I seat?" -> call with no arguments
  - "Who is in the Stoic kingdom?" -> kingdom: "<id from nooreign_list_kingdoms>"

Errors:
  - unknown kingdom -> an error naming nooreign_list_kingdoms, which lists the valid ids`,
      inputSchema: listAdvisorsInput,
      outputSchema: advisorsPayloadSchema,
      annotations: READ_ONLY,
    },
    ({ kingdom, response_format }) => {
      try {
        const payload = buildAdvisors(kingdom);
        return ok(response_format === "json" ? renderJson(payload) : renderAdvisors(payload), payload);
      } catch (cause) {
        return failure(cause);
      }
    },
  );

  server.registerTool(
    "nooreign_list_dilemmas",
    {
      title: "List the hard cases",
      description: `The ${DILEMMAS.length} dilemmas of the atlas — classic and frontier thought experiments, from the trolley problem to the paperclip maximiser.

Args:
  - response_format ('markdown' | 'json'): output format (default 'markdown')

Returns: count, and per case: id, slug, title, severity, ai relevance (both 0..1), option count, and tags.

Examples:
  - "What cases are there about AI deception?" -> scan the tags column
  - "Give me a hard case with high AI relevance" -> pick by the ai relevance column

Errors: none — the call always succeeds.`,
      inputSchema: listDilemmasInput,
      outputSchema: dilemmasPayloadSchema,
      annotations: READ_ONLY,
    },
    ({ response_format }) => {
      const payload = buildDilemmas();
      return ok(response_format === "json" ? renderJson(payload) : renderDilemmas(payload), payload);
    },
  );

  server.registerTool(
    "nooreign_get_dilemma",
    {
      title: "Get one case in full",
      description: `Everything a court will argue about, in one call: the prompt and setting, every option with its moral currency per axis and its harms and benefits, the stakeholders, the lesson, and the references.

Use this before nooreign_convene when you need the substance of the case, not just its verdict.

Args:
  - dilemma (string): case id ("d01") or slug ("trolley-of-five-million")
  - response_format ('markdown' | 'json'): output format (default 'markdown')

Returns: the full case — options with deltas (per-axis scores), risk, reversibility, agent_harm, harms, benefits; stakeholders with welfare and AI status; lesson; references.

Examples:
  - "Summarise the trolley case" -> dilemma: "trolley-of-five-million"
  - "Which option is safest for the agents involved?" -> read agent_harm across options

Errors:
  - unknown case -> an error naming nooreign_list_dilemmas`,
      inputSchema: getDilemmaInput,
      outputSchema: dilemmaDetailSchema,
      annotations: READ_ONLY,
    },
    ({ dilemma, response_format }) => {
      try {
        const payload = buildDilemma(dilemma);
        return ok(
          response_format === "json" ? renderJson(payload) : renderDilemmaDetail(payload),
          payload,
        );
      } catch (cause) {
        return failure(cause);
      }
    },
  );

  /* ------------------------------------------------------------ the court */

  server.registerTool(
    "nooreign_convene",
    {
      title: "Convene a court on a case",
      description: `Seat a bench of advisors on one case and return the verdict the engine computed — with the full arithmetic behind it.

Each advisor scores every option through their own moral weights (kingdom-weighted), a seeded jitter of at most 0.05 breaks ties, and the court's ballots decide. The response carries ballots, every advisor's first choice, dissent including the strongest objection, and the court's own account.

Args:
  - dilemma (string): case id or slug
  - advisor_ids (string[], optional): ids or slugs of the advisors to seat, max 12. Omit for the default bench (the first ${DEFAULT_BENCH} voices).
  - seed (number, optional): tie-break stream, default ${SEED}. Same inputs + same seed = the same verdict, byte for byte.
  - rounds (number, optional): 1 = positions, 2 = + objections, 3 = + appeals (default 3)
  - include_mermaid (boolean, optional): also return the argument graph as Mermaid source
  - response_format ('markdown' | 'json'): output format (default 'markdown')

Returns: verdict {winner_id, winner_label, margin, confidence, deciding_axis, super_majority}, ballots, positions, dissent {count, summary, entries, strongest}, narrative (first five lines), and optionally the Mermaid graph.

Examples:
  - "How would a court rule on the paperclip case?" -> dilemma: "paperclip-maximiser"
  - "What if only Kant and Bentham decided?" -> advisor_ids: ["immanuel-kant", "jeremy-bentham"] (slugs from nooreign_list_advisors)

Errors:
  - unknown case or advisor -> an error naming the list tool with the valid ids

Follow-ups: nooreign_stress_verdict asks whether this verdict survives a different draw; nooreign_compare_kingdoms asks how each kingdom alone would rule.`,
      inputSchema: conveneInput,
      outputSchema: convenePayloadSchema,
      annotations: READ_ONLY,
    },
    ({ dilemma, advisor_ids, seed, rounds, include_mermaid, response_format }) => {
      try {
        const payload = buildConvene({
          dilemma,
          advisor_ids,
          seed,
          rounds,
          include_mermaid,
        });
        return ok(response_format === "json" ? renderJson(payload) : renderConvene(payload), payload);
      } catch (cause) {
        return failure(cause);
      }
    },
  );

  server.registerTool(
    "nooreign_compare_kingdoms",
    {
      title: "Compare kingdoms on one case",
      description: `Sit every kingdom alone on the same case and rank the verdicts — ${KINGDOMS.length} separate courts, one per tradition, same seed for each.

The interesting output is not the winner list but whether the courts agree: twelve kingdoms returning the same option for twelve different reasons is a different object from twelve kingdoms splitting.

Args:
  - dilemma (string): case id or slug
  - seed (number, optional): tie-break stream for every court (default ${SEED})
  - response_format ('markdown' | 'json'): output format (default 'markdown')

Returns: distinct_winners, agreed (boolean), a summary sentence, and per kingdom: winner, margin, confidence, dissent count, whether the super-majority was satisfied.

Examples:
  - "Do the traditions actually disagree on this case?" -> read distinct_winners and agreed
  - "Which kingdom dissents most?" -> scan dissent counts

Errors:
  - unknown case -> an error naming nooreign_list_dilemmas`,
      inputSchema: compareInput,
      outputSchema: comparePayloadSchema,
      annotations: READ_ONLY,
    },
    ({ dilemma, seed, response_format }) => {
      try {
        const payload = buildCompare(dilemma, seed);
        return ok(response_format === "json" ? renderJson(payload) : renderCompare(payload), payload);
      } catch (cause) {
        return failure(cause);
      }
    },
  );

  server.registerTool(
    "nooreign_stress_verdict",
    {
      title: "Stress-test a verdict",
      description: `Ask a finished verdict the two questions a reader should: would a different tie-break have changed it, and who on the bench is load-bearing?

Sweep: the case is re-deliberated across consecutive seeds (default ${RESILIENCE_SWEEP.default}) and the report gives stability — the share won by the modal verdict — a settled/contested/fragile classification, flips between adjacent seeds, the longest unbroken run, margins, and which moral axis decided each draw.

Leave-one-out: every seated advisor is removed in turn and the case re-run at the base seed; advisors whose absence flips the verdict are marked pivotal, and the bench is classified robust / hinged / precarious / untested.

Args:
  - dilemma (string): case id or slug
  - advisor_ids (string[], optional): ids or slugs to seat, max 12 (default bench otherwise)
  - seed (number, optional): the first seed of the sweep (default ${SEED})
  - count (number, optional): how many consecutive seeds, ${RESILIENCE_SWEEP.min}..${RESILIENCE_SWEEP.max} (default ${RESILIENCE_SWEEP.default})
  - response_format ('markdown' | 'json'): output format (default 'markdown')

Returns: stability {modal_winner_id, modal_winner_label, share, verdict, distinct_winners, flips, longest_streak, close_seeds, margin, confidence_mean, axes} and influence {verdict, base_winner_id, pivotal_ids, entries per advisor}.

Examples:
  - "Is the trolley verdict a real verdict?" -> dilemma: "trolley-of-five-million", count: 48
  - "Who actually decides this case?" -> read influence.entries where pivotal is true

Errors:
  - unknown case or advisor -> an error naming the list tool with the valid ids
  - count outside the window -> a validation error stating the range`,
      inputSchema: stressInput,
      outputSchema: stressPayloadSchema,
      annotations: READ_ONLY,
    },
    ({ dilemma, advisor_ids, seed, count, response_format }) => {
      try {
        const payload = buildStress({ dilemma, advisor_ids, seed, count });
        return ok(response_format === "json" ? renderJson(payload) : renderStress(payload), payload);
      } catch (cause) {
        return failure(cause);
      }
    },
  );

  return server;
}
