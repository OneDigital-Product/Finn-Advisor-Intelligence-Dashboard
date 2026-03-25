import { useEffect, useRef } from "react";
import { Bot } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { FollowUpPromptsV2 } from "./follow-up-prompts-v2";
import { Mono } from "@/components/design";

interface ConversationTurn {
  id: string;
  turn_number: number;
  role: string;
  content: string;
  suggested_prompts?: any;
  created_at: string;
}

interface ConversationThreadProps {
  turns: ConversationTurn[];
  onFollowUpSelected?: (prompt: string) => void;
  isLoading?: boolean;
}

function parsedPrompts(raw: any) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((p: any) => (typeof p === "string" ? { title: p, prompt: p } : p));
  return [];
}

export function ConversationThread({ turns, onFollowUpSelected, isLoading }: ConversationThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, isLoading]);

  return (
    <div className="flex flex-col gap-3 p-4 max-w-3xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }} data-testid="conversation-thread">
      {turns.map((turn, i) => {
        const isAdvisor = turn.role === "advisor" || turn.role === "user";
        const isFin = turn.role === "fin" || turn.role === "assistant";
        const timeAgo = formatDistanceToNow(new Date(turn.created_at), { addSuffix: true });
        const prompts = parsedPrompts(turn.suggested_prompts);

        return (
          <div
            key={turn.id}
            className={`flex animate-fu ${isAdvisor ? "justify-end" : "justify-start"}`}
            style={{ animationDelay: `${i * 60}ms` }}
            data-testid={`conversation-turn-${turn.id}`}
          >
            <div className="max-w-[85%]">
              <div className={`flex items-center gap-2 mb-1 ${isAdvisor ? "justify-end" : ""}`}>
                {isFin && (
                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6B8FE0, #3B569E)" }}>
                    <Bot className="h-3 w-3 text-white" />
                  </div>
                )}
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground) / .5)" }}>
                  {isAdvisor ? "You" : "Fin"}
                </span>
                <Mono className="text-[9px]" style={{ color: "hsl(var(--muted-foreground) / .35)" }}>
                  {timeAgo}
                </Mono>
              </div>

              <div
                className="text-[13px] leading-[1.7] font-medium whitespace-pre-line"
                style={
                  isAdvisor
                    ? {
                        padding: "10px 14px",
                        borderRadius: "10px 10px 2px 10px",
                        background: "#0C1222",
                        color: "#E2E6EF",
                      }
                    : {
                        padding: "10px 14px",
                        borderRadius: "10px 10px 10px 2px",
                        background: "hsl(var(--muted))",
                        color: "hsl(var(--foreground))",
                      }
                }
              >
                {turn.content}
              </div>

              {isFin && prompts.length > 0 && onFollowUpSelected && (
                <div className="mt-2">
                  <FollowUpPromptsV2 prompts={prompts} onPromptSelected={onFollowUpSelected} />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="flex justify-start animate-fu" data-testid="typing-indicator">
          <div className="max-w-[85%]">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6B8FE0, #3B569E)" }}>
                <Bot className="h-3 w-3 text-white" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground) / .5)" }}>Fin</span>
            </div>
            <div
              className="flex items-center gap-1.5"
              style={{ padding: "12px 18px", borderRadius: "10px 10px 10px 2px", background: "hsl(var(--muted))" }}
            >
              <span className="w-[6px] h-[6px] rounded-full bg-[#6B8FE0] animate-breathe" style={{ animationDelay: "0ms" }} />
              <span className="w-[6px] h-[6px] rounded-full bg-[#6B8FE0] animate-breathe" style={{ animationDelay: "400ms" }} />
              <span className="w-[6px] h-[6px] rounded-full bg-[#6B8FE0] animate-breathe" style={{ animationDelay: "800ms" }} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
