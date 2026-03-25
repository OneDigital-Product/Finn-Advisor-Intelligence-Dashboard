import { useEffect, useState } from "react";

export interface Fact {
  fact_type: string;
  fact_label: string;
  fact_value: string;
  normalized_value: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  source_snippet: string;
  source_reference: string;
  ambiguity_flag: boolean;
  review_required: boolean;
}

export interface MissingField {
  category: string;
  reason: string;
}

export interface PossibleEntity {
  entity_type: string;
  entity_name: string;
  entity_role: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface IntakeWarning {
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface IntakeOutput {
  facts: Fact[];
  missing_fields: MissingField[];
  possible_entities: PossibleEntity[];
  summary: string;
  warnings: IntakeWarning[];
}

export interface UseIntakeJobReturn {
  status: "pending" | "in_progress" | "completed" | "failed" | "timed_out";
  data?: IntakeOutput;
  error?: string;
  isLoading: boolean;
}

function parseIntakeResult(result: any): IntakeOutput {
  const output = result.output || {};
  return {
    facts: output.facts || [],
    missing_fields: output.missing_fields || [],
    possible_entities: output.possible_entities || [],
    summary: output.summary || "",
    warnings: output.warnings || [],
  };
}

export function useIntakeJob(jobId: string | null): UseIntakeJobReturn {
  const [status, setStatus] = useState<UseIntakeJobReturn["status"]>("pending");
  const [data, setData] = useState<IntakeOutput | undefined>();
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
            setData(parseIntakeResult(update));
            setIsLoading(false);
            setError(undefined);
            eventSource?.close();
          } else if (update.status === "timed_out") {
            setIsLoading(false);
            setError("Request timed out after 120 seconds");
            eventSource?.close();
          } else if (update.status === "failed") {
            setIsLoading(false);
            setError(update.error || "Request failed");
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
                setData(parseIntakeResult(result));
                setIsLoading(false);
              } else if (result.status === "failed" || result.status === "timed_out") {
                setError(result.error || "Request failed");
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
