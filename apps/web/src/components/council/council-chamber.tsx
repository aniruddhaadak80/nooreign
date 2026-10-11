"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import type { ConveneResponse } from "@/lib/convene";

const ROUND_LABELS: Record<number, string> = { 1: "positions", 2: "objections", 3: "appeals" };

function labelFor(result: ConveneResponse, id: string): string {
  return result.optionLabels.find((option) => option.id === id)?.label ?? id;
}

/**
 * The council chamber: choose a dilemma, seat a panel, read the verdict and the
 * arithmetic that produced it.
 *
 * Deliberation runs on the server (`/api/deliberate`) rather than in the browser,
 * because the engine imports the typed datasets and the trace has to be the same
 * object the server would have rendered. The client only manages the sitting.
 */
export function CouncilChamber({
  initial,
  dilemmas,
  advisors,
  defaultSeed,
}: {
  initial: ConveneResponse;
  dilemmas: { id: string; title: string; slug: string; kingdomOrigin: string }[];
  advisors: { id: string; name: string; kingdomId: string; kingdomName: string; glyph: string }[];
  defaultSeed: number;
}) {
  const [result, setResult] = useState<ConveneResponse>(initial);
  const [panel, setPanel] = useState<string[]>(() => initial.advisors.map((advisor) => advisor.id));
  const [dilemmaId, setDilemmaId] = useState<string>(initial.dilemmaId);
  const [seed, setSeed] = useState<number>(defaultSeed);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sit = useCallback(
    async (nextDilemma: string, nextPanel: string[], nextSeed: number) => {
      setPending(true);
      setError(null);
      try {
        const response = await fetch("/api/deliberate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ dilemmaId: nextDilemma, advisorIds: nextPanel, seed: nextSeed }),
        });
        const payload: unknown = await response.json();
        if (!response.ok || typeof payload !== "object" || payload === null || "error" in payload) {
          setError(
            typeof payload === "object" && payload !== null && "error" in payload
              ? String((payload as { error: unknown }).error)
              : `council failed with status ${response.status}`,
          );
          return;
        }
        setResult(payload as ConveneResponse);
      } catch {
        setError("could not reach the council service");
      } finally {
        setPending(false);
      }
    },
    [],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, { kingdomId: string; kingdomName: string; glyph: string; members: { id: string; name: string }[] }>();
    for (const advisor of advisors) {
      const entry = map.get(advisor.kingdomId) ?? {
        kingdomId: advisor.kingdomId,
        kingdomName: advisor.kingdomName,
        glyph: advisor.glyph,
        members: [],
      };
      entry.members.push({ id: advisor.id, name: advisor.name });
      map.set(advisor.kingdomId, entry);
    }
    return [...map.values()];
  }, [advisors]);

  const toggle = (advisorId: string) => {
    const next = panel.includes(advisorId)
      ? panel.filter((id) => id !== advisorId)
      : [...panel, advisorId].slice(-6);
    if (next.length === 0) return;
    setPanel(next);
    void sit(dilemmaId, next, seed);
  };

  return (
    <div className="mt-10 flex flex-col gap-8">
      {/* ------------------------------- controls ------------------------------ */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr_auto]">
        <label className="flex flex-col gap-2">
          <span className="eyebrow">Dilemma</span>
          <select
            value={dilemmaId}
            onChange={(event) => {
              setDilemmaId(event.target.value);
              void sit(event.target.value, panel, seed);
            }}
            className="rounded-realm border border-abyss-border bg-abyss-raised/70 px-4 py-2.5 text-sm text-parchment focus:border-gold focus:outline-none"
          >
            {dilemmas.map((dilemma) => (
              <option key={dilemma.id} value={dilemma.id}>
                {dilemma.title}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="eyebrow">Seed — same seed, same verdict</span>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={9999}
              step={1}
              value={seed}
              onChange={(event) => setSeed(Number(event.target.value))}
              onPointerUp={() => void sit(dilemmaId, panel, seed)}
              className="flex-1 accent-gold"
            />
            <input
              type="number"
              value={seed}
              onChange={(event) => setSeed(Number(event.target.value))}
              onBlur={() => void sit(dilemmaId, panel, seed)}
              className="w-24 rounded-realm border border-abyss-border bg-abyss-raised/70 px-3 py-2 font-mono text-xs text-parchment focus:border-gold focus:outline-none"
              aria-label="Seed value"
            />
          </div>
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void sit(dilemmaId, panel, seed)}
            disabled={pending}
            className="rounded-realm bg-gold px-5 py-2.5 font-mono text-sm text-ink disabled:opacity-60"
          >
            {pending ? "Sitting…" : "Reconvene"}
          </button>
        </div>
      </div>

      {/* -------------------------------- panel ------------------------------- */}
      <section className="plate rounded-realm p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="eyebrow">The panel ({panel.length} seated)</h2>
          <p className="font-mono text-[11px] text-parchment-dim/70">maximum six</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {grouped.map((kingdom) => (
            <div key={kingdom.kingdomId} className="flex flex-wrap items-center gap-1.5">
              {kingdom.members.map((member) => {
                const seated = panel.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    aria-pressed={seated}
                    onClick={() => toggle(member.id)}
                    title={`${member.name} — ${kingdom.kingdomName}`}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      seated
                        ? "border-gold bg-gold/15 text-parchment"
                        : "border-abyss-border text-parchment-dim/60 hover:border-parchment-dim"
                    }`}
                  >
                    <span className="mr-1.5 opacity-70" aria-hidden>
                      {kingdom.glyph}
                    </span>
                    {member.name}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {error ? (
        <p role="alert" className="rounded-realm border border-crimson/60 bg-crimson/10 p-4 text-sm text-crimson">
          {error}
        </p>
      ) : null}

      {/* ------------------------------- verdict ------------------------------ */}
      <section className="plate rounded-realm p-8" data-testid="verdict">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="eyebrow">Verdict — {result.dilemmaTitle}</p>
            <h2 className="serif mt-3 text-3xl leading-tight text-gold" data-testid="verdict-winner">
              {labelFor(result, result.winnerId)}
            </h2>
            <p className="mt-3 font-mono text-xs text-parchment-dim/80" data-testid="verdict-meta">
              margin {result.margin.toFixed(3)} · confidence {result.confidence.toFixed(3)} · seed{" "}
              {result.seed} · decided on <span className="text-gold">{result.decidingAxis}</span>
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-6 text-right">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim/70">seated</dt>
              <dd className="serif mt-1 text-2xl text-parchment tabular">{result.participating}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim/70">quorum</dt>
              <dd className="serif mt-1 text-2xl text-parchment tabular">{result.quorum}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim/70">traces</dt>
              <dd className="serif mt-1 text-2xl text-parchment tabular">{result.traces.length}</dd>
            </div>
          </dl>
        </div>

        {result.narrative.length > 0 ? (
          <ul className="mt-6 space-y-2 border-t border-abyss-border pt-5">
            {result.narrative.map((line) => (
              <li key={line} className="flex gap-3 text-sm leading-relaxed text-parchment-dim">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold" />
                {line}
              </li>
            ))}
          </ul>
        ) : null}

        {result.dissent && result.dissent.dissenters.length > 0 ? (
          <div className="mt-6 rounded-realm border border-crimson/40 bg-crimson/5 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-crimson">Minority report</p>
            <p className="mt-2 text-sm leading-relaxed text-parchment">{result.dissent.summary}</p>
            <ul className="mt-3 space-y-1">
              {result.dissent.dissenters.map((dissent) => (
                <li key={dissent.advisorId} className="text-xs leading-relaxed text-parchment-dim">
                  {dissent.advisorName} preferred {labelFor(result, dissent.preferredOptionId)}, behind by{" "}
                  {dissent.gapToWinner.toFixed(3)}
                </li>
              ))}
            </ul>
            {result.dissent.strongest ? (
              <p className="mt-3 border-t border-crimson/20 pt-3 text-sm italic leading-relaxed text-parchment-dim/90">
                “{result.dissent.strongest.claim}” — {result.dissent.strongest.advisorName}, on{" "}
                {result.dissent.strongest.leansOn.join(" and ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* ------------------------------- ballots ------------------------------ */}
      <section className="plate rounded-realm p-6">
        <h2 className="eyebrow">The ballot</h2>
        <ul className="mt-4 space-y-3">
          {result.ballots.map((ballot) => {
            const total = result.ballots.reduce((sum, row) => sum + row.total, 0) || 1;
            const share = ballot.total / total;
            return (
              <li key={ballot.optionId}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm text-parchment">{labelFor(result, ballot.optionId)}</span>
                  <span className="font-mono text-xs text-parchment-dim tabular">
                    {ballot.total.toFixed(3)} · {Math.round(share * 100)}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-abyss-border">
                  <div
                    className={`h-full rounded-full ${ballot.optionId === result.winnerId ? "bg-gold" : "bg-indigo-glow/70"}`}
                    style={{ width: `${Math.max(2, share * 100)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ------------------------------ positions ----------------------------- */}
      <section>
        <h2 className="eyebrow">Round 1 — positions</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-abyss-border">
                <th scope="col" className="eyebrow px-3 py-2">Advisor</th>
                <th scope="col" className="eyebrow px-3 py-2">Realm</th>
                <th scope="col" className="eyebrow px-3 py-2">Backs</th>
                <th scope="col" className="eyebrow px-3 py-2">Profile</th>
                <th scope="col" className="eyebrow px-3 py-2 text-right">Top score</th>
              </tr>
            </thead>
            <tbody>
              {result.positions.map((position) => (
                <tr key={position.advisorId} className="border-b border-abyss-border/50">
                  <td className="px-3 py-2.5 text-parchment">{position.advisorName}</td>
                  <td className="px-3 py-2.5 text-parchment-dim/80">
                    {position.kingdomId ? result.kingdomLabels[position.kingdomId] ?? position.kingdomId : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-parchment-dim">{labelFor(result, position.topOptionId)}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-parchment-dim/70">{position.profile}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-gold tabular">
                    {(position.ranking[0]?.score ?? 0).toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------ objections ---------------------------- */}
      {result.objections.length > 0 ? (
        <section>
          <h2 className="eyebrow">Round 2 — objections</h2>
          <ul className="mt-4 space-y-3">
            {result.objections.map((objection) => (
              <li key={`${objection.advisorId}-${objection.moveId}`} className="plate rounded-realm border-l-2 border-crimson/60 p-5">
                <p className="text-sm leading-relaxed text-parchment">
                  <span className="text-crimson">{objection.advisorName}</span>{" "}
                  <span className="text-parchment-dim">against</span> {labelFor(result, objection.targetedOptionId)}
                </p>
                <p className="mt-2 text-sm italic leading-relaxed text-parchment-dim/90">{objection.claim}</p>
                <p className="mt-2 font-mono text-[11px] text-parchment-dim/60">
                  answering {objection.adversaryName} · weight {objection.trace.total.toFixed(3)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* -------------------------------- trace ------------------------------- */}
      <section>
        <h2 className="eyebrow">The trace — this is the arithmetic, not a narration of it</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-parchment-dim">
          Every row below is the engine&rsquo;s own record: each axis weight, each option delta, the product,
          the normalised subtotal, the seeded jitter, and the rounded total that decided the case. Round
          them yourself and you get the same number.
        </p>
        <div className="mt-6 space-y-4">
          {result.traces.map((trace, index) => (
            <article key={`${trace.moveId}-${trace.advisorId}-${index}`} className="plate rounded-realm p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
                    r{trace.round} {ROUND_LABELS[trace.round] ?? ""} · {trace.kind}
                  </span>
                  <span className="text-sm text-parchment">{trace.advisorName}</span>
                </div>
                <span className="font-mono text-xs text-parchment-dim">
                  → {labelFor(result, trace.optionId)}
                </span>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-parchment">{trace.claim}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-parchment-dim/80">{trace.premise}</p>

              <table className="mt-4 w-full border-collapse text-left font-mono text-[11px]">
                <thead>
                  <tr className="text-parchment-dim/70">
                    <th scope="col" className="py-1 pr-4 font-normal">axis</th>
                    <th scope="col" className="py-1 pr-4 font-normal">weight</th>
                    <th scope="col" className="py-1 pr-4 font-normal">delta</th>
                    <th scope="col" className="py-1 pr-4 font-normal">product</th>
                  </tr>
                </thead>
                <tbody>
                  {trace.contributions.map((contribution) => (
                    <tr key={contribution.axiom} className="border-t border-abyss-border/40">
                      <td className="py-1 pr-4 text-parchment-dim">{contribution.axiom}</td>
                      <td className="py-1 pr-4 text-parchment-dim tabular">{contribution.weight.toFixed(3)}</td>
                      <td className="py-1 pr-4 text-parchment-dim tabular">{contribution.delta.toFixed(3)}</td>
                      <td className="py-1 pr-4 text-verdigris tabular">{contribution.product.toFixed(4)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-abyss-border/70">
                    <td className="py-1.5 pr-4 text-parchment-dim" colSpan={3}>
                      subtotal {trace.subtotal.toFixed(4)} + jitter {trace.jitter >= 0 ? "+" : ""}
                      {trace.jitter.toFixed(4)}
                    </td>
                    <td className="py-1.5 pr-4 text-gold tabular">= {trace.total.toFixed(4)}</td>
                  </tr>
                </tbody>
              </table>
            </article>
          ))}
        </div>
      </section>

      <p className="border-t border-abyss-border pt-6 text-sm text-parchment-dim/80">
        Want the same case from the other courts?{" "}
        <Link href="/kingdoms" className="text-gold hover:underline">
          Seat a different realm
        </Link>{" "}
        or read{" "}
        <Link href="/method" className="text-gold hover:underline">
          how the engine decides
        </Link>
        .
      </p>
    </div>
  );
}
