"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useId, useState, type ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Tab set with the full keyboard contract: arrows move, Home/End jump, and the
 * active tab is marked `aria-selected` so the pattern is announced correctly.
 */
export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
  /** Rendered after the label, e.g. a count. */
  badge?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: readonly TabItem[];
  defaultTabId?: string;
  variant?: "underline" | "pill";
  className?: string;
  listClassName?: string;
  /** Announced to describe the group, e.g. "Deliberation views". */
  label?: string;
}

export function Tabs({ items, defaultTabId, variant = "underline", label = "Views", className, listClassName }: TabsProps) {
  const fallback = items.find((item) => item.disabled !== true)?.id ?? items[0]?.id ?? "";
  const [active, setActive] = useState(defaultTabId ?? fallback);
  const baseId = useId();
  const reduced = useReducedMotion();
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === active),
  );

  const move = (delta: number): void => {
    if (items.length === 0) return;
    let next = activeIndex;
    for (let step = 0; step < items.length; step += 1) {
      next = (next + delta + items.length) % items.length;
      const candidate = items[next];
      if (candidate !== undefined && candidate.disabled !== true) {
        setActive(candidate.id);
        return;
      }
    }
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div
        role="tablist"
        aria-label={label}
        className={cn(
          "flex items-center gap-1 overflow-x-auto",
          variant === "underline" && "border-b border-abyss-border",
          variant === "pill" && "rounded-[8px] border border-abyss-border bg-abyss p-1",
          listClassName,
        )}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            move(1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            move(-1);
          } else if (event.key === "Home") {
            event.preventDefault();
            setActive(fallback);
          } else if (event.key === "End") {
            event.preventDefault();
            const last = [...items].reverse().find((item) => item.disabled !== true);
            if (last !== undefined) setActive(last.id);
          }
        }}
      >
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              id={`${baseId}-${item.id}-tab`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-${item.id}-panel`}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled === true}
              onClick={() => setActive(item.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 text-[12px] uppercase tracking-[0.16em] transition-colors duration-150",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold",
                "disabled:pointer-events-none disabled:opacity-40",
                variant === "underline" && [
                  "border-b-2 px-3 py-2",
                  selected ? "border-gold text-gold" : "border-transparent text-parchment-dim hover:text-parchment",
                ],
                variant === "pill" && [
                  "rounded-[6px] px-3 py-1.5",
                  selected ? "bg-abyss-raised text-gold" : "text-parchment-dim hover:text-parchment",
                ],
              )}
            >
              {item.label}
              {item.badge}
            </button>
          );
        })}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          id={`${baseId}-${active}-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-${active}-tab`}
          tabIndex={0}
          initial={reduced ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: reduced ? 0 : 0.16, ease: "easeOut" }}
          className="pt-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
        >
          {items.find((item) => item.id === active)?.content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}