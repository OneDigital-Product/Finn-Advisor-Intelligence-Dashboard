import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useDiagnosticContext } from "@/contexts/diagnostic-context";
import { StickyClientHeader } from "./client-detail/sticky-client-header";
import { useToast } from "@/hooks/use-toast";
import NextLink from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  UserPlus,
  Brain,
  AlertTriangle,
  RefreshCw,
  Info,
} from "lucide-react";
import { P, sc, SPRING, EASE } from "@/styles/tokens";
import { Serif, Mono } from "@/components/design/typography";
import { Spark, Pill } from "@/components/design";
import { Score } from "@/components/design/score";
import { FinQuickAction } from "@/components/cassidy/fin-quick-action";

import { ClientDetailNav, ClientDetailSidebar, SourcePill, formatCurrency } from "./client-detail/shared";
const ffc = (v: number) => formatCurrency(v, { abbreviated: false });
import { useClientData } from "./client-detail/use-client-data";
import { DataSourceDiagnostic, type FieldDiag } from "@/components/data-source-diagnostic";
import { resolveClientDiagnosticFields, type FieldResolverInput } from "@/lib/diagnostic-field-resolver";
import { ClientTabs } from "./client-detail/client-tabs";
import { ContextBanner } from "./client-detail/context-banner";
import { useProactiveSignals } from "@/hooks/use-proactive-signals";
import { ProactiveSignalsBanner } from "@/components/cassidy/proactive-signals-banner";
import { useQueryClient } from "@tanstack/react-query";

export default function ClientDetail({ params: propParams }: { params?: { id?: string } } = {}) {
  const cd = useClientData(propParams);
  const proactiveSignals = useProactiveSignals(cd.clientId);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      // Invalidate ALL cached queries for this client — forces fresh fetch from server
      // This does NOT delete cache: old data stays visible while new data loads (stale-while-revalidate)
      await qc.invalidateQueries({ queryKey: ["/api/clients", cd.clientId] });
      // Also refresh dashboard-level caches that may include this client's data
      qc.invalidateQueries({ queryKey: ["/api/clients/stats"] });
      toast({ title: "Data synced", duration: 3000 });
    } catch {
      toast({ title: "Sync failed", description: "Unable to refresh client data.", variant: "destructive", duration: Infinity });
    }
    setTimeout(() => setRefreshing(false), 1200);
  }, [qc, cd.clientId, toast]);

  const signalCounts = Object.fromEntries(
    Object.entries(proactiveSignals.signalsBySection).map(([section, signals]) => [section, signals.length])
  );

  /* ── Data Source Diagnostic Field Map ── */
  const diagFields = useMemo<FieldDiag[]>(() => {
    const client = cd.client;
    if (!client) return [];
    // has() treats null, undefined, and "" as empty but allows 0 (valid for counts/scores)
    const has = (v: any) => v !== null && v !== undefined && v !== "";
    const s = (v: any): "salesforce" | "empty" => has(v) ? "salesforce" : "empty";
    const o = (v: any): "orion" | "empty" => has(v) ? "orion" : "empty";

    // Tier is computed from AUM at response root level, not on the client object
    const tierVal = cd.tier;
    // AUM lives on the hook's top-level, not client object
    const aumVal = cd.totalAum;
    // Service model only comes from the monolithic endpoint (tier 3)
    const serviceModelVal = client.serviceModel;
    // Annual income: patched onto client in monolithic, or available as estimatedAnnualIncome
    const incomeVal = client.annualIncome || client.estimatedAnnualIncome;
    // Health score is at the hook's top level (data?.healthScore), not on client
    const healthVal = cd.healthScore;

    return [
      // ── Identity — Salesforce ──
      { field: "First Name", source: s(client.firstName), value: client.firstName, sfField: "Account.FirstName",
        reason: !has(client.firstName) ? "crm-not-populated" as const : undefined,
        uiLocation: "Client header & breadcrumb", apiEndpoint: "/api/clients/[id]/summary", apiSource: "salesforce" as const,
        suggestedAction: !has(client.firstName) ? "Update FirstName on the Account record in Salesforce" : undefined },
      { field: "Last Name", source: s(client.lastName), value: client.lastName, sfField: "Account.LastName",
        reason: !has(client.lastName) ? "crm-not-populated" as const : undefined,
        uiLocation: "Client header & breadcrumb", apiEndpoint: "/api/clients/[id]/summary", apiSource: "salesforce" as const,
        suggestedAction: !has(client.lastName) ? "Update LastName on the Account record in Salesforce" : undefined },
      { field: "Email", source: s(client.email), value: client.email, sfField: "PersonEmail",
        reason: !has(client.email) ? "crm-not-populated" as const : undefined,
        uiLocation: "Client header contact bar", apiEndpoint: "/api/clients/[id]/summary", apiSource: "salesforce" as const,
        suggestedAction: !has(client.email) ? "Add PersonEmail to the Account record in Salesforce" : undefined },
      { field: "Phone", source: s(client.phone), value: client.phone, sfField: "Phone",
        reason: !has(client.phone) ? "crm-not-populated" as const : undefined,
        uiLocation: "Client header contact bar", apiEndpoint: "/api/clients/[id]/summary", apiSource: "salesforce" as const,
        suggestedAction: !has(client.phone) ? "Add Phone number to the Account record in Salesforce" : undefined },
      { field: "Date of Birth", source: s(client.dateOfBirth), value: client.dateOfBirth, sfField: "PersonBirthdate",
        reason: !has(client.dateOfBirth) ? "crm-not-populated" as const : undefined,
        uiLocation: "Client overview card & RMD calculator", apiEndpoint: "/api/clients/[id]", apiSource: "salesforce" as const,
        suggestedAction: !has(client.dateOfBirth) ? "Set PersonBirthdate on the Account — required for RMD and age-based planning" : undefined },
      { field: "Address", source: s(client.address || client.city), value: [client.address, client.city, client.state].filter(Boolean).join(", ") || null, sfField: "BillingAddress",
        reason: !has(client.address || client.city) ? "crm-not-populated" as const : undefined,
        uiLocation: "Client overview card", apiEndpoint: "/api/clients/[id]/summary", apiSource: "salesforce" as const,
        suggestedAction: !has(client.address || client.city) ? "Add BillingAddress (Street, City, State, Zip) to the Account in Salesforce" : undefined },
      { field: "Status", source: s(client.status), value: client.status, sfField: "FinServ__Status__c",
        reason: !has(client.status) ? "crm-not-populated" as const : undefined,
        uiLocation: "Client header badge", apiEndpoint: "/api/clients/[id]/summary", apiSource: "salesforce" as const,
        suggestedAction: !has(client.status) ? "Set FinServ__Status__c (Active/Prospect/Inactive) in Salesforce" : undefined },
      { field: "Tier", source: has(tierVal) ? "computed" : "empty", value: tierVal || null, sfField: "Computed from AUM",
        reason: !has(tierVal) ? "dependency-missing" as const : undefined,
        uiLocation: "Client header badge & clients list", apiEndpoint: "/api/clients/[id]/summary", apiSource: "computed" as const,
        suggestedAction: !has(tierVal) ? "Tier is auto-computed from AUM — ensure Orion portfolio is linked" : undefined },
      { field: "Created Date", source: s(client.createdDate), value: client.createdDate, sfField: "CreatedDate",
        uiLocation: "Client overview card", apiEndpoint: "/api/clients/[id]/summary", apiSource: "salesforce" as const },

      // ── CRM Workflow — Salesforce ──
      { field: "Occupation", source: s(client.occupation), value: client.occupation, sfField: "FinServ__Occupation__c",
        reason: !has(client.occupation) ? "crm-not-populated" as const : undefined,
        uiLocation: "Client overview card", apiEndpoint: "/api/clients/[id]/summary", apiSource: "salesforce" as const,
        suggestedAction: !has(client.occupation) ? "Add Occupation in Salesforce Financial Account — used for suitability" : undefined },
      { field: "Risk Tolerance", source: s(client.riskTolerance), value: client.riskTolerance, sfField: "FinServ__InvestmentObjectives__c",
        reason: !has(client.riskTolerance) ? "crm-not-populated" as const : undefined,
        uiLocation: "Portfolio section & risk analysis", apiEndpoint: "/api/clients/[id]/summary", apiSource: "salesforce" as const,
        suggestedAction: !has(client.riskTolerance) ? "Set InvestmentObjectives__c in Salesforce — critical for compliance suitability checks" : undefined },
      { field: "Review Frequency", source: s(client.reviewFrequency), value: client.reviewFrequency, sfField: "FinServ__ReviewFrequency__c",
        reason: !has(client.reviewFrequency) ? "crm-not-populated" as const : undefined,
        uiLocation: "Client overview card & proactive signals", apiEndpoint: "/api/clients/[id]/summary", apiSource: "salesforce" as const,
        suggestedAction: !has(client.reviewFrequency) ? "Set ReviewFrequency__c (Quarterly/Semi-Annual/Annual) in Salesforce" : undefined },
      { field: "Last Review", source: s(client.lastReview), value: client.lastReview, sfField: "FinServ__LastReview__c",
        reason: !has(client.lastReview) ? "crm-not-populated" as const : undefined,
        uiLocation: "Client overview card & overdue review signals", apiEndpoint: "/api/clients/[id]/summary", apiSource: "salesforce" as const,
        suggestedAction: !has(client.lastReview) ? "Update LastReview__c after each client review meeting" : undefined },
      { field: "Next Review", source: s(client.nextReview), value: client.nextReview, sfField: "FinServ__NextReview__c",
        reason: !has(client.nextReview) ? "crm-not-populated" as const : undefined,
        uiLocation: "Client overview card & calendar", apiEndpoint: "/api/clients/[id]/summary", apiSource: "salesforce" as const,
        suggestedAction: !has(client.nextReview) ? "Schedule NextReview__c — drives proactive outreach signals" : undefined },
      { field: "Service Model", source: s(serviceModelVal), value: serviceModelVal, sfField: "FinServ__ServiceModel__c",
        reason: !has(serviceModelVal) ? (cd.detailLoading ? "api-not-returning" as const : "crm-not-populated" as const) : undefined,
        uiLocation: "Client overview card", apiEndpoint: "/api/clients/[id]", apiSource: "salesforce" as const,
        suggestedAction: !has(serviceModelVal) ? (cd.detailLoading ? "Waiting for full client data to load…" : "Set ServiceModel__c (Wealth/Premier/Standard) in Salesforce") : undefined },

      // ── Portfolio — Orion ──
      { field: "Total AUM", source: o(aumVal), value: aumVal || null, orionField: "Portfolio.totalValue",
        reason: !has(aumVal) ? "api-not-returning" as const : undefined,
        uiLocation: "Client header AUM badge & portfolio section", apiEndpoint: "/api/clients/[id]/portfolio", apiSource: "orion" as const,
        suggestedAction: !has(aumVal) ? "Verify Orion portfolio is linked — check MuleSoft EAPI /portfolio endpoint" : undefined },
      { field: "Accounts", source: o(cd.accounts?.length), value: cd.accounts?.length ?? 0, orionField: "Portfolio.accounts",
        reason: !cd.accounts?.length ? "api-not-returning" as const : undefined,
        uiLocation: "Portfolio section accounts tab", apiEndpoint: "/api/clients/[id]/portfolio", apiSource: "orion" as const,
        suggestedAction: !cd.accounts?.length ? "Verify client has accounts in Orion — check Orion Connect for account linkage" : undefined },
      { field: "Holdings", source: o(cd.holdings?.length), value: cd.holdings?.length ?? 0, orionField: "Portfolio.assets",
        reason: !cd.holdings?.length ? "api-not-returning" as const : undefined,
        uiLocation: "Portfolio section holdings treemap & list", apiEndpoint: "/api/clients/[id]/portfolio", apiSource: "orion" as const,
        suggestedAction: !cd.holdings?.length ? "Verify holdings data in Orion — may need custodial feed reconciliation" : undefined },
      { field: "Est. Annual Income", source: o(incomeVal), value: incomeVal || null, orionField: "Reporting/Scope.EstimatedAnnualIncome",
        reason: !has(incomeVal) ? (cd.detailLoading ? "api-not-returning" as const : "endpoint-missing" as const) : undefined,
        uiLocation: "Client overview card & withdrawal analysis", apiEndpoint: "/api/clients/[id]", apiSource: "orion" as const,
        suggestedAction: !has(incomeVal) ? (cd.detailLoading ? "Waiting for Orion Reporting Scope data…" : "Check Orion Reporting Scope for EstimatedAnnualIncome field") : undefined },

      // ── Computed ──
      { field: "Health Score", source: healthVal > 0 ? "computed" : "empty", value: healthVal || null,
        reason: !healthVal ? (cd.detailLoading ? "api-not-returning" as const : "dependency-missing" as const) : undefined,
        uiLocation: "Client header health badge & clients list", apiEndpoint: "/api/clients/[id]", apiSource: "computed" as const,
        suggestedAction: !healthVal ? (cd.detailLoading ? "Waiting for monolithic endpoint…" : "Health Score requires AUM, review dates, and activity — populate upstream fields first") : undefined },

      // ── Activity — Salesforce ──
      { field: "Open Tasks", source: cd.tasks?.length ? "salesforce" : "empty", value: cd.tasks?.length ?? 0, sfField: "Task WHERE Status!='Completed'",
        reason: !cd.tasks?.length ? "crm-not-populated" as const : undefined,
        uiLocation: "Activity tab & My Day dashboard", apiEndpoint: "/api/clients/[id]/tasks", apiSource: "salesforce" as const,
        suggestedAction: !cd.tasks?.length ? "No open tasks — create Tasks in Salesforce to track follow-ups" : undefined },
      { field: "Upcoming Events", source: cd.upcomingEvents?.length ? "salesforce" : "empty", value: cd.upcomingEvents?.length ?? 0, sfField: "Event WHERE StartDateTime>TODAY",
        reason: !cd.upcomingEvents?.length ? "crm-not-populated" as const : undefined,
        uiLocation: "Activity tab & calendar sidebar", apiEndpoint: "/api/clients/[id]/activity", apiSource: "salesforce" as const,
        suggestedAction: !cd.upcomingEvents?.length ? "No upcoming events — schedule a meeting in Salesforce or Outlook" : undefined },
      { field: "Stale Opportunities", source: cd.staleOpportunities?.length ? "salesforce" : "empty", value: cd.staleOpportunities?.length ?? 0, sfField: "Opportunity WHERE LastActivityDate<-90d",
        uiLocation: "Proactive signals & pipeline view", apiEndpoint: "/api/clients/[id]/activity", apiSource: "salesforce" as const },
      { field: "Household Members", source: cd.householdMembers?.length ? "salesforce" : "empty", value: cd.householdMembers?.length ?? 0, sfField: "AccountContactRelation",
        reason: !cd.householdMembers?.length ? "crm-not-populated" as const : undefined,
        uiLocation: "Household tab & relationship map", apiEndpoint: "/api/clients/[id]/members", apiSource: "salesforce" as const,
        suggestedAction: !cd.householdMembers?.length ? "Add household members via AccountContactRelation in Salesforce" : undefined },
    ];
  }, [cd.client, cd.tier, cd.totalAum, cd.healthScore, cd.detailLoading, cd.accounts, cd.holdings, cd.tasks, cd.upcomingEvents, cd.staleOpportunities, cd.householdMembers]);

  /* ── Canonical Field Provenance (powers enhanced diagnostic) ── */
  const canonicalFields = useMemo(() => {
    if (!cd.client) return [];
    const input: FieldResolverInput = {
      client: cd.client,
      tier: cd.tier,
      totalAum: cd.totalAum,
      healthScore: cd.healthScore,
      accounts: cd.accounts,
      holdings: cd.holdings,
      tasks: cd.tasks,
      upcomingEvents: cd.upcomingEvents,
      staleOpportunities: cd.staleOpportunities,
      householdMembers: cd.householdMembers,
      dataSources: cd.dataSources,
      detailLoading: cd.detailLoading,
      summaryLoading: cd.summaryLoading,
      portfolioLoading: cd.portfolioLoading,
      membersLoading: cd.membersLoading,
    };
    return resolveClientDiagnosticFields(input);
  }, [cd.client, cd.tier, cd.totalAum, cd.healthScore, cd.accounts, cd.holdings,
      cd.tasks, cd.upcomingEvents, cd.staleOpportunities, cd.householdMembers,
      cd.dataSources, cd.detailLoading, cd.summaryLoading, cd.portfolioLoading, cd.membersLoading]);

  // Push diagnostic data to global context so the global panel renders it
  const { setPageDiagnostics, clearPageDiagnostics } = useDiagnosticContext();
  const lastDiagRef = useRef("");
  useEffect(() => {
    const key = JSON.stringify({ f: diagFields?.length, c: canonicalFields?.length, d: cd.dataSources });
    if (key === lastDiagRef.current) return;
    lastDiagRef.current = key;
    const timer = setTimeout(() => {
      setPageDiagnostics({
        pageLabel: "Client Detail",
        fields: diagFields as any,
        canonicalFields,
        dataSources: cd.dataSources,
      });
    }, 0);
    return () => clearTimeout(timer);
  });
  useEffect(() => () => clearPageDiagnostics(), [clearPageDiagnostics]);

  const OD = {
    bgDark: P.odBg, bgMed: P.odSurf, bgHover: P.odSurf3,
    deepBlue: P.odDeep, medBlue: P.odBlue, medGreen: P.odGreen,
    green400: "#4ade80", border: P.odBorder, white: P.odT1,
    gray300: "#D1D5DB", gray400: P.odT3, gray500: "#64748B", gray600: "#475569",
    amber: P.odYellow, red400: "#F87171", blue400: "#60A5FA",
  };

  const tierColors: Record<string, { bg: string; text: string }> = {
    A: { bg: "#065F46", text: "#6EE7B7" }, B: { bg: "#1E3A5F", text: "#93C5FD" },
    C: { bg: "#44403C", text: "#D6D3D1" },
  };

  if (cd.isLoading) {
    return (
      <div className="w-full max-w-[95vw] mx-auto 2xl:max-w-[98vw]" style={{ paddingBottom: 48 }}>
        <Skeleton className="h-5 w-32 mb-4" style={{ background: OD.bgMed }} />
        <div style={{ background: OD.bgMed, borderRadius: 10, padding: "28px 32px", marginBottom: 24, border: `1px solid ${OD.border}` }}>
          <div style={{ display: "flex", gap: 20 }}>
            <Skeleton style={{ width: 64, height: 64, borderRadius: 10, background: OD.bgHover }} />
            <div style={{ flex: 1 }}>
              <Skeleton className="h-7 w-64 mb-2" style={{ background: OD.bgHover }} />
              <Skeleton className="h-4 w-48 mb-3" style={{ background: OD.bgHover }} />
              <div style={{ display: "flex", gap: 8 }}>
                <Skeleton className="h-8 w-20" style={{ borderRadius: 6, background: OD.bgHover }} />
                <Skeleton className="h-8 w-20" style={{ borderRadius: 6, background: OD.bgHover }} />
                <Skeleton className="h-8 w-24" style={{ borderRadius: 6, background: OD.bgHover }} />
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <Skeleton className="h-8 w-32 mb-2" style={{ background: OD.bgHover }} />
              <Skeleton className="h-4 w-20" style={{ background: OD.bgHover }} />
            </div>
          </div>
          <Skeleton className="h-3 w-full mt-5" style={{ borderRadius: 99, background: OD.bgHover }} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton style={{ height: 260, borderRadius: 10, background: OD.bgMed }} />
          <Skeleton style={{ height: 260, borderRadius: 10, background: OD.bgMed }} />
        </div>
      </div>
    );
  }

  if (!cd.client) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Client not found</p>
        <NextLink href="/clients"><Button variant="outline" className="mt-4">Back to Clients</Button></NextLink>
      </div>
    );
  }

  const { client } = cd;

  const healthScore = cd.healthScore;
  const sparklineAum = cd.sparklineData.map(p => p.aum);
  const rawStatus = (client.status || "").toLowerCase();
  const statusLabel = rawStatus === "active" || rawStatus === "" ? "Active"
    : rawStatus === "inactive" ? "Inactive"
    : rawStatus === "prospect" ? "Prospect"
    : rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
  const statusColor = statusLabel === "Active" ? P.grn : statusLabel === "Inactive" ? P.red || "#dc2626" : P.amb;
  const statusBg = statusLabel === "Active" ? "rgba(61,139,94,.15)" : statusLabel === "Inactive" ? "rgba(220,38,38,.15)" : "rgba(184,135,43,.15)";
  const initials = `${client.firstName[0]}${client.lastName[0]}`;

  return (
    <div className="space-y-6 w-full max-w-[95vw] mx-auto 2xl:max-w-[98vw] v2-dark-scope">
      <NextLink href="/clients">
        <button
          style={{
            display: "flex", alignItems: "center", gap: 6, marginBottom: 16, padding: "6px 0",
            border: "none", background: "none", cursor: "pointer", color: OD.gray400, fontSize: 12,
            fontWeight: 600, fontFamily: "'DM Sans'", transition: "color .15s",
          }}
          data-testid="button-back"
        >
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Book of Business
        </button>
      </NextLink>

      {/* ═══ V2 CLIENT HERO ═══ */}
      <StickyClientHeader
        clientName={`${client.firstName} ${client.lastName}`}
        clientInitials={initials}
        totalAum={formatCurrency(cd.totalAum)}
        tierLabel={cd.tier ? `Tier ${cd.tier}` : undefined}
      >
      <div
        className="animate-slide-up"
        style={{
          background: P.odDeep, position: "relative", overflow: "hidden",
          borderRadius: 10, border: `1px solid ${P.odBorder2}`,
        }}
      >
        {/* Dot matrix bg */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(rgba(79,179,205,0.08) 1px, transparent 1px)",
          backgroundSize: "28px 28px", pointerEvents: "none", zIndex: 0,
        }} />
        {/* Gradient overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(90deg, ${P.odDeep} 0%, rgba(0,52,79,0.7) 40%, rgba(0,52,79,0.3) 100%)`,
          pointerEvents: "none", zIndex: 0,
        }} />
        {/* Top accent line */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2, zIndex: 2,
          background: `linear-gradient(90deg, transparent, ${P.odBlue} 25%, ${P.odLBlue} 50%, ${P.odGreen} 75%, transparent)`,
        }} />

        {/* Hero content */}
        <div style={{
          position: "relative", zIndex: 1,
          display: "grid", gridTemplateColumns: "auto 1fr auto",
          alignItems: "flex-start", gap: 24, padding: "28px 28px 0",
        }}>
          {/* Avatar block */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, paddingTop: 4 }}>
            <div style={{
              width: 68, height: 68, borderRadius: 16,
              background: `linear-gradient(135deg, rgba(0,120,162,0.4), rgba(79,179,205,0.25))`,
              border: "1.5px solid rgba(79,179,205,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 22,
              color: P.odLBlue, letterSpacing: ".04em",
              boxShadow: "0 0 30px rgba(79,179,205,0.12)",
            }}>
              {initials}
            </div>
            {(() => {
              const t = cd.tier || client.segment;
              return (
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase",
                  padding: "3px 10px", borderRadius: 3,
                  color: P.odLBlue, background: "rgba(79,179,205,0.1)",
                  border: "1px solid rgba(79,179,205,0.25)",
                }}>
                  Tier {t}
                </span>
              );
            })()}
          </div>

          {/* Name + badges + meta */}
          <div style={{ paddingTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 10, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase",
                padding: "2px 8px", borderRadius: 3,
                color: P.odGreen, background: "rgba(142,185,53,0.1)", border: "1px solid rgba(142,185,53,0.3)",
              }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: P.odGreen }} />
                {statusLabel}
              </span>
              {cd.isLiveData && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 10, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase",
                  padding: "2px 8px", borderRadius: 3,
                  color: "rgba(79,179,205,0.7)", background: "rgba(79,179,205,0.06)",
                  border: "1px solid rgba(79,179,205,0.18)",
                }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: P.odLBlue, animation: "pip 2.5s ease-in-out infinite" }} />
                  Salesforce Live
                </span>
              )}
              {cd.isLiveData && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 10, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase",
                  padding: "2px 8px", borderRadius: 3,
                  color: "rgba(79,179,205,0.7)", background: "rgba(79,179,205,0.06)",
                  border: "1px solid rgba(79,179,205,0.18)",
                }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: P.odGreen, animation: "pip 2.5s ease-in-out infinite 0.5s" }} />
                  Orion Live
                </span>
              )}
              {client.entityType === "business" && (
                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase",
                  padding: "2px 8px", borderRadius: 3,
                  color: "rgba(96,165,250,0.8)", background: "rgba(96,165,250,0.08)",
                  border: "1px solid rgba(96,165,250,0.2)",
                }}>
                  Business
                </span>
              )}
              {/* Refresh all data for this client */}
              <button
                onClick={handleRefreshAll}
                title="Refresh all data — pulls fresh from Salesforce + Orion"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 10, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase",
                  padding: "2px 8px", borderRadius: 3,
                  color: refreshing ? P.odGreen : "rgba(148,163,184,0.7)",
                  background: refreshing ? "rgba(142,185,53,0.08)" : "rgba(148,163,184,0.06)",
                  border: `1px solid ${refreshing ? "rgba(142,185,53,0.3)" : "rgba(148,163,184,0.18)"}`,
                  cursor: "pointer", transition: "all .2s",
                }}
              >
                <RefreshCw style={{ width: 10, height: 10, animation: refreshing ? "spin 1s linear infinite" : "none" }} />
                {refreshing ? "Syncing…" : "Refresh"}
              </button>
            </div>
            <div style={{
              fontFamily: "'Oswald', sans-serif", fontWeight: 700,
              fontSize: 36, lineHeight: 0.95, letterSpacing: ".01em", textTransform: "uppercase",
              color: P.odT1, marginBottom: 10,
            }} data-testid="text-client-name">
              {client.firstName} {client.lastName}
            </div>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
              {client.email && (
                <a href={`mailto:${client.email}`} style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 12px", borderRight: "1px solid rgba(255,255,255,0.1)", fontSize: 11.5, color: P.odT3, textDecoration: "none" }}>
                  <Mail style={{ width: 11, height: 11 }} /> {client.email}
                </a>
              )}
              {client.phone && (
                <a href={`tel:${client.phone}`} style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 12px", borderRight: "1px solid rgba(255,255,255,0.1)", fontSize: 11.5, color: P.odT3, textDecoration: "none" }}>
                  <Phone style={{ width: 11, height: 11 }} /> {client.phone}
                </a>
              )}
              {(client.address || client.city) && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 12px", borderRight: "1px solid rgba(255,255,255,0.1)", fontSize: 11.5, color: P.odT3 }}>
                  {client.address || client.city}{client.state ? `, ${client.state}` : ""}
                </span>
              )}
              {cd.accountCount > 0 && (
                <span style={{ padding: "0 12px", borderRight: "1px solid rgba(255,255,255,0.1)", fontSize: 11.5, color: P.odT3 }}>
                  {cd.accountCount} Account{cd.accountCount > 1 ? "s" : ""}
                </span>
              )}
              {client.createdDate && (
                <span style={{ padding: "0 12px", borderRight: "1px solid rgba(255,255,255,0.1)", fontSize: 11.5, color: P.odT3 }}>
                  Client since {new Date(client.createdDate).toLocaleDateString()}
                </span>
              )}
              {client.sfHouseholdId && (
                <span style={{ padding: "0 12px", fontSize: 10, color: "rgba(79,179,205,0.6)", fontFamily: "'JetBrains Mono', monospace" }}>
                  {client.sfHouseholdId.slice(-6).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* AUM + Actions (right) */}
          <div style={{ paddingTop: 4, textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 16 }}>
            <div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 300,
                letterSpacing: ".22em", textTransform: "uppercase",
                color: "rgba(79,179,205,0.55)", marginBottom: 4,
              }}>
                Total AUM · Orion
              </div>
              <div style={{
                fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 46, lineHeight: 1,
                letterSpacing: "-.015em", color: P.odLBlue,
                textShadow: "0 0 40px rgba(79,179,205,0.25)",
              }} data-testid="text-client-total-aum">
                {formatCurrency(cd.totalAum)}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 5 }}>
                {cd.portfolioPerformance?.returnPct !== undefined && (
                  <>
                    <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 18, color: cd.portfolioPerformance.returnPct >= 0 ? P.odGreen : P.odOrange }}>
                      {cd.portfolioPerformance.returnPct >= 0 ? "+" : ""}{cd.portfolioPerformance.returnPct.toFixed(2)}%
                    </span>
                    <span style={{ fontSize: 10, color: P.odT4 }}>YTD Return · Orion</span>
                  </>
                )}
                {healthScore > 0 && <Score value={healthScore} size={40} />}
                <Spark data={sparklineAum} w={70} h={24} c={sparklineAum.length >= 2 && sparklineAum[sparklineAum.length - 1] >= sparklineAum[0] ? P.grn : P.red} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {client.email && (
                <button style={{
                  display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
                  padding: "8px 15px", borderRadius: 6, border: "none", cursor: "pointer",
                  background: P.odBlue, color: "#fff", letterSpacing: ".02em",
                  boxShadow: "0 2px 12px rgba(0,120,162,0.3)",
                  transition: "all .2s cubic-bezier(0.4,0,0.2,1)",
                }} data-testid="button-email" onClick={() => { window.location.href = 'mailto:' + client.email; }}>
                  <Mail style={{ width: 12, height: 12 }} /> Email
                </button>
              )}
              <button style={{
                display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
                padding: "8px 15px", borderRadius: 6, cursor: "pointer",
                background: "rgba(142,185,53,0.12)", border: "1px solid rgba(142,185,53,0.3)",
                color: P.odGreen, letterSpacing: ".02em",
                transition: "all .2s cubic-bezier(0.4,0,0.2,1)",
              }} data-testid="button-schedule" onClick={() => cd.handleSectionChange("meetings")}>
                <Calendar style={{ width: 12, height: 12 }} /> Schedule
              </button>
              {cd.user?.type === "advisor" && (
                <button
                  onClick={() => cd.setAddMemberOpen(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
                    padding: "8px 15px", borderRadius: 6, cursor: "pointer",
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                    color: P.odT2, letterSpacing: ".02em",
                    transition: "all .2s cubic-bezier(0.4,0,0.2,1)",
                  }} data-testid="button-add-team-member-header">
                  <UserPlus style={{ width: 12, height: 12 }} /> {cd.teamMembers && cd.teamMembers.length > 0 ? "Team" : "Add Team"}
                </button>
              )}
              <FinQuickAction compact clientId={client.id} clientName={`${client.firstName} ${client.lastName}`} />
            </div>
          </div>
        </div>

        {/* ═══ HERO STAT BAR — grouped into logical clusters ═══ */}
        <div style={{
          position: "relative", zIndex: 1,
          display: "flex", alignItems: "stretch", flexWrap: "wrap",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(0,0,0,0.25)", marginTop: 20,
        }}>
          {/* ── Financial cluster ── */}
          {[
            { label: "Risk Tolerance · Orion", value: client.riskTolerance || "—", colorClass: P.odYellow },
            { label: "Est. Income · Orion", value: (() => {
              const income = client.annualIncome;
              const source = client.annualIncomeSource;
              // Explicit numeric check — 0 is falsy but can be a valid computed value
              if (typeof income === "number" && income > 0) return formatCurrency(income);
              if (typeof income === "number" && source && source !== "unavailable") return formatCurrency(income);
              // Monolithic hasn't loaded yet — show deferred state
              if (cd.detailLoading) return "Loading…";
              // Monolithic loaded but no income data from any source
              return "—";
            })(), colorClass: P.odGreen, hasIncomeTooltip: true },
            { label: "Allocation · Orion", isAlloc: true },
            { label: "Cash · Orion", value: (() => {
              const ca = cd.allocationBar?.find((s: any) => s.label === "CA" || s.label === "Cash");
              if (!ca) return cd.portfolioLoading ? "…" : "—";
              const cashValue = cd.totalAum > 0 ? (ca.pct / 100) * cd.totalAum : 0;
              const pct = ca.pct.toFixed(1);
              return cashValue > 0 ? `${formatCurrency(cashValue)} (${pct}%)` : `${pct}%`;
            })(), colorClass: (() => {
              const ca = cd.allocationBar?.find((s: any) => s.label === "CA" || s.label === "Cash");
              if (!ca) return P.odT3;
              if (ca.pct > 20) return P.odYellow;
              if (ca.pct >= 5) return P.odGreen;
              return P.odT2;
            })() },
          ].map((item, i) => (
            <div key={`fin-${i}`} style={{
              flex: 1, padding: "14px 24px", display: "flex", flexDirection: "column", gap: 5, minWidth: 160,
              borderRight: "1px solid rgba(255,255,255,0.06)",
              cursor: "default", transition: "background .2s", position: "relative",
            }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 300,
                letterSpacing: ".2em", textTransform: "uppercase", color: P.odT3,
                display: "flex", alignItems: "center", gap: 4,
              }}>
                {item.label}
                {item.hasIncomeTooltip && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info style={{ width: 10, height: 10, opacity: 0.5, cursor: "help" }} />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[240px] text-xs">
                      Estimated annual portfolio income (dividends, interest, distributions) calculated by Orion — not earned income or salary.
                    </TooltipContent>
                  </Tooltip>
                )}
              </span>
              {item.isAlloc ? (
                <>
                  <div style={{ display: "flex", height: 4, gap: 1, borderRadius: 2, overflow: "hidden", marginTop: 2, width: "100%", maxWidth: 180 }}>
                    {cd.allocationBar?.map((seg: any, j: number) => (
                      <div key={j} style={{ width: `${seg.pct}%`, background: seg.color, transition: `width .5s ${EASE}`, minWidth: seg.pct > 0 ? 2 : 0 }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 10, color: P.odT3 }}>
                    {cd.allocationBar?.map((seg: any) => `${seg.pct.toFixed(0)}% ${seg.label}`).join(" · ") || "—"}
                  </span>
                </>
              ) : (
                <span style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 600, fontSize: 15,
                  color: item.colorClass || P.odT1,
                }}>{item.value}</span>
              )}
            </div>
          ))}

          {/* ── Cluster separator ── */}
          <div style={{ width: 1, background: "rgba(255,255,255,0.15)", margin: "8px 0" }} />

          {/* ── Activity cluster ── */}
          {[
            { label: "Open Tasks · SFDC", value: cd.openTaskCount > 0 ? String(cd.openTaskCount) : (cd.detailLoading ? "…" : "0"), colorClass: cd.openTaskCount > 0 ? P.odOrange : P.odT1 },
            { label: "Stale Opps · SFDC", value: cd.staleOppCount > 0 ? String(cd.staleOppCount) : (cd.detailLoading ? "…" : "0"), colorClass: cd.staleOppCount > 0 ? P.odOrange : P.odT1, isStaleOpps: true },
          ].map((item, i) => (
            <div key={`act-${i}`} style={{
              flex: 1, padding: "14px 24px", display: "flex", flexDirection: "column", gap: 5, minWidth: 160,
              borderRight: "1px solid rgba(255,255,255,0.06)",
              cursor: (item as any).isStaleOpps && cd.staleOppCount > 0 ? "pointer" : "default",
              transition: "background .2s", position: "relative",
            }}
            onClick={(item as any).isStaleOpps && cd.staleOppCount > 0 ? () => {
              // Trigger Tier 3 load to get stale opportunity details, then navigate to a relevant section
              cd.requestDetail?.();
            } : undefined}
            >
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 300,
                letterSpacing: ".2em", textTransform: "uppercase", color: P.odT3,
              }}>{item.label}</span>
              <span style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600, fontSize: 15,
                color: item.colorClass || P.odT1,
              }}>{item.value}</span>
              {/* Stale opp detail dropdown */}
              {(item as any).isStaleOpps && cd.staleOpportunities?.length > 0 && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
                  background: P.odSurf, border: `1px solid ${P.odBorder2}`, borderRadius: 6,
                  padding: 8, maxHeight: 200, overflowY: "auto",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}>
                  {cd.staleOpportunities.slice(0, 5).map((opp: any, j: number) => (
                    <div key={opp.id || j} style={{
                      padding: "6px 8px", borderBottom: j < Math.min(cd.staleOpportunities.length, 5) - 1 ? `1px solid ${P.odBorder}` : "none",
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: P.odT1 }}>{opp.name || opp.Name || "Opportunity"}</div>
                      <div style={{ fontSize: 10, color: P.odT3, fontFamily: "'JetBrains Mono', monospace" }}>
                        {opp.stageName || opp.StageName || "—"} · {opp.amount || opp.Amount ? formatCurrency(opp.amount || opp.Amount) : "—"}
                        {opp.daysStale ? ` · ${opp.daysStale}d stale` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* ── Cluster separator ── */}
          <div style={{ width: 1, background: "rgba(255,255,255,0.15)", margin: "8px 0" }} />

          {/* ── Profile cluster ── */}
          {[
            ...(cd.totalNetWorth != null && cd.totalNetWorth > 0
              ? [{ label: "Net Worth", value: formatCurrency(cd.totalNetWorth), colorClass: P.odGreen }]
              : []),
            { label: "DOB · SFDC", value: client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString() : "—", mono: true },
            { label: "Household · SFDC", value: (() => {
              const m = cd.householdMembers;
              if (!m || m.length === 0) return "0";
              const primary = m.find((h: any) => h.relationship === "primary") || m[0];
              const name = primary ? `${primary.firstName || ""} ${primary.lastName || ""}`.trim() : "";
              if (m.length === 1) return name || "1";
              return name ? `${name} & ${m.length - 1} more` : String(m.length);
            })(), colorClass: P.odLBlue },
            { label: "Next Review", value: client.nextReview ? new Date(client.nextReview).toLocaleDateString() : "—", mono: true, colorClass: (() => {
              if (!client.nextReview) return P.odT3;
              const days = Math.ceil((new Date(client.nextReview).getTime() - Date.now()) / 86_400_000);
              if (days < 0 || days < 7) return P.odOrange;
              if (days <= 30) return P.odYellow;
              return P.odGreen;
            })() },
            { label: "Last Review", value: client.lastReview ? (() => {
              const days = Math.floor((Date.now() - new Date(client.lastReview).getTime()) / 86_400_000);
              if (days < 30) return `${days}d ago`;
              if (days < 365) return `${Math.floor(days / 30)}mo ago`;
              return `${Math.floor(days / 365)}y ago`;
            })() : "Never", mono: true },
          ].map((item, i) => (
            <div key={`prof-${i}`} style={{
              flex: 1, padding: "14px 24px", display: "flex", flexDirection: "column", gap: 5,
              borderRight: i < 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              cursor: "default", transition: "background .2s", position: "relative",
            }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 300,
                letterSpacing: ".2em", textTransform: "uppercase", color: P.odT3,
              }}>{item.label}</span>
              <span style={{
                fontFamily: item.mono ? "'JetBrains Mono', monospace" : "'Oswald', sans-serif",
                fontWeight: 600, fontSize: item.mono ? 13 : 15,
                color: item.colorClass || P.odT1,
              }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* Team members strip */}
        {cd.teamMembers && cd.teamMembers.length > 0 && (
          <div style={{
            position: "relative", zIndex: 1,
            display: "flex", alignItems: "center", gap: 8, padding: "10px 28px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(0,0,0,0.15)",
          }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 300, letterSpacing: ".2em", textTransform: "uppercase", color: P.odT4, marginRight: 4 }}>Team</span>
            {cd.teamMembers.map((member: any) => (
              <div key={member.id} className="relative group" data-testid={`header-team-avatar-${member.id}`}>
                <div style={{
                  width: 28, height: 28, borderRadius: 4,
                  background: "rgba(79,179,205,0.1)", border: "1px solid rgba(79,179,205,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Oswald', sans-serif", fontSize: 10, fontWeight: 600, color: P.odLBlue,
                }}>
                  {member.associate.name.split(" ").map((n: string) => n[0]).join("")}
                </div>
                {cd.user?.type === "advisor" && (
                  <button
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                    style={{ fontSize: 10, lineHeight: 1 }}
                    onClick={(e) => { e.stopPropagation(); cd.removeTeamMemberMutation.mutate(member.id); }}
                    data-testid={`button-remove-team-member-${member.id}`}
                  >×</button>
                )}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {member.associate.name}<span className="text-white/60 ml-1">({member.role})</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </StickyClientHeader>

      {cd.apiErrors && cd.apiErrors.length > 0 && (
        <div style={{
          position: "relative", zIndex: 1,
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 20px",
          background: "rgba(244,125,32,0.08)",
          border: "1px solid rgba(244,125,32,0.2)",
          borderRadius: 8,
          marginTop: 8,
        }}>
          <AlertTriangle style={{ width: 16, height: 16, color: P.odOrange, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: P.odOrange }}>
              Data Source Warning
            </span>
            <span style={{ fontSize: 11, color: P.odT3, marginLeft: 8 }}>
              {cd.apiErrors.join(" · ")}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {cd.dataSources?.orion && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                background: cd.dataSources.orion === "live" ? "rgba(142,185,53,0.15)" : "rgba(244,125,32,0.15)",
                color: cd.dataSources.orion === "live" ? P.odGreen : P.odOrange,
              }}>
                Orion: {cd.dataSources.orion}
              </span>
            )}
            {cd.dataSources?.salesforce && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                background: cd.dataSources.salesforce === "live" ? "rgba(142,185,53,0.15)" : "rgba(244,125,32,0.15)",
                color: cd.dataSources.salesforce === "live" ? P.odGreen : P.odOrange,
              }}>
                Salesforce: {cd.dataSources.salesforce}
              </span>
            )}
          </div>
        </div>
      )}

      {cd.isMobile && (
        <ClientDetailNav activeSection={cd.activeSection} onSectionChange={cd.handleSectionChange} navGroups={cd.navGroups} signalCounts={signalCounts} signalsBySection={proactiveSignals.signalsBySection} />
      )}

      {proactiveSignals.totalActiveCount > 0 && (
        <ProactiveSignalsBanner
          signals={proactiveSignals.signals}
          signalsBySection={proactiveSignals.signalsBySection}
          onNavigateToSection={cd.handleSectionChange}
        />
      )}

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {!cd.isMobile && (
          <ClientDetailSidebar
            activeSection={cd.activeSection}
            onSectionChange={cd.handleSectionChange}
            navGroups={cd.navGroups}
            signalCounts={signalCounts}
            signalsBySection={proactiveSignals.signalsBySection}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <ContextBanner navigationContext={cd.navigationContext} />
          <ClientTabs
            activeSection={cd.activeSection}
            clientId={cd.clientId}
            client={client}
            accounts={cd.accounts}
            holdings={cd.holdings}
            alternativeAssets={cd.alternativeAssets}
            transactions={cd.transactions}
            perf={cd.perf}
            householdMembers={cd.householdMembers}
            lifeEvents={cd.lifeEvents}
            perfData={cd.perfData}
            pieData={cd.pieData}
            clientMeetings={cd.clientMeetings}
            documents={cd.documents}
            checklistData={cd.checklistData}
            complianceItems={cd.complianceItems}
            totalAum={cd.totalAum}
            marketData={cd.marketData}
            marketLoading={cd.marketLoading}
            refetchMarket={cd.refetchMarket}
            teamMembers={cd.teamMembers || []}
            suggestedTasks={cd.suggestedTasks}
            setSuggestedTasks={cd.setSuggestedTasks}
            setSelectedAccountId={cd.setSelectedAccountId}
            user={cd.user}
            isMobile={cd.isMobile}
            riskDistribution={cd.riskDistribution}
            topHoldingsByValue={cd.topHoldingsByValue}
            sectorExposure={cd.sectorExposure}
            custodianBreakdown={cd.custodianBreakdown}
            accountTypeDistribution={cd.accountTypeDistribution}
            managedVsHeldAway={cd.managedVsHeldAway}
            portfolioPerformance={cd.portfolioPerformance}
            portfolioContributions={cd.portfolioContributions}
            upcomingEvents={cd.upcomingEvents}
            staleOpportunities={cd.staleOpportunities}
            sfFinancialGoals={cd.sfFinancialGoals}
            sfTopHoldings={cd.sfTopHoldings}
            revenues={cd.revenues}
            assetsAndLiabilities={cd.assetsAndLiabilities}
          />
        </div>
      </div>

      <Dialog open={cd.addMemberOpen} onOpenChange={cd.setAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add an associate to {client.firstName} {client.lastName}'s support team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Associate</label>
              <Select value={cd.selectedAssociateId} onValueChange={cd.setSelectedAssociateId}>
                <SelectTrigger data-testid="select-team-associate">
                  <SelectValue placeholder="Select an associate..." />
                </SelectTrigger>
                <SelectContent>
                  {(cd.allAssociates || [])
                    .filter((a: any) => a.active && !cd.teamMembers?.some((m: any) => m.associateId === a.id))
                    .map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.role})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Team Role</label>
              <Select value={cd.teamRole} onValueChange={cd.setTeamRole}>
                <SelectTrigger data-testid="select-team-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="lead analyst">Lead Analyst</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                  <SelectItem value="paraplanner">Paraplanner</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => cd.setAddMemberOpen(false)} data-testid="button-cancel-add-member">
              Cancel
            </Button>
            <Button
              onClick={() => cd.addTeamMemberMutation.mutate()}
              disabled={!cd.selectedAssociateId || cd.addTeamMemberMutation.isPending}
              data-testid="button-confirm-add-member"
            >
              {cd.addTeamMemberMutation.isPending ? "Adding..." : "Add to Team"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {cd.selectedAccountId && (() => {
        const selectedAccount = cd.accounts.find((a: any) => a.id === cd.selectedAccountId);
        const accountHoldings = cd.holdings.filter((h: any) => h.accountId === cd.selectedAccountId);
        const totalMarketValue = accountHoldings.reduce((sum: number, h: any) => sum + parseFloat(h.marketValue), 0);
        const cashPosition = selectedAccount ? parseFloat(selectedAccount.balance) - totalMarketValue : 0;

        return (
          <Dialog open={!!cd.selectedAccountId} onOpenChange={() => cd.setSelectedAccountId(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" style={{ background: P.odSurf, border: `1px solid ${P.odBorder}`, color: P.odT1 }}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2" data-testid="text-account-detail-title" style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase", color: P.odT1 }}>
                  {selectedAccount?.accountType}
                  <SourcePill source="orion" />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-md" style={{ background: P.odSurf2, border: `1px solid ${P.odBorder2}` }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: P.odT4 }}>Account</div>
                    <div className="text-sm font-medium" data-testid="text-account-number" style={{ color: P.odT1 }}>{selectedAccount?.accountNumber}</div>
                  </div>
                  <div className="p-3 rounded-md" style={{ background: P.odSurf2, border: `1px solid ${P.odBorder2}` }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: P.odT4 }}>Custodian</div>
                    <div className="text-sm font-medium" style={{ color: P.odT1 }}>{selectedAccount?.custodian}</div>
                  </div>
                  <div className="p-3 rounded-md" style={{ background: P.odSurf2, border: `1px solid ${P.odBorder2}` }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: P.odT4 }}>Model</div>
                    <div className="text-sm font-medium" style={{ color: P.odT1 }}>{selectedAccount?.model || "—"}</div>
                  </div>
                  <div className="p-3 rounded-md" style={{ background: P.odSurf2, border: `1px solid ${P.odBorder2}` }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: P.odT4 }}>Total Value</div>
                    <div className="text-sm font-semibold" style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, color: P.odT1 }}>{ffc(parseFloat(selectedAccount?.balance || "0"))}</div>
                  </div>
                  {selectedAccount?.managementStyle && (
                    <div className="p-3 rounded-md" style={{ background: P.odSurf2, border: `1px solid ${P.odBorder2}` }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: P.odT4 }}>Management Style</div>
                      <div className="text-sm font-medium" style={{ color: P.odT1 }}>{selectedAccount.managementStyle}</div>
                    </div>
                  )}
                  {selectedAccount?.taxStatus && (
                    <div className="p-3 rounded-md" style={{ background: P.odSurf2, border: `1px solid ${P.odBorder2}` }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: P.odT4 }}>Tax Status</div>
                      <div className="text-sm font-medium" style={{ color: P.odT1 }}>{selectedAccount.taxStatus}</div>
                    </div>
                  )}
                  {selectedAccount?.startDate && (
                    <div className="p-3 rounded-md" style={{ background: P.odSurf2, border: `1px solid ${P.odBorder2}` }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: P.odT4 }}>Inception Date</div>
                      <div className="text-sm font-medium" style={{ color: P.odT1 }}>{new Date(selectedAccount.startDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</div>
                    </div>
                  )}
                  {(selectedAccount?.managedValue > 0 || selectedAccount?.nonManagedValue > 0) && (
                    <div className="p-3 rounded-md" style={{ background: P.odSurf2, border: `1px solid ${P.odBorder2}` }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: P.odT4 }}>Managed / Held-Away</div>
                      <div className="text-sm font-medium" style={{ color: P.odT1 }}>
                        {ffc(selectedAccount?.managedValue || 0)} / {ffc(selectedAccount?.nonManagedValue || 0)}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase", color: P.odT2 }}>
                    Portfolio Holdings
                    <Badge variant="secondary" className="no-default-active-elevate text-[10px]">{accountHoldings.length + (cashPosition > 0 ? 1 : 0)} positions</Badge>
                  </h4>
                  <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${P.odBorder2}` }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${P.odBorder2}`, background: P.odSurf3 }}>
                          <th className="text-left p-2.5" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: P.odT4 }}>Ticker</th>
                          <th className="text-left p-2.5" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: P.odT4 }}>Name</th>
                          <th className="text-right p-2.5" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: P.odT4 }}>Shares</th>
                          <th className="text-right p-2.5" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: P.odT4 }}>Market Value</th>
                          <th className="text-right p-2.5" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: P.odT4 }}>Weight</th>
                          <th className="text-right p-2.5" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: P.odT4 }}>Gain/Loss</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accountHoldings.map((h: any) => (
                          <tr key={h.id} style={{ borderBottom: `1px solid ${P.odBorder2}` }} data-testid={`holding-row-${h.id}`}>
                            <td className="p-2.5 font-medium" style={{ color: P.odLBlue }}>{h.ticker}</td>
                            <td className="p-2.5 text-xs" style={{ color: P.odT3 }}>{h.name}</td>
                            <td className="p-2.5 text-right" style={{ color: P.odT2 }}>{parseFloat(h.shares).toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                            <td className="p-2.5 text-right font-medium" style={{ color: P.odT1 }}>{ffc(parseFloat(h.marketValue))}</td>
                            <td className="p-2.5 text-right" style={{ color: P.odT3 }}>{h.weight ? `${parseFloat(h.weight).toFixed(1)}%` : "—"}</td>
                            <td className="p-2.5 text-right" style={{ color: parseFloat(h.unrealizedGainLoss || "0") >= 0 ? P.odGreen : P.red }}>
                              {h.unrealizedGainLoss ? `${parseFloat(h.unrealizedGainLoss) >= 0 ? "+" : ""}${ffc(parseFloat(h.unrealizedGainLoss))}` : "—"}
                            </td>
                          </tr>
                        ))}
                        {cashPosition > 0 && (
                          <tr style={{ borderBottom: `1px solid ${P.odBorder2}`, background: P.odSurf3 }} data-testid="holding-row-cash">
                            <td className="p-2.5 font-medium" style={{ color: P.odT2 }}>CASH</td>
                            <td className="p-2.5 text-xs" style={{ color: P.odT3 }}>Cash & Equivalents</td>
                            <td className="p-2.5 text-right" style={{ color: P.odT3 }}>—</td>
                            <td className="p-2.5 text-right font-medium" style={{ color: P.odT1 }}>{ffc(cashPosition)}</td>
                            <td className="p-2.5 text-right" style={{ color: P.odT3 }}>
                              {selectedAccount ? `${((cashPosition / parseFloat(selectedAccount.balance)) * 100).toFixed(1)}%` : "—"}
                            </td>
                            <td className="p-2.5 text-right" style={{ color: P.odT3 }}>—</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    {accountHoldings.length === 0 && cashPosition <= 0 && (
                      <p className="text-sm text-center py-6" style={{ color: P.odT3 }}>No holdings in this account.</p>
                    )}
                  </div>
                </div>

                {accountHoldings.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-md" style={{ background: P.odSurf2, border: `1px solid ${P.odBorder2}` }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: P.odT4 }}>Invested Value</div>
                      <div className="font-medium" style={{ color: P.odT1 }}>{ffc(totalMarketValue)}</div>
                    </div>
                    <div className="p-3 rounded-md" style={{ background: P.odSurf2, border: `1px solid ${P.odBorder2}` }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: P.odT4 }}>Cash Position</div>
                      <div className="font-medium" style={{ color: P.odT1 }}>{cashPosition > 0 ? ffc(cashPosition) : "$0.00"}</div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => { cd.setSelectedAccountId(null); cd.handleSectionChange("portfolio"); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, width: "100%",
                    justifyContent: "center", padding: "10px 16px", borderRadius: 6,
                    background: "rgba(79,179,205,0.08)", border: `1px solid rgba(79,179,205,0.25)`,
                    color: P.odLBlue, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'Inter', sans-serif", transition: "all .15s ease",
                  }}
                >
                  View Full Portfolio →
                </button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Data Source Diagnostic Panel now renders globally via GlobalDiagnosticPanel in App.tsx */}
    </div>
  );
}
