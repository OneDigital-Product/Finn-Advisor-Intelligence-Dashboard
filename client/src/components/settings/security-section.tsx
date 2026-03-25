"use client";

import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import {
  Shield, Clock, Monitor, MapPin, CheckCircle2, AlertCircle,
  Lock, Fingerprint, Key, Globe,
} from "lucide-react";

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

function StatusBadge({ status, label }: { status: "active" | "inactive" | "warning"; label: string }) {
  const colors = {
    active: { bg: "rgba(142, 185, 53, 0.12)", color: "var(--color-success)", icon: CheckCircle2 },
    inactive: { bg: "rgba(148, 163, 184, 0.12)", color: "var(--color-text-muted)", icon: AlertCircle },
    warning: { bg: "rgba(255, 198, 11, 0.12)", color: "var(--color-warning)", icon: AlertCircle },
  };
  const c = colors[status];
  const Icon = c.icon;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.color,
    }}>
      <Icon size={11} />
      {label}
    </div>
  );
}

export function SecuritySection() {
  const { user } = useAuth();
  const { settings, updateSetting } = useSettings();

  const loginHistory = [
    { time: "Today, 9:15 AM", device: "Chrome on macOS", location: "New York, NY", status: "active" as const },
    { time: "Yesterday, 4:32 PM", device: "Chrome on macOS", location: "New York, NY", status: "inactive" as const },
    { time: "Mar 22, 2:10 PM", device: "Safari on iOS", location: "Newark, NJ", status: "inactive" as const },
  ];

  return (
    <div>
      {/* Current session */}
      <div style={{
        background: "var(--color-surface-raised)", borderRadius: 12,
        border: "1px solid var(--color-border-subtle)", padding: 20, marginBottom: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "rgba(142, 185, 53, 0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Monitor size={16} style={{ color: "var(--color-success)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Current Session</div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 1 }}>
              Signed in as {user?.email || "unknown"}
            </div>
          </div>
          <StatusBadge status="active" label="Active" />
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10,
        }}>
          <div style={{
            padding: "10px 12px", background: "var(--color-surface)",
            borderRadius: 6, border: "1px solid var(--color-border-subtle)",
          }}>
            <div style={{ fontSize: 10, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Device</div>
            <div style={{ fontSize: 12, color: "var(--color-text-primary)", marginTop: 3, fontWeight: 500 }}>
              {typeof navigator !== "undefined" && navigator.userAgent.includes("Mac") ? "macOS" : "Desktop"} Browser
            </div>
          </div>
          <div style={{
            padding: "10px 12px", background: "var(--color-surface)",
            borderRadius: 6, border: "1px solid var(--color-border-subtle)",
          }}>
            <div style={{ fontSize: 10, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Auth Method</div>
            <div style={{ fontSize: 12, color: "var(--color-text-primary)", marginTop: 3, fontWeight: 500 }}>
              Email + Password
            </div>
          </div>
          <div style={{
            padding: "10px 12px", background: "var(--color-surface)",
            borderRadius: 6, border: "1px solid var(--color-border-subtle)",
          }}>
            <div style={{ fontSize: 10, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Encryption</div>
            <div style={{ fontSize: 12, color: "var(--color-text-primary)", marginTop: 3, fontWeight: 500 }}>
              Iron Session (AES-256)
            </div>
          </div>
        </div>
      </div>

      {/* Session settings */}
      <div style={{
        background: "var(--color-surface-raised)", borderRadius: 12,
        border: "1px solid var(--color-border-subtle)", padding: "4px 20px", marginBottom: 24,
      }}>
        <h3 style={{
          fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600,
          color: "var(--color-text-primary)", margin: "16px 0 4px", letterSpacing: "0.02em",
        }}>
          Session Settings
        </h3>

        <SettingRow label="Auto-Logout Timeout" description="Automatically sign out after inactivity">
          <select
            value={settings.sessionTimeout}
            onChange={e => updateSetting("sessionTimeout", Number(e.target.value))}
            style={{
              padding: "6px 12px", borderRadius: 6, border: "1px solid var(--color-border)",
              background: "var(--color-surface)", color: "var(--color-text-primary)",
              fontSize: 12, fontFamily: "inherit", cursor: "pointer",
            }}
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={0}>Never</option>
          </select>
        </SettingRow>
      </div>

      {/* Security features */}
      <div style={{
        background: "var(--color-surface-raised)", borderRadius: 12,
        border: "1px solid var(--color-border-subtle)", padding: "4px 20px", marginBottom: 24,
      }}>
        <h3 style={{
          fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600,
          color: "var(--color-text-primary)", margin: "16px 0 4px", letterSpacing: "0.02em",
        }}>
          Security Features
        </h3>

        <SettingRow label="Two-Factor Authentication" description="Additional verification on login">
          <StatusBadge status="inactive" label="Not Configured" />
        </SettingRow>
        <SettingRow label="SSO / SAML" description="Single Sign-On via identity provider">
          <StatusBadge status="inactive" label="Not Available" />
        </SettingRow>
        <SettingRow label="Session Encryption" description="All session data encrypted at rest">
          <StatusBadge status="active" label="Enabled" />
        </SettingRow>
      </div>

      {/* Login history */}
      <div style={{
        background: "var(--color-surface-raised)", borderRadius: 12,
        border: "1px solid var(--color-border-subtle)", padding: "4px 20px",
      }}>
        <h3 style={{
          fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600,
          color: "var(--color-text-primary)", margin: "16px 0 8px", letterSpacing: "0.02em",
        }}>
          Recent Login Activity
        </h3>

        {loginHistory.map((entry, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 0",
            borderBottom: i < loginHistory.length - 1 ? "1px solid var(--color-border-subtle)" : "none",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6, flexShrink: 0,
              background: entry.status === "active" ? "rgba(142, 185, 53, 0.12)" : "rgba(148, 163, 184, 0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Monitor size={13} style={{
                color: entry.status === "active" ? "var(--color-success)" : "var(--color-text-muted)",
              }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>
                {entry.device}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 1, display: "flex", alignItems: "center", gap: 4 }}>
                <MapPin size={9} /> {entry.location}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{entry.time}</div>
              {entry.status === "active" && (
                <div style={{ fontSize: 10, color: "var(--color-success)", fontWeight: 600, marginTop: 1 }}>Current</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
