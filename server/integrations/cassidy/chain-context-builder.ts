import { eq, and, lt } from "drizzle-orm";
import { storage } from "../../storage";
import { cassidyJobs, agentChainSteps, clients, households } from "@shared/schema";
import { logger } from "../../lib/logger";

interface ContextInput {
  jobId: string;
  chainPosition: number;
  agentName: string;
  previousOutput: any;
  originalRequest: string;
}

export async function buildChainPrompt(
  input: ContextInput
): Promise<Record<string, any>> {
  const { jobId, chainPosition, agentName, previousOutput, originalRequest } = input;

  const job = await storage.db
    .select()
    .from(cassidyJobs)
    .where(eq(cassidyJobs.jobId, jobId))
    .then((rows) => rows[0]);

  if (!job) {
    throw new Error(`[CHAIN] Job ${jobId} not found`);
  }

  const priorSteps = await storage.db
    .select()
    .from(agentChainSteps)
    .where(and(
      eq(agentChainSteps.jobId, jobId),
      lt(agentChainSteps.chainPosition, chainPosition)
    ))
    .orderBy(agentChainSteps.chainPosition);

  let clientData: any = null;
  let householdData: any = null;

  if (job.clientId) {
    clientData = await storage.db
      .select()
      .from(clients)
      .where(eq(clients.id, job.clientId))
      .then((rows) => rows[0]);
  }

  if (job.householdId) {
    householdData = await storage.db
      .select()
      .from(households)
      .where(eq(households.id, job.householdId))
      .then((rows) => rows[0]);
  }

  return {
    chain_metadata: {
      job_id: jobId,
      chain_position: chainPosition,
      current_agent: agentName,
      total_agents_in_chain: chainPosition,
    },
    original_request: originalRequest,
    client_context: {
      client_id: clientData?.id,
      client_name: clientData?.name,
      household_aum: householdData?.totalAum,
      risk_profile: clientData?.riskProfile,
    },
    prior_agent_outputs: priorSteps.map((step) => ({
      agent: step.agentName,
      position: step.chainPosition,
      output: step.outputContext,
      execution_duration_ms: step.executionDurationMs,
    })),
    chain_instructions: `You are step ${chainPosition} in a multi-agent processing chain. Prior agents have extracted facts and insights. Use their outputs to inform your analysis. Be concise and build on prior findings rather than repeating them.`,
  };
}

export function formatContextForPrompt(context: Record<string, any>): string {
  const { prior_agent_outputs, original_request, client_context, chain_instructions } = context;

  let formatted = `\n---CHAIN CONTEXT (Position ${context.chain_metadata.chain_position})---\n`;
  formatted += `Client: ${client_context.client_name || "Unknown"} (AUM: $${client_context.household_aum || "N/A"})\n`;
  formatted += `Original Request: "${original_request}"\n\n`;

  formatted += `PRIOR AGENT OUTPUTS:\n`;
  for (const priorAgent of prior_agent_outputs) {
    formatted += `\n[From ${priorAgent.agent} (step ${priorAgent.position})]:\n`;
    formatted += typeof priorAgent.output === "string"
      ? priorAgent.output
      : JSON.stringify(priorAgent.output, null, 2);
    formatted += "\n";
  }

  formatted += `\n${chain_instructions}\n---END CHAIN CONTEXT---\n\n`;
  return formatted;
}

export function injectContextIntoPrompt(basePrompt: string, context: Record<string, any>): string {
  const contextStr = formatContextForPrompt(context);
  const match = basePrompt.match(new RegExp("^(.*?\\n\\n)", "s"));
  if (match) {
    return basePrompt.replace(new RegExp("^(.*?\\n\\n)", "s"), `$1${contextStr}\n\n`);
  }
  return contextStr + "\n\n" + basePrompt;
}
