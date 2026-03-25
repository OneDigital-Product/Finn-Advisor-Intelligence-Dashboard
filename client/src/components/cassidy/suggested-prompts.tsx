import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface SuggestedPromptsProps {
  prompts: string[];
  onPromptClick: (prompt: string) => void;
  isLoading?: boolean;
}

export function SuggestedPrompts({ prompts, onPromptClick, isLoading }: SuggestedPromptsProps) {
  if (!prompts || prompts.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="cassidy-suggested-prompts">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Follow-up Questions
      </p>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt, idx) => (
          <Button
            key={idx}
            variant="outline"
            size="sm"
            className="text-left h-auto py-2 px-3 whitespace-normal"
            disabled={isLoading}
            onClick={() => onPromptClick(prompt)}
            data-testid={`button-prompt-${idx}`}
          >
            <ArrowRight className="h-3 w-3 mr-1.5 shrink-0" />
            <span className="text-xs">{prompt}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
