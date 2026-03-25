"use client";

import { useState } from "react";
import { Command, Search, ArrowRight } from "lucide-react";

const SHORTCUT_GROUPS = [
  {
    label: "Navigation",
    shortcuts: [
      { keys: ["Ctrl", "K"], action: "Open Command Palette" },
      { keys: ["Ctrl", "/"], action: "Open Fin Copilot" },
      { keys: ["Ctrl", "1"], action: "Go to Dashboard" },
      { keys: ["Ctrl", "2"], action: "Go to Clients" },
      { keys: ["Ctrl", "3"], action: "Go to Calendar" },
      { keys: ["Ctrl", "4"], action: "Go to Analytics" },
      { keys: ["Ctrl", ","], action: "Open Settings" },
    ],
  },
  {
    label: "Dashboard",
    shortcuts: [
      { keys: ["R"], action: "Refresh data" },
      { keys: ["Tab"], action: "Next widget" },
      { keys: ["Shift", "Tab"], action: "Previous widget" },
      { keys: ["Space"], action: "Expand/collapse card" },
      { keys: ["Esc"], action: "Close panel/modal" },
    ],
  },
  {
    label: "Client View",
    shortcuts: [
      { keys: ["N"], action: "New task" },
      { keys: ["E"], action: "Edit client" },
      { keys: ["Ctrl", "S"], action: "Save changes" },
      { keys: ["Ctrl", "F"], action: "Search within page" },
    ],
  },
  {
    label: "Global",
    shortcuts: [
      { keys: ["?"], action: "Show keyboard shortcuts" },
      { keys: ["Ctrl", "Shift", "D"], action: "Toggle diagnostics panel" },
      { keys: ["Ctrl", "Shift", "T"], action: "Toggle theme" },
      { keys: ["Ctrl", "L"], action: "Sign out" },
    ],
  },
];

function KeyCap({ children }: { children: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
      fontFamily: "'DM Mono', monospace",
      background: "var(--color-surface-overlay)",
      border: "1px solid var(--color-border)",
      color: "var(--color-text-secondary)",
      minWidth: 24, textAlign: "center",
      boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
    }}>
      {children}
    </span>
  );
}

export function ShortcutsSection() {
  const [search, setSearch] = useState("");

  const filteredGroups = SHORTCUT_GROUPS.map(g => ({
    ...g,
    shortcuts: g.shortcuts.filter(s =>
      s.action.toLowerCase().includes(search.toLowerCase()) ||
      s.keys.join(" ").toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(g => g.shortcuts.length > 0);

  return (
    <div>
      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <Search size={14} style={{
          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          color: "var(--color-text-muted)",
        }} />
        <input
          type="text"
          placeholder="Search shortcuts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "10px 12px 10px 34px", borderRadius: 8,
            border: "1px solid var(--color-border)", background: "var(--color-surface-raised)",
            color: "var(--color-text-primary)", fontSize: 13, fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Shortcut groups */}
      {filteredGroups.map(group => (
        <div key={group.label} style={{
          background: "var(--color-surface-raised)", borderRadius: 12,
          border: "1px solid var(--color-border-subtle)", padding: "4px 20px", marginBottom: 16,
        }}>
          <h3 style={{
            fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600,
            color: "var(--color-text-primary)", margin: "16px 0 8px", letterSpacing: "0.02em",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <Command size={13} style={{ color: "var(--color-brand-secondary)" }} />
            {group.label}
          </h3>

          {group.shortcuts.map((s, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: i < group.shortcuts.length - 1 ? "1px solid var(--color-border-subtle)" : "none",
            }}>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                {s.action}
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {s.keys.map((k, ki) => (
                  <span key={ki} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <KeyCap>{k}</KeyCap>
                    {ki < s.keys.length - 1 && <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>+</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Pro tip */}
      <div style={{
        padding: "14px 16px", borderRadius: 8,
        background: "rgba(0, 120, 162, 0.06)",
        border: "1px solid rgba(0, 120, 162, 0.15)",
        fontSize: 12, color: "var(--color-text-tertiary)",
      }}>
        <strong style={{ color: "var(--color-brand-secondary)" }}>Pro tip:</strong> Press <KeyCap>Ctrl</KeyCap> + <KeyCap>K</KeyCap> anywhere to open the Command Palette for quick access to any action.
      </div>
    </div>
  );
}
