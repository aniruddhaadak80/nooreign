import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Preformatted technical excerpt — thought experiments, engine parameters.
 * Server-safe: a real `<pre>` with a real scroll container, because a code
 * block that is a div is invisible to find-in-page.
 */
export interface CodeBlockProps {
  code: string;
  language?: string;
  caption?: string;
  /** Right-hand note, e.g. the paper this snippet comes from. */
  meta?: ReactNode;
  /** Show line numbers in the gutter. */
  numbered?: boolean;
  className?: string;
  maxHeight?: number;
}

export function CodeBlock({ code, language, caption, meta, numbered = false, className, maxHeight = 320 }: CodeBlockProps) {
  const lines = code.replace(/\n$/u, "").split("\n");
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-[10px] border border-abyss-border bg-abyss",
        className,
      )}
    >
      {caption === undefined && meta === undefined ? null : (
        <figcaption className="flex items-center justify-between gap-3 border-b border-abyss-border bg-abyss-raised px-3 py-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold">{caption ?? language ?? "code"}</span>
          {meta === undefined ? null : <span className="text-[11px] text-parchment-dim">{meta}</span>}
        </figcaption>
      )}
      <div className="overflow-auto" style={maxHeight > 0 ? { maxHeight } : undefined}>
        <pre className="flex min-w-full text-[12px] leading-[1.7]">
          {numbered ? (
            <ol aria-hidden="true" className="select-none border-r border-abyss-border px-3 py-3 text-right font-mono text-parchment-dim/50">
              {lines.map((_, index) => (
                <li key={index} className="tabular-nums">
                  {index + 1}
                </li>
              ))}
            </ol>
          ) : null}
          <code className="block px-4 py-3 font-mono text-parchment">{code}</code>
        </pre>
      </div>
    </figure>
  );
}