import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { OverrideAnswerModal } from "./override-answer-modal";
import type { QuestionResponse } from "@/hooks/use-profile-draft-job";

interface ProfileCommitWizardProps {
  jobId: string;
  clientId: string;
  profileMode: string;
  draftQuestions: QuestionResponse[];
  onComplete?: (profileId: string, version: number) => void;
}

type AnswerAction = "accept" | "override" | "skip";

interface ActionState {
  action: AnswerAction;
  customAnswer?: string;
  reasoning?: string;
}

export function ProfileCommitWizard({
  jobId,
  clientId,
  profileMode,
  draftQuestions,
  onComplete,
}: ProfileCommitWizardProps) {
  const [answerActions, setAnswerActions] = useState<Map<string, ActionState>>(new Map());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [wizardState, setWizardState] = useState<"reviewing" | "committing" | "completed">("reviewing");
  const [priorAnswers, setPriorAnswers] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [commitResult, setCommitResult] = useState<any>(null);

  useEffect(() => {
    const fetchPrior = async () => {
      try {
        const response = await fetch(`/api/cassidy/profile-diff/${clientId}/${profileMode}`, { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          if (data.answered_questions) {
            setPriorAnswers(data.answered_questions);
          }
        }
      } catch {}
    };
    fetchPrior();
  }, [clientId, profileMode]);

  const setAction = useCallback((questionId: string, action: AnswerAction) => {
    setAnswerActions((prev) => {
      const next = new Map(prev);
      const existing = next.get(questionId);
      next.set(questionId, { ...existing, action });
      return next;
    });
    setError(null);
  }, []);

  const handleOverrideSave = useCallback((answer: string, reasoning: string) => {
    const q = draftQuestions[currentIdx];
    setAnswerActions((prev) => {
      const next = new Map(prev);
      next.set(q.question_id, { action: "override", customAnswer: answer, reasoning });
      return next;
    });
    setOverrideOpen(false);
    setError(null);
  }, [currentIdx, draftQuestions]);

  const reviewedCount = useMemo(() => answerActions.size, [answerActions]);
  const allReviewed = reviewedCount === draftQuestions.length;

  const handleCommit = async () => {
    if (!allReviewed) {
      setError(`Please review all questions. ${draftQuestions.length - reviewedCount} remaining.`);
      return;
    }

    setWizardState("committing");
    setError(null);

    try {
      const actionsList = draftQuestions.map((q) => {
        const state = answerActions.get(q.question_id);
        return {
          question_id: q.question_id,
          action: state?.action || "skip",
          custom_answer: state?.action === "override" ? state.customAnswer : null,
          reasoning: state?.action === "override" ? state.reasoning : null,
        };
      });

      const response = await apiRequest("POST", "/api/cassidy/profile-commit", {
        job_id: jobId,
        client_id: clientId,
        profile_mode: profileMode,
        answer_actions: actionsList,
      });

      const result = await response.json();
      setCommitResult(result);
      setWizardState("completed");
      onComplete?.(result.investor_profile_id, result.version_number);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to commit profile");
      setWizardState("reviewing");
    }
  };

  if (wizardState === "completed") {
    return (
      <Card data-testid="profile-commit-success">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="font-semibold">Profile Committed Successfully</h3>
              <p className="text-sm text-muted-foreground">
                Version {commitResult?.version_number} saved.
                {commitResult?.accepted > 0 && ` ${commitResult.accepted} accepted.`}
                {commitResult?.overridden > 0 && ` ${commitResult.overridden} overridden.`}
                {commitResult?.skipped > 0 && ` ${commitResult.skipped} skipped.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (draftQuestions.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No draft questions available to commit.</AlertDescription>
      </Alert>
    );
  }

  const currentQ = draftQuestions[currentIdx];
  const currentAction = answerActions.get(currentQ.question_id);
  const priorAnswer = priorAnswers[currentQ.question_id];
  const hasDiff = priorAnswer && priorAnswer.answer !== currentQ.proposed_answer;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Commit Investor Profile</CardTitle>
          <CardDescription>
            Question {currentIdx + 1} of {draftQuestions.length}
            <span className="mx-2">•</span>
            {reviewedCount} of {draftQuestions.length} reviewed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress
            value={(reviewedCount / draftQuestions.length) * 100}
            className="h-2"
            data-testid="progress-commit"
          />
        </CardContent>
      </Card>

      <Card data-testid={`commit-question-card-${currentIdx}`}>
        <CardContent className="pt-6 space-y-5">
          <p className="font-medium" data-testid="text-commit-question">{currentQ.question_text}</p>

          <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
            <p className="text-xs font-medium text-primary mb-1">Draft Answer (Cassidy)</p>
            <p className="text-sm" data-testid="text-draft-answer">{currentQ.proposed_answer}</p>
            {currentQ.confidence && (
              <Badge className="mt-2 text-xs" variant="outline">{currentQ.confidence} confidence</Badge>
            )}
          </div>

          {priorAnswer && (
            <div className="bg-muted/50 rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-muted-foreground">Prior Answer</p>
                {hasDiff && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                    DIFF
                  </Badge>
                )}
              </div>
              <p className="text-sm" data-testid="text-prior-answer">
                {typeof priorAnswer === "string" ? priorAnswer : priorAnswer.answer}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Your Action</p>
            <RadioGroup
              value={currentAction?.action || ""}
              onValueChange={(v) => {
                if (v === "override") {
                  setOverrideOpen(true);
                }
                setAction(currentQ.question_id, v as AnswerAction);
              }}
              data-testid="radio-answer-action"
            >
              <label
                htmlFor={`accept-${currentIdx}`}
                className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
              >
                <RadioGroupItem value="accept" id={`accept-${currentIdx}`} />
                <div className="flex-1">
                  <p className="font-medium text-sm">Accept Draft Answer</p>
                  <p className="text-xs text-muted-foreground">Use Cassidy's proposed answer</p>
                </div>
              </label>

              <label
                htmlFor={`override-${currentIdx}`}
                className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
              >
                <RadioGroupItem value="override" id={`override-${currentIdx}`} />
                <div className="flex-1">
                  <p className="font-medium text-sm">Override with Custom Answer</p>
                  <p className="text-xs text-muted-foreground">Provide your own answer</p>
                  {currentAction?.action === "override" && currentAction.customAnswer && (
                    <p className="text-xs text-primary mt-1 italic">"{currentAction.customAnswer}"</p>
                  )}
                </div>
              </label>

              <label
                htmlFor={`skip-${currentIdx}`}
                className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
              >
                <RadioGroupItem value="skip" id={`skip-${currentIdx}`} />
                <div className="flex-1">
                  <p className="font-medium text-sm">Skip This Question</p>
                  <p className="text-xs text-muted-foreground">Leave unanswered</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {error && (
            <Alert variant="destructive" data-testid="alert-commit-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          data-testid="button-previous-question"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>

        <Button
          variant="outline"
          onClick={() => setCurrentIdx((i) => Math.min(draftQuestions.length - 1, i + 1))}
          disabled={currentIdx === draftQuestions.length - 1}
          data-testid="button-next-question"
        >
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>

        <div className="flex-1" />

        <Button
          onClick={handleCommit}
          disabled={!allReviewed || wizardState === "committing"}
          data-testid="button-commit-profile"
        >
          {wizardState === "committing" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Committing...
            </>
          ) : (
            "Save & Commit Profile"
          )}
        </Button>
      </div>

      <OverrideAnswerModal
        open={overrideOpen}
        questionText={currentQ.question_text}
        draftAnswer={currentQ.proposed_answer || ""}
        currentAnswer={currentAction?.customAnswer}
        onSave={handleOverrideSave}
        onCancel={() => {
          setOverrideOpen(false);
          if (!currentAction?.customAnswer) {
            setAnswerActions((prev) => {
              const next = new Map(prev);
              next.delete(currentQ.question_id);
              return next;
            });
          }
        }}
      />
    </div>
  );
}
