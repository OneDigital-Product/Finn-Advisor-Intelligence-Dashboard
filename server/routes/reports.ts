import type { Express } from "express";
import { z } from "zod";
import { requireAuth } from "./middleware";
import { logger } from "../lib/logger";
import { validateBody } from "../lib/validation";
import { db } from "../db";
import { reportTemplates, reportArtifacts } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateReportArtifact, updateReportDraft, finalizeReport } from "../engines/report-service";
import { AuditLogger } from "../integrations/cassidy/audit-logger";

const createTemplateSchema = z.object({
  name: z.string().min(1, "name is required"),
  description: z.string().nullable().optional(),
  templateType: z.string().min(1, "templateType is required"),
  sections: z.array(z.any()).min(1, "At least one section is required"),
});

const updateTemplateSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  sections: z.array(z.any()).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

const createReportSchema = z.object({
  templateId: z.string().min(1, "templateId is required"),
  reportName: z.string().min(1, "reportName is required"),
  clientId: z.string().nullable().optional(),
  householdId: z.string().nullable().optional(),
  visibleSections: z.array(z.string()).optional(),
});

const updateReportSchema = z.object({
  content: z.any(),
});

export function registerReportRoutes(app: Express) {
  app.get("/api/report-templates", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const templateType = req.query.templateType as string;

      let conditions = [eq(reportTemplates.advisorId, advisorId), eq(reportTemplates.isActive, true)];
      if (templateType) {
        conditions.push(eq(reportTemplates.templateType, templateType as string));
      }

      const templates = await db
        .select()
        .from(reportTemplates)
        .where(and(...conditions))
        .orderBy(desc(reportTemplates.createdAt));

      res.json(templates);
    } catch (err) {
      logger.error({ err }, "GET /api/report-templates error");
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.post("/api/report-templates", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const body = validateBody(createTemplateSchema, req, res);
      if (!body) return;

      const [template] = await db
        .insert(reportTemplates)
        .values({
          name: body.name,
          description: body.description || null,
          templateType: body.templateType,
          sections: body.sections,
          advisorId,
        })
        .returning();

      res.status(201).json(template);
    } catch (err) {
      logger.error({ err }, "POST /api/report-templates error");
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  app.patch("/api/report-templates/:templateId", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const templateId = req.params.templateId as string;
      const body = validateBody(updateTemplateSchema, req, res);
      if (!body) return;

      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.sections !== undefined) updateData.sections = body.sections;
      if (body.isActive !== undefined) updateData.isActive = body.isActive;

      const [updated] = await db
        .update(reportTemplates)
        .set(updateData)
        .where(and(eq(reportTemplates.id, templateId), eq(reportTemplates.advisorId, advisorId)))
        .returning();

      if (!updated) return res.status(404).json({ error: "Template not found" });
      res.json(updated);
    } catch (err) {
      logger.error({ err }, "PATCH /api/report-templates/:templateId error");
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.delete("/api/report-templates/:templateId", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const templateId = req.params.templateId as string;

      await db
        .update(reportTemplates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(reportTemplates.id, templateId), eq(reportTemplates.advisorId, advisorId)));

      res.status(204).send();
    } catch (err) {
      logger.error({ err }, "DELETE /api/report-templates/:templateId error");
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  app.post("/api/reports", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const body = validateBody(createReportSchema, req, res);
      if (!body) return;

      const artifact = await generateReportArtifact(
        body.templateId,
        body.clientId || undefined,
        body.householdId || undefined,
        body.reportName,
        advisorId,
        body.visibleSections
      );

      await AuditLogger.logEvent(artifact.id, "report_created", {
        report_id: artifact.id,
        template_id: body.templateId,
        client_id: body.clientId || null,
        report_name: body.reportName,
        advisor_id: advisorId,
        timestamp: new Date().toISOString(),
      });

      res.status(201).json(artifact);
    } catch (err: any) {
      logger.error({ err }, "POST /api/reports error");
      res.status(400).json({ error: "Failed to generate report" });
    }
  });

  app.get("/api/reports", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const clientId = req.query.clientId as string;
      const templateId = req.query.templateId as string;
      const status = req.query.status as string;

      let conditions = [eq(reportArtifacts.advisorId, advisorId)];
      if (clientId) conditions.push(eq(reportArtifacts.clientId, clientId as string));
      if (templateId) conditions.push(eq(reportArtifacts.templateId, templateId as string));
      if (status) conditions.push(eq(reportArtifacts.status, status as string));

      const artifacts = await db
        .select()
        .from(reportArtifacts)
        .where(and(...conditions))
        .orderBy(desc(reportArtifacts.createdAt));

      res.json(artifacts);
    } catch (err) {
      logger.error({ err }, "GET /api/reports error");
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  app.get("/api/reports/:artifactId", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const artifactId = req.params.artifactId as string;

      const [artifact] = await db
        .select()
        .from(reportArtifacts)
        .where(and(eq(reportArtifacts.id, artifactId), eq(reportArtifacts.advisorId, advisorId)));

      if (!artifact) return res.status(404).json({ error: "Report not found" });
      res.json(artifact);
    } catch (err) {
      logger.error({ err }, "GET /api/reports/:artifactId error");
      res.status(500).json({ error: "Failed to fetch report" });
    }
  });

  app.patch("/api/reports/:artifactId", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const artifactId = req.params.artifactId as string;
      const body = validateBody(updateReportSchema, req, res);
      if (!body) return;

      const artifact = await updateReportDraft(artifactId, { content: body.content }, advisorId);
      res.json(artifact);
    } catch (err: any) {
      logger.error({ err }, "PATCH /api/reports/:artifactId error");
      res.status(400).json({ error: "Failed to update report" });
    }
  });

  app.patch("/api/reports/:artifactId/finalize", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const artifactId = req.params.artifactId as string;

      const artifact = await finalizeReport(artifactId, advisorId);

      await AuditLogger.logEvent(artifactId, "report_finalized", {
        report_id: artifactId,
        advisor_id: advisorId,
        timestamp: new Date().toISOString(),
      });

      res.json(artifact);
    } catch (err: any) {
      logger.error({ err }, "PATCH /api/reports/:artifactId/finalize error");
      res.status(400).json({ error: "Failed to finalize report" });
    }
  });

  app.patch("/api/reports/:artifactId/archive", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const artifactId = req.params.artifactId as string;

      const [updated] = await db
        .update(reportArtifacts)
        .set({ status: "archived", updatedAt: new Date() })
        .where(and(eq(reportArtifacts.id, artifactId), eq(reportArtifacts.advisorId, advisorId)))
        .returning();

      if (!updated) return res.status(404).json({ error: "Report not found" });

      await AuditLogger.logEvent(artifactId, "report_archived", {
        report_id: artifactId,
        advisor_id: advisorId,
        timestamp: new Date().toISOString(),
      });

      res.json(updated);
    } catch (err) {
      logger.error({ err }, "PATCH /api/reports/:artifactId/archive error");
      res.status(500).json({ error: "Failed to archive report" });
    }
  });

  app.get("/api/reports/:artifactId/pdf", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const artifactId = req.params.artifactId as string;

      const [artifact] = await db
        .select()
        .from(reportArtifacts)
        .where(and(eq(reportArtifacts.id, artifactId), eq(reportArtifacts.advisorId, advisorId)));

      if (!artifact) return res.status(404).json({ error: "Report not found" });

      if (!artifact.renderedHtml) {
        return res.status(404).json({ error: "No rendered content available" });
      }

      res.setHeader("Content-Type", "text/html");
      res.send(artifact.renderedHtml);
    } catch (err) {
      logger.error({ err }, "GET /api/reports/:artifactId/pdf error");
      res.status(500).json({ error: "Failed to get report PDF" });
    }
  });
}
