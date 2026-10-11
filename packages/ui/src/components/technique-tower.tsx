import type { Technique } from "@repo/seed/types";
import { formatYear } from "../lib/format";
import { cn } from "../lib/cn";
import { AXIOM_COLORS } from "../lib/palette";
import { Badge } from "./badge";

/**
 * One technique as a spire: base width is maturity, the flag at the top is the
 * year it was introduced, and the covered axioms are the crenellations. The
 * metaphor is the alignment stack, so it is drawn as one.
 */
export interface TechniqueTowerProps {
  technique: Technique;
  href?: string;
  /** Height in pixels. */
  height?: number;
  width?: number;
  /** Draws a ghost tower behind for comparison (e.g. a proposed technique). */
  compareMaturity?: number;
  selected?: boolean;
  className?: string;
}

const round = (value: number): number => Math.round(value * 100) / 100;

export function TechniqueTower({
  technique,
  href,
  height = 180,
  width = 120,
  compareMaturity,
  selected = false,
  className,
}: TechniqueTowerProps) {
  const maturity = Math.min(1, Math.max(0, technique.maturity));
  const cx = width / 2;
  const baseY = height - 26;
  const spireTop = 22;
  const shaftWidth = 12 + maturity * (width * 0.5);
  const spire =
    `M${round(cx - shaftWidth / 2)},${round(baseY)} L${round(cx - shaftWidth / 2)},${round(spireTop + 18)}` +
    ` L${round(cx)},${round(spireTop)} L${round(cx + shaftWidth / 2)},${round(spireTop + 18)}` +
    ` L${round(cx + shaftWidth / 2)},${round(baseY)} Z`;
  const comparison =
    compareMaturity === undefined
      ? null
      : `M${round(cx - (12 + Math.min(1, Math.max(0, compareMaturity)) * width * 0.5) / 2)},${round(baseY)}` +
        ` L${round(cx - (12 + Math.min(1, Math.max(0, compareMaturity)) * width * 0.5) / 2)},${round(spireTop + 18)}` +
        ` L${round(cx)},${round(spireTop)} L${round(cx + (12 + Math.min(1, Math.max(0, compareMaturity)) * width * 0.5) / 2)},${round(spireTop + 18)}` +
        ` L${round(cx + (12 + Math.min(1, Math.max(0, compareMaturity)) * width * 0.5) / 2)},${round(baseY)} Z`;

  const body = (
    <>
      <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" role="img" aria-label={`${technique.name}: maturity ${Math.round(maturity * 100)} percent`}>
        <title>{`${technique.name} — maturity ${Math.round(maturity * 100)}%`}</title>
        <line x1={cx} y1={spireTop} x2={cx} y2={baseY} stroke="var(--color-abyss-border)" strokeWidth={0.75} />
        {comparison === null ? null : <path d={comparison} fill="var(--color-abyss-raised)" stroke="var(--color-parchment-dim)" strokeWidth={0.75} strokeDasharray="3 2" />}
        <path
          d={spire}
          fill="var(--color-abyss-raised)"
          stroke={selected ? "var(--color-gold)" : "var(--color-gold)"}
          strokeWidth={selected ? 1.6 : 1}
          opacity={selected ? 1 : 0.85}
        />
        {technique.covers.map((axiom, index) => {
          const slot = shaftWidth / Math.max(1, technique.covers.length);
          return (
            <rect
              key={axiom}
              x={round(cx - shaftWidth / 2 + index * slot)}
              y={round(baseY - 10)}
              width={round(Math.max(1, slot - 1))}
              height={6}
              fill={AXIOM_COLORS[axiom]}
            />
          );
        })}
        <circle cx={cx} cy={baseY + 8} r={3} fill="var(--color-abyss-border)" />
        <text
          x={cx}
          y={baseY + 22}
          textAnchor="middle"
          fontSize={8}
          letterSpacing={0.12}
          fill="var(--color-parchment-dim)"
          style={{ fontFamily: "var(--font-mono, monospace)" }}
        >
          {Math.round(maturity * 100)}%
        </text>
      </svg>
      <div className="flex min-w-0 flex-col gap-1 px-2 pb-2">
        <p aria-hidden="true" className="font-mono text-[9px] tabular-nums tracking-[0.1em] text-gold">
          {formatYear(technique.introduced)}
        </p>
        <p className="truncate font-display text-[12px] tracking-[0.02em] text-parchment">{technique.name}</p>
        <div className="flex flex-wrap items-center gap-1">
          <Badge tone="neutral">{technique.kind}</Badge>
          <Badge tone={technique.cost === "extreme" ? "crimson" : technique.cost === "high" ? "gold" : "neutral"}>
            {technique.cost}
          </Badge>
        </div>
      </div>
    </>
  );

  const shell = cn(
    "flex flex-col rounded-[8px] border bg-abyss-raised px-2 pt-2",
    selected ? "border-gold" : "border-abyss-border",
  );

  if (href === undefined) {
    return (
      <div className={cn(shell, className)}>{body}</div>
    );
  }
  return (
    <a
      href={href}
      className={cn(shell, "transition-colors hover:border-parchment-dim/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold", className)}
    >
      {body}
    </a>
  );
}