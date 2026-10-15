import type { MessageKey } from "../keys";

/**
 * German (de).
 *
 * Register note: the kingdom metaphor survives well in German — "Reich" works
 * for both kingdom and realm, so nav and stats stay short. "Rat" is the
 * deliberative council; "Tribunal" is the court of advisors (deliberative, not
 * juridical). "Dilemma" pluralises to "Dilemmata", which is the correct German
 * form and is understood in a technical context.
 *
 * The umlauts and ß are literal — the atlas is not shipped through an ASCII-only
 * pipeline, and "grosse"/"gross" is Swiss usage, not standard.
 */
const MESSAGES: Record<MessageKey, string> = {
  "nav.kingdoms": "Reiche",
  "nav.court": "Tribunal",
  "nav.council": "Rat",
  "nav.dilemmas": "Dilemmata",
  "nav.chronicle": "Chronik",
  "nav.observatory": "Observatorium",
  "nav.experiments": "Experimente",
  "nav.codex": "Codex",
  "nav.method": "Methode",
  "nav.compare": "Reich für Reich",
  "nav.engine": "Die Maschine",
  "nav.journal": "Tagebuch",
  "nav.cartographer": "Kartograf",
  "nav.skip_to_content": "Zum Inhalt springen",
  "nav.menu": "Menü",
  "nav.close": "Schließen",
  "nav.back_to_atlas": "Zurück zu Nooreign",
  "nav.atlas_sections": "Bereiche des Atlasses",

  "hero.eyebrow": "Der philosophische Atlas der Ausrichtung",
  "hero.title": "Was wären wir einem Geist schuldig, der uns übertrifft?",
  "hero.lede":
    "Zwölf Denkschulen, achtundzwanzig Berater und die schwierigen Fälle, in denen ihre Antworten auseinandergehen. Gehen Sie durch die Reiche, rufen Sie dann ein Tribunal zusammen und lesen Sie die Begründung selbst.",
  "hero.determinism": "Kein Zufall. Jedes Urteil ist ein Protokoll, das Sie erneut abspielen können.",
  "hero.cta_atlas": "In den Atlas eintreten",
  "hero.cta_council": "Rat einberufen",
  "hero.method_link": "Methode lesen",
  "stat.kingdoms": "Reiche",
  "stat.advisors": "Berater",
  "stat.eras": "Epochen",
  "stat.dilemmas": "Dilemmata",
  "stat.techniques": "Ausrichtungstechniken",
  "stat.glossary": "Codex-Begriffe",
  "section.realms": "Die Reiche",
  "section.chronicle": "Wie wir hierher kamen",
  "section.breakdown": "Wo die Rechnung kippt",

  "council.title": "Rat",
  "council.convene": "Rat einberufen",
  "council.dilemma": "Dilemma vor dem Tribunal",
  "council.court": "Tribunal",
  "council.add_advisor": "Berater hinzufügen",
  "council.remove": "Entfernen",
  "council.run": "Beratung durchführen",
  "council.running": "Beratung läuft…",
  "council.verdict": "Urteil",
  "council.margin": "Gewonnen mit {margin}",
  "council.confidence": "Konfidenz {confidence}",
  "council.dissent": "Dissens",
  "council.trace": "Begründungsprotokoll",
  "council.round_positions": "Positionen",
  "council.round_objections": "Einwände",
  "council.round_appeals": "Berufungen",
  "council.seed": "Startwert {seed}",
  "council.empty": "Kein Berater hat Platz genommen. Fügen Sie mindestens einen hinzu, um zu beraten.",

  "dilemma.severity": "Schwere",
  "dilemma.ai_relevance": "Relevanz für KI",
  "dilemma.options": "Optionen",
  "dilemma.stakeholders": "Wer die Last trägt",
  "dilemma.lesson": "Was sie lehrt",
  "dilemma.references": "Literatur",
  "dilemma.reversibility": "Umkehrbarkeit",
  "dilemma.risk": "Risiko",
  "dilemma.agent_harm": "Schaden am Agenten",
  "dilemma.on_trial": "Vor Gericht",
  "dilemma.none": "Kein Dilemma passt zu diesen Filtern.",
  "dilemma.filter": "Filter",

  "kingdom.founded": "Gegründet {year}",
  "kingdom.terrain": "Gelände",
  "kingdom.motto": "Leitspruch",
  "kingdom.creed": "Glaubenssatz",
  "kingdom.on_ai": "Über künstliche Intelligenz",
  "kingdom.questions": "Fragen, die es aufwirft",
  "kingdom.relations": "Beziehungen",
  "kingdom.court": "Tribunal",
  "kingdom.landmarks": "Landmarken",
  "kingdom.canon": "Kanon",
  "advisor.born": "Geboren {year}",
  "advisor.died": "Gestorben {year}",
  "advisor.works": "Werke",
  "advisor.signature_move": "Signaturzug",
  "advisor.argument_moves": "Argumentationsschritte",
  "advisor.voice": "Stimme",

  "chronicle.scrub": "Springe zu {year}",
  "chronicle.stack_available": "Stack verfügbar",
  "chronicle.milestones": "Meilensteine",
  "chronicle.eras": "Epochen",
  "observatory.towers": "Türme",
  "observatory.coverage": "Abdeckung",
  "observatory.gaps": "Lücken",
  "observatory.readiness": "Bereitschaft",
  "observatory.dependencies": "Abhängigkeiten",
  "observatory.uncovered": "Nicht abgedeckt",

  "common.search": "Suchen",
  "common.filter": "Filtern",
  "common.reset": "Zurücksetzen",
  "common.loading": "Wird geladen…",
  "common.error": "Etwas ist schiefgelaufen.",
  "common.retry": "Erneut versuchen",
  "common.not_found": "Nicht gefunden",
  "common.read_more": "Weiterlesen",
  "common.of": "{count} von {total}",
  "common.results": "{count} Ergebnisse",
};

/**
 * Frozen on export: a catalogue is shared by every request the server handles,
 * so a render that mutated one would leak a language's strings into every other
 * locale for the rest of the process's life.
 */
export const de: Record<MessageKey, string> = Object.freeze(MESSAGES);
