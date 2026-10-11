import type { AxiomVector, Verdict } from "@repo/seed/types";
import { DIMENSION_META } from "@repo/seed/types";
import { AXIOM_COLORS } from "../lib/palette";
import { cn } from "../lib/cn";
import { ordinalColors } from "../lib/scales";

/**
 * Where a stance sits across the six moral dimensions.
 *
 * Six opposed poles on one axis each — this is the component that makes the
 * difference between two kingdoms legible in a second, so it gets a real
 * legend, real numbers and a text summary for anyone who cannot use the hues.
 */
export interface StanceMeterProps {
  value: AxiomVector;
  label: string;
  /** Optional comparison vector drawn as a ghost behind the main reading. */
  compare?: AxiomVector;
  compareLabel?: string;
  /** Optional overall verdict chip. */
  verdict?: Verdict;
  size?: "sm" | "md";
  className?: string;
}

export function StanceMeter({
  value,
  label,
  compare,
  compareLabel,
  verdict,
  size = "md",
  className,
}: StanceMeterProps) {
  const entries = Object.entries(DIMENSION_META);
  // Axis colours come from the axiom keys, assigned deterministically.
  const colours = ordinalColors(
    entries.map(([key]) => key),
    Object.values(AXIOM_COLORS),
  );

  return (
    <div className={cn("flex flex-col gap-3", className)} aria-label={label} role="group">
      <ul className={cn("flex flex-col gap-2", size === "sm" ? "gap-1.5" : "gap-2.5")}>
        {entries.map(([key, meta]) => {
          const reading = value[key as keyof AxiomVector];
          const ghost = compare?.[key as keyof AxiomVector];
          const colour = colours.get(key) ?? "var(--color-gold)";
          const [pole, antiPole] = meta.pole;
          const leaning = reading >= 0.5 ? pole : antiPole;
          return (
            <li key={key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-parchment-dim">
                  {meta.label}
                </span>
                <span className="font-mono text-[10px] tabular-nums" style={{ color: colour }}>
                  {reading.toFixed(2)} · {leaning}
                </span>
              </div>
              <span
                aria-hidden="true"
                className="relative block h-1.5 w-full border border-abyss-border bg-abyss"
              >
                {ghost === undefined ? null : (
                  <span
                    className="absolute inset-y-0 border-r border-parchment-dim/70"
                    style={{ left: `${Math.min(100, Math.max(0, ghost * 100))}%` }}
                  />
                )}
                <span
                  className="absolute inset-y-0 left-0"
                  style={{ width: `${Math.min(100, Math.max(0, reading * 100))}%`, background: colour }}
                />
                <span className="absolute inset-y-[-3px] left-1/2 w-px bg-abyss-border" />
              </span>
              {size === "sm" ? null : (
                <span className="flex justify-between text-[9px] uppercase tracking-[0.12em] text-parchment-dim/70">
                  <span>{antiPole}</span>
                  <span>{pole}</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {verdict === undefined ? null : (
        <p className="border-t border-abyss-border pt-2 text-[11px] uppercase tracking-[0.16em] text-gold">
          Overall · {verdict}
          {compareLabel === undefined ? null : <span className="ml-2 text-parchment-dim">vs {compareLabel}</span>}
        </p>
      )}
    </div>
  );
}