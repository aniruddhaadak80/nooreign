import Link from "next/link";
import type { Kingdom } from "@repo/seed";

const RELATION_LABELS: Record<string, string> = {
  alliance: "allied",
  rivalry: "rival",
  vassal: "holds",
  debate: "debates",
  succession: "succeeds",
};

/** The crest: kingdom sigil inside a ring, plus the terrain name in mono underneath. */
export function KingdomCrest({ kingdom, size = 44 }: { kingdom: Kingdom; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        backgroundColor: `${kingdom.crest.primary}1a`,
        border: `1px solid ${kingdom.crest.primary}66`,
        color: kingdom.crest.primary,
        fontSize: size * 0.38,
      }}
      aria-hidden
    >
      {kingdom.crest.sigil}
    </span>
  );
}

export function KingdomCard({ kingdom }: { kingdom: Kingdom }) {
  return (
    <Link
      href={`/kingdoms/${kingdom.slug}`}
      className="plate group flex h-full flex-col gap-4 rounded-realm p-5 transition-colors hover:border-gold/50"
      style={{ borderLeft: `3px solid ${kingdom.crest.primary}` }}
    >
      <div className="flex items-start gap-3">
        <KingdomCrest kingdom={kingdom} />
        <div className="min-w-0">
          <h2 className="serif text-lg leading-tight text-parchment group-hover:text-gold">{kingdom.name}</h2>
          <p className="font-mono text-[11px] text-parchment-dim/70">
            {kingdom.founded < 0 ? `${Math.abs(kingdom.founded)} BCE` : kingdom.founded} · {kingdom.founder}
          </p>
        </div>
      </div>
      <p className="text-sm italic leading-relaxed text-parchment-dim">“{kingdom.motto}”</p>
      <p className="text-sm leading-relaxed text-parchment-dim/90">{kingdom.aiStance.headline}</p>
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-parchment-dim/60">
        <span>{kingdom.terrain}</span>
        <span aria-hidden>·</span>
        <span>{kingdom.relations.length} ties</span>
        <span aria-hidden>·</span>
        <span>{kingdom.advisors.length} advisors</span>
      </div>
    </Link>
  );
}

export function RelationList({ kingdom, all }: { kingdom: Kingdom; all: readonly Kingdom[] }) {
  if (kingdom.relations.length === 0) return null;
  return (
    <ul className="space-y-2">
      {kingdom.relations.map((relation) => {
        const other = all.find((k) => k.id === relation.to);
        return (
          <li key={`${kingdom.id}-${relation.to}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
              {RELATION_LABELS[relation.kind] ?? relation.kind}
            </span>
            {other ? (
              <Link href={`/kingdoms/${other.slug}`} className="text-parchment hover:text-gold">
                {other.name}
              </Link>
            ) : (
              <span className="text-parchment">{relation.to}</span>
            )}
            <span className="text-parchment-dim/80">— {relation.note}</span>
          </li>
        );
      })}
    </ul>
  );
}
