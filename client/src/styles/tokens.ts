export const P = {
  navy: '#0C1222',
  navyMid: '#141D33',
  navyLt: '#1B2740',
  cream: '#FAF8F5',
  creamDk: '#F0EDE8',
  creamMd: '#E8E4DE',
  blue: '#6B8FE0',
  bHi: '#8AAEF0',
  bLo: '#4A6BC4',
  bDk: '#3B569E',
  bIce: '#E8EEFB',
  bFr: '#F2F5FC',
  grn: '#3D8B5E',
  gL: '#E8F3ED',
  gD: '#2D6B47',
  amb: '#B8872B',
  aL: '#FBF3E2',
  org: '#D4702A',
  oL: '#FDF0E6',
  red: '#C44B4B',
  rL: '#FAECEC',
  rD: '#9E3535',
  gold: '#C9A84C',
  goldLt: '#F7F0DA',
  ink: '#1B1D22',
  dark: '#2C2F36',
  mid: '#6B6F7A',
  lt: '#9B9FA8',
  fnt: '#C8CAD0',
  nText: '#E2E6EF',
  nMid: '#8B95AA',
  nFnt: '#4A5568',
  // V2 palette — OneDigital brand
  // ALIASED → var(--color-brand-deep)
  odDeep: '#00344F',
  // ALIASED → var(--color-brand-primary)
  odBlue: '#0078A2',
  // ALIASED → var(--color-brand-secondary)
  odLBlue: '#4FB3CD',
  // ALIASED → var(--color-success)
  odGreen: '#8EB935',
  // ALIASED → var(--color-success-light)
  odLGreen: '#C2E76B',
  // ALIASED → var(--color-orange)
  odOrange: '#F47D20',
  // ALIASED → var(--color-warning)
  odYellow: '#FFC60B',
  // ALIASED → var(--color-purple)
  odPurple: '#7F77DD',
  // ALIASED → var(--color-bg)
  odBg: '#0d1117',
  // ALIASED → var(--color-surface)
  odSurf: '#161b27',
  // ALIASED → var(--color-surface-raised)
  odSurf2: '#1d2333',
  // ALIASED → var(--color-surface-overlay)
  odSurf3: '#232b3e',
  // ALIASED → var(--color-border)
  odBorder: 'rgba(45,55,72,0.5)',
  // ALIASED → var(--color-border-subtle)
  odBorder2: 'rgba(45,55,72,0.4)',
  // ALIASED → var(--color-text-primary)
  odT1: '#f0f2f5',
  // ALIASED → var(--color-text-secondary)
  odT2: '#C7D0DD',
  // ALIASED → var(--color-text-tertiary)
  odT3: '#94A3B8',
  // ALIASED → var(--color-text-muted)
  odT4: '#4a5568',
  // Chart color ramp
  // ALIASED → var(--color-chart-equity)
  odEq: '#3B8BD4',
  // ALIASED → var(--color-chart-fi)
  odFi: '#1D9E75',
  // ALIASED → var(--color-chart-alt)
  odAlt: '#7F77DD',
  // ALIASED → var(--color-chart-cash)
  odCa: '#EF9F27',
} as const;

// ALIASED → var(--spring)
export const SPRING = 'cubic-bezier(.34,1.56,.64,1)';
// ALIASED → var(--ease)
export const EASE = 'cubic-bezier(.16,1,.3,1)';

export const sc = (v: number) => (v >= 80 ? P.grn : v >= 60 ? P.amb : v >= 40 ? P.org : P.red);
export const sb = (v: number) => (v >= 80 ? P.gL : v >= 60 ? P.aL : v >= 40 ? P.oL : P.rL);
export const sl = (v: number) => (v >= 80 ? 'Healthy' : v >= 60 ? 'On Track' : v >= 40 ? 'Review' : 'At Risk');

export const tokens = {
  colors: {
    navy: P.navy,
    cream: P.cream,
    blue: {
      primary: P.blue,
      light: P.bHi,
      dark: P.bDk,
    },
    green: { success: P.grn, light: P.gL },
    amber: { warning: P.amb, light: P.aL },
    red: { danger: P.red, light: P.rL },
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
    chart: {
      1: '#1447e6',
      2: '#009588',
      3: '#104e64',
      4: '#ac4bff',
      5: '#f99c00',
    },
  },
  typography: {
    serif: "'Cormorant Garamond', Georgia, serif",
    sans: "'Inter', 'DM Sans', system-ui, sans-serif",
    mono: "'DM Mono', 'Menlo', monospace",
    heading: "'Oswald', 'Inter', system-ui, sans-serif",
    data: "'JetBrains Mono', 'DM Mono', 'Menlo', monospace",
  },
  spacing: {
    xs: '2px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '48px',
  },
  borderRadius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '10px',
    xl: '14px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0,0,0,0.03)',
    md: '0 2px 4px -1px rgba(0,0,0,0.05)',
    lg: '0 4px 8px -2px rgba(0,0,0,0.06)',
    xl: '0 8px 24px -4px rgba(0,0,0,0.08)',
  },
  transitions: {
    fast: '150ms ease-out',
    base: '250ms ease-out',
    slow: '350ms ease-out',
    spring: SPRING,
    ease: EASE,
  },
} as const;

export function hexToHSL(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export type TokenColor = 'blue' | 'green' | 'amber' | 'red';

export const tokenColorMap: Record<TokenColor, string> = {
  blue: tokens.colors.blue.primary,
  green: tokens.colors.green.success,
  amber: tokens.colors.amber.warning,
  red: tokens.colors.red.danger,
};
