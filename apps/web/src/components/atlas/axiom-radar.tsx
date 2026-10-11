import { AXIOM_KEYS, DIMENSION_META, type AxiomVector } from "@repo/seed";

/**
 * Six-axis radar for an axiom vector. Hand-plotted rather than pulled from a chart
 * library: it has to render identically in a server component, in the OG image and
 * in a static export, and the geometry is ten lines.
 */
export function AxiomRadar({
  vector,
  size = 220,
  label,
  compare,
}: {
  vector: AxiomVector;
  size?: number;
  label?: string;
  compare?: { vector: AxiomVector; label: string; color: string };
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 34;

  const point = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / AXIOM_KEYS.length - Math.PI / 2;
    return [cx + Math.cos(angle) * radius * value, cy + Math.sin(angle) * radius * value] as const;
  };

  const polygon = (v: AxiomVector) =>
    AXIOM_KEYS.map((key, index) => point(index, Math.max(0.04, v[key])).join(","))
      .join(" ");

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full max-w-[260px]" role="img" aria-label={`${label ?? "Axiom"} profile across six moral dimensions`}>
        <title>{label ? `${label} — moral profile` : "Moral profile"}</title>

        {[0.25, 0.5, 0.75, 1].map((ring) => (
          <polygon
            key={ring}
            points={AXIOM_KEYS.map((_, index) => point(index, ring).join(",")).join(" ")}
            fill="none"
            stroke="#1E2C4D"
            strokeWidth="1"
          />
        ))}
        {AXIOM_KEYS.map((key, index) => {
          const [x, y] = point(index, 1);
          return <line key={key} x1={cx} y1={cy} x2={x} y2={y} stroke="#1E2C4D" strokeWidth="1" />;
        })}

        {compare ? (
          <polygon points={polygon(compare.vector)} fill={`${compare.color}22`} stroke={compare.color} strokeWidth="1.4" strokeDasharray="3 2" />
        ) : null}

        <polygon points={polygon(vector)} fill="rgba(217,164,65,0.22)" stroke="#D9A441" strokeWidth="1.6" />
        {AXIOM_KEYS.map((key, index) => {
          const [x, y] = point(index, Math.max(0.04, vector[key]));
          return <circle key={key} cx={x} cy={y} r="2.6" fill="#D9A441" />;
        })}

        {AXIOM_KEYS.map((key, index) => {
          const [x, y] = point(index, 1.24);
          return (
            <text
              key={key}
              x={x}
              y={y}
              textAnchor={x > cx + 4 ? "start" : x < cx - 4 ? "end" : "middle"}
              dominantBaseline={y < cy - 4 ? "auto" : y > cy + 4 ? "hanging" : "middle"}
              fontSize="9.5"
              fill="#B9AE99"
              fontFamily="var(--font-sans)"
            >
              {DIMENSION_META[key].label}
            </text>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-dim/70">
        {label ?? "moral profile"}
      </figcaption>
    </figure>
  );
}
