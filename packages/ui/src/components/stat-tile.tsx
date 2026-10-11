import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * One number that matters. The value is the only thing on the plate that is not
 * parchment — everything else is instrumentation.
 */
export interface StatTileProps {
  label: string;
  value: ReactNode;
  /** Pre-formatted caption; defaults to raw text. */
  hint?: string;
  unit?: string;
  icon?: ReactNode;
  /** 0..1, drives the gauge rail under the value. */
  level?: number;
  tone?: "neutral" | "gold" | "crimson" | "verdigris" | "glow";
  className?: string;
}

const TONES: Record<NonNullable<StatTileProps["tone"]>, string> = {
  neutral: "text-parchment",
  gold: "text-gold",
  crimson: "text-crimson",
  verdigris: "text-verdigris",
  glow: "text-indigo-glow",
};

export function StatTile({ label, value, hint, unit, icon, level, tone = "neutral", className }: StatTileProps) {
  const rail =
    level === undefined
      ? null
      : Math.min(1, Math.max(0, Number.isFinite(level) ? level : 0));
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-[8px] border border-abyss-border bg-abyss-raised px-4 py-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-parchment-dim">{label}</span>
        {icon === undefined ? null : (
          <span aria-hidden="true" className="text-parchment-dim">
            {icon}
          </span>
        )}
      </div>
      <p className={cn("font-display text-[22px] leading-none tabular-nums", TONES[tone])}>
        {value}
        {unit === undefined ? null : <span className="ml-1 font-sans text-[11px] text-parchment-dim">{unit}</span>}
      </p>
      {rail === null ? null : (
        <span aria-hidden="true" className="mt-1 block h-px w-full bg-abyss-border">
          <span
            className={cn("block h-px", tone === "neutral" ? "bg-parchment-dim" : TONES[tone].replace("text-", "bg-"))}
            style={{ width: `${rail * 100}%` }}
          />
        </span>
      )}
      {hint === undefined ? null : <p className="text-[11px] leading-snug text-parchment-dim">{hint}</p>}
    </div>
  );
}