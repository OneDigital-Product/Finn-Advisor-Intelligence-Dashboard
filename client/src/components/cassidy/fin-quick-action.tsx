import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Brain, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { P } from "@/styles/tokens";

interface FinQuickActionProps {
  clientId?: string;
  clientName?: string;
  contextPrompts?: Array<{ label: string; prompt: string }>;
  compact?: boolean;
}

const defaultPrompts = [
  { label: "Analyze portfolio", prompt: "Run a complete portfolio analysis and identify any rebalancing opportunities" },
  { label: "Tax opportunities", prompt: "What tax optimization strategies should I consider for this client right now?" },
  { label: "Meeting prep", prompt: "Prepare a briefing for my next meeting with this client" },
  { label: "Risk assessment", prompt: "Evaluate the current risk exposure and suggest adjustments" },
];

export function FinQuickAction({ clientId, clientName, contextPrompts, compact }: FinQuickActionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const prompts = contextPrompts || defaultPrompts;

  const handleQuickPrompt = useCallback(async (prompt: string) => {
    setLoading(true);
    try {
      const conversationId = crypto.randomUUID();
      const fullPrompt = clientName
        ? `${prompt} for client ${clientName}${clientId ? ` (ID: ${clientId})` : ""}`
        : prompt;

      await apiRequest("POST", "/api/cassidy/request", {
        advisor_request: fullPrompt,
        conversation_id: conversationId,
        client_id: clientId || null,
        source: "copilot",
        task_type: "query",
      });

      router.push(`/copilot`);
    } catch {
      router.push(`/copilot`);
    } finally {
      setLoading(false);
    }
  }, [clientId, clientName, router]);

  if (compact) {
    return (
      <button
        onClick={() => router.push("/copilot")}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all hover:shadow-sm"
        style={{
          background: "linear-gradient(135deg, rgba(107,143,224,.15), rgba(107,143,224,.08))",
          color: "#6B8FE0",
          border: "1px solid rgba(107,143,224,.2)",
        }}
        data-testid="button-fin-quick-compact"
      >
        <Brain className="h-3 w-3" />
        Ask Fin
      </button>
    );
  }

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: `linear-gradient(135deg, ${P.navy}08, ${P.blue}10)`,
        border: `1px solid ${P.creamMd}`,
      }}
      data-testid="fin-quick-action-panel"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "rgba(107,143,224,.15)" }}>
          <Sparkles className="h-3.5 w-3.5" style={{ color: "#6B8FE0" }} />
        </div>
        <span className="text-[12px] font-semibold" style={{ color: P.navy }}>
          Fin AI Assistant
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {prompts.slice(0, 4).map((p, i) => (
          <button
            key={i}
            onClick={() => handleQuickPrompt(p.prompt)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium text-left transition-all hover:shadow-sm group"
            style={{
              background: P.cream,
              border: `1px solid ${P.creamMd}`,
              color: P.dark,
            }}
            data-testid={`button-fin-quick-${i}`}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
            ) : (
              <ArrowRight className="h-3 w-3 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: "#6B8FE0" }} />
            )}
            <span className="truncate">{p.label}</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => router.push("/copilot")}
        className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-semibold transition-all hover:shadow-sm"
        style={{
          background: "rgba(107,143,224,.1)",
          color: "#6B8FE0",
          border: "1px solid rgba(107,143,224,.15)",
        }}
        data-testid="button-fin-open-copilot"
      >
        <Brain className="h-3 w-3" />
        Open Fin Copilot
      </button>
    </div>
  );
}
