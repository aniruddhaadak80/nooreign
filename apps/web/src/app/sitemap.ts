import type { MetadataRoute } from "next";
import { ADVISORS, DILEMMAS, ERAS, EXPERIMENTS, GLOSSARY, KINGDOMS, SEED, TEXTS } from "@repo/seed";

/**
 * Every URL the atlas serves, in one list.
 *
 * Nothing here is hand-maintained past the route patterns: the counts come from
 * `@repo/seed`, so adding a kingdom or a term adds its URL in the same commit
 * that adds its data. The URL shapes match the ones `scripts/seed.ts` writes
 * into the search corpus, so a result you can click is a result that is in here.
 */

/** Canonical origin. Must agree with `metadataBase` in `layout.tsx`. */
const SITE = "https://nooreign.vercel.app";

/* ------------------------------------------------------------------ *
 * lastModified
 * ------------------------------------------------------------------ */

/**
 * WHY a derived epoch instead of `new Date()`.
 *
 * A sitemap that stamps "now" on every generation tells crawlers that all 280
 * pages changed on every crawl. That is the signal that teaches crawlers to
 * ignore `lastModified` entirely, and it is worse than having no value at all —
 * nothing in this atlas changes between builds, because everything in it is
 * generated from one seed. So the honest statement is "this content is as old as
 * the seed that produced it", and the seed is the thing that moves.
 *
 * WHY it is derived rather than a literal: bumping `SEED` in `@repo/seed` is how
 * this repository says "the corpus changed". `REPO_EPOCH_MS` is the instant the
 * current seed was cut — the initial-release commit — and one second is
 * subtracted per seed unit so that a larger seed means an *older* epoch. A
 * `lastModified` in the future is the one thing a crawler is entitled to treat
 * as a lie.
 */
const REPO_EPOCH_MS = Date.UTC(2026, 9, 12, 4, 24, 52);
const SEED_EPOCH_ISO = new Date(REPO_EPOCH_MS - SEED * 1000).toISOString();

/* ------------------------------------------------------------------ *
 * Priority and cadence, by content type
 * ------------------------------------------------------------------ */

type SitemapEntry = MetadataRoute.Sitemap[number];
type ChangeFrequency = NonNullable<SitemapEntry["changeFrequency"]>;
type Priority = NonNullable<SitemapEntry["priority"]>;

interface Tier {
  readonly changeFrequency: ChangeFrequency;
  readonly priority: Priority;
}

/**
 * WHY tiers are per content type rather than per page.
 *
 * `priority` and `changeFrequency` are both statements about *how much of the
 * site this is*, so they have to track the role a page plays, not the row it
 * came from. The ladder, and the reasoning:
 *
 * - The landing page is the site; everything else is a reason to stay.
 * - A realm is the atlas's spine — twelve of them are what the thing *is*, and
 *   each one is a hub with its own court, canon and dilemmas hanging off it.
 *   So a realm outranks the section index that lists it: a reader who wants
 *   Kant should land on Kant, not on a menu.
 * - An era and an advisor are one step down: substantial, but they are the
 *   chronicle's and the court's supporting cast rather than the argument.
 * - A dilemma is the thing a visitor is most likely to arrive *for* (it is the
 *   one page type people link to), but it is a single case, so it sits below a
 *   realm and weekly rather than monthly.
 * - An experiment is a bench you can push numbers through: interesting, narrow.
 * - A canon text is a primary source — stable for centuries, so `yearly`.
 * - A resilience report is an analysis of a case rather than a case of its own:
 *   valuable to arrive at from the dilemma, never a destination to rank above
 *   one, so it sits on the comparison rung.
 * - A glossary term is the bottom of the ladder on purpose: there are a hundred
 *   and twenty of them, each one a lookup rather than a destination, and
 *   ranking 120 definitions at 0.6 would bury the twelve pages that make the
 *   site worth reading.
 *
 * The cadence story is the same one: anything a reader arrives to *use* is
 * crawled more often than anything they arrive to *look up*.
 */
const TIERS = {
  home: { changeFrequency: "weekly", priority: 1 },
  hub: { changeFrequency: "weekly", priority: 0.8 },
  reference: { changeFrequency: "monthly", priority: 0.6 },
  kingdom: { changeFrequency: "monthly", priority: 0.9 },
  era: { changeFrequency: "monthly", priority: 0.8 },
  advisor: { changeFrequency: "monthly", priority: 0.7 },
  dilemma: { changeFrequency: "weekly", priority: 0.7 },
  experiment: { changeFrequency: "monthly", priority: 0.6 },
  canon: { changeFrequency: "yearly", priority: 0.5 },
  glossary: { changeFrequency: "yearly", priority: 0.4 },
  comparison: { changeFrequency: "monthly", priority: 0.4 },
  resilience: { changeFrequency: "monthly", priority: 0.4 },
} as const satisfies Record<string, Tier>;

type TierName = keyof typeof TIERS;

const HUB_ROUTES: readonly string[] = [
  "/kingdoms",
  "/court",
  "/council",
  "/dilemmas",
  "/chronicle",
  "/observatory",
  "/experiments",
  "/codex",
];

const REFERENCE_ROUTES: readonly string[] = ["/method", "/engine", "/compare", "/journal", "/cartographer", "/resilience"];

function entry(path: string, tier: TierName): SitemapEntry {
  return {
    url: `${SITE}${path === "/" ? "" : path}`,
    lastModified: SEED_EPOCH_ISO,
    changeFrequency: TIERS[tier].changeFrequency,
    priority: TIERS[tier].priority,
  };
}

/**
 * NO `alternates.languages` — deliberately.
 *
 * `LOCALES` in `@repo/i18n` *is* importable server-side (it is a frozen array
 * of plain descriptors, and `next.config.ts` already transpiles the package), so
 * the data is there. But the atlas has no locale-prefixed routes: the switcher
 * in `chrome-locale.tsx` keeps the choice in `localStorage` and rewrites
 * `document.documentElement.lang` on the client, and there is no `[locale]`
 * segment or middleware anywhere in the app. Emitting `<xhtml:link
 * rel="alternate" hreflang="ja" href="…/ja/kingdoms/…">` would therefore point
 * fourteen locales' worth of crawlers at 404s and hand Google a set of
 * alternates that do not resolve — a fabricated hreflang cluster is strictly
 * worse than no cluster, and it is exactly the kind of thing that gets a site
 * deindexed for the wrong reasons.
 *
 * If locale-prefixed routing ever lands, the fix is one `alternates` block here
 * driven by `LOCALES`; until then the honest answer is to omit the field.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    entry("/", "home"),
    ...HUB_ROUTES.map((route) => entry(route, "hub")),
    ...REFERENCE_ROUTES.map((route) => entry(route, "reference")),

    // The eight kinds of row the atlas is made of, in the order a reader meets
    // them: where the realms are, who sits in them, when, and on what.
    ...KINGDOMS.map((kingdom) => entry(`/kingdoms/${kingdom.slug}`, "kingdom")),
    ...ERAS.map((era) => entry(`/chronicle/${era.slug}`, "era")),
    ...ADVISORS.map((advisor) => entry(`/court/${advisor.slug}`, "advisor")),
    ...DILEMMAS.map((dilemma) => entry(`/dilemmas/${dilemma.slug}`, "dilemma")),
    ...DILEMMAS.map((dilemma) => entry(`/compare/${dilemma.slug}`, "comparison")),
    ...DILEMMAS.map((dilemma) => entry(`/resilience/${dilemma.slug}`, "resilience")),
    ...EXPERIMENTS.map((experiment) => entry(`/experiments/${experiment.slug}`, "experiment")),
    ...TEXTS.map((text) => entry(`/codex/texts/${text.slug}`, "canon")),
    ...GLOSSARY.map((entry_) => entry(`/codex/${entry_.slug}`, "glossary")),
  ];
}