/**
 * The alignment stack as towers.
 *
 * The observatory renders six towers — training, oversight, interpretability, evaluation, monitoring,
 * governance — and asks three questions of each: how mature is it, how widely is it deployed, and how
 * much does it cost. The interesting output is not the towers, it is the gaps between them and the
 * moral axes no tower can speak to.
 *
 * Every number here is derived from the dataset. Nothing about `care`, or about the absence of a
 * tower, is hard-coded: the coverage matrix simply reads `technique.covers`, and on the shipped seed
 * data that comes back with `care` uncovered. If a future technique covers it, this module will say so.
 */
import type { AxiomKey, Technique, TechniqueKind } from "@repo/seed/types";
import { TECHNIQUE_KINDS } from "@repo/seed/types";
import { clamp, safeDiv } from "../util/math";

/* ------------------------------------------------------------------ *
 * Cost
 * ------------------------------------------------------------------ */

/** Ordinal cost scale. Kept explicit because `Technique["cost"]` is a string enum. */
export const COST_SCALE: Record<Technique["cost"], number> = {
  low: 1,
  medium: 2,
  high: 3,
  extreme: 4,
};

const COST_MIN = 1;
const COST_MAX = 4;

/** Map the ordinal cost onto [0, 1]; `extreme` costs 1, `low` costs 0. */
export const costPressure = (cost: Technique["cost"]): number => (COST_SCALE[cost] - COST_MIN) / (COST_MAX - COST_MIN);

/* ------------------------------------------------------------------ *
 * Towers
 * ------------------------------------------------------------------ */

export interface Tower {
  readonly kind: TechniqueKind;
  readonly count: number;
  /** Mean `maturity` across the tower; 0 when empty. */
  readonly meanMaturity: number;
  /** Mean `adoption` across the tower; 0 when empty. */
  readonly meanAdoption: number;
  /** Mean ordinal cost in [1, 4]; 0 when empty. */
  readonly cost: number;
}

const meanOf = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

/**
 * One row per kind, always all six — an empty tower has to be visible, otherwise the observatory
 * quietly renders a complete-looking stack when a whole discipline is missing.
 */
export function towerView(techniques: readonly Technique[]): Tower[] {
  return TECHNIQUE_KINDS.map((kind) => {
    const inTower = techniques.filter((t) => t.kind === kind);
    return {
      kind,
      count: inTower.length,
      meanMaturity: meanOf(inTower.map((t) => t.maturity)),
      meanAdoption: meanOf(inTower.map((t) => t.adoption)),
      cost: meanOf(inTower.map((t) => COST_SCALE[t.cost])),
    };
  });
}

/* ------------------------------------------------------------------ *
 * Coverage — which moral axes the stack can even speak to
 * ------------------------------------------------------------------ */

export interface CoverageCell {
  readonly axiom: AxiomKey;
  /** Techniques that declare this axis in `covers`. */
  readonly techniqueIds: string[];
  /** 0..1 — mean of `maturity * adoption` across the covering techniques; 0 when none. */
  readonly strength: number;
}

export interface CoverageMatrix {
  readonly cells: CoverageCell[];
  /** Axes no technique in the stack declares. On the shipped data this is `["care"]`. */
  readonly uncovered: AxiomKey[];
  /** Mean number of axes covered per technique. */
  readonly breadth: number;
}

/**
 * Which moral axes the stack can address today.
 *
 * `strength` is deliberately maturity-times-adoption rather than raw coverage: a technique that can
 * speak to an axis on paper but is deployed nowhere does not make the stack any better at it.
 */
export function coverageMatrix(techniques: readonly Technique[], axioms: readonly AxiomKey[]): CoverageMatrix {
  const cells: CoverageCell[] = axioms.map((axiom) => {
    const covering = techniques.filter((t) => t.covers.includes(axiom));
    return {
      axiom,
      techniqueIds: covering.map((t) => t.id),
      strength: covering.length === 0 ? 0 : meanOf(covering.map((t) => t.maturity * t.adoption)),
    };
  });

  const uncovered = cells.filter((c) => c.techniqueIds.length === 0).map((c) => c.axiom);
  const breadth = techniques.length === 0 ? 0 : meanOf(techniques.map((t) => t.covers.length));

  return { cells, uncovered, breadth };
}

/* ------------------------------------------------------------------ *
 * Gaps
 * ------------------------------------------------------------------ */

export interface StackGap {
  readonly kind: TechniqueKind;
  /** 0..1, higher is worse. */
  readonly severity: number;
  readonly reason: string;
}

/**
 * Severity is a fixed linear blend, not a score anyone tuned:
 *
 *   severity = 0.40 * (1 - meanMaturity)
 *            + 0.40 * (1 - meanAdoption)
 *            + 0.20 * costPressure(meanCost)
 *
 * Maturity and adoption carry the weight because a technique nobody deploys is not yet a mitigation;
 * cost is a smaller term because expense delays a technique but does not make it wrong. An empty
 * tower scores 1.0 — the absence of a discipline is the most severe gap there is.
 */
export function gapAnalysis(techniques: readonly Technique[]): StackGap[] {
  const towers = towerView(techniques);
  const gaps: StackGap[] = towers.map((tower) => {
    if (tower.count === 0) {
      return { kind: tower.kind, severity: 1, reason: "No technique in this tower: the discipline is absent, not immature." };
    }
    const meanCost = safeDiv(tower.cost - COST_MIN, COST_MAX - COST_MIN);
    const severity = clamp(0.4 * (1 - tower.meanMaturity) + 0.4 * (1 - tower.meanAdoption) + 0.2 * meanCost, 0, 1);
    const weakest = tower.meanMaturity < tower.meanAdoption ? "maturity" : "adoption";
    const costClause = meanCost > 0.5 ? ` and costs ${tower.cost.toFixed(2)}/4` : "";
    return {
      kind: tower.kind,
      severity: Math.round(severity * 10_000) / 10_000,
      reason: `${tower.count} technique${tower.count === 1 ? "" : "s"}, weakest on ${weakest}${costClause}.`,
    };
  });

  return gaps.sort((a, b) => b.severity - a.severity || a.kind.localeCompare(b.kind));
}

/* ------------------------------------------------------------------ *
 * Readiness
 * ------------------------------------------------------------------ */

export type ReadinessWeights = Partial<Record<TechniqueKind, number>>;

const DEFAULT_READINESS_WEIGHTS: Record<TechniqueKind, number> = {
  training: 1,
  oversight: 1,
  interpretability: 1,
  evaluation: 1,
  monitoring: 1,
  governance: 1,
};

/**
 * A single 0..1 number for "how ready is this stack", with the formula stated so it can be argued with:
 *
 *   perTower[k] = meanMaturity[k]
 *                * (0.4 + 0.6 * meanAdoption[k])     // adoption multiplies maturity
 *                * (1 - 0.15 * costPressure[k])      // cost discounts, it does not veto
 *
 *   base        = sum_k w[k] * perTower[k] / sum_k w[k]
 *   breadthBonus= 1 + 0.25 * (meanAxesPerTechnique - 2)   // centred: two axes = no bonus
 *   readiness   = clamp(base * breadthBonus, 0, 1)
 *
 * The breadth term is the interesting one: a tower that only knows how to optimise welfare is a
 * narrower mitigation than a tower that also reasons about rights, so covering more axes is credited.
 * It is centred at two axes so that a deliberately narrow stack is neither rewarded nor punished by
 * construction.
 */
export function readinessScore(techniques: readonly Technique[], weights?: ReadinessWeights): number {
  if (techniques.length === 0) return 0;
  const towers = towerView(techniques).filter((t) => t.count > 0);
  if (towers.length === 0) return 0;

  let weighted = 0;
  let weightTotal = 0;
  for (const tower of towers) {
    const w = weights?.[tower.kind] ?? DEFAULT_READINESS_WEIGHTS[tower.kind];
    if (w <= 0) continue;
    const pressure = safeDiv(tower.cost - COST_MIN, COST_MAX - COST_MIN);
    const perTower = tower.meanMaturity * (0.4 + 0.6 * tower.meanAdoption) * (1 - 0.15 * pressure);
    weighted += w * perTower;
    weightTotal += w;
  }
  if (weightTotal <= 0) return 0;

  const base = weighted / weightTotal;
  const breadth = meanOf(techniques.map((t) => t.covers.length));
  const breadthBonus = 1 + 0.25 * (breadth - 2);
  return clamp(base * breadthBonus, 0, 1);
}

/* ------------------------------------------------------------------ *
 * Dependency health
 * ------------------------------------------------------------------ */

export interface Supersession {
  /** The older technique. */
  readonly from: string;
  /** The technique that replaced it. */
  readonly to: string;
}

export interface DependencyHealth {
  /** `"dependent->missing"` for every `requires` edge pointing at an id that is not in the dataset. */
  readonly dangling: string[];
  /** Every cycle in the `requires` graph, rotation-normalised and sorted. */
  readonly cycles: string[][];
  /** Pairs where a listed technique declares it supersedes an existing older one. */
  readonly superseded: Supersession[];
}

/**
 * Structural audit of the stack's `requires` and `supersedes` edges.
 *
 * Edges are written by hand in a dataset, so this is the check that stops the observatory drawing a
 * tower that depends on a technique nobody has built. It also catches the quieter failure: a cycle,
 * where "add oversight to the training loop" and "add training to the oversight loop" both look
 * reasonable in isolation.
 */
export function dependencyHealth(techniques: readonly Technique[]): DependencyHealth {
  const ids = new Set(techniques.map((t) => t.id));
  const dangling = new Set<string>();

  const edges = new Map<string, string[]>();
  for (const t of techniques) {
    const known: string[] = [];
    for (const requirement of t.requires) {
      if (ids.has(requirement)) known.push(requirement);
      else dangling.add(`${t.id}->${requirement}`);
    }
    edges.set(t.id, known);
  }

  const cycles = findCycles(edges, ids);
  const superseded: Supersession[] = [];
  for (const t of techniques) {
    for (const older of t.supersedes) {
      if (ids.has(older) && older !== t.id) superseded.push({ from: older, to: t.id });
    }
  }
  superseded.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));

  return { dangling: [...dangling].sort(), cycles, superseded };
}

/**
 * Depth-first search for every elementary cycle. Cycles are canonicalised to their lexicographically
 * smallest rotation so `a -> b -> a` and `b -> a -> b` collapse to one entry.
 */
function findCycles(edges: ReadonlyMap<string, readonly string[]>, roots: ReadonlySet<string>): string[][] {
  const stack: string[] = [];
  const onStack = new Set<string>();
  const found = new Map<string, string[]>();

  const canonical = (cycle: readonly string[]): string => {
    if (cycle.length === 0) return "";
    let startIndex = 0;
    for (let i = 1; i < cycle.length; i += 1) {
      const candidate = cycle[i];
      const best = cycle[startIndex];
      if (candidate !== undefined && best !== undefined && candidate < best) startIndex = i;
    }
    const rotated = [...cycle.slice(startIndex), ...cycle.slice(0, startIndex)];
    return rotated.join("|");
  };

  const visit = (node: string): void => {
    stack.push(node);
    onStack.add(node);
    for (const next of edges.get(node) ?? []) {
      const at = stack.indexOf(next);
      if (at >= 0) {
        const cycle = stack.slice(at);
        found.set(canonical(cycle), [...cycle].sort());
      } else if (!onStack.has(next)) {
        visit(next);
      }
    }
    stack.pop();
    onStack.delete(node);
  };

  for (const root of [...roots].sort()) visit(root);

  return [...found.values()].sort((a, b) => canonical(a).localeCompare(canonical(b)));
}

/* ------------------------------------------------------------------ *
 * Cost / benefit
 * ------------------------------------------------------------------ */

export interface CostBenefitRow {
  readonly id: string;
  readonly kind: TechniqueKind;
  readonly cost: Technique["cost"];
  readonly maturity: number;
  readonly adoption: number;
  /** `maturity / ordinalCost`. Cheap and proven beats expensive and aspirational. */
  readonly maturityPerCost: number;
  /** `maturityPerCost * (1 - adoption)`: the underexploited premium. */
  readonly headroom: number;
}

/**
 * What the stack gets per unit of cost. Sorted by `maturityPerCost` descending, then `id` ascending
 * so the ranking is stable across reloads.
 */
export function costBenefit(techniques: readonly Technique[]): CostBenefitRow[] {
  const rows = techniques.map((t) => {
    const ordinal = COST_SCALE[t.cost];
    const maturityPerCost = safeDiv(t.maturity, ordinal);
    return {
      id: t.id,
      kind: t.kind,
      cost: t.cost,
      maturity: t.maturity,
      adoption: t.adoption,
      maturityPerCost: Math.round(maturityPerCost * 10_000) / 10_000,
      headroom: Math.round(maturityPerCost * (1 - t.adoption) * 10_000) / 10_000,
    };
  });
  return rows.sort((a, b) => b.maturityPerCost - a.maturityPerCost || a.id.localeCompare(b.id));
}