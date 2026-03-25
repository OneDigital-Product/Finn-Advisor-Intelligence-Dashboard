import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface FinalizationModalProps {
  profileId: string;
  answers: Record<string, any>;
  schema: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function FinalizationModal({ profileId, answers, schema, onSuccess, onCancel }: FinalizationModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"review" | "confirm" | "success">("review");
  const [versionNumber, setVersionNumber] = useState<number>(0);

  const questions = Array.isArray(schema?.questions) ? schema.questions : [];
  const sections = Array.from(new Set(questions.map((q: any) => q.section))) as string[];

  const missingRequired = questions
    .filter((q: any) => q.required)
    .filter((q: any) => {
      const val = answers[q.id];
      return val === undefined || val === null || val === "";
    });

  const { mutate: finalize, isPending } = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/profiles/${profileId}/finalize`, { answers });
      return res.json();
    },
    onSuccess: (data) => {
      setVersionNumber(data.versionNumber);
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      toast({ title: "Profile Finalized", description: `Version ${data.versionNumber} created.` });
    },
    onError: (err: Error) => {
      toast({ title: "Finalization Failed", description: err.message, variant: "destructive" });
    },
  });

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "Not answered";
    if (Array.isArray(value)) return value.join(", ") || "None selected";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-finalization-title">
            {step === "review" && "Review Profile Answers"}
            {step === "confirm" && "Confirm Finalization"}
            {step === "success" && "Profile Finalized"}
          </DialogTitle>
        </DialogHeader>

        {step === "review" && (
          <div className="space-y-4">
            {missingRequired.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-md border border-red-200 dark:border-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Missing required fields</p>
                  <ul className="text-xs text-red-600 dark:text-red-400 mt-1 list-disc ml-4">
                    {missingRequired.map((q: any) => (
                      <li key={q.id}>{q.label}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {sections.map((section) => (
                <div key={section}>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {section}
                  </h4>
                  <div className="space-y-2">
                    {questions
                      .filter((q: any) => q.section === section)
                      .map((q: any) => (
                        <div key={q.id} className="flex justify-between items-start py-1 border-b border-border/50" data-testid={`review-answer-${q.id}`}>
                          <span className="text-sm font-medium mr-4">
                            {q.label}
                            {q.required && <span className="text-red-500 ml-0.5">*</span>}
                          </span>
                          <span className="text-sm text-muted-foreground text-right shrink-0 max-w-[50%]">
                            {formatValue(answers[q.id])}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={onCancel} data-testid="button-cancel-review">
                Go Back to Edit
              </Button>
              <Button
                onClick={() => setStep("confirm")}
                disabled={missingRequired.length > 0}
                data-testid="button-continue-finalize"
              >
                Continue to Finalize
              </Button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-md border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Are you sure you want to finalize this profile?
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Once finalized, the profile will be locked and a new version will be created.
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setStep("review")} data-testid="button-back-to-review">
                Back
              </Button>
              <Button
                onClick={() => finalize()}
                disabled={isPending}
                data-testid="button-finalize"
              >
                {isPending ? "Finalizing..." : "Finalize Profile"}
              </Button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-4 py-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            <div>
              <p className="text-lg font-semibold" data-testid="text-finalization-success">Profile Finalized</p>
              <p className="text-sm text-muted-foreground">Version {versionNumber} has been created.</p>
            </div>
            <Button onClick={onSuccess} className="w-full" data-testid="button-view-history">
              View Version History
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
