import { type ReactNode, type ButtonHTMLAttributes } from 'react';
import { P, SPRING } from '@/styles/tokens';

interface ActionBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: ReactNode;
  primary?: boolean;
}

export function ActionBtn({
  label,
  icon,
  primary = false,
  className = '',
  disabled,
  ...props
}: ActionBtnProps) {
  const variant = primary ? 'action-btn--primary' : 'action-btn--ghost';

  return (
    <>
      <style>{ACTION_BTN_CSS}</style>
      <button
        className={`action-btn ${variant} ${className}`}
        disabled={disabled}
        aria-disabled={disabled || undefined}
        data-testid="action-btn"
        {...props}
      >
        {icon}
        {label}
      </button>
    </>
  );
}

/* ── Scoped CSS for hover / active / disabled ── */
const ACTION_BTN_CSS = `
  .action-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    font-family: var(--font-body);
    transition: all .2s ${SPRING};
  }

  .action-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
    pointer-events: none;
  }

  .action-btn:active:not(:disabled) {
    transform: scale(0.98);
  }

  /* ── Ghost variant ── */
  .action-btn--ghost {
    padding: 8px 12px;
    border: 1px solid ${P.creamMd};
    background: ${P.cream};
    color: ${P.mid};
  }

  .action-btn--ghost:hover:not(:disabled) {
    border-color: ${P.blue};
    color: ${P.blue};
  }

  /* ── Primary variant ── */
  .action-btn--primary {
    padding: 8px 16px;
    border: none;
    background: ${P.navy};
    color: ${P.nText};
  }

  .action-btn--primary:hover:not(:disabled) {
    background: ${P.navyLt};
  }
`;
