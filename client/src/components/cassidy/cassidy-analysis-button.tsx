import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import { CassidyResultPanel } from "./cassidy-result-panel";

export type CassidyTaskType =
  | "query"
  | "analysis"
  | "report"
  | "recommendation"
  | "compliance_check"
  | "intake_extraction"
  | "investor_profile_draft"
  | "signal_detection"
  | "report_generation";

export interface CassidyAgentTrace {
  routing_decision: string;
  primary_agent: string;
  secondary_agents: string[];
  context: {
    intent: string;
    client_segment: string;
    recommended_next_steps: string[];
    warnings?: string;
  };
}

export interface CassidyAnalysisButtonProps {
  taskType: CassidyTaskType;
  clientId: string;
  context: Record<string, unknown>;
  label?: string;
  onResult?: (result: CassidyAnalysisResult) => void;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  displayMode?: "inline" | "panel";
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface CassidyAnalysisResult {
  jobId: string;
  status: "completed" | "failed" | "timed_out";
  output?: Record<string, unknown>;
  fin_response?: string;
  fin_report?: string;
  called_agent?: string;
  suggested_prompts?: string[];
  agent_trace?: CassidyAgentTrace;
  error?: string;
}

type JobStatus = "idle" | "submitting" | "pending" | "completed" | "failed" | "timed_out";

const TIMEOUT_MS = 120_000;

function parseAgentTrace(raw: unknown): CassidyAgentTrace | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const trace = raw as Record<string, unknown>;
  const ctx = (trace.context as Record<string, unknown>) || {};
  return {
    routing_decision: String(trace.routing_decision || ""),
    primary_agent: String(trace.primary_agent || ""),
    secondary_agents: Array.isArray(trace.secondary_agents) ? trace.secondary_agents.map(String) : [],
    context: {
      intent: String(ctx.intent || ""),
      client_segment: String(ctx.client_segment || ""),
      recommended_next_steps: Array.isArray(ctx.recommended_next_steps) ? ctx.recommended_next_steps.map(String) : [],
      warnings: ctx.warnings ? String(ctx.warnings) : undefined,
    },
  };
}

function buildCompletedResult(jid: string, data: Record<string, unknown>): CassidyAnalysisResult {
  return {
    jobId: jid,
    status: "completed",
    output: (data.output as Record<string, unknown>) || undefined,
    fin_response: data.fin_response ? String(data.fin_response) : undefined,
    fin_report: data.fin_report ? String(data.fin_report) : undefined,
    called_agent: data.called_agent ? String(data.called_agent) : undefined,
    suggested_prompts: Array.isArray(data.suggested_prompts) ? data.suggested_prompts.map(String) : undefined,
    agent_trace: parseAgentTrace(data.agent_trace),
  };
}

export function CassidyAnalysisButton({
  taskType,
  clientId,
  context,
  label = "Analyze",
  onResult,
  variant = "default",
  size = "sm",
  displayMode = "panel",
  className,
  disabled = false,
  icon,
}: CassidyAnalysisButtonProps) {
  const { toast } = useToast();
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>("idle");
  const [result, setResult] = useState<CassidyAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortedRef = useRef(false);
  const jobIdRef = useRef<string | null>(null);
  const sseListenerRef = useRef<((event: MessageEvent) => void) | null>(null);
  const globalSSERef = useRef<EventSource | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (sseListenerRef.current && globalSSERef.current) {
      globalSSERef.current.removeEventListener("cassidy:job_completed", sseListenerRef.current);
      globalSSERef.current.close();
      globalSSERef.current = null;
      sseListenerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const handleComplete = useCallback(
    (analysisResult: CassidyAnalysisResult) => {
      cleanup();
      setResult(analysisResult);
      setJobStatus(analysisResult.status);
      if (analysisResult.error) {
        setError(analysisResult.error);
      }
      if (analysisResult.status === "completed") {
        onResult?.(analysisResult);
      }
    },
    [cleanup, onResult],
  );

  const fetchJobResult = useCallback(
    (jid: string) => {
      fetch(`/api/cassidy/jobs/${jid}`)
        .then(async (res) => {
          if (abortedRef.current) return;
          if (!res.ok) {
            handleComplete({
              jobId: jid,
              status: "failed",
              error: res.status === 404 ? "Job not found" : "Connection failed",
            });
            return;
          }
          const data = await res.json();
          if (abortedRef.current) return;
          if (data.status === "completed") {
            handleComplete(buildCompletedResult(jid, data));
          } else if (data.status === "failed" || data.status === "timed_out") {
            handleComplete({
              jobId: jid,
              status: data.status,
              error: data.error || "Analysis failed",
            });
          }
        })
        .catch(() => {
          if (abortedRef.current) return;
          handleComplete({
            jobId: jid,
            status: "failed",
            error: "Failed to connect to server",
          });
        });
    },
    [handleComplete],
  );

  const listenForGlobalSSE = useCallback(
    (jid: string) => {
      const es = new EventSource("/api/events/stream", { withCredentials: true });
      globalSSERef.current = es;

      const listener = (event: MessageEvent) => {
        if (abortedRef.current) return;
        try {
          const payload = JSON.parse(event.data);
          const eventData = payload.data as Record<string, unknown> | undefined;
          if (eventData?.jobId === jid) {
            fetchJobResult(jid);
          }
        } catch {}
      };

      sseListenerRef.current = listener;
      es.addEventListener("cassidy:job_completed", listener);

      es.onerror = () => {
        if (abortedRef.current) return;
        es.close();
        globalSSERef.current = null;
      };
    },
    [fetchJobResult],
  );

  const connectSSE = useCallback(
    (jid: string) => {
      abortedRef.current = false;

      timeoutRef.current = setTimeout(() => {
        if (abortedRef.current) return;
        cleanup();
        const timedOutResult: CassidyAnalysisResult = {
          jobId: jid,
          status: "timed_out",
          error: "Analysis timed out after 2 minutes. Please try again.",
        };
        handleComplete(timedOutResult);
        toast({
          title: "Analysis timed out",
          description: "The request didn't complete within 2 minutes.",
          variant: "destructive",
        });
      }, TIMEOUT_MS);

      listenForGlobalSSE(jid);

      const es = new EventSource(`/api/cassidy/stream/${jid}`);
      eventSourceRef.current = es;

      es.addEventListener("message", (event) => {
        if (abortedRef.current) return;
        try {
          const update = JSON.parse(event.data);
          if (update.status === "completed") {
            handleComplete(buildCompletedResult(jid, update));
          } else if (update.status === "failed") {
            handleComplete({
              jobId: jid,
              status: "failed",
              error: update.error || "Analysis failed",
            });
          } else if (update.status === "timed_out") {
            handleComplete({
              jobId: jid,
              status: "timed_out",
              error: "Analysis timed out after 2 minutes.",
            });
          }
        } catch {}
      });

      es.onerror = () => {
        if (abortedRef.current) return;
        es.close();
        eventSourceRef.current = null;
        fetchJobResult(jid);
      };
    },
    [cleanup, handleComplete, toast, listenForGlobalSSE, fetchJobResult],
  );

  const handleClick = async () => {
    setJobStatus("submitting");
    setResult(null);
    setError(null);
    setShowPanel(true);

    try {
      const response = await apiRequest("POST", "/api/cassidy/request", {
        advisor_request: `Run ${taskType} analysis`,
        conversation_id: crypto.randomUUID(),
        advisor_name: "Advisor",
        source: "dashboard" as const,
        task_type: taskType,
        client_id: clientId,
        client_context: context,
        metadata: context,
      });

      const data = await response.json();

      if (!data.job_id) {
        throw new Error("No job_id returned from server");
      }

      jobIdRef.current = data.job_id;
      setJobId(data.job_id);
      setJobStatus("pending");
      connectSSE(data.job_id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start analysis";
      setError(message);
      setJobStatus("failed");
      toast({
        title: "Analysis failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleRetry = () => {
    cleanup();
    abortedRef.current = true;
    jobIdRef.current = null;
    setJobId(null);
    setResult(null);
    setError(null);
    setJobStatus("idle");
    handleClick();
  };

  const handleClose = () => {
    cleanup();
    abortedRef.current = true;
    setShowPanel(false);
    jobIdRef.current = null;
    setJobId(null);
    setResult(null);
    setError(null);
    setJobStatus("idle");
  };

  const isLoading = jobStatus === "submitting" || jobStatus === "pending";

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={className}
        data-testid={`button-cassidy-analysis-${taskType}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            {jobStatus === "submitting" ? "Starting..." : "Analyzing..."}
          </>
        ) : (
          <>
            {icon || <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
            {label}
          </>
        )}
      </Button>

      {displayMode === "panel" && showPanel && (
        <CassidyResultPanel
          open={showPanel}
          onClose={handleClose}
          jobStatus={jobStatus}
          result={result}
          error={error}
          onRetry={handleRetry}
        />
      )}

      {displayMode === "inline" && showPanel && (
        <CassidyInlineResult
          jobStatus={jobStatus}
          result={result}
          error={error}
          onRetry={handleRetry}
          onClose={handleClose}
        />
      )}
    </>
  );
}

function CassidyInlineResult({
  jobStatus,
  result,
  error,
  onRetry,
  onClose,
}: {
  jobStatus: JobStatus;
  result: CassidyAnalysisResult | null;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}) {
  if (jobStatus === "submitting" || jobStatus === "pending") {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-md border bg-muted/30 p-3" data-testid="cassidy-inline-loading">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">
          {jobStatus === "submitting" ? "Starting analysis..." : "Waiting for results..."}
        </span>
      </div>
    );
  }

  if (jobStatus === "timed_out") {
    return (
      <div className="mt-3 rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950/30" data-testid="cassidy-inline-timeout">
        <div className="flex items-center gap-2 text-sm font-medium text-yellow-800 dark:text-yellow-200">
          <AlertCircle className="h-4 w-4" />
          Analysis timed out
        </div>
        <p className="mt-1 text-xs text-muted-foreground">The request didn't complete within 2 minutes.</p>
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="outline" onClick={onRetry} data-testid="button-inline-retry">
            Retry
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} data-testid="button-inline-dismiss">
            Dismiss
          </Button>
        </div>
      </div>
    );
  }

  if (jobStatus === "failed" || error) {
    return (
      <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30" data-testid="cassidy-inline-error">
        <div className="flex items-center gap-2 text-sm font-medium text-red-800 dark:text-red-200">
          <AlertCircle className="h-4 w-4" />
          Analysis failed
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{error || "An unexpected error occurred"}</p>
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="outline" onClick={onRetry} data-testid="button-inline-retry-error">
            Retry
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} data-testid="button-inline-dismiss-error">
            Dismiss
          </Button>
        </div>
      </div>
    );
  }

  if (result?.status === "completed") {
    const content = result.fin_response || JSON.stringify(result.output || {}, null, 2);
    const nextSteps = result.agent_trace?.context?.recommended_next_steps || [];

    return (
      <div className="mt-3 space-y-3 rounded-md border p-3" data-testid="cassidy-inline-result">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {result.called_agent && `Agent: ${result.called_agent}`}
          </span>
          <Button size="sm" variant="ghost" onClick={onClose} data-testid="button-inline-close">
            Dismiss
          </Button>
        </div>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{content}</div>
        {nextSteps.length > 0 && (
          <div className="border-t pt-2">
            <p className="text-xs font-medium text-muted-foreground mb-1">Suggested Next Steps</p>
            <ul className="space-y-1">
              {nextSteps.map((step: string, i: number) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5" data-testid={`text-inline-step-${i}`}>
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return null;
}
