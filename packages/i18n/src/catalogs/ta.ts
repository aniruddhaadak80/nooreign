import type { MessageKey } from "../keys";

/**
 * Tamil (ta).
 *
 * Register note: standard modern Tamil orthography — no Sanskritised
 * coinages, no transliterated English except the ones Tamil actually borrows
 * (Codex, மெனு/பட்டி, AI). "ஆட்சி" carries the realm metaphor, "சபை" is the
 * council, "நீதிமன்றம்" the court of advisors.
 *
 * Sandhi is respected: "ஆட்சிகள்", "நிலைச்சிக்கல்கள்", "முறைகள்". Labels are
 * kept short enough for a stat tile, so long compounds are avoided where a
 * plainer word will do.
 */
const MESSAGES: Record<MessageKey, string> = {
  "nav.kingdoms": "இராச்சியங்கள்",
  "nav.court": "நீதிமன்றம்",
  "nav.council": "சபை",
  "nav.dilemmas": "நிலைச்சிக்கல்கள்",
  "nav.chronicle": "வரலாறு",
  "nav.observatory": "விவதக்காட்சி",
  "nav.experiments": "ஆய்வுகள்",
  "nav.codex": "Codex",
  "nav.method": "முறை",
  "nav.skip_to_content": "உள்ளடக்கத்திற்குச் செல்",
  "nav.menu": "பட்டி",
  "nav.close": "மூடு",
  "nav.back_to_atlas": "Nooreign-க்குத் திரும்பவும்",
  "nav.site_sections": "தள பகுதிகள்",

  "hero.eyebrow": "சீரமைப்பிற்கான தத்துவ வரைபடம்",
  "hero.title": "எங்களைவிட மேலான ஒரு அறிவுக்கு நாம் என்ன கடன் அடைகிறோம்?",
  "hero.lede":
    "பன்னிரண்டு சிந்தனைப் பள்ளிகள், இருபத்தெட்டு ஆலோகிகள், அவர்களின் பதில்கள் மோதிக்கொள்ளும் கடினமான வழக்குகள். ஆட்சிகளை நடந்து பாருங்கள், பின்னர் ஒரு நீதிமன்றத்தைக் கூட்டி விவாதத்தை நீங்களே வாசியுங்கள்.",
  "hero.determinism": "சமவாய்ப்பு இல்லை. ஒவ்வொரு தீர்ப்பும் மீண்டும் இயக்கக்கூடிய ஒரு தடயவரிசையாகும்.",
  "hero.cta_atlas": "வரைபடத்திற்குள் செல்",
  "hero.cta_council": "சபையைக் கூட்டு",
  "hero.method_link": "முறையைப் படி",
  "stat.kingdoms": "ஆட்சிகள்",
  "stat.advisors": "ஆலோகிகள்",
  "stat.eras": "காலங்கள்",
  "stat.dilemmas": "நிலைச்சிக்கல்கள்",
  "stat.techniques": "சீரமைப்பு முறைகள்",
  "stat.glossary": "Codex சொற்கள்",
  "section.realms": "ஆட்சிகள்",
  "section.chronicle": "இங்கு வருகையில் நாங்கள் எப்படி வந்தோம்",
  "section.breakdown": "கணக்கீடு உடைகிற இடம்",

  "council.title": "சபை",
  "council.convene": "சபையைக் கூட்டு",
  "council.dilemma": "நீதிமன்றத்தில் நிலைச்சிக்கல்",
  "council.court": "நீதிமன்றம்",
  "council.add_advisor": "ஆலோகியைச் சேர்",
  "council.remove": "அகற்று",
  "council.run": "விவாதத்தை நடைபெற்று",
  "council.running": "விவாதம் நடைபெறுகிறது…",
  "council.verdict": "தீர்ப்பு",
  "council.margin": "{margin} வேறுபாட்டில் வெற்றி",
  "council.confidence": "நம்பிக்கை {confidence}",
  "council.dissent": "இசைவினா",
  "council.trace": "காரண விளக்கம்",
  "council.round_positions": "நிலைகள்",
  "council.round_objections": "எதிர்ப்புகள்",
  "council.round_appeals": "அபீல்கள்",
  "council.seed": "விதை {seed}",
  "council.empty": "எந்த ஆலோகியும் அமர்ந்தில்லை. விவாதம் நடைபெற குறைந்தது ஒருவரைச் சேர்க்கவும்.",

  "dilemma.severity": "தீவிரம்",
  "dilemma.ai_relevance": "AI தொடர்பு",
  "dilemma.options": "தெரிவுகள்",
  "dilemma.stakeholders": "யார் பாதிக்கப்படுவார்",
  "dilemma.lesson": "இது எதைக் கற்பிக்கிறது",
  "dilemma.references": "ஆதாரங்கள்",
  "dilemma.reversibility": "மாற்றக்கூடிய தன்மை",
  "dilemma.risk": "ஆபத்து",
  "dilemma.agent_harm": "முகவரிக்கு ஏற்படும் தீங்கு",
  "dilemma.on_trial": "விசாரணையில்",
  "dilemma.none": "இந்த வடிகட்டிகளுக்கு ஏற்ற நிலைச்சிக்கல் இல்லை.",
  "dilemma.filter": "வடிகட்டு",

  "kingdom.founded": "{year}-இல் தோன்றியது",
  "kingdom.terrain": "நிலவகை",
  "kingdom.motto": "சுவரொத்திரம்",
  "kingdom.creed": "நம்பிக்கை",
  "kingdom.on_ai": "எந்திர அறிவு குறித்து",
  "kingdom.questions": "அது எழும் கேள்விகள்",
  "kingdom.relations": "உறவுகள்",
  "kingdom.court": "நீதிமன்றம்",
  "kingdom.landmarks": "குறிப்பிடக்கூடிய இடங்கள்",
  "kingdom.canon": "மூலநூல்கள்",
  "advisor.born": "{year}-இல் பிறந்தார்",
  "advisor.died": "{year}-இல் இறந்தார்",
  "advisor.works": "ஆக்கங்கள்",
  "advisor.signature_move": "தனித்துவமான அசைவு",
  "advisor.argument_moves": "வாத அசைவுகள்",
  "advisor.voice": "குரல்",

  "chronicle.scrub": "{year} ஆண்டுக்குச் செல்",
  "chronicle.stack_available": "அடுக்கு கிடைக்கிறது",
  "chronicle.milestones": "வழிநிலைகள்",
  "chronicle.eras": "காலங்கள்",
  "observatory.towers": "கோபுரங்கள்",
  "observatory.coverage": "செறிவு",
  "observatory.gaps": "இடைவெளிகள்",
  "observatory.readiness": "தயார்வு நிலை",
  "observatory.dependencies": "சார்புகள்",
  "observatory.uncovered": "மூடப்படாதது",

  "common.search": "தேடு",
  "common.filter": "வடிகட்டு",
  "common.reset": "மீட்டமை",
  "common.loading": "ஏற்றுகிறது…",
  "common.error": "ஏதோ தவறாகிவிட்டது.",
  "common.retry": "மீண்டும் முயல்",
  "common.not_found": "கிடைக்கவில்லை",
  "common.read_more": "மேலும் படி",
  "common.of": "{total} இல் {count}",
  "common.results": "{count} முடிவுகள்",
};

/**
 * Frozen on export: a catalogue is shared by every request the server handles,
 * so a render that mutated one would leak a language's strings into every other
 * locale for the rest of the process's life.
 */
export const ta: Record<MessageKey, string> = Object.freeze(MESSAGES);
