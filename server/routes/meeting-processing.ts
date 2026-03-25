import type { Express } from "express";
import { logger } from "../lib/logger";
import { sanitizeErrorMessage, isNotFoundError } from "../lib/error-utils";
import { sanitizePromptInput } from "../lib/prompt-sanitizer";
import { requireAuth, requireAdvisor, getSessionAdvisor } from "./middleware";
import { MeetingPipeline } from "../engines/meeting-pipeline";
import { storage } from "../storage";

const pipeline = new MeetingPipeline();

export function registerMeetingProcessingRoutes(app: Express) {
  app.post("/api/meetings/:id/process", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const meeting = await storage.getMeeting((req.params.id as string));
      if (!meeting) return res.status(404).json({ message: "Meeting not found" });
      if (meeting.advisorId !== advisor.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const { dryRun, config } = req.body || {};

      const advisorConfig = await storage.getMeetingProcessConfig(advisor.id);

      const processConfig = {
        autoCreateTasks: config?.autoCreateTasks ?? advisorConfig?.autoCreateTasks ?? true,
        syncToSalesforce: config?.syncToSalesforce ?? advisorConfig?.syncToSalesforce ?? true,
        generateFollowUpEmail: config?.generateFollowUpEmail ?? advisorConfig?.generateFollowUpEmail ?? true,
        dryRun: dryRun ?? false,
        defaultTaskPriority: advisorConfig?.defaultTaskPriority ?? "medium",
        defaultTaskDueDays: advisorConfig?.defaultTaskDueDays ?? 7,
      };

      const result = await pipeline.process((req.params.id as string), advisor.id, processConfig);
      res.json(result);
    } catch (err: any) {
      logger.error({ err: err }, "[MeetingProcess] Error");
      const notFound = isNotFoundError(err);
      res.status(notFound ? 404 : 400).json({ error: sanitizeErrorMessage(err, "Failed to process meeting") });
    }
  });

  app.post("/api/meetings/:id/process/email", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const meeting = await storage.getMeeting((req.params.id as string));
      if (!meeting) return res.status(404).json({ message: "Meeting not found" });
      if (meeting.advisorId !== advisor.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (!meeting.clientId) return res.status(400).json({ error: "No client associated" });
      const client = await storage.getClient(meeting.clientId);
      if (!client) return res.status(404).json({ error: "Client not found" });

      const advisorData = await storage.getAdvisor(advisor.id);
      const rawContent = meeting.transcriptSummary || meeting.notes || "";
      if (!rawContent) return res.status(400).json({ error: "No meeting content to generate email from" });
      const content = sanitizePromptInput(rawContent);

      const { generateFollowUpEmail } = await import("../openai");
      const emailBody = await generateFollowUpEmail({
        clientName: `${client.firstName} ${client.lastName}`,
        clientEmail: client.email || "",
        meetingNotes: content,
        advisorName: advisorData?.name || "Your Advisor",
      });

      await storage.updateMeeting(meeting.id, { followUpEmail: emailBody });

      res.json({
        success: true,
        email: {
          to: client.email || "",
          subject: `Follow-up: ${meeting.title}`,
          body: emailBody,
        },
      });
    } catch (err: any) {
      logger.error({ err: err }, "[MeetingProcess] Email error");
      res.status(500).json({ error: "Failed to generate email" });
    }
  });

  app.get("/api/meetings/:id/process/config", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const config = await storage.getMeetingProcessConfig(advisor.id);
      res.json(config || {
        autoCreateTasks: true,
        syncToSalesforce: true,
        generateFollowUpEmail: true,
        defaultTaskPriority: "medium",
        defaultTaskDueDays: 7,
      });
    } catch (err: any) {
      logger.error({ err }, "[MeetingProcess] Config fetch error");
      res.status(500).json({ error: "Failed to get config" });
    }
  });

  app.patch("/api/meetings/:id/process/config", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const { autoCreateTasks, syncToSalesforce, generateFollowUpEmail, defaultTaskPriority, defaultTaskDueDays } = req.body;
      const result = await storage.upsertMeetingProcessConfig(advisor.id, {
        autoCreateTasks,
        syncToSalesforce,
        generateFollowUpEmail,
        defaultTaskPriority,
        defaultTaskDueDays,
      });
      res.json(result);
    } catch (err: any) {
      logger.error({ err }, "[MeetingProcess] Config update error");
      res.status(500).json({ error: "Failed to update config" });
    }
  });
}
