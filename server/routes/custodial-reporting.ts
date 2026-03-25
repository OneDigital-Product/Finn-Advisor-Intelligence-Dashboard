import type { Express } from "express";
import { z } from "zod";
import { db } from "../db";
import { logger } from "../lib/logger";
import { requireAuth } from "./middleware";
import { validateBody } from "../lib/validation";
import { storage } from "../storage";
import { accounts, clients, nigoRecords } from "@shared/schema";
import { eq, sql, and, desc } from "drizzle-orm";
import { chatCompletion, isAIAvailable } from "../openai";

/** Normalize Express param to string */
function p(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v || "";
}

export function registerCustodialReportingRoutes(app: Express) {
  app.get("/api/custodial-reporting/rmd-summary", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId;
      if (!advisorId) return res.status(401).json({ message: "Unauthorized" });

      const currentYear = new Date().getFullYear();
      const rmdAge = 73;

      const allClients = await db
        .select({
          client: clients,
        })
        .from(clients)
        .where(and(
          eq(clients.advisorId, advisorId),
          sql`${clients.dateOfBirth} IS NOT NULL`
        ));

      const rmdClients: any[] = [];

      for (const { client } of allClients) {
        if (!client.dateOfBirth) continue;
        const dob = new Date(client.dateOfBirth);
        if (isNaN(dob.getTime())) continue;

        const age = currentYear - dob.getFullYear();
        if (age < rmdAge) continue;

        const clientAccounts = await db
          .select()
          .from(accounts)
          .where(eq(accounts.clientId, client.id));

        const iraAccounts = clientAccounts.filter(a =>
          ["Traditional IRA", "IRA", "SEP IRA", "SIMPLE IRA", "401k", "403b"].some(t =>
            a.accountType?.toLowerCase().includes(t.toLowerCase())
          )
        );

        if (iraAccounts.length === 0) continue;

        const totalBalance = iraAccounts.reduce((sum, a) => sum + parseFloat(a.balance || "0"), 0);

        const UNIFORM_LIFETIME_TABLE: Record<number, number> = {
          72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0,
          79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0,
          86: 15.3, 87: 14.5, 88: 13.8, 89: 13.1, 90: 12.4, 91: 11.7, 92: 11.1,
          93: 10.5, 94: 9.9, 95: 9.4, 96: 8.8, 97: 8.3, 98: 7.8, 99: 7.3, 100: 6.8,
        };

        const factor = UNIFORM_LIFETIME_TABLE[age] || 6.8;
        const rmdAmount = totalBalance / factor;

        const byCustodian: Record<string, { balance: number; rmd: number; accounts: number }> = {};
        for (const acct of iraAccounts) {
          const cust = acct.custodian || "Unknown";
          if (!byCustodian[cust]) byCustodian[cust] = { balance: 0, rmd: 0, accounts: 0 };
          const bal = parseFloat(acct.balance || "0");
          byCustodian[cust].balance += bal;
          byCustodian[cust].rmd += bal / factor;
          byCustodian[cust].accounts += 1;
        }

        rmdClients.push({
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
          age,
          dateOfBirth: client.dateOfBirth,
          totalBalance,
          rmdAmount: Math.round(rmdAmount * 100) / 100,
          factor,
          status: "pending",
          accounts: iraAccounts.map(a => ({
            id: a.id,
            accountNumber: a.accountNumber,
            accountType: a.accountType,
            custodian: a.custodian,
            balance: parseFloat(a.balance || "0"),
            rmd: Math.round((parseFloat(a.balance || "0") / factor) * 100) / 100,
          })),
          byCustodian,
        });
      }

      const custodianSummary: Record<string, {
        custodian: string;
        totalBalance: number;
        totalRmd: number;
        clientCount: number;
        accountCount: number;
      }> = {};

      for (const rc of rmdClients) {
        for (const [cust, data] of Object.entries(rc.byCustodian) as [string, any][]) {
          if (!custodianSummary[cust]) {
            custodianSummary[cust] = { custodian: cust, totalBalance: 0, totalRmd: 0, clientCount: 0, accountCount: 0 };
          }
          custodianSummary[cust].totalBalance += data.balance;
          custodianSummary[cust].totalRmd += data.rmd;
          custodianSummary[cust].accountCount += data.accounts;
        }
        for (const cust of Object.keys(rc.byCustodian)) {
          if (custodianSummary[cust]) custodianSummary[cust].clientCount += 1;
        }
      }

      const totalRmd = rmdClients.reduce((s, c) => s + c.rmdAmount, 0);
      const totalBalance = rmdClients.reduce((s, c) => s + c.totalBalance, 0);

      res.json({
        totalClients: rmdClients.length,
        totalRmd: Math.round(totalRmd * 100) / 100,
        totalBalance: Math.round(totalBalance * 100) / 100,
        completedCount: 0,
        outstandingCount: rmdClients.length,
        clients: rmdClients,
        custodianSummary: Object.values(custodianSummary).map(c => ({
          ...c,
          totalBalance: Math.round(c.totalBalance * 100) / 100,
          totalRmd: Math.round(c.totalRmd * 100) / 100,
        })),
        year: currentYear,
      });
    } catch (err) {
      logger.error({ err }, "Error fetching RMD summary");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/custodial-reporting/nigo", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId;
      if (!advisorId) return res.status(401).json({ message: "Unauthorized" });

      const status = req.query.status as string | undefined;
      const records = await storage.getNigoRecords(advisorId, status);

      const enriched = [];
      for (const record of records) {
        const client = await storage.getClient(record.clientId);
        enriched.push({
          ...record,
          clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown",
        });
      }

      const open = enriched.filter(r => r.status === "open").length;
      const inProgress = enriched.filter(r => r.status === "in_progress").length;
      const resolved = enriched.filter(r => r.status === "resolved").length;
      const escalated = enriched.filter(r => r.status === "escalated").length;

      const byCustodian: Record<string, number> = {};
      const byReason: Record<string, number> = {};
      for (const r of enriched) {
        byCustodian[r.custodian] = (byCustodian[r.custodian] || 0) + 1;
        byReason[r.reasonCode] = (byReason[r.reasonCode] || 0) + 1;
      }

      const avgAging = enriched.length > 0
        ? Math.round(enriched.reduce((s, r) => s + (r.aging || 0), 0) / enriched.length)
        : 0;

      res.json({
        records: enriched,
        summary: { total: enriched.length, open, inProgress, resolved, escalated, avgAging },
        byCustodian,
        byReason,
      });
    } catch (err) {
      logger.error({ err }, "Error fetching NIGO records");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const createNigoSchema = z.object({
    clientId: z.string().min(1),
    accountId: z.string().optional(),
    custodian: z.string().min(1),
    submissionType: z.string().min(1),
    reasonCode: z.string().min(1),
    reasonDescription: z.string().optional(),
    submittedDate: z.string().min(1),
    rejectedDate: z.string().optional(),
    priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  });

  app.post("/api/custodial-reporting/nigo", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId;
      if (!advisorId) return res.status(401).json({ message: "Unauthorized" });

      const data = validateBody(createNigoSchema, req, res);
      if (!data) return;

      const client = await storage.getClient(data.clientId);
      if (!client || client.advisorId !== advisorId) {
        return res.status(403).json({ message: "Client not found or not authorized" });
      }

      const rejectedDate = data.rejectedDate ? new Date(data.rejectedDate) : new Date();
      const aging = Math.ceil((new Date().getTime() - rejectedDate.getTime()) / (1000 * 60 * 60 * 24));

      const record = await storage.createNigoRecord({
        ...data,
        advisorId,
        aging: Math.max(0, aging),
      });

      res.status(201).json(record);
    } catch (err) {
      logger.error({ err }, "Error creating NIGO record");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/custodial-reporting/nigo/:id", requireAuth, async (req, res) => {
    try {
      const id = p(req.params.id);
      const advisorId = req.session.userId;
      if (!advisorId) return res.status(401).json({ message: "Unauthorized" });

      const existing = await storage.getNigoRecord(id);
      if (!existing) return res.status(404).json({ message: "NIGO record not found" });
      if (existing.advisorId !== advisorId) return res.status(403).json({ message: "Not authorized" });

      const updateSchema = z.object({
        status: z.enum(["open", "in_progress", "resolved", "escalated"]).optional(),
        resolutionNotes: z.string().optional(),
        priority: z.enum(["low", "normal", "high", "critical"]).optional(),
      });

      const data = validateBody(updateSchema, req, res);
      if (!data) return;

      const updates: any = { ...data };
      if (data.status === "resolved") {
        updates.resolvedDate = new Date().toISOString().split("T")[0];
      }

      const updated = await storage.updateNigoRecord(id, updates);
      res.json(updated);
    } catch (err) {
      logger.error({ err }, "Error updating NIGO record");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/custodial-reporting/nigo/:id/guidance", requireAuth, async (req, res) => {
    try {
      const id = p(req.params.id);
      const advisorId = req.session.userId;
      if (!advisorId) return res.status(401).json({ message: "Unauthorized" });

      const record = await storage.getNigoRecord(id);
      if (!record) return res.status(404).json({ message: "NIGO record not found" });
      if (record.advisorId !== advisorId) return res.status(403).json({ message: "Not authorized" });

      const client = await storage.getClient(record.clientId);
      const clientName = client ? `${client.firstName} ${client.lastName}` : "Unknown";

      const prompt = `You are a financial services operations expert. A custodial submission has been rejected (NIGO - Not In Good Order). Provide resolution guidance.

Details:
- Custodian: ${record.custodian}
- Submission Type: ${record.submissionType}
- Reason Code: ${record.reasonCode}
- Reason Description: ${record.reasonDescription || "Not provided"}
- Client: ${clientName}
- Days Outstanding: ${record.aging}

Provide:
1. A clear explanation of why this rejection typically occurs
2. Step-by-step resolution instructions
3. Required forms or documents (with form numbers if applicable)
4. Common mistakes to avoid when resubmitting
5. Estimated timeline for resolution

Format your response in clear, actionable sections.`;

      const guidance = await chatCompletion(
        "You are a helpful financial operations assistant.",
        prompt,
        true,
        1000
      );

      await storage.updateNigoRecord(id, { resolutionGuidance: guidance });

      res.json({ guidance });
    } catch (err) {
      logger.error({ err }, "Error generating NIGO guidance");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/custodial-reporting/custodian-summary", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId;
      if (!advisorId) return res.status(401).json({ message: "Unauthorized" });

      const allAccounts = await db
        .select({
          account: accounts,
          client: clients,
        })
        .from(accounts)
        .innerJoin(clients, eq(accounts.clientId, clients.id))
        .where(eq(clients.advisorId, advisorId));

      const custodians: Record<string, {
        custodian: string;
        totalAum: number;
        accountCount: number;
        clientCount: number;
        clients: Set<string>;
        accountTypes: Record<string, number>;
      }> = {};

      for (const { account, client } of allAccounts) {
        const cust = account.custodian || "Unknown";
        if (!custodians[cust]) {
          custodians[cust] = {
            custodian: cust,
            totalAum: 0,
            accountCount: 0,
            clientCount: 0,
            clients: new Set(),
            accountTypes: {},
          };
        }
        custodians[cust].totalAum += parseFloat(account.balance || "0");
        custodians[cust].accountCount += 1;
        custodians[cust].clients.add(client.id);
        const aType = account.accountType || "Other";
        custodians[cust].accountTypes[aType] = (custodians[cust].accountTypes[aType] || 0) + 1;
      }

      const nigoByCustomer: Record<string, { open: number; total: number }> = {};
      const allNigo = await storage.getNigoRecords(advisorId);
      for (const n of allNigo) {
        if (!nigoByCustomer[n.custodian]) nigoByCustomer[n.custodian] = { open: 0, total: 0 };
        nigoByCustomer[n.custodian].total += 1;
        if (n.status === "open" || n.status === "in_progress") nigoByCustomer[n.custodian].open += 1;
      }

      const result = Object.values(custodians).map(c => ({
        custodian: c.custodian,
        totalAum: Math.round(c.totalAum * 100) / 100,
        accountCount: c.accountCount,
        clientCount: c.clients.size,
        accountTypes: c.accountTypes,
        openNigos: nigoByCustomer[c.custodian]?.open || 0,
        totalNigos: nigoByCustomer[c.custodian]?.total || 0,
      }));

      res.json(result.sort((a, b) => b.totalAum - a.totalAum));
    } catch (err) {
      logger.error({ err }, "Error fetching custodian summary");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/custodial-reporting/alerts", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId;
      if (!advisorId) return res.status(401).json({ message: "Unauthorized" });

      const alerts: any[] = [];
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();

      const allClients = await db
        .select()
        .from(clients)
        .where(and(
          eq(clients.advisorId, advisorId),
          sql`${clients.dateOfBirth} IS NOT NULL`
        ));

      for (const client of allClients) {
        if (!client.dateOfBirth) continue;
        const dob = new Date(client.dateOfBirth);
        if (isNaN(dob.getTime())) continue;
        const age = currentYear - dob.getFullYear();
        if (age < 73) continue;

        if (currentMonth >= 9) {
          alerts.push({
            type: "rmd_deadline",
            severity: currentMonth >= 11 ? "critical" : "warning",
            title: `RMD Deadline Approaching — ${client.firstName} ${client.lastName}`,
            message: `Year-end RMD deadline is December 31, ${currentYear}. Verify distribution has been scheduled.`,
            clientId: client.id,
            clientName: `${client.firstName} ${client.lastName}`,
            dueDate: `${currentYear}-12-31`,
          });
        }
      }

      const openNigos = await storage.getNigoRecords(advisorId, "open");
      for (const nigo of openNigos) {
        if ((nigo.aging || 0) > 14) {
          const client = await storage.getClient(nigo.clientId);
          alerts.push({
            type: "aging_nigo",
            severity: (nigo.aging || 0) > 30 ? "critical" : "warning",
            title: `Aging NIGO — ${nigo.custodian}`,
            message: `NIGO for ${client ? `${client.firstName} ${client.lastName}` : "unknown client"} has been open for ${nigo.aging} days. Reason: ${nigo.reasonCode}.`,
            clientId: nigo.clientId,
            clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown",
            nigoId: nigo.id,
            aging: nigo.aging,
          });
        }
      }

      alerts.sort((a, b) => {
        const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
        return (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
      });

      res.json(alerts);
    } catch (err) {
      logger.error({ err }, "Error fetching custodial alerts");
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
