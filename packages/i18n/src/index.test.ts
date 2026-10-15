import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALES,
  assertCatalogs,
  detectLocale,
  directionOf,
  extraKeys,
  formatCount,
  getCatalog,
  getDescriptor,
  localeTag,
  missingKeys,
  resolveLocale,
  takeDiagnostics,
  tokensOf,
  translate,
  type MessageKey,
} from "./index";
import { EN } from "./keys";

/** 100 by construction: 18 nav + 16 landing + 18 council + 12 dilemmas + 16 kingdom + 10 chronicle + 10 common. */
const EXPECTED_KEY_COUNT = 100;

const NON_ENGLISH = LOCALES.filter((descriptor) => descriptor.code !== DEFAULT_LOCALE);

/**
 * Strings that are legitimately identical to the English in some locales.
 *
 * WHY an allowlist exists: a "did you translate this?" test that is only a
 * string comparison will flag every true cognate. French "Options" is not an
 * untranslated string, it is the French word. Forcing a synonym would make
 * the localisation worse, so the exception is written down instead of hidden.
 *
 * Every entry below is asserted to be *present and identical* in at least one
 * non-English catalogue — a stale allowlist entry fails rather than rotting.
 */
const IDENTICAL_COGNATES: ReadonlySet<string> = new Set([
  "Codex", // artefact name in all 14 locales
  "Menu", // fr, pt-BR, it
  "Motto", // it
  "Relations", // fr
  "Terrain", // fr
  "Canon", // fr
  "Options", // fr
  "Positions", // fr
  "Objections", // fr
  "Verdict", // fr
  "Filter", // de (noun form of the control)
  "Journal", // fr — the cognate is the ordinary French word, not an untranslated English one
]);

/**
 * Proper nouns that stay untranslated inside a longer string. Asserted to be
 * present verbatim in every non-English catalogue, which is the stronger claim
 * and the one that actually protects the brand from a sloppy translation.
 */
const PROPER_NOUNS: Readonly<Partial<Record<MessageKey, readonly string[]>>> = {
  "nav.codex": ["Codex"],
  "nav.back_to_atlas": ["Nooreign"],
};

const TOKEN_PATTERN = /\{([a-z_][a-z0-9_]*)\}/g;

function tokensIn(template: string): string[] {
  return [...template.matchAll(TOKEN_PATTERN)].map((match) => match[1] ?? "");
}

describe("catalog integrity", () => {
  it("defines exactly 100 keys in English", () => {
    expect(Object.keys(EN)).toHaveLength(EXPECTED_KEY_COUNT);
  });

  it("has 14 locales, each with a unique code", () => {
    expect(LOCALES).toHaveLength(14);
    expect(new Set(LOCALES.map((l) => l.code)).size).toBe(14);
  });

  it("ships the fourteen locales the atlas advertises", () => {
    expect(LOCALES.map((l) => l.code)).toEqual([
      "en",
      "es",
      "fr",
      "de",
      "hi",
      "bn",
      "ta",
      "ja",
      "zh",
      "ko",
      "ru",
      "pt-BR",
      "ar",
      "it",
    ]);
  });

  it("reports no missing keys in any locale", () => {
    for (const descriptor of LOCALES) {
      expect(missingKeys(descriptor.code)).toEqual([]);
    }
  });

  it("has no extra keys in any locale", () => {
    for (const descriptor of LOCALES) {
      const catalog = getCatalog(descriptor.code);
      expect(Object.keys(catalog)).toHaveLength(EXPECTED_KEY_COUNT);
      expect(extraKeys(descriptor.code)).toEqual([]);
      for (const key of Object.keys(catalog)) {
        expect(key in EN).toBe(true);
      }
    }
  });

  it("leaves no blank value in any locale", () => {
    for (const descriptor of LOCALES) {
      const catalog = getCatalog(descriptor.code);
      for (const key of Object.keys(EN) as MessageKey[]) {
        expect(catalog[key].trim()).not.toBe("");
      }
    }
  });

  it("assertCatalogs returns an empty list of problems", () => {
    expect(assertCatalogs()).toEqual([]);
  });

  it("freezes every catalogue so a render cannot mutate the source", () => {
    for (const descriptor of LOCALES) {
      expect(Object.isFrozen(getCatalog(descriptor.code))).toBe(true);
    }
  });
});

describe("untranslated English", () => {
  it("translates every string, except the declared cognates", () => {
    const offenders: string[] = [];
    for (const descriptor of NON_ENGLISH) {
      const catalog = getCatalog(descriptor.code);
      for (const key of Object.keys(EN) as MessageKey[]) {
        if (catalog[key] !== EN[key]) continue;
        const allowed = PROPER_NOUNS[key]?.includes(EN[key]) ?? false;
        if (allowed || IDENTICAL_COGNATES.has(EN[key])) continue;
        offenders.push(`${descriptor.code}:${key} = ${JSON.stringify(catalog[key])}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps the artefact and product names untranslated everywhere", () => {
    // Asserted positively: if a locale "translated" Codex or Nooreign, the
    // negative test above would still pass but this one would not.
    for (const descriptor of NON_ENGLISH) {
      const catalog = getCatalog(descriptor.code);
      expect(catalog["nav.codex"]).toBe("Codex");
      expect(catalog["nav.back_to_atlas"]).toContain("Nooreign");
    }
  });

  it("actually uses the cognate allowlist, so it is not a loophole", () => {
    for (const value of IDENTICAL_COGNATES) {
      const usedIn = NON_ENGLISH.filter((descriptor) =>
        (Object.keys(EN) as MessageKey[]).some((key) => EN[key] === value && getCatalog(descriptor.code)[key] === value),
      );
      expect(usedIn.length, `"${value}" is allowlisted but identical in no locale`).toBeGreaterThan(0);
    }
  });

  it("translates every allowlisted value everywhere it is not a cognate", () => {
    // The mirror of the allowlist: a value that only one language keeps is
    // still caught by the first test. This pins the cognates to their locales
    // so a new locale cannot quietly ship "Terrain" in, say, Hindi.
    const expected: Readonly<Record<string, readonly string[]>> = {
      Codex: ["es", "fr", "de", "hi", "bn", "ta", "ja", "zh", "ko", "ru", "pt-BR", "ar", "it"],
      Menu: ["fr", "pt-BR", "it"],
      Motto: ["it"],
      Relations: ["fr"],
      Terrain: ["fr"],
      Canon: ["fr"],
      Options: ["fr"],
      Positions: ["fr"],
      Objections: ["fr"],
      Verdict: ["fr"],
      Filter: ["de"],
      Journal: ["fr"],
    };
    for (const descriptor of NON_ENGLISH) {
      const catalog = getCatalog(descriptor.code);
      for (const key of Object.keys(EN) as MessageKey[]) {
        const value = EN[key];
        if (catalog[key] !== value || !IDENTICAL_COGNATES.has(value)) continue;
        expect(expected[value], `${descriptor.code}:${key}`).toContain(descriptor.code);
      }
    }
  });
});

describe("placeholders", () => {
  it("keeps the same token set in English and every translation", () => {
    const mismatches: string[] = [];
    for (const descriptor of LOCALES) {
      const catalog = getCatalog(descriptor.code);
      for (const key of Object.keys(EN) as MessageKey[]) {
        const english = tokensIn(EN[key]).sort().join(",");
        const other = tokensIn(catalog[key]).sort().join(",");
        if (english !== other) mismatches.push(`${descriptor.code}:${key} (${english} vs ${other})`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("invents no token that English does not have", () => {
    const invented: string[] = [];
    for (const descriptor of NON_ENGLISH) {
      const catalog = getCatalog(descriptor.code);
      for (const key of Object.keys(EN) as MessageKey[]) {
        const english = new Set(tokensIn(EN[key]));
        for (const token of tokensIn(catalog[key])) {
          if (!english.has(token)) invented.push(`${descriptor.code}:${key} -> {${token}}`);
        }
      }
    }
    expect(invented).toEqual([]);
  });

  it("uses tokens the renderer actually supplies", () => {
    const supplied = new Set(tokensIn(Object.values(EN).join(" ")));
    expect([...supplied].sort()).toEqual(["confidence", "count", "margin", "seed", "total", "year"]);
  });

  it("only treats well-formed tokens as tokens", () => {
    expect(tokensOf("{year} and {count}, not {Year} or { year }")).toEqual(["year", "count"]);
    expect(tokensOf("no tokens here")).toEqual([]);
  });
});

describe("translate", () => {
  it("substitutes a token in English", () => {
    expect(translate("en", "kingdom.founded", { year: "384 BCE" })).toBe("Founded 384 BCE");
  });

  it("substitutes a token in every locale", () => {
    for (const descriptor of LOCALES) {
      const out = translate(descriptor.code, "kingdom.founded", { year: "384 BCE" });
      expect(out).toContain("384 BCE");
      expect(out).not.toContain("{year}");
    }
  });

  it("substitutes every occurrence of a repeated token", () => {
    expect(translate("en", "common.of", { count: 3, total: 96 })).toBe("3 of 96");
    expect(translate("de", "common.of", { count: 3, total: 96 })).toBe("3 von 96");
  });

  it("substitutes several distinct tokens", () => {
    expect(translate("en", "council.margin", { margin: "0.18" })).toBe("Won by 0.18");
    expect(translate("en", "council.seed", { seed: "1986" })).toBe("Seed 1986");
  });

  it("stringifies numbers rather than dropping them", () => {
    expect(translate("en", "council.confidence", { confidence: 0.82 })).toBe("Confidence 0.82");
  });

  it("leaves the placeholder visible when a variable is missing", () => {
    expect(translate("en", "kingdom.founded")).toBe("Founded {year}");
    expect(translate("en", "kingdom.founded", { year: undefined as unknown as string })).toBe("Founded {year}");
  });

  it("records a diagnostic for an unresolved token and drains it", () => {
    takeDiagnostics();
    translate("en", "kingdom.founded");
    const entries = takeDiagnostics();
    expect(entries).toEqual([
      { code: "en", key: "kingdom.founded", token: "year", kind: "unresolved-token" },
    ]);
    expect(takeDiagnostics()).toEqual([]);
  });

  it("records a diagnostic for a variable no token consumes", () => {
    takeDiagnostics();
    translate("en", "nav.menu", { typo: "x" });
    expect(takeDiagnostics()).toEqual([{ code: "en", key: "nav.menu", token: "typo", kind: "unused-var" }]);
  });

  it("is silent when every variable resolves", () => {
    takeDiagnostics();
    translate("fr", "council.seed", { seed: 7 });
    translate("ar", "council.margin", { margin: "0.4" });
    expect(takeDiagnostics()).toEqual([]);
  });

  it("falls back to English for an unknown locale instead of throwing", () => {
    expect(translate("qq-QQ", "nav.kingdoms")).toBe(EN["nav.kingdoms"]);
    expect(translate("qq-QQ", "kingdom.founded", { year: "x" })).toBe("Founded x");
    expect(translate("", "nav.menu")).toBe("Menu");
  });

  it("falls back to English for a locale that exists but has no catalogue", () => {
    expect(getCatalog("qq")).toBe(getCatalog("en"));
    expect(getCatalog("qq")).toBe(EN);
  });
});

describe("locale resolution", () => {
  it("accepts the descriptor code", () => {
    expect(resolveLocale("pt-BR")).toBe("pt-BR");
    expect(resolveLocale("zh")).toBe("zh");
  });

  it("accepts an Intl tag and reduces it to the catalogue code", () => {
    expect(resolveLocale("en-US")).toBe("en");
    expect(resolveLocale("fr-CA")).toBe("fr");
    expect(resolveLocale("zh-Hans-CN")).toBe("zh");
  });

  it("accepts a bare language prefix", () => {
    expect(resolveLocale("pt")).toBe("pt-BR");
    expect(resolveLocale("ja")).toBe("ja");
    expect(resolveLocale("ar")).toBe("ar");
  });

  it("is case- and underscore-insensitive", () => {
    expect(resolveLocale("PT-br")).toBe("pt-BR");
    expect(resolveLocale("en_US")).toBe("en");
    expect(resolveLocale("  DE  ")).toBe("de");
  });

  it("returns null for a locale the atlas does not ship", () => {
    expect(resolveLocale("qq")).toBeNull();
    expect(resolveLocale("")).toBeNull();
    expect(resolveLocale("   ")).toBeNull();
  });

  it("describes a locale", () => {
    expect(getDescriptor("ar")).toMatchObject({ code: "ar", dir: "rtl", nativeName: "العربية" });
    expect(getDescriptor("en-US")?.name).toBe("English");
    expect(getDescriptor("qq")).toBeUndefined();
  });

  it("maps a catalogue code to its Intl tag", () => {
    expect(localeTag("zh")).toBe("zh-Hans");
    expect(localeTag("pt")).toBe("pt-BR");
    expect(localeTag("qq")).toBe("en");
  });

  it("marks Arabic as the only right-to-left locale", () => {
    expect(LOCALES.filter((l) => l.dir === "rtl").map((l) => l.code)).toEqual(["ar"]);
    expect(directionOf("ar-EG")).toBe("rtl");
    expect(directionOf("qq")).toBe("ltr");
  });
});

describe("detectLocale", () => {
  it("reads a single tag", () => {
    expect(detectLocale("fr-CA")).toBe("fr");
  });

  it("takes the first recognised tag from a language list", () => {
    expect(detectLocale(["de-AT", "fr-CA", "en-US"])).toBe("de");
  });

  it("parses an Accept-Language header, ignoring quality values", () => {
    expect(detectLocale("fr-CA,fr;q=0.9,en-US;q=0.8")).toBe("fr");
    expect(detectLocale("qq-QQ,ta;q=0.7")).toBe("ta");
  });

  it("skips wildcards", () => {
    expect(detectLocale("*,en;q=0.5")).toBe("en");
  });

  it("reads a Navigator-like object", () => {
    expect(detectLocale({ languages: ["bn-BD", "en-US"], language: "bn-BD" })).toBe("bn");
    expect(detectLocale({ language: "ko-KR" })).toBe("ko");
  });

  it("falls back when nothing is recognised", () => {
    expect(detectLocale()).toBe(DEFAULT_LOCALE);
    expect(detectLocale(null)).toBe(DEFAULT_LOCALE);
    expect(detectLocale(["qq", "zz"])).toBe(DEFAULT_LOCALE);
    expect(detectLocale([], "ar")).toBe("ar");
    expect(detectLocale(["qq"], "pt")).toBe("pt-BR");
  });

  it("can be pointed at every locale and lands on itself", () => {
    for (const descriptor of LOCALES) {
      expect(detectLocale(descriptor.locale)).toBe(descriptor.code);
    }
  });
});

describe("formatCount", () => {
  it("uses western grouping for English", () => {
    expect(formatCount(1234567, "en")).toBe("1,234,567");
  });

  it("uses Indian 2-2-3 grouping for Hindi", () => {
    // `hi` is the one locale that groups as 12,34,567 rather than 1,234,567.
    expect(formatCount(1234567, "hi")).toBe("12,34,567");
  });

  it("uses non-ASCII digits for Bengali and Arabic", () => {
    expect(formatCount(1234567, "bn")).toBe("১২,৩৪,৫৬৭");
    expect(formatCount(1234567, "ar")).toBe("١٬٢٣٤٬٥٦٧");
    expect(/[^\x00-\x7F]/u.test(formatCount(42, "ar"))).toBe(true);
  });

  it("keeps ASCII digits for Hindi, which is correct, not a fallback", () => {
    expect(formatCount(42, "hi")).toBe("42");
  });

  it("uses a non-breaking separator where the locale wants one", () => {
    // The exact code point moved from U+00A0 to U+202F between ICU versions,
    // so the assertion pins the *class* of separator rather than the build.
    expect(formatCount(1234567, "ru")).toMatch(/1[\u00A0\u202F]234[\u00A0\u202F]567/u);
    expect(formatCount(1234567, "de")).toBe("1.234.567");
  });

  it("resolves an Intl tag to its catalogue locale", () => {
    expect(formatCount(1234567, "pt")).toBe("1.234.567");
    expect(formatCount(1234567, "pt-PT")).toBe("1.234.567");
    expect(formatCount(1234567, "en-US")).toBe("1,234,567");
  });

  it("falls back to English digits for an unknown locale", () => {
    expect(formatCount(1234, "qq-QQ")).toBe("1,234");
  });

  it("renders 0 rather than NaN for a non-finite input", () => {
    expect(formatCount(Number.NaN, "en")).toBe("0");
    expect(formatCount(Number.POSITIVE_INFINITY, "en")).toBe("0");
  });
});
