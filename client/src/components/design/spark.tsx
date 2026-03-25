interface SparkProps {
  data: number[];
  w?: number;
  h?: number;
  c?: string;
  className?: string;
}

export function Spark({ data, w = 70, h = 20, c = 'hsl(var(--chart-1))', className = '' }: SparkProps) {
  if (!data.length) return null;

  if (data.length === 1) {
    return (
      <svg width={w} height={h} className={className} data-testid="spark-chart" role="img" aria-label={`Single data point: ${data[0]}`}>
        <circle cx={w / 2} cy={h / 2} r={2.5} fill={c} />
      </svg>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const rng = max - min || 1;

  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / rng) * (h - 4) - 2}`)
    .join(' ');

  const gid = `sg${(c).replace(/[^a-zA-Z0-9]/g, '')}${w}`;
  const lastY = h - ((data[data.length - 1] - min) / rng) * (h - 4) - 2;

  return (
    <svg width={w} height={h} style={{ display: 'block' }} className={className} data-testid="spark-chart" role="img" aria-label={`Sparkline trend from ${data[0]} to ${data[data.length - 1]}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c} stopOpacity=".12" />
          <stop offset="1" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${gid})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={c}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={w} cy={lastY} r="2.5" fill={c} stroke="hsl(var(--background))" strokeWidth="1.5" />
    </svg>
  );
}
