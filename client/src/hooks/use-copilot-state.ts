import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

export type FinnMode = "conversation" | "email" | "cheat_sheet" | "pdf" | "brand" | "builder";

interface CopilotResponse {
  job_id: string;
  status: string;
  fin_response?: string;
  fin_report?: string;
  suggested_prompts?: string[];
  called_agent?: string;
  called_mode?: string;
  agent_trace?: any;
  documents?: Array<{ url: string; name: string; format: string }>;
  review_required?: boolean;
  suggested_prompt_objects?: Array<{ title: string; prompt: string }>;
  source?: string;
  [key: string]: any;
}

export interface PageContext {
  route: string;
  section: string;
  clientId: string | null;
  clientName: string | null;
}

interface SubmitPromptParams {
  advisor_request: string;
  conversation_id?: string;
  client_id?: string;
  page_context?: PageContext;
}

export function useCopilotState() {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [response, setResponse] = useState<CopilotResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [finnModeError, setFinnModeError] = useState<string | null>(null);

  const pollJob = useCallback(async (jobId: string): Promise<CopilotResponse | null> => {
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        const res = await fetch(`/api/cassidy/jobs/${jobId}`, { credentials: "include" });
        if (!res.ok) continue;
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) continue;
        const jobData = await res.json();
        if (jobData.status === "completed") {
          return jobData;
        }
        if (jobData.status === "failed") {
          const errorText = typeof jobData.error === "string" ? jobData.error : "I'm sorry, I couldn't process your request. Please try again.";
          return {
            job_id: jobId,
            status: "failed",
            fin_response: errorText,
            called_agent: "error",
          };
        }
        if (jobData.status === "timed_out") {
          const timeoutText = typeof jobData.error === "string" ? jobData.error : "Your request took too long to process. Please try again with a simpler question, or try later.";
          return {
            job_id: jobId,
            status: "timed_out",
            fin_response: timeoutText,
            called_agent: "error",
          };
        }
      } catch {
        continue;
      }
    }
    return {
      job_id: jobId,
      status: "timed_out",
      fin_response: "Your request took too long to process. Please try again.",
      called_agent: "error",
    };
  }, []);

  const submitPrompt = useCallback(async (params: SubmitPromptParams) => {
    setSubmitting(true);
    setResponse(null);
    setFinnModeError(null);
    try {
      const res = await apiRequest("POST", "/api/cassidy/request", {
        advisor_request: params.advisor_request,
        conversation_id: params.conversation_id,
        client_id: params.client_id || selectedClientId,
        source: "copilot",
        task_type: "query",
        page_context: params.page_context || undefined,
      });
      const data = await res.json();
      setCurrentJobId(data.job_id);

      const jobResult = await pollJob(data.job_id);
      if (jobResult) {
        setResponse(jobResult);
      }
    } finally {
      setSubmitting(false);
    }
  }, [selectedClientId, pollJob]);

  const submitFinnMode = useCallback(async (
    message: string,
    mode: Exclude<FinnMode, "conversation">,
    clientName?: string,
    conversationId?: string,
    pageContext?: PageContext,
  ) => {
    setSubmitting(true);
    setResponse(null);
    setFinnModeError(null);
    try {
      const res = await apiRequest("POST", "/api/cassidy/finn-mode", {
        message,
        selected_mode: mode,
        client_name: clientName,
        conversation_id: conversationId,
        client_id: selectedClientId,
        page_context: pageContext || undefined,
      });
      const data = await res.json();
      setCurrentJobId(data.job_id);
      setResponse(data);
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to get response from Finn";
      setFinnModeError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [selectedClientId]);

  const resetConversation = useCallback(() => {
    setCurrentJobId(null);
    setResponse(null);
    setSubmitting(false);
    setFinnModeError(null);
  }, []);

  return {
    currentJobId,
    response,
    submitting,
    submitPrompt,
    submitFinnMode,
    finnModeError,
    selectedClientId,
    setSelectedClientId,
    resetConversation,
  };
}
