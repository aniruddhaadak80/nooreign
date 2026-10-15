/**
 * `/og` — the dynamic social card.
 *
 * One route, one card, eight kinds of subject:
 *
 *   /og                                   the atlas itself
 *   /og?kind=kingdom&id=kantian-citadel   a realm, in its crest colour
 *   /og?kind=era&id=socratic-method       an era, its span and its summary
 *   ...
 *
 * WHY it resolves from `@repo/seed` rather than accepting a title blob: a card
 * whose text arrives by query string is a card anyone can put anything on, and
 * the atlas's whole claim is that its verdicts are reproducible. Reading the
 * name, the date and the first line of the description out of the same rows the
 * page renders means the card cannot disagree with the page.
 *
 * WHY it must not throw on a cold start: the module touches only static data.
 * There is no `cookies()`, no `headers()`, no locale, no network — `Request` is
 * read inside `GET` and nowhere else, and the seed import is a pure dataset.
 */
import { ImageResponse } from "next/og";
import {
  ATLAS_STATS,
  AXIOM_KEYS,
  DIMENSION_META,
  SEED,
  getAdvisor,
  getDilemma,
  getEra,
  getExperiment,
  getGlossaryEntry,
  getKingdom,
  getTechnique,
  getText,
  type Kingdom,
} from "@repo/seed";
import { formatShortYear, formatSpan } from "@/components/atlas/format";
import { OG_KINDS, ellipsize, parseOgParams, type OgKind } from "@/lib/og-params";

/* ------------------------------------------------------------------ *
 * Palette and type
 * ------------------------------------------------------------------ */

/**
 * The Nooreign palette, copied from the `@theme` block in `src/app/globals.css`
 * (which is where `scripts/gen-assets.mjs` copies it from too).
 *
 * These hexes are duplicated here on purpose and this is the one place in the
 * app where that duplication is unavoidable: satori lays the card out as a
 * detached style tree and rasterises it to PNG, so it never sees a CSS cascade
 * and a custom property cannot be read at module scope. `og-params.test.ts`
 * asserts every value below is still a `--color-*` token in `globals.css`, so
 * this copy is checked against the source rather than trusted.
 */
const C = {
  abyss: "#070B18",
  raised: "#0E1730",
  border: "#1E2C4D",
  parchment: "#EDE4D3",
  dim: "#B9AE99",
  crimson: "#C8483F",
  gold: "#D9A441",
  verdigris: "#4FA88B",
  indigo: "#5A6FD6",
} as const;

/**
 * Families are declared for intent, not for effect.
 *
 * `next/og` carries exactly one typeface — the Noto Sans TTF bundled with the
 * runtime — and satori falls back to it for any family it does not recognise.
 * Getting the real Cinzel / Inter / JetBrains Mono here would mean fetching or
 * embedding a font per request, which this route is explicitly not allowed to
 * do. So the card names the brand families and carries its hierarchy on size,
 * weight, colour, case and tracking instead of on the typeface — which is why
 * the display sizes below look larger than the stylesheet's `serif` sizes.
 */
const DISPLAY = "Georgia, 'Times New Roman', serif";
const BODY = "Inter, 'Segoe UI', sans-serif";
const MONO = "'JetBrains Mono', Consolas, monospace";

/**
 * `#RRGGBB` → `rgba()`: satori's colour path is happiest with rgba(), and the
 * crest colours come from data while the card's own are compile-time constants,
 * so both need translucency (glows, bars, hairlines).
 *
 * `crest.primary` is schema-validated as six hex digits, so a malformed match is
 * unreachable in practice — the `00` fallback means a hand-edited seed renders a
 * black accent instead of an unrenderable card.
 */
function alpha(hex: string, opacity: number): string {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  const channel = (index: number): number => Number.parseInt(match?.[index] ?? "00", 16);
  return `rgba(${channel(1)}, ${channel(2)}, ${channel(3)}, ${opacity})`;
}

/* ------------------------------------------------------------------ *
 * Route configuration
 * ------------------------------------------------------------------ */

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

export const size = { width: CARD_WIDTH, height: CARD_HEIGHT };
export const contentType = "image/png";
export const alt =
  "Nooreign — the philosophical atlas of aligning intelligence: twelve kingdoms, twenty-eight advisors and twenty dilemmas about superintelligence.";

/** `layout.tsx`'s default title, verbatim: the tagline the atlas is sold by. */
const DEFAULT_TITLE = "Nooreign — The philosophical atlas of aligning intelligence";
/** The eyebrow used when nothing resolves and no override was passed. */
const DEFAULT_KICKER = "The philosophical atlas of aligning intelligence";
/** The blurb is one line of the entity's own description, never a summary of ours. */
const BLURB_MAX = 150;

/** Derived from the seed, so it is a statement about the data rather than a clock. */
const STAT_LINE = `${ATLAS_STATS.kingdoms} kingdoms · ${ATLAS_STATS.advisors} advisors · ${ATLAS_STATS.dilemmas} dilemmas · ${ATLAS_STATS.glossary} glossary terms`;

/* ------------------------------------------------------------------ *
 * Entity resolution
 * ------------------------------------------------------------------ */

/** Everything the card needs about the thing a `kind` + `id` pair points at. */
interface OgEntity {
  /** The entity's own name, as its page titles it. */
  readonly name: string;
  /** Founded / born / introduced / span, or `null` when the kind has no date. */
  readonly date: string | null;
  /** One line of the entity's own description. */
  readonly blurb: string;
  /** The small uppercase label above the title. */
  readonly eyebrow: string;
  /** The realm's crest colour, or the brand gold when the entity has no realm. */
  readonly accent: string;
  /** The realm behind the entity, when it has one — drives the axiom bars. */
  readonly kingdom: Kingdom | null;
}

function entity(
  name: string,
  date: string | null,
  blurb: string,
  eyebrow: string,
  accent: string,
  kingdom: Kingdom | null,
): OgEntity {
  return { name, date, blurb: ellipsize(blurb, BLURB_MAX), eyebrow, accent, kingdom };
}

function resolveEntity(kind: OgKind, id: string): OgEntity | null {
  switch (kind) {
    case "kingdom": {
      const kingdom = getKingdom(id);
      if (!kingdom) return null;
      return entity(
        kingdom.name,
        `founded ${formatShortYear(kingdom.founded)}`,
        kingdom.creed,
        `kingdom · ${kingdom.terrain}`,
        kingdom.crest.primary,
        kingdom,
      );
    }
    case "advisor": {
      const advisor = getAdvisor(id);
      if (!advisor) return null;
      const kingdom = getKingdom(advisor.kingdomId) ?? null;
      const lifespan =
        advisor.died === null
          ? `${formatShortYear(advisor.born)} – present`
          : `${formatShortYear(advisor.born)} – ${formatShortYear(advisor.died)}`;
      return entity(
        advisor.name,
        lifespan,
        advisor.creed,
        `advisor · ${kingdom?.name ?? advisor.epithet}`,
        kingdom?.crest.primary ?? C.gold,
        kingdom,
      );
    }
    case "era": {
      const era = getEra(id);
      if (!era) return null;
      return entity(
        era.title,
        formatSpan(era.startYear, era.endYear),
        era.summary,
        `era · ${era.domain}`,
        C.gold,
        null,
      );
    }
    case "technique": {
      const technique = getTechnique(id);
      if (!technique) return null;
      return entity(
        technique.name,
        `introduced ${formatShortYear(technique.introduced)}`,
        technique.summary,
        `technique · ${technique.kind}`,
        C.gold,
        null,
      );
    }
    case "dilemma": {
      const dilemma = getDilemma(id);
      if (!dilemma) return null;
      const kingdom = getKingdom(dilemma.kingdomOrigin) ?? null;
      const era = getEra(dilemma.eraId);
      return entity(
        dilemma.title,
        era ? `era ${formatSpan(era.startYear, era.endYear)}` : null,
        dilemma.prompt,
        `dilemma · ${kingdom?.name ?? dilemma.tags[0] ?? "unattributed"}`,
        kingdom?.crest.primary ?? C.gold,
        kingdom,
      );
    }
    case "experiment": {
      const experiment = getExperiment(id);
      if (!experiment) return null;
      return entity(
        experiment.name,
        formatShortYear(experiment.year),
        experiment.question,
        `experiment · ${experiment.model}`,
        C.gold,
        null,
      );
    }
    case "glossary": {
      const entry = getGlossaryEntry(id);
      if (!entry) return null;
      const kingdom = entry.kingdomId === null ? null : (getKingdom(entry.kingdomId) ?? null);
      return entity(
        entry.term,
        null,
        entry.short,
        `glossary · ${entry.kind}`,
        kingdom?.crest.primary ?? C.gold,
        kingdom,
      );
    }
    case "text": {
      const text = getText(id);
      if (!text) return null;
      const kingdom = text.kingdomId === null ? null : (getKingdom(text.kingdomId) ?? null);
      return entity(
        text.title,
        `${formatShortYear(text.year)} · ${text.author}`,
        text.summary,
        `text · ${text.kind}`,
        kingdom?.crest.primary ?? C.gold,
        kingdom,
      );
    }
    default:
      // Unreachable while `OgKind` and `resolveEntity` agree; the route already
      // answers 400 for an unknown kind before it gets here.
      return null;
  }
}

/* ------------------------------------------------------------------ *
 * Deterministic decoration
 * ------------------------------------------------------------------ */

/** The same PRNG `scripts/gen-assets.mjs` uses, so the fallback bars are stable. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The six moral axes as bar heights: the realm's real weights when there is a
 * realm, and a seeded draw when there is not. Same motif as the committed
 * `public/images/og.svg`, and the same six labels.
 */
function axisValues(kingdom: Kingdom | null): number[] {
  if (kingdom) return AXIOM_KEYS.map((key) => kingdom.axioms[key]);
  const rand = mulberry32(SEED);
  return AXIOM_KEYS.map(() => Math.round((0.3 + rand() * 0.62) * 100) / 100);
}

/* ------------------------------------------------------------------ *
 * The card
 * ------------------------------------------------------------------ */

function Mark({ px }: { px: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: px,
        height: px,
        borderRadius: px,
        border: `1.5px solid ${C.gold}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: px * 0.62,
          height: px * 0.62,
          borderRadius: px,
          border: `1px solid ${alpha(C.indigo, 0.85)}`,
        }}
      >
        <div
          style={{
            display: "flex",
            width: px * 0.18,
            height: px * 0.18,
            borderRadius: px,
            backgroundColor: C.crimson,
          }}
        />
      </div>
    </div>
  );
}

function AxisBars({ bars, accent }: { bars: readonly number[]; accent: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: 288 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          height: 190,
        }}
      >
        {bars.map((value, index) => (
          <div
            key={AXIOM_KEYS[index] ?? `axis-${index}`}
            style={{
              display: "flex",
              width: 34,
              height: Math.max(8, Math.round(value * 180)),
              borderRadius: 3,
              backgroundColor: index % 3 === 0 ? accent : alpha(C.indigo, 0.8),
              opacity: 0.35 + value * 0.55,
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
        {AXIOM_KEYS.map((key) => (
          <div
            key={key}
            style={{
              display: "flex",
              width: 34,
              fontFamily: MONO,
              fontSize: 13,
              color: C.dim,
              textAlign: "center",
            }}
          >
            {DIMENSION_META[key].label.toLowerCase()}
          </div>
        ))}
      </div>
    </div>
  );
}

interface OgCardProps {
  readonly title: string;
  readonly kicker: string;
  readonly date: string | null;
  readonly blurb: string;
  readonly accent: string;
  readonly bars: readonly number[];
}

/**
 * Divs and inline styles only.
 *
 * satori implements a strict subset of CSS: no grid, no `url()` background, no
 * `text-overflow`, and every element with more than one child needs an explicit
 * `display`. Hence the glows being big translucent circles rather than radial
 * gradients, and the blurb being pre-shortened rather than line-clamped.
 */
function OgCard({ title, kicker, date, blurb, accent, bars }: OgCardProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: C.abyss,
        color: C.parchment,
        fontFamily: BODY,
        paddingTop: 48,
        paddingBottom: 46,
        paddingLeft: 64,
        paddingRight: 64,
      }}
    >
      {/* Glows. Positioned first so everything else paints over them. */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: -190,
          right: -130,
          width: 560,
          height: 560,
          borderRadius: 560,
          backgroundColor: alpha(C.indigo, 0.2),
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: -230,
          left: -170,
          width: 520,
          height: 520,
          borderRadius: 520,
          backgroundColor: alpha(C.crimson, 0.15),
        }}
      />

      {/* The gold hairline frame. */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 26,
          left: 26,
          right: 26,
          bottom: 26,
          border: `1px solid ${alpha(C.gold, 0.34)}`,
          borderRadius: 12,
        }}
      />

      {/* ------------------------------- masthead ------------------------------- */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 18 }}>
          <Mark px={44} />
          <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 34, letterSpacing: 1.6 }}>
            Nooreign
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: MONO,
            fontSize: 15,
            letterSpacing: 3.4,
            color: C.dim,
            textTransform: "uppercase",
          }}
        >
          seed {SEED}
        </div>
      </div>

      {/* -------------------------------- body --------------------------------- */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 52,
          flexGrow: 1,
          marginTop: 34,
          marginBottom: 26,
        }}
      >
        <div style={{ display: "flex", flexDirection: "row", gap: 28, flexGrow: 1 }}>
          <div style={{ display: "flex", width: 5, borderRadius: 3, backgroundColor: accent }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flexGrow: 1 }}>
            <div
              style={{
                display: "flex",
                fontFamily: MONO,
                fontSize: 17,
                letterSpacing: 4,
                color: C.gold,
                textTransform: "uppercase",
              }}
            >
              {kicker}
            </div>
            <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 48, lineHeight: 1.12 }}>
              {title}
            </div>
            {date === null ? null : (
              <div
                style={{
                  display: "flex",
                  alignSelf: "flex-start",
                  backgroundColor: C.raised,
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  paddingTop: 6,
                  paddingBottom: 6,
                  paddingLeft: 13,
                  paddingRight: 13,
                  fontFamily: MONO,
                  fontSize: 16,
                  letterSpacing: 2,
                  color: accent,
                }}
              >
                {date}
              </div>
            )}
            <div style={{ display: "flex", fontSize: 24, lineHeight: 1.42, color: C.dim }}>{blurb}</div>
          </div>
        </div>
        <AxisBars bars={bars} accent={accent} />
      </div>

      {/* -------------------------------- footer -------------------------------- */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `1px solid ${C.border}`,
          paddingTop: 18,
        }}
      >
        <div style={{ display: "flex", fontFamily: MONO, fontSize: 17, letterSpacing: 1.4, color: C.verdigris }}>
          nooreign.vercel.app
        </div>
        <div style={{ display: "flex", fontFamily: MONO, fontSize: 15, letterSpacing: 2, color: C.dim }}>
          {STAT_LINE}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Handler
 * ------------------------------------------------------------------ */

export async function GET(request: Request): Promise<Response> {
  const params = parseOgParams(new URL(request.url).searchParams);

  // The only 400: the caller asked for a subject type this route cannot draw.
  // A missing kind, a missing id, or an id that resolves to nothing all fall
  // through to the default card — a shared link with a stale slug should still
  // render something worth sharing.
  if (params.unknownKind) {
    return new Response(`Unknown kind. Expected one of: ${OG_KINDS.join(", ")}.\n`, {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const resolved =
    params.kind === null || params.id === null ? null : resolveEntity(params.kind, params.id);

  // An explicit parameter always wins; otherwise the resolved entity's own words;
  // otherwise the atlas defaults. A `?kind=kingdom&id=typo` therefore renders the
  // generic card rather than an empty title.
  const title = params.title ?? resolved?.name ?? DEFAULT_TITLE;
  const kicker = params.kicker ?? resolved?.eyebrow ?? DEFAULT_KICKER;
  const accent = resolved?.accent ?? C.gold;

  return new ImageResponse(
    (
      <OgCard
        title={title}
        kicker={kicker}
        date={resolved?.date ?? null}
        blurb={resolved?.blurb ?? "The ethics of human versus superintelligence, as a realm you can walk."}
        accent={accent}
        bars={axisValues(resolved?.kingdom ?? null)}
      />
    ),
    { ...size },
  );
}