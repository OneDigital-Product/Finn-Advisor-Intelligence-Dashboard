"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { P } from "@/styles/tokens";

/* ── Types ── */

interface PrepData {
  client: {
    id: string;
    name: string;
    segment: string;
    totalAum: number;
    aumSource: "orion" | "salesforce" | "local";
    riskTolerance: string | null;
    serviceModel: string | null;
    members: { firstName: string; lastName: string; relationship?: string }[];
  };
  meeting: {
    id: string;
    title: string;
    startTime: string;
    type?: string;
  } | null;
  lastMeeting: {
    id: string;
    date: string;
    title: string;
    summary: string | null;
    notes: string | null;
  } | null;
  changes: {
    aumPrevious: number | null;
    aumCurrent: number;
    aumDeltaPct: number | null;
    aumDeltaIsApproximate: boolean;
    newTaskCount: number;
    newCaseCount: number;
    lifeEvents: { type: string; description: string; date: string }[];
  };
  openItems: {
    overdueTasks: { id: string; subject: string; dueDate: string; daysOverdue: number }[];
    openCases: any[];
    staleOpps: any[];
  };
  portfolio: {
    totalAum: number;
    allocation: { label: string; pct: number }[];
    topDrift: { assetClass: string; actualPct: number; targetPct: number; driftPct: number } | null;
    topHolding: { ticker: string; name: string; weightPct: number } | null;
  } | null;
  goals: { name: string; targetAmount: number; currentAmount: number; status: string }[];
  behavioral: {
    communicationStyle: string | null;
    anxietyLevel: string | null;
    dominantBias: string | null;
    briefNote: string | null;
  } | null;
  compliance: {
    lastReviewDate: string | null;
    nextReviewDate: string | null;
    flags: string[];
  };
  talkingPoints: string[];
  isLiveData: boolean;
  generatedAt: string;
  _sources: string[];
}

/* ── Helpers ── */

function fmtCurrency(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function goalStatusColor(status: string): { bg: string; fg: string } {
  switch (status) {
    case "ahead": return { bg: P.odGreen + "20", fg: P.odGreen };
    case "on-track": return { bg: P.odLBlue + "20", fg: P.odLBlue };
    case "behind": return { bg: P.odYellow + "20", fg: P.odYellow };
    case "at-risk": return { bg: "#E53E3E20", fg: "#E53E3E" };
    default: return { bg: P.odBorder, fg: P.odT3 };
  }
}

function allocationColor(label: string): string {
  switch (label) {
    case "EQ": return P.odEq;
    case "FI": return P.odFi;
    case "ALT": return P.odAlt;
    case "CA": return P.odCa;
    default: return P.odT3;
  }
}

function allocationLabel(label: string): string {
  switch (label) {
    case "EQ": return "Equity";
    case "FI": return "Fixed Income";
    case "ALT": return "Alternatives";
    case "CA": return "Cash";
    default: return label;
  }
}

/* ── Sub-components (inline) ── */

function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      marginBottom: 10, paddingBottom: 6,
      borderBottom: `1px solid ${P.odBorder}`,
    }}>
      {icon}
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase", color: P.odT3,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {title}
      </span>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 2,
      padding: "6px 0", flex: 1, minWidth: 90,
    }}>
      <span style={{ fontSize: 10, color: P.odT3, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ fontSize: 16, fontWeight: 700, color: color || P.odT1, fontFamily: "'JetBrains Mono', monospace" }}>
        {value}
      </span>
    </div>
  );
}

/* ── Component ── */

export function PrepSection({ clientId }: { clientId: string }) {
  const [priorNotesOpen, setPriorNotesOpen] = useState(false);

  const { data, isLoading, error } = useQuery<PrepData>({
    queryKey: ["/api/client-360", clientId, "prep"],
    queryFn: async () => {
      const res = await fetch(`/api/client-360/${clientId}/prep`, { credentials: "include" });
      if (!res.ok) throw new Error(`Prep fetch failed: ${res.status}`);
      return res.json();
    },
    enabled: !!clientId,
    staleTime: 60 * 1000, // match server Cache-Control: max-age=60
  });

  // Loading state
  if (isLoading) {
    return (
      <div style={{ maxWidth: 720, padding: "24px 0" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            height: 60, borderRadius: 8, background: P.odSurf2,
            marginBottom: 12, animation: "pulse 1.5s ease-in-out infinite",
          }} />
        ))}
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div style={{
        maxWidth: 720, padding: "32px 0",
        textAlign: "center", color: P.odT3, fontSize: 13,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: P.odT2, marginBottom: 4 }}>
          Unable to load prep data
        </div>
        <div>Check that the client exists and try refreshing.</div>
      </div>
    );
  }

  const { client, meeting, lastMeeting, changes, openItems, portfolio, goals, behavioral, compliance, talkingPoints } = data;

  // V1: Only overdue tasks are available (cases/opps require SF monolithic — deferred)
  // Label reflects actual scope to avoid misleading the advisor
  const overdueCount = openItems.overdueTasks.length;

  return (
    <div style={{ maxWidth: 720, padding: "4px 0" }}>

      {/* ── PREP HEADER — identity block ── */}
      <div style={{
        marginBottom: 24,
        paddingBottom: 20,
        borderBottom: `1px solid ${P.odBorder}`,
      }}>
        {/* Identity row */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
          <span style={{
            fontSize: 20, fontWeight: 400, color: P.odT1,
            fontFamily: "'Oswald', sans-serif",
            letterSpacing: "0.01em",
          }}>
            {client.name.toUpperCase()}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
            padding: "2px 7px", borderRadius: 4,
            border: `1px solid ${P.odBorder}`,
            color: P.odT3,
          }}>
            Tier {client.segment}
          </span>
          {data.isLiveData && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
              padding: "2px 7px", borderRadius: 4,
              background: P.odGreen + "18", color: P.odGreen,
            }}>
              Live
            </span>
          )}
        </div>

        {/* Meeting context */}
        {meeting && (
          <div style={{ fontSize: 13, color: P.odT2, marginBottom: 12 }}>
            <span style={{ fontWeight: 600 }}>{meeting.title}</span>
            {" · "}
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
              {fmtTime(meeting.startTime)}
            </span>
            {meeting.type && (
              <span style={{ color: P.odT3 }}>{" · "}{meeting.type}</span>
            )}
          </div>
        )}

        {!meeting && (
          <div style={{ fontSize: 13, color: P.odT3, fontStyle: "italic", marginBottom: 12 }}>
            No upcoming meeting scheduled
          </div>
        )}

        {/* Key stats — grounded on subtle surface */}
        <div style={{
          display: "flex", gap: 8, flexWrap: "wrap",
          padding: "10px 12px", borderRadius: 6,
          background: P.odSurf2,
          border: `1px solid ${P.odBorder}40`,
        }}>
          <StatPill label="AUM" value={fmtCurrency(client.totalAum)} />
          {client.riskTolerance && (
            <StatPill label="Risk" value={client.riskTolerance} />
          )}
          {client.serviceModel && (
            <StatPill label="Service" value={client.serviceModel} />
          )}
        </div>

        {/* Household members */}
        {client.members.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 11, color: P.odT3 }}>
            <span style={{ fontWeight: 600 }}>Household:</span>{" "}
            {client.members.map((m, i) => (
              <span key={i}>
                {m.firstName} {m.lastName}
                {m.relationship ? ` (${m.relationship})` : ""}
                {i < client.members.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── CHANGES SINCE LAST ── */}
      <div style={{ marginBottom: 24 }}>
        <SectionHeader title="Changes Since Last Meeting" icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P.odT3} strokeWidth="2" strokeLinecap="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        } />

        {changes.aumDeltaPct !== null && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
            padding: "8px 12px", borderRadius: 6, background: P.odSurf2,
          }}>
            <span style={{ fontSize: 12, color: P.odT2, flex: 1 }}>AUM Change</span>
            <span style={{
              fontSize: 14, fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              color: changes.aumDeltaPct > 0 ? P.odGreen : changes.aumDeltaPct < 0 ? "#E53E3E" : P.odT2,
            }}>
              {changes.aumDeltaPct > 0 ? "+" : ""}{changes.aumDeltaPct}%
            </span>
            {changes.aumDeltaIsApproximate && (
              <span style={{ fontSize: 9, color: P.odT4, fontStyle: "italic" }}>approx</span>
            )}
          </div>
        )}

        {changes.newTaskCount > 0 && (
          <div style={{ fontSize: 12, color: P.odT2, marginBottom: 4 }}>
            {changes.newTaskCount} new task{changes.newTaskCount !== 1 ? "s" : ""} created
          </div>
        )}
        {changes.newCaseCount > 0 && (
          <div style={{ fontSize: 12, color: P.odT2, marginBottom: 4 }}>
            {changes.newCaseCount} new case{changes.newCaseCount !== 1 ? "s" : ""} opened
          </div>
        )}

        {/* Life events */}
        {changes.lifeEvents.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {changes.lifeEvents.map((evt, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 0", borderBottom: i < changes.lifeEvents.length - 1 ? `1px solid ${P.odBorder}30` : "none",
              }}>
                <span style={{ fontSize: 11, color: P.odT3, fontWeight: 600, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {evt.type}
                </span>
                <span style={{ fontSize: 12, color: P.odT2, flex: 1 }}>{evt.description}</span>
                <span style={{ fontSize: 10, color: P.odT4, fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmtDate(evt.date)}
                </span>
              </div>
            ))}
          </div>
        )}

        {changes.aumDeltaPct === null && changes.newTaskCount === 0 && changes.lifeEvents.length === 0 && (
          <div style={{ fontSize: 12, color: P.odT4, fontStyle: "italic" }}>No significant changes detected</div>
        )}
      </div>

      {/* ── OVERDUE TASKS ── */}
      {overdueCount > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionHeader title={`Overdue Tasks (${overdueCount})`} icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P.odOrange} strokeWidth="2" strokeLinecap="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          } />

          {openItems.overdueTasks.map((task) => (
            <div key={task.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 0", borderBottom: `1px solid ${P.odBorder}30`,
            }}>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                padding: "2px 6px", borderRadius: 4,
                background: "#E53E3E20", color: "#E53E3E",
                flexShrink: 0,
              }}>
                {task.daysOverdue}d overdue
              </span>
              <span style={{ fontSize: 12, color: P.odT2, flex: 1 }}>{task.subject}</span>
              <span style={{ fontSize: 10, color: P.odT4, fontFamily: "'JetBrains Mono', monospace" }}>
                Due {fmtDate(task.dueDate)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── PORTFOLIO SNAPSHOT ── */}
      {portfolio && (
        <div style={{ marginBottom: 24 }}>
          <SectionHeader title="Portfolio Snapshot" icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P.odT3} strokeWidth="2" strokeLinecap="round">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
              <path d="M22 12A10 10 0 0 0 12 2v10z" />
            </svg>
          } />

          {/* Allocation bar */}
          <div style={{
            display: "flex", height: 8, borderRadius: 4, overflow: "hidden",
            marginBottom: 8, background: P.odBorder,
          }}>
            {portfolio.allocation.filter(a => a.pct > 0).map((a) => (
              <div key={a.label} style={{
                width: `${a.pct}%`, background: allocationColor(a.label),
                transition: "width .3s ease",
              }} />
            ))}
          </div>

          {/* Allocation legend */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
            {portfolio.allocation.map((a) => (
              <div key={a.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: allocationColor(a.label) }} />
                <span style={{ fontSize: 11, color: P.odT3 }}>{allocationLabel(a.label)}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: P.odT2, fontFamily: "'JetBrains Mono', monospace" }}>
                  {a.pct}%
                </span>
              </div>
            ))}
          </div>

          {/* Top holding */}
          {portfolio.topHolding && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 10px", borderRadius: 6, background: P.odSurf2,
              marginBottom: 6,
            }}>
              <span style={{ fontSize: 11, color: P.odT3, flex: 1 }}>Top Holding</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: P.odT1, fontFamily: "'JetBrains Mono', monospace" }}>
                {portfolio.topHolding.ticker}
              </span>
              <span style={{ fontSize: 11, color: P.odT3 }}>{portfolio.topHolding.weightPct}%</span>
            </div>
          )}

          {/* Top drift */}
          {portfolio.topDrift && Math.abs(portfolio.topDrift.driftPct) > 3 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 10px", borderRadius: 6,
              background: P.odYellow + "10",
              border: `1px solid ${P.odYellow}30`,
            }}>
              <span style={{ fontSize: 11, color: P.odYellow, fontWeight: 600 }}>Drift</span>
              <span style={{ fontSize: 12, color: P.odT2, flex: 1 }}>
                {allocationLabel(portfolio.topDrift.assetClass)}: {portfolio.topDrift.actualPct}% vs {portfolio.topDrift.targetPct}% target
              </span>
              <span style={{
                fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                color: P.odYellow,
              }}>
                {portfolio.topDrift.driftPct > 0 ? "+" : ""}{portfolio.topDrift.driftPct.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── GOAL PROGRESS ── */}
      {goals.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionHeader title="Goals" icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P.odT3} strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          } />

          {goals.map((goal, i) => {
            const gs = goalStatusColor(goal.status);
            const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 0",
                borderBottom: i < goals.length - 1 ? `1px solid ${P.odBorder}30` : "none",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: P.odT1 }}>{goal.name}</div>
                  <div style={{ fontSize: 10, color: P.odT3, fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmtCurrency(goal.currentAmount)} / {fmtCurrency(goal.targetAmount)}
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{
                  width: 60, height: 4, borderRadius: 2, background: P.odBorder,
                  overflow: "hidden", flexShrink: 0,
                }}>
                  <div style={{
                    width: `${pct}%`, height: "100%", borderRadius: 2,
                    background: gs.fg, transition: "width .3s ease",
                  }} />
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                  padding: "2px 6px", borderRadius: 4,
                  background: gs.bg, color: gs.fg,
                  flexShrink: 0,
                }}>
                  {goal.status.replace("-", " ")}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── APPROACH GUIDE (Behavioral) ── */}
      {behavioral && (
        <div style={{ marginBottom: 24 }}>
          <SectionHeader title="Approach Guide" icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P.odT3} strokeWidth="2" strokeLinecap="round">
              <path d="M12 2a8 8 0 0 0-8 8c0 3 1.5 5.5 4 7v3h8v-3c2.5-1.5 4-4 4-7a8 8 0 0 0-8-8z" />
              <line x1="10" y1="22" x2="14" y2="22" />
            </svg>
          } />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {behavioral.communicationStyle && (
              <div style={{
                padding: "6px 10px", borderRadius: 6, background: P.odSurf2,
                border: `1px solid ${P.odBorder}60`,
              }}>
                <div style={{ fontSize: 9, color: P.odT4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 2 }}>
                  Communication
                </div>
                <div style={{ fontSize: 12, color: P.odT1, fontWeight: 600 }}>
                  {behavioral.communicationStyle}
                </div>
              </div>
            )}
            {behavioral.anxietyLevel && (
              <div style={{
                padding: "6px 10px", borderRadius: 6, background: P.odSurf2,
                border: `1px solid ${P.odBorder}60`,
              }}>
                <div style={{ fontSize: 9, color: P.odT4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 2 }}>
                  Anxiety Level
                </div>
                <div style={{ fontSize: 12, color: P.odT1, fontWeight: 600 }}>
                  {behavioral.anxietyLevel}
                </div>
              </div>
            )}
            {behavioral.dominantBias && (
              <div style={{
                padding: "6px 10px", borderRadius: 6, background: P.odSurf2,
                border: `1px solid ${P.odBorder}60`,
              }}>
                <div style={{ fontSize: 9, color: P.odT4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 2 }}>
                  Dominant Bias
                </div>
                <div style={{ fontSize: 12, color: P.odT1, fontWeight: 600 }}>
                  {behavioral.dominantBias}
                </div>
              </div>
            )}
          </div>

          {behavioral.briefNote && (
            <div style={{
              fontSize: 12, color: P.odT2, fontStyle: "italic",
              padding: "6px 10px", borderRadius: 6,
              background: P.odSurf2, borderLeft: `2px solid ${P.odLBlue}40`,
            }}>
              {behavioral.briefNote}
            </div>
          )}
        </div>
      )}

      {/* ── COMPLIANCE FLAGS ── */}
      {(compliance.flags.length > 0 || compliance.lastReviewDate || compliance.nextReviewDate) && (
        <div style={{ marginBottom: 24 }}>
          <SectionHeader title="Compliance" icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P.odT3} strokeWidth="2" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          } />

          {compliance.flags.length > 0 && compliance.flags.map((flag, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 10px", borderRadius: 6,
              background: P.odOrange + "10",
              border: `1px solid ${P.odOrange}30`,
              marginBottom: 6,
            }}>
              <span style={{ fontSize: 12 }}>⚠️</span>
              <span style={{ fontSize: 12, color: P.odOrange, fontWeight: 600 }}>{flag}</span>
            </div>
          ))}

          <div style={{ display: "flex", gap: 16, fontSize: 11, color: P.odT3, marginTop: 4 }}>
            {compliance.lastReviewDate && (
              <span>Last review: <span style={{ color: P.odT2, fontFamily: "'JetBrains Mono', monospace" }}>{fmtDate(compliance.lastReviewDate)}</span></span>
            )}
            {compliance.nextReviewDate && (
              <span>Next review: <span style={{ color: P.odT2, fontFamily: "'JetBrains Mono', monospace" }}>{fmtDate(compliance.nextReviewDate)}</span></span>
            )}
          </div>
        </div>
      )}

      {/* ── TALKING POINTS ── */}
      {talkingPoints.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionHeader title="Talking Points" icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P.odLBlue} strokeWidth="2" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          } />

          <div style={{
            padding: "10px 12px", borderRadius: 6,
            background: P.odLBlue + "08",
            border: `1px solid ${P.odLBlue}20`,
          }}>
            {talkingPoints.map((point, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "5px 0",
                borderBottom: i < talkingPoints.length - 1 ? `1px solid ${P.odBorder}20` : "none",
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: P.odLBlue,
                  fontFamily: "'JetBrains Mono', monospace",
                  flexShrink: 0, marginTop: 1,
                }}>
                  {i + 1}.
                </span>
                <span style={{ fontSize: 12, color: P.odT1, lineHeight: 1.5 }}>{point}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PRIOR MEETING NOTES (collapsed by default) ── */}
      {lastMeeting && (lastMeeting.summary || lastMeeting.notes) && (
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => setPriorNotesOpen(!priorNotesOpen)}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              background: "none", border: "none", cursor: "pointer",
              padding: "6px 0", textAlign: "left", fontFamily: "inherit",
              marginBottom: priorNotesOpen ? 10 : 0,
              borderBottom: `1px solid ${P.odBorder}40`,
            }}
          >
            <svg
              width="12" height="12" viewBox="0 0 16 16" fill="none"
              stroke={P.odT3} strokeWidth="1.6" strokeLinecap="round"
              style={{
                flexShrink: 0,
                transform: priorNotesOpen ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform .15s ease",
              }}
            >
              <path d="M6 4l4 4-4 4" />
            </svg>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", color: P.odT3,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              Prior Meeting Notes
            </span>
            <span style={{ fontSize: 10, color: P.odT4, fontFamily: "'JetBrains Mono', monospace" }}>
              {lastMeeting.title} · {fmtDate(lastMeeting.date)}
            </span>
          </button>

          {priorNotesOpen && (
            <div style={{
              padding: "10px 12px", borderRadius: 8,
              background: P.odSurf2,
              border: `1px solid ${P.odBorder}40`,
              fontSize: 12, color: P.odT2, lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}>
              {lastMeeting.summary || lastMeeting.notes}
            </div>
          )}
        </div>
      )}

      {/* ── Footer: data freshness ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 0", borderTop: `1px solid ${P.odBorder}30`,
        fontSize: 10, color: P.odT4,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <span>
          Sources: {data._sources.join(", ")}
        </span>
        <span>
          Generated {fmtTime(data.generatedAt)}
        </span>
      </div>
    </div>
  );
}
