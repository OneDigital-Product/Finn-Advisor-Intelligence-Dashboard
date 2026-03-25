import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Props {
  selectedClientId?: string | null;
  onClientChange: (clientId: string | null) => void;
  onSubmit: (prompt: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function CopilotPromptBar({
  selectedClientId,
  onClientChange,
  onSubmit,
  loading = false,
  disabled = false,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [focused, setFocused] = useState(false);

  const { data: clientsDataRaw } = useQuery<any>({
    queryKey: ["/api/clients"],
  });
  // /api/clients returns { clients: [...] } when MuleSoft/pagination is active,
  // or a raw array from local DB without params. Normalize to always be an array.
  const clientsData: any[] = Array.isArray(clientsDataRaw) ? clientsDataRaw : (clientsDataRaw?.clients ?? []);

  const handleSubmit = () => {
    if (!prompt.trim() || loading || disabled) return;
    onSubmit(prompt.trim());
    setPrompt("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className="p-4"
      style={{ borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--muted))" }}
      data-testid="copilot-prompt-bar"
    >
      <div className="max-w-3xl mx-auto space-y-2">
        <div className="flex gap-2 items-end">
          <select
            value={selectedClientId || ""}
            onChange={(e) => onClientChange(e.target.value || null)}
            className="px-3 py-2 rounded-md text-[12px] font-semibold min-w-[150px] h-10 outline-none transition-colors"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--background))",
              color: "hsl(var(--foreground))",
            }}
            data-testid="select-client"
          >
            <option value="">All clients</option>
            {clientsData?.map((client: any) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>

          <div
            className="flex-1 relative transition-all"
            style={{
              borderRadius: 6,
              border: focused ? "1px solid #6B8FE0" : "1px solid hsl(var(--border))",
              boxShadow: focused ? "0 0 0 3px rgba(107,143,224,.08)" : "none",
              background: "hsl(var(--background))",
            }}
          >
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Ask about any client or planning question..."
              className="w-full px-3.5 py-2.5 text-[12px] font-medium outline-none bg-transparent"
              style={{ fontFamily: "'DM Sans', sans-serif", color: "hsl(var(--foreground))" }}
              disabled={loading || disabled}
              data-testid="input-copilot-prompt"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || loading || disabled}
            className="h-10 px-4 rounded-md flex items-center gap-2 text-[11px] font-semibold transition-all disabled:opacity-40"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              background: "#0C1222",
              color: "#E2E6EF",
              cursor: !prompt.trim() || loading || disabled ? "not-allowed" : "pointer",
            }}
            data-testid="button-copilot-submit"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Send
          </button>
        </div>

        <p className="text-[10px] font-medium" style={{ fontFamily: "'DM Sans', sans-serif", color: "hsl(var(--muted-foreground) / .5)" }}>
          Press Cmd+Enter to send. Select a client for context-aware analysis.
        </p>
      </div>
    </div>
  );
}
