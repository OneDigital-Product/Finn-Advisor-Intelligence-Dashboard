import { useEffect, useState } from "react";
import {
  useDataSources,
  type DataSourceStatus,
} from "@/components/design/data-source-badge";

/* ── OD Brand Palette ── */
const OD = {
  deepBlue: "#00344F",
  medBlue: "#0078A2",
  medGreen: "#8EB935",
  orange: "#F47D20",
  lightBlue: "#4FB3CD",
  lightGreen: "#C2E76B",
  yellow: "#FFC60B",
  bgDark: "#0f1419",
  bgMed: "#1a1f2e",
  text1: "#FFFFFF",
  text2: "#C7D0DD",
  text3: "#94A3B8",
  border: "#2D3748",
};

// ---------------------------------------------------------------------------
// Helpers to normalise either response shape into a connected boolean
// (mirrors the normalisation in data-source-badge.tsx)
// ---------------------------------------------------------------------------

function isMulesoftConnected(ds?: DataSourceStatus): boolean {
  // Legacy flat shape
  if (ds?.mulesoft?.connected !== undefined) return ds.mulesoft.connected;
  // New nested shape — mulesoft is connected when the token status is "ok"
  const ms = ds?.integrations?.mulesoft;
  if (ms) return (ms.token as any)?.status === "ok" || ms.enabled === true;
  return false;
}

function isOrionConnected(ds?: DataSourceStatus): boolean {
  if (ds?.orion?.connected !== undefined) return ds.orion.connected;
  return ds?.integrations?.orion?.status === "ok";
}

function isSalesforceConnected(ds?: DataSourceStatus): boolean {
  if (ds?.salesforce?.connected !== undefined) return ds.salesforce.connected;
  return ds?.integrations?.salesforce?.status === "ok";
}

export function ApiStatusBar() {
  const { data: ds } = useDataSources();

  const [clock, setClock] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
      const ampm = h >= 12 ? "PM" : "AM";
      const hh = h % 12 || 12;
      setClock(`${String(hh).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} ${ampm} EST`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const sfLive = isSalesforceConnected(ds);
  const orionLive = isOrionConnected(ds);
  const msLive = isMulesoftConnected(ds);

  const platforms = [
    {
      code: "SF", name: "Salesforce FSC", live: sfLive,
      detail: "FinancialAccount, Household, Opportunity, Task, Event, Case",
      badgeClass: "sfdc",
    },
    {
      code: "OR", name: "Orion Advisor", live: orionLive,
      detail: "Portfolio, Holdings, Performance, AUM, Alpha, Sharpe",
      badgeClass: "orion",
    },
    {
      code: "MS", name: "MuleSoft EAPI", live: msLive,
      detail: "OAuth2 Proxy Layer",
      badgeClass: "mulesoft",
    },
  ];

  const badgeColors: Record<string, { bg: string; color: string }> = {
    sfdc: { bg: "rgba(0,161,224,0.15)", color: OD.lightBlue },
    orion: { bg: "rgba(142,185,53,0.15)", color: OD.lightGreen },
    mulesoft: { bg: "rgba(244,125,32,0.12)", color: OD.orange },
  };

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 1800);
  };

  return (
    <>
      <style>{`
        @keyframes od-pip { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
      <div style={{
        background: "rgba(0,52,79,0.6)",
        borderBottom: "1px solid rgba(0,120,162,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 36,
        backdropFilter: "blur(8px)",
        width: "100%",
      }}>
        {/* Connections */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {platforms.map((p, i) => {
            const bc = badgeColors[p.badgeClass];
            return (
              <div key={p.code} style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: i === 0 ? "0 14px 0 0" : "0 14px",
                height: 36,
                borderRight: "1px solid rgba(45,55,72,0.5)",
              }}>
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.08em", padding: "2px 6px",
                  borderRadius: 3, textTransform: "uppercase",
                  background: bc.bg, color: bc.color,
                }}>
                  {p.code}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: OD.text2, lineHeight: 1.2 }}>
                    {p.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: p.live ? OD.medGreen : OD.yellow,
                      animation: `od-pip ${p.live ? "2s" : "1.5s"} ease-in-out infinite`,
                    }} />
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 8.5, color: p.live ? OD.medGreen : OD.yellow,
                      letterSpacing: "0.05em",
                    }}>
                      {p.live ? "Live" : "Offline"}
                    </span>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 8.5, color: OD.text3, letterSpacing: "0.05em",
                    }}>
                      &nbsp;· {p.detail}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: clock + sync */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, color: OD.text3, letterSpacing: "0.1em",
          }}>
            {clock}
          </span>
          <button
            onClick={handleSync}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, fontWeight: 500,
              letterSpacing: "0.15em", textTransform: "uppercase",
              color: OD.lightBlue,
              background: "rgba(79,179,205,0.08)",
              border: "1px solid rgba(79,179,205,0.2)",
              padding: "3px 10px", borderRadius: 3,
              cursor: "pointer",
              opacity: syncing ? 0.6 : 1,
              transition: "all .15s",
            }}
          >
            ↻ {syncing ? "Syncing…" : "Force Sync"}
          </button>
        </div>
      </div>
    </>
  );
}
