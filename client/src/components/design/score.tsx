import { sc, EASE } from "@/styles/tokens";

interface ScoreProps {
  value: number;
  max?: number;
  size?: number;
  color?: string;
  label?: string;
  showPercent?: boolean;
  className?: string;
}

export function Score({
  value,
  max = 100,
  size = 48,
  color,
  label,
  showPercent = false,
  className = "",
}: ScoreProps) {
  const pct = Math.min(value / max, 1);
  const normalizedScore = Math.round(pct * 100);
  const strokeWidth = size > 40 ? 3.5 : 2.5;
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - pct);
  const center = size / 2;
  const fillColor = color || sc(normalizedScore);

  return (
    <div
      className={`flex flex-col items-center gap-0.5 ${className}`}
      data-testid="score-ring"
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          style={{ transform: "rotate(-90deg)" }}
          role="img"
          aria-label={`${label ? label + " " : ""}score ${value} of ${max}`}
        >
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={fillColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circ}
            strokeDashoffset={off}
            strokeLinecap="round"
            style={{ transition: `stroke-dashoffset 1s ${EASE}` }}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center font-mono font-semibold"
          style={{
            fontSize: size > 40 ? 12 : 9,
            color: fillColor,
          }}
        >
          {showPercent ? `${Math.round(pct * 100)}%` : value}
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
