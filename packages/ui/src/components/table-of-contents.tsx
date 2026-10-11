import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * In-page contents rail. Server-safe by construction: it is a plain list of
 * anchors. The scroll-spy lives in the app, not here, so this component stays
 * renderable from an RSC.
 */
export interface TocEntry {
  id: string;
  label: string;
  depth?: 1 | 2 | 3;
  count?: number;
}

export interface TableOfContentsProps {
  title?: string;
  entries: readonly TocEntry[];
  activeId?: string;
  className?: string;
}

export function TableOfContents({ title = "On this page", entries, activeId, className }: TableOfContentsProps) {
  if (entries.length === 0) return null;
  return (
    <nav aria-label={title} className={cn("text-[12px]", className)}>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-parchment-dim">{title}</p>
      <ol className="flex flex-col gap-0.5 border-l border-abyss-border">
        {entries.map((entry) => {
          const depth = entry.depth ?? 1;
          const active = entry.id === activeId;
          return (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                aria-current={active ? "location" : undefined}
                className={cn(
                  "-ml-px flex items-center gap-2 border-l py-1 transition-colors duration-150",
                  depth === 1 && "pl-3",
                  depth === 2 && "pl-6",
                  depth === 3 && "pl-9",
                  active
                    ? "border-gold text-gold"
                    : "border-transparent text-parchment-dim hover:border-parchment-dim hover:text-parchment",
                )}
              >
                <span className="truncate">{entry.label}</span>
                {entry.count === undefined ? null : (
                  <span className="ml-auto font-mono text-[10px] tabular-nums text-parchment-dim/70">{entry.count}</span>
                )}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export interface TocSlotProps {
  children: ReactNode;
  className?: string;
}

/** Slot for an active-section marker rendered by the app's scroll spy. */
export function TocSlot({ children, className }: TocSlotProps) {
  return <div className={cn("flex flex-col", className)}>{children}</div>;
}