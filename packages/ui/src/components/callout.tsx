import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Aside note. Crimson marks a warning the council wants read; gold marks an
 * argument they want weighed; verdigris marks a result.
 */
export interface CalloutProps {
  tone?: "note" | "warning" | "insight" | "neutral";
  title: string;
  children: ReactNode;
  /** Crest or glyph in the gutter. */
  glyph?: ReactNode;
  className?: string;
}

const TONES = {
  note: { rail: "border-indigo-glow", label: "text-indigo-glow", text: "text-parchment-dim" },
  warning: { rail: "border-crimson", label: "text-crimson", text: "text-parchment-dim" },
  insight: { rail: "border-gold", label: "text-gold", text: "text-parchment-dim" },
  neutral: { rail: "border-abyss-border", label: "text-parchment-dim", text: "text-parchment-dim" },
} as const;

export function Callout({ tone = "note", title, children, glyph, className }: CalloutProps) {
  const palette = TONES[tone];
  return (
    <aside
      className={cn(
        "relative flex gap-3 rounded-[8px] border border-abyss-border bg-abyss/60 py-3 pl-4 pr-4",
        "before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full",
        palette.rail.replace("border-", "before:bg-"),
        className,
      )}
    >
      {glyph === undefined ? null : (
        <span aria-hidden="true" className="mt-0.5 shrink-0">
          {glyph}
        </span>
      )}
      <div className="min-w-0">
        <p className={cn("text-[10px] font-medium uppercase tracking-[0.22em]", palette.label)}>{title}</p>
        <div className={cn("mt-1 text-[13px] leading-relaxed", palette.text)}>{children}</div>
      </div>
    </aside>
  );
}