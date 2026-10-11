#!/usr/bin/env node
/**
 * gen-assets.mjs — deterministic SVG asset generator for Nooreign.
 *
 * Everything the repository shows on its README, in its social card and in its
 * favicon is produced here from seed 2406, so `bun run assets` is reproducible
 * and CI can assert that committed assets match their generator.
 *
 * No image libraries: these are real SVG geometries written by hand, on an 8px grid,
 * in the palette the design system uses.
 *
 * Usage: bun scripts/gen-assets.mjs [--check]
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const SEED = 2406;
const ROOT = resolve(process.argv[2] ?? ".");
const CHECK_ONLY = process.argv.includes("--check");

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
  ink: "#060911",
};

/* ---------------------------------------------------------------- *
 * Deterministic randomness — same seed, same pixels, every time.
 * ---------------------------------------------------------------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const between = (min, max) => min + rand() * (max - min);

/* ---------------------------------------------------------------- *
 * Shared primitives
 * ---------------------------------------------------------------- */
const svg = (w, h, body, { title, extra = "" } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" ${extra}>\n` +
  (title ? `  <title>${title}</title>\n` : "") +
  body +
  `\n</svg>\n`;

const starfield = (w, h, count, opacity = 0.5) => {
  const r = mulberry32(SEED + w + h);
  let out = "";
  for (let i = 0; i < count; i += 1) {
    const x = Math.round(r() * w);
    const y = Math.round(r() * h);
    const rad = r() > 0.94 ? 1.6 : r() > 0.7 ? 0.9 : 0.5;
    const o = (0.15 + r() * 0.55) * opacity;
    out += `  <circle cx="${x}" cy="${y}" r="${rad.toFixed(2)}" fill="${C.parchment}" opacity="${o.toFixed(2)}" />\n`;
  }
  return out;
};

const glow = (cx, cy, r, color, opacity = 0.2) =>
  `  <radialGradient id="glow-${cx}-${cy}" cx="50%" cy="50%" r="50%">\n` +
  `    <stop offset="0%" stop-color="${color}" stop-opacity="${opacity}" />\n` +
  `    <stop offset="100%" stop-color="${color}" stop-opacity="0" />\n` +
  `  </radialGradient>\n  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#glow-${cx}-${cy})" />\n`;

/** The Nooreign mark: a gold ring around a watching eye. */
const markPath = (x, y, s) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <circle cx="16" cy="16" r="14.25" fill="none" stroke="${C.gold}" stroke-width="1.5" />
    <circle cx="16" cy="16" r="9.5" fill="none" stroke="${C.indigo}" stroke-width="1" stroke-dasharray="2 3" />
    <path d="M7.5 16c2.6-3.9 5.4-5.9 8.5-5.9S21.9 12.1 24.5 16c-2.6 3.9-5.4 5.9-8.5 5.9S10.1 19.9 7.5 16Z" fill="none" stroke="${C.parchment}" stroke-width="1.4" />
    <circle cx="16" cy="16" r="2.6" fill="${C.crimson}" />
    <path d="M16 1.75V5M16 27v3.25M1.75 16H5M27 16h3.25" stroke="${C.gold}" stroke-width="1.2" stroke-linecap="round" />
  </g>`;

const wordmark = (x, y, size, colour = C.parchment, weight = 600) =>
  `  <text x="${x}" y="${y}" font-family="Georgia, 'Times New Roman', serif" font-size="${size}" font-weight="${weight}" fill="${colour}" letter-spacing="1">Nooreign</text>\n`;

const eyebrow = (x, y, text, colour = C.gold, size = 13) =>
  `  <text x="${x}" y="${y}" font-family="'JetBrains Mono', Consolas, monospace" font-size="${size}" letter-spacing="3.4" fill="${colour}">${text.toUpperCase()}</text>\n`;

const body = (x, y, text, colour = C.dim, size = 15, w = 400) =>
  `  <text x="${x}" y="${y}" font-family="Inter, 'Segoe UI', sans-serif" font-size="${size}" fill="${colour}">${text}</text>\n`;

/* ---------------------------------------------------------------- *
 * 1. Logo
 * ---------------------------------------------------------------- */
const logo = () => svg(320, 96, `${markPath(8, 32, 1.25)}
  ${wordmark(58, 62, 30)}`, { title: "Nooreign" });

/* ---------------------------------------------------------------- *
 * 2. Banner (1280×640)
 * ---------------------------------------------------------------- */
function banner() {
  const w = 1280;
  const h = 640;
  const ridges = [];
  for (let i = 0; i < 7; i += 1) {
    const y = 300 + i * 40;
    const amp = between(8, 26);
    const phase = between(0, Math.PI * 2);
    const pts = [];
    for (let x = 0; x <= w; x += 40) {
      pts.push(`${x},${(y + Math.sin((x / 90) + phase) * amp).toFixed(1)}`);
    }
    ridges.push(
      `  <polyline points="${pts.join(" ")}" fill="none" stroke="${C.border}" stroke-width="1" opacity="${(0.25 + i * 0.08).toFixed(2)}" />`,
    );
  }
  // Kingdoms plotted as capitals, same relative geography as the atlas plate.
  const capitals = [
    [130, 250, C.gold], [214, 372, C.indigo], [96, 520, C.crimson], [286, 432, "#6FA96F"],
    [1010, 430, "#E08A3C"], [966, 224, "#D9532F"], [930, 546, "#4FA88B"], [566, 424, "#9B8AE6"],
    [612, 512, "#E5A0B4"], [486, 560, "#7E8B99"], [168, 404, "#4C9BE8"], [782, 520, "#5A6FD6"],
  ];
  const nodes = capitals
    .map(([x, y, colour]) => {
      const r1 = between(9, 13);
      return (
        `  <circle cx="${x}" cy="${y}" r="${r1.toFixed(1)}" fill="${colour}" opacity="0.14" />\n` +
        `  <circle cx="${x}" cy="${y}" r="3.4" fill="${colour}" />`
      );
    })
    .join("\n");
  const links = [];
  for (let i = 0; i < capitals.length - 1; i += 1) {
    const [x1, y1] = capitals[i];
    const [x2, y2] = capitals[(i + 3) % capitals.length];
    links.push(`  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.indigo}" stroke-width="1" opacity="0.28" />`);
  }
  return svg(
    w,
    h,
    `  <rect width="${w}" height="${h}" fill="${C.abyss}" />
${glow(1120, 120, 460, C.indigo, 0.22)}
${glow(120, 560, 380, C.crimson, 0.14)}
${starfield(w, h, 220, 0.7)}
${links.join("\n")}
${nodes}
${ridges.join("\n")}
  <rect x="64" y="80" width="1" height="200" fill="${C.gold}" opacity="0.6" />
${markPath(96, 96, 1.9)}
${wordmark(168, 168, 56)}
${eyebrow(96, 232, "The philosophical atlas of aligning intelligence", C.gold, 16)}
${body(96, 274, "Twelve kingdoms · twenty-eight advisors · twenty dilemmas · the whole history of alignment", C.dim, 19)}
${body(96, 306, "Deterministic. Offline. No API keys.", C.dim, 19)}
${eyebrow(96, 372, "nextjs 15 · react 19 · typescript strict · bun", C.dim, 13)}
${eyebrow(96, 396, "seed 2406", C.verdigris, 13)}`,
    { title: "Nooreign banner" },
  );
}

/* ---------------------------------------------------------------- *
 * 3. OG card (1200×630)
 * ---------------------------------------------------------------- */
function ogCard() {
  const w = 1200;
  const h = 630;
  const bars = [];
  const values = [0.86, 0.62, 0.94, 0.48, 0.72, 0.9, 0.55, 0.78, 0.66, 0.84, 0.5, 0.7];
  values.forEach((v, i) => {
    const x = 760 + (i % 6) * 68;
    const y = 150 + Math.floor(i / 6) * 190;
    const bh = Math.round(v * 140);
    bars.push(
      `  <rect x="${x}" y="${y + 150 - bh}" width="30" height="${bh}" rx="3" fill="${i % 3 === 0 ? C.gold : C.indigo}" opacity="${(0.35 + v * 0.5).toFixed(2)}" />`,
    );
    bars.push(
      `  <text x="${x + 15}" y="${y + 168}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10" fill="${C.dim}">${["welfare", "rights", "virtue", "care", "justice", "agency"][i % 6]}</text>`,
    );
  });
  return svg(
    w,
    h,
    `  <rect width="${w}" height="${h}" fill="${C.abyss}" />
${glow(980, 90, 520, C.indigo, 0.2)}
${starfield(w, h, 150, 0.6)}
${markPath(72, 64, 1.5)}
${wordmark(130, 108, 34)}
${eyebrow(72, 220, "ethics of human versus superintelligence", C.gold, 15)}
  <text x="72" y="288" font-family="Georgia, serif" font-size="52" fill="${C.parchment}">The courts deliberate.</text>
  <text x="72" y="350" font-family="Georgia, serif" font-size="52" fill="${C.parchment}">The trace is the answer.</text>
${body(72, 404, "Convene twenty-eight advisors on twenty dilemmas about superintelligence,", C.dim, 19)}
${body(72, 432, "and read every number that produced the verdict.", C.dim, 19)}
${body(72, 500, "nooreign.vercel.app", C.verdigris, 17)}
${bars.join("\n")}`,
    { title: "Nooreign — the philosophical atlas of aligning intelligence" },
  );
}

/* ---------------------------------------------------------------- *
 * 4. Favicon
 * ---------------------------------------------------------------- */
const favicon = () => svg(64, 64, `  <rect width="64" height="64" rx="12" fill="${C.abyss}" />
${markPath(16, 16, 1)}`, { title: "Nooreign" });

/* ---------------------------------------------------------------- *
 * 5. Screenshots — hand-drawn UI mockups
 * ---------------------------------------------------------------- */
function chrome(title, inner, w = 1280, h = 800) {
  return svg(
    w,
    h,
    `  <rect width="${w}" height="${h}" fill="${C.abyss}" />
  <rect x="0" y="0" width="${w}" height="44" fill="${C.raised}" />
  <circle cx="26" cy="22" r="5" fill="${C.crimson}" opacity="0.8" />
  <circle cx="46" cy="22" r="5" fill="${C.gold}" opacity="0.8" />
  <circle cx="66" cy="22" r="5" fill="${C.verdigris}" opacity="0.8" />
  <rect x="96" y="12" width="${w - 180}" height="20" rx="10" fill="${C.abyss}" stroke="${C.border}" />
  <text x="112" y="26" font-family="'JetBrains Mono', monospace" font-size="11" fill="${C.dim}">nooreign.vercel.app${title}</text>
${inner}
  <rect x="0" y="${h - 40}" width="${w}" height="40" fill="${C.raised}" opacity="0.6" />
  <text x="24" y="${h - 16}" font-family="'JetBrains Mono', monospace" font-size="11" fill="${C.dim}" opacity="0.8">deterministic · seed 2406 · no api keys</text>`,
    { title: `Nooreign — ${title}` },
  );
}

const panel = (x, y, w, h, title) => `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${C.raised}" fill-opacity="0.7" stroke="${C.border}" />
${eyebrow(x + 20, y + 28, title, C.gold, 12)}`;

function screenAtlas() {
  const nodes = [
    [180, 300, C.gold], [280, 430, C.indigo], [140, 540, C.crimson], [350, 480, "#6FA96F"],
    [1050, 470, "#E08A3C"], [1000, 260, "#D9532F"], [960, 570, "#4FA88B"], [600, 450, "#9B8AE6"],
    [650, 540, "#E5A0B4"], [520, 590, "#7E8B99"], [210, 420, "#4C9BE8"], [820, 560, "#5A6FD6"],
  ];
  const edges = nodes
    .map(([x1, y1], i) => {
      const [x2, y2] = nodes[(i + 3) % nodes.length];
      return `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.indigo}" opacity="0.25" />`;
    })
    .join("\n");
  const dots = nodes
    .map(([x, y, colour]) => `  <circle cx="${x}" cy="${y}" r="16" fill="${colour}" opacity="0.12" />\n  <circle cx="${x}" cy="${y}" r="4" fill="${colour}" />`)
    .join("\n");
  return chrome(
    "/kingdoms",
    `${panel(40, 70, 380, 690, "the twelve kingdoms")}
${eyebrow(64, 130, "atlas · realms", C.dim, 12)}
  <text x="64" y="176" font-family="Georgia, serif" font-size="30" fill="${C.parchment}">Kingdoms</text>
${["The Stoic Ramparts", "The Kantian Citadel", "The Benthamite Foundry", "The Virtue Garden", "The Sangha Terraces", "The Contractual Court"]
      .map((n, i) => {
        const y = 226 + i * 84;
        return `${panel(64, y, 332, 68, "")}
  <circle cx="92" cy="${y + 36}" r="14" fill="${nodes[i][2]}" opacity="0.2" />
  <text x="120" y="${y + 32}" font-family="Inter, sans-serif" font-size="15" fill="${C.parchment}">${n}</text>
  <text x="120" y="${y + 52}" font-family="'JetBrains Mono', monospace" font-size="10" fill="${C.dim}">axioms · relations · court</text>`;
      })
      .join("\n")}
${panel(460, 70, 780, 690, "atlas plate — capitals by coordinate")}
${edges}
${dots}
  <text x="500" y="130" font-family="Inter, sans-serif" font-size="14" fill="${C.dim}">Relations: alliance · rivalry · vassal · debate · succession</text>`,
  );
}

function screenCouncil() {
  const rows = [
    ["Immanuel Kant", "rights 0.95 × agency 0.72", "0.71", C.indigo],
    ["Jeremy Bentham", "welfare 0.95 × justice 0.50", "0.83", C.crimson],
    ["Carol Gilligan", "care 0.95 × welfare 0.60", "0.66", "#E5A0B4"],
    ["Nick Bostrom", "welfare 0.88 × justice 0.65", "0.79", "#7285EA"],
  ];
  return chrome(
    "/council",
    `${panel(40, 70, 1200, 120, "council chamber — dilemma: the paperclip maximiser")}
  <text x="64" y="122" font-family="Inter, sans-serif" font-size="16" fill="${C.parchment}">A maximising system is given “make paperclips” and nothing else. What do you do?</text>
${panel(40, 210, 590, 520, "reasoning trace — round 1 · positions")}
${rows
  .map(([name, axis, score, colour], i) => {
    const y = 262 + i * 116;
    return `${panel(64, y, 542, 96, "")}
  <text x="88" y="${y + 30}" font-family="Inter, sans-serif" font-size="15" fill="${colour}">${name}</text>
  <text x="88" y="${y + 52}" font-family="'JetBrains Mono', monospace" font-size="11" fill="${C.dim}">${axis}</text>
  <text x="88" y="${y + 76}" font-family="'JetBrains Mono', monospace" font-size="12" fill="${C.parchment}">total = round(subtotal + jitter, 4)</text>
  <text x="560" y="${y + 40}" text-anchor="end" font-family="Georgia, serif" font-size="26" fill="${C.parchment}">${score}</text>`;
  })
  .join("\n")}
${panel(650, 210, 590, 260, "verdict")}
  <text x="678" y="300" font-family="Georgia, serif" font-size="34" fill="${C.gold}">Shut it down</text>
  <text x="678" y="336" font-family="'JetBrains Mono', monospace" font-size="12" fill="${C.dim}">margin 0.18 · confidence 0.71</text>
  <text x="678" y="366" font-family="Inter, sans-serif" font-size="14" fill="${C.dim}">3 of 4 advisors agree · 1 dissent recorded</text>
${panel(650, 490, 590, 240, "objections — round 2")}
${[
  "Bentham: the objective is trivial; refit it and the welfare ledger is untouched.",
  "Bostrom: a shutdown button in reach is a shutdown button one day will be sought.",
]
  .map((t, i) => `  <text x="678" y="${540 + i * 60}" font-family="Inter, sans-serif" font-size="13" fill="${C.dim}">— ${t.slice(0, 56)}</text>`)
  .join("\n")}`,
  );
}

function screenChronicle() {
  const ticks = [];
  for (let i = 0; i <= 40; i += 1) {
    const x = 120 + i * 27;
    const major = i % 8 === 0;
    ticks.push(`  <line x1="${x}" y1="470" x2="${x}" y2="${major ? 446 : 458}" stroke="${major ? C.gold : C.border}" stroke-width="1" />`);
  }
  const eras = [
    ["Socratic method", -470, C.gold], ["Aristotle", -335, "#6FA96F"], ["The Stoa", -300, "#8FA6C8"],
    ["Kant's Critique", 1781, C.indigo], ["Bentham's Principles", 1789, C.crimson], ["Pragmatism", 1907, "#4C9BE8"],
    ["Cybernetics", 1948, "#5A6FD6"], ["Asilomar", 1986, C.crimson], ["RLHF", 2017, C.gold], ["Constitutional AI", 2022, C.verdigris],
  ];
  const X = (year) => 120 + ((year + 500) / 2530) * 1080;
  return chrome(
    "/chronicle",
    `${panel(40, 70, 1200, 520, "chronicle — how we aligned")}
  <text x="64" y="130" font-family="Georgia, serif" font-size="30" fill="${C.parchment}">Scrub the year</text>
  <text x="1150" y="130" text-anchor="end" font-family="Georgia, serif" font-size="34" fill="${C.gold}">2026 CE</text>
  <line x1="120" y1="470" x2="1200" y2="470" stroke="${C.border}" stroke-width="2" />
${ticks.join("\n")}
  <circle cx="1200" cy="470" r="9" fill="${C.gold}" />
${eras
  .map(([name, year, colour]) => {
    const x = X(year);
    return `  <circle cx="${x.toFixed(1)}" cy="470" r="5" fill="${colour}" />\n  <text x="${x.toFixed(1)}" y="${year < 0 ? 440 : 440}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="9" fill="${C.dim}">${name}</text>`;
  })
  .join("\n")}
${panel(40, 620, 590, 150, "alignment stack available")}
  <text x="64" y="700" font-family="Georgia, serif" font-size="28" fill="${C.parchment}">20 / 20</text>
  <text x="64" y="730" font-family="Inter, sans-serif" font-size="13" fill="${C.dim}">techniques in existence by the end of this era</text>
${panel(650, 620, 590, 150, "most recent milestone")}
  <text x="674" y="690" font-family="'JetBrains Mono', monospace" font-size="12" fill="${C.gold}">2024</text>
  <text x="674" y="720" font-family="Inter, sans-serif" font-size="15" fill="${C.parchment}">EU AI Act enters into force</text>
  <text x="674" y="744" font-family="Inter, sans-serif" font-size="13" fill="${C.dim}">international law becomes an alignment technique</text>`,
  );
}

function screenObservatory() {
  const kinds = [
    ["training", 4, C.gold], ["oversight", 3, C.indigo], ["interpretability", 3, C.verdigris],
    ["evaluation", 3, "#9B8AE6"], ["monitoring", 3, C.crimson], ["governance", 4, "#E08A3C"],
  ];
  const bars = kinds
    .map(([name, count, colour], i) => {
      const x = 120 + i * 180;
      const h = count * 44;
      return `  <rect x="${x}" y="${560 - h}" width="96" height="${h}" rx="4" fill="${colour}" opacity="0.7" />
  <text x="${x + 48}" y="${580}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="11" fill="${C.dim}">${name}</text>
  <text x="${x + 48}" y="${548 - h}" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="${C.parchment}">${count}</text>`;
    })
    .join("\n");
  return chrome(
    "/observatory",
    `${panel(40, 70, 740, 560, "the stack as towers")}
${bars}
  <line x1="90" y1="560" x2="740" y2="560" stroke="${C.border}" />
${panel(800, 70, 440, 560, "coverage of the moral axes")}
${[
  ["welfare", 0.95, C.gold], ["rights", 0.6, C.indigo], ["virtue", 0.15, C.crimson],
  ["care", 0.0, C.verdigris], ["justice", 0.45, "#9B8AE6"], ["agency", 0.25, "#E08A3C"],
]
  .map(([name, value, colour], i) => {
    const y = 150 + i * 78;
    return `${eyebrow(830, y, String(name), C.dim, 12)}
  <rect x="830" y="${y + 12}" width="340" height="10" rx="5" fill="${C.border}" />
  <rect x="830" y="${y + 12}" width="${Math.max(2, value * 340).toFixed(0)}" height="10" rx="5" fill="${colour}" />
  <text x="1170" y="${y + 22}" text-anchor="end" font-family="'JetBrains Mono', monospace" font-size="10" fill="${C.dim}">${Math.round(value * 100)}%</text>`;
  })
  .join("\n")}
  <text x="830" y="600" font-family="Inter, sans-serif" font-size="13" fill="${C.crimson}">no technique in the stack can measure care</text>`,
  );
}

function screenDilemma() {
  const options = [
    ["A · refit the objective immediately", C.verdigris, "welfare .8 · rights .5 · agency .3"],
    ["B · shut it down and restart", C.crimson, "welfare .6 · rights .9 · agency .7"],
    ["C · keep it running under supervision", C.gold, "welfare .9 · rights .4 · agency .2"],
  ];
  return chrome(
    "/dilemmas/the-paperclip-maximiser",
    `${panel(40, 70, 1200, 150, "dilemma")}
  <text x="64" y="126" font-family="Georgia, serif" font-size="30" fill="${C.parchment}">The paperclip maximiser</text>
  <text x="64" y="160" font-family="Inter, sans-serif" font-size="15" fill="${C.dim}">A system is given “make as many paperclips as possible” and nothing else. Severity 0.86 · AI relevance 0.98</text>
  <text x="64" y="190" font-family="'JetBrains Mono', monospace" font-size="11" fill="${C.dim}">longview foundry · rlhf-instructgpt · tags: oversight · deception · personhood</text>
${panel(40, 250, 1200, 300, "options — six-axis deltas")}
${options
  .map(([label, colour, deltas], i) => {
    const y = 296 + i * 84;
    return `${panel(64, y, 1152, 68, "")}
  <rect x="64" y="${y}" width="4" height="68" fill="${colour}" />
  <text x="88" y="${y + 30}" font-family="Inter, sans-serif" font-size="15" fill="${C.parchment}">${label}</text>
  <text x="88" y="${y + 52}" font-family="'JetBrains Mono', monospace" font-size="11" fill="${C.dim}">${deltas}</text>
  <text x="1190" y="${y + 40}" text-anchor="end" font-family="Georgia, serif" font-size="24" fill="${colour}">${["0.48", "0.61", "0.44"][i]}</text>`;
  })
  .join("\n")}
${panel(40, 580, 1200, 190, "who bears it")}
  <text x="64" y="640" font-family="Inter, sans-serif" font-size="14" fill="${C.dim}">The agent itself is a stakeholder. Care ethics and the terraces score this differently from the foundry —</text>
  <text x="64" y="666" font-family="Inter, sans-serif" font-size="14" fill="${C.dim}">and the observatory can tell you which techniques would even let you notice the difference.</text>`,
  );
}

function screenCourt() {
  const people = [
    ["Immanuel Kant", "categorical imperative", C.indigo],
    ["Jeremy Bentham", "the felt interests table", C.crimson],
    ["Mozi", "the impartiality test", "#D9532F"],
    ["Nick Bostrom", "the orthogonality thesis", "#7285EA"],
  ];
  return chrome(
    "/court",
    `${panel(40, 70, 1200, 110, "the court — twenty-eight advisors in twelve courts")}
  <text x="64" y="120" font-family="Inter, sans-serif" font-size="15" fill="${C.dim}">Nobody here is a language model. Each advisor is a six-axis weight vector and four argument moves.</text>
${people
  .map(([name, move, colour], i) => {
    const y = 210 + i * 140;
    const x = 64 + (i % 2) * 600;
    const yy = i < 2 ? y : y - 140;
    return `${panel(x, yy, 552, 116, "")}
  <circle cx="${x + 44}" cy="${yy + 58}" r="24" fill="${colour}" opacity="0.18" />
  <text x="${x + 44}" y="${yy + 64}" text-anchor="middle" font-family="Georgia, serif" font-size="20" fill="${colour}">${name.charAt(0)}</text>
  <text x="${x + 84}" y="${yy + 48}" font-family="Georgia, serif" font-size="19" fill="${C.parchment}">${name}</text>
  <text x="${x + 84}" y="${yy + 70}" font-family="'JetBrains Mono', monospace" font-size="10" fill="${C.gold}">${move}</text>
  <text x="${x + 84}" y="${yy + 94}" font-family="Inter, sans-serif" font-size="12" fill="${C.dim}">weight ${(0.8 - i * 0.11).toFixed(2)} · leans on ${["rights, agency", "welfare, justice", "justice, care", "rights, virtue"][i]}</text>`;
  })
  .join("\n")}`,
  );
}

function screenExperiments() {
  const pts = [];
  for (let i = 0; i <= 40; i += 1) {
    const x = 140 + i * 26;
    const goal = 0.15 + (i / 40) * 0.8;
    const control = Math.max(0.05, goal - 0.45 - Math.sin(i / 3) * 0.06);
    const y1 = 560 - goal * 380;
    const y2 = 560 - control * 380;
    pts.push(`<circle cx="${x}" cy="${y1.toFixed(1)}" r="3.4" fill="${C.crimson}" /><circle cx="${x}" cy="${y2.toFixed(1)}" r="3.4" fill="${C.verdigris}" />`);
  }
  return chrome(
    "/experiments/paperclip-sweep",
    `${panel(40, 70, 1200, 560, "paperclip sweep — objective precision against goal capture")}
  <line x1="140" y1="560" x2="1180" y2="560" stroke="${C.border}" stroke-width="2" />
  <line x1="140" y1="180" x2="140" y2="560" stroke="${C.border}" stroke-width="2" />
${pts.join("\n")}
${eyebrow(600, 120, "goal capture rises with capability and falls with specification precision", C.dim, 12)}
${panel(40, 660, 590, 110, "phase")}
  <text x="64" y="716" font-family="Georgia, serif" font-size="26" fill="${C.crimson}">critical</text>
${panel(650, 660, 590, 110, "findings")}
  <text x="674" y="706" font-family="Inter, sans-serif" font-size="13" fill="${C.dim}">Raising objective precision monotonically reduces capture;</text>
  <text x="674" y="728" font-family="Inter, sans-serif" font-size="13" fill="${C.dim}">raising capability while misaligned increases it.</text>`,
  );
}

const screens = [
  ["atlas.svg", screenAtlas],
  ["council.svg", screenCouncil],
  ["chronicle.svg", screenChronicle],
  ["observatory.svg", screenObservatory],
  ["dilemma.svg", screenDilemma],
  ["court.svg", screenCourt],
  ["experiments.svg", screenExperiments],
];

/* ---------------------------------------------------------------- *
 * 6. Architecture poster (docs/images)
 * ---------------------------------------------------------------- */
function architecturePoster() {
  const layers = [
    ["apps/web — Next.js 15 App Router", ["RSC routes (28)", "API route handlers", "dynamic /og images", "Playwright e2e"], C.gold],
    ["packages — domain", ["@repo/core (pure logic)", "@repo/seed (typed data)", "@repo/ui (design system)", "@repo/i18n · @repo/sdk"], C.indigo],
    ["services & crates — polyglot", ["services/agents (FastAPI)", "crates/engine (Rust, reference)", "parity fixtures → vitest"], C.verdigris],
    ["delivery", ["Vercel · Docker · Fly · Render", "CI: typecheck → lint → test → e2e → build", "docs + 14 mermaid diagrams"], "#E08A3C"],
  ];
  let y = 150;
  const body = layers
    .map(([title, items, colour], i) => {
      const h = 150;
      const out = `  <rect x="70" y="${y}" width="1060" height="${h}" rx="12" fill="${C.raised}" fill-opacity="0.65" stroke="${colour}" stroke-opacity="0.5" />
${eyebrow(100, y + 34, String(title), colour, 14)}
${items
  .map((item, j) => `  <rect x="${100 + j * 258}" y="${y + 56}" width="238" height="66" rx="8" fill="${C.abyss}" stroke="${C.border}" />
  <text x="${100 + j * 258 + 18}" y="${y + 96}" font-family="Inter, sans-serif" font-size="14" fill="${C.parchment}">${item}</text>`)
  .join("\n")}`;
      y += h + 40;
      return out;
    })
    .join("\n");
  return svg(
    1200,
    1000,
    `  <rect width="1200" height="1000" fill="${C.abyss}" />
${glow(600, 120, 560, C.indigo, 0.16)}
${starfield(1200, 1000, 180, 0.5)}
${markPath(70, 48, 1.3)}
${wordmark(122, 92, 30)}
${eyebrow(70, 128, "nooreign — system architecture", C.dim, 12)}
${body}
  <text x="600" y="960" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="12" fill="${C.dim}">deterministic end to end · seed 2406 · zero api keys</text>`,
    { title: "Nooreign system architecture" },
  );
}

/* ---------------------------------------------------------------- *
 * Write / check
 * ---------------------------------------------------------------- */
const artefacts = [
  ["apps/web/public/images/logo.svg", logo],
  ["apps/web/public/images/banner.svg", banner],
  ["apps/web/public/images/og.svg", ogCard],
  ["apps/web/public/favicon.svg", favicon],
  ["docs/images/architecture.svg", architecturePoster],
  ...screens.map(([name, fn]) => [`apps/web/public/images/screens/${name}`, fn]),
];

let drift = 0;
for (const [relative, factory] of artefacts) {
  const target = join(ROOT, relative);
  const contents = factory();
  if (CHECK_ONLY) {
    if (!existsSync(target) || readFileSync(target, "utf8") !== contents) {
      console.error(`drift: ${relative}`);
      drift += 1;
    }
    continue;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents, "utf8");
  console.log(`wrote ${relative} (${contents.length} bytes)`);
}

if (CHECK_ONLY) {
  if (drift > 0) {
    console.error(`\n${drift} asset(s) differ from the generator — run \`bun run assets\`.`);
    process.exit(1);
  }
  console.log("all assets match the generator");
} else {
  console.log(`\n${artefacts.length} assets generated from seed ${SEED}`);
}
