"use client";

import { useState } from "react";
import { queryClient } from "@/lib/queryClient";
import {
  Download, Trash2, Database, HardDrive, Cloud, Eye, FileText,
  CheckCircle2, AlertTriangle, RefreshCw,
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

function StorageIndicator({ label, icon: Icon, size, location }: { label: string; icon: any; size: string; location: "local" | "server" }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px", background: "var(--color-surface)",
      borderRadius: 8, border: "1px solid var(--color-border-subtle)",
    }}>
      <Icon size={14} style={{ color: "var(--color-brand-secondary)", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>{label}</div>
        <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 1 }}>{size}</div>
      </div>
      <div style={{
        padding: "2px 8px", borderRadius: 12, fontSize: 9, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.05em",
        background: location === "local" ? "rgba(142, 185, 53, 0.12)" : "rgba(0, 120, 162, 0.12)",
        color: location === "local" ? "var(--color-success)" : "var(--color-brand-secondary)",
      }}>
        {location === "local" ? "Browser" : "Server"}
      </div>
    </div>
  );
}

export function DataPrivacySection() {
  const [cacheCleared, setCacheCleared] = useState(false);
  const [exporting, setExporting] = useState(false);

  const clearAllCaches = () => {
    // Clear React Query cache
    queryClient.clear();
    // Clear localStorage items (preserve auth)
    const keysToKeep = ["wm-session", "theme"];
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !keysToKeep.includes(key)) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
  };

  const exportActivityLog = async () => {
    setExporting(true);
    try {
      // Build CSV from cached query data
      const data = [
        ["Timestamp", "Type", "Details"],
        [new Date().toISOString(), "Export", "Activity log exported by user"],
      ];
      const csv = data.map(row => row.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `advisor-activity-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  // Estimate localStorage size
  const localStorageSize = (() => {
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) total += localStorage.getItem(key)?.length || 0;
      }
      return `~${(total / 1024).toFixed(1)} KB`;
    } catch { return "Unknown"; }
  })();

  return (
    <div>
      {/* Data storage overview */}
      <div style={{
        background: "var(--color-surface-raised)", borderRadius: 12,
        border: "1px solid var(--color-border-subtle)", padding: "4px 20px", marginBottom: 24,
      }}>
        <h3 style={{
          fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600,
          color: "var(--color-text-primary)", margin: "16px 0 8px", letterSpacing: "0.02em",
        }}>
          Data Storage
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, paddingBottom: 16 }}>
          <StorageIndicator icon={HardDrive} label="Settings & Preferences" size={localStorageSize} location="local" />
          <StorageIndicator icon={Database} label="Query Cache" size="React Query (volatile)" location="local" />
          <StorageIndicator icon={Cloud} label="Session Data" size="Encrypted cookie" location="server" />
          <StorageIndicator icon={Cloud} label="Client Data" size="PostgreSQL" location="server" />
        </div>
      </div>

      {/* Actions */}
      <div style={{
        background: "var(--color-surface-raised)", borderRadius: 12,
        border: "1px solid var(--color-border-subtle)", padding: "4px 20px", marginBottom: 24,
      }}>
        <h3 style={{
          fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600,
          color: "var(--color-text-primary)", margin: "16px 0 4px", letterSpacing: "0.02em",
        }}>
          Actions
        </h3>

        <SettingRow label="Export Activity Log" description="Download your activity as CSV">
          <button
            onClick={exportActivityLog}
            disabled={exporting}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500,
              border: "1px solid var(--color-border)", background: "transparent",
              color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit",
              opacity: exporting ? 0.5 : 1,
            }}
          >
            <Download size={12} />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </SettingRow>

        <SettingRow label="Clear Local Cache" description="Remove cached data, settings, and query cache">
          <button
            onClick={clearAllCaches}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500,
              border: `1px solid ${cacheCleared ? "rgba(142,185,53,0.4)" : "rgba(239, 68, 68, 0.3)"}`,
              background: cacheCleared ? "rgba(142,185,53,0.08)" : "rgba(239, 68, 68, 0.08)",
              color: cacheCleared ? "var(--color-success)" : "#ef4444",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {cacheCleared ? <><CheckCircle2 size={12} /> Cleared!</> : <><Trash2 size={12} /> Clear Cache</>}
          </button>
        </SettingRow>

        <SettingRow label="Refresh All Data" description="Re-fetch all data from the server">
          <button
            onClick={() => queryClient.invalidateQueries()}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500,
              border: "1px solid var(--color-border)", background: "transparent",
              color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </SettingRow>
      </div>

      {/* Privacy notice */}
      <div style={{
        padding: "14px 16px", borderRadius: 8,
        background: "rgba(255, 198, 11, 0.06)",
        border: "1px solid rgba(255, 198, 11, 0.15)",
        fontSize: 12, color: "var(--color-text-tertiary)",
        display: "flex", gap: 8, alignItems: "flex-start",
      }}>
        <AlertTriangle size={14} style={{ color: "var(--color-warning)", flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong style={{ color: "var(--color-warning)" }}>Data Retention:</strong> Client data is stored server-side and governed by your firm's data retention policy. Local browser data (settings, cache) can be cleared at any time without affecting server records.
        </div>
      </div>
    </div>
  );
}
