import { useQuery } from "@tanstack/react-query";
import { P } from "@/styles/tokens";

// ---------------------------------------------------------------------------
// Server response shape
// ---------------------------------------------------------------------------
// The API response shape changed — integrations are now nested under
// `integrations.*` and use `status: "ok"` instead of `connected: boolean`.
// We support both the old (flat) and new (nested) shapes for safety.
// ---------------------------------------------------------------------------

interface WidgetSource {
  source: string;
  live: boolean;
}

/** Legacy (flat) shape */
interface LegacyDataSourceStatus {
  mulesoft?: { enabled?: boolean; connected?: boolean };
  salesforce?: { enabled?: boolean; connected?: boolean };
  orion?: { enabled?: boolean; connected?: boolean };
  activeProvider?: string;
  overallMode?: "live" | "mock";
  widgetSources?: Record<string, WidgetSource>;
}

/** Current API shape from /api/data-sources */
interface CurrentDataSourceStatus {
  status?: "healthy" | "degraded" | "down";
  integrations?: {
    mulesoft?: { enabled?: boolean; token?: { status?: string }; [k: string]: unknown };
    orion?: { status?: string; [k: string]: unknown };
    salesforce?: { status?: string; [k: string]: unknown };
  };
  activeProvider?: string;
  mode?: "live" | "mock";
}

export type DataSourceStatus = LegacyDataSourceStatus & CurrentDataSourceStatus;

// ---------------------------------------------------------------------------
// Helpers to normalise either response shape into a connected boolean
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

function getOverallMode(ds?: DataSourceStatus): "live" | "mock" | undefined {
  return ds?.overallMode ?? ds?.mode;
}

export function useDataSources() {
  return useQuery<DataSourceStatus>({
    queryKey: ["/api/data-sources"],
    staleTime: 5 * 60 * 1000, // Data sources change rarely — check every 5 min
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
  });
}

// ---------------------------------------------------------------------------
// Badge — explicit LIVE DATA vs MOCK DATA
// ---------------------------------------------------------------------------

export type DataSourceType =
  | "portfolio"
  | "household"
  | "meetings"
  | "alerts"
  | "insights"
  | "actions"
  | "goals"
  | "tasks"
  | "calcs"
  | "fin"
  | "scheduling"
  | "recentlyClosed";

interface DataSourceBadgeProps {
  source: DataSourceType;
  compact?: boolean;
}

function isLive(source: DataSourceType, ds?: DataSourceStatus): boolean {
  if (ds?.widgetSources?.[source]) return ds.widgetSources[source].live;
  if (!ds) return false;

  const mode = getOverallMode(ds);

  // If the overall mode explicitly says "live", trust it for most sources
  if (source === "portfolio") {
    if (ds.activeProvider === "mulesoft") return isMulesoftConnected(ds);
    if (ds.activeProvider === "orion") return isOrionConnected(ds);
  }

  // For household / Salesforce-backed sources
  if (source === "household" || source === "tasks" || source === "meetings") {
    return isSalesforceConnected(ds);
  }

  // Fallback: use overall mode
  return mode === "live";
}

export function DataSourceBadge({ source, compact = false }: DataSourceBadgeProps) {
  const { data: ds } = useDataSources();
  const live = isLive(source, ds);

  const label = live ? "LIVE DATA" : "MOCK DATA";
  const dotColor = live ? P.grn : P.amb;
  const bgColor = live ? P.gL : P.aL;
  const textColor = live ? "#2D6B47" : P.amb;
  const tooltip = live
    ? `Real-time data from ${ds?.widgetSources?.[source]?.source || "API"}`
    : `Sample / seed data — not from a live API`;

  const dotStyle: React.CSSProperties = {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: dotColor,
    boxShadow: live ? `0 0 6px ${dotColor}` : "none",
    animation: live ? "breathe 2s infinite" : "none",
    flexShrink: 0,
  };

  if (compact) {
    return (
      <span
        title={tooltip}
        aria-label={`${source} data source: ${label}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "1px 6px",
          borderRadius: "var(--radius-full)",
          fontSize: 9,
          fontWeight: 700,
          fontFamily: "var(--font-data)",
          color: textColor,
          background: bgColor,
          letterSpacing: "0.05em",
          cursor: "default",
          userSelect: "none",
        }}
      >
        <span style={dotStyle} aria-hidden="true" />
        {label}
      </span>
    );
  }

  return (
    <span
      title={tooltip}
      aria-label={`${source} data source: ${label}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 10px",
        borderRadius: "var(--radius-full)",
        fontSize: 10,
        fontWeight: 700,
        fontFamily: "var(--font-data)",
        color: textColor,
        background: bgColor,
        border: `1px solid ${dotColor}14`,
        letterSpacing: "0.05em",
        cursor: "default",
        userSelect: "none",
      }}
    >
      <span style={dotStyle} aria-hidden="true" />
      {label}
    </span>
  );
}
