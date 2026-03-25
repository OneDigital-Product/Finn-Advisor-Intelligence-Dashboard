"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/hooks/use-settings";
import { GripVertical, Eye, EyeOff, RotateCcw } from "lucide-react";

const DASHBOARD_WIDGETS = [
  { id: "schedule", label: "Today's Schedule", description: "Daily calendar view" },
  { id: "action-queue", label: "Action Queue", description: "Open tasks and follow-ups" },
  { id: "nba", label: "Next Best Actions", description: "AI-driven engagement signals" },
  { id: "alerts", label: "Alerts Panel", description: "Cases, opportunities, and alerts" },
  { id: "meetings", label: "Upcoming Meetings", description: "Calendar widget" },
  { id: "opportunities", label: "Recently Closed", description: "Opportunity tracking" },
  { id: "pipeline", label: "Open Pipeline", description: "Opportunity pipeline visualization" },
  { id: "outlook", label: "Outlook Calendar", description: "Integrated Microsoft calendar" },
  { id: "fin-quick", label: "Fin Quick Action", description: "AI copilot widget" },
  { id: "stats", label: "Stats Cards", description: "Summary metric row" },
  { id: "hero", label: "Market Hero", description: "Wall Street hero section" },
  { id: "portfolio-monitor", label: "Portfolio Monitor", description: "Live portfolio tracking" },
];

const DASHBOARD_TABS = [
  { id: "my-day", label: "My Day" },
  { id: "portfolio-monitor", label: "Portfolio Monitor" },
  { id: "action-queue", label: "Action Queue" },
  { id: "alerts", label: "Alerts" },
  { id: "clients", label: "Clients" },
  { id: "opportunities", label: "Opportunities" },
  { id: "reports", label: "Reports" },
];

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "14px 0", borderBottom: "1px solid var(--color-border-subtle)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{label}</div>
        {description && <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0, marginLeft: 16 }}>{children}</div>
    </div>
  );
}

export function DashboardSection() {
  const { settings, updateSetting } = useSettings();
  const [widgetConfig, setWidgetConfig] = useState<Record<string, boolean>>({});

  // Load widget config from localStorage (matches existing useWidgetConfig pattern)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("od-widget-config");
      if (raw) setWidgetConfig(JSON.parse(raw));
    } catch {}
  }, []);

  const toggleWidget = (id: string) => {
    const next = { ...widgetConfig, [id]: !widgetConfig[id] };
    setWidgetConfig(next);
    localStorage.setItem("od-widget-config", JSON.stringify(next));
  };

  const resetWidgets = () => {
    setWidgetConfig({});
    localStorage.removeItem("od-widget-config");
  };

  return (
    <div>
      {/* Default tab */}
      <div style={{
        background: "var(--color-surface-raised)", borderRadius: 12,
        border: "1px solid var(--color-border-subtle)", padding: "4px 20px", marginBottom: 24,
      }}>
        <h3 style={{
          fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600,
          color: "var(--color-text-primary)", margin: "16px 0 4px", letterSpacing: "0.02em",
        }}>
          Defaults
        </h3>

        <SettingRow label="Default Landing Tab" description="Which tab to show when you open the dashboard">
          <select
            value={settings.defaultTab}
            onChange={e => updateSetting("defaultTab", e.target.value)}
            style={{
              padding: "6px 12px", borderRadius: 6, border: "1px solid var(--color-border)",
              background: "var(--color-surface)", color: "var(--color-text-primary)",
              fontSize: 12, fontFamily: "inherit", cursor: "pointer",
            }}
          >
            {DASHBOARD_TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </SettingRow>

        <SettingRow label="Widget Density" description="Spacing between dashboard cards">
          <div style={{ display: "flex", gap: 6 }}>
            {(["compact", "comfortable"] as const).map(d => (
              <button
                key={d}
                onClick={() => updateSetting("widgetDensity", d)}
                style={{
                  padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                  border: `1px solid ${settings.widgetDensity === d ? "var(--color-brand-primary)" : "var(--color-border)"}`,
                  background: settings.widgetDensity === d ? "rgba(0, 120, 162, 0.12)" : "transparent",
                  color: settings.widgetDensity === d ? "var(--color-brand-secondary)" : "var(--color-text-muted)",
                  cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
                  transition: "all .15s ease",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow label="Auto-Refresh Interval" description="How often to refresh live data (0 = off)">
          <select
            value={settings.autoRefreshInterval}
            onChange={e => updateSetting("autoRefreshInterval", Number(e.target.value))}
            style={{
              padding: "6px 12px", borderRadius: 6, border: "1px solid var(--color-border)",
              background: "var(--color-surface)", color: "var(--color-text-primary)",
              fontSize: 12, fontFamily: "inherit", cursor: "pointer",
            }}
          >
            <option value={0}>Off</option>
            <option value={30}>30 seconds</option>
            <option value={60}>1 minute</option>
            <option value={300}>5 minutes</option>
            <option value={600}>10 minutes</option>
          </select>
        </SettingRow>
      </div>

      {/* Widget toggles */}
      <div style={{
        background: "var(--color-surface-raised)", borderRadius: 12,
        border: "1px solid var(--color-border-subtle)", padding: "4px 20px", marginBottom: 24,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0 8px" }}>
          <h3 style={{
            fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600,
            color: "var(--color-text-primary)", letterSpacing: "0.02em", margin: 0,
          }}>
            Widget Visibility
          </h3>
          <button
            onClick={resetWidgets}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "4px 10px", borderRadius: 6, fontSize: 11,
              border: "1px solid var(--color-border)", background: "transparent",
              color: "var(--color-text-tertiary)", cursor: "pointer",
              fontFamily: "inherit", transition: "all .15s ease",
            }}
          >
            <RotateCcw size={11} />
            Reset
          </button>
        </div>

        {DASHBOARD_WIDGETS.map((widget) => {
          const isHidden = widgetConfig[widget.id] === false;
          return (
            <div
              key={widget.id}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 0", borderBottom: "1px solid var(--color-border-subtle)",
              }}
            >
              <GripVertical size={14} style={{ color: "var(--color-text-muted)", cursor: "grab", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 500,
                  color: isHidden ? "var(--color-text-muted)" : "var(--color-text-primary)",
                  transition: "color .15s ease",
                }}>
                  {widget.label}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 1 }}>
                  {widget.description}
                </div>
              </div>
              <button
                onClick={() => toggleWidget(widget.id)}
                style={{
                  width: 32, height: 32, borderRadius: 6, border: "none",
                  background: isHidden ? "rgba(239, 68, 68, 0.08)" : "rgba(142, 185, 53, 0.12)",
                  color: isHidden ? "#ef4444" : "var(--color-success)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "all .15s ease",
                }}
              >
                {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
