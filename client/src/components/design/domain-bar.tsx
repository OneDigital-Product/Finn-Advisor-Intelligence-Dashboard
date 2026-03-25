import { type ReactNode } from 'react';
import { P, sc, EASE } from '@/styles/tokens';
import { Mono } from './typography';

interface DomainBarProps {
  label: string;
  score: number;
  icon?: ReactNode;
  className?: string;
}

export function DomainBar({ label, score, icon, className = '' }: DomainBarProps) {
  return (
    <div
      className={className}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}
      data-testid="domain-bar"
    >
      <span style={{ color: sc(score), width: 18, display: 'flex', justifyContent: 'center' }} aria-hidden="true">
        {icon}
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, color: P.dark, width: 80 }}>{label}</span>
      <div
        role="progressbar"
        aria-label={`${label} score`}
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          flex: 1,
          height: 5,
          borderRadius: 99,
          background: P.creamDk,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: 99,
            width: `${score}%`,
            background: sc(score),
            transition: `width 1s ${EASE}`,
            animation: `fill .8s ${EASE}`,
          }}
        />
      </div>
      <Mono
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: sc(score),
          width: 28,
          textAlign: 'right',
        }}
      >
        {score}
      </Mono>
    </div>
  );
}
