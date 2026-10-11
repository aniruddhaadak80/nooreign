import type { ComponentProps } from "react";
import { cn } from "../lib/cn";

/**
 * Hairline rule. `rule` picks the pattern so a section break can be a solid
 * gilding line, a dotted survey line or the dashed time-machine track — the
 * three rules the atlas actually uses.
 */
export interface DividerProps extends ComponentProps<"div"> {
  label?: string;
  rule?: "solid" | "dotted" | "dashed" | "gradient";
  orientation?: "horizontal" | "vertical";
}

export function Divider({ label, rule = "solid", orientation = "horizontal", className, ...rest }: DividerProps) {
  if (orientation === "vertical") {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn("w-px self-stretch bg-abyss-border", className)}
        {...rest}
      />
    );
  }

  if (label === undefined) {
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        className={cn(
          "h-px w-full",
          rule === "dotted" && "border-t border-dotted border-abyss-border",
          rule === "dashed" && "border-t border-dashed border-abyss-border",
          rule === "solid" && "bg-abyss-border",
          rule === "gradient" && "bg-[linear-gradient(90deg,var(--color-abyss-border),var(--color-gilding,var(--color-gold)),var(--color-abyss-border))]",
          className,
        )}
        {...rest}
      />
    );
  }

  return (
    <div role="separator" aria-orientation="horizontal" className={cn("flex items-center gap-3", className)} {...rest}>
      <span aria-hidden="true" className={cn("h-px flex-1", rule === "dashed" ? "border-t border-dashed border-abyss-border" : "bg-abyss-border")} />
      <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-parchment-dim">{label}</span>
      <span aria-hidden="true" className={cn("h-px flex-1", rule === "dashed" ? "border-t border-dashed border-abyss-border" : "bg-abyss-border")} />
    </div>
  );
}