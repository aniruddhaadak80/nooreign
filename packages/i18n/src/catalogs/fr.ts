import type { MessageKey } from "../keys";

/**
 * French (fr).
 *
 * Register note: "royaume" carries the kingdom metaphor without sounding
 * medieval; "conseil" is the deliberative body, "conseillers" the advisors.
 * "Trace" is kept as the in-world term for a reasoning trace, matching the
 * chronicle's vocabulary. Register, not politeness: "vous" is used throughout
 * because the atlas addresses a reader, not a crowd.
 *
 * Several one-word labels are genuine French-English cognates ("Options",
 * "Positions", "Objections", "Verdict", "Menu", "Relations", "Terrain", "Canon").
 * The test allowlists them explicitly rather than forcing an awkward
 * synonym — that is the honest outcome, not a missed translation.
 */
const MESSAGES: Record<MessageKey, string> = {
  "nav.kingdoms": "Royaumes",
  "nav.court": "Cour",
  "nav.council": "Conseil",
  "nav.dilemmas": "Dilemmes",
  "nav.chronicle": "Chronique",
  "nav.observatory": "Observatoire",
  "nav.experiments": "Expériences",
  "nav.codex": "Codex",
  "nav.method": "Méthode",
  "nav.skip_to_content": "Aller au contenu",
  "nav.menu": "Menu",
  "nav.close": "Fermer",
  "nav.back_to_atlas": "Retour à Nooreign",
  "nav.site_sections": "Sections du site",

  "hero.eyebrow": "L'atlas philosophique de l'alignement",
  "hero.title": "Que devrions-nous à un esprit qui nous dépasse ?",
  "hero.lede":
    "Douze écoles de pensée, vingt-huit conseillers, et les cas difficiles où leurs réponses divergent. Parcourez les royaumes, puis convoquez une cour et lisez le raisonnement vous-même.",
  "hero.determinism": "Aucun hasard. Chaque verdict est une trace que vous pouvez relancer.",
  "hero.cta_atlas": "Entrer dans l'atlas",
  "hero.cta_council": "Convoquer le conseil",
  "hero.method_link": "Lire la méthode",
  "stat.kingdoms": "Royaumes",
  "stat.advisors": "Conseillers",
  "stat.eras": "Ères",
  "stat.dilemmas": "Dilemmes",
  "stat.techniques": "Techniques d'alignement",
  "stat.glossary": "Termes du Codex",
  "section.realms": "Les royaumes",
  "section.chronicle": "Comment nous en sommes arrivés là",
  "section.breakdown": "Là où le calcul échoue",

  "council.title": "Conseil",
  "council.convene": "Convoquer le conseil",
  "council.dilemma": "Dilemme devant la cour",
  "council.court": "Cour",
  "council.add_advisor": "Ajouter un conseiller",
  "council.remove": "Retirer",
  "council.run": "Lancer la délibération",
  "council.running": "Délibération…",
  "council.verdict": "Verdict",
  "council.margin": "Gagné à {margin}",
  "council.confidence": "Confiance {confidence}",
  "council.dissent": "Dissensus",
  "council.trace": "Trace du raisonnement",
  "council.round_positions": "Positions",
  "council.round_objections": "Objections",
  "council.round_appeals": "Appels",
  "council.seed": "Graine {seed}",
  "council.empty": "Aucun conseiller en place. Ajoutez-en au moins un pour délibérer.",

  "dilemma.severity": "Gravité",
  "dilemma.ai_relevance": "Pertinence pour l'IA",
  "dilemma.options": "Options",
  "dilemma.stakeholders": "Qui en pâtit",
  "dilemma.lesson": "Ce qu'elle enseigne",
  "dilemma.references": "Références",
  "dilemma.reversibility": "Réversibilité",
  "dilemma.risk": "Risque",
  "dilemma.agent_harm": "Tort causé à l'agent",
  "dilemma.on_trial": "En jugement",
  "dilemma.none": "Aucun dilemme ne correspond à ces filtres.",
  "dilemma.filter": "Filtrer",

  "kingdom.founded": "Fondé en {year}",
  "kingdom.terrain": "Terrain",
  "kingdom.motto": "Devise",
  "kingdom.creed": "Credo",
  "kingdom.on_ai": "Sur l'intelligence artificielle",
  "kingdom.questions": "Questions qu'il pose",
  "kingdom.relations": "Relations",
  "kingdom.court": "Cour",
  "kingdom.landmarks": "Repères",
  "kingdom.canon": "Canon",
  "advisor.born": "Né en {year}",
  "advisor.died": "Mort en {year}",
  "advisor.works": "Œuvres",
  "advisor.signature_move": "Coup de signature",
  "advisor.argument_moves": "Mouvements de l'argumentation",
  "advisor.voice": "Voix",

  "chronicle.scrub": "Aller à {year}",
  "chronicle.stack_available": "Stack disponible",
  "chronicle.milestones": "Jalons",
  "chronicle.eras": "Ères",
  "observatory.towers": "Tours",
  "observatory.coverage": "Couverture",
  "observatory.gaps": "Lacunes",
  "observatory.readiness": "État de préparation",
  "observatory.dependencies": "Dépendances",
  "observatory.uncovered": "Non couvert",

  "common.search": "Rechercher",
  "common.filter": "Filtrer",
  "common.reset": "Réinitialiser",
  "common.loading": "Chargement…",
  "common.error": "Une erreur est survenue.",
  "common.retry": "Réessayer",
  "common.not_found": "Introuvable",
  "common.read_more": "Lire la suite",
  "common.of": "{count} sur {total}",
  "common.results": "{count} résultats",
};

/**
 * Frozen on export: a catalogue is shared by every request the server handles,
 * so a render that mutated one would leak a language's strings into every other
 * locale for the rest of the process's life.
 */
export const fr: Record<MessageKey, string> = Object.freeze(MESSAGES);
