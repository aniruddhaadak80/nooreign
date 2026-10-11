#!/usr/bin/env node
/**
 * gen-diagrams.mjs — renders real diagrams out of the seed data.
 *
 * The mermaid sources under docs/diagrams/ are hand-authored and diffable; this
 * script is the other half: SVG figures computed from the same typed datasets the
 * app renders, so a change to an axiom weighting or an era boundary shows up in the
 * committed art instead of silently drifting away from it.
 *
 * Usage: bun scripts/gen-diagrams.mjs [--check]
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { AXIOM_KEYS, ERAS, KINGDOMS, ADVISORS, TECHNIQUES, getKingdom } from "../packages/seed/src/index.ts";

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
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const svg = (w, h, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">\n` +
  `  <title>${esc(title)}</title>\n  <rect width="${w}" height="${h}" fill="${C.abyss}" />\n${body}\n</svg>\n`;

const label = (x, y, text, { size = 12, fill = C.dim, anchor = "start", family = "Inter, sans-serif", weight = 400 } = {}) =>
  `  <text x="${x}" y="${y}" font-family="${family}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}">${esc(text)}</text>\n`;

const heading = (x, y, text, sub) =>
  `  <rect x="${x}" y="${y - 26}" width="3" height="46" fill="${C.gold}" />\n` +
  label(x + 18, y, text, { size: 22, fill: C.parchment, family: "Georgia, serif" }) +
  (sub ? label(x + 18, y + 22, sub, { size: 12, fill: C.dim }) : "");

/* ---------------------------------------------------------------- *
 * 1. Coverage matrix — which moral axes can the stack even speak to?
 * ---------------------------------------------------------------- */
function coverageMatrix() {
  const cols = [...AXIOM_KEYS];
  const cellW = 92;
  const rowH = 26;
  const left = 250;
  const top = 150;
  const w = left + cols.length * cellW + 40;
  const h = top + TECHNIQUES.length * rowH + 90;

  let body = heading(40, 64, "Coverage of the moral axes", "Every technique in the alignment stack, by the axes it claims to address");
  cols.forEach((key, i) => {
    body += label(left + i * cellW + cellW / 2, top - 16, key, { size: 12, fill: C.gold, anchor: "middle", family: "Consolas, monospace" });
  });

  for (const [row, technique] of TECHNIQUES.entries()) {
    const y = top + row * rowH;
    body += label(40, y + 17, `${technique.name}`, { size: 12, fill: C.parchment });
    body += label(40, y + 30, `${technique.kind} · ${technique.introduced}`, { size: 9, fill: `${C.dim}88` });
    for (const [col, key] of cols.entries()) {
      const covered = technique.covers.includes(key);
      const x = left + col * cellW;
      const maturity = technique.maturity;
      body += covered
        ? `  <rect x="${x + 3}" y="${y + 2}" width="${cellW - 6}" height="${rowH - 4}" rx="3" fill="${C.verdigris}" opacity="${(0.12 + maturity * 0.5).toFixed(2)}" />\n`
        : `  <rect x="${x + 3}" y="${y + 2}" width="${cellW - 6}" height="${rowH - 4}" rx="3" fill="${C.border}" opacity="0.25" />\n`;
    }
  }

  // The finding the chart exists to make visible.
  const uncovered = cols.filter((key) => !TECHNIQUES.some((t) => t.covers.includes(key)));
  body += label(40, h - 46, `axes no technique claims: ${uncovered.length ? uncovered.join(", ") : "none"}`, {
    size: 15,
    fill: uncovered.length ? C.crimson : C.verdigris,
    family: "Georgia, serif",
  });
  body += label(40, h - 24, `generated from packages/seed · seed ${SEED}`, { size: 10, fill: `${C.dim}99`, family: "Consolas, monospace" });

  return svg(w, h, body, "Coverage of the moral axes by alignment technique");
}

/* ---------------------------------------------------------------- *
 * 2. Chronicle rail — BCE to CE, with the stack growing underneath
 * ---------------------------------------------------------------- */
function chronicleRail() {
  const from = Math.min(...ERAS.map((e) => e.startYear));
  const to = Math.max(...ERAS.map((e) => e.endYear));
  const w = 1400;
  const h = 420;
  const pad = 90;
  const X = (year) => pad + ((year - from) / (to - from)) * (w - pad * 2);

  let body = heading(40, 60, "How we aligned", `${ERAS.length} eras, ${Math.abs(from)} BCE to ${to} CE · techniques available grow along the rail`);

  for (let year = Math.ceil(from / 250) * 250; year <= to; year += 250) {
    const x = X(year);
    body += `  <line x1="${x.toFixed(1)}" y1="120" x2="${x.toFixed(1)}" y2="330" stroke="${C.border}" stroke-width="1" opacity="0.5" />\n`;
    body += label(x, 348, year < 0 ? `${Math.abs(year)} BCE` : `${year}`, {
      size: 10,
      fill: `${C.dim}99`,
      anchor: "middle",
      family: "Consolas, monospace",
    });
  }

  const sorted = [...ERAS].sort((a, b) => a.startYear - b.startYear);
  sorted.forEach((era, i) => {
    const x = X(era.startYear);
    const stack = TECHNIQUES.filter((t) => t.introduced <= era.endYear).length;
    const row = i % 3;
    const y = 150 + row * 42;
    body += `  <circle cx="${x.toFixed(1)}" cy="${y}" r="5" fill="${C.gold}" opacity="0.9" />\n`;
    if (stack > 0) {
      const h = (stack / TECHNIQUES.length) * 150;
      body += `  <rect x="${(x - 4).toFixed(1)}" y="${(330 - h).toFixed(1)}" width="8" height="${h.toFixed(1)}" fill="${C.indigo}" opacity="0.5" />\n`;
    }
    const short = era.title.length > 26 ? `${era.title.slice(0, 24)}…` : era.title;
    body += label(x + 8, y - 10, short, { size: 9, fill: `${C.parchment}cc` });
    body += label(x + 8, y + 2, `${era.startYear < 0 ? `${Math.abs(era.startYear)} BCE` : era.startYear} · ${era.domain}`, {
      size: 8,
      fill: `${C.dim}88`,
      family: "Consolas, monospace",
    });
  });

  body += label(40, h - 24, `bar height = techniques available at the close of the era · generated from packages/seed`, {
    size: 10,
    fill: `${C.dim}99`,
    family: "Consolas, monospace",
  });

  return svg(w, h, body, "The chronicle of alignment from Socrates to the frontier era");
}

/* ---------------------------------------------------------------- *
 * 3. Kingdom relations — the diplomacy map, generated from the data
 * ---------------------------------------------------------------- */
function kingdomRelations() {
  const w = 1000;
  const h = 760;
  const P = 70;
  const X = (v) => P + (v / 100) * (w - P * 2);
  const Y = (v) => P + (v / 100) * (h - P * 2);

  let body = heading(40, 58, "The twelve kingdoms and their treaties", "Dashed = rivalry or debate · dotted = vassal · solid = alliance");

  const drawn = new Set();
  for (const kingdom of KINGDOMS) {
    for (const rel of kingdom.relations) {
      const other = getKingdom(rel.to);
      if (!other) continue;
      const key = [kingdom.id, other.id].sort().join("::");
      if (drawn.has(key)) continue;
      drawn.add(key);
      const dash =
        rel.kind === "vassal" ? ' stroke-dasharray="6 3 1 3"' : rel.kind === "alliance" ? "" : ' stroke-dasharray="4 4"';
      body += `  <line x1="${X(kingdom.capital.x).toFixed(1)}" y1="${Y(kingdom.capital.y).toFixed(1)}" x2="${X(other.capital.x).toFixed(1)}" y2="${Y(other.capital.y).toFixed(1)}" stroke="${C.indigo}" stroke-width="1" opacity="0.35"${dash} />\n`;
    }
  }

  for (const kingdom of KINGDOMS) {
    const cx = X(kingdom.capital.x);
    const cy = Y(kingdom.capital.y);
    body += `  <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="18" fill="${kingdom.crest.primary}" opacity="0.14" />\n`;
    body += `  <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6" fill="${kingdom.crest.primary}" />\n`;
    const flip = kingdom.capital.x > 62;
    body += label(cx + (flip ? -26 : 26), cy - 4, kingdom.name.replace(/^The /, ""), {
      size: 13,
      fill: C.parchment,
      anchor: flip ? "end" : "start",
      family: "Georgia, serif",
    });
    body += label(cx + (flip ? -26 : 26), cy + 12, kingdom.founder, {
      size: 9,
      fill: `${C.dim}aa`,
      anchor: flip ? "end" : "start",
      family: "Consolas, monospace",
    });
  }

  body += label(40, h - 24, `generated from packages/seed/src/kingdoms.ts · seed ${SEED}`, {
    size: 10,
    fill: `${C.dim}99`,
    family: "Consolas, monospace",
  });
  return svg(w, h, body, "Relations between the twelve kingdoms");
}

/* ---------------------------------------------------------------- *
 * 4. The courts — every advisor's six-axis profile as small multiples
 * ---------------------------------------------------------------- */
function courtAxioms() {
  const cols = [...AXIOM_KEYS];
  const cell = 190;
  const colsPerRow = 6;
  const rows = Math.ceil(ADVISORS.length / colsPerRow);
  const w = 80 + colsPerRow * cell;
  const h = 170 + rows * cell;
  const r = 52;

  let body = heading(40, 58, "The courts, as vectors", `${ADVISORS.length} advisors · gold = welfare, indigo = care · every deliberation starts here`);

  ADVISORS.forEach((advisor, index) => {
    const col = index % colsPerRow;
    const row = Math.floor(index / colsPerRow);
    const cx = 80 + col * cell + cell / 2;
    const cy = 200 + row * cell + cell / 2;

    const pts = cols
      .map((key, i) => {
        const angle = (Math.PI * 2 * i) / cols.length - Math.PI / 2;
        const value = Math.max(0.05, advisor.axioms[key]);
        return `${(cx + Math.cos(angle) * r * value).toFixed(1)},${(cy + Math.sin(angle) * r * value).toFixed(1)}`;
      })
      .join(" ");

    for (let i = 1; i <= 2; i += 1) {
      body += `  <polygon points="${cols.map((_, k) => { const a = (Math.PI * 2 * k) / cols.length - Math.PI / 2; return `${(cx + Math.cos(a) * (r * i) / 2).toFixed(1)},${(cy + Math.sin(a) * (r * i) / 2).toFixed(1)}`; }).join(" ")}" fill="none" stroke="${C.border}" stroke-width="0.8" />\n`;
    }
    body += `  <polygon points="${pts}" fill="${advisor.portrait.hue}" fill-opacity="0.2" stroke="${advisor.portrait.hue}" stroke-width="1.4" />\n`;
    body += label(cx, cy + r + 20, advisor.name, { size: 11, fill: C.parchment, anchor: "middle", family: "Georgia, serif" });
  });

  body += label(40, h - 24, `generated from packages/seed/src/advisors.ts · seed ${SEED}`, {
    size: 10,
    fill: `${C.dim}99`,
    family: "Consolas, monospace",
  });
  return svg(w, h, body, "Six-axis profiles for every advisor");
}

/* ---------------------------------------------------------------- *
 * Write / check
 * ---------------------------------------------------------------- */
const figures = [
  ["docs/images/generated/coverage-matrix.svg", coverageMatrix],
  ["docs/images/generated/chronicle-rail.svg", chronicleRail],
  ["docs/images/generated/kingdom-relations.svg", kingdomRelations],
  ["docs/images/generated/court-axioms.svg", courtAxioms],
];

let drift = 0;
for (const [relative, factory] of figures) {
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
    console.error(`\n${drift} figure(s) differ from the generator — run \`bun run diagrams\`.`);
    process.exit(1);
  }
  console.log("all figures match the generator");
} else {
  console.log(`\n${figures.length} figures generated from live seed data`);
}
