import type { MessageKey } from "../keys";

/**
 * Simplified Chinese (zh).
 *
 * Register note: 语体 is written-formal but plain — no 四字格 marketing
 * flourishes, because the site's register is an argument, not a slogan. The
 * kingdom metaphor maps to 诸国 (the various realms), which reads as an atlas of
 * thought rather than a literal list of kingdoms.
 *
 * "议事庭" is the court of advisors (deliberative, not a court of law, which
 * would be 法院). Arabic-Indic numerals are not used here: Simplified Chinese
 * conventionally writes 1,234, and `formatCount` follows the locale tag.
 */
const MESSAGES: Record<MessageKey, string> = {
  "nav.kingdoms": "诸国",
  "nav.court": "议事庭",
  "nav.council": "评议会",
  "nav.dilemmas": "困境",
  "nav.chronicle": "编年史",
  "nav.observatory": "观测台",
  "nav.experiments": "实验",
  "nav.codex": "Codex",
  "nav.method": "方法",
  "nav.compare": "逐国对比",
  "nav.engine": "分析引擎",
  "nav.journal": "札记",
  "nav.cartographer": "论证图谱",
  "nav.skip_to_content": "跳到正文",
  "nav.menu": "菜单",
  "nav.close": "关闭",
  "nav.back_to_atlas": "返回 Nooreign",
  "nav.atlas_sections": "地图栏目",

  "hero.eyebrow": "对齐问题的哲学地图",
  "hero.title": "面对超越我们的心智，我们亏欠什么？",
  "hero.lede":
    "十二个思想流派，二十八位顾问，以及他们的答案彼此分歧的棘手个案。走过诸国，然后召集议事庭，亲自读一遍推理过程。",
  "hero.determinism": "没有随机。每一份判决都是一条可以重跑的轨迹。",
  "hero.cta_atlas": "进入地图",
  "hero.cta_council": "召集评议会",
  "hero.method_link": "阅读方法",
  "stat.kingdoms": "诸国",
  "stat.advisors": "顾问",
  "stat.eras": "时代",
  "stat.dilemmas": "困境",
  "stat.techniques": "对齐技术",
  "stat.glossary": "Codex 词条",
  "section.realms": "诸国",
  "section.chronicle": "我们如何走到今天",
  "section.breakdown": "算式崩落之处",

  "council.title": "评议会",
  "council.convene": "召集评议会",
  "council.dilemma": "摆在议事庭前的困境",
  "council.court": "议事庭",
  "council.add_advisor": "添加顾问",
  "council.remove": "移除",
  "council.run": "开始审议",
  "council.running": "审议中…",
  "council.verdict": "判决",
  "council.margin": "以 {margin} 胜出",
  "council.confidence": "置信度 {confidence}",
  "council.dissent": "异议",
  "council.trace": "推理轨迹",
  "council.round_positions": "立场",
  "council.round_objections": "反驳",
  "council.round_appeals": "上诉",
  "council.seed": "随机种子 {seed}",
  "council.empty": "尚未有顾问入席。至少添加一位才能开始审议。",

  "dilemma.severity": "严重程度",
  "dilemma.ai_relevance": "与 AI 的相关性",
  "dilemma.options": "选项",
  "dilemma.stakeholders": "由谁承担",
  "dilemma.lesson": "它教会我们什么",
  "dilemma.references": "参考",
  "dilemma.reversibility": "可逆性",
  "dilemma.risk": "风险",
  "dilemma.agent_harm": "对智能体的伤害",
  "dilemma.on_trial": "审理中",
  "dilemma.none": "没有符合这些筛选条件的困境。",
  "dilemma.filter": "筛选",

  "kingdom.founded": "始建于 {year} 年",
  "kingdom.terrain": "地貌",
  "kingdom.motto": "格言",
  "kingdom.creed": "信条",
  "kingdom.on_ai": "论机器智能",
  "kingdom.questions": "它提出的追问",
  "kingdom.relations": "关系",
  "kingdom.court": "议事庭",
  "kingdom.landmarks": "地标",
  "kingdom.canon": "典籍",
  "advisor.born": "{year} 年生",
  "advisor.died": "{year} 年卒",
  "advisor.works": "著作",
  "advisor.signature_move": "看家论证",
  "advisor.argument_moves": "论证手法",
  "advisor.voice": "声音",

  "chronicle.scrub": "跳转到 {year} 年",
  "chronicle.stack_available": "已覆盖的技术栈",
  "chronicle.milestones": "里程碑",
  "chronicle.eras": "时代",
  "observatory.towers": "塔",
  "observatory.coverage": "覆盖",
  "observatory.gaps": "缺口",
  "observatory.readiness": "就绪度",
  "observatory.dependencies": "依赖",
  "observatory.uncovered": "未覆盖",

  "common.search": "搜索",
  "common.filter": "筛选",
  "common.reset": "重置",
  "common.loading": "加载中…",
  "common.error": "出了点问题。",
  "common.retry": "重试",
  "common.not_found": "未找到",
  "common.read_more": "继续阅读",
  "common.of": "共 {total} 项，第 {count} 项",
  "common.results": "{count} 条结果",
};

/**
 * Frozen on export: a catalogue is shared by every request the server handles,
 * so a render that mutated one would leak a language's strings into every other
 * locale for the rest of the process's life.
 */
export const zh: Record<MessageKey, string> = Object.freeze(MESSAGES);
