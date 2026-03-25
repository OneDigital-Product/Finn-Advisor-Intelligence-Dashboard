"use client";

import { useState } from "react";

const OD = {
  deep: "#00344F", blue: "#0078A2", green: "#8EB935", orange: "#F47D20",
  yellow: "#FFC60B", lblue: "#4FB3CD", lgreen: "#C2E76B",
  t1: "#FFFFFF", t2: "#C7D0DD", t3: "#94A3B8", t4: "#4a5568",
  border: "rgba(45,55,72,0.5)", surface: "#161b27", surface2: "#1d2333",
};

const fmtCurrency = (v: number) => {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
};

const stageColor: Record<string, string> = {
  prospecting: OD.lblue, qualification: OD.blue, "needs analysis": OD.blue,
  "value proposition": OD.yellow, proposal: OD.orange, negotiation: OD.orange,
  "closed won": OD.green, default: OD.t3,
};
const getColor = (s: string) => stageColor[(s || "").toLowerCase()] || stageColor.default;

type SubTab = "pipeline" | "closed" | "stale";

// Source badge — shows where data comes from with tooltip explaining status
function SourceBadge({ source, tooltip }: { source: "salesforce" | "orion" | "estimated" | "unavailable"; tooltip: string }) {
  const config = {
    salesforce: { label: "SF", color: "#00A1E0", bg: "rgba(0,161,224,0.12)" },
    orion: { label: "OR", color: "#00B4E6", bg: "rgba(0,180,230,0.12)" },
    estimated: { label: "EST", color: OD.yellow, bg: "rgba(255,198,11,0.12)" },
    unavailable: { label: "N/A", color: OD.t4, bg: "rgba(148,163,184,0.08)" },
  };
  const c = config[source] || config.unavailable;
  return (
    <span title={tooltip} style={{
      fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
      background: c.bg, color: c.color, cursor: "help", letterSpacing: ".06em",
      textTransform: "uppercase", marginLeft: 4, verticalAlign: "middle",
    }}>
      {c.label}
    </span>
  );
}

interface Props {
  revenueGoals?: any;
  revenueYTD?: number;
  revenueSource?: string;
  openOpportunities?: any[];
  recentlyClosed?: any[];
  staleOpportunities?: any[];
  pipelineTotal?: number;
  pipelineWeighted?: number;
}

export function RevenuePipeline({ revenueGoals, revenueYTD, revenueSource, openOpportunities, recentlyClosed, staleOpportunities, pipelineTotal, pipelineWeighted }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("pipeline");
  const opps = openOpportunities || [];
  const closed = recentlyClosed || [];
  const stale = staleOpportunities || [];
  const hasGoals = revenueGoals && (revenueGoals.recurringWonSalesThisYear > 0 || revenueGoals.ytdWmNonRecurringWonSales > 0);

  // Sort open opps by close date (soonest first)
  const sortedOpps = [...opps].sort((a, b) => {
    if (!a.closeDate) return 1;
    if (!b.closeDate) return -1;
    return new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime();
  });

  // High priority = close date within 30 days
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const highPriority = sortedOpps.filter(o => o.closeDate && new Date(o.closeDate).getTime() - now < thirtyDays);

  const totalWon = hasGoals ? (revenueGoals.recurringWonSalesThisYear || 0) + (revenueGoals.ytdWmNonRecurringWonSales || 0) : 0;
  const totalGoal = hasGoals ? (revenueGoals.wmYtdRecurringSalesGoal || 0) + (revenueGoals.wmYtdNonRecurringSalesGoal || 0) : 0;
  const pctToGoal = totalGoal > 0 ? Math.min((totalWon / totalGoal) * 100, 100) : 0;

  return (
    <div>
      {/* ── Revenue Overview — 3 data paths with source identification ── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: OD.t3 }}>Revenue Overview</span>
        </div>

        {/* Path 1: Orion Billing (real fee data) */}
        <div style={{ padding: 10, background: "rgba(0,180,230,0.04)", borderRadius: 6, border: "1px solid rgba(0,180,230,0.12)", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, color: OD.t3, marginBottom: 2 }}>
                Revenue — YTD
                <SourceBadge
                  source={revenueSource === "orion-billing" ? "orion" : "estimated"}
                  tooltip={revenueSource === "orion-billing"
                    ? "Real fee data from Orion Billing Engine (totalFees)"
                    : "Estimated at 85 basis points of AUM — Orion billing endpoint not yet deployed on MuleSoft EAPI"
                  }
                />
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: revenueSource === "orion-billing" ? OD.lblue : OD.yellow, fontFamily: "'Oswald', sans-serif" }}>
                {fmtCurrency(revenueYTD || 0)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: OD.t4, maxWidth: 120 }}>
                {revenueSource === "orion-billing" ? "Orion billing fees" : "Est. 85bps x AUM"}
              </div>
            </div>
          </div>
        </div>

        {/* Path 2: Salesforce Won Opportunities (CRM revenue goals) */}
        {hasGoals && (
          <div style={{ padding: 10, background: "rgba(0,161,224,0.04)", borderRadius: 6, border: "1px solid rgba(0,161,224,0.12)", marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: OD.t3, marginBottom: 6 }}>
              Won Sales — YTD
              <SourceBadge source="salesforce" tooltip="From Salesforce Opportunities with Stage = Closed Won. Includes recurring and non-recurring won sales tracked by your CRM." />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: OD.lblue, fontFamily: "'Oswald', sans-serif" }}>{fmtCurrency(totalWon)}</div>
                <div style={{ fontSize: 9, color: OD.t4 }}>Total Won</div>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: OD.green, fontFamily: "'Oswald', sans-serif" }}>{totalGoal > 0 ? fmtCurrency(totalGoal) : "—"}</div>
                <div style={{ fontSize: 9, color: OD.t4 }}>Goal</div>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: pctToGoal >= 80 ? OD.green : pctToGoal >= 50 ? OD.yellow : OD.orange, fontFamily: "'Oswald', sans-serif" }}>{totalGoal > 0 ? `${pctToGoal.toFixed(0)}%` : "—"}</div>
                <div style={{ fontSize: 9, color: OD.t4 }}>% to Goal</div>
              </div>
            </div>
            {totalGoal > 0 && (
              <div style={{ height: 5, borderRadius: 3, background: "rgba(148,163,184,0.1)", overflow: "hidden", marginTop: 6 }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${pctToGoal}%`, background: `linear-gradient(90deg, ${OD.blue}, ${OD.green})`, transition: "width .5s ease" }} />
              </div>
            )}
          </div>
        )}

        {/* Path 3: Orion Portfolio Income (estimated annual income from dividends/interest) */}
        <div style={{ padding: 10, background: "rgba(142,185,53,0.04)", borderRadius: 6, border: "1px solid rgba(142,185,53,0.12)", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, color: OD.t3, marginBottom: 2 }}>
                Portfolio Income (Annual Est.)
                <SourceBadge source="orion" tooltip="Estimated annual income from Orion Reporting/Scope — dividends, interest, and distributions across all managed accounts. Available per-client on the client detail page." />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: OD.green, fontFamily: "'Oswald', sans-serif" }}>
                Available per client
              </div>
            </div>
            <div style={{ fontSize: 9, color: OD.t4, textAlign: "right", maxWidth: 120 }}>
              Orion Reporting/Scope per account
            </div>
          </div>
        </div>
      </div>

      {/* ── Pipeline KPIs ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: OD.t3 }}>Pipeline</span>
        <SourceBadge source="salesforce" tooltip="All pipeline data from Salesforce Opportunities — open, closed won, and stale (no activity in 90+ days)" />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div title="Total value of all open Salesforce Opportunities" style={{ flex: 1, padding: "8px 12px", background: "rgba(0,120,162,0.06)", borderRadius: 6, textAlign: "center", cursor: "help" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: OD.t1, fontFamily: "'Oswald', sans-serif" }}>{fmtCurrency(pipelineTotal || 0)}</div>
          <div style={{ fontSize: 9, color: OD.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>Total</div>
        </div>
        <div title="Pipeline value weighted by probability (Amount x Probability %)" style={{ flex: 1, padding: "8px 12px", background: "rgba(142,185,53,0.06)", borderRadius: 6, textAlign: "center", cursor: "help" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: OD.green, fontFamily: "'Oswald', sans-serif" }}>{fmtCurrency(pipelineWeighted || 0)}</div>
          <div style={{ fontSize: 9, color: OD.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>Weighted</div>
        </div>
        <div title="Number of open Salesforce Opportunities not yet Closed Won/Lost" style={{ flex: 1, padding: "8px 12px", background: "rgba(79,179,205,0.06)", borderRadius: 6, textAlign: "center", cursor: "help" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: OD.lblue, fontFamily: "'Oswald', sans-serif" }}>{opps.length}</div>
          <div style={{ fontSize: 9, color: OD.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>Open</div>
        </div>
        <div title="Salesforce Opportunities with Stage = Closed Won (this year)" style={{ flex: 1, padding: "8px 12px", background: "rgba(142,185,53,0.06)", borderRadius: 6, textAlign: "center", cursor: "help" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: OD.green, fontFamily: "'Oswald', sans-serif" }}>{closed.length}</div>
          <div style={{ fontSize: 9, color: OD.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>Closed</div>
        </div>
        {highPriority.length > 0 && (
          <div title="Opportunities with Close Date within the next 30 days — requires immediate attention" style={{ flex: 1, padding: "8px 12px", background: "rgba(244,125,32,0.08)", borderRadius: 6, textAlign: "center", cursor: "help" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: OD.orange, fontFamily: "'Oswald', sans-serif" }}>{highPriority.length}</div>
            <div style={{ fontSize: 9, color: OD.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>Due 30d</div>
          </div>
        )}
      </div>

      {/* ── Sub-tab switcher ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {([
          { id: "pipeline" as SubTab, label: "Open Pipeline", count: opps.length },
          { id: "closed" as SubTab, label: "Recently Closed", count: closed.length },
          { id: "stale" as SubTab, label: "Stale", count: stale.length },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            style={{
              padding: "4px 10px", borderRadius: 4, fontSize: 10, fontWeight: 600,
              border: `1px solid ${subTab === tab.id ? OD.blue : OD.border}`,
              background: subTab === tab.id ? "rgba(0,120,162,0.12)" : "transparent",
              color: subTab === tab.id ? OD.lblue : OD.t3,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {tab.label} {tab.count > 0 && <span style={{ color: subTab === tab.id ? OD.lblue : OD.t4 }}>({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* ── Opportunity list ── */}
      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {subTab === "pipeline" && (
          sortedOpps.length === 0 ? (
            <div style={{ fontSize: 11, color: OD.t3, textAlign: "center", padding: 20 }}>No open opportunities</div>
          ) : (
            sortedOpps.map(opp => {
              const isUrgent = opp.closeDate && new Date(opp.closeDate).getTime() - now < thirtyDays;
              return (
                <div key={opp.id} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "7px 0",
                  borderBottom: `1px solid rgba(45,55,72,0.2)`,
                }}>
                  <div style={{ width: 4, alignSelf: "stretch", borderRadius: 2, flexShrink: 0, background: getColor(opp.stageName) }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: OD.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {opp.name || opp.accountName}
                    </div>
                    <div style={{ fontSize: 10, color: OD.t3, marginTop: 1 }}>
                      {opp.stageName}
                      {opp.closeDate && ` · ${new Date(opp.closeDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                      {opp.probability > 0 && ` · ${opp.probability}%`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {opp.amount > 0 && <div style={{ fontSize: 12, fontWeight: 600, color: OD.lblue, fontFamily: "'DM Mono', monospace" }}>{fmtCurrency(opp.amount)}</div>}
                    {isUrgent && <div style={{ fontSize: 8, fontWeight: 700, color: OD.orange, textTransform: "uppercase", letterSpacing: ".1em" }}>URGENT</div>}
                  </div>
                </div>
              );
            })
          )
        )}

        {subTab === "closed" && (
          closed.length === 0 ? (
            <div style={{ fontSize: 11, color: OD.t3, textAlign: "center", padding: 20 }}>No recently closed opportunities</div>
          ) : (
            closed.map((opp: any) => (
              <div key={opp.id} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "7px 0",
                borderBottom: `1px solid rgba(45,55,72,0.2)`,
              }}>
                <div style={{ width: 4, alignSelf: "stretch", borderRadius: 2, flexShrink: 0, background: OD.green }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: OD.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {opp.name || opp.accountName}
                  </div>
                  <div style={{ fontSize: 10, color: OD.t3, marginTop: 1 }}>
                    {opp.stageName}
                    {opp.closeDate && ` · Closed ${new Date(opp.closeDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                  </div>
                </div>
                {opp.amount > 0 && <div style={{ fontSize: 12, fontWeight: 600, color: OD.green, fontFamily: "'DM Mono', monospace" }}>{fmtCurrency(opp.amount)}</div>}
              </div>
            ))
          )
        )}

        {subTab === "stale" && (
          stale.length === 0 ? (
            <div style={{ fontSize: 11, color: OD.t3, textAlign: "center", padding: 20 }}>No stale opportunities</div>
          ) : (
            stale.map((opp: any) => (
              <div key={opp.id} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "7px 0",
                borderBottom: `1px solid rgba(45,55,72,0.2)`,
              }}>
                <div style={{ width: 4, alignSelf: "stretch", borderRadius: 2, flexShrink: 0, background: OD.orange }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: OD.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {opp.name || opp.accountName}
                  </div>
                  <div style={{ fontSize: 10, color: OD.t3, marginTop: 1 }}>
                    {opp.stageName}
                    {opp.lastActivityDate && ` · Last activity ${new Date(opp.lastActivityDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                  </div>
                </div>
                {opp.amount > 0 && <div style={{ fontSize: 12, fontWeight: 600, color: OD.orange, fontFamily: "'DM Mono', monospace" }}>{fmtCurrency(opp.amount)}</div>}
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
