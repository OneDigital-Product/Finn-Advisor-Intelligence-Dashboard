import type { Express } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";
import { validateBody } from "../lib/validation";
import { requireAuth, getSessionAdvisor } from "./middleware";
import { storage } from "../storage";
import { calculateCharitableTaxImpact, type CharitableTaxInput, type ContributionInput } from "../calculators/charitable-tax-calculator";

const createDafAccountSchema = z.object({
  clientId: z.string(),
  advisorId: z.string(),
  sponsorOrganization: z.string(),
  accountName: z.string(),
  currentBalance: z.string().optional(),
  totalContributions: z.string().optional(),
  totalGrants: z.string().optional(),
  taxDeductionsTaken: z.string().optional(),
  dateOpened: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

const createDafTransactionSchema = z.object({
  dafAccountId: z.string(),
  transactionType: z.string(),
  amount: z.string(),
  recipientOrg: z.string().optional(),
  description: z.string().optional(),
  transactionDate: z.string(),
  taxYear: z.number().optional(),
});

const createCrtSchema = z.object({
  clientId: z.string(),
  advisorId: z.string(),
  trustName: z.string(),
  crtType: z.string(),
  fundedValue: z.string().optional(),
  currentValue: z.string().optional(),
  payoutRate: z.string().optional(),
  termYears: z.number().optional(),
  charitableBeneficiary: z.string().optional(),
  incomeBeneficiary: z.string().optional(),
  projectedAnnualIncome: z.string().optional(),
  charitableDeduction: z.string().optional(),
  dateEstablished: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

const updateCrtSchema = z.object({
  trustName: z.string().optional(),
  currentValue: z.string().optional(),
  payoutRate: z.string().optional(),
  charitableBeneficiary: z.string().optional(),
  incomeBeneficiary: z.string().optional(),
  projectedAnnualIncome: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

const createQcdSchema = z.object({
  clientId: z.string(),
  advisorId: z.string(),
  iraAccountId: z.string().optional(),
  charityName: z.string(),
  amount: z.string(),
  distributionDate: z.string(),
  taxYear: z.number(),
  rmdSatisfied: z.string().optional(),
  taxSavingsEstimate: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

async function verifyClientAccess(req: any, clientId: string): Promise<boolean> {
  const advisor = await getSessionAdvisor(req);
  if (!advisor) return false;
  const client = await storage.getClient(clientId);
  if (!client) return false;
  return client.advisorId === advisor.id;
}

function computeCrtProjections(fundedValue: number, payoutRate: number, termYears: number, crtType: string): {
  projectedAnnualIncome: number;
  totalProjectedIncome: number;
  charitableDeduction: number;
  remainderToCharity: number;
} {
  const section7520Rate = 0.052;
  const annualIncome = crtType === "CRAT"
    ? fundedValue * payoutRate
    : fundedValue * payoutRate;
  const totalIncome = annualIncome * termYears;
  const remainderFactor = Math.pow(1 + section7520Rate, -termYears);
  const charitableDeduction = fundedValue * remainderFactor;
  const growthRate = 0.06;
  const remainderToCharity = crtType === "CRUT"
    ? fundedValue * Math.pow(1 + growthRate - payoutRate, termYears)
    : Math.max(0, fundedValue - totalIncome);

  return {
    projectedAnnualIncome: Math.round(annualIncome),
    totalProjectedIncome: Math.round(totalIncome),
    charitableDeduction: Math.round(charitableDeduction),
    remainderToCharity: Math.round(Math.max(0, remainderToCharity)),
  };
}

export function registerPhilanthropicRoutes(app: Express) {
  app.get("/api/clients/:clientId/philanthropic", requireAuth, async (req, res) => {
    try {
      const clientId = req.params.clientId as string;
      const hasAccess = await verifyClientAccess(req, clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });

      const [dafAccountsList, crts, qcds] = await Promise.all([
        storage.getDafAccountsByClient(clientId),
        storage.getCrtsByClient(clientId),
        storage.getQcdRecordsByClient(clientId),
      ]);

      const dafAccountsWithTxns = await Promise.all(
        dafAccountsList.map(async (acct) => {
          const transactions = await storage.getDafTransactions(acct.id);
          return { ...acct, transactions };
        })
      );

      const crtsWithProjections = crts.map(crt => {
        const fundedValue = parseFloat(String(crt.fundedValue || "0"));
        const payoutRate = parseFloat(String(crt.payoutRate || "0.05"));
        const termYears = crt.termYears || 20;
        const projections = computeCrtProjections(fundedValue, payoutRate, termYears, crt.crtType);
        return { ...crt, projections };
      });

      const totalDafBalance = dafAccountsList.reduce((s, a) => s + parseFloat(String(a.currentBalance || "0")), 0);
      const totalDafContributions = dafAccountsList.reduce((s, a) => s + parseFloat(String(a.totalContributions || "0")), 0);
      const totalDafGrants = dafAccountsList.reduce((s, a) => s + parseFloat(String(a.totalGrants || "0")), 0);
      const totalCrtValue = crts.reduce((s, c) => s + parseFloat(String(c.currentValue || c.fundedValue || "0")), 0);
      const totalQcdAmount = qcds.reduce((s, q) => s + parseFloat(String(q.amount || "0")), 0);
      const totalTaxSavings = qcds.reduce((s, q) => s + parseFloat(String(q.taxSavingsEstimate || "0")), 0);

      const currentYear = new Date().getFullYear();
      const currentYearQcds = qcds.filter(q => q.taxYear === currentYear);
      const currentYearQcdTotal = currentYearQcds.reduce((s, q) => s + parseFloat(String(q.amount || "0")), 0);
      const qcdAnnualLimit = 105000;

      res.json({
        dafAccounts: dafAccountsWithTxns,
        charitableRemainderTrusts: crtsWithProjections,
        qcdRecords: qcds,
        summary: {
          totalDafBalance,
          totalDafContributions,
          totalDafGrants,
          totalCrtValue,
          totalQcdAmount,
          totalTaxSavings,
          dafAccountCount: dafAccountsList.length,
          crtCount: crts.length,
          qcdCount: qcds.length,
          currentYearQcdTotal,
          qcdAnnualLimit,
          qcdRemainingCapacity: Math.max(0, qcdAnnualLimit - currentYearQcdTotal),
          totalPhilanthropicValue: totalDafBalance + totalCrtValue,
        },
      });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/philanthropic/daf-accounts", requireAuth, async (req, res) => {
    try {
      const body = validateBody(createDafAccountSchema, req, res);
      if (!body) return;
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });
      const hasAccess = await verifyClientAccess(req, body.clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      body.advisorId = advisor.id;
      const account = await storage.createDafAccount(body);
      res.json(account);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/philanthropic/daf-accounts/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getDafAccount(req.params.id as string);
      if (!existing) return res.status(404).json({ message: "DAF account not found" });
      const hasAccess = await verifyClientAccess(req, existing.clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      await storage.deleteDafAccount(req.params.id as string);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/philanthropic/daf-transactions", requireAuth, async (req, res) => {
    try {
      const body = validateBody(createDafTransactionSchema, req, res);
      if (!body) return;
      const dafAccount = await storage.getDafAccount(body.dafAccountId);
      if (!dafAccount) return res.status(404).json({ message: "DAF account not found" });
      const hasAccess = await verifyClientAccess(req, dafAccount.clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      const txn = await storage.createDafTransaction(body);

      const amount = parseFloat(body.amount);
      const currentBalance = parseFloat(String(dafAccount.currentBalance || "0"));
      const totalContributions = parseFloat(String(dafAccount.totalContributions || "0"));
      const totalGrants = parseFloat(String(dafAccount.totalGrants || "0"));
      const taxDeductions = parseFloat(String(dafAccount.taxDeductionsTaken || "0"));

      if (body.transactionType === "contribution") {
        await storage.updateDafAccount(dafAccount.id, {
          currentBalance: String(currentBalance + amount),
          totalContributions: String(totalContributions + amount),
          taxDeductionsTaken: String(taxDeductions + amount),
        } as any);
      } else if (body.transactionType === "grant") {
        await storage.updateDafAccount(dafAccount.id, {
          currentBalance: String(Math.max(0, currentBalance - amount)),
          totalGrants: String(totalGrants + amount),
        } as any);
      }

      res.json(txn);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/philanthropic/crts", requireAuth, async (req, res) => {
    try {
      const body = validateBody(createCrtSchema, req, res);
      if (!body) return;
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });
      const hasAccess = await verifyClientAccess(req, body.clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      body.advisorId = advisor.id;
      const crt = await storage.createCrt(body);
      res.json(crt);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/philanthropic/crts/:id", requireAuth, async (req, res) => {
    try {
      const body = validateBody(updateCrtSchema, req, res);
      if (!body) return;
      const existing = await storage.getCrt(req.params.id as string);
      if (!existing) return res.status(404).json({ message: "CRT not found" });
      const hasAccess = await verifyClientAccess(req, existing.clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      const result = await storage.updateCrt(req.params.id as string, body);
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/philanthropic/crts/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getCrt(req.params.id as string);
      if (!existing) return res.status(404).json({ message: "CRT not found" });
      const hasAccess = await verifyClientAccess(req, existing.clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      await storage.deleteCrt(req.params.id as string);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/philanthropic/qcds", requireAuth, async (req, res) => {
    try {
      const body = validateBody(createQcdSchema, req, res);
      if (!body) return;
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });
      const hasAccess = await verifyClientAccess(req, body.clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      body.advisorId = advisor.id;
      const qcd = await storage.createQcdRecord(body);
      res.json(qcd);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/philanthropic/qcds/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getQcdRecord(req.params.id as string);
      if (!existing) return res.status(404).json({ message: "QCD record not found" });
      const hasAccess = await verifyClientAccess(req, existing.clientId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      await storage.deleteQcdRecord(req.params.id as string);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  const charitableTaxInputSchema = z.object({
    agi: z.number().min(0),
    filingStatus: z.enum(["single", "married_filing_jointly"]),
    contributions: z.array(z.object({
      amount: z.number().min(0),
      type: z.enum(["cash_public", "appreciated_property", "private_foundation"]),
    })),
    priorCarryforward: z.array(z.object({
      year: z.number(),
      amount: z.number(),
      type: z.string(),
      expiresYear: z.number(),
    })).optional(),
    rmdAmount: z.number().optional(),
    age: z.number().optional(),
    standardDeductionOverride: z.number().optional(),
    section7520Rate: z.number().optional(),
    crtFundedValue: z.number().optional(),
    crtPayoutRate: z.number().optional(),
    crtTermYears: z.number().optional(),
    crtType: z.enum(["CRAT", "CRUT"]).optional(),
  });

  app.post("/api/philanthropic/tax-impact", requireAuth, async (req, res) => {
    try {
      const body = validateBody(charitableTaxInputSchema, req, res);
      if (!body) return;
      const result = calculateCharitableTaxImpact(body as CharitableTaxInput);
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });
}
