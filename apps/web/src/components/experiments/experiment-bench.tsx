"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Experiment } from "@repo/seed";
import type { SweepResponse } from "@/lib/sweeps";

const PHASE_STYLE: Record<string, string> = {
  safe: "border-verdigris/60 text-verdigris",
  warning: "border-gold/60 text-gold",
  critical: "border-crimson/60 text-crimson",
};

const W = 760;
const H = 280;
const PAD = { top: 16, right: 16, bottom: 34, left: 44 };

/**
 * The bench: drag a parameter, watch the metrics move.
 *
 * The chart is hand-plotted SVG rather than a charting dependency — it is one
 * polyline per metric over a fixed domain, and a chart library would be more bytes
 * than the entire rest of this component.
 */
export function ExperimentBench({ experiment }: { experiment: Experiment }) {
  const primary = experiment.parameters[0];
  const [key, setKey] = useState<string>(primary?.key ?? "");
  const [overrides, setOverrides] = useState<Record<string, number>>(() =>
    Object.fromEntries(experiment.parameters.map((parameter) => [parameter.key, parameter.defaultValue])),
  );
  const [data, setData] = useState<SweepResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);

  const activeParameter = experiment.parameters.find((parameter) => parameter.key === key);

  /**
   * `runSweep` is deliberately pure of state: it fetches and returns (or throws).
   * Event handlers own the `pending` flag; the mount effect only needs to apply a
   * result once the await has resolved, which is what keeps React from cascading
   * a render out of an effect body.
   */
  const runSweep = useCallback(async (): Promise<SweepResponse> => {
    const rest = { ...overrides };
    delete rest[key];
    const response = await fetch("/api/experiment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ experimentId: experiment.id, key, overrides: rest, steps: 24 }),
    });
    const payload: unknown = await response.json();
    if (!response.ok || typeof payload !== "object" || payload === null || "error" in payload) {
      throw new Error(
        typeof payload === "object" && payload !== null && "error" in payload
          ? String((payload as { error: unknown }).error)
          : `sweep failed with status ${response.status}`,
      );
    }
    return payload as SweepResponse;
  }, [experiment.id, key, overrides]);

  const applyResult = useCallback((result: SweepResponse) => {
    setData(result);
    setError(null);
    setPending(false);
  }, []);

  const sit = useCallback(() => {
    setPending(true);
    setError(null);
    void runSweep().then(applyResult).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "could not reach the simulation service");
      setPending(false);
    });
  }, [applyResult, runSweep]);

  // Mount (and re-run whenever the swept parameter or a fixed value changes).
  useEffect(() => {
    let cancelled = false;
    void runSweep().then(
      (result) => {
        if (!cancelled) applyResult(result);
      },
      (cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "could not reach the simulation service");
        setPending(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [applyResult, runSweep]);

  const metricKeys = useMemo(() => experiment.metrics.map((metric) => metric.key), [experiment.metrics]);
  const palette = useMemo(() => ["#D9A441", "#4FA88B", "#C8483F", "#5A6FD6", "#E08A3C"], []);

  const geometry = useMemo(() => {
    if (!data || !activeParameter) return null;
    const values = data.rows.map((row) => row.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const x = (value: number) => PAD.left + ((value - min) / span) * innerW;
    const y = (value: number) => PAD.top + (1 - value) * innerH;

    const lines = metricKeys.map((metricKey, index) => {
      const points = data.rows
        .map((row) => {
          const metric = row.metrics[metricKey];
          return metric === undefined ? null : `${x(row.value).toFixed(1)},${y(metric).toFixed(1)}`;
        })
        .filter((point): point is string => point !== null)
        .join(" ");
      return { metricKey, points, colour: palette[index % palette.length] };
    });

    const thresholdLines = [0.34, 0.67].map((threshold) => ({ threshold, y: y(threshold) }));

    return { x, y, lines, thresholdLines, min, max };
  }, [data, activeParameter, metricKeys, palette]);

  if (!activeParameter) return null;

  return (
    <section className="plate rounded-realm p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="eyebrow">The bench</h2>
        <span className="font-mono text-[11px] text-parchment-dim/70">{pending ? "computing…" : "deterministic"}</span>
      </div>

      <label className="mt-5 flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim/70">Sweep parameter</span>
        <select
          value={key}
          onChange={(event) => setKey(event.target.value)}
          className="max-w-xs rounded-realm border border-abyss-border bg-abyss px-4 py-2 text-sm text-parchment focus:border-gold focus:outline-none"
        >
          {experiment.parameters.map((parameter) => (
            <option key={parameter.key} value={parameter.key}>
              {parameter.label} ({parameter.unit})
            </option>
          ))}
        </select>
      </label>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {experiment.parameters
          .filter((parameter) => parameter.key !== key)
          .map((parameter) => (
            <label key={parameter.key} className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim/70">
                {parameter.label}
                <span className="ml-2 text-gold tabular">
                  {overrides[parameter.key]?.toFixed(2) ?? parameter.defaultValue.toFixed(2)}
                </span>
              </span>
              <input
                type="range"
                min={parameter.min}
                max={parameter.max}
                step={parameter.step}
                value={overrides[parameter.key] ?? parameter.defaultValue}
                onChange={(event) =>
                  setOverrides((current) => ({ ...current, [parameter.key]: Number(event.target.value) }))
                }
                className="accent-gold"
              />
              <span className="text-[11px] leading-relaxed text-parchment-dim/70">{parameter.gloss}</span>
            </label>
          ))}
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={sit} disabled={pending} className="rounded-realm border border-abyss-border px-4 py-2 font-mono text-xs text-parchment transition-colors hover:border-gold hover:text-gold disabled:opacity-50">
          {pending ? "computing…" : "recompute"}
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-5 rounded-realm border border-crimson/60 bg-crimson/10 p-4 text-sm text-crimson">
          {error}
        </p>
      ) : null}

      {geometry && data ? (
        <>
          <figure className="mt-8">
            <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${activeParameter.label} swept against each metric`}>
              <title>{activeParameter.label} swept against each metric</title>
              {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
                <g key={tick}>
                  <line
                    x1={PAD.left}
                    y1={geometry.y(tick)}
                    x2={W - PAD.right}
                    y2={geometry.y(tick)}
                    stroke="#1E2C4D"
                    strokeWidth="1"
                  />
                  <text x={PAD.left - 8} y={geometry.y(tick) + 3} textAnchor="end" fontSize="9" fill="#B9AE99" fontFamily="Consolas, monospace">
                    {tick.toFixed(2)}
                  </text>
                </g>
              ))}
              {geometry.thresholdLines.map((line) => (
                <line
                  key={line.threshold}
                  x1={PAD.left}
                  y1={line.y}
                  x2={W - PAD.right}
                  y2={line.y}
                  stroke="#C8483F"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.5"
                />
              ))}
              {geometry.lines.map((line) => (
                <polyline key={line.metricKey} points={line.points} fill="none" stroke={line.colour} strokeWidth="2" />
              ))}
              <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#1E2C4D" />
              <text
                x={(PAD.left + W - PAD.right) / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize="10"
                fill="#B9AE99"
                fontFamily="Consolas, monospace"
              >
                {activeParameter.label} ({activeParameter.unit})
              </text>
            </svg>
            <figcaption className="mt-2 flex flex-wrap gap-4">
              {experiment.metrics.map((metric, index) => (
                <span key={metric.key} className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-parchment-dim">
                  <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: palette[index % palette.length] }} aria-hidden />
                  {metric.label} ({metric.direction === "max" ? "higher better" : "lower better"})
                </span>
              ))}
            </figcaption>
          </figure>

          <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-abyss-border pt-5">
            <span className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${PHASE_STYLE[data.current.phase] ?? ""}`}>
              phase: {data.current.phase}
            </span>
            <dl className="flex flex-wrap gap-5">
              {Object.entries(data.current.metrics).map(([metricKey, value]) => (
                <div key={metricKey}>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-parchment-dim/70">{metricKey}</dt>
                  <dd className="font-mono text-sm text-parchment tabular">{value.toFixed(3)}</dd>
                </div>
              ))}
            </dl>
          </div>

          {data.current.notes.length > 0 ? (
            <ul className="mt-4 space-y-1.5">
              {data.current.notes.map((note) => (
                <li key={note} className="flex gap-2 text-xs leading-relaxed text-parchment-dim/80">
                  <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                  {note}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
