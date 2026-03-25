import * as TabsPrimitive from '@radix-ui/react-tabs';
import { P, EASE } from '@/styles/tokens';
import { TS } from './typography';

interface NavTab {
  id: string;
  label: string;
  count?: number;
}

interface NavTabsProps {
  tabs: NavTab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function NavTabs({ tabs, active, onChange, className = '' }: NavTabsProps) {
  return (
    <TabsPrimitive.Root value={active} onValueChange={onChange} className={className}>
      <TabsPrimitive.List
        style={{
          display: 'inline-flex',
          gap: 1,
          background: P.creamDk,
          borderRadius: 6,
          padding: 2,
        }}
      >
        {tabs.map(t => (
          <TabsPrimitive.Trigger
            key={t.id}
            value={t.id}
            style={{
              padding: '6px 14px',
              borderRadius: 4,
              border: 'none',
              fontSize: TS.label,
              fontWeight: active === t.id ? 600 : 500,
              fontFamily: "var(--font-body)",
              cursor: 'pointer',
              background: active === t.id ? P.cream : 'transparent',
              color: active === t.id ? P.dark : P.mid,
              boxShadow: active === t.id ? '0 1px 3px rgba(0,0,0,.05)' : 'none',
              transition: `all .15s ${EASE}`,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            data-testid={`tab-${t.id}`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span style={{
                fontSize: TS.label, padding: '1px 6px', borderRadius: 99,
                background: active === t.id ? P.navy : P.creamMd,
                color: active === t.id ? P.cream : P.mid,
                fontWeight: 600,
              }}>{t.count}</span>
            )}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
}
