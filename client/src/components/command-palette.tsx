import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useRecentClients } from "@/hooks/use-recent-clients";
import { P, SPRING, EASE } from "@/styles/tokens";
import { Serif } from "@/components/design/typography";
import {
  Search,
  Users,
  LayoutDashboard,
  Calendar,
  BarChart3,
  ShieldCheck,
  Settings,
  Clock,
  ArrowRight,
  X,
  Sparkles,
  ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { name: "My Day", url: "/", icon: LayoutDashboard, keywords: "dashboard home" },
  { name: "Clients", url: "/clients", icon: Users, keywords: "client list" },
  { name: "Calendar", url: "/meetings", icon: Calendar, keywords: "meetings schedule" },
  { name: "Analytics", url: "/analytics", icon: BarChart3, keywords: "reports data" },
  { name: "Compliance", url: "/compliance", icon: ShieldCheck, keywords: "regulatory" },
  { name: "Admin", url: "/admin", icon: Settings, keywords: "settings administration" },
  { name: "Finn Copilot", url: "/copilot", icon: Sparkles, keywords: "finn ai copilot assistant chat" },
];

const CommandPaletteContext = createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
}>({ open: false, setOpen: () => {} });

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen }}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette() {
  return useContext(CommandPaletteContext);
}

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { recents } = useRecentClients();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: clientsRaw } = useQuery<any>({
    queryKey: ["/api/clients"],
    enabled: open,
  });
  const clients: any[] = Array.isArray(clientsRaw) ? clientsRaw : clientsRaw?.clients || [];

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const lowerQuery = query.toLowerCase().trim();

  const matchedPages = lowerQuery
    ? NAV_ITEMS.filter(item =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.keywords.toLowerCase().includes(lowerQuery)
      )
    : [];

  const matchedClients = lowerQuery && clients
    ? clients.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(lowerQuery) ||
        c.email?.toLowerCase().includes(lowerQuery)
      ).slice(0, 8)
    : [];

  const recentItems = !lowerQuery ? recents : [];

  const allResults = [
    ...matchedPages.map(p => ({ type: "page" as const, id: p.url, ...p })),
    ...matchedClients.map(c => ({
      type: "client" as const,
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      url: `/clients/${c.id}`,
      segment: c.segment,
    })),
  ];

  const defaultItems = !lowerQuery && recentItems.length === 0 ? NAV_ITEMS : [];

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const go = useCallback((url: string) => {
    router.push(url);
    setOpen(false);
    setQuery("");
  }, [router, setOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const total = allResults.length + recentItems.length + defaultItems.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % Math.max(total, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + Math.max(total, 1)) % Math.max(total, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (recentItems.length > 0 && !lowerQuery) {
        if (selectedIndex < recentItems.length) {
          go(`/clients/${recentItems[selectedIndex].id}`);
        }
      } else if (defaultItems.length > 0 && !lowerQuery) {
        if (selectedIndex < defaultItems.length) {
          go(defaultItems[selectedIndex].url);
        }
      } else if (selectedIndex < allResults.length) {
        go(allResults[selectedIndex].url);
      }
    }
  }, [allResults, recentItems, defaultItems, selectedIndex, lowerQuery, go]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(12,18,34,.3)",
        backdropFilter: "blur(8px)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 80,
      }}
      onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
      data-testid="dialog-command-palette"
    >
      <div
        className="animate-sc-in"
        style={{
          width: "min(480px, calc(100vw - 32px))",
          background: P.cream,
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            borderBottom: `1px solid ${P.creamMd}`,
          }}
        >
          <Sparkles style={{ width: 16, height: 16, color: P.blue }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Navigate, search, or ask Finn..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: P.ink,
              fontSize: 15,
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 500,
              outline: "none",
            }}
            data-testid="input-command-search"
          />
          <button
            onClick={() => setOpen(false)}
            style={{ background: "none", border: "none", color: P.lt, cursor: "pointer", display: "flex" }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        <div style={{ maxHeight: 320, overflowY: "auto", padding: 4 }}>
          {!lowerQuery && recentItems.length > 0 && (
            <>
              <div style={{ padding: "6px 12px 4px", fontSize: 10, fontWeight: 600, color: P.lt, textTransform: "uppercase", letterSpacing: ".06em" }}>
                Recent Clients
              </div>
              {recentItems.map((client, idx) => (
                <button
                  key={client.id}
                  onClick={() => go(`/clients/${client.id}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: selectedIndex === idx ? P.creamDk : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: `all .1s ${SPRING}`,
                  }}
                  data-testid={`command-recent-${client.id}`}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: 4, background: P.navy,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: P.bHi, fontSize: 10, fontWeight: 600,
                  }}>
                    <Clock style={{ width: 12, height: 12 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: P.dark }}>{client.name}</div>
                    {client.segment && <div style={{ fontSize: 10, color: P.lt }}>Tier {client.segment}</div>}
                  </div>
                  <ChevronRight style={{ width: 12, height: 12, color: P.fnt }} />
                </button>
              ))}
            </>
          )}

          {!lowerQuery && recentItems.length === 0 && (
            <>
              <div style={{ padding: "6px 12px 4px", fontSize: 10, fontWeight: 600, color: P.lt, textTransform: "uppercase", letterSpacing: ".06em" }}>
                Pages
              </div>
              {NAV_ITEMS.map((item, idx) => (
                <button
                  key={item.url}
                  onClick={() => go(item.url)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: selectedIndex === idx ? P.creamDk : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: `all .1s ${SPRING}`,
                  }}
                  data-testid={`command-nav-${item.name.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: 4, background: P.navy,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: P.bHi,
                  }}>
                    <item.icon style={{ width: 12, height: 12 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: P.dark }}>{item.name}</div>
                  </div>
                  <ChevronRight style={{ width: 12, height: 12, color: P.fnt }} />
                </button>
              ))}
            </>
          )}

          {lowerQuery && matchedPages.length > 0 && (
            <>
              <div style={{ padding: "6px 12px 4px", fontSize: 10, fontWeight: 600, color: P.lt, textTransform: "uppercase", letterSpacing: ".06em" }}>
                Pages
              </div>
              {matchedPages.map((item, idx) => (
                <button
                  key={item.url}
                  onClick={() => go(item.url)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: selectedIndex === idx ? P.creamDk : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: `all .1s ${SPRING}`,
                  }}
                  data-testid={`command-nav-${item.name.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: 4, background: P.navy,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: P.bHi,
                  }}>
                    <item.icon style={{ width: 12, height: 12 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: P.dark }}>{item.name}</div>
                  </div>
                  <ChevronRight style={{ width: 12, height: 12, color: P.fnt }} />
                </button>
              ))}
            </>
          )}

          {lowerQuery && matchedClients.length > 0 && (
            <>
              <div style={{ padding: "6px 12px 4px", fontSize: 10, fontWeight: 600, color: P.lt, textTransform: "uppercase", letterSpacing: ".06em" }}>
                Clients
              </div>
              {matchedClients.map((client, idx) => {
                const resultIdx = matchedPages.length + idx;
                return (
                  <button
                    key={client.id}
                    onClick={() => go(`/clients/${client.id}`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 6,
                      border: "none",
                      background: selectedIndex === resultIdx ? P.creamDk : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: `all .1s ${SPRING}`,
                    }}
                    data-testid={`command-client-${client.id}`}
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: 4, background: P.navy,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: P.bHi,
                    }}>
                      <Users style={{ width: 12, height: 12 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: P.dark }}>{client.firstName} {client.lastName}</div>
                      <div style={{ fontSize: 10, color: P.lt }}>Tier {client.segment}</div>
                    </div>
                    <ChevronRight style={{ width: 12, height: 12, color: P.fnt }} />
                  </button>
                );
              })}
            </>
          )}

          {lowerQuery && matchedPages.length === 0 && matchedClients.length === 0 && (
            <div style={{ padding: "32px 0", textAlign: "center", fontSize: 12, color: P.lt }}>
              No results for "{query}"
            </div>
          )}
        </div>

        <div
          style={{
            padding: "8px 16px",
            borderTop: `1px solid ${P.creamMd}`,
            display: "flex",
            justifyContent: "space-between",
            background: P.creamDk,
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            {[["↵", "Go"], ["↑↓", "Nav"], ["esc", "Close"]].map(([k, l]) => (
              <span key={k} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  background: P.cream,
                  padding: "1px 5px",
                  borderRadius: 3,
                  fontSize: 9,
                  color: P.lt,
                  border: `1px solid ${P.creamMd}`,
                }}>{k}</span>
                <span style={{ fontSize: 9, color: P.lt }}>{l}</span>
              </span>
            ))}
          </div>
          <span style={{ fontSize: 9, fontWeight: 600, color: P.lt }}>Finn AI</span>
        </div>
      </div>
    </div>
  );
}

export function CommandPaletteTrigger() {
  const { setOpen } = useCommandPalette();
  return (
    <button
      onClick={() => setOpen(true)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: P.cream,
        border: `1px solid ${P.creamMd}`,
        borderRadius: 6,
        padding: "7px 14px",
        cursor: "pointer",
        transition: `all .15s ${SPRING}`,
      }}
      data-testid="button-command-palette"
    >
      <Sparkles style={{ width: 14, height: 14, color: P.blue }} />
      <span style={{ fontSize: 12, fontWeight: 500, color: P.lt }}>Ask Finn</span>
      <span style={{
        fontFamily: "'DM Mono', monospace",
        background: P.creamDk,
        padding: "1px 6px",
        borderRadius: 3,
        fontSize: 10,
        color: P.lt,
        marginLeft: 8,
      }}>⌘K</span>
    </button>
  );
}
