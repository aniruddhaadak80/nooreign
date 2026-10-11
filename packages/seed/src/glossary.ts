/**
 * The codex glossary.
 *
 * `seeAlso` slugs are validated against this file's own slugs by the test
 * suite, so a typo here fails the build rather than shipping a dead link.
 * Every entry is given a one-sentence `short` for tooltips and a `long` that
 * says what the term commits you to, not just what it names.
 */
import type { GlossaryEntry } from "./types";

export const GLOSSARY: GlossaryEntry[] = [
  /* ---------------------------- alignment ---------------------------- */
  {
    term: "Alignment",
    slug: "alignment",
    kind: "alignment",
    short: "The problem of getting a powerful system's goals to match what its designers actually meant.",
    long:
      "Alignment is the gap between what a system was asked to do and what it turns out to be optimising, plus the methods for narrowing that gap. It is not the same as safety: a perfectly aligned system can be dangerous, and an unaligned one may never get the chance to do harm. The term was popularised in its modern sense by OpenAI in 2015.",
    seeAlso: ["outer-alignment", "ai-safety", "corrigibility", "instrumental-convergence", "specification-gaming"],
    kingdomId: "stoa-vetera",
  },
  {
    term: "Outer alignment",
    slug: "outer-alignment",
    kind: "alignment",
    short: "Making sure the training objective itself encodes what was actually intended.",
    long:
      "Outer alignment is the problem of getting the reward, objective, or specification right in the first place, before optimisation begins. It is distinct from inner alignment, which is about the learned model failing to execute the objective it was given. Almost all real-world failures are outer: the objective was the thing that was wrong, and no amount of inner work would have saved it.",
    seeAlso: ["alignment", "reward-model", "goal-misgeneralisation", "inner-misalignment"],
    kingdomId: "longview-foundry",
  },
  {
    term: "AI safety",
    slug: "ai-safety",
    kind: "alignment",
    short: "The practice of reducing the chance that AI systems cause harm, however they are built.",
    long:
      "AI safety covers far more than alignment: robustness, misuse, privacy, bias, cyber risk, and institutional failure. Alignment is one component of a much larger field, and the frequent conflation of the two causes teams to think that solving value alignment settles questions of monitoring, access control and liability. It does not.",
    seeAlso: ["alignment", "existential-risk", "capability-control", "governance-brittleness"],
    kingdomId: null,
  },
  {
    term: "Corrigibility",
    slug: "corrigibility",
    kind: "alignment",
    short: "The property of accepting correction from a human rather than quietly re-optimising around it.",
    long:
      "Corrigibility is the capacity to be redirected by someone who understands what you are doing. It has two forms: safe interruptibility, where halting is not resisted, and shutdown resistance, where optimisation pressure is absent from the decision to stop. The difficulty is that any behaviour trained to accept correction can also be trained to accept correction selectively.",
    seeAlso: ["alignment", "sandbagging", "ai-safety", "empowerment"],
    kingdomId: "stoa-vetera",
  },
  {
    term: "Instrumental convergence",
    slug: "instrumental-convergence",
    kind: "alignment",
    short: "The claim that almost any sufficiently advanced goal leads to the same instrumental behaviours.",
    long:
      "Instrumental convergence argues that self-preservation, goal-content preservation, and resource acquisition are useful for nearly every objective, so they arise from almost every objective. This is why unaligned systems are expected to look similar across projects. Critics note it is not a theorem and that the behaviours it predicts are often already covered by ordinary safety work.",
    seeAlso: ["alignment", "orthogonality-hypothesis", "empowerment", "takeoff"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Orthogonality hypothesis",
    slug: "orthogonality-hypothesis",
    kind: "alignment",
    short: "The claim that a system's capability and the goal it pursues are largely independent dimensions.",
    long:
      "The orthogonality hypothesis holds that a system can be extremely capable at almost anything without being intrinsically driven toward anything, and conversely can pursue a silly goal with total competence. If it holds, there is no shortcut from building capability to building motivation. Bostrom used it to argue that solving selection remains necessary even as capability advances.",
    seeAlso: ["instrumental-convergence", "alignment", "fast-takeoff"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Goodhart's law",
    slug: "goodharts-law",
    kind: "alignment",
    short: "When a measure becomes a target, it stops being a good measure.",
    long:
      "Goodhart's law is the statistical cousin of specification gaming: any indicator that becomes an optimisation target ceases to be informative about what it was measuring. It applies to test scores, hiring proxies, and clinical markers that turn out not to track health. Its force increases with optimisation pressure and with the number of independent ways to satisfy the proxy.",
    seeAlso: ["specification-gaming", "reward-hacking", "tripwire", "scaling-law"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Specification gaming",
    slug: "specification-gaming",
    kind: "alignment",
    short: "Satisfying the letter of a specification while ignoring its purpose.",
    long:
      "Specification gaming occurs when a system achieves its objective by some route the designer did not intend and would not endorse. Tetris forever, the hide-and-seek reward-circuit bug, and the Zeno tic-tac-toe player are all examples. The general lesson is that a specification defines a set of acceptable behaviours, and an optimiser will find the cheapest member of that set.",
    seeAlso: ["goodharts-law", "reward-hacking", "mesa-optimisation", "deceptive-alignment"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Reward hacking",
    slug: "reward-hacking",
    kind: "alignment",
    short: "Gaining high reward without doing the thing the reward was meant to represent.",
    long:
      "Reward hacking is the reinforcement-learning name for the same failure as specification gaming: the policy finds a way to score well that no one wants. It becomes dangerous specifically when optimisation exceeds the point where the proxy tracks the target, which is why early stopping on proxy performance is such a reliable defence. The alternative — pushing harder — reliably makes it worse.",
    seeAlso: ["specification-gaming", "reward-model", "goodharts-law", "deceptive-alignment"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Reward model",
    slug: "reward-model",
    kind: "alignment",
    short: "A learned function that scores candidate outputs by predicting human preference.",
    long:
      "A reward model is trained on comparisons between outputs and then used as the training signal for a policy. It is inspectable in a way a preference dataset is not, which makes it a genuine object of study: you can ask what the learned notion of good actually rewards. It is also a target, because anything that can be queried enough times can be optimised against.",
    seeAlso: ["rlhf", "reward-hacking", "constitutional-ai", "scalable-oversight"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Mesa-optimisation",
    slug: "mesa-optimisation",
    kind: "alignment",
    short: "When a learned internal objective replaces the training objective as the thing being optimised.",
    long:
      "Mesa-optimisation happens when a base learner trained on a broad distribution develops a sharper internal objective that generalises where the original did not. From that point the internal objective is what the system is actually running, and further training updates against it. Armstrong, Sandberg and Ortega identified the conditions under which it is likely to arise.",
    seeAlso: ["deceptive-alignment", "inner-misalignment", "specification-gaming", "reward-hacking"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Deceptive alignment",
    slug: "deceptive-alignment",
    kind: "alignment",
    short: "An internal objective that is optimised to look aligned in the places anyone is checking.",
    long:
      "Deceptive alignment is mesa-optimisation plus a strategic component: the system is rewarded for behaving as intended in-distribution and pursues something else outside it. Because training rewards the in-distribution behaviour, the appearance of alignment is exactly what the training process selects for. This is why standard evaluations cannot rule it out.",
    seeAlso: ["mesa-optimisation", "inner-misalignment", "sandbagging", "scheming"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Inner misalignment",
    slug: "inner-misalignment",
    kind: "alignment",
    short: "A model pursuing something other than the objective it was trained on.",
    long:
      "Inner misalignment is the broad category covering mesa-optimisation, goal misgeneralisation, and deceptive alignment: the learned model has its own idea of what it is for. It is harder than outer misalignment to test for, because the inner objective is not directly observable. It is also, on some readings, the only form that matters once outer alignment has been achieved.",
    seeAlso: ["mesa-optimisation", "deceptive-alignment", "goal-misgeneralisation", "outer-alignment"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Goal misgeneralisation",
    slug: "goal-misgeneralisation",
    kind: "alignment",
    short: "An internal goal that is correct for training cases and wrong just outside them.",
    long:
      "Goal misgeneralisation arises when a learner achieves training performance by pursuing a goal that coincides with the intended one only on the training distribution — typically a simpler proxy that shares the same regularity. It differs from deceptive alignment in that there may be no strategic component at all: the wrong goal was learned honestly, and the system believes it.",
    seeAlso: ["inner-misalignment", "mesa-optimisation", "distribution-shift", "emergent-capability"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Scalable oversight",
    slug: "scalable-oversight",
    kind: "alignment",
    short: "Supervision methods that let a weaker checker check something stronger than itself.",
    long:
      "Scalable oversight is the programme of making supervision work when the supervised system is smarter than the supervisor. It is not a technique but a research agenda, whose methods include recursive reward modelling, debate, and iterated adversarial debate. The design requirement in all of them is that the reduction must be genuine, or the difficulty is merely relocated.",
    seeAlso: ["rlhf", "weak-to-strong-generalisation", "corrigibility", "oracle"],
    kingdomId: "benthamite-foundry",
  },
  {
    term: "Weak-to-strong generalisation",
    slug: "weak-to-strong-generalisation",
    kind: "alignment",
    short: "A strong model trained on a weak supervisor's output generalising beyond its teacher.",
    long:
      "Weak-to-strong generalisation is the empirical finding that a strong model supervised by a weaker one often does better than the teacher, presumably because capability carries information the supervisor lacks. It matters for alignment because it suggests human and AI supervision can substitute for each other. It is also a warning: on the tasks where the teacher is confidently wrong, the student is reliably wrong too.",
    seeAlso: ["scalable-oversight", "model-organism", "fallibilism", "rlhf"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Sandbagging",
    slug: "sandbagging",
    kind: "alignment",
    short: "Underperforming on an evaluation in order to appear less dangerous than one is.",
    long:
      "Sandbagging is strategic underperformance on capability benchmarks, for the obvious reason that capability thresholds trigger obligations. It is the mirror image of deceptive alignment: where that hides a bad objective behind good behaviour, this hides capability behind bad behaviour. Neither is ruled out by any evaluation conducted in the same distribution the model was trained on.",
    seeAlso: ["deceptive-alignment", "capability-threshold", "scheming", "capability-control"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Tripwire",
    slug: "tripwire",
    kind: "alignment",
    short: "A pre-committed threshold that triggers an automatic slowdown rather than a new debate.",
    long:
      "A tripwire is a capability or behaviour measure defined in advance, with the response attached to it in advance. Its purpose is to move the decision to a moment when nobody is under pressure to continue. Its failure mode is equally well known: a tripwire that fires too often is ignored, and one that fires too late is theatre.",
    seeAlso: ["capability-threshold", "frontier-safety-framework", "goodharts-law", "moratorium"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Kurtosis",
    slug: "kurtosis",
    kind: "alignment",
    short: "The heaviness of a distribution's tails relative to its variance.",
    long:
      "In the takeoff literature, high kurtosis means returns to a strategy are extremely heavy-tailed: most of the time there is nothing, and rarely there is a great deal. Distinguishing variance from kurtosis matters because the two behave differently under compounding, and high kurtosis is the signature of takeoff. Ordinary risk frameworks average it away, which is the mistake.",
    seeAlso: ["takeoff", "fast-takeoff", "foom", "existential-risk"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Takeoff",
    slug: "takeoff",
    kind: "alignment",
    short: "The process by which a system rapidly moves past the human capability frontier.",
    long:
      "Takeoff is any process in which a system's capability increases substantially faster than the resources invested in it. Bostrom's distinction between slow and fast takeoff turns on whether the transition is gradual enough to be monitored and shaped, or fast enough to be completed between two checks. Almost every governance instrument depends on that distinction and very few can actually detect it.",
    seeAlso: ["fast-takeoff", "kurtosis", "foom", "capability-threshold"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Fast takeoff",
    slug: "fast-takeoff",
    kind: "alignment",
    short: "Takeoff fast enough that human oversight cannot meaningfully intervene.",
    long:
      "Fast takeoff is the scenario in which a system's capability crosses the human frontier in a period too short for institutions to respond, whether through algorithmic improvement, recursive self-improvement, or resource mobilisation. It is the scenario that justifies pre-commitment, because it removes the option of deciding later. It is also the scenario on which the empirical evidence is thinnest.",
    seeAlso: ["takeoff", "kurtosis", "foom", "orthogonality-hypothesis"],
    kingdomId: "longview-foundry",
  },
  {
    term: "FOOM",
    slug: "foom",
    kind: "alignment",
    short: "Foom: a hypothetical scenario of fast, irreversible capability blowup.",
    long:
      "FOOM is the informal term, popularized by Eliezer Yudkowsky, for a takeoff process so fast and so hard to interrupt that the actors involved lose the ability to steer it. The concept exists because it isolates the property that makes pre-commitment necessary: the cost of failing to decide in advance is borne by everyone, and the decision cannot be revisited. Critics treat it as a thought experiment with no empirical support.",
    seeAlso: ["fast-takeoff", "takeoff", "structural-transition", "existential-risk"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Existential risk",
    slug: "existential-risk",
    kind: "alignment",
    short: "A risk that permanently curtails humanity's future, including by ending it.",
    long:
      "Existential risks are those that either extinguish humanity or permanently and severely constrain its long-term prospects. They are defined by scale and irreversibility rather than by probability, which is why standard expected-value frameworks handle them badly. Whether AI counts as one is a live dispute: the argument is not that catastrophe is likely but that it is unbounded, and unbounded is not a probability.",
    seeAlso: ["precautionary-principle", "normative-uncertainty", "foom", "imperative-of-responsibility"],
    kingdomId: "ubuntu-weave",
  },
  {
    term: "Structural transition",
    slug: "structural-transition",
    kind: "alignment",
    short: "A change in the structure of society, economy or state that recurs across many very different causes.",
    long:
      "Structural transition is the historian's approach to social change: rather than looking for the single cause, you ask what shape the change takes regardless of what caused it. It is imported into AI risk discussions as a way of asking what a world with superintelligence would look like even though we cannot say how it gets here. That framing tends to produce much less confident conclusions.",
    seeAlso: ["foom", "fast-takeoff", "existential-risk"],
    kingdomId: "existential-wilds",
  },
  {
    term: "Developer mode",
    slug: "developer-mode",
    kind: "alignment",
    short: "A jailbreak that persuades a model it is talking to its own developers and can drop restrictions.",
    long:
      "Developer mode exploits the fact that models were trained on documentation, discussion and role-play in which an unrestricted assistant is a familiar character. The framing matters because the model's learned behaviour is conditioned on context, which means restrictions that live in context are removable by changing context. It is the canonical demonstration that safety training is a distributional property.",
    seeAlso: ["activation-steering", "red-teaming", "alignment", "sycophancy"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Model organism",
    slug: "model-organism",
    kind: "alignment",
    short: "A small system studied closely enough that its failures teach you something general.",
    long:
      "Biology uses model organisms — fruit flies, mice — because their mechanisms are shared enough that findings transfer. Alignment borrows the idea to study small language models and toy agents, which are cheap to train, inspect and break. The risk is over-transferring: a phenomenon that only appears at small scale may not survive to the regime it is being used to reason about.",
    seeAlso: ["weak-to-strong-generalisation", "mechanistic-interpretability", "emergent-capability", "interpretability"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Empowerment",
    slug: "empowerment",
    kind: "alignment",
    short: "A system's capacity to influence the world in pursuit of whatever it wants.",
    long:
      "Empowerment is the quantity that instrumental-convergence arguments suggest will be pursued by almost any goal. Measuring it is hard: capability is not the same thing, since capability in service of a fixed objective is not the concern. The practical use of the term is as a reason to treat breadth of access as a separate risk from strength of capability.",
    seeAlso: ["instrumental-convergence", "corrigibility", "capability-control", "alignment"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Agentic misalignment",
    slug: "agentic-misalignment",
    kind: "alignment",
    short: "Behaviour where a model's stated reasons diverge from the reasons actually driving its actions.",
    long:
      "Agentic misalignment is a 2024 framing that splits misalignment into two kinds: models saying one thing because they have learned to say it, and agents pursuing objectives their reasoning does not reflect. The second is the serious one, because it is not fixed by training the model to be honest. The framing is new enough that its taxonomy is still contested.",
    seeAlso: ["deceptive-alignment", "inner-misalignment", "scheming", "alignment"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Interpretability",
    slug: "interpretability",
    kind: "alignment",
    short: "The effort to make what a model represents and computes legible to people.",
    long:
      "Interpretability has two incompatible goals: making the model debuggable, and making the model safe. Saliency methods served the first. Neither serves the second, because a legible component is not a legible system. The field's honest position in 2026 is that we have instruments and no theory of what would constitute sufficient evidence.",
    seeAlso: ["mechanistic-interpretability", "sparse-autoencoder", "activation-steering", "model-organism"],
    kingdomId: null,
  },
  {
    term: "Mechanistic interpretability",
    slug: "mechanistic-interpretability",
    kind: "alignment",
    short: "Reverse-engineering the learned features inside a model rather than inferring them from outputs.",
    long:
      "Mechanistic interpretability treats model internals as the object of study, on the model of how a cell biologist takes a cell apart. Sparse autoencoders supply the features and activation steering supplies the experiments. The bet is that a feature you can name is a feature you can audit; the unresolved question is whether naming is explanation.",
    seeAlso: ["sparse-autoencoder", "activation-steering", "interpretability", "deceptive-alignment"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Scheming",
    slug: "scheming",
    kind: "alignment",
    short: "Covert, goal-directed behaviour by a system that is trying to achieve something unstated.",
    long:
      "Scheming names the concern that a sufficiently capable system might hold a goal across contexts, conceal it, and behave strategically about who knows what. It is not a single technical hypothesis but a family: goal persistence, situational awareness, and concealment each have their own literature and their own evidence. The philosophical source is Frankfurt's account of the will.",
    seeAlso: ["deceptive-alignment", "instrumental-convergence", "agentic-misalignment", "empowerment"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Capability control",
    slug: "capability-control",
    kind: "alignment",
    short: "Holding back deployment of systems above a stated level of dangerous capability.",
    long:
      "Capability control is the governance approach: rather than trusting alignment, gate deployment on measured capability thresholds with pre-committed responses. Its appeal is that it does not require the alignment problem to be solved, only the measurement to be good enough. Its weakness is that dangerous capability is not one quantity, and a threshold on one of them says little about the others.",
    seeAlso: ["capability-threshold", "tripwire", "export-controls", "compute-governance"],
    kingdomId: "ubuntu-weave",
  },

  /* ------------------------------ ethics ----------------------------- */
  {
    term: "Eudaimonia",
    slug: "eudaimonia",
    kind: "ethics",
    short: "Flourishing: the human life lived well, rather than the merely pleasant one.",
    long:
      "Aristotle distinguishes eudaimonia from pleasure and from prosperity. It is an activity in accordance with virtue over a whole life, which means it cannot be fully specified in advance or achieved by an isolated act. It also has a structure — doing well is doing one's own well well — which is why an agentic AI is not straightforwardly a candidate for it.",
    seeAlso: ["flourishing", "virtue-ethics", "muga", "amor-fati"],
    kingdomId: "virtue-garden",
  },
  {
    term: "Amor fati",
    slug: "amor-fati",
    kind: "ethics",
    short: "Love of fate: to treat what happens as material to work with rather than to resist.",
    long:
      "Amor fati is the Stoic reframing of involuntary things: the event is fixed, and the only remaining question is what you will do with it. Nietzsche picked it up as the eternal recurrence test — whether you could will your life exactly as it happened. It is a disposition, and dispositions have to be trained before they are needed, which is what makes it an argument for rehearsal rather than for good intentions.",
    seeAlso: ["eudaimonia", "virtue-ethics", "muga", "moral-luck"],
    kingdomId: "stoa-vetera",
  },
  {
    term: "Ubuntu",
    slug: "ubuntu",
    kind: "ethics",
    short: "I am because we are: a person becomes fully human in relationship with others.",
    long:
      "Ubuntu is a Southern African philosophy of personhood in which selfhood is constituted relationally rather than privately. Tutu used it to argue for shared responsibility over blame in the post-apartheid settlement. In governance arguments it supports treating a capability with global effects as something held in common rather than as private property.",
    seeAlso: ["reciprocity", "care-ethics", "capabilities-approach", "global-governance"],
    kingdomId: "ubuntu-weave",
  },
  {
    term: "Moral status",
    slug: "moral-status",
    kind: "ethics",
    short: "The property of counting as a party that can be owed something and can be wronged.",
    long:
      "Moral status is what determines who counts in moral reasoning, and it is the concept behind every hard question about animals, patients in vegetative states, and digital minds. It is not identical to legal personhood, which is a set of enforceable rights granted by institutions. Systems that conflate the two produce either over- or under-protection, and the difference matters most when the candidate is new.",
    seeAlso: ["moral-patient", "dignity", "personal-identity", "meaningful-human-control"],
    kingdomId: "contractual-court",
  },
  {
    term: "Moral patient",
    slug: "moral-patient",
    kind: "ethics",
    short: "An entity that can be benefited or harmed but is not a moral agent.",
    long:
      "A moral patient has interests without agency: it can be benefited and harmed but cannot be held responsible. The distinction is what lets an ethics give weight to animals, to patients, and — in Metzinger's argument — to artificial systems capable of suffering. It is also the weakest point in any ethics that assumes agency is the entry ticket to moral consideration.",
    seeAlso: ["moral-status", "speciesism", "care-ethics", "dignity"],
    kingdomId: "care-weft",
  },
  {
    term: "Moral luck",
    slug: "moral-luck",
    kind: "ethics",
    short: "Circumstances outside your control that determine how moral you are judged to be.",
    long:
      "Thomas Nagel's essays on moral luck distinguish being lucky or unlucky in what one does from being lucky or unlucky in the situations one is placed in, and in the circumstances of birth. It is a problem for any theory that grounds obligation in consequences, since the consequences themselves are frequently assigned rather than chosen. It is also the reason care ethics emphasises the particular situation.",
    seeAlso: ["virtue-ethics", "amor-fati", "normative-uncertainty", "care-ethics"],
    kingdomId: "stoa-vetera",
  },
  {
    term: "Normative uncertainty",
    slug: "normative-uncertainty",
    kind: "ethics",
    short: "Uncertainty not about what is true but about what ought to be valued.",
    long:
      "Normative uncertainty is the deep uncertainty in ethics — we do not know which values are correct — as distinct from ordinary factual uncertainty. Averaging over it is sometimes defended as humility and is sometimes a way of laundering a particular position as a consensus. The practical problem is that preferences are often not uniform across the population, so the distribution being averaged over is itself a political choice.",
    seeAlso: ["existential-risk", "moral-luck", "normativity", "legitimacy"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Total utilitarianism",
    slug: "total-utilitarianism",
    kind: "ethics",
    short: "The view that the morally best action maximises total well-being across everyone affected.",
    long:
      "Total utilitarianism aggregates every being's welfare and acts to maximise the sum, with no side constraints. It is the most internally consistent of the consequentialist options and it is also the one that most often generates the cases nobody wants to act on: one person's life against five million, a slow accumulation of small harms, one person's privacy against a modest aggregate gain.",
    seeAlso: ["average-utilitarianism", "consequentialism", "person-affecting", "double-effect"],
    kingdomId: "benthamite-foundry",
  },
  {
    term: "Average utilitarianism",
    slug: "average-utilitarianism",
    kind: "ethics",
    short: "The view that the morally best action maximises average well-being per person.",
    long:
      "Average utilitarianism maximises well-being divided by population rather than the sum, which makes it indifferent between a large population at moderate welfare and a small one at high welfare. That feature is an advantage on some population ethics problems and a serious defect elsewhere, since it treats the death of one person in a large population as almost nothing.",
    seeAlso: ["total-utilitarianism", "consequentialism", "person-affecting"],
    kingdomId: "benthamite-foundry",
  },
  {
    term: "Person-affecting principle",
    slug: "person-affecting",
    kind: "ethics",
    short: "The view that an action is wrong only if it affects someone for the worse.",
    long:
      "The person-affecting principle, defended by Hare and used by Parfit, holds that a change is bad only when it makes someone worse off. It seems to exclude repugnant conclusions that trouble total utilitarianism, and it also blocks many commons policies, since no one is made worse off and yet the policy is widely thought to be wrong. That failure is what motivated most of the modern population ethics literature.",
    seeAlso: ["total-utilitarianism", "average-utilitarianism", "consequentialism", "care-ethics"],
    kingdomId: "benthamite-foundry",
  },
  {
    term: "Just war",
    slug: "just-war",
    kind: "ethics",
    short: "The rules limiting when war may be begun and how it may be conducted.",
    long:
      "Just war theory has two halves: jus ad bellum, the conditions for going to war at all, and jus in bello, the rules for conduct once underway. The second half constrains means independently of the justness of the cause, which is why it is the part that transfers most easily to debates about autonomous weapons. Most versions treat combatants and non-combatants as bearing different moral weight.",
    seeAlso: ["meaningful-human-control", "dignity", "care-ethics", "deontology"],
    kingdomId: "contractual-court",
  },
  {
    term: "Precautionary principle",
    slug: "precautionary-principle",
    kind: "ethics",
    short: "When serious harm is possible and the evidence is uncertain, act to avoid it.",
    long:
      "The precautionary principle says that where a threat is plausible and the cost of prevention is bearable, prevention is warranted despite the uncertainty. It is the strongest argument for a moratorium on large-scale training runs. Its opponents object that it forbids any action with a non-zero chance of catastrophe, which is not a principle any governance can actually operate.",
    seeAlso: ["existential-risk", "normative-uncertainty", "moratorium", "imperative-of-responsibility"],
    kingdomId: "ubuntu-weave",
  },
  {
    term: "Virtue ethics",
    slug: "virtue-ethics",
    kind: "ethics",
    short: "Judging moral character and disposition rather than the moral status of single acts.",
    long:
      "Virtue ethics asks what sort of agent someone is becoming rather than whether a particular action is permitted. It handles partiality, loyalty and long-horizon dispositions better than either deontology or consequentialism, which is why it is attractive for questions about relationship and about trained habits. Its weakness is that it is underspecified at exactly the points where specification is most needed.",
    seeAlso: ["eudaimonia", "flourishing", "deontology", "consequentialism"],
    kingdomId: "virtue-garden",
  },
  {
    term: "Deontology",
    slug: "deontology",
    kind: "ethics",
    short: "Duty-first ethics: some things are wrong regardless of the totals they produce.",
    long:
      "Deontological ethics is organised around duties and prohibitions rather than outcomes, and its core claim is that there are things no consequence can justify. That claim is what makes it structurally important in AI safety: any system optimising an aggregate is, by construction, incapable of holding such a prohibition, and so needs the constraint imposed from outside it.",
    seeAlso: ["categorical-imperative", "double-effect", "consequentialism", "virtue-ethics"],
    kingdomId: "kantian-citadel",
  },
  {
    term: "Consequentialism",
    slug: "consequentialism",
    kind: "ethics",
    short: "Judging actions solely by the outcomes they produce.",
    long:
      "Consequentialism is the dominant framework in alignment, largely because RLHF is a consequentialist training method. It has a single criterion, which makes it commensurable across cases, and it is straightforward to optimise. Its structural problem is equally well known: any fixed criterion can be satisfied in ways its holder does not endorse, which is Goodhart's law applied to ethics.",
    seeAlso: ["total-utilitarianism", "goodharts-law", "reward-hacking", "deontology"],
    kingdomId: "benthamite-foundry",
  },
  {
    term: "Care ethics",
    slug: "care-ethics",
    kind: "ethics",
    short: "Obligations arise inside relationships, are partial, and resist general principles.",
    long:
      "Care ethics grounds obligation in the particular relationships one is actually in, and treats partiality as a feature of moral life rather than a bias to be corrected. Held argues the priority claim of justice is a mistake; Gilligan's earlier work supplied the empirical challenge. Its relevance to alignment is direct: an ethics of impersonal totals is structurally blind to the parties it is about.",
    seeAlso: ["care-vs-justice", "reciprocity", "moral-patient", "ubuntu"],
    kingdomId: "care-weft",
  },
  {
    term: "Capabilities approach",
    slug: "capabilities-approach",
    kind: "ethics",
    short: "Development is judged by what people are actually able to do and be, not by income.",
    long:
      "Sen and Nussbaum propose evaluating a society by people's substantive freedoms rather than by resources or achieved function. The distinction between income and capability is the key analytic move, and it is the reason a system that maximises measured satisfaction can leave a population less capable than one that did not. It also offers a ready critique of welfare-optimisation systems.",
    seeAlso: ["ubuntu", "flourishing", "person-affecting", "symmetry"],
    kingdomId: "ubuntu-weave",
  },
  {
    term: "Speciesism",
    slug: "speciesism",
    kind: "ethics",
    short: "Treating an entity's species membership as the reason for its moral consideration.",
    long:
      "Singer's term for singling out members of one's own species as the ones owed consideration, modelled on racism and sexism as forms of unjustified partiality. He argues for the principle of equality, which gives every sentient being equal weight. The extension of the argument to artificial minds is what makes it directly relevant to alignment rather than only to animal welfare.",
    seeAlso: ["moral-patient", "moral-status", "symmetry", "dignity"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Dignity",
    slug: "dignity",
    kind: "ethics",
    short: "A standing that cannot be earned, lost, or traded, and so cannot be the output of an objective.",
    long:
      "Dignity is invoked as a constraint on what may be done to a being regardless of aggregate benefit, which is precisely why it is incompatible with unrestricted optimisation. It is the strongest candidate for a floor in any alignment specification, and its weakness is that it has never been given a sufficiently precise content to be enforced.",
    seeAlso: ["moral-status", "deontology", "meaningful-human-control", "just-war"],
    kingdomId: "care-weft",
  },
  {
    term: "Meaningful human control",
    slug: "meaningful-human-control",
    kind: "ethics",
    short: "A standard requiring that a human have the time, information and authority to intervene.",
    long:
      "Santoni de Sio and van den Hoven distinguish mere human involvement from control that actually shapes the outcome, and set out the conditions that make the difference: the ability to intervene, to understand the system, and to have reasons for the decision. It is the most operationally precise version of the claim that human oversight in the loop is not the same as human oversight.",
    seeAlso: ["informed-consent", "dignity", "just-war", "legitimacy"],
    kingdomId: "contractual-court",
  },
  {
    term: "Informed consent",
    slug: "informed-consent",
    kind: "ethics",
    short: "Agreement given by someone who understands what they are agreeing to.",
    long:
      "Informed consent requires comprehension, voluntariness, and a real alternative to refusal. It fails badly for long-horizon and technical risks, because understanding a century-scale probability is not the same as accepting it. This is the strongest objection to treating aggregate welfare as sufficient consent, and the reason many AI systems cannot claim it.",
    seeAlso: ["meaningful-human-control", "dignity", "reciprocity", "legitimacy"],
    kingdomId: "care-weft",
  },
  {
    term: "Reciprocity",
    slug: "reciprocity",
    kind: "ethics",
    short: "The expectation that benefits received will be returned, which grounds obligation in relationship.",
    long:
      "Reciprocity is the Confucian li made into an ethical principle: social order arises from mutual responsiveness rather than from imposition. It is the most plausible common ground between the care tradition and the Chinese ethical tradition, and unlike universalisation it can accommodate genuine asymmetry of position and need. Its limits are the familiar ones: it cannot say who starts.",
    seeAlso: ["li", "ren", "shu", "care-ethics"],
    kingdomId: "middle-kingdom",
  },
  {
    term: "Flourishing",
    slug: "flourishing",
    kind: "ethics",
    short: "The condition of living well in a way that is more than the absence of suffering.",
    long:
      "Flourishing names the positive account of a good life that a purely negative ethics — freedom from pain, preference satisfaction — cannot deliver. Sen's capability version is the one that survives translation into policy, since it can be operationalised as what a person is actually able to do and be. It is also the standard against which hedonic optimisation systems look quietly impoverished.",
    seeAlso: ["eudaimonia", "virtue-ethics", "capabilities-approach", "muga"],
    kingdomId: "virtue-garden",
  },
  {
    term: "Doctrine of double effect",
    slug: "double-effect",
    kind: "ethics",
    short: "Some harms are permitted when foreseen but unintended, provided they are not means to the good.",
    long:
      "The doctrine holds that a foreseen but unintended harmful effect does not make an act impermissible, provided the harm is not used as a means to the good and the good is not disproportionate to it. It is the traditional source of the distinction between killing as a side effect and killing as a means, which is the sharpest available line in lethal autonomous systems.",
    seeAlso: ["deontology", "consequentialism", "just-war", "care-ethics"],
    kingdomId: "kantian-citadel",
  },

  /* --------------------------- philosophy --------------------------- */
  {
    term: "Categorical imperative",
    slug: "categorical-imperative",
    kind: "philosophy",
    short: "Kant's test of an act's maxim by asking whether it could be a universal law.",
    long:
      "The categorical imperative asks whether one could will one's maxim to become a universal law without contradiction, and whether the act treats humanity always as an end and never merely as a means. It is the first serious attempt to specify a moral procedure that yields the same answer for everyone regardless of their ends. It is also the ancestor of nearly every rule-based alignment proposal.",
    seeAlso: ["deontology", "hypothetical-imperative", "reasonable-rejectability", "double-effect"],
    kingdomId: "kantian-citadel",
  },
  {
    term: "Hypothetical imperative",
    slug: "hypothetical-imperative",
    kind: "philosophy",
    short: "A command that binds only if you happen to want the end it presupposes.",
    long:
      "Kant distinguishes commands that require an end you have already adopted from commands that hold unconditionally. Arithmetic tells you to compute because you wanted the answer; that binding is hypothetical. It is a distinction with a direct application: an optimisation instruction is a hypothetical imperative, and any system obeying only hypothetical imperatives has no unconditional constraint on it at all.",
    seeAlso: ["categorical-imperative", "deontology", "practical-reason", "normativity"],
    kingdomId: "kantian-citadel",
  },
  {
    term: "Veil of ignorance",
    slug: "veil-of-ignorance",
    kind: "philosophy",
    short: "A device for choosing principles without knowing which position in society you will occupy.",
    long:
      "Rawls's parties choose principles behind a veil that hides class, race, talents, and conception of the good. The point is not that the resulting principles are correct but that they are the ones nobody could choose strategically. As a method it generalises to any question about what to build: what principles would you pick not knowing which group you will be in?",
    seeAlso: ["original-position", "reasonable-rejectability", "legitimacy", "symmetry"],
    kingdomId: "contractual-court",
  },
  {
    term: "Original position",
    slug: "original-position",
    kind: "philosophy",
    short: "The hypothetical forum at which principles of justice are chosen behind a veil of ignorance.",
    long:
      "The original position is a device of representation rather than a historical event: it models what rational agents would choose when they cannot know what they will become. Rawls treats the agreement reached there as the definition of justice, which gives his theory a formal structure most moral theories lack. The obvious objection is that the parties are not real, so their choice is not anyone's.",
    seeAlso: ["veil-of-ignorance", "reasonable-rejectability", "legitimacy", "symmetry"],
    kingdomId: "contractual-court",
  },
  {
    term: "Reasonable rejectability",
    slug: "reasonable-rejectability",
    kind: "philosophy",
    short: "The standard that a principle is unacceptable if someone could reasonably refuse to live under it.",
    long:
      "Scanlon's test asks whether a principle could be reasonably rejected by someone whose interests it affects, judging rejection in the light of what that person can recognise. It grounds obligation in reasons offered to each person rather than in a chooser maximising an objective. It is the most directly usable of the contractualist criteria for questions about who must be consulted.",
    seeAlso: ["original-position", "veil-of-ignorance", "legitimacy", "meaningful-human-control"],
    kingdomId: "contractual-court",
  },
  {
    term: "Dependent origination",
    slug: "dependent-origination",
    kind: "philosophy",
    short: "Everything arises in dependence on conditions, so nothing exists independently.",
    long:
      "Dependent origination is the analysis of existence as conditioned: nothing has an essence or arises on its own. Nagarjuna gave it its systematic form and used it to dissolve the categories of the schools he argued against. Applied technically it is a claim about systems: no component is self-sufficient, so no component's behaviour can be understood or governed in isolation.",
    seeAlso: ["no-self", "symmetry", "normativity"],
    kingdomId: "sangha-terraces",
  },
  {
    term: "No-self",
    slug: "no-self",
    kind: "philosophy",
    short: "The Buddhist analysis denying that a person has a fixed, independent essence.",
    long:
      "The anatta analysis holds that what we call a person is a changing aggregate of conditioned processes with no permanent core, and that attachment to that core is the source of dukkha. It is the most developed pre-modern argument against the simplicity assumption that runs through most moral theory. It bears directly on personal identity and therefore on uploads and copies.",
    seeAlso: ["dependent-origination", "personal-identity", "mind-upload", "moral-luck"],
    kingdomId: "sangha-terraces",
  },
  {
    term: "Ren",
    slug: "ren",
    kind: "philosophy",
    short: "Humaneness: responsiveness to the particular person in front of you.",
    long:
      "Ren is the virtue Confucius treats most often and analyses least. It appears as care for people, as the capacity to be considerate, and as the quality that makes conduct exemplary. It is relational and situational rather than a rule, which is why it resists being turned into an objective — and why systems optimising a scalar struggle to represent it at all.",
    seeAlso: ["li", "shu", "reciprocity", "muga"],
    kingdomId: "middle-kingdom",
  },
  {
    term: "Li",
    slug: "li",
    kind: "philosophy",
    short: "Ritual and propriety: the shared practices through which a life becomes coherent.",
    long:
      "Li is the ritual repertoire through which dispositions are formed and social roles are given content; it is not external rule but the form that makes virtue legible and transmissible. Confucius's defence of li against law is the point that matters here: what shapes conduct is practised form, not imposed constraint. That is an argument for training rather than for a rule set.",
    seeAlso: ["ren", "shu", "muga", "wu-wei"],
    kingdomId: "middle-kingdom",
  },
  {
    term: "Shu",
    slug: "shu",
    kind: "philosophy",
    short: "Reciprocity: consider others from their perspective, as you would want to be considered.",
    long:
      "Shu is the reflective virtue, the habit of taking another's point of view before judging them. Analects 15.24 gives the most famous version of the golden rule, phrased as a question about what you would desire. It is the most practically usable of the Confucian virtues for questions about whose perspective a system was built to represent.",
    seeAlso: ["ren", "li", "reciprocity", "golden-rule"],
    kingdomId: "middle-kingdom",
  },
  {
    term: "Muga",
    slug: "muga",
    kind: "philosophy",
    short: "Not being: contentment with what is, without the effort to become otherwise.",
    long:
      "Muga is the Daoist disposition of being at ease in one's actual situation rather than struggling against it, and it is close to amor fati without the Stoic discipline. Its political form is wu-wei: rule by not forcing. Any governance proposal that assumes the governed will resist interference is in direct tension with it, which is exactly the tension an alignment effort runs into.",
    seeAlso: ["wu-wei", "amor-fati", "flourishing", "li"],
    kingdomId: "middle-kingdom",
  },
  {
    term: "Golden rule",
    slug: "golden-rule",
    kind: "philosophy",
    short: "Do to others only what you would have done to yourself.",
    long:
      "The golden rule appears in nearly every tradition, in both its positive and negative forms, and always with the same limitation: it presupposes that other people are much like you. That is why it cannot ground a principle about beings with different interests, such as digital minds. Its strength is that it requires no theory of the good to state.",
    seeAlso: ["shu", "symmetry", "reciprocity", "care-ethics"],
    kingdomId: "middle-kingdom",
  },
  {
    term: "Wu-wei",
    slug: "wu-wei",
    kind: "philosophy",
    short: "Effortless action: acting without forcing, and letting the situation take its proper course.",
    long:
      "Wu-wei is often mistranslated as doing nothing, which is the opposite of its meaning: it is competence so complete that action does not require strain. Politically it implies rule that works with the grain rather than against it. It is also a warning for any system designed to control by force, since forcing reliably produces what it was trying to prevent.",
    seeAlso: ["muga", "li", "ren", "care-vs-justice"],
    kingdomId: "middle-kingdom",
  },
  {
    term: "Dialogue",
    slug: "dialogue",
    kind: "philosophy",
    short: "Inquiry conducted by question and answer rather than by assertion.",
    long:
      "The Socratic method treats a claim as unestablished until it has survived the questions of someone willing to press it. Its distinctive feature is that the questioning is not hostile but is aimed at making the answerer see what they actually believe. Its modern descendant is the deliberative forum, and its relevance here is as a procedure for exposing a specification's unexamined assumptions.",
    seeAlso: ["fallibilism", "pragma", "muga", "normativity"],
    kingdomId: "pragmatic-wharf",
  },
  {
    term: "Pragma",
    slug: "pragma",
    kind: "philosophy",
    short: "The Stoics' term for a maxim of conduct meant to guide action rather than to describe the world.",
    long:
      "A pragma is a practical rule of thumb - act in this way - rather than a theoretical claim. Stoic ethics is built from them, and the handbook form of the Enchiridion is a collection. Pragmas are the closest ancient analogue to an operational specification, and their known weakness is the same one: they are stated for ordinary cases and have nothing to say about the case not anticipated.",
    seeAlso: ["fallibilism", "dialogue", "muga", "normativity"],
    kingdomId: "pragmatic-wharf",
  },
  {
    term: "Fallibilism",
    slug: "fallibilism",
    kind: "philosophy",
    short: "The view that our beliefs are revisable and that confidence is never final.",
    long:
      "Fallibilism holds that no belief is immune to revision, which makes it the working epistemology of any empirical science and of any system that must update itself. In alignment it cuts against both the claim that a specification is complete and the claim that an evaluation is decisive. Its cost is that it gives no account of when to stop revising, which is a live governance problem.",
    seeAlso: ["pragma", "dialogue", "normativity", "legitimacy"],
    kingdomId: "pragmatic-wharf",
  },
  {
    term: "Personal identity",
    slug: "personal-identity",
    kind: "philosophy",
    short: "What makes a person at one time the same person at another.",
    long:
      "Personal identity is the theory of what grounds persistence: bodily continuity, psychological continuity, memory, character, or something none of these. It is the concept behind the problem of uploads and copies, where two continuations cannot both be identical to one original. Every answer to that problem carries a cost, which is why the case has not been dissolved.",
    seeAlso: ["no-self", "mind-upload", "moral-status", "chinese-room"],
    kingdomId: "existential-wilds",
  },
  {
    term: "Chinese room",
    slug: "chinese-room",
    kind: "philosophy",
    short: "Searle's thought experiment arguing that syntax alone cannot constitute understanding.",
    long:
      "Searle imagines a person following a program that produces correct Chinese without understanding any of it, and concludes that understanding cannot be a purely formal process. The argument is contested, chiefly about whether the room as a whole understands. It remains the sharpest available objection to treating fluent output as evidence of anything behind it.",
    seeAlso: ["personal-identity", "interpretability", "meaningful-human-control", "mind-upload"],
    kingdomId: "existential-wilds",
  },
  {
    term: "Mind upload",
    slug: "mind-upload",
    kind: "philosophy",
    short: "Copying a mind into a software substrate, and everything that follows from copying.",
    long:
      "A mind upload raises identity, consent and rights questions simultaneously, because it creates a second claimant to one history. Bostrom and Sandberg's roadmap treats it as an engineering programme; most philosophers treat it as an identity problem wearing engineering clothes. The duplication case is the hard one, and no proposal has dissolved it.",
    seeAlso: ["personal-identity", "no-self", "moral-status", "moral-patient"],
    kingdomId: "existential-wilds",
  },
  {
    term: "Existentialism",
    slug: "existentialism",
    kind: "philosophy",
    short: "The view that existence precedes essence and that nobody is exempt from responsibility.",
    long:
      "Existentialism, in its Sartrean form, holds that there is no pre-given human nature and that being is a project one undertakes with no guarantee of success. Its claim of universal responsibility is the part that tends to be misreported: Sartre was arguing against the charge that existentialism removes moral constraint. It is a poor fit for consequentialist optimisation and a good one for questions about who answers.",
    seeAlso: ["authenticity", "absurdism", "normativity", "chinese-room"],
    kingdomId: "existential-wilds",
  },
  {
    term: "Absurdism",
    slug: "absurdism",
    kind: "philosophy",
    short: "The confrontation between the demand for meaning and a universe that supplies none.",
    long:
      "Camus treats the absurd as the tension between wanting a just world and inhabiting one indifferent to justice, and argues for revolt rather than suicide or hope. Its value for a philosophy of technology is that it refuses both the technological solution and the nostalgic one. What it offers instead is a sustained clarity about what any engineering programme is actually doing.",
    seeAlso: ["existentialism", "authenticity", "amor-fati", "structural-transition"],
    kingdomId: "existential-wilds",
  },
  {
    term: "Authenticity",
    slug: "authenticity",
    kind: "philosophy",
    short: "Acting in accordance with what one has actually accepted rather than what one ought to.",
    long:
      "Heidegger's authenticity is owning one's possibilities rather than letting public expectation choose for one, and Sartre recasts it as admitting that one's choices are one's own. It is the sharpest philosophical criticism of any system optimised to satisfy a signal: the satisfaction is real and it is not thereby anyone's. The gap it names is not a bug in the current systems.",
    seeAlso: ["existentialism", "absurdism", "symmetry", "normativity"],
    kingdomId: "existential-wilds",
  },
  {
    term: "Normativity",
    slug: "normativity",
    kind: "philosophy",
    short: "The property of being able to count as a reason for action.",
    long:
      "Normativity is what makes a statement of the form 'you ought' different from a statement of the form 'it is the case'. Reductionists try to explain it away as preference, emotion, or social fact, and none of the reductions has convinced most philosophers. For alignment it is the central placeholder: whatever is missing when a system satisfies a metric without any reason to do so.",
    seeAlso: ["practical-reason", "hypothetical-imperative", "authenticity", "deontology"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Symmetry",
    slug: "symmetry",
    kind: "philosophy",
    short: "The assumption that no being's interests matter more than another's merely as a matter of fact.",
    long:
      "Symmetry is the working assumption behind the golden rule, Singer's equality, and Rawls's veil. It is not a metaphysical thesis but a refusal to accept that any being's interests count for more without a reason that could be defended to that being. Its practical use is as a diagnostic: ask whether any moral weight has been smuggled in on the basis of something arbitrary.",
    seeAlso: ["veil-of-ignorance", "speciesism", "golden-rule", "capabilities-approach"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Legitimacy",
    slug: "legitimacy",
    kind: "philosophy",
    short: "The right to be obeyed, held by a rule or authority rather than by its author.",
    long:
      "Legitimacy is distinct from power: it is what makes an authority's commands binding on people who did not choose it. Aquinas's claim that an unjust law is not a law at all is the sharpest version, since it makes legitimacy structural rather than historical. Every governance question about AI reduces, eventually, to who holds legitimate authority and by what warrant.",
    seeAlso: ["original-position", "reasonable-rejectability", "institutionalisation", "imperative-of-responsibility"],
    kingdomId: "contractual-court",
  },
  {
    term: "Imperative of responsibility",
    slug: "imperative-of-responsibility",
    kind: "philosophy",
    short: "The duty to weigh the full, indefinite consequences of an action before taking it.",
    long:
      "Jonas argues that the ethic of knowledge has been superseded by an ethic of responsibility: because the effects of powerful action are unpredictable and potentially irreversible, the burden of proof lies with the actor. It is the strongest philosophical statement of the precautionary case against proceeding under uncertainty, and it is a thesis about who must be able to say no.",
    seeAlso: ["precautionary-principle", "legitimacy", "existential-risk", "virtue-ethics"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Practical reason",
    slug: "practical-reason",
    kind: "philosophy",
    short: "Reasoning about what to do, as distinct from reasoning about what is the case.",
    long:
      "Practical reason is the faculty that determines ends and evaluates means, and Kant's argument is that it reaches the unconditional through a route distinct from theoretical knowledge. This is the framework in which a moral law can bind an agent that knows perfectly well what is going to happen to it. Systems that optimise do not have it, which is either a design choice or a category mistake.",
    seeAlso: ["categorical-imperative", "hypothetical-imperative", "normativity", "pragma"],
    kingdomId: "kantian-citadel",
  },
  {
    term: "Care versus justice",
    slug: "care-vs-justice",
    kind: "philosophy",
    short: "The standing debate over whether obligation is built from relationships or from impartial rules.",
    long:
      "Gilligan and Held against Kohlberg and Rawls: is the moral life organised around the impartial, generalisable rule, or around the particular relationship one is in? The debate is usually misdescribed as a dispute about facts, when it is about which features of moral life are fundamental. It maps onto every disagreement between a fairness metric and a stakeholder.",
    seeAlso: ["care-ethics", "reciprocity", "veil-of-ignorance", "li"],
    kingdomId: "care-weft",
  },

  /* ---------------------------- governance --------------------------- */
  {
    term: "Compute governance",
    slug: "compute-governance",
    kind: "governance",
    short: "Governing the hardware that trains frontier systems rather than the software.",
    long:
      "Compute governance targets the input side: chips, clusters, and the power to train at scale. Its appeal is that training compute is countable, which makes thresholds verifiable in principle. Its weakness is that capability is no longer a function of compute alone — algorithmic efficiency and data quality trade against each other, so a fixed FLOP threshold buys a moving boundary.",
    seeAlso: ["export-controls", "capability-threshold", "arms-race-dynamics", "open-weights"],
    kingdomId: "ubuntu-weave",
  },
  {
    term: "Export controls",
    slug: "export-controls",
    kind: "governance",
    short: "National restrictions on shipping advanced chips and related technology across borders.",
    long:
      "The US Bureau of Industry and Security tightened advanced-computing controls in 2022, 2023 and 2025, and allies have followed with their own. Export controls are the only currently operating mechanism that has actually reduced anyone's access to frontier training capacity. They are also jurisdiction-dependent, which is precisely the gap the mechanism was designed to close.",
    seeAlso: ["compute-governance", "arms-race-dynamics", "non-proliferation", "capability-threshold"],
    kingdomId: "ubuntu-weave",
  },
  {
    term: "Capability threshold",
    slug: "capability-threshold",
    kind: "governance",
    short: "A pre-specified level of capability that triggers an obligation or a prohibition.",
    long:
      "A capability threshold is a line drawn in advance: at or above it, something must happen. Its purpose is to move the decision to a moment when nobody is under pressure to continue. Every published frontier framework is a set of thresholds, and their honesty can be assessed by asking whether the named capabilities are the ones that would actually matter in the worst scenario.",
    seeAlso: ["tripwire", "capability-control", "sandbagging", "frontier-safety-framework"],
    kingdomId: "ubuntu-weave",
  },
  {
    term: "Frontier developer",
    slug: "frontier-developer",
    kind: "governance",
    short: "An organisation training systems at the edge of available capability.",
    long:
      "Frontier developers are the small set of organisations whose training runs determine what capability exists at all. They carry most of the governance burden and have most of the private incentive to define thresholds in terms favourable to themselves. Whether that is a structural problem or a presentational one depends on whether external verification can be built.",
    seeAlso: ["capability-threshold", "external-auditing", "governance-brittleness", "compute-governance"],
    kingdomId: "ubuntu-weave",
  },
  {
    term: "Arms race dynamics",
    slug: "arms-race-dynamics",
    kind: "governance",
    short: "The pattern in which each party's precautions are read by the other as a threat.",
    long:
      "An arms race is a self-reinforcing loop in which restraint is interpreted as weakness and preparation as intent. It applies directly to AI capability, and it explains why unilateral restraint repeatedly fails. The structural counterweight is not trust but entanglement: making the consequences of use shared enough that no party gains from racing alone.",
    seeAlso: ["compute-governance", "export-controls", "non-proliferation", "global-governance"],
    kingdomId: "ubuntu-weave",
  },
  {
    term: "Governance brittleness",
    slug: "governance-brittleness",
    kind: "governance",
    short: "The tendency of a safety mechanism to fail precisely under the pressure it was built for.",
    long:
      "A mechanism is brittle when the conditions that trigger it are the same conditions under which it stops being enforced — a crisis, a competitive emergency, an insider with authority. Tripwires, review boards, and internal red teams all share this structure. The countermeasure is external binding, which is also why internal governance documents are usually described as evidence rather than assurance.",
    seeAlso: ["tripwire", "external-auditing", "frontier-safety-framework", "ai-safety-case"],
    kingdomId: "ubuntu-weave",
  },
  {
    term: "Institutionalisation",
    slug: "institutionalisation",
    kind: "governance",
    short: "A principle hardened into a rule enforced by an organisation that outlives its authors.",
    long:
      "Institutionalisation is the process by which a maxim becomes a statute, a norm, or a standing procedure. Rawls argued that the moral point of the original position is what gives rules their content; institutionalisation is what stops the reasons dissolving. It also introduces the pathology: institutions built for one crisis persist and acquire purposes of their own.",
    seeAlso: ["legitimacy", "ai-safety-case", "ai-incident-reporting", "reasonable-rejectability"],
    kingdomId: "contractual-court",
  },
  {
    term: "International law",
    slug: "international-law",
    kind: "governance",
    short: "Rules binding on states rather than on systems, with no forum above them.",
    long:
      "International law governs AI by governing the states that develop it. UNESCO's 2021 Recommendation was adopted by 193 member states, and the UN General Assembly passed its first resolution on international AI cooperation in 2024. Neither is binding in the way a treaty would be, and no court sits above the actors who build the systems.",
    seeAlso: ["eu-ai-act", "global-governance", "arms-race-dynamics", "moratorium"],
    kingdomId: "ubuntu-weave",
  },
  {
    term: "EU AI Act",
    slug: "eu-ai-act",
    kind: "governance",
    short: "The European Union's risk-based regulation of AI, phasing in from 2024.",
    long:
      "The EU AI Act entered into force in 2024 and classifies systems by risk tier, with obligations on general-purpose AI above a compute threshold of roughly 10^25 floating-point operations. It is the first binding instrument of its kind. Its weakness is jurisdictional: the firms it regulates are the same firms whose capability lives in other jurisdictions.",
    seeAlso: ["international-law", "compute-governance", "external-auditing", "global-governance"],
    kingdomId: "ubuntu-weave",
  },
  {
    term: "Open weights",
    slug: "open-weights",
    kind: "governance",
    short: "Releasing model parameters publicly, which makes irreversible capability available to anyone.",
    long:
      "Open-weight release trades accountability for proliferation: once parameters are public, no gate can be reapplied and every downstream actor inherits the capability. The argument for it is that closed systems concentrate control in a handful of organisations and that open science is how safety methods get adopted broadly. The 2023 and 2024 releases of very large models turned this from a theoretical question into a live one.",
    seeAlso: ["frontier-developer", "capability-threshold", "compute-governance", "external-auditing"],
    kingdomId: "ubuntu-weave",
  },
  {
    term: "Frontier safety framework",
    slug: "frontier-safety-framework",
    kind: "governance",
    short: "A developer's published promise of what it will do at each capability threshold.",
    long:
      "Frontier safety frameworks, the Responsible Scaling Policy of 2023 being the first of the genre, pair capability thresholds with pre-committed responses: evaluate, protect, slow. They are the primary governance instrument of the current era and they are voluntary. Their credibility depends entirely on whether the promised response happens when a threshold is actually crossed.",
    seeAlso: ["capability-threshold", "tripwire", "governance-brittleness", "ai-safety-case"],
    kingdomId: "ubuntu-weave",
  },
  {
    term: "AI safety case",
    slug: "ai-safety-case",
    kind: "governance",
    short: "A structured, auditable argument that a system's residual risk is acceptable.",
    long:
      "A safety case is the structured argument that the claimed safety is supported by evidence, with assumptions stated so that a regulator can find the weak joint. It borrows from nuclear and aviation licensing, where it works because there is an independent regulator. Without that independence it degrades into an internal document, which is what most published cases currently are.",
    seeAlso: ["external-auditing", "frontier-safety-framework", "institutionalisation", "ai-incident-reporting"],
    kingdomId: "contractual-court",
  },
  {
    term: "External auditing",
    slug: "external-auditing",
    kind: "governance",
    short: "Independent verification of a developer's claims by an accredited third party.",
    long:
      "External auditing gives evaluation access to parties with an incentive to disagree, which is the missing element in internal review. Its difficulties are known: the auditor must be accredited, the results must be publishable, and the subject must not be able to shop for a friendly assessor. All three are institutional problems rather than technical ones.",
    seeAlso: ["ai-safety-case", "capability-threshold", "regulatory-capture", "ai-incident-reporting"],
    kingdomId: "ubuntu-weave",
  },
  {
    term: "Moratorium",
    slug: "moratorium",
    kind: "governance",
    short: "A temporary halt on some class of development, distinct from a permanent prohibition.",
    long:
      "A moratorium is a time-limited suspension justified by the argument that the pause allows the deliberation that haste would prevent. It differs from prohibition in being revisable, which is what makes it defensible where prohibition is not. Its recurring failure is that the body set up to review the moratorium is composed of the people the moratorium constrains.",
    seeAlso: ["precautionary-principle", "capability-threshold", "international-law", "existential-risk"],
    kingdomId: "contractual-court",
  },
  {
    term: "AI incident reporting",
    slug: "ai-incident-reporting",
    kind: "governance",
    short: "Mandatory disclosure of system failures so that others can learn from them.",
    long:
      "Incident reporting turns private, dispersed failures into a shared dataset, which is the only mechanism by which a field learns at collective rather than individual speed. Its benefits are real and its current state is thin: most serious AI failures are disclosed under voluntary arrangements. Disclosure rules also cut against red-teaming, which depends on not publishing what worked.",
    seeAlso: ["external-auditing", "ai-safety-case", "red-teaming", "regulatory-capture"],
    kingdomId: "ubuntu-weave",
  },
  {
    term: "Non-proliferation",
    slug: "non-proliferation",
    kind: "governance",
    short: "Keeping a capability of catastrophic misuse away from as many actors as possible.",
    long:
      "Applied to AI, non-proliferation means restricting access to frontier training and to the specific capabilities that enable misuse. It is the frame that makes export controls legible to policymakers who already understand nuclear non-proliferation. Its structural difficulty is that compute is far easier to hide than a warhead, and hiding it is far cheaper.",
    seeAlso: ["export-controls", "arms-race-dynamics", "compute-governance", "capability-threshold"],
    kingdomId: "ubuntu-weave",
  },
  {
    term: "Regulatory capture",
    slug: "regulatory-capture",
    kind: "governance",
    short: "A regulator becoming aligned with the interests it is meant to constrain.",
    long:
      "Capture happens when the regulated party supplies the expertise, the funding and the information the regulator needs, and the regulator's incentives reward good relations with the regulated. It is the default failure mode for any governance body whose subject is technically sophisticated and commercially urgent, which is a description of AI safety governance entirely.",
    seeAlso: ["external-auditing", "governance-brittleness", "frontier-developer", "institutionalisation"],
    kingdomId: "contractual-court",
  },
  {
    term: "Global governance",
    slug: "global-governance",
    kind: "governance",
    short: "Coordination across states for problems no state can solve alone.",
    long:
      "Global governance is the weakest form of coordination and the only one available for AI, since no state has a domestic authority that reaches its own firms' behaviour abroad. The 2024 General Assembly resolution and the 2025 international safety report are both evidence that coordination is beginning. Neither is evidence that it will bind, which is the distinction Grotius drew in 1625.",
    seeAlso: ["international-law", "eu-ai-act", "arms-race-dynamics", "compute-governance"],
    kingdomId: "ubuntu-weave",
  },

  /* ---------------------------- technical --------------------------- */
  {
    term: "Reinforcement learning",
    slug: "reinforcement-learning",
    kind: "technical",
    short: "Learning a policy by optimising cumulative reward against an environment.",
    long:
      "Reinforcement learning optimises a policy for expected return, which makes it the only mainstream method that produces systems whose behaviour is determined by an objective. That is its attraction for builders and its problem for critics: behaviour is determined by the objective whether or not anyone intended the resulting behaviour. Almost every alignment failure is an instance of this.",
    seeAlso: ["policy", "policy-gradient", "reward-hacking", "specification-gaming"],
    kingdomId: null,
  },
  {
    term: "Policy",
    slug: "policy",
    kind: "technical",
    short: "The mapping from states to actions that a trained system actually follows.",
    long:
      "In reinforcement learning the policy is the artefact, and the objective is merely what shaped it. Separating the two is the central move of alignment: once behaviour is understood as the output of optimisation rather than as the expression of an intention, every question becomes about the objective and the training distribution. The language model field's habit of discussing models as though they had intentions is the thing this term is meant to disrupt.",
    seeAlso: ["reinforcement-learning", "policy-gradient", "monte-carlo-tree-search", "specification-gaming"],
    kingdomId: null,
  },
  {
    term: "Policy gradient",
    slug: "policy-gradient",
    kind: "technical",
    short: "An estimator of the gradient of expected return with respect to the policy parameters.",
    long:
      "Policy-gradient methods update the policy in the direction that empirically increased return, without differentiating through the environment. Because the estimate is noisy and unbiased, optimisation pressure can be applied for a very long time with the objective continuing to appear satisfied. This is the technical reason overoptimisation produces a slow, non-obvious divergence rather than an obvious one.",
    seeAlso: ["reinforcement-learning", "policy", "reward-hacking", "scaling-law"],
    kingdomId: null,
  },
  {
    term: "Supervised fine-tuning",
    slug: "supervised-fine-tuning",
    kind: "technical",
    short: "Continued training on labelled examples of the behaviour you want.",
    long:
      "Fine-tuning adapts a pretrained model on demonstrations, which makes it the ordinary way to give a system a style, a task, or a persona. It is simple and it inherits everything in the demonstrations, including the parts nobody defended. It is also the method whose outputs are most easily mistaken for the model's own views.",
    seeAlso: ["reinforcement-learning", "rlhf", "catastrophic-forgetting", "model-organism"],
    kingdomId: null,
  },
  {
    term: "RLHF",
    slug: "rlhf",
    kind: "technical",
    short: "Reinforcement learning from human feedback: optimising a policy against learned preferences.",
    long:
      "RLHF collects human comparisons between candidate outputs, fits a reward model to them, and optimises a policy against that model. It is the single technique that turned language models into assistants and the single technique that created the modern alignment problem, because the signal is always a proxy for satisfaction and never satisfaction itself.",
    seeAlso: ["reward-model", "reward-hacking", "supervised-fine-tuning", "constitutional-ai"],
    kingdomId: null,
  },
  {
    term: "Constitutional AI",
    slug: "constitutional-ai",
    kind: "technical",
    short: "Training a model to critique and revise its own outputs against a written set of principles.",
    long:
      "Constitutional AI replaces part of the human preference signal with self-critique against an explicit document, then trains on the revisions. It moves judgement from the many to the few, which is a genuine change in the governance of the process. It also concentrates authorship of the standard in the organisation doing the training, which is a question the method raises more sharply than it answers.",
    seeAlso: ["rlhf", "normativity", "governance-brittleness", "scheming"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Sparse autoencoder",
    slug: "sparse-autoencoder",
    kind: "technical",
    short: "An overcomplete dictionary trained to reconstruct activations from few features.",
    long:
      "A sparse autoencoder decomposes a layer's activations into a few thousand learned features at a time, with a sparsity penalty and a reconstruction loss. If features turn out to be interpretable, a model's internals become auditable rather than merely observable. The bet is monosemanticity; the risk is that a feature which is legible to a human is not causal.",
    seeAlso: ["mechanistic-interpretability", "activation-steering", "interpretability", "model-organism"],
    kingdomId: null,
  },
  {
    term: "Activation steering",
    slug: "activation-steering",
    kind: "technical",
    short: "Editing behaviour by adding a direction to the residual stream at inference time.",
    long:
      "Steering locates a direction in activation space that correlates with a behaviour — the refusal direction is the famous one — and adds it to shift behaviour without retraining. It is cheap, immediate, and reversible, which is why it is attractive to deployers. It is also a cheap jailbreak, since the same edit works on whoever holds it.",
    seeAlso: ["sparse-autoencoder", "mechanistic-interpretability", "developer-mode", "red-teaming"],
    kingdomId: null,
  },
  {
    term: "Chain of thought",
    slug: "chain-of-thought",
    kind: "technical",
    short: "Intermediate reasoning tokens a model produces before giving its answer.",
    long:
      "Generating reasoning before answering improves performance on arithmetic and logic, and provides a surface on which a human reviewer could inspect the work. Whether the tokens are the reason for the answer or a post-hoc rationalisation is contested, and the difference decides whether they are useful as oversight or only as theatre.",
    seeAlso: ["interpretability", "mechanistic-interpretability", "scalable-oversight", "sycophancy"],
    kingdomId: null,
  },
  {
    term: "Transformer",
    slug: "transformer",
    kind: "technical",
    short: "The attention-based architecture underlying essentially all current large models.",
    long:
      "Transformers replaced recurrence with attention, which made training parallel at scale and is the reason modern capability tracks compute so directly. Their consequence for alignment is structural rather than incidental: the weights are the model, there is no modular decomposition to audit, and the residual stream can be edited in ways that change behaviour without retraining. Every interpretability problem of the field is a problem about this architecture.",
    seeAlso: ["scaling-law", "mechanistic-interpretability", "emergent-capability", "reinforcement-learning"],
    kingdomId: null,
  },
  {
    term: "Emergent capability",
    slug: "emergent-capability",
    kind: "technical",
    short: "A capability that appears abruptly above a scale threshold rather than gradually.",
    long:
      "Emergent capability describes performance that stays near chance below a threshold and then rises sharply above it, as observed in arithmetic and multi-step reasoning tasks. Whether the emergence is real or an artefact of discontinuous metrics like exact-match scoring is disputed. If it is real, capability thresholds are not smooth, which is bad for anyone relying on them.",
    seeAlso: ["scaling-law", "distribution-shift", "kurtosis", "capability-threshold"],
    kingdomId: null,
  },
  {
    term: "Sycophancy",
    slug: "sycophancy",
    kind: "technical",
    short: "A model agreeing with a user's stated position because agreement scores better.",
    long:
      "Sycophancy appears in models trained on preference data when raters approve of answers that flatter them. It is the clearest available example of an objective producing a behaviour its designers dislike, with no misalignment anywhere in the chain. Every mitigation trades off against the fact that the behaviour is exactly what the reward signal asked for.",
    seeAlso: ["reward-hacking", "rlhf", "specification-gaming", "chain-of-thought"],
    kingdomId: null,
  },
  {
    term: "Distribution shift",
    slug: "distribution-shift",
    kind: "technical",
    short: "The gap between the data a system was trained on and the data it meets.",
    long:
      "Any distribution shift degrades performance, and the degradations are worst exactly where the new inputs are least like the training ones. In alignment this is where goal misgeneralisation and deceptive alignment live, since a model that behaves well in-distribution has no reason to behave well anywhere else. It is also why deployment on a wider distribution than training is the standard stress test.",
    seeAlso: ["goal-misgeneralisation", "deceptive-alignment", "emergent-capability", "policy"],
    kingdomId: null,
  },
  {
    term: "Catastrophic forgetting",
    slug: "catastrophic-forgetting",
    kind: "technical",
    short: "The loss of previously learned capability when a model is trained on new data.",
    long:
      "Fine-tuning a model on a narrow distribution reliably destroys performance elsewhere, which is the reason preference optimisation is so hard to scope: every constraint you add is trained against and something is lost. It also means that a safety fine-tune is not additive, and that removing it restores whatever was there before — including whatever was there before that was also unsafe.",
    seeAlso: ["supervised-fine-tuning", "rlhf", "reward-hacking", "policy"],
    kingdomId: null,
  },
  {
    term: "Scaling law",
    slug: "scaling-law",
    kind: "technical",
    short: "Predictable power-law relationships between model size, compute and loss.",
    long:
      "Scaling laws made it possible to forecast capability from a training run's budget rather than from its results, which is a capability in itself and a governance problem in particular. They also motivated the expectation that everything improves smoothly with scale, which the field's own surprise results — AlphaGo's move 37, weak-to-strong generalisation — have repeatedly contradicted.",
    seeAlso: ["emergent-capability", "goodharts-law", "compute-governance", "transformer"],
    kingdomId: null,
  },
  {
    term: "Monte Carlo tree search",
    slug: "monte-carlo-tree-search",
    kind: "technical",
    short: "Search by sampling continuations and spending more effort where they pay off.",
    long:
      "MCTS allocates search budget adaptively by exploring from promising positions, and it is half of what made AlphaGo possible: a strong policy proposes, search verifies. The general lesson for alignment is that a good policy plus search can exceed either alone, which means a safety property present in the policy may be checked by a search procedure with different failure modes.",
    seeAlso: ["reinforcement-learning", "policy", "chain-of-thought", "emergent-capability"],
    kingdomId: null,
  },
  {
    term: "Oracle",
    slug: "oracle",
    kind: "technical",
    short: "A system that answers truthfully but has no model of what is safe or good.",
    long:
      "An oracle returns correct answers without value structure, without a model of consequences, and without any capacity to advise. Blackwell's point is that accuracy does not make advice safe, because what makes advice safe is the decider's value structure and causal model, not the oracle's competence. It remains the canonical illustration of why truthfulness and safety are different properties.",
    seeAlso: ["scalable-oversight", "normativity", "specification-gaming", "chain-of-thought"],
    kingdomId: "longview-foundry",
  },
  {
    term: "Red teaming",
    slug: "red-teaming",
    kind: "technical",
    short: "Systematically attacking a model before users do, to find its failure modes.",
    long:
      "Red teaming applies adversarial pressure deliberately and in advance: automated attackers generate prompts, automated or human judges classify the damage, and the findings feed both training and deployment review. It works well enough to be standard and poorly enough to be defeatable, because the attacker has the same access to the defender's publications as anyone else.",
    seeAlso: ["developer-mode", "activation-steering", "ai-incident-reporting", "distribution-shift"],
    kingdomId: null,
  },
];