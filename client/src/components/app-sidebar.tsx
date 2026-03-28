import { useState, useCallback, useRef, useEffect, createContext, useContext, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import NextLink from "next/link";
import {
  LayoutDashboard, Users, Calendar, BarChart3, ShieldCheck, Settings, Bot,
  FileText, ClipboardList, Calculator, ClipboardCheck, Notebook, FileInput,
  Compass, Shield, Banknote, Zap, BookOpen, Building2, ChevronDown, Eye,
  Lightbulb, Wrench, UserPlus, LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { EASE } from "@/styles/tokens";
import { AnimatedLogo, triggerLogoAnimation } from "@/components/AnimatedLogo";

const C = {
  bg: "#00344F",
  text: "#FFFFFF",
  textMuted: "#94A3B8",
  active: "#8EB935",
  tabActive: "#0078A2",
  activeBg: "rgba(79,179,205,0.12)",
  hoverBg: "rgba(255,255,255,0.06)",
  dropBg: "#00344F",
  dropBorder: "rgba(255,255,255,0.1)",
  tabBadge: "#0078A2",
  avatarBg: "#00344F",
  avatarBorder: "#0078A2",
  avatarText: "#4FB3CD",
};

interface NavItem { id: string; l: string; icon: string; count?: string; }
interface NavGroup { label: string; icon: string; items: NavItem[]; phase?: number; }

const ICON_HOVER: Record<string, string> = {
  Eye:             "scale(1.2)",
  Compass:         "scale(1.15) rotate(45deg)",
  BarChart3:       "scale(1.2) translateY(-2px)",
  Users:           "scale(1.18) translateY(-1px)",
  ShieldCheck:     "scale(1.18) rotate(6deg)",
  Wrench:          "scale(1.15) rotate(15deg)",
  LayoutDashboard: "scale(1.2) rotate(-8deg)",
  Calendar:        "scale(1.15) rotate(5deg)",
  Calculator:      "scale(1.18) rotate(-5deg)",
  Zap:             "scale(1.25) rotate(12deg)",
  BookOpen:        "scale(1.15) rotateY(15deg)",
  Shield:          "scale(1.2) translateY(-1px)",
  Lightbulb:       "scale(1.2) rotate(-10deg)",
  Settings:        "rotate(90deg)",
  Bot:             "scale(1.2) rotate(10deg)",
  FileInput:       "scale(1.18) rotate(5deg)",
  Notebook:        "scale(1.15) rotate(-6deg)",
  FileText:        "scale(1.15) translateY(-1px)",
  ClipboardList:   "scale(1.15) rotate(-4deg)",
  ClipboardCheck:  "scale(1.15) translateY(-2px)",
  Banknote:        "scale(1.2) translateX(2px)",
  Building2:       "scale(1.15) translateY(-2px)",
};

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, Users, Calendar, BarChart3, ShieldCheck, Settings, Bot,
  FileText, ClipboardList, Calculator, ClipboardCheck, Notebook, FileInput,
  Compass, Shield, Banknote, Zap, BookOpen, Building2, Eye, Lightbulb, Wrench, UserPlus,
};
function Ic({ name, size = 14 }: { name: string; size?: number }) {
  const El = ICON_MAP[name]; return El ? <El size={size} /> : null;
}

// V3.3: Top-level direct nav items (no dropdown needed)
const TOP_NAV_ITEMS: NavItem[] = [
  { id: "/", l: "My Day", icon: "LayoutDashboard" },
  { id: "/clients", l: "Clients", icon: "Users" },
  { id: "/calendar", l: "Calendar", icon: "Calendar" },
  { id: "/copilot", l: "Finn", icon: "Bot" },
];

const NAV_GROUPS: NavGroup[] = [
  { label: "Overview", icon: "Eye", phase: 1, items: [
    { id: "/admin", l: "Admin", icon: "Settings" },
    { id: "/approvals", l: "Approvals", icon: "ClipboardCheck" },
  ]},
  { label: "Planning", icon: "Compass", phase: 1, items: [
    { id: "/calculators", l: "Calculators", icon: "Calculator" },
    { id: "/monte-carlo", l: "Monte Carlo", icon: "BarChart3" },
  ]},
  { label: "Intelligence", icon: "BarChart3", items: [
    { id: "/analytics", l: "Analytics", icon: "BarChart3" },
    { id: "/engagement", l: "Engagement", icon: "Zap" },
    { id: "/client-insights", l: "Client Insights", icon: "Lightbulb" },
    { id: "/research", l: "Research", icon: "BookOpen" },
  ]},
  { label: "Client Services", icon: "Users", items: [
    { id: "/discovery", l: "Discovery", icon: "Compass" },
    { id: "/intake", l: "New Client", icon: "FileInput" },
    { id: "/fact-finders", l: "Fact Finders", icon: "Notebook" },
    { id: "/profiles", l: "Profiles", icon: "FileText" },
  ]},
  { label: "Compliance & Risk", icon: "ShieldCheck", items: [
    { id: "/compliance", l: "Compliance", icon: "ShieldCheck" },
    { id: "/tax-strategy", l: "Tax Strategy", icon: "Shield" },
  ]},
  { label: "Operations", icon: "Wrench", items: [
    { id: "/reports", l: "Reports", icon: "ClipboardList" },
    { id: "/withdrawals", l: "Withdrawals", icon: "Banknote" },
    { id: "/custodial-reporting", l: "Custodial", icon: "Building2" },
    { id: "/automations", l: "Automations", icon: "Zap" },
  ]},
];

/* ═══════════════════════════════════════════════════════════
 * NavRail — Horizontal Top Bar
 * Replaces the vertical sidebar. Renders nav groups as dropdown
 * triggers on the left, accepts children (PageTabs) on the right.
 * ═══════════════════════════════════════════════════════════ */

export function NavRail({ children }: { children?: ReactNode }) {
  const { tabs: ctxTabs } = useContext(NavPageTabsCtx);
  const location = usePathname();
  const qClient = useQueryClient();
  const myDayCached = qClient.getQueryData<any>(["/api/myday"]);
  const overdueCount = myDayCached?.urgency?.overdueTasks || 0;
  const router = useRouter();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [hov, setHov] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const closeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (closeRef.current) clearTimeout(closeRef.current); }, []);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      // Don't close if click was inside the nav rail (let button handlers manage state)
      if (navRef.current?.contains(e.target as Node)) return;
      setOpenGroup(null);
    };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  const isActive = useCallback((id: string) => {
    if (id === "/") return location === "/";
    if (id === "/calendar") return location.startsWith("/meetings") || location.startsWith("/calendar");
    return location.startsWith(id);
  }, [location]);
  const groupActive = (items: NavItem[]) => items.some(n => isActive(n.id));

  const initials = user?.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  const onGroupEnter = (label: string) => {
    if (closeRef.current) { clearTimeout(closeRef.current); closeRef.current = null; }
    setOpenGroup(label);
  };
  const onGroupLeave = () => {
    closeRef.current = setTimeout(() => setOpenGroup(null), 250);
  };
  const onDropEnter = () => {
    if (closeRef.current) { clearTimeout(closeRef.current); closeRef.current = null; }
  };

  return (
    <>
      <style>{`
        @keyframes topnav-drop { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        .topnav-drop { animation: topnav-drop .12s ease-out; }
      `}</style>
      <nav
        ref={navRef}
        data-testid="nav-rail"
        style={{
          background: C.bg,
          display: "flex",
          alignItems: "center",
          height: 48,
          padding: "0 16px",
          position: "sticky",
          top: 0,
          width: "100%",
          zIndex: 50,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          boxSizing: "border-box",
        }}
      >
        {/* ── Top-level direct nav items (V3.3) ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0, marginRight: 8 }}>
          {TOP_NAV_ITEMS.map((item) => {
            const active = isActive(item.id);
            return (
              <button
                key={item.id}
                onClick={() => { router.push(item.id); setOpenGroup(null); }}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 6,
                  fontSize: 12, fontWeight: active ? 700 : 500,
                  color: active ? C.t1 : C.t3,
                  background: active ? "rgba(79,179,205,0.1)" : "transparent",
                  border: "none", cursor: "pointer",
                  transition: "background .15s, color .15s",
                  position: "relative",
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <Ic name={item.icon} size={14} />
                {item.l}
                {item.id === "/" && overdueCount > 0 && (
                  <span style={{
                    position: "absolute", top: 2, right: 2,
                    minWidth: 16, height: 16, borderRadius: 8,
                    background: "#E53E3E", color: "#fff",
                    fontSize: 9, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 4px",
                  }}>{overdueCount > 99 ? "99+" : overdueCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Dropdown Nav Groups ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 1, minWidth: 0 }}>
          {NAV_GROUPS.map((g) => {
            const active = groupActive(g.items);
            const isOpen = openGroup === g.label;
            const isHov = hov === `g-${g.label}`;
            return (
              <div key={g.label} style={{ position: "relative" }}
                onMouseEnter={() => onGroupEnter(g.label)}
                onMouseLeave={onGroupLeave}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); setOpenGroup(p => p === g.label ? null : g.label); }}
                  onMouseEnter={() => setHov(`g-${g.label}`)}
                  onMouseLeave={() => setHov(null)}
                  aria-expanded={isOpen}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "6px 10px", border: "none", borderRadius: 6, cursor: "pointer",
                    background: active ? C.activeBg : isOpen || isHov ? C.hoverBg : "transparent",
                    color: active ? C.active : isHov || isOpen ? C.text : C.textMuted,
                    fontSize: 12, fontWeight: active ? 600 : 500,
                    fontFamily: "inherit", whiteSpace: "nowrap",
                    transition: `all .12s ${EASE}`, position: "relative",
                  }}
                  data-testid={`link-nav-group-${g.label.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <div style={{
                    display: "flex", flexShrink: 0,
                    transition: "transform .25s cubic-bezier(.34,1.56,.64,1)",
                    transform: isHov ? (ICON_HOVER[g.icon] || "scale(1.15)") : active ? "scale(1.05)" : "scale(1)",
                  }}>
                    <Ic name={g.icon} />
                  </div>
                  <span>{g.label}</span>
                  <ChevronDown size={10} style={{ opacity: 0.5, transition: `transform .12s`, transform: isOpen ? "rotate(180deg)" : "rotate(0)" }} />
                  {active && <div style={{ position: "absolute", bottom: 0, left: 8, right: 8, height: 2, borderRadius: 1, background: C.active }} />}
                </button>

                {/* Dropdown */}
                {isOpen && (
                  <div className="topnav-drop" onMouseEnter={onDropEnter} onMouseLeave={onGroupLeave}
                    style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, minWidth: 200, maxWidth: "calc(100vw - 32px)", background: C.dropBg, border: `1px solid ${C.dropBorder}`, borderRadius: 10, padding: "6px 4px", boxShadow: "0 8px 32px rgba(0,0,0,0.35)", zIndex: 60 }}>
                    {g.items.map((n) => {
                      const a = isActive(n.id); const h = hov === n.id;
                      return (
                        <button key={n.id}
                          onClick={(e) => { e.stopPropagation(); triggerLogoAnimation("pulse"); router.push(n.id === "/" ? "/?tab=My+Day" : n.id); setOpenGroup(null); }}
                          onMouseEnter={() => setHov(n.id)} onMouseLeave={() => setHov(null)}
                          style={{
                            display: "flex", alignItems: "center", gap: 10, width: "100%",
                            padding: "8px 12px", border: "none", borderRadius: 6, cursor: "pointer",
                            background: a ? C.activeBg : h ? C.hoverBg : "transparent",
                            color: a ? C.avatarText : h ? C.text : C.textMuted,
                            fontSize: 12, fontWeight: a ? 600 : 500, fontFamily: "inherit", textAlign: "left",
                            transition: `all .1s ${EASE}`,
                          }}
                          data-testid={`link-nav-${n.l.toLowerCase().replace(/\s/g, "-")}`}
                        >
                          <div style={{
                            display: "flex", flexShrink: 0,
                            transition: "transform .25s cubic-bezier(.34,1.56,.64,1)",
                            transform: h ? (ICON_HOVER[n.icon] || "scale(1.15)") : a ? "scale(1.05)" : "scale(1)",
                          }}>
                            <Ic name={n.icon} />
                          </div>
                          <span style={{ flex: 1 }}>{n.l}</span>
                          {a && <div style={{ width: 5, height: 5, borderRadius: 3, background: C.tabActive, flexShrink: 0 }} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Center-right: children slot (PageTabs go here) ── */}
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", marginLeft: 16, marginRight: 12, minWidth: 0, overflow: "hidden" }}>
          {ctxTabs}
          {children}
        </div>

        {/* ── Far right: Avatar ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div
            onClick={() => { triggerLogoAnimation("pulse"); router.push("/settings"); }}
            onMouseEnter={() => setHov("avatar")}
            onMouseLeave={() => setHov(null)}
            role="button"
            aria-label="Open profile settings"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push("/settings"); } }}
            style={{
              width: 30, height: 30, borderRadius: "50%",
              background: C.avatarBg,
              border: `2px solid ${hov === "avatar" || location.startsWith("/settings") ? C.active : C.avatarBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Oswald', sans-serif", fontSize: 11, fontWeight: 700,
              color: hov === "avatar" || location.startsWith("/settings") ? C.active : C.avatarText,
              flexShrink: 0, cursor: "pointer",
              transition: `all .15s ease`,
              transform: hov === "avatar" ? "scale(1.1)" : "scale(1)",
            }} title={user?.name || "User"} data-testid="text-user-initials">
            {initials}
          </div>
        </div>
      </nav>
    </>
  );
}

export { NavRail as AppSidebar };

/* ── Page-level tab slot context ──
 * Dashboard (or any page) can inject tabs into the NavRail bar
 * by wrapping content in NavPageTabsProvider and calling setNavPageTabs. */
const NavPageTabsCtx = createContext<{
  tabs: ReactNode | null;
  setTabs: (node: ReactNode | null) => void;
}>({ tabs: null, setTabs: () => {} });

export function NavPageTabsProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<ReactNode | null>(null);
  return (
    <NavPageTabsCtx.Provider value={{ tabs, setTabs }}>
      {children}
    </NavPageTabsCtx.Provider>
  );
}

export function useNavPageTabs() {
  return useContext(NavPageTabsCtx);
}
