import { logger } from "../lib/logger";
import type { Express } from "express";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "./middleware";
import { storage } from "../storage";
import { validateBody } from "../lib/validation";
import {
  computeFullValuation,
  computeFlpDiscountTiered,
  computeTaxImpact,
  computeDcf,
  computeComparable,
  computeAssetBased,
  getIndustryMultiples,
} from "../lib/valuation-engine";

const createBusinessEntitySchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1),
  entityType: z.string().min(1),
  industry: z.string().nullable().optional(),
  ownershipPercentage: z.string().nullable().optional(),
  estimatedValue: z.string().nullable().optional(),
  annualRevenue: z.string().nullable().optional(),
  annualEbitda: z.string().nullable().optional(),
  employeeCount: z.number().nullable().optional(),
  foundedDate: z.string().nullable().optional(),
  keyPeople: z.any().optional(),
  notes: z.string().nullable().optional(),
  status: z.string().optional(),
});

const updateBusinessEntitySchema = z.object({
  name: z.string().optional(),
  entityType: z.string().optional(),
  industry: z.string().nullable().optional(),
  ownershipPercentage: z.string().nullable().optional(),
  estimatedValue: z.string().nullable().optional(),
  annualRevenue: z.string().nullable().optional(),
  annualEbitda: z.string().nullable().optional(),
  employeeCount: z.number().nullable().optional(),
  foundedDate: z.string().nullable().optional(),
  keyPeople: z.any().optional(),
  notes: z.string().nullable().optional(),
  status: z.string().optional(),
});

const createValuationSchema = z.object({
  businessEntityId: z.string().optional(),
  clientId: z.string().optional(),
  advisorId: z.string().optional(),
  valuationDate: z.string().optional().default(() => new Date().toISOString().split("T")[0]),
  methodology: z.string().optional().default("dcf"),
  estimatedValue: z.string().optional().default("0"),
  assumptions: z.any().optional(),
  notes: z.string().nullable().optional(),
  businessName: z.string().optional(),
  industry: z.string().optional(),
  entityType: z.string().optional(),
  revenue: z.string().optional(),
  ebitda: z.string().optional(),
  netIncome: z.string().optional(),
  valuationMethod: z.string().optional(),
  multiple: z.string().optional(),
  discountRate: z.string().optional(),
  growthRate: z.string().optional(),
  projectedCashFlows: z.any().optional(),
  tangibleAssets: z.string().optional(),
  intangibleAssets: z.string().optional(),
  totalLiabilities: z.string().optional(),
  goodwill: z.string().optional(),
});

const updateValuationSchema = z.object({
  businessName: z.string().optional(),
  industry: z.string().optional(),
  entityType: z.string().optional(),
  revenue: z.string().optional(),
  ebitda: z.string().optional(),
  netIncome: z.string().optional(),
  valuationMethod: z.string().optional(),
  multiple: z.string().optional(),
  discountRate: z.string().optional(),
  growthRate: z.string().optional(),
  projectedCashFlows: z.any().optional(),
  estimatedValue: z.string().optional(),
  valuationDate: z.string().optional(),
  notes: z.string().optional(),
  tangibleAssets: z.string().optional(),
  intangibleAssets: z.string().optional(),
  totalLiabilities: z.string().optional(),
  goodwill: z.string().optional(),
});

const createFlpSchema = z.object({
  clientId: z.string(),
  advisorId: z.string().optional(),
  name: z.string(),
  totalValue: z.string().optional(),
  generalPartnerPct: z.string().optional(),
  limitedPartnerPct: z.string().optional(),
  lackOfControlDiscount: z.string().optional(),
  lackOfMarketabilityDiscount: z.string().optional(),
  combinedDiscount: z.string().optional(),
  discountedValue: z.string().optional(),
  ownershipDetails: z.any().optional(),
  status: z.string().optional(),
  dateEstablished: z.string().optional(),
  notes: z.string().optional(),
});

const createBuySellSchema = z.object({
  businessEntityId: z.string().optional(), // HEAD uses this
  clientId: z.string().optional(), // Incoming uses this
  advisorId: z.string().optional(),
  businessValuationId: z.string().optional().nullable(),
  agreementType: z.string().min(1),
  triggerEvents: z.any().optional(),
  fundingMechanism: z.string().nullable().optional(),
  fundingAmount: z.string().nullable().optional(),
  policyNumber: z.string().nullable().optional(),
  insuranceCarrier: z.string().nullable().optional(),
  effectiveDate: z.string().nullable().optional(),
  reviewDate: z.string().nullable().optional(),
  status: z.string().optional(),
  notes: z.string().nullable().optional(),
  // Incoming extra fields
  fundingMethod: z.string().optional(),
  valuationFormula: z.string().optional(),
  insurancePolicyId: z.string().optional(),
  coverageAmount: z.string().optional(),
  expirationDate: z.string().optional(),
  parties: z.any().optional(),
});

const updateBuySellSchema = z.object({
  agreementType: z.string().optional(),
  triggerEvents: z.any().optional(),
  fundingMechanism: z.string().nullable().optional(),
  fundingAmount: z.string().nullable().optional(),
  policyNumber: z.string().nullable().optional(),
  insuranceCarrier: z.string().nullable().optional(),
  effectiveDate: z.string().nullable().optional(),
  reviewDate: z.string().nullable().optional(),
  status: z.string().optional(),
  notes: z.string().nullable().optional(),
});

const createMilestoneSchema = z.object({
  businessEntityId: z.string().optional(),
  clientId: z.string().optional(),
  advisorId: z.string().optional(),
  businessValuationId: z.string().optional().nullable(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.string().min(1),
  targetDate: z.string().nullable().optional(),
  status: z.string().optional(),
  sortOrder: z.number().optional(),
  notes: z.string().optional(),
});

const updateMilestoneSchema = z.object({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  category: z.string().optional(),
  targetDate: z.string().nullable().optional(),
  status: z.string().optional(),
  completedDate: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
  notes: z.string().optional(),
});

async function verifyClientAccess(req: any, clientId: string): Promise<boolean> {
  const advisor = await getSessionAdvisor(req);
  if (!advisor) return false;
  const client = await storage.getClient(clientId);
  if (!client) return false;
  return client.advisorId === advisor.id;
}

const computeValuationBodySchema = z.object({
  revenue: z.number().min(0).optional().default(0),
  ebitda: z.number().min(0),
  growthRate: z.number().min(0).max(1).optional().default(0.05),
  discountRate: z.number().min(0).max(1).optional().default(0.10),
  industry: z.string().optional(),
  projectionYears: z.number().min(1).max(20).optional().default(5),
  tangibleAssets: z.number().optional(),
  intangibleAssets: z.number().optional(),
  totalLiabilities: z.number().optional(),
  goodwill: z.number().optional(),
  customMultiples: z.object({
    evToEbitda: z.number().optional(),
    evToRevenue: z.number().optional(),
  }).optional(),
});

const computeFlpBodySchema = z.object({
  totalValue: z.number().min(0),
  lpInterestPercent: z.number().min(0).max(100),
  entityType: z.string().optional(),
  lackOfControlDiscount: z.number().min(0).max(1).optional(),
  lackOfMarketabilityDiscount: z.number().min(0).max(1).optional(),
});

const computeTaxImpactBodySchema = z.object({
  totalValue: z.number().min(0),
  discountedValue: z.number().min(0),
  transferAmount: z.number().min(0).optional().default(0),
  transferType: z.enum(["gift", "estate", "both"]).optional().default("gift"),
  annualExclusionRecipients: z.number().min(0).optional().default(0),
  priorGiftsUsed: z.number().min(0).optional().default(0),
  isGstApplicable: z.boolean().optional().default(false),
});

export function registerBusinessSuccessionRoutes(app: Express) {
  // GET entities for a client
  app.get("/api/clients/:clientId/business-entities", requireAuth, async (req, res) => {
    try {
      const entities = await storage.getBusinessEntitiesByClient(req.params.clientId as string);
      res.json(entities);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred." });
    }
  });

  // POST create entity
  app.post("/api/business-entities", requireAuth, async (req, res) => {
    try {
      const body = validateBody(createBusinessEntitySchema, req, res);
      if (!body) return;
      const entity = await storage.createBusinessEntity(body as any);
      res.json(entity);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred." });
    }
  });

  // PATCH update entity
  app.patch("/api/business-entities/:id", requireAuth, async (req, res) => {
    try {
      const body = validateBody(updateBusinessEntitySchema, req, res);
      if (!body) return;
      const entity = await storage.updateBusinessEntity(req.params.id as string, body as any);
      if (!entity) return res.status(404).json({ message: "Entity not found" });
      res.json(entity);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred." });
    }
  });

  // DELETE entity
  app.delete("/api/business-entities/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteBusinessEntity(req.params.id as string);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred." });
    }
  });

  // Valuations by entity (HEAD style)
  app.get("/api/business-entities/:entityId/valuations", requireAuth, async (req, res) => {
    try {
      const valuations = await storage.getBusinessValuations(req.params.entityId as string);
      res.json(valuations);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred." });
    }
  });

  // Create valuation (HEAD style)
  app.post("/api/business-valuations", requireAuth, async (req, res) => {
    try {
      const body = validateBody(createValuationSchema, req, res);
      if (!body) return;
      const valuation = await storage.createBusinessValuation(body as any);
      res.json(valuation);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred." });
    }
  });

  // Delete valuation (HEAD style)
  app.delete("/api/business-valuations/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteBusinessValuation(req.params.id as string);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred." });
    }
  });

  // Buy-sell agreements by entity (HEAD style)
  app.get("/api/business-entities/:entityId/buy-sell-agreements", requireAuth, async (req, res) => {
    try {
      const agreements = await storage.getBuySellAgreements(req.params.entityId as string);
      res.json(agreements);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred." });
    }
  });

  // Create buy-sell (HEAD style)
  app.post("/api/buy-sell-agreements", requireAuth, async (req, res) => {
    try {
      const body = validateBody(createBuySellSchema, req, res);
      if (!body) return;
      const agreement = await storage.createBuySellAgreement(body as any);
      res.json(agreement);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred." });
    }
  });

  // Update buy-sell (HEAD style)
  app.patch("/api/buy-sell-agreements/:id", requireAuth, async (req, res) => {
    try {
      const body = validateBody(updateBuySellSchema, req, res);
      if (!body) return;
      const agreement = await storage.updateBuySellAgreement(req.params.id as string, body as any);
      if (!agreement) return res.status(404).json({ message: "Agreement not found" });
      res.json(agreement);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred." });
    }
  });

  // Delete buy-sell (HEAD style)
  app.delete("/api/buy-sell-agreements/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteBuySellAgreement(req.params.id as string);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred." });
    }
  });

  // Exit milestones by entity (HEAD style)
  app.get("/api/business-entities/:entityId/exit-milestones", requireAuth, async (req, res) => {
    try {
      const milestones = await storage.getExitPlanMilestones(req.params.entityId as string);
      res.json(milestones);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred." });
    }
  });

  // Create milestone (HEAD style)
  app.post("/api/exit-milestones", requireAuth, async (req, res) => {
    try {
      const body = validateBody(createMilestoneSchema, req, res);
      if (!body) return;
      const milestone = await storage.createExitPlanMilestone(body as any);
      res.json(milestone);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred." });
    }
  });

  // Update milestone (HEAD style)
  app.patch("/api/exit-milestones/:id", requireAuth, async (req, res) => {
    try {
      const body = validateBody(updateMilestoneSchema, req, res);
      if (!body) return;
      const milestone = await storage.updateExitPlanMilestone(req.params.id as string, body as any);
      if (!milestone) return res.status(404).json({ message: "Milestone not found" });
      res.json(milestone);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred." });
    }
  });

  // Delete milestone (HEAD style)
  app.delete("/api/exit-milestones/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteExitPlanMilestone(req.params.id as string);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred." });
    }
  });

  // --- Incoming Sprint 4 Routes below, keeping them to avoid regression ---

  app.get("/api/clients/:clientId/business-succession", requireAuth, async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const hasAccess = await verifyClientAccess(req, clientId as string);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });

      const [valuations, flps, agreements, milestones] = await Promise.all([
        storage.getBusinessValuationsByClient(clientId as string),
        storage.getFlpStructuresByClient(clientId as string),
        storage.getBuySellAgreementsByClient(clientId as string),
        storage.getExitMilestonesByClient(clientId as string),
      ]);

      const safeNum = (val: any, fallback: number = 0): number => {
        const n = parseFloat(String(val || fallback));
        return isNaN(n) || !isFinite(n) ? fallback : n;
      };

      const valuationsWithCalc = valuations.map((v: any) => {
        const ebitda = safeNum(v.ebitda, 0);
        const revenue = safeNum(v.revenue, 0);
        const mult = safeNum(v.multiple, 0);
        const dr = safeNum(v.discountRate, 0.10);
        const gr = safeNum(v.growthRate, 0.03);
        const multipleValue = ebitda * mult;

        const tangibleAssets = safeNum(v.tangibleAssets, 0);
        const intangibleAssets = safeNum(v.intangibleAssets, 0);
        const totalLiabilities = safeNum(v.totalLiabilities, 0);
        const goodwill = safeNum(v.goodwill, 0);

        const hasAnyAssetData = tangibleAssets > 0 || intangibleAssets > 0 || totalLiabilities > 0 || goodwill > 0;

        const fullValuation = computeFullValuation({
          revenue,
          ebitda,
          growthRate: gr,
          discountRate: dr,
          industry: v.industry || undefined,
          ...(hasAnyAssetData ? {
            tangibleAssets,
            intangibleAssets,
            totalLiabilities,
            goodwill,
          } : {}),
        });

        return {
          ...v,
          calculations: {
            multipleBasedValue: Math.round(multipleValue),
            dcfBasedValue: fullValuation.dcf?.enterpriseValue || 0,
            comparableValue: fullValuation.comparable?.blendedValue || 0,
            recommendedValue: fullValuation.recommended.value,
            recommendedMethodology: fullValuation.recommended.methodology,
            confidence: fullValuation.recommended.confidence,
            reasoning: fullValuation.recommended.reasoning,
          },
          dcfBreakdown: fullValuation.dcf,
          comparableBreakdown: fullValuation.comparable,
          assetBasedBreakdown: fullValuation.assetBased,
          industryMultiples: getIndustryMultiples(v.industry || undefined),
        };
      });

      const flpsWithCalc = flps.map((f: any) => {
        const totalValue = safeNum(f.totalValue, 0);
        const lpPercent = safeNum(f.limitedPartnerPct, 99);
        const controlDiscount = safeNum(f.lackOfControlDiscount, 0.25);
        const marketabilityDiscount = safeNum(f.lackOfMarketabilityDiscount, 0.20);

        const flpEntityType = "Partnership";
        const lpInterestValue = totalValue * (lpPercent / 100);

        const flpResult = computeFlpDiscountTiered({
          totalValue: lpInterestValue,
          lpInterestPercent: lpPercent,
          entityType: flpEntityType,
          lackOfControlDiscount: controlDiscount,
          lackOfMarketabilityDiscount: marketabilityDiscount,
        });

        const taxResult = computeTaxImpact({
          totalValue: lpInterestValue,
          discountedValue: flpResult.selectedDiscountedValue,
          transferAmount: flpResult.selectedDiscountedValue,
          transferType: "both",
          annualExclusionRecipients: 1,
          priorGiftsUsed: 0,
          isGstApplicable: false,
        });

        return {
          ...f,
          calculations: {
            combinedDiscount: flpResult.selectedCombinedDiscount,
            discountedValue: flpResult.selectedDiscountedValue,
          },
          discountRanges: {
            controlDiscount: flpResult.controlDiscount,
            marketabilityDiscount: flpResult.marketabilityDiscount,
            combinedDiscount: flpResult.combinedDiscount,
            discountedValue: flpResult.discountedValue,
          },
          irsDefensible: flpResult.irsDefensible,
          discountNotes: flpResult.notes,
          taxImpact: taxResult,
        };
      });

      const completedMilestones = milestones.filter((m: any) => m.status === "completed").length;
      const totalMilestones = milestones.length;

      const computedTotalValue = valuationsWithCalc.reduce((s: number, v: any) => {
        const computed = v.calculations?.recommendedValue || 0;
        const manual = parseFloat(String(v.estimatedValue || "0")) || 0;
        return s + (computed > 0 ? computed : manual);
      }, 0);

      res.json({
        valuations: valuationsWithCalc,
        flpStructures: flpsWithCalc,
        buySellAgreements: agreements,
        exitMilestones: milestones,
        summary: {
          totalBusinessValue: computedTotalValue,
          valuationCount: valuations.length,
          flpCount: flps.length,
          agreementCount: agreements.length,
          milestoneProgress: totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0,
          completedMilestones,
          totalMilestones,
          agreementsNeedingReview: agreements.filter((a: any) => {
            if (!a.reviewDate) return false;
            const reviewDate = new Date(a.reviewDate);
            const now = new Date();
            const daysUntilReview = Math.ceil((reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return daysUntilReview <= 90;
          }).length,
        },
      });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/business-succession/valuations", requireAuth, async (req, res) => {
    try {
      const body = validateBody(createValuationSchema, req, res);
      if (!body) return;
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });
      const clientId = (body as any).clientId;
      if (!clientId) return res.status(400).json({ message: "clientId is required" });
      const hasAccess = await verifyClientAccess(req, clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      (body as any).advisorId = advisor.id;
      const valuation = await storage.createBusinessValuation(body as any);
      res.json(valuation);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/business-succession/valuations/:id", requireAuth, async (req, res) => {
    try {
      const body = validateBody(updateValuationSchema, req, res);
      if (!body) return;
      const existing = await storage.getBusinessValuation(req.params.id as string);
      if (!existing) return res.status(404).json({ message: "Valuation not found" });
      const entity = await storage.getBusinessEntity(existing.businessEntityId);
      if (entity) {
        const hasAccess = await verifyClientAccess(req, entity.clientId);
        if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      }
      const result = await storage.updateBusinessValuation(req.params.id as string, body as any);
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/business-succession/valuations/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getBusinessValuation(req.params.id as string);
      if (!existing) return res.status(404).json({ message: "Valuation not found" });
      const entity = await storage.getBusinessEntity(existing.businessEntityId);
      if (entity) {
        const hasAccess = await verifyClientAccess(req, entity.clientId);
        if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      }
      await storage.deleteBusinessValuation(req.params.id as string);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/business-succession/flp-structures", requireAuth, async (req, res) => {
    try {
      const body = validateBody(createFlpSchema, req, res);
      if (!body) return;
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });
      const hasAccess = await verifyClientAccess(req, body.clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      body.advisorId = advisor.id;
      const flp = await storage.createFlpStructure(body as any);
      res.json(flp);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/business-succession/flp-structures/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getFlpStructure(req.params.id as string);
      if (!existing) return res.status(404).json({ message: "FLP not found" });
      const hasAccess = await verifyClientAccess(req, existing.clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      await storage.deleteFlpStructure(req.params.id as string);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/business-succession/buy-sell-agreements", requireAuth, async (req, res) => {
    try {
      const body = validateBody(createBuySellSchema, req, res);
      if (!body) return;
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });
      const clientId = (body as any).clientId;
      if (!clientId) return res.status(400).json({ message: "clientId is required" });
      const hasAccess = await verifyClientAccess(req, clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      (body as any).advisorId = advisor.id;
      const agreement = await storage.createBuySellAgreement(body as any);
      res.json(agreement);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/business-succession/buy-sell-agreements/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getBuySellAgreement(req.params.id as string);
      if (!existing) return res.status(404).json({ message: "Agreement not found" });
      const entity = await storage.getBusinessEntity(existing.businessEntityId);
      if (entity) {
        const hasAccess = await verifyClientAccess(req, entity.clientId);
        if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      }
      await storage.deleteBuySellAgreement(req.params.id as string);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/business-succession/exit-milestones", requireAuth, async (req, res) => {
    try {
      const body = validateBody(createMilestoneSchema, req, res);
      if (!body) return;
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });
      const clientId = (body as any).clientId;
      if (!clientId) return res.status(400).json({ message: "clientId is required" });
      const hasAccess = await verifyClientAccess(req, clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      (body as any).advisorId = advisor.id;
      const milestone = await storage.createExitMilestone(body as any);
      res.json(milestone);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/business-succession/exit-milestones/:id", requireAuth, async (req, res) => {
    try {
      const body = validateBody(updateMilestoneSchema, req, res);
      if (!body) return;
      const existing = await storage.getExitMilestone(req.params.id as string);
      if (!existing) return res.status(404).json({ message: "Milestone not found" });
      const hasAccess = await verifyClientAccess(req, existing.clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      const result = await storage.updateExitMilestone(req.params.id as string, body as any);
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/business-succession/exit-milestones/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getExitMilestone(req.params.id as string);
      if (!existing) return res.status(404).json({ message: "Milestone not found" });
      const hasAccess = await verifyClientAccess(req, existing.clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      await storage.deleteExitMilestone(req.params.id as string);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/business-succession/compute-valuation", requireAuth, async (req, res) => {
    try {
      const body = validateBody(computeValuationBodySchema, req, res);
      if (!body) return;
      const result = computeFullValuation(body as any);
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred." });
    }
  });

  app.post("/api/business-succession/compute-flp-discount", requireAuth, async (req, res) => {
    try {
      const body = validateBody(computeFlpBodySchema, req, res);
      if (!body) return;
      const result = computeFlpDiscountTiered(body as any);
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred." });
    }
  });

  app.post("/api/business-succession/compute-tax-impact", requireAuth, async (req, res) => {
    try {
      const body = validateBody(computeTaxImpactBodySchema, req, res);
      if (!body) return;
      const result = computeTaxImpact(body as any);
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred." });
    }
  });

  app.get("/api/business-succession/industry-multiples", requireAuth, async (_req, res) => {
    try {
      const industries = [
        "technology", "healthcare", "manufacturing", "retail", "financial services",
        "real estate", "energy", "construction", "professional services", "hospitality",
        "transportation", "agriculture",
      ];
      const multiples = industries.map(i => ({ industry: i, ...getIndustryMultiples(i) }));
      res.json(multiples);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred." });
    }
  });
}
