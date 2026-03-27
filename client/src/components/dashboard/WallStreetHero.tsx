import React from 'react';

/* ── Props ── */
interface ODHeroProps {
  greeting: string;
  firstName: string;
  lastName: string;
  totalAum: number;
  activeClients: number;
  meetingsToday: number;
  urgentCategories: number;
  isLiveData: boolean;
  isLoading?: boolean;
}

/* ── Formatting ── */
function fmtCompact(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

/* ── Hero Component ── */
export default function WallStreetHero({
  greeting,
  firstName,
  lastName,
  totalAum,
  activeClients,
  meetingsToday,
  urgentCategories,
  isLiveData,
  isLoading,
}: ODHeroProps) {
  // Briefing sentence — summarizes the day without conflicting with urgency strip counts
  const briefingParts: string[] = [];
  if (meetingsToday > 0) {
    briefingParts.push(`You have ${meetingsToday} meeting${meetingsToday !== 1 ? "s" : ""} today`);
  } else {
    briefingParts.push("No meetings scheduled today");
  }
  if (urgentCategories > 0) {
    briefingParts.push(`${urgentCategories} urgent categor${urgentCategories !== 1 ? "ies" : "y"} to review`);
  }
  const briefing = briefingParts.join(" and ") + ".";

  // Date string
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 32,
        alignItems: "end",
        padding: "32px 0 24px",
      }}
    >
      {/* Left — Greeting + Name + Briefing */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.08em",
            color: "var(--color-text-tertiary)",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {greeting.toUpperCase()} · {dateStr}
        </div>

        <div style={{ marginTop: 8 }}>
          <span
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 400,
              fontSize: 44,
              lineHeight: 1,
              color: "var(--color-text-primary)",
              display: "block",
            }}
          >
            {firstName.toUpperCase()}
          </span>
          <span
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 400,
              fontSize: 44,
              lineHeight: 1,
              color: "var(--color-brand-secondary)",
              display: "block",
            }}
          >
            {lastName.toUpperCase()}
            <span style={{ color: "var(--color-text-primary)" }}>.</span>
          </span>
        </div>

        <p
          style={{
            marginTop: 12,
            fontSize: 14,
            lineHeight: 1.5,
            color: "var(--color-text-secondary)",
            maxWidth: 420,
          }}
        >
          {isLoading ? (
            "Loading live data from Salesforce + Orion..."
          ) : (
            briefing
          )}
        </p>
      </div>

      {/* Right — 2 KPIs only: AUM (dominant) + Clients (supporting) */}
      <div style={{ textAlign: "right" }}>
        {/* AUM — dominant metric */}
        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: "0.1em",
              color: "var(--color-text-tertiary)",
              fontFamily: "'DM Mono', monospace",
              textTransform: "uppercase",
            }}
          >
            Assets Under Mgmt.
          </div>
          <div
            style={{
              fontSize: 38,
              fontWeight: 700,
              fontFamily: "'DM Mono', monospace",
              color: "var(--color-brand-secondary)",
              lineHeight: 1.1,
              marginTop: 2,
            }}
          >
            {isLoading ? "—" : fmtCompact(totalAum)}
          </div>
        </div>

        {/* Clients — supporting metadata */}
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: "0.1em",
              color: "var(--color-text-tertiary)",
              fontFamily: "'DM Mono', monospace",
              textTransform: "uppercase",
            }}
          >
            Active Clients
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              fontFamily: "'DM Mono', monospace",
              color: "var(--color-text-primary)",
              lineHeight: 1.1,
              marginTop: 2,
            }}
          >
            {isLoading ? "—" : activeClients.toLocaleString()}
          </div>
        </div>

        {/* Live data indicator */}
        {isLiveData && !isLoading && (
          <div
            style={{
              marginTop: 12,
              fontSize: 9,
              letterSpacing: "0.08em",
              color: "var(--color-success)",
              fontFamily: "'DM Mono', monospace",
              textTransform: "uppercase",
            }}
          >
            ● LIVE DATA
          </div>
        )}
      </div>
    </div>
  );
}
