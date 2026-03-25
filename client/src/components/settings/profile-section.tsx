"use client";

import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { useRouter } from "next/navigation";
import { LogOut, Mail, Shield, Clock, Bell, BellOff, User, Briefcase } from "lucide-react";

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

function InfoPill({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "10px 14px", background: "var(--color-surface-raised)",
      borderRadius: 8, border: "1px solid var(--color-border-subtle)",
    }}>
      <Icon size={14} style={{ color: "var(--color-brand-secondary)", flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 10, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
        <div style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500, marginTop: 1 }}>{value}</div>
      </div>
    </div>
  );
}

export function ProfileSection() {
  const { user, logout } = useAuth();
  const { settings, updateSetting } = useSettings();
  const router = useRouter();

  const initials = user?.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div>
      {/* Profile card */}
      <div style={{
        background: "var(--color-surface-raised)", borderRadius: 12,
        border: "1px solid var(--color-border-subtle)", padding: 24, marginBottom: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "var(--color-brand-deep)", border: "3px solid var(--color-brand-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Oswald', sans-serif", fontSize: 22, fontWeight: 700,
            color: "var(--color-brand-secondary)",
          }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)" }}>
              {user?.name || "Unknown User"}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>
              {user?.title || user?.type || "Advisor"}
            </div>
          </div>
          <div style={{
            padding: "4px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.06em",
            background: user?.type === "advisor" ? "rgba(142, 185, 53, 0.15)" : "rgba(0, 120, 162, 0.15)",
            color: user?.type === "advisor" ? "var(--color-success)" : "var(--color-brand-secondary)",
          }}>
            {user?.type || "advisor"}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <InfoPill icon={Mail} label="Email" value={user?.email || "—"} />
          <InfoPill icon={Briefcase} label="Role" value={user?.title || user?.type || "Advisor"} />
          <InfoPill icon={Shield} label="Account ID" value={user?.id?.slice(0, 12) + "…" || "—"} />
          <InfoPill icon={Clock} label="Session" value="Active" />
        </div>
      </div>

      {/* Notification settings */}
      <div style={{
        background: "var(--color-surface-raised)", borderRadius: 12,
        border: "1px solid var(--color-border-subtle)", padding: "4px 20px", marginBottom: 24,
      }}>
        <h3 style={{
          fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600,
          color: "var(--color-text-primary)", margin: "16px 0 4px", letterSpacing: "0.02em",
        }}>
          Notifications
        </h3>

        <SettingRow label="Email Digest" description="How often to receive summary emails">
          <select
            value={settings.emailDigest}
            onChange={e => updateSetting("emailDigest", e.target.value as any)}
            style={{
              padding: "6px 12px", borderRadius: 6, border: "1px solid var(--color-border)",
              background: "var(--color-surface)", color: "var(--color-text-primary)",
              fontSize: 12, fontFamily: "inherit", cursor: "pointer",
            }}
          >
            <option value="off">Off</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </SettingRow>

        <SettingRow label="Alert Types" description="Which alert categories to show">
          <div style={{ display: "flex", gap: 6 }}>
            {["compliance", "portfolio", "tasks", "meetings"].map(type => {
              const isOn = settings.alertTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => {
                    const next = isOn
                      ? settings.alertTypes.filter(t => t !== type)
                      : [...settings.alertTypes, type];
                    updateSetting("alertTypes", next);
                  }}
                  style={{
                    padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                    border: `1px solid ${isOn ? "var(--color-brand-primary)" : "var(--color-border)"}`,
                    background: isOn ? "rgba(0, 120, 162, 0.12)" : "transparent",
                    color: isOn ? "var(--color-brand-secondary)" : "var(--color-text-muted)",
                    cursor: "pointer", fontFamily: "inherit", transition: "all .15s ease",
                    textTransform: "capitalize",
                  }}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </SettingRow>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 20px", borderRadius: 8,
          border: "1px solid rgba(239, 68, 68, 0.3)",
          background: "rgba(239, 68, 68, 0.08)",
          color: "#ef4444", fontSize: 13, fontWeight: 500,
          cursor: "pointer", fontFamily: "inherit",
          transition: "all .15s ease",
        }}
      >
        <LogOut size={14} />
        Sign Out
      </button>
    </div>
  );
}
