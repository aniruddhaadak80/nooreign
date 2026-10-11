"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { cn } from "../lib/cn";

/**
 * Modal deliberation chamber.
 *
 * Accessibility contract, in order of importance:
 *  1. Escape closes.
 *  2. Tab cycles inside the panel — focus is trapped by cycling the focusable
 *     set, which survives portals and portals-less rendering alike.
 *  3. Focus returns to whatever opened the dialog.
 *  4. The rest of the page is hidden from the tree with `aria-modal`.
 */
export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Control rendered in the header, e.g. a crest. */
  emblem?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Close when the scrim is clicked. */
  dismissOnScrim?: boolean;
  className?: string;
  id?: string;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

const SIZES = {
  sm: "max-w-[420px]",
  md: "max-w-[560px]",
  lg: "max-w-[760px]",
  xl: "max-w-[1040px]",
} as const;

/** The dialog keeps its own ref for focus management and honours the caller's. */
function mergeRefs<T>(...refs: ReadonlyArray<React.Ref<T> | undefined>): React.RefCallback<T> {
  return (value: T | null) => {
    for (const target of refs) {
      if (typeof target === "function") target(value);
      else if (target !== null && target !== undefined) {
        (target as React.RefObject<T | null>).current = value;
      }
    }
  };
}

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(function Dialog(
  { open, onClose, title, description, children, footer, emblem, size = "md", dismissOnScrim = true, className, id },
  ref,
) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const reduced = useReducedMotion();

  const focusables = useCallback((): HTMLElement[] => {
    const root = panelRef.current;
    if (root === null) return [];
    // `DOM.Iterable` is not in this package's lib, so spread through Array.from.
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (node) => node.offsetParent !== null || node === root,
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    restoreTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const first = focusables()[0] ?? panelRef.current;
    first?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      restoreTo.current?.focus();
    };
  }, [open, focusables]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const nodes = focusables();
    if (nodes.length === 0) {
      event.preventDefault();
      panelRef.current?.focus();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (first === undefined || last === undefined) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.14 }}
        >
          <div
            aria-hidden="true"
            onClick={dismissOnScrim ? onClose : undefined}
            className="absolute inset-0 bg-ink/80"
          />
          <motion.div
            ref={mergeRefs(panelRef, ref)}
            id={id}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description === undefined ? undefined : descriptionId}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            initial={reduced ? false : { opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: reduced ? 0 : 0.18, ease: [0.22, 0.61, 0.36, 1] }}
            className={cn(
              "relative flex max-h-[86vh] w-full flex-col overflow-hidden rounded-[10px] border border-abyss-border",
              "bg-abyss-raised shadow-[0_1px_0_rgba(255,255,255,0.04)]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
              SIZES[size],
              className,
            )}
          >
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gold/30" />
            <header className="flex items-start gap-3 border-b border-abyss-border px-5 py-4">
              {emblem === undefined ? null : (
                <span aria-hidden="true" className="shrink-0">
                  {emblem}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="font-display text-[16px] tracking-[0.04em] text-parchment">
                  {title}
                </h2>
                {description === undefined ? null : (
                  <p id={descriptionId} className="mt-1 text-[12px] leading-relaxed text-parchment-dim">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-[6px] border border-abyss-border",
                  "text-parchment-dim transition-colors hover:border-crimson hover:text-crimson",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                )}
              >
                <span aria-hidden="true" className="text-[14px] leading-none">
                  ✕
                </span>
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer === undefined ? null : (
              <footer className="border-t border-abyss-border px-5 py-3">{footer}</footer>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
});