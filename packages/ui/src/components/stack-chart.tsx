import { cn } from "../lib/cn";
import { bandScale } from "../lib/scales";
import { formatUtilons } from "../lib/format";
import { withAlpha } from "../lib/palette";

/**
 * Stacked cost chart for deliberation runs: how a run's utilons divide across
 * advisors, courts and search. The stack order is fixed by the caller so the
 * same run always shows the same band order.
 */
export interface StackSlice {
  key: string;
  label: string;
  /** Absolute utilons. */
  value: number;
  color: string;
}

export interface StackChartProps {
  slices: readonly StackSlice[];
  /** One bar per column, e.g. one column per parameter setting. */
  columns: readonly { key: string; label: string; slices: readonly StackSlice[] }[];
  width?: number;
  height?: number;
  /** Renders as horizontal bars instead of vertical columns. */
  orientation?: "vertical" | "horizontal";
  formatValue?: (value: number) => string;
  className?: string;
  title?: string;
}

export function StackChart({
  slices,
  columns,
  width = 640,
  height = 220,
  orientation = "vertical",
  formatValue = formatUtilons,
  className,
  title = "Cost breakdown",
}: StackChartProps) {
  const legend = slices.length > 0 ? slices : (columns[0]?.slices ?? []);
  const totals = columns.map((column) => column.slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0));
  const max = Math.max(1, ...totals);
  const round = (value: number): number => Math.round(value * 100) / 100;
  const vertical = orientation === "vertical";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block w-full"
        role="img"
        aria-label={title}
        preserveAspectRatio="xMidYMid meet"
      >
        <title>{title}</title>
        {vertical ? (
          <>
            <rect x={0} y={0} width={width} height={height} fill="var(--color-abyss)" stroke="var(--color-abyss-border)" strokeWidth={0.5} />
            {columns.map((column, index) => {
              const bands = bandScale(columns.length, width, 0.24);
              const x = round(bands.index(index));
              const bw = round(bands.bandwidth);
              let cursor = height;
              const total = totals[index] ?? 0;
              return (
                <g key={column.key}>
                  {column.slices.map((slice) => {
                    const ratio = max === 0 ? 0 : (Math.max(0, slice.value) / max) * (height - 28);
                    const y = round(cursor - ratio);
                    cursor = y;
                    return (
                      <rect
                        key={slice.key}
                        x={x}
                        y={y}
                        width={bw}
                        height={round(ratio)}
                        fill={slice.color}
                        stroke="var(--color-abyss)"
                        strokeWidth={0.5}
                      >
                        <title>{`${slice.label}: ${formatValue(slice.value)}`}</title>
                      </rect>
                    );
                  })}
                  <text
                    x={round(x + bw / 2)}
                    y={height + 14}
                    textAnchor="middle"
                    fontSize={9}
                    letterSpacing={0.1}
                    fill="var(--color-parchment-dim)"
                    style={{ fontFamily: "var(--font-mono, monospace)" }}
                  >
                    {column.label}
                  </text>
                  <text
                    x={round(x + bw / 2)}
                    y={round(Math.max(12, cursor - 4))}
                    textAnchor="middle"
                    fontSize={9}
                    fill="var(--color-parchment)"
                    style={{ fontFamily: "var(--font-mono, monospace)" }}
                  >
                    {formatValue(total)}
                  </text>
                </g>
              );
            })}
          </>
        ) : (
          <>
            {columns.map((column, index) => {
              const bands = bandScale(columns.length, height, 0.28);
              const y = round(bands.index(index));
              const bh = round(bands.bandwidth);
              let cursor = 0;
              return (
                <g key={column.key}>
                  {column.slices.map((slice) => {
                    const w = round((Math.max(0, slice.value) / max) * (width - 90));
                    const x = round(cursor);
                    cursor += w;
                    return (
                      <rect
                        key={slice.key}
                        x={x}
                        y={y}
                        width={w}
                        height={bh}
                        fill={slice.color}
                        stroke="var(--color-abyss)"
                        strokeWidth={0.5}
                      >
                        <title>{`${slice.label}: ${formatValue(slice.value)}`}</title>
                      </rect>
                    );
                  })}
                  <text
                    x={width - 2}
                    y={round(y + bh / 2)}
                    textAnchor="end"
                    dominantBaseline="central"
                    fontSize={9}
                    fill="var(--color-parchment-dim)"
                    style={{ fontFamily: "var(--font-mono, monospace)" }}
                  >
                    {column.label}
                  </text>
                </g>
              );
            })}
          </>
        )}
      </svg>

      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {legend.map((slice) => (
          <li key={slice.key} className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-parchment-dim">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-[2px] border border-abyss-border"
              style={{ background: withAlpha(slice.color, 0.85) }}
            />
            {slice.label}
          </li>
        ))}
      </ul>
    </div>
  );
}