import { storage } from "../../storage";
import { logger } from "../../lib/logger";
import { registerStepExecutor, type WorkflowStepDef, type WorkflowGateDef, type WorkflowBranchDef } from "../workflow-orchestrator";
import { sanitizePromptInput } from "../../lib/prompt-sanitizer";
import type { WorkflowInstance } from "@shared/schema";
import {
  generateMeetingPrep,
  generateMeetingSummary,
  extractActionItems,
  generateFollowUpEmail,
  analyzeSentiment,
  detectLifeEventsFromTranscript,
} from "../../openai";
import { validateAIContent } from "../fiduciary-compliance";

export const MEETING_LIFECYCLE_SLUG = "client-meeting-lifecycle";

export const MEETING_LIFECYCLE_STEPS: WorkflowStepDef[] = [
  {
    name: "meeting_prep",
    type: "ai_prompt",
    promptId: "01",
    executor: "meeting_prep_executor",
    retryConfig: { maxRetries: 3, backoffMs: [0, 30000, 300000] },
  },
  {
    name: "talking_points",
    type: "ai_prompt",
    promptId: "03",
    executor: "talking_points_executor",
    retryConfig: { maxRetries: 3, backoffMs: [0, 30000, 300000] },
  },
  {
    name: "advisor_prep_review",
    type: "human_gate",
    gateConfig: {
      gateName: "Advisor Reviews Meeting Prep",
      ownerRole: "advisor",
      timeoutHours: 72,
      actions: ["approve", "reject", "request_changes"],
    },
  },
  {
    name: "transcript_analysis",
    type: "ai_prompt",
    promptId: "10",
    executor: "transcript_analysis_executor",
    retryConfig: { maxRetries: 3, backoffMs: [0, 30000, 300000] },
  },
  {
    name: "meeting_summary",
    type: "ai_prompt",
    promptId: "02",
    executor: "meeting_summary_executor",
    retryConfig: { maxRetries: 3, backoffMs: [0, 30000, 300000] },
  },
  {
    name: "action_items",
    type: "ai_prompt",
    promptId: "04",
    executor: "action_items_executor",
    retryConfig: { maxRetries: 3, backoffMs: [0, 30000, 300000] },
  },
  {
    name: "sentiment_analysis",
    type: "ai_prompt",
    promptId: "13",
    executor: "sentiment_analysis_executor",
    retryConfig: { maxRetries: 3, backoffMs: [0, 30000, 300000] },
  },
  {
    name: "follow_up_email",
    type: "ai_prompt",
    promptId: "05",
    executor: "follow_up_email_executor",
    retryConfig: { maxRetries: 3, backoffMs: [0, 30000, 300000] },
  },
  {
    name: "advisor_email_review",
    type: "human_gate",
    gateConfig: {
      gateName: "Advisor Reviews Follow-Up Email",
      ownerRole: "advisor",
      timeoutHours: 24,
      actions: ["approve", "reject", "request_changes"],
    },
  },
];

export const MEETING_LIFECYCLE_GATES: WorkflowGateDef[] = [
  {
    afterStep: 1,
    gateName: "Advisor Reviews Meeting Prep",
    ownerRole: "advisor",
    timeoutHours: 72,
    actions: ["approve", "reject", "request_changes"],
  },
  {
    afterStep: 7,
    gateName: "Advisor Reviews Follow-Up Email",
    ownerRole: "advisor",
    timeoutHours: 24,
    actions: ["approve", "reject", "request_changes"],
  },
];

export const MEETING_LIFECYCLE_BRANCHES: WorkflowBranchDef[] = [
  {
    afterStep: 6,
    condition: "sentiment.anxietyLevel === 'critical' || sentiment.behavioralRiskScore > 70",
    targetStep: 7,
    description: "If sentiment analysis flags critical anxiety, proceed with enriched context to follow-up email",
  },
  {
    afterStep: 5,
    condition: "action_items contain life_event_trigger",
    targetStep: 6,
    description: "If action items indicate life event, proceed through sentiment with enriched context",
  },
];

async function getClientContext(clientId: string) {
  const client = await storage.getClient(clientId);
  if (!client) throw new Error(`Client not found: ${clientId}`);

  const [holdings, accounts, tasks, lifeEvents] = await Promise.all([
    storage.getHoldingsByClient(client.id),
    storage.getAccountsByClient(client.id),
    storage.getTasksByClient(client.id),
    storage.getLifeEvents(client.id),
  ]);

  let performance: any[] = [];
  if (accounts.length > 0 && accounts[0].householdId) {
    performance = await storage.getPerformanceByHousehold(accounts[0].householdId);
  }

  return { client, holdings, accounts, tasks, lifeEvents, performance };
}

registerStepExecutor("meeting_prep_executor", async (instance, _stepDef, _previousOutputs, triggerPayload) => {
  const clientId = instance.clientId || triggerPayload.clientId;
  if (!clientId) throw new Error("No client ID available for meeting prep");

  const ctx = await getClientContext(clientId);
  const meeting = instance.meetingId ? await storage.getMeeting(instance.meetingId) : null;

  const recentMeetings = meeting?.clientId ? await storage.getMeetingsByClient(meeting.clientId) : [];
  const complianceItems = await storage.getComplianceItemsByClient(clientId);

  const prepResult = await generateMeetingPrep({
    clientName: `${ctx.client.firstName} ${ctx.client.lastName}`,
    clientInfo: ctx.client as any,
    holdings: ctx.holdings,
    performance: ctx.performance,
    recentMeetings: recentMeetings.filter((m: any) => m.status === "completed").slice(0, 3) as any,
    tasks: ctx.tasks.filter((t) => t.status !== "completed") as any,
    lifeEvents: ctx.lifeEvents as any,
    complianceItems: complianceItems as any,
  });

  return { prepDocument: prepResult, clientName: `${ctx.client.firstName} ${ctx.client.lastName}` };
});

registerStepExecutor("talking_points_executor", async (instance, _stepDef, previousOutputs, triggerPayload) => {
  const prepOutput = previousOutputs.meeting_prep || previousOutputs.step_0;
  return {
    talkingPoints: prepOutput?.prepDocument || "Meeting talking points based on prep document",
    basedOn: "meeting_prep",
  };
});

registerStepExecutor("transcript_analysis_executor", async (instance, _stepDef, previousOutputs, triggerPayload) => {
  const meetingId = instance.meetingId || triggerPayload.meetingId;
  if (!meetingId) return { status: "skipped", reason: "No meeting ID for transcript analysis" };

  const meeting = await storage.getMeeting(meetingId);
  if (!meeting) throw new Error(`Meeting not found: ${meetingId}`);

  const transcript = meeting.transcriptRaw || meeting.notes || "";
  if (!transcript) return { status: "skipped", reason: "No transcript available" };

  return { transcript: sanitizePromptInput(transcript), status: "analyzed" };
});

registerStepExecutor("meeting_summary_executor", async (instance, _stepDef, previousOutputs, triggerPayload) => {
  const clientId = instance.clientId || triggerPayload.clientId;
  if (!clientId) throw new Error("No client ID for summary generation");

  const ctx = await getClientContext(clientId);
  const meeting = instance.meetingId ? await storage.getMeeting(instance.meetingId) : null;
  const transcriptOutput = previousOutputs.transcript_analysis || previousOutputs.step_3;
  const meetingContent = sanitizePromptInput(transcriptOutput?.transcript || meeting?.notes || meeting?.transcriptSummary || "");

  const summaryConfig = await storage.getActiveMeetingSummaryConfig();

  const summary = await generateMeetingSummary(
    {
      clientName: `${ctx.client.firstName} ${ctx.client.lastName}`,
      clientInfo: ctx.client,
      meetingTitle: meeting?.title || "Meeting",
      meetingType: meeting?.type || "general",
      meetingDate: meeting ? new Date(meeting.startTime).toLocaleDateString() : new Date().toLocaleDateString(),
      meetingNotes: meetingContent,
      holdings: ctx.holdings,
      performance: ctx.performance,
      tasks: ctx.tasks.filter((t) => t.status !== "completed"),
      lifeEvents: ctx.lifeEvents,
    },
    summaryConfig ? { systemPrompt: summaryConfig.systemPrompt, userPromptTemplate: summaryConfig.userPromptTemplate } : null
  );

  const validation = await validateAIContent(summary, "meeting_summary", {
    advisorId: instance.advisorId,
    clientId,
    clientRiskTolerance: ctx.client.riskTolerance || undefined,
  });

  try {
    await storage.createFiduciaryValidationLog({
      advisorId: instance.advisorId,
      clientId,
      contentType: "meeting_summary",
      outcome: validation.outcome,
      ruleSetVersion: validation.ruleSetVersion,
      matchCount: validation.matches.length,
      warningCount: validation.warnings.length,
      blockCount: validation.blocks.length,
      matches: validation.matches as any,
      contentPreview: summary.substring(0, 500),
      resolvedBy: null,
      resolvedAt: null,
      resolutionNote: null,
    });
  } catch (logErr) {
    logger.error({ err: logErr }, "Failed to log compliance validation in workflow");
  }

  const validatedSummary = validation.outcome === "blocked"
    ? validation.annotatedContent + "\n\n> **This content has been held for compliance review.**"
    : validation.outcome === "flagged"
      ? validation.annotatedContent
      : summary;

  if (instance.meetingId) {
    await storage.updateMeeting(instance.meetingId, {
      transcriptSummary: validatedSummary,
      summaryGenerated: true,
    });
  }

  return { summary: validatedSummary, complianceOutcome: validation.outcome };
});

registerStepExecutor("action_items_executor", async (instance, _stepDef, previousOutputs, triggerPayload) => {
  const clientId = instance.clientId || triggerPayload.clientId;
  if (!clientId) throw new Error("No client ID for action items extraction");

  const ctx = await getClientContext(clientId);
  const transcriptOutput = previousOutputs.transcript_analysis || previousOutputs.step_3;
  const meetingContent = transcriptOutput?.transcript || "";

  const extractedRaw = await extractActionItems(meetingContent, `${ctx.client.firstName} ${ctx.client.lastName}`);

  const items: any[] = [];
  const lines = extractedRaw.split("\n").filter((l: string) => l.trim());
  for (const line of lines) {
    const cleaned = line.replace(/^[\d\-\*\.\)]+\s*/, "").trim();
    if (!cleaned || cleaned.length < 5) continue;
    if (/^(###|no action|ai-enhanced|extraction|action item extraction failed)/i.test(cleaned)) continue;
    items.push({ description: cleaned, owner: "advisor", priority: "medium" });
  }

  if (items.length > 0 && instance.meetingId) {
    for (const item of items) {
      try {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);
        await storage.createTask({
          advisorId: instance.advisorId,
          clientId,
          meetingId: instance.meetingId,
          title: item.description,
          description: `Action item from workflow meeting processing`,
          dueDate: dueDate.toISOString().split("T")[0],
          priority: item.priority,
          status: "pending",
          type: "follow_up",
        });
      } catch (err) {
        logger.error({ err }, "Failed to create task from workflow action item");
      }
    }
  }

  return { actionItems: items, count: items.length };
});

registerStepExecutor("sentiment_analysis_executor", async (instance, _stepDef, previousOutputs, triggerPayload) => {
  const clientId = instance.clientId || triggerPayload.clientId;
  if (!clientId) return { status: "skipped", reason: "No client ID" };

  const ctx = await getClientContext(clientId);
  const transcriptOutput = previousOutputs.transcript_analysis || previousOutputs.step_3;
  const meetingContent = transcriptOutput?.transcript || "";

  if (!meetingContent) return { status: "skipped", reason: "No transcript content" };

  const result = await analyzeSentiment({
    clientName: `${ctx.client.firstName} ${ctx.client.lastName}`,
    communicationText: meetingContent,
    sourceType: "meeting_transcript",
    clientInfo: ctx.client as any,
  });

  if (result.anxietyLevel !== "low" || result.behavioralRiskScore > 30) {
    try {
      await storage.createBehavioralAnalysis({
        clientId,
        advisorId: instance.advisorId,
        sentiment: result.sentiment,
        sentimentScore: result.sentimentScore,
        behavioralRiskScore: result.behavioralRiskScore,
        dominantBias: result.dominantBias,
        biasIndicators: result.biasIndicators as any,
        anxietyLevel: result.anxietyLevel,
        sourceType: "meeting_transcript",
        sourceId: instance.meetingId || instance.id,
        sourceSnippet: meetingContent.substring(0, 500),
        coachingNotes: result.coachingNotes,
        deEscalationStrategy: result.deEscalationStrategy,
        marketCondition: "normal",
        metrics: { analysisTimestamp: new Date().toISOString(), workflowInstanceId: instance.id },
      });
    } catch (err) {
      logger.error({ err }, "Failed to create behavioral analysis from workflow");
    }
  }

  return {
    sentiment: result.sentiment,
    sentimentScore: result.sentimentScore,
    anxietyLevel: result.anxietyLevel,
    behavioralRiskScore: result.behavioralRiskScore,
    dominantBias: result.dominantBias,
  };
});

registerStepExecutor("follow_up_email_executor", async (instance, _stepDef, previousOutputs, triggerPayload) => {
  const clientId = instance.clientId || triggerPayload.clientId;
  if (!clientId) throw new Error("No client ID for follow-up email");

  const ctx = await getClientContext(clientId);
  const summaryOutput = previousOutputs.meeting_summary || previousOutputs.step_4;
  const meetingContent = summaryOutput?.summary || "";

  const advisor = await storage.getAdvisor(instance.advisorId);

  const emailBody = await generateFollowUpEmail({
    clientName: `${ctx.client.firstName} ${ctx.client.lastName}`,
    clientEmail: ctx.client.email || "",
    meetingNotes: meetingContent,
    advisorName: advisor?.name || "Your Advisor",
  });

  const emailValidation = await validateAIContent(emailBody, "follow_up_email", {
    advisorId: instance.advisorId,
    clientId,
    clientRiskTolerance: ctx.client.riskTolerance || undefined,
  });

  try {
    await storage.createFiduciaryValidationLog({
      advisorId: instance.advisorId,
      clientId,
      contentType: "follow_up_email",
      outcome: emailValidation.outcome,
      ruleSetVersion: emailValidation.ruleSetVersion,
      matchCount: emailValidation.matches.length,
      warningCount: emailValidation.warnings.length,
      blockCount: emailValidation.blocks.length,
      matches: emailValidation.matches as any,
      contentPreview: emailBody.substring(0, 500),
      resolvedBy: null,
      resolvedAt: null,
      resolutionNote: null,
    });
  } catch (logErr) {
    logger.error({ err: logErr }, "Failed to log email compliance validation in workflow");
  }

  const validatedEmailBody = emailValidation.outcome === "blocked"
    ? emailValidation.annotatedContent + "\n\n> **This email has been held for compliance review before sending.**"
    : emailValidation.outcome === "flagged"
      ? emailValidation.annotatedContent
      : emailBody;

  const meeting = instance.meetingId ? await storage.getMeeting(instance.meetingId) : null;

  if (instance.meetingId) {
    await storage.updateMeeting(instance.meetingId, { followUpEmail: validatedEmailBody });
  }

  return {
    emailDraft: {
      to: ctx.client.email || "",
      subject: `Follow-up: ${meeting?.title || "Meeting"} — ${new Date().toLocaleDateString()}`,
      body: validatedEmailBody,
    },
    complianceOutcome: emailValidation.outcome,
  };
});

registerStepExecutor("life_event_detection_executor", async (instance, _stepDef, previousOutputs, triggerPayload) => {
  const clientId = instance.clientId || triggerPayload.clientId;
  if (!clientId) return { status: "skipped", reason: "No client ID" };

  const ctx = await getClientContext(clientId);
  const transcriptOutput = previousOutputs.transcript_analysis || previousOutputs.step_3;
  const meetingContent = transcriptOutput?.transcript || "";

  if (!meetingContent) return { status: "skipped", reason: "No transcript content" };

  const detections = await detectLifeEventsFromTranscript(
    meetingContent,
    `${ctx.client.firstName} ${ctx.client.lastName}`,
    ctx.lifeEvents.map((e) => ({ eventDate: e.eventDate || "", description: e.description }))
  );

  const lifeEventsCreated = [];
  for (const detection of detections) {
    try {
      const lifeEvent = await storage.createLifeEvent({
        clientId,
        eventType: detection.category,
        eventDate: new Date().toISOString().split("T")[0],
        description: detection.description,
      });
      lifeEventsCreated.push(lifeEvent);
    } catch (err) {
      logger.error({ err }, "Failed to create life event from workflow");
    }
  }

  return { lifeEventsDetected: lifeEventsCreated, count: lifeEventsCreated.length };
});

export async function ensureMeetingLifecycleDefinition(): Promise<void> {
  const existing = await storage.getWorkflowDefinitionBySlug(MEETING_LIFECYCLE_SLUG);
  if (existing) {
    logger.info({ id: existing.id }, "Meeting lifecycle workflow definition already exists");
    return;
  }

  await storage.createWorkflowDefinition({
    name: "Client Meeting Lifecycle",
    slug: MEETING_LIFECYCLE_SLUG,
    description: "End-to-end automation of advisor-client meetings, from preparation through post-meeting followup and compliance documentation.",
    category: "meeting",
    triggerEvent: "meeting.scheduled",
    steps: MEETING_LIFECYCLE_STEPS as any,
    gates: MEETING_LIFECYCLE_GATES as any,
    branches: MEETING_LIFECYCLE_BRANCHES as any,
    defaultTimeoutHours: 72,
    isActive: true,
    version: 1,
  });

  logger.info("Meeting lifecycle workflow definition registered");
}
