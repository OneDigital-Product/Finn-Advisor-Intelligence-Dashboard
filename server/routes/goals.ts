import type { Express } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";
import { requireAuth, getSessionAdvisor } from "./middleware";
import { storage } from "../storage";

const createGoalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  targetAmount: z.coerce.number().positive("Target amount must be positive"),
  currentAmount: z.coerce.number().min(0).default(0),
  timeHorizonYears: z.coerce.number().int().min(1).max(50),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  bucket: z.coerce.number().int().min(1).max(3),
  linkedAccountIds: z.array(z.string()).default([]),
  notes: z.string().nullable().optional(),
});

const updateGoalSchema = createGoalSchema.partial();

export function registerGoalRoutes(app: Express) {
  app.get("/api/clients/:clientId/goals", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });
      const client = await storage.getClient(req.params.clientId);
      if (!client || client.advisorId !== advisor.id) return res.status(403).json({ message: "Forbidden" });
      const goals = await storage.getFinancialGoalsByClient(req.params.clientId);
      res.json(goals);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/clients/:clientId/goals", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });
      const client = await storage.getClient(req.params.clientId);
      if (!client || client.advisorId !== advisor.id) return res.status(403).json({ message: "Forbidden" });

      const parsed = createGoalSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const { name, targetAmount, currentAmount, timeHorizonYears, priority, bucket, linkedAccountIds, notes } = parsed.data;

      const goal = await storage.createFinancialGoal({
        clientId: req.params.clientId,
        name,
        targetAmount: String(targetAmount),
        currentAmount: String(currentAmount),
        timeHorizonYears,
        priority,
        bucket,
        linkedAccountIds,
        notes: notes || null,
        status: "active",
      });
      res.json(goal);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/clients/:clientId/goals/:goalId", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });
      const client = await storage.getClient(req.params.clientId);
      if (!client || client.advisorId !== advisor.id) return res.status(403).json({ message: "Forbidden" });
      const goal = await storage.getFinancialGoal(req.params.goalId);
      if (!goal || goal.clientId !== req.params.clientId) return res.status(404).json({ message: "Goal not found" });

      const parsed = updateGoalSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const updates: Record<string, any> = {};
      const data = parsed.data;
      if (data.name !== undefined) updates.name = data.name;
      if (data.targetAmount !== undefined) updates.targetAmount = String(data.targetAmount);
      if (data.currentAmount !== undefined) updates.currentAmount = String(data.currentAmount);
      if (data.timeHorizonYears !== undefined) updates.timeHorizonYears = data.timeHorizonYears;
      if (data.priority !== undefined) updates.priority = data.priority;
      if (data.bucket !== undefined) updates.bucket = data.bucket;
      if (data.linkedAccountIds !== undefined) updates.linkedAccountIds = data.linkedAccountIds;
      if (data.notes !== undefined) updates.notes = data.notes;
      if (req.body.status !== undefined) updates.status = req.body.status;

      const updated = await storage.updateFinancialGoal(req.params.goalId, updates);
      res.json(updated);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/clients/:clientId/goals/:goalId", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });
      const client = await storage.getClient(req.params.clientId);
      if (!client || client.advisorId !== advisor.id) return res.status(403).json({ message: "Forbidden" });
      const goal = await storage.getFinancialGoal(req.params.goalId);
      if (!goal || goal.clientId !== req.params.clientId) return res.status(404).json({ message: "Goal not found" });
      await storage.deleteFinancialGoal(req.params.goalId);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/goals/dashboard", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });

      const allGoals = await storage.getFinancialGoalsByAdvisor(advisor.id);
      const totalTarget = allGoals.reduce((s, g) => s + parseFloat(g.targetAmount), 0);
      const totalCurrent = allGoals.reduce((s, g) => s + parseFloat(g.currentAmount), 0);
      const aggregateFundedRatio = totalTarget > 0 ? Math.min(100, (totalCurrent / totalTarget) * 100) : 0;

      const byBucket = [1, 2, 3].map(b => {
        const bucketGoals = allGoals.filter(g => g.bucket === b);
        const target = bucketGoals.reduce((s, g) => s + parseFloat(g.targetAmount), 0);
        const current = bucketGoals.reduce((s, g) => s + parseFloat(g.currentAmount), 0);
        return {
          bucket: b,
          goalsCount: bucketGoals.length,
          totalTarget: target,
          totalCurrent: current,
          fundedRatio: target > 0 ? Math.min(100, (current / target) * 100) : 0,
        };
      });

      const clientIds = [...new Set(allGoals.map(g => g.clientId))];

      res.json({
        totalGoals: allGoals.length,
        clientsWithGoals: clientIds.length,
        aggregateFundedRatio,
        totalTarget,
        totalCurrent,
        byBucket,
      });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/clients/:clientId/bucket-analysis", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });
      const client = await storage.getClient(req.params.clientId);
      if (!client || client.advisorId !== advisor.id) return res.status(403).json({ message: "Forbidden" });

      const goals = await storage.getFinancialGoalsByClient(req.params.clientId);
      const accounts = await storage.getAccountsByClient(req.params.clientId);

      const allHoldings = [];
      for (const account of accounts) {
        const h = await storage.getHoldingsByAccount(account.id);
        allHoldings.push(...h.map(holding => ({ ...holding, accountId: account.id })));
      }

      const totalPortfolio = accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);

      const cashTickers = ["CASH", "SPAXX", "FDRXX", "VMFXX", "SWVXX", "BIL", "SHV", "SGOV"];
      const bondTickers = ["AGG", "BND", "VBTLX", "TLT", "IEF", "LQD", "HYG", "MUB", "TIP", "VCIT", "VCSH", "BSV"];
      const equityTickers = ["SPY", "VOO", "VTI", "QQQ", "IWM", "VEA", "VWO", "EFA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA"];

      let cashValue = 0;
      let bondValue = 0;
      let equityValue = 0;

      for (const holding of allHoldings) {
        const mv = parseFloat(holding.marketValue);
        const ticker = holding.ticker.toUpperCase();
        const sector = (holding.sector || "").toLowerCase();

        if (cashTickers.includes(ticker) || sector === "cash" || sector === "money market") {
          cashValue += mv;
        } else if (bondTickers.includes(ticker) || sector === "fixed income" || sector === "bonds" || ticker.includes("BOND")) {
          bondValue += mv;
        } else {
          equityValue += mv;
        }
      }

      const totalHoldings = cashValue + bondValue + equityValue;
      const unallocatedCash = Math.max(0, totalPortfolio - totalHoldings);
      cashValue += unallocatedCash;

      const bucket1Target = goals.filter(g => g.bucket === 1).reduce((s, g) => s + parseFloat(g.targetAmount), 0);
      const bucket2Target = goals.filter(g => g.bucket === 2).reduce((s, g) => s + parseFloat(g.targetAmount), 0);
      const bucket3Target = goals.filter(g => g.bucket === 3).reduce((s, g) => s + parseFloat(g.targetAmount), 0);
      const totalTarget = bucket1Target + bucket2Target + bucket3Target;

      const suggestions: string[] = [];
      const bucket1Pct = totalPortfolio > 0 ? (cashValue / totalPortfolio) * 100 : 0;
      const bucket2Pct = totalPortfolio > 0 ? (bondValue / totalPortfolio) * 100 : 0;
      const bucket3Pct = totalPortfolio > 0 ? (equityValue / totalPortfolio) * 100 : 0;

      const bucket1TargetPct = totalTarget > 0 ? (bucket1Target / totalTarget) * 100 : 15;
      const bucket2TargetPct = totalTarget > 0 ? (bucket2Target / totalTarget) * 100 : 35;
      const bucket3TargetPct = totalTarget > 0 ? (bucket3Target / totalTarget) * 100 : 50;

      if (Math.abs(bucket1Pct - bucket1TargetPct) > 5) {
        suggestions.push(bucket1Pct > bucket1TargetPct
          ? `Bucket 1 (Cash) is overweight by ${(bucket1Pct - bucket1TargetPct).toFixed(1)}%. Consider moving funds to growth buckets.`
          : `Bucket 1 (Cash) is underweight by ${(bucket1TargetPct - bucket1Pct).toFixed(1)}%. Consider increasing cash reserves for near-term needs.`);
      }
      if (Math.abs(bucket2Pct - bucket2TargetPct) > 5) {
        suggestions.push(bucket2Pct > bucket2TargetPct
          ? `Bucket 2 (Bonds) is overweight by ${(bucket2Pct - bucket2TargetPct).toFixed(1)}%. Consider rebalancing to equities for growth.`
          : `Bucket 2 (Bonds) is underweight by ${(bucket2TargetPct - bucket2Pct).toFixed(1)}%. Consider adding intermediate-term bond allocations.`);
      }
      if (Math.abs(bucket3Pct - bucket3TargetPct) > 5) {
        suggestions.push(bucket3Pct > bucket3TargetPct
          ? `Bucket 3 (Growth) is overweight by ${(bucket3Pct - bucket3TargetPct).toFixed(1)}%. Consider de-risking to protect near-term goals.`
          : `Bucket 3 (Growth) is underweight by ${(bucket3TargetPct - bucket3Pct).toFixed(1)}%. Consider increasing equity exposure for long-term goals.`);
      }

      const aggregateFundedRatio = totalTarget > 0 ? Math.min(100, (totalPortfolio / totalTarget) * 100) : (totalPortfolio > 0 ? 100 : 0);

      res.json({
        totalPortfolio,
        buckets: [
          {
            id: 1,
            name: "Cash & Short-Term",
            description: "1-2 year needs",
            currentValue: cashValue,
            targetValue: bucket1Target,
            currentPct: bucket1Pct,
            targetPct: bucket1TargetPct,
            fundedRatio: bucket1Target > 0 ? Math.min(100, (cashValue / bucket1Target) * 100) : (cashValue > 0 ? 100 : 0),
          },
          {
            id: 2,
            name: "Bonds & Intermediate",
            description: "3-7 year needs",
            currentValue: bondValue,
            targetValue: bucket2Target,
            currentPct: bucket2Pct,
            targetPct: bucket2TargetPct,
            fundedRatio: bucket2Target > 0 ? Math.min(100, (bondValue / bucket2Target) * 100) : (bondValue > 0 ? 100 : 0),
          },
          {
            id: 3,
            name: "Equities & Growth",
            description: "8+ year needs",
            currentValue: equityValue,
            targetValue: bucket3Target,
            currentPct: bucket3Pct,
            targetPct: bucket3TargetPct,
            fundedRatio: bucket3Target > 0 ? Math.min(100, (equityValue / bucket3Target) * 100) : (equityValue > 0 ? 100 : 0),
          },
        ],
        aggregateFundedRatio,
        suggestions,
        goalsCount: goals.length,
      });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });
}
