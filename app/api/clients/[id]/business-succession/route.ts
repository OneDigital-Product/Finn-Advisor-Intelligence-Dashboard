import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { computeFullValuation, computeFlpDiscountTiered, computeTaxImpact, getIndustryMultiples } from "@server/lib/valuation-engine";
import { logger } from "@server/lib/logger";

async function verifyClientAccess(session: any, clientId: string): Promise<boolean> {
  const advisor = await getSessionAdvisor(session);
  if (!advisor) return false;
  const client = await storage.getClient(clientId);
  if (!client) return false;
  return client.advisorId === advisor.id;
}

const safeNum = (val: any, fallback: number = 0): number => {
  const n = parseFloat(String(val || fallback));
  return isNaN(n) || !isFinite(n) ? fallback : n;
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id: clientId } = await params;
    const hasAccess = await verifyClientAccess(auth.session, clientId);
    if (!hasAccess) return NextResponse.json({ message: "Access denied" }, { status: 403 });

    const [valuations, flps, agreements, milestones] = await Promise.all([
      storage.getBusinessValuationsByClient(clientId),
      storage.getFlpStructuresByClient(clientId),
      storage.getBuySellAgreementsByClient(clientId),
      storage.getExitMilestonesByClient(clientId),
    ]);

    const valuationsWithCalc = valuations.map((v: any) => {
      const ebitda = safeNum(v.ebitda, 0);
      const revenue = safeNum(v.revenue, 0);
      const mult = safeNum(v.multiple, 0);
      const dr = safeNum(v.discountRate, 0.10);
      const gr = safeNum(v.growthRate, 0.03);
      const multipleValue = ebitda * mult;
      const tangibleAssets = safeNum(v.tangibleAssets, 0);
      const intangibleAssets = safeNum(v.intangibleAssets, 0);
      const totalLiabilities = safeNum(v.totalLiabilities, 0);
      const goodwill = safeNum(v.goodwill, 0);
      const hasAnyAssetData = tangibleAssets > 0 || intangibleAssets > 0 || totalLiabilities > 0 || goodwill > 0;

      const fullValuation = computeFullValuation({
        revenue, ebitda, growthRate: gr, discountRate: dr, industry: v.industry || undefined,
        ...(hasAnyAssetData ? { tangibleAssets, intangibleAssets, totalLiabilities, goodwill } : {}),
      });

      return {
        ...v,
        calculations: {
          multipleBasedValue: Math.round(multipleValue),
          dcfBasedValue: fullValuation.dcf?.enterpriseValue || 0,
          comparableValue: fullValuation.comparable?.blendedValue || 0,
          recommendedValue: fullValuation.recommended.value,
          recommendedMethodology: fullValuation.recommended.methodology,
          confidence: fullValuation.recommended.confidence,
          reasoning: fullValuation.recommended.reasoning,
        },
        dcfBreakdown: fullValuation.dcf,
        comparableBreakdown: fullValuation.comparable,
        assetBasedBreakdown: fullValuation.assetBased,
        industryMultiples: getIndustryMultiples(v.industry || undefined),
      };
    });

    const flpsWithCalc = flps.map((f: any) => {
      const totalValue = safeNum(f.totalValue, 0);
      const lpPercent = safeNum(f.limitedPartnerPct, 99);
      const controlDiscount = safeNum(f.lackOfControlDiscount, 0.25);
      const marketabilityDiscount = safeNum(f.lackOfMarketabilityDiscount, 0.20);
      const lpInterestValue = totalValue * (lpPercent / 100);
      const flpResult = computeFlpDiscountTiered({
        totalValue: lpInterestValue, lpInterestPercent: lpPercent, entityType: "Partnership",
        lackOfControlDiscount: controlDiscount, lackOfMarketabilityDiscount: marketabilityDiscount,
      });
      const taxResult = computeTaxImpact({
        totalValue: lpInterestValue, discountedValue: flpResult.selectedDiscountedValue,
        transferAmount: flpResult.selectedDiscountedValue, transferType: "both",
        annualExclusionRecipients: 1, priorGiftsUsed: 0, isGstApplicable: false,
      });
      return {
        ...f,
        calculations: { combinedDiscount: flpResult.selectedCombinedDiscount, discountedValue: flpResult.selectedDiscountedValue },
        discountRanges: { controlDiscount: flpResult.controlDiscount, marketabilityDiscount: flpResult.marketabilityDiscount, combinedDiscount: flpResult.combinedDiscount, discountedValue: flpResult.discountedValue },
        irsDefensible: flpResult.irsDefensible, discountNotes: flpResult.notes, taxImpact: taxResult,
      };
    });

    const completedMilestones = milestones.filter((m: any) => m.status === "completed").length;
    const totalMilestones = milestones.length;
    const computedTotalValue = valuationsWithCalc.reduce((s: number, v: any) => {
      const computed = v.calculations?.recommendedValue || 0;
      const manual = parseFloat(String(v.estimatedValue || "0")) || 0;
      return s + (computed > 0 ? computed : manual);
    }, 0);

    return NextResponse.json({
      valuations: valuationsWithCalc, flpStructures: flpsWithCalc, buySellAgreements: agreements, exitMilestones: milestones,
      summary: {
        totalBusinessValue: computedTotalValue, valuationCount: valuations.length, flpCount: flps.length,
        agreementCount: agreements.length,
        milestoneProgress: totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0,
        completedMilestones, totalMilestones,
        agreementsNeedingReview: agreements.filter((a: any) => {
          if (!a.reviewDate) return false;
          const daysUntilReview = Math.ceil((new Date(a.reviewDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return daysUntilReview <= 90;
        }).length,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, "API error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
