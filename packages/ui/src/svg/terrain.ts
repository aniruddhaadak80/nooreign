import type { Terrain } from "@repo/seed/types";

/**
 * Terrain plates.
 *
 * Each of the twelve terrains is a recognisable silhouette of its concept —
 * battlements, contour steps, a woven lattice, piers on water, a domed
 * observatory — grown from a seeded PRNG so a given kingdom always renders the
 * same province. No `Math.random` anywhere: the plates are server-rendered and
 * must survive hydration untouched.
 */

export interface TerrainArt {
  terrain: Terrain;
  /** Primary ink layer, filled with the kingdom colour. */
  path: string;
  /** Secondary geometry drawn in the accent colour over the top. */
  accents: string;
  viewBox: string;
  width: number;
  height: number;
  seed: number;
}

/** mulberry32 — 32 bits of state, good enough for decorative geometry. */
function mulberry32(seed: number): () => number {
  let state = Math.trunc(seed) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit seed from a slug, so `kingdom.id` alone picks a province. */
export function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const round = (value: number): number => Math.round(value * 100) / 100;

type Ctx = {
  width: number;
  height: number;
  random: () => number;
};

const line = (points: readonly (readonly [number, number])[], close = false): string =>
  points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${round(x)},${round(y)}`).join(" ") + (close ? " Z" : "");

const rect = (x: number, y: number, w: number, h: number): string =>
  `M${round(x)},${round(y)} L${round(x + w)},${round(y)} L${round(x + w)},${round(y + h)} L${round(x)},${round(y + h)} Z`;

const disc = (cx: number, cy: number, r: number): string =>
  `M${round(cx + r)},${round(cy)} A${round(r)},${round(r)} 0 1 0 ${round(cx - r)},${round(cy)} A${round(r)},${round(r)} 0 1 0 ${round(cx + r)},${round(cy)} Z`;

/** A jittered ridgeline between two x positions — the base shape of most plates. */
function ridge(
  ctx: Ctx,
  x0: number,
  x1: number,
  baseY: number,
  amplitude: number,
  steps: number,
): (readonly [number, number])[] {
  const points: (readonly [number, number])[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const ratio = index / steps;
    points.push([x0 + (x1 - x0) * ratio, baseY + (ctx.random() - 0.5) * amplitude * 2]);
  }
  return points;
}

/** A smooth sine ribbon, used for water and weaving. */
function ribbon(
  x0: number,
  x1: number,
  midY: number,
  amplitude: number,
  cycles: number,
  thickness: number,
  phase = 0,
): string {
  const width = x1 - x0;
  const steps = Math.max(6, Math.round(cycles * 8));
  const top: (readonly [number, number])[] = [];
  const bottom: (readonly [number, number])[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const ratio = index / steps;
    const y = midY + Math.sin(phase + ratio * cycles * Math.PI * 2) * amplitude;
    top.push([x0 + width * ratio, y - thickness / 2]);
    bottom.push([x0 + width * ratio, y + thickness / 2]);
  }
  return `${line(top)} ${line([...bottom].reverse())} Z`;
}

type Builder = (ctx: Ctx) => { path: string; accents: string };

/* ------------------------------------------------------------------ *
 * The twelve terrains
 * ------------------------------------------------------------------ */

const citadel: Builder = ({ width, height, random }) => {
  const cx = width / 2;
  const cy = height / 2;
  const count = 6 + Math.floor(random() * 3);
  const outer: (readonly [number, number])[] = [];
  const inner: (readonly [number, number])[] = [];
  for (let index = 0; index < count; index += 1) {
    const angle = (360 / count) * index - 90;
    const wobble = random() * 0.12 - 0.06;
    const radius = (Math.min(width, height) * 0.46) * (1 + wobble);
    outer.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    inner.push([cx + radius * 0.42 * Math.cos(angle), cy + radius * 0.42 * Math.sin(angle)]);
  }
  const keep: (readonly [number, number])[] = [];
  for (let index = 0; index < 4; index += 1) {
    const angle = (360 / 4) * index - 90 + 0.4;
    keep.push([cx + height * 0.17 * Math.cos(angle), cy + height * 0.17 * Math.sin(angle)]);
  }
  const towers = outer
    .filter((_, index) => index % 2 === 0)
    .map(([x, y]) => disc(x, y, Math.min(width, height) * 0.07))
    .join(" ");
  return {
    path: `${line(outer, true)} ${line(inner, true)} ${line(keep, true)}`,
    accents: `${towers} ${rect(cx - width * 0.03, cy, width * 0.06, height * 0.16)}`,
  };
};

const garden: Builder = ({ width, height, random }) => {
  const cx = width / 2;
  const top = height * 0.12;
  const bottom = height * 0.94;
  const spread = width * 0.34;
  const loop = (side: number): string => {
    const midY = (top + bottom) / 2;
    // The parterre is hand-raked, not machined: bow and waist drift per seed.
    const bow = 0.92 + random() * 0.38;
    const waist = 0.82 + random() * 0.32;
    return (
      `M${round(cx)},${round(top)}` +
      ` C${round(cx + side * spread * bow)},${round(top + height * 0.16)} ${round(cx + side * spread * 1.25 * waist)},${round(midY - height * 0.1)} ${round(cx)},${round(midY)}` +
      ` C${round(cx + side * spread * 1.25 * waist)},${round(midY + height * 0.12)} ${round(cx + side * spread * bow)},${round(bottom)} ${round(cx)},${round(bottom)} Z`
    );
  };
  const beds = [loop(-1), loop(1)];
  const dots: string[] = [];
  for (let index = 0; index < 14; index += 1) {
    const side = random() < 0.5 ? -1 : 1;
    const y = top + random() * (bottom - top);
    const x = cx + side * spread * (0.18 + random() * 0.55);
    dots.push(disc(x, y, height * (0.018 + random() * 0.02)));
  }
  return {
    path: beds.join(" "),
    accents: `${dots.join(" ")} ${rect(cx - width * 0.012, top, width * 0.024, bottom - top)}`,
  };
};

const foundry: Builder = ({ width, height, random }) => {
  const stacks = 3 + Math.floor(random() * 3);
  const bodies: string[] = [];
  const plumes: string[] = [];
  const step = width / (stacks + 1);
  for (let index = 0; index < stacks; index += 1) {
    const x = step * (index + 1) - width * 0.06;
    const w = width * (0.07 + random() * 0.05);
    const h = height * (0.42 + random() * 0.4);
    const base = height * 0.92;
    bodies.push(rect(x, base - h, w, h));
    bodies.push(rect(x - w * 0.22, base - h, w * 1.44, height * 0.06));
    const drift = (random() - 0.5) * width * 0.18;
    plumes.push(
      `M${round(x + w * 0.2)},${round(base - h - height * 0.04)}` +
        ` C${round(x + w * 0.2 + drift * 0.4)},${round(base - h - height * 0.3)} ${round(x + w * 0.2 + drift)},${round(base - h - height * 0.5)} ${round(x + w * 0.2 + drift * 1.4)},${round(base - h - height * 0.78)}`,
    );
  }
  const wheels: string[] = [];
  for (let index = 0; index < 3; index += 1) {
    const cx = width * (0.12 + random() * 0.76);
    const cy = height * (0.2 + random() * 0.2);
    const r = height * (0.08 + random() * 0.06);
    const teeth = 10;
    const points: (readonly [number, number])[] = [];
    for (let tooth = 0; tooth < teeth; tooth += 1) {
      const a = (360 / teeth) * tooth;
      points.push([cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)]);
      const b = ((360 / teeth) * tooth + 180 / teeth) * (Math.PI / 180);
      points.push([cx + r * 1.24 * Math.cos(b), cy + r * 1.24 * Math.sin(b)]);
    }
    wheels.push(line(points, true));
  }
  return {
    path: `${bodies.join(" ")} ${ribbon(0, width, height * 0.95, height * 0.03, 3 + random() * 3, height * 0.05)}`,
    accents: `${plumes.join(" ")} ${wheels.join(" ")}`,
  };
};

const terraces: Builder = ({ width, height, random }) => {
  const steps = 5 + Math.floor(random() * 4);
  const layers: string[] = [];
  const accent: string[] = [];
  for (let index = 0; index < steps; index += 1) {
    const inset = (width / (steps + 1)) * index;
    const top = height * (0.16 + (0.68 * index) / steps);
    const points = ridge({ width, height, random }, inset, width - inset, top, height * 0.028, 10);
    layers.push(`${line(points)} L${round(width - inset)},${round(height)} L${round(inset)},${round(height)} Z`);
    accent.push(line(points));
  }
  return { path: layers.join(" "), accents: accent.join(" ") };
};

const ramparts: Builder = ({ width, height, random }) => {
  const wallTop = height * 0.38;
  const merlons = 6 + Math.floor(random() * 7);
  const merlonWidth = width / (merlons * 2);
  const teeth: string[] = [];
  for (let index = 0; index < merlons; index += 1) {
    teeth.push(rect(index * merlonWidth * 2, wallTop - height * 0.14, merlonWidth, height * 0.14));
  }
  const slits: string[] = [];
  for (let index = 0; index < Math.max(2, merlons - 2); index += 1) {
    slits.push(rect(index * merlonWidth * 2 + merlonWidth * 0.55, wallTop + height * 0.08, merlonWidth * 0.45, height * 0.2));
  }
  const towerW = width * 0.14;
  // The glacis below the wall is rubble, so it is never the same twice.
  const glacis = ridge({ width, height, random }, 0, width, height * 0.94, height * 0.05, 9);
  return {
    path: [
      ...teeth,
      rect(0, wallTop, width, height * 0.62),
      rect(width * 0.08, wallTop - height * 0.2, towerW, height * 0.82),
      rect(width - width * 0.08 - towerW, wallTop - height * 0.2, towerW, height * 0.82),
      line(glacis, true),
    ].join(" "),
    accents: [...slits, rect(width * 0.42, wallTop + height * 0.3, width * 0.16, height * 0.4)].join(" "),
  };
};

const weave: Builder = ({ width, height, random }) => {
  const warp = 3 + Math.floor(random() * 3);
  const weft = 3 + Math.floor(random() * 3);
  const bands: string[] = [];
  const crossings: string[] = [];
  for (let index = 0; index < warp; index += 1) {
    const y = ((index + 1) * height) / (warp + 1);
    bands.push(ribbon(0, width, y, height * 0.08, 2 + Math.floor(random() * 3), height * 0.09));
  }
  for (let index = 0; index < weft; index += 1) {
    const x = ((index + 1) * width) / (weft + 1);
    const top = height * 0.06;
    const bottom = height * 0.94;
    const points: (readonly [number, number])[] = [];
    const steps = 12;
    for (let step = 0; step <= steps; step += 1) {
      const ratio = step / steps;
      points.push([x + Math.sin(ratio * Math.PI * 4) * width * 0.035, top + (bottom - top) * ratio]);
    }
    bands.push(line(points, true));
    crossings.push(disc(x, ((index + 1) * height) / (warp + 1), height * 0.03));
  }
  return { path: bands.join(" "), accents: crossings.join(" ") };
};

const court: Builder = ({ width, height, random }) => {
  const cx = width / 2;
  const floorY = height * 0.2;
  const tiers = 4 + Math.floor(random() * 3);
  const thickness = height * 0.07;
  const steps = 20;
  const arcs: string[] = [];
  const seats: string[] = [];
  for (let tier = 0; tier < tiers; tier += 1) {
    const radius = height * (0.22 + tier * 0.1) * (1 + (random() - 0.5) * 0.06);
    const outer: (readonly [number, number])[] = [];
    const inner: (readonly [number, number])[] = [];
    for (let step = 0; step <= steps; step += 1) {
      // Compass convention: the fan opens downwards, away from the podium.
      const radians = ((62 + (236 * step) / steps) * Math.PI) / 180;
      const mid = radius - thickness / 2;
      outer.push([cx + radius * Math.sin(radians), floorY - radius * Math.cos(radians)]);
      inner.push([cx + (radius - thickness) * Math.sin(radians), floorY - (radius - thickness) * Math.cos(radians)]);
      if (step % 3 === 1) seats.push(disc(cx + mid * Math.sin(radians), floorY - mid * Math.cos(radians), height * 0.016));
    }
    arcs.push(`${line(outer)} ${line([...inner].reverse())} Z`);
  }
  return {
    path: `${arcs.join(" ")} ${rect(cx - width * 0.08, floorY - height * 0.18, width * 0.16, height * 0.2)}`,
    accents: `${seats.join(" ")} ${disc(cx, floorY + height * 0.16, height * 0.05)}`,
  };
};

const wharf: Builder = ({ width, height, random }) => {
  const waterY = height * 0.32;
  const piers = 3 + Math.floor(random() * 3);
  const piersPath: string[] = [];
  const ropes: string[] = [];
  for (let index = 0; index < piers; index += 1) {
    const x = width * (0.08 + (index / Math.max(1, piers - 1)) * 0.78) + (random() - 0.5) * width * 0.04;
    piersPath.push(rect(x, waterY, width * 0.035, height * 0.5));
    piersPath.push(rect(x - width * 0.02, waterY - height * 0.04, width * 0.075, height * 0.045));
    ropes.push(`M${round(x + width * 0.035)},${round(waterY)} C${round(x + width * 0.06)},${round(waterY + height * 0.12)} ${round(x + width * 0.01)},${round(waterY + height * 0.2)} ${round(x + width * 0.035)},${round(waterY + height * 0.3)}`);
  }
  const ripples: string[] = [];
  for (let index = 0; index < 7; index += 1) {
    const y = waterY + height * (0.08 + index * 0.085);
    const x = width * (0.04 + random() * 0.3);
    ripples.push(line([[x, y], [x + width * (0.12 + random() * 0.2), y]]));
  }
  const hull =
    `M${round(width * 0.58)},${round(waterY + height * 0.1)} L${round(width * 0.94)},${round(waterY + height * 0.1)}` +
    ` L${round(width * 0.88)},${round(waterY + height * 0.26)} L${round(width * 0.64)},${round(waterY + height * 0.26)} Z` +
    rect(width * 0.72, waterY - height * 0.02, width * 0.03, height * 0.12);
  return {
    path: `${piersPath.join(" ")} ${hull}`,
    accents: `${ripples.join(" ")} ${ropes.join(" ")}`,
  };
};

const wilds: Builder = ({ width, height, random }) => {
  const ranges = 3;
  const ridges: string[] = [];
  const accents: string[] = [];
  for (let index = 0; index < ranges; index += 1) {
    const baseY = height * (0.36 + index * 0.2);
    const points = ridge({ width, height, random }, 0, width, baseY, height * (0.11 - index * 0.02), 12);
    ridges.push(`${line(points)} L${round(width)},${round(height)} L0,${round(height)} Z`);
    accents.push(line(points));
  }
  const trees: string[] = [];
  const count = 6 + Math.floor(random() * 7);
  for (let index = 0; index < count; index += 1) {
    const x = random() * width;
    const y = height * (0.62 + random() * 0.3);
    const h = height * (0.08 + random() * 0.09);
    trees.push(`M${round(x)},${round(y - h)} L${round(x + h * 0.42)},${round(y)} L${round(x - h * 0.42)},${round(y)} Z`);
  }
  return { path: `${ridges.join(" ")} ${trees.join(" ")}`, accents: accents.join(" ") };
};

const commons: Builder = ({ width, height, random }) => {
  const cols = 3 + Math.floor(random() * 4);
  const rows = 2 + Math.floor(random() * 3);
  const plots: string[] = [];
  const lanes: string[] = [];
  const cellW = width / cols;
  const cellH = (height * 0.82) / rows;
  for (let row = 0; row < rows; row += 1) {
    // Field strips are drawn to the land, so each course wanders a little.
    const rowSkew = (random() - 0.5) * cellH * 0.3;
    const courseSkew = (random() - 0.5) * cellH * 0.3;
    for (let col = 0; col < cols; col += 1) {
      const x = col * cellW + cellW * 0.12;
      const y = height * 0.12 + row * cellH + cellH * 0.14 + rowSkew;
      plots.push(rect(x, y, cellW * 0.76, cellH * 0.72));
      lanes.push(
        line([[x, y + cellH * (0.36 + courseSkew)], [x + cellW * 0.76, y + cellH * (0.36 + courseSkew)]]),
      );
    }
  }
  return {
    path: `${plots.join(" ")} ${ribbon(0, width, height * 0.06, height * 0.012, 2, height * 0.02)}`,
    accents: `${lanes.join(" ")} ${disc(width / 2, height * 0.5, height * 0.07)}`,
  };
};

const orchard: Builder = ({ width, height, random }) => {
  const rows = 4 + Math.floor(random() * 3);
  const canopies: string[] = [];
  const trunks: string[] = [];
  for (let row = 0; row < rows; row += 1) {
    const ratio = row / (rows - 1 || 1);
    const y = height * (0.28 + ratio * 0.62);
    const radius = height * (0.11 - ratio * 0.05);
    const count = Math.max(2, Math.round(9 - row * 1.6));
    for (let index = 0; index < count; index += 1) {
      const x = (width * (index + 0.5)) / count + (random() - 0.5) * width * 0.03;
      canopies.push(disc(x, y, radius));
      trunks.push(rect(x - radius * 0.1, y, radius * 0.2, height * 0.1));
    }
  }
  return {
    path: canopies.join(" "),
    accents: `${trunks.join(" ")} ${ribbon(0, width, height * 0.94, height * 0.02, 2 + random() * 2, height * 0.035)}`,
  };
};

const observatory: Builder = ({ width, height, random }) => {
  const cx = width / 2;
  const baseY = height * 0.88;
  // Dome proportions were re-measured for every plate; do not hard-code them.
  const domeR = height * (0.28 + random() * 0.14);
  const dome =
    `M${round(cx - domeR)},${round(baseY)} A${round(domeR)},${round(domeR)} 0 0 1 ${round(cx + domeR)},${round(baseY)} Z`;
  const rings: string[] = [];
  const ringCount = 2 + Math.floor(random() * 3);
  for (let index = 0; index < ringCount; index += 1) {
    const rx = domeR * (1.5 + index * 0.42) * (0.9 + random() * 0.2);
    const ry = domeR * (0.34 + index * 0.1);
    const tilt = -12 + random() * 24;
    rings.push(
      `M${round(cx - rx)},${round(baseY - domeR * 0.55)} A${round(rx)},${round(ry)} 0 0 1 ${round(cx + rx)},${round(baseY - domeR * 0.55)}` +
        ` A${round(rx)},${round(ry)} 0 0 1 ${round(cx - rx)},${round(baseY - domeR * 0.55)} Z` +
        ` M${round(cx - rx * Math.cos((tilt * Math.PI) / 180))},${round(baseY - domeR * 0.55)} L${round(cx + rx * Math.cos((tilt * Math.PI) / 180))},${round(baseY - domeR * 0.55)}`,
    );
  }
  const stars: string[] = [];
  for (let index = 0; index < 12; index += 1) {
    stars.push(disc(random() * width, random() * height * 0.42, height * 0.012));
  }
  return {
    path: `${dome} ${rect(cx - domeR * 1.12, baseY, domeR * 2.24, height * 0.1)}`,
    accents: `${rings.join(" ")} ${stars.join(" ")}`,
  };
};

const BUILDERS: Readonly<Record<Terrain, Builder>> = {
  citadel,
  garden,
  foundry,
  terraces,
  ramparts,
  weave,
  court,
  wharf,
  wilds,
  commons,
  orchard,
  observatory,
};

/**
 * Deterministic plate for a terrain. Same four arguments always yield the same
 * strings; a different `seed` always yields a different province.
 */
export function terrainPath(terrain: Terrain, width = 320, height = 180, seed = 1): TerrainArt {
  const build = BUILDERS[terrain] ?? terraces;
  const { path, accents } = build({ width, height, random: mulberry32(seed) });
  return {
    terrain,
    path,
    accents,
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    seed,
  };
}