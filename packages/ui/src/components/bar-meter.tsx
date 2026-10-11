import { cn } from "../lib/cn";
import { withAlpha } from "../lib/palette";

/**
 * Single-axis meter. The bar is a rectangle, not a rounded pill, so a column of
 * these lines up on an 8px grid and reads as an instrument scale.
 */
export interface BarMeterProps {
  /** 0..1, clamped. */
  value: number;
  label: string;
  color?: string;
  tone?: "plain" | "filled" | "outline";
  /** Rail height in pixels. */
  height?: number;
  /** Small tick marks at these values. */
  markers?: readonly number[];
  /** Formats the readout at the right; omit for a bare bar. */
  valueLabel?: string;
  className?: string;
  /** Full-width variant used inside table cells. */
  fill?: boolean;
}

export function BarMeter({
  value,
  label,
  color = "var(--color-gold)",
  tone = "filled",
  height = 8,
  markers,
  valueLabel,
  className,
  fill = false,
}: BarMeterProps) {
  const safe = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const percent = Math.round(safe * 100);
  const rail = tone === "filled" ? withAlpha(color, 0.18) : undefined;

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("flex items-center gap-2", fill ? "w-full" : "min-w-[120px]", className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative block overflow-hidden border border-abyss-border",
          tone === "outline" ? "bg-transparent" : "bg-abyss",
          fill ? "w-full" : "w-24",
        )}
        style={{ height }}
      >
        {rail === undefined ? null : <span className="absolute inset-0" style={{ background: rail }} />}
        <span
          className="absolute inset-y-0 left-0"
          style={{ width: `${percent}%`, background: color }}
        />
        {markers === undefined
          ? null
          : markers.map((marker) => (
              <span
                key={marker}
                className="absolute inset-y-0 w-px bg-abyss"
                style={{ left: `${Math.min(100, Math.max(0, marker * 100))}%` }}
              />
            ))}
      </span>
      {valueLabel === undefined ? null : (
        <span className="font-mono text-[10px] tabular-nums text-parchment-dim">{valueLabel}</span>
      )}
    </div>
  );
}