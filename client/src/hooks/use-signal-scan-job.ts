import { useEffect, useState } from "react";

export interface DetectedSignalOutput {
  id?: string;
  signal_type: string;
  description: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  materiality: "CRITICAL" | "IMPORTANT";
  source_snippet?: string;
  date_reference?: string;
  recommended_actions?: RecommendedAction[];
  review_required?: boolean;
  duplicate_likelihood?: string;
  reasoning?: string;
}

export interface RecommendedAction {
  action_type: string;
  description: string;
  workflow_phase?: string;
}

export interface SignalWarning {
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface SignalScanOutput {
  signals: DetectedSignalOutput[];
  no_signal_summary?: string;
  warnings: SignalWarning[];
  processing_time_ms?: number;
}

export interface UseSignalScanJobReturn {
  status: "pending" | "in_progress" | "completed" | "failed" | "timed_out";
  data?: SignalScanOutput;
  error?: string;
  isLoading: boolean;
}

function parseSignalResult(result: any): SignalScanOutput {
  const output = result.output || {};
  return {
    signals: output.signals || [],
    no_signal_summary: output.no_signal_summary || "",
    warnings: output.warnings || [],
    processing_time_ms: output.processing_time_ms,
  };
}

export function useSignalScanJob(jobId: string | null): UseSignalScanJobReturn {
  const [status, setStatus] = useState<UseSignalScanJobReturn["status"]>("pending");
  const [data, setData] = useState<SignalScanOutput | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!jobId) {
      setIsLoading(false);
      return;
    }

    let eventSource: EventSource | null = null;
    let aborted = false;

    const connectSSE = () => {
      eventSource = new EventSource(`/api/cassidy/stream/${jobId}`);

      eventSource.addEventListener("message", (event) => {
        if (aborted) return;

        try {
          const update = JSON.parse(event.data);
          setStatus(update.status);

          if (update.status === "completed") {
            setData(parseSignalResult(update));
            setIsLoading(false);
            setError(undefined);
            eventSource?.close();
          } else if (update.status === "timed_out") {
            setIsLoading(false);
            setError("Signal detection timed out after 120 seconds");
            eventSource?.close();
          } else if (update.status === "failed") {
            setIsLoading(false);
            setError(update.error || "Signal detection failed");
            eventSource?.close();
          }
        } catch {
        }
      });

      eventSource.onerror = () => {
        if (aborted) return;

        eventSource?.close();

        fetch(`/api/cassidy/stream/${jobId}`)
          .then(async (res) => {
            if (aborted) return;
            if (!res.ok) {
              setIsLoading(false);
              setStatus("failed");
              setError(res.status === 404 ? "Job not found" : "Connection failed");
              return;
            }

            const contentType = res.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
              const result = await res.json();
              if (aborted) return;

              if (result.error) {
                setStatus("failed");
                setError(result.error);
                setIsLoading(false);
                return;
              }

              setStatus(result.status);
              if (result.status === "completed") {
                setData(parseSignalResult(result));
                setIsLoading(false);
              } else if (result.status === "failed" || result.status === "timed_out") {
                setError(result.error || "Signal detection failed");
                setIsLoading(false);
              }
            } else {
              setIsLoading(false);
              setStatus("failed");
              setError("Connection to server lost");
            }
          })
          .catch(() => {
            if (aborted) return;
            setIsLoading(false);
            setStatus("failed");
            setError("Failed to connect to server");
          });
      };
    };

    setStatus("in_progress");
    connectSSE();

    return () => {
      aborted = true;
      eventSource?.close();
    };
  }, [jobId]);

  return { status, data, error, isLoading };
}
