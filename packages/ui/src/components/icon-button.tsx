import { forwardRef, type ComponentProps } from "react";
import { cn } from "../lib/cn";

/**
 * Icon-only control. `aria-label` is required by the type, not by convention —
 * an unlabelled glyph is invisible to a screen reader and to the accessibility
 * audit, so the compiler is the right place to enforce it.
 */
export interface IconButtonProps extends Omit<ComponentProps<"button">, "aria-label"> {
  /** Required: there is no visible text to fall back on. */
  "aria-label": string;
  /** Decorative glyphs should not be announced twice. */
  children: ComponentProps<"button">["children"];
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "outline" | "solid";
}

const SIZES: Record<NonNullable<IconButtonProps["size"]>, string> = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
};

const VARIANTS: Record<NonNullable<IconButtonProps["variant"]>, string> = {
  ghost: "border-transparent text-parchment-dim hover:text-gold hover:border-abyss-border",
  outline: "border-abyss-border bg-abyss-raised text-parchment hover:border-gold hover:text-gold",
  solid: "border-gold bg-gold text-ink hover:bg-[#E4B65C]",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { "aria-label": ariaLabel, children, size = "md", variant = "ghost", className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center justify-center rounded-[6px] border transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
        "disabled:pointer-events-none disabled:opacity-45",
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});