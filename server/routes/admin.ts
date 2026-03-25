import type { Express } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";
import { validateBody } from "../lib/validation";
import { requireAuth, requireAdvisor, getSessionAdvisor } from "./middleware";
import { storage } from "../storage";
import { hashPassword } from "../auth";
import { db } from "../db";
import { approvalRules, calculateFeeRate, type FeeScheduleTier, type InsertApiKeyMetadata } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

const createAdvisorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required"),
  title: z.string().min(1, "Title is required"),
  phone: z.string().nullable().optional(),
});

const feeScheduleTierSchema = z.object({
  minAum: z.number().min(0),
  maxAum: z.number().nullable(),
  rate: z.number().min(0).max(1),
});

const updateAdvisorSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  title: z.string().optional(),
  phone: z.string().nullable().optional(),
  maxCapacity: z.number().int().min(1).optional(),
  feeSchedule: z.array(feeScheduleTierSchema).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

const createDiagnosticConfigSchema = z.object({
  name: z.string().min(1, "Name is required"),
  analysisPrompt: z.string().min(1, "Analysis prompt is required"),
  htmlTemplate: z.string().min(1, "HTML template is required"),
  isActive: z.boolean().optional().default(true),
});

const updateDiagnosticConfigSchema = z.object({
  name: z.string().optional(),
  analysisPrompt: z.string().optional(),
  htmlTemplate: z.string().optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

const createTranscriptConfigSchema = z.object({
  name: z.string().min(1, "Name is required"),
  analysisPrompt: z.string().min(1, "Analysis prompt is required"),
  isActive: z.boolean().optional().default(true),
});

const updateTranscriptConfigSchema = z.object({
  name: z.string().optional(),
  analysisPrompt: z.string().optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

const createPromptConfigSchema = z.object({
  name: z.string().min(1, "Name is required"),
  systemPrompt: z.string().min(1, "System prompt is required"),
  userPromptTemplate: z.string().min(1, "User prompt template is required"),
  isActive: z.boolean().optional().default(true),
});

const updatePromptConfigSchema = z.object({
  name: z.string().optional(),
  systemPrompt: z.string().optional(),
  userPromptTemplate: z.string().optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

const createDocClassificationConfigSchema = z.object({
  name: z.string().min(1, "Name is required"),
  systemPrompt: z.string().min(1, "System prompt is required"),
  userPromptTemplate: z.string().min(1, "User prompt template is required"),
  isActive: z.boolean().optional(),
});

const updateDocClassificationConfigSchema = z.object({
  name: z.string().optional(),
  systemPrompt: z.string().optional(),
  userPromptTemplate: z.string().optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

const createApprovalRuleSchema = z.object({
  itemType: z.string().min(1, "itemType is required"),
  requiredReviewerRole: z.string().min(1, "requiredReviewerRole is required"),
  slaHours: z.number().optional(),
  autoApproveConditions: z.record(z.any()).optional(),
  escalationRole: z.string().nullable().optional(),
});

const updateApprovalRuleSchema = z.object({
  itemType: z.string().optional(),
  requiredReviewerRole: z.string().optional(),
  slaHours: z.number().optional(),
  autoApproveConditions: z.record(z.any()).optional(),
  escalationRole: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

const reminderSettingsSchema = z.object({
  profileExpiration: z.object({ enabled: z.boolean(), days: z.number() }).optional(),
  documentDeadline: z.object({ enabled: z.boolean(), days: z.number() }).optional(),
  complianceReview: z.object({ enabled: z.boolean(), days: z.number() }).optional(),
  clientReview: z.object({ enabled: z.boolean(), days: z.number() }).optional(),
});

export function registerAdminRoutes(app: Express) {
  app.get("/api/admin/login-analytics", requireAdvisor, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 90;
      const events = await storage.getLoginEvents(days);
      res.json(events);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/admin/advisors", requireAdvisor, async (_req, res) => {
    try {
      const allAdvisors = await storage.getAllAdvisors();
      const advisorData = await Promise.all(
        allAdvisors.map(async (adv) => {
          const advClients = await storage.getClients(adv.id);
          let totalAum = 0;
          for (const c of advClients) {
            const accts = await storage.getAccountsByClient(c.id);
            totalAum += accts.reduce((sum, a) => sum + parseFloat(a.balance as string), 0);
          }
          return { ...adv, clientCount: advClients.length, totalAum };
        })
      );
      res.json(advisorData);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/admin/advisors", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(createAdvisorSchema, req, res);
      if (!body) return;
      const advisor = await storage.createAdvisor({ name: body.name, email: body.email, title: body.title, phone: body.phone || null });
      res.json(advisor);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/admin/advisors/:id", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(updateAdvisorSchema, req, res);
      if (!body) return;
      const updated = await storage.updateAdvisor(req.params.id as string, body);
      if (!updated) return res.status(404).json({ message: "Advisor not found" });
      res.json(updated);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/admin/reports/aum-summary", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const allClients = await storage.getClients(advisor.id);

      const rows = await Promise.all(
        allClients.map(async (c) => {
          const accts = await storage.getAccountsByClient(c.id);
          const totalAum = accts.reduce((sum, a) => sum + parseFloat(a.balance as string), 0);
          return {
            clientId: c.id,
            clientName: `${c.firstName} ${c.lastName}`,
            segment: c.segment,
            accountCount: accts.length,
            totalAum,
            estimatedRevenue: totalAum * calculateFeeRate(totalAum, advisor.feeSchedule as FeeScheduleTier[] | null, c.feeRateOverride),
            accounts: accts.map(a => ({
              accountNumber: a.accountNumber,
              type: a.accountType,
              custodian: a.custodian,
              balance: parseFloat(a.balance as string),
              status: a.status,
            })),
          };
        })
      );

      rows.sort((a, b) => b.totalAum - a.totalAum);

      const segmentTotals: Record<string, { count: number; aum: number; revenue: number }> = {};
      rows.forEach(r => {
        if (!segmentTotals[r.segment]) segmentTotals[r.segment] = { count: 0, aum: 0, revenue: 0 };
        segmentTotals[r.segment].count++;
        segmentTotals[r.segment].aum += r.totalAum;
        segmentTotals[r.segment].revenue += r.estimatedRevenue;
      });

      res.json({
        generatedAt: new Date().toISOString(),
        totalAum: rows.reduce((s, r) => s + r.totalAum, 0),
        totalRevenue: rows.reduce((s, r) => s + r.estimatedRevenue, 0),
        clientCount: rows.length,
        segmentTotals,
        clients: rows,
      });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/admin/reports/activity", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const [allClients, allActivities, allMeetings, allTasks] = await Promise.all([
        storage.getClients(advisor.id),
        storage.getActivities(advisor.id),
        storage.getMeetings(advisor.id),
        storage.getTasks(advisor.id),
      ]);

      const rows = allClients.map(c => {
        const clientActivities = allActivities.filter(a => a.clientId === c.id);
        const clientMeetings = allMeetings.filter(m => m.clientId === c.id);
        const clientTasks = allTasks.filter(t => t.clientId === c.id);
        const daysSinceContact = c.lastContactDate
          ? Math.floor((Date.now() - new Date(c.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          clientId: c.id,
          clientName: `${c.firstName} ${c.lastName}`,
          segment: c.segment,
          lastContact: c.lastContactDate,
          nextReview: c.nextReviewDate,
          daysSinceContact,
          activityCount: clientActivities.length,
          meetingCount: clientMeetings.length,
          openTasks: clientTasks.filter(t => t.status === "pending" || t.status === "in-progress").length,
          completedTasks: clientTasks.filter(t => t.status === "completed").length,
          engagementStatus: daysSinceContact === null ? "no_contact" :
            daysSinceContact <= 30 ? "active" :
            daysSinceContact <= 60 ? "recent" :
            daysSinceContact <= 90 ? "aging" : "at_risk",
        };
      });

      rows.sort((a, b) => (b.daysSinceContact ?? 999) - (a.daysSinceContact ?? 999));

      res.json({
        generatedAt: new Date().toISOString(),
        totalClients: rows.length,
        engagementBreakdown: {
          active: rows.filter(r => r.engagementStatus === "active").length,
          recent: rows.filter(r => r.engagementStatus === "recent").length,
          aging: rows.filter(r => r.engagementStatus === "aging").length,
          atRisk: rows.filter(r => r.engagementStatus === "at_risk").length,
        },
        clients: rows,
      });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/admin/reports/compliance", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const [allClients, allCompliance] = await Promise.all([
        storage.getClients(advisor.id),
        storage.getComplianceItems(advisor.id),
      ]);

      const rows = allClients.map(c => {
        const items = allCompliance.filter(ci => ci.clientId === c.id);
        return {
          clientId: c.id,
          clientName: `${c.firstName} ${c.lastName}`,
          segment: c.segment,
          totalItems: items.length,
          current: items.filter(i => i.status === "current").length,
          expiringSoon: items.filter(i => i.status === "expiring_soon").length,
          overdue: items.filter(i => i.status === "overdue").length,
          pending: items.filter(i => i.status === "pending").length,
          items: items.map(i => ({
            type: i.type,
            status: i.status,
            dueDate: i.dueDate,
            description: i.description,
          })),
        };
      });

      res.json({
        generatedAt: new Date().toISOString(),
        summary: {
          totalItems: allCompliance.length,
          current: allCompliance.filter(c => c.status === "current").length,
          expiringSoon: allCompliance.filter(c => c.status === "expiring_soon").length,
          overdue: allCompliance.filter(c => c.status === "overdue").length,
          pending: allCompliance.filter(c => c.status === "pending").length,
        },
        clients: rows,
      });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/admin/reports/document-checklist", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const allClients = await storage.getClients(advisor.id);

      const rows = await Promise.all(
        allClients.map(async (c) => {
          const checklist = await storage.getDocumentChecklist(c.id);
          const totalItems = checklist.length;
          const receivedCount = checklist.filter(ci => ci.received).length;
          const requiredItems = checklist.filter(ci => ci.required);
          const requiredReceived = requiredItems.filter(ci => ci.received).length;

          return {
            clientId: c.id,
            clientName: `${c.firstName} ${c.lastName}`,
            segment: c.segment,
            totalItems,
            receivedCount,
            completionPct: totalItems > 0 ? Math.round((receivedCount / totalItems) * 100) : 0,
            requiredTotal: requiredItems.length,
            requiredReceived,
            requiredCompletionPct: requiredItems.length > 0 ? Math.round((requiredReceived / requiredItems.length) * 100) : 0,
            hasChecklist: totalItems > 0,
          };
        })
      );

      res.json({
        generatedAt: new Date().toISOString(),
        totalClients: rows.length,
        clientsWithChecklist: rows.filter(r => r.hasChecklist).length,
        avgCompletion: rows.filter(r => r.hasChecklist).reduce((s, r) => s + r.completionPct, 0) / (rows.filter(r => r.hasChecklist).length || 1),
        clients: rows,
      });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/admin/diagnostic-configs", requireAdvisor, async (_req, res) => {
    try {
      const configs = await storage.getDiagnosticConfigs();
      res.json(configs);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/admin/diagnostic-configs/:id", requireAdvisor, async (req, res) => {
    try {
      const config = await storage.getDiagnosticConfig(req.params.id as string);
      if (!config) return res.status(404).json({ message: "Config not found" });
      res.json(config);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/admin/diagnostic-configs", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(createDiagnosticConfigSchema, req, res);
      if (!body) return;
      const config = await storage.createDiagnosticConfig({ name: body.name, analysisPrompt: body.analysisPrompt, htmlTemplate: body.htmlTemplate, isActive: body.isActive });
      res.json(config);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/admin/diagnostic-configs/:id", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(updateDiagnosticConfigSchema, req, res);
      if (!body) return;
      const config = await storage.updateDiagnosticConfig(req.params.id as string, body);
      if (!config) return res.status(404).json({ message: "Config not found" });
      res.json(config);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/admin/diagnostic-configs/:id", requireAdvisor, async (req, res) => {
    try {
      await storage.deleteDiagnosticConfig(req.params.id as string);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/admin/transcript-configs", requireAuth, async (_req, res) => {
    try {
      const configs = await storage.getTranscriptConfigs();
      res.json(configs);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/admin/transcript-configs", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(createTranscriptConfigSchema, req, res);
      if (!body) return;
      const config = await storage.createTranscriptConfig({ name: body.name, analysisPrompt: body.analysisPrompt, isActive: body.isActive });
      res.json(config);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/admin/transcript-configs/:id", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(updateTranscriptConfigSchema, req, res);
      if (!body) return;
      const config = await storage.updateTranscriptConfig((req.params.id as string), body);
      if (!config) return res.status(404).json({ message: "Config not found" });
      res.json(config);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/admin/transcript-configs/:id", requireAdvisor, async (req, res) => {
    try {
      await storage.deleteTranscriptConfig((req.params.id as string));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/admin/meeting-prep-configs", requireAdvisor, async (_req, res) => {
    try {
      const configs = await storage.getMeetingPrepConfigs();
      res.json(configs);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/admin/meeting-prep-configs", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(createPromptConfigSchema, req, res);
      if (!body) return;
      const config = await storage.createMeetingPrepConfig({ name: body.name, systemPrompt: body.systemPrompt, userPromptTemplate: body.userPromptTemplate, isActive: body.isActive });
      res.json(config);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/admin/meeting-prep-configs/:id", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(updatePromptConfigSchema, req, res);
      if (!body) return;
      const config = await storage.updateMeetingPrepConfig((req.params.id as string), body);
      if (!config) return res.status(404).json({ message: "Config not found" });
      res.json(config);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/admin/meeting-prep-configs/:id", requireAdvisor, async (req, res) => {
    try {
      await storage.deleteMeetingPrepConfig((req.params.id as string));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/admin/meeting-summary-configs", requireAdvisor, async (_req, res) => {
    try {
      const configs = await storage.getMeetingSummaryConfigs();
      res.json(configs);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/admin/meeting-summary-configs", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(createPromptConfigSchema, req, res);
      if (!body) return;
      const config = await storage.createMeetingSummaryConfig({ name: body.name, systemPrompt: body.systemPrompt, userPromptTemplate: body.userPromptTemplate, isActive: body.isActive });
      res.json(config);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/admin/meeting-summary-configs/:id", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(updatePromptConfigSchema, req, res);
      if (!body) return;
      const config = await storage.updateMeetingSummaryConfig((req.params.id as string), body);
      if (!config) return res.status(404).json({ message: "Config not found" });
      res.json(config);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/admin/meeting-summary-configs/:id", requireAdvisor, async (req, res) => {
    try {
      await storage.deleteMeetingSummaryConfig((req.params.id as string));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/admin/doc-classification-configs", requireAdvisor, async (_req, res) => {
    try {
      const configs = await storage.getDocumentClassificationConfigs();
      res.json(configs);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/admin/doc-classification-configs", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(createDocClassificationConfigSchema, req, res);
      if (!body) return;
      const config = await storage.createDocumentClassificationConfig(body);
      res.json(config);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/admin/doc-classification-configs/:id", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(updateDocClassificationConfigSchema, req, res);
      if (!body) return;
      const updated = await storage.updateDocumentClassificationConfig((req.params.id as string), body);
      if (!updated) return res.status(404).json({ message: "Config not found" });
      res.json(updated);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/admin/doc-classification-configs/:id", requireAdvisor, async (req, res) => {
    try {
      await storage.deleteDocumentClassificationConfig((req.params.id as string));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/admin/approval-rules", requireAdvisor, async (_req, res) => {
    try {
      const rules = await db.select().from(approvalRules).orderBy(approvalRules.itemType);
      res.json(rules);
    } catch (err) {
      logger.error({ err }, "GET /api/admin/approval-rules error");
      res.status(500).json({ message: "Failed to fetch approval rules" });
    }
  });

  app.post("/api/admin/approval-rules", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(createApprovalRuleSchema, req, res);
      if (!body) return;
      const [rule] = await db.insert(approvalRules).values({
        itemType: body.itemType,
        requiredReviewerRole: body.requiredReviewerRole,
        slaHours: body.slaHours || 24,
        autoApproveConditions: body.autoApproveConditions || {},
        escalationRole: body.escalationRole || null,
        isActive: true,
      }).returning();
      res.status(201).json(rule);
    } catch (err) {
      logger.error({ err }, "POST /api/admin/approval-rules error");
      res.status(500).json({ message: "Failed to create approval rule" });
    }
  });

  app.patch("/api/admin/approval-rules/:id", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(updateApprovalRuleSchema, req, res);
      if (!body) return;
      const id = req.params.id as string;
      const updates: any = { updatedAt: new Date() };
      if (body.itemType !== undefined) updates.itemType = body.itemType;
      if (body.requiredReviewerRole !== undefined) updates.requiredReviewerRole = body.requiredReviewerRole;
      if (body.slaHours !== undefined) updates.slaHours = body.slaHours;
      if (body.autoApproveConditions !== undefined) updates.autoApproveConditions = body.autoApproveConditions;
      if (body.escalationRole !== undefined) updates.escalationRole = body.escalationRole;
      if (body.isActive !== undefined) updates.isActive = body.isActive;

      const [rule] = await db.update(approvalRules).set(updates).where(eq(approvalRules.id, id)).returning();
      if (!rule) return res.status(404).json({ message: "Rule not found" });
      res.json(rule);
    } catch (err) {
      logger.error({ err }, "PATCH /api/admin/approval-rules/:id error");
      res.status(500).json({ message: "Failed to update approval rule" });
    }
  });

  app.delete("/api/admin/approval-rules/:id", requireAdvisor, async (req, res) => {
    try {
      const id = req.params.id as string;
      await db.delete(approvalRules).where(eq(approvalRules.id, id));
      res.json({ deleted: true });
    } catch (err) {
      logger.error({ err }, "DELETE /api/admin/approval-rules/:id error");
      res.status(500).json({ message: "Failed to delete approval rule" });
    }
  });

  app.get("/api/admin/integrations", requireAdvisor, async (_req, res) => {
    try {
      const integrations = [
        {
          source: "salesforce",
          label: "Salesforce CRM",
          status: process.env.SALESFORCE_ENABLED === "true" ? "connected" : "not_configured",
          lastSyncAt: new Date(Date.now() - 3600000).toISOString(),
          errorCount: 0,
        },
        {
          source: "outlook",
          label: "Microsoft 365",
          status: process.env.MICROSOFT_ENABLED === "true" ? "connected" : "not_configured",
          lastSyncAt: new Date(Date.now() - 1800000).toISOString(),
          errorCount: 0,
        },
        {
          source: "zoom",
          label: "Zoom",
          status: process.env.ZOOM_ENABLED === "true" ? "connected" : "not_configured",
          lastSyncAt: new Date(Date.now() - 86400000).toISOString(),
          errorCount: 0,
        },
        {
          source: "custodial",
          label: "Custodial Webhooks",
          status: "active",
          lastSyncAt: new Date().toISOString(),
          errorCount: 0,
        },
      ];
      res.json(integrations);
    } catch (err) {
      logger.error({ err }, "GET /api/admin/integrations error");
      res.status(500).json({ message: "Failed to fetch integrations" });
    }
  });

  app.get("/api/admin/api-key-metadata", requireAdvisor, async (_req, res) => {
    try {
      const keys = await storage.getAllApiKeyMetadata();
      res.json(keys);
    } catch (err) {
      logger.error({ err }, "GET /api/admin/api-key-metadata error");
      res.status(500).json({ message: "Failed to fetch API key metadata" });
    }
  });

  app.post("/api/admin/api-key-metadata", requireAdvisor, async (req, res) => {
    try {
      const schema = z.object({
        keyName: z.string().min(1),
        integration: z.string().min(1),
        lastRotatedAt: z.string().optional(),
        expiresAt: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      });
      const body = validateBody(schema, req, res);
      if (!body) return;
      const upsertData: Partial<InsertApiKeyMetadata> = {
        integration: body.integration,
      };
      if (body.lastRotatedAt) {
        upsertData.lastRotatedAt = new Date(body.lastRotatedAt);
      }
      if (body.expiresAt !== undefined) {
        upsertData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
      }
      if (body.notes !== undefined) {
        upsertData.notes = body.notes;
      }
      const result = await storage.upsertApiKeyMetadata(body.keyName, upsertData);
      res.json(result);
    } catch (err) {
      logger.error({ err }, "POST /api/admin/api-key-metadata error");
      res.status(500).json({ message: "Failed to save API key metadata" });
    }
  });

  app.post("/api/admin/api-key-metadata/:keyName/rotate", requireAdvisor, async (req, res) => {
    try {
      const keyName = req.params.keyName as string;
      const advisor = await getSessionAdvisor(req);
      const result = await storage.markApiKeyRotated(keyName, advisor?.name || "unknown");
      if (!result) {
        res.status(404).json({ message: "Key metadata not found" });
        return;
      }
      res.json(result);
    } catch (err) {
      logger.error({ err }, "POST /api/admin/api-key-metadata/:keyName/rotate error");
      res.status(500).json({ message: "Failed to mark key as rotated" });
    }
  });

  app.get("/api/admin/settings/reminders", requireAdvisor, async (_req, res) => {
    try {
      const result = await db.execute(
        sql`SELECT value FROM system_config WHERE key = 'reminder_settings'`
      );
      const row = (result as any).rows?.[0];
      if (row?.value) {
        res.json(row.value);
      } else {
        res.json({
          profileExpiration: { enabled: true, days: 30 },
          documentDeadline: { enabled: true, days: 14 },
          complianceReview: { enabled: true, days: 60 },
          clientReview: { enabled: true, days: 90 },
        });
      }
    } catch (err) {
      logger.error({ err }, "GET /api/admin/settings/reminders error");
      res.status(500).json({ message: "Failed to fetch reminder settings" });
    }
  });

  app.patch("/api/admin/settings/reminders", requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(reminderSettingsSchema, req, res);
      if (!body) return;
      await db.execute(
        sql`INSERT INTO system_config (key, value, updated_at) VALUES ('reminder_settings', ${JSON.stringify(body)}::jsonb, NOW())
            ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(body)}::jsonb, updated_at = NOW()`
      );
      res.json(body);
    } catch (err) {
      logger.error({ err }, "PATCH /api/admin/settings/reminders error");
      res.status(500).json({ message: "Failed to save reminder settings" });
    }
  });
}
