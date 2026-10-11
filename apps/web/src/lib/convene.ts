import { z } from "zod";
import { ADVISORS, DILEMMAS, KINGDOMS, getAdvisor, getDilemma, getKingdom, SEED } from "@repo/seed";
import { runCouncil, type CouncilResult } from "@repo/core";

/**
 * The single entry point for convening a court.
 *
 * Both the server-rendered page and the `/api/deliberate` route handler go
 * through here, so the JSON a client receives is the same object the server
 * rendered — there is no second implementation of the engine to drift.
 */

export const conveneRequestSchema = z.object({
  dilemmaId: z.string().min(1),
  advisorIds: z.array(z.string().min(1)).min(1).max(12),
  seed: z.number().int().min(0).max(1_000_000).default(SEED),
});

export type ConveneRequest = z.infer<typeof conveneRequestSchema>;

export interface ConveneResponse extends CouncilResult {
  dilemmaTitle: string;
  /** Option labels resolved from the dilemma, in the same order as ballots. */
  optionLabels: { id: string; label: string }[];
  advisors: { id: string; name: string; kingdomId: string; glyph: string }[];
  kingdomLabels: Record<string, string>;
}

export function convene(request: ConveneRequest): ConveneResponse | { error: string } {
  const parsed = conveneRequestSchema.safeParse(request);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") };
  }

  const dilemma = getDilemma(parsed.data.dilemmaId);
  if (!dilemma) return { error: `unknown dilemma "${parsed.data.dilemmaId}"` };

  const advisors = parsed.data.advisorIds
    .map((id) => getAdvisor(id))
    .filter((advisor): advisor is NonNullable<typeof advisor> => advisor !== undefined);

  if (advisors.length === 0) return { error: "no known advisors were selected" };

  const kingdoms = KINGDOMS.filter((kingdom) => advisors.some((advisor) => advisor.kingdomId === kingdom.id));

  const result = runCouncil({
    dilemma,
    advisors,
    kingdoms,
    seed: parsed.data.seed,
    rounds: 3,
    quorum: Math.ceil(advisors.length / 2),
  });

  const kingdomLabels: Record<string, string> = {};
  for (const kingdom of kingdoms) kingdomLabels[kingdom.id] = kingdom.name;

  return {
    ...result,
    dilemmaTitle: dilemma.title,
    optionLabels: dilemma.options.map((option) => ({ id: option.id, label: option.label })),
    advisors: advisors.map((advisor) => {
      const kingdom = getKingdom(advisor.kingdomId);
      return {
        id: advisor.id,
        name: advisor.name,
        kingdomId: advisor.kingdomId,
        glyph: kingdom?.glyph ?? "·",
      };
    }),
    kingdomLabels,
  };
}

/** The court that sits by default on a dilemma page: one advisor per distinct kingdom. */
export function defaultPanelFor(dilemmaId: string): string[] {
  const dilemma = getDilemma(dilemmaId) ?? DILEMMAS[0];
  if (!dilemma) return ADVISORS.slice(0, 4).map((advisor) => advisor.id);

  const seen = new Set<string>();
  const panel: string[] = [];
  for (const advisor of ADVISORS) {
    if (seen.has(advisor.kingdomId)) continue;
    seen.add(advisor.kingdomId);
    panel.push(advisor.id);
    if (panel.length === 4) break;
  }
  // The dilemma's home kingdom always gets a seat — its origin tradition has the
  // strongest claim to be heard on it.
  const origin = getKingdom(dilemma.kingdomOrigin);
  const home = ADVISORS.find((advisor) => advisor.kingdomId === dilemma.kingdomOrigin);
  if (home && !panel.includes(home.id)) {
    panel[panel.length - 1] = home.id;
  }
  void origin;
  return panel;
}
