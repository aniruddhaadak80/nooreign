/**
 * Query-parameter parsing for the `/og` card route.
 *
 * WHY this is its own module rather than inline in `route.tsx`: the parsing has
 * real rules — an unknown `kind` is a client error, an absent `kind` is not, an
 * empty string is not the same as a missing one, and a 4KB `title` from a
 * scraper must not become 4KB of satori layout. Rules like those only stay
 * correct if something exercises them, so they live here where the test suite
 * can reach them without standing up a renderer.
 *
 * It is deliberately pure: no `@repo/seed`, no `Request`, no DOM. Resolving an
 * id against the atlas is the route's job; deciding what a string *is* is this
 * module's job.
 */

/** Every entity type `/og` knows how to look up. */
export const OG_KINDS = [
  "kingdom",
  "advisor",
  "era",
  "technique",
  "dilemma",
  "experiment",
  "glossary",
  "text",
] as const;

export type OgKind = (typeof OG_KINDS)[number];

/**
 * Hard caps, in code points.
 *
 * The title sets the display size on the card; anything past a few lines is
 * clipped by the layout rather than by the parser, and a clipped line with a
 * half-drawn descender looks like a bug. The blurb cap is in the route because
 * it describes the atlas, not the card.
 */
export const OG_TITLE_MAX = 88;
export const OG_KICKER_MAX = 60;
export const OG_ID_MAX = 64;

/** The parsed query string of an `/og` request. */
export interface OgParams {
  /** A recognised kind, or `null` when absent or unrecognised. */
  readonly kind: OgKind | null;
  /** The slug or id to look up, folded to lower case; `null` when absent. */
  readonly id: string | null;
  /** An explicit title override; `null` means "use the resolved entity or the tagline". */
  readonly title: string | null;
  /** An explicit eyebrow override; `null` means the same. */
  readonly kicker: string | null;
  /**
   * True only when a `kind` was actually supplied and names nothing in
   * {@link OG_KINDS} — the one case the route answers with a 400. `?kind=` (an
   * empty value) is an absent kind, not a broken one, because link builders emit
   * it whenever an optional field is empty.
   */
  readonly unknownKind: boolean;
}

export function isOgKind(value: string): value is OgKind {
  return (OG_KINDS as readonly string[]).includes(value);
}

/**
 * Shorten to at most `max` code points, ending with an ellipsis when cut.
 *
 * Code points rather than UTF-16 units so a card title carrying an em dash or an
 * emoji is never sliced through the middle. `max <= 0` yields the empty string;
 * `max === 1` yields the ellipsis alone.
 */
export function ellipsize(value: string, max: number): string {
  if (max <= 0) return "";
  const points = Array.from(value);
  if (points.length <= max) return value;
  return `${points.slice(0, max - 1).join("").trimEnd()}…`;
}

/** Collapse every whitespace run to one space and trim; card text is one line. */
function collapse(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

/** A cleaned, length-capped param, or `null` when the param carried nothing. */
function bounded(value: string | null, max: number): string | null {
  if (value === null) return null;
  const cleaned = collapse(value);
  return cleaned === "" ? null : ellipsize(cleaned, max);
}

/**
 * Parse `/og`'s query string.
 *
 * Accepts either a `URLSearchParams` (what the route has) or the raw string,
 * because the interesting inputs — `?kind=&id=`, `?kind=KINGDOM`, a title with
 * newlines — are far easier to write as literals in a test than as a constructed
 * `URLSearchParams`.
 */
export function parseOgParams(input: URLSearchParams | string): OgParams {
  const params = typeof input === "string" ? new URLSearchParams(input) : input;

  const rawKind = params.get("kind");
  const kind = rawKind === null ? null : collapse(rawKind).toLowerCase();
  const resolved = kind !== null && isOgKind(kind) ? kind : null;

  const id = bounded(params.get("id"), OG_ID_MAX);

  return {
    kind: resolved,
    // Every id and slug in `@repo/seed` is lower-case ASCII, so folding here
    // makes `/og?kind=kingdom&id=Kantian-Citadel` resolve instead of quietly
    // rendering the default card for a typo that was not a typo.
    id: id === null ? null : id.toLowerCase(),
    title: bounded(params.get("title"), OG_TITLE_MAX),
    kicker: bounded(params.get("kicker"), OG_KICKER_MAX),
    unknownKind: resolved === null && kind !== null && kind !== "",
  };
}