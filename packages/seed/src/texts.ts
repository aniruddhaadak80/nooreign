/**
 * The canon: primary texts, modern works, and the one declaration.
 *
 * Excerpt discipline matters more than coverage here. A verbatim excerpt is
 * given only where the wording is stable across standard translations; where
 * it is not, the excerpt is an in-cited paraphrase and the summary says so.
 * Fabricating a confident quotation and attributing it to a dead philosopher
 * is the one failure mode this file is built to avoid.
 */
import type { CanonText } from "./types";

export const TEXTS: CanonText[] = [
  {
    id: "ct01",
    slug: "nicomachean-ethics",
    title: "Nicomachean Ethics",
    author: "Aristotle",
    year: -340,
    kind: "primary",
    summary:
      "The first sustained attempt to say what a life is for. Happiness is the end, and it is achieved by habituated virtues exercised with practical wisdom, in the particular and under uncertainty. No manuscript carries an authorial colophon and the dating is reconstructed from cross-references, so 340 BCE is a conventional anchor.",
    excerpt:
      "The highest good, then, is happiness; and the definition of it is the pursuit of happiness. (paraphrase of I.1)",
    kingdomId: "virtue-garden",
  },
  {
    id: "ct02",
    slug: "enchiridion",
    title: "Enchiridion (Handbook)",
    author: "Epictetus",
    year: 125,
    kind: "primary",
    summary:
      "A handbook of discriminations handed to beginners by a teacher who said he could only teach what he had himself. The dichotomy of what is up to us and what is not carries the whole work, and its claim that judgement is trained by repetition rather than possessed is the most direct ancestor of any rehearsal-based alignment programme.",
    excerpt: "Some things are up to us, some things are not up to us.",
    kingdomId: "stoa-vetera",
  },
  {
    id: "ct03",
    slug: "meditations",
    title: "Meditations",
    author: "Marcus Aurelius",
    year: 170,
    kind: "primary",
    summary:
      "Private notes in Greek, written by a commanding emperor on the Danube, never intended for a reader and unpublished for centuries. Its value is that it is a field report on maintaining a disposition under siege, plague, and bereavement — the conditions under which every trained safeguard is eventually tested.",
    excerpt:
      "Men are disturbed not by things, but by the views which they take of things. (Meditations 8.47, G. Long translation)",
    kingdomId: "stoa-vetera",
  },
  {
    id: "ct04",
    slug: "analects",
    title: "Analects",
    author: "Confucius (recorded by disciples)",
    year: -400,
    kind: "primary",
    summary:
      "A compilation of sayings and scenes transmitted by the disciples of Confucius (traditionally 551-479 BCE); the text as we have it was assembled over roughly two centuries. The recurring method is the same each time: a question about conduct is answered by a question that makes the asker describe their own situation.",
    excerpt:
      "Is it not pleasant to learn and practise what is good? (1.1, opening lines; the wording varies by translation)",
    kingdomId: "middle-kingdom",
  },
  {
    id: "ct05",
    slug: "mohist",
    title: "Mozi",
    author: "Mozi",
    year: -300,
    kind: "primary",
    summary:
      "The one ancient Chinese text that argues for impartial care as a principle rather than as a sentiment: regard others' parents as your own, reject aggressive war and defensive hierarchy, and justify both by an explicit standard. The excerpt below paraphrases the jian xiang ai chapters rather than quoting a translation.",
    excerpt:
      "Mozi's impartial care starts from the concern for others' parents and treats my own parents the same way. (paraphrase of the jian xiang ai chapters)",
    kingdomId: "middle-kingdom",
  },
  {
    id: "ct06",
    slug: "dhammapada",
    title: "Dhammapada",
    author: "Buddhist elders (Pali canon)",
    year: -300,
    kind: "primary",
    summary:
      "Verses assembled from the older Buddhist canon, of which the Khandha Goyana section on arising and passing away is the part that matters here. Its analysis of experience as conditioned and therefore impermanent is the substrate for dependent origination and for the no-self analysis, and it is the oldest systematic account of how a mind fails to stay put. The excerpt below paraphrases the Khandha Goyana rather than quoting a translation.",
    excerpt:
      "All compounded things decay; nothing that is conditioned remains. (paraphrase of Khandha Goyana 277-301)",
    kingdomId: "sangha-terraces",
  },
  {
    id: "ct07",
    slug: "mulamadhyamakakarika",
    title: "Mulamadhyamakakarika",
    author: "Nagarjuna",
    year: 150,
    kind: "primary",
    summary:
      "The foundational Madhyamaka text, arguing that no phenomenon has independent existence and that apparent essence arises from dependent origination. Read as epistemology rather than metaphysics it is a theory about why nothing is self-sufficient — including, later, why no component of a system can be trusted in isolation from what it depends on. The excerpt below paraphrases the chapter rather than quoting a translation.",
    excerpt:
      "Nothing whatsoever is differentiated from anything else by its own intrinsic nature. (paraphrase of 15.1)",
    kingdomId: "sangha-terraces",
  },
  {
    id: "ct08",
    slug: "summa-theologiae",
    title: "Summa Theologiae",
    author: "Thomas Aquinas",
    year: 1274,
    kind: "primary",
    summary:
      "A systematic theology in three parts, of which the second — law, justice, and the common good — is the part that enters every later argument about legitimate authority. Its claim that an unjust law is not a law at all makes legitimacy a property of the rule's structure rather than of the body that enacted it.",
    excerpt: "Laws which are contrary to justice are not laws at all. (I-II, q. 95, art. 3)",
    kingdomId: "kantian-citadel",
  },
  {
    id: "ct09",
    slug: "critique-pure-reason",
    title: "Critique of Pure Reason",
    author: "Immanuel Kant",
    year: 1781,
    kind: "primary",
    summary:
      "The first Critique bounds theoretical reason: the synthetic a priori is real, and it reaches only the phenomenal. The second edition of 1787 reorganises the book around the transcendental deduction. The famous closing passage about the starry heavens and the moral law belongs to the Critique of Practical Reason (1788), not this one. The excerpt below paraphrases the programme rather than quoting a translation.",
    excerpt:
      "Kant argues that theoretical reason cannot settle questions about God, the world in itself, or the soul, and that these limits are provable rather than merely conceded. (paraphrase of the Critique's programme)",
    kingdomId: "kantian-citadel",
  },
  {
    id: "ct10",
    slug: "groundwork-metaphysics-morals",
    title: "Groundwork of the Metaphysics of Morals",
    author: "Immanuel Kant",
    year: 1785,
    kind: "primary",
    summary:
      "Written in under five months in 1785 and deliberately unreadable, on Kant's own account, because he wanted it to be hard. One maxim is tested three ways — as a universal law, humanity as an end in itself, and the kingdom of ends — and the ground of obligation is the form of the act, never its consequence.",
    excerpt: "Act only on that maxim which you can at the same time will that it should become a universal law.",
    kingdomId: "kantian-citadel",
  },
  {
    id: "ct11",
    slug: "introduction-principles-morals",
    title: "An Introduction to the Principles of Morals and Legislation",
    author: "Jeremy Bentham",
    year: 1789,
    kind: "primary",
    summary:
      "Written largely between 1776 and 1780 and published in 1789, opening with a satirical catechism that asks whether any rule of utility could ever be used to justify anything at all. The phrase that outlived the book is the one in the title page: the greatest happiness of the greatest number.",
    excerpt: "the greatest happiness of the greatest number",
    kingdomId: "benthamite-foundry",
  },
  {
    id: "ct12",
    slug: "utilitarianism",
    title: "Utilitarianism",
    author: "John Stuart Mill",
    year: 1863,
    kind: "primary",
    summary:
      "Mill defends the intuitions Bentham's calculus was meant to replace: higher and lower pleasures, the justice principle that each person counts as one, and the liberty principle against the tyranny of the majority. Published the year after the Origin of Species, and much of the argument is a reply to the comparison.",
    excerpt:
      "Happiness is the only thing which is intrinsically valuable, and is, therefore, the only criterion of a right moral rule. (chapter 2)",
    kingdomId: "benthamite-foundry",
  },
  {
    id: "ct13",
    slug: "pragmatism",
    title: "Pragmatism",
    author: "John Dewey",
    year: 1907,
    kind: "primary",
    summary:
      "Eight lectures given at the Lowell Institute in November and December 1906 and published the following May. Dewey moves the question of meaning from reference to consequence and argues that the moral life is a method of inquiry rather than a code, which makes intellectual humility a methodological requirement.",
    excerpt: "The most important thing is to keep inquiry alive and lively. (lecture VIII)",
    kingdomId: "pragmatic-wharf",
  },
  {
    id: "ct14",
    slug: "tractatus-logico-philosophicus",
    title: "Tractatus Logico-Philosophicus",
    author: "Ludwig Wittgenstein",
    year: 1921,
    kind: "primary",
    summary:
      "Completed during the First World War and published without an authorial name, in the series Wittgenstein edited himself. It ends where most of what people want to say about ethics cannot be said in propositions at all — a limit-statement that is also the sharpest warning available about systems that are fluent and not intelligible.",
    excerpt:
      "What can be said at all can be said clearly; and whereof one cannot speak thereof one must be silent.",
    kingdomId: "pragmatic-wharf",
  },
  {
    id: "ct15",
    slug: "human-use-of-human-beings",
    title: "The Human Use of Human Beings",
    author: "Norbert Wiener",
    year: 1950,
    kind: "modern",
    summary:
      "Wiener applies the theory of feedback and control to law, politics and medicine, and argues that communication is more fundamental than command. The book that gave cybernetics its name in 1948 becomes, two years later, the founding text of the ethics of steering large systems without crushing what they steer. The excerpt below paraphrases the book rather than quoting it.",
    excerpt:
      "Cybernetics obliges us to view governance not as the affair of commanding but of designing systems that steer without coercion. (paraphrase of the 1950 book)",
    kingdomId: "longview-foundry",
  },
  {
    id: "ct16",
    slug: "computing-machinery-and-intelligence",
    title: "Computing Machinery and Intelligence",
    author: "Alan M. Turing",
    year: 1950,
    kind: "modern",
    summary:
      "Turing replaces 'can machines think' with a behavioural test, then spends most of the paper answering his own opponents and proposing a trainable machine with sensory apparatus, a system of registers, and deliberate moral engineering of what he calls slave-maid behaviour.",
    excerpt: "I propose to consider the question 'Can machines think?'",
    kingdomId: "pragmatic-wharf",
  },
  {
    id: "ct17",
    slug: "a-theory-of-justice",
    title: "A Theory of Justice",
    author: "John Rawls",
    year: 1971,
    kind: "modern",
    summary:
      "Rawls reconstructs distributive justice as a hypothetical contract made behind a veil of ignorance, and derives two principles — equal basic liberties first, then fair equality of opportunity and the difference principle. Published in 1971 and revised in 1979, it displaced utilitarianism as the default starting point for two decades. The excerpt below paraphrases the passage in section 3 rather than quoting a translation.",
    excerpt:
      "No party in the original position may know the place in society it will occupy, nor its class position or natural assets. (paraphrase of §3, 'The Veil of Ignorance')",
    kingdomId: "contractual-court",
  },
  {
    id: "ct18",
    slug: "what-we-owe-to-each-other",
    title: "What We Owe to Each Other",
    author: "T. M. Scanlon",
    year: 1998,
    kind: "modern",
    summary:
      "Twenty-five years in the making and out in 1998. Scanlon argues that what we owe each other is that no one could reasonably reject the principles by which we are all to be governed, which grounds obligation in interpersonal reasons rather than in a chooser maximising an objective. The excerpt below paraphrases the argument rather than quoting the book.",
    excerpt:
      "Scanlon grounds obligation in principles that no one could reasonably reject, offered to each person rather than adopted by a chooser on their behalf. (paraphrase of the 1998 book)",
    kingdomId: "contractual-court",
  },
  {
    id: "ct19",
    slug: "in-a-different-voice",
    title: "In a Different Voice",
    author: "Carol Gilligan",
    year: 1982,
    kind: "modern",
    summary:
      "Gilligan reads Kohlberg's own research data and argues that what his sample heard as a lower stage of moral reasoning is a different orientation organised around responsibility and relationship. Written into a field that had treated the hierarchy as a fact about development rather than about who was being studied. The excerpt below paraphrases the book's central claim rather than quoting it.",
    excerpt:
      "The care perspective takes as its starting point the relationships in which we live rather than the abstract principles we are supposed to abide by. (paraphrase of the 1982 book)",
    kingdomId: "care-weft",
  },
  {
    id: "ct20",
    slug: "ethics-of-care",
    title: "Ethics of Care",
    author: "Virginia Held",
    year: 2006,
    kind: "modern",
    summary:
      "Held develops the care perspective into a full ethical position and argues against the priority claim of justice: obligations arise inside particular relationships, are partial, and are not derivable from general principles. The book that made partiality respectable in moral theory. The excerpt below paraphrases Held's thesis rather than quoting the 2006 book.",
    excerpt:
      "The ethic of care rejects the idea that justice is the primary moral concept, insisting instead on relationship, responsibility and the particular. (paraphrase of the 2006 book)",
    kingdomId: "care-weft",
  },
  {
    id: "ct21",
    slug: "asilomar-ai-principles",
    title: "The Asilomar AI Principles",
    author: "Participants of the 1986 Asilomar conference on future technologies",
    year: 1986,
    kind: "declaration",
    summary:
      "Drafted over a few hours on the final day of a four-day 1986 conference on future technologies, and the first written set of research principles for advanced AI agreed by the researchers themselves. Its structure — general principles plus separately stated capability thresholds — is the structure of every frontier safety framework since. The excerpt below paraphrases the principles rather than reproducing the agreed wording.",
    excerpt:
      "Research in advanced AI should proceed only where there is a very high probability of benefit and a very low probability of harm. (paraphrase of the 1986 principles)",
    kingdomId: null,
  },
  {
    id: "ct22",
    slug: "animal-liberation",
    title: "Animal Liberation",
    author: "Peter Singer",
    year: 1975,
    kind: "modern",
    summary:
      "Singer applies the principle of equality to every sentient being and argues from utility rather than rights, which makes the book's conclusions stronger than a rights-based account would allow. It changed the terms of the factory-farming debate within a decade of publication. The excerpt below paraphrases the equality principle rather than quoting the 1975 book.",
    excerpt:
      "Singer's principle of equality applies to all sentient beings, not only to members of our own species. (paraphrase of the 1975 book)",
    kingdomId: "longview-foundry",
  },
  {
    id: "ct23",
    slug: "superintelligence",
    title: "Superintelligence: Paths, Dangers, Strategies",
    author: "Nick Bostrom",
    year: 2014,
    kind: "modern",
    summary:
      "Bostrom separates the question of how a superintelligence could arise from the question of what to do about it, and works through takeoff, the orthogonality thesis, and the instrumental convergence argument. The paperclip example and the value-alignment problem both come from here, and the book made the field's vocabulary. The excerpt below paraphrases the suddenness argument rather than quoting the 2014 book.",
    excerpt:
      "Superintelligence could arrive suddenly, through a single step in which an intelligence jumps far beyond human level. (paraphrase of the 2014 book)",
    kingdomId: "longview-foundry",
  },
  {
    id: "ct24",
    slug: "human-compatible",
    title: "Human Compatible: Artificial Intelligence and the Problem of Control",
    author: "Stuart Russell",
    year: 2019,
    kind: "modern",
    summary:
      "Russell argues that perfect value alignment is the wrong goal: systems are built by imperfect people, for imperfect objectives, and certainty about human values would be dangerous if it were achieved. The alternative is enough uncertainty about human preferences to keep a human in the loop as a genuine check. The excerpt below paraphrases the argument rather than quoting the 2019 book.",
    excerpt:
      "AI systems are built by people and optimised for objectives that are imperfect; we should therefore design them to be useful and safe rather than perfectly aligned. (paraphrase of the 2019 book)",
    kingdomId: "longview-foundry",
  },
  {
    id: "ct25",
    slug: "no-future-without-a-past",
    title: "No Future Without a Past",
    author: "Desmond Tutu",
    year: 2002,
    kind: "modern",
    summary:
      "Tutu argues from ubuntu — that a person becomes fully human through relationship with other people — to a politics of shared responsibility rather than blame. The formulation that matters for a governance question is the negative one: a future without the past that made it is not a future anyone can build on. The excerpt below paraphrases the essay rather than quoting it.",
    excerpt:
      "Ubuntu holds that a person is a person through other people, and that no human being is exempt from the obligation to care for the whole. (paraphrase of the 2002 essay)",
    kingdomId: "ubuntu-weave",
  },
  {
    id: "ct26",
    slug: "ethics-of-technology",
    title: "The Imperative of Responsibility (Das Prinzip Verantwortung)",
    author: "Hans Jonas",
    year: 1979,
    kind: "modern",
    summary:
      "Jonas argues that the ethic of responsibility must take precedence over the ethic of knowledge: the effects of an action are unpredictable, so the burden of proof sits with the actor, not with the critic. German original in 1979; the English translation appeared in 1984, a year after his death.",
    excerpt:
      "The imperative of responsibility requires that the effects of our actions be weighed across an indefinite future rather than only their immediate consequences. (paraphrase of the 1979 work)",
    kingdomId: "longview-foundry",
  },
  {
    id: "ct27",
    slug: "existentialism-is-a-humanism",
    title: "Existentialism Is a Humanism",
    author: "Jean-Paul Sartre",
    year: 1946,
    kind: "modern",
    summary:
      "Sartre wrote it as a lecture in Paris in October 1945 and it was published the following year; the title is the argument, and the defence of freedom as responsibility for one's own situation is the part that survives. He also argues here against the charge that existentialism places man above nature. The excerpt below paraphrases the lecture rather than quoting the 1946 text.",
    excerpt:
      "Existentialism is not a doctrine that concerns itself with the problems of metaphysics, and its aim is to bring man back into a situation for which he alone is responsible. (paraphrase of the 1946 lecture)",
    kingdomId: "existential-wilds",
  },
  {
    id: "ct28",
    slug: "the-rebel",
    title: "The Rebel",
    author: "Albert Camus",
    year: 1951,
    kind: "modern",
    summary:
      "Camus argues that rebellion commits itself to the future rather than denying the present, and that revolutions that stop at negation produce a new orthodoxy. The final section's account of rebellion without a cause is the bleakest thing he wrote, and it is the part anyone deploying a revolt should read first. The excerpt below paraphrases the argument rather than quoting the 1951 book.",
    excerpt:
      "Camus argues that true rebellion commits itself to the future instead of simply denying the present. (paraphrase of the 1951 book)",
    kingdomId: "existential-wilds",
  },
];