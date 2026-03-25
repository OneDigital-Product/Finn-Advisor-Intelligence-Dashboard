import { db } from "../db";
import {
  accounts, holdings, performance, tasks, meetings,
  activities, complianceItems, investorProfiles,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export type DataSourceContext = {
  clientId?: string;
  householdId?: string;
  advisorId: string;
};

export type DataSource =
  | "clients.aum"
  | "clients.performance"
  | "accounts.list"
  | "holdings.allocation"
  | "investorProfiles.latest"
  | "tasks.open"
  | "meetings.upcoming"
  | "activities.recent"
  | "complianceItems.status";

export async function executeDataSource(
  dataSource: string,
  context: DataSourceContext
): Promise<any> {
  const { clientId, householdId } = context;

  switch (dataSource) {
    case "clients.aum": {
      const accountsList = clientId
        ? await db.select().from(accounts).where(eq(accounts.clientId, clientId))
        : householdId
        ? await db.select().from(accounts).where(eq(accounts.householdId, householdId!))
        : [];

      const totalAum = accountsList.reduce(
        (sum, acc) => sum + parseFloat(String(acc.balance || "0")),
        0
      );

      const segmentBreakdown = accountsList.reduce((agg: Record<string, number>, account) => {
        const key = account.accountType || "other";
        agg[key] = (agg[key] || 0) + parseFloat(String(account.balance || "0"));
        return agg;
      }, {});

      return {
        totalAum,
        accountCount: accountsList.length,
        segmentBreakdown: Object.entries(segmentBreakdown).map(([type, balance]) => ({
          type,
          balance,
          percentage: totalAum > 0 ? (balance / totalAum) * 100 : 0,
        })),
      };
    }

    case "clients.performance": {
      if (!clientId && !householdId) return { returnPct: 0, benchmarkPct: 0 };

      let perfList;
      if (householdId) {
        perfList = await db.select().from(performance).where(eq(performance.householdId, householdId));
      } else {
        const clientAccounts = await db.select().from(accounts).where(eq(accounts.clientId, clientId!));
        const accountIds = clientAccounts.map((a) => a.id);
        if (accountIds.length === 0) return { returnPct: 0, benchmarkPct: 0 };
        perfList = await db
          .select()
          .from(performance)
          .where(sql`${performance.accountId} IN (${sql.join(accountIds.map(id => sql`${id}`), sql`, `)})`);
      }

      const ytdPerf = perfList.find((p) => p.period === "YTD") || perfList[0];
      return {
        period: ytdPerf?.period || "YTD",
        returnPct: parseFloat(String(ytdPerf?.returnPct || "0")),
        benchmarkPct: parseFloat(String(ytdPerf?.benchmarkPct || "0")),
        outperformance:
          parseFloat(String(ytdPerf?.returnPct || "0")) -
          parseFloat(String(ytdPerf?.benchmarkPct || "0")),
      };
    }

    case "accounts.list": {
      if (!clientId && !householdId) return [];

      const accountsList = clientId
        ? await db.select().from(accounts).where(eq(accounts.clientId, clientId))
        : await db.select().from(accounts).where(eq(accounts.householdId, householdId!));

      return accountsList.map((acc) => ({
        id: acc.id,
        accountNumber: acc.accountNumber,
        accountType: acc.accountType,
        custodian: acc.custodian,
        balance: parseFloat(String(acc.balance || "0")),
        taxStatus: acc.taxStatus,
        status: acc.status,
      }));
    }

    case "holdings.allocation": {
      if (!clientId && !householdId) return [];

      const accountsList = clientId
        ? await db.select().from(accounts).where(eq(accounts.clientId, clientId))
        : await db.select().from(accounts).where(eq(accounts.householdId, householdId!));

      const accountIds = accountsList.map((a) => a.id);
      if (accountIds.length === 0) return [];

      const holdingsList = await db
        .select()
        .from(holdings)
        .where(sql`${holdings.accountId} IN (${sql.join(accountIds.map(id => sql`${id}`), sql`, `)})`);

      const totalValue = holdingsList.reduce(
        (sum, h) => sum + parseFloat(String(h.marketValue || "0")),
        0
      );

      const allocation = holdingsList.reduce((agg: Record<string, number>, holding) => {
        const sector = holding.sector || "Other";
        agg[sector] = (agg[sector] || 0) + parseFloat(String(holding.marketValue || "0"));
        return agg;
      }, {});

      return Object.entries(allocation).map(([sector, value]) => ({
        sector,
        allocation: value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
      }));
    }

    case "investorProfiles.latest": {
      if (!clientId) return null;
      const [profile] = await db
        .select()
        .from(investorProfiles)
        .where(eq(investorProfiles.clientId, clientId))
        .orderBy(desc(investorProfiles.createdAt))
        .limit(1);
      return profile || null;
    }

    case "tasks.open": {
      if (!clientId) return [];
      const openTasks = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.clientId, clientId), sql`${tasks.status} != 'completed'`))
        .orderBy(desc(tasks.dueDate));
      return openTasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        dueDate: t.dueDate,
        priority: t.priority,
        status: t.status,
      }));
    }

    case "meetings.upcoming": {
      if (!clientId) return [];
      const upcoming = await db
        .select()
        .from(meetings)
        .where(and(eq(meetings.clientId, clientId), sql`${meetings.startTime} > NOW()`))
        .orderBy(meetings.startTime)
        .limit(5);
      return upcoming.map((m) => ({
        id: m.id,
        title: m.title,
        startTime: m.startTime,
        endTime: m.endTime,
        type: m.type,
        location: m.location,
      }));
    }

    case "activities.recent": {
      if (!clientId) return [];
      const recent = await db
        .select()
        .from(activities)
        .where(eq(activities.clientId, clientId))
        .orderBy(desc(activities.date))
        .limit(20);
      return recent.map((a) => ({
        id: a.id,
        type: a.type,
        subject: a.subject,
        description: a.description,
        date: a.date,
        duration: a.duration,
      }));
    }

    case "complianceItems.status": {
      if (!clientId) return { current: 0, expiringSoon: 0, overdue: 0, pending: 0 };
      const items = await db
        .select()
        .from(complianceItems)
        .where(eq(complianceItems.clientId, clientId));
      return {
        current: items.filter((i) => i.status === "current").length,
        expiringSoon: items.filter((i) => i.status === "expiring_soon").length,
        overdue: items.filter((i) => i.status === "overdue").length,
        pending: items.filter((i) => i.status === "pending").length,
        total: items.length,
      };
    }

    default:
      return null;
  }
}
