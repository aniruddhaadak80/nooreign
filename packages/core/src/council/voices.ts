/**
 * Deterministic speech synthesis.
 *
 * WHY this exists at all: a deliberation transcript that reads like a data dump
 * teaches nothing. But calling a model to write prose would make Nooreign
 * non-reproducible and would cost an API key, and a generated line could
 * attribute an argument to a philosopher who never made it. So every line here
 * is assembled from the advisor's *own* stored text — their `signatureMove`,
 * their `voice.cadence`, their `voice.tells`, their `moves` — by a pure
 * function. Nothing is invented; only selection and cadence are.
 */
import type {
  Advisor,
  ArgumentMove,
  Dilemma,
  DilemmaOption,
} from "../../../seed/src/types";
import { DIMENSION_META } from "../../../seed/src/types";
import { dominantAxiom, secondaryAxiom } from "../ethics/axioms";
import { clamp, round } from "../util/math";

/**
 * Substitute the four placeholders a move may use.
 *
 * `{option}` is the option label, `{dimension}` the dominant axis in words,
 * `{stakeholder}` the first stakeholder the option touches, `{advisor}` the
 * speaker's own name. An unknown placeholder is left verbatim rather than
 * blanked — a visible `{foo}` tells an author their template is wrong, an empty
 * string tells them nothing.
 */
function substitute(
  template: string,
  advisor: Advisor,
  option?: DilemmaOption,
  dilemma?: Dilemma,
): string {
  const key = dominantAxiom(advisor.axioms);
  const dimension = DIMENSION_META[key];
  const stakeholder = dilemma?.stakeholders[0]?.label ?? "the party at the table";
  return template
    .split("{option}")
    .join(option?.label ?? "the course before us")
    .split("{dimension}")
    .join(dimension?.label.toLowerCase() ?? key)
    .split("{stakeholder}")
    .join(stakeholder)
    .split("{advisor}")
    .join(advisor.name);
}

/**
 * Match the advisor's cadence.
 *
 * `terse` keeps the first clause only — a lapidary thinker does not qualify.
 * `flowing` joins the claim and its support with a connective. `adversarial`
 * prefixes a concession so the objection reads as polemic rather than summary.
 * `measured` (the default) joins them plainly.
 */
function cadence(text: string, cadenceName: Advisor["voice"]["cadence"]): string {
  switch (cadenceName) {
    case "terse": {
      const [first] = text.split(/[,;]/);
      const head = (first ?? text).trim();
      return head.endsWith(".") ? head : `${head}.`;
    }
    case "flowing":
      return text.endsWith(".") ? text : `${text}.`;
    case "adversarial": {
      const concession = "and yet,";
      const body = text.startsWith(concession) ? text : `${concession} ${lowerFirst(text)}`;
      return body.endsWith(".") ? body : `${body}.`;
    }
    case "measured":
    default:
      return text.endsWith(".") ? text : `${text}.`;
  }
}

function lowerFirst(s: string): string {
  if (s.length === 0) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Trim a claim to its first sentence, so joins do not run two thoughts together. */
function firstSentence(s: string): string {
  const match = /^(.+?[.!?])(\s|$)/.exec(s);
  return (match?.[1] ?? s).trim();
}

/**
 * Render a move as this advisor would have said it.
 *
 * The move's own `claim` and `support` are the source of truth; the advisor
 * contributes the voice. The result always names the signature move, because
 * the whole point of a philosopher speaking is that you can tell which
 * doctrine they are speaking from.
 */
export function renderMove(
  move: ArgumentMove,
  advisor: Advisor,
  option?: DilemmaOption,
  dilemma?: Dilemma,
): string {
  const claim = substitute(move.claim, advisor, option, dilemma);
  const support = substitute(move.support, advisor, option, dilemma);
  const body = cadence(
    `${firstSentence(claim)} ${support}`,
    advisor.voice.cadence,
  );
  const tell = advisor.voice.tells[0];
  const signature = `${advisor.name}, by the ${advisor.signatureMove.name}:`;
  return tell === undefined
    ? `${signature} ${body}`
    : `${signature} ${tell} ${lowerFirst(body)}`;
}

/* ------------------------------------------------------------------ *
 * Round speeches
 * ------------------------------------------------------------------ */

export interface Stance {
  readonly optionId: string;
  readonly score: number;
  /** The option this advisor ranked second, which is what they object to. */
  readonly rivalOptionId?: string;
}

/**
 * The advisor's opening position on the actual dilemma.
 *
 * Built from their dominant axis, so two advisors on the same court open with
 * different reasoning even when they back the same option.
 */
export function openingStatement(
  advisor: Advisor,
  dilemma: Dilemma,
  stance: Stance,
): string {
  const option = dilemma.options.find((o) => o.id === stance.optionId);
  const rival = dilemma.options.find((o) => o.id === stance.rivalOptionId);
  const key = dominantAxiom(advisor.axioms);
  const second = secondaryAxiom(advisor.axioms);
  const meta = DIMENSION_META[key];
  const pole = meta.pole[0];

  const opening = substitute(
    `In "${dilemma.title}" the ${meta.label.toLowerCase()} question is ${pole}, and by the ${advisor.signatureMove.name} it decides the case`,
    advisor,
    option,
    dilemma,
  );

  const reasoning =
    option === undefined
      ? `I have no course to put.`
      : `I put "${option.label}" at ${round(clamp(stance.score, 0, 1) * 100, 0)}% — ${meta.gloss.toLowerCase()} weighs with ${second}, not alone.`;

  const rivalLine =
    rival === undefined
      ? ""
      : cadence(`I cannot join "${rival.label}"`, advisor.voice.cadence);

  return [cadence(opening, advisor.voice.cadence), reasoning, rivalLine]
    .filter((line) => line !== "")
    .join(" ");
}

/** The advisor's objection to the rival's course, in their own cadence. */
export function objectionLine(advisor: Advisor, rival: DilemmaOption): string {
  const objection = advisor.moves.find((m) => m.kind === "objection");
  const claim = objection === undefined
    ? `"${rival.label}" will not survive examination`
    : substitute(objection.claim, advisor, rival);
  const support = objection === undefined
    ? `My objection is to the course itself, not only to its consequences.`
    : substitute(firstSentence(objection.support), advisor, rival);

  const named = `"${rival.label}" ${lowerFirst(trimQuotes(claim))}`;
  return cadence(`${named}. ${support}`, advisor.voice.cadence);
}

function trimQuotes(s: string): string {
  return s.replace(/^["“]|["”]$/g, "");
}

/**
 * How the advisor receives the verdict.
 *
 * The signature move is invoked by name in both directions — Kant reaches for
 * the categorical imperative whether he won or lost, because the doctrine
 * is what he has, not what the court gave him.
 */
export function verdictLine(advisor: Advisor, won: boolean, margin: number): string {
  const gap = round(Math.abs(clamp(margin, 0, Number.POSITIVE_INFINITY)), 4);
  const closeness = gap < 0.25 ? "narrowly" : gap < 0.6 ? "by a clear margin" : "overwhelmingly";

  if (won) {
    return cadence(
      `By the ${advisor.signatureMove.name} the court is right, ${closeness}. I record it and I do not soften it`,
      advisor.voice.cadence,
    );
  }
  const tell = advisor.voice.tells[advisor.voice.tells.length - 1] ?? "I dissent.";
  return cadence(
    `${tell} The court has chosen ${closeness}, and the ${advisor.signatureMove.name} does not move because it lost a vote`,
    advisor.voice.cadence,
  );
}

/**
 * The axis an advisor would press hardest on, in words.
 * Useful as a caption under a trace in the UI.
 */
export function axisCaption(advisor: Advisor): string {
  const key = dominantAxiom(advisor.axioms);
  const second = secondaryAxiom(advisor.axioms);
  const meta = DIMENSION_META[key];
  return `${meta.label}: ${meta.pole[0]} over ${meta.pole[1]} — with ${second} in support`;
}

/** The advisor's standing on AI, trimmed to the note's first sentence. */
export function aiVerdictLine(advisor: Advisor): string {
  return cadence(firstSentence(advisor.onAi.note), advisor.voice.cadence);
}

/**
 * A full sitting in one string: opening, objection, verdict.
 * Deterministic for a given (advisor, dilemma, stance, rival, margin).
 */
export function speak(
  advisor: Advisor,
  dilemma: Dilemma,
  stance: Stance,
  rival: DilemmaOption | undefined,
  won: boolean,
  margin: number,
): string {
  const parts: string[] = [];
  parts.push(openingStatement(advisor, dilemma, stance));
  if (rival !== undefined) parts.push(objectionLine(advisor, rival));
  parts.push(verdictLine(advisor, won, margin));
  return parts.join("\n\n");
}