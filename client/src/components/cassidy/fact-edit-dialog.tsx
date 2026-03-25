import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Fact } from "@/hooks/use-intake-job";

interface FactEditDialogProps {
  fact: Fact;
  onSave: (factValue: string, normalizedValue: string, editorNote: string) => void;
  onCancel: () => void;
}

export function FactEditDialog({ fact, onSave, onCancel }: FactEditDialogProps) {
  const [factValue, setFactValue] = useState(fact.fact_value);
  const [normalizedValue, setNormalizedValue] = useState(fact.normalized_value || "");
  const [editorNote, setEditorNote] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSave = () => {
    if (!factValue.trim()) {
      setValidationError("Fact value cannot be empty");
      return;
    }
    onSave(factValue, normalizedValue, editorNote);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-lg" data-testid="dialog-fact-edit">
        <DialogHeader>
          <DialogTitle>Edit Fact: {fact.fact_label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Fact Type</Label>
            <p className="text-sm font-medium" data-testid="text-edit-fact-type">{fact.fact_type}</p>
          </div>

          <div>
            <Label htmlFor="edit-fact-value">Fact Value *</Label>
            <Textarea
              id="edit-fact-value"
              value={factValue}
              onChange={(e) => {
                setFactValue(e.target.value);
                setValidationError(null);
              }}
              placeholder="Enter the fact value"
              className="mt-1"
              data-testid="input-edit-fact-value"
            />
            {validationError && (
              <p className="text-xs text-destructive mt-1" data-testid="text-edit-validation-error">{validationError}</p>
            )}
          </div>

          <div>
            <Label htmlFor="edit-normalized-value">Normalized Value</Label>
            <Textarea
              id="edit-normalized-value"
              value={normalizedValue}
              onChange={(e) => setNormalizedValue(e.target.value)}
              placeholder="Standardized format (e.g., ISO dates, normalized names)"
              className="mt-1"
              data-testid="input-edit-normalized-value"
            />
          </div>

          <div>
            <Label htmlFor="edit-editor-note">Why are you editing this?</Label>
            <Textarea
              id="edit-editor-note"
              value={editorNote}
              onChange={(e) => setEditorNote(e.target.value)}
              placeholder="Explain the change for audit trail"
              className="mt-1"
              data-testid="input-edit-editor-note"
            />
          </div>

          <div className="bg-muted p-3 rounded text-xs">
            <p className="font-medium mb-1">Original source:</p>
            <p className="italic text-muted-foreground">"{fact.source_snippet}"</p>
            {fact.source_reference && (
              <p className="text-muted-foreground mt-1">
                Ref: {fact.source_reference}
              </p>
            )}
            <Badge variant="outline" className="mt-2">{fact.confidence}</Badge>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} data-testid="button-edit-cancel">Cancel</Button>
          <Button onClick={handleSave} data-testid="button-edit-save">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
