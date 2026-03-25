import { useEffect, useState } from "react";

export interface FinDocument {
  url: string;
  name: string;
  format: string;
}

export interface SuggestedPromptObject {
  title: string;
  prompt: string;
}

export interface CassidyJobResult {
  fin_response: string;
  fin_report: string;
  suggested_prompts: string[];
  called_agent: string;
  documents: FinDocument[];
  review_required: boolean;
  suggested_prompt_objects: SuggestedPromptObject[];
  agent_trace: {
    routing_decision: string;
    primary_agent: string;
    secondary_agents: string[];
    context: {
      intent: string;
      client_segment: string;
      recommended_next_steps: string[];
      warnings?: string;
    };
  };
}

export interface UseCassidyJobReturn {
  status: "pending" | "in_progress" | "completed" | "failed" | "timed_out";
  data?: CassidyJobResult;
  error?: string;
  isLoading: boolean;
}

function parseJobResult(result: any): CassidyJobResult {
  return {
    fin_response: result.fin_response || result.finResponse || "",
    fin_report: result.fin_report || result.finReport || "",
    suggested_prompts: result.suggested_prompts || [],
    called_agent: result.called_agent || result.calledAgent || "",
    documents: result.documents || [],
    review_required: result.review_required ?? result.reviewRequired ?? false,
    suggested_prompt_objects: result.suggested_prompt_objects || result.suggestedPrompts?.filter((p: any) => typeof p === "object" && p.title) || [],
    agent_trace: result.agent_trace || {
      routing_decision: "",
      primary_agent: result.called_agent || result.calledAgent || "",
      secondary_agents: [],
      context: { intent: "", client_segment: "", recommended_next_steps: [] },
    },
  };
}

export function useCassidyJob(jobId: string | null): UseCassidyJobReturn {
  const [status, setStatus] = useState<UseCassidyJobReturn["status"]>("pending");
  const [data, setData] = useState<CassidyJobResult | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!jobId) {
      setIsLoading(false);
      setStatus("pending");
      setData(undefined);
      setError(undefined);
      return;
    }

    setIsLoading(true);
    setStatus("pending");
    setData(undefined);
    setError(undefined);

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
            setData(parseJobResult(update));
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
          // parse error — ignore
        }
      });

      eventSource.onerror = (e) => {
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
                setData(parseJobResult(result));
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
