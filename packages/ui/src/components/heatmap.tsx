import { cn } from "../lib/cn";
import { bandScale } from "../lib/scales";
import { withAlpha } from "../lib/palette";

/**
 * Grid heatmap. The atlas uses these for adoption across eras and for the
 * axiom × technique coverage matrix, so the cells are sized by band scale and
 * the palette is the shared six-stop ramp.
 */
export interface HeatmapCell {
  row: string;
  column: string;
  /** 0..1, clamped. Cells with no value render as empty rail. */
  value: number;
  label?: string;
}

export interface HeatmapProps {
  cells: readonly HeatmapCell[];
  rows: readonly string[];
  columns: readonly string[];
  width?: number;
  height?: number;
  color?: string;
  /** Draws the value inside each cell; only legible above ~28px cells. */
  showValues?: boolean;
  /** Legend caption below the grid. */
  legend?: readonly { label: string; color: string }[];
  className?: string;
  title?: string;
}

export function Heatmap({
  cells,
  rows,
  columns,
  width = 480,
  height = 240,
  color = "var(--color-gold)",
  showValues = false,
  legend,
  className,
  title = "Heatmap",
}: HeatmapProps) {
  const gutterLeft = 96;
  const gutterTop = 22;
  const innerWidth = Math.max(0, width - gutterLeft - 8);
  const innerHeight = Math.max(0, height - gutterTop - 8);
  const colBands = bandScale(columns.length, innerWidth, 0.12);
  const rowBands = bandScale(rows.length, innerHeight, 0.12);
  const lookup = new Map(cells.map((cell) => [`${cell.row}|${cell.column}`, cell]));
  const round = (value: number): number => Math.round(value * 100) / 100;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" role="img" aria-label={title}>
        <title>{title}</title>
        {columns.map((column, index) => (
          <text
            key={column}
            x={round(gutterLeft + colBands.center(index))}
            y={12}
            textAnchor="middle"
            fontSize={8}
            letterSpacing={0.12}
            fill="var(--color-parchment-dim)"
            style={{ fontFamily: "var(--font-mono, monospace)", textTransform: "uppercase" }}
          >
            {column}
          </text>
        ))}
        {rows.map((row, rowIndex) => (
          <g key={row}>
            <text
              x={gutterLeft - 8}
              y={round(gutterTop + rowBands.center(rowIndex))}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={9}
              letterSpacing={0.1}
              fill="var(--color-parchment-dim)"
              style={{ fontFamily: "var(--font-mono, monospace)", textTransform: "uppercase" }}
            >
              {row}
            </text>
            {columns.map((column, columnIndex) => {
              const cell = lookup.get(`${row}|${column}`);
              const value = cell === undefined ? 0 : Math.min(1, Math.max(0, cell.value));
              const x = round(gutterLeft + colBands.index(columnIndex));
              const y = round(gutterTop + rowBands.index(rowIndex));
              return (
                <g key={column}>
                  <rect
                    x={x}
                    y={y}
                    width={round(colBands.bandwidth)}
                    height={round(rowBands.bandwidth)}
                    fill={value === 0 ? "var(--color-abyss)" : withAlpha(color, 0.15 + value * 0.85)}
                    stroke="var(--color-abyss-border)"
                    strokeWidth={0.5}
                  />
                  {showValues && colBands.bandwidth >= 26 ? (
                    <text
                      x={round(x + colBands.bandwidth / 2)}
                      y={round(y + rowBands.bandwidth / 2)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={8}
                      fill={value > 0.55 ? "var(--color-ink)" : "var(--color-parchment-dim)"}
                      style={{ fontFamily: "var(--font-mono, monospace)" }}
                    >
                      {Math.round(value * 100)}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
        ))}
      </svg>
      {legend === undefined || legend.length === 0 ? null : (
        <ul className="flex flex-wrap items-center gap-3">
          {legend.map((entry) => (
            <li key={entry.label} className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-parchment-dim">
              <span aria-hidden="true" className="size-2.5 rounded-[2px]" style={{ background: entry.color }} />
              {entry.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}