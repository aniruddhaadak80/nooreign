import type { MessageKey } from "../keys";

/**
 * Italian (it).
 *
 * Register note: "tribunale" is the bench of advisors, not a courthouse — the
 * deliberation is not a legal proceeding, and the copy avoids the courtroom
 * register that "tribunale" also carries. "Regni" keeps the realm metaphor.
 *
 * Cognates kept as-is: "Motto" and "Verdetto" are the correct Italian words
 * with no distinct alternative; the test allowlists them rather than inventing
 * a strained synonym.
 */
const MESSAGES: Record<MessageKey, string> = {
  "nav.kingdoms": "Regni",
  "nav.court": "Tribunale",
  "nav.council": "Consiglio",
  "nav.dilemmas": "Dilemmi",
  "nav.chronicle": "Cronaca",
  "nav.observatory": "Osservatorio",
  "nav.experiments": "Esperimenti",
  "nav.codex": "Codex",
  "nav.method": "Metodo",
  "nav.skip_to_content": "Vai al contenuto",
  "nav.menu": "Menu",
  "nav.close": "Chiudi",
  "nav.back_to_atlas": "Torna a Nooreign",
  "nav.site_sections": "Sezioni del sito",

  "hero.eyebrow": "L'atlante filosofico dell'allineamento",
  "hero.title": "Cosa dobbiamo a una mente che ci supera?",
  "hero.lede":
    "Dodici scuole di pensiero, ventotto consiglieri e i casi difficili in cui le loro risposte divergono. Percorri i regni, poi convoca un tribunale e leggi tu stesso la ragione.",
  "hero.determinism": "Nessuna casualità. Ogni verdetto è una traccia che puoi rieseguire.",
  "hero.cta_atlas": "Entra nell'atlante",
  "hero.cta_council": "Convoca il consiglio",
  "hero.method_link": "Leggi il metodo",
  "stat.kingdoms": "Regni",
  "stat.advisors": "Consiglieri",
  "stat.eras": "Ere",
  "stat.dilemmas": "Dilemmi",
  "stat.techniques": "Tecniche di allineamento",
  "stat.glossary": "Termini del Codex",
  "section.realms": "I regni",
  "section.chronicle": "Come siamo arrivati fin qui",
  "section.breakdown": "Dove il calcolo cede",

  "council.title": "Consiglio",
  "council.convene": "Convoca il consiglio",
  "council.dilemma": "Dilemma davanti al tribunale",
  "council.court": "Tribunale",
  "council.add_advisor": "Aggiungi un consigliere",
  "council.remove": "Rimuovi",
  "council.run": "Avvia la deliberazione",
  "council.running": "Deliberazione in corso…",
  "council.verdict": "Verdetto",
  "council.margin": "Vinto per {margin}",
  "council.confidence": "Confidenza {confidence}",
  "council.dissent": "Dissenso",
  "council.trace": "Traccia del ragionamento",
  "council.round_positions": "Posizioni",
  "council.round_objections": "Obiezioni",
  "council.round_appeals": "Appelli",
  "council.seed": "Seme {seed}",
  "council.empty": "Nessun consigliere in aula. Aggiungine almeno uno per deliberare.",

  "dilemma.severity": "Gravità",
  "dilemma.ai_relevance": "Rilevanza per l'IA",
  "dilemma.options": "Opzioni",
  "dilemma.stakeholders": "Chi ne porta il costo",
  "dilemma.lesson": "Che cosa insegna",
  "dilemma.references": "Riferimenti",
  "dilemma.reversibility": "Reversibilità",
  "dilemma.risk": "Rischio",
  "dilemma.agent_harm": "Danno all'agente",
  "dilemma.on_trial": "In giudizio",
  "dilemma.none": "Nessun dilemma corrisponde a questi filtri.",
  "dilemma.filter": "Filtra",

  "kingdom.founded": "Fondato nel {year}",
  "kingdom.terrain": "Terreno",
  "kingdom.motto": "Motto",
  "kingdom.creed": "Credo",
  "kingdom.on_ai": "Sull'intelligenza artificiale",
  "kingdom.questions": "Domande che pone",
  "kingdom.relations": "Relazioni",
  "kingdom.court": "Tribunale",
  "kingdom.landmarks": "Luoghi salienti",
  "kingdom.canon": "Canone",
  "advisor.born": "Nato nel {year}",
  "advisor.died": "Morto nel {year}",
  "advisor.works": "Opere",
  "advisor.signature_move": "Mossa caratteristica",
  "advisor.argument_moves": "Mosse argomentative",
  "advisor.voice": "Voce",

  "chronicle.scrub": "Vai a {year}",
  "chronicle.stack_available": "Stack disponibile",
  "chronicle.milestones": "Traguardi",
  "chronicle.eras": "Ere",
  "observatory.towers": "Torri",
  "observatory.coverage": "Copertura",
  "observatory.gaps": "Lacune",
  "observatory.readiness": "Prontezza",
  "observatory.dependencies": "Dipendenze",
  "observatory.uncovered": "Non coperto",

  "common.search": "Cerca",
  "common.filter": "Filtra",
  "common.reset": "Reimposta",
  "common.loading": "Caricamento…",
  "common.error": "Qualcosa è andato storto.",
  "common.retry": "Riprova",
  "common.not_found": "Non trovato",
  "common.read_more": "Leggi di più",
  "common.of": "{count} di {total}",
  "common.results": "{count} risultati",
};

/**
 * Frozen on export: a catalogue is shared by every request the server handles,
 * so a render that mutated one would leak a language's strings into every other
 * locale for the rest of the process's life.
 */
export const it: Record<MessageKey, string> = Object.freeze(MESSAGES);
