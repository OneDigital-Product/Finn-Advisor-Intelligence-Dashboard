"use client";

import { P } from "@/styles/tokens";

interface UrgencyStripProps {
  openCases: number;
  overdueTasks: number;
  staleOpps: number;
}

function CountRow({
  count,
  label,
  color,
  isLast,
}: {
  count: number;
  label: string;
  color: string;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 0",
        borderBottom: isLast ? "none" : `1px solid ${P.odBorder}`,
        opacity: count > 0 ? 1 : 0.5,
        transition: "opacity 0.2s",
      }}
    >
      <span
        style={{
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          color: count > 0 ? color : P.odT3,
          lineHeight: 1,
          minWidth: 28,
          textAlign: "right",
        }}
      >
        {count}
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: P.odT3,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function UrgencyStrip({ openCases, overdueTasks, staleOpps }: UrgencyStripProps) {
  return (
    <div>
      <CountRow count={openCases} label="Open Cases" color={P.odOrange} />
      <CountRow count={overdueTasks} label="Overdue Tasks" color="#E53E3E" />
      <CountRow count={staleOpps} label="Stale Opps" color={P.odYellow} isLast />
    </div>
  );
}
