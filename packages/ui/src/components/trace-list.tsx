import type { ArgumentMove } from "@repo/seed/types";
import { cn } from "../lib/cn";
import { TraceRow } from "./trace-row";

/**
 * A full deliberation trace, in order. Rendered as an ordered list so the
 * sequence of reasoning is announced as a sequence.
 */
export interface TraceListProps {
  moves: readonly ArgumentMove[];
  /** Resolve a move id to an advisor name for the speaker column. */
  speakerFor?: (move: ArgumentMove) => string | undefined;
  /** Id of the move currently being weighed. */
  activeMoveId?: string;
  title?: string;
  emptyMessage?: string;
  className?: string;
}

export function TraceList({
  moves,
  speakerFor,
  activeMoveId,
  title = "Reasoning trace",
  emptyMessage = "The court has not spoken yet.",
  className,
}: TraceListProps) {
  if (moves.length === 0) {
    return (
      <p className={cn("rounded-[8px] border border-dashed border-abyss-border px-4 py-6 text-center text-[12px] text-parchment-dim", className)}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <section className={cn("flex flex-col", className)} aria-label={title}>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-parchment-dim">{title}</p>
      <ol className="flex flex-col">
        {moves.map((move, index) => {
          const speaker = speakerFor?.(move);
          return (
            <TraceRow
              key={move.id}
              move={move}
              step={index + 1}
              {...(speaker === undefined ? {} : { speaker })}
              active={move.id === activeMoveId}
            />
          );
        })}
      </ol>
    </section>
  );
}