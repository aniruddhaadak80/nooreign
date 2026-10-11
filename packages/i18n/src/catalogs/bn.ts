import type { MessageKey } from "../keys";

/**
 * Bengali (bn).
 *
 * Register note: everyday Kolkata Bengali, not translated Sanskrit. "রাজ্য"
 * for the kingdoms, "পরিষদ" for the council, "সভা" for the court — the plain
 * words a Bengali speaker would use, not "রাজ্যমণ্ডল" or "চিন্তাসভা". The
 * verb register is polite ("করুন"), because the copy is read rather than
 * shouted.
 *
 * Bengali numerals are correct for this locale: `formatCount` renders
 * ১,২৩,৪৫৬, and the placeholders sit inside the phrase so the word order stays
 * natural in Bangla, which places the count after the noun.
 */
const MESSAGES: Record<MessageKey, string> = {
  "nav.kingdoms": "রাজ্য",
  "nav.court": "সভা",
  "nav.council": "পরিষদ",
  "nav.dilemmas": "দ্বন্দ্ব",
  "nav.chronicle": "বৃত্তান্ত",
  "nav.observatory": "অবলোকন কেন্দ্র",
  "nav.experiments": "পরীক্ষা",
  "nav.codex": "Codex",
  "nav.method": "পদ্ধতি",
  "nav.skip_to_content": "মূল বিষয়বস্তুতে যান",
  "nav.menu": "মেনু",
  "nav.close": "বন্ধ করুন",
  "nav.back_to_atlas": "Nooreign-এ ফিরে যান",
  "nav.site_sections": "সাইটের অংশ",

  "hero.eyebrow": "সমন্বয়ের দার্শনিক অ্যাটলাস",
  "hero.title": "যে মন আমাদের ছাড়িয়ে যায়, তাকে আমরা কী দিই?",
  "hero.lede":
    "বারোটি চিন্তাধারা, আটাশজন উপদেষ্টা, আর সেই কঠিন কেসগুলো যেখানে তাঁদের উত্তর আলাদা আলাদা। রাজ্যগুলো ঘুরে দেখুন, তারপর সভা ডেকে বিচার-বিবেচনাটা নিজে পড়ুন।",
  "hero.determinism": "কোনো এলোমেলো নেই। প্রতিটি রায় এমন একটি ট্রেস যা আপনি আবার চালাতে পারেন।",
  "hero.cta_atlas": "অ্যাটলাসে ঢুকুন",
  "hero.cta_council": "পরিষদকে ডাকুন",
  "hero.method_link": "পদ্ধতিটা পড়ুন",
  "stat.kingdoms": "রাজ্য",
  "stat.advisors": "উপদেষ্টা",
  "stat.eras": "যুগ",
  "stat.dilemmas": "দ্বন্দ্ব",
  "stat.techniques": "সমন্বয়-পদ্ধতি",
  "stat.glossary": "Codex-পরিভাষা",
  "section.realms": "রাজ্যগুলো",
  "section.chronicle": "এখানে পর্যন্ত আমরা কীভাবে এলাম",
  "section.breakdown": "যেখানে হিসাব ভেঙে পড়ে",

  "council.title": "পরিষদ",
  "council.convene": "পরিষদকে ডাকুন",
  "council.dilemma": "সভার সামনে দ্বন্দ্ব",
  "council.court": "সভা",
  "council.add_advisor": "উপদেষ্টা যোগ করুন",
  "council.remove": "সরান",
  "council.run": "বিবেচনা চালান",
  "council.running": "বিবেচনা চলছে…",
  "council.verdict": "রায়",
  "council.margin": "{margin} ব্যবধানে জয়",
  "council.confidence": "আস্থা {confidence}",
  "council.dissent": "অসম্মতি",
  "council.trace": "যুক্তির ট্রেস",
  "council.round_positions": "অবস্থান",
  "council.round_objections": "আপত্তি",
  "council.round_appeals": "আবেদন",
  "council.seed": "সিড {seed}",
  "council.empty": "কোনো উপদেষ্টা বসেন নি। বিবেচনার জন্য অন্তত একজন যোগ করুন।",

  "dilemma.severity": "তীব্রতা",
  "dilemma.ai_relevance": "AI-র সঙ্গে সম্পর্ক",
  "dilemma.options": "বিকল্প",
  "dilemma.stakeholders": "কার ওপর বর্তাবে",
  "dilemma.lesson": "এটি কী শেখায়",
  "dilemma.references": "সূত্র",
  "dilemma.reversibility": "ফেরানোর সম্ভাবনা",
  "dilemma.risk": "ঝুঁকি",
  "dilemma.agent_harm": "এজেন্টের ক্ষতি",
  "dilemma.on_trial": "বিচারাধীন",
  "dilemma.none": "এই ছাঁকনির সঙ্গে কোনো দ্বন্দ্ব মেলেনি।",
  "dilemma.filter": "ছাঁকুন",

  "kingdom.founded": "{year}-এ প্রতিষ্ঠিত",
  "kingdom.terrain": "ভূমিরূপ",
  "kingdom.motto": "মূলমন্ত্র",
  "kingdom.creed": "বিশ্বাসপত্র",
  "kingdom.on_ai": "যন্ত্রবুদ্ধি নিয়ে",
  "kingdom.questions": "এটি যে প্রশ্ন তোলে",
  "kingdom.relations": "সম্পর্ক",
  "kingdom.court": "সভা",
  "kingdom.landmarks": "চিহ্নিত স্থান",
  "kingdom.canon": "মূলগ্রন্থ",
  "advisor.born": "{year}-এ জন্ম",
  "advisor.died": "{year}-এ মৃত্যু",
  "advisor.works": "লেখা",
  "advisor.signature_move": "নিজস্ব চাল",
  "advisor.argument_moves": "যুক্তির চাল",
  "advisor.voice": "কণ্ঠ",

  "chronicle.scrub": "{year}-এ স্ক্রাব করুন",
  "chronicle.stack_available": "স্ট্যাক উপলব্ধ",
  "chronicle.milestones": "মাইলফলক",
  "chronicle.eras": "যুগ",
  "observatory.towers": "মিনার",
  "observatory.coverage": "কভারেজ",
  "observatory.gaps": "ফাঁক",
  "observatory.readiness": "প্রস্তুতি",
  "observatory.dependencies": "নির্ভরতা",
  "observatory.uncovered": "কভার হয়নি",

  "common.search": "খুঁজুন",
  "common.filter": "ছাঁকুন",
  "common.reset": "রিসেট",
  "common.loading": "লোড হচ্ছে…",
  "common.error": "কিছু একটা ভুল হয়েছে।",
  "common.retry": "আবার চেষ্টা করুন",
  "common.not_found": "পাওয়া যায়নি",
  "common.read_more": "আরও পড়ুন",
  "common.of": "{total}-এর মধ্যে {count}",
  "common.results": "{count}টি ফলাফল",
};

/**
 * Frozen on export: a catalogue is shared by every request the server handles,
 * so a render that mutated one would leak a language's strings into every other
 * locale for the rest of the process's life.
 */
export const bn: Record<MessageKey, string> = Object.freeze(MESSAGES);
