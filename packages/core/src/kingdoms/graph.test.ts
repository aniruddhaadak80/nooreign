import { describe, expect, it } from "vitest";
import type { Kingdom } from "@repo/seed/types";
import { KINGDOMS } from "../chronicle/fixtures";
import { RELATION_WEIGHT, allies, centrality, distantPairs, predecessors, relationGraph, rivals, successors, territoryBounds, tributaries } from "./graph";

const graph = relationGraph(KINGDOMS);

const kingdom = (id: string): Kingdom => {
  const found = KINGDOMS.find((k) => k.id === id);
  if (found === undefined) throw new Error(`no kingdom ${id}`);
  return found;
};

describe("relationGraph", () => {
  it("dedupes A->B against B->A and keeps both notes", () => {
    // Eight declarations across four kingdoms collapse to five undirected edges.
    expect(graph.edges).toHaveLength(5);
    const debate = graph.edges.find((e) => e.kind === "debate" && e.from === "civic-hedonists" && e.to === "stoic-republic");
    expect(debate?.mutual).toBe(true);
    expect(debate?.notes).toHaveLength(2);
  });

  it("records who actually declared a one-way relation", () => {
    const vassal = graph.edges.find((e) => e.kind === "vassal");
    expect(vassal?.from).toBe("law-and-order");
    expect(vassal?.to).toBe("stoic-republic");
    expect(vassal?.mutual).toBe(false);
    expect(vassal?.declaredBy).toEqual(["stoic-republic"]);
  });

  it("produces one node per kingdom and is stable across input order", () => {
    expect(graph.nodes.map((n) => n.id)).toEqual(KINGDOMS.map((k) => k.id));
    const shape = (g: ReturnType<typeof relationGraph>) =>
      g.edges.map((e) => ({ from: e.from, to: e.to, kind: e.kind, mutual: e.mutual, declaredBy: e.declaredBy, notes: e.notes.length }));
    expect(shape(relationGraph([...KINGDOMS].reverse()))).toEqual(shape(graph));
  });

  it("drops a relation that points at a kingdom nobody declared", () => {
    const ghost: Kingdom = { ...kingdom("law-and-order"), relations: [{ to: "atlantis", kind: "alliance", note: "x" }] };
    expect(relationGraph([ghost]).edges).toHaveLength(0);
  });
});

describe("centrality", () => {
  it("ranks a hand-checked graph", () => {
    const ranked = centrality(graph);
    expect(ranked.map((r) => r.id)).toEqual([
      "utopian-engineers",
      "stoic-republic",
      "civic-hedonists",
      "law-and-order",
    ]);
    // utopian: debate(1.5) + alliance(2) + rivalry(1) = 4.5
    // stoic:   debate(1.5) + rivalry(1) + vassal(1) = 3.5
    // civic:   debate(1.5) + alliance(2) = 3.5
    // law:     debate(1.5) + vassal(1) = 2.5
    expect(ranked.map((r) => r.weightedDegree)).toEqual([4.5, 3.5, 3.5, 2.5]);
    expect(ranked.map((r) => r.degree)).toEqual([3, 3, 2, 2]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });

  it("breaks a weighted-degree tie on plain degree", () => {
    const ranked = centrality(graph);
    // stoic (3.5, degree 3) and civic (3.5, degree 2) tie on weight; the busier court wins.
    expect(ranked[1]?.weightedDegree).toBe(ranked[2]?.weightedDegree);
    expect(ranked[1]?.id).toBe("stoic-republic");
    expect(ranked[1]?.degree).toBeGreaterThan(ranked[2]?.degree ?? 0);
  });

  it("weights an alliance heavier than a rivalry", () => {
    expect(RELATION_WEIGHT.alliance).toBeGreaterThan(RELATION_WEIGHT.rivalry);
  });
});

describe("typed lookups", () => {
  it("treats alliance and rivalry as two-sided", () => {
    expect(allies(graph, "utopian-engineers")).toEqual(["civic-hedonists"]);
    expect(allies(graph, "civic-hedonists")).toEqual(["utopian-engineers"]);
    expect(rivals(graph, "stoic-republic")).toEqual(["utopian-engineers"]);
    expect(rivals(graph, "utopian-engineers")).toEqual(["stoic-republic"]);
  });

  it("treats vassal as asymmetric: only the overlord has tributaries", () => {
    expect(tributaries(graph, "stoic-republic")).toEqual(["law-and-order"]);
    expect(tributaries(graph, "law-and-order")).toEqual([]);
    expect(tributaries(graph, "utopian-engineers")).toEqual([]);
  });

  it("does not mistake a one-way debate for an alliance or a dependency", () => {
    expect(allies(graph, "law-and-order")).toEqual([]);
    expect(tributaries(graph, "law-and-order")).toEqual([]);
  });
});

describe("succession", () => {
  const lineage: Kingdom[] = [
    { ...kingdom("stoic-republic"), id: "old-court", relations: [{ to: "nobody", kind: "succession", note: "unused" }] },
    { ...kingdom("civic-hedonists"), id: "new-court", relations: [{ to: "old-court", kind: "succession", note: "the new court follows the old" }] },
  ];
  const lineageGraph = relationGraph(lineage);

  it("reads a declared succession as the declarant succeeding the target", () => {
    expect(successors(lineageGraph, "old-court")).toEqual(["new-court"]);
    expect(successors(lineageGraph, "new-court")).toEqual([]);
  });

  it("reads the same edge backwards as a predecessor", () => {
    expect(predecessors(lineageGraph, "new-court")).toEqual(["old-court"]);
    expect(predecessors(lineageGraph, "old-court")).toEqual([]);
  });
});

describe("territoryBounds", () => {
  const map = territoryBounds(KINGDOMS);

  it("bounds every landmark on the atlas plane", () => {
    expect(map.bounds).toMatchObject({ minX: 17, maxX: 92, minY: 17, maxY: 86 });
    expect(map.bounds.width).toBe(75);
    expect(map.bounds.height).toBe(69);
  });

  it("keeps each kingdom's own landmarks when its capital is the nearest", () => {
    expect(map.territories.map((t) => t.landmarkCount)).toEqual([3, 3, 3, 3]);
    const civic = map.territories.find((t) => t.kingdomId === "civic-hedonists");
    expect(civic?.centroid).toEqual({ x: 38.67, y: 21 });
  });

  it("reassigns a landmark to the nearest capital, not to its owner", () => {
    // A civic-hedonist outpost planted deep inside the engineers' foundry belt.
    const stray: Kingdom = { ...kingdom("civic-hedonists"), landmarks: [{ name: "Far outpost", kind: "gate", note: "x", x: 72, y: 36 }] };
    const patched = territoryBounds([stray, kingdom("utopian-engineers"), kingdom("stoic-republic"), kingdom("law-and-order")]);
    expect(patched.territories.find((t) => t.kingdomId === "utopian-engineers")?.landmarkCount).toBe(4);
    expect(patched.territories.find((t) => t.kingdomId === "civic-hedonists")?.landmarkCount).toBe(0);
  });

  it("reports a null centroid for a kingdom that owns nothing", () => {
    expect(map.territories.every((t) => t.centroid !== null)).toBe(true);
    expect(territoryBounds([]).bounds).toMatchObject({ minX: 0, maxX: 0, width: 0 });
  });
});

describe("distantPairs", () => {
  it("finds the two courts that have never met", () => {
    const [pair] = distantPairs(KINGDOMS);
    expect(pair?.a).toBe("civic-hedonists");
    expect(pair?.b).toBe("law-and-order");
    expect(pair?.distance).toBeCloseTo(76.84, 2);
    expect(pair?.estranged).toBe(true);
  });

  it("sorts furthest first and can return several", () => {
    const pairs = distantPairs(KINGDOMS, 3);
    expect(pairs).toHaveLength(3);
    expect(pairs.map((p) => p.distance)).toEqual([76.84, 67.68, 67.47]);
    expect(pairs[0]?.distance).toBeGreaterThan(pairs[2]?.distance ?? 0);
  });

  it("orders each pair by id so the label is stable", () => {
    for (const pair of distantPairs(KINGDOMS, 6)) expect(pair.a < pair.b).toBe(true);
  });
});