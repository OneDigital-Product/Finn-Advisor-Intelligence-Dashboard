import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useAllClients } from "@/hooks/use-all-clients";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import NextLink from "next/link";

const OD = {
  deepBlue: "#00344F",
  medBlue: "#0078A2",
  medGreen: "#8EB935",
  lightBlue: "#4FB3CD",
  bgMed: "#1a1f2e",
  text1: "#FFFFFF",
  text2: "#C7D0DD",
  text3: "#94A3B8",
  border: "#2D3748",
};

interface TopNavProps {
  isLiveData: boolean;
}

/* ── Household Search Bar ── */
function HouseholdSearch() {
  const router = useRouter();
  const { clients } = useAllClients();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Filter clients by name
  const results = query.length >= 2
    ? (clients || [])
        .filter((c: any) => {
          const name = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
          return name.includes(query.toLowerCase());
        })
        .slice(0, 8)
    : [];

  const showDropdown = focused && (results.length > 0 || query.length >= 2);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.parentElement?.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Navigate to client
  const selectClient = useCallback((id: string) => {
    setQuery("");
    setFocused(false);
    router.push(`/clients/${id}`);
  }, [router]);

  // Speech recognition
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setListening(false);
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setFocused(true);
      inputRef.current?.focus();
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = () => { setListening(false); recognitionRef.current = null; };
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, []);

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setFocused(true);
      }
      if (e.key === "Escape") {
        setFocused(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div style={{ position: "relative", flex: 1, maxWidth: 400, margin: "0 16px" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: focused ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${focused ? "rgba(0,120,162,0.4)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 8, padding: "0 10px", height: 32,
        transition: "all .15s",
      }}>
        {/* Search icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={focused ? OD.lightBlue : OD.text3} strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>

        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Search households...  ⌘K"
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            color: OD.text1, fontSize: 12, fontFamily: "inherit",
            padding: 0, minWidth: 0,
          }}
        />

        {/* Microphone button */}
        <button
          onClick={startListening}
          title={listening ? "Stop listening" : "Voice search"}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "none", cursor: "pointer", padding: 2,
            color: listening ? OD.medGreen : OD.text3,
            transition: "color .15s",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={listening ? OD.medGreen : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
          {listening && (
            <span style={{
              position: "absolute", top: -2, right: -2,
              width: 6, height: 6, borderRadius: "50%",
              background: OD.medGreen,
              animation: "od-pip 1s ease-in-out infinite",
            }} />
          )}
        </button>
      </div>

      {/* Dropdown results */}
      {showDropdown && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: OD.deepBlue, border: `1px solid ${OD.border}`,
          borderRadius: 10, padding: "6px 4px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 60,
          maxHeight: 320, overflowY: "auto",
        }}>
          {results.length === 0 && query.length >= 2 && (
            <div style={{ padding: "12px 16px", fontSize: 12, color: OD.text3, textAlign: "center" }}>
              No households match "{query}"
            </div>
          )}
          {results.map((c: any) => {
            const name = `${c.firstName || ""} ${c.lastName || ""}`.trim();
            const aum = c.totalAum || c.aum || 0;
            const fmtAum = aum >= 1e6 ? `$${(aum / 1e6).toFixed(1)}M` : aum >= 1e3 ? `$${(aum / 1e3).toFixed(0)}K` : aum > 0 ? `$${aum.toFixed(0)}` : "";
            return (
              <button
                key={c.id}
                onClick={() => selectClient(c.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 10, width: "100%",
                  padding: "8px 12px", border: "none", borderRadius: 6, cursor: "pointer",
                  background: "transparent", color: OD.text2,
                  fontSize: 12, fontFamily: "inherit", textAlign: "left",
                  transition: "background .1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: "rgba(0,120,162,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700, color: OD.lightBlue, flexShrink: 0,
                    fontFamily: "'Oswald', sans-serif",
                  }}>
                    {(c.firstName?.[0] || "?")}{(c.lastName?.[0] || "")}
                  </div>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
                    {name || "Unknown"}
                  </span>
                </div>
                {fmtAum && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: OD.medGreen, flexShrink: 0 }}>
                    {fmtAum}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Top Nav ── */
export function TopNav({ isLiveData }: TopNavProps) {
  const { user } = useAuth();
  const router = useRouter();
  const initials = user?.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    <>
      <style>{`@keyframes od-pip{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
      <div style={{
        background: OD.bgMed,
        borderBottom: `1px solid ${OD.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 48,
      }}>
        {/* Left — Logo + Brand + Advisor Intelligence + LIVE badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <NextLink href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }} data-testid="link-home">
            <AnimatedLogo size={26} animation="random" interval={300_000} />
            <div style={{
              fontFamily: "'Oswald', sans-serif", fontSize: 16, fontWeight: 600,
              letterSpacing: "0.12em", textTransform: "uppercase", color: OD.text1,
            }}>
              One<span style={{ color: OD.lightBlue }}>Digital</span>
            </div>
          </NextLink>
          <div style={{ width: 1, height: 18, background: OD.border }} />
          <div style={{ fontSize: 13, fontWeight: 500, color: OD.text2, letterSpacing: "0.02em" }}>
            Advisor Intelligence
          </div>
          {isLiveData && (
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "rgba(142,185,53,0.1)",
              border: "1px solid rgba(142,185,53,0.3)",
              borderRadius: 4, padding: "2px 8px",
              fontSize: 9, fontWeight: 600, letterSpacing: "0.15em",
              color: OD.medGreen, textTransform: "uppercase",
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: OD.medGreen, animation: "od-pip 2s ease-in-out infinite",
              }} />
              Live Data
            </div>
          )}
        </div>

        {/* Center — Search bar */}
        <HouseholdSearch />

        {/* Right — Ask Finn + New + Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <button
            onClick={() => router.push("/copilot")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, fontWeight: 500,
              padding: "5px 12px", borderRadius: 5, border: "none",
              background: OD.medBlue, color: "#fff", cursor: "pointer",
              transition: "all .15s",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 1.5"/></svg>
            Ask Finn AI
          </button>
          <button
            onClick={() => router.push("/intake")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, fontWeight: 500,
              padding: "5px 12px", borderRadius: 5,
              background: "transparent",
              border: `1px solid ${OD.border}`,
              color: OD.text2, cursor: "pointer",
              transition: "all .15s",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 2v12M2 8h12"/></svg>
            New
          </button>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: OD.deepBlue, border: `2px solid ${OD.medBlue}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: OD.lightBlue,
            fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em",
            cursor: "pointer",
          }}>
            {initials}
          </div>
        </div>
      </div>
    </>
  );
}
