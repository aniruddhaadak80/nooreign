import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Glossary-style term list. A `<dl>` again, but stacked: the term sits above
 * its gloss because the gloss can run to a paragraph.
 */
export interface DefinitionListProps extends Omit<ComponentProps<"dl">, "children"> {
  items: readonly { key: string; term: ReactNode; description: ReactNode; meta?: ReactNode }[];
}

export function DefinitionList({ items, className, ...rest }: DefinitionListProps) {
  return (
    <dl className={cn("flex flex-col gap-4", className)} {...rest}>
      {items.map((item) => (
        <div key={item.key} className="border-l-2 border-gold/40 pl-4">
          <dt className="font-display text-[14px] tracking-[0.04em] text-parchment">{item.term}</dt>
          <dd className="mt-1 text-[13px] leading-relaxed text-parchment-dim">{item.description}</dd>
          {item.meta === undefined ? null : <dd className="mt-2 flex flex-wrap gap-2">{item.meta}</dd>}
        </div>
      ))}
    </dl>
  );
}