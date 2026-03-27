"use client";

import { P } from "@/styles/tokens";

interface UrgencyStripProps {
  openCases: number;
  overdueTasks: number;
  staleOpps: number;
  meetingsToday: number;
}

function Badge({
  count,
  label,
  color,
  dimColor,
}: {
  count: number;
  label: string;
  color: string;
  dimColor: string;
}) {
  const isActive = count > 0;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "10px 16px",
        borderRadius: 8,
        border: `1px solid ${isActive ? color + "40" : P.odBorder}`,
        background: isActive ? color + "10" : "transparent",
        minWidth: 100,
        opacity: isActive ? 1 : 0.4,
        transition: "opacity 0.2s",
      }}
    >
      <span
        style={{
          fontSize: 22,
          fontWeight: 700,
          fontFamily: "'DM Mono', monospace",
          color: isActive ? color : dimColor,
          lineHeight: 1,
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
          color: isActive ? color : dimColor,
          marginTop: 4,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function UrgencyStrip({ openCases, overdueTasks, staleOpps, meetingsToday }: UrgencyStripProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        padding: "12px 0",
      }}
    >
      <Badge count={openCases} label="Open Cases" color={P.odOrange} dimColor={P.odT3} />
      <Badge count={overdueTasks} label="Overdue Tasks" color="#E53E3E" dimColor={P.odT3} />
      <Badge count={staleOpps} label="Stale Opps" color={P.odYellow} dimColor={P.odT3} />
      <Badge count={meetingsToday} label="Today's Meetings" color={P.odLBlue} dimColor={P.odT3} />
    </div>
  );
}
