import { forwardRef, type ComponentProps } from "react";
import { cn } from "../lib/cn";

/**
 * Native select, restyled. Native rather than a listbox because the option
 * counts here are small and the platform picker is faster on a phone — an
 * accessibility win worth more than visual consistency.
 */
export interface SelectProps extends ComponentProps<"select"> {
  label?: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  options: readonly { value: string; label: string; disabled?: boolean }[];
  /** Rendered when the value matches nothing. */
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, hideLabel = false, options, placeholder, className, id, ...rest },
  ref,
) {
  const fieldId = id ?? rest.name ?? undefined;
  return (
    <div className="flex flex-col gap-1">
      {label === undefined ? null : (
        <label
          htmlFor={fieldId}
          className={cn(
            "text-[10px] font-medium uppercase tracking-[0.22em] text-parchment-dim",
            hideLabel && "sr-only",
          )}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={hint === undefined && error === undefined ? undefined : `${fieldId ?? "field"}-message`}
          className={cn(
            "h-10 w-full appearance-none rounded-[6px] border bg-abyss pl-3 pr-8 text-[13px] text-parchment outline-none",
            "focus:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
            error === undefined ? "border-abyss-border" : "border-crimson",
            className,
          )}
          {...rest}
        >
          {placeholder === undefined ? null : (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled} className="bg-abyss">
              {option.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-parchment-dim"
        >
          ▾
        </span>
      </div>
      {error === undefined && hint === undefined ? null : (
        <p
          id={`${fieldId ?? "field"}-message`}
          className={cn("text-[11px] leading-snug", error === undefined ? "text-parchment-dim" : "text-crimson")}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
});