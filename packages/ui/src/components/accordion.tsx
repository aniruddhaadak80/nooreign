"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useId, useState, type ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Disclosure for long reasoning blocks. Self-contained client leaf: it owns its
 * own open state, so it never needs a context provider and can be dropped into
 * any server-rendered page.
 */
export interface AccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
  meta?: ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  items: readonly AccordionItem[];
  /** Which panels start open. Ignored once the user interacts. */
  defaultOpen?: readonly string[];
  /** Allow several panels open at once (a council, not a wizard). */
  multiple?: boolean;
  className?: string;
  itemClassName?: string;
}

export function Accordion({ items, defaultOpen = [], multiple = true, className, itemClassName }: AccordionProps) {
  const [open, setOpen] = useState<readonly string[]>(defaultOpen);
  const reduced = useReducedMotion();
  const baseId = useId();

  const toggle = (id: string): void => {
    setOpen((current) => {
      const isOpen = current.includes(id);
      if (multiple) return isOpen ? current.filter((value) => value !== id) : [...current, id];
      return isOpen ? [] : [id];
    });
  };

  return (
    <div className={cn("flex flex-col divide-y divide-abyss-border rounded-[10px] border border-abyss-border", className)}>
      {items.map((item) => {
        const isOpen = open.includes(item.id);
        const panelId = `${baseId}-${item.id}`;
        const buttonId = `${baseId}-${item.id}-trigger`;
        return (
          <div key={item.id} className={cn("bg-abyss-raised", itemClassName)}>
            <h3 className="m-0">
              <button
                id={buttonId}
                type="button"
                disabled={item.disabled === true}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-3 text-left",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold",
                  "disabled:pointer-events-none disabled:opacity-45",
                )}
              >
                <span className="min-w-0 font-display text-[14px] tracking-[0.03em] text-parchment">{item.title}</span>
                <span className="flex shrink-0 items-center gap-3">
                  {item.meta}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-block size-2 rotate-45 border-r border-t border-parchment-dim transition-transform duration-150",
                      isOpen && "-rotate-135",
                    )}
                  />
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  key="panel"
                  initial={reduced ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.2, ease: [0.22, 0.61, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 text-[13px] leading-relaxed text-parchment-dim">{item.content}</div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}