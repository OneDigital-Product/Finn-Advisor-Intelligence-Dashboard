/**
 * Data Source Diagnostic Overlay — v3 (Canonical Provenance)
 *
 * Two rendering modes:
 * 1. Legacy: accepts FieldDiag[] (backward-compatible with existing pages)
 * 2. Canonical: accepts DiagnosticFieldResolution[] from the resolver
 *
 * When canonicalFields is provided, the overlay renders status-aware field
 * provenance with explicit statuses instead of binary empty/populated.
 */
import { useState } from "react";
import { useDevSettings } from "@/hooks/use-dev-settings";
import {
  X, Database, ChevronDown, ChevronRight, AlertCircle,
  ExternalLink, Lightbulb, Server, MapPin, Loader2,
  CheckCircle2, XCircle, Clock, Link2, HelpCircle,
} from "lucide-react";
import type { DiagnosticFieldResolution, DiagnosticFieldStatus } from "@/lib/diagnostic-field-resolver";

/* ── Brand-aligned source colors ── */
const SRC = {
  salesforce: { label: "Salesforce", color: "#00A1E0", bg: "rgba(0,161,224,0.12)" },
  orion:      { label: "Orion",      color: "#00B4E6", bg: "rgba(0,180,230,0.12)" },
  computed:   { label: "Computed",   color: "#8EB935", bg: "rgba(142,185,53,0.12)" },
  fallback:   { label: "Fallback",   color: "#F47D20", bg: "rgba(244,125,32,0.12)" },
  empty:      { label: "Empty",      color: "#94A3B8", bg: "rgba(148,163,184,0.08)" },
} as const;

type Source = keyof typeof SRC;

/* ── Legacy reason categories (kept for backward compat) ── */
type EmptyReason =
  | "api-not-returning"
  | "crm-not-populated"
  | "ui-not-wired"
  | "endpoint-missing"
  | "dependency-missing"
  | "integration-error"
  | "unknown";

const REASON_LABELS: Record<EmptyReason, { label: string; color: string }> = {
  "api-not-returning":  { label: "API not returning this field",   color: "#F47D20" },
  "crm-not-populated":  { label: "Not populated in CRM",          color: "#94A3B8" },
  "ui-not-wired":       { label: "UI not wired to display",       color: "#7F77DD" },
  "endpoint-missing":   { label: "No API endpoint for this data", color: "#EF4444" },
  "dependency-missing": { label: "Missing computed dependency",    color: "#F47D20" },
  "integration-error":  { label: "Integration error",             color: "#EF4444" },
  "unknown":            { label: "Unknown reason",                 color: "#64748B" },
};

/* ── Status styling for canonical fields ── */
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

/* ── Legacy interface (backward compat) ── */
export interface FieldDiag {
  field: string;
  source: Source;
  value: string | number | null | undefined;
  sfField?: string;
  orionField?: string;
  reason?: EmptyReason;
  uiLocation?: string;
  suggestedAction?: string;
  apiEndpoint?: string;
  apiSource?: "salesforce" | "orion" | "computed" | "local";
}

interface Props {
  dataSources?: { salesforce?: string; orion?: string; fallback?: string };
  /** Legacy field array — used when canonicalFields is not provided */
  fields: FieldDiag[];
  /** Canonical field resolutions from the resolver — takes priority when present */
  canonicalFields?: DiagnosticFieldResolution[];
  pageLabel?: string;
}

export function DataSourceDiagnostic({ dataSources, fields, canonicalFields, pageLabel = "Client" }: Props) {
  const { settings } = useDevSettings();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [expandedField, setExpandedField] = useState<string | null>(null);

  if (!settings.showDataSources) return null;

  const useCanonical = canonicalFields && canonicalFields.length > 0;

  // ── Stats ──
  const populated = useCanonical
    ? canonicalFields.filter(f => f.status === "present").length
    : fields.filter(f => f.source !== "empty").length;
  const loading = useCanonical
    ? canonicalFields.filter(f => f.status === "loading" || f.status === "derived-pending").length
    : 0;
  const total = useCanonical ? canonicalFields.length : fields.length;
  const pct = total > 0 ? Math.round((populated / total) * 100) : 0;

  const sfStatus = dataSources?.salesforce || "unknown";
  const orionStatus = dataSources?.orion || "unknown";

  return (
    <div
      style={{
        position: "fixed", bottom: 16, right: 16, zIndex: 9999,
        width: collapsed ? 52 : 400,
        background: "rgba(15,23,42,0.96)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(71,85,105,0.4)",
        borderRadius: 10,
        fontFamily: "'Inter', system-ui, sans-serif",
        color: "#E2E8F0",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        transition: "width .2s ease",
        overflow: "hidden",
      }}
      data-testid="data-source-diagnostic"
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
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: pct === 100 ? "#8EB935" : pct >= 70 ? "#F47D20" : "#EF4444",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {populated}/{total}
              {loading > 0 && <span style={{ color: "#60A5FA" }}> +{loading} loading</span>}
              {" "}({pct}%)
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setCollapsed(true); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 0 }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        )}
      </div>

      {/* ── Connection Status ── */}
      {!collapsed && dataSources && (
        <div style={{ padding: "8px 14px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(dataSources).map(([key, status]) => (
            <div
              key={key}
              style={{
                fontSize: 10, fontWeight: 600, padding: "3px 10px",
                borderRadius: 4, textTransform: "capitalize",
                display: "flex", alignItems: "center", gap: 5,
                background: status === "live" ? "rgba(142,185,53,0.15)" :
                            status === "error" ? "rgba(239,68,68,0.15)" :
                            "rgba(148,163,184,0.1)",
                color: status === "live" ? "#8EB935" :
                       status === "error" ? "#EF4444" :
                       "#94A3B8",
              }}
            >
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: status === "live" ? "#8EB935" : status === "error" ? "#EF4444" : "#94A3B8",
                boxShadow: status === "live" ? "0 0 6px rgba(142,185,53,0.6)" : "none",
              }} />
              {key}: {status}
            </div>
          ))}
        </div>
      )}

      {/* ── Canonical Fields (new provenance view) ── */}
      {!collapsed && useCanonical && (
        <div style={{ maxHeight: 460, overflowY: "auto", padding: "4px 0" }}>
          {/* Group canonical fields by source */}
          {(["salesforce", "orion", "computed"] as const).map(srcKey => {
            const items = canonicalFields.filter(f => f.source === srcKey);
            if (items.length === 0) return null;
            const cfg = SRC[srcKey];
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
                    transition: "background 100ms",
                  }}
                  onClick={() => setExpandedGroup(isExpanded ? null : srcKey)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {isExpanded
                      ? <ChevronDown style={{ width: 12, height: 12, color: cfg.color }} />
                      : <ChevronRight style={{ width: 12, height: 12, color: cfg.color }} />
                    }
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color, opacity: 0.8 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                    {srcKey === "salesforce" && sfStatus === "live" && <StatusBadge text="ACTIVE" color="#8EB935" />}
                    {srcKey === "orion" && orionStatus === "live" && <StatusBadge text="ACTIVE" color="#8EB935" />}
                    {((srcKey === "salesforce" && sfStatus === "error") || (srcKey === "orion" && orionStatus === "error")) && (
                      <StatusBadge text="ERROR" color="#EF4444" />
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>
                    {groupPresent}/{items.length}
                    {groupLoading > 0 && <span style={{ color: "#60A5FA" }}> +{groupLoading}</span>}
                  </span>
                </div>

                {isExpanded && (
                  <div style={{ padding: "2px 14px 6px 34px" }}>
                    {items.map(f => (
                      <CanonicalFieldRow
                        key={f.key}
                        field={f}
                        isExpanded={expandedField === f.key}
                        onToggle={() => setExpandedField(expandedField === f.key ? null : f.key)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Legacy Fields (backward compat) ── */}
      {!collapsed && !useCanonical && (
        <div style={{ maxHeight: 420, overflowY: "auto", padding: "4px 0" }}>
          {(Object.keys(SRC) as Source[]).map(src => {
            const groups: Record<Source, FieldDiag[]> = { salesforce: [], orion: [], computed: [], fallback: [], empty: [] };
            for (const f of fields) groups[f.source].push(f);
            const items = groups[src];
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
                    {isExpanded
                      ? <ChevronDown style={{ width: 12, height: 12, color: cfg.color }} />
                      : <ChevronRight style={{ width: 12, height: 12, color: cfg.color }} />
                    }
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color, opacity: 0.8 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                  </div>
                  <span style={{ fontSize: 10, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>
                    {items.length} field{items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {isExpanded && (
                  <div style={{ padding: "2px 14px 6px 34px" }}>
                    {items.map(f => {
                      const isFieldExpanded = expandedField === `${src}-${f.field}`;
                      const isEmpty = f.source === "empty";
                      const reason = f.reason ? REASON_LABELS[f.reason] : null;
                      const apiField = f.sfField || f.orionField;
                      const apiType = f.sfField ? "Salesforce" : f.orionField ? "Orion" : null;
                      return (
                        <div key={f.field}>
                          <div
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              padding: "4px 0", borderBottom: "1px solid rgba(71,85,105,0.15)",
                              cursor: "pointer",
                            }}
                            onClick={() => setExpandedField(isFieldExpanded ? null : `${src}-${f.field}`)}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {isEmpty && <AlertCircle style={{ width: 10, height: 10, color: "#94A3B8", flexShrink: 0 }} />}
                              <span style={{ fontSize: 10, color: isEmpty ? "#94A3B8" : "#CBD5E1" }}>{f.field}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{
                                fontSize: 10, color: isEmpty ? "#64748B" : "#E2E8F0",
                                fontFamily: "'JetBrains Mono', monospace",
                                maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>
                                {f.value === null || f.value === undefined || f.value === "" ? "—"
                                  : typeof f.value === "number" ? f.value.toLocaleString()
                                  : String(f.value).length > 18 ? String(f.value).slice(0, 16) + "…" : String(f.value)}
                              </span>
                              <ChevronRight style={{ width: 10, height: 10, color: "#64748B" }} />
                            </div>
                          </div>
                          {isFieldExpanded && (
                            <div style={{ padding: "8px 0 8px 16px", marginBottom: 4, borderLeft: `2px solid ${isEmpty ? "#475569" : cfg.color}40`, display: "flex", flexDirection: "column", gap: 6 }}>
                              {apiField && <DetailRow icon={<Server style={{ width: 10, height: 10 }} />} label="API Call" value={`${apiType} → ${apiField}`} color={apiType === "Salesforce" ? "#00A1E0" : "#00B4E6"} />}
                              {f.apiEndpoint && <DetailRow icon={<ExternalLink style={{ width: 10, height: 10 }} />} label="Endpoint" value={f.apiEndpoint} color="#94A3B8" />}
                              {f.uiLocation && <DetailRow icon={<MapPin style={{ width: 10, height: 10 }} />} label="Shows in" value={f.uiLocation} color="#8EB935" />}
                              {isEmpty && reason && <DetailRow icon={<AlertCircle style={{ width: 10, height: 10 }} />} label="Reason" value={reason.label} color={reason.color} />}
                              {isEmpty && f.suggestedAction && <DetailRow icon={<Lightbulb style={{ width: 10, height: 10 }} />} label="Suggested" value={f.suggestedAction} color="#F47D20" />}
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

/* ── Canonical Field Row ── */
function CanonicalFieldRow({
  field: f, isExpanded, onToggle,
}: {
  field: DiagnosticFieldResolution;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const cfg = STATUS_CONFIG[f.status];
  const Icon = cfg.icon;
  const isOk = f.status === "present";
  const isLoading = f.status === "loading" || f.status === "derived-pending";

  return (
    <div>
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "4px 0", borderBottom: "1px solid rgba(71,85,105,0.15)",
          cursor: "pointer",
        }}
        onClick={onToggle}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon style={{
            width: 10, height: 10, color: cfg.color, flexShrink: 0,
            ...(isLoading ? { animation: "spin 1.5s linear infinite" } : {}),
          }} />
          <span style={{ fontSize: 10, color: isOk ? "#CBD5E1" : cfg.color }}>
            {f.label}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Status pill */}
          {!isOk && (
            <span style={{
              fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
              background: `${cfg.color}18`, color: cfg.color,
              letterSpacing: ".03em", textTransform: "uppercase",
            }}>
              {cfg.label}
            </span>
          )}
          {/* Value */}
          <span style={{
            fontSize: 10,
            color: isOk ? "#E2E8F0" : "#64748B",
            fontFamily: "'JetBrains Mono', monospace",
            maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            textAlign: "right",
          }}>
            {f.displayValue}
          </span>
          {isExpanded
            ? <ChevronDown style={{ width: 10, height: 10, color: "#64748B" }} />
            : <ChevronRight style={{ width: 10, height: 10, color: "#64748B" }} />
          }
        </div>
      </div>

      {isExpanded && (
        <div style={{
          padding: "8px 0 8px 16px", marginBottom: 4,
          borderLeft: `2px solid ${cfg.color}40`,
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          {/* Status */}
          <DetailRow icon={<Icon style={{ width: 10, height: 10 }} />} label="Status" value={cfg.label} color={cfg.color} />

          {/* Source + path */}
          {f.source && (
            <DetailRow
              icon={<Server style={{ width: 10, height: 10 }} />}
              label="Source"
              value={`${f.source}${f.loadedFrom ? ` (${f.loadedFrom})` : ""}`}
              color={f.source === "salesforce" ? "#00A1E0" : f.source === "orion" ? "#00B4E6" : "#8EB935"}
            />
          )}

          {/* Source path (traceable) */}
          {f.sourcePath && (
            <DetailRow icon={<Link2 style={{ width: 10, height: 10 }} />} label="Trace" value={f.sourcePath} color="#94A3B8" />
          )}

          {/* Endpoint */}
          {f.apiEndpoint && (
            <DetailRow icon={<ExternalLink style={{ width: 10, height: 10 }} />} label="Endpoint" value={f.apiEndpoint} color="#94A3B8" />
          )}

          {/* UI Location */}
          {f.uiLocation && (
            <DetailRow icon={<MapPin style={{ width: 10, height: 10 }} />} label="Shows in" value={f.uiLocation} color="#8EB935" />
          )}

          {/* Action recommendation */}
          {f.actionRecommendation && (
            <DetailRow icon={<Lightbulb style={{ width: 10, height: 10 }} />} label="Action" value={f.actionRecommendation} color="#F47D20" />
          )}

          {/* Debug notes (dev only) */}
          {f.notes && (
            <DetailRow icon={<HelpCircle style={{ width: 10, height: 10 }} />} label="Note" value={f.notes} color="#475569" />
          )}

          {/* Fallback indicator */}
          {f.fallbackUsed && (
            <DetailRow icon={<AlertCircle style={{ width: 10, height: 10 }} />} label="Fallback" value="Using fallback source" color="#F47D20" />
          )}
        </div>
      )}
    </div>
  );
}

/* ── Small status badge ── */
function StatusBadge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, color,
      background: `${color}1F`, padding: "1px 5px",
      borderRadius: 3, letterSpacing: ".04em",
    }}>{text}</span>
  );
}

/* ── Detail Row ── */
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
        }}>
          {label}
        </span>
        <div style={{
          fontSize: 10, color, lineHeight: 1.3, marginTop: 1,
          wordBreak: "break-word",
        }}>
          {value}
        </div>
      </div>
    </div>
  );
}
