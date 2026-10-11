/**
 * The diplomacy map.
 *
 * Kingdoms are points on a 0..100 atlas plane with terrain and landmarks, and they hold relations on
 * each other: alliance, rivalry, vassal, debate, succession. This module turns that into a graph and
 * then asks it four questions — who is central, who is above whom, where does each kingdom's
 * territory actually fall, and which two courts have never met.
 *
 * The rule that shapes everything here is that **relation kinds are not all symmetric**. `alliance`
 * and `debate` are two-sided facts; `vassal` and `succession` are not, and pretending otherwise
 * produces a map where a kingdom is simultaneously above and below itself. So an edge records who
 * actually declared it.
 */
import type { Kingdom, RelationKind, Terrain } from "@repo/seed/types";
import { safeDiv } from "../util/math";

/* ------------------------------------------------------------------ *
 * Graph construction
 * ------------------------------------------------------------------ */

export interface KingdomNode {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly terrain: Terrain;
  readonly capital: { readonly x: number; readonly y: number };
  readonly founded: number;
}

export interface RelationEdge {
  /** Alphabetically first of the pair — the edge is undirected in the graph, the note is not. */
  readonly from: string;
  /** The other kingdom. */
  readonly to: string;
  readonly kind: RelationKind;
  /** Every note recorded for this pair, in declaration order. */
  readonly notes: string[];
  /** `true` when both kingdoms declare a relation between themselves. */
  readonly mutual: boolean;
  /** Ids that actually declared this relation, sorted. Length 1 for a one-way edge. */
  readonly declaredBy: readonly string[];
}

export interface RelationGraph {
  readonly nodes: KingdomNode[];
  readonly edges: RelationEdge[];
}

const pairKey = (a: string, b: string): string => (a <= b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

/**
 * Collapse the kingdom relation lists into a deduplicated graph.
 *
 * A → B and B → A become one edge with both notes, flagged `mutual`. A → B with nothing coming back
 * stays one edge with `declaredBy: ["A"]`, which is the only structure the asymmetric lookups can
 * rely on.
 */
/** Mutable accumulator used while folding declarations; frozen into a `RelationEdge` at the end. */
interface EdgeDraft {
  from: string;
  to: string;
  kind: RelationKind;
  notes: string[];
  mutual: boolean;
  declaredBy: string[];
}

export function relationGraph(kingdoms: readonly Kingdom[]): RelationGraph {
  const known = new Set(kingdoms.map((k) => k.id));
  const byPair = new Map<string, EdgeDraft>();

  for (const kingdom of kingdoms) {
    for (const relation of kingdom.relations) {
      if (!known.has(relation.to) || relation.to === kingdom.id) continue;
      const key = pairKey(kingdom.id, relation.to);
      const parts = key.split("\u0000");
      const a = parts[0] ?? kingdom.id;
      const b = parts[1] ?? relation.to;

      const existing = byPair.get(key);
      if (existing === undefined) {
        byPair.set(key, {
          from: a,
          to: b,
          kind: relation.kind,
          notes: [relation.note],
          mutual: false,
          declaredBy: [kingdom.id],
        });
        continue;
      }
      existing.notes.push(relation.note);
      if (!existing.declaredBy.includes(kingdom.id)) existing.declaredBy.push(kingdom.id);
      if (existing.declaredBy.length > 1) existing.mutual = true;
    }
  }

  const edges: RelationEdge[] = [...byPair.values()].map((draft) => ({
    from: draft.from,
    to: draft.to,
    kind: draft.kind,
    notes: [...draft.notes],
    mutual: draft.mutual,
    declaredBy: [...draft.declaredBy].sort(),
  }));
  edges.sort((a, b) => pairKey(a.from, a.to).localeCompare(pairKey(b.from, b.to)));

  const nodes: KingdomNode[] = kingdoms.map((k) => ({
    id: k.id,
    slug: k.slug,
    name: k.name,
    terrain: k.terrain,
    capital: { x: k.capital.x, y: k.capital.y },
    founded: k.founded,
  }));

  return { nodes, edges };
}

/* ------------------------------------------------------------------ *
 * Centrality
 * ------------------------------------------------------------------ */

/**
 * Edge weights. An alliance and a succession bind harder than a debate; a rivalry binds harder than a
 * statement of dependence. These are editorial, stated here so they can be argued with.
 */
export const RELATION_WEIGHT: Record<RelationKind, number> = {
  alliance: 2,
  succession: 2,
  debate: 1.5,
  rivalry: 1,
  vassal: 1,
};

export interface CentralityEntry {
  readonly id: string;
  readonly name: string;
  readonly degree: number;
  readonly weightedDegree: number;
  /** 1-based rank; ties break on degree then id. */
  readonly rank: number;
}

/** Degree and weighted degree per kingdom, ranked. Dangling relation targets count for nothing. */
export function centrality(graph: RelationGraph): CentralityEntry[] {
  const degree = new Map<string, number>();
  const weighted = new Map<string, number>();
  for (const node of graph.nodes) {
    degree.set(node.id, 0);
    weighted.set(node.id, 0);
  }
  for (const edge of graph.edges) {
    const weight = RELATION_WEIGHT[edge.kind];
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
    weighted.set(edge.from, (weighted.get(edge.from) ?? 0) + weight);
    weighted.set(edge.to, (weighted.get(edge.to) ?? 0) + weight);
  }

  const entries: CentralityEntry[] = graph.nodes.map((node) => ({
    id: node.id,
    name: node.name,
    degree: degree.get(node.id) ?? 0,
    weightedDegree: Math.round((weighted.get(node.id) ?? 0) * 1000) / 1000,
    rank: 0,
  }));

  entries.sort(
    (a, b) => b.weightedDegree - a.weightedDegree || b.degree - a.degree || a.id.localeCompare(b.id),
  );
  return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/* ------------------------------------------------------------------ *
 * Typed lookups
 * ------------------------------------------------------------------ */

const neighboursOfKind = (graph: RelationGraph, id: string, kind: RelationKind): string[] => {
  const out: string[] = [];
  for (const edge of graph.edges) {
    if (edge.kind !== kind) continue;
    const other = edge.from === id ? edge.to : edge.to === id ? edge.from : null;
    if (other !== null && other !== id && !out.includes(other)) out.push(other);
  }
  return out.sort();
};

/** Kingdoms that hold an alliance with `id`. Alliance is a two-sided fact, so direction is ignored. */
export const allies = (graph: RelationGraph, id: string): string[] => neighboursOfKind(graph, id, "alliance");

/** Kingdoms in open rivalry with `id`. Also two-sided. */
export const rivals = (graph: RelationGraph, id: string): string[] => neighboursOfKind(graph, id, "rivalry");

/**
 * Kingdoms that are `id`'s tributaries.
 *
 * Vassal convention: a `vassal` relation declared by X about Y means **Y is X's vassal** — the
 * overlord lists what it holds, which is how every historical record of a dependency is actually
 * written. The `declaredBy` check is what makes vassal asymmetric: X has a tributary, Y has none.
 */
export function tributaries(graph: RelationGraph, id: string): string[] {
  const out: string[] = [];
  for (const edge of graph.edges) {
    if (edge.kind !== "vassal") continue;
    const other = edge.from === id ? edge.to : edge.to === id ? edge.from : null;
    if (other === null || other === id) continue;
    if (edge.declaredBy.includes(id)) out.push(other);
  }
  return [...new Set(out)].sort();
}

/**
 * Kingdoms that succeeded `id`.
 *
 * Lineage convention: a `succession` relation declared by X about Y means **X succeeds Y**. Lineage
 * runs from the successor back to what it followed, so the successors of Y are the kingdoms that
 * declared a succession about it.
 */
export function successors(graph: RelationGraph, id: string): string[] {
  const out: string[] = [];
  for (const edge of graph.edges) {
    if (edge.kind !== "succession") continue;
    const other = edge.from === id ? edge.to : edge.to === id ? edge.from : null;
    if (other === null || other === id) continue;
    if (edge.declaredBy.includes(other)) out.push(other);
  }
  return [...new Set(out)].sort();
}

/** Inverse of `successors`: the kingdom `id` came after, if any. */
export function predecessors(graph: RelationGraph, id: string): string[] {
  const out: string[] = [];
  for (const edge of graph.edges) {
    if (edge.kind !== "succession") continue;
    const other = edge.from === id ? edge.to : edge.to === id ? edge.from : null;
    if (other === null || other === id) continue;
    if (edge.declaredBy.includes(id)) out.push(other);
  }
  return [...new Set(out)].sort();
}

/* ------------------------------------------------------------------ *
 * Territory
 * ------------------------------------------------------------------ */

export interface Centroid {
  readonly x: number;
  readonly y: number;
}

export interface Territory {
  readonly kingdomId: string;
  /** Landmarks assigned to this kingdom's capital by nearest-capital rule. */
  readonly landmarkCount: number;
  /** Centroid of the assigned landmarks; null when the kingdom owns none. */
  readonly centroid: Centroid | null;
  readonly capital: Centroid;
}

export interface TerritoryMap {
  /** Bounding box of every landmark on the atlas plane. */
  readonly bounds: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
    readonly width: number;
    readonly height: number;
  };
  readonly territories: Territory[];
}

const distance = (a: Centroid, b: Centroid): number => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Bounding box of all landmarks plus a nearest-capital partition of them.
 *
 * Voronoi rather than true Voronoi cells: the atlas only needs to know which kingdom a landmark
 * belongs to, and a nearest-capital rule is that partition in one line. The bounding box is over
 * *landmarks*, not capitals, because the box is what the map viewport needs to fit.
 */
export function territoryBounds(kingdoms: readonly Kingdom[]): TerritoryMap {
  const landmarks = kingdoms.flatMap((k) => k.landmarks);
  const xs = landmarks.map((l) => l.x);
  const ys = landmarks.map((l) => l.y);
  const minX = xs.length === 0 ? 0 : Math.min(...xs);
  const maxX = xs.length === 0 ? 0 : Math.max(...xs);
  const minY = ys.length === 0 ? 0 : Math.min(...ys);
  const maxY = ys.length === 0 ? 0 : Math.max(...ys);

  const assigned = new Map<string, Array<{ x: number; y: number }>>();
  for (const kingdom of kingdoms) assigned.set(kingdom.id, []);
  for (const kingdom of kingdoms) {
    for (const landmark of kingdom.landmarks) {
      let bestId = kingdom.id;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const candidate of kingdoms) {
        const d = distance({ x: landmark.x, y: landmark.y }, { x: candidate.capital.x, y: candidate.capital.y });
        if (d < bestDistance || (d === bestDistance && candidate.id < bestId)) {
          bestDistance = d;
          bestId = candidate.id;
        }
      }
      assigned.get(bestId)?.push({ x: landmark.x, y: landmark.y });
    }
  }

  const territories: Territory[] = kingdoms.map((k) => {
    const owned = assigned.get(k.id) ?? [];
    const centroid: Centroid | null =
      owned.length === 0
        ? null
        : {
            x: Math.round(safeDiv(owned.reduce((a, p) => a + p.x, 0), owned.length) * 100) / 100,
            y: Math.round(safeDiv(owned.reduce((a, p) => a + p.y, 0), owned.length) * 100) / 100,
          };
    return { kingdomId: k.id, landmarkCount: owned.length, centroid, capital: { x: k.capital.x, y: k.capital.y } };
  });

  return {
    bounds: { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY },
    territories,
  };
}

/* ------------------------------------------------------------------ *
 * Distance
 * ------------------------------------------------------------------ */

export interface DistantPair {
  readonly a: string;
  readonly b: string;
  readonly distance: number;
  /** True when the two capitals are further apart than half the atlas diagonal. */
  readonly estranged: boolean;
}

const ATLAS_DIAGONAL = Math.hypot(100, 100);

/**
 * Capital pairs, furthest apart first. Ties break on `a` then `b` so the landing-page line is stable.
 * `limit` defaults to the single furthest pair — the one the page actually quotes.
 */
export function distantPairs(kingdoms: readonly Kingdom[], limit = 1): DistantPair[] {
  const pairs: DistantPair[] = [];
  for (let i = 0; i < kingdoms.length; i += 1) {
    for (let j = i + 1; j < kingdoms.length; j += 1) {
      const a = kingdoms[i];
      const b = kingdoms[j];
      if (a === undefined || b === undefined) continue;
      const d = Math.round(distance({ x: a.capital.x, y: a.capital.y }, { x: b.capital.x, y: b.capital.y }) * 100) / 100;
      pairs.push({
        a: a.id <= b.id ? a.id : b.id,
        b: a.id <= b.id ? b.id : a.id,
        distance: d,
        estranged: d > ATLAS_DIAGONAL / 2,
      });
    }
  }
  pairs.sort((x, y) => y.distance - x.distance || x.a.localeCompare(y.a) || x.b.localeCompare(y.b));
  return pairs.slice(0, Math.max(0, limit));
}