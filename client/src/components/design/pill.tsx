import { type ReactNode } from 'react';
import { P } from '@/styles/tokens';
import { TS } from './typography';

interface PillProps {
  label: string;
  c?: string;
  bg?: string;
  dot?: boolean;
  icon?: ReactNode;
  className?: string;
}

export function Pill({ label, c = P.mid, bg = P.creamDk, dot = true, icon, className = '' }: PillProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: "var(--radius-full)",
        fontSize: TS.label,
        fontWeight: 600,
        fontFamily: "var(--font-body)",
        color: c,
        background: bg,
        border: `1px solid ${c}14`,
      }}
      aria-label={label}
      data-testid="pill"
    >
      {icon ? (
        <span style={{ display: 'flex', alignItems: 'center', width: 10, height: 10 }}>{icon}</span>
      ) : dot ? (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: c,
          }}
        />
      ) : null}
      {label}
    </span>
  );
}
