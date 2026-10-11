/**
 * Locale-free formatters for the chronicle.
 *
 * No `Intl` dependency on purpose: the atlas renders deterministically on the
 * server and on the client, and a hydration mismatch from ICU differences is
 * not worth the locale convenience. Year 0 is treated as 1 BCE so that the
 * timeline never shows a year the historians do not have.
 */

const CURRENT_YEAR = new Date().getFullYear();

/** `350 BCE`, `1986 AD`, `the present`. */
export function formatYear(year: number): string {
  const value = Math.round(year);
  if (value >= CURRENT_YEAR) return "the present";
  // Historians have no year zero: 0 is the tail of 1 BCE.
  if (value <= 0) return `${value === 0 ? 1 : Math.abs(value)} BCE`;
  return `${value} AD`;
}

/** `384–322 BCE`, `1914–2018 AD`, `2016–present`. */
export function formatSpan(startYear: number, endYear: number | null): string {
  const start = Math.round(startYear);
  const end = endYear === null ? null : Math.round(endYear);

  if (end === null || end >= CURRENT_YEAR) {
    if (start < 0) return `${Math.abs(start)} BCE–present`;
    return `${start} AD–present`;
  }
  if (start === end) return formatYear(start);
  if (start < 0 && end < 0) return `${Math.abs(start)}–${Math.abs(end)} BCE`;
  if (start < 0) return `${Math.abs(start)} BCE–${end} AD`;
  return `${start}–${end} AD`;
}

/** Fraction in `[0, 1]` → `"42%"`. */
export function formatPercent(fraction: number, dp = 0): string {
  return `${(fraction * 100).toFixed(dp)}%`;
}

/** Always signed, so deltas in a trace read unambiguously. */
export function formatSigned(value: number, dp = 2): string {
  const safe = Number.isFinite(value) ? value : 0;
  const rounded = Number(safe.toFixed(dp));
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "±";
  return `${sign}${Math.abs(rounded).toFixed(dp)}`;
}

/** `3.42M utilons` — the in-world currency of the deliberation economy. */
export function formatUtilons(value: number): string {
  return `${formatCompact(value)} utilons`;
}

/** `950`, `12.4K`, `3.42M`, `1.1B`, `2.7T`. */
export function formatCompact(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const sign = safe < 0 ? "−" : "";
  const magnitude = Math.abs(safe);
  const units: readonly (readonly [number, string])[] = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [factor, suffix] of units) {
    if (magnitude >= factor) {
      const scaled = magnitude / factor;
      return `${sign}${trim(scaled, scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2)}${suffix}`;
    }
  }
  return `${sign}${trim(magnitude, Number.isInteger(magnitude) ? 0 : 1)}`;
}

/**
 * Qualitative confidence for the verdict lines. Bands rather than a percentage
 * because a council should not imply four significant figures of epistemic
 * precision it does not have.
 */
export function formatConfidence(confidence: number): "doubtful" | "tentative" | "confident" | "settled" {
  if (confidence < 0.35) return "doubtful";
  if (confidence < 0.6) return "tentative";
  if (confidence < 0.82) return "confident";
  return "settled";
}

/** Truncate on a word boundary where possible; always ends with an ellipsis. */
export function truncate(text: string, maxLength: number): string {
  if (maxLength <= 0) return "";
  if (text.length <= maxLength) return text;
  const hard = text.slice(0, Math.max(1, maxLength - 1));
  const boundary = hard.lastIndexOf(" ");
  const body = boundary > 0 && boundary >= Math.floor(maxLength * 0.6) ? hard.slice(0, boundary) : hard;
  return `${body.replace(/[\s,;:.—-]+$/u, "")}…`;
}

/** `"the kingdoms of mind"` → `"The Kingdoms Of Mind"`. */
export function titleCase(input: string): string {
  return input
    .split(/([\s\-_/]+)/u)
    .map((word, index) => (index % 2 === 0 && word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join("");
}

const LATIN_FOLD: Readonly<Record<string, string>> = {
  ø: "o",
  æ: "ae",
  œ: "oe",
  ß: "ss",
  đ: "d",
  ð: "d",
  ł: "l",
  þ: "th",
  ı: "i",
  ħ: "h",
  ŋ: "n",
  ə: "e",
  "·": " ",
};

const GREEK_FOLD: Readonly<Record<string, string>> = {
  α: "a", β: "b", γ: "g", δ: "d", ε: "e", ζ: "z", η: "e", θ: "th",
  ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o", π: "p",
  ρ: "r", ς: "s", σ: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps",
  ω: "o", ϊ: "i", ϋ: "y", ΐ: "i",
};

/** RFC-3986-safe slugs, with diacritics folded and Greek transliterated. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .split("")
    .map((character) => LATIN_FOLD[character] ?? GREEK_FOLD[character] ?? character)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function trim(value: number, dp: number): string {
  const rounded = Number(value.toFixed(dp));
  return String(rounded);
}

export const FORMAT_CURRENT_YEAR = CURRENT_YEAR;