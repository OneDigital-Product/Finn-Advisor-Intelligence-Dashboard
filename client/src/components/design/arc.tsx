import { EASE } from "@/styles/tokens";

interface ArcProps {
  v: number;
  max?: number;
  sz?: number;
  c?: string;
  label?: string;
  className?: string;
}

export function Arc({ v, max = 100, sz = 40, c, label, className = '' }: ArcProps) {
  const pct = v / max;
  const r = (sz - 5) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - pct);
  const center = sz / 2;
  const scoreColor = c || 'hsl(var(--chart-1))';

  return (
    <div className={`flex flex-col items-center gap-0.5 ${className}`} data-testid="arc-chart">
      <div className="relative" style={{ width: sz, height: sz }}>
        <svg width={sz} height={sz} style={{ transform: 'rotate(-90deg)' }} role="img" aria-label={`${label ? label + ' ' : ''}score ${v} of ${max}`}>
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="3"
          />
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={scoreColor}
            strokeWidth="3"
            strokeDasharray={circ}
            strokeDashoffset={off}
            strokeLinecap="round"
            style={{ transition: `stroke-dashoffset 1s ${EASE}` }}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center font-mono font-semibold"
          style={{
            fontSize: sz > 36 ? 11 : 9,
            color: scoreColor,
          }}
        >
          {v}
        </span>
      </div>
      {label && (
        <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
}
