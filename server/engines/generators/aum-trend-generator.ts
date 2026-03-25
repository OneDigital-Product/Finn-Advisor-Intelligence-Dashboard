import { storage } from "../../storage";
import { logger } from "../../lib/logger";
import type { InsertInsight } from "@shared/schema";

export class AumTrendGenerator {
  async generate(client: any, advisorId: string): Promise<InsertInsight[]> {
    try {
      const accounts = await storage.getAccountsByClient(client.id);
      if (accounts.length === 0) return [];

      let perfData: any[] = [];
      if (accounts[0].householdId) {
        perfData = await storage.getPerformanceByHousehold(accounts[0].householdId);
      }
      if (perfData.length === 0 && accounts[0].id) {
        perfData = await storage.getPerformanceByAccount(accounts[0].id);
      }
      if (perfData.length === 0) return [];

      const ytd = perfData.find((p: any) => p.period === "YTD");
      const oneYear = perfData.find((p: any) => p.period === "1Y" || p.period === "12M");
      const threeYear = perfData.find((p: any) => p.period === "3Y" || p.period === "36M");

      const perf = ytd || oneYear || threeYear;
      if (!perf) return [];

      const clientReturn = parseFloat(String(perf.returnPct || "0"));
      const benchmarkReturn = parseFloat(String(perf.benchmarkPct || "0"));
      const underperformance = benchmarkReturn - clientReturn;

      if (underperformance < 3) return [];

      const totalAUM = accounts.reduce((s: number, a: any) => s + parseFloat(String(a.balance || "0")), 0);

      const severity = underperformance > 8 ? "high" : underperformance > 5 ? "medium" : "low";
      const period = perf.period || "YTD";

      const dollarsUnderperformance = totalAUM * (underperformance / 100);

      return [{
        clientId: client.id,
        advisorId,
        insightType: "aum_decline",
        severity,
        title: `Portfolio Underperformance — ${client.firstName} ${client.lastName}`,
        description: `Client portfolio ${period} return of ${clientReturn.toFixed(1)}% vs benchmark ${benchmarkReturn.toFixed(1)}%. Underperforming by ${underperformance.toFixed(1)}% ($${Math.round(dollarsUnderperformance / 1000)}k estimated impact).`,
        opportunity: "Review allocation and rebalance to improve performance alignment with benchmark.",
        recommendedAction: `Analyze current allocation vs model portfolio. Consider rebalancing to improve ${period} performance. ${client.riskTolerance ? `Client risk tolerance: ${client.riskTolerance}.` : ""}`.trim(),
        estimatedValue: String(Math.round(dollarsUnderperformance)),
        metrics: {
          period,
          clientReturn: parseFloat(clientReturn.toFixed(2)),
          benchmarkReturn: parseFloat(benchmarkReturn.toFixed(2)),
          underperformance: parseFloat(underperformance.toFixed(2)),
          totalAUM,
          dollarsImpact: Math.round(dollarsUnderperformance),
          riskTolerance: client.riskTolerance,
        },
        confidence: 82,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }];
    } catch (err) {
      logger.error({ err }, "API error");
      return [];
    }
  }
}
