import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Data table. Real `<table>` semantics with a caption and scoped headers —
 * option comparisons in the dilemma view are read column by column, which only
 * works if the markup says so.
 */
export interface TableColumn<Row> {
  key: string;
  header: ReactNode;
  /** Right-align numeric columns. */
  numeric?: boolean;
  width?: string;
  render: (row: Row, index: number) => ReactNode;
}

export interface TableProps<Row> {
  caption: string;
  columns: readonly TableColumn<Row>[];
  rows: readonly Row[];
  getRowKey: (row: Row, index: number) => string;
  /** Row emphasised as the council's current pick. */
  highlightKey?: string;
  onRowClick?: (row: Row) => void;
  emptyMessage?: string;
  className?: string;
}

export function Table<Row>({
  caption,
  columns,
  rows,
  getRowKey,
  highlightKey,
  onRowClick,
  emptyMessage = "No rows.",
  className,
}: TableProps<Row>) {
  return (
    <div className={cn("w-full overflow-x-auto rounded-[10px] border border-abyss-border", className)}>
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-abyss-border bg-abyss-raised">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={column.width === undefined ? undefined : { width: column.width }}
                className={cn(
                  "whitespace-nowrap px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-parchment-dim",
                  column.numeric === true && "text-right",
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-[12px] text-parchment-dim">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const key = getRowKey(row, index);
              const highlighted = highlightKey === key;
              return (
                <tr
                  key={key}
                  onClick={onRowClick === undefined ? undefined : () => onRowClick(row)}
                  className={cn(
                    "border-b border-abyss-border/60 last:border-b-0",
                    highlighted ? "bg-gold/10" : "bg-abyss",
                    onRowClick !== undefined && "cursor-pointer hover:bg-abyss-raised",
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-3 py-2.5 text-[12px] text-parchment-dim",
                        column.numeric === true && "text-right font-mono tabular-nums text-parchment",
                      )}
                    >
                      {column.render(row, index)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}