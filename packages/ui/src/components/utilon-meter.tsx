import { cn } from "../lib/cn";
import { formatUtilons } from "../lib/format";
import { BarMeter } from "./bar-meter";

/**
 * The cost of running a deliberation. Shown against a ceiling rather than as a
 * bare number, because the interesting question is never "how much" but "how
 * much of what we are willing to spend".
 */
export interface UtilonMeterProps {
  spent: number;
  /** Budget ceiling; the rail is the ceiling. */
  budget: number;
  label?: string;
  /** Per-advisor breakdown drawn as segments. */
  breakdown?: readonly { key: string; label: string; value: number; color: string }[];
  /** Warns when the run exceeds the budget. */
  onError?: "none" | "warn" | "stop";
  className?: string;
}

export function UtilonMeter({
  spent,
  budget,
  label = "Deliberation cost",
  breakdown,
  onError = "warn",
  className,
}: UtilonMeterProps) {
  const ceiling = Math.max(1e-9, budget);
  const ratio = spent / ceiling;
  const over = ratio > 1;
  const critical = over ? onError !== "none" : ratio > 0.85;
  const color = over ? "var(--color-crimson)" : critical ? "var(--color-gold)" : "var(--color-verdigris)";
  const clamped = Math.min(1.25, Math.max(0, ratio));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-parchment-dim">{label}</span>
        <span className="font-mono text-[12px] tabular-nums" style={{ color }}>
          {formatUtilons(spent)}
          <span className="text-parchment-dim"> / {formatUtilons(budget)}</span>
        </span>
      </div>

      <BarMeter value={clamped} label={`${label}: ${Math.round(ratio * 100)} percent of budget`} color={color} height={10} fill />

      {breakdown === undefined || breakdown.length === 0 ? null : (
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {breakdown.map((entry) => (
            <li key={entry.key} className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-parchment-dim">
              <span aria-hidden="true" className="size-2 rounded-[2px]" style={{ background: entry.color }} />
              {entry.label}
              <span className="font-mono tabular-nums">{formatUtilons(entry.value)}</span>
            </li>
          ))}
        </ul>
      )}

      {over && onError !== "none" ? (
        <p className="text-[11px] text-crimson">
          {onError === "stop"
            ? "Budget exhausted — the deliberation is halted before the next move."
            : "Over ceiling — the council is answering beyond what the treasury approved."}
        </p>
      ) : null}
    </div>
  );
}