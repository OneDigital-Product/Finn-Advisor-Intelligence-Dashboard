"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User, LayoutDashboard, Palette, Activity, Keyboard, Shield, Database,
  ArrowLeft, Settings as SettingsIcon,
} from "lucide-react";
import { ProfileSection } from "@/components/settings/profile-section";
import { DashboardSection } from "@/components/settings/dashboard-section";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { ApiTracerSection } from "@/components/settings/api-tracer-section";
import { ShortcutsSection } from "@/components/settings/shortcuts-section";
import { DataPrivacySection } from "@/components/settings/data-privacy-section";
import { SecuritySection } from "@/components/settings/security-section";

const SECTIONS = [
  { id: "profile", label: "Profile & Account", icon: User, description: "Your identity and preferences" },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Customize your workspace" },
  { id: "appearance", label: "Appearance", icon: Palette, description: "Theme, fonts, and display" },
  { id: "api-tracer", label: "API Tracer", icon: Activity, description: "Live request monitoring" },
  { id: "shortcuts", label: "Keyboard Shortcuts", icon: Keyboard, description: "Hotkeys and commands" },
  { id: "data-privacy", label: "Data & Privacy", icon: Database, description: "Export, cache, and audit" },
  { id: "security", label: "Security & Sessions", icon: Shield, description: "Sessions, timeout, and MFA" },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

const SECTION_MAP: Record<SectionId, React.ComponentType> = {
  "profile": ProfileSection,
  "dashboard": DashboardSection,
  "appearance": AppearanceSection,
  "api-tracer": ApiTracerSection,
  "shortcuts": ShortcutsSection,
  "data-privacy": DataPrivacySection,
  "security": SecuritySection,
};

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSection = (searchParams.get("section") as SectionId) || "profile";
  const [activeSection, setActiveSection] = useState<SectionId>(initialSection);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  const ActiveComponent = SECTION_MAP[activeSection];
  const activeMeta = SECTIONS.find(s => s.id === activeSection)!;

  return (
    <div style={{
      display: "flex", height: "calc(100vh - 140px)", overflow: "hidden", background: "var(--color-bg)",
      margin: "0 clamp(-40px, -3vw, -16px) -48px", borderRadius: "12px 12px 0 0",
      border: "1px solid var(--color-border-subtle)", borderBottom: "none",
    }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: "clamp(200px, 20vw, 280px)", flexShrink: 0, background: "var(--color-surface)",
        borderRight: "1px solid var(--color-border-subtle)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 20px 16px", borderBottom: "1px solid var(--color-border-subtle)",
        }}>
          <button
            onClick={() => router.push("/")}
            onMouseEnter={() => setHoveredSection("back")}
            onMouseLeave={() => setHoveredSection(null)}
            style={{
              display: "flex", alignItems: "center", gap: 6, border: "none",
              background: hoveredSection === "back" ? "rgba(255,255,255,0.06)" : "transparent",
              color: "var(--color-text-tertiary)", fontSize: 12, cursor: "pointer",
              padding: "4px 8px", borderRadius: 6, marginBottom: 12,
              fontFamily: "inherit", transition: "all .15s ease",
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to Dashboard</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "var(--color-brand-primary)", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <SettingsIcon size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)", letterSpacing: "0.02em" }}>
                Settings
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 1 }}>
                Personalize your experience
              </div>
            </div>
          </div>
        </div>

        {/* Section list */}
        <nav style={{ flex: 1, overflow: "auto", padding: "8px 8px" }}>
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            const isHovered = hoveredSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                onMouseEnter={() => setHoveredSection(section.id)}
                onMouseLeave={() => setHoveredSection(null)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "10px 12px", border: "none",
                  borderRadius: 8, cursor: "pointer", textAlign: "left",
                  fontFamily: "inherit", transition: "all .15s ease",
                  background: isActive
                    ? "rgba(0, 120, 162, 0.12)"
                    : isHovered
                    ? "rgba(255,255,255,0.04)"
                    : "transparent",
                  marginBottom: 2,
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                  background: isActive ? "rgba(0, 120, 162, 0.15)" : "rgba(255,255,255,0.04)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .15s ease",
                }}>
                  <Icon size={15} style={{
                    color: isActive ? "var(--color-brand-secondary)" : "var(--color-text-tertiary)",
                    transition: "color .15s ease",
                  }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: isActive ? 600 : 500,
                    color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    transition: "color .15s ease",
                  }}>
                    {section.label}
                  </div>
                  <div style={{
                    fontSize: 11, color: "var(--color-text-muted)",
                    marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {section.description}
                  </div>
                </div>
                {isActive && (
                  <div style={{
                    width: 3, height: 20, borderRadius: 2,
                    background: "var(--color-brand-primary)", flexShrink: 0,
                  }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Version footer */}
        <div style={{
          padding: "12px 20px", borderTop: "1px solid var(--color-border-subtle)",
          fontSize: 10, color: "var(--color-text-muted)",
          fontFamily: "'DM Mono', monospace",
        }}>
          Advisor Command Center v2.4
        </div>
      </aside>

      {/* ── Content ── */}
      <main style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "28px clamp(16px, 3vw, 36px)" }}>
        <div style={{ maxWidth: 760, width: "100%" }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{
              fontFamily: "'Oswald', sans-serif", fontSize: 22, fontWeight: 600,
              color: "var(--color-text-primary)", letterSpacing: "0.02em", margin: 0,
            }}>
              {activeMeta.label}
            </h1>
            <p style={{
              fontSize: 13, color: "var(--color-text-tertiary)", margin: "4px 0 0",
            }}>
              {activeMeta.description}
            </p>
          </div>
          <ActiveComponent />
        </div>
      </main>
    </div>
  );
}
