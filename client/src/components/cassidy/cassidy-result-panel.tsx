import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  X,
} from "lucide-react";
import type { CassidyAnalysisResult } from "./cassidy-analysis-button";

interface CassidyResultPanelProps {
  open: boolean;
  onClose: () => void;
  jobStatus: string;
  result: CassidyAnalysisResult | null;
  error: string | null;
  onRetry: () => void;
}

interface DraftSection {
  title: string;
  content: string;
}

function extractDraftSections(output: Record<string, unknown>): DraftSection[] {
  const raw = output.draft_sections;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (s): s is DraftSection =>
      typeof s === "object" && s !== null && typeof s.title === "string" && typeof s.content === "string",
  );
}

export function CassidyResultPanel({
  open,
  onClose,
  jobStatus,
  result,
  error,
  onRetry,
}: CassidyResultPanelProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col" data-testid="cassidy-result-panel">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg" data-testid="text-panel-title">
              Analysis Results
            </SheetTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose} data-testid="button-close-panel">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SheetDescription className="sr-only">
            Cassidy analysis results panel
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {(jobStatus === "submitting" || jobStatus === "pending") && (
            <LoadingState jobStatus={jobStatus} />
          )}

          {jobStatus === "timed_out" && (
            <TimeoutState onRetry={onRetry} onClose={onClose} />
          )}

          {(jobStatus === "failed" || (error && jobStatus !== "timed_out")) && (
            <ErrorState error={error} onRetry={onRetry} onClose={onClose} />
          )}

          {jobStatus === "completed" && result && (
            <CompletedState result={result} />
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function LoadingState({ jobStatus }: { jobStatus: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4" data-testid="panel-loading">
      <div className="relative">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">
          {jobStatus === "submitting" ? "Starting analysis..." : "Processing your request..."}
        </p>
        <p className="text-xs text-muted-foreground">
          Typically completes in 5–15 seconds
        </p>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
        <Clock className="h-3.5 w-3.5" />
        <span>Timeout: 2 minutes</span>
      </div>
    </div>
  );
}

function TimeoutState({ onRetry, onClose }: { onRetry: () => void; onClose: () => void }) {
  return (
    <div className="py-12 space-y-4" data-testid="panel-timeout">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div>
          <p className="text-sm font-medium">Analysis Timed Out</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            The request didn't complete within 2 minutes.
          </p>
        </div>
      </div>
      <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Possible reasons:</p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>High system load</li>
          <li>Complex analysis requiring more processing time</li>
          <li>Temporary network issues</li>
        </ul>
      </div>
      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={onRetry} data-testid="button-panel-retry-timeout">
          Try Again
        </Button>
        <Button size="sm" variant="outline" onClick={onClose} data-testid="button-panel-cancel-timeout">
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ErrorState({
  error,
  onRetry,
  onClose,
}: {
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="py-12 space-y-4" data-testid="panel-error">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <p className="text-sm font-medium">Analysis Failed</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {error || "An unexpected error occurred while processing your request."}
          </p>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={onRetry} data-testid="button-panel-retry-error">
          Try Again
        </Button>
        <Button size="sm" variant="outline" onClick={onClose} data-testid="button-panel-cancel-error">
          Cancel
        </Button>
      </div>
    </div>
  );
}

function CompletedState({ result }: { result: CassidyAnalysisResult }) {
  const content = result.fin_response || "";
  const output = result.output || {};
  const nextSteps = result.agent_trace?.context?.recommended_next_steps || [];
  const calledAgent = result.called_agent || "cassidy";
  const sections = extractDraftSections(output);

  return (
    <div className="space-y-5 pb-6" data-testid="panel-completed">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs no-default-active-elevate" data-testid="badge-agent">
          {calledAgent}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {new Date().toLocaleTimeString()}
        </span>
      </div>

      {content && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Summary</h4>
          <div
            className="text-sm leading-relaxed whitespace-pre-wrap text-foreground"
            data-testid="text-panel-response"
          >
            {content}
          </div>
        </div>
      )}

      {sections.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Sections</h4>
          {sections.map((section, i) => (
            <div key={i} className="rounded-md border p-3 space-y-1" data-testid={`panel-section-${i}`}>
              <p className="text-xs font-medium text-muted-foreground">{section.title}</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{section.content}</p>
            </div>
          ))}
        </div>
      )}

      {!content && !sections.length && Object.keys(output).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Output</h4>
          <pre
            className="rounded-md bg-muted p-3 text-xs overflow-auto max-h-80 font-mono whitespace-pre-wrap"
            data-testid="text-panel-raw-output"
          >
            {JSON.stringify(output, null, 2)}
          </pre>
        </div>
      )}

      {nextSteps.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Suggested Next Steps
          </h4>
          <ul className="space-y-2">
            {nextSteps.map((step: string, i: number) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm rounded-md bg-primary/5 p-2"
                data-testid={`text-panel-step-${i}`}
              >
                <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.suggested_prompts && result.suggested_prompts.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <h4 className="text-sm font-semibold">Follow-up Questions</h4>
          <div className="flex flex-wrap gap-2">
            {result.suggested_prompts.map((prompt, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-xs cursor-default no-default-active-elevate"
                data-testid={`badge-prompt-${i}`}
              >
                {prompt}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
