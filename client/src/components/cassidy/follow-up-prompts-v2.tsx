import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

interface FollowUpPrompt {
  title: string;
  prompt: string;
}

interface FollowUpPromptsV2Props {
  prompts: FollowUpPrompt[];
  onPromptSelected: (prompt: string) => void;
  disabled?: boolean;
}

export function FollowUpPromptsV2({ prompts, onPromptSelected, disabled }: FollowUpPromptsV2Props) {
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

  if (!prompts || prompts.length === 0) return null;

  const handleClick = (prompt: FollowUpPrompt, index: number) => {
    setPendingIndex(index);
    onPromptSelected(prompt.prompt);
  };

  const isPending = pendingIndex !== null;

  return (
    <div className="flex flex-wrap gap-1.5" data-testid="follow-up-prompts-v2">
      {prompts.map((p, index) => {
        const isThisPending = pendingIndex === index;
        return (
          <button
            key={index}
            disabled={disabled || (isPending && !isThisPending) || isThisPending}
            onClick={() => handleClick(p, index)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all disabled:opacity-40"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--background))",
              color: "hsl(var(--muted-foreground))",
              cursor: disabled || isPending ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => { if (!disabled && !isPending) { e.currentTarget.style.borderColor = "#6B8FE0"; e.currentTarget.style.color = "#6B8FE0"; } }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "hsl(var(--border))"; e.currentTarget.style.color = "hsl(var(--muted-foreground))"; }}
            data-testid={`button-follow-up-${index}`}
          >
            {isThisPending ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <ArrowRight className="h-2.5 w-2.5" />
            )}
            {p.title}
          </button>
        );
      })}
    </div>
  );
}
