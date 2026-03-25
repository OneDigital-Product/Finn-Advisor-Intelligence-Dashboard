import { eq } from "drizzle-orm";
import { storage } from "../../storage";
import { cassidyJobs, agentChainSteps } from "@shared/schema";
import { logger } from "../../lib/logger";

interface TraceStep {
  stepId: number;
  title: string;
  timestamp: string;
  status: "completed" | "in_progress" | "failed";
  durationMs?: number;
  details: Record<string, any>;
}

function summarizeOutput(output: any): string {
  if (!output) return "(no output)";
  if (typeof output === "string") return output.substring(0, 200) + (output.length > 200 ? "..." : "");
  if (output.summary) return String(output.summary).substring(0, 200);
  if (output.response) return String(output.response).substring(0, 200);
  if (output.fin_response) return String(output.fin_response).substring(0, 200);
  return "Agent completed";
}

export async function buildTraceTimeline(
  jobId: string
): Promise<{
  steps: TraceStep[];
  totalDurationMs: number;
  status: "success" | "partial" | "failed";
}> {
  const job = await storage.db
    .select()
    .from(cassidyJobs)
    .where(eq(cassidyJobs.jobId, jobId))
    .then((rows) => rows[0]);

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  const steps: TraceStep[] = [];
  const requestPayload = job.requestPayload as any;
  const agentTrace = job.agentTrace as any;

  steps.push({
    stepId: 1,
    title: "Request Received",
    timestamp: job.createdAt?.toISOString() || new Date().toISOString(),
    status: "completed",
    details: {
      task_type: job.taskType,
      content_summary: requestPayload?.advisor_request?.substring(0, 100) || "N/A",
      client_id: job.clientId,
    },
  });

  steps.push({
    stepId: 2,
    title: "Fin Classified",
    timestamp: job.createdAt?.toISOString() || new Date().toISOString(),
    status: "completed",
    durationMs: 50,
    details: {
      intent: agentTrace?.context?.intent || "unknown",
      confidence: agentTrace?.context?.confidence || 0.95,
      primary_agent: agentTrace?.primary_agent || job.calledAgent || "unknown",
      secondary_agents: agentTrace?.secondary_agents || [],
      routing_decision: agentTrace?.routing_decision || "direct",
    },
  });

  const chainSteps = await storage.db
    .select()
    .from(agentChainSteps)
    .where(eq(agentChainSteps.jobId, jobId))
    .orderBy(agentChainSteps.chainPosition);

  if (chainSteps.length > 0) {
    for (let i = 0; i < chainSteps.length; i++) {
      const step = chainSteps[i];
      const totalAgents = chainSteps.length;
      steps.push({
        stepId: 3 + i,
        title: `Agent ${i + 1}/${totalAgents}: ${step.agentName}`,
        timestamp: step.startedAt?.toISOString() || new Date().toISOString(),
        status: step.status === "completed" ? "completed" : step.status === "failed" ? "failed" : "in_progress",
        durationMs: step.executionDurationMs || undefined,
        details: {
          agent_name: step.agentName,
          chain_position: step.chainPosition,
          status: step.status,
          output_preview: summarizeOutput(step.outputContext),
          error_message: step.errorMessage,
          input_context_keys: step.inputContext ? Object.keys(step.inputContext as any) : [],
        },
      });
    }
  } else if (job.calledAgent) {
    const responsePayload = job.responsePayload as any;
    const jobDuration = job.completedAt && job.createdAt
      ? job.completedAt.getTime() - job.createdAt.getTime()
      : undefined;

    steps.push({
      stepId: 3,
      title: `Agent: ${job.calledAgent}`,
      timestamp: job.createdAt?.toISOString() || new Date().toISOString(),
      status: job.status === "completed" ? "completed" : job.status === "failed" ? "failed" : "in_progress",
      durationMs: jobDuration,
      details: {
        agent_name: job.calledAgent,
        chain_position: 1,
        status: job.status,
        output_preview: summarizeOutput(responsePayload?.output || responsePayload?.fin_response),
      },
    });
  }

  const totalDuration = job.completedAt && job.createdAt
    ? job.completedAt.getTime() - job.createdAt.getTime()
    : 0;

  steps.push({
    stepId: 100,
    title: "Result Delivered",
    timestamp: (job.completedAt || job.updatedAt || new Date()).toISOString(),
    status: job.status === "completed" ? "completed" : job.status === "failed" ? "failed" : "in_progress",
    durationMs: 0,
    details: {
      total_latency_ms: totalDuration,
      response_length: (job.responsePayload as any)?.fin_response?.length || 0,
      suggested_prompts_count: (job.responsePayload as any)?.suggested_prompts?.length || 0,
      final_status: job.status,
      chain_status: job.chainStatus || "single_agent",
    },
  });

  const failedSteps = steps.filter((s) => s.status === "failed");
  const overallStatus = failedSteps.length > 0
    ? (steps.filter((s) => s.status === "completed").length > 2 ? "partial" : "failed")
    : job.status === "completed" ? "success" : "failed";

  return {
    steps,
    totalDurationMs: totalDuration,
    status: overallStatus,
  };
}

export async function getFullTrace(jobId: string) {
  const job = await storage.db
    .select()
    .from(cassidyJobs)
    .where(eq(cassidyJobs.jobId, jobId))
    .then((rows) => rows[0]);

  if (!job) throw new Error(`Job ${jobId} not found`);

  const chainSteps = await storage.db
    .select()
    .from(agentChainSteps)
    .where(eq(agentChainSteps.jobId, jobId))
    .orderBy(agentChainSteps.chainPosition);

  const responsePayload = job.responsePayload as any;

  return {
    job_id: jobId,
    request: (job.requestPayload as any)?.advisor_request,
    called_agent: job.calledAgent,
    task_type: job.taskType,
    chain_status: job.chainStatus,
    agent_steps: chainSteps.map((s) => ({
      position: s.chainPosition,
      agent: s.agentName,
      status: s.status,
      duration_ms: s.executionDurationMs,
      input_context: s.inputContext,
      output_context: s.outputContext,
      error: s.errorMessage,
    })),
    fin_response: responsePayload?.fin_response,
    suggested_prompts: responsePayload?.suggested_prompts,
    merged_output: job.mergedOutput,
    total_duration_ms: job.completedAt && job.createdAt
      ? job.completedAt.getTime() - job.createdAt.getTime()
      : 0,
    status: job.status,
    created_at: job.createdAt,
    completed_at: job.completedAt,
  };
}
