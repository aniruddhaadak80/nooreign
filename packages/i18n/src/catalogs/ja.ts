import type { MessageKey } from "../keys";

/**
 * Japanese (ja).
 *
 * Register note: the philosophical register is 書き言葉-leaning but not stiff —
 * です・ます for interface copy, plain 名詞 for labels. The kingdom metaphor
 * maps to 諸国 ("the various realms"), which reads as an atlas of thought
 * rather than a literal kingdom list.
 *
 * "法廷" is the court of advisors. Placeholders sit where Japanese word order
 * wants them (助数詞 attaches to the noun), which is why the token position
 * differs from the English source.
 */
const MESSAGES: Record<MessageKey, string> = {
  "nav.kingdoms": "諸国",
  "nav.court": "法廷",
  "nav.council": "評議会",
  "nav.dilemmas": "ジレンマ",
  "nav.chronicle": "年代記",
  "nav.observatory": "観測所",
  "nav.experiments": "実験",
  "nav.codex": "Codex",
  "nav.method": "方法",
  "nav.compare": "王国ごとの裁定",
  "nav.engine": "分析エンジン",
  "nav.journal": "ジャーナル",
  "nav.cartographer": "論証図譜",
  "nav.skip_to_content": "本文へスキップ",
  "nav.menu": "メニュー",
  "nav.close": "閉じる",
  "nav.back_to_atlas": "Nooreign に戻る",
  "nav.atlas_sections": "地図のセクション",

  "hero.eyebrow": "アラインメントの哲学地図",
  "hero.title": "私たちを上回る知性に、私たちは何を負うのか。",
  "hero.lede":
    "十二の思想流派、二十八名の助言者、そして答えが分かれる難題たち。諸国を巡り、それから法廷を招集して、推論の筋を自分で確かめよう。",
  "hero.determinism": "偶然はない。どの判決も、再生できる記録として残る。",
  "hero.cta_atlas": "地図へ入る",
  "hero.cta_council": "評議会を招集する",
  "hero.method_link": "方法を読む",
  "stat.kingdoms": "諸国",
  "stat.advisors": "助言者",
  "stat.eras": "時代",
  "stat.dilemmas": "ジレンマ",
  "stat.techniques": "アラインメント技術",
  "stat.glossary": "用語",
  "section.realms": "諸国",
  "section.chronicle": "ここまで来た道",
  "section.breakdown": "計算が破綻する場所",

  "council.title": "評議会",
  "council.convene": "評議会を招集する",
  "council.dilemma": "法廷に差し出されたジレンマ",
  "council.court": "法廷",
  "council.add_advisor": "助言者を追加",
  "council.remove": "外す",
  "council.run": "審議を実行する",
  "council.running": "審議中…",
  "council.verdict": "判決",
  "council.margin": "{margin} の差で勝ち",
  "council.confidence": "確信度 {confidence}",
  "council.dissent": "異議",
  "council.trace": "推論の記録",
  "council.round_positions": "主張",
  "council.round_objections": "異議申立て",
  "council.round_appeals": "申立て",
  "council.seed": "シード {seed}",
  "council.empty": "着席している助言者がいません。審議するにはまず一人加えてください。",

  "dilemma.severity": "深刻度",
  "dilemma.ai_relevance": "AI との関連",
  "dilemma.options": "選択肢",
  "dilemma.stakeholders": "誰が負担するか",
  "dilemma.lesson": "この事例が教えること",
  "dilemma.references": "参照",
  "dilemma.reversibility": "可逆性",
  "dilemma.risk": "危険度",
  "dilemma.agent_harm": "エージェントへの害",
  "dilemma.on_trial": "検討中",
  "dilemma.none": "この条件に合うジレンマはありません。",
  "dilemma.filter": "絞り込み",

  "kingdom.founded": "創立 {year}",
  "kingdom.terrain": "地形",
  "kingdom.motto": "標語",
  "kingdom.creed": "教義",
  "kingdom.on_ai": "機械知性について",
  "kingdom.questions": "突きつける問い",
  "kingdom.relations": "関係",
  "kingdom.court": "法廷",
  "kingdom.landmarks": "目印",
  "kingdom.canon": "典籍",
  "advisor.born": "{year}年生",
  "advisor.died": "{year}年没",
  "advisor.works": "著作",
  "advisor.signature_move": "得意の手",
  "advisor.argument_moves": "論証の形",
  "advisor.voice": "声",

  "chronicle.scrub": "{year}年へ移動",
  "chronicle.stack_available": "対応済みの技術",
  "chronicle.milestones": "節目",
  "chronicle.eras": "時代",
  "observatory.towers": "塔",
  "observatory.coverage": "範囲",
  "observatory.gaps": "欠落",
  "observatory.readiness": "準備度",
  "observatory.dependencies": "依存関係",
  "observatory.uncovered": "未対応",

  "common.search": "検索",
  "common.filter": "絞り込み",
  "common.reset": "リセット",
  "common.loading": "読み込み中…",
  "common.error": "問題が発生しました。",
  "common.retry": "再試行",
  "common.not_found": "見つかりません",
  "common.read_more": "続きを読む",
  "common.of": "全{total}件中{count}件",
  "common.results": "{count}件の結果",
};

/**
 * Frozen on export: a catalogue is shared by every request the server handles,
 * so a render that mutated one would leak a language's strings into every other
 * locale for the rest of the process's life.
 */
export const ja: Record<MessageKey, string> = Object.freeze(MESSAGES);
