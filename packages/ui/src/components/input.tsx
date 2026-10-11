import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Controlled text field. Server-safe by construction — no internal state, so
 * the app owns the value and can drive it from a URL query or a reducer.
 */
export interface InputProps extends ComponentProps<"input"> {
  label?: string;
  hint?: string;
  error?: string;
  /** Rendered inside the field, before the text. */
  adornment?: ReactNode;
  /** Fixed suffix, e.g. a unit or a keyboard hint. */
  suffix?: ReactNode;
  /** Visually hides the label while keeping it available to assistive tech. */
  hideLabel?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, adornment, suffix, hideLabel = false, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name ?? undefined;
  return (
    <div className="flex flex-col gap-1">
      {label === undefined ? null : (
        <label
          htmlFor={inputId}
          className={cn(
            "text-[10px] font-medium uppercase tracking-[0.22em] text-parchment-dim",
            hideLabel && "sr-only",
          )}
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          "flex items-center gap-2 rounded-[6px] border bg-abyss px-3 transition-colors duration-150",
          "focus-within:border-gold",
          error === undefined ? "border-abyss-border" : "border-crimson",
        )}
      >
        {adornment === undefined ? null : (
          <span aria-hidden="true" className="shrink-0 text-parchment-dim">
            {adornment}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={hint === undefined && error === undefined ? undefined : `${inputId ?? "field"}-message`}
          className={cn(
            "h-10 w-full min-w-0 bg-transparent text-[13px] text-parchment outline-none",
            "placeholder:text-parchment-dim/60",
            className,
          )}
          {...rest}
        />
        {suffix === undefined ? null : <span className="shrink-0 text-[11px] text-parchment-dim">{suffix}</span>}
      </div>
      {error === undefined && hint === undefined ? null : (
        <p
          id={`${inputId ?? "field"}-message`}
          className={cn("text-[11px] leading-snug", error === undefined ? "text-parchment-dim" : "text-crimson")}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
});