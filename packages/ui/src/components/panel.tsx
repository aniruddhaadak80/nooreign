import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Framed instrument panel: a titled box with optional actions in the header.
 * Where `Card` is a plate, `Panel` is an instrument — it takes controls.
 */
export interface PanelProps {
  title?: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Removes the inner padding for panels that host a full-bleed SVG. */
  flush?: boolean;
  className?: string;
  bodyClassName?: string;
}

export function Panel({
  title,
  eyebrow,
  description,
  actions,
  children,
  footer,
  flush = false,
  className,
  bodyClassName,
}: PanelProps) {
  const hasHeader = title !== undefined || eyebrow !== undefined || actions !== undefined;
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-[10px] border border-abyss-border bg-abyss-raised",
        className,
      )}
    >
      {hasHeader ? (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-abyss-border px-4 py-3">
          <div className="min-w-0">
            {eyebrow === undefined ? null : (
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold">{eyebrow}</p>
            )}
            {title === undefined ? null : (
              <h2 className="truncate font-display text-[15px] tracking-[0.04em] text-parchment">{title}</h2>
            )}
            {description === undefined ? null : (
              <p className="mt-1 max-w-[62ch] text-[12px] leading-relaxed text-parchment-dim">{description}</p>
            )}
          </div>
          {actions === undefined ? null : <div className="flex items-center gap-2">{actions}</div>}
        </header>
      ) : null}
      <div className={cn("flex-1", flush ? "" : "p-4", bodyClassName)}>{children}</div>
      {footer === undefined ? null : (
        <footer className="border-t border-abyss-border px-4 py-3 text-[12px] text-parchment-dim">{footer}</footer>
      )}
    </section>
  );
}