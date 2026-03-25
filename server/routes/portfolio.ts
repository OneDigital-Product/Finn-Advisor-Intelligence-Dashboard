import type { Express } from "express";
import { requireAuth } from "./middleware";
import { storage } from "../storage";
import { logger } from "../lib/logger";

async function getAdvisorIdFromSession(req: any): Promise<string | null> {
  if (req.session.userType === "advisor") {
    return req.session.userId;
  }
  const assignedClients = await storage.getClientsByAssociate(req.session.userId!);
  if (assignedClients.length > 0) {
    return assignedClients[0].advisorId;
  }
  return null;
}

async function verifyAccountOwnership(advisorId: string, accountId: string): Promise<boolean> {
  const account = await storage.getAccount(accountId);
  if (!account) return false;
  const client = await storage.getClient(account.clientId);
  if (!client) return false;
  return client.advisorId === advisorId;
}

/** Normalize Express param to string */
function p(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v || "";
}

export function registerPortfolioRoutes(app: Express) {
  app.get("/api/accounts", requireAuth, async (req, res) => {
    try {
      const advisorId = await getAdvisorIdFromSession(req);
      if (!advisorId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
      const clientId = req.query.clientId as string | undefined;

      const clients = await storage.getClients(advisorId);
      const clientIds = clientId
        ? clients.filter(c => c.id === clientId).map(c => c.id)
        : clients.map(c => c.id);

      if (clientId && clientIds.length === 0) {
        return res.json({ data: [], total: 0, page, limit });
      }

      const allAccounts: any[] = [];
      for (const cId of clientIds) {
        const accts = await storage.getAccountsByClient(cId);
        const client = clients.find(c => c.id === cId);
        for (const acct of accts) {
          allAccounts.push({
            ...acct,
            clientName: client ? `${client.firstName} ${client.lastName}` : undefined,
          });
        }
      }

      const total = allAccounts.length;
      const offset = (page - 1) * limit;
      const data = allAccounts.slice(offset, offset + limit);

      res.json({ data, total, page, limit });
    } catch (error: any) {
      logger.error({ err: error }, "Failed to list accounts");
      res.status(500).json({ message: "Failed to list accounts" });
    }
  });

  app.get("/api/accounts/:id", requireAuth, async (req, res) => {
    try {
      const advisorId = await getAdvisorIdFromSession(req);
      if (!advisorId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const accountId = p(req.params.id);
      const hasAccess = await verifyAccountOwnership(advisorId, accountId);
      if (!hasAccess) {
        return res.status(404).json({ message: "Account not found" });
      }

      const account = await storage.getAccount(accountId);
      const [holdingsData, performanceData, transactionsData] = await Promise.all([
        storage.getHoldingsByAccount(accountId),
        storage.getPerformanceByAccount(accountId),
        storage.getTransactionsByAccount(accountId),
      ]);

      const client = await storage.getClient(account!.clientId);

      res.json({
        ...account,
        clientName: client ? `${client.firstName} ${client.lastName}` : undefined,
        holdings: holdingsData,
        performance: performanceData,
        recentTransactions: transactionsData.slice(0, 10),
      });
    } catch (error: any) {
      logger.error({ err: error }, "Failed to get account detail");
      res.status(500).json({ message: "Failed to get account detail" });
    }
  });

  app.get("/api/accounts/:id/performance", requireAuth, async (req, res) => {
    try {
      const advisorId = await getAdvisorIdFromSession(req);
      if (!advisorId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const accountId = p(req.params.id);
      const hasAccess = await verifyAccountOwnership(advisorId, accountId);
      if (!hasAccess) {
        return res.status(404).json({ message: "Account not found" });
      }

      const period = req.query.period as string | undefined;
      let performanceData = await storage.getPerformanceByAccount(accountId);

      if (period) {
        const periods = period.split(",");
        performanceData = performanceData.filter(p => periods.includes(p.period));
      }

      res.json({ data: performanceData, accountId });
    } catch (error: any) {
      logger.error({ err: error }, "Failed to get account performance");
      res.status(500).json({ message: "Failed to get account performance" });
    }
  });

  app.get("/api/accounts/:id/transactions", requireAuth, async (req, res) => {
    try {
      const advisorId = await getAdvisorIdFromSession(req);
      if (!advisorId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const accountId = p(req.params.id);
      const hasAccess = await verifyAccountOwnership(advisorId, accountId);
      if (!hasAccess) {
        return res.status(404).json({ message: "Account not found" });
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
      const type = req.query.type as string | undefined;
      const ticker = req.query.ticker as string | undefined;
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;

      let transactionsData = await storage.getTransactionsByAccount(accountId);

      if (type) {
        transactionsData = transactionsData.filter(t => t.type === type);
      }
      if (ticker) {
        transactionsData = transactionsData.filter(t => t.ticker?.toLowerCase() === ticker.toLowerCase());
      }
      if (dateFrom) {
        transactionsData = transactionsData.filter(t => t.date >= dateFrom);
      }
      if (dateTo) {
        transactionsData = transactionsData.filter(t => t.date <= dateTo);
      }

      const total = transactionsData.length;
      const offset = (page - 1) * limit;
      const data = transactionsData.slice(offset, offset + limit);

      res.json({ data, total, page, limit });
    } catch (error: any) {
      logger.error({ err: error }, "Failed to get account transactions");
      res.status(500).json({ message: "Failed to get account transactions" });
    }
  });

  app.get("/api/accounts/:id/holdings", requireAuth, async (req, res) => {
    try {
      const advisorId = await getAdvisorIdFromSession(req);
      if (!advisorId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const accountId = p(req.params.id);
      const hasAccess = await verifyAccountOwnership(advisorId, accountId);
      if (!hasAccess) {
        return res.status(404).json({ message: "Account not found" });
      }

      const sort = req.query.sort as string | undefined;
      const order = (req.query.order as string) === "asc" ? "asc" : "desc";

      let holdingsData = await storage.getHoldingsByAccount(accountId);

      if (sort) {
        holdingsData = [...holdingsData].sort((a, b) => {
          let aVal: any;
          let bVal: any;
          switch (sort) {
            case "marketValue":
              aVal = parseFloat(a.marketValue as string);
              bVal = parseFloat(b.marketValue as string);
              break;
            case "ticker":
              aVal = a.ticker.toLowerCase();
              bVal = b.ticker.toLowerCase();
              break;
            case "weight":
              aVal = parseFloat((a.weight as string) || "0");
              bVal = parseFloat((b.weight as string) || "0");
              break;
            case "gainLoss":
              aVal = parseFloat((a.unrealizedGainLoss as string) || "0");
              bVal = parseFloat((b.unrealizedGainLoss as string) || "0");
              break;
            default:
              return 0;
          }
          if (aVal < bVal) return order === "asc" ? -1 : 1;
          if (aVal > bVal) return order === "asc" ? 1 : -1;
          return 0;
        });
      }

      res.json({ data: holdingsData, accountId });
    } catch (error: any) {
      logger.error({ err: error }, "Failed to get account holdings");
      res.status(500).json({ message: "Failed to get account holdings" });
    }
  });
}
