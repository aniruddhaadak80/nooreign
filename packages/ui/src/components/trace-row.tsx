import type { ArgumentMove } from "@repo/seed/types";
import { cn } from "../lib/cn";
import { AXIOM_COLORS } from "../lib/palette";

/**
 * One step of a deliberation, rendered as a visible reasoning trace.
 *
 * The move's `kind` is the row's identity and its `weight` is the bar; the
 * axioms it leans on are the colour chips. A reader can reconstruct the
 * argument from this row alone, which is the whole point of showing it.
 */
export interface TraceRowProps {
  move: ArgumentMove;
  /** 1-based position in the trace. */
  step?: number;
  /** Advisor display name, when the trace is per-advisor. */
  speaker?: string;
  /** Draws the row as the move currently under consideration. */
  active?: boolean;
  className?: string;
}

const KIND_STYLE: Record<ArgumentMove["kind"], { label: string; rail: string; text: string }> = {
  premise: { label: "Premise", rail: "bg-verdigris", text: "text-verdigris" },
  objection: { label: "Objection", rail: "bg-crimson", text: "text-crimson" },
  synthesis: { label: "Synthesis", rail: "bg-gold", text: "text-gold" },
  appeal: { label: "Appeal", rail: "bg-indigo-glow", text: "text-indigo-glow" },
};

export function TraceRow({ move, step, speaker, active = false, className }: TraceRowProps) {
  const style = KIND_STYLE[move.kind];
  return (
    <li
      className={cn(
        "relative flex gap-3 border-l-2 py-3 pl-4",
        active ? "border-gold bg-gold/5" : "border-abyss-border",
        className,
      )}
    >
      {step === undefined ? null : (
        <span
          aria-hidden="true"
          className="absolute -left-[7px] top-4 inline-flex size-3 items-center justify-center rounded-full border border-abyss-border bg-abyss font-mono text-[8px] text-parchment-dim"
        >
          {step}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-[10px] font-medium uppercase tracking-[0.18em]", style.text)}>
            {style.label}
          </span>
          {speaker === undefined ? null : (
            <span className="text-[10px] uppercase tracking-[0.14em] text-parchment-dim">· {speaker}</span>
          )}
          <span className="ml-auto font-mono text-[10px] tabular-nums text-parchment-dim">
            {move.weight.toFixed(2)}
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-parchment">{move.claim}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-parchment-dim">{move.support}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {move.leansOn.map((axiom) => (
            <span
              key={axiom}
              className="rounded-[4px] border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em]"
              style={{
                borderColor: `${AXIOM_COLORS[axiom]}55`,
                color: AXIOM_COLORS[axiom],
              }}
            >
              {axiom}
            </span>
          ))}
          <span aria-hidden="true" className="ml-2 h-1 w-24 max-w-[40%] border border-abyss-border">
            <span
              className={cn("block h-full", style.rail)}
              style={{ width: `${Math.min(100, Math.max(0, move.weight * 100))}%` }}
            />
          </span>
        </div>
      </div>
    </li>
  );
}