/**
 * Widget Customization System
 *
 * Manages which information widgets are visible across different pages/sections.
 * Stored in localStorage, keyed by page context (dashboard, client-overview, client-portfolio, etc.)
 *
 * Each "widget" is a named card/panel that can be toggled on/off and reordered.
 */
import { useState, useEffect, useCallback, useMemo } from "react";

const STORAGE_KEY = "od-widget-config";

export interface WidgetDef {
  /** Unique widget id within its context */
  id: string;
  /** Display label shown in the customize panel */
  label: string;
  /** Optional description */
  description?: string;
  /** Default visibility */
  defaultVisible?: boolean;
  /** Minimum column span (1 = half width, 2 = full width) */
  minCols?: 1 | 2;
}

export interface WidgetState {
  visible: boolean;
  order: number;
}

/** Full config for all pages */
type WidgetConfigMap = Record<string, Record<string, WidgetState>>;

function readConfig(): WidgetConfigMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function writeConfig(config: WidgetConfigMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

/**
 * Hook for managing widget visibility and order for a specific page context.
 *
 * @param context - Page context key, e.g. "dashboard", "client-overview", "client-portfolio"
 * @param widgets - Widget definitions for this context
 */
export function useWidgetConfig(context: string, widgets: WidgetDef[]) {
  const defaultState = useMemo(() => {
    const state: Record<string, WidgetState> = {};
    widgets.forEach((w, i) => {
      state[w.id] = { visible: w.defaultVisible !== false, order: i };
    });
    return state;
  }, [widgets]);

  const [config, setConfig] = useState<Record<string, WidgetState>>(() => {
    const all = readConfig();
    if (all[context]) {
      // Merge with defaults to handle new widgets added since last save
      return { ...defaultState, ...all[context] };
    }
    return defaultState;
  });

  // Persist on change
  useEffect(() => {
    const all = readConfig();
    all[context] = config;
    writeConfig(all);
  }, [context, config]);

  const toggle = useCallback((widgetId: string) => {
    setConfig(prev => ({
      ...prev,
      [widgetId]: {
        ...prev[widgetId],
        visible: !prev[widgetId]?.visible,
      },
    }));
  }, []);

  const setOrder = useCallback((widgetId: string, newOrder: number) => {
    setConfig(prev => ({
      ...prev,
      [widgetId]: {
        ...prev[widgetId],
        order: newOrder,
      },
    }));
  }, []);

  const moveUp = useCallback((widgetId: string) => {
    setConfig(prev => {
      const sorted = getSortedIds(prev);
      const idx = sorted.indexOf(widgetId);
      if (idx <= 0) return prev;
      const swapWith = sorted[idx - 1];
      return {
        ...prev,
        [widgetId]: { ...prev[widgetId], order: prev[swapWith].order },
        [swapWith]: { ...prev[swapWith], order: prev[widgetId].order },
      };
    });
  }, []);

  const moveDown = useCallback((widgetId: string) => {
    setConfig(prev => {
      const sorted = getSortedIds(prev);
      const idx = sorted.indexOf(widgetId);
      if (idx >= sorted.length - 1) return prev;
      const swapWith = sorted[idx + 1];
      return {
        ...prev,
        [widgetId]: { ...prev[widgetId], order: prev[swapWith].order },
        [swapWith]: { ...prev[swapWith], order: prev[widgetId].order },
      };
    });
  }, []);

  /** Reorder: move widget from oldIndex to newIndex (for drag-and-drop) */
  const reorder = useCallback((activeId: string, overId: string) => {
    setConfig(prev => {
      const sorted = getSortedIds(prev);
      const oldIdx = sorted.indexOf(activeId);
      const newIdx = sorted.indexOf(overId);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev;
      // Remove active from list and insert at new position
      const reordered = [...sorted];
      reordered.splice(oldIdx, 1);
      reordered.splice(newIdx, 0, activeId);
      // Reassign order values based on new positions
      const next = { ...prev };
      reordered.forEach((id, i) => {
        next[id] = { ...next[id], order: i };
      });
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setConfig(defaultState);
  }, [defaultState]);

  const isVisible = useCallback((widgetId: string) => {
    return config[widgetId]?.visible !== false;
  }, [config]);

  /** Sorted list of visible widget IDs */
  const visibleWidgets = useMemo(() => {
    return getSortedIds(config).filter(id => config[id]?.visible !== false);
  }, [config]);

  /** All widgets sorted by order (for customize panel) */
  const allWidgetsSorted = useMemo(() => {
    const sorted = getSortedIds(config);
    return sorted.map(id => ({
      ...widgets.find(w => w.id === id)!,
      ...config[id],
    }));
  }, [config, widgets]);

  return {
    config,
    toggle,
    moveUp,
    moveDown,
    setOrder,
    reorder,
    reset,
    isVisible,
    visibleWidgets,
    allWidgetsSorted,
  };
}

function getSortedIds(config: Record<string, WidgetState>): string[] {
  return Object.entries(config)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([id]) => id);
}

/* ── Pre-defined Widget Registries ── */

export const DASHBOARD_WIDGETS: WidgetDef[] = [
  { id: "finAI", label: "Fin AI Assistant", description: "AI-powered advisor assistant" },
  { id: "calendar", label: "Outlook Calendar", description: "Live Outlook calendar — today's meetings from Microsoft Graph" },
  { id: "schedule", label: "Schedule", description: "Today's meetings and upcoming calendar" },
  { id: "actionQueue", label: "Action Queue", description: "Prioritized next-best-actions" },
  { id: "calcRuns", label: "Calculator Runs", description: "Recent calculator simulations" },
  { id: "goals", label: "Goals Dashboard", description: "Client goal tracking and funded ratios" },
  { id: "insights", label: "Insights", description: "AI-generated practice insights" },
  { id: "alerts", label: "Alerts & Reminders", description: "Time-sensitive notifications" },
  { id: "recentlyClosed", label: "Recently Closed", description: "Recently closed opportunities" },
  { id: "revenuePipeline", label: "Revenue & Pipeline", description: "Revenue goals, open pipeline, closed deals, and stale opportunities" },
  { id: "pipeline", label: "Pipeline", description: "Open opportunities with amounts, stages, and close dates" },
  { id: "netFlows", label: "Net Flows", description: "Asset flows MTD, QTD, and YTD with trend" },
  { id: "portfolio", label: "Portfolio Monitor", description: "Live portfolio monitoring grid", minCols: 2 },
];

export const CLIENT_OVERVIEW_WIDGETS: WidgetDef[] = [
  { id: "clientInfo", label: "Client Info", description: "Name, contact, address" },
  { id: "clientProfile", label: "Client Profile", description: "Risk tolerance, review schedule, service model" },
  { id: "accountsTreemap", label: "Accounts Treemap", description: "Visual account allocation treemap" },
  { id: "accountsList", label: "Accounts List", description: "Detailed account listing" },
  { id: "householdMembers", label: "Household Members", description: "Family & related contacts" },
  { id: "financialGoals", label: "Financial Goals", description: "Goal tracking and progress" },
  { id: "lifeEvents", label: "Life Events", description: "Timeline of key milestones" },
  { id: "quickActions", label: "Quick Actions", description: "Shortcut action buttons" },
];

export const CLIENT_PORTFOLIO_WIDGETS: WidgetDef[] = [
  { id: "perfSummary", label: "Performance Summary", description: "Period returns vs benchmark" },
  { id: "charts", label: "Chart Switcher", description: "Allocation, holdings, risk, gain/loss, concentration charts" },
  { id: "modelDrift", label: "Model Drift", description: "Target vs actual allocation with tolerance bands" },
  { id: "stressTest", label: "Stress Test", description: "Portfolio stress testing scenarios" },
  { id: "riskGrid", label: "Risk / Holdings / Sectors", description: "Risk distribution, top holdings, product type grid" },
  { id: "perfRisk", label: "Performance & Risk", description: "Return, alpha, Sharpe, drawdown metrics + cash flow" },
  { id: "holdingsTable", label: "Holdings Table", description: "Full sortable holdings with market data" },
  { id: "transactions", label: "Transaction History", description: "Recent buy/sell/dividend activity" },
  { id: "alternatives", label: "Alternative Assets", description: "Properties and non-traditional holdings" },
  { id: "news", label: "Portfolio News", description: "Market news for portfolio holdings" },
];
