import { describe, expect, it } from "vitest";

import type { ArgumentMove } from "@repo/seed/types";
import { ADVISORS, gilligan, kant, korsgaard, marcus } from "../__fixtures__/council";
import {
  INHERITANCE,
  advisorsInGraph,
  attackedNodes,
  buildGraph,
  inheritedWeight,
  isWellFormed,
  nodeIndex,
  supportingNodes,
  targetsOf,
  toMermaid,
  topologicalOrder,
} from "./argument-graph";

function mv(
  id: string,
  kind: ArgumentMove["kind"],
  weight: number,
  opts: { targets?: string[]; appliesTo?: string[] } = {},
): ArgumentMove {
  return {
    id,
    kind,
    claim: `Claim carried by ${id} in this sitting of the court.`,
    support: `The supporting argument for ${id}, stated at length enough to be quoted.`,
    weight,
    leansOn: ["rights"],
    appliesTo: opts.appliesTo ?? [],
  };
}

describe("graph / buildGraph", () => {
  it("resolves an explicit target map and makes an 'attacks' edge", () => {
    const moves = [mv("kant.a", "premise", 0.9), mv("kant.b", "objection", 0.7)];
    const graph = buildGraph(moves, ["kant"], { targets: { "kant.b": ["kant.a"] } });
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toEqual([{ from: "kant.b", to: "kant.a", kind: "attacks" }]);
    expect(graph.dangling).toEqual([]);
  });

  it("resolves targets from an id prefix, an arrow, and an appliesTo match", () => {
    const prefixed = buildGraph([mv("attack:kant.a", "objection", 0.5), mv("kant.a", "premise", 0.5)], ["kant"]);
    expect(prefixed.edges[0]?.to).toBe("kant.a");

    const arrowed = buildGraph([mv("kant.b->kant.a", "objection", 0.5), mv("kant.a", "premise", 0.5)], ["kant"]);
    expect(arrowed.edges[0]?.to).toBe("kant.a");

    const tagged = buildGraph(
      [mv("kant.b", "objection", 0.5, { appliesTo: ["kant.a"] }), mv("kant.a", "premise", 0.5)],
      ["kant"],
    );
    expect(tagged.edges[0]?.to).toBe("kant.a");
  });

  it("marks objections and appeals as 'attacks' and premises and syntheses as 'supports'", () => {
    const graph = buildGraph(
      [
        mv("p", "premise", 0.5),
        mv("o", "objection", 0.5),
        mv("s", "synthesis", 0.5),
        mv("ap", "appeal", 0.5),
        mv("z", "premise", 0.5),
      ],
      [],
      { targets: { p: ["z"], o: ["z"], s: ["z"], ap: ["z"] } },
    );
    // Every edge points at the single target `z`, so the kinds line up with the
    // source node's own kind: a premise and a synthesis rally behind a position,
    // an objection and an appeal press against it.
    expect(graph.edges.every((e) => e.to === "z")).toBe(true);
    expect(graph.edges.map((e) => e.kind)).toEqual(["supports", "attacks", "supports", "attacks"]);
  });

  it("records an unresolvable target as dangling instead of throwing", () => {
    const graph = buildGraph([mv("kant.b", "objection", 0.5)], ["kant"], { targets: { "kant.b": ["nowhere"] } });
    expect(graph.edges).toHaveLength(0);
    expect(graph.dangling).toEqual(["kant.b -> nowhere"]);
    expect(isWellFormed(graph).wellFormed).toBe(false);
  });

  it("attributes each node to the advisor named by its id prefix", () => {
    const graph = buildGraph(
      [mv("kant.ci", "premise", 0.5), mv("bentham.calculus", "premise", 0.5)],
      ["kant", "bentham"],
    );
    expect(graph.nodes.map((n) => n.advisorId)).toEqual(["kant", "bentham"]);
    // An unknown prefix falls back to the whole move id.
    const orphan = buildGraph([mv("nobody.thing", "premise", 0.5)], []);
    expect(orphan.nodes[0]?.advisorId).toBe("nobody.thing");
  });

  it("accepts an explicit advisor resolver", () => {
    const graph = buildGraph([mv("opaque-1", "premise", 0.5)], ["kant"], {
      advisorOf: () => "kant",
    });
    expect(graph.nodes[0]?.advisorId).toBe("kant");
  });
});

describe("graph / topology", () => {
  it("orders a DAG so every edge runs from earlier to later", () => {
    // `c` presses against both `a` and `b`, which press against nothing. The
    // order is a *dependency* order for weight propagation: a node is resolved
    // only after everything pointing at it, so the attacker comes first.
    const graph = buildGraph(
      [mv("a", "premise", 0.5), mv("b", "premise", 0.5), mv("c", "synthesis", 0.5)],
      [],
      { targets: { a: [], b: [], c: ["a", "b"] } },
    );
    const { order, cycles } = topologicalOrder(graph);
    expect(cycles).toEqual([]);
    expect(order).toEqual(["c", "a", "b"]);

    const positions = new Map(order.map((id, i) => [id, i]));
    for (const edge of graph.edges) {
      expect(positions.get(edge.from)).toBeLessThan(positions.get(edge.to) ?? Infinity);
    }
  });

  it("is stable: the same graph always yields the same order", () => {
    const build = () =>
      buildGraph([mv("a", "premise", 0.5), mv("b", "premise", 0.5), mv("c", "premise", 0.5)], [], {
        targets: { c: ["a", "b"] },
      });
    expect(topologicalOrder(build()).order).toEqual(topologicalOrder(build()).order);
  });

  it("detects a two-node cycle and reports it rather than throwing", () => {
    const graph = buildGraph([mv("a", "objection", 0.5), mv("b", "objection", 0.5)], [], {
      targets: { a: ["b"], b: ["a"] },
    });
    const { order, cycles } = topologicalOrder(graph);
    expect(order).toHaveLength(0);
    expect(cycles).toHaveLength(1);
    expect([...(cycles[0] ?? [])].sort()).toEqual(["a", "b"]);
    expect(isWellFormed(graph).wellFormed).toBe(false);
  });

  it("detects a longer cycle and still orders the acyclic remainder", () => {
    const graph = buildGraph(
      [mv("a", "premise", 0.5), mv("b", "objection", 0.5), mv("c", "objection", 0.5)],
      [],
      { targets: { a: [], b: ["c"], c: ["b"] } },
    );
    const { order, cycles } = topologicalOrder(graph);
    expect(order).toEqual(["a"]);
    expect(cycles).toHaveLength(1);
    expect([...(cycles[0] ?? [])].sort()).toEqual(["b", "c"]);
  });

  it("flags a self-attack", () => {
    const graph = buildGraph([mv("a", "objection", 0.5)], [], { targets: { a: ["a"] } });
    const report = isWellFormed(graph);
    expect(report.wellFormed).toBe(false);
    expect(report.problems.some((p) => p.includes("self-attack"))).toBe(true);
  });

  it("passes a real advisor bench as well-formed", () => {
    const moves = ADVISORS.flatMap((a) => a.moves);
    const graph = buildGraph(moves, ADVISORS.map((a) => a.id));
    const report = isWellFormed(graph);
    expect(report.problems).toEqual([]);
    expect(report.wellFormed).toBe(true);
  });
});

describe("graph / inheritedWeight", () => {
  it("carries 0.4 of a supporter's weight onto its target", () => {
    // premise(a, 0.5) supports premise(b, 0.2): b inherits 0.5 * 0.4 = 0.2.
    const graph = buildGraph([mv("a", "premise", 0.5), mv("b", "premise", 0.2)], [], {
      targets: { a: ["b"] },
    });
    const weights = inheritedWeight(graph);
    expect(weights.a).toBe(0.5);
    expect(weights.b).toBeCloseTo(0.2 + INHERITANCE * 0.5, 4);
  });

  it("subtracts an attacker's weight from the position under attack", () => {
    // objection(a, 0.4) attacks premise(b, 0.9): b loses 0.4 * 0.4 = 0.16.
    const graph = buildGraph([mv("a", "objection", 0.4), mv("b", "premise", 0.9)], [], {
      targets: { a: ["b"] },
    });
    const weights = inheritedWeight(graph);
    expect(weights.b).toBeCloseTo(0.9 - INHERITANCE * 0.4, 4);
  });

  it("decays along a chain rather than compounding", () => {
    // a(0.5) -> b(0.5) -> c(0). c inherits 0.4*(0.5 + 0.4*0.5) = 0.4*0.7 = 0.28.
    const graph = buildGraph([mv("a", "premise", 0.5), mv("b", "premise", 0.5), mv("c", "premise", 0)], [], {
      targets: { a: ["b"], b: ["c"] },
    });
    const weights = inheritedWeight(graph);
    expect(weights.c).toBeCloseTo(0.28, 4);
    // Full transfer would have given 0.9; the decay is what stops it.
    expect(weights.c).toBeLessThan(0.5);
  });

  it("clamps into [0, 1] so a weight is always renderable", () => {
    const graph = buildGraph([mv("a", "premise", 1), mv("b", "premise", 1)], [], { targets: { a: ["b"] } });
    const weights = inheritedWeight(graph);
    expect(weights.b).toBe(1);
    const flooded = buildGraph([mv("a", "premise", 1), mv("b", "premise", 1)], [], { targets: { b: ["a"] } });
    expect(inheritedWeight(flooded).a).toBeLessThanOrEqual(1);
    for (const v of Object.values(weights)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("stays deterministic on a cyclic graph by falling back to declaration order", () => {
    const build = () =>
      buildGraph([mv("a", "objection", 0.5), mv("b", "objection", 0.5)], [], {
        targets: { a: ["b"], b: ["a"] },
      });
    expect(inheritedWeight(build())).toEqual(inheritedWeight(build()));
  });
});

describe("graph / neighbours", () => {
  it("reads edges in the incoming direction for both helpers", () => {
    const graph = buildGraph([mv("supporter", "premise", 0.5), mv("critic", "objection", 0.5), mv("target", "premise", 0.5)], [], {
      targets: { supporter: ["target"], critic: ["target"] },
    });
    expect(supportingNodes(graph, "target").map((n) => n.id)).toEqual(["supporter"]);
    expect(attackedNodes(graph, "target").map((n) => n.id)).toEqual(["critic"]);
    expect(supportingNodes(graph, "nowhere")).toEqual([]);
    expect(attackedNodes(graph, "nowhere")).toEqual([]);
  });

  it("reports what a node itself presses against", () => {
    const graph = buildGraph([mv("a", "objection", 0.5), mv("b", "premise", 0.5)], [], {
      targets: { a: ["b"] },
    });
    expect(targetsOf(graph, "a").map((n) => n.id)).toEqual(["b"]);
    expect(targetsOf(graph, "b")).toEqual([]);
  });

  it("indexes nodes and lists advisors in first-appearance order", () => {
    const graph = buildGraph(
      [mv("kant.ci", "premise", 0.5), mv("bentham.calculus", "premise", 0.5), mv("kant.personhood", "premise", 0.5)],
      ["kant", "bentham"],
    );
    expect(nodeIndex(graph).get("kant.ci")?.kind).toBe("premise");
    expect(advisorsInGraph(graph, ADVISORS).map((a) => a.id)).toEqual(["kant", "bentham"]);
  });
});

describe("graph / toMermaid", () => {
  it("emits a syntactically valid flowchart TD with quoted labels", () => {
    const graph = buildGraph(
      [mv("a", "premise", 0.5), mv("b", "objection", 0.5)],
      [],
      { targets: { b: ["a"] } },
    );
    const mermaid = toMermaid(graph);
    expect(mermaid.startsWith("flowchart TD")).toBe(true);
    expect(mermaid).toMatch(/^ {2}n\d+\["[^"]+"\]$/m);
    // Attacks are dotted, supports solid.
    expect(mermaid).toMatch(/n\d+ -\.-> n\d+/);

    const supported = toMermaid(buildGraph([mv("a", "premise", 0.5), mv("b", "premise", 0.5)], [], { targets: { a: ["b"] } }));
    expect(supported).toMatch(/n\d+ --> n\d+/);

    expect(mermaid.split("\n").every((l) => l.trim().length > 0)).toBe(true);
    // Node ids are plain mermaid identifiers and labels never appear in them.
    const ids = mermaid.match(/\bn\d+\b/g) ?? [];
    expect(new Set(ids).size).toBe(2);
  });

  it("quotes labels containing spaces and quotes the claim in", () => {
    const withQuote: ArgumentMove = {
      ...mv("a", "premise", 0.5),
      claim: 'He said "no exceptions" without blinking.',
    };
    const mermaid = toMermaid(buildGraph([withQuote], []));
    expect(mermaid).toContain("#quot;");
    // The embedded quote must not break the label delimiter.
    const nodeLine = mermaid.split("\n").find((l) => l.includes("n0["));
    expect(nodeLine).toBeDefined();
    expect(nodeLine?.match(/"/g)?.length).toBe(2);
  });

  it("renders an empty graph without crashing", () => {
    expect(toMermaid(buildGraph([], []))).toContain("flowchart TD");
  });
});

describe("graph / real advisor bench", () => {
  it("produces a well-formed graph from the fixtures with real objections", () => {
    const moves = ADVISORS.flatMap((a) => a.moves);
    const targets: Record<string, string[]> = {
      // Kant's objection answers the utilitarian calculus directly.
      "kant.no-lying-machine": ["bentham.calculus"],
      "mill.tyranny": ["bentham.sanction"],
      "gilligan.distortion": ["bentham.calculus"],
      "korsgaard.generalization": ["bentham.sanction"],
      "aristotle.cowardice": ["bentham.syllogism"],
      "marcus.remedy": ["bentham.calculus"],
    };
    const graph = buildGraph(moves, ADVISORS.map((a) => a.id), { targets });
    expect(isWellFormed(graph).wellFormed).toBe(true);

    // Bentham's calculus is the most attacked node in the sitting.
    expect(attackedNodes(graph, "bentham.calculus").length).toBeGreaterThanOrEqual(3);
    const weights = inheritedWeight(graph);
    expect(weights["bentham.calculus"]).toBeLessThan(1);
    // Attacked nodes lose standing relative to the un-attacked.
    expect(weights["bentham.calculus"]).toBeLessThanOrEqual(weights["aristotle.function"] ?? 0);
  });

  it("keeps every node's leansOn and weight faithful to its source move", () => {
    const moves = ADVISORS.flatMap((a) => a.moves);
    const graph = buildGraph(moves, ADVISORS.map((a) => a.id));
    const byMove = new Map(moves.map((m) => [m.id, m]));
    for (const node of graph.nodes) {
      const source = byMove.get(node.moveId);
      expect(source).toBeDefined();
      expect(node.weight).toBeCloseTo(source?.weight ?? -1, 4);
      expect(node.leansOn).toEqual(source?.leansOn ?? []);
    }
    expect(graph.nodes.some((n) => n.advisorId === kant.id)).toBe(true);
    expect(graph.nodes.some((n) => n.advisorId === gilligan.id)).toBe(true);
    expect(graph.nodes.some((n) => n.advisorId === marcus.id)).toBe(true);
    expect(graph.nodes.some((n) => n.advisorId === korsgaard.id)).toBe(true);
  });
});