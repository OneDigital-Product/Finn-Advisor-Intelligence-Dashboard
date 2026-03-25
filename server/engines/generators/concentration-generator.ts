import { storage } from "../../storage";
import { logger } from "../../lib/logger";
import type { InsertInsight } from "@shared/schema";

export class ConcentrationGenerator {
  async generate(client: any, advisorId: string): Promise<InsertInsight[]> {
    try {
      const holdings = await storage.getHoldingsByClient(client.id);
      if (!holdings || holdings.length < 2) return [];

      const totalValue = holdings.reduce(
        (s: number, h: any) => s + parseFloat(String(h.marketValue || "0")), 0
      );
      if (totalValue <= 0) return [];

      const insights: InsertInsight[] = [];

      for (const holding of holdings) {
        const mv = parseFloat(String(holding.marketValue || "0"));
        if (mv <= 0) continue;
        const weight = (mv / totalValue) * 100;
        if (weight < 30) continue;

        const ticker = holding.ticker || holding.name || "Unknown";
        const severity = weight >= 50 ? "high" : "medium";

        insights.push({
          clientId: client.id,
          advisorId,
          insightType: "concentration_risk",
          severity,
          title: `Position Concentration — ${ticker} (${weight.toFixed(0)}%)`,
          description: `${ticker} represents ${weight.toFixed(1)}% ($${Math.round(mv / 1000)}k) of the portfolio. Single-position concentration above 30% creates significant downside risk.`,
          opportunity: "Diversify to reduce single-stock risk and improve risk-adjusted returns.",
          recommendedAction: `Consider systematic reduction of ${ticker} position. Evaluate tax implications and replacement options across ${holding.sector || "other"} sector.`,
          estimatedValue: null,
          metrics: {
            ticker,
            holdingName: holding.name,
            marketValue: mv,
            portfolioWeight: parseFloat(weight.toFixed(1)),
            totalPortfolioValue: totalValue,
            sector: holding.sector,
          },
          confidence: 92,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
      }

      const sectorMap = new Map<string, number>();
      for (const h of holdings) {
        const sector = h.sector || "Other";
        const mv = parseFloat(String(h.marketValue || "0"));
        sectorMap.set(sector, (sectorMap.get(sector) || 0) + mv);
      }

      for (const [sector, sectorValue] of sectorMap) {
        const sectorWeight = (sectorValue / totalValue) * 100;
        if (sectorWeight < 40 || sector === "Other") continue;

        const holdingsInSector = holdings.filter((h: any) => (h.sector || "Other") === sector);

        insights.push({
          clientId: client.id,
          advisorId,
          insightType: "concentration_risk",
          severity: sectorWeight >= 60 ? "high" : "medium",
          title: `Sector Concentration — ${sector} (${sectorWeight.toFixed(0)}%)`,
          description: `${sector} sector represents ${sectorWeight.toFixed(1)}% ($${Math.round(sectorValue / 1000)}k) across ${holdingsInSector.length} holding${holdingsInSector.length > 1 ? "s" : ""}. Concentration above 40% increases sector-specific risk.`,
          opportunity: "Diversify across sectors to reduce correlation risk.",
          recommendedAction: `Review ${sector} allocation and consider rebalancing into underweight sectors.`,
          estimatedValue: null,
          metrics: {
            sector,
            sectorValue,
            sectorWeight: parseFloat(sectorWeight.toFixed(1)),
            holdingsCount: holdingsInSector.length,
            holdings: holdingsInSector.map((h: any) => ({
              ticker: h.ticker || h.name,
              weight: parseFloat(((parseFloat(String(h.marketValue || "0")) / totalValue) * 100).toFixed(1)),
            })),
          },
          confidence: 88,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
      }

      return insights;
    } catch (err) {
      logger.error({ err }, "API error");
      return [];
    }
  }
}
