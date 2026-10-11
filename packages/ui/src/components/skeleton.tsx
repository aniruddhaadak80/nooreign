import type { ComponentProps } from "react";
import { cn } from "../lib/cn";

/**
 * Loading placeholder.
 *
 * The pulse is a Tailwind animation rather than framer-motion: a skeleton is
 * not an "enter" transition, it is a steady state, and keeping it in CSS means
 * it never triggers the motion budget or a hydration mismatch.
 */
export interface SkeletonProps extends ComponentProps<"div"> {
  variant?: "line" | "block" | "circle";
}

export function Skeleton({ variant = "line", className, ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-abyss-raised",
        variant === "line" && "h-3 w-full rounded-[4px]",
        variant === "block" && "h-24 w-full rounded-[8px]",
        variant === "circle" && "size-10 rounded-full",
        className,
      )}
      {...rest}
    />
  );
}