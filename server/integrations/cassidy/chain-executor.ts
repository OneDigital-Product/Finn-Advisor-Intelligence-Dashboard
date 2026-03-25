import { eq } from "drizzle-orm";
import { storage } from "../../storage";
import { cassidyJobs, agentChainSteps } from "@shared/schema";
import { buildChainPrompt, injectContextIntoPrompt } from "./chain-context-builder";
import { callCassidyWorkflow } from "./webhook-client";
import { jobEventBus } from "./event-bus";
import { AuditLogger, AuditEventType } from "./audit-logger";
import { logger } from "../../lib/logger";
import crypto from "crypto";

function parseIntWithDefault(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export const MAX_CHAIN_DEPTH = Math.max(1, parseIntWithDefault(process.env.MAX_CHAIN_DEPTH, 10));
export const PER_AGENT_TIMEOUT_MS = Math.max(1000, parseIntWithDefault(process.env.PER_AGENT_TIMEOUT_MS, 120000));

interface ChainConfig {
  jobId: string;
  advisorId: string;
  clientId: string;
  householdId: string;
  originalRequest: string;
  originalConversationId?: string;
  sessionId?: string;
  secondaryAgents: Array<{
    agentName: string;
    agentPrompt: string;
  }>;
}

export async function executeChain(config: ChainConfig): Promise<void> {
  const { jobId, secondaryAgents } = config;

  logger.info({ jobId, agentCount: secondaryAgents.length }, "[CHAIN] Starting multi-agent chain");

  await storage.db
    .update(cassidyJobs)
    .set({
      secondaryAgents: secondaryAgents as any,
      chainStatus: "multi_agent",
      updatedAt: new Date(),
    })
    .where(eq(cassidyJobs.jobId, jobId));

  if (secondaryAgents.length > MAX_CHAIN_DEPTH) {
    const errorMsg = `Chain depth ${secondaryAgents.length} exceeds maximum allowed depth of ${MAX_CHAIN_DEPTH}`;
    logger.error({ jobId, chainDepth: secondaryAgents.length, maxChainDepth: MAX_CHAIN_DEPTH }, `[CHAIN] ${errorMsg}`);

    await AuditLogger.logEvent(jobId, "chain_depth_exceeded", {
      chain_depth: secondaryAgents.length,
      max_chain_depth: MAX_CHAIN_DEPTH,
      agent_names: secondaryAgents.map((a) => a.agentName),
      timestamp: new Date().toISOString(),
    });

    await storage.db
      .update(cassidyJobs)
      .set({
        chainStatus: "primary_only",
        mergedOutput: { error: errorMsg, chain_depth: secondaryAgents.length, max_chain_depth: MAX_CHAIN_DEPTH } as any,
        updatedAt: new Date(),
      })
      .where(eq(cassidyJobs.jobId, jobId));

    jobEventBus.publishJobUpdate({
      type: "chain_error",
      job_id: jobId,
      status: "failed",
      error: errorMsg,
      timestamp: new Date().toISOString(),
    });

    return;
  }

  for (let i = 0; i < secondaryAgents.length; i++) {
    await storage.db.insert(agentChainSteps).values({
      jobId,
      chainPosition: i + 2,
      agentName: secondaryAgents[i].agentName,
      status: "queued",
      inputContext: {},
    });
  }

  let previousOutput: any = null;
  let completedCount = 0;
  let failedCount = 0;

  logger.info({ jobId, chainDepth: secondaryAgents.length, maxChainDepth: MAX_CHAIN_DEPTH, perAgentTimeoutMs: PER_AGENT_TIMEOUT_MS }, "[CHAIN] Chain depth tracking initialized");

  for (let i = 0; i < secondaryAgents.length; i++) {
    const agent = secondaryAgents[i];
    const chainPosition = i + 2;
    const depthIndex = i + 1;

    logger.info({ jobId, agent: agent.agentName, depthIndex, totalDepth: secondaryAgents.length }, `[CHAIN] Executing agent ${depthIndex}/${secondaryAgents.length}`);

    const chainSteps = await storage.db
      .select()
      .from(agentChainSteps)
      .where(eq(agentChainSteps.jobId, jobId))
      .orderBy(agentChainSteps.chainPosition);

    const chainStep = chainSteps.find((s) => s.chainPosition === chainPosition);
    if (!chainStep) {
      logger.error({ jobId, chainPosition }, "[CHAIN] ChainStep not found");
      continue;
    }

    try {
      const inputContext = await buildChainPrompt({
        jobId,
        chainPosition,
        agentName: agent.agentName,
        previousOutput,
        originalRequest: config.originalRequest,
      });

      await storage.db
        .update(agentChainSteps)
        .set({
          status: "running",
          inputContext: inputContext as any,
          startedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agentChainSteps.id, chainStep.id));

      jobEventBus.publishJobUpdate({
        type: "chain_step_update",
        job_id: jobId,
        chain_position: chainPosition,
        agent_name: agent.agentName,
        status: "running",
        depth_index: depthIndex,
        total_depth: secondaryAgents.length,
        timestamp: new Date().toISOString(),
      } as any);

      const augmentedPrompt = injectContextIntoPrompt(agent.agentPrompt, inputContext);
      const promptHash = crypto.createHash("sha256").update(augmentedPrompt).digest("hex").substring(0, 64);

      const apiKey = process.env.CASSIDY_API_KEY;
      const webhookUrl = process.env.CASSIDY_WEBHOOK_URL;

      if (!apiKey || !webhookUrl) {
        throw new Error("Missing CASSIDY_API_KEY or CASSIDY_WEBHOOK_URL");
      }

      const startTime = Date.now();
      const chainJobId = `${jobId}-chain-${chainPosition}`;

      const agentCallPromise = callCassidyWorkflow(
        {
          job_id: chainJobId,
          conversation_id: config.originalConversationId || jobId,
          advisor_request: augmentedPrompt,
          source: "chain",
          client_id: config.clientId,
          household_id: config.householdId,
          task_type: "chain_step",
          timestamp: new Date().toISOString(),
          callback_url: `${process.env.CALLBACK_BASE_URL}/api/cassidy/callback`,
          chain_metadata: {
            parent_job_id: jobId,
            chain_position: chainPosition,
            agent_name: agent.agentName,
          },
        },
        apiKey,
        webhookUrl
      );

      let timeoutHandle: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Agent "${agent.agentName}" timed out after ${PER_AGENT_TIMEOUT_MS}ms (per-agent timeout)`));
        }, PER_AGENT_TIMEOUT_MS);
      });

      let agentOutput: any;
      try {
        agentOutput = await Promise.race([agentCallPromise, timeoutPromise]);
      } finally {
        clearTimeout(timeoutHandle!);
      }

      const executionMs = Date.now() - startTime;

      await storage.db
        .update(agentChainSteps)
        .set({
          status: "completed",
          outputContext: agentOutput as any,
          agentPromptHash: promptHash,
          executionDurationMs: executionMs,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agentChainSteps.id, chainStep.id));

      previousOutput = agentOutput;
      completedCount++;

      logger.info({ jobId, agent: agent.agentName, executionMs, depthIndex, totalDepth: secondaryAgents.length }, "[CHAIN] Agent completed");

      await AuditLogger.logEvent(jobId, AuditEventType.AGENT_RESPONDED, {
        agent_name: agent.agentName,
        chain_position: chainPosition,
        depth_index: depthIndex,
        total_depth: secondaryAgents.length,
        execution_ms: executionMs,
        per_agent_timeout_ms: PER_AGENT_TIMEOUT_MS,
        status: "completed",
        timestamp: new Date().toISOString(),
      });

      jobEventBus.publishJobUpdate({
        type: "chain_step_update",
        job_id: jobId,
        chain_position: chainPosition,
        agent_name: agent.agentName,
        status: "completed",
        duration_ms: executionMs,
        depth_index: depthIndex,
        total_depth: secondaryAgents.length,
        timestamp: new Date().toISOString(),
      } as any);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isTimeout = errorMsg.includes("per-agent timeout");
      failedCount++;

      await storage.db
        .update(agentChainSteps)
        .set({
          status: isTimeout ? "timed_out" : "failed",
          errorMessage: errorMsg,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agentChainSteps.id, chainStep.id));

      logger.error({ err: error, jobId, agent: agent.agentName, depthIndex, totalDepth: secondaryAgents.length, isTimeout }, "[CHAIN] Agent failed");

      await AuditLogger.logEvent(jobId, isTimeout ? "agent_timeout" : "agent_failed", {
        agent_name: agent.agentName,
        chain_position: chainPosition,
        depth_index: depthIndex,
        total_depth: secondaryAgents.length,
        per_agent_timeout_ms: PER_AGENT_TIMEOUT_MS,
        error: errorMsg,
        is_timeout: isTimeout,
        timestamp: new Date().toISOString(),
      });

      jobEventBus.publishJobUpdate({
        type: "chain_step_update",
        job_id: jobId,
        chain_position: chainPosition,
        agent_name: agent.agentName,
        status: isTimeout ? "timed_out" : "failed",
        error: errorMsg,
        depth_index: depthIndex,
        total_depth: secondaryAgents.length,
        timestamp: new Date().toISOString(),
      } as any);
    }
  }

  const allSteps = await storage.db
    .select()
    .from(agentChainSteps)
    .where(eq(agentChainSteps.jobId, jobId))
    .orderBy(agentChainSteps.chainPosition);

  const mergedOutput = {
    chainSteps: allSteps.map((step) => ({
      agentName: step.agentName,
      chainPosition: step.chainPosition,
      output: step.outputContext,
      status: step.status,
      errorMessage: step.errorMessage,
      durationMs: step.executionDurationMs,
    })),
    executionSummary: {
      totalSteps: allSteps.length,
      completedSteps: completedCount,
      failedSteps: failedCount,
      chainDepth: secondaryAgents.length,
      maxChainDepth: MAX_CHAIN_DEPTH,
      perAgentTimeoutMs: PER_AGENT_TIMEOUT_MS,
      totalDurationMs: allSteps.reduce((sum, s) => sum + (s.executionDurationMs || 0), 0),
    },
  };

  const chainStatus = failedCount === 0
    ? "multi_agent"
    : completedCount > 0
      ? "partial_completion"
      : "primary_only";

  await storage.db
    .update(cassidyJobs)
    .set({
      mergedOutput: mergedOutput as any,
      chainStatus,
      updatedAt: new Date(),
    })
    .where(eq(cassidyJobs.jobId, jobId));

  jobEventBus.publishJobUpdate({
    type: "chain_complete",
    job_id: jobId,
    status: "completed",
    chain_status: chainStatus,
    merged_output: mergedOutput,
    timestamp: new Date().toISOString(),
  });

  logger.info({
    jobId,
    completedCount,
    failedCount,
    chainStatus,
  }, "[CHAIN] Chain execution complete");
}

export async function hasSecondaryAgents(jobId: string): Promise<boolean> {
  const steps = await storage.db
    .select()
    .from(agentChainSteps)
    .where(eq(agentChainSteps.jobId, jobId));
  return steps.length > 0;
}

export async function getChainStats(jobId: string) {
  const steps = await storage.db
    .select()
    .from(agentChainSteps)
    .where(eq(agentChainSteps.jobId, jobId))
    .orderBy(agentChainSteps.chainPosition);

  return {
    totalSteps: steps.length,
    completedSteps: steps.filter((s) => s.status === "completed").length,
    failedSteps: steps.filter((s) => s.status === "failed" || s.status === "timed_out").length,
    timedOutSteps: steps.filter((s) => s.status === "timed_out").length,
    totalDurationMs: steps.reduce((sum, s) => sum + (s.executionDurationMs || 0), 0),
    steps: steps.map((s) => ({
      position: s.chainPosition,
      agent: s.agentName,
      status: s.status,
      durationMs: s.executionDurationMs,
    })),
  };
}
