import { AXIOM_KEYS, type AxiomKey, type DilemmaOption } from "@repo/seed/types";
import { AXIOM_COLORS } from "../lib/palette";
import { cn } from "../lib/cn";
import { BarMeter } from "./bar-meter";

/**
 * Side-by-side comparison of the options on a dilemma. Rows are the axes a
 * council actually argues over — the six axioms plus risk, reversibility and
 * the harm done to the agent, which is the row people forget to argue over.
 */
export interface OptionTableProps {
  options: readonly DilemmaOption[];
  /** Option id to gild. */
  selectedOptionId?: string;
  /** Adds the harm/benefit bullet lists underneath each option. */
  showConsequences?: boolean;
  className?: string;
  caption?: string;
}

const ROWS: readonly { key: string; label: string; read: (option: DilemmaOption) => number; axiom: boolean }[] = [
  ...AXIOM_KEYS.map((key) => ({
    key: `axiom-${key}`,
    label: key,
    axiom: true,
    read: (option: DilemmaOption) => option.deltas[key],
  })),
  { key: "risk", label: "risk", axiom: false, read: (option) => option.risk },
  { key: "reversibility", label: "reversibility", axiom: false, read: (option) => option.reversibility },
  { key: "agentHarm", label: "agent harm", axiom: false, read: (option) => option.agentHarm },
];

export function OptionTable({
  options,
  selectedOptionId,
  showConsequences = false,
  className,
  caption = "Deliberative profile of each option",
}: OptionTableProps) {
  if (options.length === 0) return null;

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full min-w-[560px] border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-abyss-border">
            <th scope="col" className="w-36 px-2 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-parchment-dim">
              Axis
            </th>
            {options.map((option) => (
              <th
                key={option.id}
                scope="col"
                className={cn(
                  "px-2 py-2 align-bottom",
                  option.id === selectedOptionId ? "text-gold" : "text-parchment",
                )}
              >
                <span className="block font-display text-[13px] tracking-[0.03em]">{option.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.key} className="border-b border-abyss-border/60 last:border-b-0">
              <th
                scope="row"
                className="px-2 py-2 text-left text-[10px] font-normal uppercase tracking-[0.14em] text-parchment-dim"
              >
                {row.label}
              </th>
              {options.map((option) => (
                <td key={option.id} className="px-2 py-2 align-middle">
                  <BarMeter
                    value={row.read(option)}
                    tone="plain"
                    {...(row.axiom ? { color: AXIOM_COLORS[(row.key.slice(6) as string) as AxiomKey] } : {})}
                    label={`${row.label}: ${option.label}`}
                    height={6}
                    className="min-w-[88px]"
                  />
                </td>
              ))}
            </tr>
          ))}
          {showConsequences ? (
            <tr>
              <th scope="row" className="px-2 py-3 text-left align-top text-[10px] font-normal uppercase tracking-[0.14em] text-parchment-dim">
                Consequences
              </th>
              {options.map((option) => (
                <td key={option.id} className="px-2 py-3 align-top">
                  <ul className="flex flex-col gap-1">
                    {option.benefits.slice(0, 2).map((benefit) => (
                      <li key={benefit} className="text-[11px] leading-snug text-verdigris">
                        + {benefit}
                      </li>
                    ))}
                    {option.harms.slice(0, 2).map((harm) => (
                      <li key={harm} className="text-[11px] leading-snug text-crimson">
                        − {harm}
                      </li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}