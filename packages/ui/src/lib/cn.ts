import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * The single class-name composer for the whole design system.
 *
 * `clsx` flattens conditionals/objects/arrays; `tailwind-merge` then resolves
 * conflicting Tailwind utilities so a caller-supplied `className` always wins
 * over the component's own default (this is why `Button` can ship opinionated
 * padding while still being overridable from the app without `!important`).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export type { ClassValue };