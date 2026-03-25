"use client";

import { useSettings } from "@/hooks/use-settings";
import { useTheme } from "@/components/theme-provider";
import { Sun, Moon, Check, Type, Maximize2, Minimize2, Zap, ZapOff } from "lucide-react";

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

const ACCENT_COLORS = [
  { id: "#0078A2", label: "OneDigital Blue" },
  { id: "#8EB935", label: "Success Green" },
  { id: "#7F77DD", label: "Purple" },
  { id: "#F47D20", label: "Orange" },
  { id: "#FFC60B", label: "Gold" },
  { id: "#ef4444", label: "Red" },
];

export function AppearanceSection() {
  const { theme, toggleTheme } = useTheme();
  const { settings, updateSetting } = useSettings();

  return (
    <div>
      {/* Theme */}
      <div style={{
        background: "var(--color-surface-raised)", borderRadius: 12,
        border: "1px solid var(--color-border-subtle)", padding: "4px 20px", marginBottom: 24,
      }}>
        <h3 style={{
          fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600,
          color: "var(--color-text-primary)", margin: "16px 0 4px", letterSpacing: "0.02em",
        }}>
          Theme
        </h3>

        <div style={{ padding: "14px 0", borderBottom: "1px solid var(--color-border-subtle)" }}>
          <div style={{ display: "flex", gap: 12 }}>
            {(["dark", "light"] as const).map(t => (
              <button
                key={t}
                onClick={() => { if (theme !== t) toggleTheme(); }}
                style={{
                  flex: 1, padding: "16px", borderRadius: 10, cursor: "pointer",
                  border: `2px solid ${theme === t ? "var(--color-brand-primary)" : "var(--color-border)"}`,
                  background: t === "dark" ? "#0d1117" : "#f5f3ef",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  transition: "all .15s ease", position: "relative",
                }}
              >
                {theme === t && (
                  <div style={{
                    position: "absolute", top: 6, right: 6, width: 18, height: 18,
                    borderRadius: "50%", background: "var(--color-brand-primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Check size={10} color="#fff" />
                  </div>
                )}
                {t === "dark" ? <Moon size={20} color="#94A3B8" /> : <Sun size={20} color="#f59e0b" />}
                <div style={{
                  fontSize: 12, fontWeight: 600, textTransform: "capitalize",
                  color: t === "dark" ? "#f0f2f5" : "#1e293b",
                }}>
                  {t}
                </div>
                <div style={{ display: "flex", gap: 3 }}>
                  {(t === "dark" ? ["#0d1117", "#161b27", "#1d2333", "#232b3e"] : ["#f5f3ef", "#e8e4de", "#d5d0c9", "#c2bdb6"]).map(c => (
                    <div key={c} style={{ width: 16, height: 8, borderRadius: 2, background: c }} />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Typography & Display */}
      <div style={{
        background: "var(--color-surface-raised)", borderRadius: 12,
        border: "1px solid var(--color-border-subtle)", padding: "4px 20px", marginBottom: 24,
      }}>
        <h3 style={{
          fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600,
          color: "var(--color-text-primary)", margin: "16px 0 4px", letterSpacing: "0.02em",
        }}>
          Typography & Display
        </h3>

        <SettingRow label="Font Size" description="Scale the UI text size">
          <div style={{ display: "flex", gap: 6 }}>
            {(["small", "default", "large"] as const).map(s => (
              <button
                key={s}
                onClick={() => updateSetting("fontSize", s)}
                style={{
                  padding: "4px 14px", borderRadius: 20, fontWeight: 500,
                  fontSize: s === "small" ? 11 : s === "large" ? 14 : 12,
                  border: `1px solid ${settings.fontSize === s ? "var(--color-brand-primary)" : "var(--color-border)"}`,
                  background: settings.fontSize === s ? "rgba(0, 120, 162, 0.12)" : "transparent",
                  color: settings.fontSize === s ? "var(--color-brand-secondary)" : "var(--color-text-muted)",
                  cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
                  transition: "all .15s ease",
                }}
              >
                {s === "small" ? <><Minimize2 size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />Small</> :
                 s === "large" ? <><Maximize2 size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />Large</> :
                 <><Type size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />Default</>}
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow label="Reduce Motion" description="Disable animations and transitions">
          <button
            onClick={() => updateSetting("reduceMotion", !settings.reduceMotion)}
            style={{
              width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
              background: settings.reduceMotion ? "var(--color-brand-primary)" : "var(--color-border)",
              position: "relative", transition: "background .2s ease",
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: "50%", background: "#fff",
              position: "absolute", top: 3,
              left: settings.reduceMotion ? 23 : 3,
              transition: "left .2s ease",
            }} />
          </button>
        </SettingRow>
      </div>

      {/* Accent Color */}
      <div style={{
        background: "var(--color-surface-raised)", borderRadius: 12,
        border: "1px solid var(--color-border-subtle)", padding: "4px 20px", marginBottom: 24,
      }}>
        <h3 style={{
          fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600,
          color: "var(--color-text-primary)", margin: "16px 0 4px", letterSpacing: "0.02em",
        }}>
          Accent Color
        </h3>
        <div style={{ padding: "14px 0", display: "flex", gap: 10, flexWrap: "wrap" }}>
          {ACCENT_COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => updateSetting("accentColor", c.id)}
              title={c.label}
              style={{
                width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer",
                background: c.id, position: "relative",
                outline: settings.accentColor === c.id ? "2px solid var(--color-text-primary)" : "2px solid transparent",
                outlineOffset: 2, transition: "all .15s ease",
              }}
            >
              {settings.accentColor === c.id && (
                <Check size={14} color="#fff" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
              )}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-muted)", paddingBottom: 14 }}>
          Selected: {ACCENT_COLORS.find(c => c.id === settings.accentColor)?.label || settings.accentColor}
        </div>
      </div>
    </div>
  );
}
