import { cn } from "../lib/cn";

/**
 * The wordmark and its device.
 *
 * The device is a meridian: a ring, a horizon line and a single standing star.
 * It is the smallest thing in the system that still says "observatory".
 */
export interface LogoProps {
  size?: number;
  title?: string;
  /** Renders the wordmark next to the device. */
  withWordmark?: boolean;
  href?: string;
  className?: string;
}

export function Logo({ size = 32, title = "Nooreign", withWordmark = true, href, className }: LogoProps) {
  const device = (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      role={withWordmark ? "presentation" : "img"}
      aria-hidden={withWordmark ? true : undefined}
      aria-label={withWordmark ? undefined : title}
      className="shrink-0"
      fill="none"
    >
      {withWordmark ? null : <title>{title}</title>}
      <circle cx={20} cy={20} r={16} stroke="var(--color-gold)" strokeWidth={1.4} />
      <path d="M4,20 L36,20" stroke="var(--color-gold)" strokeWidth={0.8} opacity={0.55} />
      <path d="M8.6,10 A16,16 0 0 1 31.4,10" stroke="var(--color-gold)" strokeWidth={0.8} opacity={0.35} />
      <path d="M8.6,30 A16,16 0 0 0 31.4,30" stroke="var(--color-gold)" strokeWidth={0.8} opacity={0.35} />
      <path
        d="M20 9 L21.6 18.6 L20 20 L18.4 18.6 Z"
        fill="var(--color-parchment)"
      />
      <circle cx={20} cy={20} r={2} fill="var(--color-crimson)" />
    </svg>
  );

  const wordmark = (
    <span className="flex flex-col leading-none">
      <span className="font-display text-[15px] tracking-[0.22em] text-parchment">NOOREGIAN</span>
      <span className="mt-1 text-[8px] uppercase tracking-[0.34em] text-parchment-dim">The Kingdoms of Mind</span>
    </span>
  );

  const content = withWordmark ? (
    <span className="flex items-center gap-2.5">
      {device}
      {wordmark}
    </span>
  ) : (
    device
  );

  if (href === undefined) {
    return <span className={cn("inline-flex items-center", className)}>{content}</span>;
  }
  return (
    <a
      href={href}
      aria-label={title}
      className={cn(
        "inline-flex items-center rounded-[6px] transition-opacity hover:opacity-90",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
        className,
      )}
    >
      {content}
    </a>
  );
}