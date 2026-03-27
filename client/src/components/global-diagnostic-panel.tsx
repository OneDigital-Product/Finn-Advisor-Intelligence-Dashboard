"use client";

/**
 * Global Diagnostic Panel — v4 (Pipeline Trace)
 *
 * Floating bottom-right panel available on EVERY page.
 * Shows per-field pipeline traces: Source → MuleSoft → Backend → UI
 * with typed failure classifications at each hop.
 *
 * Reads from DiagnosticContext (page pushes its fields in)
 * and from useDevSettings (admin toggle).
 */

import { useState, useEffect } from "react";
import { useDevSettings } from "@/hooks/use-dev-settings";
import { useDiagnosticContext } from "@/contexts/diagnostic-context";
import {
  useDataSources,
  type DataSourceStatus,
} from "@/components/design/data-source-badge";
import {
  X, Database, ChevronDown, ChevronRight, AlertCircle,
  ExternalLink, Lightbulb, Server, MapPin, Loader2,
  CheckCircle2, XCircle, Clock, Link2, HelpCircle, Eye,
  ArrowRight, Shield, Wifi, WifiOff, Code, Monitor,
} from "lucide-react";
import type { DiagnosticFieldResolution, DiagnosticFieldStatus } from "@/lib/diagnostic-field-resolver";

/* ── Colors ── */
const SRC = {
  salesforce: { label: "Salesforce", color: "#00A1E0", bg: "rgba(0,161,224,0.12)" },
  orion:      { label: "Orion",      color: "#00B4E6", bg: "rgba(0,180,230,0.12)" },
  computed:   { label: "Computed",   color: "#8EB935", bg: "rgba(142,185,53,0.12)" },
  fallback:   { label: "Fallback",   color: "#F47D20", bg: "rgba(244,125,32,0.12)" },
  empty:      { label: "Empty",      color: "#94A3B8", bg: "rgba(148,163,184,0.08)" },
} as const;

const STATUS_CONFIG: Record<DiagnosticFieldStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  "present":              { label: "Present",             color: "#8EB935", icon: CheckCircle2 },
  "loading":              { label: "Loading…",            color: "#60A5FA", icon: Loader2 },
  "missing-at-source":    { label: "Missing at source",   color: "#F47D20", icon: XCircle },
  "unmapped":             { label: "Unmapped",            color: "#7F77DD", icon: Link2 },
  "not-applicable":       { label: "Not applicable",      color: "#64748B", icon: HelpCircle },
  "integration-error":    { label: "Integration error",   color: "#EF4444", icon: AlertCircle },
  "derived-pending":      { label: "Derived — pending",   color: "#60A5FA", icon: Clock },
  "derived-unavailable":  { label: "Derived — unavailable", color: "#F47D20", icon: AlertCircle },
};

/* ── Pipeline Hop Classification ── */
type HopStatus = "pass" | "fail" | "loading" | "unknown" | "skipped";
type FailureClass =
  | "api-auth-failure"
  | "api-endpoint-error"
  | "transform-dropped"
  | "ui-not-wired"
  | "source-empty"
  | "needs-exploration"
  | "loading"
  | "ok";

interface PipelineHop {
  label: string;
  icon: typeof Server;
  status: HopStatus;
  failureClass?: FailureClass;
  detail?: string;
}

const FAILURE_LABELS: Record<FailureClass, { label: string; color: string; action: string }> = {
  "api-auth-failure":    { label: "Auth / Token Issue",       color: "#EF4444", action: "Check MuleSoft OAuth token or credentials" },
  "api-endpoint-error":  { label: "API Error (4xx/5xx)",      color: "#EF4444", action: "Check endpoint availability and payload" },
  "transform-dropped":   { label: "Dropped in Transform",     color: "#F47D20", action: "Field exists upstream but not mapped in route" },
  "ui-not-wired":        { label: "UI Not Rendering",         color: "#7F77DD", action: "Backend returns field but no component displays it" },
  "source-empty":        { label: "Empty at Source",           color: "#94A3B8", action: "Populate in source system (CRM / Orion)" },
  "needs-exploration":   { label: "Needs Investigation",      color: "#F47D20", action: "Ambiguous — inspect raw payload at runtime" },
  "loading":             { label: "Still Loading",            color: "#60A5FA", action: "Wait for data fetch to complete" },
  "ok":                  { label: "OK",                       color: "#8EB935", action: "Field is present and rendered" },
};

function classifyPipeline(f: DiagnosticFieldResolution): PipelineHop[] {
  const hops: PipelineHop[] = [
    { label: "Source", icon: Database, status: "unknown" },
    { label: "MuleSoft", icon: Wifi, status: "unknown" },
    { label: "Backend", icon: Server, status: "unknown" },
    { label: "UI", icon: Monitor, status: "unknown" },
  ];

  if (f.status === "present") {
    // All hops passed
    hops[0].status = "pass"; hops[0].detail = f.source || "resolved";
    hops[1].status = "pass"; hops[1].detail = "Proxied";
    hops[2].status = "pass"; hops[2].detail = f.sourcePath || "mapped";
    hops[3].status = "pass"; hops[3].detail = f.uiLocation || "rendered";
    return hops;
  }

  if (f.status === "loading" || f.status === "derived-pending") {
    hops[0].status = "loading"; hops[0].failureClass = "loading"; hops[0].detail = "Fetching...";
    hops[1].status = "loading";
    hops[2].status = "loading";
    hops[3].status = "loading";
    return hops;
  }

  if (f.status === "missing-at-source") {
    hops[0].status = "fail"; hops[0].failureClass = "source-empty";
    hops[0].detail = `Not populated in ${f.source || "source system"}`;
    hops[1].status = "skipped";
    hops[2].status = "skipped";
    hops[3].status = "skipped";
    return hops;
  }

  if (f.status === "integration-error") {
    hops[0].status = "unknown"; hops[0].detail = "Unknown — API error";
    // Determine if it's auth or endpoint
    const note = (f.notes || f.actionRecommendation || "").toLowerCase();
    if (note.includes("auth") || note.includes("token") || note.includes("401") || note.includes("credential")) {
      hops[1].status = "fail"; hops[1].failureClass = "api-auth-failure";
      hops[1].detail = "Authentication failure";
    } else {
      hops[1].status = "fail"; hops[1].failureClass = "api-endpoint-error";
      hops[1].detail = "Endpoint error";
    }
    hops[2].status = "skipped";
    hops[3].status = "skipped";
    return hops;
  }

  if (f.status === "unmapped") {
    hops[0].status = "pass"; hops[0].detail = "Exists in source";
    hops[1].status = "pass"; hops[1].detail = "Proxied";
    hops[2].status = "fail"; hops[2].failureClass = "transform-dropped";
    hops[2].detail = "Field not extracted in route";
    hops[3].status = "skipped";
    return hops;
  }

  if (f.status === "derived-unavailable") {
    hops[0].status = "pass"; hops[0].detail = "Inputs unavailable";
    hops[1].status = "skipped";
    hops[2].status = "fail"; hops[2].failureClass = "transform-dropped";
    hops[2].detail = "Cannot compute — missing inputs";
    hops[3].status = "skipped";
    return hops;
  }

  if (f.status === "not-applicable") {
    hops[0].status = "skipped"; hops[0].detail = "N/A for this entity";
    hops[1].status = "skipped";
    hops[2].status = "skipped";
    hops[3].status = "skipped";
    return hops;
  }

  // Fallthrough — needs exploration
  hops[0].status = "unknown"; hops[0].failureClass = "needs-exploration";
  hops[1].status = "unknown";
  hops[2].status = "unknown";
  hops[3].status = "unknown";
  return hops;
}

/* ── Pipeline Trace Visual ── */
function PipelineTrace({ hops }: { hops: PipelineHop[] }) {
  const hopColor = (s: HopStatus) => ({
    pass: "#8EB935", fail: "#F47D20", loading: "#60A5FA", unknown: "#64748B", skipped: "#334155",
  }[s]);

  return (
    <div style={{ padding: "8px 0" }}>
      {/* Visual pipeline */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 8 }}>
        {hops.map((hop, i) => {
          const color = hopColor(hop.status);
          const Icon = hop.icon;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                minWidth: 52,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: `${color}20`, border: `1.5px solid ${color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {hop.status === "loading" ? (
                    <Loader2 size={12} style={{ color, animation: "spin 1.5s linear infinite" }} />
                  ) : hop.status === "pass" ? (
                    <CheckCircle2 size={12} style={{ color }} />
                  ) : hop.status === "fail" ? (
                    <XCircle size={12} style={{ color }} />
                  ) : hop.status === "skipped" ? (
                    <span style={{ width: 8, height: 2, background: color, borderRadius: 1 }} />
                  ) : (
                    <HelpCircle size={12} style={{ color }} />
                  )}
                </div>
                <span style={{ fontSize: 8, fontWeight: 600, color, letterSpacing: ".02em" }}>
                  {hop.label}
                </span>
              </div>
              {i < hops.length - 1 && (
                <div style={{
                  width: 20, height: 2, marginTop: -12,
                  background: hops[i + 1].status === "skipped" ? "#1E293B" : `${hopColor(hops[i + 1].status)}60`,
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Failure detail for first failing hop */}
      {hops.map((hop, i) => {
        if (hop.status !== "fail" || !hop.failureClass) return null;
        const fc = FAILURE_LABELS[hop.failureClass];
        return (
          <div key={`fail-${i}`} style={{
            background: `${fc.color}10`, border: `1px solid ${fc.color}30`,
            borderRadius: 6, padding: "6px 10px", marginTop: 4,
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: fc.color, marginBottom: 2 }}>
              {hop.label}: {fc.label}
            </div>
            {hop.detail && (
              <div style={{ fontSize: 9, color: "#94A3B8", marginBottom: 3 }}>{hop.detail}</div>
            )}
            <div style={{ fontSize: 9, color: fc.color, fontStyle: "italic" }}>
              → {fc.action}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Integration Status Helpers (migrated from ApiStatusBar) ── */

function isMulesoftConnected(ds?: DataSourceStatus): boolean {
  if (ds?.mulesoft?.connected !== undefined) return ds.mulesoft.connected;
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

const PLATFORMS = [
  {
    code: "SF", name: "Salesforce FSC",
    detail: "FinancialAccount, Household, Opportunity, Task, Event, Case",
    color: "#00A1E0", bg: "rgba(0,161,224,0.15)",
    getStatus: isSalesforceConnected,
  },
  {
    code: "OR", name: "Orion Advisor",
    detail: "Portfolio, Holdings, Performance, AUM, Alpha, Sharpe",
    color: "#00B4E6", bg: "rgba(0,180,230,0.15)",
    getStatus: isOrionConnected,
  },
  {
    code: "MS", name: "MuleSoft EAPI",
    detail: "OAuth2 Proxy Layer",
    color: "#F47D20", bg: "rgba(244,125,32,0.12)",
    getStatus: isMulesoftConnected,
  },
];

/* ── Integration Status Section ── */
function IntegrationStatusSection({ ds }: { ds?: DataSourceStatus }) {
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

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 1800);
  };

  return (
    <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(71,85,105,0.3)" }}>
      {/* Platform badges */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {PLATFORMS.map((p) => {
          const live = p.getStatus(ds);
          return (
            <div key={p.code} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "5px 8px",
              borderRadius: 6,
              background: live ? `${p.color}08` : "transparent",
              border: `1px solid ${live ? p.color + "30" : "rgba(45,55,72,0.3)"}`,
            }}>
              {/* Badge code */}
              <span style={{
                fontSize: 9, fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.08em", padding: "2px 6px",
                borderRadius: 3, textTransform: "uppercase",
                background: p.bg, color: p.color,
                flexShrink: 0,
              }}>
                {p.code}
              </span>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: "#C7D0DD", lineHeight: 1.2 }}>
                  {p.name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: live ? "#8EB935" : "#FFC60B",
                    boxShadow: live ? "0 0 6px rgba(142,185,53,0.5)" : "none",
                  }} />
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8.5, color: live ? "#8EB935" : "#FFC60B",
                    letterSpacing: "0.05em",
                  }}>
                    {live ? "Live" : "Offline"}
                  </span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8, color: "#64748B", letterSpacing: "0.03em",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    · {p.detail}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clock + Sync row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginTop: 8, paddingTop: 6,
        borderTop: "1px solid rgba(71,85,105,0.2)",
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, color: "#64748B", letterSpacing: "0.1em",
        }}>
          {clock}
        </span>
        <button
          onClick={handleSync}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8, fontWeight: 500,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: "#4FB3CD",
            background: "rgba(79,179,205,0.08)",
            border: "1px solid rgba(79,179,205,0.2)",
            padding: "2px 8px", borderRadius: 3,
            cursor: "pointer",
            opacity: syncing ? 0.6 : 1,
            transition: "all .15s",
          }}
        >
          ↻ {syncing ? "Syncing…" : "Force Sync"}
        </button>
      </div>
    </div>
  );
}

/* ── Main Global Panel ── */
export function GlobalDiagnosticPanel() {
  const { settings } = useDevSettings();
  const { pageData } = useDiagnosticContext();
  const { data: dsStatus } = useDataSources();
  const [collapsed, setCollapsed] = useState(false);
  const [integrationExpanded, setIntegrationExpanded] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [expandedField, setExpandedField] = useState<string | null>(null);

  if (!settings.showDataSources) return null;

  // Use context data, or show minimal "no page data" state
  const canonicalFields = pageData?.canonicalFields || [];
  const legacyFields = pageData?.fields || [];
  const dataSources = pageData?.dataSources;
  const pageLabel = pageData?.pageLabel || "Page";
  const useCanonical = canonicalFields.length > 0;
  const hasData = useCanonical || legacyFields.length > 0;

  const populated = useCanonical
    ? canonicalFields.filter(f => f.status === "present").length
    : legacyFields.filter(f => f.source !== "empty").length;
  const loading = useCanonical
    ? canonicalFields.filter(f => f.status === "loading" || f.status === "derived-pending").length
    : 0;
  const total = useCanonical ? canonicalFields.length : legacyFields.length;
  const pct = total > 0 ? Math.round((populated / total) * 100) : 0;

  return (
    <div
      style={{
        position: "fixed", bottom: 16, right: 16, zIndex: 9999,
        width: collapsed ? 52 : 420,
        background: "rgba(15,23,42,0.96)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(71,85,105,0.4)",
        borderRadius: 10,
        fontFamily: "'Inter', system-ui, sans-serif",
        color: "#E2E8F0",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        transition: "width .2s ease",
        overflow: "hidden",
      }}
      data-testid="global-diagnostic-panel"
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: collapsed ? "8px 14px" : "10px 14px",
          borderBottom: collapsed ? "none" : "1px solid rgba(71,85,105,0.3)",
          cursor: "pointer",
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Database style={{ width: 14, height: 14, color: "#00B4E6" }} />
          {!collapsed && (
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".03em" }}>
              {pageLabel} Data Provenance
            </span>
          )}
        </div>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {hasData && (
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: pct === 100 ? "#8EB935" : pct >= 70 ? "#F47D20" : "#EF4444",
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {populated}/{total}
                {loading > 0 && <span style={{ color: "#60A5FA" }}> +{loading} loading</span>}
                {" "}({pct}%)
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setCollapsed(true); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 0 }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        )}
      </div>

      {/* ── Integration Status (migrated from ApiStatusBar) ── */}
      {!collapsed && (
        <div>
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "7px 14px", cursor: "pointer",
              background: integrationExpanded ? "rgba(255,255,255,0.03)" : "transparent",
              borderBottom: "1px solid rgba(71,85,105,0.2)",
            }}
            onClick={() => setIntegrationExpanded(!integrationExpanded)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {integrationExpanded
                ? <ChevronDown size={12} style={{ color: "#4FB3CD" }} />
                : <ChevronRight size={12} style={{ color: "#4FB3CD" }} />
              }
              <Wifi size={12} style={{ color: "#4FB3CD" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#4FB3CD", letterSpacing: ".03em" }}>
                Integrations
              </span>
            </div>
            <span style={{ fontSize: 9, color: "#64748B", fontFamily: "'JetBrains Mono', monospace" }}>
              {PLATFORMS.filter(p => p.getStatus(dsStatus)).length}/{PLATFORMS.length} live
            </span>
          </div>
          {integrationExpanded && <IntegrationStatusSection ds={dsStatus} />}
        </div>
      )}

      {/* ── No data state ── */}
      {!collapsed && !hasData && (
        <div style={{ padding: "20px 14px", textAlign: "center" }}>
          <Eye size={20} style={{ color: "#475569", margin: "0 auto 8px" }} />
          <div style={{ fontSize: 11, color: "#64748B" }}>
            Navigate to a page with data to see field diagnostics
          </div>
          <div style={{ fontSize: 9, color: "#475569", marginTop: 4 }}>
            Client detail pages provide the richest diagnostic data
          </div>
        </div>
      )}

      {/* ── Canonical Fields with Pipeline Traces ── */}
      {!collapsed && useCanonical && (
        <div style={{ maxHeight: 500, overflowY: "auto", padding: "4px 0" }}>
          {(["salesforce", "orion", "computed"] as const).map(srcKey => {
            const items = canonicalFields.filter(f => f.source === srcKey);
            if (items.length === 0) return null;
            const cfg = (SRC as any)[srcKey] || SRC.empty;
            const isExpanded = expandedGroup === srcKey;
            const groupPresent = items.filter(f => f.status === "present").length;
            const groupLoading = items.filter(f => f.status === "loading" || f.status === "derived-pending").length;

            return (
              <div key={srcKey}>
                <div
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "7px 14px", cursor: "pointer",
                    background: isExpanded ? "rgba(255,255,255,0.03)" : "transparent",
                  }}
                  onClick={() => setExpandedGroup(isExpanded ? null : srcKey)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {isExpanded ? <ChevronDown size={12} style={{ color: cfg.color }} /> : <ChevronRight size={12} style={{ color: cfg.color }} />}
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color, opacity: 0.8 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                    {dataSources?.[srcKey] === "live" && <StatusBadge text="ACTIVE" color="#8EB935" />}
                    {dataSources?.[srcKey] === "error" && <StatusBadge text="ERROR" color="#EF4444" />}
                  </div>
                  <span style={{ fontSize: 10, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>
                    {groupPresent}/{items.length}
                    {groupLoading > 0 && <span style={{ color: "#60A5FA" }}> +{groupLoading}</span>}
                  </span>
                </div>

                {isExpanded && (
                  <div style={{ padding: "2px 14px 6px 34px" }}>
                    {items.map(f => {
                      const isFieldExpanded = expandedField === f.key;
                      const fieldCfg = STATUS_CONFIG[f.status];
                      const Icon = fieldCfg.icon;
                      const isOk = f.status === "present";
                      const isLoadingField = f.status === "loading" || f.status === "derived-pending";

                      return (
                        <div key={f.key}>
                          <div
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              padding: "4px 0", borderBottom: "1px solid rgba(71,85,105,0.15)",
                              cursor: "pointer",
                            }}
                            onClick={() => setExpandedField(isFieldExpanded ? null : f.key)}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Icon style={{
                                width: 10, height: 10, color: fieldCfg.color, flexShrink: 0,
                                ...(isLoadingField ? { animation: "spin 1.5s linear infinite" } : {}),
                              }} />
                              <span style={{ fontSize: 10, color: isOk ? "#CBD5E1" : fieldCfg.color }}>{f.label}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {!isOk && (
                                <span style={{
                                  fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                                  background: `${fieldCfg.color}18`, color: fieldCfg.color,
                                  letterSpacing: ".03em", textTransform: "uppercase",
                                }}>{fieldCfg.label}</span>
                              )}
                              <span style={{
                                fontSize: 10, color: isOk ? "#E2E8F0" : "#64748B",
                                fontFamily: "'JetBrains Mono', monospace",
                                maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>
                                {f.displayValue}
                              </span>
                              {isFieldExpanded
                                ? <ChevronDown size={10} style={{ color: "#64748B" }} />
                                : <ChevronRight size={10} style={{ color: "#64748B" }} />}
                            </div>
                          </div>

                          {/* ── Expanded: Pipeline Trace ── */}
                          {isFieldExpanded && (
                            <div style={{
                              padding: "8px 0 8px 8px", marginBottom: 4,
                              borderLeft: `2px solid ${fieldCfg.color}40`,
                            }}>
                              {/* Pipeline diagram */}
                              <PipelineTrace hops={classifyPipeline(f)} />

                              {/* Source details */}
                              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
                                {f.source && (
                                  <DetailRow icon={<Server size={10} />} label="Source"
                                    value={`${f.source}${f.loadedFrom ? ` (${f.loadedFrom})` : ""}`}
                                    color={f.source === "salesforce" ? "#00A1E0" : f.source === "orion" ? "#00B4E6" : "#8EB935"} />
                                )}
                                {f.sourcePath && (
                                  <DetailRow icon={<Link2 size={10} />} label="Trace" value={f.sourcePath} color="#94A3B8" />
                                )}
                                {f.apiEndpoint && (
                                  <DetailRow icon={<ExternalLink size={10} />} label="Endpoint" value={f.apiEndpoint} color="#94A3B8" />
                                )}
                                {f.uiLocation && (
                                  <DetailRow icon={<MapPin size={10} />} label="Shows in" value={f.uiLocation} color="#8EB935" />
                                )}
                                {f.actionRecommendation && (
                                  <DetailRow icon={<Lightbulb size={10} />} label="Action" value={f.actionRecommendation} color="#F47D20" />
                                )}
                                {f.notes && (
                                  <DetailRow icon={<HelpCircle size={10} />} label="Note" value={f.notes} color="#475569" />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Legacy Fields (pages not yet using canonical resolver) ── */}
      {!collapsed && !useCanonical && legacyFields.length > 0 && (
        <div style={{ maxHeight: 420, overflowY: "auto", padding: "4px 0" }}>
          {(Object.keys(SRC) as (keyof typeof SRC)[]).map(src => {
            const items = legacyFields.filter(f => f.source === src);
            if (items.length === 0) return null;
            const cfg = SRC[src];
            const isExpanded = expandedGroup === src;

            return (
              <div key={src}>
                <div
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "7px 14px", cursor: "pointer",
                    background: isExpanded ? "rgba(255,255,255,0.03)" : "transparent",
                  }}
                  onClick={() => setExpandedGroup(isExpanded ? null : src)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {isExpanded ? <ChevronDown size={12} style={{ color: cfg.color }} /> : <ChevronRight size={12} style={{ color: cfg.color }} />}
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color, opacity: 0.8 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                  </div>
                  <span style={{ fontSize: 10, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>
                    {items.length} field{items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {isExpanded && (
                  <div style={{ padding: "2px 14px 6px 34px" }}>
                    {items.map(f => (
                      <div key={f.field} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "4px 0", borderBottom: "1px solid rgba(71,85,105,0.15)",
                      }}>
                        <span style={{ fontSize: 10, color: f.source === "empty" ? "#94A3B8" : "#CBD5E1" }}>{f.field}</span>
                        <span style={{
                          fontSize: 10, color: f.source === "empty" ? "#64748B" : "#E2E8F0",
                          fontFamily: "'JetBrains Mono', monospace",
                          maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {f.value === null || f.value === undefined || f.value === "" ? "—" : String(f.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer ── */}
      {!collapsed && (
        <div style={{
          padding: "6px 14px", borderTop: "1px solid rgba(71,85,105,0.3)",
          fontSize: 9, color: "#64748B", textAlign: "center",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          Settings → Developer Tools → Data Sources
        </div>
      )}
    </div>
  );
}

/* ── Small helpers ── */
function StatusBadge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, color,
      background: `${color}1F`, padding: "1px 5px",
      borderRadius: 3, letterSpacing: ".04em",
    }}>{text}</span>
  );
}

function DetailRow({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
      <div style={{ color, marginTop: 1, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <span style={{
          fontSize: 9, fontWeight: 600, color: "#64748B",
          textTransform: "uppercase", letterSpacing: ".04em",
          fontFamily: "'JetBrains Mono', monospace",
        }}>{label}</span>
        <div style={{ fontSize: 10, color, lineHeight: 1.3, marginTop: 1, wordBreak: "break-word" }}>
          {value}
        </div>
      </div>
    </div>
  );
}
