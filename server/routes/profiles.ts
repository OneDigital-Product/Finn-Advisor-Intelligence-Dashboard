import type { Express, Request, Response } from "express";
import { z } from "zod";
import { requireAuth, requireAdvisor } from "./middleware";
import { validateBody, validateParams } from "../lib/validation";
import { storage } from "../storage";
import { logger } from "../lib/logger";
import { AuditLogger } from "../integrations/cassidy/audit-logger";
import type { InvestorProfileQuestionSchema } from "@shared/schema";

const profileIdParamsSchema = z.object({
  profileId: z.string().min(1, "profileId is required"),
});

const profileIdVersionIdParamsSchema = z.object({
  profileId: z.string().min(1, "profileId is required"),
  versionId: z.string().min(1, "versionId is required"),
});

const schemaIdParamsSchema = z.object({
  schemaId: z.string().min(1, "schemaId is required"),
});

const createProfileBodySchema = z.object({
  clientId: z.string().min(1, "clientId is required"),
  profileType: z.enum(["individual", "legal_entity"], {
    errorMap: () => ({ message: "profileType must be 'individual' or 'legal_entity'" }),
  }),
  entityType: z.enum(["trust", "corporation", "llc", "partnership", "foundation"]).optional(),
}).refine(
  (data) => data.profileType !== "legal_entity" || !!data.entityType,
  { message: "entityType required for legal_entity profiles", path: ["entityType"] }
);

const updateProfileBodySchema = z.object({
  status: z.enum(["draft", "in_progress", "submitted", "finalized", "expired"]).optional(),
  expirationDate: z.string().optional(),
});

const draftAnswersBodySchema = z.object({
  answers: z.record(z.string(), z.unknown()).refine((val) => Object.keys(val).length >= 0, {
    message: "answers must be an object",
  }),
});

const finalizeAnswersBodySchema = z.object({
  answers: z.record(z.string(), z.unknown()).refine((val) => val !== undefined && val !== null, {
    message: "answers is required",
  }),
});

const createSchemaBodySchema = z.object({
  name: z.string().min(1, "name is required"),
  profileType: z.string().min(1, "profileType is required"),
  questions: z.array(z.unknown()).min(1, "questions must be a non-empty array"),
});

const updateSchemaBodySchema = z.object({
  name: z.string().optional(),
  questions: z.array(z.unknown()).optional(),
});

function validateAnswers(answers: Record<string, any>, schema: InvestorProfileQuestionSchema, entityType?: string | null): string | null {
  const allQuestions = Array.isArray(schema.questions) ? schema.questions : [];

  const questions = allQuestions.filter((question: any) => {
    if (!question.entityTypes) return true;
    return entityType && question.entityTypes.includes(entityType);
  });

  for (const question of questions) {
    const q = question as any;
    const value = answers[q.id];

    if (q.required && (value === undefined || value === null || value === "")) {
      return `Question "${q.label}" is required`;
    }

    if (value !== undefined && value !== null && q.validationRules) {
      const rules = q.validationRules as any;
      if (rules.minLength && typeof value === "string" && value.length < rules.minLength) {
        return `"${q.label}" must be at least ${rules.minLength} characters`;
      }
      if (rules.min !== undefined && typeof value === "number" && value < rules.min) {
        return `"${q.label}" must be at least ${rules.min}`;
      }
      if (rules.max !== undefined && typeof value === "number" && value > rules.max) {
        return `"${q.label}" must be at most ${rules.max}`;
      }
    }
  }

  return null;
}

async function verifyClientAccess(req: Request, clientId: string): Promise<boolean> {
  if (req.session.userType! === "associate") {
    const assignedClients = await storage.getClientsByAssociate(req.session.userId!);
    return assignedClients.some(c => c.id === clientId);
  }
  const client = await storage.getClient(clientId);
  return !!client && client.advisorId === req.session.userId!;
}

export function registerProfileRoutes(app: Express) {
  app.post("/api/profiles", requireAuth, async (req, res) => {
    try {
      const data = validateBody(createProfileBodySchema, req, res);
      if (!data) return;

      if (!(await verifyClientAccess(req, data.clientId))) {
        return res.status(403).json({ error: "Access denied" });
      }

      const profile = await storage.createInvestorProfile({
        clientId: data.clientId,
        profileType: data.profileType,
        entityType: data.profileType === "legal_entity" ? data.entityType! : null,
        status: "draft",
        createdBy: req.session.userEmail || "unknown",
      });

      await AuditLogger.logEvent(profile.id, "profile_created", {
        profile_id: profile.id,
        client_id: data.clientId,
        profile_type: data.profileType,
        created_by: req.session.userEmail || "unknown",
        timestamp: new Date().toISOString(),
      });

      res.status(201).json(profile);
    } catch (err) {
      logger.error({ err }, "POST /api/profiles error");
      res.status(500).json({ error: "Failed to create profile" });
    }
  });

  app.get("/api/profiles", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.query;
      if (!clientId) {
        return res.status(400).json({ error: "clientId required" });
      }

      if (!(await verifyClientAccess(req, String(clientId)))) {
        return res.status(403).json({ error: "Access denied" });
      }

      const profiles = await storage.getInvestorProfilesByClient(String(clientId));
      res.json(profiles);
    } catch (err) {
      logger.error({ err }, "GET /api/profiles error");
      res.status(500).json({ error: "Failed to fetch profiles" });
    }
  });

  app.get("/api/profiles/:profileId", requireAuth, validateParams(profileIdParamsSchema), async (req, res) => {
    try {
      const profileId = req.params.profileId as string;
      const profile = await storage.getInvestorProfile(profileId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      if (!(await verifyClientAccess(req, profile.clientId))) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(profile);
    } catch (err) {
      logger.error({ err }, "GET /api/profiles/:profileId error");
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.put("/api/profiles/:profileId", requireAuth, validateParams(profileIdParamsSchema), async (req, res) => {
    try {
      const profileId = req.params.profileId as string;

      const existing = await storage.getInvestorProfile(profileId);
      if (!existing) {
        return res.status(404).json({ error: "Profile not found" });
      }

      if (!(await verifyClientAccess(req, existing.clientId))) {
        return res.status(403).json({ error: "Access denied" });
      }

      const data = validateBody(updateProfileBodySchema, req, res);
      if (!data) return;

      const updateData: Record<string, any> = {};
      if (data.status) updateData.status = data.status;
      if (data.expirationDate) updateData.expirationDate = new Date(data.expirationDate);

      const profile = await storage.updateInvestorProfile(profileId, updateData);

      await AuditLogger.logEvent(profileId, "profile_updated", {
        profile_id: profileId,
        client_id: existing.clientId,
        updated_fields: Object.keys(updateData),
        updated_by: req.session.userEmail || "unknown",
        timestamp: new Date().toISOString(),
      });

      res.json(profile);
    } catch (err) {
      logger.error({ err }, "PUT /api/profiles/:profileId error");
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.delete("/api/profiles/:profileId", requireAuth, validateParams(profileIdParamsSchema), async (req, res) => {
    try {
      const profileId = req.params.profileId as string;

      const existing = await storage.getInvestorProfile(profileId);
      if (!existing) {
        return res.status(404).json({ error: "Profile not found" });
      }

      if (!(await verifyClientAccess(req, existing.clientId))) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.deleteInvestorProfile(profileId);

      await AuditLogger.logEvent(profileId, "profile_deleted", {
        profile_id: profileId,
        client_id: existing.clientId,
        deleted_by: req.session.userEmail || "unknown",
        timestamp: new Date().toISOString(),
      });

      res.status(204).send();
    } catch (err) {
      logger.error({ err }, "DELETE /api/profiles/:profileId error");
      res.status(500).json({ error: "Failed to delete profile" });
    }
  });

  app.post("/api/profiles/:profileId/draft", requireAuth, validateParams(profileIdParamsSchema), async (req, res) => {
    try {
      const profileId = req.params.profileId as string;
      const data = validateBody(draftAnswersBodySchema, req, res);
      if (!data) return;

      const profile = await storage.getInvestorProfile(profileId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      if (!(await verifyClientAccess(req, profile.clientId))) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.saveDraft(profileId, data.answers);

      res.json({
        id: profileId,
        status: "in_progress",
        draftAnswers: data.answers,
        lastSavedAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.error({ err }, "POST /api/profiles/:profileId/draft error");
      res.status(500).json({ error: "Failed to save draft" });
    }
  });

  app.get("/api/profiles/:profileId/draft", requireAuth, validateParams(profileIdParamsSchema), async (req, res) => {
    try {
      const profileId = req.params.profileId as string;
      const profile = await storage.getInvestorProfile(profileId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      if (!(await verifyClientAccess(req, profile.clientId))) {
        return res.status(403).json({ error: "Access denied" });
      }

      const answers = profile.draftAnswers as Record<string, any> | undefined;
      res.json({
        answers: answers || {},
        lastSavedAt: profile.updatedAt?.toISOString() || new Date().toISOString(),
      });
    } catch (err) {
      logger.error({ err }, "GET /api/profiles/:profileId/draft error");
      res.status(500).json({ error: "Failed to fetch draft" });
    }
  });

  app.post("/api/profiles/:profileId/finalize", requireAuth, validateParams(profileIdParamsSchema), async (req, res) => {
    try {
      const profileId = req.params.profileId as string;
      const data = validateBody(finalizeAnswersBodySchema, req, res);
      if (!data) return;

      const profile = await storage.getInvestorProfile(profileId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      if (!(await verifyClientAccess(req, profile.clientId))) {
        return res.status(403).json({ error: "Access denied" });
      }

      const schemas = await storage.getActiveQuestionSchemas(profile.profileType);
      if (schemas.length === 0) {
        return res.status(400).json({ error: "No active schema for profile type" });
      }

      const latestSchema = schemas[0];

      const validationError = validateAnswers(data.answers as Record<string, any>, latestSchema, profile.entityType);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const existingVersions = await storage.getProfileVersions(profileId as string);
      const versionNumber = existingVersions.length + 1;

      const version = await storage.createProfileVersion({
        profileId: profileId as string,
        versionNumber,
        questionSchemaId: latestSchema.id,
        answers: data.answers,
        submittedBy: req.session.userEmail || "unknown",
        submittedAt: new Date(),
      });

      await storage.updateInvestorProfile(profileId as string, {
        status: "finalized",
        currentVersionId: version.id,
        draftAnswers: {},
      });

      await AuditLogger.logEvent(profileId, "profile_finalized", {
        profile_id: profileId,
        client_id: profile.clientId,
        version_id: version.id,
        version_number: versionNumber,
        schema_id: latestSchema.id,
        finalized_by: req.session.userEmail || "unknown",
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({
        profileId,
        versionId: version.id,
        versionNumber,
        status: "finalized",
        submittedAt: version.submittedAt,
        submittedBy: version.submittedBy,
      });
    } catch (err) {
      logger.error({ err }, "POST /api/profiles/:profileId/finalize error");
      res.status(500).json({ error: "Failed to finalize profile" });
    }
  });

  app.get("/api/profiles/:profileId/versions", requireAuth, validateParams(profileIdParamsSchema), async (req, res) => {
    try {
      const profileId = req.params.profileId as string;
      const profile = await storage.getInvestorProfile(profileId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      if (!(await verifyClientAccess(req, profile.clientId))) {
        return res.status(403).json({ error: "Access denied" });
      }

      const versions = await storage.getProfileVersions(profileId);
      res.json(
        versions.map((v) => ({
          versionNumber: v.versionNumber,
          versionId: v.id,
          submittedAt: v.submittedAt,
          submittedBy: v.submittedBy,
        }))
      );
    } catch (err) {
      logger.error({ err }, "GET /api/profiles/:profileId/versions error");
      res.status(500).json({ error: "Failed to fetch versions" });
    }
  });

  app.get("/api/profiles/:profileId/versions/:versionId", requireAuth, validateParams(profileIdVersionIdParamsSchema), async (req, res) => {
    try {
      const profileId = req.params.profileId as string;
      const versionId = req.params.versionId as string;
      const profile = await storage.getInvestorProfile(profileId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      if (!(await verifyClientAccess(req, profile.clientId))) {
        return res.status(403).json({ error: "Access denied" });
      }

      const version = await storage.getProfileVersion(versionId);
      if (!version || version.profileId !== profileId) {
        return res.status(404).json({ error: "Version not found" });
      }

      res.json({
        versionNumber: version.versionNumber,
        answers: version.answers,
        questionSchemaId: version.questionSchemaId,
        submittedAt: version.submittedAt,
        submittedBy: version.submittedBy,
      });
    } catch (err) {
      logger.error({ err }, "GET /api/profiles/:profileId/versions/:versionId error");
      res.status(500).json({ error: "Failed to fetch version" });
    }
  });

  app.get("/api/schemas", requireAuth, async (req, res) => {
    try {
      const { profileType, active } = req.query;

      let schemas: InvestorProfileQuestionSchema[] = [];
      if (profileType) {
        schemas = active === "true"
          ? await storage.getActiveQuestionSchemas(String(profileType))
          : await storage.getAllQuestionSchemas(String(profileType));
      } else {
        schemas = await storage.getAllQuestionSchemas();
      }

      res.json(
        schemas.map((s) => ({
          id: s.id,
          name: s.name,
          profileType: s.profileType,
          isActive: s.isActive,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          questionCount: Array.isArray(s.questions) ? (s.questions as any[]).length : 0,
        }))
      );
    } catch (err) {
      logger.error({ err }, "GET /api/schemas error");
      res.status(500).json({ error: "Failed to fetch schemas" });
    }
  });

  app.get("/api/schemas/:schemaId", requireAuth, validateParams(schemaIdParamsSchema), async (req, res) => {
    try {
      const schemaId = req.params.schemaId as string;
      const schema = await storage.getQuestionSchema(schemaId);

      if (!schema) {
        return res.status(404).json({ error: "Schema not found" });
      }

      res.json(schema);
    } catch (err) {
      logger.error({ err }, "GET /api/schemas/:schemaId error");
      res.status(500).json({ error: "Failed to fetch schema" });
    }
  });

  app.post("/api/schemas", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const data = validateBody(createSchemaBodySchema, req, res);
      if (!data) return;

      const schema = await storage.createQuestionSchema({
        name: data.name,
        profileType: data.profileType,
        questions: data.questions,
        isActive: true,
      });

      res.status(201).json(schema);
    } catch (err) {
      logger.error({ err }, "POST /api/schemas error");
      res.status(500).json({ error: "Failed to create schema" });
    }
  });

  app.put("/api/schemas/:schemaId", requireAuth, requireAdvisor, validateParams(schemaIdParamsSchema), async (req, res) => {
    try {
      const schemaId = req.params.schemaId as string;
      const data = validateBody(updateSchemaBodySchema, req, res);
      if (!data) return;

      const schema = await storage.updateQuestionSchema(schemaId, {
        name: data.name,
        questions: data.questions,
      });

      if (!schema) {
        return res.status(404).json({ error: "Schema not found" });
      }

      res.json(schema);
    } catch (err) {
      logger.error({ err }, "PUT /api/schemas/:schemaId error");
      res.status(500).json({ error: "Failed to update schema" });
    }
  });

  app.put("/api/schemas/:schemaId/activate", requireAuth, requireAdvisor, validateParams(schemaIdParamsSchema), async (req, res) => {
    try {
      const schemaId = req.params.schemaId as string;
      await storage.toggleSchemaActive(schemaId, true);
      res.status(204).send();
    } catch (err) {
      logger.error({ err }, "PUT /api/schemas/:schemaId/activate error");
      res.status(500).json({ error: "Failed to activate schema" });
    }
  });

  app.put("/api/schemas/:schemaId/deactivate", requireAuth, requireAdvisor, validateParams(schemaIdParamsSchema), async (req, res) => {
    try {
      const schemaId = req.params.schemaId as string;
      await storage.toggleSchemaActive(schemaId, false);
      res.status(204).send();
    } catch (err) {
      logger.error({ err }, "PUT /api/schemas/:schemaId/deactivate error");
      res.status(500).json({ error: "Failed to deactivate schema" });
    }
  });
}
