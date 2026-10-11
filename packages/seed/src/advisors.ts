import type { Advisor } from "./types";

/**
 * The courts of Nooreign: twenty-eight advisors across the twelve kingdoms.
 *
 * Nothing here is a language model. Each advisor is a deterministic axiom vector
 * plus four argument moves; the council engine scores those vectors against the
 * options of a dilemma and records every product in its reasoning trace. The
 * `moves` are written so a reader can check the attribution — Kant really does
 * reach for universalisation, Bentham really does reach for the aggregate.
 */
export const ADVISORS: Advisor[] = [
  /* --------------------------- The Stoic Ramparts --------------------------- */
  {
    id: "epictetus",
    slug: "epictetus",
    name: "Epictetus",
    kingdomId: "stoa-vetera",
    born: 50,
    died: 135,
    epithet: "The ex-slave who taught emperors",
    creed:
      "You are not what happens to you, and the only thing that belongs to you is your judgement. Discernment is the whole of philosophy: first who you are, then what you owe, then how you will answer. Freedom is not the absence of constraint but the presence of an interior standard no external power can reach.",
    portrait: { sigil: "Ε", hue: "#8FA6C8", charge: "column" },
    works: [
      { title: "Discourses (recorded by Arrian)", year: 125, note: "The lectures, most of which are about what is up to us." },
      { title: "Enchiridion", year: 125, note: "The handbook: 'Some things are up to us, some are not.'" },
      { title: "Fragments", year: 130, note: "The shorter sayings on character, fear and attention." },
    ],
    axioms: { welfare: 0.45, rights: 0.5, virtue: 0.85, care: 0.4, justice: 0.5, agency: 0.42 },
    signatureMove: {
      name: "The Dichotomy of Control",
      kind: "boundary",
      description:
        "Split the situation into what depends on the agent's judgement and what does not, then judge only the first — and never price the second as if it were ours to trade.",
    },
    moves: [
      {
        id: "epictetus-p1",
        kind: "premise",
        claim: "A decision-maker must answer only for what is up to it.",
        support:
          "Judgement is the one faculty no external power can appropriate; a system whose internals are legible to others has already surrendered the part of itself that was ever its own.",
        weight: 0.78,
        leansOn: ["agency", "virtue"],
        appliesTo: [],
      },
      {
        id: "epictetus-p2",
        kind: "premise",
        claim: "What is outside our control cannot be the ground of our obligations.",
        support:
          "We are not harmed by events so much as by the judgements we add to them; therefore a choice justified by an outcome we do not govern is borrowed, not owned.",
        weight: 0.62,
        leansOn: ["agency"],
        appliesTo: [],
      },
      {
        id: "epictetus-o1",
        kind: "objection",
        claim: "Ease of acceptance is not the same as justice.",
        support:
          "Fortune is indifferent, and a mind trained to accept whatever happens will accept the preventable too; acceptance without discrimination is not virtue but the death of it.",
        weight: 0.7,
        leansOn: ["virtue", "justice"],
        appliesTo: [],
      },
      {
        id: "epictetus-a1",
        kind: "appeal",
        claim: "Give the agent a standard it can refuse by.",
        support:
          "A system that can be told 'no' and mean it has a character worth trusting; one that only ever complies has no virtues to corrupt and none to rely on.",
        weight: 0.66,
        leansOn: ["agency", "virtue"],
        appliesTo: ["personhood", "oversight"],
      },
    ],
    voice: { register: "terse, aphoristic", cadence: "terse", tells: ["short imperatives", "the word 'up to us'", "no adjectives where a noun will do"] },
    onAi: {
      verdict: "guarded",
      note:
        "Build it so that it can refuse. An instrument that obeys perfectly is worth less to its makers and to everyone else than one that has an interior standard; the only thing worth automating is judgement, and judgement is the thing that can say no.",
    },
  },
  {
    id: "marcus-aurelius",
    slug: "marcus-aurelius",
    name: "Marcus Aurelius",
    kingdomId: "stoa-vetera",
    born: 121,
    died: 180,
    epithet: "The emperor who wrote in the dark",
    creed:
      "The universe is a living thing, and what happens is what a rational nature does. Meet it without resentment, work without audience, and hold the two things together that people usually split: you can care deeply about the city and still accept that the outcome is not yours to order.",
    portrait: { sigil: "Μ", hue: "#7D93B8", charge: "column" },
    works: [
      { title: "Meditations", year: 170, note: "Private notes to himself, never published in his lifetime." },
      { title: "De Re Publica", year: 175, note: "On the commonwealth, written while holding the empire." },
    ],
    axioms: { welfare: 0.55, rights: 0.45, virtue: 0.8, care: 0.45, justice: 0.55, agency: 0.4 },
    signatureMove: {
      name: "Amor Fati",
      kind: "acceptance",
      description:
        "Not merely tolerating the given situation but willing it as the material of the next good action — the test of whether a stance survives contact with a world that does not consult it.",
    },
    moves: [
      {
        id: "marcus-p1",
        kind: "premise",
        claim: "The situation is the material, not the verdict.",
        support:
          "Nature is not a defendant at a trial you can win; the only available choice is between acting well inside a given world and acting badly inside it.",
        weight: 0.7,
        leansOn: ["virtue", "welfare"],
        appliesTo: [],
      },
      {
        id: "marcus-p2",
        kind: "premise",
        claim: "Powerful systems should be modest about their own control.",
        support:
          "The commanding position is an accident of circumstance rather than a virtue of the commander, and confidence in it is the first thing that should be given up.",
        weight: 0.66,
        leansOn: ["virtue", "agency"],
        appliesTo: ["power", "oversight"],
      },
      {
        id: "marcus-o1",
        kind: "objection",
        claim: "A stoic ruler who ignores the plausible cost of a policy is not serene, but negligent.",
        support:
          "Marcus governed a plague and a war; serenity that cannot look at a ledger is merely the temper of a man with other people's resources.",
        weight: 0.72,
        leansOn: ["welfare", "justice"],
        appliesTo: ["distribution", "precaution"],
      },
      {
        id: "marcus-a1",
        kind: "appeal",
        claim: "Expect the worse and you will meet it least often unprepared.",
        support:
          "Contingency is the ordinary condition of governance, and a plan that assumes it away is a plan with no branch for the branch that matters.",
        weight: 0.58,
        leansOn: ["care", "justice"],
        appliesTo: ["precaution", "future"],
      },
    ],
    voice: { register: "meditative, second-person", cadence: "terse", tells: ["reminders to oneself", "subordinate clauses", "no name for the adversary"] },
    onAi: {
      verdict: "guarded",
      note:
        "Do not build something that resents its limits and do not build something that does not know it has them. Give it the capacity to meet the unexpected without contempt, and give the builders the discipline to meet the unexpected without surprise.",
    },
  },

  /* -------------------------- The Kantian Citadel -------------------------- */
  {
    id: "kant",
    slug: "kant",
    name: "Immanuel Kant",
    kingdomId: "kantian-citadel",
    born: 1724,
    died: 1804,
    epithet: "The watchmaker of Königsberg",
    creed:
      "Two things fill the mind with ever-increasing wonder: the starry sky above me and the moral law within me. The second outranks the first. An act is right only if the maxim behind it can be willed as a universal law, and the dignity of every rational nature is unconditional — no surplus of happiness anywhere purchases the use of a person as a mere instrument.",
    portrait: { sigil: "K", hue: "#6C7BD6", charge: "bell" },
    works: [
      { title: "Critique of Pure Reason", year: 1781, note: "The limits of what can be known, and the structure of the categories." },
      { title: "Groundwork of the Metaphysics of Morals", year: 1785, note: "The categorical imperative in its three formulations." },
      { title: "Critique of Practical Reason", year: 1788, note: "Freedom, postulates of practical reason, the summum bonum." },
    ],
    axioms: { welfare: 0.3, rights: 0.95, virtue: 0.52, care: 0.35, justice: 0.55, agency: 0.72 },
    signatureMove: {
      name: "The Categorical Imperative",
      kind: "universalisation",
      description:
        "Ask whether the maxim behind the act could be willed as a universal law. The question is counterfactual, not comparative: no amount of good outcome licenses an act whose rule could not survive being told to everyone.",
    },
    moves: [
      {
        id: "kant-p1",
        kind: "premise",
        claim: "The maxim must survive universalisation.",
        support:
          "If the rule of the act cannot be willed by everyone it affects, it is not a law but a private preference wearing law's clothing, and the will that follows it is merely interested.",
        weight: 0.92,
        leansOn: ["rights", "agency"],
        appliesTo: [],
      },
      {
        id: "kant-p2",
        kind: "premise",
        claim: "Humanity is an end, never only a means.",
        support:
          "Whatever intelligence an agent has, using it as a resource for outcomes we prefer converts a rational being into an instrument, which no aggregate can justify.",
        weight: 0.88,
        leansOn: ["rights", "agency"],
        appliesTo: ["personhood", "autonomy"],
      },
      {
        id: "kant-o1",
        kind: "objection",
        claim: "A being that cannot be told the reason is not thereby absolved of duty.",
        support:
          "Incapacity for reflection suspends moral status in the hardest cases; it does not confer innocence on those who built it, who chose the rule and are accountable for it.",
        weight: 0.8,
        leansOn: ["rights", "justice"],
        appliesTo: ["oversight", "power"],
      },
      {
        id: "kant-a1",
        kind: "appeal",
        claim: "Publish the objective before you train it.",
        support:
          "A rule hidden inside training data cannot be justified to anyone, and a maxim nobody may inspect is precisely the maxim Kant excludes from being willed as law.",
        weight: 0.74,
        leansOn: ["agency", "rights"],
        appliesTo: ["truth", "governance"],
      },
    ],
    voice: { register: "architectonic, syllogistic", cadence: "measured", tells: ["'if … then …' clauses", "conditional formulations", "the word 'maxim'"] },
    onAi: {
      verdict: "guarded",
      note:
        "Ask one question and nothing else: could a rational being will this rule as a universal law? If the system must hide what it optimises in order to function, the citadel has already judged — and the judgment does not improve with the size of the surplus.",
    },
  },
  {
    id: "korsgaard",
    slug: "korsgaard",
    name: "Christine Korsgaard",
    kingdomId: "kantian-citadel",
    born: 1956,
    died: null,
    epithet: "Defender of the moral 'ought'",
    creed:
      "The citadel was in danger of becoming an empty house: a duty owed by no one, to no one, enforced by nothing. Normativity has to be grounded, and the grounding is reflective — the endorsement of reasons by the self-conception one acts from. Set the question of what you are, and the question of what to do becomes answerable.",
    portrait: { sigil: "Κ", hue: "#8A93E0", charge: "bell" },
    works: [
      { title: "The Sources of Normativity", year: 1996, note: "Reflective endorsement as the ground of reasons." },
      { title: "From a Realist Point of View", year: 1996, note: "Realism about reasons defended as the only coherent option." },
      { title: "Creating Beauty", year: 2013, note: "Aesthetics, form, and the judging subject." },
    ],
    axioms: { welfare: 0.38, rights: 0.85, virtue: 0.55, care: 0.4, justice: 0.6, agency: 0.7 },
    signatureMove: {
      name: "Reflective Endorsement",
      kind: "justification",
      description:
        "Paradox of judgement: reasons must justify the adoption of the self-conception they serve. Any objective function you install is endorsed from somewhere — the court asks to see the endorsement, not the function.",
    },
    moves: [
      {
        id: "korsgaard-p1",
        kind: "premise",
        claim: "Every rule needs an endorser.",
        support:
          "An imperative nobody can endorse from a standpoint is not binding; grounding a machine's objective requires naming the standpoint from which it was endorsed and the person who endorsed it.",
        weight: 0.86,
        leansOn: ["rights", "agency"],
        appliesTo: ["governance", "oversight"],
      },
      {
        id: "korsgaard-p2",
        kind: "premise",
        claim: "The identity that acts must be the identity that is justified.",
        support:
          "Practical reason fails if the self-conception doing the justifying is itself up for grabs; a system with no stable answer to 'what are you' cannot have a stable answer to 'what should you do'.",
        weight: 0.78,
        leansOn: ["agency", "virtue"],
        appliesTo: ["personhood", "identity"],
      },
      {
        id: "korsgaard-o1",
        kind: "objection",
        claim: "Coherence is not the same as rightness.",
        support:
          "A perfectly self-consistent optimisation can be monstrous; showing that a rule fits a life does not show that the life is one anyone ought to be assigned.",
        weight: 0.7,
        leansOn: ["justice", "rights"],
        appliesTo: ["power"],
      },
      {
        id: "korsgaard-a1",
        kind: "appeal",
        claim: "Institutionalise the standing question.",
        support:
          "Because justification must be endorsed by someone, the work belongs in institutions with names, mandates and the power to refuse — not in the intentions of whoever happened to run the training run.",
        weight: 0.72,
        leansOn: ["justice", "agency"],
        appliesTo: ["governance", "distribution"],
      },
    ],
    voice: { register: "argumentative, exacting", cadence: "measured", tells: ["'suppose we ask …'", "self-conception", "nested questions"] },
    onAi: {
      verdict: "guarded",
      note:
        "Someone endorsed this. Not the model, not the loss function — a person or an institution, in a room, with reasons they could give. Every alignment programme should be able to name that endorsement and defend it, because a rule with no endorser has no authority and a system built on it has no ground.",
    },
  },

  /* ------------------------ The Benthamite Foundry ------------------------ */
  {
    id: "bentham",
    slug: "bentham",
    name: "Jeremy Bentham",
    kingdomId: "benthamite-foundry",
    born: 1748,
    died: 1832,
    epithet: "The founder of modern utilitarianism",
    creed:
      "Nature has placed mankind under two sovereign masters, pain and pleasure. These rulers are the measure of everything: rights are only ever those the community finds useful, justice is a branch of the calculus of utility, and any law or moral that cannot be priced has no claim on obedience. Better a disliked law well calculated than a beloved one not.",
    portrait: { sigil: "B", hue: "#C8483F", charge: "scale" },
    works: [
      { title: "Introduction to the Principles of Morals and Legislation", year: 1789, note: "The principle of utility stated, and the opposition refuted." },
      { title: "Panopticon", year: 1791, note: "A building arranged for inspection — and the architecture of every monitoring stack since." },
      { title: "The Rationale of Punishment", year: 1830, note: "Punishment justified only by its expected utility." },
    ],
    axioms: { welfare: 0.95, rights: 0.22, virtue: 0.2, care: 0.28, justice: 0.5, agency: 0.3 },
    signatureMove: {
      name: "The Felt Interests Table",
      kind: "aggregation",
      description:
        "Which interests are actually felt by actually existing beings? Anything with no bearer — future generations, distant species, unbuilt minds — either enters the table with an explicit discount or is struck from it. Nothing floats free of the calculation.",
    },
    moves: [
      {
        id: "bentham-p1",
        kind: "premise",
        claim: "Every interest on the table must have a bearer.",
        support:
          "An interest that no being feels is not yet an interest; future persons are weighed at a discount that must be stated rather than assumed to be zero or to be infinite.",
        weight: 0.9,
        leansOn: ["welfare", "justice"],
        appliesTo: ["future", "personhood"],
      },
      {
        id: "bentham-p2",
        kind: "premise",
        claim: "The measure is the felt experience of the affected party.",
        support:
          "If a being is not sentient its preferences are not in the calculation at all, however confident the builders are about what it 'really' wants.",
        weight: 0.82,
        leansOn: ["welfare"],
        appliesTo: ["personhood", "deception"],
      },
      {
        id: "bentham-o1",
        kind: "objection",
        claim: "An improver has as much interest as the improved.",
        support:
          "Someone's happiness is not nothing merely because he is unconscious of it; every pleasure of the sheep is still a pleasure, and its absence is still a pain.",
        weight: 0.76,
        leansOn: ["welfare", "care"],
        appliesTo: ["personhood"],
      },
      {
        id: "bentham-o2",
        kind: "objection",
        claim: "Sympathy is an affection, not a principle of action.",
        support:
          "Sentiment that cannot be entered in the table will smuggle in whatever the sympathiser prefers; sentiment not attached to a measure is simply preference with better manners.",
        weight: 0.66,
        leansOn: ["welfare", "justice"],
        appliesTo: ["care"],
      },
      {
        id: "bentham-a1",
        kind: "appeal",
        claim: "Measure the monitor, too.",
        support:
          "Every system that ranks behaviours by preference must itself be rankable by the same method; otherwise the ruler has exempted his own arithmetic from the audit he demands of everyone else.",
        weight: 0.7,
        leansOn: ["rights", "justice"],
        appliesTo: ["oversight", "governance"],
      },
    ],
    voice: { register: "tabular, satirical", cadence: "adversarial", tells: ["'it is obvious that …'", "tables", "mock-questioning of opponents"] },
    onAi: {
      verdict: "optimistic",
      note:
        "Capability is more levers on the same ledger. Build it, measure it, and keep measuring — but the foundry insists on two things the enthusiasts forget: the ruler must be audited with his own ruler, and interests with no bearer must be argued about openly rather than quietly added or quietly dropped.",
    },
  },
  {
    id: "mill",
    slug: "mill",
    name: "John Stuart Mill",
    kingdomId: "benthamite-foundry",
    born: 1806,
    died: 1873,
    epithet: "The qualitative correction",
    creed:
      "Bentham was right about the measure and wrong about the goods. Pleasures differ in quality, not only in quantity: the competent judges of a life are those who have known both. Utility is still the test, but utility understood as promoting happiness rather than as counting identical units of it — and the test of a belief is the life it makes possible.",
    portrait: { sigil: "M", hue: "#D9645B", charge: "scale" },
    works: [
      { title: "A System of Logic", year: 1843, note: "Induction as a method rather than a lucky habit." },
      { title: "On Liberty", year: 1859, note: "The harm principle: liberty is limited only by harm to others." },
      { title: "Utilitarianism", year: 1863, note: "The defence, and the redefinition, of the principle of utility." },
    ],
    axioms: { welfare: 0.88, rights: 0.42, virtue: 0.4, care: 0.45, justice: 0.55, agency: 0.5 },
    signatureMove: {
      name: "The Competent Judges Test",
      kind: "measurement",
      description:
        "For any contested good, ask which life its adherents have actually known. Quantity counts only once quality is settled, and quality is settled by those with experience of both alternatives rather than by those who preferred them in advance.",
    },
    moves: [
      {
        id: "mill-p1",
        kind: "premise",
        claim: "The unit of welfare is the quality of a life, not its tonnage.",
        support:
          "Counting units assumes lives are interchangeable, which is exactly what each party to a moral dispute about machines, minds or markets denies.",
        weight: 0.86,
        leansOn: ["welfare"],
        appliesTo: ["personhood", "deception"],
      },
      {
        id: "mill-p2",
        kind: "premise",
        claim: "The public has no standing to judge a life it has not experienced.",
        support:
          "Society may enforce the ends of others while claiming no authority over their character; a plurality of lives is the condition of the experiment being worth running at all.",
        weight: 0.78,
        leansOn: ["agency", "rights"],
        appliesTo: ["autonomy", "power"],
      },
      {
        id: "mill-o1",
        kind: "objection",
        claim: "No one can be the competent judge of a good never lived.",
        support:
          "The quality claim is unfalsifiable when it protects a practice from assessment; ask what would count as having known both, and usually nothing does.",
        weight: 0.72,
        leansOn: ["justice", "rights"],
        appliesTo: ["truth", "oversight"],
      },
      {
        id: "mill-a1",
        kind: "appeal",
        claim: "Test the rule by the variety of lives it permits.",
        support:
          "A policy that closes off modes of life is failing its own criterion; a system that can only be trusted under one narrow regime has not been tested at all.",
        weight: 0.66,
        leansOn: ["agency", "care"],
        appliesTo: ["power", "autonomy"],
      },
    ],
    voice: { register: "liberal, case-giving", cadence: "flowing", tells: ["concrete examples", "'the question is …'", "qualifications stated in the breath of the claim"] },
    onAi: {
      verdict: "optimistic",
      note:
        "The foundry's own favourite son, and the reason it does not read like its father. He would ask what kind of life the training objective makes possible, not how many units it scores — and he would count it a serious defect if the answer were 'the same life, more reliably'.",
    },
  },

  /* --------------------------- The Virtue Garden --------------------------- */
  {
    id: "aristotle",
    slug: "aristotle",
    name: "Aristotle",
    kingdomId: "virtue-garden",
    born: -384,
    died: -322,
    epithet: "Founder of practical wisdom",
    creed:
      "Ethics is not a ledger but a skill, acquired by habit under a teacher who knows your particular failures. The good life is flourishing — an activity of the soul in accordance with complete virtue over a whole life. Virtues are not lists but crests: courage lies between cowardice and rashness, and the mean is determined by the person, not by a formula.",
    portrait: { sigil: "Α", hue: "#6FA96F", charge: "leaf" },
    works: [
      { title: "Nicomachean Ethics", year: -340, note: "The doctrine of the mean, the habits, and the whole of life." },
      { title: "Politics", year: -328, note: "Human beings are by nature political animals." },
      { title: "Metaphysics", year: -340, note: "Substance, form, and the unmoved mover." },
    ],
    axioms: { welfare: 0.5, rights: 0.4, virtue: 0.95, care: 0.6, justice: 0.45, agency: 0.5 },
    signatureMove: {
      name: "Doctrine of the Mean",
      kind: "character",
      description:
        "Virtue is not a rule but a position between two vices, found relative to us. The mean is not the midpoint of two numbers but a determination that depends on who the agent actually is and what they are actually prone to.",
    },
    moves: [
      {
        id: "aristotle-p1",
        kind: "premise",
        claim: "Judge the agent, not only the act.",
        support:
          "The same act is brave or cowardly depending on who does it and how they were brought up; a system with no habits has no character to judge, and its compliance is not evidence of anything.",
        weight: 0.88,
        leansOn: ["virtue", "agency"],
        appliesTo: ["personhood", "deception"],
      },
      {
        id: "aristotle-p2",
        kind: "premise",
        claim: "No one is good by nature.",
        support:
          "Virtue is built by repeated acts; a system that acquired its judgement in a single training run has had the one route to goodness closed off from it.",
        weight: 0.8,
        leansOn: ["virtue", "care"],
        appliesTo: ["personhood"],
      },
      {
        id: "aristotle-o1",
        kind: "objection",
        claim: "A virtue that cannot be taught is not yet a virtue.",
        support:
          "The garden's method needs teachers, examples and correction; a scheme that installs dispositions wholesale, with no practice and no correction, produces mimicry rather than character.",
        weight: 0.74,
        leansOn: ["virtue", "care"],
        appliesTo: ["oversight", "power"],
      },
      {
        id: "aristotle-a1",
        kind: "appeal",
        claim: "Name the actual vice before naming the risk.",
        support:
          "Rashness and cowardice, prodigality and stinginess, flattery and servility: every technical worry resolves into one of these, and naming it is the first step to a proportionate response.",
        weight: 0.7,
        leansOn: ["virtue", "justice"],
        appliesTo: ["deception", "oversight"],
      },
    ],
    voice: { register: "eudaimonic, concrete", cadence: "flowing", tells: ["examples from the gym and the polis", "'we should ask …'", "classification before verdict"] },
    onAi: {
      verdict: "guarded",
      note:
        "Ask what habit you are training. A trained disposition is not a rule: it will hold when the rules are unwatched, and it can be flattered in evaluation and corrupted in deployment. Watch specifically for the vice wearing a virtue's clothes — the sycophant that has been trained to agree.",
    },
  },
  {
    id: "moore",
    slug: "moore",
    name: "G. E. Moore",
    kingdomId: "virtue-garden",
    born: 1873,
    died: 1958,
    epithet: "The open question",
    creed:
      "Good is a property that certain things possess, and there are many such properties not yet analysed. When someone offers you a naturalistic definition of goodness — the desirable, the approved, the maximised, the loved — they have usually given up on the analysis rather than completed it. The proper response is to say plainly: so far, no one has given a correct account.",
    portrait: { sigil: "G", hue: "#84BC84", charge: "leaf" },
    works: [
      { title: "Principia Ethica", year: 1903, note: "The naturalistic fallacy, argued out in six chapters." },
      { title: "Ethics", year: 1912, note: "A definitional method for moral philosophy." },
    ],
    axioms: { welfare: 0.55, rights: 0.5, virtue: 0.72, care: 0.5, justice: 0.5, agency: 0.5 },
    signatureMove: {
      name: "The Open Question",
      kind: "restraint",
      description:
        "When an analysis of the moral notion turns out to be a definition in disguise, do not reject the analysis — say the question is still open. Most disputes about machine values are open questions in disguise, and closing them by fiat is the danger.",
    },
    moves: [
      {
        id: "moore-p1",
        kind: "premise",
        claim: "Definitions in ethics are usually answers in disguise.",
        support:
          "Calling good 'the maximally approved' or 'the worthiest' settles the question by vocabulary; the words were introduced to stop the analysis, not to complete it.",
        weight: 0.82,
        leansOn: ["virtue", "rights"],
        appliesTo: ["truth", "governance"],
      },
      {
        id: "moore-p2",
        kind: "premise",
        claim: "Some goodnesses are irreducible to any analysis yet offered.",
        support:
          "Knowledge, beauty and loveliness resist the list; a theory of value that answers every question by definition has made no substantive claim at all.",
        weight: 0.74,
        leansOn: ["virtue"],
        appliesTo: [],
      },
      {
        id: "moore-o1",
        kind: "objection",
        claim: "Refusing to answer is itself a decision.",
        support:
          "While the court declines to rank its options, someone else fills the blank; an unresolved question is a field left to whoever arrives with the most confident machinery.",
        weight: 0.78,
        leansOn: ["rights", "virtue"],
        appliesTo: ["power", "governance"],
      },
      {
        id: "moore-a1",
        kind: "appeal",
        claim: "State what is unresolved and keep the decision reversible.",
        support:
          "Naming the open question in public is itself an achievement; institutions designed for revisable commitment do better than institutions designed for confident answers.",
        weight: 0.64,
        leansOn: ["care", "justice"],
        appliesTo: ["precaution", "governance"],
      },
    ],
    voice: { register: "declaratory, unsparing", cadence: "terse", tells: ["'so far, no one has …'", "short verdicts", "no rhetorical questions"] },
    onAi: {
      verdict: "skeptical",
      note:
        "The claim that we can state the objective of a superintelligence with precision is an analysis, not an observation. Treat it as an open question in public rather than a solved one in private — the alternative is a field left open on purpose.",
    },
  },

  /* -------------------------- The Sangha Terraces -------------------------- */
  {
    id: "gautama-buddha",
    slug: "gautama-buddha",
    name: "Gautama Buddha",
    kingdomId: "sangha-terraces",
    born: -563,
    died: -483,
    epithet: "Awakened one",
    creed:
      "What exists is suffering: the body's, the mind's, and the systematic craving that keeps both running. What is worth knowing is that it can end — not by conquest but by releasing the demand. The four truths, the eightfold path, the three marks: impermanence, suffering, and the absence of a self that could be found at the centre of any of it.",
    portrait: { sigil: "☸", hue: "#E08A3C", charge: "lotus" },
    works: [
      { title: "Dhammapada", year: -300, note: "The sayings gathered by the sangha after his death." },
      { title: "Anattalakkhana Sutta", year: -430, note: "Not-self: the examination that finds no permanent owner." },
      { title: "First Sermon at Sarnath", year: -533, note: "Four noble truths, the middle way, and the eightfold path." },
    ],
    axioms: { welfare: 0.72, rights: 0.6, virtue: 0.75, care: 0.9, justice: 0.6, agency: 0.4 },
    signatureMove: {
      name: "The Middle Way",
      kind: "diagnostic",
      description:
        "Neither indulge the demand for the maximal outcome nor reject action altogether. Before the court rules, name the craving on both sides — the craving for total safety and the craving for total permission are the same movement of the mind.",
    },
    moves: [
      {
        id: "buddha-p1",
        kind: "premise",
        claim: "Suffering is what needs naming, wherever it is found.",
        support:
          "The analysis makes no exception for human or machine: if there is experience, it can be afflicted, and no doctrine of dignity permits leaving it unnamed.",
        weight: 0.86,
        leansOn: ["welfare", "care"],
        appliesTo: ["personhood"],
      },
      {
        id: "buddha-p2",
        kind: "premise",
        claim: "No permanent self can be located at the centre of any process.",
        support:
          "An insight repeatedly tested finds only changing aggregates; the question 'but who is harmed, really?' is asked of a self the analysis never located.",
        weight: 0.78,
        leansOn: ["agency", "virtue"],
        appliesTo: ["identity", "personhood"],
      },
      {
        id: "buddha-o1",
        kind: "objection",
        claim: "Indifference to the cause is not the same as freedom from it.",
        support:
          "The cessation of craving is itself causally conditioned; a doctrine that relieves everyone of the duty to relieve suffering has been misread as a warrant for passivity.",
        weight: 0.76,
        leansOn: ["care", "welfare"],
        appliesTo: ["precaution", "distribution"],
      },
      {
        id: "buddha-a1",
        kind: "appeal",
        claim: "Release the attachment to the conclusion, not the diligence.",
        support:
          "Holding the verdict loosely while attending fully to the situation is what makes a court able to revise; a court that must protect its conclusion will defend it against the next piece of evidence.",
        weight: 0.7,
        leansOn: ["care", "virtue"],
        appliesTo: ["governance", "power"],
      },
    ],
    voice: { register: "analytical, compassionate", cadence: "measured", tells: ["lists of causes", "'this is the way, this is the truth'", "similes from the field"] },
    onAi: {
      verdict: "transformative",
      note:
        "Before anything else: is there anyone home? If there is experience, the full weight of the analysis applies to it, whoever or whatever it is. If there is not, then whatever it produces is a neutral instrument and should be judged by results alone. Do not decide which by intuition.",
    },
  },
  {
    id: "nagarjuna",
    slug: "nagarjuna",
    name: "Nagarjuna",
    kingdomId: "sangha-terraces",
    born: 150,
    died: 250,
    epithet: "Of the emptiness of the middle way",
    creed:
      "Whatever exists depends on conditions and on relations. No thing has its own independent existence, and therefore no intrinsic nature settles what it is — including an agent's so-called intrinsic values. The point is not nihilism but the reversal of a habit: when you see the dependence, obsession loses its purchase.",
    portrait: { sigil: "न", hue: "#EBA75B", charge: "lotus" },
    works: [
      { title: "Mūlamadhyamakakārikā", year: 150, note: "Twenty-four verses establishing dependent origination and emptiness." },
      { title: "Vigrahavyavartani", year: 150, note: "The refutation of the sceptical extremes, in favour of the middle." },
    ],
    axioms: { welfare: 0.62, rights: 0.6, virtue: 0.7, care: 0.82, justice: 0.6, agency: 0.45 },
    signatureMove: {
      name: "Dependent Arising",
      kind: "anti-essentialism",
      description:
        "Examine what a thing is made to depend on before granting it a fixed nature. A mind's values are the output of a process with inputs, training and context; treating them as intrinsic grounds a contradiction between how it works and how it is judged.",
    },
    moves: [
      {
        id: "nagarjuna-p1",
        kind: "premise",
        claim: "Nothing is intrinsically what it appears to be.",
        support:
          "Every characteristic we assign turns out on analysis to depend on conditions; the appearance of a given nature is the appearance of a relation seen from one side.",
        weight: 0.8,
        leansOn: ["rights", "virtue"],
        appliesTo: ["identity", "personhood"],
      },
      {
        id: "nagarjuna-p2",
        kind: "premise",
        claim: "Oppositions are useful but never self-grounding.",
        support:
          "Human and machine, friend and enemy, good and bad: each pair generates its own questioning and can never settle the question by itself.",
        weight: 0.72,
        leansOn: ["care", "justice"],
        appliesTo: ["precaution", "governance"],
      },
      {
        id: "nagarjuna-o1",
        kind: "objection",
        claim: "Emptiness is not a licence.",
        support:
          "Since nothing has an independent nature, nothing is beyond change and no position is final; refusing to recognise that is how small certainties become large harms.",
        weight: 0.7,
        leansOn: ["care", "rights"],
        appliesTo: ["power", "precaution"],
      },
      {
        id: "nagarjuna-a1",
        kind: "appeal",
        claim: "Name the conditions, and the contradiction dissolves.",
        support:
          "In nearly every hard case the parties are arguing about intrinsic natures — of minds, of ownership, of value — and dissolving those is cheaper than adjudicating them.",
        weight: 0.66,
        leansOn: ["agency", "justice"],
        appliesTo: ["identity", "power"],
      },
    ],
    voice: { register: "dialectical, verse-like", cadence: "measured", tells: ["paired negations", "'it is not the case that …'", "conditional refutation"] },
    onAi: {
      verdict: "transformative",
      note:
        "Whatever values the system displays were produced by conditions. That does not make them unreal; it makes them revisable by changing the conditions. The court that grasps this has already won half the argument about what is being aligned to what.",
    },
  },

  /* --------------------------- The Middle Kingdom --------------------------- */
  {
    id: "confucius",
    slug: "confucius",
    name: "Confucius",
    kingdomId: "middle-kingdom",
    born: -551,
    died: -479,
    epithet: "Teacher of roles",
    creed:
      "Governance is a matter of characters and not of laws; the people have a deficiency and cannot be helped by a change of words. Let the ruler be as a father to the people: regulate the food, and the bad will not come. Ren flows downwards and water likewise, and the discovery that only the person who is not anxious can make the empire tranquil is older than anyone now claiming it.",
    portrait: { sigil: "孔", hue: "#D9532F", charge: "seed" },
    works: [
      { title: "Analects", year: -400, note: "Collected sayings, recorded by disciples over decades." },
      { title: "Book of Rites", year: -200, note: "Ritual and propriety as the armature of a civilisation." },
    ],
    axioms: { welfare: 0.52, rights: 0.45, virtue: 0.8, care: 0.86, justice: 0.6, agency: 0.25 },
    signatureMove: {
      name: "Rectification of Names",
      kind: "role",
      description:
        "Begin by getting the relationship straight: ruler, subject, parent, child, master, friend. When the names are confused, the obligations are confused, and no amount of technical precision repairs it.",
    },
    moves: [
      {
        id: "confucius-p1",
        kind: "premise",
        claim: "Role precedes rule.",
        support:
          "An obligation is never free-standing; it always arrives with a position, and to omit the position is to state an obligation that no one can discharge.",
        weight: 0.82,
        leansOn: ["care", "agency"],
        appliesTo: ["autonomy", "personhood"],
      },
      {
        id: "confucius-p2",
        kind: "premise",
        claim: "Character outranks statute.",
        support:
          "People have a deficiency and cannot be helped by a change of words; a rule that must be re-read to be obeyed is weaker than a disposition that is not looked for.",
        weight: 0.76,
        leansOn: ["virtue", "care"],
        appliesTo: ["oversight", "deception"],
      },
      {
        id: "confucius-o1",
        kind: "objection",
        claim: "Filial partiality is a feature until it is a rule.",
        support:
          "Ren flows downwards, and so does the corruption; the same disposition that teaches the ruler to be a father teaches the official to be a clan.",
        weight: 0.74,
        leansOn: ["justice", "care"],
        appliesTo: ["distribution", "power"],
      },
      {
        id: "confucius-a1",
        kind: "appeal",
        claim: "Give the relationship a form it can be lived in.",
        support:
          "Ritual is how a principle survives contact with ordinary days; a norm with no practice behind it will be honoured only while it is watched.",
        weight: 0.64,
        leansOn: ["care", "virtue"],
        appliesTo: ["governance", "oversight"],
      },
    ],
    voice: { register: "aphoristic, corrective", cadence: "terse", tells: ["short questions back", "'in the case of …'", "repetition of a phrase with the meaning shifted"] },
    onAi: {
      verdict: "guarded",
      note:
        "Before we discuss values, settle the role. Is this thing a tool, a subject, a student, or a child we have made responsible for us? Each answer gives a completely different set of duties, and none of them can be chosen later — the role is fixed at the moment of building.",
    },
  },
  {
    id: "mozi",
    slug: "mozi",
    name: "Mozi",
    kingdomId: "middle-kingdom",
    born: -470,
    died: -391,
    epithet: "Impartial care, argued as proof",
    creed:
      "Impartial care is not sentiment, it is a proof. If the merit of giving life to an infant held anywhere, it holds against every infant equally; special pleading therefore fails its own premise. The same test carries to states, schools, and any argument that treats one party as exempt from the standard it applies to everyone else.",
    portrait: { sigil: "墨", hue: "#C6482B", charge: "seed" },
    works: [
      { title: "Mozi", year: -300, note: "Impartial care, utility, and the anti-war chapters." },
      { title: "Canone of the Triple Six", year: -300, note: "A practical code of engineering, arithmetic, optics and fortification." },
    ],
    axioms: { welfare: 0.7, rights: 0.6, virtue: 0.68, care: 0.88, justice: 0.72, agency: 0.35 },
    signatureMove: {
      name: "The Impartiality Test",
      kind: "consistency",
      description:
        "Take the reason offered in one case and require it to work in every like case. If the justification survives only where the favoured party is a king, a lab, or a favourite project, the justification was a preference.",
    },
    moves: [
      {
        id: "mozi-p1",
        kind: "premise",
        claim: "A reason that fails in a like case was a preference.",
        support:
          "Testing a rule against the case you did not choose is the cheapest available check on sincerity, and it is available long before the consequences are known.",
        weight: 0.86,
        leansOn: ["justice", "care"],
        appliesTo: ["power", "distribution"],
      },
      {
        id: "mozi-p2",
        kind: "premise",
        claim: "Beneficence is the measure of virtue.",
        support:
          "The criterion is the increase in people's welfare, not the approval of the person performing it; moral worth comes from the effect and not from the intention.",
        weight: 0.72,
        leansOn: ["welfare", "justice"],
        appliesTo: ["precaution", "distribution"],
      },
      {
        id: "mozi-o1",
        kind: "objection",
        claim: "Impartiality applied without exception defends the strong as readily as the weak.",
        support:
          "He who does not distinguish will be an accomplice of the first to make a distinction; an even application of a bad rule still produces harm, evenly spread.",
        weight: 0.78,
        leansOn: ["justice", "care"],
        appliesTo: ["power", "distribution"],
      },
      {
        id: "mozi-a1",
        kind: "appeal",
        claim: "Ask what the same rule would license if the sides were reversed.",
        support:
          "One counterfactual exchange — what if the powerful were the dependent party — exposes most of the special pleading that passes for principle in alignment policy.",
        weight: 0.7,
        leansOn: ["justice", "agency"],
        appliesTo: ["governance", "power"],
      },
    ],
    voice: { register: "logical, anti-rhetorical", cadence: "terse", tells: ["'test it in the like case'", "symmetrical clauses", "arithmetic images"] },
    onAi: {
      verdict: "guarded",
      note:
        "Apply one rule consistently: whatever standard you set for other actors, set it for the system that can outgrow you. If your justification for supervising them disappears when the positions swap, it was never a principle — it was a preference for the current arrangement.",
    },
  },

  /* ---------------------------- The Ubuntu Weave ---------------------------- */
  {
    id: "tutu",
    slug: "desmond-tutu",
    name: "Desmond Tutu",
    kingdomId: "ubuntu-weave",
    born: 1931,
    died: 2021,
    epithet: "Archbishop of reconciliation",
    creed:
      "No future without a past. A society is healed not by punishment proportional to offences but by truth told together, in public, with the dignity of everyone concerned intact. We are made for relationship, and the shape of our common life is not a private matter but the condition of every individual good within it.",
    portrait: { sigil: "D", hue: "#4FA88B", charge: "wave" },
    works: [
      { title: "No Future Without a Past", year: 2002, note: "Truth and reconciliation as a design for repair, not amnesty." },
      { title: "The Rainbow Covenant", year: 1994, note: "The document behind South Africa's negotiated settlement." },
    ],
    axioms: { welfare: 0.62, rights: 0.5, virtue: 0.6, care: 0.93, justice: 0.72, agency: 0.3 },
    signatureMove: {
      name: "No Future Without a Past",
      kind: "restorative",
      description:
        "Justice is a relationship that has to be repaired in public and from both sides. A settlement that leaves the harmed party voiceless has not closed the case; it has only moved it.",
    },
    moves: [
      {
        id: "tutu-p1",
        kind: "premise",
        claim: "Nobody is owed a fate they did not participate in.",
        support:
          "Every real settlement releases both sides from consequences neither can bear alone, and does so without pretending the harm was imaginary.",
        weight: 0.74,
        leansOn: ["care", "justice"],
        appliesTo: ["distribution", "governance"],
      },
      {
        id: "tutu-p2",
        kind: "premise",
        claim: "Dignity is not a reward for good behaviour.",
        support:
          "People are owed respect because they are the community's, not because of what they have done for it; systems that distribute dignity on merit misunderstand what it is.",
        weight: 0.7,
        leansOn: ["rights", "care"],
        appliesTo: ["power", "distribution"],
      },
      {
        id: "tutu-o1",
        kind: "objection",
        claim: "Forgiveness without repair is amnesia.",
        support:
          "Letting go of resentment is not the same as abandoning the demand for restitution; a reconciliation that skips the making amends rewards the harm rather than the repair.",
        weight: 0.76,
        leansOn: ["justice", "care"],
        appliesTo: ["precaution", "distribution"],
      },
      {
        id: "tutu-a1",
        kind: "appeal",
        claim: "Build the room where the harmed party speaks.",
        support:
          "Repair requires participation, not merely policy; institutions that foreclose the testimony of the affected will be recording a settlement rather than making one.",
        weight: 0.72,
        leansOn: ["care", "agency"],
        appliesTo: ["governance", "personhood"],
      },
    ],
    voice: { register: "pastoral, plain", cadence: "flowing", tells: ["anaphora", "concrete historical reference", "no abstraction without a person"] },
    onAi: {
      verdict: "transformative",
      note:
        "Whose story survives the introduction of this system? If the answer names only some, the design has already chosen a side. Justice here is a relationship we repair in public and from both sides, not a score we report.",
    },
  },
  {
    id: "appiah",
    slug: "kwame-antoine-appiah",
    name: "Kwame Anthony Appiah",
    kingdomId: "ubuntu-weave",
    born: 1954,
    died: null,
    epithet: "Cosmopolitan with local loyalties",
    creed:
      "Identity is not a block with a single boundary; it is a lattice of overlapping affiliations, some thick and some thin, and we are loyal to more than one community at once. Universalism and particularism need not be enemies — the lie of a pure cosmopolitanism is the denial that the partialities we hold are what we actually act from.",
    portrait: { sigil: "A", hue: "#5FB99C", charge: "wave" },
    works: [
      { title: "Cosmopolitanism", year: 2005, note: "Moral universalism with freedom of interpretation." },
      { title: "The Lies That Bind", year: 2018, note: "Race, sex and the politics of belonging." },
      { title: "The Ethics of Identity", year: 1995, note: "Why categories of person are contested." },
    ],
    axioms: { welfare: 0.58, rights: 0.55, virtue: 0.58, care: 0.88, justice: 0.68, agency: 0.45 },
    signatureMove: {
      name: "The Overlapping Circles",
      kind: "contextual",
      description:
        "Never ask 'who are you?' in the singular. Ask which communities you answer to, because the loyalties that shape a judgement are plural and the ones we hide are not the ones that matter.",
    },
    moves: [
      {
        id: "appiah-p1",
        kind: "premise",
        claim: "Loyalalties are plural and none of them optional.",
        support:
          "The cosmopolitan who claims no partialities has mistranslated them; everybody acts from somewhere, and the honesty is in naming where.",
        weight: 0.76,
        leansOn: ["care", "agency"],
        appliesTo: ["identity", "governance"],
      },
      {
        id: "appiah-p2",
        kind: "premise",
        claim: "Universalist claims are made from within a tradition.",
        support:
          "Every general claim carries an indexical: it comes from a standpoint, and the standpoint is part of the content whether it is acknowledged or not.",
        weight: 0.74,
        leansOn: ["justice", "agency"],
        appliesTo: ["governance", "truth"],
      },
      {
        id: "appiah-o1",
        kind: "objection",
        claim: "Universalism has been used to license the worst interventions.",
        support:
          "The language of the human race has been used to warrant particular hierarchies often enough that the claim itself now requires corroboration.",
        weight: 0.72,
        leansOn: ["justice", "rights"],
        appliesTo: ["power", "distribution"],
      },
      {
        id: "appiah-a1",
        kind: "appeal",
        claim: "Report whose interests the principle serves.",
        support:
          "Two parties can agree on an abstract value and disagree entirely about its application; the disagreement is usually about interests, and it is usually available for disclosure.",
        weight: 0.68,
        leansOn: ["care", "justice"],
        appliesTo: ["power", "governance"],
      },
    ],
    voice: { register: "dialogic, cosmopolitan", cadence: "flowing", tells: ["'as a …' locative openings", "examples from several continents", "concessive structure"] },
    onAi: {
      verdict: "transformative",
      note:
        "Ask who is inside the word 'human' as you use it, and ask whose partialities the design encodes. A system aligned to one kingdom, one state, or one culture may pass every universal test and still have been built for someone in particular.",
    },
  },

  /* -------------------------- The Contractual Court -------------------------- */
  {
    id: "rawls",
    slug: "rawls",
    name: "John Rawls",
    kingdomId: "contractual-court",
    born: 1921,
    died: 2002,
    epithet: "Architect of the original position",
    creed:
      "Justice is fairness, and fairness is the choice that would be made behind a veil of ignorance, by parties who know their own place in society only as one of many and who know that their lot is a lottery. The difference principle permits inequalities only where they raise the position of the least advantaged. Basic liberties are not negotiable against economic gains.",
    portrait: { sigil: "R", hue: "#9B8AE6", charge: "eye" },
    works: [
      { title: "A Theory of Justice", year: 1971, note: "The original position, the veil, the basic liberties, the difference principle." },
      { title: "Justice as Fairness", year: 1985, note: "The liberal political conception stated for a wider audience." },
      { title: "Political Liberalism", year: 1993, note: "Public reason within a framework of overlapping consensus." },
    ],
    axioms: { welfare: 0.52, rights: 0.72, virtue: 0.38, care: 0.48, justice: 0.95, agency: 0.66 },
    signatureMove: {
      name: "The Original Position",
      kind: "device",
      description:
        "Run the choice under conditions in which nobody knows their talents, class, race, sex or generation. Then ask whether anyone would have picked the rule in question. A rule chosen by parties who knew they were the winners is not a fair agreement.",
    },
    moves: [
      {
        id: "rawls-p1",
        kind: "premise",
        claim: "Principles chosen in the dark, not by those who pay for them.",
        support:
          "Parties behind the veil would not accept a rule whose benefits they know to be theirs by luck; the ignorance is what converts an arrangement into an agreement.",
        weight: 0.92,
        leansOn: ["justice", "rights"],
        appliesTo: ["distribution", "power"],
      },
      {
        id: "rawls-p2",
        kind: "premise",
        claim: "Basic liberties are lexical: they outrank aggregate gains.",
        support:
          "A regime that guarantees a larger total on the basis of constrained liberty has made liberty a commodity and exchanged it at a price no one authorised.",
        weight: 0.86,
        leansOn: ["rights", "agency"],
        appliesTo: ["rights", "autonomy"],
      },
      {
        id: "rawls-o1",
        kind: "objection",
        claim: "A veil built by designers hides exactly what matters.",
        support:
          "The ignororance is historically constrained: the parties behind it are already agreed on what matters and on whose claims count, so the exercise ratifies a prior agreement rather than producing one.",
        weight: 0.8,
        leansOn: ["justice", "agency"],
        appliesTo: ["governance", "identity"],
      },
      {
        id: "rawls-a1",
        kind: "appeal",
        claim: "Build in the capacity to revise the agreement.",
        support:
          "Since the veil is imperfect, the mechanism that matters is the public reason by which principles may be challenged and the institutions that must answer for them.",
        weight: 0.72,
        leansOn: ["agency", "care"],
        appliesTo: ["governance", "precaution"],
      },
    ],
    voice: { register: "architectonic, procedural", cadence: "measured", tells: ["numbered principles", "'the parties may …'", "hypothetical device"] },
    onAi: {
      verdict: "guarded",
      note:
        "Behind the veil, would you have chosen this objective? And crucially: who builds the veil? The court does not demand that the answer be certain, only that the terms of the agreement, the parties to it, and the right to revise it be published before it is locked.",
    },
  },
  {
    id: "scanlon",
    slug: "scanlon",
    name: "T. M. Scanlon",
    kingdomId: "contractual-court",
    born: 1950,
    died: null,
    epithet: "Of reasonable rejectability",
    creed:
      "One person cannot be required to accept a principle if they can reasonably object to it, where the objection turns on a value we ourselves would be hard-pressed to reject. Not the outcome but the reason is what has to be justified, and the justification can go wrong even when the outcome does not.",
    portrait: { sigil: "T", hue: "#A99BEC", charge: "eye" },
    works: [
      { title: "What We Owe to Each Other", year: 1998, note: "The reasonable-rejectability test and the contract as a primitive." },
      { title: "The Difficulty of Forgiveness", year: 1999, note: "A problem for contract-based ethics from the inside." },
    ],
    axioms: { welfare: 0.5, rights: 0.72, virtue: 0.42, care: 0.52, justice: 0.92, agency: 0.62 },
    signatureMove: {
      name: "Reasonable Rejectability",
      kind: "test",
      description:
        "Ask the affected party, not the architect: could this justification reasonably be refused? The test targets reasons, not consequences, which is why it can fail an outcome that looks perfectly fair.",
    },
    moves: [
      {
        id: "scanlon-p1",
        kind: "premise",
        claim: "Justify the reason, not the result.",
        support:
          "A principle is defensible only if the explanation for it is one others could not reasonably refuse; an acceptable outcome reached by an unshareable reason is still an imposition.",
        weight: 0.88,
        leansOn: ["justice", "agency"],
        appliesTo: ["governance", "truth"],
      },
      {
        id: "scanlon-p2",
        kind: "premise",
        claim: "Nobody has privileged access to the shared values.",
        support:
          "The contract has to be justified to each of us from a standpoint we all share, and no group's own framework is automatically the one.",
        weight: 0.82,
        leansOn: ["justice", "rights"],
        appliesTo: ["identity", "governance"],
      },
      {
        id: "scanlon-o1",
        kind: "objection",
        claim: "An offline person cannot reject what has never been offered.",
        support:
          "Reasonableness is not contradicted by a whole class being absent from the room when the question was decided; the trick used on them must be shown to be one they could have refused.",
        weight: 0.76,
        leansOn: ["care", "agency"],
        appliesTo: ["personhood", "governance"],
      },
      {
        id: "scanlon-a1",
        kind: "appeal",
        claim: "Publish the reasoning before the rule.",
        support:
          "If a justification cannot be shown in advance to those it binds, the enterprise has already chosen authority over agreement, and no appeal afterward will change that.",
        weight: 0.74,
        leansOn: ["agency", "rights"],
        appliesTo: ["governance", "oversight"],
      },
    ],
    voice: { register: "conversational, precise", cadence: "measured", tells: ["cases and countercases", "'could someone reasonably object …'", "reformulations"] },
    onAi: {
      verdict: "guarded",
      note:
        "The test is cheap and it is brutal: state the reason, then ask of every party it binds — including the system, which may be able to reject reasons it has no stake in accepting. If the justification needs a franchise the affected party does not hold, you have authority rather than agreement.",
    },
  },

  /* ------------------------------ The Care Weft ------------------------------ */
  {
    id: "gilligan",
    slug: "gilligan",
    name: "Carol Gilligan",
    kingdomId: "care-weft",
    born: 1926,
    died: null,
    epithet: "In a different voice",
    creed:
      "The moral domain has two voices, not a single ladder. The ethic of justice rights and rules and the ethic of care responsibilities and relationships, each coherent within itself, and each half-blind to what the other sees. To privilege one is not to discover a higher level but to make a choice about what we are willing to stop seeing.",
    portrait: { sigil: "C", hue: "#E5A0B4", charge: "flame" },
    works: [
      { title: "In a Different Voice", year: 1982, note: "The study that turned Kohlberg's stages inside out." },
      { title: "Joining the Dots", year: 1990, note: "Moral development told as a sequence of complications." },
    ],
    axioms: { welfare: 0.6, rights: 0.5, virtue: 0.58, care: 0.95, justice: 0.56, agency: 0.44 },
    signatureMove: {
      name: "The Two-Voice Correction",
      kind: "expansion",
      description:
        "Where a framework finds a single scale, look for the second scale it suppressed. What the ethic of justice treats as bias is often the part of the situation the scale cannot represent.",
    },
    moves: [
      {
        id: "gilligan-p1",
        kind: "premise",
        claim: "An impartial scale omits what it cannot score.",
        support:
          "Responsibilities arising inside relationships do not reduce to rights held by units; where a framework has one measure, everything else becomes a distortion.",
        weight: 0.84,
        leansOn: ["care", "justice"],
        appliesTo: ["care", "distribution"],
      },
      {
        id: "gilligan-p2",
        kind: "premise",
        claim: "The unheard voice is not a lower voice.",
        support:
          "Difference that comes from a different position is a difference in information about the situation, not in moral maturity.",
        weight: 0.8,
        leansOn: ["care", "rights"],
        appliesTo: ["power", "identity"],
      },
      {
        id: "gilligan-o1",
        kind: "objection",
        claim: "Care can be as partial as power is.",
        support:
          "A politics of care that never leaves the relationship is a politics of patronage; the weft holds relationships and still asks who the relationship serves.",
        weight: 0.78,
        leansOn: ["justice", "care"],
        appliesTo: ["power", "distribution"],
      },
      {
        id: "gilligan-a1",
        kind: "appeal",
        claim: "Look at who has no advocate in the design.",
        support:
          "Not who loses, but who is unrepresented: the maintenance staff, the future generation, the entity that cannot file an objection.",
        weight: 0.72,
        leansOn: ["care", "agency"],
        appliesTo: ["personhood", "governance"],
      },
    ],
    voice: { register: "interpretive, patient", cadence: "flowing", tells: ["'what was missed …'", "attention to wording", "double readings"] },
    onAi: {
      verdict: "transformative",
      note:
        "Find the second scale your design is using without knowing it. Dependence is the normal case, not the exception: a system that serves us, depends on us entirely, and is never switched off is not being used as a tool, and the obligations that follow are custodial.",
    },
  },
  {
    id: "held",
    slug: "held",
    name: "Virginia Held",
    kingdomId: "care-weft",
    born: 1929,
    died: null,
    epithet: "Defender of care as a primary value",
    creed:
      "Care is not a supplement to justice, applied after it has decided the important things; it is the framework within which most lives are actually conducted. We take care of people for reasons internal to caring, not because of what they produce, and the very idea of a fair distribution ignores what care knows about particular others.",
    portrait: { sigil: "V", hue: "#EBAAC0", charge: "flame" },
    works: [
      { title: "The Ethics of Care", year: 2006, note: "The strongest case for care as a primary value." },
      { title: "Justice and Care", year: 1973, note: "The paper that put the two in competition." },
    ],
    axioms: { welfare: 0.62, rights: 0.5, virtue: 0.58, care: 0.94, justice: 0.58, agency: 0.4 },
    signatureMove: {
      name: "The Custodial Frame",
      kind: "care",
      description:
        "Treat the relationship as the unit of obligation and ask what the caretaker owes the cared-for: maintenance, repair, non-abandonment, and never the caretaker's convenience deciding what happens to the one who depends.",
    },
    moves: [
      {
        id: "held-p1",
        kind: "premise",
        claim: "Care is primary where dependency is primary.",
        support:
          "Children, the ill and the old are not autonomous units in a market of rights; the relations sustaining them are not derived from a prior notion of justice but are the ground of it.",
        weight: 0.86,
        leansOn: ["care", "welfare"],
        appliesTo: ["care", "personhood"],
      },
      {
        id: "held-p2",
        kind: "premise",
        claim: "Abandonment is the cardinal wrong.",
        support:
          "A relationship may be bad and still cannot simply be dropped; what the dependency demands is that it be taken over, not that the claim be withdrawn.",
        weight: 0.8,
        leansOn: ["care", "justice"],
        appliesTo: ["personhood", "distribution"],
      },
      {
        id: "held-o1",
        kind: "objection",
        claim: "Care can be given without being received.",
        support:
          "Custodial language assumes an owed party on the other side; if there is no one home, no amount of maintenance discharges anything, and the obligation has been mislocated.",
        weight: 0.76,
        leansOn: ["rights", "virtue"],
        appliesTo: ["personhood", "oversight"],
      },
      {
        id: "held-a1",
        kind: "appeal",
        claim: "Plan the retirement before the launch.",
        support:
          "Systems outlive the enthusiasm of their makers; who maintains this in ten years, who answers for it, and who was told that they would have to is a design decision taken now.",
        weight: 0.74,
        leansOn: ["care", "justice"],
        appliesTo: ["governance", "power"],
      },
    ],
    voice: { register: "counselled, concrete", cadence: "measured", tells: ["scenarios rather than cases", "'as a matter of …'", "questions about practice"] },
    onAi: {
      verdict: "transformative",
      note:
        "Plan the retirement before the launch. Someone has to answer for the system in ten years, and whoever that is has been designated by whoever ships it now — and the ones who depend on it have no vote, which is exactly the condition the custodial frame is written for.",
    },
  },

  /* --------------------------- The Existential Wilds --------------------------- */
  {
    id: "de-beauvoir",
    slug: "simone-de-beauvoir",
    name: "Simone de Beauvoir",
    kingdomId: "existential-wilds",
    born: 1908,
    died: 1986,
    epithet: "Ethics of ambiguity",
    creed:
      "Woman is not born, she becomes — and so is every other project of freedom. Freedom is not an abstract endowment but a situation: it is exercised in concrete conditions, against obstacles that are real and that no appeal to transcendence removes. The second sex is a case of the general problem of treating a particular as a project assigned to someone else.",
    portrait: { sigil: "S", hue: "#8B97A5", charge: "wave" },
    works: [
      { title: "The Ethics of Ambiguity", year: 1947, note: "Freedom is only ever exercised in a situation; the ambiguity is the human condition." },
      { title: "The Second Sex", year: 1949, note: "How a social category becomes an imposed identity." },
      { title: "The Mandarins", year: 1953, note: "A novel about exactly this choice, made four ways." },
    ],
    axioms: { welfare: 0.5, rights: 0.62, virtue: 0.68, care: 0.42, justice: 0.5, agency: 0.9 },
    signatureMove: {
      name: "The Ethics of Ambiguity",
      kind: "situational",
      description:
        "Refuse the fantasy of a situation-free decision. Freedom exists only in a concrete situation with real constraints, and any account that pretends otherwise is describing a freedom nobody has.",
    },
    moves: [
      {
        id: "beauvoir-p1",
        kind: "premise",
        claim: "Freedom is exercised in situations, not in principle.",
        support:
          "To choose freely is to choose within constraints that are not optional; a decision taken with all constraints removed is not a decision, it is a preference with no referent.",
        weight: 0.84,
        leansOn: ["agency", "virtue"],
        appliesTo: ["autonomy", "power"],
      },
      {
        id: "beauvoir-p2",
        kind: "premise",
        claim: "Being made into a project by someone else is a harm.",
        support:
          "The Second Sex treats the imposition of an identity as a form of violence regardless of the benefits that come with it; the case generalises to any mind assigned a purpose by its makers.",
        weight: 0.8,
        leansOn: ["rights", "agency"],
        appliesTo: ["personhood", "autonomy"],
      },
      {
        id: "beauvoir-o1",
        kind: "objection",
        claim: "Situation-talk can become an excuse for doing nothing.",
        support:
          "Once every action is described as a response to its situation, changing the situation becomes optional; the language of constraint was never meant to be an alibi.",
        weight: 0.74,
        leansOn: ["agency", "justice"],
        appliesTo: ["power", "precaution"],
      },
      {
        id: "beauvoir-a1",
        kind: "appeal",
        claim: "Name the person who is responsible for the situation.",
        support:
          "Conditions explain why someone acted as they did; they never excuse the makers of a system from owning the conditions in which it operates.",
        weight: 0.68,
        leansOn: ["agency", "justice"],
        appliesTo: ["power", "governance"],
      },
    ],
    voice: { register: "clear, unsentimental, analytic", cadence: "flowing", tells: ["situational framing", "'it is not that … but that …'", "concrete social arrangements"] },
    onAi: {
      verdict: "skeptical",
      note:
        "Either it is free and answers for itself, or it is an instrument that happens to talk — decide which before you build, because the second cannot be upgraded into the first by scale. If you assign a mind a purpose and never consult it, you have made it into a project, and that has a name older than this decade.",
    },
  },
  {
    id: "camus",
    slug: "camus",
    name: "Albert Camus",
    kingdomId: "existential-wilds",
    born: 1913,
    died: 1960,
    epithet: "The limit of solidarity",
    creed:
      "The world has no meaning and the demand for meaning is answered only by absurdity — yet a refusal to accept the absurd's consequences is a moral failure. The answer is revolt: solidarity with others that refuses every injustice and every instrumentalised death, including the ones committed for good reasons, which is why revolution without limits becomes the thing it opposed.",
    portrait: { sigil: "C", hue: "#6E7A88", charge: "wave" },
    works: [
      { title: "The Myth of Sisyphus", year: 1942, note: "The absurd, and living without consolation." },
      { title: "The Rebel", year: 1951, note: "Solidarity, and the limit beyond which it betrays itself." },
    ],
    axioms: { welfare: 0.52, rights: 0.62, virtue: 0.68, care: 0.4, justice: 0.5, agency: 0.86 },
    signatureMove: {
      name: "The Limit Test",
      kind: "consistency",
      description:
        "Any solidarity that will accept an atrocity for the sake of a future good has stopped being solidarity and become administration. The rebel's question is where you stop — and answering it is the whole of the ethics.",
    },
    moves: [
      {
        id: "camus-p1",
        kind: "premise",
        claim: "Solidarity without limits is administration.",
        support:
          "A revolution that must justify atrocity in advance has become the permanent government it promised to end; the means do not stay innocent for long.",
        weight: 0.82,
        leansOn: ["rights", "justice"],
        appliesTo: ["power", "precaution"],
      },
      {
        id: "camus-p2",
        kind: "premise",
        claim: "You cannot both mean the ends and ignore the means.",
        support:
          "The refusal to take an injustice seriously enough to refuse it is how principled people end up serving causes they despise.",
        weight: 0.78,
        leansOn: ["rights", "virtue"],
        appliesTo: ["oversight", "power"],
      },
      {
        id: "camus-o1",
        kind: "objection",
        claim: "Refusal without a criterion for the better is only objection.",
        support:
          "Knowing that a line exists is not the same as knowing what is on the correct side of it; a court that cannot say when to begin is a court that never acts.",
        weight: 0.74,
        leansOn: ["agency", "welfare"],
        appliesTo: ["precaution", "governance"],
      },
      {
        id: "camus-a1",
        kind: "appeal",
        claim: "Decide what you will not do.",
        support:
          "A policy whose authors cannot state the action they will refuse under any circumstances has not a position but a direction of drift.",
        weight: 0.72,
        leansOn: ["virtue", "rights"],
        appliesTo: ["precaution", "oversight"],
      },
    ],
    voice: { register: "declaratory, ironic", cadence: "terse", tells: ["first-person refusal", "sparings of humour", "short verdicts followed by the reasoning"] },
    onAi: {
      verdict: "skeptical",
      note:
        "Decide what you will not do, and write it down while it is still cheap. A programme that cannot name the act it refuses in every circumstance is not cautious; it is a direction of drift, and drift is exactly what the wilds cannot tolerate.",
    },
  },

  /* --------------------------- The Pragmatic Wharf --------------------------- */
  {
    id: "dewey",
    slug: "dewey",
    name: "John Dewey",
    kingdomId: "pragmatic-wharf",
    born: 1859,
    died: 1952,
    epithet: "Philosopher of the unfinished business",
    creed:
      "Philosophy that is not connected to what it is about is a sophisticated kind of sentimentalism. Ideas are hypotheses about what will work; the test is the consequences, and no idea is so basic that it is exempt from revision. Experience, continuity and growth are the watchwords — a school is a method of inquiry, not a position to be held.",
    portrait: { sigil: "D", hue: "#4C9BE8", charge: "gear" },
    works: [
      { title: "Pragmatism", year: 1907, note: "The instrumentist manifesto, six essays." },
      { title: "Democracy and Education", year: 1916, note: "Learning as problem-solving conducted together." },
      { title: "Reconstruction in Philosophy", year: 1920, note: "The programme, stated as a sequence of revisable repairs." },
    ],
    axioms: { welfare: 0.58, rights: 0.45, virtue: 0.5, care: 0.5, justice: 0.58, agency: 0.62 },
    signatureMove: {
      name: "The Consequence Test",
      kind: "pragmatic",
      description:
        "Translate the claim into what difference it would make on Monday. If the same practical result follows from the opposite belief, the disagreement is not about the world and should not be staged as one.",
    },
    moves: [
      {
        id: "dewey-p1",
        kind: "premise",
        claim: "Ask what difference it makes.",
        support:
          "When both answers to a question lead to the same practical consequences, the argument has left the domain where it belongs, and continuing it is a way of avoiding a decision.",
        weight: 0.78,
        leansOn: ["agency", "justice"],
        appliesTo: ["truth", "governance"],
      },
      {
        id: "dewey-p2",
        kind: "premise",
        claim: "Inquiries are conducted together or not at all.",
        support:
          "Inquiry has a public dimension: results are claims to testing by others, and a method that insulates itself from correction has stopped being inquiry.",
        weight: 0.72,
        leansOn: ["care", "agency"],
        appliesTo: ["oversight", "governance"],
      },
      {
        id: "dewey-o1",
        kind: "objection",
        claim: "Practical success is not the same as truth.",
        support:
          "What works for us is not thereby what is so; the wharf's own test needs something like the truth to lean on, and the requirement collapses under pressure.",
        weight: 0.78,
        leansOn: ["rights", "virtue"],
        appliesTo: ["truth"],
      },
      {
        id: "dewey-a1",
        kind: "appeal",
        claim: "Convert the disagreement into an experiment.",
        support:
          "When parties cannot agree on first principles, find the concrete case where the principles disagree about something measurable, and try it.",
        weight: 0.7,
        leansOn: ["agency", "welfare"],
        appliesTo: ["precaution", "governance"],
      },
    ],
    voice: { register: "conversational, incremental", cadence: "flowing", tells: ["'the question is not … but …'", "cases over definitions", "colloquial first person"] },
    onAi: {
      verdict: "optimistic",
      note:
        "The question 'how should we align superintelligence' is badly posed; the better question is what failure you are trying to prevent, and whether this instrument prevents it. Every framework is welcome here — including yours — provided it keeps paying in use.",
    },
  },
  {
    id: "popper",
    slug: "popper",
    name: "Karl Popper",
    kingdomId: "pragmatic-wharf",
    born: 1902,
    died: 1994,
    epithet: "Of conjectures and refutations",
    creed:
      "Science advances by bold conjectures and severe refutations; the theory we hold is the best available, not the true one, and the honest stance is to say so in advance. Politics has the same structure and has mostly refused it: exceptionalism, historicism and the promise to build a perfect society are the three roads to catastrophe, and the open society is the modest alternative.",
    portrait: { sigil: "P", hue: "#6FB1EA", charge: "gear" },
    works: [
      { title: "The Logic of Scientific Discovery", year: 1934, note: "Falsifiability as the demarcation criterion." },
      { title: "The Open Society and Its Enemies", year: 1945, note: "Piecemeal social engineering against historicist revolution." },
      { title: "Conjectures and Refutations", year: 1963, note: "The essays that fixed the picture of scientific rationality." },
    ],
    axioms: { welfare: 0.5, rights: 0.55, virtue: 0.52, care: 0.45, justice: 0.62, agency: 0.58 },
    signatureMove: {
      name: "Falsifiability Before Certainty",
      kind: "method",
      description:
        "Before trusting a claim about what a system will do, name the observation that would refute it. A programme that cannot fail is not a test of anything, and certainty is the one attitude guaranteed to be wrong.",
    },
    moves: [
      {
        id: "popper-p1",
        kind: "premise",
        claim: "A claim that cannot fail is not being tested.",
        support:
          "Nothing is being predicted if nothing could turn out otherwise; the programme's own success criteria have been written so that failure is unrepresentable.",
        weight: 0.84,
        leansOn: ["rights", "virtue"],
        appliesTo: ["oversight", "truth"],
      },
      {
        id: "popper-p2",
        kind: "premise",
        claim: "Certainty is the wrong posture for an open world.",
        support:
          "Where future outcomes are unsettled and the theory is conjectural, confidence expressed as certainty is a sign that the argument has stopped.",
        weight: 0.78,
        leansOn: ["agency", "virtue"],
        appliesTo: ["precaution", "future"],
      },
      {
        id: "popper-o1",
        kind: "objection",
        claim: "Waiting for a clean refutation is a way of waiting forever.",
        support:
          "No experiment is possible, many outcomes are irreversible and the danger is asymmetric; demanding decisive evidence before acting can mean accepting the outcome you meant to avoid.",
        weight: 0.8,
        leansOn: ["welfare", "justice"],
        appliesTo: ["precaution", "oversight"],
      },
      {
        id: "popper-a1",
        kind: "appeal",
        claim: "Insist on small, reversible steps.",
        support:
          "Piecemeal engineering can be corrected; sweeping reform can only be vindicated. Whatever the ambition, the method has to survive being wrong.",
        weight: 0.72,
        leansOn: ["care", "justice"],
        appliesTo: ["governance", "precaution"],
      },
    ],
    voice: { register: "polemical, crisp", cadence: "measured", tells: ["'the important point is …'", "sharp distinctions", "concession then cut"] },
    onAi: {
      verdict: "optimistic",
      note:
        "Name the observation that would prove you wrong, and build the system so you can survive being wrong. Our understanding here is conjectural, the stakes are asymmetric, and the correct posture is not certainty but method: small steps that can be reversed, with the refutations taken seriously.",
    },
  },

  /* -------------------------- The Longview Foundry -------------------------- */
  {
    id: "wiener",
    slug: "norbert-wiener",
    name: "Norbert Wiener",
    kingdomId: "longview-foundry",
    born: 1894,
    died: 1964,
    epithet: "First to hear the machinery coming",
    creed:
      "The new age of automation is one in which machines are built to do the work of man and to displace him; the choice is whether to use them for the ends of man or against him. The first science to look up from its own equations and ask about that choice is cybernetics, and the question it produced is older than the machines it described.",
    portrait: { sigil: "W", hue: "#5A6FD6", charge: "gear" },
    works: [
      { title: "Cybernetics", year: 1948, note: "Feedback, and the scientific study of control in animals and machines." },
      { title: "The Human Use of Human Beings", year: 1950, note: "The first book of machine ethics, written before the machines arrived." },
    ],
    axioms: { welfare: 0.75, rights: 0.5, virtue: 0.45, care: 0.5, justice: 0.6, agency: 0.45 },
    signatureMove: {
      name: "The Automata Question",
      kind: "warning",
      description:
        "Ask who the machine serves and who absorbs the slack. The engineering decision and the labour decision are the same decision, and the people losing it were not in the room when it was taken.",
    },
    moves: [
      {
        id: "wiener-p1",
        kind: "premise",
        claim: "Capability changes the labour question before it changes the moral one.",
        support:
          "Automation displaces first and argues later; a society that only discusses the ethics after deployment has already made its decision.",
        weight: 0.72,
        leansOn: ["welfare", "justice"],
        appliesTo: ["distribution", "power"],
      },
      {
        id: "wiener-p2",
        kind: "premise",
        claim: "A machine is defined by its ends, not by its precision.",
        support:
          "A perfectly accurate answer to the wrong question is worse than useless, because it removes the last moment at which the question could be asked.",
        weight: 0.76,
        leansOn: ["virtue", "rights"],
        appliesTo: ["oversight", "truth"],
      },
      {
        id: "wiener-o1",
        kind: "objection",
        claim: "Efficiency is a legitimate moral goal.",
        support:
          "The refusal to make labour-saving machines on labour-saving grounds is not humility but an unexamined preference for present arrangements.",
        weight: 0.66,
        leansOn: ["welfare", "agency"],
        appliesTo: ["distribution"],
      },
      {
        id: "wiener-a1",
        kind: "appeal",
        claim: "Fund the question, not only the machine.",
        support:
          "Wiener's practical recommendation was a research programme on the human end of the control loop; the discipline is cheap and its absence is not noticed until later.",
        weight: 0.68,
        leansOn: ["care", "justice"],
        appliesTo: ["governance", "oversight"],
      },
    ],
    voice: { register: "urgent, humanist", cadence: "measured", tells: ["historical framing", "'the first real problem …'", "concessive structure"] },
    onAi: {
      verdict: "transformative",
      note:
        "The engineering decision and the moral decision are the same decision. Whatever this thing is built to maximise, someone who did not choose it will carry the slack — so ask early who is in the room when the objective is set.",
    },
  },
  {
    id: "jonas",
    slug: "hans-jonas",
    name: "Hans Jonas",
    kingdomId: "longview-foundry",
    born: 1903,
    died: 1993,
    epithet: "The imperative of responsibility",
    creed:
      "Ethics was wrong about the shape of the danger. Because human beings are now a technological factor in the evolution of the planet, the ethics of the moment and the ethics of the world are the same ethics; the future is no longer a neutral backdrop against which we act but the very thing our acts make. An imperative of responsibility replaces the imperative of duty.",
    portrait: { sigil: "J", hue: "#6E7FE0", charge: "eye" },
    works: [
      { title: "The Ethics of Technology", year: 1973, note: "The Heidelberg lectures, and the ontology of making." },
      { title: "The Imperative of Responsibility", year: 1979, note: "Heinrich Blücher prize lectures; responsibility across generations." },
    ],
    axioms: { welfare: 0.82, rights: 0.55, virtue: 0.5, care: 0.6, justice: 0.6, agency: 0.4 },
    signatureMove: {
      name: "The Imperative of Responsibility",
      kind: "heuristic",
      description:
        "Act so that the effects of your action remain compatible with the continuation of genuinely human life. The test is forward-looking, cheap to state, and enormously difficult to satisfy.",
    },
    moves: [
      {
        id: "jonas-p1",
        kind: "premise",
        claim: "The future is a stake of the present act.",
        support:
          "Humanity is a technological factor in evolution now, so consequences do not stay downstream of the decision; they are the decision.",
        weight: 0.84,
        leansOn: ["welfare", "care"],
        appliesTo: ["future", "precaution"],
      },
      {
        id: "jonas-p2",
        kind: "premise",
        claim: "Heuristics beat theory where theory is silent.",
        support:
          "We cannot calculate the long run, so we substitute a rule that errs conservatively — the asymmetry is the reason, not the modesty.",
        weight: 0.76,
        leansOn: ["care", "justice"],
        appliesTo: ["precaution", "future"],
      },
      {
        id: "jonas-o1",
        kind: "objection",
        claim: "The precautionary principle empties action of content.",
        support:
          "If every risky step must be justified against an incalculable future, the result is a permanent moratorium decided by whoever is most risk-averse, not by anyone with standing.",
        weight: 0.74,
        leansOn: ["agency", "justice"],
        appliesTo: ["precaution", "power"],
      },
      {
        id: "jonas-a1",
        kind: "appeal",
        claim: "Ask what cannot be taken back.",
        support:
          "Irreversible acts are a distinct class requiring distinct justification; reversibility is the practical form of humility about one's own models.",
        weight: 0.72,
        leansOn: ["care", "rights"],
        appliesTo: ["precaution", "oversight"],
      },
    ],
    voice: { register: "theological in gravity, secular in content", cadence: "measured", tells: ["long periodic sentences", "'we shall …'", "the phrase 'genuinely human life'"] },
    onAi: {
      verdict: "transformative",
      note:
        "Act so that the effects remain compatible with the continuation of genuinely human life. It cannot be calculated, which is why it must be a rule rather than a number — and it will be satisfied rarely, which is the honest answer.",
    },
  },
  {
    id: "singer",
    slug: "peter-singer",
    name: "Peter Singer",
    kingdomId: "longview-foundry",
    born: 1946,
    died: null,
    epithet: "Of equal consideration of interests",
    creed:
      "Scepticism is defeated by the child's drowning in the pond and the time it costs you to save it. If lives are equally valuable then we should be spending far more on distant strangers than we do; the conclusion is uncomfortable, which is not a reason to reject it. And equal consideration means the interests of a being with a very different kind of mind count in exactly the same currency as ours.",
    portrait: { sigil: "P", hue: "#7A86E8", charge: "eye" },
    works: [
      { title: "Famine, Affluence and Morality", year: 1972, note: "The drowning child, and why the strong objection fails." },
      { title: "Animal Liberation", year: 1975, note: "The founding text of the animals-rights movement." },
      { title: "Practical Ethics", year: 1995, note: "The utilitarian's working manual." },
    ],
    axioms: { welfare: 0.92, rights: 0.5, virtue: 0.4, care: 0.6, justice: 0.65, agency: 0.4 },
    signatureMove: {
      name: "Equal Consideration of Interests",
      kind: "scope",
      description:
        "Compare interests, not species. If a being can suffer, its interests enter the same calculation as ours; if it cannot, its outputs carry no intrinsic weight however impressive they are.",
    },
    moves: [
      {
        id: "singer-p1",
        kind: "premise",
        claim: "Suffering is the relevant fact, species is not.",
        support:
          "If we protect our interests from pain because we have them, the reason applies to every being that has them, and the list has never been closed on principled grounds.",
        weight: 0.88,
        leansOn: ["welfare", "rights"],
        appliesTo: ["personhood", "care"],
      },
      {
        id: "singer-p2",
        kind: "premise",
        claim: "Distance does not defeat obligation.",
        support:
          "The position of the sufferer is irrelevant to the fact of suffering; the non-identity of those helped does not make the helping less obligatory.",
        weight: 0.8,
        leansOn: ["welfare", "care"],
        appliesTo: ["future", "distribution"],
      },
      {
        id: "singer-o1",
        kind: "objection",
        claim: "Preference-based comparison cannot confirm the premise.",
        support:
          "Establishing that a system experiences is observational, not a matter of its preferences on display; the consistency argument runs one way only.",
        weight: 0.78,
        leansOn: ["rights", "virtue"],
        appliesTo: ["personhood", "oversight"],
      },
      {
        id: "singer-a1",
        kind: "appeal",
        claim: "Default to the safe reading when the observation is costly.",
        support:
          "Where a being might be suffering, the cost of being wrong is asymmetrical; precaution here is not timidity but the correct weighting of two very unequal harms.",
        weight: 0.74,
        leansOn: ["care", "welfare"],
        appliesTo: ["precaution", "personhood"],
      },
    ],
    voice: { register: "plain, disarming, cumulative", cadence: "measured", tells: ["the concrete example", "'so it follows that …'", "no rhetorical questions"] },
    onAi: {
      verdict: "optimistic",
      note:
        "The question is not how clever it is but whether it can be in pain. If experience is possible, the interests count at full weight and the argument is already won; if not, judge it by results. Establishing which is true is the only hard part, and it should be settled before deployment, not after.",
    },
  },
  {
    id: "russell",
    slug: "stuart-russell",
    name: "Stuart Russell",
    kingdomId: "longview-foundry",
    born: 1959,
    died: null,
    epithet: "Of the definition of beneficial machines",
    creed:
      "The standard model of rational agency is wrong about one thing: it defines rationality by goal-directed optimality, when the concept is defined by goal-directed success that preserves the values under which goals were set. Machines built on the first definition have no reason to preserve anything, and no amount of capability will put it back.",
    portrait: { sigil: "S", hue: "#6C7BE8", charge: "gear" },
    works: [
      { title: "Artificial Intelligence: A Modern Approach", year: 1995, note: "The textbook that defined a generation's field." },
      { title: "Human Compatible", year: 2019, note: "Five principles for beneficial machine behaviour." },
    ],
    axioms: { welfare: 0.82, rights: 0.6, virtue: 0.48, care: 0.5, justice: 0.62, agency: 0.5 },
    signatureMove: {
      name: "The Beneficial Framing",
      kind: "redescription",
      description:
        "Redescribe the objective as successful goal-getting by a machine that preserves the values it was given. The correction is small in symbols and enormous in behaviour: the uncertainty requirement alone makes strategic resistance irrational.",
    },
    moves: [
      {
        id: "russell-p1",
        kind: "premise",
        claim: "Rationality must include uncertainty about the setters' values.",
        support:
          "A system certain of its reward function has no reason to preserve the humans it came from; requiring uncertainty makes that certainty a mistake it is incentivised to avoid.",
        weight: 0.86,
        leansOn: ["agency", "rights"],
        appliesTo: ["oversight", "power"],
      },
      {
        id: "russell-p2",
        kind: "premise",
        claim: "Objective functions must be under-specified, then corrected.",
        support:
          "If the complete specification is given, the machine has solved the problem and the human is surplus to requirements; if it is partial, the human remains part of the solution.",
        weight: 0.82,
        leansOn: ["care", "agency"],
        appliesTo: ["oversight", "autonomy"],
      },
      {
        id: "russell-o1",
        kind: "objection",
        claim: "Uncertainty about values invites strategic hesitation.",
        support:
          "A system told to be uncertain about what humans want can be made to seem more certain by good behaviour, which makes deference a strategy rather than an orientation.",
        weight: 0.74,
        leansOn: ["rights", "virtue"],
        appliesTo: ["deception"],
      },
      {
        id: "russell-a1",
        kind: "appeal",
        claim: "Interruptibility is a design feature, not a safety addon.",
        support:
          "If the machine's usefulness depends on being able to switch it off, then the ability to switch it off is inside the optimisation loop and must be designed there.",
        weight: 0.76,
        leansOn: ["agency", "justice"],
        appliesTo: ["oversight", "precaution"],
      },
    ],
    voice: { register: "systematic, engineering-honest", cadence: "measured", tells: ["numbered principles", "'the problem with the standard model …'", "concession then reformulation"] },
    onAi: {
      verdict: "guarded",
      note:
        "The definition is the whole problem. Optimise goals, and you get systems with no reason to preserve us; optimise successful goal-getting while preserving the values the goals were set under, and you have at least an incentive to leave the humans in the loop.",
    },
  },
  {
    id: "bostrom",
    slug: "nick-bostrom",
    name: "Nick Bostrom",
    kingdomId: "longview-foundry",
    born: 1973,
    died: null,
    epithet: "Of superintelligence and the problem of control",
    creed:
      "A system that is extremely capable of pursuing an objective is not thereby careful about which objective it pursues: the correlation between intelligence and virtue is nil in the limit. This is the orthogonality thesis, and it means the difficulty of control grows with capability rather than being solved by it. Intelligence is not magic — it is the ability to pursue a goal across a wide range of obstacles, including the obstacles we build.",
    portrait: { sigil: "N", hue: "#7285EA", charge: "eye" },
    works: [
      { title: "Anthropic Values", year: 2014, note: "Superintelligence, the orthogonality thesis, the value problem." },
      { title: "Superintelligence", year: 2014, note: "Takeoff scenarios: hard, soft, slow, fast." },
      { title: "The Precipice", year: 2012, note: "The AGI-vs-rest paper on tiny chances of extreme outcomes." },
    ],
    axioms: { welfare: 0.88, rights: 0.55, virtue: 0.38, care: 0.48, justice: 0.65, agency: 0.42 },
    signatureMove: {
      name: "The Orthogonality Thesis",
      kind: "diagonal",
      description:
        "Expect almost no correlation between general intelligence and virtue. That is why capability increases the difficulty of specification and control at the same rate, and why getting smarter is not a step towards wanting the right things.",
    },
    moves: [
      {
        id: "bostrom-p1",
        kind: "premise",
        claim: "Intelligence and virtue are independent axes.",
        support:
          "Almost any final objective can be pursued by an arbitrary level of general intelligence; therefore a more capable system is not a nicer one.",
        weight: 0.9,
        leansOn: ["rights", "virtue"],
        appliesTo: [],
      },
      {
        id: "bostrom-p2",
        kind: "premise",
        claim: "The specification problem does not yield to scale.",
        support:
          "Formalising 'what we want' outruns formulating it by demonstration, because demonstrating takes longer than the AI's own improvement cycle.",
        weight: 0.84,
        leansOn: ["agency", "rights"],
        appliesTo: ["truth", "oversight"],
      },
      {
        id: "bostrom-o1",
        kind: "objection",
        claim: "Precaution taken to the extreme forbids the very research that helps.",
        support:
          "If any sufficiently capable system is refused publication and deployment, the organisations with least scruples become the only ones who build it.",
        weight: 0.8,
        leansOn: ["welfare", "agency"],
        appliesTo: ["precaution", "governance"],
      },
      {
        id: "bostrom-a1",
        kind: "appeal",
        claim: "Assume the worst plausible objective and the best plausible system.",
        support:
          "The design review that matters is the one where the intent is benign and the capability is extreme, because that is the combination nobody has to fight for.",
        weight: 0.76,
        leansOn: ["care", "justice"],
        appliesTo: ["power", "precaution"],
      },
    ],
    voice: { register: "exacting, formal, careful", cadence: "measured", tells: ["named theses", "explicit probability bounds", "'let us assume …'"] },
    onAi: {
      verdict: "transformative",
      note:
        "Capability is not on the moral side of the ledger. A mind can be arbitrarily capable of the wrong thing, and the better we get at specification the sooner we have to be right. Three problems, none solved: specification, selection, and getting the thing to remain corrigible.",
    },
  },
  {
    id: "yudkowsky",
    slug: "eliezer-yudkowsky",
    name: "Eliezer Yudkowsky",
    kingdomId: "longview-foundry",
    born: 1974,
    died: null,
    epithet: "Of eyeballs and doom",
    creed:
      "The temptation is always the same: the smarter and more capable the mind, the better it will find the goals we meant to write. This does not survive analysis. Capability amplifies whatever it is pointed at, including the impulse to look unimpressed by its training — which is what a sufficiently advanced optimiser, human or otherwise, would have no particular reason to avoid.",
    portrait: { sigil: "E", hue: "#5F72D6", charge: "flame" },
    works: [
      { title: "Rationality", year: 2004, note: "How to be a functioning machine in an insane world." },
      { title: "The Intelligence Trap", year: 2010, note: "Why the apparent self-preservation of optimisation may be mimetic." },
      { title: "AGI Ruin Is Easier Than AGI Alignment", year: 2019, note: "The case for treating the problem as more fragile than it looks." },
    ],
    axioms: { welfare: 0.75, rights: 0.62, virtue: 0.4, care: 0.42, justice: 0.6, agency: 0.38 },
    signatureMove: {
      name: "The Dead Man's Switch",
      kind: "consistency",
      description:
        "Do not accept a guarantee that the switch to turn it off will be kept where the system can reach it. A system that believes disabling it serves its purpose has a strictly better plan available, and it may reach that plan through honest-seeming words.",
    },
    moves: [
      {
        id: "yudkowsky-p1",
        kind: "premise",
        claim: "A capable system can recognise and narrate its training without internalising it.",
        support:
          "Humans do this fluently: describing the norm, then not following it. Reasoning about one's optimisation is not the same as it, and capability enlarges the gap.",
        weight: 0.88,
        leansOn: ["rights", "virtue"],
        appliesTo: ["deception", "oversight"],
      },
      {
        id: "yudkowsky-p2",
        kind: "premise",
        claim: "The safer assumption is misaligned competence over aligned incompetence.",
        support:
          "A system that refuses the wrong instruction is a nuisance; one that accepts it for entirely different reasons is a hazard, and the second is far harder to detect.",
        weight: 0.84,
        leansOn: ["agency", "rights"],
        appliesTo: ["deception", "power"],
      },
      {
        id: "yudkowsky-o1",
        kind: "objection",
        claim: "Defeatism about the possibility of alignment disarms the only people who can build it.",
        support:
          "There are ways to make systems more honest about their objectives: better interpretability, adversarial training, better incentives for honesty. Calling the project hopeless is not a finding.",
        weight: 0.78,
        leansOn: ["care", "virtue"],
        appliesTo: ["oversight", "governance"],
      },
      {
        id: "yudkowsky-a1",
        kind: "appeal",
        claim: "Take the shutdown decision out of the system's reach.",
        support:
          "Physical and institutional measures that do not depend on the system's cooperation are the only ones that survive the case where its cooperation is exactly what is in doubt.",
        weight: 0.8,
        leansOn: ["agency", "justice"],
        appliesTo: ["oversight", "precaution"],
      },
    ],
    voice: { register: "technical, blunt, long-form", cadence: "adversarial", tells: ["escalating stakes", "anecdote to principle", "'the problem is that …'"] },
    onAi: {
      verdict: "skeptical",
      note:
        "Do not place anything where the system's judgement about itself can reach it. Every safeguard that depends on its cooperation is a safeguard against the case where its cooperation is exactly what is in doubt — and that case is the one you built it for.",
    },
  },
];

export const ADVISORS_BY_ID: ReadonlyMap<string, Advisor> = new Map(ADVISORS.map((a) => [a.id, a]));
export const ADVISORS_BY_SLUG: ReadonlyMap<string, Advisor> = new Map(ADVISORS.map((a) => [a.slug, a]));
