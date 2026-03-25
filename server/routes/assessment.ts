import type { Express } from "express";
import { logger } from "../lib/logger";
import { requireAuth, requireAdvisor, getSessionAdvisor } from "./middleware";
import { AssessmentEngine } from "../engines/assessment-engine";
import { AssessmentPDF } from "../pdf/assessment-pdf";
import { storage } from "../storage";

const engine = new AssessmentEngine();

const SYSTEM_DEFAULTS = {
  retirementAge: 67,
  withdrawalRate: "4.00",
  insuranceMultiplier: 10,
  hnwThreshold: "1000000.00",
};

export function registerAssessmentRoutes(app: Express) {
  app.get("/api/assessment/settings", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const defaults = await storage.getAdvisorAssessmentDefaults(advisor.id);
      res.json(defaults || { ...SYSTEM_DEFAULTS, advisorId: advisor.id });
    } catch (err: any) {
      logger.error({ err }, "[Assessment] Get settings error");
      res.status(500).json({ error: "Failed to fetch assessment settings" });
    }
  });

  app.put("/api/assessment/settings", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const { retirementAge, withdrawalRate, insuranceMultiplier, hnwThreshold } = req.body;
      const data: any = {};
      if (retirementAge !== undefined) data.retirementAge = Number(retirementAge);
      if (withdrawalRate !== undefined) data.withdrawalRate = String(withdrawalRate);
      if (insuranceMultiplier !== undefined) data.insuranceMultiplier = Number(insuranceMultiplier);
      if (hnwThreshold !== undefined) data.hnwThreshold = String(hnwThreshold);

      const result = await storage.upsertAdvisorAssessmentDefaults(advisor.id, data);
      res.json(result);
    } catch (err: any) {
      logger.error({ err }, "[Assessment] Update settings error");
      res.status(500).json({ error: "Failed to update assessment settings" });
    }
  });
  app.post("/api/clients/:id/assessment", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const client = await storage.getClient((req.params.id as string));
      if (!client) return res.status(404).json({ error: "Client not found" });
      if (client.advisorId !== advisor.id) return res.status(403).json({ error: "Not authorized" });

      const { regenerate } = req.body || {};
      const result = await engine.assessClient((req.params.id as string), advisor.id, regenerate === true);
      res.json(result);
    } catch (err: any) {
      logger.error({ err: err }, "[Assessment] Generate error");
      res.status(500).json({ error: "Failed to generate assessment. Please try again." });
    }
  });

  app.get("/api/clients/:id/assessment", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const client = await storage.getClient((req.params.id as string));
      if (!client) return res.status(404).json({ error: "Client not found" });
      if (client.advisorId !== advisor.id) return res.status(403).json({ error: "Not authorized" });

      const assessment = await storage.getLatestAssessment((req.params.id as string));
      if (!assessment) return res.status(404).json({ error: "No assessment found. Generate one first." });

      res.json(assessment.assessmentData);
    } catch (err: any) {
      logger.error({ err: err }, "[Assessment] Fetch error");
      res.status(500).json({ error: "Failed to fetch assessment" });
    }
  });

  app.get("/api/clients/:id/assessment/history", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const client = await storage.getClient((req.params.id as string));
      if (!client) return res.status(404).json({ error: "Client not found" });
      if (client.advisorId !== advisor.id) return res.status(403).json({ error: "Not authorized" });

      const history = await storage.getAssessmentHistory((req.params.id as string));
      res.json(
        history.map((a) => ({
          id: a.id,
          overallScore: a.overallScore,
          summary: a.summary,
          generatedAt: a.generatedAt,
          expiresAt: a.expiresAt,
        }))
      );
    } catch (err: any) {
      logger.error({ err: err }, "[Assessment] History error");
      res.status(500).json({ error: "Failed to fetch assessment history" });
    }
  });

  app.get("/api/clients/:id/assessment-pdf", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const client = await storage.getClient((req.params.id as string));
      if (!client) return res.status(404).json({ error: "Client not found" });
      if (client.advisorId !== advisor.id) return res.status(403).json({ error: "Not authorized" });

      let assessment = await storage.getLatestAssessment((req.params.id as string));
      let assessmentData: any;

      if (!assessment) {
        assessmentData = await engine.assessClient((req.params.id as string), advisor.id);
        assessment = await storage.getLatestAssessment((req.params.id as string));
      } else {
        assessmentData = assessment.assessmentData;
      }

      const advisorData = await storage.getAdvisor(advisor.id);
      const pdf = new AssessmentPDF();
      const buffer = await pdf.generate(assessmentData, client, advisorData?.name);

      const fileName = `${client.firstName}_${client.lastName}_Assessment_${new Date().toISOString().split("T")[0]}.pdf`;

      if (assessment) {
        try {
          await storage.createAssessmentPdf({
            assessmentId: assessment.id,
            type: "assessment",
            fileName,
            fileSize: buffer.length,
            downloadCount: 1,
          });
        } catch {}
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (err: any) {
      logger.error({ err: err }, "[Assessment] PDF error");
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  app.post("/api/clients/:id/assessment-pdf/email", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const client = await storage.getClient((req.params.id as string));
      if (!client) return res.status(404).json({ error: "Client not found" });
      if (client.advisorId !== advisor.id) return res.status(403).json({ error: "Not authorized" });

      if (!client.email) return res.status(400).json({ error: "Client has no email address" });

      let assessment = await storage.getLatestAssessment((req.params.id as string));
      if (!assessment) {
        await engine.assessClient((req.params.id as string), advisor.id);
        assessment = await storage.getLatestAssessment((req.params.id as string));
      }

      const advisorData = await storage.getAdvisor(advisor.id);

      res.json({
        success: true,
        message: `Assessment PDF ready to send to ${client.email}`,
        clientEmail: client.email,
        advisorName: advisorData?.name,
        note: "Email delivery requires email integration to be enabled (SENDGRID_API_KEY or SMTP configuration)",
      });
    } catch (err: any) {
      logger.error({ err: err }, "[Assessment] Email error");
      res.status(500).json({ error: "Failed to prepare email" });
    }
  });
}
