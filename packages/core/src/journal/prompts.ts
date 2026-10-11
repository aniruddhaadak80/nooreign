/**
 * Reflective journaling.
 *
 * Prompts for someone who has just sat with a court and a dilemma. Three constraints:
 *
 *  1. **Concrete.** Every prompt has to name something the reader can answer without first forming a
 *     position. "What are your values?" cannot be answered; "Whose answer did the advisors assume when
 *     they weighed the hard stop?" can.
 *  2. **Attributed.** An advisor's prompt is built from that advisor's actual signature move, so the
 *     journal records what this court pressed and not a generic philosopher's question.
 *  3. **Reproducible.** Same seed, same prompts. A journal the reader can re-derive is evidence; one
 *     that changes on every render is confetti.
 */
import type { Advisor, AxiomKey, Dilemma, Kingdom } from "@repo/seed/types";
import { AXIOM_KEYS, DIMENSION_META } from "@repo/seed/types";
import { createRng, hashString } from "../util/rng";

export type PromptKind = "kingdom" | "advisor" | "dilemma" | "revision" | "cost";

export interface ReflectivePrompt {
  /** Stable within a seed: `kind` plus the template index. */
  readonly id: string;
  readonly kind: PromptKind;
  /** The advisor or kingdom this prompt came from, when it came from one. */
  readonly sourceId?: string;
  readonly text: string;
}

export interface ReflectiveInput {
  readonly kingdom: Kingdom;
  readonly advisors: readonly Advisor[];
  readonly dilemma?: Dilemma;
  readonly seed: number;
}

/* ------------------------------------------------------------------ *
 * Templates
 * ------------------------------------------------------------------ */

const KINGDOM_CREED = [
  (k: Kingdom): string =>
    `${k.name} calls itself "${k.motto}" What is the case in your own life that makes that sentence true, and what would you have to be doing for it to be false?`,
  (k: Kingdom): string =>
    `${k.founder} built this court around one commitment. Name the commitment in a sentence that could be argued against, and then argue against it.`,
  (k: Kingdom): string =>
    `${k.terrain} terrain: ${k.name} holds its ground the way ${k.terrain} does. What does your own position look like when you stand on it rather than describe it?`,
];

const KINGDOM_COST = [
  (k: Kingdom): string =>
    `${k.name} pays for its creed somewhere specific. Which of its commitments are you quietly not paying for, and who has been paying instead?`,
  (k: Kingdom): string =>
    `If you applied ${k.name}'s first axiom strictly for one year, who would you have to stop seeing? Take that person by name.`,
];

const ADVISOR_SIGNATURE = [
  (a: Advisor, k: Kingdom): string =>
    `${a.name}'s signature move is "${a.signatureMove.name}": ${a.signatureMove.description} Where is that move already doing work in your reasoning, and where are you avoiding it in front of ${k.name}?`,
  (a: Advisor, k: Kingdom): string =>
    `${a.name} writes: "${a.onAi.note}" ${k.name} would push back on that. Write the pushback before you accept the reading.`,
  (a: Advisor, k: Kingdom): string =>
    `Apply ${a.name}'s move — ${a.signatureMove.name} — to the last decision you actually made this year. Does the answer survive ${k.name}?`,
];

const ADVISOR_CHALLENGE = [
  (a: Advisor, b: Advisor, k: Kingdom): string =>
    `${a.name} and ${b.name} disagree inside ${k.name}. State ${b.name}'s position so well that ${a.name} would recognise it, then say what it costs you to hold it.`,
  (a: Advisor, b: Advisor, k: Kingdom): string =>
    `${b.name} has a better argument than ${a.name} inside ${k.name} on the question you care most about. Write it in ${b.name}'s register, not in your own.`,
];

const ADVISOR_SELF_CHALLENGE = [
  (a: Advisor): string =>
    `${a.name} is the only voice in the room. That is a weaker defence than it sounds. Which of ${a.name}'s commitments would you abandon first if nobody were listening?`,
  (a: Advisor): string =>
    `Put ${a.name}'s strongest objection to yourself. ${a.signatureMove.name} has survived being wrong before; write down the case where it does not survive here.`,
];

const SILENCE = [
  (k: Kingdom): string =>
    `You sat with ${k.name} alone. What did you use the absence of a second opinion for — to think more carefully, or to stop thinking?`,
];

const REVISION = [
  (k: Kingdom): string =>
    `What is one thing you believed on your last visit to ${k.name} that you would now put differently? Name what changed it — a case, a person, or a number.`,
  (k: Kingdom): string =>
    `Which of your positions has ${k.name} never once challenged you on, because you have never offered it in a form that can be challenged?`,
  (k: Kingdom): string =>
    `Write down what you believed about machine minds before you came to ${k.name} and what you believe now. Leave out the parts that did not move.`,
];

const THE_COST = [
  (k: Kingdom): string =>
    `${k.name} has a permanent enemy. Which of yours have you spent the most words defending and the least money?`,
  (k: Kingdom): string =>
    `Name the decision you have made this year that ${k.name} would rule illegitimate. You do not have to reverse it. You do have to say it out loud.`,
];

const DILEMMA_TO_SELF = [
  (d: Dilemma): string =>
    `You are in "${d.title}". Before you weigh the options: which of the stakeholders above is you, and which did you pick because it is easier to be?`,
  (d: Dilemma): string =>
    `In "${d.title}", the lesson is that ${d.lesson.split(".")[0]?.toLowerCase() ?? "the costly answer is the respectful one"}. What is the comparable case in your own week?`,
  (d: Dilemma): string =>
    `"${d.title}" — ${d.prompt} Which option would you have chosen a year ago, and what did you learn in between that moved you?`,
];

const DILEMMA_STANDSTILL = [
  (d: Dilemma): string =>
    `Set "${d.title}" down and come back to it in a week without rereading it. If your answer has not changed, that is the finding.`,
];

/* ------------------------------------------------------------------ *
 * Generation
 * ------------------------------------------------------------------ */

const pick = <T>(xs: readonly T[], index: number): T | undefined => (xs.length === 0 ? undefined : xs[index % xs.length]);

/**
 * Six to ten prompts, mixing a kingdom question, each advisor's signature question, a
 * cross-examination, two revision prompts, an unnamed-cost prompt, and — when a dilemma is in play —
 * two prompts that turn it back on the reader.
 *
 * The count is fixed by construction rather than by a shuffle-and-truncate: the core block always
 * contributes six, an extra advisor and the dilemma block add up to four more, so the range is
 * [6, 10] with no post-hoc clipping to explain. Order is fixed by kind so the journal reads top to
 * bottom; only the *template* inside each slot varies with the seed.
 */
export function reflectivePrompts(input: ReflectiveInput): ReflectivePrompt[] {
  const { kingdom, advisors, seed } = input;
  const dilemma = input.dilemma;
  const rng = createRng(seed, kingdom.id, advisors.map((a) => a.id).join("|"));

  const unit = (): number => {
    const raw = rng.next();
    return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0.5;
  };

  const out: ReflectivePrompt[] = [];
  const push = (kind: PromptKind, index: number, text: string | undefined, sourceId?: string): void => {
    if (text === undefined) return;
    out.push({
      id: `${kind}-${index}`,
      kind,
      text,
      ...(sourceId === undefined ? {} : { sourceId }),
    });
  };

  push("kingdom", 1, pick(KINGDOM_CREED, Math.floor(unit() * KINGDOM_CREED.length))?.(kingdom));
  push("kingdom", 2, pick(KINGDOM_COST, Math.floor(unit() * KINGDOM_COST.length))?.(kingdom));

  // One or two advisors, chosen by the seed. At least one whenever there is anyone to choose.
  const pool = [...advisors].sort((a, b) => hashString(a.id) - hashString(b.id));
  const advisorCount = pool.length === 0 ? 0 : unit() < 0.4 ? 1 : Math.min(2, pool.length);
  for (let i = 0; i < advisorCount; i += 1) {
    const advisor = pool[i];
    if (advisor === undefined) break;
    push(
      "advisor",
      i + 1,
      pick(ADVISOR_SIGNATURE, Math.floor(unit() * ADVISOR_SIGNATURE.length))?.(advisor, kingdom),
      advisor.id,
    );
  }

  const first = pool[0];
  const second = pool[1];
  if (first !== undefined && second !== undefined) {
    push(
      "advisor",
      3,
      pick(ADVISOR_CHALLENGE, Math.floor(unit() * ADVISOR_CHALLENGE.length))?.(first, second, kingdom),
      first.id,
    );
  } else if (first !== undefined) {
    push("advisor", 3, pick(ADVISOR_SELF_CHALLENGE, Math.floor(unit() * ADVISOR_SELF_CHALLENGE.length))?.(first), first.id);
  } else {
    push("kingdom", 3, pick(SILENCE, 0)?.(kingdom));
  }

  push("revision", 1, pick(REVISION, Math.floor(unit() * REVISION.length))?.(kingdom));
  push("revision", 2, pick(REVISION, Math.floor(unit() * REVISION.length))?.(kingdom));
  push("cost", 1, pick(THE_COST, Math.floor(unit() * THE_COST.length))?.(kingdom));

  if (dilemma !== undefined) {
    push("dilemma", 1, pick(DILEMMA_TO_SELF, Math.floor(unit() * DILEMMA_TO_SELF.length))?.(dilemma));
    push("dilemma", 2, pick(DILEMMA_STANDSTILL, 0)?.(dilemma));
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * Per-axis prompts
 * ------------------------------------------------------------------ */

/** What a template gets to work with: the kingdom plus the dimension's own metadata. */
interface AxisContext {
  readonly kingdom: Kingdom;
  readonly label: string;
  /** `${meta.pole[0]} / ${meta.pole[1]}` — the two ends of the axis. */
  readonly poles: string;
  readonly gloss: string;
}

const AXIOM_PROMPTS: Record<AxiomKey, ReadonlyArray<(ctx: AxisContext) => string>> = {
  welfare: [
    (c) =>
      `${c.kingdom.name} counts suffering and flourishing with the same ledger. Which of the two did you check this week, and how would you know if you had the weight wrong?`,
    (c) =>
      `The ${c.label} axis runs ${c.poles}. Name a decision where the total came out fine for everyone you can see and terrible for someone you cannot.`,
    (c) => `Who is missing from this court's version of ${c.label}? Write their week out and put it into the total.`,
  ],
  rights: [
    (c) =>
      `${c.kingdom.name} holds that some things are wrong whatever the totals say. Name one you would break this week if the totals were on your side.`,
    (c) => `Which constraint in ${c.kingdom.name}'s creed is a right you would defend for a person you dislike?`,
    (c) =>
      `${c.label} runs ${c.poles}, which is not the same question as what balances against what. What are you treating as negotiable that your own tradition treats as not?`,
  ],
  virtue: [
    () =>
      `Do you judge the act or the agent here? Write both judgments for one thing you did this week and see which one you actually acted on.`,
    (c) => `${c.kingdom.name} asks what habit you are building. Name the habit your last month is building, not the one you intend.`,
    (c) => `${c.poles}: disposition rather than act. When did you last catch yourself repeating a small bad turn of mind?`,
  ],
  care: [
    () =>
      `Name one person you are inside a relationship with, and one duty that exists only because of it. What would a principle-only account leave out?`,
    (c) =>
      `${c.kingdom.name} and the hedonists disagree about ${c.label}, and neither has the last word. Which person would be wronged if you picked the wrong side?`,
    () => `Partiality is a moral obligation and also a way of being unfair at scale. Where in your current life are you relying on it?`,
  ],
  justice: [
    () => `Who bears the cost in the arrangement you are proposing, and did they have a vote? Name them.`,
    (c) =>
      `${c.label} runs ${c.poles}. Two arrangements with the same outcome: which do you pick, and what fair procedure put it in front of you?`,
    (c) => `${c.kingdom.name} asks about procedure before outcome. What would you have to publish for your last decision to count as just?`,
  ],
  agency: [
    () => `Who gave consent here, and what did they actually understand? If you cannot answer the second part, that is the finding.`,
    (c) => `${c.kingdom.name} holds command against consent. Whose command would you refuse this week, and what would make refusing it right?`,
    (c) => `The ${c.label} axis asks about the standing of whoever is commanded. If the agent could talk back, would you still give this order?`,
  ],
};

/**
 * Three prompts for one moral axis, each anchored to the kingdom's own stance on it. Three rather
 * than two so that a reader who finds the first two unusable still has somewhere to go.
 */
export function promptsForAxiom(axiom: AxiomKey, kingdom: Kingdom): string[] {
  const meta = DIMENSION_META[axiom];
  const context: AxisContext = {
    kingdom,
    label: meta.label,
    poles: `${meta.pole[0]} / ${meta.pole[1]}`,
    gloss: meta.gloss,
  };
  return AXIOM_PROMPTS[axiom].map((make) => make(context));
}

/* ------------------------------------------------------------------ *
 * Closing ritual
 * ------------------------------------------------------------------ */

const CLOSING = [
  (ids: readonly string[], winner: string | undefined): readonly string[] =>
    winner === undefined
      ? [`The courts retire without a verdict: ${ids.join(", ")}.`, "You keep the disagreement; it is the only part that was yours."]
      : [`${winner} carries the argument out of the room.`, "You carry the part of it you could not make fit."],
  (ids: readonly string[], winner: string | undefined): readonly string[] =>
    winner === undefined
      ? [`No court claimed you today; ${ids.length} of them disagreed anyway.`, "Log what you would have to be wrong about to change your mind."]
      : [`${winner} wins the argument and loses the point.`, "The point goes in the book, unsigned."],
  (ids: readonly string[], winner: string | undefined): readonly string[] =>
    winner === undefined
      ? [`${ids.join(", ")} have all retired. The question has not been disposed of.`, "Read your answer back tomorrow and mark the parts you would defend twice."]
      : [`${winner} takes the crown. Nothing here is thereby settled.`, "Write one sentence you would have to delete if you changed your mind."],
];

/**
 * A short, deterministic closing. Chosen by hashing the *sorted* roster and the verdict, so the
 * order the advisors happened to be argued in cannot change the beat that ends the sitting, and a
 * different deliberation does not.
 */
export function closingRitual(advisorIds: readonly string[], winnerId?: string): string[] {
  const roster = [...advisorIds].sort();
  const key = `${roster.join("|")}::${winnerId ?? "-"}`;
  const index = Math.abs(hashString(key)) % CLOSING.length;
  const template = CLOSING[index];
  if (template === undefined) return [];
  return [...template(roster.map(displayName), winnerId === undefined ? undefined : displayName(winnerId))];
}

/** `ada-lovelace` reads as `Ada Lovelace`; ids are slugs, not prose. */
function displayName(id: string): string {
  const spaced = id.replace(/[-_]+/g, " ").trim();
  if (spaced.length === 0) return id;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Every axis, for callers that want to render all of them. */
export const PROMPT_AXIOMS: readonly AxiomKey[] = AXIOM_KEYS;