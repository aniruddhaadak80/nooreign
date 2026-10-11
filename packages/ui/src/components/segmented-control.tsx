"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import { cn } from "../lib/cn";

/**
 * Radio group rendered as a segmented rail. Built on real radio inputs so
 * arrow-key navigation and form participation come for free.
 */
export interface SegmentedOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  label: string;
  value: string;
  onValueChange: (next: string) => void;
  options: readonly SegmentedOption[];
  size?: "sm" | "md";
  hideLabel?: boolean;
  className?: string;
}

export function SegmentedControl({
  label,
  value,
  onValueChange,
  options,
  size = "md",
  hideLabel = false,
  className,
}: SegmentedControlProps) {
  const base = useId();
  const reduced = useReducedMotion();

  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-col gap-1.5", className)}>
      <span
        className={cn(
          "text-[10px] font-medium uppercase tracking-[0.22em] text-parchment-dim",
          hideLabel && "sr-only",
        )}
      >
        {label}
      </span>
      <div className="inline-flex flex-wrap gap-1 rounded-[8px] border border-abyss-border bg-abyss p-1">
        {options.map((option) => {
          const selected = option.value === value;
          const id = `${base}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={cn(
                "relative inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] transition-colors duration-150",
                size === "sm" ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]",
                selected ? "text-ink" : "text-parchment-dim hover:text-parchment",
                option.disabled === true && "pointer-events-none opacity-40",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold",
              )}
            >
              {selected ? (
                <motion.span
                  layoutId={`${base}-rail`}
                  aria-hidden="true"
                  transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 460, damping: 38 }}
                  className="absolute inset-0 rounded-[6px] bg-gold"
                />
              ) : null}
              <input
                id={id}
                type="radio"
                name={`${base}-group`}
                value={option.value}
                checked={selected}
                disabled={option.disabled}
                onChange={() => onValueChange(option.value)}
                className="sr-only"
              />
              <span className="relative z-10 inline-flex items-center gap-1.5 whitespace-nowrap">
                {option.icon}
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}