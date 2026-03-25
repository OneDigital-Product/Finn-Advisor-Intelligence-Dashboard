import { P, tokens } from "@/styles/tokens";
import { AlertTriangle, Info, Eye } from "lucide-react";

type SignalLevel = "action-needed" | "review" | "info";

interface SignalCardProps {
  level: SignalLevel;
  title: string;
  children: React.ReactNode;
  className?: string;
}

const LEVEL_CONFIG: Record<
  SignalLevel,
  { border: string; bg: string; badge: string; badgeBg: string; icon: typeof AlertTriangle; label: string }
> = {
  "action-needed": {
    border: P.red,
    bg: P.rL,
    badge: P.red,
    badgeBg: P.rL,
    icon: AlertTriangle,
    label: "Action Needed",
  },
  review: {
    border: P.amb,
    bg: P.aL,
    badge: P.amb,
    badgeBg: P.aL,
    icon: Eye,
    label: "Review",
  },
  info: {
    border: P.creamMd,
    bg: P.cream,
    badge: P.mid,
    badgeBg: P.creamDk,
    icon: Info,
    label: "Info",
  },
};

export function SignalCard({ level, title, children, className = "" }: SignalCardProps) {
  const cfg = LEVEL_CONFIG[level];
  const Icon = cfg.icon;

  return (
    <div
      className={className}
      style={{
        borderLeft: `3px solid ${cfg.border}`,
        background: cfg.bg,
        borderRadius: "var(--radius-md)",
        padding: "16px 16px",
      }}
      data-testid={`signal-card-${level}`}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Icon style={{ width: 14, height: 14, color: cfg.badge, flexShrink: 0 }} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: P.dark,
            flex: 1,
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 99,
            background: cfg.badgeBg,
            color: cfg.badge,
            border: `1px solid ${cfg.badge}20`,
            textTransform: "uppercase",
            letterSpacing: ".04em",
          }}
        >
          {cfg.label}
        </span>
      </div>
      <div style={{ fontSize: 13, color: P.mid, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}
