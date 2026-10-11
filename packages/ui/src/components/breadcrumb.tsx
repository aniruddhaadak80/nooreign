import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Trail of where you are in the atlas. The final crumb is `aria-current`, not
 * just visually distinguished.
 */
export interface BreadcrumbProps {
  items: readonly { label: string; href?: string }[];
  className?: string;
  separator?: ReactNode;
}

export function Breadcrumb({ items, className, separator }: BreadcrumbProps) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-parchment-dim">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {item.href === undefined || last ? (
                <span aria-current={last ? "page" : undefined} className={cn("truncate", last && "text-gold")}>
                  {item.label}
                </span>
              ) : (
                <a href={item.href} className="truncate transition-colors hover:text-parchment">
                  {item.label}
                </a>
              )}
              {last ? null : (
                <span aria-hidden="true" className="text-abyss-border">
                  {separator ?? "/"}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}