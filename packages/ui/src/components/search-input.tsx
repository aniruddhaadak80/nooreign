import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Controlled search field. Server-safe like `Input` — the app owns `value`, so
 * a query string can drive the atlas filter without a client wrapper.
 */
export interface SearchInputProps extends Omit<ComponentProps<"input">, "onChange" | "value" | "type"> {
  value: string;
  onValueChange: (next: string) => void;
  label?: string;
  placeholder?: string;
  /** Right-hand affordance, e.g. a result count or a clear button. */
  trailing?: ReactNode;
  hint?: string;
  className?: string;
}

export function SearchInput({
  value,
  onValueChange,
  label = "Search",
  placeholder = "Search the atlas…",
  trailing,
  hint,
  className,
  ...rest
}: SearchInputProps) {
  const inputId = rest.id ?? rest.name ?? "atlas-search";
  return (
    <div className={cn("flex w-full flex-col gap-1", className)}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <div
        className={cn(
          "flex items-center gap-2 rounded-[8px] border border-abyss-border bg-abyss px-3",
          "transition-colors duration-150 focus-within:border-gold",
          "focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-gold",
        )}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="size-4 shrink-0 fill-none stroke-parchment-dim stroke-[1.5]"
        >
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5 L14 14" strokeLinecap="round" />
        </svg>
        <input
          id={inputId}
          type="search"
          role="searchbox"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onValueChange(event.currentTarget.value)}
          className="h-10 w-full min-w-0 bg-transparent text-[13px] text-parchment outline-none placeholder:text-parchment-dim/60"
          {...rest}
        />
        {trailing}
      </div>
      {hint === undefined ? null : <p className="text-[11px] text-parchment-dim">{hint}</p>}
    </div>
  );
}