import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface OverrideAnswerModalProps {
  open: boolean;
  questionText: string;
  draftAnswer: string;
  currentAnswer?: string;
  onSave: (answer: string, reasoning: string) => void;
  onCancel: () => void;
}

export function OverrideAnswerModal({
  open,
  questionText,
  draftAnswer,
  currentAnswer,
  onSave,
  onCancel,
}: OverrideAnswerModalProps) {
  const [customAnswer, setCustomAnswer] = useState(currentAnswer || "");
  const [reasoning, setReasoning] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCustomAnswer(currentAnswer || "");
      setReasoning("");
      setError(null);
    }
  }, [open, questionText, currentAnswer]);

  const handleSave = () => {
    if (!customAnswer.trim()) {
      setError("Please provide an answer.");
      return;
    }
    onSave(customAnswer.trim(), reasoning.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-lg" data-testid="override-answer-modal">
        <DialogHeader>
          <DialogTitle>Provide Custom Answer</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Question</p>
            <p className="text-sm font-medium">{questionText}</p>
          </div>

          <div className="bg-muted/50 rounded p-3 border">
            <p className="text-xs text-muted-foreground mb-1">Draft Answer (Cassidy)</p>
            <p className="text-sm">{draftAnswer}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custom_answer">Your Answer *</Label>
            <Textarea
              id="custom_answer"
              value={customAnswer}
              onChange={(e) => {
                setCustomAnswer(e.target.value);
                setError(null);
              }}
              placeholder="Enter your custom answer"
              rows={4}
              data-testid="input-custom-answer"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reasoning">Why are you overriding? (optional)</Label>
            <Textarea
              id="reasoning"
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Explain your reasoning for audit purposes"
              rows={3}
              data-testid="input-override-reasoning"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} data-testid="button-cancel-override">
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="button-save-override">
            Save Override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
