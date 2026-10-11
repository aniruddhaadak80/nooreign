import type { Verdict } from "@repo/seed";

const STYLES: Record<Verdict, { label: string; className: string }> = {
  optimistic: { label: "optimistic", className: "border-verdigris/60 text-verdigris bg-verdigris/10" },
  guarded: { label: "guarded", className: "border-gold/60 text-gold bg-gold/10" },
  skeptical: { label: "skeptical", className: "border-crimson/60 text-crimson bg-crimson/10" },
  transformative: { label: "transformative", className: "border-indigo-glow/60 text-indigo-glow bg-indigo-glow/10" },
};

export function VerdictBadge({ verdict, className = "" }: { verdict: Verdict; className?: string }) {
  const style = STYLES[verdict];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${style.className} ${className}`}>
      {style.label}
    </span>
  );
}
