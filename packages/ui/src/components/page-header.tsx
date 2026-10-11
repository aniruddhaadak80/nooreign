import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Breadcrumb } from "./breadcrumb";

/**
 * Page masthead: breadcrumb, display title, lede and a meta strip. Renders a
 * `<header>` with the `<h1>` so every page in the atlas has exactly one.
 */
export interface PageMeta {
  key: string;
  label: string;
  value: ReactNode;
}

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  lede?: string;
  crumbs?: readonly { label: string; href?: string }[];
  meta?: readonly PageMeta[];
  actions?: ReactNode;
  /** Wide heraldic band behind the masthead. */
  banner?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, lede, crumbs, meta, actions, banner, className }: PageHeaderProps) {
  return (
    <header className={cn("relative overflow-hidden border-b border-abyss-border bg-abyss", className)}>
      {banner === undefined ? null : (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.16]">
          {banner}
        </div>
      )}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gold/30" />
      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-6 py-10 lg:px-10">
        {crumbs === undefined || crumbs.length === 0 ? null : <Breadcrumb items={crumbs} />}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0 max-w-[70ch]">
            {eyebrow === undefined ? null : (
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.26em] text-gold">{eyebrow}</p>
            )}
            <h1 className="font-display text-[34px] leading-[1.1] tracking-[0.01em] text-parchment lg:text-[42px]">
              {title}
            </h1>
            {lede === undefined ? null : (
              <p className="mt-3 max-w-[64ch] text-[14px] leading-relaxed text-parchment-dim">{lede}</p>
            )}
          </div>
          {actions === undefined ? null : <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {meta === undefined || meta.length === 0 ? null : (
          <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-2 border-t border-abyss-border pt-4">
            {meta.map((item) => (
              <div key={item.key} className="flex flex-col gap-0.5">
                <dt className="text-[10px] uppercase tracking-[0.18em] text-parchment-dim">{item.label}</dt>
                <dd className="text-[13px] text-parchment">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </header>
  );
}