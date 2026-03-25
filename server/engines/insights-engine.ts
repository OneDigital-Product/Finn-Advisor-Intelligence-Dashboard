import { storage } from "../storage";
import type { InsertInsight } from "@shared/schema";
import { UnderinsuranceGenerator } from "./generators/underinsurance-generator";
import { TaxHarvestingGenerator } from "./generators/tax-harvesting-generator";
import { EstateGapGenerator } from "./generators/estate-gap-generator";
import { EngagementGenerator } from "./generators/engagement-generator";
import { AumTrendGenerator } from "./generators/aum-trend-generator";
import { ConcentrationGenerator } from "./generators/concentration-generator";

const generators = [
  new UnderinsuranceGenerator(),
  new TaxHarvestingGenerator(),
  new EstateGapGenerator(),
  new EngagementGenerator(),
  new AumTrendGenerator(),
  new ConcentrationGenerator(),
];

export interface InsightsSummary {
  totalGenerated: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  clientsAnalyzed: number;
}

export async function generateInsightsForAdvisor(advisorId: string): Promise<InsightsSummary> {
  const clients = await storage.getClients(advisorId);

  await storage.deleteInsightsByAdvisor(advisorId, true);

  const allInsights: InsertInsight[] = [];

  const batchSize = 5;
  for (let i = 0; i < clients.length; i += batchSize) {
    const batch = clients.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((client) => generateForSingleClient(client, advisorId))
    );
    for (const results of batchResults) {
      allInsights.push(...results);
    }
  }

  if (allInsights.length > 0) {
    await storage.createInsights(allInsights);
  }

  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  for (const insight of allInsights) {
    const t = insight.insightType || "unknown";
    const s = insight.severity || "medium";
    byType[t] = (byType[t] || 0) + 1;
    bySeverity[s] = (bySeverity[s] || 0) + 1;
  }

  return {
    totalGenerated: allInsights.length,
    byType,
    bySeverity,
    clientsAnalyzed: clients.length,
  };
}

export async function generateInsightsForClient(clientId: string, advisorId: string): Promise<InsightsSummary> {
  const client = await storage.getClient(clientId);
  if (!client) throw new Error(`Client ${clientId} not found`);

  const existing = await storage.getInsightsByClient(clientId);
  for (const ins of existing) {
    if (!ins.isDismissed) {
      await storage.dismissInsight(ins.id);
    }
  }

  const allInsights = await generateForSingleClient(client, advisorId);

  if (allInsights.length > 0) {
    await storage.createInsights(allInsights);
  }

  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  for (const insight of allInsights) {
    const t = insight.insightType || "unknown";
    const s = insight.severity || "medium";
    byType[t] = (byType[t] || 0) + 1;
    bySeverity[s] = (bySeverity[s] || 0) + 1;
  }

  return {
    totalGenerated: allInsights.length,
    byType,
    bySeverity,
    clientsAnalyzed: 1,
  };
}

export async function pruneExpiredInsights(): Promise<number> {
  return storage.deleteExpiredInsights();
}

async function generateForSingleClient(client: any, advisorId: string): Promise<InsertInsight[]> {
  const results = await Promise.allSettled(
    generators.map((gen) => gen.generate(client, advisorId))
  );

  const allInsights: InsertInsight[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allInsights.push(...result.value);
    }
  }
  return allInsights;
}
