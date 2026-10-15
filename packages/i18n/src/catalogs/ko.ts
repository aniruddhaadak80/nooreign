import type { MessageKey } from "../keys";

/**
 * Korean (ko).
 *
 * Register note: 해요체-leaning written form — plain, not stiff, and not the
 * spoken-cheerful tone of a marketing site. The kingdom metaphor maps to 왕국
 * (realm), the council to 평의회, the court of advisors to 법정.
 *
 * "딜레마" is the established Korean loan for "dilemma"; "역사" would be wrong
 * for the chronicle, so 연대기 is used. Latin "AI" and "Codex" stay in Latin
 * script, which is standard in Korean technical writing.
 */
const MESSAGES: Record<MessageKey, string> = {
  "nav.kingdoms": "왕국",
  "nav.court": "법정",
  "nav.council": "평의회",
  "nav.dilemmas": "딜레마",
  "nav.chronicle": "연대기",
  "nav.observatory": "관측소",
  "nav.experiments": "실험",
  "nav.codex": "Codex",
  "nav.method": "방법",
  "nav.compare": "왕국별 비교",
  "nav.engine": "엔진",
  "nav.journal": "저널",
  "nav.cartographer": "논증 지도",
  "nav.skip_to_content": "본문으로 건너뛰기",
  "nav.menu": "메뉴",
  "nav.close": "닫기",
  "nav.back_to_atlas": "Nooreign으로 돌아가기",
  "nav.atlas_sections": "지도 섹션",

  "hero.eyebrow": "정렬에 관한 철학 지도",
  "hero.title": "우리를 넘어서는 지성에게 우리는 무엇을 빚지고 있는가.",
  "hero.lede":
    "열두 개의 사상 학파, 스물여덟 명의 고문, 그리고 이들의 답이 갈리는 어려운 사례들. 왕국을 걸어본 뒤 법정을 소집해 보세요. 추론의 순서는 직접 읽으시면 됩니다.",
  "hero.determinism": "무작위란 없습니다. 모든 판결은 다시 돌려볼 수 있는 기록입니다.",
  "hero.cta_atlas": "지도로 들어가기",
  "hero.cta_council": "평의회 소집",
  "hero.method_link": "방법 읽기",
  "stat.kingdoms": "왕국",
  "stat.advisors": "고문",
  "stat.eras": "시대",
  "stat.dilemmas": "딜레마",
  "stat.techniques": "정렬 기법",
  "stat.glossary": "용어집",
  "section.realms": "왕국들",
  "section.chronicle": "여기까지 온 길",
  "section.breakdown": "계산이 무너지는 지점",

  "council.title": "평의회",
  "council.convene": "평의회 소집",
  "council.dilemma": "법정에 놓인 딜레마",
  "council.court": "법정",
  "council.add_advisor": "고문 추가",
  "council.remove": "제외",
  "council.run": "심의 진행",
  "council.running": "심의 중…",
  "council.verdict": "판결",
  "council.margin": "{margin} 차이로 승리",
  "council.confidence": "확신도 {confidence}",
  "council.dissent": "반대의견",
  "council.trace": "추론 기록",
  "council.round_positions": "입장",
  "council.round_objections": "이의 제기",
  "council.round_appeals": "항의",
  "council.seed": "시드 {seed}",
  "council.empty": "앉아 있는 고문이 없습니다. 심의를 시작하려면 최소 한 명을 추가하세요.",

  "dilemma.severity": "심각도",
  "dilemma.ai_relevance": "AI 관련도",
  "dilemma.options": "선택지",
  "dilemma.stakeholders": "누가 부담하는가",
  "dilemma.lesson": "무엇을 가르치는가",
  "dilemma.references": "참고",
  "dilemma.reversibility": "되돌릴 가능성",
  "dilemma.risk": "위험도",
  "dilemma.agent_harm": "에이전트에 미치는 해",
  "dilemma.on_trial": "심사 중",
  "dilemma.none": "이 조건에 맞는 딜레마가 없습니다.",
  "dilemma.filter": "필터",

  "kingdom.founded": "{year}년 설립",
  "kingdom.terrain": "지형",
  "kingdom.motto": "표어",
  "kingdom.creed": "신조",
  "kingdom.on_ai": "기계 지성에 대하여",
  "kingdom.questions": "이것이 던지는 질문들",
  "kingdom.relations": "관계",
  "kingdom.court": "법정",
  "kingdom.landmarks": "유적",
  "kingdom.canon": "경전",
  "advisor.born": "{year}년생",
  "advisor.died": "{year}년 사망",
  "advisor.works": "저작",
  "advisor.signature_move": "주장적 논증",
  "advisor.argument_moves": "논증 유형",
  "advisor.voice": "목소리",

  "chronicle.scrub": "{year}년으로 이동",
  "chronicle.stack_available": "스택 사용 가능",
  "chronicle.milestones": "이정표",
  "chronicle.eras": "시대",
  "observatory.towers": "탑",
  "observatory.coverage": "범위",
  "observatory.gaps": "공백",
  "observatory.readiness": "준비도",
  "observatory.dependencies": "의존성",
  "observatory.uncovered": "미포함",

  "common.search": "검색",
  "common.filter": "필터링",
  "common.reset": "초기화",
  "common.loading": "불러오는 중…",
  "common.error": "문제가 발생했습니다.",
  "common.retry": "다시 시도",
  "common.not_found": "찾을 수 없음",
  "common.read_more": "더 읽기",
  "common.of": "전체 {total}개 중 {count}개",
  "common.results": "결과 {count}건",
};

/**
 * Frozen on export: a catalogue is shared by every request the server handles,
 * so a render that mutated one would leak a language's strings into every other
 * locale for the rest of the process's life.
 */
export const ko: Record<MessageKey, string> = Object.freeze(MESSAGES);
