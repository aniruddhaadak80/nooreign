/**
 * Deliberation as a directed acyclic graph.
 *
 * WHY a graph at all: a verdict that only records "X said Y" cannot be audited.
 * Modelling objections as *edges* rather than prose means the engine can ask
 * structural questions — is this argument well-formed, who is attacking the
 * winner, does the influence chain decay — and answer them deterministically
 * instead of by vibes.
 */
import type { Advisor, ArgumentMove, AxiomKey, MoveKind } from "../../../seed/src/types";
import { clamp, round } from "../util/math";

export interface GraphNode {
  readonly id: string;
  readonly moveId: string;
  readonly advisorId: string;
  readonly kind: MoveKind;
  readonly claim: string;
  readonly support: string;
  readonly weight: number;
  readonly leansOn: readonly AxiomKey[];
  /** Node ids this node presses against. */
  readonly targets: readonly string[];
}

export type EdgeKind = "attacks" | "supports";

export interface GraphEdge {
  readonly from: string;
  readonly to: string;
  readonly kind: EdgeKind;
}

export interface ArgumentGraph {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  /** Target ids that match no node. Surfaced rather than thrown: a partially
   *  understood debate is still worth rendering, and the app shows the gap. */
  readonly dangling: readonly string[];
}

/**
 * How much of a neighbouring move's standing is inherited.
 *
 * Chosen at 0.4 rather than 1 because influence should decay down a chain: if
 * every objection transferred its full weight, a long argument would compound
 * into certainty that the reasoning has not earned.
 */
export const INHERITANCE = 0.4;

/** Prefixes an objection's `id` may use to name its target, longest first. */
const TARGET_PREFIXES = ["attack:", "objection:", "vs:"] as const;
const TARGET_ARROW = "->";

export interface BuildGraphOptions {
  /**
   * Explicit targets, keyed by move id. `ArgumentMove` has no `targets` field,
   * so a caller that already *knows* what a move is aimed at (the deliberation
   * engine knows an objection's `targetedOption`) should say so here rather
   * than having the target inferred from a string.
   */
  readonly targets?: Readonly<Record<string, readonly string[]>>;
  /** Resolve a move id to the advisor who owns it; defaults to the move id itself. */
  readonly advisorOf?: (move: ArgumentMove) => string;
}

/**
 * Build the graph.
 *
 * Targets are resolved in this order, first hit wins:
 *   1. an explicit entry in `options.targets`,
 *   2. an `attack:` / `objection:` / `vs:` prefix on the move id,
 *   3. an `->` arrow inside the move id,
 *   4. an `appliesTo` entry that names another move in this graph.
 * Anything unresolved becomes a node with no targets and is listed in
 * `dangling`, so the failure is visible instead of silent.
 *
 * Edge kind follows the node's own kind: objections and appeals *attack* what
 * they point at, premises *support* it.
 */
export function buildGraph(
  moves: readonly ArgumentMove[],
  advisorIds: readonly string[],
  options: BuildGraphOptions = {},
): ArgumentGraph {
  // Move ids are namespaced by advisor ("kant.ci"), so the segment before the
  // first dot identifies the speaker. An explicit `advisorOf` overrides that,
  // which is what a caller with a real advisor registry will supply.
  const advisorIdsSet = new Set(advisorIds);
  const defaultAdvisorOf = (move: ArgumentMove): string => {
    const prefix = move.id.split(".")[0] ?? move.id;
    return advisorIdsSet.has(prefix) ? prefix : move.id;
  };
  const advisorOf = options.advisorOf ?? defaultAdvisorOf;

  const nodes: GraphNode[] = moves.map((move) => {
    const targets = resolveTargets(move, moves, options.targets);
    return {
      id: move.id,
      moveId: move.id,
      advisorId: advisorOf(move),
      kind: move.kind,
      claim: move.claim,
      support: move.support,
      weight: round(move.weight, 4),
      leansOn: move.leansOn,
      targets,
    };
  });

  const known = new Set(nodes.map((n) => n.id));
  const dangling: string[] = [];
  const edges: GraphEdge[] = [];
  for (const node of nodes) {
    for (const target of node.targets) {
      if (!known.has(target)) {
        dangling.push(`${node.id} -> ${target}`);
        continue;
      }
      edges.push({
        from: node.id,
        to: target,
        kind: node.kind === "objection" || node.kind === "appeal" ? "attacks" : "supports",
      });
    }
  }

  return { nodes, edges, dangling };
}

function resolveTargets(
  move: ArgumentMove,
  all: readonly ArgumentMove[],
  overrides: BuildGraphOptions["targets"],
): string[] {
  const explicit = overrides?.[move.id];
  if (explicit !== undefined) return [...explicit];

  for (const prefix of TARGET_PREFIXES) {
    if (move.id.startsWith(prefix)) {
      const rest = move.id.slice(prefix.length).trim();
      return rest === "" ? [] : [rest];
    }
  }
  const arrow = move.id.indexOf(TARGET_ARROW);
  if (arrow >= 0) {
    const rest = move.id.slice(arrow + TARGET_ARROW.length).trim();
    if (rest !== "") return [rest];
  }
  const knownIds = new Set(all.map((m) => m.id));
  const viaTags = move.appliesTo.filter((tag) => knownIds.has(tag));
  if (viaTags.length > 0) return [...viaTags];
  return [];
}

/** Index a graph by node id for O(1) neighbour lookups. */
export function nodeIndex(graph: ArgumentGraph): Map<string, GraphNode> {
  return new Map(graph.nodes.map((n) => [n.id, n]));
}

/**
 * Nodes that point *at* `nodeId` with a `supports` edge — i.e. what stands
 * behind it. Both neighbour helpers read edges in the incoming direction so
 * that "who is against this?" has a single, unambiguous meaning.
 */
export function supportingNodes(graph: ArgumentGraph, nodeId: string): GraphNode[] {
  return incoming(graph, nodeId, "supports");
}

/** Nodes pressing *against* `nodeId`. */
export function attackedNodes(graph: ArgumentGraph, nodeId: string): GraphNode[] {
  return incoming(graph, nodeId, "attacks");
}

function incoming(graph: ArgumentGraph, nodeId: string, kind: EdgeKind): GraphNode[] {
  const index = nodeIndex(graph);
  const out: GraphNode[] = [];
  for (const edge of graph.edges) {
    if (edge.to !== nodeId || edge.kind !== kind) continue;
    const node = index.get(edge.from);
    if (node !== undefined) out.push(node);
  }
  return out;
}

/** Nodes `nodeId` itself attacks. */
export function targetsOf(graph: ArgumentGraph, nodeId: string): GraphNode[] {
  const index = nodeIndex(graph);
  return graph.nodes
    .filter((n) => n.id === nodeId)
    .flatMap((n) => n.targets.map((t) => index.get(t)))
    .filter((n): n is GraphNode => n !== undefined);
}

export interface TopologicalResult {
  /** Node ids in dependency order; every node appears in `cycles` at most once more. */
  readonly order: readonly string[];
  /** Each strongly-connected group found among the nodes that could not be ordered. */
  readonly cycles: readonly (readonly string[])[];
}

/**
 * Kahn's algorithm with a declaration-order tie-break, so the same graph always
 * produces the same order.
 *
 * Cycles are *returned*, not thrown: a genuinely circular debate is a real
 * philosophical situation, and the app renders it as one.
 */
export function topologicalOrder(graph: ArgumentGraph): TopologicalResult {
  const ids = graph.nodes.map((n) => n.id);
  const known = new Set(ids);
  const indegree = new Map<string, number>(ids.map((id) => [id, 0]));
  const out = new Map<string, string[]>(ids.map((id) => [id, []]));

  for (const edge of graph.edges) {
    if (!known.has(edge.from) || !known.has(edge.to)) continue;
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
    out.get(edge.from)?.push(edge.to);
  }

  const order: string[] = [];
  const remaining = new Set(ids);
  let guard = ids.length + 1;

  while (remaining.size > 0 && guard > 0) {
    guard -= 1;
    // Declaration order, not insertion order into the set, so the tie-break is
    // a property of the graph itself and not of the runtime's hash behaviour.
    const ready = ids.find((id) => remaining.has(id) && (indegree.get(id) ?? 0) === 0);
    if (ready === undefined) break;
    remaining.delete(ready);
    order.push(ready);
    for (const next of out.get(ready) ?? []) {
      const d = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, d);
    }
  }

  const cycles = remaining.size === 0 ? [] : findCycles([...remaining], graph);
  return { order, cycles };
}

/** Depth-first search restricted to the unresolved nodes, collecting back-edges. */
function findCycles(nodes: readonly string[], graph: ArgumentGraph): string[][] {
  const scope = new Set(nodes);
  const out = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (!scope.has(edge.from) || !scope.has(edge.to)) continue;
    const list = out.get(edge.from) ?? [];
    list.push(edge.to);
    out.set(edge.from, list);
  }

  const cycles: string[][] = [];
  const seenCycles = new Set<string>();
  const colour = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];

  const visit = (id: string): void => {
    colour.set(id, 1);
    stack.push(id);
    for (const next of out.get(id) ?? []) {
      const state = colour.get(next) ?? 0;
      if (state === 0) {
        visit(next);
      } else if (state === 1) {
        const start = stack.indexOf(next);
        if (start >= 0) {
          const cycle = stack.slice(start);
          // Canonicalise so the same loop is not reported from two entry points.
          const key = [...cycle].sort().join("|");
          if (!seenCycles.has(key)) {
            seenCycles.add(key);
            cycles.push(cycle);
          }
        }
      }
    }
    stack.pop();
    colour.set(id, 2);
  };

  for (const id of nodes) {
    if ((colour.get(id) ?? 0) === 0) visit(id);
  }
  return cycles;
}

/**
 * Effective weight of every node.
 *
 * **Rule.** Process nodes in topological order and set
 *
 *   `effective(n) = clamp01(own(n) + INHERITANCE * Σ incoming effective(m))`
 *
 * where incoming edges are signed: a `supports` edge adds its neighbour's
 * effective weight, an `attacks` edge subtracts it. `INHERITANCE` is 0.4, so a
 * move's influence on its target's standing is a little under half of its own —
 * influence decays along a chain rather than compounding into certainty. The
 * result is clamped to `[0, 1]` because `ArgumentMove.weight` is contractually
 * in that range and a node that exceeded it would not be renderable as "this
 * move carried the sitting".
 *
 * Nodes inside a cycle cannot be ordered, so they are resolved in declaration
 * order using only the weights already computed — deterministic, and honest
 * about the fact that a circular argument has no fixed point here.
 */
export function inheritedWeight(graph: ArgumentGraph): Record<string, number> {
  const { order, cycles } = topologicalOrder(graph);
  const cyclic = new Set(cycles.flat());
  const sequence = [...order, ...graph.nodes.map((n) => n.id).filter((id) => cyclic.has(id))];
  const index = nodeIndex(graph);

  const result: Record<string, number> = {};
  for (const id of sequence) {
    const node = index.get(id);
    if (node === undefined) continue;
    let carried = 0;
    for (const edge of graph.edges) {
      if (edge.to !== id) continue;
      const neighbour = result[edge.from];
      // Neighbours later in the sequence are inside a cycle; they are not yet
      // resolved, and counting them would make the result order-dependent.
      if (neighbour === undefined) continue;
      carried += edge.kind === "supports" ? neighbour : -neighbour;
    }
    result[id] = round(clamp(node.weight + INHERITANCE * carried, 0, 1), 4);
  }
  return result;
}

export interface WellFormedReport {
  readonly wellFormed: boolean;
  readonly problems: readonly string[];
}

/**
 * A well-formed argument graph has no dangling targets, no node attacking
 * itself, and no cycles. All three are reported, not just the first, so the app
 * can tell a user what to fix.
 */
export function isWellFormed(graph: ArgumentGraph): WellFormedReport {
  const problems: string[] = [];
  for (const entry of graph.dangling) problems.push(`dangling target: ${entry}`);
  for (const node of graph.nodes) {
    if (node.targets.includes(node.id)) problems.push(`self-attack: ${node.id}`);
  }
  for (const cycle of topologicalOrder(graph).cycles) {
    problems.push(`cycle: ${cycle.join(" -> ")}`);
  }
  return { wellFormed: problems.length === 0, problems };
}

/**
 * Render as a mermaid `flowchart TD`.
 *
 * Mermaid labels are quoted unconditionally: a bare label containing a space,
 * a bracket or a slash is a parse error in the diagram renderer, and the
 * diagram is embedded in prose docs as well as in the app. Double quotes are
 * escaped with the HTML entity mermaid understands.
 */
export function toMermaid(graph: ArgumentGraph): string {
  const lines: string[] = ["flowchart TD"];
  const alias = new Map<string, string>();

  graph.nodes.forEach((node, i) => {
    const safe = `n${i}`;
    alias.set(node.id, safe);
    const kindLabel = `${node.kind} · ${node.claim}`;
    lines.push(`  ${safe}["${escapeMermaid(kindLabel)}"]`);
  });

  for (const edge of graph.edges) {
    const from = alias.get(edge.from);
    const to = alias.get(edge.to);
    if (from === undefined || to === undefined) continue;
    lines.push(`  ${from} ${edge.kind === "attacks" ? "-.->" : "-->"} ${to}`);
  }

  lines.push("  %% attacks = dotted, supports = solid");
  return lines.join("\n");
}

function escapeMermaid(label: string): string {
  return label.replace(/"/g, "#quot;");
}

/** Advisors referenced by a graph, in first-appearance order. */
export function advisorsInGraph(graph: ArgumentGraph, advisors: readonly Advisor[]): Advisor[] {
  const order: string[] = [];
  for (const node of graph.nodes) {
    if (!order.includes(node.advisorId)) order.push(node.advisorId);
  }
  return order.flatMap((id) => advisors.filter((a) => a.id === id));
}