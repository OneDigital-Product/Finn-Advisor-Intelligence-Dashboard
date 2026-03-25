import type { Express } from "express";
import { z } from "zod";
import { requireAuth, requireAdvisor, getSessionAdvisor } from "./middleware";
import { storage } from "../storage";
import { validateBody } from "../lib/validation";
import { sanitizeErrorMessage } from "../lib/error-utils";
import { BehavioralFinanceEngine } from "../engines/behavioral-finance";

const engine = new BehavioralFinanceEngine();

const analyzeSchema = z.object({
  communicationText: z.string().min(10, "Communication text must be at least 10 characters"),
  sourceType: z.enum(["meeting_transcript", "email", "phone_notes", "chat", "manual"]),
  sourceId: z.string().optional(),
  marketContext: z.string().optional(),
});

export function registerBehavioralFinanceRoutes(app: Express) {
  app.post("/api/clients/:id/behavioral/analyze", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Unauthorized" });

      const body = validateBody(analyzeSchema, req, res);
      if (!body) return;

      const client = await storage.getClient(req.params.id);
      if (!client) return res.status(404).json({ message: "Client not found" });
      if (client.advisorId !== advisor.id) return res.status(403).json({ message: "Access denied" });

      const analysisData = await engine.analyzeClientCommunication(
        req.params.id,
        advisor.id,
        body.communicationText,
        body.sourceType,
        body.sourceId,
        body.marketContext
      );

      const saved = await storage.createBehavioralAnalysis(analysisData);
      res.json({ analysis: saved });
    } catch (err: any) {
      res.status(500).json({ message: sanitizeErrorMessage(err, "Analysis failed") });
    }
  });

  app.post("/api/clients/:id/behavioral/analyze-meeting/:meetingId", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Unauthorized" });

      const meeting = await storage.getMeeting(req.params.meetingId);
      if (!meeting) return res.status(404).json({ message: "Meeting not found" });
      if (meeting.clientId !== req.params.id) return res.status(400).json({ message: "Meeting does not belong to this client" });

      const client = await storage.getClient(req.params.id);
      if (!client) return res.status(404).json({ message: "Client not found" });
      if (client.advisorId !== advisor.id) return res.status(403).json({ message: "Access denied" });

      const analysisData = await engine.analyzeMeetingTranscript(
        req.params.meetingId,
        advisor.id
      );

      if (!analysisData) {
        return res.status(400).json({ message: "Meeting has no transcript or notes to analyze" });
      }

      const saved = await storage.createBehavioralAnalysis(analysisData);
      res.json({ analysis: saved });
    } catch (err: any) {
      res.status(500).json({ message: sanitizeErrorMessage(err, "Analysis failed") });
    }
  });

  app.get("/api/clients/:id/behavioral", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Unauthorized" });

      const client = await storage.getClient(req.params.id);
      if (!client) return res.status(404).json({ message: "Client not found" });
      if (client.advisorId !== advisor.id) return res.status(403).json({ message: "Access denied" });

      const profile = await engine.getClientBehavioralProfile(req.params.id);
      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ message: sanitizeErrorMessage(err, "Failed to get behavioral profile") });
    }
  });

  app.get("/api/clients/:id/behavioral/alerts", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Unauthorized" });

      const client = await storage.getClient(req.params.id);
      if (!client) return res.status(404).json({ message: "Client not found" });
      if (client.advisorId !== advisor.id) return res.status(403).json({ message: "Access denied" });

      const alert = await engine.checkVolatilityAlerts(req.params.id, advisor.id);
      res.json(alert);
    } catch (err: any) {
      res.status(500).json({ message: sanitizeErrorMessage(err, "Failed to check alerts") });
    }
  });

  app.get("/api/clients/:id/behavioral/coaching-notes", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Unauthorized" });

      const client = await storage.getClient(req.params.id);
      if (!client) return res.status(404).json({ message: "Client not found" });
      if (client.advisorId !== advisor.id) return res.status(403).json({ message: "Access denied" });

      const notes = await engine.generateMeetingBehavioralNotes(req.params.id);
      res.json({ notes });
    } catch (err: any) {
      res.status(500).json({ message: sanitizeErrorMessage(err, "Failed to generate coaching notes") });
    }
  });

  app.get("/api/behavioral/de-escalation-scripts", requireAuth, async (req, res) => {
    try {
      const bias = typeof req.query.bias === "string" ? req.query.bias : undefined;
      const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;
      const scripts = engine.getDeEscalationScripts(bias, tag);
      const biases = engine.getAvailableBiases();
      res.json({ scripts, biases });
    } catch (err: any) {
      res.status(500).json({ message: sanitizeErrorMessage(err, "Failed to get scripts") });
    }
  });

  app.get("/api/clients/:id/behavioral/timeline", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Unauthorized" });

      const client = await storage.getClient(req.params.id);
      if (!client) return res.status(404).json({ message: "Client not found" });
      if (client.advisorId !== advisor.id) return res.status(403).json({ message: "Access denied" });

      const analyses = await storage.getBehavioralAnalysesByClient(req.params.id);
      const timeline = analyses.map((a) => ({
        id: a.id,
        date: a.createdAt,
        sentiment: a.sentiment,
        sentimentScore: a.sentimentScore,
        behavioralRiskScore: a.behavioralRiskScore,
        anxietyLevel: a.anxietyLevel,
        dominantBias: a.dominantBias,
        sourceType: a.sourceType,
        coachingNotes: a.coachingNotes,
      }));
      res.json({ timeline });
    } catch (err: any) {
      res.status(500).json({ message: sanitizeErrorMessage(err, "Failed to get timeline") });
    }
  });
}
