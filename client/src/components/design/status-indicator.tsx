import { P } from '@/styles/tokens';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

export type StatusLevel = 'healthy' | 'on-track' | 'review' | 'at-risk' | 'info';

interface StatusIndicatorProps {
  level: StatusLevel;
  label?: string;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<StatusLevel, { color: string; bg: string; icon: typeof CheckCircle2; defaultLabel: string }> = {
  healthy: { color: P.grn, bg: P.gL, icon: CheckCircle2, defaultLabel: 'Healthy' },
  'on-track': { color: P.amb, bg: P.aL, icon: CheckCircle2, defaultLabel: 'On Track' },
  review: { color: P.org, bg: P.oL, icon: AlertTriangle, defaultLabel: 'Review' },
  'at-risk': { color: P.red, bg: P.rL, icon: XCircle, defaultLabel: 'At Risk' },
  info: { color: P.blue, bg: P.bIce, icon: Info, defaultLabel: 'Info' },
};

export function scoreToLevel(score: number): StatusLevel {
  if (score >= 80) return 'healthy';
  if (score >= 60) return 'on-track';
  if (score >= 40) return 'review';
  return 'at-risk';
}

const SIZES = {
  sm: { icon: 10, font: 10, pad: '2px 7px', gap: 4 },
  md: { icon: 12, font: 11, pad: '3px 10px', gap: 5 },
  lg: { icon: 14, font: 13, pad: '4px 12px', gap: 6 },
};

export function StatusIndicator({
  level,
  label,
  score,
  size = 'md',
  showIcon = true,
  showLabel = true,
  className = '',
}: StatusIndicatorProps) {
  const config = STATUS_CONFIG[level];
  const Icon = config.icon;
  const s = SIZES[size];
  const displayLabel = label || config.defaultLabel;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        padding: s.pad,
        borderRadius: "var(--radius-full)",
        fontSize: s.font,
        fontWeight: 600,
        fontFamily: "var(--font-body)",
        color: config.color,
        background: config.bg,
        border: `1px solid ${config.color}14`,
      }}
      role="status"
      aria-label={`${displayLabel}${score !== undefined ? ` — score ${score}` : ''}`}
      data-testid={`status-${level}`}
    >
      {showIcon && <Icon style={{ width: s.icon, height: s.icon, flexShrink: 0 }} />}
      {score !== undefined && (
        <span style={{ fontFamily: "var(--font-data)", fontWeight: 700 }}>{score}</span>
      )}
      {showLabel && <span>{displayLabel}</span>}
    </span>
  );
}
