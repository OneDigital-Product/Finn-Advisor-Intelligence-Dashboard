import { type ReactNode, type HTMLAttributes } from 'react';

export const TS = {
  title: 24,
  section: 18,
  body: 15,
  supporting: 13,
  label: 11,
} as const;

interface TypoProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div';
}

export function Serif({ children, as: Tag = 'span', className = '', style, ...props }: TypoProps) {
  return (
    <Tag
      className={`font-serif ${className}`}
      style={{ fontFamily: "var(--font-serif)", ...style }}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function Mono({ children, as: Tag = 'span', className = '', style, ...props }: TypoProps) {
  return (
    <Tag
      className={`font-mono tracking-tight ${className}`}
      style={{ fontFamily: "var(--font-data)", ...style }}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function Body({ children, as: Tag = 'p', className = '', style, ...props }: TypoProps) {
  return (
    <Tag
      className={className}
      style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 400, lineHeight: 1.6, ...style }}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function Supporting({ children, as: Tag = 'span', className = '', style, ...props }: TypoProps) {
  return (
    <Tag
      className={className}
      style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 400, color: '#6B6F7A', lineHeight: 1.5, ...style }}
      {...props}
    >
      {children}
    </Tag>
  );
}

interface LblProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  muted?: boolean;
}

export function Lbl({ children, muted = false, className = '', ...props }: LblProps) {
  return (
    <span
      className={`text-[11px] font-medium uppercase tracking-widest ${muted ? 'text-muted-foreground' : 'text-foreground/70'} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
