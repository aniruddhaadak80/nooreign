/**
 * The English source of truth for every UI string in Nooreign.
 *
 * WHY the object is frozen and lives alone: it is the *only* place a string is
 * authored. Every other catalogue is typed as `Record<MessageKey, string>`, so
 * adding a key here is a compile error in all thirteen translations until each
 * one is written by hand. That is the whole point — a machine placeholder that
 * nobody reviewed is worse than a visible gap.
 *
 * `{token}` placeholders are part of the contract. `translate()` replaces them
 * and warns in dev when a caller forgets a variable, and `assertCatalogs()`
 * fails if a translation drops a token or invents one English does not have.
 * Tokens are deliberately few and boring (`year`, `count`, `seed`) so that
 * every script can place them in natural word order.
 *
 * There are exactly 100 keys (18 nav + 16 landing + 18 council + 12 dilemmas +
 * 16 kingdom + 10 chronicle + 10 common), grouped so a reader can find a string
 * by the surface that renders it. Adding another key is a design decision, not
 * a convenience.
 */

/* ------------------------------------------------------------------ *
 * Navigation & chrome — 18
 * ------------------------------------------------------------------ */
const NAVIGATION = {
  "nav.kingdoms": "Kingdoms",
  "nav.court": "Court",
  "nav.council": "Council",
  "nav.dilemmas": "Dilemmas",
  "nav.chronicle": "Chronicle",
  "nav.observatory": "Observatory",
  "nav.experiments": "Experiments",
  // "Codex" is the site's own artefact name, like a product title. It stays
  // untranslated in every locale; the same is true of "Nooreign" in
  // `nav.back_to_atlas` and of the acronyms in `chronicle.stack_available`.
  "nav.codex": "Codex",
  "nav.method": "Method",
  // Added with the realm-comparison, engine, journal and cartographer surfaces.
  "nav.compare": "Realm by realm",
  "nav.engine": "The engine",
  "nav.journal": "Journal",
  "nav.cartographer": "Cartographer",
  "nav.skip_to_content": "Skip to content",
  "nav.menu": "Menu",
  "nav.close": "Close",
  "nav.back_to_atlas": "Back to Nooreign",
  // The header's landmark name. It says "the atlas" because that is the
  // product's own word for itself — the e2e suite pins it, and a landmark
  // called "Site sections" could belong to any website.
  "nav.atlas_sections": "Atlas sections",
} as const;

/* ------------------------------------------------------------------ *
 * Landing — 16
 * ------------------------------------------------------------------ */
const LANDING = {
  "hero.eyebrow": "The philosophical atlas of alignment",
  "hero.title": "What would we owe a mind that outranks us?",
  "hero.lede":
    "Twelve schools of thought, twenty-eight advisors, and the hard cases where their answers disagree. Walk the realms, then convene a court and read the reasoning for yourself.",
  "hero.determinism": "No randomness. Every verdict is a trace you can re-run.",
  "hero.cta_atlas": "Enter the atlas",
  "hero.cta_council": "Convene the council",
  "hero.method_link": "Read the method",
  "stat.kingdoms": "Realms",
  "stat.advisors": "Advisors",
  "stat.eras": "Eras",
  "stat.dilemmas": "Dilemmas",
  "stat.techniques": "Alignment techniques",
  "stat.glossary": "Codex terms",
  "section.realms": "The realms",
  "section.chronicle": "How we got here",
  "section.breakdown": "Where the calculus breaks",
} as const;

/* ------------------------------------------------------------------ *
 * Council — 18
 * ------------------------------------------------------------------ */
const COUNCIL = {
  "council.title": "Council",
  "council.convene": "Convene the council",
  "council.dilemma": "Dilemma before the court",
  "council.court": "Court",
  "council.add_advisor": "Add advisor",
  "council.remove": "Remove",
  "council.run": "Run the deliberation",
  "council.running": "Deliberating…",
  "council.verdict": "Verdict",
  "council.margin": "Won by {margin}",
  "council.confidence": "Confidence {confidence}",
  "council.dissent": "Dissent",
  "council.trace": "Reasoning trace",
  "council.round_positions": "Positions",
  "council.round_objections": "Objections",
  "council.round_appeals": "Appeals",
  "council.seed": "Seed {seed}",
  "council.empty": "No advisors seated. Add at least one to deliberate.",
} as const;

/* ------------------------------------------------------------------ *
 * Dilemmas — 12
 * ------------------------------------------------------------------ */
const DILEMMAS = {
  "dilemma.severity": "Severity",
  "dilemma.ai_relevance": "Relevance to AI",
  "dilemma.options": "Options",
  // Deliberately "who bears it" rather than "stakeholders": the dilemmas in
  // `packages/seed` name concrete bearers, and the corporate noun reads wrong
  // next to a case about a paperclip maximiser.
  "dilemma.stakeholders": "Who bears it",
  "dilemma.lesson": "What it teaches",
  "dilemma.references": "References",
  "dilemma.reversibility": "Reversibility",
  "dilemma.risk": "Risk",
  "dilemma.agent_harm": "Agent harm",
  "dilemma.on_trial": "On trial",
  "dilemma.none": "No dilemma matches these filters.",
  "dilemma.filter": "Filter",
} as const;

/* ------------------------------------------------------------------ *
 * Kingdom & court — 16
 * ------------------------------------------------------------------ */
const KINGDOM = {
  "kingdom.founded": "Founded {year}",
  "kingdom.terrain": "Terrain",
  "kingdom.motto": "Motto",
  "kingdom.creed": "Creed",
  "kingdom.on_ai": "On machine intelligence",
  "kingdom.questions": "Questions it presses",
  "kingdom.relations": "Relations",
  "kingdom.court": "Court",
  "kingdom.landmarks": "Landmarks",
  "kingdom.canon": "Canon",
  "advisor.born": "Born {year}",
  "advisor.died": "Died {year}",
  "advisor.works": "Works",
  "advisor.signature_move": "Signature move",
  "advisor.argument_moves": "Argument moves",
  "advisor.voice": "Voice",
} as const;

/* ------------------------------------------------------------------ *
 * Chronicle & observatory — 10
 * ------------------------------------------------------------------ */
const CHRONICLE = {
  "chronicle.scrub": "Scrub to {year}",
  "chronicle.stack_available": "Stack available",
  "chronicle.milestones": "Milestones",
  "chronicle.eras": "Eras",
  "observatory.towers": "Towers",
  "observatory.coverage": "Coverage",
  "observatory.gaps": "Gaps",
  "observatory.readiness": "Readiness",
  "observatory.dependencies": "Dependencies",
  "observatory.uncovered": "Uncovered",
} as const;

/* ------------------------------------------------------------------ *
 * Common & utility — 10
 * ------------------------------------------------------------------ */
const COMMON = {
  "common.search": "Search",
  "common.filter": "Filter",
  "common.reset": "Reset",
  "common.loading": "Loading…",
  "common.error": "Something went wrong.",
  "common.retry": "Retry",
  "common.not_found": "Not found",
  "common.read_more": "Read more",
  "common.of": "{count} of {total}",
  "common.results": "{count} results",
} as const;

/**
 * The complete English catalogue, frozen.
 *
 * WHY frozen: this object is shared across every render on the server. A
 * component that did `EN["nav.title"] = ...` in a dev-only branch would poison
 * the atlas for the rest of the process's life, in every language.
 */
export const EN = Object.freeze({
  ...NAVIGATION,
  ...LANDING,
  ...COUNCIL,
  ...DILEMMAS,
  ...KINGDOM,
  ...CHRONICLE,
  ...COMMON,
});

/**
 * Every key the atlas can render.
 *
 * Derived from `EN` rather than hand-listed so the type can never drift from
 * the data. `Object.freeze` preserves the literal key union of the spread, so
 * this is 96 exact literals — which is what makes the catalogues exhaustive.
 */
export type MessageKey = keyof typeof EN;
