import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useConversation } from "@/hooks/use-conversation";
import { useCopilotState, type FinnMode, type PageContext } from "@/hooks/use-copilot-state";
import { ConversationThread } from "@/components/cassidy/conversation-thread";
import { CopilotPromptBar } from "@/components/cassidy/copilot-prompt-bar";
import { CopilotResponseArea } from "@/components/cassidy/copilot-response-area";
import { ReviewQueueSidebar } from "@/components/cassidy/review-queue-sidebar";
import { Serif, Mono, Lbl } from "@/components/design";
import { P } from "@/styles/tokens";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Plus, MessageSquare, ChevronLeft, ChevronRight, PanelRightOpen, PanelRightClose, Zap, BarChart3, FileText, BookOpen, Mail, FileSpreadsheet, Palette, Wrench, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";

type ViewMode = "conversation" | "response";

const FINN_MODE_OPTIONS: { mode: FinnMode; label: string; icon: typeof Brain; description: string }[] = [
  { mode: "conversation", label: "Conversation", icon: MessageSquare, description: "General Q&A with Fin" },
  { mode: "email", label: "Email", icon: Mail, description: "Draft client emails" },
  { mode: "cheat_sheet", label: "Cheat Sheet", icon: FileSpreadsheet, description: "Quick reference sheets" },
  { mode: "pdf", label: "PDF", icon: FileText, description: "Generate PDF documents" },
  { mode: "brand", label: "Brand", icon: Palette, description: "Brand-aligned content" },
  { mode: "builder", label: "Builder", icon: Wrench, description: "Build custom outputs" },
];

export default function FinCopilotPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("conversation");
  const [showLeftSidebar, setShowLeftSidebar] = useState(!isMobile);
  const [showRightSidebar, setShowRightSidebar] = useState(!isMobile);
  const [selectedFinnMode, setSelectedFinnMode] = useState<FinnMode>("conversation");

  const {
    currentJobId,
    response,
    submitting,
    submitPrompt,
    submitFinnMode,
    finnModeError,
    selectedClientId,
    setSelectedClientId,
    resetConversation,
  } = useCopilotState();

  useEffect(() => {
    if (!conversationId) {
      setConversationId(crypto.randomUUID());
    }
  }, [conversationId]);

  const { turns, isLoading: turnsLoading, addTurn } = useConversation(conversationId);

  const { data: conversationsData } = useQuery<{ conversations: any[] }>({
    queryKey: ["/api/conversations"],
  });

  const isSopQuery = useCallback((text: string) => {
    const sopKeywords = /\b(sop|standard operating|procedure|custodial|form requirement|transfer form|account opening form|signature requirement|processing time|operations manual)\b/i;
    return sopKeywords.test(text);
  }, []);

  const handleSopQuery = useCallback(async (question: string) => {
    try {
      const res = await apiRequest("POST", "/api/sop/query", { question });
      const result = await res.json();
      let formatted = result.answer;
      if (result.sources && result.sources.length > 0) {
        formatted += "\n\n---\n**Sources:** " + result.sources.map((s: any) => `${s.documentTitle} (${s.category})`).join(", ");
      }
      return formatted;
    } catch {
      return null;
    }
  }, []);

  const handlePromptSubmit = useCallback(async (request: string) => {
    if (!conversationId) return;
    addTurn.mutate({ role: "advisor", content: request, client_id: selectedClientId ?? undefined });

    if (isSopQuery(request)) {
      const sopResult = await handleSopQuery(request);
      if (sopResult) {
        addTurn.mutate({
          role: "fin",
          content: sopResult,
          client_id: selectedClientId ?? undefined,
          suggested_prompts: [
            "What forms do I need for an account transfer?",
            "Show me the custodial requirements for Schwab",
            "What is the SOP for client onboarding?",
          ],
        });
        return;
      }
    }

    const copilotPageContext: PageContext = { route: "/copilot", section: "Copilot", clientId: selectedClientId, clientName: null };
    if (selectedFinnMode !== "conversation") {
      await submitFinnMode(request, selectedFinnMode, undefined, conversationId, copilotPageContext);
    } else {
      await submitPrompt({ advisor_request: request, conversation_id: conversationId, client_id: selectedClientId ?? undefined, page_context: copilotPageContext });
    }
  }, [conversationId, selectedClientId, selectedFinnMode, addTurn, submitPrompt, submitFinnMode, isSopQuery, handleSopQuery]);

  const handleFollowUpSelected = useCallback(async (prompt: string) => {
    if (!conversationId) return;
    addTurn.mutate({ role: "advisor", content: prompt, client_id: selectedClientId ?? undefined });
    const copilotPageContext: PageContext = { route: "/copilot", section: "Copilot", clientId: selectedClientId, clientName: null };
    if (selectedFinnMode !== "conversation") {
      await submitFinnMode(prompt, selectedFinnMode, undefined, conversationId, copilotPageContext);
    } else {
      await submitPrompt({ advisor_request: prompt, conversation_id: conversationId, client_id: selectedClientId ?? undefined, page_context: copilotPageContext });
    }
  }, [conversationId, selectedClientId, selectedFinnMode, addTurn, submitPrompt, submitFinnMode]);

  const handleNewConversation = useCallback(() => {
    setConversationId(crypto.randomUUID());
    resetConversation();
    setViewMode("conversation");
  }, [resetConversation]);

  const handleSelectConversation = useCallback((id: string) => {
    setConversationId(id);
    resetConversation();
    setViewMode("conversation");
    if (isMobile) setShowLeftSidebar(false);
  }, [resetConversation, isMobile]);

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

  const conversations = conversationsData?.conversations || [];

  const quickActions = [
    { label: "Analyze Okonkwo", icon: <Zap className="h-3 w-3" /> },
    { label: "Rebalance check", icon: <BarChart3 className="h-3 w-3" /> },
    { label: "Tax opportunities", icon: <FileText className="h-3 w-3" /> },
    { label: "SOP: Account transfer procedure", icon: <BookOpen className="h-3 w-3" /> },
    { label: "Custodial form requirements", icon: <BookOpen className="h-3 w-3" /> },
  ];

  return (
    <div className="flex h-full" data-testid="fin-copilot-page">
      {showLeftSidebar && (
        <div
          className={`${isMobile ? "absolute inset-y-0 left-0 z-50" : ""} w-64 flex flex-col animate-si`}
          style={{ background: "var(--color-cream, hsl(var(--sidebar)))", borderRight: "1px solid var(--color-cream-md, hsl(var(--sidebar-border)))" }}
        >
          <div className="p-3 flex items-center justify-between" style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}>
            <Lbl>Conversations</Lbl>
            <button
              onClick={handleNewConversation}
              className="p-1.5 rounded-md transition-colors hover:bg-[hsl(var(--accent))]"
              data-testid="button-new-conversation"
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-5 w-5 mx-auto mb-2 text-muted-foreground/40" />
                  <span className="text-[11px] text-muted-foreground">No conversations yet</span>
                </div>
              ) : (
                conversations.map((conv: any, i: number) => (
                  <button
                    key={conv.conversation_id}
                    onClick={() => handleSelectConversation(conv.conversation_id)}
                    className={`w-full text-left p-2.5 rounded-md transition-all animate-fu ${
                      conv.conversation_id === conversationId
                        ? "bg-[hsl(var(--accent))]"
                        : "hover:bg-[hsl(var(--accent))]"
                    }`}
                    style={{ animationDelay: `${i * 40}ms` }}
                    data-testid={`button-conversation-${conv.conversation_id}`}
                  >
                    <div className="text-[12px] font-semibold truncate" style={{ fontFamily: "'DM Sans', sans-serif", color: conv.conversation_id === conversationId ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>
                      {conv.title || "Conversation"}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Mono className="text-[10px] text-muted-foreground">{conv.turn_count} msgs</Mono>
                      <span className="text-[10px] text-muted-foreground/60">
                        {new Date(conv.last_turn_at).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
          {isMobile && (
            <button onClick={() => setShowLeftSidebar(false)} className="m-2 p-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <ChevronLeft className="h-3 w-3" /> Close
            </button>
          )}
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0" style={{ background: "hsl(var(--muted))" }}>
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ background: "#0C1222", borderBottom: "none" }}
        >
          <div className="flex items-center gap-3">
            {!showLeftSidebar && (
              <button onClick={() => setShowLeftSidebar(true)} className="p-1 rounded-md hover:bg-white/10 transition-colors" data-testid="button-show-history">
                <ChevronRight className="h-4 w-4 text-white/60" />
              </button>
            )}
            <span className="text-[#8AAEF0] animate-breathe"><Brain className="h-[18px] w-[18px]" /></span>
            <Serif className="text-[15px] font-semibold text-white/90">Fin AI</Serif>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ color: P.odGreen, background: "rgba(142,185,53,.15)", border: "1px solid rgba(142,185,53,.18)" }}>
              <span className="w-[5px] h-[5px] rounded-full animate-breathe" style={{ background: P.odGreen }} />
              Online
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 bg-white/5 rounded-lg p-0.5" data-testid="finn-mode-selector">
              {FINN_MODE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = selectedFinnMode === opt.mode;
                return (
                  <button
                    key={opt.mode}
                    onClick={() => setSelectedFinnMode(opt.mode)}
                    title={opt.description}
                    className="px-2 py-1 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      background: active ? "rgba(107,143,224,.25)" : "transparent",
                      color: active ? "#8AAEF0" : "rgba(255,255,255,.4)",
                      border: active ? "1px solid rgba(107,143,224,.3)" : "1px solid transparent",
                    }}
                    data-testid={`button-finn-mode-${opt.mode}`}
                  >
                    <Icon className="h-3 w-3" />
                    {!isMobile && opt.label}
                  </button>
                );
              })}
            </div>

            {response && (
              <div className="flex gap-1">
                {["Chat", "Analysis"].map((label, i) => {
                  const mode = i === 0 ? "conversation" : "response";
                  const active = viewMode === mode;
                  return (
                    <button
                      key={label}
                      onClick={() => setViewMode(mode as ViewMode)}
                      className="px-3 py-1 rounded text-[11px] font-semibold transition-all"
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        background: active ? "rgba(107,143,224,.2)" : "transparent",
                        color: active ? "#8AAEF0" : "rgba(255,255,255,.5)",
                        border: active ? "1px solid rgba(107,143,224,.3)" : "1px solid transparent",
                      }}
                      data-testid={`button-view-${mode}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
            {!isMobile && (
              <button
                onClick={() => setShowRightSidebar(!showRightSidebar)}
                className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                data-testid="button-toggle-review-queue"
              >
                {showRightSidebar ? <PanelRightClose className="h-4 w-4 text-white/50" /> : <PanelRightOpen className="h-4 w-4 text-white/50" />}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {viewMode === "conversation" ? (
            <>
              {turns.length === 0 && !submitting ? (
                <div className="flex-1 flex items-center justify-center animate-sl-up">
                  <div className="text-center space-y-4 max-w-lg">
                    <div className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6B8FE0, #3B569E)" }}>
                      <Brain className="h-8 w-8 text-white" />
                    </div>
                    <Serif as="h2" className="text-[28px] font-semibold tracking-tight" data-testid="text-welcome-heading">
                      How can I help today?
                    </Serif>
                    <p className="text-[13px] leading-relaxed text-muted-foreground max-w-md mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      I have context on your full book of business. Ask about any client,
                      planning domain, or portfolio question.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      {quickActions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => handlePromptSubmit(action.label)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all hover:border-[#6B8FE0] hover:text-[#6B8FE0]"
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            border: "1px solid hsl(var(--border))",
                            color: "hsl(var(--muted-foreground))",
                            background: "hsl(var(--background))",
                          }}
                          data-testid={`button-suggestion-${i}`}
                        >
                          {action.icon}
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-auto">
                  <ConversationThread
                    turns={turns}
                    onFollowUpSelected={handleFollowUpSelected}
                    isLoading={submitting}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 overflow-auto">
              {response ? (
                <CopilotResponseArea
                  response={response}
                  jobId={currentJobId || ""}
                  onFollowUpSelected={handleFollowUpSelected}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No analysis results yet.
                </div>
              )}
            </div>
          )}

          {finnModeError && (
            <div className="mx-4 mb-2 p-3 rounded-lg flex items-start gap-2 text-[12px]" style={{ background: "hsl(0 84% 60% / 0.1)", border: "1px solid hsl(0 84% 60% / 0.2)", color: "hsl(0 84% 60%)" }} data-testid="finn-mode-error">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold">Error: </span>
                {finnModeError}
              </div>
            </div>
          )}

          <CopilotPromptBar
            selectedClientId={selectedClientId}
            onClientChange={setSelectedClientId}
            onSubmit={handlePromptSubmit}
            loading={submitting}
          />

          <div className="px-4 pb-2 pt-1 flex gap-1.5 flex-wrap" style={{ background: "hsl(var(--muted))", borderTop: "1px solid hsl(var(--border))" }}>
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => handlePromptSubmit(action.label)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--background))",
                  color: "hsl(var(--muted-foreground))",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6B8FE0"; e.currentTarget.style.color = "#6B8FE0"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "hsl(var(--border))"; e.currentTarget.style.color = "hsl(var(--muted-foreground))"; }}
                data-testid={`button-quick-action-${i}`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showRightSidebar && !isMobile && (
        <div className="w-72 animate-si" style={{ borderLeft: "1px solid hsl(var(--border))" }}>
          <ReviewQueueSidebar advisorId={user?.id} />
        </div>
      )}
    </div>
  );
}
