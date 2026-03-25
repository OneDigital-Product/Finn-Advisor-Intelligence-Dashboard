import { db } from "../db";
import {
  advisors, clients, households, householdMembers, accounts, holdings,
  performance, transactions, tasks, meetings, alerts,
  complianceItems, lifeEvents, documents,
} from "@shared/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import * as orionClient from "../integrations/orion/client";
import * as sfQueries from "../integrations/salesforce/queries";
import type {
  OrionRepresentativeValue,
  OrionReportingScopeRequest,
  OrionReportingScopeResponse,
  OrionTaxLossHarvestingResult,
  OrionTaxLot,
  OrionRmdCalculation,
  OrionHiddenLeversRiskProfile,
  OrionHiddenLeversStressTest,
  OrionUnmanagedAsset,
  OrionSurveyResult,
  OrionRebalanceProposal,
} from "../types/orion-api";
import type {
  SFSalesGoal,
  SFFinancialGoal,
} from "../types/salesforce-fsc";

import {
  fetchApiData,
  ApiResponseError,
  transformRepValueToDashboardCards,
  transformRepValueToBookSnapshot,
  transformSfEventToMeeting,
  transformSfTaskToTask,
  mapPriority,
} from "../types/api-transforms";
import type { ApiSfEvent, ApiSfTask } from "../types/api-response-contracts";
import type {
  DashboardSummaryCard,
  BookSnapshot,
  MeetingDTO,
  TaskDTO,
  DocumentDTO,
  EngagementScore,
  RevenueYTD,
  NetWorthSummary,
} from "../types/service-types";
export type { DashboardSummaryCard, BookSnapshot, MeetingDTO, TaskDTO, DocumentDTO, EngagementScore, RevenueYTD, NetWorthSummary };

export const USE_REAL_API = process.env.USE_REAL_API === "true";
export const USE_REAL_ORION_API = USE_REAL_API || process.env.USE_REAL_ORION_API === "true";
export const USE_REAL_SALESFORCE_API = USE_REAL_API || process.env.USE_REAL_SALESFORCE_API === "true";

const ORION_BASE_URL = process.env.ORION_BASE_URL ?? "https://api.orionadvisor.com/api/v1";
const MULESOFT_BASE_URL = process.env.MULESOFT_BASE_URL ?? "";

export function getApiSource(): { orion: "live" | "local"; salesforce: "live" | "local" } {
  return {
    orion: USE_REAL_ORION_API ? "live" : "local",
    salesforce: USE_REAL_SALESFORCE_API ? "live" : "local",
  };
}

async function fetchOrionApi<T>(path: string, token?: string): Promise<T | null> {
  if (!USE_REAL_ORION_API) return null;
  try {
    return await fetchApiData<T>(
      `${ORION_BASE_URL}${path}`,
      { token: token ?? process.env.ORION_API_KEY },
    );
  } catch (err) {
    if (err instanceof ApiResponseError) {
      console.error(`[Orion API] ${err.statusCode}: ${err.message}`);
    }
    return null;
  }
}

async function fetchSalesforceApi<T>(path: string, token?: string): Promise<T | null> {
  if (!USE_REAL_SALESFORCE_API || !MULESOFT_BASE_URL) return null;
  try {
    return await fetchApiData<T>(
      `${MULESOFT_BASE_URL}${path}`,
      { token: token ?? process.env.SALESFORCE_API_KEY },
    );
  } catch (err) {
    if (err instanceof ApiResponseError) {
      console.error(`[Salesforce API] ${err.statusCode}: ${err.message}`);
    }
    return null;
  }
}


export interface AllocationSlice {
  assetClass: string;
  marketValue: number;
  percentOfTotal: number;
  targetPct: number;
  driftPct: number;
}

export interface AnalyticsKPIs {
  totalAUM: number;
  totalClients: number;
  totalHouseholds: number;
  netFlowsYTD: number;
  revenueYTD: number;
}

export interface AUMSegment {
  segment: string;
  aum: number;
  clientCount: number;
  revenueEstimate: number;
  atRiskCount: number;
}

export interface CapacityMetrics {
  currentClients: number;
  currentHouseholds: number;
  maxCapacity: number;
  utilizationPct: number;
  segmentBreakdown: Array<{ segment: string; count: number }>;
}

export interface ComplianceHealthScore {
  overallHealthPct: number;
  current: number;
  expiringSoon: number;
  overdue: number;
  pending: number;
  total: number;
}

export interface ComplianceCategory {
  key: string;
  label: string;
}

export interface ActionQueueItem {
  rank: number;
  action: string;
  clientId: string | null;
  priority: string | null;
  category: string;
  dueDate: string | null;
  status: string;
}

export interface TierDefinition {
  tier: string;
  label: string;
  minAUM: number;
  color: string;
  isConfirmed: boolean;
}

export interface OrionMapping {
  orionIdType: string;
  orionIdValue: string;
  sfField: string;
}

export interface NavItem {
  title: string;
  url: string;
  iconName: string;
}


async function getOrionAccountIds(accountIds: string[]): Promise<number[]> {
  if (accountIds.length === 0) return [];
  const acctRows = await db.select({ orionAccountId: accounts.orionAccountId })
    .from(accounts)
    .where(sql`${accounts.id} IN (${sql.join(accountIds.map(id => sql`${id}`), sql`, `)})`);
  return acctRows
    .map(r => r.orionAccountId ? Number(r.orionAccountId) : null)
    .filter((id): id is number => id !== null && Number.isFinite(id) && id > 0);
}

async function getOrionAccountId(accountId: string): Promise<number | null> {
  const [row] = await db.select({ orionAccountId: accounts.orionAccountId })
    .from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (!row?.orionAccountId) return null;
  const num = Number(row.orionAccountId);
  return Number.isFinite(num) && num > 0 ? num : null;
}

async function getSalesforceContactId(clientId: string): Promise<string | null> {
  const [row] = await db.select({ salesforceContactId: clients.salesforceContactId })
    .from(clients).where(eq(clients.id, clientId)).limit(1);
  return row?.salesforceContactId ?? null;
}

async function getSalesforceHouseholdId(clientId: string): Promise<string | null> {
  const [member] = await db.select({ householdId: householdMembers.householdId })
    .from(householdMembers).where(eq(householdMembers.clientId, clientId)).limit(1);
  if (!member) return null;
  const hhAccounts = await db.select({ sfAccountId: accounts.salesforceAccountId })
    .from(accounts).where(eq(accounts.householdId, member.householdId));
  const sfId = hhAccounts.find(a => a.sfAccountId && isSalesforceId(a.sfAccountId))?.sfAccountId;
  return sfId ?? null;
}

function isSalesforceId(id: string): boolean {
  return /^[a-zA-Z0-9]{15,18}$/.test(id) && !id.includes("-");
}

async function getAdvisorSalesforceUserId(advisorId: string): Promise<string | null> {
  if (isSalesforceId(advisorId)) return advisorId;
  const sfUserIdMap: Record<string, string> = {
    "sarah.mitchell@onedigital.com": "005Dn00000SaMtchAA",
  };
  const [advisor] = await db.select({ email: advisors.email })
    .from(advisors).where(eq(advisors.id, advisorId)).limit(1);
  return advisor ? (sfUserIdMap[advisor.email] ?? null) : null;
}

async function getHouseholdSalesforceAccountId(householdId: string): Promise<string | null> {
  if (isSalesforceId(householdId)) return householdId;
  const hhAccounts = await db.select({ sfAccountId: accounts.salesforceAccountId })
    .from(accounts).where(eq(accounts.householdId, householdId));
  const sfId = hhAccounts.find(a => a.sfAccountId && isSalesforceId(a.sfAccountId))?.sfAccountId;
  return sfId ?? null;
}

export const dashboardService = {
  async getSummaryCards(advisorId: string): Promise<DashboardSummaryCard[]> {
    const liveRepValue = await fetchOrionApi<{ id: number; name: string; currentValue: number }>(
      "/Portfolio/Representatives/Value",
    );

    const [orionRepValues, hhList, meetingCount] = await Promise.all([
      liveRepValue
        ? Promise.resolve([liveRepValue])
        : orionClient.getRepresentativesValue().catch(() => [] as OrionRepresentativeValue[]),
      db.select().from(households).where(eq(households.advisorId, advisorId)),
      db.select({ count: sql<number>`count(*)` }).from(meetings),
    ]);
    const repValue = (orionRepValues as OrionRepresentativeValue[]).find(r => String(r.id) === advisorId);
    const localAUM = hhList.reduce((sum, hh) => sum + parseFloat(String(hh.totalAum || "0")), 0);
    const totalAUM = repValue?.currentValue ?? localAUM;
    const aumSource: "orion" | "computed" = repValue ? "orion" : "computed";

    return [
      { label: "Total AUM", value: totalAUM, format: "currency", trendPct: 5.8, trendDirection: "up", source: aumSource },
      { label: "Total Clients", value: hhList.length, format: "number", trendPct: 2.1, trendDirection: "up", source: "salesforce" },
      { label: "Net Flows YTD", value: 0, format: "currency", trendPct: 0, trendDirection: "flat", source: "pending" }, // TODO: Wire to Orion Reporting/Scope contributions-and-withdrawals
      { label: "Meetings This Week", value: Number(meetingCount[0]?.count || 0), format: "number", trendPct: 0, trendDirection: "flat", source: "salesforce" },
    ];
  },

  async getBookSnapshot(advisorId: string): Promise<BookSnapshot> {
    const liveRepValue = await fetchOrionApi<{ id: number; currentValue: number }>(
      "/Portfolio/Representatives/Value",
    );

    const orionRepValues = liveRepValue
      ? [liveRepValue]
      : await orionClient.getRepresentativesValue().catch(() => [] as OrionRepresentativeValue[]);
    const repValue = (orionRepValues as OrionRepresentativeValue[]).find(r => String(r.id) === advisorId);

    if (repValue) {
      return {
        totalAUM: repValue.currentValue,
        revenueYTD: repValue.currentValue * 0.0065, // TODO: Replace with Orion GET /Billing/BillGenerator/Summary
        // Net flows set to 0 — previously faked with AUM multipliers.
        // TODO: Wire to Orion Reporting/Scope contributions-and-withdrawals at book level
        netFlowsMTD: 0,
        netFlowsQTD: 0,
        netFlowsYTD: 0,
      };
    }

    const hhList = await db.select().from(households).where(eq(households.advisorId, advisorId));
    const totalAUM = hhList.reduce((sum, hh) => sum + parseFloat(String(hh.totalAum || "0")), 0);
    return {
      totalAUM,
      revenueYTD: totalAUM * 0.0065, // TODO: Replace with Orion billing data
      netFlowsMTD: 0, // TODO: Wire to real Orion data
      netFlowsQTD: 0,
      netFlowsYTD: 0,
    };
  },

  async getSalesGoals(): Promise<SFSalesGoal[]> {
    return [
      { goalType: "recurring", label: "YTD Recurring Sales Goal", targetAmount: 350000, currentAmount: 285000, progressPct: 0.814, period: "YTD" },
      { goalType: "non-recurring", label: "YTD Non-Recurring Sales Goal", targetAmount: 120000, currentAmount: 47500, progressPct: 0.396, period: "YTD" },
    ];
  },

  async getTodaysSchedule(advisorId: string): Promise<MeetingDTO[]> {
    const sfAdvisorId = await getAdvisorSalesforceUserId(advisorId);
    if (sfAdvisorId) {
      const sfEvents = USE_REAL_SALESFORCE_API
        ? await fetchSalesforceApi<Array<{ Id: string; Subject: string; StartDateTime: string; EndDateTime?: string; Type?: string; WhoId?: string; Location?: string }>>(`/events?advisorId=${sfAdvisorId}&days=1`).then(r => r ?? []).catch(() => sfQueries.getUpcomingEvents(sfAdvisorId, 1).catch(() => []))
        : await sfQueries.getUpcomingEvents(sfAdvisorId, 1).catch(() => []);
      if (sfEvents.length > 0) {
        return sfEvents.map(ev => ({
          id: ev.Id,
          advisorId,
          clientId: ev.WhoId ?? null,
          title: ev.Subject,
          startTime: ev.StartDateTime,
          endTime: ev.EndDateTime ?? null,
          type: ev.Type ?? "meeting",
          status: "scheduled",
          notes: ev.Location ?? null,
          location: ev.Location ?? null,
          source: "salesforce" as const,
        }));
      }
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const meetingsList = await db.select().from(meetings).where(eq(meetings.advisorId, advisorId));
    return meetingsList
      .filter(m => {
        const mDate = m.startTime ? new Date(m.startTime).toISOString().split("T")[0] : null;
        return mDate === todayStr;
      })
      .map(m => ({
        id: m.id,
        advisorId: m.advisorId,
        clientId: m.clientId,
        title: m.title,
        startTime: m.startTime ?? "",
        endTime: m.endTime ?? null,
        type: m.type ?? "meeting",
        status: m.status ?? "scheduled",
        notes: m.notes ?? null,
        location: m.location ?? null,
        source: "local" as const,
      }));
  },

  async getUpcomingMeetings(advisorId: string): Promise<MeetingDTO[]> {
    const sfAdvisorId = await getAdvisorSalesforceUserId(advisorId);
    if (sfAdvisorId) {
      const sfEvents = USE_REAL_SALESFORCE_API
        ? await fetchSalesforceApi<Array<{ Id: string; Subject: string; StartDateTime: string; EndDateTime?: string; Type?: string; WhoId?: string; Location?: string }>>(`/events?advisorId=${sfAdvisorId}&days=14`).then(r => r ?? []).catch(() => sfQueries.getUpcomingEvents(sfAdvisorId, 14).catch(() => []))
        : await sfQueries.getUpcomingEvents(sfAdvisorId, 14).catch(() => []);
      if (sfEvents.length > 0) {
        return sfEvents.map(ev => ({
          id: ev.Id,
          advisorId,
          clientId: ev.WhoId ?? null,
          title: ev.Subject,
          startTime: ev.StartDateTime,
          endTime: ev.EndDateTime ?? null,
          type: ev.Type ?? "meeting",
          status: "scheduled",
          notes: ev.Location ?? null,
          location: ev.Location ?? null,
          source: "salesforce" as const,
        }));
      }
    }

    const meetingsList = await db.select().from(meetings)
      .where(and(eq(meetings.advisorId, advisorId), sql`${meetings.startTime} > NOW()`))
      .orderBy(asc(meetings.startTime))
      .limit(10);
    return meetingsList.map(m => ({
      id: m.id,
      advisorId: m.advisorId,
      clientId: m.clientId,
      title: m.title,
      startTime: m.startTime ?? "",
      endTime: m.endTime ?? null,
      type: m.type ?? "meeting",
      status: m.status ?? "scheduled",
      notes: m.notes ?? null,
      location: m.location ?? null,
      source: "local" as const,
    }));
  },

  async getAlerts(advisorId: string): Promise<typeof alerts.$inferSelect[]> {
    return db.select().from(alerts).where(eq(alerts.advisorId, advisorId)).orderBy(desc(alerts.createdAt));
  },

  async getTasks(advisorId: string): Promise<TaskDTO[]> {
    const sfAdvisorId = await getAdvisorSalesforceUserId(advisorId);
    if (sfAdvisorId) {
      const sfTasks = USE_REAL_SALESFORCE_API
        ? await fetchSalesforceApi<Array<{ Id: string; Subject: string; Status: string; Priority?: string; ActivityDate?: string; Type?: string; WhatId?: string; Description?: string }>>(`/tasks?advisorId=${sfAdvisorId}&status=open`).then(r => r ?? []).catch(() => sfQueries.getOpenTasksByAdvisor(sfAdvisorId).catch(() => []))
        : await sfQueries.getOpenTasksByAdvisor(sfAdvisorId).catch(() => []);
      if (sfTasks.length > 0) {
        return sfTasks.map(t => ({
          id: t.Id,
          advisorId,
          clientId: t.WhatId ?? null,
          title: t.Subject,
          description: t.Description ?? null,
          priority: t.Priority?.toLowerCase() ?? "normal",
          status: t.Status?.toLowerCase() ?? "open",
          dueDate: t.ActivityDate ?? null,
          category: t.Type ?? "follow-up",
          source: "salesforce" as const,
        }));
      }
    }

    const taskList = await db.select().from(tasks)
      .where(and(eq(tasks.advisorId, advisorId), sql`${tasks.status} != 'completed'`))
      .orderBy(asc(tasks.dueDate));
    return taskList.map(t => ({
      id: t.id,
      advisorId: t.advisorId,
      clientId: t.clientId,
      title: t.title,
      description: t.description,
      priority: t.priority ?? "normal",
      status: t.status,
      dueDate: t.dueDate,
      category: t.category || "follow-up",
      source: "local" as const,
    }));
  },

  async getGoals(householdId: string): Promise<SFFinancialGoal[]> {
    const sfHhId = await getHouseholdSalesforceAccountId(householdId);
    if (sfHhId) {
      return sfQueries.getFinancialGoals(sfHhId).catch(() => []);
    }
    return [];
  },
};

export const clientService = {
  async getRoster(advisorId: string): Promise<typeof clients.$inferSelect[]> {
    return db.select().from(clients).where(eq(clients.advisorId, advisorId));
  },

  async getHouseholds(advisorId: string): Promise<typeof households.$inferSelect[]> {
    return db.select().from(households).where(eq(households.advisorId, advisorId));
  },

  async getProfile(clientId: string): Promise<typeof clients.$inferSelect | null> {
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    return client || null;
  },

  async getAccounts(clientId: string): Promise<typeof accounts.$inferSelect[]> {
    const localAccounts = await db.select().from(accounts).where(eq(accounts.clientId, clientId));
    const orionIds = await getOrionAccountIds(localAccounts.map(a => a.id));
    if (orionIds.length > 0) {
      const orionPositions = await orionClient.batchAccountPositions(orionIds).catch(() => []);
      for (const acct of localAccounts) {
        const orionId = acct.orionAccountId ? Number(acct.orionAccountId) : null;
        if (orionId === null) continue;
        const acctPositions = orionPositions.filter(p => p.accountId === orionId);
        if (acctPositions.length > 0) {
          const totalMarketValue = acctPositions.reduce((sum, p) => sum + p.marketValue, 0);
          acct.balance = String(totalMarketValue);
        }
      }
    }
    return localAccounts;
  },

  async getAccountsByHousehold(householdId: string): Promise<typeof accounts.$inferSelect[]> {
    return db.select().from(accounts).where(eq(accounts.householdId, householdId));
  },

  async getHouseholdMembers(householdId: string): Promise<Array<typeof householdMembers.$inferSelect & { client: typeof clients.$inferSelect }>> {
    const members = await db.select().from(householdMembers).where(eq(householdMembers.householdId, householdId));
    const memberDetails: Array<typeof householdMembers.$inferSelect & { client: typeof clients.$inferSelect }> = [];
    for (const member of members) {
      const [client] = await db.select().from(clients).where(eq(clients.id, member.clientId)).limit(1);
      if (client) memberDetails.push({ ...member, client });
    }
    return memberDetails;
  },

  async getLifeEvents(clientId: string): Promise<typeof lifeEvents.$inferSelect[]> {
    return db.select().from(lifeEvents).where(eq(lifeEvents.clientId, clientId)).orderBy(desc(lifeEvents.eventDate));
  },

  async getTransactions(clientId: string): Promise<typeof transactions.$inferSelect[]> {
    const clientAccounts = await db.select().from(accounts).where(eq(accounts.clientId, clientId));
    const accountIds = clientAccounts.map(a => a.id);
    if (accountIds.length === 0) return [];

    return db.select().from(transactions)
      .where(sql`${transactions.accountId} IN (${sql.join(accountIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(desc(transactions.date));
  },

  async getDocuments(clientId: string): Promise<DocumentDTO[]> {
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    if (client) {
      const sfContactId = client.salesforceContactId;
      const sfHouseholdId = await getSalesforceHouseholdId(clientId);
      const sfEntityId = sfHouseholdId ?? sfContactId;
      if (sfEntityId && isSalesforceId(sfEntityId)) {
        const sfDocs = await sfQueries.getDocumentsByHousehold(sfEntityId).catch(() => []);
        if (sfDocs.length > 0) {
          return sfDocs.map(d => ({
            id: d.ContentDocument.Id,
            clientId,
            name: d.ContentDocument.Title,
            type: d.ContentDocument.FileType,
            status: "active",
            uploadDate: d.ContentDocument.CreatedDate,
            expirationDate: null,
            fileName: d.ContentDocument.Title,
            source: "salesforce" as const,
          }));
        }
      }
    }
    const localDocs = await db.select().from(documents).where(eq(documents.clientId, clientId));
    return localDocs.map(d => ({
      id: d.id,
      clientId: d.clientId,
      name: d.name,
      type: d.type,
      status: d.status,
      uploadDate: d.uploadDate ?? null,
      expirationDate: d.expirationDate ?? null,
      fileName: d.fileName ?? null,
      source: "local" as const,
    }));
  },

  async getTierDefinitions(): Promise<TierDefinition[]> {
    return [
      { tier: "A", label: "Tier A", minAUM: 3000000, color: "#22c55e", isConfirmed: false },
      { tier: "B", label: "Tier B", minAUM: 1000000, color: "#3b82f6", isConfirmed: false },
      { tier: "C", label: "Tier C", minAUM: 500000, color: "#eab308", isConfirmed: false },
      { tier: "D", label: "Tier D", minAUM: 0, color: "#94a3b8", isConfirmed: false },
    ];
  },
};

export const portfolioService = {
  async getAllocation(householdId: string): Promise<AllocationSlice[]> {
    const accts = await db.select().from(accounts).where(eq(accounts.householdId, householdId));
    const accountIds = accts.map(a => a.id);
    if (accountIds.length === 0) return [];
    const holdingsList = await db.select().from(holdings)
      .where(sql`${holdings.accountId} IN (${sql.join(accountIds.map(id => sql`${id}`), sql`, `)})`);
    const totalValue = holdingsList.reduce((sum, h) => sum + parseFloat(String(h.marketValue || "0")), 0);
    const sectorMap: Record<string, number> = {};
    holdingsList.forEach(h => {
      const sector = h.sector || "Other";
      sectorMap[sector] = (sectorMap[sector] || 0) + parseFloat(String(h.marketValue || "0"));
    });
    return Object.entries(sectorMap).map(([sector, value]) => ({
      assetClass: sector,
      marketValue: value,
      percentOfTotal: totalValue > 0 ? (value / totalValue) * 100 : 0,
      targetPct: 0,
      driftPct: 0,
    }));
  },

  async getHoldings(householdId: string): Promise<typeof holdings.$inferSelect[]> {
    const accts = await db.select().from(accounts).where(eq(accounts.householdId, householdId));
    const accountIds = accts.map(a => a.id);
    if (accountIds.length === 0) return [];
    return db.select().from(holdings)
      .where(sql`${holdings.accountId} IN (${sql.join(accountIds.map(id => sql`${id}`), sql`, `)})`);
  },

  async getPerformance(householdId: string): Promise<typeof performance.$inferSelect[]> {
    return db.select().from(performance).where(eq(performance.householdId, householdId));
  },

  async getAlternatives(householdId: string): Promise<OrionUnmanagedAsset[]> {
    return orionClient.getUnmanagedAssets().catch(() => []);
  },

  async getProjection(householdId: string): Promise<{
    currentValue: number;
    projectedValue: number;
    horizon: number;
    assumptions: { growthRate: number; inflationRate: number; withdrawalRate: number };
  } | null> {
    const hhAccounts = await db.select().from(accounts).where(eq(accounts.householdId, householdId));
    if (hhAccounts.length === 0) return null;
    const currentValue = hhAccounts.reduce((sum, a) => sum + parseFloat(String(a.balance || "0")), 0);
    const growthRate = 0.065;
    const inflationRate = 0.025;
    const withdrawalRate = 0.04;
    const horizon = 10;
    const realGrowth = growthRate - inflationRate;
    const projectedValue = currentValue * Math.pow(1 + realGrowth, horizon);
    return { currentValue, projectedValue, horizon, assumptions: { growthRate, inflationRate, withdrawalRate } };
  },

  async getMarket(): Promise<Array<{ index: string; value: number; changePct: number; asOf: string }>> {
    return [
      { index: "S&P 500", value: 5200, changePct: 0.45, asOf: new Date().toISOString() },
      { index: "DJIA", value: 39500, changePct: 0.32, asOf: new Date().toISOString() },
      { index: "NASDAQ", value: 16800, changePct: 0.58, asOf: new Date().toISOString() },
      { index: "10Y Treasury", value: 4.25, changePct: -0.02, asOf: new Date().toISOString() },
    ];
  },
};

export const analyticsService = {
  async getKPIs(advisorId: string): Promise<AnalyticsKPIs> {
    const [orionRepValues, hhList, clientList] = await Promise.all([
      orionClient.getRepresentativesValue().catch(() => [] as OrionRepresentativeValue[]),
      db.select().from(households).where(eq(households.advisorId, advisorId)),
      db.select().from(clients).where(eq(clients.advisorId, advisorId)),
    ]);
    const repValue = orionRepValues.find(r => String(r.id) === advisorId);
    const localAUM = hhList.reduce((sum, hh) => sum + parseFloat(String(hh.totalAum || "0")), 0);
    const totalAUM = repValue?.currentValue ?? localAUM;
    return {
      totalAUM,
      totalClients: clientList.length,
      totalHouseholds: hhList.length,
      // TODO: Wire to real Orion Reporting/Scope contributions-and-withdrawals data
      // when available for non-MuleSoft users. See getContributionsForRange() in mulesoft/api.ts.
      netFlowsYTD: 0,
      revenueYTD: totalAUM * 0.0065,
    };
  },

  async getAUMBySegment(advisorId: string): Promise<AUMSegment[]> {
    const clientList = await db.select().from(clients).where(eq(clients.advisorId, advisorId));
    const segments: Record<string, { aum: number; clientCount: number }> = {
      A: { aum: 0, clientCount: 0 },
      B: { aum: 0, clientCount: 0 },
      C: { aum: 0, clientCount: 0 },
      D: { aum: 0, clientCount: 0 },
    };

    const orionRepValues = await orionClient.getRepresentativesValue().catch(() => []);

    for (const c of clientList) {
      const seg = c.segment || "D";
      if (segments[seg]) {
        segments[seg].clientCount++;
        const accts = await db.select().from(accounts).where(eq(accounts.clientId, c.id));
        const orionIds = await getOrionAccountIds(accts.map(a => a.id));
        if (orionIds.length > 0) {
          const positions = await orionClient.batchAccountPositions(orionIds).catch(() => []);
          if (positions.length > 0) {
            segments[seg].aum += positions.reduce((sum, p) => sum + p.marketValue, 0);
            continue;
          }
        }
        segments[seg].aum += accts.reduce((sum, a) => sum + parseFloat(String(a.balance || "0")), 0);
      }
    }

    const totalOrionAUM = orionRepValues.reduce((sum, r) => sum + (r.currentValue ?? 0), 0);
    const totalLocalAUM = Object.values(segments).reduce((s, d) => s + d.aum, 0);
    const scaleFactor = totalOrionAUM > 0 && totalLocalAUM > 0 ? totalOrionAUM / totalLocalAUM : 1;

    return Object.entries(segments).map(([segment, data]) => ({
      segment,
      aum: data.aum * scaleFactor,
      clientCount: data.clientCount,
      revenueEstimate: data.aum * scaleFactor * 0.0065,
      atRiskCount: 0,
    }));
  },

  async getAtRiskClients(advisorId: string): Promise<Array<{
    clientId: string;
    clientName: string;
    riskScore: number;
    riskFactors: string[];
    lastContactDate: string | null;
    daysSinceContact: number;
  }>> {
    const clientList = await db.select().from(clients).where(eq(clients.advisorId, advisorId));
    const atRisk: Array<{
      clientId: string;
      clientName: string;
      riskScore: number;
      riskFactors: string[];
      lastContactDate: string | null;
      daysSinceContact: number;
    }> = [];

    const now = new Date();
    for (const c of clientList) {
      const riskFactors: string[] = [];
      let riskScore = 0;

      const lastContact = c.lastContactDate ? new Date(c.lastContactDate) : null;
      const daysSinceContact = lastContact ? Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24)) : 365;

      if (daysSinceContact > 90) {
        riskFactors.push("No contact in 90+ days");
        riskScore += 30;
      }
      if (daysSinceContact > 180) {
        riskFactors.push("No contact in 180+ days");
        riskScore += 20;
      }

      const clientCompliance = await db.select().from(complianceItems).where(
        and(eq(complianceItems.clientId, c.id), eq(complianceItems.status, "expiring_soon"))
      );
      if (clientCompliance.length > 0) {
        riskFactors.push(`${clientCompliance.length} expiring compliance item(s)`);
        riskScore += 15 * clientCompliance.length;
      }

      if (riskScore >= 30) {
        atRisk.push({
          clientId: c.id,
          clientName: `${c.firstName} ${c.lastName}`,
          riskScore,
          riskFactors,
          lastContactDate: c.lastContactDate,
          daysSinceContact,
        });
      }
    }

    return atRisk.sort((a, b) => b.riskScore - a.riskScore);
  },

  async getCapacity(advisorId: string): Promise<CapacityMetrics> {
    const [clientList, hhList] = await Promise.all([
      db.select().from(clients).where(eq(clients.advisorId, advisorId)),
      db.select().from(households).where(eq(households.advisorId, advisorId)),
    ]);
    return {
      currentClients: clientList.length,
      currentHouseholds: hhList.length,
      maxCapacity: 150,
      utilizationPct: (clientList.length / 150) * 100,
      segmentBreakdown: [
        { segment: "A", count: clientList.filter(c => c.segment === "A").length },
        { segment: "B", count: clientList.filter(c => c.segment === "B").length },
        { segment: "C", count: clientList.filter(c => c.segment === "C").length },
        { segment: "D", count: clientList.filter(c => c.segment === "D").length },
      ],
    };
  },
};

export const complianceService = {
  async getItems(advisorId: string): Promise<typeof complianceItems.$inferSelect[]> {
    return db.select().from(complianceItems).where(eq(complianceItems.advisorId, advisorId));
  },

  async getHealthScore(advisorId: string): Promise<ComplianceHealthScore> {
    const items = await db.select().from(complianceItems).where(eq(complianceItems.advisorId, advisorId));
    const current = items.filter(i => i.status === "current").length;
    const expiringSoon = items.filter(i => i.status === "expiring_soon").length;
    const overdue = items.filter(i => i.status === "overdue").length;
    const pending = items.filter(i => i.status === "pending").length;
    const total = items.length;
    const healthPct = total > 0 ? Math.round((current / total) * 100) : 100;
    return { overallHealthPct: healthPct, current, expiringSoon, overdue, pending, total };
  },

  async getCategories(): Promise<ComplianceCategory[]> {
    return [
      { key: "risk_profile_review", label: "Risk Profile Review" },
      { key: "ips_review", label: "IPS Review" },
      { key: "estate_plan_review", label: "Estate Plan Review" },
      { key: "suitability_review", label: "Suitability Review" },
      { key: "concentrated_position", label: "Concentrated Position Documentation" },
      { key: "beneficiary_update", label: "Beneficiary Update" },
      { key: "insurance_review", label: "Insurance Review" },
    ];
  },
};

export const engagementService = {
  async getActionQueue(advisorId: string): Promise<ActionQueueItem[]> {
    const sfAdvisorId = await getAdvisorSalesforceUserId(advisorId);
    if (sfAdvisorId) {
      const sfTasks = await sfQueries.getOpenTasksByAdvisor(sfAdvisorId).catch(() => []);
      if (sfTasks.length > 0) {
        return sfTasks.map((t, i) => ({
          rank: i + 1,
          action: t.Subject,
          clientId: t.WhatId ?? null,
          priority: t.Priority?.toLowerCase() ?? null,
          category: t.Type ?? "follow-up",
          dueDate: t.ActivityDate ?? null,
          status: t.Status,
        }));
      }
    }

    const taskList = await db.select().from(tasks)
      .where(and(eq(tasks.advisorId, advisorId), sql`${tasks.status} != 'completed'`))
      .orderBy(asc(tasks.dueDate));
    return taskList.map((t, i) => ({
      rank: i + 1,
      action: t.title,
      clientId: t.clientId,
      priority: t.priority,
      category: t.category || "follow-up",
      dueDate: t.dueDate,
      status: t.status,
    }));
  },

  async getEngagementScores(advisorId: string): Promise<EngagementScore[]> {
    const clientList = await db.select().from(clients).where(eq(clients.advisorId, advisorId));
    return clientList.map(c => ({
      clientId: c.id,
      clientName: `${c.firstName} ${c.lastName}`,
      segment: c.segment,
      lastContactDate: c.lastContactDate,
      activitiesLast90Days: 0,
      engagementLevel: c.lastContactDate
        ? (daysSince(c.lastContactDate) < 30 ? "high" : daysSince(c.lastContactDate) < 60 ? "medium" : "low")
        : "low",
      source: "local" as const,
    }));
  },
};

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export const taxService = {
  async getTLHOpps(householdId: string): Promise<OrionTaxLossHarvestingResult[]> {
    const hhAccounts = await db.select().from(accounts).where(eq(accounts.householdId, householdId));
    const orionIds = await getOrionAccountIds(hhAccounts.map(a => a.id));
    if (orionIds.length === 0) return [];
    return orionClient.postTaxLossHarvesting({ accountIds: orionIds }).catch(() => []);
  },

  async getRebalance(householdId: string): Promise<OrionRebalanceProposal[]> {
    const hhAccounts = await db.select().from(accounts).where(eq(accounts.householdId, householdId));
    const orionIds = await getOrionAccountIds(hhAccounts.map(a => a.id));
    if (orionIds.length === 0) return [];
    return orionClient.postRebalance({ accountIds: orionIds }).catch(() => []);
  },

  async getRothConversionOpps(householdId: string): Promise<Array<{
    accountId: string;
    accountType: string;
    balance: number;
    estimatedTax: number;
    recommendedAmount: number;
    rationale: string;
  }>> {
    const hhAccounts = await db.select().from(accounts).where(eq(accounts.householdId, householdId));
    const iraAccounts = hhAccounts.filter(a =>
      a.accountType?.toLowerCase().includes("traditional ira") ||
      a.accountType?.toLowerCase().includes("rollover")
    );
    if (iraAccounts.length === 0) return [];

    return iraAccounts.map(a => {
      const balance = parseFloat(String(a.balance || "0"));
      const recommendedAmount = Math.min(balance * 0.1, 50000);
      return {
        accountId: a.id,
        accountType: a.accountType || "Traditional IRA",
        balance,
        estimatedTax: recommendedAmount * 0.24,
        recommendedAmount,
        rationale: balance > 500000
          ? "Large pre-tax balance; partial conversion reduces future RMD burden"
          : "Consider conversion in lower-income year to reduce future tax liability",
      };
    });
  },

  async getTaxProjection(householdId: string): Promise<OrionReportingScopeResponse[]> {
    const hhAccounts = await db.select().from(accounts).where(eq(accounts.householdId, householdId));
    const orionIds = await getOrionAccountIds(hhAccounts.map(a => a.id));
    if (orionIds.length === 0) return [];
    const scopeRequest: OrionReportingScopeRequest = {
      entity: "Account",
      entityIds: orionIds,
      managed: 16,
    };
    return orionClient.postReportingScope(scopeRequest).catch(() => []);
  },

  async getTaxLots(accountId: string): Promise<OrionTaxLot[]> {
    const orionId = await getOrionAccountId(accountId);
    if (orionId === null) return [];
    return orionClient.getAccountTaxLots(orionId).catch(() => []);
  },

  async getRMDs(householdId: string): Promise<OrionRmdCalculation[]> {
    const hhAccounts = await db.select().from(accounts).where(eq(accounts.householdId, householdId));
    const rmdResults: OrionRmdCalculation[] = [];
    for (const acct of hhAccounts) {
      const orionId = acct.orionAccountId ? Number(acct.orionAccountId) : null;
      if (orionId === null || !Number.isFinite(orionId)) continue;
      const rmd = await orionClient.getAccountRmdCalculation(orionId).catch(() => null);
      if (rmd) rmdResults.push(rmd);
    }
    return rmdResults;
  },
};

export const billingService = {
  async getRevenueYTD(advisorId: string): Promise<RevenueYTD> {
    const liveBilling = await fetchOrionApi<{ totalFees: number; totalAssets: number; effectiveRate: number }>(
      "/Billing/Summary",
    );
    if (liveBilling) {
      return liveBilling;
    }
    const orionSummary = await orionClient.getBillingSummary().catch(() => null);
    if (orionSummary) {
      return {
        totalFees: orionSummary.totalFees,
        totalAssets: orionSummary.totalAssets,
        effectiveRate: orionSummary.effectiveRate,
      };
    }

    const hhList = await db.select().from(households).where(eq(households.advisorId, advisorId));
    const totalAUM = hhList.reduce((sum, hh) => sum + parseFloat(String(hh.totalAum || "0")), 0);
    return {
      totalFees: totalAUM * 0.0065,
      totalAssets: totalAUM,
      effectiveRate: 0.0065,
    };
  },
};

export const planningService = {
  async getNetWorth(clientId: string): Promise<NetWorthSummary> {
    const clientAccounts = await db.select().from(accounts).where(eq(accounts.clientId, clientId));
    const orionAccountIds = await getOrionAccountIds(clientAccounts.map(a => a.id));
    if (orionAccountIds.length > 0) {
      const positions = await orionClient.batchAccountPositions(orionAccountIds).catch(() => []);
      if (positions.length > 0) {
        const orionTotalValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
        return {
          totalAssets: orionTotalValue,
          totalLiabilities: 0,
          netWorth: orionTotalValue,
        };
      }
    }

    const totalAssets = clientAccounts.reduce((sum, a) => sum + parseFloat(String(a.balance || "0")), 0);
    return {
      totalAssets,
      totalLiabilities: 0,
      netWorth: totalAssets,
    };
  },

  async getAggregatedAccounts(clientId: string): Promise<typeof accounts.$inferSelect[]> {
    return db.select().from(accounts).where(eq(accounts.clientId, clientId));
  },
};

export const riskService = {
  async getRiskProfile(orionClientId: number): Promise<OrionHiddenLeversRiskProfile | null> {
    return orionClient.getRiskProfile({ clientId: orionClientId }).catch(() => null);
  },

  async getStressTest(orionClientId: number): Promise<OrionHiddenLeversStressTest[]> {
    return orionClient.getStressTestClient(orionClientId).catch(() => []);
  },

  async getSurveyResults(): Promise<OrionSurveyResult[]> {
    return orionClient.getSurveyResults().catch(() => []);
  },
};

export const configService = {
  async getAdvisor(advisorId: string): Promise<typeof advisors.$inferSelect | null> {
    const [advisor] = await db.select().from(advisors).where(eq(advisors.id, advisorId)).limit(1);
    if (!advisor) return null;

    const sfUserId = await getAdvisorSalesforceUserId(advisorId);
    if (sfUserId) {
      const sfProfile = await sfQueries.getAdvisorProfile(sfUserId).catch(() => null);
      if (sfProfile) {
        return {
          ...advisor,
          name: `${sfProfile.FirstName ?? ""} ${sfProfile.LastName ?? ""}`.trim() || advisor.name,
          email: sfProfile.Email ?? advisor.email,
          phone: sfProfile.Phone ?? advisor.phone,
          title: sfProfile.Title ?? advisor.title,
        };
      }
    }

    return advisor;
  },

  async getOrionMappings(): Promise<OrionMapping[]> {
    return [
      { orionIdType: "Client", orionIdValue: "Client ID", sfField: "Orion_Client_Id__c" },
      { orionIdType: "Account", orionIdValue: "Account Number", sfField: "Orion_Account_Id__c" },
      { orionIdType: "Representative", orionIdValue: "Rep Number", sfField: "Orion_Rep_Id__c" },
      { orionIdType: "Registration", orionIdValue: "Registration ID", sfField: "Orion_Registration_Id__c" },
      { orionIdType: "Portfolio", orionIdValue: "Portfolio ID", sfField: "Orion_Portfolio_Id__c" },
      { orionIdType: "Model", orionIdValue: "Model ID", sfField: "Orion_Model_Id__c" },
      { orionIdType: "Asset", orionIdValue: "Asset ID", sfField: "Orion_Asset_Id__c" },
      { orionIdType: "Transaction", orionIdValue: "Transaction ID", sfField: "Orion_Transaction_Id__c" },
      { orionIdType: "Bill", orionIdValue: "Bill Instance ID", sfField: "Orion_Bill_Id__c" },
      { orionIdType: "Report", orionIdValue: "Report ID", sfField: "Orion_Report_Id__c" },
      { orionIdType: "FeeSchedule", orionIdValue: "Fee Schedule ID", sfField: "Orion_FeeSchedule_Id__c" },
      { orionIdType: "BenchmarkGroup", orionIdValue: "Benchmark Group ID", sfField: "Orion_Benchmark_Id__c" },
      { orionIdType: "HouseholdGroup", orionIdValue: "Household Group ID", sfField: "Orion_HHGroup_Id__c" },
    ];
  },

  async getNavItems(role: "advisor" | "admin" = "advisor"): Promise<NavItem[]> {
    const baseItems: NavItem[] = [
      { title: "My Day", url: "/", iconName: "LayoutDashboard" },
      { title: "Clients", url: "/clients", iconName: "Users" },
      { title: "Calendar", url: "/calendar", iconName: "Calendar" },
      { title: "Analytics", url: "/analytics", iconName: "BarChart3" },
      { title: "Compliance", url: "/compliance", iconName: "Shield" },
    ];
    if (role === "admin") {
      baseItems.push({ title: "Admin", url: "/admin", iconName: "Settings" });
    }
    return baseItems;
  },
};

export type DashboardServiceType = typeof dashboardService;
export type BillingServiceType = typeof billingService;
export type PlanningServiceType = typeof planningService;
export type RiskServiceType = typeof riskService;
export type ConfigServiceType = typeof configService;

export const localDashboardService: DashboardServiceType = {
  async getSummaryCards(advisorId) {
    const [orionRepValues, hhList, meetingCount] = await Promise.all([
      orionClient.getRepresentativesValue().catch(() => [] as OrionRepresentativeValue[]),
      db.select().from(households).where(eq(households.advisorId, advisorId)),
      db.select({ count: sql<number>`count(*)` }).from(meetings),
    ]);
    const repValue = orionRepValues.find(r => String(r.id) === advisorId);
    const localAUM = hhList.reduce((sum, hh) => sum + parseFloat(String(hh.totalAum || "0")), 0);
    const totalAUM = repValue?.currentValue ?? localAUM;
    const aumSource: "orion" | "computed" = repValue ? "orion" : "computed";
    return [
      { label: "Total AUM", value: totalAUM, format: "currency", trendPct: 5.8, trendDirection: "up", source: aumSource },
      { label: "Total Clients", value: hhList.length, format: "number", trendPct: 2.1, trendDirection: "up", source: "salesforce" },
      { label: "Net Flows YTD", value: 0, format: "currency", trendPct: 0, trendDirection: "flat", source: "pending" }, // TODO: Wire to Orion Reporting/Scope contributions-and-withdrawals
      { label: "Meetings This Week", value: Number(meetingCount[0]?.count || 0), format: "number", trendPct: 0, trendDirection: "flat", source: "salesforce" },
    ];
  },
  async getBookSnapshot(advisorId) {
    const orionRepValues = await orionClient.getRepresentativesValue().catch(() => [] as OrionRepresentativeValue[]);
    const repValue = orionRepValues.find(r => String(r.id) === advisorId);
    if (repValue) {
      // TODO: Wire to real Orion Reporting/Scope contributions-and-withdrawals data.
      // See getContributionsForRange() in mulesoft/api.ts for the pattern.
      return {
        totalAUM: repValue.currentValue, revenueYTD: repValue.currentValue * 0.0065,
        netFlowsMTD: 0, netFlowsQTD: 0,
        netFlowsYTD: 0,
      };
    }
    const hhList = await db.select().from(households).where(eq(households.advisorId, advisorId));
    const totalAUM = hhList.reduce((sum, hh) => sum + parseFloat(String(hh.totalAum || "0")), 0);
    // TODO: Wire to real Orion Reporting/Scope data for non-MuleSoft users
    return { totalAUM, revenueYTD: totalAUM * 0.0065, netFlowsMTD: 0, netFlowsQTD: 0, netFlowsYTD: 0 };
  },
  getSalesGoals: dashboardService.getSalesGoals,
  getTodaysSchedule: async (advisorId) => {
    const sfAdvisorId = await getAdvisorSalesforceUserId(advisorId);
    if (sfAdvisorId) {
      const sfEvents = await sfQueries.getUpcomingEvents(sfAdvisorId, 1).catch(() => []);
      if (sfEvents.length > 0) {
        return sfEvents.map(ev => ({
          id: ev.Id, advisorId, clientId: ev.WhoId ?? null, title: ev.Subject,
          startTime: ev.StartDateTime, endTime: ev.EndDateTime ?? null, type: ev.Type ?? "meeting",
          status: "scheduled", notes: ev.Location ?? null, location: ev.Location ?? null, source: "salesforce" as const,
        }));
      }
    }
    const meetingsList = await db.select().from(meetings)
      .where(and(eq(meetings.advisorId, advisorId), sql`DATE(${meetings.startTime}) = CURRENT_DATE`))
      .orderBy(asc(meetings.startTime));
    return meetingsList.map(m => ({
      id: m.id, advisorId: m.advisorId, clientId: m.clientId, title: m.title,
      startTime: m.startTime ?? "", endTime: m.endTime ?? null, type: m.type ?? "meeting",
      status: m.status ?? "scheduled", notes: m.notes ?? null, location: m.location ?? null, source: "local" as const,
    }));
  },
  getUpcomingMeetings: async (advisorId) => {
    const sfAdvisorId = await getAdvisorSalesforceUserId(advisorId);
    if (sfAdvisorId) {
      const sfEvents = await sfQueries.getUpcomingEvents(sfAdvisorId, 14).catch(() => []);
      if (sfEvents.length > 0) {
        return sfEvents.map(ev => ({
          id: ev.Id, advisorId, clientId: ev.WhoId ?? null, title: ev.Subject,
          startTime: ev.StartDateTime, endTime: ev.EndDateTime ?? null, type: ev.Type ?? "meeting",
          status: "scheduled", notes: ev.Location ?? null, location: ev.Location ?? null, source: "salesforce" as const,
        }));
      }
    }
    const meetingsList = await db.select().from(meetings)
      .where(and(eq(meetings.advisorId, advisorId), sql`${meetings.startTime} > NOW()`))
      .orderBy(asc(meetings.startTime)).limit(10);
    return meetingsList.map(m => ({
      id: m.id, advisorId: m.advisorId, clientId: m.clientId, title: m.title,
      startTime: m.startTime ?? "", endTime: m.endTime ?? null, type: m.type ?? "meeting",
      status: m.status ?? "scheduled", notes: m.notes ?? null, location: m.location ?? null, source: "local" as const,
    }));
  },
  getAlerts: dashboardService.getAlerts,
  getTasks: async (advisorId) => {
    const sfAdvisorId = await getAdvisorSalesforceUserId(advisorId);
    if (sfAdvisorId) {
      const sfTasks = await sfQueries.getOpenTasksByAdvisor(sfAdvisorId).catch(() => []);
      if (sfTasks.length > 0) {
        return sfTasks.map(t => ({
          id: t.Id, advisorId, clientId: t.WhatId ?? null, title: t.Subject,
          description: t.Description ?? null, priority: t.Priority?.toLowerCase() ?? "normal",
          status: t.Status?.toLowerCase() ?? "open", dueDate: t.ActivityDate ?? null,
          category: t.Type ?? "follow-up", source: "salesforce" as const,
        }));
      }
    }
    const taskList = await db.select().from(tasks)
      .where(and(eq(tasks.advisorId, advisorId), sql`${tasks.status} != 'completed'`))
      .orderBy(asc(tasks.dueDate));
    return taskList.map(t => ({
      id: t.id, advisorId: t.advisorId, clientId: t.clientId, title: t.title,
      description: t.description, priority: t.priority ?? "normal", status: t.status,
      dueDate: t.dueDate, category: t.category || "follow-up", source: "local" as const,
    }));
  },
  getGoals: dashboardService.getGoals,
};

function extractRepValue(
  data: unknown,
  advisorId: string,
): { currentValue: number } | null {
  const arr = Array.isArray(data) ? data : data ? [data] : [];
  const match = arr.find((r: { id?: number | string }) => String(r.id) === advisorId);
  if (match && typeof match.currentValue === "number" && Number.isFinite(match.currentValue)) {
    return { currentValue: match.currentValue };
  }
  return null;
}

export const realDashboardService: DashboardServiceType = {
  ...localDashboardService,
  async getSummaryCards(advisorId) {
    const liveData = await fetchOrionApi<Array<{ id: number; name: string; currentValue: number }>>("/Portfolio/Representatives/Value");
    const repValue = extractRepValue(liveData, advisorId);
    if (repValue) {
      const [hhList, meetingCount] = await Promise.all([
        db.select().from(households).where(eq(households.advisorId, advisorId)),
        db.select({ count: sql<number>`count(*)` }).from(meetings),
      ]);
      return transformRepValueToDashboardCards(repValue, hhList.length, Number(meetingCount[0]?.count || 0));
    }
    return localDashboardService.getSummaryCards(advisorId);
  },
  async getBookSnapshot(advisorId) {
    const liveData = await fetchOrionApi<Array<{ id: number; currentValue: number }>>("/Portfolio/Representatives/Value");
    const repValue = extractRepValue(liveData, advisorId);
    if (repValue) {
      return transformRepValueToBookSnapshot(repValue);
    }
    return localDashboardService.getBookSnapshot(advisorId);
  },
  async getTodaysSchedule(advisorId) {
    const sfAdvisorId = await getAdvisorSalesforceUserId(advisorId);
    if (sfAdvisorId) {
      const liveEvents = await fetchSalesforceApi<ApiSfEvent[]>(`/events?advisorId=${sfAdvisorId}&days=1`);
      if (liveEvents && liveEvents.length > 0) {
        return liveEvents.map(ev => transformSfEventToMeeting(ev, advisorId));
      }
    }
    return localDashboardService.getTodaysSchedule(advisorId);
  },
  async getUpcomingMeetings(advisorId) {
    const sfAdvisorId = await getAdvisorSalesforceUserId(advisorId);
    if (sfAdvisorId) {
      const liveEvents = await fetchSalesforceApi<ApiSfEvent[]>(`/events?advisorId=${sfAdvisorId}&days=14`);
      if (liveEvents && liveEvents.length > 0) {
        return liveEvents.map(ev => transformSfEventToMeeting(ev, advisorId));
      }
    }
    return localDashboardService.getUpcomingMeetings(advisorId);
  },
  async getTasks(advisorId) {
    const sfAdvisorId = await getAdvisorSalesforceUserId(advisorId);
    if (sfAdvisorId) {
      const liveTasks = await fetchSalesforceApi<ApiSfTask[]>(`/tasks?advisorId=${sfAdvisorId}&status=open`);
      if (liveTasks && liveTasks.length > 0) {
        return liveTasks.map(t => transformSfTaskToTask(t, advisorId));
      }
    }
    return localDashboardService.getTasks(advisorId);
  },
};

export const localBillingService: BillingServiceType = {
  async getRevenueYTD(advisorId) {
    const orionSummary = await orionClient.getBillingSummary().catch(() => null);
    if (orionSummary) {
      return { totalFees: orionSummary.totalFees, totalAssets: orionSummary.totalAssets, effectiveRate: orionSummary.effectiveRate };
    }
    const hhList = await db.select().from(households).where(eq(households.advisorId, advisorId));
    const totalAUM = hhList.reduce((sum, hh) => sum + parseFloat(String(hh.totalAum || "0")), 0);
    return { totalFees: totalAUM * 0.0065, totalAssets: totalAUM, effectiveRate: 0.0065 };
  },
};

export const realBillingService: BillingServiceType = {
  async getRevenueYTD(advisorId) {
    const liveBilling = await fetchOrionApi<{ totalFees: number; totalAssets: number; effectiveRate: number }>("/Billing/Summary");
    if (liveBilling) return liveBilling;
    return localBillingService.getRevenueYTD(advisorId);
  },
};

export const localPlanningService: PlanningServiceType = planningService;
export const realPlanningService: PlanningServiceType = planningService;
export const localRiskService: RiskServiceType = riskService;
export const realRiskService: RiskServiceType = riskService;
export const localConfigService: ConfigServiceType = configService;
export const realConfigService: ConfigServiceType = configService;

export const activeDashboardService: DashboardServiceType = USE_REAL_API ? realDashboardService : localDashboardService;
export const activeBillingService: BillingServiceType = USE_REAL_API ? realBillingService : localBillingService;
export const activePlanningService: PlanningServiceType = USE_REAL_API ? realPlanningService : localPlanningService;
export const activeRiskService: RiskServiceType = USE_REAL_API ? realRiskService : localRiskService;
export const activeConfigService: ConfigServiceType = USE_REAL_API ? realConfigService : localConfigService;

export function getServices() {
  return {
    dashboard: activeDashboardService,
    billing: activeBillingService,
    planning: activePlanningService,
    risk: activeRiskService,
    config: activeConfigService,
    apiSource: getApiSource(),
  };
}
