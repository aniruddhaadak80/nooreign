"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { cn } from "../lib/cn";

/**
 * Reading progress for the time machine. The rail is 1px so it reads as an
 * instrument scale, not a progress bar, and it fades out at the end so it does
 * not sit at 100% for the rest of the session.
 */
export interface ScrollProgressProps {
  tone?: "gold" | "verdigris" | "crimson";
  /** Hide once the user reaches the end — useful on short pages. */
  hideAtEnd?: boolean;
  className?: string;
  label?: string;
}

const TONES = {
  gold: "bg-gold",
  verdigris: "bg-verdigris",
  crimson: "bg-crimson",
} as const;

export function ScrollProgress({ tone = "gold", hideAtEnd = true, className, label = "Reading progress" }: ScrollProgressProps) {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  // A spring, so a flick-scroll glides rather than stutters — but only when the
  // reader has not asked for reduced motion.
  const smoothed = useSpring(scrollYProgress, { stiffness: 220, damping: 40, mass: 0.4 });
  const finished = scrollYProgress.get() > 0.995;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("fixed inset-x-0 top-0 z-50 h-px bg-abyss-border", className)}
    >
      <motion.div
        aria-hidden="true"
        className={cn("h-full origin-left", TONES[tone], hideAtEnd && finished && "opacity-0")}
        style={{ scaleX: reduced ? scrollYProgress : smoothed }}
      />
    </div>
  );
}