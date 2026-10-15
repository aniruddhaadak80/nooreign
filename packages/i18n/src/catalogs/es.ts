import type { MessageKey } from "../keys";

/**
 * Spanish (es).
 *
 * Register note: "reino" is kept for the philosophical schools-as-realms, since
 * the whole atlas is built on the kingdom metaphor (crest, terrain, court).
 * "Tribuna" is used for the court of advisors — it means the bench/rostrum the
 * advisors speak from, not "tribunal" in the legal sense, which would promise
 * a judgement Nooreign never delivers.
 *
 * Left untranslated on purpose: `Codex` and `Nooreign` (artefact and product
 * names). "IA" rather than "AI" is the RAE-preferred Spanish form.
 */
const MESSAGES: Record<MessageKey, string> = {
  "nav.kingdoms": "Reinos",
  "nav.court": "Tribuna",
  "nav.council": "Consejo",
  "nav.dilemmas": "Dilemas",
  "nav.chronicle": "Crónica",
  "nav.observatory": "Observatorio",
  "nav.experiments": "Experimentos",
  "nav.codex": "Codex",
  "nav.method": "Método",
  "nav.compare": "Reino por reino",
  "nav.engine": "El motor",
  "nav.journal": "Diario",
  "nav.cartographer": "Cartógrafo",
  "nav.skip_to_content": "Saltar al contenido",
  "nav.menu": "Menú",
  "nav.close": "Cerrar",
  "nav.back_to_atlas": "Volver a Nooreign",
  "nav.atlas_sections": "Secciones del atlas",

  "hero.eyebrow": "El atlas filosófico de la alineación",
  "hero.title": "¿Qué le debemos a una mente que nos supera?",
  "hero.lede":
    "Doce escuelas de pensamiento, veintiocho consejeros y los casos difíciles donde sus respuestas discrepan. Recorre los reinos, convoca a un tribunal y lee el razonamiento por tu cuenta.",
  "hero.determinism": "Sin azar. Cada veredicto es un rastro que puedes volver a ejecutar.",
  "hero.cta_atlas": "Entrar al atlas",
  "hero.cta_council": "Convocar al consejo",
  "hero.method_link": "Leer el método",
  "stat.kingdoms": "Reinos",
  "stat.advisors": "Consejeros",
  "stat.eras": "Épocas",
  "stat.dilemmas": "Dilemas",
  "stat.techniques": "Técnicas de alineación",
  "stat.glossary": "Términos del Codex",
  "section.realms": "Los reinos",
  "section.chronicle": "Cómo llegamos hasta aquí",
  "section.breakdown": "Donde se rompe el cálculo",

  "council.title": "Consejo",
  "council.convene": "Convocar al consejo",
  "council.dilemma": "Dilema ante el tribunal",
  "council.court": "Tribuna",
  "council.add_advisor": "Añadir consejero",
  "council.remove": "Quitar",
  "council.run": "Ejecutar la deliberación",
  "council.running": "Deliberando…",
  "council.verdict": "Veredicto",
  "council.margin": "Ganado por {margin}",
  "council.confidence": "Confianza {confidence}",
  "council.dissent": "Disenso",
  "council.trace": "Rastro del razonamiento",
  "council.round_positions": "Posiciones",
  "council.round_objections": "Objeciones",
  "council.round_appeals": "Apelaciones",
  "council.seed": "Semilla {seed}",
  "council.empty": "Ningún consejero en la tribuna. Añade al menos uno para deliberar.",

  "dilemma.severity": "Gravedad",
  "dilemma.ai_relevance": "Relevancia para la IA",
  "dilemma.options": "Opciones",
  "dilemma.stakeholders": "A quién afecta",
  "dilemma.lesson": "Lo que enseña",
  "dilemma.references": "Referencias",
  "dilemma.reversibility": "Reversibilidad",
  "dilemma.risk": "Riesgo",
  "dilemma.agent_harm": "Daño al agente",
  "dilemma.on_trial": "En juicio",
  "dilemma.none": "Ningún dilema coincide con estos filtros.",
  "dilemma.filter": "Filtrar",

  "kingdom.founded": "Fundado en {year}",
  "kingdom.terrain": "Terreno",
  "kingdom.motto": "Lema",
  "kingdom.creed": "Credo",
  "kingdom.on_ai": "Sobre la inteligencia artificial",
  "kingdom.questions": "Preguntas que plantea",
  "kingdom.relations": "Relaciones",
  "kingdom.court": "Tribuna",
  "kingdom.landmarks": "Hitos",
  "kingdom.canon": "Cánon",
  "advisor.born": "Nació en {year}",
  "advisor.died": "Murió en {year}",
  "advisor.works": "Obras",
  "advisor.signature_move": "Jugada característica",
  "advisor.argument_moves": "Movimientos del argumento",
  "advisor.voice": "Voz",

  "chronicle.scrub": "Desplazarse a {year}",
  "chronicle.stack_available": "Stack disponible",
  "chronicle.milestones": "Hitos",
  "chronicle.eras": "Épocas",
  "observatory.towers": "Torres",
  "observatory.coverage": "Cobertura",
  "observatory.gaps": "Lagunas",
  "observatory.readiness": "Preparación",
  "observatory.dependencies": "Dependencias",
  "observatory.uncovered": "Sin cubrir",

  "common.search": "Buscar",
  "common.filter": "Filtrar",
  "common.reset": "Restablecer",
  "common.loading": "Cargando…",
  "common.error": "Algo salió mal.",
  "common.retry": "Reintentar",
  "common.not_found": "No encontrado",
  "common.read_more": "Leer más",
  "common.of": "{count} de {total}",
  "common.results": "{count} resultados",
};

/**
 * Frozen on export: a catalogue is shared by every request the server handles,
 * so a render that mutated one would leak a language's strings into every other
 * locale for the rest of the process's life.
 */
export const es: Record<MessageKey, string> = Object.freeze(MESSAGES);
