import type { Advisor } from "@repo/seed/types";
import { crestPath, type CrestGeometry } from "./crests";

/**
 * Advisor portraits.
 *
 * A court never gets a face — it gets a bust, a hue ring and the sigil initials
 * drawn as a small geometric alphabet. Everything is derived from the advisor's
 * own `portrait` block, so the same advisor always produces the same plate and
 * two advisors never collide on the same ring hue.
 */

const round = (value: number): number => Math.round(value * 100) / 100;
const unit = (size: number) => (value: number): number => round((value / 100) * size);

/** Strokes are authored at 10 units on the 100-unit grid. */
const STROKE_UNITS = 9;

export interface InitialGeometry extends CrestGeometry {
  strokeWidth: number;
}

/**
 * A portrait is not a single path — it is a ring, a bust, a charge and up to
 * two initials, each independently tinted, so it gets its own shape rather than
 * pretending to be one crest.
 */
export interface PortraitArt {
  viewBox: string;
  size: number;
  /** The advisor's own portrait hue. */
  hue: string;
  /** Stable seed derived from the sigil — the bust proportions follow it. */
  seed: number;
  ring: string;
  silhouette: string;
  charge: CrestGeometry;
  initials: readonly InitialGeometry[];
}

/**
 * A geometric, stroke-drawn alphabet. Consolas-free: these are real letterforms
 * built from lines and arcs so a sigil still reads when it is gilding on a
 * 20px ring.
 */
const ALPHABET: Readonly<Record<string, string>> = {
  A: "M12 90 L50 10 L88 90 M26 62 L74 62",
  B: "M20 10 L20 90 M20 10 L54 10 A22 22 0 0 1 54 50 L20 50 M20 50 L58 50 A20 20 0 0 1 58 90 L20 90",
  C: "M84 26 A36 36 0 1 0 84 74",
  D: "M20 10 L20 90 M20 10 L46 10 A40 40 0 0 1 46 90 L20 90",
  E: "M84 10 L20 10 L20 90 L84 90 M20 50 L66 50",
  F: "M84 10 L20 10 L20 90 M20 50 L64 50",
  G: "M84 26 A36 36 0 1 0 84 74 L52 74 L52 46",
  H: "M20 10 L20 90 M80 10 L80 90 M20 50 L80 50",
  I: "M50 10 L50 90 M28 10 L72 10 M28 90 L72 90",
  J: "M70 10 L70 64 A22 22 0 0 1 26 64 M46 10 L92 10",
  K: "M20 10 L20 90 M82 10 L24 54 L82 90",
  L: "M24 10 L24 90 L84 90",
  M: "M14 90 L14 10 L50 62 L86 10 L86 90",
  N: "M20 90 L20 10 L80 90 L80 10",
  O: "M86 50 A36 36 0 1 1 14 50 A36 36 0 1 1 86 50",
  P: "M20 90 L20 10 L56 10 A22 22 0 0 1 56 54 L20 54",
  Q: "M86 50 A36 36 0 1 1 14 50 A36 36 0 1 1 86 50 M58 66 L86 92",
  R: "M20 90 L20 10 L56 10 A22 22 0 0 1 56 54 L20 54 M46 54 L84 90",
  S: "M82 26 A34 34 0 1 0 34 50 M70 50 A34 34 0 1 1 18 74",
  T: "M12 10 L88 10 M50 10 L50 90",
  U: "M20 10 L20 62 A30 30 0 0 0 80 62 L80 10",
  V: "M12 10 L50 90 L88 10",
  W: "M8 10 L28 90 L50 28 L72 90 L92 10",
  X: "M18 10 L82 90 M82 10 L18 90",
  Y: "M18 10 L50 48 L82 10 M50 48 L50 90",
  Z: "M16 10 L84 10 L16 90 L84 90",
};

/** Fallback for non-Latin sigils: a lozenge, still clearly "a sigil". */
const UNKNOWN = "M50 12 L78 50 L50 88 L22 50 Z";

function normaliseLetter(letter: string): string {
  return letter.normalize("NFD").replace(/\p{M}+/gu, "").toUpperCase().slice(0, 1);
}

/** One letterform as path data, drawn rather than typeset. */
export function initialPath(letter: string, size: number): InitialGeometry {
  const u = unit(size);
  const key = normaliseLetter(letter);
  const source = ALPHABET[key] ?? UNKNOWN;
  return {
    path: source.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_m, x: string, y: string) => `${u(Number(x))},${u(Number(y))}`),
    viewBox: `0 0 ${size} ${size}`,
    strokeWidth: u(STROKE_UNITS),
  };
}

/** FNV-1a over the sigil: the portrait's private seed. */
function sigilSeed(sigil: string): number {
  let hash = 2166136261;
  for (let index = 0; index < sigil.length; index += 1) {
    hash ^= sigil.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Connectives carry no identity in a sigil, so they never become initials. */
const CONNECTIVES = new Set(["A", "AN", "AND", "OF", "OR", "THE", "IN", "ON", "TO", "AT", "BY", "FOR"]);

/** Up to two distinct initials from a multi-word sigil. */
export function sigilInitials(sigil: string): string[] {
  const words = sigil
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0)
    .filter((word) => !CONNECTIVES.has(word.toUpperCase()));
  const unique: string[] = [];
  for (const word of words) {
    const letter = normaliseLetter(word);
    if (letter.length === 0 || letter === "?") continue;
    if (!unique.includes(letter)) unique.push(letter);
    if (unique.length === 2) break;
  }
  return unique.length > 0 ? unique : ["?"];
}

/**
 * Geometric bust: head, neck and shoulders as three abutting sub-paths, with
 * proportions jittered by the sigil so a court of eight advisors does not look
 * like eight copies of one bust.
 */
function silhouette(size: number, seed: number): string {
  const u = unit(size);
  const jitter = ((seed >>> 8) % 100) / 100;
  const headRadius = 14 + jitter * 4;
  const shoulder = 0.78 + (((seed >>> 16) % 100) / 100) * 0.18;
  const half = 32 * shoulder;
  const cx = 50;
  return (
    `M${u(cx - headRadius)},${u(36)} A${u(headRadius)},${u(headRadius)} 0 1 1 ${u(cx + headRadius)},${u(36)}` +
    ` A${u(headRadius)},${u(headRadius)} 0 1 1 ${u(cx - headRadius)},${u(36)} Z` +
    ` M${u(cx - 6)},${u(36 + headRadius)} L${u(cx + 6)},${u(36 + headRadius)} L${u(cx + 7)},${u(64)} L${u(cx - 7)},${u(64)} Z` +
    ` M${u(cx - half)},${u(98)} C${u(cx - half)},${u(74)} ${u(cx - half * 0.5)},${u(63)} ${u(cx)},${u(63)}` +
    ` C${u(cx + half * 0.5)},${u(63)} ${u(cx + half)},${u(74)} ${u(cx + half)},${u(98)} Z`
  );
}

/** The deterministic plate for one advisor. */
export function portraitSvg(advisor: Advisor, size = 96): PortraitArt {
  const u = unit(size);
  const seed = sigilSeed(advisor.portrait.sigil);
  const ringRadius = 48;
  const ring = `M${u(50 + ringRadius)},${u(50)} A${u(ringRadius)},${u(ringRadius)} 0 1 0 ${u(50 - ringRadius)},${u(50)} A${u(ringRadius)},${u(ringRadius)} 0 1 0 ${u(50 + ringRadius)},${u(50)} Z`;
  return {
    viewBox: `0 0 ${size} ${size}`,
    size,
    hue: advisor.portrait.hue,
    ring,
    silhouette: silhouette(size, seed),
    charge: crestPath(advisor.portrait.charge, size),
    initials: sigilInitials(advisor.portrait.sigil).map((letter) => initialPath(letter, size)),
    seed,
  };
}

/** FNV-1a, exposed so a king's crest and a portrait can share one seed stream. */
export { sigilSeed };