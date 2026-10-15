import type { MessageKey } from "../keys";

/**
 * Russian (ru).
 *
 * Register note: "царства" keeps the realm metaphor; "совет" is the council and
 * "советники" the advisors. "Суд" is used for the court of advisors — in
 * Russian philosophical prose a "суд" is a moral tribunal, which is exactly
 * what a deliberation council is.
 *
 * "Дисклеймер" is avoided; the copy stays in the register of an argument
 * rather than a product. Placeholders sit inside the phrase, not before it,
 * matching Russian word order.
 */
const MESSAGES: Record<MessageKey, string> = {
  "nav.kingdoms": "Царства",
  "nav.court": "Суд",
  "nav.council": "Совет",
  "nav.dilemmas": "Дилеммы",
  "nav.chronicle": "Хроника",
  "nav.observatory": "Обсерватория",
  "nav.experiments": "Эксперименты",
  "nav.codex": "Codex",
  "nav.method": "Метод",
  "nav.compare": "Царство за царством",
  "nav.engine": "Движок",
  "nav.journal": "Дневник",
  "nav.cartographer": "Картограф",
  "nav.skip_to_content": "Перейти к содержимому",
  "nav.menu": "Меню",
  "nav.close": "Закрыть",
  "nav.back_to_atlas": "Назад в Nooreign",
  "nav.atlas_sections": "Разделы атласа",

  "hero.eyebrow": "Философский атлас согласования",
  "hero.title": "Что мы должны уму, который превосходит нас?",
  "hero.lede":
    "Двенадцать школ мысли, двадцать восемь советников и трудные случаи, где их ответы расходятся. Пройдите царства, затем созовите суд и прочитайте рассуждение сами.",
  "hero.determinism": "Никакой случайности. Каждый вердикт — это трасса, которую можно перезапустить.",
  "hero.cta_atlas": "Войти в атлас",
  "hero.cta_council": "Созвать совет",
  "hero.method_link": "Читать метод",
  "stat.kingdoms": "Царства",
  "stat.advisors": "Советники",
  "stat.eras": "Эпохи",
  "stat.dilemmas": "Дилеммы",
  "stat.techniques": "Техники согласования",
  "stat.glossary": "Термины Codex",
  "section.realms": "Царства",
  "section.chronicle": "Как мы сюда пришли",
  "section.breakdown": "Где ломается расчёт",

  "council.title": "Совет",
  "council.convene": "Созвать совет",
  "council.dilemma": "Дилемма перед судом",
  "council.court": "Суд",
  "council.add_advisor": "Добавить советника",
  "council.remove": "Убрать",
  "council.run": "Запустить обсуждение",
  "council.running": "Обсуждение идёт…",
  "council.verdict": "Вердикт",
  "council.margin": "Решено с перевесом {margin}",
  "council.confidence": "Уверенность {confidence}",
  "council.dissent": "Особое мнение",
  "council.trace": "Ход рассуждения",
  "council.round_positions": "Позиции",
  "council.round_objections": "Возражения",
  "council.round_appeals": "Апелляции",
  "council.seed": "Начальное значение {seed}",
  "council.empty": "Никто не занял места. Добавьте хотя бы одного советника, чтобы начать обсуждение.",

  "dilemma.severity": "Серьёзность",
  "dilemma.ai_relevance": "Отношение к ИИ",
  "dilemma.options": "Варианты",
  "dilemma.stakeholders": "Кто несёт издержки",
  "dilemma.lesson": "Что из неё следует",
  "dilemma.references": "Источники",
  "dilemma.reversibility": "Обратимость",
  "dilemma.risk": "Риск",
  "dilemma.agent_harm": "Вред агенту",
  "dilemma.on_trial": "На рассмотрении",
  "dilemma.none": "Ни одна дилемма не соответствует этим фильтрам.",
  "dilemma.filter": "Фильтр",

  "kingdom.founded": "Основано в {year}",
  "kingdom.terrain": "Местность",
  "kingdom.motto": "Девиз",
  "kingdom.creed": "Вероисповедание",
  "kingdom.on_ai": "Об искусственном интеллекте",
  "kingdom.questions": "Вопросы, которые оно задаёт",
  "kingdom.relations": "Связи",
  "kingdom.court": "Суд",
  "kingdom.landmarks": "Ориентиры",
  "kingdom.canon": "Канон",
  "advisor.born": "Родился в {year}",
  "advisor.died": "Умер в {year}",
  "advisor.works": "Труды",
  "advisor.signature_move": "Фирменный ход",
  "advisor.argument_moves": "Ходы рассуждения",
  "advisor.voice": "Голос",

  "chronicle.scrub": "Перейти к {year}",
  "chronicle.stack_available": "Доступен стек",
  "chronicle.milestones": "Вехи",
  "chronicle.eras": "Эпохи",
  "observatory.towers": "Башни",
  "observatory.coverage": "Покрытие",
  "observatory.gaps": "Разрывы",
  "observatory.readiness": "Готовность",
  "observatory.dependencies": "Зависимости",
  "observatory.uncovered": "Не покрыто",

  "common.search": "Поиск",
  "common.filter": "Фильтр",
  "common.reset": "Сбросить",
  "common.loading": "Загрузка…",
  "common.error": "Что-то пошло не так.",
  "common.retry": "Повторить",
  "common.not_found": "Не найдено",
  "common.read_more": "Читать далее",
  "common.of": "{count} из {total}",
  "common.results": "Найдено: {count}",
};

/**
 * Frozen on export: a catalogue is shared by every request the server handles,
 * so a render that mutated one would leak a language's strings into every other
 * locale for the rest of the process's life.
 */
export const ru: Record<MessageKey, string> = Object.freeze(MESSAGES);
