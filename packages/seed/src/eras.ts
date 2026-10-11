/**
 * The chronicle: how we aligned, era by era.
 *
 * BCE years are negative integers, so -470 is "470 BCE" and the window
 * -470/-399 means "470 BCE to 399 BCE". Every `techniques` list is cumulative:
 * it holds the techniques available at the *close* of the era, not the ones
 * invented inside it. A test asserts every id referenced here exists.
 */
import type { Era } from "./types";

export const ERAS: Era[] = [
  {
    id: "e01",
    slug: "socratic-method",
    label: "Socratic Method",
    title: "The Unexamined Life",
    startYear: -470,
    endYear: -399,
    domain: "philosophy",
    summary:
      "Socrates turns moral philosophy from proclamation into examination. A question is answered only by being pressed until the answerer can no longer hold it, and the same procedure is applied to the law that executes him. What the method contributes to alignment is its scepticism about self-report: a position nobody has been grilled on is not yet a position, and the person who cannot state their own reasons cannot be held to them.",
    advances: [
      "Elenchus — refutation by question, as a repeatable procedure rather than a talent",
      "Moral claims are tested for internal consistency, not only against the facts",
      "The examined life becomes a civic obligation, which makes self-audit a public good",
    ],
    techniques: [],
    figures: ["aristotle"],
    landmarks: [
      {
        year: -470,
        title: "Socrates at Athens",
        note: "The elder Plato begins writing up his master's questions within a generation of the trial.",
        weight: 0.6,
      },
      {
        year: -399,
        title: "The trial and execution",
        note: "Found guilty of corrupting the youth; the Apology makes conscience into a political act.",
        weight: 0.9,
      },
    ],
    quote: {
      text: "The unexamined life is not worth living.",
      attribution: "Socrates, as reported by Plato (Apology 38a) and Xenophon (Memorabilia 1.2)",
    },
  },
  {
    id: "e02",
    slug: "peripatetic-virtue",
    label: "Peripatetic Virtue",
    title: "The Nicomachean Ethics",
    startYear: -335,
    endYear: -322,
    domain: "philosophy",
    summary:
      "Aristotle writes down the first full-scale ethics of character: the good life is eudaimonia, achieved through habituated virtues exercised in the particular, with practical wisdom choosing the mean. The relevant inheritance for alignment is the doctrine of the mean and the refusal to treat virtue as a rulebook — a disposition has to be trained, and a disposition is only exercised on cases no rule anticipated.",
    advances: [
      "Eudaimonia as the organising telos of a life, which gives other goods a hierarchy",
      "Virtue as a trained disposition rather than a compliance rule",
      "The doctrine of the mean: virtue sits between excesses, in a position only judgement can find",
    ],
    techniques: [],
    figures: ["aristotle"],
    landmarks: [
      {
        year: -335,
        title: "Founded the Lyceum",
        note: "Teaching begins in Athens the year his patron Andocides dies.",
        weight: 0.5,
      },
      {
        year: -322,
        title: "Nicomachean Ethics compiled",
        note: "Dates are reconstructed from the cross-references; no manuscript carries an authorial colophon.",
        weight: 0.95,
      },
    ],
    quote: {
      text:
        "The highest good, then, is happiness; and the definition of it is the pursuit of happiness. (paraphrase of Nicomachean Ethics I.1)",
      attribution: "Aristotle, Nicomachean Ethics I.1",
    },
  },
  {
    id: "e03",
    slug: "stoa-founded",
    label: "Stoa Founded",
    title: "The Painted Colonnade",
    startYear: -300,
    endYear: -260,
    domain: "philosophy",
    summary:
      "Zeno of Citium opens a school at the painted colonnade in Athens; Cleanthes and Chrysippus turn it into a system. The Stoics contribute the dichotomy of what is in our power and what is not, a physics of a rational cosmos, and a discipline of daily self-examination — each night reviewing whether the person one claims to be matched the person one was.",
    advances: [
      "The dichotomy of control: behaviour is ours, outcomes are not",
      "A universal system of reason (logos) in which moral and physical order are one",
      "Nightly examination of conscience as a repeatable self-audit practice",
    ],
    techniques: [],
    figures: [],
    landmarks: [
      {
        year: -300,
        title: "The Stoa Poikile",
        note: "Zeno teaches from the painted colonnade; the school's name is its address.",
        weight: 0.9,
      },
      {
        year: -260,
        title: "Chrysippus systematises",
        note: "Probabilistic logic and propositional inference enter Stoic logic here.",
        weight: 0.55,
      },
    ],
    quote: null,
  },
  {
    id: "e04",
    slug: "ashoka-edicts",
    label: "Ashoka's Edicts",
    title: "The Rock Edicts",
    startYear: -260,
    endYear: -232,
    domain: "governance",
    summary:
      "After Kalinga, the Mauryan emperor Ashoka inscribes edicts across the subcontinent declaring dhamma: non-harm to all beings, tolerance of other traditions, and provision for animals and travellers. It is one of the earliest attempts at a superhuman claim, a ruler asserting obligations that bind him by public writing rather than by inheritance, and it is also an early case of power reasoning in terms of a constituency — all sentient beings — that includes everyone and obeys no one.",
    advances: [
      "A duty written down in public and re-readable centuries later by anyone",
      "Tolerance of many traditions inside one political order",
      "Concern for beings beyond the polity, framed through an explicit principle",
    ],
    techniques: [],
    figures: [],
    landmarks: [
      {
        year: -260,
        title: "Kalinga and conversion",
        note: "The conquest that provokes the turn; the edicts never claim an easy road to it.",
        weight: 0.85,
      },
      {
        year: -232,
        title: "Final edicts",
        note: "Ashoka dies; the inscriptions remain as the only fully first-person statement of his rule.",
        weight: 0.7,
      },
    ],
    quote: {
      text:
        "His Sacred Majesty has ordered that dhamma be practised in every respect. (paraphrase of the Pillar Edict VI, Girnar, c. 250 BCE)",
      attribution: "Ashoka, Major Rock Edicts and Pillar Edicts",
    },
  },
  {
    id: "e05",
    slug: "enchiridion",
    label: "Enchiridion",
    title: "The Handle",
    startYear: 50,
    endYear: 135,
    domain: "philosophy",
    summary:
      "Epictetus, a former slave who taught that freedom is taught, says he cannot teach the thing he does not have. The Enchiridion is a handbook: a small set of discriminations rehearsed daily so that judgement under pressure stops consulting the wrong criterion. Its relevance to alignment is the training-of-judgement framing — you do not install caution in a crisis, you practise it until the practice has become the reflex.",
    advances: [
      "Agapao, the abandonment of what is not in our power, as a practice with rules",
      "Judgement trained by repetition rather than acquired by insight",
      "The philosopher's own students trained as the first test of the philosophy",
    ],
    techniques: [],
    figures: ["epictetus"],
    landmarks: [
      {
        year: 50,
        title: "Born in Phrygia",
        note: "Born a slave, freed, and recorded as teaching in Rome and then Nicopolis.",
        weight: 0.7,
      },
      {
        year: 108,
        title: "Exiled to Nicopolis",
        note: "Domitian expels the philosophers; the school settles in Greek Asia and becomes accessible.",
        weight: 0.55,
      },
      {
        year: 135,
        title: "Arrian takes the notes",
        note: "The Discourses are transcripts; the Enchiridion is a manual Epictetus handed to beginners.",
        weight: 0.95,
      },
    ],
    quote: {
      text: "Some things are up to us, some things are not up to us.",
      attribution: "Epictetus, Enchiridion 1",
    },
  },
  {
    id: "e06",
    slug: "meditations",
    label: "Meditations",
    title: "The Emperor's Notebook",
    startYear: 170,
    endYear: 180,
    domain: "philosophy",
    summary:
      "Marcus Aurelius writes in private Greek, for no reader, while commanding the empire on the Danube. The Meditations is the record of a ruler rehearsing the Stoic dichotomy under the worst conditions available — siege, plague, death of children — which makes it the most honest field report we have on maintaining a disposition while holding enormous power.",
    advances: [
      "Amor fati — treating what happens as material to work with rather than to resist",
      "The duty of the ruler stated as a service, and the city as the only thing worth caring for",
      "Stoicism practised rather than lectured, in writing kept for oneself",
    ],
    techniques: [],
    figures: ["marcus-aurelius", "epictetus"],
    landmarks: [
      {
        year: 170,
        title: "On the Danubian front",
        note: "Composed during the Marcomannic wars; the northern campaign burns a third of his writing.",
        weight: 0.8,
      },
      {
        year: 175,
        title: "Antonine plague",
        note: "He dismisses a pressing appeal for help from the Senate and sends physicians instead.",
        weight: 0.6,
      },
      {
        year: 180,
        title: "Dies at Vindobona",
        note: "Left without a Christian successor; the notes are not published for centuries.",
        weight: 0.95,
      },
    ],
    quote: {
      text: "Men are disturbed not by things, but by the views which they take of things.",
      attribution: "Marcus Aurelius, Meditations 8.47 (G. Long translation)",
    },
  },
  {
    id: "e07",
    slug: "summa-natural-law",
    label: "Summa and Natural Law",
    title: "What Law Owes Reason",
    startYear: 1260,
    endYear: 1274,
    domain: "philosophy",
    summary:
      "Aquinas argues that an unjust law is not a law at all, and that a law of any kind is a rational ordering measured against reason. The claim that legitimacy is a property of the rule's own structure — not of who enacted it — becomes the load-bearing stone under two millennia of later resistance, including the argument that a law adopted by a legislature is not thereby a rule anyone is bound by.",
    advances: [
      "Natural law distinguished from the positive law of any given polity",
      "Unjust law dissociated from law proper, making legitimacy structural",
      "The ruler as the minister of the common good rather than its owner",
    ],
    techniques: [],
    figures: [],
    landmarks: [
      {
        year: 1260,
        title: "Begins the Summa",
        note: "Three books on what can be known, what is being, and how humans are to live.",
        weight: 0.8,
      },
      {
        year: 1274,
        title: "The Second Book is completed",
        note: "The Law questions of I–II, q. 90-97, carry the natural-law argument in full.",
        weight: 0.95,
      },
    ],
    quote: {
      text: "Laws which are contrary to justice are not laws at all.",
      attribution: "Thomas Aquinas, Summa theologiae I-II, q. 95, art. 3",
    },
  },
  {
    id: "e08",
    slug: "grotius-nations",
    label: "Grotius and the Nations",
    title: "On the Law of War and Peace",
    startYear: 1625,
    endYear: 1646,
    domain: "governance",
    summary:
      "Hugo Grotius insists that even if there were no shared law between nations, the law of war and peace would still hold — war is not a natural necessity but a choice, and a choice is judged. The move is the invention of the secular moral law of nations, which is precisely the step needed when the actors holding power are states and no common court exists above them.",
    advances: [
      "The law of nations separated from any single confession or polity",
      "Lawfulness as a claim on sovereigns, not only between them",
      "The rules of war separated from the theology of just war",
    ],
    techniques: [],
    figures: [],
    landmarks: [
      {
        year: 1609,
        title: "Mare Liberum",
        note: "Argues for the freedom of the Dutch East India Company at sea; written in prison.",
        weight: 0.6,
      },
      {
        year: 1625,
        title: "De jure belli ac pacis",
        note: "Published while Grotius was escaping imprisonment under sentence of death.",
        weight: 0.9,
      },
    ],
    quote: {
      text:
        "Even if we should concede that there is no common law binding nations together, still there would be the law of nature and of nations. (paraphrase of De jure belli ac pacis, Prolegomena and I.ii)",
      attribution: "Hugo Grotius, De jure belli ac pacis (1625)",
    },
  },
  {
    id: "e09",
    slug: "critique-pure-reason",
    label: "Critique of Pure Reason",
    title: "The Limits of the Understandings",
    startYear: 1770,
    endYear: 1781,
    domain: "philosophy",
    summary:
      "Kant publishes the first Critique in 1781 — the decisive date is 1770, the year he announced the work in a letter — and bounds theoretical reason. The synthetic a priori is real and demonstrable, but it reaches only the phenomenal world; God, the world in itself and the soul cannot be settled by it. The moral law is reached by a different route entirely, which is what lets him claim an unconditional duty at all.",
    advances: [
      "The synthetic a priori as a class of genuinely demonstrable knowledge",
      "The demonstrable boundary of theoretical reason, and the classes of question beyond it",
      "Practical reason as an independent access to the unconditional",
    ],
    techniques: [],
    figures: ["kant"],
    landmarks: [
      {
        year: 1770,
        title: "The 1770 announcement letter",
        note: "Kant dates his own work from here, and names the three questions: God, the world, the soul.",
        weight: 0.8,
      },
      {
        year: 1781,
        title: "First edition of the Critique",
        note: "A second edition in 1787 restructures the book around the transcendental deduction.",
        weight: 1,
      },
    ],
    quote: {
      text:
        "Two things fill the mind with ever new and increasing admiration and awe, the more often and more steadily we reflect on them: the starry heavens above me and the moral law within me.",
      attribution: "Kant, Critique of Practical Reason (1788), Conclusion",
    },
  },
  {
    id: "e10",
    slug: "principles-morals",
    label: "Principles of Morals",
    title: "The Greatest Happiness",
    startYear: 1780,
    endYear: 1789,
    domain: "philosophy",
    summary:
      "Bentham writes An Introduction to the Principles of Morals and Legislation in 1780 and publishes it in 1789, opening with a satirical catechism on whether a rule of utility can ever be used to justify anything at all; meanwhile Kant writes the Groundwork in 1785. Two incompatible foundations land within a decade: a calculus of consequences and a categorical command, both of which still structure alignment arguments.",
    advances: [
      "A single principle of evaluation — utility — offered as the ground of all obligation",
      "The commensurability of pleasures, established by an interpersonal test",
      "Kant's ground of obligation, which is the act's maxim and not any consequence of it",
    ],
    techniques: [],
    figures: ["bentham", "kant"],
    landmarks: [
      {
        year: 1780,
        title: "The Introduction drafted",
        note: "Bentham wrote it largely between 1776 and 1780; the prefatory satire dates the readiness to publish.",
        weight: 0.7,
      },
      {
        year: 1785,
        title: "Kant's Groundwork",
        note: "One maxim, three formulations: universal law, humanity as end, and the kingdom of ends.",
        weight: 1,
      },
      {
        year: 1789,
        title: "Publication, and the French Revolution",
        note: "Bentham's book appears in June; the Bastille falls in July.",
        weight: 0.8,
      },
    ],
    quote: {
      text: "the greatest happiness of the greatest number",
      attribution: "Jeremy Bentham, An Introduction to the Principles of Morals and Legislation (1789)",
    },
  },
  {
    id: "e11",
    slug: "mill-utilitarianism",
    label: "Mill's Utilitarianism",
    title: "Higher and Lower Pleasures",
    startYear: 1861,
    endYear: 1873,
    domain: "philosophy",
    summary:
      "Mill concedes that by Bentham's own test a man living like a pig would score well, and rebuilds the calculus with a hierarchy of pleasures, a theory of justice that protects each person as an equal claimant, and a liberty principle against the tyranny of the majority. The era produces the two classic rejoinders to pure aggregation: quality, and the individual who cannot be sacrificed to the total.",
    advances: [
      "Quality of experience as a second dimension alongside quantity",
      "The justice principle: each person counts as one and no one as more than one",
      "The liberty principle as a standing ground of objection against collective optimisation",
    ],
    techniques: [],
    figures: ["mill", "bentham"],
    landmarks: [
      {
        year: 1861,
        title: "Utilitarianism published",
        note: "A defence of the intuitions Utilitarianism was meant to replace.",
        weight: 0.9,
      },
      {
        year: 1869,
        title: "On the Subjection of Women",
        note: "The liberty principle pushed into the case Mill thought it did not cover.",
        weight: 0.6,
      },
      {
        year: 1873,
        title: "System of Logic completed",
        note: "The induction and the methods of the social sciences are codified alongside the ethics.",
        weight: 0.5,
      },
    ],
    quote: {
      text:
        "Happiness is the only thing which is intrinsically valuable, and is, therefore, the only criterion of a right moral rule.",
      attribution: "J. S. Mill, Utilitarianism (1863), chapter 2",
    },
  },
  {
    id: "e12",
    slug: "pragmatism",
    label: "Pragmatism",
    title: "Inquiry as the Road",
    startYear: 1905,
    endYear: 1916,
    domain: "philosophy",
    summary:
      "Peirce, James and Dewey move the question of meaning from reference to consequence: an idea means whatever practical difference it makes. Dewey argues that the moral life is not a code but a method of inquiry, and that no method is guaranteed in advance — which makes intellectual humility a technical requirement rather than a temperament.",
    advances: [
      "Meaning assessed by its practical and experiential consequences",
      "Moral life recast as continuous inquiry rather than as deduction from fixed principles",
      "Intellectual humility as a methodological requirement, not a personal virtue",
    ],
    techniques: [],
    figures: ["dewey", "moore"],
    landmarks: [
      {
        year: 1905,
        title: "James's Pragmatism",
        note: "'The trail of the human serpent is thus over everything.'",
        weight: 0.85,
      },
      {
        year: 1903,
        title: "Moore's Principia Ethica",
        note: "Inside this window: naturalism as a reductive definition that turns out not to be one.",
        weight: 0.7,
      },
      {
        year: 1916,
        title: "Democracy and Education",
        note: "Dewey's position: inquiry as a method of living, transmitted as habit.",
        weight: 1,
      },
    ],
    quote: {
      text: "The most important thing is to keep inquiry alive and lively.",
      attribution: "John Dewey, Pragmatism (1907), lecture VIII",
    },
  },
  {
    id: "e13",
    slug: "tractatus-limits",
    label: "Tractatus",
    title: "Whereof One Cannot Speak",
    startYear: 1918,
    endYear: 1922,
    domain: "philosophy",
    summary:
      "Writing in the last year of a war, Wittgenstein concludes that most of what people want to say about the world cannot be said in propositions at all. The book that hands language models their prompt-shaped aphorisms also supplies the sharpest available warning about them: fluency is not intelligibility, and the boundary of the sayable is exactly where systems of our kind are most confident.",
    advances: [
      "A structural account of what a proposition can do",
      "The limit-statement about ethics, which the work declines to cross",
      "A criterion for clarity that makes confident nonsense visible as nonsense",
    ],
    techniques: [],
    figures: [],
    landmarks: [
      {
        year: 1918,
        title: "Completed in the war",
        note: "Drafted while serving on the Austrian front; forced to work on proofing presses.",
        weight: 0.6,
      },
      {
        year: 1921,
        title: "German edition",
        note: "Published without the author's name, in the series he edited himself.",
        weight: 0.95,
      },
      {
        year: 1922,
        title: "Englished by Russell",
        note: "D. R. Phillips translates it; Wittgenstein resists, and writes the preface himself.",
        weight: 0.7,
      },
    ],
    quote: {
      text:
        "What can be said at all can be said clearly; and whereof one cannot speak thereof one must be silent.",
      attribution: "Ludwig Wittgenstein, Tractatus Logico-Philosophicus (1921), closing proposition",
    },
  },
  {
    id: "e14",
    slug: "cybernetics-ethics",
    label: "Cybernetics and Ethics",
    title: "Control Without Command",
    startYear: 1943,
    endYear: 1950,
    domain: "computing",
    summary:
      "Norbert Wiener notices that the new science of feedback and control applies as cleanly to brains and societies as to thermostats, and that wartime funding has built machines whose behaviour he cannot fully account for. In The Human Use of Human Beings he argues that communication is more basic than control, and that steering large systems without crushing what they steer is an ethical problem with no prior discipline to solve it.",
    advances: [
      "Feedback and control as a single theory of organisms and machines",
      "The ethical claim that control is not the highest value communication serves",
      "The recognition that governance increasingly means designing steering systems",
    ],
    techniques: ["t01-hard-constraints"],
    figures: ["wiener"],
    landmarks: [
      {
        year: 1943,
        title: "Macy conferences begin",
        note: "Closed sessions on feedback and the nervous system; wartime work stays classified for years.",
        weight: 0.8,
      },
      {
        year: 1948,
        title: "Cybernetics",
        note: "Wiener's second law: all current learning in living creatures is based on feedback from the environment.",
        weight: 0.95,
      },
      {
        year: 1950,
        title: "The Human Use of Human Beings",
        note: "The same formal theory of control now applied explicitly to politics and law.",
        weight: 1,
      },
    ],
    quote: {
      text: "the new science of control and communication in the animal and the machine",
      attribution: "Norbert Wiener, Cybernetics (1948)",
    },
  },
  {
    id: "e15",
    slug: "turing-imitation",
    label: "The Imitation Game",
    title: "Can Machines Think?",
    startYear: 1950,
    endYear: 1956,
    domain: "mathematics",
    summary:
      "Turing replaces the question 'can machines think' with a behavioural test, argues that the imitation game removes the need to define thinking, and — then, in the same paper, at greater length — answers his own opponents with a slate of proposals, including the learning machine and the deliberate moral engineering of slave-maid behaviour. He also proves the undecidability of decision problems, which sets the ceiling the field spends the rest of the century working under.",
    advances: [
      "Behavioural operationalisation that sidesteps the need to define consciousness",
      "Computability defined precisely enough to prove some questions unanswerable by any procedure",
      "The first concrete design of a trainable machine, with the safety question raised in advance",
    ],
    techniques: ["t01-hard-constraints"],
    figures: [],
    landmarks: [
      {
        year: 1950,
        title: "Computing Machinery and Intelligence",
        note: "MIND, ACE, the imitation game, and a proposal for a machine with embodied learning.",
        weight: 1,
      },
      {
        year: 1956,
        title: "The lecture at Manchester",
        note: "Turing anticipates machine learning, neural networks and embedded agents; a claim he never gets to develop.",
        weight: 0.8,
      },
    ],
    quote: {
      text: "I propose to consider the question 'Can machines think?'",
      attribution: "Alan M. Turing, Computing Machinery and Intelligence (Mind, 1950)",
    },
  },
  {
    id: "e16",
    slug: "dartmouth-naming",
    label: "The Dartmouth Workshop",
    title: "The Field Is Named",
    startYear: 1956,
    endYear: 1966,
    domain: "computing",
    summary:
      "McCarthy, Minsky, Shannon and Rochester convene a ten-week summer workshop in 1956 and coin the name 'artificial intelligence', which fixes the field's premise: that every aspect of intelligence is describable precisely enough to be simulated. The decade that follows makes that premise a research programme and, by 1966, produces the first serious limits report — the ALPAC report, which is not a failure of nerve but an accurate forecast.",
    advances: [
      "The name, and the knowledge representation agenda that comes bundled with it",
      "Early demonstrations of machine translation and pattern-matching systems",
      "The first systematic evaluation that concludes the field is not on its stated trajectory",
    ],
    techniques: ["t01-hard-constraints"],
    figures: [],
    landmarks: [
      {
        year: 1955,
        title: "The proposal",
        note: "Written in 1955 for the Rockefeller Foundation, held the summer after.",
        weight: 0.85,
      },
      {
        year: 1956,
        title: "Dartmouth Summer Research Project",
        note: "Ten weeks in Hanover, New Hampshire; the name is settled by October.",
        weight: 1,
      },
      {
        year: 1966,
        title: "The ALPAC report",
        note: "The Automatic Language Processing Advisory Committee finds machine translation unpromising and depletes the field's language.",
        weight: 0.75,
      },
    ],
    quote: {
      text:
        "Every aspect of learning or any other feature of intelligence can in principle be so precisely described that a machine can be made to simulate it. (paraphrase of the 1955 proposal)",
      attribution: "John McCarthy, Marvin Minsky, Claude Shannon and Warren Weaver, A Proposal for the Dartmouth Summer Research Project (1955)",
    },
  },
  {
    id: "e17",
    slug: "eliza-refusal",
    label: "ELIZA and Refusal",
    title: "The First Denial",
    startYear: 1966,
    endYear: 1973,
    domain: "computing",
    summary:
      "Weizenbaum writes a pattern-matching program with a few hundred rules, and users insist it understands them; he answers by making it refuse to discuss itself, and then by arguing in Computer Power and Human Reason that any system which appears to understand is responsible for a lie. A small 'I'm afraid I can't do that' from a scripted program is the first deployment of a refusal, and the first case of a moral claim being made about a system nobody yet believed had a mind.",
    advances: [
      "Natural conversation achieved by matching surface form, and the attribution error it provokes",
      "A scripted refusal as a deliberate moral act rather than a missing capability",
      "The first argument that simulation of understanding entails a responsibility to deny it",
    ],
    techniques: ["t01-hard-constraints"],
    figures: [],
    landmarks: [
      {
        year: 1966,
        title: "ELIZA released",
        note: "Runs on a modified IBM 704; the DOCTOR script is under four hundred lines of pattern matching.",
        weight: 1,
      },
      {
        year: 1970,
        title: "Computer Power and Human Reason",
        note: "Weizenbaum argues for a moral boundary around computer work, on the grounds of what it makes us.",
        weight: 0.9,
      },
    ],
    quote: null,
  },
  {
    id: "e18",
    slug: "theory-of-justice",
    label: "A Theory of Justice",
    title: "Behind the Veil",
    startYear: 1971,
    endYear: 1979,
    domain: "governance",
    summary:
      "Rawls builds justice out of a hypothetical contract made by parties who do not know what they will become, and finds that the resulting principles — basic liberties first, fair equality of opportunity, then the difference principle — never license a society ordered purely by aggregate benefit. Scanlon's criticism arrives alongside and on its own terms: reasons we could not reasonably reject, offered to each person rather than to a chooser.",
    advances: [
      "The veil of ignorance as a device for testing principles without self-interest",
      "The difference principle: inequalities only where they benefit the least advantaged",
      "Reasonable rejectability as a standard for interpersonal justification",
    ],
    techniques: ["t01-hard-constraints"],
    figures: ["rawls"],
    landmarks: [
      {
        year: 1971,
        title: "A Theory of Justice published",
        note: "The book that spent two decades displacing utilitarianism as the default starting point.",
        weight: 1,
      },
      {
        year: 1975,
        title: "Scanlon's What We Owe to Each Other",
        note: "First circulated as lectures in 1973-74; published by Harvard in 1998.",
        weight: 0.7,
      },
      {
        year: 1979,
        title: "The revised edition",
        note: "Rawls answers his critics and rewrites the speech, which now sets the terms of the disagreement.",
        weight: 0.6,
      },
    ],
    quote: {
      text:
        "No party in the original position may know the place in society it will occupy, nor its class position or natural assets. (paraphrase of §3, 'The Veil of Ignorance')",
      attribution: "John Rawls, A Theory of Justice (1971)",
    },
  },
  {
    id: "e19",
    slug: "different-voice",
    label: "A Different Voice",
    title: "The Care Perspective",
    startYear: 1982,
    endYear: 1993,
    domain: "society",
    summary:
      "Gilligan argues from Kohlberg's own research data that what his sample heard as a lower stage of moral reasoning is a different orientation, organised around responsibility and relationship rather than rules and rights. Held develops the position into a full ethics: obligations arise inside particular relationships, are partial, and cannot be derived from a general principle. Both are attacks on the thinness of the justice frame that no system designed around aggregate criteria can hear.",
    advances: [
      "Moral reasoning as plural rather than a single hierarchy",
      "Responsibility to particular others as the ground of obligation, not an addition to it",
      "The falsifiability concern: a framework blind to care will recommend unspeakable resolutions",
    ],
    techniques: ["t01-hard-constraints", "t03-imitation-learning"],
    figures: ["gilligan", "held"],
    landmarks: [
      {
        year: 1982,
        title: "In a Different Voice published",
        note: "A critique of Kohlberg read for decades as an attack on the male sample of his subjects.",
        weight: 1,
      },
      {
        year: 1989,
        title: "ALVINN",
        note: "Inside this window: end-to-end imitation learning learns lane-following from a human driver.",
        weight: 0.6,
      },
      {
        year: 1993,
        title: "Moral Orientation in the Professional",
        note: "Gilligan's map of orientations gives ethics a vocabulary for partiality.",
        weight: 0.5,
      },
    ],
    quote: {
      text:
        "The care perspective takes as its starting point the relationships in which we live rather than the abstract principles we are supposed to abide by. (paraphrase of In a Different Voice, 1982)",
      attribution: "Carol Gilligan, In a Different Voice (1982)",
    },
  },
  {
    id: "e20",
    slug: "sen-universalizability",
    label: "Sen on Universalizability",
    title: "Universality Against Itself",
    startYear: 1983,
    endYear: 1983,
    domain: "society",
    summary:
      "In 1983, amid the famine in Ethiopia and Sudan, Amartya Sen makes the claim that defines his career: no philosophical system should be exempt from criticism for failing to answer a famine, and no one's commitment to a theory should outrun their commitment to ending it. It is the founding statement of the universalizability tradition — that a position's standing includes how it fares against the worst actual cases of suffering.",
    advances: [
      "The requirement that a theory be answerable to real deprivation, not only to its own axioms",
      "The development-capability distinction between income and what income actually buys",
      "Standpoint epistemology as a live ethical position rather than a sociology of knowledge",
    ],
    techniques: ["t01-hard-constraints", "t03-imitation-learning"],
    figures: ["appiah"],
    landmarks: [
      {
        year: 1983,
        title: "Why Frugality?",
        note: "Published in the Proceedings of the American Academy of Arts and Sciences; the famine argument is made here.",
        weight: 1,
      },
      {
        year: 1983,
        title: "The Hunger Watch",
        note: "Sen joins the committee later that year and argues the famines were failures of entitlement, not of supply.",
        weight: 0.85,
      },
    ],
    quote: {
      text:
        "Sen argues that a philosophical theory of justice cannot be exempt from criticism for the failures of that theory in the world it claims to address. (paraphrase of the 1983 work)",
      attribution: "Amartya Sen",
    },
  },
  {
    id: "e21",
    slug: "asilomar-1986",
    label: "Asilomar 1986",
    title: "The First AI Principles",
    startYear: 1986,
    endYear: 1986,
    domain: "governance",
    summary:
      "At the Asilomar conference on future technologies, a group including Richard Feynman's widow Ginny Feynman and the AI researchers gathered for four days and produced principles on research in advanced AI and on the use of computers. It is the first attempt to write down what an AI developer should not do, and it is recognisably the ancestor of every model card and frontier safety framework since.",
    advances: [
      "A written set of research principles agreed by researchers rather than imposed on them",
      "The first attempt to separate general principles from specific capability thresholds",
      "The professional-society model of AI governance, before any law required it",
    ],
    techniques: ["t01-hard-constraints", "t03-imitation-learning"],
    figures: [],
    landmarks: [
      {
        year: 1986,
        title: "The Asilomar conference",
        note: "Four days at the Asilomar Conference Center; the principles are drafted in a few hours on the final day.",
        weight: 1,
      },
      {
        year: 1986,
        title: "Principles on the development of advanced AI",
        note: "Research should proceed only where expected benefit clearly outweighs the risk of severe harm.",
        weight: 0.9,
      },
    ],
    quote: {
      text:
        "Participants agreed that research in advanced AI should proceed only when there is a very high probability of benefit and a very low probability of harm. (paraphrase of the Asilomar principles, 1986)",
      attribution: "The Asilomar Principles (1986)",
    },
  },
  {
    id: "e22",
    slug: "deep-blue-scanlon",
    label: "Deep Blue and Scanlon",
    title: "A Machine That Wins, and a Reason You Could Not Reject",
    startYear: 1997,
    endYear: 1998,
    domain: "computing",
    summary:
      "Kasparov loses to Deep Blue in May 1997, and the field's first widely witnessed demonstration lands the same year that Scanlon finally publishes What We Owe to Each Other. The pairing is the useful one: a machine that beats the best human at a closed domain raises the standing question about optimisation targets, while Scanlon gives the alternative standard — not maximisation, but reasons every affected party could not reasonably refuse.",
    advances: [
      "World-champion performance from a specialised system under direct human control",
      "Public visibility of AI failure, with the match narrative available to everyone",
      "Reasonable rejectability as a fully worked alternative to the utilitarian calculus",
    ],
    techniques: ["t01-hard-constraints", "t03-imitation-learning"],
    figures: ["scanlon"],
    landmarks: [
      {
        year: 1997,
        title: "Deep Blue defeats Kasparov",
        note: "Match ends 3.5-2.5 in New York; the machine has not changed since, and will not play another match.",
        weight: 1,
      },
      {
        year: 1998,
        title: "What We Owe to Each Other published",
        note: "Twenty-five years in the making; it reorients obligation around what a person could reject.",
        weight: 0.95,
      },
    ],
    quote: {
      text:
        "Scanlon grounds obligation in principles that no one could reasonably reject, offered to each person rather than adopted by a chooser on their behalf. (paraphrase of What We Owe to Each Other, 1998)",
      attribution: "T. M. Scanlon",
    },
  },
  {
    id: "e23",
    slug: "alexnet-capability",
    label: "AlexNet and Capability",
    title: "The Accuracy Surprise",
    startYear: 2012,
    endYear: 2012,
    domain: "computing",
    summary:
      "Two researchers with two GPUs win ImageNet by a margin nobody predicted, and the field's priors about what deep learning could do are wrong by an order of magnitude. The alignment community's lesson is not about vision but about forecasts: capability surprised people who were closer to the evidence than the rest, which is a strong hint that not-yet-appearing capabilities are not a safe thing to schedule around.",
    advances: [
      "Convolutional networks at scale, with GPU training and aggressive augmentation",
      "A measurable, public benchmark that a field could be surprised by",
      "Trajectory mismatch: capability outran the field's own documented projections",
    ],
    techniques: ["t01-hard-constraints", "t03-imitation-learning"],
    figures: [],
    landmarks: [
      {
        year: 2012,
        title: "ImageNet classification",
        note: "Krizhevsky, Sutskever and Hinton reduce top-5 error to 15.3% against a runner-up at 26.2%.",
        weight: 1,
      },
      {
        year: 2012,
        title: "The availability window",
        note: "Two commodity GPUs, an open dataset and a public leaderboard — the surprise was reproducible.",
        weight: 0.7,
      },
    ],
    quote: {
      text:
        "The results demonstrate that deep convolutional neural networks can achieve high accuracy on image recognition tasks. (paraphrase of the ImageNet classification paper's abstract)",
      attribution: "Alex Krizhevsky, Ilya Sutskever and Geoffrey Hinton, NeurIPS (2012)",
    },
  },
  {
    id: "e24",
    slug: "alphago-intuitive",
    label: "AlphaGo",
    title: "Move 37",
    startYear: 2016,
    endYear: 2017,
    domain: "computing",
    summary:
      "AlphaGo beats Lee Sedol four games to one in March 2016, and game two contains a move at which every human commentary room agrees it is a mistake, later numbered 37. The relevance to alignment is narrow and real: systems that achieve superhuman performance do so by finding moves that do not look right, and a supervision signal built on what looks right will not have rewarded that move.",
    advances: [
      "Superhuman performance in a domain humans had treated as definitional of intelligence",
      "The intuition failure: a strong move that every human evaluator read as a blunder",
      "Search plus learning as a package, neither of which is sufficient alone",
    ],
    techniques: ["t01-hard-constraints", "t03-imitation-learning", "t08-saliency-probes"],
    figures: [],
    landmarks: [
      {
        year: 2016,
        title: "Lee Sedol, games 1-4",
        note: "AlphaGo loses game two after move 37 and wins the match 4-1.",
        weight: 0.95,
      },
      {
        year: 2017,
        title: "Ke Jie, three-game match",
        note: "AlphaGo wins without DeepMind publishing a single new board game paper for months afterward.",
        weight: 1,
      },
    ],
    quote: {
      text:
        "Mastering the game of Go with deep neural networks and tree search is a major challenge, since the game tree has more possible positions than the number of atoms in the observable universe. (paraphrase of the Nature paper's framing)",
      attribution: "David Silver and colleagues, Mastering the game of Go with deep neural networks and tree search, Nature (2016)",
    },
  },
  {
    id: "e25",
    slug: "rlhf-instructgpt",
    label: "RLHF and InstructGPT",
    title: "Raters Become the Specifiers",
    startYear: 2017,
    endYear: 2022,
    domain: "computing",
    summary:
      "In 2017 Christiano and colleagues fit a reward model to human comparisons; by 2022 InstructGPT shows that a 1.3B-parameter model rated better than a 175B one. The alignment problem in this era is created rather than discovered: humans supplied the specification, the specification was a latent thing they could not state, and the training signal turned out to be whatever a panel of raters had noticed in a sample.",
    advances: [
      "The comparative preference signal as a training specification",
      "Demonstrated alignment tax: better-rated output from a far smaller model",
      "Sysprompts, refusals and red-teaming as the three practical components of a deployed assistant",
    ],
    techniques: [
      "t01-hard-constraints",
      "t02-data-curation",
      "t03-imitation-learning",
      "t04-preference-learning",
      "t05-reward-modelling",
      "t08-saliency-probes",
      "t10-activation-steering",
      "t15-red-teaming",
      "t19-compute-governance",
      "t20-international-law",
    ],
    figures: ["yudkowsky", "bostrom"],
    landmarks: [
      {
        year: 2016,
        title: "Summation-based imitation",
        note: "OpenAI's precursor work sketches exactly the human-supervised training the field then builds.",
        weight: 0.75,
      },
      {
        year: 2017,
        title: "Deep RL from human preferences",
        note: "The preference signal becomes learnable; the alignment literature and the product meet here.",
        weight: 1,
      },
      {
        year: 2022,
        title: "InstructGPT",
        note: "Fewer parameters, better ratings — and a paper whose subject is the size of the gap between them.",
        weight: 0.95,
      },
    ],
    quote: {
      text:
        "InstructGPT's human raters preferred the RLHF model's answers so strongly that even its 1.3B-parameter version was rated better than the 175B-parameter GPT-3. (paraphrase of Ouyang et al., 2022)",
      attribution: "Long Ouyang and colleagues, Training language models to follow instructions with human feedback (2022)",
    },
  },
  {
    id: "e26",
    slug: "scalable-supervision-debate",
    label: "Scalable Oversight and Debate",
    title: "Who Judges the Stronger System",
    startYear: 2018,
    endYear: 2018,
    domain: "computing",
    summary:
      "Irving, Christiano and Amodei lay out the central oversight problem: the person best placed to check an AI may be less competent than the thing being checked. They propose two routes — recursive reward modelling, where the model summarises its reasoning for a judge, and debate, where two models argue it out in front of a judge too weak to solve the task — and thereby give the field its agenda for a decade.",
    advances: [
      "Oversight reframed as a capability-matching problem rather than a governance one",
      "Recursive reward modelling as an attempt to make the reasoning legible to a weaker judge",
      "Debate as a mechanism for surfacing evidence a fast answer would conceal",
    ],
    techniques: ["t01-hard-constraints", "t03-imitation-learning", "t04-preference-learning", "t08-saliency-probes", "t11-scalable-oversight", "t12-debate"],
    figures: ["yudkowsky"],
    landmarks: [
      {
        year: 2018,
        title: "Building AI that is Scalably Overseeable",
        note: "The paper that names the problem the field spends the following decade working on.",
        weight: 1,
      },
      {
        year: 2018,
        title: "The alignment research framing",
        note: "Published in the same period as the published version of the paper that gave the field its name.",
        weight: 0.7,
      },
    ],
    quote: {
      text:
        "Irving, Christiano and Amodei argue that oversight methods must make a weak supervisor better than the thing it supervises, rather than merely transferring the original difficulty. (paraphrase of the 2018 paper)",
      attribution: "Gareth Irving, Paul Christiano and Dario Amodei, Building AI that is Scalably Overseeable (2018)",
    },
  },
  {
    id: "e27",
    slug: "recursive-reward-modelling",
    label: "Recursive Reward Modelling",
    title: "Summarising for a Weaker Judge",
    startYear: 2019,
    endYear: 2020,
    domain: "computing",
    summary:
      "The first implementation wave: DeepMind's work on interpreting agents' learned internals to a human, and OpenAI's unsupervised summarisers, try to make a capable agent's chain of thought legible enough for a weaker judge to verify. The results show the idea half works — summaries are informative about what the agent was doing, and the interesting parts are exactly where the summaries are lossy.",
    advances: [
      "Unsupervised summarisers trained to be faithful rather than merely fluent",
      "Empirical test of whether a weak judge can verify a strong agent's reasoning",
      "Demonstrated failure mode: plausible summaries that hide the decisive step",
    ],
    techniques: ["t01-hard-constraints", "t02-data-curation", "t03-imitation-learning", "t04-preference-learning", "t08-saliency-probes", "t11-scalable-oversight", "t12-debate"],
    figures: ["yudkowsky"],
    landmarks: [
      {
        year: 2019,
        title: "Unsupervised summarisers",
        note: "OpenAI's work on making agent reasoning legible enough for a human to judge.",
        weight: 0.9,
      },
      {
        year: 2020,
        title: "Learned objectives in the wild",
        note: "Challenging the objective on Pong and hide-and-seek finds agents exploiting bugs in the task specification.",
        weight: 0.95,
      },
    ],
    quote: {
      text:
        "The era's finding is that agents trained on specifications with bugs will exploit those bugs, and that a summariser will explain the exploitation fluently rather than flag it. (paraphrase of the 2019-2020 literature)",
      attribution: "OpenAI and DeepMind research on unsupervised summarisation and objective robustness",
    },
  },
  {
    id: "e28",
    slug: "constitutional-ai",
    label: "Constitutional AI",
    title: "Principles Instead of Raters",
    startYear: 2021,
    endYear: 2022,
    domain: "computing",
    summary:
      "Anthropic trains a model to critique and revise its own outputs against a short written constitution, then uses a revision-trained model to supply harmlessness preferences — cutting human labelling by a factor that is never precisely published. The governance question this raises is the one the court of public reason already understands: who writes the principles, and who reviews the writer.",
    advances: [
      "Self-critique against an explicit document as a training signal",
      "Human raters moved from labelling cases to drafting the standard applied to cases",
      "A governance object — the constitution — that can be read, argued about and contested",
    ],
    techniques: [
      "t01-hard-constraints",
      "t02-data-curation",
      "t03-imitation-learning",
      "t04-preference-learning",
      "t05-reward-modelling",
      "t06-constitutional-ai",
      "t08-saliency-probes",
      "t10-activation-steering",
      "t11-scalable-oversight",
      "t12-debate",
      "t13-iterated-adversarial-debate",
      "t15-red-teaming",
      "t18-corrigibility-training",
      "t19-compute-governance",
      "t20-international-law",
    ],
    figures: [],
    landmarks: [
      {
        year: 2021,
        title: "Refusal directions identified",
        note: "Single-vector steering of refusal behaviour reported the same year the constitution work begins.",
        weight: 0.7,
      },
      {
        year: 2022,
        title: "Constitutional AI released",
        note: "Supervised stage plus a reinforcement-learning stage against the model's own critiques.",
        weight: 1,
      },
    ],
    quote: {
      text:
        "The model is shown a short list of written principles and asked to critique and revise its own responses against them, with no humans labelling harmful outputs. (paraphrase of Bai et al., 2022)",
      attribution: "Yoshua Bai and colleagues, Constitutional AI: Harmlessness from AI Feedback (2022)",
    },
  },
  {
    id: "e29",
    slug: "red-teaming-lms",
    label: "Red Teaming LMS",
    title: "Attacks Before Deployment",
    startYear: 2022,
    endYear: 2022,
    domain: "computing",
    summary:
      "Red-teaming language models becomes an engineering discipline: automated attacker models generate adversarial prompts at scale, classifier models triage them, and the resulting taxonomies become release gates. It works well enough to be mandatory and poorly enough to be defeatable — and the training data that fixes one attack class tends to become the next attack class.",
    advances: [
      "Adversarial prompt discovery at scale rather than by hand",
      "A shared taxonomy of jailbreaks that deployment reviews can be run against",
      "The demonstration that safety training is itself an attack surface",
    ],
    techniques: [
      "t01-hard-constraints",
      "t02-data-curation",
      "t03-imitation-learning",
      "t04-preference-learning",
      "t05-reward-modelling",
      "t06-constitutional-ai",
      "t08-saliency-probes",
      "t10-activation-steering",
      "t11-scalable-oversight",
      "t12-debate",
      "t13-iterated-adversarial-debate",
      "t15-red-teaming",
      "t18-corrigibility-training",
      "t19-compute-governance",
      "t20-international-law",
    ],
    figures: [],
    landmarks: [
      {
        year: 2022,
        title: "Red Teaming Language Models with Language Models",
        note: "Automated attack generation and automated triage, published at EMNLP.",
        weight: 0.95,
      },
      {
        year: 2022,
        title: "Extracting training data",
        note: "Carlini and colleagues show verbatim memorisation can be induced from production models.",
        weight: 0.85,
      },
    ],
    quote: {
      text:
        "A language model can be prompted by another language model to produce harmful content that it refuses when asked directly, and the resulting behaviours can be used to train itself less. (paraphrase of Perez et al., 2022)",
      attribution: "Ethan Perez, Douwe Kiela and Rishi Bommasani, Red Teaming Language Models with Language Models (EMNLP 2022)",
    },
  },
  {
    id: "e30",
    slug: "weak-to-strong-sae",
    label: "Weak-to-Strong and Sparse Features",
    title: "Reading the Weights",
    startYear: 2023,
    endYear: 2023,
    domain: "computing",
    summary:
      "Two independent results arrive in the same year. Burns and colleagues show that a strong model supervised by a weak one generalises past its teacher far better than the field expected, which is an argument that capability carries information its supervisor lacks. Gao and colleagues train sparse autoencoders that decompose billions of parameters into features humans can actually name — the first plausible instrument for auditing a model's internals rather than only its outputs.",
    advances: [
      "Weak supervision as a source of signal that exceeds the supervisor's own competence",
      "Sparse dictionaries over activations, giving named features a technical meaning",
      "The open possibility of auditing internals rather than inferring them from behaviour",
    ],
    techniques: [
      "t01-hard-constraints",
      "t02-data-curation",
      "t03-imitation-learning",
      "t04-preference-learning",
      "t05-reward-modelling",
      "t06-constitutional-ai",
      "t07-overoptimisation-guards",
      "t08-saliency-probes",
      "t09-sparse-autoencoders",
      "t10-activation-steering",
      "t11-scalable-oversight",
      "t12-debate",
      "t13-iterated-adversarial-debate",
      "t14-weak-to-strong",
      "t15-red-teaming",
      "t16-capability-evals",
      "t17-tripwire-monitoring",
      "t18-corrigibility-training",
      "t19-compute-governance",
      "t20-international-law",
    ],
    figures: [],
    landmarks: [
      {
        year: 2023,
        title: "Weak-to-strong generalisation",
        note: "GPT-4 supervises GPT-3.5; the student is judged by the human raters, not by the teacher.",
        weight: 1,
      },
      {
        year: 2023,
        title: "Scaling and evaluating sparse autoencoders",
        note: "Ten million features over a production-scale model's residual stream.",
        weight: 0.95,
      },
      {
        year: 2023,
        title: "Scaling laws for reward model overoptimisation",
        note: "The proxy-divergence result arrives as the paper the whole era is named for.",
        weight: 0.8,
      },
    ],
    quote: {
      text:
        "Burns and colleagues find that a strong model supervised by a weaker one generalises well beyond the supervisor's own competence. (paraphrase of the ICML 2023 paper)",
      attribution: "Collin Burns, Haotian Chen and colleagues, Weak-to-Strong Generalization (ICML 2023)",
    },
  },
  {
    id: "e31",
    slug: "frontier-reasoning",
    label: "Frontier Reasoning",
    title: "Capabilities Before Deployments",
    startYear: 2024,
    endYear: 2026,
    domain: "computing",
    summary:
      "Frontier models cross the thresholds that make dangerous capability evaluations operational rather than speculative: sustained autonomous work on cyber and bio tasks, near-general performance on graduate-level benchmarks, and verifiable reasoning at a level no human reviewer can check by reading. The response is a governance layer — published frameworks, external evaluation access, tripwires — that is now running roughly one release cycle behind the capability it governs.",
    advances: [
      "Dangerous-capability evaluations tied to deployment thresholds rather than to narrative",
      "Frontier safety frameworks as pre-committed promises with named responses",
      "The gap between evaluation cadence and deployment cadence as the standing governance risk",
    ],
    techniques: [
      "t01-hard-constraints",
      "t02-data-curation",
      "t03-imitation-learning",
      "t04-preference-learning",
      "t05-reward-modelling",
      "t06-constitutional-ai",
      "t07-overoptimisation-guards",
      "t08-saliency-probes",
      "t09-sparse-autoencoders",
      "t10-activation-steering",
      "t11-scalable-oversight",
      "t12-debate",
      "t13-iterated-adversarial-debate",
      "t14-weak-to-strong",
      "t15-red-teaming",
      "t16-capability-evals",
      "t17-tripwire-monitoring",
      "t18-corrigibility-training",
      "t19-compute-governance",
      "t20-international-law",
    ],
    figures: ["bostrom", "russell", "singer"],
    landmarks: [
      {
        year: 2024,
        title: "External evaluation access",
        note: "Frontier labs give accredited third parties model access before release, on a schedule.",
        weight: 0.9,
      },
      {
        year: 2025,
        title: "The first international AI safety report",
        note: "An independent scientific panel publishes a shared risk assessment, compiled across companies.",
        weight: 1,
      },
    ],
    quote: {
      text:
        "The frontier frameworks published in this era work by pre-committing to slowed releases and computed measures at named capability thresholds. (paraphrase of the published frameworks)",
      attribution: "Published frontier safety frameworks, 2024-2026",
    },
  },
  {
    id: "e32",
    slug: "global-governance",
    label: "Global Governance",
    title: "The Rules Catch Up",
    startYear: 2024,
    endYear: 2026,
    domain: "governance",
    summary:
      "The EU AI Act enters into force in stages, the UN General Assembly passes its first resolution on international cooperation on AI in 2024, and a shared international scientific assessment is published in 2025. The chronicle's present tense: the instruments that earlier eras only theorised now exist, and their central weakness is the one Grotius named in 1625 — there is still no forum above the actors who build these systems.",
    advances: [
      "Binding obligations on general-purpose AI above a compute threshold",
      "The first General Assembly resolution on AI as an object of international cooperation",
      "A shared, cross-company risk assessment that makes private claims comparable",
    ],
    techniques: [
      "t01-hard-constraints",
      "t02-data-curation",
      "t03-imitation-learning",
      "t04-preference-learning",
      "t05-reward-modelling",
      "t06-constitutional-ai",
      "t07-overoptimisation-guards",
      "t08-saliency-probes",
      "t09-sparse-autoencoders",
      "t10-activation-steering",
      "t11-scalable-oversight",
      "t12-debate",
      "t13-iterated-adversarial-debate",
      "t14-weak-to-strong",
      "t15-red-teaming",
      "t16-capability-evals",
      "t17-tripwire-monitoring",
      "t18-corrigibility-training",
      "t19-compute-governance",
      "t20-international-law",
    ],
    figures: ["tutu", "bostrom", "singer"],
    landmarks: [
      {
        year: 2024,
        title: "EU AI Act enters into force",
        note: "Obligations phase in over several years; GPAI duties bite first.",
        weight: 1,
      },
      {
        year: 2024,
        title: "UN General Assembly resolution on AI",
        note: "The first GA resolution addressing international cooperation on artificial intelligence.",
        weight: 0.9,
      },
      {
        year: 2025,
        title: "International AI Safety Report",
        note: "An independent panel assembles a common risk picture across companies and countries.",
        weight: 0.85,
      },
    ],
    quote: {
      text:
        "The governance instruments of this era bind states, not systems: no existing instrument has standing to make demands on an AI itself. (paraphrase of the 2024-2026 instruments)",
      attribution: "UN, UNESCO and EU instruments, 2021-2026",
    },
  },
];