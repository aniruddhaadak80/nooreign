/**
 * Markdown rendering for the MCP tools, and the character budget.
 *
 * WHY a response budget at all: an MCP response lands verbatim in an agent's
 * context. A tool that returns 200KB of JSON has "succeeded" while making the
 * agent dumber, so every text response is capped and the truncation note says
 * exactly how to get less (filter, narrow the sweep) or more (the CLI's
 * `--json`). JSON mode returns the same document the markdown describes.
 */
import type {
  AdvisorsPayload,
  ComparePayload,
  ConvenePayload,
  DilemmaDetail,
  DilemmasPayload,
  KingdomsPayload,
  StressPayload,
} from "./tools";

/** The most a single text response may occupy. */
export const CHARACTER_LIMIT = 25_000;

const percent = (value: number): string => `${Math.round(value * 100)}%`;
const fixed = (value: number, dp = 3): string => value.toFixed(dp);

/** Truncate with a note that tells the agent how to proceed, never silently. */
export function fit(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  const omitted = text.length - CHARACTER_LIMIT;
  return `${text.slice(0, CHARACTER_LIMIT)}\n\n…[truncated: ${omitted} characters omitted. Narrow the request (fewer advisors, a smaller count) or use the nooreign CLI's --json for the full document.]`;
}

export function renderJson(payload: unknown): string {
  return fit(JSON.stringify(payload, null, 2));
}

function table(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const head = `| ${headers.join(" | ")} |`;
  const rule = `| ${headers.map(() => "---").join(" | ")} |`;
  return [head, rule, ...rows.map((row) => `| ${row.join(" | ")} |`)].join("\n");
}

export function renderKingdoms(payload: KingdomsPayload): string {
  const rows = payload.kingdoms.map((kingdom) => [
    `**${kingdom.name}** (${kingdom.slug})`,
    kingdom.id,
    kingdom.founder,
    String(kingdom.founded),
    String(kingdom.advisors),
  ]);
  return [
    `# Nooreign — the ${payload.count} kingdoms`,
    "",
    "One school of thought per kingdom. Pass a kingdom id or slug to `nooreign_list_advisors` to narrow the court; convene any of them on a case with `nooreign_convene`.",
    "",
    table(["kingdom", "id", "founder", "founded", "advisors"], rows),
  ].join("\n");
}

export function renderAdvisors(payload: AdvisorsPayload): string {
  const heading =
    payload.kingdom === null
      ? `# The ${payload.count} voices of the atlas`
      : `# The ${payload.count} voices of ${payload.kingdom}`;
  const rows = payload.advisors.map((advisor) => {
    const span = advisor.died === null ? `${advisor.born}–` : `${advisor.born}–${advisor.died}`;
    return [
      `**${advisor.name}** (${advisor.slug})`,
      advisor.kingdom,
      span,
      advisor.signature_move,
    ];
  });
  return [
    heading,
    "",
    "Seat any of these in a court: `nooreign_convene` and `nooreign_stress_verdict` accept `advisor_ids` (ids or slugs).",
    "",
    table(["advisor", "kingdom", "years", "signature move"], rows),
  ].join("\n");
}

export function renderDilemmas(payload: DilemmasPayload): string {
  const rows = payload.dilemmas.map((dilemma) => [
    `**${dilemma.title}** (${dilemma.slug})`,
    dilemma.id,
    String(dilemma.options),
    fixed(dilemma.severity, 2),
    fixed(dilemma.ai_relevance, 2),
    dilemma.tags.join(", "),
  ]);
  return [
    `# Nooreign — the ${payload.count} hard cases`,
    "",
    "Every case is decided by a court you choose. Start with `nooreign_convene` for one verdict, or `nooreign_stress_verdict` to see whether the verdict survives a different draw of the tie-break.",
    "",
    table(["case", "id", "options", "severity", "ai relevance", "tags"], rows),
  ].join("\n");
}

export function renderDilemmaDetail(payload: DilemmaDetail): string {
  const options = payload.options.map((option) => {
    const deltas = Object.entries(option.deltas)
      .sort(([, a], [, b]) => b - a)
      .map(([axiom, value]) => `${axiom} ${fixed(value, 2)}`)
      .join(" · ");
    return [
      `### ${option.label} (${option.id})`,
      option.description,
      `- moral currency: ${deltas}`,
      `- risk ${fixed(option.risk, 2)} · reversibility ${fixed(option.reversibility, 2)} · agent harm ${fixed(option.agent_harm, 2)}`,
      option.harms.length > 0 ? `- harms: ${option.harms.join("; ")}` : null,
      option.benefits.length > 0 ? `- benefits: ${option.benefits.join("; ")}` : null,
    ]
      .filter((line): line is string => line !== null)
      .join("\n");
  });

  const stakeholders = table(
    ["stakeholder", "welfare", "AI"],
    payload.stakeholders.map((stakeholder) => [
      stakeholder.label,
      fixed(stakeholder.welfare, 2),
      stakeholder.is_ai ? "yes" : "no",
    ]),
  );

  return [
    `# ${payload.title}`,
    "",
    payload.prompt,
    "",
    `*Setting:* ${payload.setting}`,
    "",
    `Origin: **${payload.kingdom_origin_name}** · era ${payload.era_id} · severity ${fixed(payload.severity, 2)} · AI relevance ${fixed(payload.ai_relevance, 2)} · tags: ${payload.tags.join(", ")}`,
    "",
    `## The options`,
    "",
    options.join("\n\n"),
    "",
    "## Stakeholders",
    "",
    stakeholders,
    "",
    "## The lesson",
    "",
    payload.lesson,
    "",
    "## References",
    "",
    ...payload.references.map(
      (reference) => `- ${reference.title} — ${reference.author} (${reference.year})`,
    ),
    "",
    "Decide it: `nooreign_convene` (one verdict) or `nooreign_stress_verdict` (does the verdict survive a different draw?)",
  ].join("\n");
}

export function renderConvene(payload: ConvenePayload): string {
  const ballots = table(
    ["option", "total", "share", "votes"],
    payload.ballots.map((ballot) => [
      ballot.label,
      fixed(ballot.total),
      percent(ballot.share),
      String(ballot.votes),
    ]),
  );

  const positions = table(
    ["advisor", "kingdom", "first choice", "profile"],
    payload.positions.map((position) => [
      position.advisor,
      payload.advisors.find((advisor) => advisor.id === position.advisor_id)?.kingdom ?? "—",
      position.top_option_label,
      position.profile,
    ]),
  );

  const dissentLines =
    payload.dissent.entries.length === 0
      ? ["Unanimous — every seated advisor's first preference was the verdict."]
      : payload.dissent.entries.map(
          (entry) =>
            `- **${entry.advisor}** preferred *${entry.preferred_option}* (gap ${fixed(entry.gap, 3)})`,
        );
  const strongest =
    payload.dissent.strongest === null
      ? []
      : [
          "",
          `Strongest objection — *"${payload.dissent.strongest.claim}"* by ${payload.dissent.strongest.advisor} (weight ${fixed(payload.dissent.strongest.weight, 2)}, leans on ${payload.dissent.strongest.leans_on.join(", ")})`,
        ];

  return [
    `# ${payload.case.title} — a verdict`,
    "",
    `**${payload.verdict.winner_label}** won with margin ${fixed(payload.verdict.margin)} and confidence ${percent(payload.verdict.confidence)}. The deciding axis was **${payload.verdict.deciding_axis}**.`,
    "",
    `${payload.advisors.length} advisors · seed ${payload.seed} · ${payload.rounds} rounds · quorum ${payload.quorum} · super-majority: ${payload.verdict.super_majority ? "satisfied" : "not reached"}`,
    "",
    "## Ballots",
    "",
    ballots,
    "",
    "## Positions",
    "",
    positions,
    "",
    `## Dissent — ${payload.dissent.count} of ${payload.advisors.length}`,
    "",
    ...dissentLines,
    ...strongest,
    "",
    "## The account",
    "",
    ...payload.narrative.map((line) => `- ${line}`),
    ...(payload.mermaid === undefined
      ? []
      : ["", "## Argument graph (Mermaid)", "", "```mermaid", payload.mermaid, "```"]),
    "",
    `Explore the verdict: \`nooreign_stress_verdict\` re-runs this case across seeds (is it the argument or the draw?), \`nooreign_compare_kingdoms\` sits every kingdom alone on it.`,
  ].join("\n");
}

export function renderCompare(payload: ComparePayload): string {
  const courts = table(
    ["kingdom", "verdict", "margin", "confidence", "dissent", "super-majority"],
    payload.courts.map((court) => [
      court.kingdom,
      court.winner_label,
      fixed(court.margin),
      percent(court.confidence),
      String(court.dissent_count),
      court.super_majority ? "yes" : "no",
    ]),
  );
  return [
    `# ${payload.case.title} — how each kingdom rules`,
    "",
    `${payload.courts.length} separate courts, one per kingdom, the same case and seed ${payload.seed} for each. ${payload.distinct_winners} distinct verdict${payload.distinct_winners === 1 ? "" : "s"}; the courts ${payload.agreed ? "agree" : "disagree"}.`,
    "",
    courts,
    "",
    payload.summary,
  ].join("\n");
}

export function renderStress(payload: StressPayload): string {
  const { stability: sweep, influence } = payload;

  const bench = table(
    ["advisor", "kingdom", "without them", "Δmargin", "pivotal"],
    influence.entries.map((entry) => [
      entry.advisor,
      entry.kingdom,
      entry.winner_without_label,
      `${entry.margin_delta >= 0 ? "+" : "−"}${fixed(Math.abs(entry.margin_delta))}`,
      entry.pivotal ? "**yes**" : "no",
    ]),
  );

  const axisLine = sweep.axes.map((entry) => `${entry.axiom} ${entry.count}`).join(" · ");

  return [
    `# ${payload.case.title} — verdict resilience`,
    "",
    `**Stability ${percent(sweep.share)}** — *${sweep.modal_winner_label}* won ${Math.round(sweep.share * payload.count)} of ${payload.count} swept seeds (${payload.seed}–${payload.seed + payload.count - 1}). Verdict: **${sweep.verdict}**.`,
    "",
    `${sweep.distinct_winners} distinct winner${sweep.distinct_winners === 1 ? "" : "s"} · ${sweep.flips} flip${sweep.flips === 1 ? "" : "s"} · longest unbroken run ${sweep.longest_streak} · ${sweep.close_seeds} seed${sweep.close_seeds === 1 ? "" : "s"} inside the close band.`,
    "",
    `Margins ${fixed(sweep.margin.min)}–${fixed(sweep.margin.max)} (mean ${fixed(sweep.margin.mean)}), mean confidence ${percent(sweep.confidence_mean)}. Deciding axes: ${axisLine === "" ? "none recorded" : axisLine}`,
    "",
    `## The bench — ${influence.verdict}`,
    "",
    influence.verdict === "robust"
      ? "No single advisor flips this verdict: remove any one and the same option still wins."
      : `${influence.pivotal_ids.length} of ${influence.entries.length} advisors flip the case alone when removed at seed ${payload.seed}.`,
    "",
    bench,
    "",
    `${payload.bench.length} advisors seated · seed ${payload.seed} · count ${payload.count}`,
  ].join("\n");
}
