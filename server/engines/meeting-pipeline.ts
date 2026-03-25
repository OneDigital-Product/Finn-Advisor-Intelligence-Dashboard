import { db } from "../db";
import { logger } from "../lib/logger";
import { sanitizePromptInput } from "../lib/prompt-sanitizer";
import { meetings, tasks, type InsertTask } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../storage";
import {
  generateMeetingSummary,
  extractActionItems,
  generateFollowUpEmail,
  detectLifeEventsFromTranscript,
  analyzeSentiment,
} from "../openai";
import { MeetingSalesforceSync } from "../services/meeting-salesforce-sync";
import { validateAIContent } from "./fiduciary-compliance";
import { workflowOrchestrator } from "./workflow-orchestrator";
import { MEETING_LIFECYCLE_SLUG } from "./workflow-definitions/meeting-lifecycle";

export interface ActionItem {
  description: string;
  owner: "advisor" | "client" | string;
  dueDate: string;
  priority: "low" | "medium" | "high";
}

export interface MeetingProcessConfig {
  autoCreateTasks: boolean;
  syncToSalesforce: boolean;
  generateFollowUpEmail: boolean;
  dryRun: boolean;
  defaultTaskPriority: string;
  defaultTaskDueDays: number;
}

export interface MeetingProcessResult {
  success: boolean;
  meetingId: string;
  summary: string;
  actionItems: ActionItem[];
  tasksCreated: { id: string; title: string; owner: string; dueDate: string }[];
  salesforceSync: {
    status: "success" | "pending" | "skipped" | "error";
    error?: string;
  };
  followUpEmail: {
    to: string;
    subject: string;
    body: string;
  } | null;
  behavioralAnalysis: any | null;
  lifeEventsDetected: any[];
  duration_ms: number;
}

const DEFAULT_CONFIG: MeetingProcessConfig = {
  autoCreateTasks: true,
  syncToSalesforce: true,
  generateFollowUpEmail: true,
  dryRun: false,
  defaultTaskPriority: "medium",
  defaultTaskDueDays: 7,
};

export class MeetingPipeline {
  private salesforceSync: MeetingSalesforceSync;

  constructor() {
    this.salesforceSync = new MeetingSalesforceSync();
  }

  async processViaWorkflow(
    meetingId: string,
    advisorId: string,
    config?: Partial<MeetingProcessConfig>
  ): Promise<{ instanceId: string; fallback: boolean }> {
    try {
      const definition = await storage.getWorkflowDefinitionBySlug(MEETING_LIFECYCLE_SLUG);
      if (!definition) {
        logger.warn("Meeting lifecycle workflow definition not found, falling back to direct processing");
        const result = await this.process(meetingId, advisorId, config);
        return { instanceId: meetingId, fallback: true };
      }

      const meeting = await storage.getMeeting(meetingId);
      if (!meeting) throw new Error(`Meeting not found: ${meetingId}`);

      const instance = await workflowOrchestrator.triggerWorkflow(
        definition.id,
        advisorId,
        {
          meetingId,
          clientId: meeting.clientId,
          meetingType: meeting.type,
          meetingTitle: meeting.title,
          config: config || {},
        },
        { clientId: meeting.clientId || undefined, meetingId }
      );

      logger.info({ instanceId: instance.id, meetingId }, "Meeting processing delegated to workflow orchestrator");
      return { instanceId: instance.id, fallback: false };
    } catch (err: any) {
      logger.error({ err, meetingId }, "Failed to trigger workflow, falling back to direct processing");
      await this.process(meetingId, advisorId, config);
      return { instanceId: meetingId, fallback: true };
    }
  }

  async process(
    meetingId: string,
    advisorId: string,
    config?: Partial<MeetingProcessConfig>
  ): Promise<MeetingProcessResult> {
    const startTime = Date.now();
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    const meeting = await storage.getMeeting(meetingId);
    if (!meeting) throw new Error(`Meeting not found: ${meetingId}`);

    const hasContent = meeting.notes || meeting.transcriptRaw || meeting.transcriptSummary;
    if (!hasContent) throw new Error("Meeting has no notes or transcript to process");

    if (!meeting.clientId) throw new Error("Meeting has no associated client");

    const client = await storage.getClient(meeting.clientId);
    if (!client) throw new Error("Client not found");

    if (meeting.summaryGenerated && !finalConfig.dryRun) {
      logger.info("Operation completed");
    }

    const advisor = await storage.getAdvisor(advisorId);
    const advisorName = advisor?.name || "Your Advisor";

    const [hlds, accts, clientTasks, lifeEvts, summaryConfig] = await Promise.all([
      storage.getHoldingsByClient(client.id),
      storage.getAccountsByClient(client.id),
      storage.getTasksByClient(client.id),
      storage.getLifeEvents(client.id),
      storage.getActiveMeetingSummaryConfig(),
    ]);

    let perf: any[] = [];
    if (accts.length > 0 && accts[0].householdId) {
      perf = await storage.getPerformanceByHousehold(accts[0].householdId);
    }

    const meetingContent = sanitizePromptInput(meeting.notes || meeting.transcriptSummary || meeting.transcriptRaw || "");

    const summary = await generateMeetingSummary(
      {
        clientName: `${client.firstName} ${client.lastName}`,
        clientInfo: client,
        meetingTitle: meeting.title,
        meetingType: meeting.type,
        meetingDate: new Date(meeting.startTime).toLocaleDateString(),
        meetingNotes: meetingContent,
        holdings: hlds,
        performance: perf,
        tasks: clientTasks.filter((t) => t.status !== "completed"),
        lifeEvents: lifeEvts,
      },
      summaryConfig
        ? { systemPrompt: summaryConfig.systemPrompt, userPromptTemplate: summaryConfig.userPromptTemplate }
        : null
    );

    const summaryValidation = await validateAIContent(summary, "meeting_summary", {
      advisorId,
      clientId: client.id,
      clientRiskTolerance: client.riskTolerance || undefined,
    });

    try {
      await storage.createFiduciaryValidationLog({
        advisorId,
        clientId: client.id,
        contentType: "meeting_summary",
        outcome: summaryValidation.outcome,
        ruleSetVersion: summaryValidation.ruleSetVersion,
        matchCount: summaryValidation.matches.length,
        warningCount: summaryValidation.warnings.length,
        blockCount: summaryValidation.blocks.length,
        matches: summaryValidation.matches as any,
        contentPreview: summary.substring(0, 500),
        resolvedBy: null,
        resolvedAt: null,
        resolutionNote: null,
      });
    } catch (logErr) {
      logger.error({ err: logErr }, "Failed to log compliance validation");
    }

    const validatedSummary = summaryValidation.outcome === "blocked"
      ? summaryValidation.annotatedContent + "\n\n> **This content has been held for compliance review.**"
      : summaryValidation.outcome === "flagged"
        ? summaryValidation.annotatedContent
        : summary;

    let cleanSummary = validatedSummary;
    const taskBlockMatch = validatedSummary.match(/```suggested_tasks\s*([\s\S]*?)```/);
    if (taskBlockMatch) {
      cleanSummary = validatedSummary.replace(/```suggested_tasks[\s\S]*?```/, "").trim();
    }

    const extractedRaw = await extractActionItems(meetingContent, `${client.firstName} ${client.lastName}`);
    const actionItems = this.parseActionItems(extractedRaw, finalConfig);

    const tasksCreated: { id: string; title: string; owner: string; dueDate: string }[] = [];

    if (finalConfig.autoCreateTasks && !finalConfig.dryRun && actionItems.length > 0) {
      for (const item of actionItems) {
        try {
          const assigneeId = item.owner === "client" ? undefined : undefined;
          const task = await storage.createTask({
            advisorId,
            clientId: client.id,
            meetingId,
            title: item.description,
            description: `Action item from meeting: ${meeting.title}`,
            dueDate: item.dueDate,
            priority: item.priority,
            status: "pending",
            type: "follow_up",
          });
          tasksCreated.push({
            id: task.id,
            title: task.title,
            owner: item.owner,
            dueDate: item.dueDate,
          });
        } catch (err: any) {
          logger.error({ err }, "Task creation failed");
        }
      }
    }

    if (!finalConfig.dryRun) {
      await storage.updateMeeting(meetingId, {
        transcriptSummary: cleanSummary,
        summaryGenerated: true,
      });
    }

    let salesforceStatus: MeetingProcessResult["salesforceSync"] = { status: "skipped" };
    if (finalConfig.syncToSalesforce && !finalConfig.dryRun && tasksCreated.length > 0) {
      salesforceStatus = { status: "pending" };
      setImmediate(async () => {
        try {
          const result = await this.salesforceSync.syncMeetingAndTasks(
            meetingId,
            tasksCreated.map((t) => t.id)
          );
          logger.info({ status: result.status }, "SF sync result");
        } catch (err: any) {
          logger.error({ err }, "SF sync error");
        }
      });
    }

    let followUpEmail: MeetingProcessResult["followUpEmail"] = null;
    if (finalConfig.generateFollowUpEmail) {
      try {
        const emailBody = await generateFollowUpEmail({
          clientName: `${client.firstName} ${client.lastName}`,
          clientEmail: client.email || "",
          meetingNotes: cleanSummary,
          advisorName,
        });

        const emailValidation = await validateAIContent(emailBody, "follow_up_email", {
          advisorId,
          clientId: client.id,
          clientRiskTolerance: client.riskTolerance || undefined,
        });

        try {
          await storage.createFiduciaryValidationLog({
            advisorId,
            clientId: client.id,
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
          logger.error({ err: logErr }, "Failed to log email compliance validation");
        }

        const validatedEmailBody = emailValidation.outcome === "blocked"
          ? emailValidation.annotatedContent + "\n\n> **This email has been held for compliance review before sending.**"
          : emailValidation.outcome === "flagged"
            ? emailValidation.annotatedContent
            : emailBody;

        followUpEmail = {
          to: client.email || "",
          subject: `Follow-up: ${meeting.title} — ${new Date(meeting.startTime).toLocaleDateString()}`,
          body: validatedEmailBody,
        };

        if (!finalConfig.dryRun) {
          await storage.updateMeeting(meetingId, { followUpEmail: validatedEmailBody });
        }
      } catch (err: any) {
        logger.error({ err }, "Email generation failed");
      }
    }

    let behavioralAnalysis: any = null;
    if (!finalConfig.dryRun) {
      try {
        const sentimentResult = await analyzeSentiment({
          clientName: `${client.firstName} ${client.lastName}`,
          communicationText: meetingContent,
          sourceType: "meeting_transcript",
          clientInfo: client as any,
        });
        if (sentimentResult.anxietyLevel !== "low" || sentimentResult.behavioralRiskScore > 30) {
          behavioralAnalysis = await storage.createBehavioralAnalysis({
            clientId: client.id,
            advisorId,
            sentiment: sentimentResult.sentiment,
            sentimentScore: sentimentResult.sentimentScore,
            behavioralRiskScore: sentimentResult.behavioralRiskScore,
            dominantBias: sentimentResult.dominantBias,
            biasIndicators: sentimentResult.biasIndicators as any,
            anxietyLevel: sentimentResult.anxietyLevel,
            sourceType: "meeting_transcript",
            sourceId: meetingId,
            sourceSnippet: meetingContent.substring(0, 500),
            coachingNotes: sentimentResult.coachingNotes,
            deEscalationStrategy: sentimentResult.deEscalationStrategy,
            marketCondition: "normal",
            metrics: { analysisTimestamp: new Date().toISOString() },
          });
          logger.info({ clientId: client.id, anxietyLevel: sentimentResult.anxietyLevel }, "Behavioral analysis recorded from meeting pipeline");
        }
      } catch (err: any) {
        logger.error({ err }, "Behavioral analysis failed in meeting pipeline");
      }
    }

    let lifeEventsDetected: any[] = [];
    if (!finalConfig.dryRun) {
      try {
        const existingLifeEvents = await storage.getLifeEvents(client.id);
        const detections = await detectLifeEventsFromTranscript(
          meetingContent,
          `${client.firstName} ${client.lastName}`,
          existingLifeEvents.map(e => ({ eventDate: e.eventDate || "", description: e.description }))
        );
        for (const detection of detections) {
          const lifeEvent = await storage.createLifeEvent({
            clientId: client.id,
            eventType: detection.category,
            eventDate: new Date().toISOString().split("T")[0],
            description: detection.description,
          });
          lifeEventsDetected.push(lifeEvent);

          if (detection.profileFieldUpdates && Object.keys(detection.profileFieldUpdates).length > 0) {
            await storage.createPendingProfileUpdate({
              clientId: client.id,
              advisorId,
              sourceType: "meeting_transcript",
              sourceId: meetingId,
              lifeEvent: detection.event,
              fieldUpdates: detection.profileFieldUpdates,
              reasoning: detection.reasoning,
              status: "pending",
              reviewedBy: null,
              reviewedAt: null,
              reviewNote: null,
            });
          }
        }
        if (detections.length > 0) {
          logger.info({ clientId: client.id, count: detections.length }, "Life events detected from meeting pipeline");
        }
      } catch (err: any) {
        logger.error({ err }, "Life event detection failed in meeting pipeline");
      }
    }

    const duration_ms = Date.now() - startTime;
    logger.info({ tasksCreated: tasksCreated.length, duration_ms }, "MeetingPipeline complete");

    return {
      success: true,
      meetingId,
      summary: cleanSummary,
      actionItems,
      tasksCreated,
      salesforceSync: salesforceStatus,
      followUpEmail,
      behavioralAnalysis,
      lifeEventsDetected,
      duration_ms,
    };
  }

  parseActionItems(extracted: string, config: MeetingProcessConfig): ActionItem[] {
    const items: ActionItem[] = [];
    const lines = extracted.split("\n").filter((line) => line.trim());
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + config.defaultTaskDueDays);

    for (const line of lines) {
      const cleaned = line.replace(/^[\d\-\*\.\)]+\s*/, "").trim();
      if (!cleaned || cleaned.length < 5) continue;
      if (/^(###|no action|ai-enhanced|extraction|action item extraction failed)/i.test(cleaned)) continue;

      const ownerMatch = cleaned.match(/^(Advisor|Client|advisor|client)[\s:]+(.+)/i);

      let owner: string;
      let description: string;

      if (ownerMatch) {
        owner = ownerMatch[1].toLowerCase();
        description = ownerMatch[2].trim();
      } else {
        owner = "advisor";
        description = cleaned;
      }

      const dateMatch = description.match(/\bby\s+(.+?)(?:\s*[-–—]\s*|$)/i);
      let dueDate: string;
      if (dateMatch) {
        const parsed = this.parseDueDate(dateMatch[1].trim());
        dueDate = parsed || defaultDueDate.toISOString().split("T")[0];
        description = description.replace(/\s*by\s+.+$/i, "").trim();
      } else {
        dueDate = defaultDueDate.toISOString().split("T")[0];
      }

      const priority = this.extractPriority(description, config.defaultTaskPriority);

      if (description.length >= 5) {
        items.push({ description, owner, dueDate, priority });
      }
    }

    return items;
  }

  private parseDueDate(dateStr: string): string | null {
    const lower = dateStr.toLowerCase().trim();
    const today = new Date();

    if (lower === "today") return today.toISOString().split("T")[0];
    if (lower === "tomorrow") {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      return d.toISOString().split("T")[0];
    }
    if (lower === "next week") {
      const d = new Date(today);
      d.setDate(d.getDate() + 7);
      return d.toISOString().split("T")[0];
    }

    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayIndex = days.indexOf(lower);
    if (dayIndex !== -1) {
      const d = new Date(today);
      const currentDay = d.getDay();
      const diff = (dayIndex - currentDay + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return d.toISOString().split("T")[0];
    }

    try {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2020) {
        return parsed.toISOString().split("T")[0];
      }
    } catch {}

    return null;
  }

  private extractPriority(description: string, defaultPriority: string): "low" | "medium" | "high" {
    const lower = description.toLowerCase();
    if (/\b(urgent|critical|asap|immediately|high priority)\b/.test(lower)) return "high";
    if (/\b(when possible|no rush|eventually|low priority)\b/.test(lower)) return "low";
    return (defaultPriority as "low" | "medium" | "high") || "medium";
  }
}
