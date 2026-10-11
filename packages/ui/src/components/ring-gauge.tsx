import { cn } from "../lib/cn";
import { arcPath } from "../lib/scales";
import { withAlpha } from "../lib/palette";

/**
 * Ring gauge for a single 0..1 reading.
 *
 * Starts at twelve o'clock and sweeps clockwise — the compass convention the
 * whole atlas uses — so two gauges side by side can be compared at a glance.
 */
export interface RingGaugeProps {
  /** 0..1, clamped. */
  value: number;
  label: string;
  /** Pre-formatted centre readout. */
  readout?: string;
  size?: number;
  thickness?: number;
  color?: string;
  /** Draws a faint remainder arc behind the value. */
  track?: boolean;
  /** Degrees swept by the full value; 360 for a dial, less for a gauge. */
  sweep?: number;
  className?: string;
}

export function RingGauge({
  value,
  label,
  readout,
  size = 96,
  thickness = 8,
  color = "var(--color-gold)",
  track = true,
  sweep = 360,
  className,
}: RingGaugeProps) {
  const safe = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const radius = 50 - thickness / 2;
  const arc = arcPath(50, 50, radius, 0, Math.max(0.001, sweep * safe));
  const trackArc = track && safe < 1 ? arcPath(50, 50, radius, sweep * safe, sweep) : "";

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`${label}: ${Math.round(safe * 100)} percent`}
      className={cn("shrink-0", className)}
    >
      <title>{`${label}: ${Math.round(safe * 100)}%`}</title>
      <circle cx={50} cy={50} r={radius} fill="none" stroke="var(--color-abyss-border)" strokeWidth={thickness} />
      {trackArc === "" ? null : (
        <path d={trackArc} fill="none" stroke={withAlpha(color, 0.18)} strokeWidth={thickness} strokeLinecap="butt" />
      )}
      <path
        d={arc}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      {readout === undefined ? null : (
        <text
          x={50}
          y={50}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={18}
          fill="var(--color-parchment)"
          style={{ fontFamily: "var(--font-display, serif)" }}
        >
          {readout}
        </text>
      )}
    </svg>
  );
}