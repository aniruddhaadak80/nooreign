import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Small status lozenge. Tinted with an alpha wash rather than a solid fill so
 * a column of badges never turns into a colour chart.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]",
  {
    variants: {
      tone: {
        neutral: "border-abyss-border bg-abyss-raised text-parchment-dim",
        gold: "border-gold/50 bg-gold/10 text-gold",
        crimson: "border-crimson/50 bg-crimson/10 text-crimson",
        verdigris: "border-verdigris/50 bg-verdigris/10 text-verdigris",
        glow: "border-indigo-glow/50 bg-indigo-glow/10 text-indigo-glow",
        solid: "border-gold bg-gold text-ink",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  /** Optional leading glyph — a dot is the common case. */
  mark?: ReactNode;
}

export function Badge({ tone, mark, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...rest}>
      {mark === undefined ? null : (
        <span aria-hidden="true" className="inline-flex size-1.5 items-center justify-center">
          {mark}
        </span>
      )}
      {children}
    </span>
  );
}

export { badgeVariants };