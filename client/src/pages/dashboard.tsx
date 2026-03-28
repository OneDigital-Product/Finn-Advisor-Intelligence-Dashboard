import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useNavPageTabs, NavRail } from "@/components/app-sidebar";
import { useDiagnosticContext } from "@/contexts/diagnostic-context";
import { TopNav } from "@/components/dashboard/TopNav";
import { PageTabs } from "@/components/dashboard/PageTabs";
import WallStreetHero from "@/components/dashboard/WallStreetHero";
import { LivePortfolioMonitor } from "@/components/dashboard/LivePortfolioMonitor";
import { TodaySchedule } from "@/components/dashboard/TodaySchedule";
import { ActionQueue } from "@/components/dashboard/ActionQueue";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { OpenOpportunitiesPipeline } from "@/components/dashboard/OpenOpportunitiesPipeline";
import { RecentlyClosedOpportunities } from "@/components/dashboard/RecentlyClosedOpportunities";
import { UrgencyStrip } from "@/components/dashboard/UrgencyStrip";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import { PendingApprovals } from "@/components/dashboard/PendingApprovals";
import { ContinueWorking } from "@/components/dashboard/ContinueWorking";
import { MyDayActionQueue } from "@/components/dashboard/MyDayActionQueue";
import { useRecentClients } from "@/hooks/use-recent-clients";
import { P } from "@/styles/tokens";

/* ── Inline SVG Icons (used by non-My-Day tabs) ── */
function SvgCheck() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8l3 3 7-6"/><rect x="1.5" y="1.5" width="13" height="13" rx="1.5"/></svg>;
}
function SvgAlert() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 2L2 13h12L8 2z"/><path d="M8 7v3M8 11.5v.5"/></svg>;
}
function SvgCheckmark() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8l3 3 7-6"/></svg>;
}
function SvgChart() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="1" y="8" width="3" height="6" rx="0.5"/><rect x="6" y="4" width="3" height="10" rx="0.5"/><rect x="11" y="1" width="3" height="13" rx="0.5"/></svg>;
}
function SvgCal() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 3V1M11 3V1M2 7h12"/></svg>;
}

/* ── SectionCard — reused by non-My-Day tabs ── */
function SectionCard({ title, icon, dataTag, action, actionColor, children }: {
  title: string; icon?: React.ReactNode; dataTag?: string;
  action?: string; actionColor?: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      border: `1px solid ${P.odBorder}`,
      borderRadius: 10,
      padding: 16,
      marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: P.odT1 }}>{title}</span>
        {dataTag && (
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
            padding: "2px 6px", borderRadius: 4,
            background: dataTag === "live" ? P.odGreen + "20" : P.odLBlue + "20",
            color: dataTag === "live" ? P.odGreen : P.odLBlue,
          }}>{dataTag === "live" ? "LIVE DATA" : "APP DATA"}</span>
        )}
        {action && (
          <span style={{ marginLeft: "auto", fontSize: 11, color: actionColor || P.odYellow, fontWeight: 600 }}>
            {action}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/* MyDaySection + QuickLink removed — three-column layout uses inline module containers */

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("My Day");

  // Sync tab from URL param (e.g. /?tab=My+Day from nav sidebar)
  useEffect(() => {
    const urlTab = searchParams?.get("tab");
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = useCallback((label: string) => {
    if (label === "Clients") { router.push("/clients"); return; }
    if (label === "Reports") { router.push("/reports"); return; }
    setActiveTab(label);
  }, [router]);

  const { setTabs } = useNavPageTabs();
  const { recents } = useRecentClients();

  // ── MY DAY QUERIES ──────────────────────────────────────────

  // 1. /api/myday — hero, urgency, ranked tasks, cases, revenue progress, SF events, recent wins
  const { data: myDay, isLoading: myDayLoading } = useQuery<any>({
    queryKey: ["/api/myday"],
    staleTime: 30_000,
  });

  // 2. /api/calendar/live — today's schedule (Outlook)
  // (consumed by TodaySchedule component directly)

  // ── QUERIES FOR OTHER TABS (only fetched when those tabs are active) ──

  const { data: clientStats } = useQuery<any>({
    queryKey: ["/api/clients/stats"],
    enabled: activeTab !== "My Day", // Don't fetch for My Day — use /api/myday instead
    refetchInterval: (query) => {
      const d = query.state.data;
      if (d && d.isDemoData && !d.isLiveData) return 5000;
      return false;
    },
  });

  const { data: alerts } = useQuery<any[]>({
    queryKey: ["/api/alerts"],
    enabled: activeTab === "Alerts",
  });

  // ── NBA mutations (shared between My Day and Action Queue tab) ──

  // ── Diagnostic Context ──
  const { setPageDiagnostics, clearPageDiagnostics } = useDiagnosticContext();
  const lastDiagKey = useRef("");
  useEffect(() => {
    if (!myDay) return;
    const key = `${myDay.totalAum}-${myDay.isLiveData}-${myDay.urgency?.openCases}`;
    if (key === lastDiagKey.current) return;
    lastDiagKey.current = key;
    const timer = setTimeout(() => {
      setPageDiagnostics({
        pageLabel: "My Day",
        fields: [
          { field: "Total AUM", source: myDay.isLiveData ? "orion" : "computed", value: myDay.totalAum, orionField: "portfolio.totalMarketValue", uiLocation: "Hero", apiEndpoint: "/api/myday", apiSource: "MuleSoft → Orion" },
          { field: "Clients", source: myDay.isLiveData ? "salesforce" : "computed", value: myDay.clientCount, sfField: "Account", uiLocation: "Hero", apiEndpoint: "/api/myday", apiSource: "MuleSoft → Salesforce" },
          { field: "Open Cases", source: "salesforce", value: myDay.urgency?.openCases, uiLocation: "Urgency Strip", apiEndpoint: "/api/myday" },
          { field: "Overdue Tasks", source: "salesforce", value: myDay.urgency?.overdueTasks, uiLocation: "Urgency Strip", apiEndpoint: "/api/myday" },
        ],
        dataSources: {
          salesforce: myDay.isLiveData ? "live" : "mock",
          orion: myDay.isLiveData ? "live" : "mock",
          mulesoft: myDay.isLiveData ? "live" : "mock",
        },
      });
    }, 0);
    return () => clearTimeout(timer);
  });
  useEffect(() => () => clearPageDiagnostics(), [clearPageDiagnostics]);

  // ── Computed values ──
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  const nameOverrides: Record<string, string> = { Mike: "Michael" };
  const rawName = myDay?.advisorName || user?.name || "there";
  const nameParts = rawName.split(" ");
  if (nameParts.length >= 2 && nameOverrides[nameParts[0]]) {
    nameParts[0] = nameOverrides[nameParts[0]];
  }
  const firstName = nameParts[0];
  const lastName = nameParts.length >= 2 ? nameParts.slice(1).join(" ") : "";

  const isLiveData = myDay?.isLiveData ?? false;
  const totalAum = myDay?.totalAum || 0;
  const clientCount = myDay?.clientCount || 0;
  const urgency = myDay?.urgency || { openCases: 0, overdueTasks: 0, staleOpps: 0 };

  // Badge counts for tabs
  const openTaskCount = myDay?.urgency?.overdueTasks || clientStats?.openTasks || 0;
  const unreadAlerts = (myDay?.urgency?.openCases || 0) + (myDay?.urgency?.staleOpps || 0) || clientStats?.openCases || 0;

  const pageTabs = [
    { label: "My Day" },
    { label: "Portfolio Monitor", badge: clientCount || clientStats?.clientCount || 0, badgeColor: "blue" as const },
    { label: "Action Queue", badge: openTaskCount, badgeColor: "orange" as const },
    { label: "Alerts", badge: unreadAlerts, badgeColor: "orange" as const },
    { label: "Clients" },
    { label: "Opportunities", badge: clientStats?.openOpportunities || 0, badgeColor: "green" as const },
    { label: "Reports" },
  ];

  useEffect(() => {
    setTabs(<PageTabs tabs={pageTabs} activeTab={activeTab} onTabChange={handleTabChange} />);
    return () => setTabs(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, clientCount, openTaskCount, unreadAlerts]);

  // Clear legacy widget order from localStorage on first load
  useEffect(() => {
    const version = localStorage.getItem("od-myday-version");
    if (version !== "2") {
      localStorage.removeItem("od-widget-order");
      localStorage.removeItem("od-widget-config");
      localStorage.setItem("od-myday-version", "2");
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div style={{
      background: P.odBg,
      color: P.odT1,
      fontFamily: "'Inter', system-ui, sans-serif",
      minHeight: "100vh",
    }}>
      {/* Chrome */}
      <TopNav isLiveData={isLiveData} />
      <NavRail />

      {/* ═══ TAB: MY DAY ═══ */}
      {activeTab === "My Day" && (
        <div style={{ padding: "0 24px 48px" }}>
          {/* HERO — full-width masthead */}
          <WallStreetHero
            greeting={greeting}
            firstName={firstName}
            lastName={lastName}
            totalAum={totalAum}
            activeClients={clientCount}
            meetingsToday={myDay?.briefing?.meetingsToday || 0}
            urgentCategories={myDay?.briefing?.urgentCategories || 0}
            isLiveData={isLiveData}
            isLoading={myDayLoading}
          />

          {/* THREE-COLUMN WORKSPACE */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "240px 1fr 240px",
            gap: 24,
            marginTop: 12,
          }}>

            {/* ── LEFT RAIL ── */}
            <div style={{ minWidth: 0 }}>
              {/* Urgency Bar */}
              <div style={{
                background: P.odSurf,
                border: `1px solid ${P.odBorder2}`,
                borderRadius: 6,
                padding: "12px 16px",
                marginBottom: 20,
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                  textTransform: "uppercase", color: P.odT1, marginBottom: 8,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>Urgency</div>
                <UrgencyStrip
                  openCases={urgency.openCases}
                  overdueTasks={urgency.overdueTasks}
                  staleOpps={urgency.staleOpps}
                />
              </div>

              {/* Stale Opportunities — top 3 most idle */}
              {(myDay?.staleOppDetails?.length || 0) > 0 && (
                <div style={{
                  background: P.odSurf,
                  border: `1px solid ${P.odBorder2}`,
                  borderRadius: 6,
                  padding: "12px 16px",
                  marginBottom: 16,
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: P.odT1, marginBottom: 8,
                    fontFamily: "'JetBrains Mono', monospace",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <span>Stale Opportunities</span>
                    <span style={{
                      fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 3,
                      border: `1px solid ${P.odBorder}`, color: P.odT3,
                    }}>SF</span>
                  </div>
                  {myDay.staleOppDetails.map((opp: any, idx: number) => (
                    <div key={opp.id} style={{
                      padding: "8px 0",
                      borderBottom: idx < myDay.staleOppDetails.length - 1 ? `1px solid ${P.odBorder}` : "none",
                    }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: P.odT1,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{opp.name}</div>
                      <div style={{ fontSize: 10, color: P.odT4, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
                        {opp.accountName}
                        {opp.daysIdle != null ? ` · ${opp.daysIdle}d idle` : " · No activity date"}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Needs Attention */}
              <div style={{
                background: P.odSurf,
                border: `1px solid ${P.odBorder2}`,
                borderRadius: 6,
                padding: "12px 16px",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 8,
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: P.odT1,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>Needs Attention</div>
                  <button
                    onClick={() => handleTabChange("Alerts")}
                    style={{ fontSize: 10, color: P.odLBlue, background: "none", border: "none", cursor: "pointer" }}
                  >See all →</button>
                </div>
                <NeedsAttention
                  cases={myDay?.cases || []}
                  onSeeAll={() => handleTabChange("Alerts")}
                />
              </div>

              {/* Pending Approvals — workflow gates */}
              {(myDay?.pendingGates?.length || 0) > 0 && (
                <div style={{
                  background: P.odSurf,
                  border: `1px solid ${P.odBorder2}`,
                  borderRadius: 6,
                  padding: "12px 16px",
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: P.odT1,
                    fontFamily: "'JetBrains Mono', monospace",
                    marginBottom: 8,
                  }}>Pending Approvals</div>
                  <PendingApprovals gates={myDay.pendingGates} />
                </div>
              )}

              {/* Reviews Due Soon — full-book, cache-backed */}
              {myDay?._fullBookAvailable && (myDay?.reviewsDueSoon?.length || 0) > 0 && (
                <div style={{
                  background: P.odSurf,
                  border: `1px solid ${P.odBorder2}`,
                  borderRadius: 6,
                  padding: "12px 16px",
                  marginTop: 16,
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: P.odT1, marginBottom: 8,
                    fontFamily: "'JetBrains Mono', monospace",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <span>Reviews Due</span>
                    <span style={{
                      fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 3,
                      border: `1px solid ${P.odBorder}`, color: P.odT3,
                    }}>SF</span>
                  </div>
                  {myDay.reviewsDueSoon.map((r: any, idx: number) => (
                    <div key={r.clientId} style={{
                      padding: "8px 0",
                      borderBottom: idx < myDay.reviewsDueSoon.length - 1 ? `1px solid ${P.odBorder}` : "none",
                    }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: P.odT1,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{r.clientName}</div>
                      <div style={{ fontSize: 10, color: P.odT4, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
                        {r.daysUntil < 0 ? `${Math.abs(r.daysUntil)}d overdue` : r.daysUntil === 0 ? "Due today" : `Due in ${r.daysUntil}d`}
                        {r.segment ? ` · Tier ${r.segment}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── CENTER WORKBENCH ── */}
            <div style={{ minWidth: 0 }}>
              {/* Today's Schedule */}
              <div style={{
                background: P.odSurf,
                border: `1px solid ${P.odBorder2}`,
                borderRadius: 6,
                padding: "12px 20px",
                marginBottom: 16,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <SvgCal />
                    <span style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                      textTransform: "uppercase", color: P.odT1,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>Today's Schedule</span>
                    {(myDay?.briefing?.meetingsToday || 0) > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                        background: P.odLBlue + "20", color: P.odLBlue,
                      }}>{myDay.briefing.meetingsToday} today</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleTabChange("Action Queue")}
                    style={{ fontSize: 10, color: P.odLBlue, background: "none", border: "none", cursor: "pointer" }}
                  >See all meetings →</button>
                </div>
                <TodaySchedule sfEvents={myDay?.sfEvents} prepContexts={myDay?.prepContexts} aiAvailable={myDay?._aiAvailable} emailIndex={myDay?._emailIndex} />
              </div>

              {/* Action Queue */}
              <div style={{
                background: P.odSurf,
                border: `1px solid ${P.odBorder2}`,
                borderRadius: 6,
                padding: "12px 20px",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <SvgCheck />
                    <span style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                      textTransform: "uppercase", color: P.odT1,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>Action Queue</span>
                    {(myDay?.tasks?.length || 0) > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                        background: P.odYellow + "20", color: P.odYellow,
                      }}>{myDay.tasks.length} pending</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleTabChange("Action Queue")}
                    style={{ fontSize: 10, color: P.odLBlue, background: "none", border: "none", cursor: "pointer" }}
                  >See all tasks →</button>
                </div>
                <MyDayActionQueue tasks={myDay?.tasks || []} />
              </div>
            </div>

            {/* ── RIGHT RAIL ── */}
            <div style={{ minWidth: 0 }}>
              {/* Continue Working */}
              {recents.length > 0 && (
                <div style={{
                  background: P.odSurf,
                  border: `1px solid ${P.odBorder2}`,
                  borderRadius: 6,
                  padding: "12px 16px",
                  marginBottom: 16,
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: P.odT3, marginBottom: 6,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>Continue Working</div>
                  <ContinueWorking />
                </div>
              )}

              {/* Revenue Progress */}
              <div style={{
                background: P.odSurf,
                border: `1px solid ${P.odBorder2}`,
                borderRadius: 6,
                padding: "12px 16px",
                marginBottom: 16,
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                  textTransform: "uppercase", color: P.odT1, marginBottom: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span>Revenue Progress</span>
                  <span style={{
                    fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 3,
                    border: `1px solid ${P.odBorder}`, color: P.odT3,
                  }}>SF</span>
                </div>
                {(() => {
                  const rp = myDay?.revenueProgress;
                  if (!rp || (rp.ytdRecurringGoal === 0 && rp.ytdRecurringWon === 0)) {
                    return <div style={{ fontSize: 12, color: P.odT4, fontStyle: "italic" }}>No revenue data available.</div>;
                  }
                  // If goal is below a sensible annual threshold, treat as "not set"
                  const goalIsValid = rp.ytdRecurringGoal >= 1000;
                  return (
                    <div>
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 10, color: P.odT3, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>YTD Recurring Won</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: P.odT1, fontFamily: "'JetBrains Mono', monospace" }}>
                          ${rp.ytdRecurringWon >= 1e6 ? `${(rp.ytdRecurringWon / 1e6).toFixed(1)}M` : rp.ytdRecurringWon >= 1e3 ? `${(rp.ytdRecurringWon / 1e3).toFixed(0)}K` : rp.ytdRecurringWon.toFixed(0)}
                        </div>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 10, color: P.odT3, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>YTD Goal</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: P.odT2, fontFamily: "'JetBrains Mono', monospace" }}>
                          {goalIsValid
                            ? `$${rp.ytdRecurringGoal >= 1e6 ? `${(rp.ytdRecurringGoal / 1e6).toFixed(1)}M` : rp.ytdRecurringGoal >= 1e3 ? `${(rp.ytdRecurringGoal / 1e3).toFixed(0)}K` : rp.ytdRecurringGoal.toFixed(0)}`
                            : "Goal not set"
                          }
                        </div>
                      </div>
                      {goalIsValid && (
                        <div>
                          <div style={{ fontSize: 10, color: P.odT3, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>% to Goal</div>
                          <div style={{
                            fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                            color: rp.pctToGoal >= 100 ? P.odGreen : rp.pctToGoal >= 70 ? P.odLBlue : rp.pctToGoal >= 40 ? P.odYellow : P.odT3,
                          }}>
                            {rp.pctToGoal.toFixed(0)}%
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {/* Non-recurring revenue — only when data exists */}
                {(() => {
                  const nr = myDay?.nonRecurringRevenue;
                  if (!nr || (nr.ytdWon === 0 && nr.ytdGoal < 1000)) return null;
                  const nrGoalValid = nr.ytdGoal >= 1000;
                  return (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${P.odBorder}` }}>
                      <div style={{ fontSize: 10, color: P.odT3, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 4 }}>Non-Recurring</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: P.odT1, fontFamily: "'JetBrains Mono', monospace" }}>
                        ${nr.ytdWon >= 1e6 ? `${(nr.ytdWon / 1e6).toFixed(1)}M` : nr.ytdWon >= 1e3 ? `${(nr.ytdWon / 1e3).toFixed(0)}K` : nr.ytdWon.toFixed(0)} won
                      </div>
                      <div style={{ fontSize: 12, color: P.odT2, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                        {nrGoalValid
                          ? `Goal: $${nr.ytdGoal >= 1e6 ? `${(nr.ytdGoal / 1e6).toFixed(1)}M` : nr.ytdGoal >= 1e3 ? `${(nr.ytdGoal / 1e3).toFixed(0)}K` : nr.ytdGoal.toFixed(0)}`
                          : "Goal not set"
                        }
                        {nrGoalValid && (
                          <span style={{
                            marginLeft: 8,
                            fontWeight: 700,
                            color: nr.pctToGoal >= 100 ? P.odGreen : nr.pctToGoal >= 70 ? P.odLBlue : nr.pctToGoal >= 40 ? P.odYellow : P.odT3,
                          }}>
                            {nr.pctToGoal.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Recent Wins — placeholder */}
              <div style={{
                background: P.odSurf,
                border: `1px solid ${P.odBorder2}`,
                borderRadius: 6,
                padding: "12px 16px",
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                  textTransform: "uppercase", color: P.odT1, marginBottom: 8,
                  fontFamily: "'JetBrains Mono', monospace",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span>Recent Wins</span>
                  <span style={{
                    fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 3,
                    border: `1px solid ${P.odBorder}`, color: P.odT3,
                  }}>SF</span>
                </div>
                {(() => {
                  const wins = myDay?.recentWins || [];
                  if (wins.length === 0) {
                    return <div style={{ fontSize: 12, color: P.odT4, fontStyle: "italic" }}>No recent wins.</div>;
                  }
                  return wins.map((w: any) => (
                    <div key={w.id} style={{
                      padding: "8px 0",
                      borderBottom: `1px solid ${P.odBorder}`,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: P.odT1 }}>{w.name}</div>
                      <div style={{ fontSize: 10, color: P.odT4, fontFamily: "'DM Mono', monospace" }}>
                        {w.accountName}{w.amount > 0 ? ` · $${w.amount >= 1e6 ? `${(w.amount / 1e6).toFixed(1)}M` : w.amount >= 1e3 ? `${(w.amount / 1e3).toFixed(0)}K` : w.amount.toFixed(0)}` : ""}{w.closeDate ? ` · ${w.closeDate}` : ""}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Neglected Households — full-book, cache-backed */}
              {myDay?._fullBookAvailable && (myDay?.neglectedHouseholds?.length || 0) > 0 && (
                <div style={{
                  background: P.odSurf,
                  border: `1px solid ${P.odBorder2}`,
                  borderRadius: 6,
                  padding: "12px 16px",
                  marginTop: 16,
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: P.odT1, marginBottom: 8,
                    fontFamily: "'JetBrains Mono', monospace",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <span>Review Aging</span>
                    <span style={{
                      fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 3,
                      border: `1px solid ${P.odBorder}`, color: P.odT3,
                    }}>SF</span>
                  </div>
                  {myDay.neglectedHouseholds.map((h: any, idx: number) => (
                    <div key={h.clientId} style={{
                      padding: "8px 0",
                      borderBottom: idx < myDay.neglectedHouseholds.length - 1 ? `1px solid ${P.odBorder}` : "none",
                    }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: P.odT1,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{h.clientName}</div>
                      <div style={{ fontSize: 10, color: P.odT4, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
                        {h.daysSinceReview}d since last review
                        {h.segment ? ` · Tier ${h.segment}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Provenance footer — spans all 3 columns */}
            <div style={{
              gridColumn: "1 / -1",
              marginTop: 8,
              paddingTop: 12,
              borderTop: `1px solid ${P.odBorder2}`,
              fontSize: 10,
              color: P.odT4,
              fontFamily: "'JetBrains Mono', monospace",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
            <span>
              Sources: {isLiveData ? "Salesforce · Orion · Outlook" : "Local data"}
            </span>
            {myDay?.generatedAt && (
              <span>
                Last updated {new Date(myDay.generatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
          </div>

          </div>{/* end three-column grid */}
        </div>
      )}

      {/* ═══ TAB: PORTFOLIO MONITOR ═══ */}
      {activeTab === "Portfolio Monitor" && (
        <div style={{ padding: 0 }}>
          <LivePortfolioMonitor />
        </div>
      )}

      {/* ═══ TAB: ACTION QUEUE ═══ */}
      {activeTab === "Action Queue" && (
        <div style={{ padding: 24 }}>
          <SectionCard title="Action Queue" icon={<SvgCheck />}
            dataTag={clientStats?.openTasksList ? "live" : "mock"}
            action={`${clientStats?.openTasks || 0} pending`}
            actionColor={P.odYellow}
          >
            <ActionQueue liveTasks={clientStats?.openTasksList} />
          </SectionCard>
        </div>
      )}

      {/* ═══ TAB: ALERTS ═══ */}
      {activeTab === "Alerts" && (
        <div style={{ padding: 24 }}>
          <SectionCard title="Alerts" icon={<SvgAlert />} dataTag={clientStats?.openCasesList ? "live" : "mock"}>
            <AlertsPanel liveCases={clientStats?.openCasesList} liveOpportunities={clientStats?.staleOpportunitiesList} />
          </SectionCard>
        </div>
      )}

      {/* ═══ TAB: OPPORTUNITIES ═══ */}
      {activeTab === "Opportunities" && (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionCard title="Open Pipeline" icon={<SvgChart />} dataTag={clientStats?.openOpportunitiesList ? "live" : "mock"}>
            <OpenOpportunitiesPipeline
              opportunities={clientStats?.openOpportunitiesList}
              pipelineTotal={clientStats?.pipelineTotal}
              pipelineWeighted={clientStats?.pipelineWeighted}
            />
          </SectionCard>
          <SectionCard title="Recently Closed Opportunities" icon={<SvgCheckmark />} dataTag={clientStats?.recentlyClosedOpportunitiesList ? "live" : "mock"}>
            <RecentlyClosedOpportunities opportunities={clientStats?.recentlyClosedOpportunitiesList} />
          </SectionCard>
        </div>
      )}
    </div>
  );
}
