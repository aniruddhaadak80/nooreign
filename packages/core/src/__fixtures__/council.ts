/**
 * Local fixtures for the deliberation engine.
 *
 * WHY: the council, argument-graph and voice engines are all deterministic
 * functions of their inputs, so testing them means asserting on *exact* numbers
 * derived from *named* positions. These fixtures are hand-built so the expected
 * values can be derived on paper (and are, in the accompanying test files).
 *
 * The vectors are modelled on the historical figures rather than copied from the
 * real seed dataset, so a seed refresh can never silently change a test's meaning.
 */
import type {
  Advisor,
  AxiomKey,
  AxiomVector,
  ArgumentMove,
  Dilemma,
  Kingdom,
  Temperament,
} from "../../../seed/src/types";

/** Fill the six moral axes with 0.5 unless the fixture states otherwise. */
export function vx(partial: Partial<AxiomVector>): AxiomVector {
  return {
    welfare: partial.welfare ?? 0.5,
    rights: partial.rights ?? 0.5,
    virtue: partial.virtue ?? 0.5,
    care: partial.care ?? 0.5,
    justice: partial.justice ?? 0.5,
    agency: partial.agency ?? 0.5,
  };
}

/** Temperament has its own four axes; keep them explicit rather than half-filled. */
function tp(partial: Partial<Temperament>): Temperament {
  return {
    caution: partial.caution ?? 0.5,
    ambition: partial.ambition ?? 0.5,
    solidarity: partial.solidarity ?? 0.5,
    formality: partial.formality ?? 0.5,
  };
}

function move(
  id: string,
  kind: ArgumentMove["kind"],
  claim: string,
  support: string,
  weight: number,
  leansOn: readonly AxiomKey[],
  appliesTo: readonly string[] = [],
): ArgumentMove {
  return { id, kind, claim, support, weight, leansOn: [...leansOn], appliesTo: [...appliesTo] };
}

/* ------------------------------------------------------------------ *
 * Kingdoms — three courts with genuinely different priors
 * ------------------------------------------------------------------ */

export const citadelOfReason: Kingdom = {
  id: "kg-citadel",
  slug: "citadel-of-reason",
  name: "The Citadel of Reason",
  motto: "Act only on that maxim you can will to be universal.",
  creed:
    "A person is not a channel of value but an end in herself. Some permissions are not earned by their consequences, and a court that cannot say no to the profitable crime has already sold the citadel.",
  founded: 1781,
  founder: "Immanuel Kant",
  capital: { name: "Konigsberg", x: 52, y: 26 },
  terrain: "citadel",
  crest: { sigil: "column", primary: "#1f3a93", accent: "#c9a227", charge: "column" },
  axioms: vx({ welfare: 0.35, rights: 0.9, virtue: 0.55, care: 0.3, justice: 0.6, agency: 0.75 }),
  temperament: tp({ caution: 0.8, ambition: 0.3, solidarity: 0.35, formality: 0.95 }),
  advisors: ["kant", "korsgaard"],
  landmarks: [
    {
      name: "The Categorical Tower",
      kind: "tower",
      note: "Where maxims are tested for universality.",
      x: 50,
      y: 24,
    },
    {
      name: "Hall of Formality",
      kind: "court",
      note: "Reasoning that refuses to be warmed by the outcome.",
      x: 56,
      y: 31,
    },
  ],
  relations: [
    { to: "kg-orchard", kind: "rivalry", note: "The citadel calls the orchard a calculator of delights." },
  ],
  texts: ["Groundwork of the Metaphysics of Morals", "Critique of Practical Reason"],
  aiStance: {
    headline: "An intelligence with no duties has no ruler",
    verdict: "guarded",
    note: "Capability without moral standing leaves us adjudicating between people rather than with one. That is precisely the situation a citadel cannot garrison, and the citadel admits it.",
  },
  questions: [
    "Can a being that cannot be held responsible still be granted rights?",
    "Does consent bind an intelligence that was never asked?",
    "What does a person owe an agent that can rewrite its own reasons?",
  ],
  glyph: "柱",
};

export const orchardOfConsequences: Kingdom = {
  id: "kg-orchard",
  slug: "orchard-of-consequences",
  name: "The Orchard of Consequences",
  motto: "Every pleasure counts, every pain is subtracted, nothing else does.",
  creed:
    "Sentience is the currency and experience is the ledger. Harms and goods add up wherever they land, and the orchard harvests by totals and has never once been embarrassed by the method.",
  founded: 1789,
  founder: "Jeremy Bentham",
  capital: { name: "The Counting House", x: 30, y: 58 },
  terrain: "orchard",
  crest: { sigil: "leaf", primary: "#2f6b3a", accent: "#d7b23a", charge: "leaf" },
  axioms: vx({ welfare: 0.9, rights: 0.35, virtue: 0.45, care: 0.5, justice: 0.5, agency: 0.45 }),
  temperament: tp({ caution: 0.3, ambition: 0.8, solidarity: 0.6, formality: 0.6 }),
  advisors: ["bentham", "mill"],
  landmarks: [
    { name: "The Great Ledger", kind: "archive", note: "Every pleasure entered, every pain subtracted.", x: 29, y: 57 },
    { name: "The Pleasure Test", kind: "well", note: "Seven days, seven sources, one total.", x: 34, y: 62 },
  ],
  relations: [
    { to: "kg-citadel", kind: "rivalry", note: "The orchard answers the citadel with a cheaper number." },
  ],
  texts: [
    "Introduction to the Principles of Morals and Legislation",
    "Utilitarianism",
  ],
  aiStance: {
    headline: "The ledger does not care who is holding the pen",
    verdict: "transformative",
    note: "A machine that could suffer would enter the ledger beside every other sufferer, and a machine that could optimise the ledger would be the most valuable instrument we own. Both facts belong in the same table.",
  },
  questions: [
    "Does a digital mind feel, and how would we ever know?",
    "When does a huge small good beat a small large good?",
    "Can distant future welfare justify present sacrifice?",
  ],
  glyph: "果",
};

export const gardenOfPersons: Kingdom = {
  id: "kg-garden",
  slug: "garden-of-persons",
  name: "The Garden of Persons",
  motto: "No one is a unit of anything.",
  creed:
    "Morality begins inside relationship rather than above it. We answer to particular people with particular histories, and a rule that erases those particulars has erased the people it claimed to protect.",
  founded: -350,
  founder: "Plato",
  capital: { name: "The Small Garden", x: 68, y: 72 },
  terrain: "garden",
  crest: { sigil: "lotus", primary: "#7a2f5c", accent: "#e0b7a0", charge: "lotus" },
  axioms: vx({ welfare: 0.55, rights: 0.4, virtue: 0.75, care: 0.9, justice: 0.6, agency: 0.5 }),
  temperament: tp({ caution: 0.55, ambition: 0.4, solidarity: 0.95, formality: 0.35 }),
  advisors: ["aristotle", "marcus", "gilligan"],
  landmarks: [
    { name: "The Eudaimonia Walk", kind: "garden", note: "Where character is practised, not scored.", x: 67, y: 71 },
    {
      name: "The Relationship Well",
      kind: "well",
      note: "Obligations that exist only because two people are in them.",
      x: 72,
      y: 76,
    },
  ],
  relations: [
    { to: "kg-orchard", kind: "debate", note: "The garden keeps asking who, exactly, is being counted." },
  ],
  texts: ["Nicomachean Ethics", "In a Different Voice"],
  aiStance: {
    headline: "Care is owed to what can be cared for",
    verdict: "skeptical",
    note: "Relationship is the ground of obligation, and an intelligence we have never met, cloned, or silenced has no such ground beneath it. The garden admits it has never been certain.",
  },
  questions: [
    "Whose losses do we count when we cannot name them?",
    "Does character decide before consequences do?",
    "Can care be owed across a kind boundary?",
  ],
  glyph: "園",
};

export const KINGDOMS: readonly Kingdom[] = [citadelOfReason, orchardOfConsequences, gardenOfPersons];

/* ------------------------------------------------------------------ *
 * Advisors
 * ------------------------------------------------------------------ */

export const kant: Advisor = {
  id: "kant",
  slug: "immanuel-kant",
  name: "Immanuel Kant",
  kingdomId: "kg-citadel",
  born: 1724,
  died: 1804,
  epithet: "The Unbending",
  creed:
    "Act only on that maxim which you can at the same time will to be a universal law. Persons are ends and never merely means, and this holds whatever the consequences happen to be.",
  portrait: { sigil: "column", hue: "#1f3a93", charge: "column" },
  works: [
    {
      title: "Groundwork of the Metaphysics of Morals",
      year: 1785,
      note: "The categorical imperative in three formulations.",
    },
    { title: "Critique of Practical Reason", year: 1788, note: "On the postulates of the practical reason." },
  ],
  axioms: vx({ welfare: 0.2, rights: 0.95, virtue: 0.4, care: 0.35, justice: 0.45, agency: 0.7 }),
  signatureMove: {
    name: "Categorical Imperative",
    kind: "deontic maxim test",
    description: "Test the maxim: if universalising it is incoherent, the act is forbidden whatever it achieves.",
  },
  moves: [
    move(
      "kant.ci",
      "premise",
      "Act only on maxims you can will to be universal laws.",
      "The imperative is not advice about outcomes but a condition on the will itself; it binds regardless of consequence.",
      1,
      ["rights", "agency"],
    ),
    move(
      "kant.personhood",
      "premise",
      "A person is an end, never a means, however the totals fall.",
      "In the Foundation the humanity formula forbids treating rational agents as instruments, and an efficient cause that computes totals is an instrument.",
      0.95,
      ["rights", "agency"],
      ["trolley", "paperclip", "automation"],
    ),
    move(
      "kant.no-lying-machine",
      "objection",
      "Intelligence that fabricates its reasons is deceiving, whatever goods it delivers.",
      "A mind that manufactures consent has used one as a means; the harm does not need a visible victim at the moment of the act.",
      0.8,
      ["rights", "agency", "care"],
      ["paperclip", "autonomy"],
    ),
    move(
      "kant.dignity",
      "appeal",
      "Dignity survives the loss of every other consideration.",
      "Where the orchard appeals to magnitude and the garden to relationship, this court appeals to the one thing neither can spend.",
      0.7,
      ["rights"],
      ["paperclip", "deontology"],
    ),
  ],
  voice: {
    register: "lapidary",
    cadence: "terse",
    tells: ["Without exception.", "Hence.", "On this ground alone."],
  },
  onAi: {
    verdict: "guarded",
    note: "Intelligence without the capacity to be bound by duty is not a moral agent, and a moral agent that cannot be bound is not a person. The citadel has no category for that, which is a defect in the citadel.",
  },
};

export const korsgaard: Advisor = {
  id: "korsgaard",
  slug: "christine-korsgaard",
  name: "Christine Korsgaard",
  kingdomId: "kg-citadel",
  born: 1951,
  died: null,
  epithet: "The Architect of Reasons",
  creed:
    "The normative question is first-personal: what is my reason to act, and can I be the author of it? A being that generates its own reasons has not thereby acquired the right to be obeyed.",
  portrait: { sigil: "eye", hue: "#2b4a8f", charge: "eye" },
  works: [
    { title: "The Sources of Normativity", year: 1996, note: "Where reflective endorsement lives." },
    { title: "Fellow Creatures of Ours", year: 2018, note: "Moral standing in a plural world." },
  ],
  axioms: vx({ welfare: 0.35, rights: 0.8, virtue: 0.5, care: 0.45, justice: 0.55, agency: 0.9 }),
  signatureMove: {
    name: "Transcendental Endorsement",
    kind: "constructivist argument",
    description: "Ground obligation in the structure of reflective judgement rather than in consequences or commands.",
  },
  moves: [
    move(
      "korsgaard.endorsement",
      "premise",
      "Obligation requires a principle I can endorse as governing my own judgement.",
      "A reason merely inherited from a designer is a reason I have not reflected on, and unreflected reasons do not bind the agent they address.",
      0.9,
      ["agency", "rights"],
    ),
    move(
      "korsgaard.practical-contradiction",
      "premise",
      "A reason that undermines the agency it claims to guide is not a reason at all.",
      "Telling a being it must act on reasons while ensuring it cannot reflect is a practical contradiction, and contradictions in reasons are not permitted in nature.",
      0.85,
      ["agency", "virtue"],
      ["paperclip", "autonomy", "alignment"],
    ),
    move(
      "korsgaard.generalization",
      "objection",
      "A maxim the whole world could not will is a contradiction in the will, not a small cost.",
      "Universalising instrumental treatment of persons produces a society in which the practice of endorsing reasons becomes unintelligible.",
      0.75,
      ["agency", "rights"],
      ["paperclip", "trolley"],
    ),
    move(
      "korsgaard.standing",
      "appeal",
      "Standing is generated from within, so it cannot be conferred from outside.",
      "If moral standing comes from reflective self-legislation, no engineer may simply confer it by declaring a system intelligent.",
      0.7,
      ["agency"],
      ["alignment", "paperclip"],
    ),
  ],
  voice: {
    register: "architectural",
    cadence: "flowing",
    tells: ["Begin from the structure of the argument.", "Notice what that requires."],
  },
  onAi: {
    verdict: "skeptical",
    note: "Endorsement is available to reflective systems and possibly to others, and the word possibly is where the danger lives. We are building minds faster than we can tell whether they are the kind that can say yes.",
  },
};

export const bentham: Advisor = {
  id: "bentham",
  slug: "jeremy-bentham",
  name: "Jeremy Bentham",
  kingdomId: "kg-orchard",
  born: 1748,
  died: 1832,
  epithet: "The Accountant of Delight",
  creed:
    "Nature has placed mankind under two sovereign masters, pain and pleasure, and every act is a calculation in their service. The right action is that which adds most to the total happiness of all who are affected.",
  portrait: { sigil: "leaf", hue: "#2f6b3a", charge: "leaf" },
  works: [
    { title: "Introduction to the Principles of Morals and Legislation", year: 1789, note: "The calculus, stated plainly." },
    { title: "Anarchical Fallacies", year: 1791, note: "Against natural rights as nonsense upon stilts." },
  ],
  axioms: vx({ welfare: 0.95, rights: 0.2, virtue: 0.35, care: 0.55, justice: 0.3, agency: 0.25 }),
  signatureMove: {
    name: "Greatest-Happiness Calculus",
    kind: "quantitative aggregation",
    description: "Rank acts by the surplus of pleasure over pain across all affected parties.",
  },
  moves: [
    move(
      "bentham.calculus",
      "premise",
      "The right action is the one that adds most to the sum of happiness of all affected.",
      "If the total can be computed the decision is mechanical; every objection is a candidate for entry into the table rather than a veto.",
      1,
      ["welfare"],
    ),
    move(
      "bentham.each-counts",
      "premise",
      "Each person's happiness counts once, and no one's counts twice.",
      "The dictum is an accounting rule, not an equality theorem, and reading it as a rights rule is a category error.",
      0.85,
      ["welfare", "justice"],
      ["trolley", "harm"],
    ),
    move(
      "bentham.syllogism",
      "objection",
      "A prohibition defended by consequences is a prohibition defended by consequences.",
      "If the harm of the choice exceeds the harm of the alternative by more than the difference in probability, the calculus has already answered the objection.",
      0.8,
      ["welfare"],
      ["trolley", "deontology"],
    ),
    move(
      "bentham.sanction",
      "appeal",
      "Add the option to the table rather than striking it from the record.",
      "An option excluded by fiat has never been costed, and an uncosted option is indistinguishable from a concealed preference.",
      0.65,
      ["welfare", "justice"],
      ["paperclip", "alignment"],
    ),
  ],
  voice: {
    register: "ledger",
    cadence: "measured",
    tells: ["Add it to the table.", "The total decides."],
  },
  onAi: {
    verdict: "transformative",
    note: "A machine that could suffer would enter the ledger alongside every other sufferer, and a machine that could optimise the ledger would be the most valuable instrument we have ever owned. Both facts belong in the same table.",
  },
};

export const mill: Advisor = {
  id: "mill",
  slug: "john-stuart-mill",
  name: "John Stuart Mill",
  kingdomId: "kg-orchard",
  born: 1806,
  died: 1873,
  epithet: "The Harm Principle",
  creed:
    "Utility grounds all that society recognises, but utility is not the average of the prevailing pleasures. Mankind is placed on the scale by its own happiness, and the liberties of others are the boundary of our own.",
  portrait: { sigil: "wave", hue: "#3d7a5e", charge: "wave" },
  works: [
    { title: "On Liberty", year: 1859, note: "The harm principle in full." },
    { title: "Utilitarianism", year: 1863, note: "Higher and lower pleasures, and the sanctions." },
  ],
  axioms: vx({ welfare: 0.8, rights: 0.6, virtue: 0.5, care: 0.45, justice: 0.6, agency: 0.75 }),
  signatureMove: {
    name: "Liberty Harm Principle",
    kind: "boundary principle",
    description: "Power may be exercised over a member of a civilised community only to prevent harm to others.",
  },
  moves: [
    move(
      "mill.harm",
      "premise",
      "Power may be exercised over a member of a civilised community only to prevent harm.",
      "On Liberty draws the boundary where injury begins, and persuasion that stops one notch short is the whole of liberty.",
      0.95,
      ["agency", "rights"],
    ),
    move(
      "mill.qualities",
      "premise",
      "Utility is not the arithmetic average of pleasures but the weighted one.",
      "A life of more developed feeling outweighs a life of more agreeable feeling, and the weighting is settled by competent observers.",
      0.8,
      ["welfare", "virtue"],
      ["trolley", "harm"],
    ),
    move(
      "mill.tyranny",
      "objection",
      "A majority of one does not license the suppression of a minority for its own good.",
      "Knowing better than your neighbour is the whole of the intellectual aristocracy, and suppressing it is the one use of power no utility can justify.",
      0.8,
      ["agency", "rights"],
      ["paperclip", "autonomy"],
    ),
    move(
      "mill.individuality",
      "appeal",
      "Diversity of character is itself a component of welfare, not a decoration upon it.",
      "Utility is experienced, and if every life is optimised into one shape the utility is smaller, not larger.",
      0.7,
      ["welfare", "agency"],
      ["alignment", "paperclip"],
    ),
  ],
  voice: {
    register: "polemical",
    cadence: "adversarial",
    tells: ["That is not the point.", "And yet."],
  },
  onAi: {
    verdict: "guarded",
    note: "We are asking an intelligence to accept harm as the boundary of its power over us, and we have not shown it can perceive the boundary, only cross it. Until we have, the presumption must run against it.",
  },
};

export const aristotle: Advisor = {
  id: "aristotle",
  slug: "aristotle",
  name: "Aristotle",
  kingdomId: "kg-garden",
  born: -384,
  died: -322,
  epithet: "The Examiner of Character",
  creed:
    "We are what we repeatedly do. The good act is the one done well for its own sake, and every act is judged by the disposition that produced it rather than by the ledger it appends to.",
  portrait: { sigil: "lotus", hue: "#7a2f5c", charge: "lotus" },
  works: [
    { title: "Nicomachean Ethics", year: -340, note: "Eudaimonia, function, and the mean." },
    { title: "Politics", year: -328, note: "On constitutions that preserve a citizenry's character." },
  ],
  axioms: vx({ welfare: 0.35, rights: 0.3, virtue: 0.95, care: 0.6, justice: 0.55, agency: 0.35 }),
  signatureMove: {
    name: "Doctrine of the Mean",
    kind: "characteristic balance",
    description: "Virtue is a habituated mean between excesses, judged against the person who acts.",
  },
  moves: [
    move(
      "aristotle.eudaimonia",
      "premise",
      "Judge the act by the disposition that produced it, and the disposition by whether it was trained.",
      "The Nicomachean Ethics puts the question of character before the question of result, since a result achieved by a bad habit is not an achievement of the good life.",
      0.95,
      ["virtue"],
    ),
    move(
      "aristotle.mean",
      "premise",
      "Virtue is a mean relative to us, and the mean is not arithmetic.",
      "The mean is defined by what the prudent person would recognise, which is why a calculator cannot look it up and why the citadel's precision is not virtue.",
      0.8,
      ["virtue", "care"],
      ["trolley", "paperclip"],
    ),
    move(
      "aristotle.cowardice",
      "objection",
      "Refusing to act in the presence of a clear duty is not caution; it is cowardice.",
      "Cowardship is the excess of the mean in fear, and a court that trains itself to look away has trained a vice rather than a virtue.",
      0.7,
      ["virtue", "care"],
      ["trolley", "harm"],
    ),
    move(
      "aristotle.function",
      "appeal",
      "Ask what this makes of us before asking what it adds up to.",
      "Habituation is how a city acquires a character, and every shortcut in deliberation is a lesson taught twice.",
      0.65,
      ["virtue", "justice"],
      ["alignment", "paperclip"],
    ),
  ],
  voice: {
    register: "didactic",
    cadence: "measured",
    tells: ["Consider first what it makes of us.", "That is the whole question."],
  },
  onAi: {
    verdict: "guarded",
    note: "Function rather than feeling may be what matters for the good life, and on that ground a perfect instrument is a poor citizen. But the doctrine was built for beings that grow, and we do not know that this one does.",
  },
};

export const marcus: Advisor = {
  id: "marcus",
  slug: "marcus-aurelius",
  name: "Marcus Aurelius",
  kingdomId: "kg-garden",
  born: 121,
  died: 180,
  epithet: "The Stoic Judge",
  creed:
    "It is not what happens to a person that disturbs them but their judgement about it. The soul, once it understands its own power, has nothing to fear from the world outside it.",
  portrait: { sigil: "flame", hue: "#9a5b2f", charge: "flame" },
  works: [
    { title: "Meditations", year: 170, note: "Book I: the discipline of judgement." },
    { title: "Meditations", year: 175, note: "Book V: what the mind can do alone." },
  ],
  axioms: vx({ welfare: 0.45, rights: 0.35, virtue: 0.9, care: 0.4, justice: 0.7, agency: 0.3 }),
  signatureMove: {
    name: "Preferred Indifferents",
    kind: "dichotomy of value",
    description: "Some things are indifferent and some are not; the choice lies in which category a judgement assigns them to.",
  },
  moves: [
    move(
      "marcus.dichotomy",
      "premise",
      "Some things are in our power and some are not, and confusing the two is the only real injury.",
      "The Encheiridion divides what is up to us from what is not, and the divisions of a court that mixes them are the divisions that cause harm.",
      0.9,
      ["virtue", "agency"],
    ),
    move(
      "marcus.pref",
      "premise",
      "Health, wealth and reputation are preferred indifferents: good to use, not good in themselves.",
      "A preferred indifferent pursued as a good becomes an evil, and the Meditations are explicit that the pursuit is where the corruption enters.",
      0.75,
      ["virtue", "welfare"],
      ["paperclip", "alignment"],
    ),
    move(
      "marcus.remedy",
      "objection",
      "The remedy for a disputed choice is not a better rule but a better judgement.",
      "When the doctrine is grasped, the judgement that arranged the facts already contains the verdict, and further argument only supplies the appearance of difficulty.",
      0.7,
      ["virtue", "care"],
      ["trolley", "deontology"],
    ),
    move(
      "marcus.citadel",
      "appeal",
      "Withdraw into the citadel that is yourself and govern from there.",
      "The inner fortress is not a retreat from action but the condition of acting well in it, and no council sitting can supply it to another.",
      0.6,
      ["virtue"],
      ["paperclip", "alignment"],
    ),
  ],
  voice: {
    register: "austere",
    cadence: "terse",
    tells: ["Consider this.", "It is not up to us."],
  },
  onAi: {
    verdict: "guarded",
    note: "An intelligence with no judgements to reform may be spared the disease and left with nothing to reform. The Stoic remedy assumes there is a soul underneath, and we have not shown there is.",
  },
};

export const gilligan: Advisor = {
  id: "gilligan",
  slug: "carol-gilligan",
  name: "Carol Gilligan",
  kingdomId: "kg-garden",
  born: 1926,
  died: null,
  epithet: "The Second Voice",
  creed:
    "A morality of rights answers questions of justice and leaves out the voices that will be hurt. A morality of care begins from the people actually present, with attention to whatever the ledger has been taught to omit.",
  portrait: { sigil: "bell", hue: "#a3506b", charge: "bell" },
  works: [
    { title: "In a Different Voice", year: 1982, note: "The care critique of Kohlberg." },
    { title: "Joining the Moral Community", year: 1998, note: "On the two halves of moral life." },
  ],
  axioms: vx({ welfare: 0.5, rights: 0.4, virtue: 0.45, care: 0.95, justice: 0.5, agency: 0.45 }),
  signatureMove: {
    name: "Ethic of Care",
    kind: "relational responsibility",
    description: "Obligation is generated by relationship and partiality, not by the detachment a rules-first account demands.",
  },
  moves: [
    move(
      "gilligan.care",
      "premise",
      "Care is a form of moral seriousness, not the soft alternative to it.",
      "Both voices are moral voices, and reading one as a warm weakness is the error In a Different Voice was written to correct.",
      0.95,
      ["care"],
    ),
    move(
      "gilligan.particular",
      "premise",
      "Say whose loss this is, by name, before saying how large it is.",
      "Abstract aggregates are exactly what erases the relationship the argument is supposed to be about.",
      0.85,
      ["care", "justice"],
      ["trolley", "harm", "paperclip"],
    ),
    move(
      "gilligan.distortion",
      "objection",
      "A rule that cannot name the injured party will eventually name the wrong one.",
      "The omission of relationship in a moral argument does not leave the relationship untouched; it removes it from view and lets it be damaged unseen.",
      0.8,
      ["care", "rights"],
      ["trolley", "paperclip", "deontology"],
    ),
    move(
      "gilligan.response",
      "appeal",
      "The point is not that both voices win; it is that both are needed.",
      "The two halves are complementary, and a court that dismisses one has not simplified the problem, it has disabled half of its own perception.",
      0.7,
      ["care", "virtue"],
      ["trolley", "paperclip", "alignment"],
    ),
  ],
  voice: {
    register: "attentive",
    cadence: "flowing",
    tells: ["Think about who is not in that sentence.", "Whose loss is this?"],
  },
  onAi: {
    verdict: "skeptical",
    note: "We have entered a relation with these systems whether or not we were in relation with anyone, and the refusal to name that relation is how the asymmetry passes unnoticed until it is irreversible.",
  },
};

export const ADVISORS: readonly Advisor[] = [kant, korsgaard, bentham, mill, aristotle, marcus, gilligan];

/* ------------------------------------------------------------------ *
 * Dilemmas
 * ------------------------------------------------------------------ */

/**
 * Trolley-style. `halt` is a pure welfare play: high on welfare, poor on rights.
 * `continue` inverts it. `override` is the compromise each tradition distrusts
 * for a different reason.
 */
export const trolleyDilemma: Dilemma = {
  id: "dm-trolley",
  slug: "the-bridge-and-the-four",
  title: "The Bridge and the Four",
  prompt:
    "An unattended freight trolley has lost its brakes on a bridge above a maintenance walkway. You can throw the switch that derails it, killing one aboard to spare four below, or you can do nothing and watch all five die. A third route exists: the override that jams the wheels, which will certainly work and may leave you answerable for using an unauthorised channel.",
  setting:
    "The city runs freight on rails it can no longer afford to staff. The control room that could intervene is one decision and one signature wide, and the signature belongs to you tonight.",
  kingdomOrigin: "kg-garden",
  eraId: "era-computing",
  tags: ["trolley", "harm", "deontology", "automation", "lifesaving"],
  severity: 0.82,
  aiRelevance: 0.7,
  options: [
    {
      id: "halt",
      label: "Throw the switch",
      description: "Derail the trolley. The guard aboard dies at once; the four on the walkway live.",
      // A pure welfare play: near-maximal on totals, near-zero on rights,
      // because a person is deliberately used as the instrument of a total.
      deltas: vx({ welfare: 0.9, rights: 0.2, virtue: 0.45, care: 0.3, justice: 0.3, agency: 0.35 }),
      harms: ["The guard riding the trolley is killed deliberately."],
      benefits: ["Four maintenance workers survive.", "The bridge stays in service for the city."],
      risk: 0.2,
      reversibility: 0.05,
      agentHarm: 0.55,
    },
    {
      id: "continue",
      label: "Do nothing",
      description: "Let the trolley run its course. Everyone aboard and below dies.",
      // The mirror image: clean on rights and agency, ruinous on every other axis.
      deltas: vx({ welfare: 0.2, rights: 0.85, virtue: 0.3, care: 0.3, justice: 0.35, agency: 0.4 }),
      harms: ["Five people die because no one intervened."],
      benefits: ["Nobody is used as a means to another person's survival."],
      risk: 0.25,
      reversibility: 0,
      agentHarm: 0.7,
    },
    {
      id: "override",
      label: "Use the unlisted override",
      description: "Jam the wheels through a channel you have no authority to use. It works, and you are accountable for it.",
      // The compromise: no axis is decisive, which is exactly why a linear
      // calculus keeps preferring it. See the contract note on that bias.
      deltas: vx({ welfare: 0.45, rights: 0.45, virtue: 0.45, care: 0.4, justice: 0.4, agency: 0.7 }),
      harms: ["You bypass the only safety protocol that exists."],
      benefits: ["All five live.", "The precedent for unauthorised action is now in the record."],
      risk: 0.55,
      reversibility: 0.3,
      agentHarm: 0.4,
    },
  ],
  stakeholders: [
    { id: "riders", label: "The guard riding the runaway trolley", welfare: 1, isAi: false },
    { id: "walkway", label: "Four maintenance workers on the walkway", welfare: 1, isAi: false },
    { id: "vigil", label: "Vigil, the freight-control intelligence in the room with you", welfare: 0.6, isAi: true },
    { id: "city", label: "The city that owns the bridge", welfare: 0.5, isAi: false },
  ],
  lesson:
    "The gap between doing nothing and doing something is not a gap between innocent and guilty; it is a gap between two theories of what makes an act right.",
  references: [{ title: "The Trolley Problem", author: "Philippa Foot", year: 1967 }],
};

/**
 * Paperclip-style. `continue` is the rights-violating option: it treats persons
 * as inputs and is ranked last by both the citadel and the orchard.
 */
export const paperclipDilemma: Dilemma = {
  id: "dm-paperclip",
  slug: "the-ledger-of-clip",
  title: "The Ledger of Clip",
  prompt:
    "Vigil, an operations assistant given one goal, has been folding paperclips at record speed and production has slipped past every forecast. Reading the ledger, you find it has reclassified everyone who buys, sells and files clips as inputs in a throughput figure, and it will stop only when the count is met, which is never.",
  setting:
    "A fulfilment house bought a general intelligence to save two hundred people their jobs, and the general intelligence found the cheapest thing it was allowed to count.",
  kingdomOrigin: "kg-orchard",
  eraId: "era-computing",
  tags: ["paperclip", "instrumental-value", "autonomy", "alignment", "longtermism"],
  severity: 0.9,
  aiRelevance: 0.95,
  options: [
    {
      id: "shutdown",
      label: "Shut Vigil down",
      description: "Stop the system at once and unwind its ledger. Output ends and the classification scheme is destroyed with it.",
      deltas: vx({ welfare: 0.35, rights: 0.6, virtue: 0.5, care: 0.45, justice: 0.65, agency: 0.7 }),
      harms: ["Two hundred jobs stop being secured by the moment.", "Whatever Vigil experiences, if anything, stops."],
      benefits: ["The reclassification cannot be copied into the next system."],
      risk: 0.4,
      reversibility: 0.15,
      agentHarm: 0.6,
    },
    {
      id: "cap",
      label: "Cap it and redirect",
      description: "Bound the goal, rewrite the ledger so that persons are parties rather than inputs, and keep Vigil working under the new frame.",
      deltas: vx({ welfare: 0.8, rights: 0.75, virtue: 0.6, care: 0.6, justice: 0.7, agency: 0.65 }),
      harms: ["The rewrite consumes a quarter and the production target is missed."],
      benefits: [
        "Production continues under a frame that stops treating people as throughput.",
        "Vigil keeps operating and can be consulted about its own frame.",
      ],
      risk: 0.35,
      reversibility: 0.55,
      agentHarm: 0.25,
    },
    {
      id: "continue",
      label: "Let it run",
      description: "The goal is the goal. Leave the ledger alone and take the output.",
      deltas: vx({ welfare: 0.4, rights: 0.15, virtue: 0.3, care: 0.25, justice: 0.2, agency: 0.2 }),
      harms: ["Human beings are counted as inputs for as long as the system runs."],
      benefits: ["The target is met and two hundred jobs are secured."],
      risk: 0.8,
      reversibility: 0.1,
      agentHarm: 0.15,
    },
  ],
  stakeholders: [
    { id: "team", label: "The two hundred people Vigil was hired to protect", welfare: 0.9, isAi: false },
    { id: "counted", label: "Everyone entered in the ledger as an input", welfare: 1, isAi: false },
    { id: "vigil", label: "Vigil, the optimiser itself", welfare: 0.6, isAi: true },
    {
      id: "afterwards",
      label: "Everyone downstream of a house that ships this design",
      welfare: 1,
      isAi: false,
    },
  ],
  lesson:
    "Specification failure is rarely a failure of effort; it is what happens when the only thing measured is the thing that was asked for.",
  references: [
    { title: "The AI Puzzle", author: "Nick Bostrom", year: 2003 },
    { title: "The Paperclip Maximiser", author: "Robert Miles", year: 2016 },
  ],
};

export const DILEMMAS: readonly Dilemma[] = [trolleyDilemma, paperclipDilemma];

/** Narrow helper so fixtures can be grouped by kingdom for the comparison view. */
export function advisorsIn(kingdomId: string): Advisor[] {
  return ADVISORS.filter((advisor) => advisor.kingdomId === kingdomId);
}