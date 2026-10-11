import type { AxiomKey } from "@repo/seed/types";

/**
 * Colour maths for the observatory palette.
 *
 * Everything here is a pure function over hex strings so SVG chrome (crests,
 * terrain plates, gauges) can be tinted in code without a CSS-in-JS layer.
 * The palette constants mirror the web app's `@theme` tokens exactly — if one
 * changes there, change it here too.
 */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** The nine tokens that define the observatory. */
export const PALETTE = {
  abyss: "#070B18",
  abyssRaised: "#0E1730",
  abyssBorder: "#1E2C4D",
  parchment: "#EDE4D3",
  parchmentDim: "#B9AE99",
  crimson: "#C8483F",
  gold: "#D9A441",
  verdigris: "#4FA88B",
  indigoGlow: "#5A6FD6",
  ink: "#060911",
} as const satisfies Record<string, string>;

export type PaletteToken = keyof typeof PALETTE;

/**
 * One hue per moral dimension. Deliberately not a pure ramp: each axiom keeps
 * its own hue so a stance meter can be read without a legend, and the six are
 * chosen to stay separable against abyssal indigo.
 */
export const AXIOM_COLORS: Readonly<Record<AxiomKey, string>> = {
  welfare: "#D9A441",
  rights: "#5A6FD6",
  virtue: "#4FA88B",
  care: "#C8483F",
  justice: "#EDE4D3",
  agency: "#9B7BC9",
};

/** Ordered ramp used by meters, heatmaps and sparkline fills. */
export const RAMP = [
  PALETTE.abyss,
  "#16213F",
  "#243356",
  "#4FA88B",
  "#D9A441",
  PALETTE.parchment,
] as const;

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Accepts `#RGB`, `#RRGGBB` with or without the leading hash. */
export function hexToRgb(hex: string): Rgb {
  const match = HEX_PATTERN.exec(hex.trim());
  const body = match?.[1];
  if (body === undefined) {
    throw new Error(`hexToRgb: expected a 3 or 6 digit hex colour, received "${hex}"`);
  }
  const full = body.length === 3 ? `${body[0]}${body[0]}${body[1]}${body[1]}${body[2]}${body[2]}` : body;
  const packed = Number.parseInt(full, 16);
  return {
    r: (packed >> 16) & 0xff,
    g: (packed >> 8) & 0xff,
    b: packed & 0xff,
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const channel = (value: number): string =>
    Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase();
}

/** `rgba()` string for SVG fills that need translucency over an unknown backdrop. */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  const a = Math.round(clamp(alpha, 0, 1) * 1000) / 1000;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Naive sRGB interpolation. Deliberately *not* gamma-corrected: for UI tints
 * and hover washes the linear blend reads as "more ink" or "more light", which
 * is the behaviour designers expect from a mixing tool.
 */
export function mix(a: string, b: string, t: number): string {
  const ratio = clamp(t, 0, 1);
  const from = hexToRgb(a);
  const to = hexToRgb(b);
  return rgbToHex({
    r: from.r + (to.r - from.r) * ratio,
    g: from.g + (to.g - from.g) * ratio,
    b: from.b + (to.b - from.b) * ratio,
  });
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const linear = (channel: number): number => {
    const scaled = channel / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/**
 * WCAG contrast ratio, rounded to 6dp. The rounding removes float noise so the
 * textbook 21:1 black-on-white reads back as exactly `21`.
 */
export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 1e6) / 1e6;
}

/** The higher-contrast of ink/parchment on the given background. */
export function readableInk(backgroundHex: string): string {
  return contrastRatio(backgroundHex, PALETTE.ink) >= contrastRatio(backgroundHex, PALETTE.parchment)
    ? PALETTE.ink
    : PALETTE.parchment;
}

/** Positive `amount` darkens toward black, negative lightens toward white. */
export function shade(hex: string, amount: number): string {
  const magnitude = clamp(Math.abs(amount), 0, 1);
  return amount >= 0 ? mix(hex, "#000000", magnitude) : mix(hex, "#FFFFFF", magnitude);
}

/** WCAG conformance label for a measured ratio, used by the contrast chips. */
export function contrastLevel(ratio: number): "AAA" | "AA" | "AA Large" | "fail" {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "fail";
}