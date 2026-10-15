import type { MessageKey } from "../keys";

/**
 * Brazilian Portuguese (pt-BR).
 *
 * Register note: "reino" for the realms, "tribunal" for the court of advisors.
 * "Conselho" is the deliberative body, "conselheiros" the advisors. Brazilian
 * usage throughout — "time" over "equipa", "tela" over "ecrã" is avoided since
 * the atlas renders on desktop too.
 *
 * "Menu" is identical to the English and that is correct Brazilian Portuguese;
 * the test allowlists it.
 */
const MESSAGES: Record<MessageKey, string> = {
  "nav.kingdoms": "Reinos",
  "nav.court": "Tribunal",
  "nav.council": "Conselho",
  "nav.dilemmas": "Dilemas",
  "nav.chronicle": "Crônica",
  "nav.observatory": "Observatório",
  "nav.experiments": "Experimentos",
  "nav.codex": "Codex",
  "nav.method": "Método",
  "nav.compare": "Reino por reino",
  "nav.engine": "O motor",
  "nav.journal": "Diário",
  "nav.cartographer": "Cartógrafo",
  "nav.skip_to_content": "Pular para o conteúdo",
  "nav.menu": "Menu",
  "nav.close": "Fechar",
  "nav.back_to_atlas": "Voltar ao Nooreign",
  "nav.atlas_sections": "Seções do atlas",

  "hero.eyebrow": "O atlas filosófico do alinhamento",
  "hero.title": "O que devemos a uma mente que nos supera?",
  "hero.lede":
    "Doze escolas de pensamento, vinte e oito conselheiros e os casos difíceis em que suas respostas divergem. Percorra os reinos, reúna um tribunal e leia o raciocínio por conta própria.",
  "hero.determinism": "Sem aleatoriedade. Cada veredicto é um registro que você pode reexecutar.",
  "hero.cta_atlas": "Entrar no atlas",
  "hero.cta_council": "Convocar o conselho",
  "hero.method_link": "Ler o método",
  "stat.kingdoms": "Reinos",
  "stat.advisors": "Conselheiros",
  "stat.eras": "Épocas",
  "stat.dilemmas": "Dilemas",
  "stat.techniques": "Técnicas de alinhamento",
  "stat.glossary": "Termos do Codex",
  "section.realms": "Os reinos",
  "section.chronicle": "Como chegamos até aqui",
  "section.breakdown": "Onde a conta quebra",

  "council.title": "Conselho",
  "council.convene": "Convocar o conselho",
  "council.dilemma": "Dilema diante do tribunal",
  "council.court": "Tribunal",
  "council.add_advisor": "Adicionar conselheiro",
  "council.remove": "Remover",
  "council.run": "Executar a deliberação",
  "council.running": "Deliberando…",
  "council.verdict": "Veredicto",
  "council.margin": "Vencido por {margin}",
  "council.confidence": "Confiança {confidence}",
  "council.dissent": "Dissenso",
  "council.trace": "Registro do raciocínio",
  "council.round_positions": "Posições",
  "council.round_objections": "Objeções",
  "council.round_appeals": "Apelações",
  "council.seed": "Semente {seed}",
  "council.empty": "Nenhum conselheiro sentado. Adicione ao menos um para deliberar.",

  "dilemma.severity": "Gravidade",
  "dilemma.ai_relevance": "Relevância para a IA",
  "dilemma.options": "Opções",
  "dilemma.stakeholders": "Quem arca com o custo",
  "dilemma.lesson": "O que ela ensina",
  "dilemma.references": "Referências",
  "dilemma.reversibility": "Reversibilidade",
  "dilemma.risk": "Risco",
  "dilemma.agent_harm": "Dano ao agente",
  "dilemma.on_trial": "Em julgamento",
  "dilemma.none": "Nenhum dilema corresponde a estes filtros.",
  "dilemma.filter": "Filtrar",

  "kingdom.founded": "Fundado em {year}",
  "kingdom.terrain": "Terreno",
  "kingdom.motto": "Lema",
  "kingdom.creed": "Credo",
  "kingdom.on_ai": "Sobre a inteligência artificial",
  "kingdom.questions": "Perguntas que ele levanta",
  "kingdom.relations": "Relações",
  "kingdom.court": "Tribunal",
  "kingdom.landmarks": "Marcos",
  "kingdom.canon": "Cânone",
  "advisor.born": "Nascido em {year}",
  "advisor.died": "Morto em {year}",
  "advisor.works": "Obras",
  "advisor.signature_move": "Jogada característica",
  "advisor.argument_moves": "Movimentos do argumento",
  "advisor.voice": "Voz",

  "chronicle.scrub": "Ir para {year}",
  "chronicle.stack_available": "Stack disponível",
  "chronicle.milestones": "Marcos",
  "chronicle.eras": "Épocas",
  "observatory.towers": "Torres",
  "observatory.coverage": "Cobertura",
  "observatory.gaps": "Lacunas",
  "observatory.readiness": "Prontidão",
  "observatory.dependencies": "Dependências",
  "observatory.uncovered": "Não coberto",

  "common.search": "Buscar",
  "common.filter": "Filtrar",
  "common.reset": "Redefinir",
  "common.loading": "Carregando…",
  "common.error": "Algo deu errado.",
  "common.retry": "Tentar de novo",
  "common.not_found": "Não encontrado",
  "common.read_more": "Leia mais",
  "common.of": "{count} de {total}",
  "common.results": "{count} resultados",
};

/**
 * Frozen on export: a catalogue is shared by every request the server handles,
 * so a render that mutated one would leak a language's strings into every other
 * locale for the rest of the process's life.
 */
export const ptBR: Record<MessageKey, string> = Object.freeze(MESSAGES);
