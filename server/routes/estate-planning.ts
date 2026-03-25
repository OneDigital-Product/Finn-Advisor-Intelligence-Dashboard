import type { Express } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";
import { validateBody } from "../lib/validation";
import { requireAuth, getSessionAdvisor } from "./middleware";
import { storage } from "../storage";
import type { Trust, GiftHistoryEntry } from "@shared/schema";
import {
  computeFullEstateAnalysis,
  computeEstateTax,
  computeSunsetComparison,
  computeGRATAnalysis,
  computeGSTTracking,
  computeLifetimeExemptionTracker,
  type EstateTaxInput,
} from "../engines/estate-tax-engine";

const createTrustSchema = z.object({
  clientId: z.string(),
  advisorId: z.string(),
  trustType: z.string(),
  name: z.string(),
  status: z.string().optional(),
  fundedValue: z.string().optional(),
  dateEstablished: z.string().optional(),
  jurisdiction: z.string().optional(),
  termYears: z.number().optional(),
  section7520Rate: z.string().optional(),
  annuityRate: z.string().optional(),
  remainderBeneficiary: z.string().optional(),
  distributionSchedule: z.any().optional(),
  taxImplications: z.any().optional(),
  notes: z.string().optional(),
});

const createTrustRelationshipSchema = z.object({
  trustId: z.string(),
  personName: z.string(),
  personClientId: z.string().optional().nullable(),
  role: z.string(),
  generation: z.number().optional(),
  notes: z.string().optional(),
});

const createExemptionSchema = z.object({
  clientId: z.string(),
  advisorId: z.string(),
  taxYear: z.number(),
  federalExemptionLimit: z.string(),
  lifetimeGiftsUsed: z.string().optional(),
  gstExemptionUsed: z.string().optional(),
  remainingExemption: z.string().optional(),
  remainingGstExemption: z.string().optional(),
  notes: z.string().optional(),
});

const updateTrustSchema = z.object({
  name: z.string().optional(),
  status: z.string().optional(),
  fundedValue: z.string().optional(),
  jurisdiction: z.string().optional(),
  termYears: z.number().optional(),
  section7520Rate: z.string().optional(),
  annuityRate: z.string().optional(),
  remainderBeneficiary: z.string().optional(),
  distributionSchedule: z.any().optional(),
  taxImplications: z.any().optional(),
  notes: z.string().optional(),
});

const updateExemptionSchema = z.object({
  lifetimeGiftsUsed: z.string().optional(),
  gstExemptionUsed: z.string().optional(),
  remainingExemption: z.string().optional(),
  remainingGstExemption: z.string().optional(),
  notes: z.string().optional(),
});

const createGiftSchema = z.object({
  clientId: z.string(),
  recipientName: z.string(),
  recipientRelationship: z.string().optional(),
  giftDate: z.string(),
  giftValue: z.string(),
  giftType: z.string().optional(),
  annualExclusionApplied: z.string().optional(),
  taxableAmount: z.string().optional(),
  gstApplicable: z.boolean().optional(),
  gstAllocated: z.string().optional(),
  trustId: z.string().optional().nullable(),
  notes: z.string().optional(),
});

/** Normalize Express param to string */
function p(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v || "";
}

const TRUST_TYPE_INFO: Record<string, { label: string; description: string; taxBenefits: string[] }> = {
  GRAT: {
    label: "Grantor Retained Annuity Trust",
    description: "Transfers appreciation to beneficiaries with minimal gift tax cost by retaining an annuity interest.",
    taxBenefits: ["Freezes estate value at creation", "Excess growth passes tax-free", "Useful for appreciating assets"],
  },
  SLAT: {
    label: "Spousal Lifetime Access Trust",
    description: "Irrevocable trust for spouse's benefit that removes assets from grantor's estate while maintaining indirect access.",
    taxBenefits: ["Removes assets from taxable estate", "Spouse retains access to funds", "Uses lifetime gift tax exemption"],
  },
  QPRT: {
    label: "Qualified Personal Residence Trust",
    description: "Transfers residence to beneficiaries at reduced gift tax cost while grantor retains right to live in home.",
    taxBenefits: ["Reduced gift tax value", "Removes home appreciation from estate", "Grantor retains residence right"],
  },
  ILIT: {
    label: "Irrevocable Life Insurance Trust",
    description: "Holds life insurance policy outside the estate to provide tax-free death benefit to beneficiaries.",
    taxBenefits: ["Insurance proceeds excluded from estate", "Provides estate liquidity", "No estate tax on proceeds"],
  },
  CRT: {
    label: "Charitable Remainder Trust",
    description: "Provides income stream to donor, then remainder to charity, with upfront charitable deduction.",
    taxBenefits: ["Immediate charitable deduction", "Avoids capital gains on contributed assets", "Income stream for life or term"],
  },
  DAF: {
    label: "Donor-Advised Fund",
    description: "Charitable giving vehicle providing immediate tax deduction with advisory privileges on grants.",
    taxBenefits: ["Immediate tax deduction", "Tax-free growth", "Flexible charitable giving"],
  },
  REVOCABLE: {
    label: "Revocable Living Trust",
    description: "Flexible trust that avoids probate while allowing grantor full control during lifetime.",
    taxBenefits: ["Avoids probate", "Maintains privacy", "No estate tax benefit (included in estate)"],
  },
  DYNASTY: {
    label: "Dynasty Trust",
    description: "Multi-generational trust designed to pass wealth for many generations while minimizing transfer taxes.",
    taxBenefits: ["Multi-generational wealth transfer", "GST exemption leveraged", "Avoids estate tax at each generation"],
  },
};

const TCJA_SUNSET_DATE = new Date("2026-01-01");
const CURRENT_EXEMPTION_2024 = 13610000;
const POST_SUNSET_EXEMPTION = 7000000;
const ANNUAL_EXCLUSION_2024 = 18000;
const GST_EXEMPTION_2024 = 13610000;

function computeTrustModeling(trust: Trust): {
  annualDistribution: number;
  totalProjectedDistributions: number;
  remainderValue: number;
  giftTaxValue: number;
  effectiveTaxRate: number;
  modelingNotes: string[];
} {
  const fundedValue = parseFloat(String(trust.fundedValue || "0"));
  const termYears = trust.termYears || 0;
  const section7520Rate = parseFloat(String(trust.section7520Rate || "0.05"));
  const annuityRate = parseFloat(String(trust.annuityRate || "0"));
  const notes: string[] = [];

  let annualDistribution = 0;
  let totalProjectedDistributions = 0;
  let remainderValue = 0;
  let giftTaxValue = 0;
  let effectiveTaxRate = 0;

  switch (trust.trustType) {
    case "GRAT": {
      const rate = annuityRate || 0.08;
      annualDistribution = fundedValue * rate;
      totalProjectedDistributions = annualDistribution * termYears;
      const annuityFactor = termYears > 0 && section7520Rate > 0
        ? (1 - Math.pow(1 + section7520Rate, -termYears)) / section7520Rate
        : termYears;
      const retainedInterest = annualDistribution * annuityFactor;
      giftTaxValue = Math.max(0, fundedValue - retainedInterest);
      remainderValue = Math.max(0, fundedValue - totalProjectedDistributions);
      effectiveTaxRate = fundedValue > 0 ? (giftTaxValue / fundedValue) * 0.40 : 0;
      notes.push(`Annuity factor: ${annuityFactor.toFixed(4)} at ${(section7520Rate * 100).toFixed(2)}% §7520 rate`);
      if (giftTaxValue < 100) notes.push("Zeroed-out GRAT: minimal gift tax exposure");
      break;
    }
    case "QPRT": {
      const qprtDiscountFactor = termYears > 0 && section7520Rate > 0
        ? Math.pow(1 + section7520Rate, -termYears)
        : 0.5;
      giftTaxValue = fundedValue * qprtDiscountFactor;
      remainderValue = fundedValue;
      effectiveTaxRate = giftTaxValue > 0 ? (giftTaxValue / fundedValue) * 0.40 : 0;
      notes.push(`Remainder factor: ${qprtDiscountFactor.toFixed(4)}`);
      notes.push(`Gift value discount: ${((1 - qprtDiscountFactor) * 100).toFixed(1)}% from full FMV`);
      break;
    }
    case "CRT": {
      const crtRate = annuityRate || 0.05;
      annualDistribution = fundedValue * crtRate;
      totalProjectedDistributions = annualDistribution * Math.min(termYears || 20, 20);
      const charitableFactor = termYears > 0 && section7520Rate > 0
        ? Math.pow(1 + section7520Rate, -termYears)
        : 0.4;
      remainderValue = fundedValue * charitableFactor;
      giftTaxValue = 0;
      notes.push(`Charitable deduction: ${((remainderValue / fundedValue) * 100).toFixed(1)}% of funded value`);
      notes.push(`Income stream: $${annualDistribution.toLocaleString()}/yr for ${termYears || 20} years`);
      break;
    }
    case "SLAT":
    case "ILIT":
    case "DAF":
    case "DYNASTY": {
      giftTaxValue = fundedValue;
      remainderValue = fundedValue;
      if (trust.trustType === "DYNASTY" && termYears) {
        const growthRate = 0.06;
        remainderValue = fundedValue * Math.pow(1 + growthRate, termYears);
        notes.push(`Projected value at ${growthRate * 100}% growth over ${termYears} years: $${remainderValue.toLocaleString()}`);
      }
      if (trust.trustType === "ILIT") {
        notes.push("Death benefit proceeds excluded from taxable estate");
      }
      if (trust.trustType === "SLAT") {
        notes.push("Assets removed from grantor's estate; spouse retains access");
      }
      if (trust.trustType === "DAF") {
        notes.push("Immediate charitable deduction; no estate tax benefit needed");
        giftTaxValue = 0;
      }
      effectiveTaxRate = giftTaxValue > 0 ? 0.40 : 0;
      break;
    }
    case "REVOCABLE": {
      remainderValue = fundedValue;
      giftTaxValue = 0;
      notes.push("Included in taxable estate; no transfer tax benefit");
      notes.push("Avoids probate; provides privacy and incapacity planning");
      break;
    }
    default: {
      remainderValue = fundedValue;
      giftTaxValue = fundedValue;
      notes.push("Standard trust modeling applied");
    }
  }

  return {
    annualDistribution: Math.round(annualDistribution * 100) / 100,
    totalProjectedDistributions: Math.round(totalProjectedDistributions * 100) / 100,
    remainderValue: Math.round(remainderValue * 100) / 100,
    giftTaxValue: Math.round(giftTaxValue * 100) / 100,
    effectiveTaxRate: Math.round(effectiveTaxRate * 10000) / 10000,
    modelingNotes: notes,
  };
}

function computeGstTracking(gifts: GiftHistoryEntry[]) {
  const gstGifts = gifts.filter(g => g.gstApplicable);
  const totalGstAllocated = gstGifts.reduce(
    (sum, g) => sum + parseFloat(String(g.gstAllocated || g.taxableAmount || "0")), 0
  );
  const remainingGstExemption = GST_EXEMPTION_2024 - totalGstAllocated;
  const gstGiftsByYear: Record<number, number> = {};
  for (const gift of gstGifts) {
    const year = new Date(gift.giftDate).getFullYear();
    gstGiftsByYear[year] = (gstGiftsByYear[year] || 0) + parseFloat(String(gift.gstAllocated || gift.taxableAmount || "0"));
  }
  return {
    totalGstExemption: GST_EXEMPTION_2024,
    totalGstAllocated,
    remainingGstExemption: Math.max(0, remainingGstExemption),
    gstUtilizationPercent: GST_EXEMPTION_2024 > 0 ? (totalGstAllocated / GST_EXEMPTION_2024) * 100 : 0,
    gstGiftCount: gstGifts.length,
    gstAllocationByYear: gstGiftsByYear,
  };
}

async function verifyClientAccess(req: any, clientId: string): Promise<boolean> {
  const advisor = await getSessionAdvisor(req);
  if (!advisor) return false;
  const client = await storage.getClient(clientId);
  if (!client) return false;
  return client.advisorId === advisor.id;
}

export function registerEstatePlanningRoutes(app: Express) {
  app.get("/api/clients/:clientId/beneficiary-audit", requireAuth, async (req, res) => {
    try {
      const clientId = p(req.params.clientId);
      const hasAccess = await verifyClientAccess(req, clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });

      const [accounts, clientTrusts, checklistItems] = await Promise.all([
        storage.getAccountsByClient(clientId),
        storage.getTrustsByClient(clientId),
        storage.getDocumentChecklist(clientId),
      ]);

      const trustsWithRelationships = await Promise.all(
        clientTrusts.map(async (trust) => {
          const relationships = await storage.getTrustRelationships(trust.id);
          return { ...trust, relationships };
        })
      );

      const beneficiaryEligibleTypes = ["ira", "401k", "retirement", "trust", "life", "annuity", "roth", "pension"];
      const eligibleAccounts = accounts.filter((a) => {
        const type = (a.accountType || "").toLowerCase();
        return beneficiaryEligibleTypes.some((t) => type.includes(t));
      });

      const beneficiaryDocs = checklistItems.filter((d) => {
        const name = (d.documentName || "").toLowerCase();
        const cat = (d.category || "").toLowerCase();
        return name.includes("beneficiary") || cat.includes("beneficiary");
      });

      const receivedBeneficiaryDocs = beneficiaryDocs.filter((d) => d.received);

      const latestReviewDate = receivedBeneficiaryDocs.reduce((latest: string | null, d) => {
        if (!d.receivedDate) return latest;
        if (!latest || d.receivedDate > latest) return d.receivedDate;
        return latest;
      }, null);

      const isStaleReview = latestReviewDate ? (() => {
        const reviewDate = new Date(latestReviewDate);
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
        return reviewDate < threeYearsAgo;
      })() : false;

      const allBeneficiaries = trustsWithRelationships.flatMap((t) =>
        (t.relationships || [])
          .filter((r: any) => r.role === "beneficiary")
          .map((r: any) => ({
            personName: r.personName,
            role: r.role,
            generation: r.generation,
            trustId: t.id,
            trustName: t.name,
            trustType: t.trustType,
          }))
      );

      const accountAuditResults = eligibleAccounts.map((acct) => {
        const type = (acct.accountType || "").toLowerCase();
        const conflicts: Array<{ type: string; severity: string; message: string }> = [];

        const linkedTrust = trustsWithRelationships.find((t) =>
          t.trustType === "REVOCABLE" && type.includes("trust")
        );

        const accountBeneficiaries = linkedTrust
          ? (linkedTrust.relationships || [])
              .filter((r: any) => r.role === "beneficiary")
              .map((r: any) => ({ personName: r.personName, generation: r.generation, source: `Trust: ${linkedTrust.name}` }))
          : [];

        if (receivedBeneficiaryDocs.length === 0) {
          conflicts.push({
            type: "missing_designation",
            severity: "critical",
            message: `No beneficiary designation document on file for ${acct.accountType} account`,
          });
        }

        if (isStaleReview && receivedBeneficiaryDocs.length > 0) {
          conflicts.push({
            type: "stale_review",
            severity: "warning",
            message: `Beneficiary designation last reviewed ${latestReviewDate} — over 3 years ago`,
          });
        }

        const hasMinorBeneficiary = accountBeneficiaries.some((b: any) =>
          b.generation !== null && b.generation !== undefined && b.generation >= 2
        );
        if (hasMinorBeneficiary && (type.includes("ira") || type.includes("401k") || type.includes("retirement"))) {
          conflicts.push({
            type: "minor_direct",
            severity: "warning",
            message: "Potential minor as direct beneficiary — consider a trust as beneficiary instead",
          });
        }

        return {
          accountId: acct.id,
          accountNumber: acct.accountNumber,
          accountType: acct.accountType,
          custodian: acct.custodian,
          balance: acct.balance,
          hasBeneficiaryDoc: receivedBeneficiaryDocs.length > 0,
          lastReviewedDate: latestReviewDate,
          designations: accountBeneficiaries,
          conflicts,
        };
      });

      res.json({
        accounts: accountAuditResults,
        trusts: trustsWithRelationships.map((t) => ({
          id: t.id,
          name: t.name,
          trustType: t.trustType,
          beneficiaries: (t.relationships || [])
            .filter((r: any) => r.role === "beneficiary")
            .map((r: any) => ({ personName: r.personName, generation: r.generation, id: r.id })),
        })),
        allBeneficiaries,
        documentStatus: {
          totalDocs: beneficiaryDocs.length,
          receivedDocs: receivedBeneficiaryDocs.length,
          latestReviewDate,
          isStaleReview,
        },
        summary: {
          totalEligible: eligibleAccounts.length,
          criticalIssues: accountAuditResults.reduce((sum, a) => sum + a.conflicts.filter((c) => c.severity === "critical").length, 0),
          warnings: accountAuditResults.reduce((sum, a) => sum + a.conflicts.filter((c) => c.severity === "warning").length, 0),
          clean: accountAuditResults.filter((a) => a.conflicts.length === 0).length,
        },
      });
    } catch (error: any) {
      logger.error({ err: error }, "Error fetching beneficiary audit data");
      res.status(500).json({ message: "An error occurred" });
    }
  });

  app.get("/api/clients/:clientId/estate-planning", requireAuth, async (req, res) => {
    try {
      const clientId = p(req.params.clientId);
      const hasAccess = await verifyClientAccess(req, clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });

      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });

      const [clientTrusts, exemptions, gifts, accounts, businessEntities, flpStructures, crts] = await Promise.all([
        storage.getTrustsByClient(clientId),
        storage.getEstateExemptions(clientId),
        storage.getGiftHistory(clientId),
        storage.getAccountsByClient(clientId),
        storage.getBusinessEntitiesByClient(clientId).catch(() => []),
        storage.getFlpStructuresByClient(clientId).catch(() => []),
        storage.getCrtsByClient(clientId).catch(() => []),
      ]);

      const trustsWithRelationships = await Promise.all(
        clientTrusts.map(async (trust) => {
          const relationships = await storage.getTrustRelationships(trust.id);
          const modeling = computeTrustModeling(trust);
          return { ...trust, relationships, modeling };
        })
      );

      const totalAUM = accounts.reduce((s, a) => s + parseFloat(String(a.balance || "0")), 0);
      const totalTrustValue = clientTrusts.reduce((s, t) => s + parseFloat(String(t.fundedValue || "0")), 0);
      const totalGifts = gifts.reduce((s, g) => s + parseFloat(String(g.taxableAmount || "0")), 0);

      const totalBusinessValue = businessEntities.reduce(
        (s: number, e: any) => s + parseFloat(String(e.estimatedValue || "0")), 0
      );
      const totalFlpDiscounts = flpStructures.reduce((s: number, f: any) => {
        const pre = parseFloat(String(f.totalValue || "0"));
        const post = parseFloat(String(f.discountedValue || "0"));
        return s + Math.max(0, pre - post);
      }, 0);
      const totalCrtValue = crts.reduce(
        (s: number, c: any) => s + parseFloat(String(c.currentValue || c.fundedValue || "0")), 0
      );

      const gstTracking = computeGstTracking(gifts);

      const currentExemption = exemptions.find(e => e.taxYear === new Date().getFullYear());
      const remainingExemption = currentExemption
        ? parseFloat(String(currentExemption.remainingExemption || "0"))
        : CURRENT_EXEMPTION_2024 - totalGifts;

      const now = new Date();
      const daysToSunset = Math.max(0, Math.ceil((TCJA_SUNSET_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      const grossEstateValue = totalAUM + totalBusinessValue;
      const adjustedEstateValue = grossEstateValue - totalFlpDiscounts - totalCrtValue;

      const sunsetImpact = adjustedEstateValue > POST_SUNSET_EXEMPTION
        ? {
            currentExemption: CURRENT_EXEMPTION_2024,
            postSunsetExemption: POST_SUNSET_EXEMPTION,
            exemptionReduction: CURRENT_EXEMPTION_2024 - POST_SUNSET_EXEMPTION,
            potentialAdditionalTax: Math.max(0, (adjustedEstateValue - POST_SUNSET_EXEMPTION) * 0.40),
            daysRemaining: daysToSunset,
            sunsetDate: TCJA_SUNSET_DATE.toISOString().split("T")[0],
            urgency: daysToSunset <= 90 ? "critical" : daysToSunset <= 365 ? "high" : "moderate",
          }
        : null;

      const recommendations = generateRecommendations(client, totalAUM, clientTrusts, remainingExemption, daysToSunset);

      const isMarried = /married|spouse|wife|husband/i.test(client.notes || "") || (client as any).maritalStatus === "married";
      const taxAnalysis = computeFullEstateAnalysis(
        adjustedEstateValue,
        clientTrusts,
        gifts,
        isMarried,
        0,
      );

      res.json({
        trusts: trustsWithRelationships,
        exemptions,
        gifts,
        summary: {
          totalEstateValue: grossEstateValue,
          grossEstateValue,
          adjustedEstateValue,
          totalTrustValue,
          totalLifetimeGifts: totalGifts,
          remainingExemption,
          currentFederalExemption: CURRENT_EXEMPTION_2024,
          annualExclusion: ANNUAL_EXCLUSION_2024,
          gstExemption: GST_EXEMPTION_2024,
          trustCount: clientTrusts.length,
          activeTrusts: clientTrusts.filter(t => t.status === "active").length,
          totalBusinessValue,
          totalFlpDiscounts,
          totalCrtValue,
          businessEntityCount: businessEntities.length,
          flpCount: flpStructures.length,
          crtCount: crts.length,
        },
        gstTracking,
        sunsetAlert: sunsetImpact,
        recommendations,
        trustTypes: TRUST_TYPE_INFO,
        taxAnalysis,
      });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/estate-planning/trusts", requireAuth, async (req, res) => {
    try {
      const body = validateBody(createTrustSchema, req, res);
      if (!body) return;
      const hasAccess = await verifyClientAccess(req, body.clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      const trust = await storage.createTrust(body);
      res.json(trust);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/estate-planning/trusts/:id", requireAuth, async (req, res) => {
    try {
      const body = validateBody(updateTrustSchema, req, res);
      if (!body) return;
      const existing = await storage.getTrust(p(req.params.id));
      if (!existing) return res.status(404).json({ message: "Trust not found" });
      const hasAccess = await verifyClientAccess(req, existing.clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      const trust = await storage.updateTrust(p(req.params.id), body);
      res.json(trust);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/estate-planning/trusts/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getTrust(p(req.params.id));
      if (!existing) return res.status(404).json({ message: "Trust not found" });
      const hasAccess = await verifyClientAccess(req, existing.clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      await storage.deleteTrust(p(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/estate-planning/trust-relationships", requireAuth, async (req, res) => {
    try {
      const body = validateBody(createTrustRelationshipSchema, req, res);
      if (!body) return;
      const trust = await storage.getTrust(body.trustId);
      if (!trust) return res.status(404).json({ message: "Trust not found" });
      const hasAccess = await verifyClientAccess(req, trust.clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      const rel = await storage.createTrustRelationship(body);
      res.json(rel);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/estate-planning/trust-relationships/:id", requireAuth, async (req, res) => {
    try {
      const rel = await storage.getTrustRelationship(p(req.params.id));
      if (!rel) return res.status(404).json({ message: "Relationship not found" });
      const trust = await storage.getTrust(rel.trustId);
      if (!trust) return res.status(404).json({ message: "Trust not found" });
      const hasAccess = await verifyClientAccess(req, trust.clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      await storage.deleteTrustRelationship(p(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/estate-planning/exemptions", requireAuth, async (req, res) => {
    try {
      const body = validateBody(createExemptionSchema, req, res);
      if (!body) return;
      const hasAccess = await verifyClientAccess(req, body.clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      const exemption = await storage.createEstateExemption(body);
      res.json(exemption);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/estate-planning/exemptions/:id", requireAuth, async (req, res) => {
    try {
      const body = validateBody(updateExemptionSchema, req, res);
      if (!body) return;
      const existing = await storage.getEstateExemption(p(req.params.id));
      if (!existing) return res.status(404).json({ message: "Exemption record not found" });
      const hasAccess = await verifyClientAccess(req, existing.clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      const exemption = await storage.updateEstateExemption(p(req.params.id), body);
      res.json(exemption);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/estate-planning/gifts", requireAuth, async (req, res) => {
    try {
      const body = validateBody(createGiftSchema, req, res);
      if (!body) return;
      const hasAccess = await verifyClientAccess(req, body.clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      const gift = await storage.createGiftHistoryEntry(body);
      res.json(gift);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/estate-planning/gifts/:id", requireAuth, async (req, res) => {
    try {
      const gift = await storage.getGiftHistoryEntry(p(req.params.id));
      if (!gift) return res.status(404).json({ message: "Gift not found" });
      const hasAccess = await verifyClientAccess(req, gift.clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      await storage.deleteGiftHistoryEntry(p(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/estate-planning/trust-types", requireAuth, async (_req, res) => {
    res.json(TRUST_TYPE_INFO);
  });

  app.post("/api/estate-planning/compute-tax", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        totalEstateValue: z.number(),
        maritalDeduction: z.number().optional().default(0),
        charitableDeduction: z.number().optional().default(0),
        lifetimeGiftsUsed: z.number().optional().default(0),
        isMarried: z.boolean().optional().default(false),
        spouseExemptionPortability: z.number().optional().default(0),
      });
      const body = validateBody(schema, req, res);
      if (!body) return;

      const input: EstateTaxInput = {
        totalEstateValue: body.totalEstateValue,
        maritalDeduction: body.maritalDeduction,
        charitableDeduction: body.charitableDeduction,
        lifetimeGiftsUsed: body.lifetimeGiftsUsed,
        isMarried: body.isMarried,
        spouseExemptionPortability: body.spouseExemptionPortability,
      };

      const estateTax = computeEstateTax(input);
      const sunsetComparison = computeSunsetComparison(input);

      res.json({ estateTax, sunsetComparison });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/estate-planning/compute-grat", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        fundedValue: z.number(),
        termYears: z.number().min(1).max(30),
        section7520Rate: z.number().min(0).max(0.2),
        annuityRate: z.number().min(0).max(1).optional(),
        assumedGrowthRate: z.number().min(0).max(0.5).optional().default(0.07),
      });
      const body = validateBody(schema, req, res);
      if (!body) return;

      const mockTrust = {
        fundedValue: String(body.fundedValue),
        termYears: body.termYears,
        section7520Rate: String(body.section7520Rate),
        annuityRate: body.annuityRate ? String(body.annuityRate) : undefined,
        trustType: "GRAT",
      } as Trust;

      const analysis = computeGRATAnalysis(mockTrust, body.assumedGrowthRate);
      res.json(analysis);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/estate-planning/sunset-info", requireAuth, async (_req, res) => {
    const now = new Date();
    const daysToSunset = Math.max(0, Math.ceil((TCJA_SUNSET_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    res.json({
      sunsetDate: TCJA_SUNSET_DATE.toISOString().split("T")[0],
      daysRemaining: daysToSunset,
      currentExemption: CURRENT_EXEMPTION_2024,
      postSunsetExemption: POST_SUNSET_EXEMPTION,
      exemptionReduction: CURRENT_EXEMPTION_2024 - POST_SUNSET_EXEMPTION,
      annualExclusion: ANNUAL_EXCLUSION_2024,
      gstExemption: GST_EXEMPTION_2024,
    });
  });
}

function generateRecommendations(
  client: any,
  totalAUM: number,
  clientTrusts: any[],
  remainingExemption: number,
  daysToSunset: number
): Array<{ priority: string; title: string; description: string; category: string }> {
  const recs: Array<{ priority: string; title: string; description: string; category: string }> = [];
  const trustTypes = new Set(clientTrusts.map(t => t.trustType));

  if (daysToSunset > 0 && daysToSunset <= 365 && remainingExemption > 1000000) {
    recs.push({
      priority: "high",
      title: "Utilize Remaining Exemption Before TCJA Sunset",
      description: `$${(remainingExemption / 1e6).toFixed(1)}M of federal estate tax exemption remains unused. The TCJA sunset in ${daysToSunset} days could reduce the exemption by ~$6.6M. Consider accelerating gifting strategies.`,
      category: "sunset",
    });
  }

  if (totalAUM > 5000000 && !trustTypes.has("GRAT")) {
    recs.push({
      priority: totalAUM > 10000000 ? "high" : "medium",
      title: "Consider GRAT for Appreciating Assets",
      description: "A Grantor Retained Annuity Trust can transfer future appreciation to heirs with minimal gift tax cost, especially in a low interest rate environment.",
      category: "trust_strategy",
    });
  }

  if (totalAUM > 10000000 && !trustTypes.has("SLAT")) {
    recs.push({
      priority: "medium",
      title: "Evaluate Spousal Lifetime Access Trust (SLAT)",
      description: "A SLAT can remove assets from the taxable estate while maintaining indirect access through the spouse beneficiary.",
      category: "trust_strategy",
    });
  }

  if (totalAUM > 3000000 && !trustTypes.has("ILIT") && !trustTypes.has("ilit")) {
    recs.push({
      priority: "medium",
      title: "Life Insurance Trust for Estate Liquidity",
      description: "An ILIT can provide tax-free liquidity for estate tax payments and equalize inheritances without increasing the taxable estate.",
      category: "trust_strategy",
    });
  }

  if (totalAUM > 2000000 && clientTrusts.length === 0) {
    recs.push({
      priority: "high",
      title: "Establish Basic Estate Plan with Revocable Trust",
      description: "No trust structures detected for this high-value estate. A revocable living trust is the foundation of proper estate planning.",
      category: "foundation",
    });
  }

  if (totalAUM > 20000000 && !trustTypes.has("DYNASTY")) {
    recs.push({
      priority: "medium",
      title: "Multi-Generational Dynasty Trust",
      description: "For ultra-high net worth estates, a dynasty trust can transfer wealth across multiple generations while minimizing transfer taxes at each generational level.",
      category: "trust_strategy",
    });
  }

  return recs;
}
