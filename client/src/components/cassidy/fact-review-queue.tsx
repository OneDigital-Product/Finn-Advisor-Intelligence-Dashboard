import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, AlertCircle, CheckCircle2, ArrowLeft, FileText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { FactReviewCard, type FactReviewState } from "./fact-review-card";
import { FactEditDialog } from "./fact-edit-dialog";
import type { Fact } from "@/hooks/use-intake-job";

type ComponentState = "loading" | "reviewing" | "completing" | "completed" | "error";

interface FactReviewQueueProps {
  jobId: string;
  onComplete?: (clientId: string | null) => void;
  onBack?: () => void;
}

export function FactReviewQueue({ jobId, onComplete, onBack }: FactReviewQueueProps) {
  const { user } = useAuth();
  const [facts, setFacts] = useState<Fact[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [reviewStates, setReviewStates] = useState<Map<number, FactReviewState>>(new Map());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [componentState, setComponentState] = useState<ComponentState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "remaining">("all");
  const [completionResult, setCompletionResult] = useState<{ inserted: number; rejected: number } | null>(null);

  useEffect(() => {
    fetchFacts();
  }, [jobId]);

  const fetchFacts = async () => {
    try {
      setComponentState("loading");
      setError(null);
      const response = await fetch(`/api/cassidy/facts/${jobId}`, { credentials: "include" });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to fetch facts");
      }
      const data = await response.json();
      setFacts(data.facts);
      setClientId(data.client_id);

      if (data.job_status === "facts_reviewed") {
        setCompletionResult({ inserted: data.approved, rejected: data.rejected });
        setComponentState("completed");
        return;
      }

      setComponentState("reviewing");

      const initial = new Map<number, FactReviewState>();
      data.facts.forEach((f: any, idx: number) => {
        initial.set(idx, { status: f.status || "pending" });
      });
      setReviewStates(initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setComponentState("error");
    }
  };

  const approveFact = useCallback((index: number) => {
    setReviewStates((prev) => {
      const next = new Map(prev);
      next.set(index, { status: "approved" });
      return next;
    });
  }, []);

  const rejectFact = useCallback((index: number) => {
    setReviewStates((prev) => {
      const next = new Map(prev);
      next.set(index, { status: "rejected" });
      return next;
    });
  }, []);

  const resetFact = useCallback((index: number) => {
    setReviewStates((prev) => {
      const next = new Map(prev);
      next.set(index, { status: "pending" });
      return next;
    });
  }, []);

  const openEdit = useCallback((index: number) => {
    setEditingIndex(index);
  }, []);

  const saveEdit = useCallback(
    (factValue: string, normalizedValue: string, editorNote: string) => {
      if (editingIndex === null) return;
      setReviewStates((prev) => {
        const next = new Map(prev);
        next.set(editingIndex, {
          status: "edited",
          editedValue: factValue,
          editedNormalized: normalizedValue,
          editorNote: editorNote,
        });
        return next;
      });
      setEditingIndex(null);
    },
    [editingIndex],
  );

  const approveAllHigh = useCallback(() => {
    setReviewStates((prev) => {
      const next = new Map(prev);
      facts.forEach((fact, idx) => {
        if (fact.confidence === "HIGH" && (prev.get(idx)?.status === "pending")) {
          next.set(idx, { status: "approved" });
        }
      });
      return next;
    });
    setFilterMode("remaining");
  }, [facts]);

  const progress = useMemo(() => {
    let approved = 0, rejected = 0, edited = 0;
    reviewStates.forEach((state) => {
      if (state.status === "approved") approved++;
      else if (state.status === "rejected") rejected++;
      else if (state.status === "edited") edited++;
    });
    return { approved, rejected, edited, total: facts.length, reviewed: approved + rejected + edited };
  }, [reviewStates, facts.length]);

  const allReviewed = progress.total > 0 && progress.reviewed === progress.total;

  const filteredFacts = useMemo(() => {
    return facts
      .map((fact, idx) => ({
        idx,
        fact,
        reviewState: reviewStates.get(idx) || { status: "pending" as const },
      }))
      .filter(({ reviewState }) => {
        if (filterMode === "remaining") return reviewState.status === "pending";
        return true;
      });
  }, [facts, reviewStates, filterMode]);

  const highCount = useMemo(() => facts.filter((f) => f.confidence === "HIGH").length, [facts]);
  const pendingHighCount = useMemo(() => {
    let count = 0;
    facts.forEach((f, idx) => {
      if (f.confidence === "HIGH" && (reviewStates.get(idx)?.status === "pending")) count++;
    });
    return count;
  }, [facts, reviewStates]);

  const completeReview = async () => {
    if (!allReviewed) {
      setError("Please review all facts before completing.");
      return;
    }

    setComponentState("completing");
    setError(null);

    try {
      const actions = facts.map((_, idx) => {
        const state = reviewStates.get(idx)!;
        const action: any = { fact_index: idx, action: state.status === "edited" ? "edit" : state.status === "approved" ? "approve" : "reject" };
        if (state.status === "edited") {
          action.fact_value = state.editedValue;
          action.normalized_value = state.editedNormalized;
          action.editor_note = state.editorNote;
        }
        return action;
      });

      const response = await apiRequest("POST", "/api/cassidy/facts/complete-review", {
        job_id: jobId,
        actions,
      });
      const result = await response.json();
      setCompletionResult({ inserted: result.inserted, rejected: result.rejected });
      setComponentState("completed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete review");
      setComponentState("reviewing");
    }
  };

  if (componentState === "loading") {
    return (
      <Card data-testid="review-queue-loading">
        <CardContent className="pt-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading facts for review...</p>
        </CardContent>
      </Card>
    );
  }

  if (componentState === "error" && facts.length === 0) {
    return (
      <Alert variant="destructive" data-testid="review-queue-error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error || "Failed to load facts."}{" "}
          <Button variant="link" className="p-0 h-auto" onClick={fetchFacts} data-testid="button-retry-load">
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (componentState === "completed") {
    return (
      <Card data-testid="review-queue-completed">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="font-semibold">Review Complete</h3>
              <p className="text-sm text-muted-foreground">
                {completionResult?.inserted || 0} facts saved, {completionResult?.rejected || 0} rejected.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {clientId && (
              <Button onClick={() => onComplete?.(clientId)} data-testid="button-generate-profile-draft">
                <FileText className="h-4 w-4 mr-2" />
                Generate Profile Draft
              </Button>
            )}
            {onBack && (
              <Button variant="outline" onClick={onBack} data-testid="button-back-to-intake">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Intake
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="review-queue">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Review Extracted Facts</CardTitle>
          <CardDescription>
            {progress.total} facts extracted{" "}
            <span className="mx-1">•</span>
            <span className="text-green-600 dark:text-green-400">{progress.approved} approved</span>
            <span className="mx-1">•</span>
            <span className="text-red-600 dark:text-red-400">{progress.rejected} rejected</span>
            <span className="mx-1">•</span>
            <span className="text-blue-600 dark:text-blue-400">{progress.edited} edited</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Progress</span>
              <span data-testid="text-review-progress">{progress.reviewed} / {progress.total}</span>
            </div>
            <Progress value={progress.total > 0 ? (progress.reviewed / progress.total) * 100 : 0} data-testid="progress-review" />
          </div>

          {error && (
            <Alert variant="destructive" data-testid="alert-review-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 flex-wrap">
            {pendingHighCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={approveAllHigh}
                data-testid="button-approve-all-high"
              >
                <Check className="h-4 w-4 mr-1" />
                Approve All HIGH ({pendingHighCount})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterMode((prev) => (prev === "remaining" ? "all" : "remaining"))}
              data-testid="button-toggle-filter"
            >
              {filterMode === "remaining" ? `Show All (${progress.total})` : `Show Remaining (${progress.total - progress.reviewed})`}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filteredFacts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground" data-testid="text-no-remaining">
              {filterMode === "remaining"
                ? "All facts have been reviewed! Click \"Complete Review\" below."
                : "No facts to display."}
            </CardContent>
          </Card>
        ) : (
          filteredFacts.map(({ idx, fact, reviewState }) => (
            <FactReviewCard
              key={idx}
              index={idx}
              fact={fact}
              reviewState={reviewState}
              onApprove={() => approveFact(idx)}
              onReject={() => rejectFact(idx)}
              onEdit={() => openEdit(idx)}
              onReset={() => resetFact(idx)}
            />
          ))
        )}
      </div>

      {editingIndex !== null && (
        <FactEditDialog
          fact={facts[editingIndex]}
          onSave={saveEdit}
          onCancel={() => setEditingIndex(null)}
        />
      )}

      <Button
        onClick={completeReview}
        disabled={!allReviewed || componentState === "completing"}
        className="w-full"
        size="lg"
        data-testid="button-complete-review"
      >
        {componentState === "completing" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Completing...
          </>
        ) : allReviewed ? (
          "Complete Review"
        ) : (
          `Review remaining ${progress.total - progress.reviewed} facts to complete`
        )}
      </Button>
    </div>
  );
}
