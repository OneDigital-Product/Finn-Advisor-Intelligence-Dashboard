import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import type { Trust, GiftHistoryEntry } from "@shared/schema";
import {
  computeFullEstateAnalysis,
} from "@server/engines/estate-tax-engine";
import { logger } from "@server/lib/logger";

const TCJA_SUNSET_DATE = new Date("2026-01-01");
const CURRENT_EXEMPTION_2024 = 13610000;
const POST_SUNSET_EXEMPTION = 7000000;
const ANNUAL_EXCLUSION_2024 = 18000;
const GST_EXEMPTION_2024 = 13610000;

const TRUST_TYPE_INFO: Record<string, { label: string; description: string; taxBenefits: string[] }> = {
  GRAT: { label: "Grantor Retained Annuity Trust", description: "Transfers appreciation to beneficiaries with minimal gift tax cost by retaining an annuity interest.", taxBenefits: ["Freezes estate value at creation", "Excess growth passes tax-free", "Useful for appreciating assets"] },
  SLAT: { label: "Spousal Lifetime Access Trust", description: "Irrevocable trust for spouse's benefit that removes assets from grantor's estate while maintaining indirect access.", taxBenefits: ["Removes assets from taxable estate", "Spouse retains access to funds", "Uses lifetime gift tax exemption"] },
  QPRT: { label: "Qualified Personal Residence Trust", description: "Transfers residence to beneficiaries at reduced gift tax cost while grantor retains right to live in home.", taxBenefits: ["Reduced gift tax value", "Removes home appreciation from estate", "Grantor retains residence right"] },
  ILIT: { label: "Irrevocable Life Insurance Trust", description: "Holds life insurance policy outside the estate to provide tax-free death benefit to beneficiaries.", taxBenefits: ["Insurance proceeds excluded from estate", "Provides estate liquidity", "No estate tax on proceeds"] },
  CRT: { label: "Charitable Remainder Trust", description: "Provides income stream to donor, then remainder to charity, with upfront charitable deduction.", taxBenefits: ["Immediate charitable deduction", "Avoids capital gains on contributed assets", "Income stream for life or term"] },
  DAF: { label: "Donor-Advised Fund", description: "Charitable giving vehicle providing immediate tax deduction with advisory privileges on grants.", taxBenefits: ["Immediate tax deduction", "Tax-free growth", "Flexible charitable giving"] },
  REVOCABLE: { label: "Revocable Living Trust", description: "Flexible trust that avoids probate while allowing grantor full control during lifetime.", taxBenefits: ["Avoids probate", "Maintains privacy", "No estate tax benefit (included in estate)"] },
  DYNASTY: { label: "Dynasty Trust", description: "Multi-generational trust designed to pass wealth for many generations while minimizing transfer taxes.", taxBenefits: ["Multi-generational wealth transfer", "GST exemption leveraged", "Avoids estate tax at each generation"] },
};

function computeTrustModeling(trust: Trust) {
  const fundedValue = parseFloat(String(trust.fundedValue || "0"));
  const termYears = trust.termYears || 0;
  const section7520Rate = parseFloat(String(trust.section7520Rate || "0.05"));
  const annuityRate = parseFloat(String(trust.annuityRate || "0"));
  const notes: string[] = [];
  let annualDistribution = 0, totalProjectedDistributions = 0, remainderValue = 0, giftTaxValue = 0, effectiveTaxRate = 0;

  switch (trust.trustType) {
    case "GRAT": {
      const rate = annuityRate || 0.08;
      annualDistribution = fundedValue * rate;
      totalProjectedDistributions = annualDistribution * termYears;
      const annuityFactor = termYears > 0 && section7520Rate > 0 ? (1 - Math.pow(1 + section7520Rate, -termYears)) / section7520Rate : termYears;
      const retainedInterest = annualDistribution * annuityFactor;
      giftTaxValue = Math.max(0, fundedValue - retainedInterest);
      remainderValue = Math.max(0, fundedValue - totalProjectedDistributions);
      effectiveTaxRate = fundedValue > 0 ? (giftTaxValue / fundedValue) * 0.40 : 0;
      notes.push(`Annuity factor: ${annuityFactor.toFixed(4)} at ${(section7520Rate * 100).toFixed(2)}% rate`);
      if (giftTaxValue < 100) notes.push("Zeroed-out GRAT: minimal gift tax exposure");
      break;
    }
    case "QPRT": {
      const qprtDiscountFactor = termYears > 0 && section7520Rate > 0 ? Math.pow(1 + section7520Rate, -termYears) : 0.5;
      giftTaxValue = fundedValue * qprtDiscountFactor;
      remainderValue = fundedValue;
      effectiveTaxRate = giftTaxValue > 0 ? (giftTaxValue / fundedValue) * 0.40 : 0;
      notes.push(`Remainder factor: ${qprtDiscountFactor.toFixed(4)}`);
      break;
    }
    case "CRT": {
      const crtRate = annuityRate || 0.05;
      annualDistribution = fundedValue * crtRate;
      totalProjectedDistributions = annualDistribution * Math.min(termYears || 20, 20);
      const charitableFactor = termYears > 0 && section7520Rate > 0 ? Math.pow(1 + section7520Rate, -termYears) : 0.4;
      remainderValue = fundedValue * charitableFactor;
      giftTaxValue = 0;
      notes.push(`Charitable deduction: ${((remainderValue / fundedValue) * 100).toFixed(1)}% of funded value`);
      break;
    }
    case "SLAT": case "ILIT": case "DAF": case "DYNASTY": {
      giftTaxValue = fundedValue;
      remainderValue = fundedValue;
      if (trust.trustType === "DYNASTY" && termYears) {
        remainderValue = fundedValue * Math.pow(1.06, termYears);
      }
      if (trust.trustType === "DAF") giftTaxValue = 0;
      effectiveTaxRate = giftTaxValue > 0 ? 0.40 : 0;
      break;
    }
    case "REVOCABLE": {
      remainderValue = fundedValue;
      giftTaxValue = 0;
      notes.push("Included in taxable estate; no transfer tax benefit");
      break;
    }
    default: {
      remainderValue = fundedValue;
      giftTaxValue = fundedValue;
    }
  }

  return {
    annualDistribution: Math.round(annualDistribution * 100) / 100,
    totalProjectedDistributions: Math.round(totalProjectedDistributions * 100) / 100,
    remainderValue: Math.round(remainderValue * 100) / 100,
    giftTaxValue: Math.round(giftTaxValue * 100) / 100,
    effectiveTaxRate: Math.round(effectiveTaxRate * 10000) / 10000,
    modelingNotes: notes,
  };
}

function computeGstTracking(gifts: GiftHistoryEntry[]) {
  const gstGifts = gifts.filter(g => g.gstApplicable);
  const totalGstAllocated = gstGifts.reduce((sum, g) => sum + parseFloat(String(g.gstAllocated || g.taxableAmount || "0")), 0);
  const remainingGstExemption = GST_EXEMPTION_2024 - totalGstAllocated;
  const gstGiftsByYear: Record<number, number> = {};
  for (const gift of gstGifts) {
    const year = new Date(gift.giftDate).getFullYear();
    gstGiftsByYear[year] = (gstGiftsByYear[year] || 0) + parseFloat(String(gift.gstAllocated || gift.taxableAmount || "0"));
  }
  return {
    totalGstExemption: GST_EXEMPTION_2024, totalGstAllocated, remainingGstExemption: Math.max(0, remainingGstExemption),
    gstUtilizationPercent: GST_EXEMPTION_2024 > 0 ? (totalGstAllocated / GST_EXEMPTION_2024) * 100 : 0,
    gstGiftCount: gstGifts.length, gstAllocationByYear: gstGiftsByYear,
  };
}

function generateRecommendations(client: any, totalAUM: number, clientTrusts: any[], remainingExemption: number, daysToSunset: number) {
  const recs: Array<{ priority: string; title: string; description: string; category: string }> = [];
  const trustTypes = new Set(clientTrusts.map(t => t.trustType));
  if (daysToSunset > 0 && daysToSunset <= 365 && remainingExemption > 1000000) {
    recs.push({ priority: "high", title: "Utilize Remaining Exemption Before TCJA Sunset", description: `$${(remainingExemption / 1e6).toFixed(1)}M of federal estate tax exemption remains unused. The TCJA sunset in ${daysToSunset} days could reduce the exemption by ~$6.6M.`, category: "sunset" });
  }
  if (totalAUM > 5000000 && !trustTypes.has("GRAT")) recs.push({ priority: totalAUM > 10000000 ? "high" : "medium", title: "Consider GRAT for Appreciating Assets", description: "A GRAT can transfer future appreciation to heirs with minimal gift tax cost.", category: "trust_strategy" });
  if (totalAUM > 10000000 && !trustTypes.has("SLAT")) recs.push({ priority: "medium", title: "Evaluate SLAT", description: "A SLAT can remove assets from the taxable estate while maintaining indirect access.", category: "trust_strategy" });
  if (totalAUM > 3000000 && !trustTypes.has("ILIT")) recs.push({ priority: "medium", title: "Life Insurance Trust for Estate Liquidity", description: "An ILIT can provide tax-free liquidity for estate tax payments.", category: "trust_strategy" });
  if (totalAUM > 2000000 && clientTrusts.length === 0) recs.push({ priority: "high", title: "Establish Basic Estate Plan", description: "No trust structures detected. A revocable living trust is the foundation of proper estate planning.", category: "foundation" });
  if (totalAUM > 20000000 && !trustTypes.has("DYNASTY")) recs.push({ priority: "medium", title: "Multi-Generational Dynasty Trust", description: "For ultra-high net worth estates, a dynasty trust can transfer wealth across multiple generations.", category: "trust_strategy" });
  return recs;
}

async function verifyClientAccess(session: any, clientId: string): Promise<boolean> {
  const advisor = await getSessionAdvisor(session);
  if (!advisor) return false;
  const client = await storage.getClient(clientId);
  if (!client) return false;
  return client.advisorId === advisor.id;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id: clientId } = await params;
    const hasAccess = await verifyClientAccess(auth.session, clientId);
    if (!hasAccess) return NextResponse.json({ message: "Access denied" }, { status: 403 });

    const client = await storage.getClient(clientId);
    if (!client) return NextResponse.json({ message: "Client not found" }, { status: 404 });

    const [clientTrusts, exemptions, gifts, accounts, businessEntities, flpStructures, crts] = await Promise.all([
      storage.getTrustsByClient(clientId),
      storage.getEstateExemptions(clientId),
      storage.getGiftHistory(clientId),
      storage.getAccountsByClient(clientId),
      storage.getBusinessEntitiesByClient(clientId).catch(() => []),
      storage.getFlpStructuresByClient(clientId).catch(() => []),
      storage.getCrtsByClient(clientId).catch(() => []),
    ]);

    // Batch fetch all trust relationships in one query instead of N+1 (was: 1 query per trust)
    const trustIds = clientTrusts.map(t => t.id);
    const allRelationships = await storage.getTrustRelationshipsByTrustIds(trustIds);
    const relsByTrust = new Map<string, typeof allRelationships>();
    for (const rel of allRelationships) {
      const existing = relsByTrust.get(rel.trustId) || [];
      existing.push(rel);
      relsByTrust.set(rel.trustId, existing);
    }
    const trustsWithRelationships = clientTrusts.map(trust => ({
      ...trust,
      relationships: relsByTrust.get(trust.id) || [],
      modeling: computeTrustModeling(trust),
    }));

    const totalAUM = accounts.reduce((s, a) => s + parseFloat(String(a.balance || "0")), 0);
    const totalTrustValue = clientTrusts.reduce((s, t) => s + parseFloat(String(t.fundedValue || "0")), 0);
    const totalGifts = gifts.reduce((s, g) => s + parseFloat(String(g.taxableAmount || "0")), 0);
    const totalBusinessValue = businessEntities.reduce((s: number, e: any) => s + parseFloat(String(e.estimatedValue || "0")), 0);
    const totalFlpDiscounts = flpStructures.reduce((s: number, f: any) => {
      const pre = parseFloat(String(f.totalValue || "0"));
      const post = parseFloat(String(f.discountedValue || "0"));
      return s + Math.max(0, pre - post);
    }, 0);
    const totalCrtValue = crts.reduce((s: number, c: any) => s + parseFloat(String(c.currentValue || c.fundedValue || "0")), 0);

    const gstTracking = computeGstTracking(gifts);

    const currentExemption = exemptions.find(e => e.taxYear === new Date().getFullYear());
    const remainingExemption = currentExemption ? parseFloat(String(currentExemption.remainingExemption || "0")) : CURRENT_EXEMPTION_2024 - totalGifts;

    const now = new Date();
    const daysToSunset = Math.max(0, Math.ceil((TCJA_SUNSET_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const grossEstateValue = totalAUM + totalBusinessValue;
    const adjustedEstateValue = grossEstateValue - totalFlpDiscounts - totalCrtValue;

    const sunsetImpact = adjustedEstateValue > POST_SUNSET_EXEMPTION
      ? {
          currentExemption: CURRENT_EXEMPTION_2024, postSunsetExemption: POST_SUNSET_EXEMPTION,
          exemptionReduction: CURRENT_EXEMPTION_2024 - POST_SUNSET_EXEMPTION,
          potentialAdditionalTax: Math.max(0, (adjustedEstateValue - POST_SUNSET_EXEMPTION) * 0.40),
          daysRemaining: daysToSunset, sunsetDate: TCJA_SUNSET_DATE.toISOString().split("T")[0],
          urgency: daysToSunset <= 90 ? "critical" : daysToSunset <= 365 ? "high" : "moderate",
        }
      : null;

    const recommendations = generateRecommendations(client, totalAUM, clientTrusts, remainingExemption, daysToSunset);

    const isMarried = /married|spouse|wife|husband/i.test(client.notes || "") || (client as any).maritalStatus === "married";
    const taxAnalysis = computeFullEstateAnalysis(adjustedEstateValue, clientTrusts, gifts, isMarried, 0);

    return NextResponse.json({
      trusts: trustsWithRelationships, exemptions, gifts,
      summary: {
        totalEstateValue: grossEstateValue, grossEstateValue, adjustedEstateValue, totalTrustValue,
        totalLifetimeGifts: totalGifts, remainingExemption, currentFederalExemption: CURRENT_EXEMPTION_2024,
        annualExclusion: ANNUAL_EXCLUSION_2024, gstExemption: GST_EXEMPTION_2024,
        trustCount: clientTrusts.length, activeTrusts: clientTrusts.filter(t => t.status === "active").length,
        totalBusinessValue, totalFlpDiscounts, totalCrtValue,
        businessEntityCount: businessEntities.length, flpCount: flpStructures.length, crtCount: crts.length,
      },
      gstTracking, sunsetAlert: sunsetImpact, recommendations, trustTypes: TRUST_TYPE_INFO, taxAnalysis,
    });
  } catch (error: any) {
    logger.error({ err: error }, "Estate planning error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
