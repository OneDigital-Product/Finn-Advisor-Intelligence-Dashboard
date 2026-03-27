import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { useNavPageTabs, NavRail } from "@/components/app-sidebar";
import { useDiagnosticContext } from "@/contexts/diagnostic-context";
import { ApiStatusBar } from "@/components/dashboard/ApiStatusBar";
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
function SvgZap() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 1L4 9h4l-1 6 5-8H8l1-6z"/></svg>;
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

/* ── My Day Section Header (minimal, single-column) ── */
function MyDaySection({ title, icon, badge, badgeColor, action, children }: {
  title: string; icon?: React.ReactNode; badge?: string;
  badgeColor?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        paddingBottom: 8,
        borderBottom: `1px solid ${P.odBorder}`,
        marginBottom: 12,
      }}>
        {icon}
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: P.odT2,
        }}>
          {title}
        </span>
        {badge && (
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 10,
            background: (badgeColor || P.odOrange) + "20",
            color: badgeColor || P.odOrange,
          }}>
            {badge}
          </span>
        )}
        {action && <div style={{ marginLeft: "auto" }}>{action}</div>}
      </div>
      {children}
    </div>
  );
}

/* ── Quick Link ── */
function QuickLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: P.odLBlue,
        background: "none",
        border: `1px solid ${P.odBorder}`,
        borderRadius: 6,
        padding: "6px 14px",
        cursor: "pointer",
        transition: "border-color 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = P.odLBlue)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = P.odBorder)}
    >
      {label} →
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("My Day");

  const handleTabChange = useCallback((label: string) => {
    if (label === "Clients") { router.push("/clients"); return; }
    if (label === "Reports") { router.push("/reports"); return; }
    setActiveTab(label);
  }, [router]);

  const { setTabs } = useNavPageTabs();

  // ── MY DAY QUERIES (4 total) ──────────────────────────────────

  // 1. /api/myday — hero, urgency, ranked tasks, cases
  const { data: myDay, isLoading: myDayLoading } = useQuery<any>({
    queryKey: ["/api/myday"],
    staleTime: 30_000,
  });

  // 2. /api/calendar/live — today's schedule (Outlook + SF)
  // (consumed by TodaySchedule component directly)

  // 3. /api/insights/dashboard — needs attention section
  // (consumed by NeedsAttention component directly)

  // 4. /api/engagement/actions — NBA for action queue
  const { data: nbaData } = useQuery<{ actions: any[] }>({
    queryKey: ["/api/engagement/actions"],
    enabled: !!user,
  });

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

  const completeNbaMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/engagement/actions/${id}/complete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/engagement/actions"] });
      toast({ title: "Action completed" });
    },
  });

  const dismissNbaMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/engagement/actions/${id}/dismiss`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/engagement/actions"] });
      toast({ title: "Action dismissed" });
    },
  });

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
          { field: "Active Clients", source: myDay.isLiveData ? "salesforce" : "computed", value: myDay.activeClientCount, sfField: "Account", uiLocation: "Hero", apiEndpoint: "/api/myday", apiSource: "MuleSoft → Salesforce" },
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
  const activeClients = myDay?.activeClientCount || myDay?.clientCount || 0;
  const urgency = myDay?.urgency || { openCases: 0, overdueTasks: 0, staleOpps: 0, meetingsToday: 0 };

  // Badge counts for tabs
  const openTaskCount = myDay?.urgency?.overdueTasks || clientStats?.openTasks || 0;
  const unreadAlerts = (myDay?.urgency?.openCases || 0) + (myDay?.urgency?.staleOpps || 0) || clientStats?.openCases || 0;

  const pageTabs = [
    { label: "My Day" },
    { label: "Portfolio Monitor", badge: activeClients || clientStats?.clientCount || 0, badgeColor: "blue" as const },
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
  }, [activeTab, activeClients, openTaskCount, unreadAlerts]);

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
      <ApiStatusBar />
      <NavRail />

      {/* ═══ TAB: MY DAY ═══ */}
      {activeTab === "My Day" && (
        <div style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "0 24px 48px",
        }}>
          {/* SECTION 1: HERO */}
          <WallStreetHero
            greeting={greeting}
            firstName={firstName}
            lastName={lastName}
            totalAum={totalAum}
            activeClients={activeClients}
            meetingsToday={urgency.meetingsToday}
            urgentCategories={myDay?.briefing?.urgentCategories || 0}
            isLiveData={isLiveData}
            isLoading={myDayLoading}
          />

          {/* SECTION 2: URGENCY STRIP */}
          <UrgencyStrip
            openCases={urgency.openCases}
            overdueTasks={urgency.overdueTasks}
            staleOpps={urgency.staleOpps}
            meetingsToday={urgency.meetingsToday}
          />

          {/* SECTION 3: TODAY'S SCHEDULE */}
          <MyDaySection
            title="Today's Schedule"
            icon={<SvgCal />}
            badge={urgency.meetingsToday > 0 ? `${urgency.meetingsToday} today` : undefined}
            badgeColor={P.odLBlue}
            action={
              <button
                onClick={() => handleTabChange("Action Queue")}
                style={{ fontSize: 11, color: P.odLBlue, background: "none", border: "none", cursor: "pointer" }}
              >
                See all meetings →
              </button>
            }
          >
            <TodaySchedule />
          </MyDaySection>

          {/* SECTION 4: ACTION QUEUE */}
          <MyDaySection
            title="Action Queue"
            icon={<SvgCheck />}
            badge={myDay?.tasks?.length > 0 ? `${myDay.tasks.length} pending` : undefined}
            badgeColor={P.odYellow}
            action={
              <button
                onClick={() => handleTabChange("Action Queue")}
                style={{ fontSize: 11, color: P.odLBlue, background: "none", border: "none", cursor: "pointer" }}
              >
                See all tasks →
              </button>
            }
          >
            {/* Ranked tasks from /api/myday */}
            {(myDay?.tasks || []).slice(0, 5).map((task: any) => (
              <div key={task.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 0", borderBottom: `1px solid ${P.odBorder}40`,
              }}>
                <input
                  type="checkbox"
                  style={{ accentColor: P.odGreen, width: 14, height: 14, cursor: "pointer" }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: P.odT1 }}>{task.subject}</div>
                  <div style={{ fontSize: 10, color: P.odT3 }}>{task.relatedTo}{task.dueDate ? ` · Due: ${task.dueDate}` : ""}</div>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                  padding: "2px 6px", borderRadius: 4,
                  background: task.rank === 1 ? "#E53E3E20" : task.rank === 2 ? P.odYellow + "20" : P.odBorder,
                  color: task.rank === 1 ? "#E53E3E" : task.rank === 2 ? P.odYellow : P.odT3,
                }}>
                  {task.rankLabel}
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 600, color: P.odT3,
                  padding: "2px 6px", borderRadius: 4, border: `1px solid ${P.odBorder}`,
                }}>
                  {task.source === "salesforce" ? "SF" : "App"}
                </span>
              </div>
            ))}

            {/* NBA suggested actions (below ranked tasks) */}
            {(nbaData?.actions || []).slice(0, 3).map((action: any) => (
              <div key={action.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 0", borderBottom: `1px solid ${P.odBorder}40`,
              }}>
                <span style={{ fontSize: 14, color: P.odLBlue }}>●</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: P.odT1 }}>
                    {action.title || action.actionType?.replace(/_/g, " ")}
                  </div>
                  <div style={{ fontSize: 10, color: P.odT3 }}>{action.clientName}</div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => completeNbaMutation.mutate(action.id)}
                    style={{ fontSize: 10, fontWeight: 600, color: P.odGreen, background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>Done</button>
                  <button onClick={() => dismissNbaMutation.mutate(action.id)}
                    style={{ fontSize: 10, fontWeight: 600, color: P.odT3, background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>Skip</button>
                </div>
              </div>
            ))}

            {(myDay?.tasks?.length === 0 && (!nbaData?.actions || nbaData.actions.length === 0)) && (
              <div style={{ padding: "12px 0", color: P.odT3, fontSize: 13, fontStyle: "italic" }}>
                No pending tasks right now.
              </div>
            )}
          </MyDaySection>

          {/* SECTION 5: NEEDS ATTENTION */}
          <MyDaySection
            title="Needs Attention"
            icon={<SvgAlert />}
            action={
              <button
                onClick={() => handleTabChange("Alerts")}
                style={{ fontSize: 11, color: P.odLBlue, background: "none", border: "none", cursor: "pointer" }}
              >
                See all alerts →
              </button>
            }
          >
            <NeedsAttention
              cases={myDay?.cases || []}
              onSeeAll={() => handleTabChange("Alerts")}
            />
          </MyDaySection>

          {/* SECTION 6: QUICK LINKS */}
          <div style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            paddingTop: 16,
            borderTop: `1px solid ${P.odBorder}`,
          }}>
            <QuickLink label="All meetings" onClick={() => handleTabChange("Action Queue")} />
            <QuickLink label="All tasks" onClick={() => handleTabChange("Action Queue")} />
            <QuickLink label="Opportunities" onClick={() => handleTabChange("Opportunities")} />
            <QuickLink label="Reports" onClick={() => handleTabChange("Reports")} />
            <QuickLink label="Portfolio" onClick={() => handleTabChange("Portfolio Monitor")} />
          </div>
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
          {(nbaData?.actions?.length ?? 0) > 0 && (
            <SectionCard title="Next Best Actions" icon={<SvgZap />} dataTag="app">
              <div>
                {nbaData!.actions.map((action: any) => (
                  <div key={action.id} style={{
                    display: "flex", alignItems: "flex-start", gap: 12,
                    padding: "10px 0", borderBottom: `1px solid rgba(45,55,72,0.25)`,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: P.odT1 }}>{action.title || action.actionType?.replace(/_/g, " ")}</div>
                      <div style={{ fontSize: 11, color: P.odT3 }}>{action.clientName}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => completeNbaMutation.mutate(action.id)}
                        style={{ fontSize: 10, fontWeight: 600, color: P.odGreen, background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>Done</button>
                      <button onClick={() => dismissNbaMutation.mutate(action.id)}
                        style={{ fontSize: 10, fontWeight: 600, color: P.odT3, background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>Skip</button>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
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
