import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useWidgetConfig, DASHBOARD_WIDGETS } from "@/hooks/use-widget-config";
import { WidgetCustomizePanel } from "@/components/widget-customize-panel";
import { ReminderWidget } from "@/components/reminders/ReminderWidget";
import { SchedulingWidget } from "@/components/integrations/SchedulingWidget";

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
import { UpcomingMeetings } from "@/components/dashboard/UpcomingMeetings";
import { RecentlyClosedOpportunities } from "@/components/dashboard/RecentlyClosedOpportunities";
import { OutlookCalendarWidget } from "@/components/dashboard/OutlookCalendarWidget";
import { OpenOpportunitiesPipeline } from "@/components/dashboard/OpenOpportunitiesPipeline";
import { RevenuePipeline } from "@/components/dashboard/RevenuePipeline";
import { FinQuickAction } from "@/components/cassidy/fin-quick-action";
import { P } from "@/styles/tokens";

/* ── OD Brand Palette — derived from P tokens ── */
const OD = {
  deepBlue: P.odDeep,
  medBlue: P.odBlue,
  medGreen: P.odGreen,
  orange: P.odOrange,
  lightBlue: P.odLBlue,
  lightGreen: P.odLGreen,
  yellow: P.odYellow,
  bgDark: P.odBg,
  bgMed: P.odSurf,
  text1: P.odT1,
  text2: P.odT2,
  text3: P.odT3,
  border: P.odBorder,
};

/* ── Inline SVG Icons ── */
function SvgAI() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="6"/><path d="M6 6.5C6 5.7 6.9 5 8 5s2 .7 2 1.5c0 1-1 1.5-2 2v1"/><circle cx="8" cy="12" r=".5" fill="currentColor"/></svg>;
}
function SvgCal() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 3V1M11 3V1M2 7h12"/></svg>;
}
function SvgCheck() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8l3 3 7-6"/><rect x="1.5" y="1.5" width="13" height="13" rx="1.5"/></svg>;
}
function SvgCalc() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="2" width="12" height="12" rx="1.5"/><path d="M5 8h6M8 5v6"/></svg>;
}
function SvgInsight() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 1.5"/></svg>;
}
function SvgAlert() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 2L2 13h12L8 2z"/><path d="M8 7v3M8 11.5v.5"/></svg>;
}
function SvgCheckmark() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8l3 3 7-6"/></svg>;
}
function SvgUser() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="6" r="3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>;
}
function SvgTarget() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="3"/><circle cx="8" cy="8" r=".5" fill="currentColor"/></svg>;
}
function SvgZap() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 1L4 9h4l-1 6 5-8H8l1-6z"/></svg>;
}
function SvgChart() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="1" y="8" width="3" height="6" rx="0.5"/><rect x="6" y="4" width="3" height="10" rx="0.5"/><rect x="11" y="1" width="3" height="13" rx="0.5"/></svg>;
}

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

  // Inject page tabs into the NavRail top bar via context
  const { setTabs } = useNavPageTabs();

  /* ── Queries ── */
  const { data: clientStats } = useQuery<any>({
    queryKey: ["/api/clients/stats"],
    // If stats returns demo/seed data, refetch aggressively until live data arrives
    refetchInterval: (query) => {
      const d = query.state.data;
      if (d && d.isDemoData && !d.isLiveData) return 5000; // retry every 5s
      return false; // stop polling once live data arrives
    },
  });

  const { data: allMeetings } = useQuery<any[]>({
    queryKey: ["/api/meetings"],
  });

  const { data: alerts } = useQuery<any[]>({
    queryKey: ["/api/alerts"],
  });

  const insightsDashboard = useQuery<{ high: number; medium: number; low: number; total: number; recent: any[] }>({
    queryKey: ["/api/insights/dashboard"],
  });

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/insights/generate");
      return res.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/insights/dashboard"] });
      toast({ title: "Insights generated", description: `${result.totalGenerated} insights found across ${result.clientsAnalyzed} clients` });
    },
    onError: (err: any) => {
      toast({ title: "Insight generation failed", description: err.message, variant: "destructive" });
    },
  });

  const dismissInsightMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/insights/${id}/dismiss`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insights/dashboard"] });
      toast({ title: "Insight dismissed" });
    },
  });

  const markInsightReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/insights/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insights/dashboard"] });
    },
  });

  const { data: nbaData } = useQuery<{ actions: any[] }>({
    queryKey: ["/api/engagement/actions"],
    enabled: !!user,
  });

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

  const { data: goalsDashboard } = useQuery<{ totalGoals: number; clientsWithGoals: number; aggregateFundedRatio: number; totalTarget: number; totalCurrent: number }>({
    queryKey: ["/api/goals/dashboard"],
    enabled: !!user,
  });

  const { data: calcRuns } = useQuery<any[]>({
    queryKey: ["/api/calculators/runs"],
    enabled: !!user,
  });

  /* ── Diagnostic Context — register dashboard fields for Page Data Provenance panel ── */
  const { setPageDiagnostics, clearPageDiagnostics } = useDiagnosticContext();
  const lastDiagKey = useRef("");
  useEffect(() => {
    const stats = clientStats;
    if (!stats) return;
    const key = `${stats.totalAum}-${stats.isLiveData}-${allMeetings?.length}-${alerts?.length}-${nbaData?.actions?.length}-${insightsDashboard.data?.total}`;
    if (key === lastDiagKey.current) return; // Skip if data hasn't changed
    lastDiagKey.current = key;
    // Decouple from render cycle to prevent infinite update loop
    const timer = setTimeout(() => {
      setPageDiagnostics({
        pageLabel: "My Day",
        fields: [
          { field: "Total AUM", source: stats.isLiveData ? "orion" : "computed", value: stats.totalAum, sfField: "FinServ__TotalAssets__c", orionField: "portfolio.totalMarketValue", uiLocation: "Dashboard hero card", apiEndpoint: "/api/clients/stats", apiSource: "MuleSoft → Orion" },
          { field: "Active Clients", source: stats.isLiveData ? "salesforce" : "computed", value: stats.totalClients, sfField: "Account WHERE FinServ__Status__c='Active'", uiLocation: "Dashboard hero card", apiEndpoint: "/api/clients/stats", apiSource: "MuleSoft → Salesforce" },
          { field: "Revenue YTD", source: "computed", value: stats.revenue, uiLocation: "Dashboard hero card", reason: stats.revenue ? undefined : "Billing endpoint not yet returning data", apiEndpoint: "/api/clients/stats" },
          { field: "Meetings", source: "salesforce", value: allMeetings?.length ?? null, sfField: "Event", uiLocation: "Activity bar + Schedule", apiEndpoint: "/api/meetings", apiSource: "MuleSoft → Salesforce" },
          { field: "Alerts", source: "salesforce", value: alerts?.length ?? null, sfField: "Case + Opportunity", uiLocation: "Activity bar + Alerts panel", apiEndpoint: "/api/alerts", apiSource: "MuleSoft → Salesforce" },
          { field: "NBA Actions", source: "computed", value: nbaData?.actions?.length ?? null, uiLocation: "Next Best Actions panel", apiEndpoint: "/api/engagement/actions" },
          { field: "Insights", source: "computed", value: insightsDashboard.data?.total ?? null, uiLocation: "Client Insights", apiEndpoint: "/api/insights/dashboard" },
        ],
        dataSources: {
          salesforce: stats.isLiveData ? "live" : "mock",
          orion: stats.isLiveData ? "live" : "mock",
          mulesoft: stats.isLiveData ? "live" : "mock",
        },
      });
    }, 0);
    return () => clearTimeout(timer);
  }); // No deps — ref-gated, runs on every render but skips if key unchanged
  useEffect(() => () => clearPageDiagnostics(), [clearPageDiagnostics]);

  /* ── Computed Values ── */
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  const nameOverrides: Record<string, string> = { Mike: "Michael" };
  const rawName = clientStats?.advisorName || user?.name || "there";
  const nameParts = rawName.split(" ");
  if (nameParts.length >= 2 && nameOverrides[nameParts[0]]) {
    nameParts[0] = nameOverrides[nameParts[0]];
  }
  const firstName = nameParts[0];
  const lastName = nameParts.length >= 2 ? nameParts.slice(1).join(" ") : "";
  const advisorDivision = clientStats?.advisorDivision || null;
  const isLiveStats = clientStats?.isLiveData === true;
  const isDemoStats = clientStats?.isDemoData === true && !isLiveStats;
  const totalAum = clientStats?.totalAum || 0;
  const totalClients = clientStats?.clientCount || 0;
  const today = new Date().toISOString().split("T")[0];
  const todaysMeetingCount = allMeetings?.filter(m => m.startTime.startsWith(today)).length || 0;
  const localAlerts = alerts?.filter((a: any) => !a.isRead && !a.dismissedAt).length || 0;
  const sfAlertCount = (clientStats?.openCases || 0) + (clientStats?.staleOpportunities || 0);
  const unreadAlerts = sfAlertCount > 0 ? sfAlertCount : localAlerts;
  const openTaskCount = clientStats?.openTasks || 0;
  const openCaseCount = clientStats?.openCases || 0;
  const staleOppCount = clientStats?.staleOpportunities || 0;
  const upcomingEventCount = clientStats?.upcomingEvents || 0;
  const isLiveData = !clientStats?.isDemoData;

  const pageTabs = [
    { label: "My Day" },
    { label: "Portfolio Monitor", badge: totalClients, badgeColor: "blue" as const },
    { label: "Action Queue", badge: openTaskCount, badgeColor: "orange" as const },
    { label: "Alerts", badge: unreadAlerts, badgeColor: "orange" as const },
    { label: "Clients" },
    { label: "Opportunities", badge: (clientStats?.openOpportunities || 0) + (clientStats?.recentlyClosedOpportunities || 0), badgeColor: "green" as const },
    { label: "Reports" },
  ];

  // Push page tabs into the top nav bar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setTabs(<PageTabs tabs={pageTabs} activeTab={activeTab} onTabChange={handleTabChange} />);
    return () => setTabs(null);
  }, [activeTab, totalClients, openTaskCount, unreadAlerts, staleOppCount]);

  /* ── Widget Customization (unified system) ── */
  const widgetConfig = useWidgetConfig("dashboard", DASHBOARD_WIDGETS);
  const [showCustomizePanel, setShowCustomizePanel] = useState(false);
  const isVisible = (key: string) => widgetConfig.isVisible(key);

  /* ── Drag-and-drop widget reordering (left column) ── */
  const DEFAULT_WIDGET_ORDER = ["schedule", "actionQueue", "calcRuns", "goals", "revenuePipeline"];
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_WIDGET_ORDER;
    try {
      const saved = localStorage.getItem("od-widget-order");
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_WIDGET_ORDER;
  });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setWidgetOrder(prev => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      try { localStorage.setItem("od-widget-order", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  const visibleWidgets = useMemo(() => widgetOrder.filter(id => isVisible(id)), [widgetOrder, isVisible]);

  return (
    <div style={{
      background: OD.bgDark,
      color: OD.text1,
      fontFamily: "'Inter', system-ui, sans-serif",
      minHeight: "100vh",
    }}>
      {/* ═══ 1. TOP NAV — "ONEDIGITAL Advisor Intelligence LIVE DATA" ═══ */}
      <TopNav isLiveData={isLiveData} />

      {/* ═══ 2. API STATUS BAR — SF/Orion/MuleSoft badges ═══ */}
      <ApiStatusBar />

      {/* ═══ 3. NAV BAR — Overview, Planning, etc. + page tabs + customize ═══ */}
      <NavRail>
        <WidgetCustomizePanel
          title="Dashboard Sections"
          widgetConfig={widgetConfig}
          open={showCustomizePanel}
          onOpenChange={setShowCustomizePanel}
        />
      </NavRail>

      {/* ═══ TAB CONTENT ═══ */}
      {activeTab === "Portfolio Monitor" && (
        <div style={{ padding: 0 }}>
          <LivePortfolioMonitor />
        </div>
      )}

      {activeTab === "Action Queue" && (
        <div style={{ padding: 24 }}>
          <SectionCard title="Action Queue" icon={<SvgCheck />}
            dataTag={clientStats?.openTasksList ? "live" : "mock"}
            action={`${openTaskCount} pending`}
            actionColor={OD.yellow}
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
                      <div style={{ fontSize: 12, fontWeight: 600, color: OD.text1 }}>{action.title || action.actionType?.replace(/_/g, " ")}</div>
                      <div style={{ fontSize: 11, color: OD.text3 }}>{action.clientName}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => completeNbaMutation.mutate(action.id)}
                        style={{ fontSize: 10, fontWeight: 600, color: OD.medGreen, background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>Done</button>
                      <button onClick={() => dismissNbaMutation.mutate(action.id)}
                        style={{ fontSize: 10, fontWeight: 600, color: OD.text3, background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>Skip</button>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {activeTab === "Alerts" && (
        <div style={{ padding: 24 }}>
          <SectionCard title="Alerts" icon={<SvgAlert />} dataTag={clientStats?.openCasesList ? "live" : "mock"}>
            <AlertsPanel liveCases={clientStats?.openCasesList} liveOpportunities={clientStats?.staleOpportunitiesList} />
          </SectionCard>
        </div>
      )}

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

      {activeTab === "My Day" && (
      <>
      {/* ═══ HERO ═══ */}
      <WallStreetHero
        greeting={greeting}
        firstName={firstName}
        lastName={lastName}
        division={advisorDivision}
        totalAum={totalAum}
        totalClients={totalClients}
        activeClients={clientStats?.activeClientCount}
        revenueYTD={clientStats?.revenueYTD || 0}
        revenueSource={clientStats?.revenueSource}
        isLoading={isDemoStats}
        meetingCount={todaysMeetingCount}
        taskCount={openTaskCount}
        caseCount={openCaseCount}
        staleOppCount={staleOppCount}
        eventCount={upcomingEventCount}
        alertCount={unreadAlerts}
        isLiveData={isLiveData}
        averageClientAUM={clientStats?.averageClientAUM}
        topClient={clientStats?.topClient}
      />

      {/* ═══ CUSTOMIZABLE GRID LAYOUT ═══ */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 340px",
        gap: 0, minHeight: "calc(100vh - 300px)",
      }}>
        {/* ── LEFT COLUMN (drag-and-drop reorderable) ── */}
        <div style={{ borderRight: `1px solid ${OD.border}` }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleWidgets} strategy={verticalListSortingStrategy}>
          {/* Schedule & Calendar */}
          {isVisible("schedule") && (<SortableWidget id="schedule">
            <SectionCard title="Schedule & Calendar" icon={<SvgCal />}
              dataTag={clientStats?.upcomingEventsList ? "live" : "mock"}
              action={`${todaysMeetingCount} today`}
              maxHeight={500}
            >
              {/* Outlook Calendar — integrated at top */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: OD.medBlue, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <SvgCal /> Outlook Calendar
                  <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: "rgba(0,120,162,0.1)", color: OD.lightBlue }}>LIVE</span>
                </div>
                <OutlookCalendarWidget />
              </div>
              {/* Today's Schedule */}
              <div style={{ borderTop: `1px solid rgba(45,55,72,0.25)`, paddingTop: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: OD.text3, marginBottom: 6 }}>
                  Today
                </div>
                <TodaySchedule liveEventCount={clientStats?.upcomingEvents} liveEvents={clientStats?.upcomingEventsList} />
              </div>
              {/* Upcoming */}
              <div style={{ borderTop: `1px solid rgba(45,55,72,0.25)`, paddingTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: OD.text3, marginBottom: 6 }}>
                  Upcoming
                </div>
                <UpcomingMeetings />
              </div>
              {/* Scheduling widget */}
              <div style={{ borderTop: `1px solid rgba(45,55,72,0.25)`, marginTop: 8, paddingTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: OD.text3, marginBottom: 6 }}>
                  Quick Schedule
                </div>
                <SchedulingWidget />
              </div>
            </SectionCard>
          </SortableWidget>
          )}

          {/* Action Queue + Next Best Actions (merged) */}
          {isVisible("actionQueue") && (<SortableWidget id="actionQueue">
            <SectionCard title="Action Queue" icon={<SvgCheck />}
              dataTag={clientStats?.openTasksList ? "live" : "mock"}
              action={`${openTaskCount} pending`}
              maxHeight={400}
              actionColor={OD.yellow}
            >
              <ActionQueue liveTasks={clientStats?.openTasksList} />
              {(nbaData?.actions?.length ?? 0) > 0 && (
                <div style={{ borderTop: `1px solid rgba(45,55,72,0.25)`, marginTop: 8, paddingTop: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: OD.text3, marginBottom: 6 }}>
                    Suggested Actions
                  </div>
                  {nbaData!.actions.slice(0, 4).map((action: any) => (
                    <div key={action.id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 0", borderBottom: `1px solid rgba(45,55,72,0.25)`,
                    }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                        background: action.priority === "high" ? OD.orange : OD.lightBlue,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: OD.text1 }}>{action.title || action.actionType?.replace(/_/g, " ")}</div>
                        {action.clientName && <div style={{ fontSize: 11, color: OD.text3 }}>{action.clientName}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => completeNbaMutation.mutate(action.id)}
                          style={{ fontSize: 10, fontWeight: 600, color: OD.medGreen, background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>Done</button>
                        <button onClick={() => dismissNbaMutation.mutate(action.id)}
                          style={{ fontSize: 10, fontWeight: 600, color: OD.text3, background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>Skip</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </SortableWidget>
          )}

          {/* Calculator Runs */}
          {isVisible("calcRuns") && (<SortableWidget id="calcRuns">
            <SectionCard title="Calculator Runs" icon={<SvgCalc />} dataTag="app">
            {(!calcRuns || calcRuns.length === 0) ? (
              <div style={{ fontSize: 12, color: OD.text3, textAlign: "center", padding: 20 }}>
                No calculator runs yet.
              </div>
            ) : (
              <div>
                {calcRuns.slice(0, 5).map((c: any) => (
                  <div key={c.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 0", borderBottom: `1px solid rgba(45,55,72,0.25)`,
                    cursor: "pointer",
                  }}>
                    <div style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: OD.medGreen }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: OD.text1, textTransform: "capitalize" }}>
                        {c.calculatorType?.replace(/_/g, " ")}
                      </div>
                      <div style={{ fontSize: 11, color: OD.text3 }}>
                        {c.clientName && <span>{c.clientName} · </span>}
                        {c.createdAt && new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                    <ChevronRight style={{ width: 10, height: 10, color: OD.text3 }} />
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
          </SortableWidget>
          )}

          {/* Goals Dashboard — SF Revenue Goals + App Goals */}
          {isVisible("goals") && (<SortableWidget id="goals">
            <SectionCard title="Goals Dashboard" icon={<SvgTarget />} dataTag={clientStats?.revenueGoals ? "live" : "app"}>
              <div>
                {/* ── SF Revenue Goals (LIVE from Salesforce) ── */}
                {clientStats?.revenueGoals && (clientStats.revenueGoals.recurringWonSalesThisYear > 0 || clientStats.revenueGoals.ytdWmNonRecurringWonSales > 0) && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: OD.text3 }}>Revenue — YTD (Salesforce)</span>
                      <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "rgba(0,161,224,0.12)", color: "#00A1E0" }}>LIVE</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div style={{ padding: 14, background: "rgba(0,120,162,0.06)", borderRadius: 8, borderLeft: `3px solid ${OD.medBlue}` }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: OD.lightBlue, fontFamily: "'Oswald', sans-serif" }}>
                          ${(clientStats.revenueGoals.recurringWonSalesThisYear / 1000).toFixed(0)}K
                        </div>
                        <div style={{ fontSize: 10, color: OD.text3, marginTop: 3 }}>Recurring Won Sales</div>
                        {clientStats.revenueGoals.wmYtdRecurringSalesGoal > 0 && (
                          <div style={{ fontSize: 10, color: OD.medGreen, marginTop: 2 }}>
                            Goal: ${(clientStats.revenueGoals.wmYtdRecurringSalesGoal / 1000).toFixed(0)}K · {clientStats.revenueGoals.wmYtdRecurringSalesPctToGoal}%
                          </div>
                        )}
                      </div>
                      <div style={{ padding: 14, background: "rgba(142,185,53,0.06)", borderRadius: 8, borderLeft: `3px solid ${OD.medGreen}` }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: OD.medGreen, fontFamily: "'Oswald', sans-serif" }}>
                          ${(clientStats.revenueGoals.ytdWmNonRecurringWonSales / 1000).toFixed(1)}K
                        </div>
                        <div style={{ fontSize: 10, color: OD.text3, marginTop: 3 }}>Non-Recurring Won Sales</div>
                        {clientStats.revenueGoals.wmYtdNonRecurringSalesGoal > 0 && (
                          <div style={{ fontSize: 10, color: OD.medBlue, marginTop: 2 }}>
                            Goal: ${(clientStats.revenueGoals.wmYtdNonRecurringSalesGoal / 1000).toFixed(0)}K · {clientStats.revenueGoals.wmYtdNonRecurringSalesPctToGoal}%
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Total revenue bar */}
                    {(() => {
                      const totalWon = (clientStats.revenueGoals.recurringWonSalesThisYear || 0) + (clientStats.revenueGoals.ytdWmNonRecurringWonSales || 0);
                      const totalGoal = (clientStats.revenueGoals.wmYtdRecurringSalesGoal || 0) + (clientStats.revenueGoals.wmYtdNonRecurringSalesGoal || 0);
                      const pct = totalGoal > 0 ? Math.min((totalWon / totalGoal) * 100, 100) : 0;
                      return (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: OD.text3 }}>Total Won: <span style={{ color: OD.lightBlue, fontWeight: 600 }}>${(totalWon / 1000).toFixed(0)}K</span></span>
                            {totalGoal > 0 && <span style={{ fontSize: 11, color: OD.text3 }}>Goal: <span style={{ color: OD.medGreen, fontWeight: 600 }}>${(totalGoal / 1000).toFixed(0)}K</span></span>}
                          </div>
                          {totalGoal > 0 && (
                            <div style={{ height: 6, borderRadius: 3, background: "rgba(148,163,184,0.1)", overflow: "hidden" }}>
                              <div style={{
                                height: "100%", borderRadius: 3,
                                width: `${pct}%`,
                                background: `linear-gradient(90deg, ${OD.medBlue}, ${OD.medGreen})`,
                                transition: "width .5s ease",
                              }} />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ── App Goals (local DB) ── */}
                {goalsDashboard && (goalsDashboard.totalGoals > 0 || goalsDashboard.totalTarget > 0) && (
                  <div style={{ paddingTop: clientStats?.revenueGoals?.recurringWonSalesThisYear > 0 ? 14 : 0, borderTop: clientStats?.revenueGoals?.recurringWonSalesThisYear > 0 ? `1px solid rgba(45,55,72,0.25)` : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: OD.text3 }}>AUM Goals (App)</span>
                      <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "rgba(148,163,184,0.08)", color: OD.text3 }}>APP</span>
                    </div>
                    {/* Funded ratio bar */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: OD.text3 }}>Aggregate Funded Ratio</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: OD.lightBlue, fontFamily: "'Oswald', sans-serif" }}>
                          {((goalsDashboard.aggregateFundedRatio || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "rgba(148,163,184,0.1)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 3,
                          width: `${Math.min((goalsDashboard.aggregateFundedRatio || 0) * 100, 100)}%`,
                          background: `linear-gradient(90deg, ${OD.medBlue}, ${OD.medGreen})`,
                          transition: "width .5s ease",
                        }} />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      <div style={{ textAlign: "center", padding: 10, background: "rgba(0,120,162,0.06)", borderRadius: 6 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: OD.lightBlue, fontFamily: "'Oswald', sans-serif" }}>{goalsDashboard.totalGoals || 0}</div>
                        <div style={{ fontSize: 10, color: OD.text3, marginTop: 2 }}>Total Goals</div>
                      </div>
                      <div style={{ textAlign: "center", padding: 10, background: "rgba(142,185,53,0.06)", borderRadius: 6 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: OD.medGreen, fontFamily: "'Oswald', sans-serif" }}>{goalsDashboard.clientsWithGoals || 0}</div>
                        <div style={{ fontSize: 10, color: OD.text3, marginTop: 2 }}>Clients w/ Goals</div>
                      </div>
                      <div style={{ textAlign: "center", padding: 10, background: "rgba(244,125,32,0.06)", borderRadius: 6 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: OD.orange, fontFamily: "'Oswald', sans-serif" }}>${((goalsDashboard.totalTarget || 0) / 1e6).toFixed(1)}M</div>
                        <div style={{ fontSize: 10, color: OD.text3, marginTop: 2 }}>Target AUM</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 11, color: OD.text3 }}>
                      <span>Current: <span style={{ color: OD.medGreen, fontWeight: 600 }}>${((goalsDashboard.totalCurrent || 0) / 1e6).toFixed(1)}M</span></span>
                      <span>Target: <span style={{ color: OD.lightBlue, fontWeight: 600 }}>${((goalsDashboard.totalTarget || 0) / 1e6).toFixed(1)}M</span></span>
                    </div>
                  </div>
                )}

                {/* Empty state — no SF revenue goals AND no app goals */}
                {(!clientStats?.revenueGoals || (clientStats.revenueGoals.recurringWonSalesThisYear === 0 && clientStats.revenueGoals.ytdWmNonRecurringWonSales === 0)) && (!goalsDashboard || (goalsDashboard.totalGoals === 0 && goalsDashboard.totalTarget === 0)) && (
                  <div style={{ fontSize: 12, color: OD.text3, textAlign: "center", padding: 20 }}>
                    No goals or revenue data available yet.
                  </div>
                )}
              </div>
            </SectionCard>
          </SortableWidget>
          )}

          {/* Revenue & Pipeline — unified view of goals + opportunities */}
          {isVisible("revenuePipeline") && (<SortableWidget id="revenuePipeline">
            <SectionCard title="Revenue & Pipeline" icon={<SvgChart />}
              dataTag={clientStats?.openOpportunitiesList ? "live" : "mock"}
              action={clientStats?.pipelineTotal ? `$${(clientStats.pipelineTotal / 1000).toFixed(0)}K pipeline` : undefined}
            >
              <RevenuePipeline
                revenueGoals={clientStats?.revenueGoals}
                revenueYTD={clientStats?.revenueYTD}
                revenueSource={clientStats?.revenueSource}
                openOpportunities={clientStats?.openOpportunitiesList}
                recentlyClosed={clientStats?.recentlyClosedOpportunitiesList}
                staleOpportunities={clientStats?.staleOpportunitiesList}
                pipelineTotal={clientStats?.pipelineTotal}
                pipelineWeighted={clientStats?.pipelineWeighted}
              />
            </SectionCard>
          </SortableWidget>
          )}
        </SortableContext>
        </DndContext>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ background: OD.bgDark }}>
          {/* Insights */}
          {isVisible("insights") && (
            <RightCard title="Insights" icon={<SvgInsight />} titleColor={OD.lightBlue}
              dataTag="app" action="↻ Scan"
              onAction={() => generateInsightsMutation.mutate()}
            >
              {insightsDashboard.data?.recent?.length ? (
                <div>
                  {(insightsDashboard.data?.high ?? 0) > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 99,
                        background: "rgba(244,125,32,0.1)", color: OD.orange,
                      }}>
                        {insightsDashboard.data?.high} high
                      </span>
                    </div>
                  )}
                  {insightsDashboard.data.recent.map((insight: any) => (
                    <div key={insight.id} style={{
                      padding: "10px 0", borderBottom: `1px solid rgba(45,55,72,0.25)`,
                    }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: OD.text1, marginBottom: 2 }}>
                        {insight.title}
                      </div>
                      <div style={{ fontSize: 11, color: OD.text3, marginBottom: 5 }}>
                        {insight.description}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span onClick={() => markInsightReadMutation.mutate(insight.id)}
                          style={{ fontSize: 11, fontWeight: 500, color: OD.lightBlue, cursor: "pointer" }}>
                          Read
                        </span>
                        <span onClick={() => dismissInsightMutation.mutate(insight.id)}
                          style={{ fontSize: 11, color: OD.text3, cursor: "pointer" }}>
                          Dismiss
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "24px 16px", color: OD.text3, fontSize: 12 }}>
                  No insights yet. Click "Scan" to analyze.
                </div>
              )}
            </RightCard>
          )}

          {/* Alerts & Reminders */}
          {isVisible("alerts") && (
            <RightCard title="Alerts & Reminders" icon={<SvgAlert />} titleColor={OD.orange} maxHeight={350}
              dataTag={clientStats?.openCasesList ? "live" : "mock"}
              extra={<span style={{
                fontFamily: "'Oswald', sans-serif", fontWeight: 700,
                fontSize: 16, color: OD.orange,
              }}>{unreadAlerts}</span>}
            >
              <AlertsPanel liveCases={clientStats?.openCasesList} liveOpportunities={clientStats?.staleOpportunitiesList} />
              <div style={{ borderTop: `1px solid rgba(45,55,72,0.25)`, marginTop: 10, paddingTop: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: OD.text3, marginBottom: 6 }}>
                  Profile Reminders
                </div>
                <ReminderWidget />
              </div>
              <div style={{ borderTop: `1px solid rgba(45,55,72,0.25)`, marginTop: 10, paddingTop: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: OD.text3, marginBottom: 6 }}>
                  Scheduling
                </div>
                <SchedulingWidget />
              </div>
            </RightCard>
          )}

          {/* Recently Closed */}
          {isVisible("recentlyClosed") && (
            <RightCard title="Recently Closed" icon={<SvgCheckmark />} titleColor={OD.medGreen}
              dataTag={clientStats?.recentlyClosedOpportunitiesList ? "live" : "mock"}
              extra={<span style={{
                fontSize: 11, fontWeight: 600, color: OD.medGreen,
                background: "rgba(142,185,53,0.1)", border: "1px solid rgba(142,185,53,0.2)",
                padding: "2px 7px", borderRadius: 4,
              }}>{clientStats?.recentlyClosedOpportunities || 0}</span>}
            >
              <RecentlyClosedOpportunities opportunities={clientStats?.recentlyClosedOpportunitiesList} />
            </RightCard>
          )}

          {/* Pipeline — Open Opportunities with amounts & stages */}
          {isVisible("pipeline") && clientStats?.openOpportunitiesList?.length > 0 && (
            <RightCard title="Pipeline" icon={<SvgTarget />} titleColor={OD.medBlue}
              dataTag="live"
              extra={<span style={{ fontSize: 11, fontWeight: 600, color: OD.lightBlue }}>
                ${((clientStats?.pipelineTotal || 0) / 1000).toFixed(0)}K
              </span>}
            >
              <div>
                {clientStats.pipelineWeighted > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: OD.text3, marginBottom: 10, padding: "6px 0", borderBottom: `1px solid rgba(45,55,72,0.25)` }}>
                    <span>Weighted Pipeline</span>
                    <span style={{ fontWeight: 600, color: OD.lightBlue }}>${((clientStats.pipelineWeighted) / 1000).toFixed(0)}K</span>
                  </div>
                )}
                {clientStats.openOpportunitiesList.slice(0, 8).map((opp: any) => (
                  <div key={opp.id} style={{
                    padding: "7px 0", borderBottom: `1px solid rgba(45,55,72,0.15)`,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <div style={{
                      width: 4, alignSelf: "stretch", borderRadius: 2, flexShrink: 0,
                      background: opp.probability >= 70 ? OD.medGreen : opp.probability >= 40 ? OD.yellow : OD.text3,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: OD.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {opp.name || opp.accountName}
                      </div>
                      <div style={{ fontSize: 10, color: OD.text3, marginTop: 1 }}>
                        {opp.stageName}{opp.closeDate && ` · ${new Date(opp.closeDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {opp.amount > 0 && <div style={{ fontSize: 12, fontWeight: 600, color: OD.lightBlue, fontFamily: "'DM Mono', monospace" }}>${(opp.amount / 1000).toFixed(0)}K</div>}
                      {opp.probability > 0 && <div style={{ fontSize: 9, color: OD.text3 }}>{opp.probability}% prob</div>}
                    </div>
                  </div>
                ))}
              </div>
            </RightCard>
          )}

          {/* Net Flows — MTD / QTD / YTD breakdown */}
          {isVisible("netFlows") && (clientStats?.netFlowsYTD || clientStats?.netFlowsMTD || clientStats?.netFlowsQTD) && (
            <RightCard title="Net Flows" icon={<SvgChart />} titleColor={OD.medGreen} dataTag="live">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "MTD", value: clientStats?.netFlowsMTD },
                  { label: "QTD", value: clientStats?.netFlowsQTD },
                  { label: "YTD", value: clientStats?.netFlowsYTD },
                ].map(({ label, value }) => {
                  const isPositive = (value || 0) >= 0;
                  const formatted = value != null ? `${isPositive ? "+" : ""}$${(Math.abs(value) / 1e6).toFixed(1)}M` : "—";
                  return (
                    <div key={label} style={{
                      textAlign: "center", padding: 10,
                      background: isPositive ? "rgba(142,185,53,0.06)" : "rgba(239,68,68,0.06)",
                      borderRadius: 6, borderTop: `2px solid ${isPositive ? OD.medGreen : "#ef4444"}`,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", color: OD.text3, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Oswald', sans-serif", color: isPositive ? OD.medGreen : "#ef4444" }}>
                        {formatted}
                      </div>
                    </div>
                  );
                })}
              </div>
              {clientStats?.netFlowsPercentage != null && (
                <div style={{ marginTop: 8, fontSize: 11, color: OD.text3, textAlign: "center" }}>
                  YTD as % of AUM: <span style={{ fontWeight: 600, color: clientStats.netFlowsPercentage >= 0 ? OD.medGreen : "#ef4444" }}>
                    {clientStats.netFlowsPercentage >= 0 ? "+" : ""}{clientStats.netFlowsPercentage.toFixed(2)}%
                  </span>
                </div>
              )}
            </RightCard>
          )}

        </div>
      </div>

      {/* ═══ LIVE PORTFOLIO MONITOR ═══ */}
      {isVisible("portfolio") && <LivePortfolioMonitor />}
      </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   Sortable Widget — drag-and-drop reordering
══════════════════════════════════════════ */
function SortableWidget({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: "relative" as const,
        zIndex: isDragging ? 10 : undefined,
      }}
      {...attributes}
    >
      <div
        {...listeners}
        className="widget-drag-handle"
        style={{
          position: "absolute" as const, top: 12, right: 12, zIndex: 5,
          cursor: "grab", padding: "4px 6px", borderRadius: 4,
          background: "rgba(255,255,255,0.04)",
          color: "var(--color-text-muted, #4a5568)",
          fontSize: 10, opacity: 0.3, transition: "opacity .2s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.3"; }}
        title="Drag to reorder"
      >
        ⠿
      </div>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════
   Section Card (left column widget)
══════════════════════════════════════════ */
function SectionCard({
  title, icon, dataTag, action, actionColor, children, maxHeight,
}: {
  title: string;
  icon: React.ReactNode;
  dataTag?: "live" | "mock" | "app";
  action?: string;
  actionColor?: string;
  children: React.ReactNode;
  maxHeight?: number;
}) {
  const storageKey = `od-collapse-${title.replace(/\s+/g, "-").toLowerCase()}`;
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem(storageKey) === "1"; } catch { return false; }
  });

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(storageKey, next ? "1" : "0"); } catch {}
  };

  return (
    <div style={{
      borderBottom: `1px solid ${OD.border}`,
      background: OD.bgMed,
    }}>
      <div
        className="widget-drag-handle"
        onClick={toggle}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px 10px",
          borderBottom: collapsed ? "none" : `1px solid ${OD.border}`,
          cursor: "grab", userSelect: "none",
          transition: "background .15s ease",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          fontSize: 12, fontWeight: 600, letterSpacing: ".06em",
          textTransform: "uppercase", color: OD.text2,
        }}>
          {/* Collapse chevron */}
          <span style={{
            display: "inline-flex", transition: "transform .2s ease",
            transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
            color: OD.text3, fontSize: 10,
          }}>
            ▼
          </span>
          <span style={{ color: OD.medBlue }}>{icon}</span>
          {title}
          {dataTag && (
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: ".15em",
              padding: "2px 7px", borderRadius: 3, textTransform: "uppercase",
              ...(dataTag === "live" ? {
                color: OD.medGreen,
                background: "rgba(142,185,53,0.08)",
                border: "1px solid rgba(142,185,53,0.2)",
              } : dataTag === "app" ? {
                color: OD.lightBlue,
                background: "rgba(79,179,205,0.08)",
                border: "1px solid rgba(79,179,205,0.2)",
              } : {
                color: OD.orange,
                background: "rgba(244,125,32,0.1)",
                border: "1px solid rgba(244,125,32,0.2)",
              }),
            }}>
              {dataTag === "live" ? "Live Data" : dataTag === "app" ? "App Data" : "Mock Data"}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {action && (
            <span
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: 11, fontWeight: 500,
                color: actionColor || OD.lightBlue,
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              {action} ›
            </span>
          )}
        </div>
      </div>
      {!collapsed && (
        <div style={{
          padding: "16px 20px",
          maxHeight: maxHeight || undefined,
          overflowY: maxHeight ? "auto" : undefined,
          scrollbarWidth: "thin" as any,
          scrollbarColor: "rgba(148,163,184,0.2) transparent",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   Right Card (right column)
══════════════════════════════════════════ */
function RightCard({
  title, icon, titleColor, dataTag, action, onAction, extra, children, maxHeight,
}: {
  title: string;
  icon: React.ReactNode;
  titleColor?: string;
  dataTag?: "live" | "mock" | "app";
  action?: string;
  onAction?: () => void;
  extra?: React.ReactNode;
  children: React.ReactNode;
  maxHeight?: number;
}) {
  const storageKey = `od-collapse-r-${title.replace(/\s+/g, "-").toLowerCase()}`;
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem(storageKey) === "1"; } catch { return false; }
  });

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(storageKey, next ? "1" : "0"); } catch {}
  };

  return (
    <div style={{
      borderBottom: `1px solid ${OD.border}`,
      background: OD.bgMed,
    }}>
      <div
        className="widget-drag-handle"
        onClick={toggle}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: collapsed ? "none" : `1px solid ${OD.border}`,
          cursor: "grab", userSelect: "none",
          transition: "background .15s ease",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          fontSize: 11, fontWeight: 600, letterSpacing: ".06em",
          textTransform: "uppercase", color: titleColor || OD.text2,
        }}>
          <span style={{
            display: "inline-flex", transition: "transform .2s ease",
            transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
            color: OD.text3, fontSize: 9,
          }}>
            ▼
          </span>
          {icon}
          {title}
          {dataTag && (
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: ".12em",
              padding: "1px 6px", borderRadius: 3, textTransform: "uppercase",
              ...(dataTag === "live" ? {
                color: OD.medGreen,
                background: "rgba(142,185,53,0.08)",
                border: "1px solid rgba(142,185,53,0.2)",
              } : dataTag === "app" ? {
                color: OD.lightBlue,
                background: "rgba(79,179,205,0.08)",
                border: "1px solid rgba(79,179,205,0.2)",
              } : {
                color: OD.orange,
                background: "rgba(244,125,32,0.1)",
                border: "1px solid rgba(244,125,32,0.2)",
              }),
            }}>
              {dataTag === "live" ? "Live Data" : dataTag === "app" ? "App Data" : "Mock Data"}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {action && (
            <span onClick={(e) => { e.stopPropagation(); onAction?.(); }} style={{
              fontSize: 10.5, fontWeight: 500, color: OD.lightBlue, cursor: "pointer",
            }}>
              {action}
            </span>
          )}
          {extra}
        </div>
      </div>
      {!collapsed && (
        <div style={{
          padding: "12px 16px",
          maxHeight: maxHeight || undefined,
          overflowY: maxHeight ? "auto" : undefined,
          scrollbarWidth: "thin" as any,
          scrollbarColor: "rgba(148,163,184,0.2) transparent",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

