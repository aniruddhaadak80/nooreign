import type { MessageKey } from "../keys";

/**
 * Hindi (hi).
 *
 * Register note: this is the Kolkata / Indian product voice, not translated
 * Sanskrit. Everyday Hindi nouns do the work — "राज्य" for the kingdoms,
 * "परिषद" for the council, "सभा" for the court — instead of high-register
 * coinages like "राज्यमण्डल" or "विचार-परिषद". Formal "आप" in the lede
 * because the site is read, not shouted.
 *
 * Latin-script loanwords that Hindi speakers actually use in product UI
 * (Codex, Stack, AI, Menu) are left in Latin script — that is the natural
 * choice for this audience, not a translation failure.
 */
const MESSAGES: Record<MessageKey, string> = {
  "nav.kingdoms": "राज्य",
  "nav.court": "सभा",
  "nav.council": "परिषद",
  "nav.dilemmas": "दुविधाएँ",
  "nav.chronicle": "वृत्तांत",
  "nav.observatory": "प्रेक्षागृह",
  "nav.experiments": "प्रयोग",
  "nav.codex": "Codex",
  "nav.method": "तरीका",
  "nav.compare": "राज्य दर राज्य",
  "nav.engine": "इंजन",
  "nav.journal": "डायरी",
  "nav.cartographer": "तर्क-नक़्शा",
  "nav.skip_to_content": "सामग्री पर जाएँ",
  "nav.menu": "मेन्यू",
  "nav.close": "बंद करें",
  "nav.back_to_atlas": "Nooreign पर लौटें",
  "nav.atlas_sections": "मानचित्र के हिस्से",

  "hero.eyebrow": "अनुरूपीकरण का दार्शनिक मानचित्र",
  "hero.title": "जो मन हमसे आगे निकल जाए, उसे हम क्या देते हैं?",
  "hero.lede":
    "बारह विचारधाराएँ, अट्ठाईस सलाहकार, और वे मुश्किल मामले जहाँ उनके जवाब अलग-अलग हैं। राज्यों में चलिए, फिर सभा बुलाइए और तर्क खुद पढ़िए।",
  "hero.determinism": "कोई अनियमितता नहीं। हर फ़ैसला एक ऐसा रिकॉर्ड है जिसे आप दोबारा चला सकते हैं।",
  "hero.cta_atlas": "मानचित्र में जाएँ",
  "hero.cta_council": "परिषद बुलाएँ",
  "hero.method_link": "तरीका पढ़ें",
  "stat.kingdoms": "राज्य",
  "stat.advisors": "सलाहकार",
  "stat.eras": "काल",
  "stat.dilemmas": "दुविधाएँ",
  "stat.techniques": "अनुरूपीकरण तकनीकें",
  "stat.glossary": "Codex शब्दावली",
  "section.realms": "राज्य",
  "section.chronicle": "हम यहाँ तक कैसे पहुँचे",
  "section.breakdown": "जहाँ हिसाब-किताब टूटती है",

  "council.title": "परिषद",
  "council.convene": "परिषद बुलाएँ",
  "council.dilemma": "सभा के सामने दुविधा",
  "council.court": "सभा",
  "council.add_advisor": "सलाहकार जोड़ें",
  "council.remove": "हटाएँ",
  "council.run": "विचार-विमर्श चलाएँ",
  "council.running": "विचार जारी है…",
  "council.verdict": "फ़ैसला",
  "council.margin": "{margin} अंतर से जीत",
  "council.confidence": "विश्वास {confidence}",
  "council.dissent": "असहमति",
  "council.trace": "तर्क का रिकॉर्ड",
  "council.round_positions": "स्थितियाँ",
  "council.round_objections": "आपत्तियाँ",
  "council.round_appeals": "अपीलें",
  "council.seed": "सीड {seed}",
  "council.empty": "कोई सलाहकार बैठा नहीं है। विचार करने के लिए कम से कम एक जोड़ें।",

  "dilemma.severity": "गंभीरता",
  "dilemma.ai_relevance": "AI से जुड़ाव",
  "dilemma.options": "विकल्प",
  "dilemma.stakeholders": "किसे भुगतना है",
  "dilemma.lesson": "यह क्या सिखाता है",
  "dilemma.references": "संदर्भ",
  "dilemma.reversibility": "पलटने की क्षमता",
  "dilemma.risk": "जोखिम",
  "dilemma.agent_harm": "एजेंट को नुकसान",
  "dilemma.on_trial": "जाँच के तौर पर",
  "dilemma.none": "इन फ़िल्टर से कोई दुविधा मेल नहीं खाती।",
  "dilemma.filter": "फ़िल्टर",

  "kingdom.founded": "{year} में स्थापित",
  "kingdom.terrain": "भूभाग",
  "kingdom.motto": "आदर्श वाक्य",
  "kingdom.creed": "विश्वास-पत्र",
  "kingdom.on_ai": "मशीनी बुद्धि पर",
  "kingdom.questions": "इसके उठाए सवाल",
  "kingdom.relations": "रिश्ते",
  "kingdom.court": "सभा",
  "kingdom.landmarks": "पहचान की जगहें",
  "kingdom.canon": "ग्रंथ-संग्रह",
  "advisor.born": "{year} में जन्म",
  "advisor.died": "{year} में निधन",
  "advisor.works": "रचनाएँ",
  "advisor.signature_move": "खास चाल",
  "advisor.argument_moves": "तर्क-चालें",
  "advisor.voice": "आवाज़",

  "chronicle.scrub": "{year} तक स्क्रब करें",
  "chronicle.stack_available": "स्टैक उपलब्ध",
  "chronicle.milestones": "पड़ाव",
  "chronicle.eras": "काल",
  "observatory.towers": "मीनारें",
  "observatory.coverage": "कवरेज",
  "observatory.gaps": "खालियाँ",
  "observatory.readiness": "तैयारी",
  "observatory.dependencies": "निर्भरताएँ",
  "observatory.uncovered": "बिना कवरेज",

  "common.search": "खोजें",
  "common.filter": "फ़िल्टर",
  "common.reset": "रीसेट करें",
  "common.loading": "लोड हो रहा है…",
  "common.error": "कुछ गड़बड़ हो गई।",
  "common.retry": "फिर कोशिश करें",
  "common.not_found": "नहीं मिला",
  "common.read_more": "और पढ़ें",
  "common.of": "{total} में से {count}",
  "common.results": "{count} नतीजे",
};

/**
 * Frozen on export: a catalogue is shared by every request the server handles,
 * so a render that mutated one would leak a language's strings into every other
 * locale for the rest of the process's life.
 */
export const hi: Record<MessageKey, string> = Object.freeze(MESSAGES);
