"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useId, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "../lib/cn";

/**
 * Continuous parameter control for the thought experiments.
 *
 * Pointer capture is used for the drag so the knob keeps tracking after the
 * pointer leaves the track — without it, dragging past the end of a short track
 * on a touch screen stops dead.
 */
export interface SliderProps {
  label: string;
  value: number;
  onValueChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Formats the readout; defaults to a trimmed number. */
  format?: (value: number) => string;
  unit?: string;
  hint?: string;
  disabled?: boolean;
  /** Draws the fill from this value instead — used for min/max handles. */
  markers?: readonly { at: number; label?: string }[];
  className?: string;
}

export function Slider({
  label,
  value,
  onValueChange,
  min = 0,
  max = 1,
  step = 0.01,
  format,
  unit,
  hint,
  disabled = false,
  markers,
  className,
}: SliderProps) {
  const id = useId();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const span = max - min;
  const ratio = span === 0 ? 0 : Math.min(1, Math.max(0, (value - min) / span));
  const shown = format === undefined ? String(Number(value.toFixed(4))) : format(value);

  const setFromClientX = useCallback(
    (clientX: number): void => {
      const track = trackRef.current;
      if (track === null) return;
      const rect = track.getBoundingClientRect();
      const pct = rect.width === 0 ? 0 : (clientX - rect.left) / rect.width;
      const raw = min + Math.min(1, Math.max(0, pct)) * span;
      const stepped = Math.round(raw / step) * step;
      // Re-round to kill binary drift so the readout shows 0.3 and not 0.30000000004.
      onValueChange(Number(Math.min(max, Math.max(min, stepped)).toFixed(6)));
    },
    [max, min, onValueChange, span, step],
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setFromClientX(event.clientX);
  };

  return (
    <div className={cn("flex flex-col gap-2", disabled && "opacity-45", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[10px] font-medium uppercase tracking-[0.22em] text-parchment-dim">
          {label}
        </label>
        <span className="font-mono text-[12px] tabular-nums text-gold">
          {shown}
          {unit === undefined ? null : <span className="ml-1 text-parchment-dim">{unit}</span>}
        </span>
      </div>
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) setFromClientX(event.clientX);
        }}
        className={cn(
          "relative h-5 select-none",
          disabled ? "cursor-not-allowed" : "cursor-ew-resize",
          "focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-gold",
        )}
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-abyss border border-abyss-border" />
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gold"
          style={{ width: `${ratio * 100}%` }}
        />
        {markers === undefined
          ? null
          : markers.map((marker) => {
              const at = span === 0 ? 0 : Math.min(1, Math.max(0, (marker.at - min) / span));
              return (
                <span
                  key={marker.at}
                  aria-hidden="true"
                  className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-parchment-dim"
                  style={{ left: `${at * 100}%` }}
                />
              );
            })}
        <motion.span
          aria-hidden="true"
          animate={{ left: `${ratio * 100}%` }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 36 }}
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold bg-abyss"
        />
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={label}
          aria-valuetext={shown}
          onChange={(event) => onValueChange(Number(event.currentTarget.value))}
          className="absolute inset-0 size-full cursor-ew-resize opacity-0"
        />
      </div>
      {hint === undefined ? null : <p className="text-[11px] leading-snug text-parchment-dim">{hint}</p>}
    </div>
  );
}