# Adding a locale

What you get: a complete walkthrough for adding a fifteenth language to the atlas — the catalogue file and its shape, the five descriptor fields and the rules behind them, the registry edits, the two test assertions that are literal counts, and the verification commands.

---

## What you are adding

A locale is three things and nothing else:

- **A catalogue** — `packages/i18n/src/catalogs/<code>.ts`, a `Record<MessageKey, string>` that translates all 100 interface strings.
- **A descriptor** — one entry in `LOCALES` in `packages/i18n/src/index.ts`: the catalogue code, the `Intl` tag, the English name, the native name, and the text direction.
- **A registration** — the import and the `CATALOGS` map entry, both in the same `index.ts`.

The language switcher, the `localStorage` persistence and the `<html lang>` / `<html dir>` attributes all read `LOCALES`, so registering the descriptor is all the web app needs. There is no second list of languages to update.

## The honest scope

The catalogues translate the **interface**: navigation, buttons, verdict and trace labels, empty states. They do not translate the philosophy — machine-translating Bentham would be a worse product than leaving him in English, and the switcher menu says so rather than hiding it. A new catalogue with 100 well-reviewed interface strings is the unit of work; it is not a commitment to translate the content.

## Prerequisites

- Bun `1.3.14` installed, dependencies installed (`bun install`).
- You have read `packages/i18n/src/index.ts` end to end. It is roughly 450 lines and every rule below is visible there as a comment on the code it governs.
- You have a fluent or native reviewer for the language. `assertCatalogs()` can tell you a catalogue is structurally complete; it cannot tell you a translation is *good*, and it deliberately does not try.

## 1. Read the contract

Three files, in this order:

- `packages/i18n/src/keys.ts` — the English source of truth. Exactly 100 keys (18 nav + 16 landing + 18 council + 12 dilemmas + 16 kingdom + 10 chronicle + 10 common), grouped by the surface that renders them.
- `packages/i18n/src/catalogs/es.ts` — the shape to copy, including the register note at the top.
- `packages/i18n/src/index.ts` — `LocaleDescriptor`, `LOCALES`, `CATALOGS`.

Four rules that decide most review comments:

- **The catalogue is total.** `Record<MessageKey, string>` means TypeScript refuses a partial file. All 100 keys or it does not compile. That is the design: a machine placeholder that nobody reviewed is worse than a visible gap.
- **Placeholders are part of the contract.** The only tokens in the corpus are `{confidence}`, `{count}`, `{margin}`, `{seed}`, `{total}` and `{year}`, matched on `/\{([a-z_][a-z0-9_]*)\}/g` — lowercase identifiers only. Every token English has must appear in the translation, and no token English does not have may appear.
- **A blank is a build failure.** `missingKeys()` and the "leaves no blank value" test fail the suite; the fallback to English exists for *unknown locale codes*, not for half-finished catalogues.
- **Cognates are declared, not hidden.** A translation that is legitimately identical to English (French "Options", German "Filter") goes in the test's `IDENTICAL_COGNATES` allowlist. Forcing a synonym to dodge a string comparison would make the localisation worse.

## 2. Write the catalogue

Create `packages/i18n/src/catalogs/<code>.ts`, where `<code>` is the descriptor code — `pt-BR.ts`, not `pt_BR.ts`, because the file name, the export name and the `CATALOGS` key have to agree.

```ts
import type { MessageKey } from "../keys";

/**
 * <Language> (<code>).
 *
 * Register note: one or two sentences on the decisions a reviewer would
 * otherwise ask about — which word you chose for "realm", which terms you
 * left untranslated on purpose, and why.
 */
const MESSAGES: Record<MessageKey, string> = {
  "nav.kingdoms": "…",
  // … all 100 keys, in the order keys.ts defines them …
};

/**
 * Frozen on export: a catalogue is shared by every request the server handles,
 * so a render that mutated one would leak a language's strings into every other
 * locale for the rest of the process's life.
 */
export const xx: Record<MessageKey, string> = Object.freeze(MESSAGES);
```

Three notes on the shape:

- **The top-of-file register note is the norm.** `es.ts`, `fr.ts` and `ar.ts` all explain a deliberate choice ("Tribuna" over "Tribunal", "IA" over "AI"). It is the difference between a review that resolves in one read and one that trades comments for a week.
- **Keep the `keys.ts` order.** The files are compared by eye during review, and a reordered file makes every future diff unreadable.
- **Do not copy `en.ts`.** It re-exports `EN` from `keys.ts` rather than defining a second copy, because duplicating the strings would create a second place to forget to update.

Export naming: camelCase of the code — `ptBR` for `pt-BR`, `zh` for `zh`, matching the existing imports in `index.ts`.

## 3. Translate the 100 strings

- **Two proper nouns stay untranslated everywhere.** `nav.codex` is `Codex` (the site's own artefact name) and `nav.back_to_atlas` contains `Nooreign`. The test suite asserts both positively in all thirteen non-English locales.
- **Translate everything else.** The "untranslated English" test compares every value against English and fails on anything identical that is not a declared cognate or an allowed proper noun.
- **No forced synonyms for true cognates.** Add the value to `IDENTICAL_COGNATES` in `index.test.ts` and pin the value to the locales where it applies in the `expected` map of "translates every allowlisted value everywhere it is not a cognate". A stale allowlist entry fails the suite, so the list cannot rot.
- **Digits, grouping and dates are `Intl`'s job, not the catalogue's.** `formatCount` already renders Bengali and Arabic digits, Indian 2-2-3 grouping and narrow no-break separators straight from the `Intl` tag. Nothing about numerals belongs in a string.

## 4. Register the descriptor

In `index.ts`, three edits: the `import` from `./catalogs/<code>`, the entry in `CATALOGS` keyed by code, and the descriptor in `LOCALES`.

```ts
{ code: "it", locale: "it", name: "Italian", nativeName: "Italiano", dir: "ltr" },
```

The five fields, and the rule each one carries:

| Field | What it is | The rule |
| --- | --- | --- |
| `code` | The catalogue key and the value persisted in `localStorage` (and, if URL routing ever lands, in the URL) | Matches the file name and export; `pt-BR` rather than `pt` |
| `locale` | The BCP-47 tag handed to `Intl` | **Not always the same string as the code.** `zh` renders best as `zh-Hans`; `ar` must be region-qualified as `ar-EG` because CLDR gives the bare `ar` root the Latin digit set, and this atlas counts in Arabic-Indic digits |
| `name` | The English name, for English pages | "Chinese (Simplified)" |
| `nativeName` | The name in its own script | 简体中文 |
| `dir` | `"ltr"` or `"rtl"` | Set per locale, never sniffed from the text — a page can legitimately mix Latin runs inside an RTL layout |

Two ordering rules:

- **English first.** The site is English-first and `DEFAULT_LOCALE` points at it.
- **Append, unless you share a language.** The lookup tables are built first-writer-wins, so when two catalogues share a bare language prefix (`pt-BR` today, a future `pt-PT`) the one declared *first* stays the default for bare-prefix lookups — `resolveLocale("pt")` returns `pt-BR` exactly because it is declared. Put the more-default variant earlier.

One round-trip rule, enforced by the test "can be pointed at every locale and lands on itself": `detectLocale(descriptor.locale)` must return `descriptor.code` for every descriptor. If your `locale` tag resolves to a different catalogue — because it collides with an earlier locale's tag or bare prefix — the suite tells you.

## 5. Update the tests

`packages/i18n/src/index.test.ts` carries two literal counts that fail until edited:

```ts
it("has 14 locales, each with a unique code", () => {
  expect(LOCALES).toHaveLength(14);
  // …
});

it("ships the fourteen locales the atlas advertises", () => {
  expect(LOCALES.map((l) => l.code)).toEqual([
    "en", "es", "fr", "de", "hi", "bn", "ta", "ja", "zh", "ko", "ru", "pt-BR", "ar", "it",
  ]);
});
```

Also, if you are adding the first RTL locale after Arabic, the pin

```ts
expect(LOCALES.filter((l) => l.dir === "rtl").map((l) => l.code)).toEqual(["ar"]);
```

moves with you — and so does its test name, which says "only".

And if your language has distinctive digit shaping or grouping, add one `formatCount` assertion for it. `hi` (2-2-3 grouping), `bn` and `ar` (own digit sets) and `ru` (narrow separator) are each pinned by exactly one test, for the same reason.

## 6. Verify

```bash
cd packages/i18n
bun run test          # the catalogue suite: counts, blanks, tokens, cognates, resolution
cd ../..
bun run test          # the full turbo run, the CI command
bun run typecheck
bun run lint
bun run dev           # then use the switcher
```

In the browser, check the switcher lists the locale, the nav labels change, `<html lang>` and `<html dir>` follow the choice (they are written by `applyDocument` in `apps/web/src/components/shell/chrome-locale.tsx`), and a stat tile shows the right digits.

One thing **not** to change: the sitemap deliberately omits `alternates.languages`. The atlas has no locale-prefixed routes, so an hreflang cluster would point fourteen locales' worth of crawlers at 404s. The reasoning is written down in `apps/web/src/app/sitemap.ts`; read it before proposing otherwise.

## Checklist before you open the PR

- [ ] `catalogs/<code>.ts` exists with all 100 keys, exports `Object.freeze(MESSAGES)`, and keeps the `keys.ts` order.
- [ ] Placeholders match English exactly — same tokens, no extras, lowercase only.
- [ ] `nav.codex` is `Codex` and `nav.back_to_atlas` contains `Nooreign`.
- [ ] Any untranslated value is a true cognate, listed in `IDENTICAL_COGNATES` and pinned in the `expected` map.
- [ ] The descriptor is in `LOCALES` — code matches the file name, `locale` is the tag that gives the right digits, `dir` is set, `nativeName` is in the locale's own script.
- [ ] The import and `CATALOGS` entry are wired, and the ordering rule (append; earlier declaration wins a shared prefix) is respected.
- [ ] The locale-count and code-array assertions in `index.test.ts` are updated, plus the RTL pin and any `formatCount` assertion that applies.
- [ ] `bun run test`, `bun run typecheck` and `bun run lint` are all clean, and the switcher works in `bun run dev`.
- [ ] A fluent speaker reviewed the strings, not just the tests.
- [ ] `.github/labeler.yml` will attach `frontend` automatically from the `packages/i18n/**` changed paths.

## Related

- [`getting-started.md`](getting-started.md)
- [`architecture.md`](architecture.md)
- [`contributing-guide.md`](contributing-guide.md)
- `packages/i18n/src/index.ts` — the registry, the resolution rules and the audits
- `packages/i18n/src/keys.ts` — the 100-key English source of truth
- `packages/i18n/src/index.test.ts` — what CI actually enforces, test by test
- [`adding-a-kingdom.md`](adding-a-kingdom.md) — the same walkthrough rhythm for a realm
