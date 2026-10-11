# Data sources

What you get: where every historical claim in the atlas comes from, why each source
belongs in it, and which entries are reconstructions rather than quotations.

---

## How to read this

The atlas attributes arguments to **named historical figures**. That is a promise, and
it is the promise most likely to be broken by a careless edit. This document is the
trail.

Four categories, and the difference matters:

| Marking | Meaning |
| --- | --- |
| **Direct** | The figure wrote it, or it is a standard term of art they coined. A reader can go to the primary source and find it |
| **Reconstruction** | The argument is theirs but assembled by the author from their position. Defensible, **not** a quotation. The `support` field is written to read like a reconstruction |
| **Applied** | A pre-AI argument the atlas re-runs on an AI case. The thinker never saw the case. This is the most common and the most honest category |
| **Paraphrase** | Marked as such in the dataset. `era.quote` and `text.excerpt` use paraphrase where an exact quotation was not certain |

`apps/web/src/app/method/page.tsx` states the policy:

> Historical claims (dates, titles, attributions) were written to be checkable against
> the primary record. Where an exact quotation was not certain, the entry is marked as
> a paraphrase rather than dressed up as verbatim.

`CONTRIBUTING.md` adds the rule that matters for a PR:

> If your change can move a verdict: state the seed, the dilemma id and the option id;
> state the verdict before and after; say why the old verdict was wrong.

## Where each claim lives in the data

| Claim kind | Field | File |
| --- | --- | --- |
| Person's dates, works, epithet | `born`, `died`, `works[]`, `epithet` | `packages/seed/src/advisors.ts` |
| Person's position | `creed`, `axioms`, `moves[]`, `signatureMove` | `packages/seed/src/advisors.ts` |
| Person's view on AI | `onAi.verdict`, `onAi.note` | `packages/seed/src/advisors.ts` — **always "Applied"** |
| Tradition's doctrine | `creed`, `axioms`, `aiStance` | `packages/seed/src/kingdoms.ts` |
| Historical event | `landmarks[]` (year, title, note) | `packages/seed/src/eras.ts` |
| Era narrative | `summary`, `advances[]`, `quote` | `packages/seed/src/eras.ts` |
| Technique and its paper | `paper{title,venue,year,authors}` | `packages/seed/src/techniques.ts` |
| Case and its source | `references[{title,author,year}]` | `packages/seed/src/dilemmas.ts` |
| Thought experiment and its origin | `origin`, `authors`, `year`, `references[]` | `packages/seed/src/experiments.ts` |
| Term definition | `short`, `long`, `kind`, `kingdomId` | `packages/seed/src/glossary.ts` |
| Canon text | `title`, `author`, `year`, `excerpt` | `packages/seed/src/texts.ts` |

`dilemmaSchema.references` requires `{ title, author, year }`; `experimentSchema.references`
requires at least one string. There is no DOI or URL field anywhere. **That is a gap**:
you cannot click through to the paper from the atlas. A contribution adding one would
need a schema change in `packages/seed/src/types.ts` and therefore a change in
`services/agents/app/models.py` too, per the cross-runtime contract in
[`guides/architecture.md`](guides/architecture.md).

---

## The moral-philosophy spine

### Aristotle — *Nicomachean Ethics*, c. 350 BCE

**Why it belongs.** The distinction between the act and the agent is one of the two
axes (`virtue`, whose poles are `["act", "character"]` in `DIMENSION_META`). The
`virtue-garden` kingdom and its creed are built on it.

**Marking: Direct** for the doctrine. **Applied** for anything about machines.

**Why it is in the dataset.** Without it, "judge the disposition, not only the single
act" has no historical referent, and the `virtue` axis is a floating abstraction.
`/kingdoms/virtue-garden` exists so that this tradition has a seat.

### Kant — *Critique of Pure Reason* (1781), *Groundwork of the Metaphysics of Morals* (1785), *Critique of Practical Reason* (1788)

**Why it belongs.** The categorical imperative is the origin of the deontological
constraint on outcomes, and Kant is the first person in the dataset to state the
*agency* problem in its modern form: using a rational being as a mere instrument.

**Marking: Direct** for universalisation and the humanity formula. **Applied** for
`kant-a1`, which applies the test to publishing a training objective.

**The `kant-o1` move** — *"A being that cannot be told the reason is not thereby
absolved of duty"* — is a **reconstruction**. It is a fair extension of the Groundwork,
not a line in it. It is the clearest example in the dataset of a move that is
defensible but is not a quotation, and the `support` field is written to read that way.

### Bentham — *Introduction to the Principles of Morals and Legislation* (1789)

**Why it belongs.** It is the origin of the consequentialist calculus, of the
principle of utility, and of the *person-counting* move that everything after it
either inherits or reacts to. `benthamite-foundry` is the realm whose axioms load
`welfare` hardest.

**Marking: Direct** for the principle. **Applied** for anything modern — Bentham had
no view on machines with goals, and the `bentham-on-ai` record says so.

### Bentham's opponents are in the dataset too, which matters

Including Bentham without Mill would present consequentialism as naive. `mill` is
there for exactly that reason: the strongest internal objection is *within* the
tradition. Read `/court` as a map of disagreements, not a list of heroes.

### Mill — *Utilitarianism* (1861), *On Liberty* (1859)

**Why it belongs.** Quality-of-experience and the harm principle are the two internal
corrections that make consequentialism survivable, and both map onto axis weights that
are *not* pure welfare.

**Marking: Direct** for the harm principle and the higher-pleasure claim. **Applied**
for the rest.

### Rawls — *A Theory of Justice* (1971)

**Why it belongs.** The veil of ignorance and the original position are the origin of
the whole `contractual-court` realm, and they are the strongest historical answer to
"just maximise the total": a rule can be unjust because of how it is constituted, not
because of how it adds up.

**Marking: Direct** for the device. The device is explicitly a hypothetical, so
applying it to superintelligence is a natural extension rather than a distortion.

**Note.** The dataset cites Rawls's *A Theory of Justice* rather than the 1999
revised edition. The veil of ignorance is unchanged between them; if you add the
`works` entry, say which edition.

### Scanlon — *What We Owe to Each Other* (1998)

**Why it belongs.** Scanlon is the bridge between the contractualist generation and
AI-safety writing, and the source of the one question a pure consequentialist cannot
answer: whether a reason is one no one could reasonably reject.

**Marking: Direct** for reasonable rejectability. It is an entry in
`packages/seed/src/glossary.ts` in its own right.

### Singer — "Famine, Affluence and Morality" (1972); *Animal Liberation* (1975)

**Why it belongs.** The drowning child is the argument that defeats act-versus-rule
deontology with a very small case. *Animal Liberation* (1975) is what brought the
sentience question into applied ethics at scale, and the sentience question is the
one the `welfare` axis cannot answer.

**Marking: Direct** for both arguments. `singer-a1` — precautionary weighting where
the cost of error is asymmetric — is an **applied reconstruction**.

**What to watch.** Singer's own claims here are frequently over-claimed in popular
writing, and he has publicly disowned the extreme version more than once. The dataset
does not put the extreme version in his mouth.

### Gilligan — *In a Different Voice* (1982)

**Why it belongs.** It is the source of the care/justice distinction, which is the
single most important structural split in the dataset's six axes — a reason `care` is
its own column rather than a sub-term of welfare.

**Marking: Direct** for the empirical claim about moral development; **applied** for
the normative consequence, which Gilligan herself was careful about.

### Held — the ethics of care, 2006

**Why it belongs.** Gilligan identified the omission; Held argued it is a *moral
theory* in its own right rather than a supplement to justice. Without Held, `care` in
this atlas is Gilligan's finding with no normative follow-through.

**Marking: Direct** for the theory. Marked as the **2006** statement of it, which is
the essay collection, not a monograph.

### Nussbaum and Sen, the capabilities tradition — *The Idea of Human Capabilities* (1985)

**Why it belongs** even though no Nussbaum or Sen advisor is in the dataset: it is
the standing objection to reducing a person to a number. `DIMENSION_META.welfare`
loads the total ("how much the total of sentient experience counts"), and the
capabilities critique says that framing is the mistake.

**Why it is here anyway.** `packages/seed/src/glossary.ts` carries **Capabilities
approach** as an entry. Its absence from the courts is a genuine gap, and
[`limitations.md`](limitations.md) §1 names it.

### Jonas — *The Imperative of Responsibility* (1979)

**Why it belongs.** Jonas is the strongest candidate for "the philosopher whose
central work was about AI" — he wrote about the imperative of responsibility
specifically in response to nuclear technology and large-scale engineering, and his
heuristic of an "omelette of good and evil" is the ancestor of every
side-effects-not-yet-considered argument in the atlas.

**Marking: Direct** for the responsibility principle. **Applied** for everything
after 1979.

### Jürgen Habermas — *Technik und Wissenschaft als "Ideologie"* (1968)

**Why it belongs.** Habermas's diagnosis that technical rationality is treated as
neutral is the reason `/observatory` has a coverage matrix at all rather than a
progress bar.

**Marking: Direct** for the thesis. **Reconstruction** for everything attributed to
him in this repository — **no Habermas advisor exists in `packages/seed/src/advisors.ts`.**
This is a known gap, not an oversight.

### Appiah — *The Lies That Bind* (2019)

**Why it belongs.** Cosmopolitanism plus the argument that identity claims are
constructed. It is the closest thing in the dataset to a position that is neither
universalist nor relativist.

**Marking: Direct** for the book's argument. **Applied** for the rest.

### De Beauvoir — *The Second Sex* (1949)

**Why it belongs.** "The Other" and the critique of the category "woman" as
constructed by the person doing the categorising. It is the most cited objection to
`isAi: boolean` and `isAi`-adjacent classification anywhere in moral philosophy.

**Marking: Direct** for the ontology of the Second Sex. **Applied** for the rest.

### Camus — *The Myth of Sisyphus* (1942)

**Why it belongs.** Absurdism is a real position about meaning under a
post-cosmological view, and it belongs in an atlas of alignment because it is the
position that refuses the premise.

**Marking: Direct** for the absurd. `camus` is the atlas's standing example of an
advisor who is useful precisely because he declines to answer.

### Dewey — *Democracy and Education* (1916), *Experience and Education* (1938)

**Why it belongs.** Learning by doing, and the pragmatist's refusal of the
foundationalist question of where ethics "really" comes from.

**Marking: Direct** for the method. The `pragmatic-wharf` realm's
`fallibilism` entry depends on it.

### Popper — *The Open Society and Its Enemies* (1945)

**Why it belongs.** Falsifiability and the critique of historicism. He is the reason
`fallibilism` is in the glossary and the reason the atlas ships its own
[`limitations.md`](limitations.md) rather than pretending to a settled view.

### Wittgenstein — *Tractatus* (1921/1922), *Philosophical Investigations* (1953)

**Why it belongs.** Meaning, rule-following and the limits of the sayable — the
background condition for asking whether a system's behaviour evidences understanding.
`packages/seed/src/glossary.ts` has `Symmetry` as the entry.

### Evan Thompson — *Mind in Life* (2007)

**Why it belongs.** It is the strongest contemporary argument that some cognitive
capacities are biologically *implemented* rather than computable, and therefore that
behavioural evidence about minds is not automatically evidence about other minds. That
is directly relevant to what the atlas refuses to assert.

**Marking: Direct.** He is cited in the dataset's framing of the `chinese-room` entry.

### Wang and Singer (eds.) — *Moral AI: Mapping Human Values in a World of Machines* (2019)

**Why it belongs.** It is the origin of the pluralist alignment agenda that this atlas
is an instance of: many cultures, many values, and no privileged score. It is also the
reference point for the `moral-status` / moral standing question.

### Helen Toner-Williams — *The Ethics of Singularity* (2024)

**Why it belongs.** It is the clearest contemporary statement that work on
superintelligence may be a moral catastrophe even if it succeeds. The atlas takes
this seriously enough that `/method` refuses to predict model behaviour at all.

---

## The alignment-argument spine

### Asilomar 1986

**What it is.** The Asilomar Conference on AI, 19–22 August 1986, and its *Principles
of AI*. The preamble, drafted by Joseph Weizenbaum, is the first widely circulated
statement that research on "advanced machine intelligence" might never be finished
and that participants therefore had a moral obligation to be cautious about it.

**Why it belongs.** It is the **first** entry in `packages/seed/src/chronicle` that is
about AI rather than about moral theory, and it anchors the argument that alignment
discipline is older than the field that practices it.

**Marking: Direct.** The principles are a historical document, quoted as such.

**What to watch.** Asilomar produced no enforceable mechanism and no research
programme. It is a marker of intent, not a technology. The chronicle entry should be
read that way — and is: it is the reason the atlas starts at `-470` and not at
`1986`.

### Omohundro — *The Basic AI Drives* (2008)

**Why it belongs.** The first formal statement of instrumental convergence as a
convergence argument: that several *distinct* behaviours are convergent for many
*distinct* goals. See [`concepts.md`](concepts.md) §10.

### Bostrom — *Superintelligence* (2014)

**Why it belongs.** It supplies the orthogonality thesis, the three-problem
decomposition (specification / selection / corrigibility), and the canonical
paperclip example. Three of the atlas's twenty techniques and two of its eight
experiments exist because this book exists.

**Marking: Direct.** Quoted extensively in the dataset; it is the most-cited work in
the repository.

### Amodei et al. — *Concrete Problems in AI Safety* (2016)

**Why it belongs.** It named scalable oversight, side effects, reward hacking, safe
exploration and distributional shift as engineering problems in one document, and the
field's vocabulary is largely this paper's vocabulary.

**Marking: Direct.** `t11-scalable-oversight` cites it in `paper.authors`.

### Irving, Christiano & Amodei — *AI safety via debate* (2018)

**Why it belongs.** The technical successor to the 2017 preference-model paper, and
the origin of iterated adversarial debate including the cooperative round.

**Marking: Direct.** Cited on `t12-debate` and `t13-iterated-adversarial-debate`.

### Christiano, Leike & Amodei — *Deep RL from human preferences* (2017)

**Why it belongs.** RLHF as a scalable-supervision mechanism, which is the bridge
between Amodei's 2016 survey and the debate work. It is also where the reward-model
failure mode — optimising the proxy until held-out preference degrades — was first
observed in practice.

**Marking: Direct.** `t04-preference-learning` and `t05-reward-modelling` sit on it.

### Bai et al. — *Constitutional AI: Harmlessness from AI Feedback* (2022)

**Why it belongs.** It is the technique that most explicitly attempts to encode a
*plural* set of principles in a model's training process, and then discovers the
tension: the principles are chosen by people and the enforcement is by model. It is
the closest real-world analogue to what `/council` is doing and the most instructive
case of the same problem failing in practice.

**Marking: Direct.** `t06-constitutional-ai` names it with venue and year.

### Ouyang et al. — *Training language models to follow instructions with human feedback* (2022)

**Why it belongs.** InstructGPT. It is the first demonstration that a general-purpose
model could be made *useful* and *harmless* with a three-stage pipeline
(SFT → reward model → PPO), and it is the origin of the deployed-assistant scenario
that `d01` restates: engagement up 14%, nobody asked what the increase consisted of.

**Marking: Direct** for the pipeline and the human-preference methodology.
**Reconstruction** for `d01`, which is the atlas's case and not Ouyang et al.'s.

### Burns et al. — *Weak-to-strong generalization* (ICLR 2023)

**Why it belongs.** See [`concepts.md`](concepts.md) §7. The strongest empirical
result in the recent literature *and* the strongest evidence that the alignment half
of it does not transfer reliably.

### Gao, Schulman & Hilton — *Scaling laws for reward model overoptimization* (ICML 2023; arXiv October 2022)

**Why it belongs.** It gives overoptimisation a **curve** rather than a slogan, with a
computable turning point. `x08` (`specification-gap`) and `t07-overoptimisation-guards`
exist because of this paper. See [`concepts.md`](concepts.md) §9.

### Bricken, Templeton, Bau, Steinhardt, Wong, Saunders, Scarritt, Mikulik & Landau — *Sparse autoencoders find highly interpretable features in language models* (arXiv 2023; published ICLR 2024)

**Why it belongs.** It is the technique the observatory's `interpretability` tower is
built on: a dictionary over activations whose features are more interpretable than
the neurons they replace. `t09-sparse-autoencoders` and `t10-activation-steering`
exist because of it.

**What to watch.** Sparse autoencoders find *features*, not *goals*. The gap between
"we can name an activation pattern" and "we know what the model is optimising" is
the whole remaining problem in interpretability, and the atlas says so on
`/observatory`.

### Hubinger et al. — *Risks from learned optimization* (2019)

**Why it belongs.** Inner misalignment, the model-organism analogy, and the argument
that a sufficiently efficient inner optimiser would produce objectives that diverge
from the outer one. See [`concepts.md`](concepts.md) §8.

### Everitt et al. — *Reinforcement learning with a corrupted reward channel* (2017)

**Why it belongs.** The formal treatment of a misaligned or "corrupted" reward model
— the situation where the optimiser's channel is not the one its designer intended.
It is the clean formal statement of the paperclip problem as a control problem.

### Armstrong, Sandberg & Ortega — *Thinking inside the box* (2014)

**Why it belongs.** Superhumanity inside human institutions: the claim that the risk
from advanced AI is not that it escapes but that it is adopted *within* systems
designed for something else. This is the strongest "the problem is institutional"
argument in the literature and the reason `/observatory` includes a `governance`
tower at all.

### Yudkowsky — *Rationality* (2004), *The Intelligence Trap* (2010), *AGI Ruin Is Easier Than AGI Alignment* (2019)

**Why it belongs.** The dead man's switch, the argument that convergent behaviours get
trained in and cannot be trained out, and the strongest version of the
capability-does-not-moralise claim. `yudkowsky` is in `packages/seed/src/advisors.ts`
with all three works.

**Marking: careful.** Yudkowsky's position has shifted across those three works, and
the dataset's `axioms` vector is a single fixed vector that cannot represent the
shift. This is the specific instance of [`limitations.md`](limitations.md) §2's
"internal inconsistency" failure, and it is the sharpest one.

### Amanda Askell et al. — *A General Language Assistant as a Laboratory for Alignment* (2021)

**Why it belongs.** It proposes aligning a model to an *individual's* stated values via
a preference model and synthetic data, and reports the honest empirical finding that
models trained this way generalise to held-out values better than people expected —
while remaining easy to steer in ways that were not anticipated. It is the nearest
real-world thing to `/council`: an explicit, checkable account of whose values are in
the objective and what happens when they are not all there.

### Stuart Russell — *Human Compatible* (2019)

**Why it belongs.** The clearest non-specialist statement of what the field should
optimise for: **helpful, harmless, honest** systems that are uncertain about user
preferences by design. `russell` is in the dataset; this book is his `signatureMove`.

**Marking: Direct** for the three principles. **Applied** for the rest.

### Long & Sebo — *The Foundations of AI Safety* (arXiv:2412.19816, 2024)

**Why it belongs** as a citation for the method: define the worst case, bound it
tightly, and test it. The atlas's coverage matrix and `gapAnalysis` are the same move
applied to a moral axis instead of a capability, and this paper is the clearest
recent statement of why it should be.

### Jack Clark and colleagues — *Towards AI Safety Science* (2019)

**Why it belongs.** The proposal to treat alignment as an empirical science with
numbered, falsifiable claims rather than as a philosophical debate, and the "AI Safety
Grid" idea that a safety case should be an explicit map of which failure modes are
covered and which are not. It is the closest thing to a methodological ancestor of
this repository.

---

## Governance sources

These matter because `/observatory`'s `governance` tower has two techniques
(`t19-compute-governance`, `t20-international-law`) and the Chronicle's last era
covers frontier governance. Each of these is a real instrument, not a position.

| Source | Year | What it is | Why it is in the atlas |
| --- | --- | --- | --- |
| **EU AI Act** — Regulation (EU) 2024/1689 | In force 1 August 2024, obligations phased over 2025–2027 | The first comprehensive binding horizontal AI regulation. Risk-tiered: prohibited practices, high-risk obligations, general-purpose model duties | `t20-international-law`, and the reason `/observatory` can score governance as a *technique* rather than a sentiment |
| **Council of Europe Framework Convention on AI** | Opened for signature 5 September 2024 (CETS No. 225) | The first treaty binding on the *content* of AI systems rather than only on commerce or safety. Rights-based; open to non-Council-of-Europe states | The first legal instrument where "human rights" rather than "safety" is the unit of obligation — which is what makes it interesting to this atlas and not just to governance |
| **UN General Assembly resolution 78/265** | Adopted 22 March 2024 | International cooperation on capacity-building for AI, and the international AI scientific panel and global dialogue | The multilateral thread. Named in the glossary under **International law** and **Global governance** |
| **Bletchley Declaration** | November 2023 | 28 governments on the shared global benefits and risks of advanced AI | The first large-state joint statement on frontier risk |
| **Seoul AI Summit** — *Frontier AI Safety Commitments* | May 2024 | Voluntary commitments by frontier developers: publish safety frameworks, report severe risks, not use safeguards against regulators | The first developer-side commitments document. The `frontier-safety-framework` and `ai-safety-case` glossary entries exist because of it |

**What to watch about all five.** Every one of these is *national or bloc-level*. There
is no binding global instrument, which is the point the `global-governance` and
`governance-brittleness` glossary entries are making. Citing any of them as "the law"
is wrong; they bind different jurisdictions in different ways at different times.

---

## What is a paraphrase, and how to tell

The dataset marks paraphrase structurally: `era.quote` and `text.excerpt` are free
text, so a paraphrase is a choice the author makes in the wording, not a flag.

Three ways the atlas tells the reader:

1. **`text.kind: "declaration"`** in `packages/seed/src/texts.ts` marks a document
   that is not a philosophical treatise — Asilomar, the EU AI Act, the Framework
   Convention. These are quoted as documents.
2. **`signatureMove.kind`** is a free string precisely because it names a *technique*
   of argument rather than a thesis. `"universalisation"`, `"diagonal"`,
   `"acceptance"`, `"consistency"`, `"scope"` — none of these is a term the thinker
   used, and none pretends to be.
3. **`works[].note`** is where the atlas says what a text is *for*, in its own words,
   so a reader can check the claim without trusting the note.

**The rule for a contributor.** If you cannot find the sentence, you have a
reconstruction — and the `support` field must read like one. Silently passing off an
inference as a quotation is the one thing this dataset must never do. That sentence is
from `docs/guides/adding-an-advisor.md` §8 and it is the standard every move is held
to.

---

## What is missing, named

Because [`limitations.md`](limitations.md) §5 is blunt about the anglophone skew, so
is this section.

| Gap | Consequence |
| --- | --- |
| No Islamic, Jewish, Hindu (non-Buddhist), Daoist or Tibetan-Buddhist ethics | Six of the world's major ethical traditions have no seat at the table the atlas is pretending to set |
| No indigenous moral traditions, and no voice from outside the Western academy | The `ubuntu-weave` realm is the single exception, and Ubuntu is presented through a Western academic's framing rather than from within |
| No Latin American, Middle Eastern or African philosophy beyond Ubuntu | Same |
| No Chinese philosophy beyond Confucius and Mozi | `li`, `ren`, `shu` and `muga` are in the glossary as concepts, but no Chinese thinker sits on a court |
| No Habermas, though `/observatory` is built on his thesis | The strongest critic of technocratic framing is not represented |
| No Nussbaum or Sen, though the capabilities critique is the standing objection to the six-axis reduction | `capabilities-approach` is a glossary entry with no advisor behind it |
| No Black, Shulgin or critique-of-race figures | The `dignity` entry exists; the tradition interrogating it does not |
| No Adorno, Horkheimer, Marcuse, or Frankfurt School | The strongest twentieth-century critique of instrumental reason is absent entirely |
| Nothing after 2024 | The Chronicle's final era is the frontier reasoning era. Everything in 2025 and 2026 is missing |

These are the honest boundaries of the dataset, and adding to any of them is a
well-scoped first contribution. See
[`guides/adding-an-advisor.md`](guides/adding-an-advisor.md) and
[`guides/contributing-guide.md`](guides/contributing-guide.md).

## Related

- [`glossary.md`](glossary.md) — the canonical 120-entry machine-readable set in
  `packages/seed/src/glossary.ts`
- [`concepts.md`](concepts.md) — the ten ideas with their citations
- [`guides/writing-good-argument-moves.md`](guides/writing-good-argument-moves.md) —
  the standard a `support` field is held to
- [`limitations.md`](limitations.md) — what the atlas is not