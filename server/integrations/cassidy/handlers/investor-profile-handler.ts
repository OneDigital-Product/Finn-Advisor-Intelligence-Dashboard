import { storage } from "../../../storage";
import { cassidyJobs, clients, candidateFacts } from "../../../../shared/schema";
import { callCassidyWorkflow } from "../webhook-client";
import { timeoutManager } from "../timeout-manager";
import { AuditLogger, AuditEventType } from "../audit-logger";
import { eq, and, inArray } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../../../lib/logger";

export async function validate(signal: any, advisorId: string) {
  const [client] = await storage.db
    .select()
    .from(clients)
    .where(and(eq(clients.id, signal.clientId), eq(clients.advisorId, advisorId)))
    .limit(1);

  if (!client) {
    return { valid: false, error: "Client not found or not authorized" };
  }

  return { valid: true };
}

export async function execute(signal: any, advisorId: string) {
  const approvedFacts = await storage.db
    .select()
    .from(candidateFacts)
    .where(
      and(
        eq(candidateFacts.clientId, signal.clientId),
        inArray(candidateFacts.status, ["approved", "edited"]),
      ),
    );

  if (approvedFacts.length === 0) {
    return {
      success: true,
      action_taken: "investor_profile_refresh",
      message: "No approved facts found. Complete the fact review process first, then refresh the profile.",
    };
  }

  const jobId = crypto.randomUUID();
  const callbackBaseUrl = process.env.CALLBACK_BASE_URL || "";

  const payload = {
    job_id: jobId,
    task_type: "investor_profile_draft",
    callback_url: callbackBaseUrl,
    input: {
      job_id: jobId,
      client_id: signal.clientId,
      household_id: null,
      advisor_id: advisorId,
      profile_mode: "individual",
      trigger_signal_id: signal.id,
      approved_facts: approvedFacts.map((f: any) => ({
        fact_type: f.factType,
        fact_label: f.factLabel,
        fact_value: f.factValue,
        normalized_value: f.normalizedValue,
        confidence: f.confidence,
        source_snippet: f.sourceSnippet,
      })),
    },
    agent: {
      name: "investor_profile_agent",
      version: "1.0",
    },
  };

  await storage.db.insert(cassidyJobs).values({
    jobId,
    advisorId,
    clientId: signal.clientId,
    householdId: null,
    taskType: "investor_profile_draft",
    status: "pending",
    requestPayload: payload,
  });

  timeoutManager.startTimeout(jobId);

  const apiKey = process.env.CASSIDY_API_KEY;
  const webhookUrl = process.env.CASSIDY_WEBHOOK_URL;

  if (apiKey && webhookUrl) {
    callCassidyWorkflow(payload, apiKey, webhookUrl).catch((err) => {
      logger.error({ err, jobId }, "Failed to invoke Cassidy for investor profile refresh");
    });
  }

  await AuditLogger.logEvent(jobId, AuditEventType.REQUEST_SENT, {
    trigger: "signal_action",
    signalId: signal.id,
    signalType: signal.signalType,
  });

  return {
    success: true,
    action_taken: "investor_profile_refresh",
    job_id: jobId,
    message: "Profile refresh initiated. You'll be notified when complete.",
  };
}
