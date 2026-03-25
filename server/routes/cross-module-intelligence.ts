import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { logger } from "../lib/logger";
import { requireAuth, getSessionAdvisor } from "./middleware";
import { DirectIndexingEngine } from "../engines/direct-indexing-engine";

interface CrossModuleInsight {
  id: string;
  category: "succession_estate" | "charitable_tax" | "direct_indexing_tax" | "estate_insurance" | "holistic";
  severity: "info" | "opportunity" | "action_needed";
  title: string;
  description: string;
  modules: string[];
  metric?: string;
}

interface PlanningIntelligenceResult {
  clientId: string;
  insights: CrossModuleInsight[];
  moduleSummary: {
    succession: { totalBusinessValue: number; flpCount: number; hasValuations: boolean };
    estate: { totalTrustValue: number; trustCount: number; exemptionUsed: number; exemptionRemaining: number };
    charitable: { totalDafBalance: number; totalCrtValue: number; totalQcdAmount: number; estimatedDeductions: number };
    directIndexing: { portfolioCount: number; totalHarvestedLosses: number; estimatedTaxSavings: number };
  };
  generatedAt: string;
}

const diEngine = new DirectIndexingEngine();

/** Normalize Express param to string */
function p(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v || "";
}

export function registerCrossModuleIntelligenceRoutes(app: Router) {
  app.get("/api/clients/:clientId/planning-intelligence", requireAuth, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);

      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(403).json({ error: "Unauthorized" });

      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ error: "Client not found" });

      if (client.advisorId !== advisor.id) {
        return res.status(403).json({ error: "Access denied to this client" });
      }

      const [
        businessEntities,
        flpStructures,
        trusts,
        exemptions,
        dafAccounts,
        crts,
        qcds,
        diPortfolios,
        accounts,
        taxLots,
        charitableAccounts,
      ] = await Promise.all([
        storage.getBusinessEntitiesByClient(clientId).catch(() => []),
        storage.getFlpStructuresByClient(clientId).catch(() => []),
        storage.getTrustsByClient(clientId).catch(() => []),
        storage.getEstateExemptions(clientId).catch(() => []),
        storage.getDafAccountsByClient(clientId).catch(() => []),
        storage.getCrtsByClient(clientId).catch(() => []),
        storage.getQcdRecordsByClient(clientId).catch(() => []),
        storage.getDirectIndexPortfoliosByClient(clientId).catch(() => []),
        storage.getAccountsByClient(clientId).catch(() => []),
        storage.getTaxLotsByClient(clientId).catch(() => []),
        storage.getCharitableAccountsByClient(clientId).catch(() => []),
      ]);

      const totalAUM = accounts.reduce((s, a) => s + parseFloat(String(a.balance || "0")), 0);

      const totalBusinessValue = businessEntities.reduce(
        (s, e) => s + parseFloat(String(e.estimatedValue || "0")), 0
      );

      const totalTrustValue = trusts.reduce(
        (s, t) => s + parseFloat(String((t as any).fundedValue || (t as any).currentValue || "0")), 0
      );

      const exemptionUsed = exemptions.reduce(
        (s, e) => s + parseFloat(String((e as any).amountUsed || (e as any).amount || "0")), 0
      );
      const CURRENT_EXEMPTION = 13_610_000;
      const exemptionRemaining = Math.max(0, CURRENT_EXEMPTION - exemptionUsed);

      const totalDafBalance = dafAccounts.reduce(
        (s, d) => s + parseFloat(String(d.currentBalance || "0")), 0
      );
      const totalCrtValue = crts.reduce(
        (s, c) => s + parseFloat(String(c.currentValue || c.fundedValue || "0")), 0
      );
      const totalQcdAmount = qcds.reduce(
        (s, q) => s + parseFloat(String(q.amount || "0")), 0
      );
      const dafDeductions = dafAccounts.reduce(
        (s, d) => s + parseFloat(String(d.taxDeductionsTaken || "0")), 0
      );
      const crtDeductions = crts.reduce(
        (s, c) => s + parseFloat(String(c.charitableDeduction || "0")), 0
      );
      const charitableDeductions = charitableAccounts.reduce(
        (s, a) => s + parseFloat(String((a as any).totalContributions || "0")), 0
      );
      const estimatedDeductions = dafDeductions + crtDeductions + charitableDeductions + totalQcdAmount;

      let totalHarvestedLosses = 0;
      let estimatedTaxSavings = 0;
      if (diPortfolios.length > 0) {
        try {
          const taxAlpha = await diEngine.getTaxAlphaAttribution(clientId, 0.37);
          totalHarvestedLosses = taxAlpha.totalHarvestedLosses || 0;
          estimatedTaxSavings = taxAlpha.estimatedTaxSavings || 0;
        } catch {
          const realizedLosses = taxLots
            .filter((l: any) => parseFloat(String(l.realizedGainLoss || "0")) < 0)
            .reduce((s: number, l: any) => s + Math.abs(parseFloat(String(l.realizedGainLoss || "0"))), 0);
          totalHarvestedLosses = realizedLosses;
          estimatedTaxSavings = realizedLosses * 0.37;
        }
      }

      const insights: CrossModuleInsight[] = [];
      let insightId = 0;

      if (totalBusinessValue > 0) {
        const totalEstateValue = totalAUM + totalBusinessValue;
        if (totalEstateValue > CURRENT_EXEMPTION) {
          insights.push({
            id: `cmi-${++insightId}`,
            category: "succession_estate",
            severity: "action_needed",
            title: "Business value pushes estate above exemption threshold",
            description: `Combined AUM ($${totalAUM.toLocaleString()}) and business value ($${totalBusinessValue.toLocaleString()}) total $${totalEstateValue.toLocaleString()}, exceeding the $${CURRENT_EXEMPTION.toLocaleString()} estate tax exemption. Consider GRAT, FLP, or SLAT structures to reduce taxable estate.`,
            modules: ["Business Succession", "Estate Planning"],
            metric: `$${(totalEstateValue - CURRENT_EXEMPTION).toLocaleString()} over exemption`,
          });
        } else if (totalEstateValue > CURRENT_EXEMPTION * 0.7) {
          insights.push({
            id: `cmi-${++insightId}`,
            category: "succession_estate",
            severity: "opportunity",
            title: "Estate approaching exemption threshold with business assets",
            description: `Combined estate of $${totalEstateValue.toLocaleString()} is within 30% of the $${CURRENT_EXEMPTION.toLocaleString()} exemption. With TCJA sunset in 2026 potentially reducing the exemption to ~$7M, proactive transfer planning is recommended.`,
            modules: ["Business Succession", "Estate Planning"],
            metric: `${((totalEstateValue / CURRENT_EXEMPTION) * 100).toFixed(0)}% of exemption used`,
          });
        }

        if (flpStructures.length > 0) {
          const totalDiscountedValue = flpStructures.reduce(
            (s, f) => s + parseFloat(String(f.discountedValue || "0")), 0
          );
          const totalPreDiscount = flpStructures.reduce(
            (s, f) => s + parseFloat(String(f.totalValue || "0")), 0
          );
          const savings = totalPreDiscount - totalDiscountedValue;
          if (savings > 0) {
            insights.push({
              id: `cmi-${++insightId}`,
              category: "succession_estate",
              severity: "info",
              title: "FLP structures reducing estate tax exposure",
              description: `${flpStructures.length} FLP structure(s) provide $${savings.toLocaleString()} in valuation discounts, reducing gift/estate tax on transferred business interests.`,
              modules: ["Business Succession", "Estate Planning"],
              metric: `$${savings.toLocaleString()} in discounts`,
            });
          }
        }

        if (businessEntities.length > 0 && !businessEntities.some((e: any) =>
          /life insurance|key.?person|buy.?sell/i.test(e.notes || "")
        )) {
          insights.push({
            id: `cmi-${++insightId}`,
            category: "estate_insurance",
            severity: "opportunity",
            title: "Business entities may need key-person or buy-sell insurance",
            description: `${businessEntities.length} business entity(ies) with total value of $${totalBusinessValue.toLocaleString()} — consider key-person life insurance and buy-sell agreement funding to protect business continuity.`,
            modules: ["Business Succession", "Insurance"],
          });
        }
      }

      if (estimatedDeductions > 0 && totalAUM > 500_000) {
        const effectiveDeductionRate = totalAUM > 0 ? (estimatedDeductions / totalAUM) * 100 : 0;
        insights.push({
          id: `cmi-${++insightId}`,
          category: "charitable_tax",
          severity: "info",
          title: "Charitable giving provides tax deduction benefits",
          description: `Total charitable deductions of $${estimatedDeductions.toLocaleString()} (${effectiveDeductionRate.toFixed(1)}% of AUM) reduce taxable income. DAF balance: $${totalDafBalance.toLocaleString()}, CRT value: $${totalCrtValue.toLocaleString()}, QCD distributions: $${totalQcdAmount.toLocaleString()}.`,
          modules: ["Charitable Planning", "Tax Strategy"],
          metric: `$${estimatedDeductions.toLocaleString()} in deductions`,
        });
      }

      if (totalCrtValue > 0) {
        const crtIncome = crts.reduce(
          (s, c) => s + parseFloat(String(c.projectedAnnualIncome || "0")), 0
        );
        if (crtIncome > 0) {
          insights.push({
            id: `cmi-${++insightId}`,
            category: "charitable_tax",
            severity: "info",
            title: "CRT income stream affects retirement planning",
            description: `Charitable Remainder Trust(s) generate $${crtIncome.toLocaleString()}/year in income. This income stream should be factored into retirement income projections and tax planning.`,
            modules: ["Charitable Planning", "Retirement", "Tax Strategy"],
            metric: `$${crtIncome.toLocaleString()}/year`,
          });
        }

        if (totalAUM + totalBusinessValue > CURRENT_EXEMPTION) {
          insights.push({
            id: `cmi-${++insightId}`,
            category: "charitable_tax",
            severity: "opportunity",
            title: "CRT reduces taxable estate while generating income",
            description: `CRT funded value of $${totalCrtValue.toLocaleString()} is removed from the taxable estate while providing an income stream. Consider additional CRT contributions given estate exposure above exemption.`,
            modules: ["Charitable Planning", "Estate Planning"],
          });
        }
      }

      if (totalDafBalance > 0 && totalAUM > 0) {
        const dafPct = (totalDafBalance / totalAUM) * 100;
        if (dafPct > 5) {
          insights.push({
            id: `cmi-${++insightId}`,
            category: "charitable_tax",
            severity: "opportunity",
            title: "DAF balance available for strategic grant-making",
            description: `DAF balance of $${totalDafBalance.toLocaleString()} (${dafPct.toFixed(1)}% of AUM) represents pre-funded charitable capital. Consider timing grants for maximum tax benefit or bundling with appreciated securities.`,
            modules: ["Charitable Planning", "Tax Strategy"],
          });
        }
      }

      if (totalHarvestedLosses > 0) {
        insights.push({
          id: `cmi-${++insightId}`,
          category: "direct_indexing_tax",
          severity: "info",
          title: "Direct indexing generating tax alpha",
          description: `Tax-loss harvesting has captured $${totalHarvestedLosses.toLocaleString()} in losses, generating an estimated $${estimatedTaxSavings.toLocaleString()} in tax savings. These losses offset capital gains and up to $3,000/year of ordinary income.`,
          modules: ["Direct Indexing", "Tax Strategy", "Investment"],
          metric: `$${estimatedTaxSavings.toLocaleString()} tax savings`,
        });
      }

      const unrealizedLosses = taxLots
        .filter((l: any) => parseFloat(String(l.unrealizedGainLoss || "0")) < 0)
        .reduce((s: number, l: any) => s + Math.abs(parseFloat(String(l.unrealizedGainLoss || "0"))), 0);

      if (unrealizedLosses > 10_000 && diPortfolios.length > 0) {
        insights.push({
          id: `cmi-${++insightId}`,
          category: "direct_indexing_tax",
          severity: "opportunity",
          title: "Unrealized losses available for harvesting",
          description: `$${unrealizedLosses.toLocaleString()} in unrealized losses available across direct indexing portfolios. Harvesting before year-end could offset gains and reduce tax liability.`,
          modules: ["Direct Indexing", "Tax Strategy"],
          metric: `$${unrealizedLosses.toLocaleString()} harvestable`,
        });
      }

      if (trusts.length > 0 && totalAUM > CURRENT_EXEMPTION * 0.5) {
        const irrevocableTrusts = trusts.filter((t: any) =>
          /irrevocable|grat|slat|ilit|dynasty|idgt/i.test(t.trustType || t.type || "")
        );
        if (irrevocableTrusts.length === 0 && totalAUM > CURRENT_EXEMPTION * 0.7) {
          insights.push({
            id: `cmi-${++insightId}`,
            category: "holistic",
            severity: "action_needed",
            title: "No irrevocable trust structures despite high net worth",
            description: `With $${totalAUM.toLocaleString()} in assets and no irrevocable trusts, the entire estate is subject to estate tax. GRAT, SLAT, or ILIT structures should be evaluated to shelter future appreciation.`,
            modules: ["Estate Planning", "Tax Strategy"],
          });
        }
      }

      if (totalBusinessValue > 0 && totalCrtValue > 0) {
        insights.push({
          id: `cmi-${++insightId}`,
          category: "holistic",
          severity: "info",
          title: "Business succession and charitable strategies can complement",
          description: `Business interests ($${totalBusinessValue.toLocaleString()}) and CRT structures ($${totalCrtValue.toLocaleString()}) can work together — consider contributing appreciated business interests to a CRT for diversification, income generation, and estate reduction.`,
          modules: ["Business Succession", "Charitable Planning", "Estate Planning"],
        });
      }

      if (totalQcdAmount > 0 && totalHarvestedLosses > 0) {
        insights.push({
          id: `cmi-${++insightId}`,
          category: "holistic",
          severity: "info",
          title: "QCD and harvested losses both reducing tax burden",
          description: `QCD distributions ($${totalQcdAmount.toLocaleString()}) satisfy RMD requirements while avoiding income tax. Combined with $${totalHarvestedLosses.toLocaleString()} in harvested losses, the effective tax rate is significantly reduced.`,
          modules: ["Charitable Planning", "Direct Indexing", "Tax Strategy"],
        });
      }

      const result: PlanningIntelligenceResult = {
        clientId,
        insights,
        moduleSummary: {
          succession: {
            totalBusinessValue,
            flpCount: flpStructures.length,
            hasValuations: businessEntities.length > 0,
          },
          estate: {
            totalTrustValue,
            trustCount: trusts.length,
            exemptionUsed,
            exemptionRemaining,
          },
          charitable: {
            totalDafBalance,
            totalCrtValue,
            totalQcdAmount,
            estimatedDeductions,
          },
          directIndexing: {
            portfolioCount: diPortfolios.length,
            totalHarvestedLosses,
            estimatedTaxSavings,
          },
        },
        generatedAt: new Date().toISOString(),
      };

      res.json(result);
    } catch (err) {
      logger.error({ err }, "Failed to generate planning intelligence");
      res.status(500).json({ error: "Failed to generate planning intelligence" });
    }
  });
}
