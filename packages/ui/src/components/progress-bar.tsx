import { cn } from "../lib/cn";

/**
 * Determinate progress. A real `role="progressbar"` with the value wired up,
 * because these bars carry meaning (technique adoption, maturity) that a
 * decorative width would hide from assistive tech.
 */
export interface ProgressBarProps {
  /** 0..1. */
  value: number;
  label: string;
  /** Text shown at the right of the header row. */
  valueLabel?: string;
  size?: "sm" | "md";
  tone?: "gold" | "verdigris" | "crimson" | "glow" | "parchment";
  /** Thin ticks behind the fill, e.g. one per maturity stage. */
  segments?: number;
  className?: string;
}

const TONES = {
  gold: "bg-gold",
  verdigris: "bg-verdigris",
  crimson: "bg-crimson",
  glow: "bg-indigo-glow",
  parchment: "bg-parchment",
} as const;

export function ProgressBar({
  value,
  label,
  valueLabel,
  size = "md",
  tone = "gold",
  segments,
  className,
}: ProgressBarProps) {
  const safe = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const percent = Math.round(safe * 100);
  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-parchment-dim">{label}</span>
        {valueLabel === undefined ? null : (
          <span className="font-mono text-[11px] tabular-nums text-parchment">{valueLabel}</span>
        )}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          "relative w-full overflow-hidden rounded-full border border-abyss-border bg-abyss",
          size === "sm" ? "h-1" : "h-1.5",
        )}
      >
        <span
          className={cn("absolute inset-y-0 left-0", TONES[tone])}
          style={{ width: `${percent}%` }}
        />
        {segments === undefined || segments <= 1 ? null : (
          <span aria-hidden="true" className="absolute inset-0 flex">
            {Array.from({ length: segments - 1 }, (_, index) => (
              <span key={index} className="flex-1 border-r border-abyss/80" />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}