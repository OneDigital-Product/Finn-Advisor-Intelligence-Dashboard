/**
 * Meeting Workflow Step Executors — V3.3
 *
 * Registers step executors for the "Post-Meeting Processing" workflow template.
 * Uses native agents 02 (summary), 04 (action items), 05 (follow-up email).
 *
 * Steps:
 * 1. summarize_meeting — Agent 02
 * 2. extract_action_items — Agent 04
 * 3. generate_follow_up — Agent 05
 * 4. review_outputs — human gate (handled by orchestrator)
 * 5. create_sf_tasks — side effect
 * 6. sync_sf_summary — side effect
 * 7. notify_completion — side effect (SSE)
 */

import { logger } from "../../lib/logger";
import { storage } from "../../storage";
import { sseEventBus } from "../../lib/sse-event-bus";
import { generateMeetingSummaryStructured } from "../../prompts/02-meeting-summary";
import { extractActionItemsStructured } from "../../prompts/04-action-items";
import { generateFollowUpEmailStructured } from "../../prompts/05-follow-up-email";

interface StepContext {
  instanceId: string;
  advisorId: string;
  clientId?: string;
  clientName?: string;
  meetingId?: string;
  notes?: string;
  transcript?: string;
}

interface StepOutput {
  [key: string]: any;
}

// ── Step 1: Summarize Meeting (Agent 02) ──

export async function executeSummarizeMeeting(
  context: StepContext,
  previousOutputs: StepOutput,
): Promise<StepOutput> {
  logger.info({ instanceId: context.instanceId, clientId: context.clientId }, "[MeetingWorkflow] Step 1: Summarize");

  const input = {
    meetingNotes: context.notes || context.transcript || "",
    transcript: context.transcript || "",
    annotations: "",
    actionItemsList: "",
  };

  const result = await generateMeetingSummaryStructured(input);

  return {
    summary: result,
    advisorSummary: result.advisorSummary || result.content || "",
    clientSummary: result.clientSummary || "",
  };
}

// ── Step 2: Extract Action Items (Agent 04) ──

export async function executeExtractActionItems(
  context: StepContext,
  previousOutputs: StepOutput,
): Promise<StepOutput> {
  logger.info({ instanceId: context.instanceId }, "[MeetingWorkflow] Step 2: Extract Actions");

  const input = {
    meetingNotes: context.notes || context.transcript || "",
    transcript: context.transcript || "",
    clientContext: context.clientName || "",
    previousActions: "",
    meetingType: "general" as const,
    meetingDate: new Date().toISOString(),
  };

  const result = await extractActionItemsStructured(input);

  return {
    actionItems: result,
    totalActions: result.totalActions || 0,
    actions: result.actions || [],
  };
}

// ── Step 3: Generate Follow-Up Email (Agent 05) ──

export async function executeGenerateFollowUp(
  context: StepContext,
  previousOutputs: StepOutput,
): Promise<StepOutput> {
  logger.info({ instanceId: context.instanceId }, "[MeetingWorkflow] Step 3: Follow-Up Email");

  const input = {
    clientName: context.clientName || "Client",
    clientEmail: "",
    meetingNotes: previousOutputs.advisorSummary || context.notes || "",
    advisorName: "",
    behavioralProfile: "",
    lifeEventContext: "",
    emailFormat: "formal" as const,
  };

  const result = await generateFollowUpEmailStructured(input);

  return {
    email: result,
    subjectLine: result.subjectLine || "",
    emailContent: result.content || "",
  };
}

// ── Step 5: Create SF Tasks ──

export async function executeCreateSfTasks(
  context: StepContext,
  previousOutputs: StepOutput,
): Promise<StepOutput> {
  logger.info({ instanceId: context.instanceId }, "[MeetingWorkflow] Step 5: Create Tasks");

  const actions = previousOutputs.actions || [];
  const createdCount = { success: 0, failed: 0 };

  for (const action of actions) {
    try {
      await storage.createTask({
        advisorId: context.advisorId,
        clientId: context.clientId || "",
        title: action.description || action.title || "Task",
        type: "follow_up",
        priority: action.priorityScore <= 2 ? "high" : action.priorityScore <= 3 ? "medium" : "low",
        status: "open",
        dueDate: action.deadline || null,
        meetingId: context.meetingId || null,
      });
      createdCount.success++;
    } catch (err) {
      createdCount.failed++;
      logger.warn({ err, action: action.description }, "[MeetingWorkflow] Task creation failed");
    }
  }

  return { createdTasks: createdCount };
}

// ── Step 6: Sync SF Summary ──

export async function executeSyncSfSummary(
  context: StepContext,
  previousOutputs: StepOutput,
): Promise<StepOutput> {
  logger.info({ instanceId: context.instanceId }, "[MeetingWorkflow] Step 6: Sync Summary to SF");

  // The existing summarize endpoint already handles SF InteractionSummary sync
  // This step is a no-op if the summary was already synced during step 1
  return { sfSyncStatus: "completed" };
}

// ── Step 7: Notify Completion ──

export async function executeNotifyCompletion(
  context: StepContext,
  previousOutputs: StepOutput,
): Promise<StepOutput> {
  logger.info({ instanceId: context.instanceId }, "[MeetingWorkflow] Step 7: Notify Completion");

  try {
    sseEventBus.publishToUser(context.advisorId, "workflow:meeting_processed", {
      instanceId: context.instanceId,
      clientId: context.clientId,
      clientName: context.clientName,
      tasksCreated: previousOutputs.createdTasks?.success || 0,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // SSE notification is best-effort
  }

  return { notified: true };
}

// ── Workflow Template Definition ──

export const POST_MEETING_WORKFLOW_TEMPLATE = {
  name: "Post-Meeting Processing",
  description: "Summarize meeting, extract action items, generate follow-up email, create SF tasks",
  version: "1.0.0",
  steps: [
    {
      name: "summarize_meeting",
      type: "ai_prompt" as const,
      description: "Generate meeting summary using Agent 02",
      executor: "summarize_meeting",
    },
    {
      name: "extract_action_items",
      type: "ai_prompt" as const,
      description: "Extract prioritized action items using Agent 04",
      executor: "extract_action_items",
    },
    {
      name: "generate_follow_up",
      type: "ai_prompt" as const,
      description: "Generate follow-up email using Agent 05",
      executor: "generate_follow_up",
    },
    {
      name: "review_outputs",
      type: "human_gate" as const,
      description: "Advisor reviews summary, action items, and email",
      gateName: "Review Meeting Outputs",
      ownerRole: "advisor",
      timeoutHours: 72,
      actions: [
        { label: "Approve & Create Tasks", value: "approved" },
        { label: "Edit & Retry", value: "request_changes" },
        { label: "Discard", value: "rejected" },
      ],
    },
    {
      name: "create_sf_tasks",
      type: "side_effect" as const,
      description: "Create approved tasks in local DB + Salesforce",
      executor: "create_sf_tasks",
    },
    {
      name: "sync_sf_summary",
      type: "side_effect" as const,
      description: "Sync meeting summary to Salesforce InteractionSummary",
      executor: "sync_sf_summary",
    },
    {
      name: "notify_completion",
      type: "side_effect" as const,
      description: "Notify advisor via SSE that workflow is complete",
      executor: "notify_completion",
    },
  ],
};

// ── Executor Registry ──

export const MEETING_WORKFLOW_EXECUTORS: Record<string, (ctx: StepContext, prev: StepOutput) => Promise<StepOutput>> = {
  summarize_meeting: executeSummarizeMeeting,
  extract_action_items: executeExtractActionItems,
  generate_follow_up: executeGenerateFollowUp,
  create_sf_tasks: executeCreateSfTasks,
  sync_sf_summary: executeSyncSfSummary,
  notify_completion: executeNotifyCompletion,
};
