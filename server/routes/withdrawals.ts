import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { logger } from "../lib/logger";
import { requireAuth } from "./middleware";
import { getSessionAdvisor } from "./middleware";
import { validateBody } from "../lib/validation";
import { getActiveCRM, getActivePortfolio } from "../integrations/adapters";
import { generateEclipseImportFile } from "../integrations/eclipse/import-generator";
import { calculateWithdrawalAnalysis, type WithdrawalAnalysisInput } from "../calculators/withdrawal-analysis-calculator";

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["nwr_applied", "sf_case_created", "eclipse_generated", "cancelled"],
  nwr_applied: ["sf_case_created", "eclipse_generated", "completed", "cancelled"],
  sf_case_created: ["eclipse_generated", "completed", "cancelled"],
  eclipse_generated: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

function canTransition(from: string, to: string): boolean {
  return (VALID_TRANSITIONS[from] || []).includes(to);
}

const CRM_STATUS_TO_WITHDRAWAL: Record<string, string | null> = {
  "New": null,
  "Working": null,
  "Escalated": null,
  "Closed": "completed",
  "Closed - Cancelled": "cancelled",
  "Open": null,
  "In Progress": null,
  "Resolved": "completed",
  "Cancelled": "cancelled",
};

function mapCrmStatusToWithdrawal(crmStatus: string): string | null {
  return CRM_STATUS_TO_WITHDRAWAL[crmStatus] ?? null;
}

const createWithdrawalSchema = z.object({
  clientId: z.string().min(1),
  accountId: z.string().min(1),
  amount: z.string().min(1).refine((v) => {
    const n = parseFloat(v);
    return !isNaN(n) && n > 0;
  }, { message: "Amount must be a positive number" }),
  method: z.enum(["ach", "wire", "check", "journal"]),
  reason: z.string().min(1),
  frequency: z.enum(["one_time", "monthly", "quarterly", "annually"]).default("one_time"),
  taxWithholding: z.string().optional().refine((v) => {
    if (!v) return true;
    const n = parseFloat(v);
    return !isNaN(n) && n >= 0 && n <= 100;
  }, { message: "Tax withholding must be between 0 and 100" }),
  notes: z.string().optional(),
});

async function authorizeWithdrawal(req: any, res: any, withdrawalId: string) {
  const advisor = await getSessionAdvisor(req);
  if (!advisor) {
    res.status(403).json({ message: "No advisor context" });
    return null;
  }

  const withdrawal = await storage.getWithdrawalRequest(withdrawalId);
  if (!withdrawal) {
    res.status(404).json({ message: "Withdrawal not found" });
    return null;
  }

  if (withdrawal.advisorId !== advisor.id) {
    res.status(403).json({ message: "Not authorized to access this withdrawal" });
    return null;
  }

  return { advisor, withdrawal };
}

/** Normalize Express param to string */
function p(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v || "";
}

export function registerWithdrawalRoutes(app: Express) {
  app.get("/api/withdrawals", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(403).json({ message: "No advisor context" });

      const status = req.query.status as string | undefined;
      const withdrawals = await storage.getWithdrawalRequests(advisor.id, status);

      const enriched = await Promise.all(withdrawals.map(async (w) => {
        const client = await storage.getClient(w.clientId);
        const accounts = await storage.getAccountsByClient(w.clientId);
        const account = accounts.find(a => a.id === w.accountId);
        return {
          ...w,
          clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown",
          accountNumber: account?.accountNumber || "Unknown",
          accountType: account?.accountType || "Unknown",
        };
      }));

      res.json(enriched);
    } catch (err) {
      logger.error({ err }, "Error fetching withdrawals");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/withdrawals/:id", requireAuth, async (req, res) => {
    try {
      const ctx = await authorizeWithdrawal(req, res, p(req.params.id));
      if (!ctx) return;

      const { withdrawal } = ctx;
      const client = await storage.getClient(withdrawal.clientId);
      const accounts = await storage.getAccountsByClient(withdrawal.clientId);
      const account = accounts.find(a => a.id === withdrawal.accountId);
      const auditLog = await storage.getWithdrawalAuditLog(withdrawal.id);

      res.json({
        ...withdrawal,
        clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown",
        accountNumber: account?.accountNumber || "Unknown",
        accountType: account?.accountType || "Unknown",
        auditLog,
      });
    } catch (err) {
      logger.error({ err }, "Error fetching withdrawal");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/withdrawals", requireAuth, async (req, res) => {
    try {
      const data = validateBody(createWithdrawalSchema, req, res);
      if (!data) return;

      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(403).json({ message: "No advisor context" });

      const client = await storage.getClient(data.clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });

      if (client.advisorId !== advisor.id) {
        return res.status(403).json({ message: "Not authorized to create withdrawals for this client" });
      }

      const accounts = await storage.getAccountsByClient(data.clientId);
      const account = accounts.find(a => a.id === data.accountId);
      if (!account) return res.status(404).json({ message: "Account not found" });

      const withdrawal = await storage.createWithdrawalRequest({
        advisorId: advisor.id,
        clientId: data.clientId,
        accountId: data.accountId,
        amount: data.amount,
        method: data.method,
        reason: data.reason,
        frequency: data.frequency,
        taxWithholding: data.taxWithholding || null,
        notes: data.notes || null,
        status: "pending",
      });

      await storage.createWithdrawalAuditEntry({
        withdrawalId: withdrawal.id,
        action: "request_created",
        performedBy: advisor.id,
        details: {
          amount: data.amount,
          method: data.method,
          reason: data.reason,
          accountNumber: account.accountNumber,
          clientName: `${client.firstName} ${client.lastName}`,
        },
      });

      logger.info({ withdrawalId: withdrawal.id }, "Withdrawal request created");
      res.status(201).json(withdrawal);
    } catch (err) {
      logger.error({ err }, "Error creating withdrawal");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/withdrawals/:id/set-aside", requireAuth, async (req, res) => {
    try {
      const ctx = await authorizeWithdrawal(req, res, p(req.params.id));
      if (!ctx) return;
      const { advisor, withdrawal } = ctx;

      if (!canTransition(withdrawal.status, "nwr_applied")) {
        return res.status(409).json({ message: `Cannot create set-aside from status '${withdrawal.status}'` });
      }

      if (withdrawal.orionSetAsideId) {
        return res.status(409).json({ message: "Set-aside already created for this withdrawal" });
      }

      const account = (await storage.getAccountsByClient(withdrawal.clientId))
        .find(a => a.id === withdrawal.accountId);

      const portfolio = getActivePortfolio();
      const setAsideResult = await portfolio.createSetAside({
        accountId: account?.orionAccountId || withdrawal.accountId,
        amount: parseFloat(withdrawal.amount),
        reason: withdrawal.reason,
        frequency: withdrawal.frequency,
      });

      const nwrResult = await portfolio.applyNwrTag(account?.orionAccountId || withdrawal.accountId);

      const updated = await storage.updateWithdrawalRequest(withdrawal.id, {
        orionSetAsideId: setAsideResult.setAsideId,
        orionNwrTagId: nwrResult.tagId,
        status: "nwr_applied",
      });

      await storage.createWithdrawalAuditEntry({
        withdrawalId: withdrawal.id,
        action: "orion_set_aside_created",
        performedBy: advisor.id,
        details: { setAsideId: setAsideResult.setAsideId, nwrTagId: nwrResult.tagId },
      });

      res.json(updated);
    } catch (err) {
      logger.error({ err }, "Error creating set-aside");
      res.status(500).json({ message: "Failed to create Orion set-aside" });
    }
  });

  app.post("/api/withdrawals/:id/salesforce-case", requireAuth, async (req, res) => {
    try {
      const ctx = await authorizeWithdrawal(req, res, p(req.params.id));
      if (!ctx) return;
      const { advisor, withdrawal } = ctx;

      if (!canTransition(withdrawal.status, "sf_case_created")) {
        return res.status(409).json({ message: `Cannot create SF case from status '${withdrawal.status}'` });
      }

      if (withdrawal.salesforceCaseId) {
        return res.status(409).json({ message: "Salesforce case already created for this withdrawal" });
      }

      const client = await storage.getClient(withdrawal.clientId);
      const account = (await storage.getAccountsByClient(withdrawal.clientId))
        .find(a => a.id === withdrawal.accountId);

      const crm = getActiveCRM();
      const caseResult = await crm.createWithdrawalCase({
        clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown",
        accountNumber: account?.accountNumber || "Unknown",
        amount: parseFloat(withdrawal.amount),
        method: withdrawal.method,
        reason: withdrawal.reason,
        advisorName: advisor.name,
        contactId: client?.salesforceContactId || undefined,
      });

      const newStatus = canTransition(withdrawal.status, "sf_case_created") ? "sf_case_created" : withdrawal.status;

      const updated = await storage.updateWithdrawalRequest(withdrawal.id, {
        salesforceCaseId: caseResult.caseId,
        salesforceCaseNumber: caseResult.caseNumber,
        status: newStatus,
      });

      await storage.createWithdrawalAuditEntry({
        withdrawalId: withdrawal.id,
        action: "salesforce_case_created",
        performedBy: advisor.id,
        details: { caseId: caseResult.caseId, caseNumber: caseResult.caseNumber },
      });

      res.json(updated);
    } catch (err) {
      logger.error({ err }, "Error creating Salesforce case");
      res.status(500).json({ message: "Failed to create Salesforce case" });
    }
  });

  app.post("/api/withdrawals/:id/eclipse-file", requireAuth, async (req, res) => {
    try {
      const ctx = await authorizeWithdrawal(req, res, p(req.params.id));
      if (!ctx) return;
      const { advisor, withdrawal } = ctx;

      if (!canTransition(withdrawal.status, "eclipse_generated")) {
        return res.status(409).json({ message: `Cannot generate Eclipse file from status '${withdrawal.status}'` });
      }

      const client = await storage.getClient(withdrawal.clientId);
      const account = (await storage.getAccountsByClient(withdrawal.clientId))
        .find(a => a.id === withdrawal.accountId);

      const eclipseFile = generateEclipseImportFile([{
        accountNumber: account?.accountNumber || "Unknown",
        tradeType: "WITHDRAW",
        amount: parseFloat(withdrawal.amount),
        method: withdrawal.method,
        reason: withdrawal.reason,
        clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown",
        taxWithholding: withdrawal.taxWithholding ? parseFloat(withdrawal.taxWithholding) : undefined,
      }]);

      const updated = await storage.updateWithdrawalRequest(withdrawal.id, {
        eclipseFileGenerated: true,
        eclipseFileName: eclipseFile.fileName,
        status: "eclipse_generated",
      });

      await storage.createWithdrawalAuditEntry({
        withdrawalId: withdrawal.id,
        action: "eclipse_file_generated",
        performedBy: advisor.id,
        details: { fileName: eclipseFile.fileName, recordCount: eclipseFile.recordCount },
      });

      res.json({ withdrawal: updated, eclipseFile });
    } catch (err) {
      logger.error({ err }, "Error generating Eclipse file");
      res.status(500).json({ message: "Failed to generate Eclipse import file" });
    }
  });

  app.post("/api/withdrawals/:id/confirm-trade", requireAuth, async (req, res) => {
    try {
      const ctx = await authorizeWithdrawal(req, res, p(req.params.id));
      if (!ctx) return;
      const { advisor, withdrawal } = ctx;

      if (!withdrawal.eclipseFileGenerated) {
        return res.status(409).json({ message: "Eclipse file must be generated before confirming trade." });
      }
      if (!canTransition(withdrawal.status, "completed")) {
        return res.status(409).json({ message: `Cannot confirm trade from status '${withdrawal.status}'.` });
      }

      const now = new Date();
      let nwrRemoved = false;

      if (withdrawal.orionNwrTagId && !withdrawal.nwrRemovedAt) {
        const account = (await storage.getAccountsByClient(withdrawal.clientId))
          .find(a => a.id === withdrawal.accountId);
        try {
          const portfolio = getActivePortfolio();
          await portfolio.removeNwrTag(account?.orionAccountId || withdrawal.accountId, withdrawal.orionNwrTagId);
          nwrRemoved = true;
        } catch (err) {
          logger.warn({ err }, "Failed to remove NWR tag during trade confirmation");
        }
      }

      if (withdrawal.salesforceCaseId) {
        try {
          const crm = getActiveCRM();
          await crm.updateWithdrawalCaseStatus(withdrawal.salesforceCaseId, "Closed", "Trade confirmed and completed");
        } catch (err) {
          logger.warn({ err }, "Failed to update CRM case during trade confirmation");
        }
      }

      const updated = await storage.updateWithdrawalRequest(withdrawal.id, {
        status: "completed",
        tradeConfirmedAt: now,
        nwrRemovedAt: nwrRemoved ? now : undefined,
        completedAt: now,
      });

      await storage.createWithdrawalAuditEntry({
        withdrawalId: withdrawal.id,
        action: "trade_confirmed",
        performedBy: advisor.id,
        details: { nwrRemoved, confirmedAt: now.toISOString() },
      });

      res.json(updated);
    } catch (err) {
      logger.error({ err }, "Error confirming trade");
      res.status(500).json({ message: "Failed to confirm trade" });
    }
  });

  app.post("/api/withdrawals/:id/cancel", requireAuth, async (req, res) => {
    try {
      const ctx = await authorizeWithdrawal(req, res, p(req.params.id));
      if (!ctx) return;
      const { advisor, withdrawal } = ctx;

      if (!canTransition(withdrawal.status, "cancelled")) {
        return res.status(409).json({ message: `Cannot cancel from status '${withdrawal.status}'` });
      }

      let nwrRemoved = false;
      if (withdrawal.orionNwrTagId && !withdrawal.nwrRemovedAt) {
        const account = (await storage.getAccountsByClient(withdrawal.clientId))
          .find(a => a.id === withdrawal.accountId);
        try {
          const portfolio = getActivePortfolio();
          await portfolio.removeNwrTag(account?.orionAccountId || withdrawal.accountId, withdrawal.orionNwrTagId);
          nwrRemoved = true;
        } catch (err) {
          logger.warn({ err }, "Failed to remove NWR tag during cancellation");
        }
      }

      if (withdrawal.salesforceCaseId) {
        try {
          const crm = getActiveCRM();
          await crm.updateWithdrawalCaseStatus(withdrawal.salesforceCaseId, "Closed - Cancelled", "Withdrawal cancelled by advisor");
        } catch (err) {
          logger.warn({ err }, "Failed to update CRM case during cancellation");
        }
      }

      const updated = await storage.updateWithdrawalRequest(withdrawal.id, {
        status: "cancelled",
        nwrRemovedAt: nwrRemoved ? new Date() : undefined,
      });

      await storage.createWithdrawalAuditEntry({
        withdrawalId: withdrawal.id,
        action: "withdrawal_cancelled",
        performedBy: advisor.id,
        details: { reason: req.body?.notes || "Cancelled by advisor" },
      });

      res.json(updated);
    } catch (err) {
      logger.error({ err }, "Error cancelling withdrawal");
      res.status(500).json({ message: "Failed to cancel withdrawal" });
    }
  });

  app.get("/api/withdrawals/:id/audit-log", requireAuth, async (req, res) => {
    try {
      const ctx = await authorizeWithdrawal(req, res, p(req.params.id));
      if (!ctx) return;

      const auditLog = await storage.getWithdrawalAuditLog(p(req.params.id));
      res.json(auditLog);
    } catch (err) {
      logger.error({ err }, "Error fetching withdrawal audit log");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/withdrawals/:id/sync-salesforce", requireAuth, async (req, res) => {
    try {
      const ctx = await authorizeWithdrawal(req, res, p(req.params.id));
      if (!ctx) return;
      const { advisor, withdrawal } = ctx;

      if (!withdrawal.salesforceCaseId) {
        return res.status(400).json({ message: "No CRM case linked to this withdrawal" });
      }

      const crm = getActiveCRM();
      const caseStatus = await crm.getWithdrawalCaseStatus(withdrawal.salesforceCaseId);
      if (!caseStatus) {
        return res.json({ synced: false, message: "CRM not available" });
      }

      const mappedStatus = mapCrmStatusToWithdrawal(caseStatus.status);
      const statusChanged = mappedStatus && mappedStatus !== withdrawal.status &&
        canTransition(withdrawal.status, mappedStatus);

      if (statusChanged && mappedStatus) {
        await storage.updateWithdrawalRequest(withdrawal.id, { status: mappedStatus });
        await storage.createWithdrawalAuditEntry({
          withdrawalId: withdrawal.id,
          action: "crm_status_synced",
          performedBy: "system",
          details: {
            crmCaseStatus: caseStatus.status,
            crmProvider: crm.name,
            previousStatus: withdrawal.status,
            newStatus: mappedStatus,
            lastModified: caseStatus.lastModified,
          },
        });
      }

      res.json({
        synced: true,
        crmCaseStatus: caseStatus.status,
        crmProvider: crm.name,
        statusChanged: !!statusChanged,
        newStatus: statusChanged ? mappedStatus : withdrawal.status,
      });
    } catch (err) {
      logger.error({ err }, "Error syncing CRM status");
      res.status(500).json({ message: "Failed to sync CRM status" });
    }
  });

  app.post("/api/withdrawals/sync-all-salesforce", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(403).json({ message: "No advisor context" });

      const withdrawals = await storage.getWithdrawalRequests(advisor.id);
      const activeWithCase = withdrawals.filter(
        (w) => w.salesforceCaseId && !["completed", "cancelled"].includes(w.status)
      );

      const crm = getActiveCRM();
      let syncedCount = 0;
      let changedCount = 0;

      for (const withdrawal of activeWithCase) {
        const caseStatus = await crm.getWithdrawalCaseStatus(withdrawal.salesforceCaseId!);
        if (!caseStatus) continue;

        syncedCount++;

        const mappedStatus = mapCrmStatusToWithdrawal(caseStatus.status);
        if (mappedStatus && mappedStatus !== withdrawal.status && canTransition(withdrawal.status, mappedStatus)) {
          await storage.updateWithdrawalRequest(withdrawal.id, { status: mappedStatus });
          await storage.createWithdrawalAuditEntry({
            withdrawalId: withdrawal.id,
            action: "crm_status_synced",
            performedBy: "system",
            details: {
              crmCaseStatus: caseStatus.status,
              crmProvider: crm.name,
              previousStatus: withdrawal.status,
              newStatus: mappedStatus,
            },
          });
          changedCount++;
        }
      }

      logger.info({ syncedCount, changedCount, provider: crm.name }, "CRM withdrawal sync complete");
      res.json({ syncedCount, changedCount, totalActive: activeWithCase.length, provider: crm.name });
    } catch (err) {
      logger.error({ err }, "Error syncing all CRM withdrawals");
      res.status(500).json({ message: "Failed to sync CRM withdrawals" });
    }
  });

  const withdrawalAnalysisSchema = z.object({
    currentAge: z.coerce.number().int().min(30).max(100),
    retirementAge: z.coerce.number().int().min(50).max(100),
    lifeExpectancy: z.coerce.number().int().min(70).max(120).default(90),
    filingStatus: z.enum(["single", "married_filing_jointly"]),
    annualSpendingNeed: z.coerce.number().min(0),
    socialSecurityBenefit: z.coerce.number().min(0),
    pensionIncome: z.coerce.number().min(0).default(0),
    otherIncome: z.coerce.number().min(0).default(0),
    accounts: z.array(z.object({
      name: z.string().min(1),
      type: z.enum(["roth", "taxable", "traditional_ira", "401k"]),
      balance: z.coerce.number().min(0),
      costBasis: z.coerce.number().min(0).optional(),
      unrealizedGains: z.coerce.number().optional(),
      annualContributions: z.coerce.number().min(0).optional(),
    })).min(1),
    stateOfResidence: z.string().min(2).max(2),
    expectedGrowthRate: z.coerce.number().min(-0.10).max(0.20).default(0.06),
    inflationRate: z.coerce.number().min(0).max(0.10).default(0.025),
    projectionYears: z.coerce.number().int().min(1).max(30).default(10),
    qcdAmount: z.coerce.number().min(0).optional(),
    clientId: z.string().optional(),
  });

  app.post("/api/withdrawals/analysis", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(403).json({ message: "No advisor context" });

      const data = validateBody(withdrawalAnalysisSchema, req, res);
      if (!data) return;

      const input: WithdrawalAnalysisInput = {
        currentAge: data.currentAge,
        retirementAge: data.retirementAge,
        lifeExpectancy: data.lifeExpectancy,
        filingStatus: data.filingStatus,
        annualSpendingNeed: data.annualSpendingNeed,
        socialSecurityBenefit: data.socialSecurityBenefit,
        pensionIncome: data.pensionIncome,
        otherIncome: data.otherIncome,
        accounts: data.accounts,
        stateOfResidence: data.stateOfResidence,
        expectedGrowthRate: data.expectedGrowthRate,
        inflationRate: data.inflationRate,
        projectionYears: data.projectionYears,
        qcdAmount: data.qcdAmount,
      };

      const results = calculateWithdrawalAnalysis(input);

      logger.info({ clientId: data.clientId }, "Withdrawal analysis calculated");
      res.json(results);
    } catch (err) {
      logger.error({ err }, "Error calculating withdrawal analysis");
      res.status(500).json({ message: "Failed to calculate withdrawal analysis" });
    }
  });
}
