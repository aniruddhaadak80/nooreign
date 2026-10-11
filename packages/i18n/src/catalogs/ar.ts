import type { MessageKey } from "../keys";

/**
 * Arabic (ar) — right-to-left.
 *
 * `dir` is set to "rtl" on this locale's descriptor in `index.ts`, and the
 * copy is written to read naturally in RTL: the argument flows
 * subject-first-right-to-left, which is why "المحكمة" (the court) leads rather
 * than trails in phrases like "معضلة أمام المحكمة".
 *
 * Modern Standard Arabic, not a dialect. "المحكمة" for the court of advisors
 * and "المجلس" for the council are kept distinct — the council deliberates,
 * the court is convened on a single dilemma. Placeholders sit where Arabic word
 * order wants them, inside the phrase rather than at the end.
 *
 * Latin "Codex" and "Nooreign" stay in Latin script; the UI must set
 * `dir="ltr"` on those runs, which the atlas already does for Latin names.
 */
const MESSAGES: Record<MessageKey, string> = {
  "nav.kingdoms": "الممالك",
  "nav.court": "المحكمة",
  "nav.council": "المجلس",
  "nav.dilemmas": "المعضلات",
  "nav.chronicle": "السرد",
  "nav.observatory": "المرصد",
  "nav.experiments": "التجارب",
  "nav.codex": "Codex",
  "nav.method": "المنهج",
  "nav.skip_to_content": "تخطَّ إلى المحتوى",
  "nav.menu": "القائمة",
  "nav.close": "إغلاق",
  "nav.back_to_atlas": "العودة إلى Nooreign",
  "nav.site_sections": "أقسام الموقع",

  "hero.eyebrow": "الأطلس الفلسفي للمحاذاة",
  "hero.title": "ما الذي ندين به لعقلٍ يتفوّق علينا؟",
  "hero.lede":
    "اثنتا عشرة مدرسة فكرية، ثمانية وعشرون مستشارًا، والحالات الصعبة التي تتباين فيها إجاباتهم. تجوّل في الممالك، ثم استدعِ محكمة واقرأ الحجّة بنفسك.",
  "hero.determinism": "لا عشوائية. كل حكمٍ أثرٌ يمكنك إعادة تشغيله.",
  "hero.cta_atlas": "ادخل الأطلس",
  "hero.cta_council": "استدعِ المجلس",
  "hero.method_link": "اقرأ المنهج",
  "stat.kingdoms": "الممالك",
  "stat.advisors": "المستشارون",
  "stat.eras": "الحقب",
  "stat.dilemmas": "المعضلات",
  "stat.techniques": "تقنيات المحاذاة",
  "stat.glossary": "مصطلحات Codex",
  "section.realms": "الممالك",
  "section.chronicle": "كيف وصلنا إلى هنا",
  "section.breakdown": "حيث ينكسر الحساب",

  "council.title": "المجلس",
  "council.convene": "استدعِ المجلس",
  "council.dilemma": "معضلة أمام المحكمة",
  "council.court": "المحكمة",
  "council.add_advisor": "أضف مستشارًا",
  "council.remove": "إزالة",
  "council.run": "شغّل التداول",
  "council.running": "جارٍ التداول…",
  "council.verdict": "الحكم",
  "council.margin": "فاز بفارق {margin}",
  "council.confidence": "الثقة {confidence}",
  "council.dissent": "الاعتراض",
  "council.trace": "أثر الاستدلال",
  "council.round_positions": "المواقف",
  "council.round_objections": "الاعتراضات",
  "council.round_appeals": "الاستئنافات",
  "council.seed": "البذرة {seed}",
  "council.empty": "لا مستشارون على المقاعد. أضف واحدًا على الأقل لبدء التداول.",

  "dilemma.severity": "الخطورة",
  "dilemma.ai_relevance": "الصلة بالذكاء الاصطناعي",
  "dilemma.options": "الخيارات",
  "dilemma.stakeholders": "من يتحمّل التكلفة",
  "dilemma.lesson": "ما الذي تعلّمه",
  "dilemma.references": "المراجع",
  "dilemma.reversibility": "القابلية للعكس",
  "dilemma.risk": "المخاطرة",
  "dilemma.agent_harm": "الضرر بالوكيل",
  "dilemma.on_trial": "قيد النظر",
  "dilemma.none": "لا معضلة تطابق هذه المرشّحات.",
  "dilemma.filter": "تصفية",

  "kingdom.founded": "تأسّس في {year}",
  "kingdom.terrain": "التضاريس",
  "kingdom.motto": "الشعار",
  "kingdom.creed": "العقيدة",
  "kingdom.on_ai": "في الذكاء الآلي",
  "kingdom.questions": "الأسئلة التي يطرحها",
  "kingdom.relations": "العلاقات",
  "kingdom.court": "المحكمة",
  "kingdom.landmarks": "المعالم",
  "kingdom.canon": "المدوّنة",
  "advisor.born": "وُلد في {year}",
  "advisor.died": "تُوفي في {year}",
  "advisor.works": "المؤلفات",
  "advisor.signature_move": "حركته المميّزة",
  "advisor.argument_moves": "خطوات الحجاج",
  "advisor.voice": "الصوت",

  "chronicle.scrub": "انتقل إلى {year}",
  "chronicle.stack_available": "الحزمة متاحة",
  "chronicle.milestones": "المحطات",
  "chronicle.eras": "الحقب",
  "observatory.towers": "الأبراج",
  "observatory.coverage": "التغطية",
  "observatory.gaps": "الفجوات",
  "observatory.readiness": "الجاهزية",
  "observatory.dependencies": "التبعيات",
  "observatory.uncovered": "غير مغطّى",

  "common.search": "بحث",
  "common.filter": "تصفية",
  "common.reset": "إعادة ضبط",
  "common.loading": "جارٍ التحميل…",
  "common.error": "حدث خطأ ما.",
  "common.retry": "أعد المحاولة",
  "common.not_found": "غير موجود",
  "common.read_more": "اقرأ المزيد",
  "common.of": "{count} من {total}",
  "common.results": "{count} نتيجة",
};

/**
 * Frozen on export: a catalogue is shared by every request the server handles,
 * so a render that mutated one would leak a language's strings into every other
 * locale for the rest of the process's life.
 */
export const ar: Record<MessageKey, string> = Object.freeze(MESSAGES);
