import type { Express } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";
import { validateBody } from "../lib/validation";
import { sanitizePromptInput } from "../lib/prompt-sanitizer";
import { getSessionAdvisor, requireAuth } from "./middleware";
import { upload, uploadLimiter, SAMPLE_TRANSCRIPT } from "./utils";
import { storage } from "../storage";
import {
  generateMeetingPrep,
  generateMeetingSummary,
  summarizeTranscript,
  analyzeTranscriptWithConfig,
  extractActionItems,
} from "../openai";
import { getClientRelevantResearch, getResearchHighlightsForMeetingPrep } from "../engines/research-engine";
import { insertMeetingSchema } from "@shared/schema";

const createMeetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  type: z.string().min(1, "Type is required"),
  clientId: z.string().nullable().optional(),
  status: z.string().optional(),
  notes: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  attendees: z.array(z.object({ name: z.string(), email: z.string() })).optional(),
  agenda: z.array(z.string()).optional(),
});

const meetingNotesSchema = z.object({
  notes: z.string().nullable().optional(),
});

const transcriptBodySchema = z.object({
  text: z.string().max(10 * 1024 * 1024, "Text exceeds 10MB limit").optional(),
});

export function registerMeetingRoutes(app: Express) {
  app.get("/api/meetings", requireAuth, async (req, res) => {
    const advisor = await getSessionAdvisor(req);
    if (!advisor) return res.status(404).json({ message: "No advisor found" });
    const allMeetings = await storage.getMeetings(advisor.id);

    const meetingsWithDetails = await Promise.all(
      allMeetings.map(async (meeting) => {
        const client = meeting.clientId ? await storage.getClient(meeting.clientId) : null;
        const meetingTasks = await storage.getTasksByMeeting(meeting.id);
        const activeTasks = meetingTasks.filter(t => t.status !== "completed");
        const completedTaskCount = meetingTasks.filter(t => t.status === "completed").length;
        return {
          ...meeting,
          client,
          taskCount: meetingTasks.length,
          activeTaskCount: activeTasks.length,
          completedTaskCount,
          tasks: activeTasks.slice(0, 3).map(t => ({ id: t.id, title: t.title, type: t.type, priority: t.priority, dueDate: t.dueDate })),
        };
      })
    );

    res.json(meetingsWithDetails);
  });

  app.post("/api/meetings", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const body = validateBody(createMeetingSchema, req, res);
      if (!body) return;
      if (body.clientId) {
        const client = await storage.getClient(body.clientId);
        if (!client) return res.status(404).json({ message: "Client not found" });
        if (client.advisorId !== advisor.id) return res.status(403).json({ message: "Not authorized for this client" });
      }
      const conflicts = await storage.checkMeetingConflicts(advisor.id, body.startTime, body.endTime);
      const meeting = await storage.createMeeting({
        advisorId: advisor.id,
        clientId: body.clientId || null,
        title: body.title,
        startTime: body.startTime,
        endTime: body.endTime,
        type: body.type,
        status: body.status || "scheduled",
        notes: body.notes || null,
        location: body.location || null,
        description: body.description || null,
        timezone: body.timezone || null,
        attendees: body.attendees || [],
        agenda: body.agenda || [],
      });
      res.json({ ...meeting, conflicts: conflicts.length > 0 ? conflicts : undefined });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/meetings/:id", requireAuth, async (req, res) => {
    const meeting = await storage.getMeeting(req.params.id);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    // Verify the requesting user owns this meeting
    if (meeting.advisorId !== req.session.userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    let client = null;
    if (meeting.clientId) {
      client = await storage.getClient(meeting.clientId);
    }

    res.json({ ...meeting, client });
  });

  app.post("/api/meetings/:id/prep", requireAuth, async (req, res) => {
    const meeting = await storage.getMeeting(req.params.id);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    if (meeting.advisorId !== req.session.userId) return res.status(403).json({ message: "Access denied" });
    if (!meeting.clientId) return res.status(400).json({ message: "No client associated" });

    const client = await storage.getClient(meeting.clientId);
    if (!client) return res.status(404).json({ message: "Client not found" });

    const [hlds, accts, tasks, recentMeetings, lifeEvts, compliance, prepConfig] = await Promise.all([
      storage.getHoldingsByClient(client.id),
      storage.getAccountsByClient(client.id),
      storage.getTasksByClient(client.id),
      storage.getMeetingsByClient(client.id),
      storage.getLifeEvents(client.id),
      storage.getComplianceItemsByClient(client.id),
      storage.getActiveMeetingPrepConfig(),
    ]);

    let perf: any[] = [];
    if (accts.length > 0 && accts[0].householdId) {
      perf = await storage.getPerformanceByHousehold(accts[0].householdId);
    }

    let researchHighlights = "";
    try {
      const relevantResearch = await getClientRelevantResearch(client.id);
      researchHighlights = getResearchHighlightsForMeetingPrep(relevantResearch);
    } catch (err) {
      // Research is optional; don't fail meeting prep if it errors
    }

    const prepBrief = await generateMeetingPrep({
      clientName: `${client.firstName} ${client.lastName}`,
      clientInfo: client,
      holdings: hlds,
      performance: perf,
      recentMeetings: recentMeetings.filter(m => m.status === "completed").slice(0, 3),
      tasks: tasks.filter(t => t.status !== "completed"),
      lifeEvents: lifeEvts,
      complianceItems: compliance,
      researchHighlights,
    }, prepConfig ? { systemPrompt: prepConfig.systemPrompt, userPromptTemplate: prepConfig.userPromptTemplate } : null);

    await storage.updateMeeting(meeting.id, { prepBrief });
    res.json({ prepBrief });
  });

  app.post("/api/meetings/:id/summarize", requireAuth, async (req, res) => {
    const meeting = await storage.getMeeting(req.params.id);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    if (meeting.advisorId !== req.session.userId) return res.status(403).json({ message: "Access denied" });
    if (meeting.status !== "completed") return res.status(400).json({ message: "Only completed meetings can be summarized" });
    if (!meeting.clientId) return res.status(400).json({ message: "No client associated" });

    const client = await storage.getClient(meeting.clientId);
    if (!client) return res.status(404).json({ message: "Client not found" });

    const [hlds, accts, tasks, lifeEvts, summaryConfig] = await Promise.all([
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

    const summary = await generateMeetingSummary({
      clientName: `${client.firstName} ${client.lastName}`,
      clientInfo: client,
      meetingTitle: meeting.title,
      meetingType: meeting.type,
      meetingDate: new Date(meeting.startTime).toLocaleDateString(),
      meetingNotes: sanitizePromptInput(meeting.notes || ''),
      holdings: hlds,
      performance: perf,
      tasks: tasks.filter(t => t.status !== "completed"),
      lifeEvents: lifeEvts,
    }, summaryConfig ? { systemPrompt: summaryConfig.systemPrompt, userPromptTemplate: summaryConfig.userPromptTemplate } : null);

    let suggestedTasks: any[] = [];
    let cleanSummary = summary;
    const taskBlockMatch = summary.match(/```suggested_tasks\s*([\s\S]*?)```/);
    if (taskBlockMatch) {
      try {
        suggestedTasks = JSON.parse(taskBlockMatch[1].trim());
      } catch {}
      cleanSummary = summary.replace(/```suggested_tasks[\s\S]*?```/, '').trim();
    }

    await storage.updateMeeting(meeting.id, { transcriptSummary: cleanSummary });
    res.json({ transcriptSummary: cleanSummary, suggestedTasks });
  });

  app.post("/api/meetings/:id/notes", requireAuth, async (req, res) => {
    const body = validateBody(meetingNotesSchema, req, res);
    if (!body) return;
    const existing = await storage.getMeeting(req.params.id);
    if (!existing) return res.status(404).json({ message: "Meeting not found" });
    if (existing.advisorId !== req.session.userId) return res.status(403).json({ message: "Access denied" });
    const meeting = await storage.updateMeeting(req.params.id, { notes: body.notes });
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    res.json(meeting);
  });

  app.get("/api/meetings/:id/notes-records", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const meeting = await storage.getMeeting(req.params.id);
      if (!meeting) return res.status(404).json({ message: "Meeting not found" });
      if (meeting.advisorId !== advisor.id) return res.status(403).json({ message: "Forbidden" });
      const notes = await storage.getMeetingNotesByMeeting(req.params.id);
      res.json(notes);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "Failed to fetch meeting notes" });
    }
  });

  app.post("/api/meetings/:id/notes-records", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const meeting = await storage.getMeeting(req.params.id);
      if (!meeting) return res.status(404).json({ message: "Meeting not found" });
      if (meeting.advisorId !== advisor.id) return res.status(403).json({ message: "Forbidden" });

      const { noteText } = req.body;
      if (!noteText || typeof noteText !== "string") {
        return res.status(400).json({ message: "noteText is required" });
      }

      let summary: string | null = null;
      let actionItems: string[] = [];
      try {
        const { extractActionItems } = await import("../openai");
        const clientName = meeting.clientId
          ? await storage.getClient(meeting.clientId).then(c => c ? `${c.firstName} ${c.lastName}` : "Client")
          : "Client";
        const aiResult = await extractActionItems(noteText, clientName);
        if (typeof aiResult === "string") {
          summary = aiResult;
        } else if (aiResult && typeof aiResult === "object") {
          const resultObj = aiResult as Record<string, unknown>;
          summary = typeof resultObj.summary === "string" ? resultObj.summary : null;
          actionItems = Array.isArray(resultObj.actionItems) ? resultObj.actionItems.filter((i): i is string => typeof i === "string") : [];
        }
      } catch {
      }

      const note = await storage.createMeetingNote({
        meetingId: meeting.id,
        advisorId: advisor.id,
        noteText,
        summary,
        actionItems,
      });

      if (actionItems.length > 0 && meeting.clientId) {
        try {
          for (const item of actionItems) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 7);
            await storage.createTask({
              advisorId: advisor.id,
              clientId: meeting.clientId,
              meetingId: meeting.id,
              title: item,
              description: `Action item from meeting notes: ${meeting.title}`,
              dueDate: dueDate.toISOString().split("T")[0],
              priority: "medium",
              status: "pending",
              type: "follow_up",
            });
          }
        } catch (taskErr) {
          logger.warn({ err: taskErr }, "Failed to create tasks from action items");
        }
      }

      res.json(note);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "Failed to create meeting note" });
    }
  });

  app.post("/api/meetings/:id/transcript", requireAuth, uploadLimiter, upload.single("file"), async (req, res) => {
    try {
      const meeting = await storage.getMeeting((req.params.id as string));
      if (!meeting) return res.status(404).json({ message: "Meeting not found" });
      if (meeting.advisorId !== req.session.userId) return res.status(403).json({ message: "Access denied" });

      const bodyFields = validateBody(transcriptBodySchema, req, res);
      if (!bodyFields) return;

      let transcriptText = "";
      if (req.file) {
        transcriptText = req.file.buffer.toString("utf-8");
      } else if (bodyFields.text) {
        transcriptText = bodyFields.text;
      } else {
        return res.status(400).json({ message: "No transcript file or text provided" });
      }

      if (transcriptText.includes("WEBVTT")) {
        transcriptText = transcriptText
          .replace(/WEBVTT\n\n/g, "")
          .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\n/g, "")
          .replace(/^\d+\n/gm, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      }

      let clientName = "Unknown Client";
      if (meeting.clientId) {
        const client = await storage.getClient(meeting.clientId);
        if (client) clientName = `${client.firstName} ${client.lastName}`;
      }

      const summary = await summarizeTranscript(sanitizePromptInput(transcriptText), clientName);

      const updated = await storage.updateMeeting((req.params.id as string), {
        transcriptRaw: transcriptText,
        transcriptSummary: summary,
        notes: meeting.notes
          ? `${meeting.notes}\n\n---\n\n### Transcript Summary\n${summary}`
          : `### Transcript Summary\n${summary}`,
      });

      res.json({ meeting: updated, summary });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/clients/:clientId/meetings/from-transcript", requireAuth, uploadLimiter, upload.single("file"), async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const client = await storage.getClient((req.params.clientId as string));
      if (!client) return res.status(404).json({ message: "Client not found" });
      if (client.advisorId !== advisor.id) return res.status(403).json({ message: "Not authorized for this client" });

      const bodyFields2 = validateBody(transcriptBodySchema, req, res);
      if (!bodyFields2) return;

      let transcriptText = "";
      if (req.file) {
        transcriptText = req.file.buffer.toString("utf-8");
      } else if (bodyFields2.text) {
        transcriptText = bodyFields2.text;
      } else {
        return res.status(400).json({ message: "No transcript file or text provided" });
      }

      if (transcriptText.includes("WEBVTT")) {
        transcriptText = transcriptText
          .replace(/WEBVTT\n\n/g, "")
          .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\n/g, "")
          .replace(/^\d+\n/gm, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      }

      const clientName = `${client.firstName} ${client.lastName}`;
      const tcConfig = await storage.getActiveTranscriptConfig();

      let analysis: any;
      if (tcConfig) {
        analysis = await analyzeTranscriptWithConfig(tcConfig.analysisPrompt, sanitizePromptInput(transcriptText), clientName);
      } else {
        analysis = await analyzeTranscriptWithConfig("", sanitizePromptInput(transcriptText), clientName);
      }

      const now = new Date();
      const meeting = await storage.createMeeting({
        advisorId: advisor.id,
        clientId: client.id,
        title: analysis.title || `Meeting with ${clientName}`,
        startTime: now.toISOString(),
        endTime: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
        type: analysis.type || "review",
        status: "completed",
        location: "Uploaded Transcript",
        notes: analysis.summary || "",
        transcriptRaw: transcriptText,
        transcriptSummary: analysis.summary || "",
      });

      if (analysis.actionItems && Array.isArray(analysis.actionItems)) {
        for (const item of analysis.actionItems) {
          await storage.createTask({
            advisorId: advisor.id,
            clientId: client.id,
            title: item.description || item.title || "Follow-up item",
            description: `From meeting: ${meeting.title}`,
            priority: item.priority || "medium",
            status: "pending",
            dueDate: item.dueDate || null,
          });
        }
      }

      await storage.createActivity({
        advisorId: advisor.id,
        clientId: client.id,
        type: "meeting",
        subject: `Meeting logged: ${meeting.title}`,
        description: analysis.summary || `Transcript-based meeting with ${clientName}`,
        date: now.toISOString().split("T")[0],
      });

      res.json({ meeting, analysis });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/sample-transcript", requireAuth, (_req, res) => {
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", "attachment; filename=sample_meeting_transcript.txt");
    res.send(SAMPLE_TRANSCRIPT);
  });
}
