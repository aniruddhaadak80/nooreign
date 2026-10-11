import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export type TagRowItem = ReactNode | { id: string; node: ReactNode };

function isKeyed(item: TagRowItem): item is { id: string; node: ReactNode } {
  // `ReactElement` already carries a `key`, so the discriminant has to be a
  // name React does not own.
  return typeof item === "object" && item !== null && "node" in item && "id" in item;
}

/**
 * Wrapping row of tags. The label is real text rather than a pseudo-element so
 * a screen reader can jump to "Tags" instead of reading twelve unrelated strings.
 */
export interface TagRowProps {
  label?: string;
  items: readonly TagRowItem[];
  className?: string;
  itemClassName?: string;
}

export function TagRow({ label, items, className, itemClassName }: TagRowProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {label === undefined ? null : (
        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-parchment-dim">{label}</span>
      )}
      <ul className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const keyed = isKeyed(item);
          return (
            <li key={keyed ? item.id : String(index)} className={cn("inline-flex", itemClassName)}>
              {keyed ? item.node : item}
            </li>
          );
        })}
      </ul>
    </div>
  );
}