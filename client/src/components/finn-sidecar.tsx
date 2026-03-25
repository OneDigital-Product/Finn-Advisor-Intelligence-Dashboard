import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useConversation } from "@/hooks/use-conversation";
import { useCopilotState, type FinnMode, type PageContext } from "@/hooks/use-copilot-state";
import { ConversationThread } from "@/components/cassidy/conversation-thread";
import { CopilotResponseArea } from "@/components/cassidy/copilot-response-area";
import { Serif } from "@/components/design";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { P, EASE } from "@/styles/tokens";
import { AICopilotButton } from "@/components/AICopilotButton";
import { BrainIcon } from "@/components/BrainIcon";
import {
  X, Send, Loader2, MessageSquare, Mail, FileSpreadsheet,
  FileText, Palette, Wrench, AlertCircle, Plus, Zap, BookOpen,
  BarChart3, ChevronRight,
} from "lucide-react";

const LS_OPEN_KEY = "finn-sidecar-open";
const LS_CONV_KEY = "finn-sidecar-conversation-id";
const PANEL_WIDTH = 400;

type ViewMode = "conversation" | "response";

const FINN_MODE_OPTIONS: { mode: FinnMode; label: string; icon: typeof MessageSquare }[] = [
  { mode: "conversation", label: "Chat", icon: MessageSquare },
  { mode: "email", label: "Email", icon: Mail },
  { mode: "cheat_sheet", label: "Cheat Sheet", icon: FileSpreadsheet },
  { mode: "pdf", label: "PDF", icon: FileText },
  { mode: "brand", label: "Brand", icon: Palette },
  { mode: "builder", label: "Builder", icon: Wrench },
];

function getPageContext(location: string, clients: any[] | undefined): PageContext {
  const ctx: PageContext = { route: location, section: "", clientId: null, clientName: null };

  if (location === "/") { ctx.section = "Dashboard"; return ctx; }

  const clientMatch = location.match(/^\/clients\/([^/]+)/);
  if (clientMatch) {
    ctx.section = "Client Detail";
    ctx.clientId = clientMatch[1];
    if (clients) {
      const c = clients.find((cl: any) => String(cl.id) === ctx.clientId);
      if (c) ctx.clientName = `${c.firstName} ${c.lastName}`.trim() || null;
    }
    return ctx;
  }

  if (location === "/clients") { ctx.section = "Clients"; return ctx; }
  if (location === "/meetings") { ctx.section = "Calendar"; return ctx; }
  if (location === "/analytics") { ctx.section = "Analytics"; return ctx; }
  if (location === "/engagement") { ctx.section = "Engagement"; return ctx; }
  if (location === "/compliance") { ctx.section = "Compliance"; return ctx; }
  if (location === "/reports") { ctx.section = "Reports"; return ctx; }
  if (location.startsWith("/reports/")) { ctx.section = "Report Editor"; return ctx; }
  if (location === "/withdrawals") { ctx.section = "Withdrawals"; return ctx; }
  if (location === "/custodial-reporting") { ctx.section = "Custodial Reporting"; return ctx; }
  if (location === "/research") { ctx.section = "Research Library"; return ctx; }
  if (location === "/monte-carlo") { ctx.section = "Monte Carlo"; return ctx; }
  if (location.startsWith("/discovery")) { ctx.section = "Discovery"; return ctx; }
  if (location.startsWith("/calculators") || location.startsWith("/tax-strategy")) {
    if (location.includes("rmd")) ctx.section = "RMD Calculator";
    else if (location.includes("budget")) ctx.section = "Budget Calculator";
    else if (location.includes("roth")) ctx.section = "Roth Conversion Calculator";
    else if (location.includes("asset-location")) ctx.section = "Asset Location Calculator";
    else if (location.includes("tax-bracket")) ctx.section = "Tax Bracket Calculator";
    else if (location.includes("qsbs")) ctx.section = "QSBS Tracker";
    else ctx.section = "Calculators";
    return ctx;
  }
  if (location === "/copilot") { ctx.section = "Copilot"; return ctx; }
  if (location.startsWith("/admin")) { ctx.section = "Admin"; return ctx; }
  if (location === "/profiles") { ctx.section = "Profiles"; return ctx; }
  if (location.startsWith("/fact-finders")) { ctx.section = "Fact Finders"; return ctx; }
  if (location === "/approvals") { ctx.section = "Approvals"; return ctx; }

  ctx.section = "Dashboard";
  return ctx;
}

function getSuggestedPrompts(ctx: PageContext): { label: string; icon: typeof Zap }[] {
  const s = ctx.section;

  if (s.includes("Calculator") || s === "Calculators" || s === "QSBS Tracker") {
    return [
      { label: "Interpret these results", icon: Zap },
      { label: "What should I recommend to the client?", icon: BarChart3 },
      { label: "Compare with alternative scenarios", icon: FileText },
    ];
  }

  if (s === "Client Detail") {
    const name = ctx.clientName || "this client";
    return [
      { label: `Summarize ${name}`, icon: Zap },
      { label: `Any compliance flags for ${name}?`, icon: AlertCircle },
      { label: `Draft a check-in email for ${name}`, icon: Mail },
    ];
  }

  if (s === "Compliance") {
    return [
      { label: "Are there any compliance issues?", icon: AlertCircle },
      { label: "Show overdue reviews", icon: FileText },
      { label: "What's our compliance policy?", icon: BookOpen },
    ];
  }

  if (s === "Reports" || s === "Report Editor") {
    return [
      { label: "Summarize the latest reports", icon: FileText },
      { label: "What trends do these reports show?", icon: BarChart3 },
      { label: "Draft a narrative for the report", icon: Zap },
    ];
  }

  if (s === "Analytics" || s === "Engagement") {
    return [
      { label: "What are the key metrics this period?", icon: BarChart3 },
      { label: "Which clients need attention?", icon: Zap },
    ];
  }

  if (s === "Withdrawals" || s === "Custodial Reporting") {
    return [
      { label: "What's our SOP for withdrawals?", icon: BookOpen },
      { label: "Are there pending custodial issues?", icon: AlertCircle },
    ];
  }

  if (s === "Monte Carlo") {
    return [
      { label: "Interpret the simulation results", icon: Zap },
      { label: "What does a 90% confidence look like?", icon: BarChart3 },
    ];
  }

  if (s === "Calendar") {
    return [
      { label: "Prep notes for my next meeting", icon: FileText },
      { label: "What should I follow up on today?", icon: Zap },
    ];
  }

  return [
    { label: "What should I focus on today?", icon: Zap },
    { label: "Any clients at risk?", icon: AlertCircle },
    { label: "What's our policy on account transfers?", icon: BookOpen },
  ];
}

export function FinnSidecar() {
  const { user } = useAuth();
  const location = usePathname();
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(LS_OPEN_KEY) === "true"; } catch { return false; }
  });
  const [conversationId, setConversationId] = useState<string>(() => {
    try { return localStorage.getItem(LS_CONV_KEY) || crypto.randomUUID(); } catch { return crypto.randomUUID(); }
  });
  const [viewMode, setViewMode] = useState<ViewMode>("conversation");
  const [selectedFinnMode, setSelectedFinnMode] = useState<FinnMode>("conversation");
  const [prompt, setPrompt] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    currentJobId, response, submitting, submitPrompt,
    submitFinnMode, finnModeError, selectedClientId,
    setSelectedClientId, resetConversation,
  } = useCopilotState();

  const { turns, addTurn } = useConversation(conversationId);

  const { data: clientsRaw } = useQuery<any>({ queryKey: ["/api/clients"] });
  // Handle both array and paginated response shapes
  const clientsData = Array.isArray(clientsRaw) ? clientsRaw : clientsRaw?.clients || [];

  const pageCtx = getPageContext(location, clientsData);
  const suggestedPrompts = getSuggestedPrompts(pageCtx);

  useEffect(() => {
    try { localStorage.setItem(LS_OPEN_KEY, String(open)); } catch {}
  }, [open]);

  useEffect(() => {
    try { localStorage.setItem(LS_CONV_KEY, conversationId); } catch {}
  }, [conversationId]);

  useEffect(() => {
    if (pageCtx.clientId) {
      setSelectedClientId(pageCtx.clientId);
    } else if (location && !location.startsWith("/clients/")) {
      setSelectedClientId(null);
    }
  }, [pageCtx.clientId, location]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setOpen(prev => {
          const next = !prev;
          if (next) setTimeout(() => inputRef.current?.focus(), 200);
          return next;
        });
      }
      // Escape closes the sidecar when open
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const isSopQuery = useCallback((text: string) => {
    return /\b(sop|standard operating|procedure|custodial|form requirement|transfer form|account opening|signature requirement|processing time|operations manual|policy|knowledge base)\b/i.test(text);
  }, []);

  const handleSopQuery = useCallback(async (question: string) => {
    try {
      const res = await apiRequest("POST", "/api/sop/query", { question });
      const result = await res.json();
      let formatted = result.answer;
      if (result.sources?.length > 0) {
        formatted += "\n\n---\n**Sources:** " + result.sources.map((s: any) => `${s.documentTitle} (${s.category})`).join(", ");
      }
      return formatted;
    } catch { return null; }
  }, []);

  const handleSubmit = useCallback(async (request: string) => {
    if (!request.trim()) return;
    addTurn.mutate({ role: "advisor", content: request, client_id: selectedClientId ?? undefined });

    if (isSopQuery(request)) {
      const sopResult = await handleSopQuery(request);
      if (sopResult) {
        addTurn.mutate({
          role: "fin",
          content: sopResult,
          client_id: selectedClientId ?? undefined,
          suggested_prompts: ["What forms do I need for an account transfer?", "Show me the custodial requirements", "What is the SOP for client onboarding?"],
        });
        return;
      }
    }

    const pageContext = { route: pageCtx.route, section: pageCtx.section, clientId: pageCtx.clientId, clientName: pageCtx.clientName };

    if (selectedFinnMode !== "conversation") {
      await submitFinnMode(request, selectedFinnMode, pageCtx.clientName || undefined, conversationId, pageContext);
    } else {
      await submitPrompt({
        advisor_request: request,
        conversation_id: conversationId,
        client_id: selectedClientId ?? pageCtx.clientId ?? undefined,
        page_context: pageContext,
      });
    }
  }, [conversationId, selectedClientId, selectedFinnMode, pageCtx, addTurn, submitPrompt, submitFinnMode, isSopQuery, handleSopQuery]);

  const handleInputSubmit = useCallback(() => {
    if (!prompt.trim() || submitting) return;
    handleSubmit(prompt.trim());
    setPrompt("");
  }, [prompt, submitting, handleSubmit]);

  const handleFollowUp = useCallback(async (p: string) => {
    addTurn.mutate({ role: "advisor", content: p, client_id: selectedClientId ?? undefined });
    const ctx = { route: pageCtx.route, section: pageCtx.section, clientId: pageCtx.clientId, clientName: pageCtx.clientName };
    if (selectedFinnMode !== "conversation") {
      await submitFinnMode(p, selectedFinnMode, pageCtx.clientName || undefined, conversationId, ctx);
    } else {
      await submitPrompt({ advisor_request: p, conversation_id: conversationId, client_id: selectedClientId ?? undefined, page_context: ctx });
    }
  }, [conversationId, selectedClientId, selectedFinnMode, pageCtx, addTurn, submitPrompt, submitFinnMode]);

  const handleNewConversation = useCallback(() => {
    const newId = crypto.randomUUID();
    setConversationId(newId);
    resetConversation();
    setViewMode("conversation");
    setPrompt("");
  }, [resetConversation]);

  useEffect(() => {
    if (response && viewMode === "conversation") {
      if (response.fin_response) {
        const modeLabel = response.called_mode && response.called_mode !== "conversation"
          ? ` [${FINN_MODE_OPTIONS.find(m => m.mode === response.called_mode)?.label || response.called_mode}]`
          : "";
        addTurn.mutate({
          role: "fin",
          content: `${modeLabel ? `**${modeLabel.trim()}**\n\n` : ""}${response.fin_response}`,
          client_id: selectedClientId ?? undefined,
          job_id: currentJobId || undefined,
          suggested_prompts: response.suggested_prompts,
        });
      }
    }
  }, [response]);

  if (!user) return null;

  return (
    <>
      {!open && (
        <AICopilotButton
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 200); }}
          size={48}
          showLabel={false}
          showToast={true}
        />
      )}

      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: `min(${PANEL_WIDTH}px, 100vw)`,
          maxWidth: "100vw",
          background: P.cream,
          borderLeft: `1px solid ${P.creamMd}`,
          zIndex: 55,
          display: "flex",
          flexDirection: "column",
          transform: open ? "translateX(0)" : `translateX(${PANEL_WIDTH}px)`,
          transition: `transform 300ms ${EASE}`,
          boxShadow: open ? "-4px 0 24px rgba(0,0,0,.08)" : "none",
        }}
        data-testid="finn-sidecar-panel"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: P.navy,
            borderBottom: "none",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BrainIcon size={16} color="#8AAEF0" />
            <Serif style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,.9)" }}>Fin</Serif>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "2px 8px",
                borderRadius: 99,
                fontSize: 9,
                fontWeight: 600,
                color: P.grn,
                background: "rgba(61,139,94,.12)",
                border: "1px solid rgba(61,139,94,.18)",
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: P.grn }} className="animate-breathe" />
              Online
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={handleNewConversation}
              style={{ padding: 4, borderRadius: 4, background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,.4)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,.7)"; e.currentTarget.style.background = "rgba(255,255,255,.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,.4)"; e.currentTarget.style.background = "transparent"; }}
              title="New conversation"
              data-testid="button-sidecar-new-conversation"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{ padding: 4, borderRadius: 4, background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,.4)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,.7)"; e.currentTarget.style.background = "rgba(255,255,255,.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,.4)"; e.currentTarget.style.background = "transparent"; }}
              title="Close (⌘J)"
              data-testid="button-sidecar-close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {(pageCtx.section || pageCtx.clientName) && (
          <div
            style={{
              padding: "8px 16px",
              background: P.creamDk,
              borderBottom: `1px solid ${P.creamMd}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <ChevronRight className="h-3 w-3" style={{ color: P.lt }} />
            <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", color: P.mid }}>
              {pageCtx.clientName ? `${pageCtx.clientName} · ` : ""}{pageCtx.section}
            </span>
          </div>
        )}

        <div
          style={{
            padding: "6px 16px",
            display: "flex",
            gap: 3,
            background: P.navy,
            flexShrink: 0,
            overflowX: "auto",
          }}
          data-testid="sidecar-finn-mode-selector"
        >
          {FINN_MODE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = selectedFinnMode === opt.mode;
            return (
              <button
                key={opt.mode}
                onClick={() => setSelectedFinnMode(opt.mode)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  border: active ? "1px solid rgba(107,143,224,.3)" : "1px solid transparent",
                  background: active ? "rgba(107,143,224,.2)" : "transparent",
                  color: active ? "#8AAEF0" : "rgba(255,255,255,.4)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 150ms ease-out",
                }}
                data-testid={`button-sidecar-mode-${opt.mode}`}
              >
                <Icon className="h-3 w-3" />
                {opt.label}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {viewMode === "conversation" ? (
            turns.length === 0 && !submitting ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 24 }}>
                <div style={{ textAlign: "center", maxWidth: 280 }}>
                  <div style={{ margin: "0 auto 16px", width: 64, height: 78 }}>
                    <AICopilotButton size={64} displayOnly />
                  </div>
                  <Serif as="h3" style={{ fontSize: 20, fontWeight: 600, color: P.ink, marginBottom: 8 }} data-testid="text-sidecar-welcome">
                    How can I help?
                  </Serif>
                  <p style={{ fontSize: 12, lineHeight: 1.6, color: P.mid, fontFamily: "'DM Sans', sans-serif", marginBottom: 16 }}>
                    Ask about any client, planning question, or SOP policy.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {suggestedPrompts.map((sp, i) => {
                      const Icon = sp.icon;
                      return (
                        <button
                          key={i}
                          onClick={() => handleSubmit(sp.label)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 12px",
                            borderRadius: 6,
                            border: `1px solid ${P.creamMd}`,
                            background: P.cream,
                            cursor: "pointer",
                            fontSize: 11,
                            fontWeight: 600,
                            fontFamily: "'DM Sans', sans-serif",
                            color: P.dark,
                            textAlign: "left",
                            transition: "all 150ms ease-out",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = P.blue; e.currentTarget.style.color = P.blue; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = P.creamMd; e.currentTarget.style.color = P.dark; }}
                          data-testid={`button-sidecar-suggestion-${i}`}
                        >
                          <Icon className="h-3 w-3" style={{ flexShrink: 0 }} />
                          {sp.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <ScrollArea style={{ flex: 1 }}>
                <ConversationThread
                  turns={turns}
                  onFollowUpSelected={handleFollowUp}
                  isLoading={submitting}
                />
              </ScrollArea>
            )
          ) : (
            <ScrollArea style={{ flex: 1 }}>
              {response ? (
                <CopilotResponseArea
                  response={response}
                  jobId={currentJobId || ""}
                  onFollowUpSelected={handleFollowUp}
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: P.mid, fontSize: 13 }}>
                  No analysis results yet.
                </div>
              )}
            </ScrollArea>
          )}
        </div>

        {response && (
          <div style={{ display: "flex", gap: 4, padding: "6px 16px", borderTop: `1px solid ${P.creamMd}`, flexShrink: 0 }}>
            {(["conversation", "response"] as ViewMode[]).map((m) => {
              const active = viewMode === m;
              return (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                    border: active ? `1px solid ${P.blue}` : `1px solid ${P.creamMd}`,
                    background: active ? P.bFr : "transparent",
                    color: active ? P.blue : P.mid,
                    cursor: "pointer",
                  }}
                  data-testid={`button-sidecar-view-${m}`}
                >
                  {m === "conversation" ? "Chat" : "Analysis"}
                </button>
              );
            })}
          </div>
        )}

        {finnModeError && (
          <div
            style={{
              margin: "0 12px 8px",
              padding: 10,
              borderRadius: 6,
              background: "rgba(196,75,75,.08)",
              border: "1px solid rgba(196,75,75,.15)",
              fontSize: 11,
              color: P.red,
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
            }}
            data-testid="sidecar-finn-mode-error"
          >
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>{finnModeError}</span>
          </div>
        )}

        <div style={{ padding: "10px 12px", borderTop: `1px solid ${P.creamMd}`, flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              borderRadius: 6,
              border: focused ? `1px solid ${P.blue}` : `1px solid ${P.creamMd}`,
              boxShadow: focused ? `0 0 0 3px rgba(107,143,224,.08)` : "none",
              background: "white",
              padding: "0 4px 0 0",
              transition: "all 150ms ease-out",
            }}
          >
            <input
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleInputSubmit();
                }
              }}
              placeholder="Ask Fin anything..."
              disabled={submitting}
              style={{
                flex: 1,
                padding: "10px 12px",
                fontSize: 12,
                fontWeight: 500,
                fontFamily: "'DM Sans', sans-serif",
                border: "none",
                outline: "none",
                background: "transparent",
                color: P.ink,
              }}
              data-testid="input-sidecar-prompt"
            />
            <button
              onClick={handleInputSubmit}
              disabled={!prompt.trim() || submitting}
              style={{
                width: 30,
                height: 30,
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: prompt.trim() && !submitting ? P.navy : P.creamDk,
                border: "none",
                cursor: prompt.trim() && !submitting ? "pointer" : "not-allowed",
                transition: "all 150ms ease-out",
                flexShrink: 0,
              }}
              data-testid="button-sidecar-send"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: P.mid }} />
              ) : (
                <Send className="h-3.5 w-3.5" style={{ color: prompt.trim() ? "#E2E6EF" : P.lt }} />
              )}
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6, padding: "0 2px" }}>
            <span style={{ fontSize: 9, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", color: P.lt }}>
              Enter to send · ⌘J to toggle
            </span>
            {selectedClientId && clientsData && (
              <span style={{ fontSize: 9, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", color: P.blue }}>
                {(() => { const c = clientsData.find((cl: any) => String(cl.id) === selectedClientId); return c ? `${c.firstName} ${c.lastName}`.trim() : "Client selected"; })()}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
