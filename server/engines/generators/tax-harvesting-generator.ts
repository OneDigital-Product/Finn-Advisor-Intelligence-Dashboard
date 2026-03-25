import { storage } from "../../storage";
import { logger } from "../../lib/logger";
import type { InsertInsight } from "@shared/schema";

export class TaxHarvestingGenerator {
  async generate(client: any, advisorId: string): Promise<InsertInsight[]> {
    try {
      const holdings = await storage.getHoldingsByClient(client.id);
      if (!holdings || holdings.length === 0) return [];

      const insights: InsertInsight[] = [];
      const taxRate = 0.25;

      for (const holding of holdings) {
        const costBasis = parseFloat(String(holding.costBasis || "0"));
        const marketValue = parseFloat(String(holding.marketValue || "0"));
        const unrealizedGL = parseFloat(String(holding.unrealizedGainLoss || "0"));

        if (costBasis <= 0 || marketValue <= 0) continue;

        const loss = unrealizedGL < 0 ? Math.abs(unrealizedGL) : 0;
        if (loss <= 0) continue;

        const pctChange = ((marketValue - costBasis) / costBasis) * 100;
        if (pctChange > -5) continue;

        const taxSavings = loss * taxRate;
        if (taxSavings < 1250) continue;

        const severity = taxSavings > 5000 ? "high" : "medium";
        const ticker = holding.ticker || holding.name || "Unknown";

        insights.push({
          clientId: client.id,
          advisorId,
          insightType: "tax_harvesting",
          severity,
          title: `Tax-Loss Harvesting — ${ticker} ($${Math.round(loss / 1000)}k)`,
          description: `${ticker} has unrealized loss of $${loss.toLocaleString()} (${pctChange.toFixed(1)}%). Can offset capital gains this year.`,
          opportunity: `Potential $${Math.round(taxSavings).toLocaleString()} in federal tax savings (25% bracket).`,
          recommendedAction: "Realize loss and replace with similar fund to maintain allocation. Be mindful of wash sale rules (30-day window).",
          estimatedValue: String(Math.round(taxSavings)),
          metrics: {
            ticker,
            holdingName: holding.name,
            costBasis,
            marketValue,
            unrealizedLoss: loss,
            percentChange: parseFloat(pctChange.toFixed(1)),
            estimatedTaxSavings: Math.round(taxSavings),
            sector: holding.sector,
          },
          confidence: 90,
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
