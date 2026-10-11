import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Two-column fact table. Uses a real `<dl>` because every row is a
 * term/description pair and screen readers announce the relationship.
 */
export interface KeyValueListProps {
  items: readonly { key: string; label: string; value: ReactNode; tone?: "default" | "muted" | "gold" }[];
  /** Stacks to one column below the `sm` breakpoint. */
  columns?: 1 | 2;
  className?: string;
}

const TONES = {
  default: "text-parchment",
  muted: "text-parchment-dim",
  gold: "text-gold",
} as const;

export function KeyValueList({ items, columns = 2, className }: KeyValueListProps) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-0",
        columns === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.key} className="flex items-baseline justify-between gap-4 border-b border-abyss-border/60 py-2 last:border-b-0">
          <dt className="text-[11px] uppercase tracking-[0.16em] text-parchment-dim">{item.label}</dt>
          <dd className={cn("text-right text-[13px]", TONES[item.tone ?? "default"])}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}