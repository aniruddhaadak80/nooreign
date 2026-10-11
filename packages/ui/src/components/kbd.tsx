import type { ComponentProps } from "react";
import { cn } from "../lib/cn";

/**
 * Keyboard key glyph. Used next to shortcuts in the command palette and in the
 * era rail scrubber, so it has to read at 10px without looking like a button.
 */
export interface KbdProps extends ComponentProps<"kbd"> {
  children: string;
}

export function Kbd({ children, className, ...rest }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-abyss-border",
        "bg-abyss-raised px-1.5 font-mono text-[10px] uppercase text-parchment-dim",
        className,
      )}
      {...rest}
    >
      {children}
    </kbd>
  );
}