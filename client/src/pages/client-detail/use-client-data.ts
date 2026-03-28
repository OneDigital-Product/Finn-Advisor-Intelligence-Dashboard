import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useRecentClients } from "@/hooks/use-recent-clients";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect, useMemo, useCallback } from "react";
import { isMarketOpen } from "@/lib/market-hours";
import { BASE_NAV_GROUPS, MOBILE_TASKS_GROUP } from "./shared";

export function useClientData(propParams?: { id?: string }) {
  const routerParams = useParams<{ id: string }>();
  const params = propParams?.id ? propParams as { id: string } : routerParams;
  const { toast } = useToast();
  const { user } = useAuth();
  const clientId = params.id!;

  // Tier 1: Fast summary (< 1s) — populates header immediately
  // On cold-cache miss the server warms SF data (~3-26s). If this fails
  // transiently, the query MUST throw (not return null) so React Query
  // marks it as an error. refetchOnMount ensures a reload retries.
  const { data: summaryData, isLoading: summaryLoading } = useQuery<any>({
    queryKey: ["/api/clients", clientId, "summary"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/summary`, { credentials: "include" });
      if (!res.ok) throw new Error(`Summary fetch failed: ${res.status}`);
      return res.json();
    },
    enabled: !!clientId,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: "always",   // always re-check on mount — catches stale persisted failures
    retry: 2,                   // retry twice (cold-cache warming may take multiple seconds)
    retryDelay: 3000,           // 3s between retries — gives server time to warm cache
  });

  // Tier 2: Portfolio data (accounts, holdings, allocation)
  const { data: portfolioData, isLoading: portfolioLoading } = useQuery<any>({
    queryKey: ["/api/clients", clientId, "portfolio"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/portfolio`, { credentials: "include" });
      if (!res.ok) throw new Error(`Portfolio fetch failed: ${res.status}`);
      return res.json();
    },
    enabled: !!clientId,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: "always",
    retry: 2,
    retryDelay: 3000,
  });

  // Tier 2: Household members (changes rarely — monthly/quarterly)
  const { data: membersData, isLoading: membersLoading } = useQuery<any>({
    queryKey: ["/api/clients", clientId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/members`, { credentials: "include" });
      if (!res.ok) throw new Error(`Members fetch failed: ${res.status}`);
      return res.json();
    },
    enabled: !!clientId,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: "always",
    retry: 2,
    retryDelay: 3000,
  });

  // Tier 2: Lightweight stats — task/opportunity counts for stat bar (SF-only, fast)
  const { data: statsData } = useQuery<any>({
    queryKey: ["/api/clients", clientId, "stats-lite"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/activity-stats`, { credentials: "include" });
      if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`);
      return res.json();
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: "always",
    retry: 2,
    retryDelay: 3000,
  });

  // Monolithic endpoint — DEFERRED until a below-fold section actually needs it.
  // Above-fold is fully served by summary + portfolio + members + stats-lite.
  // This eliminates 8 redundant Orion/Salesforce calls on initial page load.
  const [needsDetail, setNeedsDetail] = useState(false);
  const requestDetail = useCallback(() => setNeedsDetail(true), []);
  const tier1Ready = !summaryLoading;
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId && tier1Ready && needsDetail,
    staleTime: 10 * 60 * 1000,
  });

  const { data: clientWorkflows, isLoading: workflowsLoading } = useQuery<any[]>({
    queryKey: ["/api/clients", clientId, "workflows"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/workflows`);
      if (!res.ok) throw new Error("Failed to fetch workflows");
      return res.json();
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: workflowTemplates } = useQuery<any[]>({
    queryKey: ["/api/workflows/templates"],
    staleTime: 30 * 60 * 1000, // templates rarely change
  });

  const { data: marketData, isLoading: marketLoading, refetch: refetchMarket } = useQuery<any>({
    queryKey: ["/api/clients", clientId, "market-data"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/market-data`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch market data");
      return res.json();
    },
    enabled: !!clientId,
    staleTime: 30_000, // 30s — market prices are ephemeral, shorter staleTime is OK
    refetchInterval: () => isMarketOpen() ? 60_000 : 5 * 60 * 1000, // 60s during market hours, 5 min after hours
    refetchIntervalInBackground: false, // CRITICAL — stop polling when tab is hidden
  });

  const { data: teamMembers, isLoading: teamLoading } = useQuery<any[]>({
    queryKey: ["/api/clients", clientId, "team"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/team`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch team");
      return res.json();
    },
    enabled: !!clientId,
    staleTime: 10 * 60 * 1000, // team rarely changes
  });

  const { data: allAssociates } = useQuery<any[]>({
    queryKey: ["/api/associates"],
    enabled: user?.type === "advisor",
  });

  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const applyWorkflowMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/workflows`, { templateId: selectedTemplateId });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "workflows"] });
      setApplyDialogOpen(false);
      setSelectedTemplateId("");
      const names = data.notifiedNames || [];
      toast({
        title: "Workflow applied to client",
        description: names.length > 0
          ? `Email notifications sent to ${names.join(", ")}`
          : undefined,
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleStepMutation = useMutation({
    mutationFn: async ({ workflowId, stepIndex, completed, response }: { workflowId: string; stepIndex: number; completed: boolean; response?: string | null }) => {
      const body: any = { completed };
      if (response !== undefined) body.response = response;
      const res = await apiRequest("PATCH", `/api/clients/${clientId}/workflows/${workflowId}/steps/${stepIndex}`, body);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "workflows"] });
      const names = data.notifiedNames || [];
      if (names.length > 0) {
        toast({
          title: "Step updated",
          description: `Email notifications sent to ${names.join(", ")}`,
        });
      }
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedAssociateId, setSelectedAssociateId] = useState("");
  const [teamRole, setTeamRole] = useState("support");

  const addTeamMemberMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/clients/${clientId}/team`, { associateId: selectedAssociateId, role: teamRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "team"] });
      setAddMemberOpen(false);
      setSelectedAssociateId("");
      setTeamRole("support");
      toast({ title: "Team member added" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to add team member", description: err.message, variant: "destructive", duration: Infinity });
    },
  });

  const removeTeamMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      apiRequest("DELETE", `/api/clients/${clientId}/team/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "team"] });
      toast({ title: "Team member removed" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to remove team member", description: err.message, variant: "destructive", duration: Infinity });
    },
  });

  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window !== "undefined") {
      const urlTab = new URLSearchParams(window.location.search).get("tab");
      if (urlTab) {
        localStorage.setItem("onedigital-active-tab", urlTab);
        return urlTab;
      }
      return localStorage.getItem("onedigital-active-tab") || "overview";
    }
    return "overview";
  });

  // Sections that require the monolithic endpoint's data
  const DETAIL_SECTIONS = new Set([
    "meetings", "compliance", "estate", "philanthropy", "philanthropy-giving",
    "business-succession", "documents", "behavioral", "intelligence",
    "direct-indexing", "withdrawals", "pre-case-check",
  ]);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    localStorage.setItem("onedigital-active-tab", section);
    // Trigger monolithic load when user navigates to a section that needs it
    if (DETAIL_SECTIONS.has(section)) {
      setNeedsDetail(true);
    }
  };

  // If the user's saved tab needs detail, request it on mount
  useEffect(() => {
    if (DETAIL_SECTIONS.has(activeSection)) {
      setNeedsDetail(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { addRecent } = useRecentClients();

  // Track recent clients from whichever source resolves first
  useEffect(() => {
    const c = data?.client || summaryData?.client;
    if (c) {
      addRecent({ id: c.id, name: `${c.firstName} ${c.lastName}`, segment: c.segment });
    }
  }, [data?.client?.id, summaryData?.client?.id]);

  // ── Background pre-warm: prefetch common tab data after tier-1 resolves ──
  // These fire at low priority so they don't compete with the visible data.
  // When the user clicks a tab, the data is already cached → instant render.
  useEffect(() => {
    if (!clientId || summaryLoading) return;
    const opts = { staleTime: 10 * 60 * 1000 };
    const fetchJson = (url: string) => fetch(url, { credentials: "include" }).then(r => r.ok ? r.json() : null);
    // Delay 500ms to let tier-1/2 finish first
    const timer = setTimeout(() => {
      queryClient.prefetchQuery({ queryKey: ["/api/clients", clientId, "goals"], queryFn: () => fetchJson(`/api/clients/${clientId}/goals`), ...opts });
      queryClient.prefetchQuery({ queryKey: ["/api/clients", clientId, "activity"], queryFn: () => fetchJson(`/api/clients/${clientId}/activity`), ...opts });
      queryClient.prefetchQuery({ queryKey: ["/api/clients", clientId, "compliance-reviews"], queryFn: () => fetchJson(`/api/clients/${clientId}/compliance-reviews`), ...opts });
      queryClient.prefetchQuery({ queryKey: ["/api/clients", clientId, "billing"], queryFn: () => fetchJson(`/api/clients/${clientId}/billing`), ...opts });
      queryClient.prefetchQuery({ queryKey: ["/api/clients", clientId, "transactions"], queryFn: () => fetchJson(`/api/clients/${clientId}/transactions`), ...opts });
      queryClient.prefetchQuery({ queryKey: ["/api/clients", clientId, "insights"], queryFn: () => fetchJson(`/api/clients/${clientId}/insights`), ...opts });
    }, 500);
    return () => clearTimeout(timer);
  }, [clientId, summaryLoading]);

  const [suggestedTasks, setSuggestedTasks] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const navGroups = isMobile ? [...BASE_NAV_GROUPS, MOBILE_TASKS_GROUP] : BASE_NAV_GROUPS;

  // Progressive data: summary resolves first, then portfolio/members, then monolithic
  const summaryClient = summaryData?.client;
  const client = data?.client || summaryClient;

  // Tier 2 portfolio data (prefer portfolio endpoint, fall back to monolithic)
  const portfolioAccounts = portfolioData?.accounts || [];
  const portfolioHoldings = portfolioData?.holdings || [];
  const portfolioAllocation = portfolioData?.allocationBar || [];
  const portfolioCustodians = portfolioData?.custodianBreakdown || [];
  const portfolioTopHoldings = portfolioData?.topHoldingsByValue || [];
  const portfolioPerformance = portfolioData?.performance || null;
  const portfolioContributions = portfolioData?.contributions || null;

  const accounts = portfolioAccounts.length > 0 ? portfolioAccounts : (data?.accounts || []);
  const holdings = portfolioHoldings.length > 0 ? portfolioHoldings : (data?.holdings || []);
  const alternativeAssets = data?.alternativeAssets || [];
  const perf = data?.performance || [];
  const transactions = data?.transactions || [];
  const activities = data?.activities || [];
  const tasks = data?.tasks || [];
  const meetings = data?.meetings || [];
  const documents = data?.documents || [];
  const complianceItems = data?.complianceItems || [];
  const lifeEvents = data?.lifeEvents || [];

  // Household members: prefer members endpoint, fall back to monolithic
  const membersResult = membersData?.members || [];
  const householdMembers = membersResult.length > 0 ? membersResult : (data?.householdMembers || []);

  // AUM: prefer summary (fast), fall back to monolithic
  const totalAum = summaryData?.aum || data?.totalAum || 0;
  const totalNetWorth: number | null = summaryData?.totalNetWorth ?? null;
  const healthScore: number = data?.healthScore ?? 0;
  const sparklineData: { date: string; aum: number }[] = data?.sparklineData || [];
  const checklistData = data?.documentChecklist || [];
  // Stat bar counts: prefer lightweight stats (Tier 2), fall back to monolithic
  const openTaskCount: number = statsData?.openTaskCount ?? data?.tasks?.length ?? 0;
  const staleOppCount: number = statsData?.staleOppCount ?? data?.staleOpportunities?.length ?? 0;
  const upcomingEventCount: number = statsData?.upcomingEventCount ?? data?.upcomingEvents?.length ?? 0;
  const openCaseCount: number = statsData?.openCaseCount ?? 0;
  const upcomingEvents = data?.upcomingEvents || [];
  const staleOpportunities = data?.staleOpportunities || [];
  const sfFinancialGoals = data?.sfFinancialGoals || data?.financialGoals || [];
  const sfTopHoldings = data?.sfTopHoldings || [];
  const revenues = data?.revenues || [];
  const assetsAndLiabilities = data?.assetsAndLiabilities || [];

  // Server-side computed aggregations (from Orion raw data)
  const allocationBreakdown: { name: string; value: number; pct: number }[] = data?.allocationBreakdown || [];
  const riskDistribution: { name: string; count: number; value: number; pct: number }[] = data?.riskDistribution || [];
  const custodianBreakdown: { name: string; count: number; value: number }[] = data?.custodianBreakdown || [];
  const accountTypeDistribution: { name: string; count: number; value: number }[] = data?.accountTypeDistribution || [];
  const topHoldingsByValue: { ticker: string; name: string; marketValue: number; weight: number; sector: string }[] = data?.topHoldingsByValue || [];
  const sectorExposure: { name: string; count: number; value: number; pct: number }[] = data?.sectorExposure || [];
  const managedVsHeldAway: { managed: { count: number; value: number }; heldAway: { count: number; value: number } } =
    data?.managedVsHeldAway || { managed: { count: 0, value: 0 }, heldAway: { count: 0, value: 0 } };

  const clientMeetings = useMemo(
    () => (meetings || []).sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
    [meetings]
  );

  // Prefer server-side allocation breakdown (has richer data from raw Orion fields).
  // Fall back to frontend-computed sector grouping when server data is unavailable.
  const pieData = useMemo(() => {
    if (allocationBreakdown.length > 0) {
      return allocationBreakdown.map((a) => ({ name: a.name, value: a.value }));
    }
    const sectorAllocation = holdings.reduce((acc: any, h: any) => {
      const sector = h.sector || "Other";
      if (!acc[sector]) acc[sector] = 0;
      acc[sector] += parseFloat(h.marketValue);
      return acc;
    }, {});
    return Object.entries(sectorAllocation)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value);
  }, [allocationBreakdown, holdings]);

  const perfData = useMemo(
    () => perf.map((p: any) => ({
      period: p.period,
      portfolio: parseFloat(p.returnPct),
      benchmark: parseFloat(p.benchmarkPct || "0"),
    })),
    [perf]
  );

  // Collect errors from all API responses
  const apiErrors: string[] = [
    ...(summaryData?._errors || []),
    ...(portfolioData?._errors || []),
    ...(membersData?._errors || []),
    ...(data?._errors || []),
  ];

  const dataSources = {
    orion: portfolioData?._dataSources?.orion || data?._dataSources?.orion || 'unknown',
    salesforce: membersData?._dataSources?.salesforce || data?._dataSources?.salesforce || 'unknown',
  };

  return {
    clientId,
    user,
    toast,
    apiErrors,
    dataSources,
    // Progressive loading: header shows as soon as summary resolves
    isLoading: summaryLoading && isLoading, // only block if BOTH are loading
    summaryLoading,
    portfolioLoading,
    membersLoading,
    detailLoading: isLoading,
    client,
    accounts,
    holdings,
    alternativeAssets,
    perf,
    transactions,
    activities,
    tasks,
    meetings,
    documents,
    complianceItems,
    lifeEvents,
    householdMembers,
    totalAum,
    totalNetWorth,
    tier: summaryData?.tier,
    accountCount: summaryData?.accountCount || portfolioData?.accountCount || accounts.length,
    isLiveData: summaryData?.isLiveData ?? data?.isLiveData ?? false,
    healthScore,
    sparklineData,
    checklistData,
    upcomingEvents,
    staleOpportunities,
    sfFinancialGoals,
    sfTopHoldings,
    revenues,
    assetsAndLiabilities,
    clientMeetings,
    pieData,
    perfData,
    allocationBreakdown,
    allocationBar: portfolioAllocation,
    riskDistribution,
    custodianBreakdown: portfolioCustodians.length > 0 ? portfolioCustodians : custodianBreakdown,
    accountTypeDistribution,
    topHoldingsByValue: portfolioTopHoldings.length > 0 ? portfolioTopHoldings : topHoldingsByValue,
    sectorExposure,
    portfolioPerformance,
    portfolioContributions,
    managedVsHeldAway,
    clientWorkflows,
    workflowsLoading,
    workflowTemplates,
    marketData,
    marketLoading,
    refetchMarket,
    teamMembers,
    teamLoading,
    allAssociates,
    applyDialogOpen,
    setApplyDialogOpen,
    selectedTemplateId,
    setSelectedTemplateId,
    applyWorkflowMutation,
    toggleStepMutation,
    addMemberOpen,
    setAddMemberOpen,
    selectedAssociateId,
    setSelectedAssociateId,
    teamRole,
    setTeamRole,
    addTeamMemberMutation,
    removeTeamMemberMutation,
    activeSection,
    handleSectionChange,
    suggestedTasks,
    setSuggestedTasks,
    selectedAccountId,
    setSelectedAccountId,
    isMobile,
    navGroups,
    // P1 optimization: deferred monolithic loading
    requestDetail,
    needsDetail,
    openTaskCount,
    staleOppCount,
    upcomingEventCount,
    openCaseCount,
  };
}
