import Link from "next/link";
import type { Kingdom } from "@repo/seed";
import { KINGDOMS } from "@repo/seed";

/**
 * The atlas plate: the whole realm rendered as one map, drawn from the same
 * capital coordinates the data carries. This is the piece of the product that has
 * to work on first paint, so it is a server component with no client JS at all.
 */
const VIEW = 420;
const PAD = 46;
const SPAN = 100;

const scale = (value: number) => PAD + (value / SPAN) * (VIEW - PAD * 2);

export function AtlasPlate({ kingdoms = KINGDOMS }: { kingdoms?: readonly Kingdom[] }) {
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className="h-auto w-full"
      role="img"
      aria-label="Map of the twelve kingdoms, plotted by capital"
    >
      <title>The twelve kingdoms of Nooreign</title>
      <defs>
        <pattern id="atlas-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#1E2C4D" strokeWidth="0.5" />
        </pattern>
        <radialGradient id="atlas-halo" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#5A6FD6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#5A6FD6" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={VIEW} height={VIEW} fill="url(#atlas-grid)" opacity="0.6" />
      <rect width={VIEW} height={VIEW} fill="url(#atlas-halo)" />

      {/* Dusk lines between related realms */}
      <g stroke="#5A6FD6" strokeWidth="0.7" opacity="0.45">
        {kingdoms.flatMap((a) =>
          a.relations.map((rel) => {
            const b = KINGDOMS.find((k) => k.id === rel.to);
            if (!b) return null;
            const key = [a.id, b.id].sort().join("::");
            return (
              <line
                key={`${a.id}-${rel.to}`}
                x1={scale(a.capital.x)}
                y1={scale(a.capital.y)}
                x2={scale(b.capital.x)}
                y2={scale(b.capital.y)}
                strokeDasharray={rel.kind === "rivalry" ? "3 3" : rel.kind === "vassal" ? "6 2 1 2" : "none"}
                strokeDashoffset={0}
                opacity={rel.kind === "debate" ? 0.3 : 0.55}
                data-relation={key}
              />
            );
          }),
        )}
      </g>

      {/* Capitals */}
      {kingdoms.map((kingdom) => (
        <Link key={kingdom.id} href={`/kingdoms/${kingdom.slug}`}>
          <g>
            <circle
              cx={scale(kingdom.capital.x)}
              cy={scale(kingdom.capital.y)}
              r="9"
              fill={kingdom.crest.primary}
              fillOpacity="0.16"
              stroke={kingdom.crest.primary}
              strokeWidth="0.8"
            />
            <circle cx={scale(kingdom.capital.x)} cy={scale(kingdom.capital.y)} r="3.1" fill={kingdom.crest.primary} />
            <text
              x={scale(kingdom.capital.x)}
              y={scale(kingdom.capital.y) - 12}
              textAnchor="middle"
              fontSize="7.5"
              fill="#EDE4D3"
              fontFamily="var(--font-sans)"
              opacity="0.92"
            >
              {kingdom.name.replace(/^The /, "")}
            </text>
          </g>
        </Link>
      ))}
    </svg>
  );
}
