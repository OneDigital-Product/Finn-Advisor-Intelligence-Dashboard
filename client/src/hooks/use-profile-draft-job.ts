import { useEffect, useState } from "react";

export interface QuestionResponse {
  question_id: string;
  question_text: string;
  proposed_answer: string | null;
  answer_format: string;
  confidence: "HIGH" | "MEDIUM" | "LOW" | null;
  evidence_snippets: string[];
  source_references: Array<{ fact_label: string; fact_value: string }>;
  review_required: boolean;
  reasoning_summary: string;
  conflict_flag: boolean;
}

export interface UnansweredQuestion {
  question_id: string;
  question_text: string;
  reason: string;
}

export interface ClarificationNeeded {
  fact_label: string;
  current_value: string;
  needed_clarification: string;
  severity: "info" | "warning" | "critical";
}

export interface ProfileDraftOutput {
  question_responses: QuestionResponse[];
  unanswered_questions: UnansweredQuestion[];
  clarifications_needed: ClarificationNeeded[];
  overall_confidence_summary: string;
  profile_mode: "individual" | "legal_entity";
}

export interface UseProfileDraftJobReturn {
  status: "pending" | "in_progress" | "completed" | "failed" | "timed_out";
  data?: ProfileDraftOutput;
  error?: string;
  isLoading: boolean;
}

function parseProfileDraftResult(result: any): ProfileDraftOutput {
  const output = result.output || {};
  return {
    question_responses: output.question_responses || [],
    unanswered_questions: output.unanswered_questions || [],
    clarifications_needed: output.clarifications_needed || [],
    overall_confidence_summary: output.overall_confidence_summary || "",
    profile_mode: output.profile_mode || "individual",
  };
}

export function useProfileDraftJob(jobId: string | null): UseProfileDraftJobReturn {
  const [status, setStatus] = useState<UseProfileDraftJobReturn["status"]>("pending");
  const [data, setData] = useState<ProfileDraftOutput | undefined>();
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
            setData(parseProfileDraftResult(update));
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
        } catch {}
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
                setData(parseProfileDraftResult(result));
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
