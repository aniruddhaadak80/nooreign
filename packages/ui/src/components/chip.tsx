import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Interactive token. Rendered as a real button so keyboard and screen-reader
 * users get the same affordance as a mouse click on the tag cloud.
 */
export interface ChipProps extends Omit<ComponentProps<"button">, "children"> {
  children: ReactNode;
  selected?: boolean;
  /** Gilds the chip and marks it `aria-pressed` for assistive tech. */
  tone?: "neutral" | "gold" | "crimson" | "verdigris";
  count?: number;
}

const TONES: Record<NonNullable<ChipProps["tone"]>, string> = {
  neutral: "border-abyss-border bg-abyss-raised text-parchment-dim hover:text-parchment",
  gold: "border-gold/60 bg-gold/10 text-gold",
  crimson: "border-crimson/60 bg-crimson/10 text-crimson",
  verdigris: "border-verdigris/60 bg-verdigris/10 text-verdigris",
};

export function Chip({ children, selected = false, tone = "neutral", count, className, type = "button", ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-1 text-[12px]",
        "transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
        selected ? TONES[tone === "neutral" ? "gold" : tone] : TONES[tone],
        !selected && "hover:border-parchment-dim/60 hover:text-parchment",
        className,
      )}
      {...rest}
    >
      {children}
      {count === undefined ? null : (
        <span className="font-mono text-[10px] text-parchment-dim tabular-nums">{count}</span>
      )}
    </button>
  );
}