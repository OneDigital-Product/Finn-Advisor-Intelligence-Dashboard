import type { Express } from "express";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "./middleware";
import { storage } from "../storage";
import { calculateRMD } from "../calculators/rmd-calculator";
import { sanitizeErrorMessage } from "../lib/error-utils";
import {
  insertCharitableAccountSchema,
  insertCharitableContributionSchema,
  insertCharitableGrantSchema,
  insertCharitableGoalSchema,
} from "@shared/schema";

const updateAccountSchema = insertCharitableAccountSchema.partial().omit({ clientId: true, advisorId: true });
const updateGoalSchema = insertCharitableGoalSchema.partial().omit({ clientId: true });

const crtModelSchema = z.object({
  fundedAmount: z.number(),
  termYears: z.number(),
  payoutRate: z.number(),
  section7520Rate: z.number(),
  assumedGrowthRate: z.number(),
  trustType: z.enum(["CRAT", "CRUT"]),
  taxBracket: z.number().optional(),
});

async function verifyClientOwnership(clientId: string, advisorId: string): Promise<boolean> {
  const client = await storage.getClient(clientId);
  return !!client && client.advisorId === advisorId;
}

async function verifyAccountOwnership(accountId: string, advisorId: string): Promise<boolean> {
  const account = await storage.getCharitableAccount(accountId);
  return !!account && account.advisorId === advisorId;
}

/** Normalize Express param to string */
function p(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v || "";
}

export function registerPhilanthropyRoutes(app: Express) {
  app.get("/api/clients/:clientId/philanthropy", requireAuth, async (req, res) => {
    try {
      const clientId = p(req.params.clientId);
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "Not authenticated" });
      if (!(await verifyClientOwnership(clientId, advisor.id))) {
        return res.status(403).json({ error: "Access denied" });
      }

      const [accounts, goals] = await Promise.all([
        storage.getCharitableAccountsByClient(clientId),
        storage.getCharitableGoalsByClient(clientId),
      ]);

      const accountsWithDetails = await Promise.all(
        accounts.map(async (account) => {
          const [contributions, grants] = await Promise.all([
            storage.getContributionsByAccount(account.id),
            storage.getGrantsByAccount(account.id),
          ]);
          return { ...account, contributions, grants };
        })
      );

      const allContributions = accountsWithDetails.flatMap(a => a.contributions);
      const allGrants = accountsWithDetails.flatMap(a => a.grants);
      const totalContributions = allContributions.reduce((sum, c) => sum + parseFloat(c.amount || "0"), 0);
      const totalGiving = allGrants.reduce((sum, g) => sum + parseFloat(g.amount || "0"), 0);
      const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.currentBalance || "0"), 0);
      const totalTaxDeductions = allContributions.reduce((sum, c) => sum + parseFloat(c.taxDeductionAmount || "0"), 0);

      res.json({
        accounts: accountsWithDetails,
        goals,
        summary: {
          totalGiving,
          totalContributions,
          totalBalance,
          totalTaxDeductions,
          activeAccounts: accounts.filter(a => a.status === "active").length,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: sanitizeErrorMessage(error, "Failed to fetch philanthropy data") });
    }
  });

  app.post("/api/philanthropy/accounts", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "Not authenticated" });

      const data = insertCharitableAccountSchema.parse({ ...req.body, advisorId: advisor.id });
      if (!(await verifyClientOwnership(data.clientId, advisor.id))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const account = await storage.createCharitableAccount(data);
      res.json(account);
    } catch (error: any) {
      res.status(400).json({ error: sanitizeErrorMessage(error, "Failed to create charitable account") });
    }
  });

  app.patch("/api/philanthropy/accounts/:id", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "Not authenticated" });
      if (!(await verifyAccountOwnership(p(req.params.id), advisor.id))) {
        return res.status(403).json({ error: "Access denied" });
      }

      const data = updateAccountSchema.parse(req.body);
      const account = await storage.updateCharitableAccount(p(req.params.id), data);
      if (!account) return res.status(404).json({ error: "Account not found" });
      res.json(account);
    } catch (error: any) {
      res.status(400).json({ error: sanitizeErrorMessage(error, "Failed to update charitable account") });
    }
  });

  app.delete("/api/philanthropy/accounts/:id", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "Not authenticated" });
      if (!(await verifyAccountOwnership(p(req.params.id), advisor.id))) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.deleteCharitableAccount(p(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: sanitizeErrorMessage(error, "Failed to delete charitable account") });
    }
  });

  app.post("/api/philanthropy/contributions", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "Not authenticated" });

      const data = insertCharitableContributionSchema.parse(req.body);
      if (!(await verifyAccountOwnership(data.accountId, advisor.id))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const contribution = await storage.createCharitableContribution(data);
      res.json(contribution);
    } catch (error: any) {
      res.status(400).json({ error: sanitizeErrorMessage(error, "Failed to create contribution") });
    }
  });

  app.delete("/api/philanthropy/contributions/:id", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "Not authenticated" });

      await storage.deleteCharitableContribution(p(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: sanitizeErrorMessage(error, "Failed to delete contribution") });
    }
  });

  app.post("/api/philanthropy/grants", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "Not authenticated" });

      const data = insertCharitableGrantSchema.parse(req.body);
      if (!(await verifyAccountOwnership(data.accountId, advisor.id))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const grant = await storage.createCharitableGrant(data);
      res.json(grant);
    } catch (error: any) {
      res.status(400).json({ error: sanitizeErrorMessage(error, "Failed to create grant") });
    }
  });

  app.delete("/api/philanthropy/grants/:id", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "Not authenticated" });

      await storage.deleteCharitableGrant(p(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: sanitizeErrorMessage(error, "Failed to delete grant") });
    }
  });

  app.post("/api/philanthropy/goals", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "Not authenticated" });

      const data = insertCharitableGoalSchema.parse(req.body);
      if (!(await verifyClientOwnership(data.clientId, advisor.id))) {
        return res.status(403).json({ error: "Access denied" });
      }
      const goal = await storage.createCharitableGoal(data);
      res.json(goal);
    } catch (error: any) {
      res.status(400).json({ error: sanitizeErrorMessage(error, "Failed to create charitable goal") });
    }
  });

  app.patch("/api/philanthropy/goals/:id", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "Not authenticated" });

      const existing = await storage.getCharitableGoal(p(req.params.id));
      if (!existing) return res.status(404).json({ error: "Goal not found" });
      if (!(await verifyClientOwnership(existing.clientId, advisor.id))) {
        return res.status(403).json({ error: "Access denied" });
      }

      const data = updateGoalSchema.parse(req.body);
      const goal = await storage.updateCharitableGoal(p(req.params.id), data);
      res.json(goal);
    } catch (error: any) {
      res.status(400).json({ error: sanitizeErrorMessage(error, "Failed to update charitable goal") });
    }
  });

  app.delete("/api/philanthropy/goals/:id", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "Not authenticated" });

      const existing = await storage.getCharitableGoal(p(req.params.id));
      if (!existing) return res.status(404).json({ error: "Goal not found" });
      if (!(await verifyClientOwnership(existing.clientId, advisor.id))) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.deleteCharitableGoal(p(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: sanitizeErrorMessage(error, "Failed to delete charitable goal") });
    }
  });

  app.post("/api/philanthropy/crt-model", requireAuth, async (req, res) => {
    try {
      const data = crtModelSchema.parse(req.body);
      const {
        fundedAmount,
        termYears,
        payoutRate,
        section7520Rate,
        assumedGrowthRate,
        trustType,
        taxBracket = 0.37,
      } = data;

      const projections = [];
      let remainingValue = fundedAmount;

      for (let year = 1; year <= termYears; year++) {
        const annualPayout = trustType === "CRAT"
          ? fundedAmount * payoutRate
          : remainingValue * payoutRate;

        const growthOnRemaining = (remainingValue - annualPayout) * assumedGrowthRate;
        remainingValue = remainingValue - annualPayout + growthOnRemaining;

        projections.push({
          year,
          annualPayout: Math.round(annualPayout * 100) / 100,
          remainingValue: Math.round(Math.max(0, remainingValue) * 100) / 100,
        });
      }

      const totalPayouts = projections.reduce((s, p) => s + p.annualPayout, 0);
      const remainderValue = Math.max(0, projections[projections.length - 1]?.remainingValue || 0);

      const annuityFactor = (1 - Math.pow(1 + section7520Rate, -termYears)) / section7520Rate;
      const presentValueOfIncome = (fundedAmount * payoutRate) * annuityFactor;
      const charitableDeduction = Math.max(0, fundedAmount - presentValueOfIncome);
      const taxSavings = charitableDeduction * taxBracket;

      res.json({
        projections,
        summary: {
          fundedAmount,
          totalPayouts: Math.round(totalPayouts * 100) / 100,
          remainderValue: Math.round(remainderValue * 100) / 100,
          charitableDeduction: Math.round(charitableDeduction * 100) / 100,
          taxSavings: Math.round(taxSavings * 100) / 100,
          effectivePayoutRate: payoutRate * 100,
        },
      });
    } catch (error: any) {
      res.status(400).json({ error: sanitizeErrorMessage(error, "Failed to calculate CRT model") });
    }
  });

  app.post("/api/philanthropy/qcd-analysis", requireAuth, async (req, res) => {
    try {
      const { accountHolderDOB, accountBalance, taxYear, assumedGrowthRate, qcdAmount, marginalTaxRate } = req.body;

      if (!accountHolderDOB || !accountBalance || !taxYear) {
        return res.status(400).json({ error: "accountHolderDOB, accountBalance, and taxYear are required" });
      }

      const rmdResult = calculateRMD({
        accountHolderDOB,
        accountBalance,
        taxYear,
        assumedGrowthRate: assumedGrowthRate || 0.05,
        qcdAmount: qcdAmount || 0,
        marginalTaxRate: marginalTaxRate || 0.37,
        projectionYears: 10,
      });

      res.json(rmdResult);
    } catch (error: any) {
      res.status(400).json({ error: sanitizeErrorMessage(error, "Failed to run QCD analysis") });
    }
  });
}
