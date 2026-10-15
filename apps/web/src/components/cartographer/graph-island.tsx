"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ArgumentMove, AxiomKey } from "@repo/seed";
import {
  attackedNodes,
  buildGraph,
  inheritedWeight,
  isWellFormed,
  supportingNodes,
  targetsOf,
  toMermaid,
  topologicalOrder,
  type ArgumentGraph,
} from "@repo/core";

export interface GraphIslandProps {
  readonly moves: readonly ArgumentMove[];
  /** Move id → the move ids it presses against. Supplied because a move carries no targets. */
  readonly targets: Readonly<Record<string, readonly string[]>>;
  /** Move id → the advisor who made it; the engine cannot infer this from a move id. */
  readonly speakers: Readonly<Record<string, string>>;
  readonly advisorIds: readonly string[];
  readonly advisorNames: Readonly<Record<string, string>>;
  /** Objections nobody seated could answer, because nobody argued for their target. */
  readonly unanchored: readonly string[];
  readonly dilemmaTitle: string;
  readonly winnerLabel: string;
  readonly seed: number;
}

/* ------------------------------------------------------------------ *
 * Layout — deterministic by construction
 * ------------------------------------------------------------------ */

const NODE_W = 184;
const NODE_H = 96;
const GAP_X = 28;
const GAP_Y = 96;
const PAD = 18;
/** Roughly the character budget of a node box at 9px monospace. */
const CHARS_PER_LINE = 28;

interface Placement {
  readonly id: string;
  readonly column: number;
  readonly depth: number;
  readonly x: number;
  readonly y: number;
  readonly cyclic: boolean;
}

interface EdgeGeometry {
  readonly from: string;
  readonly to: string;
  readonly kind: "attacks" | "supports";
  readonly d: string;
  readonly labelX: number;
  readonly labelY: number;
  readonly labelAnchor: "start" | "middle";
}

interface Layout {
  readonly nodes: readonly Placement[];
  readonly edges: readonly EdgeGeometry[];
  readonly width: number;
  readonly height: number;
  readonly layers: number;
  /** Node ids in dependency order — every edge runs from earlier to later. */
  readonly order: readonly string[];
  /** Strongly-connected groups among the nodes that could not be ordered. */
  readonly cycles: readonly (readonly string[])[];
}

/**
 * Lay the graph out by hand: `x` from the topological order, `y` from depth.
 *
 * There is no jitter and no force simulation, so the same sitting always draws the same
 * picture — which is the whole reason the atlas is built out of seeded arithmetic. Nodes that
 * cannot be ordered (they sit in a cycle) are laid out after the ordered ones in declaration
 * order and flagged, because a circular argument is a finding to display rather than a crash.
 *
 * The order and the cycles come back with the layout so the caller never has to ask the engine
 * twice for the same answer.
 */
export function layoutGraph(graph: ArgumentGraph): Layout {
  const { order, cycles } = topologicalOrder(graph);
  const column = new Map<string, number>();
  order.forEach((id, index) => column.set(id, index));

  const cyclic = new Set(cycles.flat());
  let next = order.length;
  const unplaced = graph.nodes.filter((node) => !column.has(node.id)).map((node) => node.id);
  for (const id of unplaced) {
    column.set(id, next);
    next += 1;
  }

  // Depth is the longest path from a root, so a node sits below everything it leans on.
  const depth = new Map<string, number>();
  const sequence = [...order, ...unplaced];
  for (const id of sequence) {
    let best = 0;
    for (const edge of graph.edges) {
      if (edge.to !== id) continue;
      best = Math.max(best, (depth.get(edge.from) ?? 0) + 1);
    }
    depth.set(id, best);
  }

  const nodes: Placement[] = graph.nodes.map((node) => {
    const at = column.get(node.id) ?? 0;
    const level = depth.get(node.id) ?? 0;
    return {
      id: node.id,
      column: at,
      depth: level,
      x: PAD + at * (NODE_W + GAP_X),
      y: PAD + level * (NODE_H + GAP_Y),
      cyclic: cyclic.has(node.id),
    };
  });

  const boxOf = new Map(nodes.map((node) => [node.id, node]));
  const edges: EdgeGeometry[] = [];
  for (const edge of graph.edges) {
    const from = boxOf.get(edge.from);
    const to = boxOf.get(edge.to);
    if (from === undefined || to === undefined) continue;
    edges.push({ ...edge, ...geometry(from, to) });
  }

  const columns = nodes.reduce((max, node) => Math.max(max, node.column + 1), 1);
  const layers = nodes.reduce((max, node) => Math.max(max, node.depth + 1), 1);
  return {
    nodes,
    edges,
    layers,
    order,
    cycles,
    width: PAD * 2 + columns * NODE_W + (columns - 1) * GAP_X,
    height: PAD * 2 + layers * NODE_H + (layers - 1) * GAP_Y,
  };
}

/**
 * Anchor an edge to the sides of the two boxes it joins.
 *
 * `supports` runs downward (a premise standing behind a later move) and `attacks` runs upward
 * (an objection pressing against the position it answers), so the arrowhead always points at the
 * node that receives the influence. A same-layer edge — only possible inside a cycle — falls back
 * to the vertical sides so the line never draws through a box.
 */
function geometry(from: Placement, to: Placement): Pick<EdgeGeometry, "d" | "labelX" | "labelY" | "labelAnchor"> {
  if (from.y === to.y) {
    const x1 = from.x + NODE_W;
    const y1 = from.y + NODE_H / 2;
    const x2 = to.x;
    const y2 = to.y + NODE_H / 2;
    const bend = (x2 - x1) * 0.4;
    return {
      d: `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`,
      labelX: (x1 + x2) / 2,
      labelY: y1 - 8,
      labelAnchor: "middle",
    };
  }

  const downward = to.y > from.y;
  const x1 = from.x + NODE_W / 2;
  const y1 = downward ? from.y + NODE_H : from.y;
  const x2 = to.x + NODE_W / 2;
  const y2 = downward ? to.y : to.y + NODE_H;
  const bend = (y2 - y1) * 0.45;
  return {
    d: `M ${x1} ${y1} C ${x1} ${y1 + bend}, ${x2} ${y2 - bend}, ${x2} ${y2}`,
    labelX: downward ? x1 + 7 : x1 + 7,
    labelY: (y1 + y2) / 2,
    labelAnchor: "start",
  };
}

/** Two lines of at most `CHARS_PER_LINE` characters, broken at a space where one is near. */
function wrap(text: string): readonly [string, string] {
  const flat = text.trim().replace(/\s+/g, " ");
  if (flat.length <= CHARS_PER_LINE) return [flat, ""];
  const slice = flat.slice(0, CHARS_PER_LINE);
  const cut = slice.lastIndexOf(" ");
  const head = cut > CHARS_PER_LINE / 2 ? slice.slice(0, cut) : slice;
  return [head, `${flat.slice(head.length).slice(0, CHARS_PER_LINE - 1).trimEnd()}…`];
}

const EDGE_COLOUR: Record<"attacks" | "supports", string> = {
  attacks: "var(--color-crimson)",
  supports: "var(--color-verdigris)",
};

const KIND_COLOUR: Record<ArgumentMove["kind"], string> = {
  premise: "var(--color-verdigris)",
  objection: "var(--color-crimson)",
  appeal: "var(--color-gold)",
  synthesis: "var(--color-indigo-glow)",
};

/* ------------------------------------------------------------------ *
 * Island
 * ------------------------------------------------------------------ */

/**
 * The argument cartographer: one sitting drawn as a DAG.
 *
 * The engine produced the moves on the server; everything here is structure — an order, a depth, a
 * line between two boxes. The parts that are easy to get wrong and are therefore explicit:
 *
 *  - **Layout is a function of the graph**, not of the clock or a random seed. Same sitting, same
 *    picture, every time, which is what makes two graphs comparable.
 *  - **Every edge says what it is.** `attacks` and `supports` are drawn differently, labelled in
 *    full, and colour-coded, because an edge with no sign is a drawing rather than an argument.
 *  - **Structural problems are findings.** A cycle, a dangling target or a self-attack is printed
 *    as a finding with the engine's own wording; none of them stops the render.
 */
export function GraphIsland({
  moves,
  targets,
  speakers,
  advisorIds,
  advisorNames,
  unanchored,
  dilemmaTitle,
  winnerLabel,
  seed,
}: GraphIslandProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [showMermaid, setShowMermaid] = useState(false);

  const nodeRefs = useRef<Map<string, SVGGElement>>(new Map());
  const detailRef = useRef<HTMLHeadingElement>(null);

  const graph = useMemo(
    () =>
      buildGraph(moves, advisorIds, {
        targets,
        advisorOf: (move) => speakers[move.id] ?? move.id,
      }),
    [advisorIds, moves, speakers, targets],
  );

  const layout = useMemo(() => layoutGraph(graph), [graph]);
  const placed = layout.nodes;
  const cycles = layout.cycles;
  const weights = useMemo(() => inheritedWeight(graph), [graph]);
  const report = useMemo(() => isWellFormed(graph), [graph]);
  const mermaid = useMemo(() => toMermaid(graph), [graph]);

  const nodesById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph]);

  // Opening the panel moves the reader's focus into it, so the detail is announced rather than
  // silently appearing somewhere else on the page.
  useEffect(() => {
    if (selected !== null) detailRef.current?.focus();
  }, [selected]);

  const select = useCallback((id: string) => {
    setSelected((current) => (current === id ? null : id));
  }, []);

  const closeDetail = useCallback(() => {
    const previous = selected;
    setSelected(null);
    if (previous !== null) nodeRefs.current.get(previous)?.focus();
  }, [selected]);

  const copyMermaid = useCallback(() => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(mermaid);
        setNotice("Mermaid copied to the clipboard.");
      } catch {
        setShowMermaid(true);
        setNotice("The browser would not hand over the clipboard, so the diagram is open below — copy it from there.");
      }
    })();
  }, [mermaid]);

  const selectedNode = selected === null ? undefined : nodesById.get(selected);
  const connected = useMemo(() => {
    if (selected === null) return null;
    const ids = new Set<string>([selected]);
    for (const edge of graph.edges) {
      if (edge.from === selected) ids.add(edge.to);
      if (edge.to === selected) ids.add(edge.from);
    }
    return ids;
  }, [graph.edges, selected]);

  return (
    <section className="mt-10 flex flex-col gap-8" aria-labelledby="cartographer-graph-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 id="cartographer-graph-heading" className="eyebrow">
          The argument as a graph
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={copyMermaid}
            data-testid="cartographer-copy-mermaid"
            className="rounded-realm border border-abyss-border px-4 py-2 font-mono text-xs uppercase tracking-[0.16em] text-parchment transition-colors hover:border-gold hover:text-gold"
          >
            Copy mermaid
          </button>
          <button
            type="button"
            aria-expanded={showMermaid}
            aria-controls="cartographer-mermaid"
            onClick={() => setShowMermaid((open) => !open)}
            className="rounded-realm border border-abyss-border px-4 py-2 font-mono text-xs uppercase tracking-[0.16em] text-parchment-dim transition-colors hover:border-gold hover:text-gold"
          >
            {showMermaid ? "Hide mermaid" : "Show mermaid"}
          </button>
        </div>
      </div>

      <p role="status" aria-live="polite" className="min-h-5 text-xs text-verdigris">
        {notice}
      </p>

      {/* ---------------------------- structure ------------------------------- */}
      <section
        data-testid="cartographer-wellformed"
        className={`plate rounded-realm p-5 ${report.wellFormed ? "border-l-2 border-l-verdigris" : "border-l-2 border-l-crimson"}`}
      >
        <p
          className="font-mono text-[10px] uppercase tracking-[0.16em]"
          style={{ color: report.wellFormed ? "var(--color-verdigris)" : "var(--color-crimson)" }}
        >
          {report.wellFormed ? "Well-formed" : `${report.problems.length} structural findings`}
        </p>

        {report.wellFormed ? (
          <p className="mt-2 text-sm leading-relaxed text-parchment-dim">
            {graph.nodes.length} moves, {graph.edges.length} edges, no dangling targets, no
            self-attacks and no cycles. Every edge points at a move that is in the graph.
          </p>
        ) : (
          <div className="mt-2 space-y-3 text-sm leading-relaxed text-parchment-dim">
            {cycles.length > 0 ? (
              <p>
                This graph has a cycle. A circular argument is a real philosophical situation rather
                than a broken one, so it is drawn as a loop and the nodes inside it are resolved in
                declaration order instead of by influence.
              </p>
            ) : null}
            <ul className="space-y-1 font-mono text-[11px] text-crimson">
              {report.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
            {unanchored.length > 0 ? (
              <p>
                {unanchored.length === 1 ? "One objection is" : `${unanchored.length} objections are`}{" "}
                aimed at a course nobody on this bench argued for: {unanchored.join(", ")}. They are
                drawn without an attack edge because there is nothing in this sitting to attack.
              </p>
            ) : null}
          </div>
        )}
      </section>

      {/* -------------------------------- svg --------------------------------- */}
      {placed.length === 0 ? (
        <p className="plate rounded-realm p-8 text-sm leading-relaxed text-parchment-dim">
          This court scored every option and nobody pressed: there are no argument moves to draw.
          Try{" "}
          <Link href="/council" className="text-gold hover:underline">
            a panel with more than one option in play
          </Link>
          .
        </p>
      ) : (
        <div className="plate rounded-realm overflow-x-auto p-4">
          {/*
            `role="group"` rather than `role="img"`: the nodes below are focusable buttons, and an
            image role would hide every one of them from assistive technology.
          */}
          <svg
            data-testid="cartographer-graph"
            role="group"
            aria-label={`Argument graph for ${dilemmaTitle}: ${graph.nodes.length} moves, ${graph.edges.length} edges. Solid verdigris edges support, crimson edges attack, and each arrow points at the move that receives the influence.`}
            width={layout.width}
            height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            className="font-mono"
          >
            <defs>
              <marker
                id="cartographer-arrow-attacks"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" style={{ fill: "var(--color-crimson)" }} />
              </marker>
              <marker
                id="cartographer-arrow-supports"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" style={{ fill: "var(--color-verdigris)" }} />
              </marker>
            </defs>

            {layout.edges.map((edge) => {
              const dim = connected !== null && !(connected.has(edge.from) && connected.has(edge.to));
              return (
                <g key={`${edge.from}->${edge.to}`} opacity={dim ? 0.25 : 1}>
                  <path
                    d={edge.d}
                    fill="none"
                    strokeWidth={1.5}
                    strokeDasharray={edge.kind === "attacks" ? "4 3" : undefined}
                    markerEnd={`url(#cartographer-arrow-${edge.kind})`}
                    style={{ stroke: EDGE_COLOUR[edge.kind] }}
                  />
                  <text
                    x={edge.labelX}
                    y={edge.labelY}
                    fontSize={9}
                    textAnchor={edge.labelAnchor}
                    stroke="var(--color-abyss)"
                    strokeWidth={3}
                    paintOrder="stroke"
                    style={{ fill: EDGE_COLOUR[edge.kind] }}
                  >
                    {edge.kind}
                  </text>
                </g>
              );
            })}

            {layout.nodes.map((placement) => {
              const node = nodesById.get(placement.id);
              if (node === undefined) return null;
              const active = selected === placement.id;
              const dim = connected !== null && !connected.has(placement.id);
              const [lineOne, lineTwo] = wrap(node.claim);
              const speaker = advisorNames[node.advisorId] ?? node.advisorId;
              const carried = weights[placement.id] ?? node.weight;
              return (
                <g
                  key={placement.id}
                  data-testid="cartographer-node"
                  data-node-id={placement.id}
                  data-kind={node.kind}
                  data-depth={placement.depth}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  aria-label={`${speaker}, ${node.kind}: ${node.claim}. Weight ${node.weight.toFixed(3)}, carrying ${carried.toFixed(3)}.`}
                  onClick={() => select(placement.id)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    select(placement.id);
                  }}
                  ref={(element) => {
                    if (element === null) nodeRefs.current.delete(placement.id);
                    else nodeRefs.current.set(placement.id, element);
                  }}
                  opacity={dim ? 0.4 : 1}
                  className="cursor-pointer"
                >
                  <rect
                    x={placement.x}
                    y={placement.y}
                    width={NODE_W}
                    height={NODE_H}
                    rx={10}
                    style={{
                      fill: "var(--color-abyss-raised)",
                      stroke: active
                        ? "var(--color-gold)"
                        : placement.cyclic
                          ? "var(--color-crimson)"
                          : "var(--color-abyss-border)",
                      strokeWidth: active ? 2 : 1,
                    }}
                  />
                  <text
                    x={placement.x + 12}
                    y={placement.y + 20}
                    fontSize={10}
                    style={{ fill: KIND_COLOUR[node.kind] }}
                  >
                    {node.kind.toUpperCase()} · L{placement.depth}
                    {placement.cyclic ? " · IN CYCLE" : ""}
                  </text>
                  <text
                    x={placement.x + 12}
                    y={placement.y + 38}
                    fontSize={10}
                    style={{ fill: "var(--color-gold)" }}
                  >
                    {speaker.slice(0, CHARS_PER_LINE)}
                  </text>
                  <text x={placement.x + 12} y={placement.y + 56} fontSize={9} style={{ fill: "var(--color-parchment)" }}>
                    {lineOne}
                  </text>
                  <text x={placement.x + 12} y={placement.y + 68} fontSize={9} style={{ fill: "var(--color-parchment)" }}>
                    {lineTwo}
                  </text>
                  <text
                    x={placement.x + 12}
                    y={placement.y + 86}
                    fontSize={9}
                    style={{ fill: "var(--color-parchment-dim)" }}
                  >
                    {`w ${node.weight.toFixed(2)} → ${carried.toFixed(2)}`}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      <p className="text-xs leading-relaxed text-parchment-dim/70">
        Layer 0 is what had to be standing first. A premise supports the later moves its own advisor
        made; an objection or appeal attacks the premise of whoever argued for the course it
        answers. Weights are the move&rsquo;s own weight followed by what it carries after influence
        propagates along the edges.
      </p>

      {/* ------------------------------ detail -------------------------------- */}
      <section
        data-testid="cartographer-detail"
        aria-live="polite"
        aria-label="Move detail"
        className="plate rounded-realm p-6"
      >
        {selectedNode === undefined ? (
          <>
            <h3 className="eyebrow">No move selected</h3>
            <p className="mt-3 text-sm leading-relaxed text-parchment-dim">
              Choose a box in the graph to read the move in full: its claim, the premise behind it,
              the axis it leans on, and the weight it carries once everything pointing at it has been
              counted.
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 ref={detailRef} tabIndex={-1} className="serif text-xl leading-snug text-parchment">
                {advisorNames[selectedNode.advisorId] ?? selectedNode.advisorId} — {selectedNode.kind}
              </h3>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-realm border border-abyss-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-parchment-dim hover:border-gold hover:text-gold"
              >
                Close
              </button>
            </div>

            <p className="mt-4 text-base leading-relaxed text-parchment">{selectedNode.claim}</p>
            <p className="mt-3 text-sm italic leading-relaxed text-parchment-dim/90">
              {selectedNode.support}
            </p>

            <dl className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim/70">
                  Own weight
                </dt>
                <dd className="tabular serif mt-1 text-2xl text-parchment">
                  {selectedNode.weight.toFixed(4)}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim/70">
                  Carrying
                </dt>
                <dd className="tabular serif mt-1 text-2xl text-gold">
                  {(weights[selectedNode.id] ?? selectedNode.weight).toFixed(4)}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim/70">
                  Leans on
                </dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {selectedNode.leansOn.map((axiom: AxiomKey) => (
                    <span
                      key={axiom}
                      className="rounded-full border border-abyss-border px-2 py-0.5 font-mono text-[10px] text-parchment-dim"
                    >
                      {axiom}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>

            <div className="mt-6 grid gap-5 border-t border-abyss-border pt-5 sm:grid-cols-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-crimson">
                  Attacked by ({attackedNodes(graph, selectedNode.id).length})
                </p>
                <ul className="mt-2 space-y-1 text-xs leading-relaxed text-parchment-dim">
                  {attackedNodes(graph, selectedNode.id).map((node) => (
                    <li key={node.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(node.id)}
                        className="text-left text-crimson hover:underline"
                      >
                        {advisorNames[node.advisorId] ?? node.advisorId} — {node.kind}
                      </button>
                    </li>
                  ))}
                  {attackedNodes(graph, selectedNode.id).length === 0 ? <li>nothing on this bench</li> : null}
                </ul>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-verdigris">
                  Supported by ({supportingNodes(graph, selectedNode.id).length})
                </p>
                <ul className="mt-2 space-y-1 text-xs leading-relaxed text-parchment-dim">
                  {supportingNodes(graph, selectedNode.id).map((node) => (
                    <li key={node.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(node.id)}
                        className="text-left text-verdigris hover:underline"
                      >
                        {advisorNames[node.advisorId] ?? node.advisorId} — {node.kind}
                      </button>
                    </li>
                  ))}
                  {supportingNodes(graph, selectedNode.id).length === 0 ? <li>nothing on this bench</li> : null}
                </ul>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-indigo-glow">
                  Presses against ({targetsOf(graph, selectedNode.id).length})
                </p>
                <ul className="mt-2 space-y-1 text-xs leading-relaxed text-parchment-dim">
                  {targetsOf(graph, selectedNode.id).map((node) => (
                    <li key={node.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(node.id)}
                        className="text-left text-indigo-glow hover:underline"
                      >
                        {advisorNames[node.advisorId] ?? node.advisorId} — {node.kind}
                      </button>
                    </li>
                  ))}
                  {targetsOf(graph, selectedNode.id).length === 0 ? <li>nothing in this sitting</li> : null}
                </ul>
              </div>
            </div>

            <p className="mt-5 border-t border-abyss-border pt-4 font-mono text-[10px] text-parchment-dim/60">
              move {selectedNode.moveId} · advisor {selectedNode.advisorId}
            </p>
          </>
        )}
      </section>

      {/* ------------------------------ mermaid ------------------------------- */}
      {showMermaid ? (
        <div id="cartographer-mermaid" className="plate rounded-realm overflow-x-auto p-5">
          <p className="eyebrow">flowchart TD — attacks dotted, supports solid</p>
          <pre className="mt-3 font-mono text-[11px] leading-relaxed text-parchment-dim">{mermaid}</pre>
        </div>
      ) : null}

      <p className="border-t border-abyss-border pt-6 text-sm leading-relaxed text-parchment-dim/80">
        Seed {seed} · {dilemmaTitle} · the court returned {winnerLabel}. The same seed draws the same
        graph, so two panels can be compared as pictures. Read the{" "}
        <Link href="/method" className="text-gold hover:underline">
          method
        </Link>{" "}
        for the arithmetic behind every weight, or take the same sitting as{" "}
        <Link href="/journal" className="text-gold hover:underline">
          questions to answer
        </Link>
        .
      </p>
    </section>
  );
}
