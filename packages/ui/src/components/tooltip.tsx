"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Hover/focus tooltip. Opens on pointer and on keyboard focus, closes on
 * Escape, and never traps the pointer — the delay is short because the atlas
 * uses tooltips for dimensions and units, not for anything unreadable elsewhere.
 */
export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  delayMs?: number;
  className?: string;
}

export function Tooltip({ content, children, side = "top", delayMs = 180, className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();
  const reduced = useReducedMotion();

  const show = (): void => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delayMs);
  };
  const hide = (): void => {
    if (timer.current !== null) clearTimeout(timer.current);
    setOpen(false);
  };

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);

  return (
    <span
      className={cn("relative inline-flex", className)}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={() => setOpen(true)}
      onBlur={hide}
      onKeyDown={(event) => {
        if (event.key === "Escape") hide();
      }}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>
      <AnimatePresence>
        {open ? (
          <motion.span
            id={id}
            role="tooltip"
            initial={reduced ? false : { opacity: 0, y: side === "top" ? 2 : -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.12 }}
            className={cn(
              "pointer-events-none absolute left-1/2 z-50 w-max max-w-[34ch] -translate-x-1/2",
              "rounded-[6px] border border-abyss-border bg-abyss-raised px-2 py-1 text-[11px] leading-snug text-parchment",
              side === "top" ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]",
            )}
          >
            {content}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}