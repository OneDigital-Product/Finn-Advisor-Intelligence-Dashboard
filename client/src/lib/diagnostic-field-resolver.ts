/**
 * Canonical Client Detail Field Resolver
 *
 * Converts raw hook data into provenance-enriched field resolutions.
 * Each field carries its value, explicit status, source ownership,
 * the endpoint it was loaded from, and an actionable recommendation.
 *
 * Design rules:
 * - 0 is valid data, not empty
 * - false is valid data where semantically correct
 * - "" / null / undefined = genuinely absent
 * - "loading" = monolithic endpoint hasn't resolved yet
 * - "derived-unavailable" = computed field whose inputs are missing
 */

// ─── Status model ───────────────────────────────────────────────────────────

export type DiagnosticFieldStatus =
  | "present"              // value exists and is usable
  | "loading"              // endpoint that owns this field hasn't resolved yet
  | "missing-at-source"    // source system has no value for this field
  | "unmapped"             // field exists in source but isn't wired to canonical response
  | "not-applicable"       // field doesn't apply to this client type
  | "integration-error"    // API call failed
  | "derived-pending"      // derived field waiting on inputs that are still loading
  | "derived-unavailable"; // derived field whose required inputs are genuinely absent

// ─── Resolution shape ───────────────────────────────────────────────────────

export interface DiagnosticFieldResolution {
  /** Machine key for this field */
  key: string;
  /** Human-readable label */
  label: string;
  /** Raw value (may be null/undefined/0/"") */
  value: unknown;
  /** Formatted display string */
  displayValue: string;
  /** Explicit status — never guessed */
  status: DiagnosticFieldStatus;
  /** Which system owns this field */
  source: "salesforce" | "orion" | "computed" | null;
  /** Salesforce or Orion field path for tracing */
  sourcePath: string | null;
  /** Which endpoint tier provided the data */
  loadedFrom: "summary" | "monolithic" | "portfolio" | "members" | "derived" | null;
  /** True if a secondary source was used instead of the primary */
  fallbackUsed: boolean;
  /** Concrete action to resolve a non-present status */
  actionRecommendation?: string;
  /** Where in the UI this field renders */
  uiLocation?: string;
  /** API endpoint that serves this data */
  apiEndpoint?: string;
  /** Internal notes for debugging */
  notes?: string;
}

// ─── Input shape (what the hook exposes) ────────────────────────────────────

export interface FieldResolverInput {
  /** Merged client object (summary || monolithic) */
  client: Record<string, any> | null | undefined;
  /** cd.tier — computed at summary response root */
  tier: string | null | undefined;
  /** cd.totalAum — merged from summary.aum || monolithic.totalAum */
  totalAum: number | null | undefined;
  /** cd.healthScore — from monolithic only */
  healthScore: number | null | undefined;
  /** cd.accounts */
  accounts: any[] | null | undefined;
  /** cd.holdings */
  holdings: any[] | null | undefined;
  /** cd.tasks */
  tasks: any[] | null | undefined;
  /** cd.upcomingEvents */
  upcomingEvents: any[] | null | undefined;
  /** cd.staleOpportunities */
  staleOpportunities: any[] | null | undefined;
  /** cd.householdMembers */
  householdMembers: any[] | null | undefined;
  /** cd.dataSources — { orion: 'live'|'error', salesforce: 'live'|'error' } */
  dataSources: { orion?: string; salesforce?: string } | null | undefined;
  /** Whether the monolithic/full endpoint is still loading */
  detailLoading: boolean;
  /** Whether the summary endpoint is still loading */
  summaryLoading: boolean;
  /** Whether the portfolio endpoint is still loading */
  portfolioLoading: boolean;
  /** Whether the members endpoint is still loading */
  membersLoading: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** A value is "present" if it's not null, undefined, or empty string. 0 is valid. */
function hasValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string" && v.trim() === "") return false;
  return true;
}

function fmt(v: unknown): string {
  if (!hasValue(v)) return "—";
  if (typeof v === "number") return v.toLocaleString();
  return String(v);
}

// ─── Field definitions ──────────────────────────────────────────────────────

type FieldDef = {
  key: string;
  label: string;
  source: "salesforce" | "orion" | "computed";
  loadedFrom: DiagnosticFieldResolution["loadedFrom"];
  sourcePath: string;
  apiEndpoint: string;
  uiLocation: string;
  resolve: (input: FieldResolverInput) => {
    value: unknown;
    status: DiagnosticFieldStatus;
    fallbackUsed: boolean;
    actionRecommendation?: string;
    notes?: string;
  };
};

const FIELD_DEFS: FieldDef[] = [
  // ── CRM-owned: Identity ──────────────────────────────────────────────────

  {
    key: "phone",
    label: "Phone",
    source: "salesforce",
    loadedFrom: "summary",
    sourcePath: "summary.client.phone → SF Account.Phone || PersonMobilePhone || PrimaryContact.Phone",
    apiEndpoint: "/api/clients/[id]/summary",
    uiLocation: "Client header contact bar",
    resolve: ({ client, summaryLoading }) => {
      const v = client?.phone;
      if (!hasValue(v) && summaryLoading) return { value: v, status: "loading", fallbackUsed: false };
      if (!hasValue(v)) return {
        value: v, status: "missing-at-source", fallbackUsed: false,
        actionRecommendation: "Add Phone to the Account record in Salesforce (Account.Phone or PersonMobilePhone)",
      };
      return { value: v, status: "present", fallbackUsed: false };
    },
  },

  {
    key: "occupation",
    label: "Occupation",
    source: "salesforce",
    loadedFrom: "summary",
    sourcePath: "summary.client.occupation → SF PersonTitle || Industry || FinServ__Occupation__c",
    apiEndpoint: "/api/clients/[id]/summary",
    uiLocation: "Client overview card",
    resolve: ({ client, summaryLoading }) => {
      const v = client?.occupation;
      if (!hasValue(v) && summaryLoading) return { value: v, status: "loading", fallbackUsed: false };
      if (!hasValue(v)) return {
        value: v, status: "missing-at-source", fallbackUsed: false,
        actionRecommendation: "Add Occupation in Salesforce (PersonTitle, Industry, or FinServ__Occupation__c) — used for suitability",
      };
      return { value: v, status: "present", fallbackUsed: false };
    },
  },

  // ── CRM-owned: Review lifecycle ──────────────────────────────────────────

  {
    key: "reviewFrequency",
    label: "Review Frequency",
    source: "salesforce",
    loadedFrom: "summary",
    sourcePath: "summary.client.reviewFrequency → SF FinServ__ReviewFrequency__c",
    apiEndpoint: "/api/clients/[id]/summary",
    uiLocation: "Client overview card & proactive signals",
    resolve: ({ client, summaryLoading }) => {
      const v = client?.reviewFrequency;
      if (!hasValue(v) && summaryLoading) return { value: v, status: "loading", fallbackUsed: false };
      if (!hasValue(v)) return {
        value: v, status: "missing-at-source", fallbackUsed: false,
        actionRecommendation: "Set FinServ__ReviewFrequency__c (Quarterly / Semi-Annual / Annual) in Salesforce",
      };
      return { value: v, status: "present", fallbackUsed: false };
    },
  },

  {
    key: "lastReview",
    label: "Last Review",
    source: "salesforce",
    loadedFrom: "summary",
    sourcePath: "summary.client.lastReview → SF FinServ__LastReview__c",
    apiEndpoint: "/api/clients/[id]/summary",
    uiLocation: "Client overview card & overdue review signals",
    resolve: ({ client, summaryLoading }) => {
      const v = client?.lastReview;
      if (!hasValue(v) && summaryLoading) return { value: v, status: "loading", fallbackUsed: false };
      if (!hasValue(v)) return {
        value: v, status: "missing-at-source", fallbackUsed: false,
        actionRecommendation: "Update FinServ__LastReview__c after each client review meeting",
      };
      return { value: v, status: "present", fallbackUsed: false };
    },
  },

  {
    key: "nextReview",
    label: "Next Review",
    source: "salesforce",
    loadedFrom: "summary",
    sourcePath: "summary.client.nextReview → SF FinServ__NextReview__c",
    apiEndpoint: "/api/clients/[id]/summary",
    uiLocation: "Client overview card & calendar",
    resolve: ({ client, summaryLoading }) => {
      const v = client?.nextReview;
      if (!hasValue(v) && summaryLoading) return { value: v, status: "loading", fallbackUsed: false };
      if (!hasValue(v)) return {
        value: v, status: "missing-at-source", fallbackUsed: false,
        actionRecommendation: "Schedule FinServ__NextReview__c — drives proactive outreach signals",
      };
      return { value: v, status: "present", fallbackUsed: false };
    },
  },

  // ── CRM-owned: Monolithic-only ───────────────────────────────────────────

  {
    key: "serviceModel",
    label: "Service Model",
    source: "salesforce",
    loadedFrom: "monolithic",
    sourcePath: "monolithic.client.serviceModel → SF FinServ__ServiceModel__c",
    apiEndpoint: "/api/clients/[id]",
    uiLocation: "Client overview card",
    resolve: ({ client, detailLoading }) => {
      const v = client?.serviceModel;
      // serviceModel is only in the monolithic response — not the summary
      if (!hasValue(v) && detailLoading) return {
        value: v, status: "loading", fallbackUsed: false,
        notes: "serviceModel is not in the summary endpoint — waiting for monolithic /api/clients/[id]",
      };
      if (!hasValue(v)) return {
        value: v, status: "missing-at-source", fallbackUsed: false,
        actionRecommendation: "Set FinServ__ServiceModel__c (Wealth / Premier / Standard) in Salesforce",
      };
      return { value: v, status: "present", fallbackUsed: false };
    },
  },

  // ── Orion-owned: Portfolio ───────────────────────────────────────────────

  {
    key: "totalAum",
    label: "Total AUM",
    source: "orion",
    loadedFrom: "summary",
    sourcePath: "summary.aum → Orion name-match AUM || SF FinServ__TotalFinancialAccounts__c fallback",
    apiEndpoint: "/api/clients/[id]/summary",
    uiLocation: "Client header AUM badge & portfolio section",
    resolve: ({ totalAum, summaryLoading, dataSources }) => {
      const v = totalAum;
      if (!hasValue(v) && summaryLoading) return { value: v, status: "loading", fallbackUsed: false };
      if (dataSources?.orion === "error") return {
        value: v, status: "integration-error", fallbackUsed: false,
        actionRecommendation: "Orion integration returned an error — check MuleSoft EAPI logs",
        notes: "dataSources.orion === 'error'",
      };
      // 0 is valid — means the client genuinely has $0 AUM
      if (v === null || v === undefined) return {
        value: v, status: "missing-at-source", fallbackUsed: false,
        actionRecommendation: "Verify Orion portfolio is linked — check MuleSoft EAPI /portfolio endpoint",
      };
      return { value: v, status: "present", fallbackUsed: false };
    },
  },

  // ── Orion-owned: Income (monolithic only) ────────────────────────────────

  {
    key: "annualIncome",
    label: "Est. Annual Income",
    source: "orion",
    loadedFrom: "monolithic",
    sourcePath: "monolithic.client.annualIncome → Orion Reporting/Scope EstimatedAnnualIncome",
    apiEndpoint: "/api/clients/[id]",
    uiLocation: "Client overview card & withdrawal analysis",
    resolve: ({ client, detailLoading }) => {
      // annualIncome is patched onto client in the monolithic endpoint from Orion Reporting/Scope
      const v = client?.annualIncome || client?.estimatedAnnualIncome;
      if (!hasValue(v) && detailLoading) return {
        value: v, status: "loading", fallbackUsed: false,
        notes: "annualIncome only available from monolithic — sourced from Orion Reporting/Scope",
      };
      // 0 is technically possible (no income-generating holdings) but the server returns 0
      // when Orion Reporting/Scope has no data. Treat 0 here as "present but zero."
      if (v === 0) return {
        value: v, status: "present", fallbackUsed: false,
        notes: "Orion Reporting/Scope returned 0 — may indicate no income-generating holdings or no Scope data",
      };
      if (!hasValue(v)) return {
        value: v, status: "missing-at-source", fallbackUsed: false,
        actionRecommendation: "Check Orion Reporting Scope for EstimatedAnnualIncome — may need Scope configuration",
      };
      return { value: v, status: "present", fallbackUsed: false };
    },
  },

  // ── App-derived ──────────────────────────────────────────────────────────

  {
    key: "tier",
    label: "Tier",
    source: "computed",
    loadedFrom: "derived",
    sourcePath: "summary.tier → aumTier(summary.aum) — derived from AUM, not stored",
    apiEndpoint: "/api/clients/[id]/summary",
    uiLocation: "Client header badge & clients list",
    resolve: ({ tier, totalAum, summaryLoading }) => {
      const v = tier;
      if (!hasValue(v) && summaryLoading) return { value: v, status: "loading", fallbackUsed: false };
      // Tier is derived from AUM. If AUM is missing/null, tier can't be computed.
      if (!hasValue(v) && !hasValue(totalAum)) return {
        value: v, status: "derived-unavailable", fallbackUsed: false,
        actionRecommendation: "Tier is auto-computed from AUM — resolve AUM source first",
        notes: "aumTier() requires a non-zero AUM to produce A/B/C",
      };
      if (!hasValue(v)) return {
        value: v, status: "derived-unavailable", fallbackUsed: false,
        actionRecommendation: "Tier derivation failed — check summary endpoint aumTier() logic",
      };
      return { value: v, status: "present", fallbackUsed: false };
    },
  },

  {
    key: "healthScore",
    label: "Health Score",
    source: "computed",
    loadedFrom: "monolithic",
    sourcePath: "monolithic.healthScore → calculateHealthScore() in fallback path; hardcoded 0 in SF path",
    apiEndpoint: "/api/clients/[id]",
    uiLocation: "Client header health badge & clients list",
    resolve: ({ healthScore, detailLoading, dataSources }) => {
      const v = healthScore;
      // healthScore is ONLY in the monolithic endpoint
      if (v === null || v === undefined) {
        if (detailLoading) return {
          value: v, status: "loading", fallbackUsed: false,
          notes: "healthScore only comes from monolithic endpoint — still loading",
        };
        return {
          value: v, status: "derived-unavailable", fallbackUsed: false,
          actionRecommendation: "Health Score requires AUM, review dates, and activity data — populate upstream fields",
        };
      }
      // 0 is valid — the SF path intentionally hardcodes 0 (scoring temporarily disabled)
      // The local DB fallback path actually computes it.
      if (v === 0) {
        const isSfPath = dataSources?.salesforce === "live";
        return {
          value: v, status: "present", fallbackUsed: false,
          notes: isSfPath
            ? "healthScore hardcoded to 0 in Salesforce/MuleSoft path — scoring temporarily disabled (see route.ts:1020)"
            : "healthScore computed by calculateHealthScore() — result was 0",
        };
      }
      return { value: v, status: "present", fallbackUsed: false };
    },
  },
];

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Resolve all in-scope diagnostic fields against current hook state.
 * Returns a deterministic, provenance-enriched array.
 */
export function resolveClientDiagnosticFields(
  input: FieldResolverInput,
): DiagnosticFieldResolution[] {
  return FIELD_DEFS.map((def) => {
    const resolution = def.resolve(input);
    return {
      key: def.key,
      label: def.label,
      value: resolution.value,
      displayValue: fmt(resolution.value),
      status: resolution.status,
      source: def.source,
      sourcePath: def.sourcePath,
      loadedFrom: def.loadedFrom,
      fallbackUsed: resolution.fallbackUsed,
      actionRecommendation: resolution.actionRecommendation,
      uiLocation: def.uiLocation,
      apiEndpoint: def.apiEndpoint,
      notes: resolution.notes,
    };
  });
}

/**
 * Get all field definitions for reference (e.g., field inventory report).
 */
export function getFieldInventory() {
  return FIELD_DEFS.map(({ key, label, source, loadedFrom, sourcePath, apiEndpoint, uiLocation }) => ({
    key, label, source, loadedFrom, sourcePath, apiEndpoint, uiLocation,
  }));
}
