import type { Express } from "express";
import { z } from "zod";
import { requireAuth, requireAdvisor, getSessionAdvisor } from "./middleware";
import { storage } from "../storage";
import { validateBody } from "../lib/validation";
import { fiduciaryEngine, validateAIContent } from "../engines/fiduciary-compliance";
import type { RuleSeverity } from "../engines/fiduciary-compliance";
import { logger } from "../lib/logger";

const validateContentSchema = z.object({
  content: z.string().min(1, "Content is required"),
  contentType: z.string().min(1, "Content type is required"),
  clientId: z.string().optional(),
  clientRiskTolerance: z.string().optional(),
  clientAge: z.number().optional(),
  holdings: z.array(z.object({
    ticker: z.string(),
    name: z.string(),
    marketValue: z.number(),
    sector: z.string().optional(),
    weight: z.number().optional(),
  })).optional(),
  totalPortfolioValue: z.number().optional(),
  upcomingWithdrawals: z.array(z.object({
    amount: z.number(),
    date: z.string(),
    type: z.string(),
  })).optional(),
  rmdRequired: z.boolean().optional(),
  rmdAmount: z.number().optional(),
  investmentPolicyLimits: z.object({
    maxSinglePosition: z.number().optional(),
    maxSectorConcentration: z.number().optional(),
    prohibitedProducts: z.array(z.string()).optional(),
    maxEquityAllocation: z.number().optional(),
    minFixedIncomeAllocation: z.number().optional(),
  }).optional(),
});

const updateRuleSchema = z.object({
  ruleId: z.string().min(1),
  enabled: z.boolean().optional(),
  severity: z.enum(["warning", "block"]).optional(),
});

const updateConfigSchema = z.object({
  globalEnabled: z.boolean().optional(),
  blockThreshold: z.number().int().min(1).optional(),
  ruleOverrides: z.array(z.object({
    id: z.string(),
    enabled: z.boolean(),
    severity: z.enum(["warning", "block"]),
  })).optional(),
});

const resolveSchema = z.object({
  resolutionNote: z.string().min(1, "Resolution note is required"),
});

/** Normalize Express param to string */
function p(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v || "";
}

async function loadPersistedConfig() {
  try {
    const config = await storage.getFiduciaryRuleConfig();
    if (config) {
      fiduciaryEngine.setGlobalEnabled(config.globalEnabled);
      fiduciaryEngine.setBlockThreshold(config.blockThreshold);
      const overrides = config.ruleOverrides as Array<{ id: string; enabled: boolean; severity: RuleSeverity }>;
      if (Array.isArray(overrides)) {
        for (const override of overrides) {
          fiduciaryEngine.updateRuleConfig(override.id, {
            enabled: override.enabled,
            severity: override.severity,
          });
        }
      }
      logger.info("Loaded persisted fiduciary rule config");
    }
  } catch (err) {
    logger.error({ err }, "Failed to load persisted fiduciary config, using defaults");
  }
}

export function registerFiduciaryComplianceRoutes(app: Express) {
  loadPersistedConfig();

  app.post("/api/fiduciary/validate", requireAuth, async (req, res) => {
    try {
      const body = validateBody(validateContentSchema, req, res);
      if (!body) return;

      const advisor = await getSessionAdvisor(req);

      const result = await validateAIContent(body.content, body.contentType, {
        clientId: body.clientId,
        clientRiskTolerance: body.clientRiskTolerance,
        clientAge: body.clientAge,
        advisorId: advisor?.id,
        holdings: body.holdings,
        totalPortfolioValue: body.totalPortfolioValue,
        upcomingWithdrawals: body.upcomingWithdrawals,
        rmdRequired: body.rmdRequired,
        rmdAmount: body.rmdAmount,
        investmentPolicyLimits: body.investmentPolicyLimits,
      });

      try {
        await storage.createFiduciaryValidationLog({
          advisorId: advisor?.id || null,
          clientId: body.clientId || null,
          contentType: body.contentType,
          outcome: result.outcome,
          ruleSetVersion: result.ruleSetVersion,
          matchCount: result.matches.length,
          warningCount: result.warnings.length,
          blockCount: result.blocks.length,
          matches: result.matches as any,
          contentPreview: body.content.substring(0, 500),
          resolvedBy: null,
          resolvedAt: null,
          resolutionNote: null,
        });
      } catch (logErr) {
        logger.error({ err: logErr }, "Failed to log fiduciary validation");
      }

      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "Fiduciary validation error");
      res.status(500).json({ message: "Validation failed" });
    }
  });

  app.get("/api/fiduciary/rules", requireAuth, async (_req, res) => {
    try {
      const rules = fiduciaryEngine.getAvailableRules();
      const config = fiduciaryEngine.getConfig();
      res.json({ rules, config });
    } catch (error: any) {
      logger.error({ err: error }, "Error fetching rules");
      res.status(500).json({ message: "Failed to fetch rules" });
    }
  });

  app.patch("/api/fiduciary/rules", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(updateRuleSchema, req, res);
      if (!body) return;

      const advisor = await getSessionAdvisor(req);
      const success = fiduciaryEngine.updateRuleConfig(body.ruleId, {
        enabled: body.enabled,
        severity: body.severity as RuleSeverity | undefined,
      });

      if (!success) {
        return res.status(404).json({ message: "Rule not found" });
      }

      const config = fiduciaryEngine.getConfig();
      await storage.upsertFiduciaryRuleConfig({
        advisorId: null,
        globalEnabled: config.globalEnabled,
        blockThreshold: config.blockThreshold,
        ruleOverrides: config.rules as any,
        updatedBy: advisor?.id || null,
      });

      res.json({ rules: fiduciaryEngine.getAvailableRules(), config });
    } catch (error: any) {
      logger.error({ err: error }, "Error updating rule");
      res.status(500).json({ message: "Failed to update rule" });
    }
  });

  app.put("/api/fiduciary/config", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(updateConfigSchema, req, res);
      if (!body) return;

      const advisor = await getSessionAdvisor(req);

      if (body.globalEnabled !== undefined) {
        fiduciaryEngine.setGlobalEnabled(body.globalEnabled);
      }
      if (body.blockThreshold !== undefined) {
        fiduciaryEngine.setBlockThreshold(body.blockThreshold);
      }
      if (body.ruleOverrides) {
        for (const override of body.ruleOverrides) {
          fiduciaryEngine.updateRuleConfig(override.id, {
            enabled: override.enabled,
            severity: override.severity,
          });
        }
      }

      const config = fiduciaryEngine.getConfig();
      await storage.upsertFiduciaryRuleConfig({
        advisorId: null,
        globalEnabled: config.globalEnabled,
        blockThreshold: config.blockThreshold,
        ruleOverrides: config.rules as any,
        updatedBy: advisor?.id || null,
      });

      res.json({ config, rules: fiduciaryEngine.getAvailableRules() });
    } catch (error: any) {
      logger.error({ err: error }, "Error updating config");
      res.status(500).json({ message: "Failed to update config" });
    }
  });

  app.get("/api/fiduciary/audit-log", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Unauthorized" });

      const { outcome, clientId, limit, offset } = req.query;

      const logs = await storage.getFiduciaryValidationLogs({
        advisorId: advisor.id,
        clientId: clientId as string | undefined,
        outcome: outcome as string | undefined,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });

      const stats = await storage.getFiduciaryValidationStats(advisor.id);

      res.json({ logs, stats });
    } catch (error: any) {
      logger.error({ err: error }, "Error fetching audit log");
      res.status(500).json({ message: "Failed to fetch audit log" });
    }
  });

  app.get("/api/fiduciary/audit-log/:id", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Unauthorized" });

      const log = await storage.getFiduciaryValidationLog(p(req.params.id));
      if (!log) return res.status(404).json({ message: "Validation log not found" });
      if (log.advisorId && log.advisorId !== advisor.id) {
        return res.status(403).json({ message: "Not authorized to view this log" });
      }
      res.json(log);
    } catch (error: any) {
      logger.error({ err: error }, "Error fetching validation log");
      res.status(500).json({ message: "Failed to fetch validation log" });
    }
  });

  app.post("/api/fiduciary/audit-log/:id/resolve", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const body = validateBody(resolveSchema, req, res);
      if (!body) return;

      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Unauthorized" });

      const log = await storage.getFiduciaryValidationLog(p(req.params.id));
      if (!log) return res.status(404).json({ message: "Validation log not found" });
      if (log.advisorId && log.advisorId !== advisor.id) {
        return res.status(403).json({ message: "Not authorized to resolve this log" });
      }

      const resolved = await storage.resolveFiduciaryValidation(
        p(req.params.id),
        advisor.name,
        body.resolutionNote
      );

      if (!resolved) return res.status(404).json({ message: "Validation log not found" });
      res.json(resolved);
    } catch (error: any) {
      logger.error({ err: error }, "Error resolving validation");
      res.status(500).json({ message: "Failed to resolve validation" });
    }
  });

  app.get("/api/fiduciary/stats", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Unauthorized" });

      const stats = await storage.getFiduciaryValidationStats(advisor.id);
      res.json(stats);
    } catch (error: any) {
      logger.error({ err: error }, "Error fetching stats");
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
}
