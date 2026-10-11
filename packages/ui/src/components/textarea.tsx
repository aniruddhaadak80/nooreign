import { forwardRef, type ComponentProps } from "react";
import { cn } from "../lib/cn";

/**
 * Multi-line field for dilemma prompts and counsel notes.
 */
export interface TextareaProps extends ComponentProps<"textarea"> {
  label?: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  /** Shows a live character budget, e.g. "312 / 500". */
  maxLength?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, hideLabel = false, maxLength, className, id, value, ...rest },
  ref,
) {
  const fieldId = id ?? rest.name ?? undefined;
  const text = typeof value === "string" ? value : "";
  const overBudget = maxLength !== undefined && text.length > maxLength;
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
      <textarea
        ref={ref}
        id={fieldId}
        value={value}
        rows={rest.rows ?? 4}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={hint === undefined && error === undefined ? undefined : `${fieldId ?? "field"}-message`}
        className={cn(
          "w-full resize-y rounded-[6px] border bg-abyss px-3 py-2 text-[13px] leading-relaxed text-parchment outline-none",
          "placeholder:text-parchment-dim/60 focus:border-gold",
          error === undefined ? "border-abyss-border" : "border-crimson",
          className,
        )}
        {...rest}
      />
      <div className="flex items-start justify-between gap-3">
        {error !== undefined || hint !== undefined ? (
          <p
            id={`${fieldId ?? "field"}-message`}
            className={cn("text-[11px] leading-snug", error === undefined ? "text-parchment-dim" : "text-crimson")}
          >
            {error ?? hint}
          </p>
        ) : (
          <span />
        )}
        {maxLength === undefined ? null : (
          <span
            className={cn(
              "shrink-0 font-mono text-[10px] tabular-nums",
              overBudget ? "text-crimson" : "text-parchment-dim",
            )}
          >
            {text.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
});