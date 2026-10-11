"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId, type ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Binary switch. A real checkbox under the hood so it participates in forms
 * and announces its checked state without any ARIA bookkeeping.
 */
export interface ToggleProps {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  /** Colour the track when on. */
  tone?: "gold" | "verdigris" | "crimson";
  className?: string;
  id?: string;
}

const TRACKS = {
  gold: "border-gold bg-gold",
  verdigris: "border-verdigris bg-verdigris",
  crimson: "border-crimson bg-crimson",
} as const;

export function Toggle({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  tone = "gold",
  className,
  id,
}: ToggleProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const reduced = useReducedMotion();

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "flex items-start gap-3 rounded-[6px] px-1 py-1",
        disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer",
        className,
      )}
    >
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onCheckedChange(event.currentTarget.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={cn(
            "block h-5 w-9 rounded-full border transition-colors duration-150",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold",
            checked ? TRACKS[tone] : "border-abyss-border bg-abyss",
          )}
        />
        <motion.span
          aria-hidden="true"
          animate={{ x: checked ? 16 : 2 }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 34 }}
          className={cn(
            "absolute top-0.5 size-4 rounded-full",
            checked ? "bg-ink" : "bg-parchment-dim",
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] text-parchment">{label}</span>
        {description === undefined ? null : (
          <span className="mt-0.5 block text-[11px] leading-snug text-parchment-dim">{description}</span>
        )}
      </span>
    </label>
  );
}

export interface ToggleGroupItem {
  id: string;
  label: ReactNode;
  description?: string;
}