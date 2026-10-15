import { ADVISORS, DILEMMAS, KINGDOMS, getDilemma, getKingdom, SEED } from "@repo/seed";
import type { Advisor } from "@repo/seed";
import { analyseDilemma, compareCouncils, courtReading } from "@repo/core";
import type { CouncilComparison, CourtReading, DilemmaAnalysis } from "@repo/core";

/**
 * Two analytical views that sit beside the council rather than inside it.
 *
 * The council answers "what does this panel rule?". These answer the two
 * questions a reader actually has next: "what would each realm rule on its own?"
 * and "what is this case actually about, before anyone argues?"
 *
 * Both are pure functions of the seed data, so both are reproducible from a seed
 * and both are safe to render on the server.
 */

export interface RealmVerdict {
  kingdomId: string;
  kingdomName: string;
  glyph: string;
  colour: string;
  advisors: string[];
  winnerId: string;
  winnerLabel: string;
  margin: number;
  confidence: number;
  superMajority: boolean;
  dissentCount: number;
  /** The axis that decided this court's verdict. */
  decidingAxis: string;
}

/**
 * One court per realm: every advisor seated in their own kingdom, deciding alone.
 *
 * Twelve separate sittings rather than one big jury, because the interesting
 * output is the disagreement between realms, not a consensus nobody holds.
 */
export function compareRealms(dilemmaId: string, seed: number = SEED): {
  comparison: CouncilComparison;
  realms: RealmVerdict[];
} | null {
  const dilemma = getDilemma(dilemmaId);
  if (!dilemma) return null;

  const groups = KINGDOMS.map((kingdom) => ({
    groupId: kingdom.id,
    groupName: kingdom.name,
    advisors: ADVISORS.filter((advisor) => advisor.kingdomId === kingdom.id),
  })).filter((group) => group.advisors.length > 0);

  const comparison = compareCouncils(dilemma, groups, { seed, kingdoms: KINGDOMS, rounds: 3 });

  // Built with a loop rather than `map(...).filter(...)` because the narrow
  // below is where `noUncheckedIndexedAccess` fights the type predicate: a
  // loop lets each entry be constructed already-typed.
  const realms: RealmVerdict[] = [];
  for (const entry of comparison.entries) {
    const kingdom = getKingdom(entry.groupId);
    if (!kingdom) continue;
    realms.push({
      kingdomId: kingdom.id,
      kingdomName: kingdom.name,
      glyph: kingdom.glyph,
      colour: kingdom.crest.primary,
      advisors: groups
        .find((group) => group.groupId === entry.groupId)
        ?.advisors.map((advisor) => advisor.name) ?? [],
      winnerId: entry.winnerId,
      winnerLabel: entry.winnerLabel,
      margin: entry.margin,
      confidence: entry.confidence,
      superMajority: entry.satisfied,
      dissentCount: entry.dissentCount,
      decidingAxis: entry.result.decidingAxis,
    });
  }

  return { comparison, realms };
}

export interface DilemmaBrief {
  analysis: DilemmaAnalysis;
  reading: CourtReading;
  title: string;
  dilemmaId: string;
}

/**
 * What the case is about, before anyone argues about it: the axis it pivots on,
 * the axis nobody disputes, and where each advisor stands in the court.
 */
export function briefDilemma(dilemmaId: string, advisorIds: readonly string[]): DilemmaBrief | null {
  const dilemma = getDilemma(dilemmaId);
  if (!dilemma) return null;

  const advisors = advisorIds
    .map((id) => ADVISORS.find((advisor) => advisor.id === id))
    .filter((advisor): advisor is Advisor => advisor !== undefined);

  return {
    dilemmaId: dilemma.id,
    title: dilemma.title,
    analysis: analyseDilemma(dilemma),
    reading: courtReading(dilemma, advisors, KINGDOMS),
  };
}

/** The dilemmas worth briefing, worst first: AI relevance is the ordering here. */
export function briefsForEngine(limit = 6) {
  return [...DILEMMAS]
    .sort((a, b) => b.aiRelevance * (1 - b.severity * 0.3) - a.aiRelevance * (1 - a.severity * 0.3))
    .slice(0, limit)
    .map((dilemma) => dilemma.id);
}
