import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, HelpCircle, AlertCircle, Loader2, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileDraftJob } from "@/hooks/use-profile-draft-job";
import type { QuestionResponse, UnansweredQuestion, ClarificationNeeded } from "@/hooks/use-profile-draft-job";

interface ProfileDraftViewerProps {
  jobId: string;
  profileMode: string;
  onCommit?: (jobId: string) => void;
}

function confidenceColor(confidence: string | null) {
  switch (confidence) {
    case "HIGH":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "MEDIUM":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    case "LOW":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function confidenceValue(confidence: string | null) {
  switch (confidence) {
    case "HIGH": return 100;
    case "MEDIUM": return 66;
    case "LOW": return 33;
    default: return 0;
  }
}

export function ProfileDraftViewer({ jobId, profileMode, onCommit }: ProfileDraftViewerProps) {
  const { status, data, error, isLoading } = useProfileDraftJob(jobId);

  if (isLoading || status === "pending" || status === "in_progress") {
    return (
      <Card data-testid="profile-draft-loading">
        <CardHeader>
          <CardTitle>Generating Profile Draft</CardTitle>
          <CardDescription>
            The AI agent is mapping approved facts to investor profile questions...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              This typically takes 5-10 seconds.
            </p>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "failed" || status === "timed_out") {
    return (
      <Alert variant="destructive" data-testid="profile-draft-error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error || "Profile draft generation failed. Please try again."}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No profile draft data available.</AlertDescription>
      </Alert>
    );
  }

  const answered = data.question_responses.filter((q) => q.proposed_answer);
  const conflicts = data.question_responses.filter((q) => q.conflict_flag);
  const reviewRequired = data.question_responses.filter((q) => q.review_required);

  return (
    <div className="space-y-6" data-testid="profile-draft-viewer">
      <Card>
        <CardHeader>
          <CardTitle>Investor Profile Draft</CardTitle>
          <CardDescription>
            Mode: {profileMode === "individual" ? "Individual" : "Legal Entity"}
            <span className="mx-1">•</span>
            {answered.length} answered
            <span className="mx-1">•</span>
            {data.unanswered_questions.length} unanswered
            {conflicts.length > 0 && (
              <>
                <span className="mx-1">•</span>
                <span className="text-amber-600">{conflicts.length} conflicts</span>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.overall_confidence_summary && (
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/20" data-testid="text-overall-confidence">
              <p className="text-sm font-medium mb-1">Overall Confidence</p>
              <p className="text-sm text-muted-foreground">{data.overall_confidence_summary}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3" data-testid="profile-draft-stats">
            <div className="bg-green-50 dark:bg-green-900/10 rounded p-3 text-center border border-green-200 dark:border-green-800">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{answered.length}</p>
              <p className="text-xs text-green-800 dark:text-green-400">Answered</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded p-3 text-center border border-amber-200 dark:border-amber-800">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.unanswered_questions.length}</p>
              <p className="text-xs text-amber-800 dark:text-amber-400">Unanswered</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/10 rounded p-3 text-center border border-red-200 dark:border-red-800">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{conflicts.length}</p>
              <p className="text-xs text-red-800 dark:text-red-400">Conflicts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {data.clarifications_needed.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-700" data-testid="clarifications-section">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Clarifications Needed ({data.clarifications_needed.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {data.clarifications_needed.map((c: ClarificationNeeded, idx: number) => (
                <li key={idx} className="text-sm border-l-2 border-amber-300 pl-3" data-testid={`clarification-${idx}`}>
                  <span className="font-medium">{c.fact_label}</span>
                  {c.current_value && (
                    <span className="text-muted-foreground"> (current: {c.current_value})</span>
                  )}
                  <p className="text-muted-foreground mt-0.5">{c.needed_clarification}</p>
                  <Badge variant="outline" className="mt-1 text-xs capitalize">{c.severity}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {answered.length > 0 && (
        <div data-testid="answered-questions-section">
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Proposed Answers ({answered.length})
          </h3>
          <div className="space-y-3">
            {answered.map((q: QuestionResponse, idx: number) => (
              <Card
                key={q.question_id || idx}
                className={cn(
                  q.conflict_flag && "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-900/10",
                )}
                data-testid={`question-card-${idx}`}
              >
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-sm flex-1" data-testid={`text-question-${idx}`}>
                      {q.question_text}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {q.conflict_flag && (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          Conflict
                        </Badge>
                      )}
                      <Badge className={confidenceColor(q.confidence)} data-testid={`badge-question-confidence-${idx}`}>
                        {q.confidence || "N/A"}
                      </Badge>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded p-3 border">
                    <p className="text-xs text-muted-foreground mb-1">Proposed Answer</p>
                    <p className="text-sm font-medium" data-testid={`text-answer-${idx}`}>
                      {q.proposed_answer}
                    </p>
                  </div>

                  <div>
                    <Progress value={confidenceValue(q.confidence)} className="h-1.5" />
                  </div>

                  {q.evidence_snippets && q.evidence_snippets.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-1.5">Evidence</p>
                      <div className="space-y-1">
                        {q.evidence_snippets.map((snippet: string, si: number) => (
                          <div key={si} className="text-xs text-muted-foreground bg-muted/50 p-2 rounded italic">
                            "{snippet}"
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.reasoning_summary && (
                    <div className="text-xs text-muted-foreground italic">
                      <span className="font-medium not-italic">Reasoning:</span> {q.reasoning_summary}
                    </div>
                  )}

                  {q.source_references && q.source_references.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Sources</p>
                      {q.source_references.map((ref, ri) => (
                        <p key={ri}>• {ref.fact_label}: {ref.fact_value}</p>
                      ))}
                    </div>
                  )}

                  {q.review_required && (
                    <Alert className="bg-yellow-50 border-yellow-300 dark:bg-yellow-900/10 dark:border-yellow-700">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800 dark:text-yellow-400 text-xs">
                        This answer requires manual review
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {data.unanswered_questions.length > 0 && (
        <Card className="border-muted" data-testid="unanswered-questions-section">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              Unanswered Questions ({data.unanswered_questions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {data.unanswered_questions.map((q: UnansweredQuestion, idx: number) => (
                <li key={q.question_id || idx} className="text-sm border-l-2 border-muted-foreground/30 pl-3" data-testid={`unanswered-${idx}`}>
                  <p className="font-medium">{q.question_text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Reason: {q.reason}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {answered.length > 0 && onCommit && (
        <div className="flex justify-end">
          <Button onClick={() => onCommit(jobId)} size="lg" data-testid="button-review-commit-profile">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Review & Commit Profile
          </Button>
        </div>
      )}
    </div>
  );
}
