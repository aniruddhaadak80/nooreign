/**
 * Heraldic charges.
 *
 * Ten geometries drawn on a shared 100×100 construction grid and scaled to the
 * requested size, so a charge keeps its proportions from a 16px inline glyph to
 * a 320px kingdom banner. Every shape is authored as real geometry — arcs,
 * béziers and polygons — never as outlined text.
 *
 * Sub-path rule: charges are built from non-overlapping sub-paths so they can
 * be filled as a single `<path>` under `fill-rule="evenodd"`. A charge that
 * needs an interior hole (the gear hub, the eye's iris) simply adds a second
 * sub-path; the parity does the rest.
 */

export const CHARGES = [
  "column",
  "leaf",
  "scale",
  "flame",
  "wave",
  "gear",
  "lotus",
  "eye",
  "seed",
  "bell",
] as const;

export type Charge = (typeof CHARGES)[number];

export interface CrestGeometry {
  path: string;
  viewBox: string;
}

const round = (value: number): number => Math.round(value * 100) / 100;

/** Construction grid → user units. */
const unit = (size: number) => (value: number): number => round((value / 100) * size);

const polar = (cx: number, cy: number, radius: number, angleDegrees: number): [number, number] => {
  const radians = (angleDegrees * Math.PI) / 180;
  return [cx + radius * Math.sin(radians), cy - radius * Math.cos(radians)];
};

const polygon = (points: readonly (readonly [number, number])[]): string =>
  points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${round(x)},${round(y)}`).join(" ") + " Z";

const circle = (cx: number, cy: number, r: number): string => {
  const right = round(cx + r);
  const left = round(cx - r);
  return `M${right},${round(cy)} A${round(r)},${round(r)} 0 1 0 ${left},${round(cy)} A${round(r)},${round(r)} 0 1 0 ${right},${round(cy)} Z`;
};

/**
 * Rewrite every coordinate pair of a grid-space path into user units. Keeps the
 * generators above readable: shapes are authored once on the 100×100 grid and
 * remapped at the end rather than threading `u()` through every literal.
 */
const remap = (d: string, u: (n: number) => number): string =>
  d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_match, x: string, y: string) =>
    `${u(Number(x))},${u(Number(y))}`,
  );

/** Join grid-space sub-paths into one scaled path string. */
const compose = (parts: readonly string[], u: (n: number) => number): string =>
  parts.map((part) => remap(part, u)).join(" ");

/**
 * A petal from a base point out to a tip, narrow where it leaves the base and
 * widest at two thirds of its length — the profile a lotus petal actually has,
 * and the one that keeps every control point inside the construction box.
 */
const petal = (bx: number, by: number, angle: number, length: number, bulge: number): string => {
  const u = (sin: number, cos: number): [number, number] => [sin, -cos];
  const [sin, cos] = u(Math.sin((angle * Math.PI) / 180), Math.cos((angle * Math.PI) / 180));
  const [perpendicularX, perpendicularY] = [cos, sin];
  const [tipX, tipY] = [bx + sin * length, by + cos * length];
  const width = length * bulge;
  const near = length * 0.2;
  const far = length * 0.5;
  const point = (originX: number, originY: number, along: number, across: number): string =>
    `${round(originX + sin * along + perpendicularX * across)},${round(originY + cos * along + perpendicularY * across)}`;
  return (
    `M${round(bx)},${round(by)} C${point(bx, by, near, width * 0.25)} ${point(tipX, tipY, -far, width)} ${round(tipX)},${round(tipY)}` +
    ` C${point(tipX, tipY, -far, -width)} ${point(bx, by, near, -width * 0.25)} ${round(bx)},${round(by)} Z`
  );
};

/* ------------------------------------------------------------------ *
 * The ten charges
 * ------------------------------------------------------------------ */

const column = (u: (n: number) => number): string =>
  [
    `M${u(26)},${u(12)} L${u(74)},${u(12)} L${u(74)},${u(20)} L${u(26)},${u(20)} Z`,
    `M${u(33)},${u(20)} C${u(36)},${u(13)} ${u(64)},${u(13)} ${u(67)},${u(20)} Z`,
    `M${u(33)},${u(20)} C${u(31)},${u(36)} ${u(31)},${u(54)} ${u(33)},${u(70)} L${u(67)},${u(70)} C${u(69)},${u(54)} ${u(69)},${u(36)} ${u(67)},${u(20)} Z`,
    `M${u(25)},${u(70)} L${u(75)},${u(70)} L${u(75)},${u(78)} L${u(25)},${u(78)} Z`,
    `M${u(19)},${u(78)} L${u(81)},${u(78)} L${u(81)},${u(86)} L${u(19)},${u(86)} Z`,
  ].join(" ");

const leaf = (u: (n: number) => number): string =>
  [
    `M${u(50)},${u(12)} C${u(29)},${u(30)} ${u(25)},${u(58)} ${u(50)},${u(84)} Z`,
    `M${u(50)},${u(12)} C${u(71)},${u(30)} ${u(75)},${u(58)} ${u(50)},${u(84)} Z`,
    `M${u(47)},${u(84)} L${u(53)},${u(84)} L${u(53)},${u(94)} L${u(47)},${u(94)} Z`,
  ].join(" ");

const scale = (u: (n: number) => number): string =>
  [
    `M${u(48)},${u(22)} L${u(52)},${u(22)} L${u(52)},${u(82)} L${u(48)},${u(82)} Z`,
    `M${u(30)},${u(82)} L${u(70)},${u(82)} L${u(70)},${u(90)} L${u(30)},${u(90)} Z`,
    `M${u(13)},${u(26)} L${u(47)},${u(26)} L${u(47)},${u(32)} L${u(13)},${u(32)} Z`,
    `M${u(53)},${u(26)} L${u(87)},${u(26)} L${u(87)},${u(32)} L${u(53)},${u(32)} Z`,
    `M${u(21)},${u(32)} L${u(23)},${u(32)} L${u(23)},${u(57)} L${u(21)},${u(57)} Z`,
    `M${u(77)},${u(32)} L${u(79)},${u(32)} L${u(79)},${u(57)} L${u(77)},${u(57)} Z`,
    `M${u(8)},${u(57)} L${u(36)},${u(57)} C${u(34)},${u(69)} ${u(30)},${u(75)} ${u(22)},${u(75)} C${u(14)},${u(75)} ${u(10)},${u(69)} ${u(8)},${u(57)} Z`,
    `M${u(64)},${u(57)} L${u(92)},${u(57)} C${u(90)},${u(69)} ${u(86)},${u(75)} ${u(78)},${u(75)} C${u(70)},${u(75)} ${u(66)},${u(69)} ${u(64)},${u(57)} Z`,
  ].join(" ");

const flame = (u: (n: number) => number): string =>
  `M${u(50)},${u(6)} C${u(62)},${u(26)} ${u(80)},${u(38)} ${u(80)},${u(60)}` +
  ` C${u(80)},${u(81)} ${u(66)},${u(94)} ${u(50)},${u(94)}` +
  ` C${u(34)},${u(94)} ${u(20)},${u(81)} ${u(20)},${u(60)}` +
  ` C${u(20)},${u(46)} ${u(32)},${u(38)} ${u(40)},${u(30)}` +
  ` C${u(34)},${u(47)} ${u(44)},${u(51)} ${u(48)},${u(38)}` +
  ` C${u(51)},${u(28)} ${u(44)},${u(20)} ${u(50)},${u(6)} Z`;

const wave = (u: (n: number) => number): string =>
  [
    `M${u(4)},${u(36)} C${u(18)},${u(22)} ${u(32)},${u(22)} ${u(46)},${u(36)} C${u(60)},${u(50)} ${u(74)},${u(50)} ${u(96)},${u(32)} L${u(96)},${u(43)} C${u(76)},${u(59)} ${u(60)},${u(59)} ${u(44)},${u(45)} C${u(30)},${u(31)} ${u(18)},${u(31)} ${u(4)},${u(45)} Z`,
    `M${u(4)},${u(70)} C${u(18)},${u(60)} ${u(32)},${u(60)} ${u(46)},${u(70)} C${u(60)},${u(80)} ${u(74)},${u(80)} ${u(96)},${u(64)} L${u(96)},${u(72)} C${u(76)},${u(86)} ${u(60)},${u(86)} ${u(44)},${u(78)} C${u(30)},${u(68)} ${u(18)},${u(68)} ${u(4)},${u(78)} Z`,
  ].join(" ");

const gear = (u: (n: number) => number): string => {
  const teeth = 8;
  const points: (readonly [number, number])[] = [];
  for (let index = 0; index < teeth; index += 1) {
    const centre = (360 / teeth) * index;
    points.push(polar(50, 50, 30, centre - 22.5));
    points.push(polar(50, 50, 41, centre - 11));
    points.push(polar(50, 50, 41, centre + 11));
    points.push(polar(50, 50, 30, centre + 22.5));
  }
  return compose([polygon(points), circle(50, 50, 15)], u);
};

const lotus = (u: (n: number) => number): string =>
  compose(
    [
      petal(50, 90, -52, 46, 0.34),
      petal(50, 90, -26, 58, 0.34),
      petal(50, 90, 0, 62, 0.36),
      petal(50, 90, 26, 58, 0.34),
      petal(50, 90, 52, 46, 0.34),
      "M26,92 L74,92 L74,97 L26,97 Z",
    ],
    u,
  );

const eye = (u: (n: number) => number): string =>
  [
    `M${u(6)},${u(50)} C${u(26)},${u(21)} ${u(74)},${u(21)} ${u(94)},${u(50)} C${u(74)},${u(79)} ${u(26)},${u(79)} ${u(6)},${u(50)} Z`,
    `M${u(22)},${u(50)} C${u(34)},${u(30)} ${u(66)},${u(30)} ${u(78)},${u(50)} C${u(66)},${u(70)} ${u(34)},${u(70)} ${u(22)},${u(50)} Z`,
    `M${u(37)},${u(50)} C${u(44)},${u(41)} ${u(56)},${u(41)} ${u(63)},${u(50)} C${u(56)},${u(59)} ${u(44)},${u(59)} ${u(37)},${u(50)} Z`,
  ].join(" ");

const seed = (u: (n: number) => number): string =>
  [
    `M${u(48)},${u(10)} C${u(24)},${u(34)} ${u(20)},${u(62)} ${u(48)},${u(92)} Z`,
    `M${u(52)},${u(10)} C${u(76)},${u(34)} ${u(80)},${u(62)} ${u(52)},${u(92)} Z`,
    `M${u(48)},${u(10)} L${u(52)},${u(10)} L${u(52)},${u(92)} L${u(48)},${u(92)} Z`,
  ].join(" ");

const bell = (u: (n: number) => number): string =>
  [
    circle(u(50), u(13), 7),
    `M${u(46)},${u(20)} L${u(54)},${u(20)} L${u(54)},${u(26)} L${u(46)},${u(26)} Z`,
    `M${u(22)},${u(78)} C${u(24)},${u(44)} ${u(32)},${u(26)} ${u(50)},${u(26)} C${u(68)},${u(26)} ${u(76)},${u(44)} ${u(78)},${u(78)} Z`,
    `M${u(18)},${u(78)} L${u(82)},${u(78)} L${u(82)},${u(86)} L${u(18)},${u(86)} Z`,
    circle(u(50), u(92), 6),
  ].join(" ");

const GEOMETRY: Readonly<Record<Charge, (u: (n: number) => number) => string>> = {
  column,
  leaf,
  scale,
  flame,
  wave,
  gear,
  lotus,
  eye,
  seed,
  bell,
};

export function isCharge(value: string): value is Charge {
  return (CHARGES as readonly string[]).includes(value);
}

/** Charge geometry scaled into a `size × size` box. */
export function crestPath(charge: Charge, size: number): CrestGeometry {
  const build = GEOMETRY[charge] ?? column;
  return {
    path: build(unit(size)),
    viewBox: `0 0 ${size} ${size}`,
  };
}

/**
 * Heater shield used as the backing plate for a kingdom crest. Returned from
 * the same grid so the two always line up.
 */
export function shieldPath(size: number): CrestGeometry {
  const u = unit(size);
  return {
    path:
      `M${u(50)},${u(5)} L${u(92)},${u(17)} C${u(92)},${u(57)} ${u(74)},${u(84)} ${u(50)},${u(96)} ` +
      `C${u(26)},${u(84)} ${u(8)},${u(57)} ${u(8)},${u(17)} Z`,
    viewBox: `0 0 ${size} ${size}`,
  };
}