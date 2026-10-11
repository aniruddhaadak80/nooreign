/**
 * `@repo/i18n` — the locale registry and the lookup helpers.
 *
 * WHY this package exists rather than a string bag in the web app: the atlas
 * promises that every verdict can be re-run and read. That promise only holds
 * if the interface says the same thing in every language, which means the set
 * of strings has to be closed, typed and checked — not appended to at the
 * call site. So English is authored once in `keys.ts`, every other locale is a
 * `Record<MessageKey, string>` (TypeScript refuses a partial catalogue), and
 * `assertCatalogs()` is the build-time audit for tokens and blanks.
 *
 * Nothing here touches the DOM and nothing here depends on a runtime library:
 * `translate` is a map lookup plus a regex, `formatCount` is `Intl`.
 */
import { EN, type MessageKey } from "./keys";
import { en } from "./catalogs/en";
import { es } from "./catalogs/es";
import { fr } from "./catalogs/fr";
import { de } from "./catalogs/de";
import { hi } from "./catalogs/hi";
import { bn } from "./catalogs/bn";
import { ta } from "./catalogs/ta";
import { ja } from "./catalogs/ja";
import { zh } from "./catalogs/zh";
import { ko } from "./catalogs/ko";
import { ru } from "./catalogs/ru";
import { ptBR } from "./catalogs/pt-BR";
import { ar } from "./catalogs/ar";
import { it } from "./catalogs/it";

export type { MessageKey };

/* ------------------------------------------------------------------ *
 * Locales
 * ------------------------------------------------------------------ */

/**
 * One entry in the language switcher.
 *
 * `code` is the catalogue key and the value persisted in the URL/cookie.
 * `locale` is the BCP-47 tag handed to `Intl`, which is not always the same
 * string (`zh` renders best as `zh-Hans`; the bare `pt` catalogue is Brazilian;
 * `ar` must be region-qualified because CLDR gives the bare `ar` root the Latin
 * digit set, and this atlas counts in Arabic-Indic digits).
 * `dir` is set per locale rather than sniffed from the text, because a page
 * can legitimately mix Latin runs inside an RTL layout.
 */
export interface LocaleDescriptor {
  readonly code: string;
  readonly locale: string;
  readonly name: string;
  readonly nativeName: string;
  readonly dir: "ltr" | "rtl";
}

/**
 * Every locale the atlas ships, English first because the site is
 * English-first. Frozen: the switcher renders this array on every page, and a
 * caller that pushed a locale in would change the list for everybody.
 */
export const LOCALES: readonly LocaleDescriptor[] = Object.freeze([
  { code: "en", locale: "en", name: "English", nativeName: "English", dir: "ltr" },
  { code: "es", locale: "es", name: "Spanish", nativeName: "Español", dir: "ltr" },
  { code: "fr", locale: "fr", name: "French", nativeName: "Français", dir: "ltr" },
  { code: "de", locale: "de", name: "German", nativeName: "Deutsch", dir: "ltr" },
  { code: "hi", locale: "hi", name: "Hindi", nativeName: "हिन्दी", dir: "ltr" },
  { code: "bn", locale: "bn", name: "Bengali", nativeName: "বাংলা", dir: "ltr" },
  { code: "ta", locale: "ta", name: "Tamil", nativeName: "தமிழ்", dir: "ltr" },
  { code: "ja", locale: "ja", name: "Japanese", nativeName: "日本語", dir: "ltr" },
  { code: "zh", locale: "zh-Hans", name: "Chinese (Simplified)", nativeName: "简体中文", dir: "ltr" },
  { code: "ko", locale: "ko", name: "Korean", nativeName: "한국어", dir: "ltr" },
  { code: "ru", locale: "ru", name: "Russian", nativeName: "Русский", dir: "ltr" },
  { code: "pt-BR", locale: "pt-BR", name: "Portuguese (Brazil)", nativeName: "Português (Brasil)", dir: "ltr" },
  { code: "ar", locale: "ar-EG", name: "Arabic", nativeName: "العربية", dir: "rtl" },
  { code: "it", locale: "it", name: "Italian", nativeName: "Italiano", dir: "ltr" },
] as const satisfies readonly LocaleDescriptor[]);

/** The atlas is English-first; every unknown or missing locale lands here. */
export const DEFAULT_LOCALE = "en";

/**
 * The catalogue map, keyed by descriptor code.
 *
 * Keyed by code rather than by `locale` on purpose: `getCatalog` accepts both
 * forms plus bare language prefixes, and the switcher only ever knows codes.
 */
const CATALOGS: Readonly<Record<string, Readonly<Record<MessageKey, string>>>> = Object.freeze({
  en,
  es,
  fr,
  de,
  hi,
  bn,
  ta,
  ja,
  zh,
  ko,
  ru,
  "pt-BR": ptBR,
  ar,
  it,
});

/* ------------------------------------------------------------------ *
 * Locale resolution
 * ------------------------------------------------------------------ */

/**
 * Three lookup tables rather than one, because the acceptance order is
 * meaningful: an exact catalogue code (`pt-BR`) must win over an `Intl` tag
 * that merely mentions the language (`pt-PT`), which must in turn win over a
 * bare prefix (`pt`) so a Portuguese visitor gets the Brazilian catalogue
 * rather than English.
 */
const BY_CODE: ReadonlyMap<string, string> = buildLookup((d) => d.code);
const BY_LOCALE_TAG: ReadonlyMap<string, string> = buildLookup((d) => d.locale);
const BY_LANGUAGE: ReadonlyMap<string, string> = buildLookup((d) => d.code.split("-")[0] ?? d.code);

function buildLookup(pick: (descriptor: LocaleDescriptor) => string): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const descriptor of LOCALES) {
    // First writer wins: with two pt catalogues later, the one declared first
    // in `LOCALES` stays the default, which is the predictable behaviour.
    const key = pick(descriptor).toLowerCase();
    if (!map.has(key)) map.set(key, descriptor.code);
  }
  return map;
}

/**
 * Map any user-supplied locale string onto a catalogue code.
 *
 * Accepts the descriptor code (`pt-BR`), an `Intl` tag (`en-US`, `zh-Hans`),
 * a bare language (`pt`), an underscore form (`en_US`, because Windows and
 * some `Accept-Language` headers produce them), and is case-insensitive.
 * Returns `null` when nothing matches — callers decide whether that means
 * "fall back" or "reject".
 */
export function resolveLocale(code: string): string | null {
  const normalised = code.trim().replaceAll("_", "-").toLowerCase();
  if (normalised === "") return null;
  const exact = BY_CODE.get(normalised) ?? BY_LOCALE_TAG.get(normalised);
  if (exact !== undefined) return exact;
  const language = normalised.split("-")[0] ?? normalised;
  return BY_LANGUAGE.get(language) ?? null;
}

/**
 * The `Intl` tag for a locale, e.g. `zh-Hans` for `zh`. Falls back to the
 * default tag for anything unrecognised so `Intl` never throws here.
 */
export function localeTag(code: string): string {
  const resolved = resolveLocale(code);
  const descriptor = resolved === null ? undefined : LOCALES.find((d) => d.code === resolved);
  return descriptor?.locale ?? DEFAULT_LOCALE;
}

/** The descriptor for a locale code, or `undefined` if we do not ship it. */
export function getDescriptor(code: string): LocaleDescriptor | undefined {
  const resolved = resolveLocale(code);
  return resolved === undefined ? undefined : LOCALES.find((d) => d.code === resolved);
}

/** `dir` for a locale code. Arabic is the only RTL locale we ship. */
export function directionOf(code: string): "ltr" | "rtl" {
  return getDescriptor(code)?.dir ?? "ltr";
}

/**
 * Everything `detectLocale` knows how to read: a bare tag, a list of tags
 * (`navigator.languages`), an `Accept-Language` header, or a `Navigator`.
 *
 * The `Navigator` shape is included because the obvious call site is
 * `detectLocale(navigator)` in the web app, and a caller should not have to
 * remember which property to reach for.
 */
export type LocaleHint =
  | string
  | readonly string[]
  | {
      readonly language?: string | null;
      readonly languages?: readonly string[] | null;
    }
  | null
  | undefined;

const EMPTY_HINT: readonly string[] = [];

/**
 * Pick the best shipped locale from whatever the environment offers.
 *
 * `Accept-Language` is comma-separated with quality values (`fr-CA,fr;q=0.9`),
 * and browsers list `navigator.languages` in descending preference, so both
 * are read left-to-right and the first recognised tag wins. Quality values are
 * stripped rather than sorted, which is correct here because the header is
 * already in preference order.
 *
 * Returns `fallback` (default: English) when nothing matches. It never throws:
 * a locale switcher that takes the page down is worse than an English page.
 */
export function detectLocale(hints?: LocaleHint | readonly LocaleHint[], fallback: string = DEFAULT_LOCALE): string {
  for (const candidate of flattenHints(hints)) {
    // A header can hold several tags; keep scanning the same string.
    for (const tag of splitHeader(candidate)) {
      const resolved = resolveLocale(tag);
      if (resolved !== null) return resolved;
    }
  }
  return resolveLocale(fallback) ?? DEFAULT_LOCALE;
}

function flattenHints(hints: LocaleHint | readonly LocaleHint[] | undefined): readonly string[] {
  if (hints === undefined || hints === null) return EMPTY_HINT;
  if (typeof hints === "string") return [hints];
  if (Array.isArray(hints)) {
    // `Array.isArray` cannot narrow a `readonly` array on its own, so the
    // element type is restated rather than smuggled in with a cast.
    const nested: readonly LocaleHint[] = hints;
    const out: string[] = [];
    for (const hint of nested) out.push(...flattenHints(hint));
    return out;
  }
  if (typeof hints === "object" && ("languages" in hints || "language" in hints)) {
    const languages = hints.languages;
    const language = hints.language;
    // `navigator.languages` is ordered by preference and is the stronger
    // signal, so it wins whenever it is non-empty; `navigator.language` is the
    // single-tag fallback for browsers that omit it.
    if (Array.isArray(languages) && languages.length > 0) return languages.filter(isNonEmptyString);
    return typeof language === "string" ? [language] : EMPTY_HINT;
  }
  return EMPTY_HINT;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function splitHeader(value: string): readonly string[] {
  const parts = value.split(",");
  const out: string[] = [];
  for (const part of parts) {
    // `fr;q=0.9` → `fr`. Wildcards (`*`) are dropped: we do not match them.
    const tag = (part.split(";")[0] ?? "").trim();
    if (tag !== "" && tag !== "*") out.push(tag);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Catalogs
 * ------------------------------------------------------------------ */

/**
 * The catalogue for a locale code, or English when the code is not shipped.
 *
 * WHY English rather than `undefined`: every render path in the atlas has a
 * key, and a missing catalogue must not become a blank nav bar. A caller that
 * wants to know whether a locale exists asks `resolveLocale` first.
 *
 * The returned object is the frozen source map — do not mutate it.
 */
export function getCatalog(code: string): Record<MessageKey, string> {
  const resolved = resolveLocale(code);
  const catalog = resolved === null ? undefined : CATALOGS[resolved];
  return catalog ?? en;
}

/** The keys English defines that a locale has not translated (or left blank). */
export function missingKeys(code: string): MessageKey[] {
  const catalog = getCatalog(code);
  return messageKeys().filter((key) => {
    const value = catalog[key];
    return typeof value !== "string" || value.trim() === "";
  });
}

/** Keys a locale defines that English does not — always a bug, never a feature. */
export function extraKeys(code: string): string[] {
  const catalog = getCatalog(code);
  return Object.keys(catalog).filter((key) => !(key in EN));
}

/* ------------------------------------------------------------------ *
 * Placeholders
 * ------------------------------------------------------------------ */

/**
 * `{token}` in a message. Deliberately narrow — lowercase identifiers only —
 * so a stray `{ }` in a translation is a syntax error rather than a token that
 * silently never gets replaced.
 *
 * The pattern is rebuilt per call: a shared `/g` regex carries `lastIndex`
 * between calls and would drop tokens at random.
 */
export function tokensOf(template: string): string[] {
  return [...template.matchAll(/\{([a-z_][a-z0-9_]*)\}/g)].map((match) => match[1] ?? "");
}

const messageKeys = (): readonly MessageKey[] => Object.keys(EN) as MessageKey[];

/* ------------------------------------------------------------------ *
 * Translation
 * ------------------------------------------------------------------ */

export type TranslationVars = Readonly<Record<string, string | number>>;

/**
 * A `{token}` that did not resolve, or a variable nothing consumed.
 *
 * Recorded rather than logged. `translate` runs inside React render paths, so
 * a `console.warn` there is noise in the browser console during development
 * *and* in server logs during production. The diagnostics live here, capped,
 * and a test or a dev-only toolbar can drain them with `takeDiagnostics()`.
 */
export interface TranslationDiagnostic {
  readonly code: string;
  readonly key: MessageKey;
  /** The offending `{token}`, or the unused variable name. */
  readonly token: string;
  readonly kind: "unresolved-token" | "unused-var";
}

/** Bounded so a misconfigured call site in a hot loop cannot leak memory. */
const DIAGNOSTIC_LIMIT = 64;
const diagnostics: TranslationDiagnostic[] = [];

function recordDiagnostic(entry: TranslationDiagnostic): void {
  if (diagnostics.length >= DIAGNOSTIC_LIMIT) return;
  diagnostics.push(entry);
}

/** Drain and return the diagnostics recorded since the last call. */
export function takeDiagnostics(): TranslationDiagnostic[] {
  return diagnostics.splice(0, diagnostics.length);
}

/** Resolve a locale and substitute its `{token}` placeholders.
 *
 * An unknown locale falls back to English rather than throwing — see
 * `getCatalog`. A token with no matching variable is left in the output
 * (`"Founded {year}"`) instead of being replaced with `"undefined"`, because a
 * visible placeholder is a bug a developer will notice and `"undefined"` is
 * one that ships.
 */
export function translate(code: string, key: MessageKey, vars?: TranslationVars): string {
  const catalog = getCatalog(code);
  const template = catalog[key];
  // `key` is a `MessageKey`, so this cannot be undefined; the guard is a
  // cheap defence against a catalog that is missing a key at runtime only.
  if (typeof template !== "string") return EN[key];

  const tokens = tokensOf(template);
  if (vars === undefined) {
    if (tokens.length > 0) {
      for (const token of tokens) {
        recordDiagnostic({ code, key, token, kind: "unresolved-token" });
      }
    }
    return template;
  }

  let out = template;
  for (const token of tokens) {
    const value = vars[token];
    if (value === undefined) {
      recordDiagnostic({ code, key, token, kind: "unresolved-token" });
      continue;
    }
    // `replaceAll`, not `replace`: `{count}` legitimately appears twice in
    // some languages and every occurrence must resolve.
    out = out.replaceAll(`{${token}}`, String(value));
  }

  for (const name of Object.keys(vars)) {
    if (!tokens.includes(name)) {
      recordDiagnostic({ code, key, token: name, kind: "unused-var" });
    }
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * Numbers
 * ------------------------------------------------------------------ */

/**
 * Locale-aware integer/digit rendering for stat tiles and counts.
 *
 * WHY `Intl` and not a hand-rolled separator: the digits themselves change.
 * `hi` uses the Indian 2-2-3 grouping (`12,34,567`), `bn` and `ar` use
 * non-ASCII digits (১২,৩৪,৫৬৭ and ١٢٣٬٤٥٦٧), `ru` uses a narrow no-break space.
 * A single hard-coded separator would be wrong for eleven of the fourteen
 * locales.
 *
 * The locale argument goes through `resolveLocale`, so `formatCount(1, "pt")`
 * renders Brazilian Portuguese rather than throwing on an unknown tag. A
 * non-finite input renders as `0`: a stat tile showing `NaN` helps nobody.
 */
export function formatCount(value: number, locale: string): string {
  const safe = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat(localeTag(locale)).format(safe);
  } catch {
    // Unreachable through `localeTag` (it always returns a shipped tag), but
    // a bad ICU build must not take a render down.
    return new Intl.NumberFormat(DEFAULT_LOCALE).format(safe);
  }
}

/* ------------------------------------------------------------------ *
 * Audit
 * ------------------------------------------------------------------ */

/**
 * Structural audit of every catalogue. Returns a list of problems; empty means
 * good. Called by the test suite and, in development, after a hot reload.
 *
 * WHY structural only: whether a translation is *good* is a judgement a human
 * makes, and this function can only check what a machine can check — the key
 * set, blanks, and placeholder parity. In particular it deliberately does not
 * flag an untranslated value, because a handful of legitimate cognates
 * ("Options", "Verdict", "Menu") would otherwise fail the build.
 */
export function assertCatalogs(): string[] {
  const problems: string[] = [];
  const source = messageKeys();

  for (const descriptor of LOCALES) {
    const code = descriptor.code;
    const catalog = getCatalog(code);

    for (const key of source) {
      const value = catalog[key];
      if (typeof value !== "string" || value.trim() === "") {
        problems.push(`${code}: missing or blank "${key}"`);
        continue;
      }
      const expected = tokensOf(EN[key]).sort();
      const actual = tokensOf(value).sort();
      for (const token of expected) {
        if (!actual.includes(token)) problems.push(`${code}: "${key}" is missing the {${token}} placeholder`);
      }
      for (const token of actual) {
        if (!expected.includes(token)) problems.push(`${code}: "${key}" invents a {${token}} placeholder English does not have`);
      }
    }

    for (const key of Object.keys(catalog)) {
      if (!(key in EN)) problems.push(`${code}: "${key}" is not a key defined in EN`);
    }
  }

  return problems;
}
