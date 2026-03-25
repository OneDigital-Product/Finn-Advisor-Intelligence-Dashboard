import type { Trust, GiftHistoryEntry } from "@shared/schema";

const FEDERAL_ESTATE_TAX_BRACKETS = [
  { min: 0, max: 10000, rate: 0.18 },
  { min: 10000, max: 20000, rate: 0.20 },
  { min: 20000, max: 40000, rate: 0.22 },
  { min: 40000, max: 60000, rate: 0.24 },
  { min: 60000, max: 80000, rate: 0.26 },
  { min: 80000, max: 100000, rate: 0.28 },
  { min: 100000, max: 150000, rate: 0.30 },
  { min: 150000, max: 250000, rate: 0.32 },
  { min: 250000, max: 500000, rate: 0.34 },
  { min: 500000, max: 750000, rate: 0.37 },
  { min: 750000, max: 1000000, rate: 0.39 },
  { min: 1000000, max: Infinity, rate: 0.40 },
];

const CURRENT_EXEMPTION = 13_610_000;
const POST_SUNSET_EXEMPTION = 7_000_000;
const GST_EXEMPTION = 13_610_000;
const ANNUAL_EXCLUSION = 18_000;
const GST_TAX_RATE = 0.40;
const ESTATE_TAX_TOP_RATE = 0.40;

export interface EstateTaxInput {
  totalEstateValue: number;
  maritalDeduction: number;
  charitableDeduction: number;
  lifetimeGiftsUsed: number;
  isMarried: boolean;
  spouseExemptionPortability: number;
}

export interface EstateTaxResult {
  grossEstate: number;
  maritalDeduction: number;
  charitableDeduction: number;
  taxableEstate: number;
  tentativeTax: number;
  applicableExclusion: number;
  unifiedCredit: number;
  netEstateTax: number;
  effectiveRate: number;
  marginalRate: number;
  bracketBreakdown: Array<{ bracket: string; taxableInBracket: number; taxOnBracket: number; rate: number }>;
}

export interface SunsetComparison {
  currentScenario: EstateTaxResult;
  postSunsetScenario: EstateTaxResult;
  additionalTaxExposure: number;
  exemptionReduction: number;
  currentExemption: number;
  postSunsetExemption: number;
  useItOrLoseIt: number;
  daysRemaining: number;
  sunsetDate: string;
  urgency: "critical" | "high" | "moderate" | "low";
}

export interface GRATAnalysis {
  fundedValue: number;
  termYears: number;
  section7520Rate: number;
  assumedGrowthRate: number;
  annuityRate: number;
  annualAnnuityPayment: number;
  totalAnnuityPayments: number;
  annuityFactor: number;
  retainedInterestValue: number;
  remainderInterestValue: number;
  isZeroedOut: boolean;
  projectedEndValue: number;
  wealthTransferred: number;
  giftTaxSaved: number;
  effectiveTaxRate: number;
  sensitivityAnalysis: Array<{
    growthRate: number;
    projectedEndValue: number;
    wealthTransferred: number;
    grantorDiesInTerm: boolean;
  }>;
  optimalAnnuityRate: number;
  zeroOutProbability: number;
  notes: string[];
}

export interface SLATAnalysis {
  fundedValue: number;
  estateReduction: number;
  estateTaxSavings: number;
  exemptionUsed: number;
  remainingExemption: number;
  spouseAccessRetained: boolean;
  reciprocalTrustWarning: boolean;
  reciprocalTrustNotes: string[];
  projectedGrowth: number;
  projectedValueAtTerm: number;
  notes: string[];
}

export interface IDGTAnalysis {
  fundedValue: number;
  noteValue: number;
  interestRate: number;
  termYears: number;
  annualInterest: number;
  totalInterestPaid: number;
  estateFreezeValue: number;
  projectedGrowth: number;
  wealthTransferred: number;
  incomeTaxOnGrowth: number;
  estateTaxSaved: number;
  netBenefit: number;
  notes: string[];
}

export interface GSTTrackingResult {
  totalGstExemption: number;
  totalGstAllocated: number;
  remainingGstExemption: number;
  gstUtilizationPercent: number;
  gstGiftCount: number;
  gstAllocationByYear: Record<number, number>;
  dynastyTrustAllocations: Array<{ trustName: string; amount: number }>;
  potentialGstTax: number;
  notes: string[];
}

export interface LifetimeExemptionTracker {
  federalExemption: number;
  lifetimeGiftsUsed: number;
  trustTransfersUsed: number;
  totalUsed: number;
  remainingExemption: number;
  utilizationPercent: number;
  giftsByYear: Record<number, number>;
  trustUsageBreakdown: Array<{ trustName: string; trustType: string; amount: number }>;
  annualExclusion: number;
  annualExclusionsUsedThisYear: number;
  postSunsetRemaining: number;
  capacityAtRisk: number;
  notes: string[];
}

export interface FullEstateAnalysis {
  estateTax: EstateTaxResult;
  sunsetComparison: SunsetComparison;
  gratAnalyses: GRATAnalysis[];
  slatAnalyses: SLATAnalysis[];
  idgtAnalyses: IDGTAnalysis[];
  gstTracking: GSTTrackingResult;
  exemptionTracker: LifetimeExemptionTracker;
  strategyComparisons: Array<{
    strategy: string;
    estateTaxWithout: number;
    estateTaxWith: number;
    savings: number;
    description: string;
  }>;
}

function computeTentativeTax(taxableAmount: number): { tax: number; marginalRate: number; breakdown: EstateTaxResult["bracketBreakdown"] } {
  let tax = 0;
  let marginalRate = 0;
  const breakdown: EstateTaxResult["bracketBreakdown"] = [];

  for (const bracket of FEDERAL_ESTATE_TAX_BRACKETS) {
    if (taxableAmount <= bracket.min) break;
    const taxableInBracket = Math.min(taxableAmount, bracket.max) - bracket.min;
    const taxOnBracket = taxableInBracket * bracket.rate;
    tax += taxOnBracket;
    marginalRate = bracket.rate;
    breakdown.push({
      bracket: bracket.max === Infinity ? `Over $${(bracket.min / 1e6).toFixed(1)}M` : `$${(bracket.min / 1e3).toFixed(0)}K - $${(bracket.max / 1e3).toFixed(0)}K`,
      taxableInBracket: Math.round(taxableInBracket * 100) / 100,
      taxOnBracket: Math.round(taxOnBracket * 100) / 100,
      rate: bracket.rate,
    });
  }

  return { tax: Math.round(tax * 100) / 100, marginalRate, breakdown };
}

export function computeEstateTax(input: EstateTaxInput, exemptionOverride?: number): EstateTaxResult {
  const exemption = exemptionOverride ?? CURRENT_EXEMPTION;
  const totalExclusion = exemption + (input.isMarried ? input.spouseExemptionPortability : 0);

  const taxableEstate = Math.max(0,
    input.totalEstateValue
    - input.maritalDeduction
    - input.charitableDeduction
  );

  const taxableWithGifts = taxableEstate + input.lifetimeGiftsUsed;
  const { tax: tentativeTax, marginalRate, breakdown } = computeTentativeTax(taxableWithGifts);
  const { tax: giftTaxCredit } = computeTentativeTax(input.lifetimeGiftsUsed);
  const unifiedCredit = computeTentativeTax(totalExclusion).tax;

  const netEstateTax = Math.max(0, tentativeTax - giftTaxCredit - unifiedCredit);
  const effectiveRate = taxableEstate > 0 ? netEstateTax / taxableEstate : 0;

  return {
    grossEstate: input.totalEstateValue,
    maritalDeduction: input.maritalDeduction,
    charitableDeduction: input.charitableDeduction,
    taxableEstate,
    tentativeTax,
    applicableExclusion: totalExclusion,
    unifiedCredit,
    netEstateTax: Math.round(netEstateTax * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 10000) / 10000,
    marginalRate,
    bracketBreakdown: breakdown,
  };
}

export function computeSunsetComparison(input: EstateTaxInput): SunsetComparison {
  const currentResult = computeEstateTax(input, CURRENT_EXEMPTION);
  const postSunsetResult = computeEstateTax(input, POST_SUNSET_EXEMPTION);

  const now = new Date();
  const sunsetDate = new Date("2026-01-01");
  const daysRemaining = Math.max(0, Math.ceil((sunsetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  let urgency: SunsetComparison["urgency"] = "low";
  if (daysRemaining <= 90) urgency = "critical";
  else if (daysRemaining <= 365) urgency = "high";
  else if (daysRemaining <= 730) urgency = "moderate";

  const additionalTaxExposure = postSunsetResult.netEstateTax - currentResult.netEstateTax;
  const useItOrLoseIt = Math.max(0, CURRENT_EXEMPTION - POST_SUNSET_EXEMPTION - input.lifetimeGiftsUsed);

  return {
    currentScenario: currentResult,
    postSunsetScenario: postSunsetResult,
    additionalTaxExposure: Math.max(0, additionalTaxExposure),
    exemptionReduction: CURRENT_EXEMPTION - POST_SUNSET_EXEMPTION,
    currentExemption: CURRENT_EXEMPTION,
    postSunsetExemption: POST_SUNSET_EXEMPTION,
    useItOrLoseIt,
    daysRemaining,
    sunsetDate: sunsetDate.toISOString().split("T")[0],
    urgency,
  };
}

export function computeGRATAnalysis(
  trust: Trust,
  assumedGrowthRate: number = 0.07,
): GRATAnalysis {
  const fundedValue = parseFloat(String(trust.fundedValue || "0"));
  const termYears = trust.termYears || 2;
  const section7520Rate = parseFloat(String(trust.section7520Rate || "0.052"));
  const notes: string[] = [];

  const annuityFactor = section7520Rate > 0
    ? (1 - Math.pow(1 + section7520Rate, -termYears)) / section7520Rate
    : termYears;

  const optimalAnnuityRate = annuityFactor > 0 ? 1 / annuityFactor : 0;
  const parsedAnnuityRate = parseFloat(String(trust.annuityRate || ""));
  const annuityRate = !isNaN(parsedAnnuityRate) && parsedAnnuityRate > 0 ? parsedAnnuityRate : optimalAnnuityRate;
  const annualAnnuityPayment = fundedValue * annuityRate;
  const totalAnnuityPayments = annualAnnuityPayment * termYears;

  const retainedInterestValue = annualAnnuityPayment * annuityFactor;
  const remainderInterestValue = Math.max(0, fundedValue - retainedInterestValue);
  const isZeroedOut = remainderInterestValue < 100;

  let projectedEndValue = fundedValue;
  for (let y = 1; y <= termYears; y++) {
    projectedEndValue = projectedEndValue * (1 + assumedGrowthRate) - annualAnnuityPayment;
  }
  projectedEndValue = Math.max(0, projectedEndValue);

  const wealthTransferred = projectedEndValue;
  const giftTaxSaved = remainderInterestValue * ESTATE_TAX_TOP_RATE;
  const effectiveTaxRate = fundedValue > 0 ? (remainderInterestValue / fundedValue) * ESTATE_TAX_TOP_RATE : 0;

  const sensitivityAnalysis = [0.03, 0.05, 0.07, 0.09, 0.12].map(gr => {
    let ev = fundedValue;
    for (let y = 1; y <= termYears; y++) {
      ev = ev * (1 + gr) - annualAnnuityPayment;
    }
    return {
      growthRate: gr,
      projectedEndValue: Math.max(0, Math.round(ev * 100) / 100),
      wealthTransferred: Math.max(0, Math.round(ev * 100) / 100),
      grantorDiesInTerm: false,
    };
  });

  if (isZeroedOut) notes.push("Zeroed-out GRAT: minimal gift tax exposure on remainder interest");
  notes.push(`Annuity factor at ${(section7520Rate * 100).toFixed(2)}% §7520 rate: ${annuityFactor.toFixed(4)}`);
  notes.push(`Optimal annuity rate for zeroing out: ${(optimalAnnuityRate * 100).toFixed(2)}%`);
  if (assumedGrowthRate > section7520Rate) {
    notes.push(`Growth rate (${(assumedGrowthRate * 100).toFixed(1)}%) exceeds §7520 rate — GRAT is favorable`);
  } else {
    notes.push(`Growth rate (${(assumedGrowthRate * 100).toFixed(1)}%) does not exceed §7520 rate — GRAT may not be optimal`);
  }
  if (termYears <= 2) notes.push("Short-term GRAT (rolling GRATs) reduces mortality risk");

  const zeroOutProbability = computeGRATZeroOutProbability(
    section7520Rate, assumedGrowthRate, termYears
  );
  notes.push(`Zero-out probability: ${(zeroOutProbability * 100).toFixed(0)}% (based on ${(assumedGrowthRate * 100).toFixed(0)}% growth vs ${(section7520Rate * 100).toFixed(2)}% §7520 rate over ${termYears} years)`);

  return {
    fundedValue,
    termYears,
    section7520Rate,
    assumedGrowthRate,
    annuityRate,
    annualAnnuityPayment: Math.round(annualAnnuityPayment * 100) / 100,
    totalAnnuityPayments: Math.round(totalAnnuityPayments * 100) / 100,
    annuityFactor: Math.round(annuityFactor * 10000) / 10000,
    retainedInterestValue: Math.round(retainedInterestValue * 100) / 100,
    remainderInterestValue: Math.round(remainderInterestValue * 100) / 100,
    isZeroedOut,
    projectedEndValue: Math.round(projectedEndValue * 100) / 100,
    wealthTransferred: Math.round(wealthTransferred * 100) / 100,
    giftTaxSaved: Math.round(giftTaxSaved * 100) / 100,
    effectiveTaxRate: Math.round(effectiveTaxRate * 10000) / 10000,
    sensitivityAnalysis,
    optimalAnnuityRate: Math.round(optimalAnnuityRate * 10000) / 10000,
    zeroOutProbability,
    notes,
  };
}

export function computeSLATAnalysis(
  trust: Trust,
  totalEstateValue: number,
  existingSLATs: Trust[] = [],
): SLATAnalysis {
  const fundedValue = parseFloat(String(trust.fundedValue || "0"));
  const termYears = trust.termYears || 20;
  const growthRate = 0.06;
  const notes: string[] = [];

  const estateReduction = fundedValue;
  const estateTaxSavings = estateReduction * ESTATE_TAX_TOP_RATE;
  const exemptionUsed = fundedValue;
  const remainingExemption = Math.max(0, CURRENT_EXEMPTION - exemptionUsed);

  const projectedValueAtTerm = fundedValue * Math.pow(1 + growthRate, termYears);
  const projectedGrowth = projectedValueAtTerm - fundedValue;

  const otherSLATs = existingSLATs.filter(s => s.id !== trust.id);
  const hasReciprocalRisk = otherSLATs.length > 0;
  const reciprocalTrustNotes: string[] = [];
  if (hasReciprocalRisk) {
    reciprocalTrustNotes.push("WARNING: Multiple SLATs detected — review for reciprocal trust doctrine risk");
    reciprocalTrustNotes.push("SLATs created by spouses for each other's benefit may be collapsed under IRC §2036/2038");
    reciprocalTrustNotes.push("Ensure SLATs differ in terms, trustees, beneficiaries, or distribution standards");
  }

  notes.push(`Removes $${(fundedValue / 1e6).toFixed(2)}M from taxable estate`);
  notes.push(`Projected estate tax savings: $${(estateTaxSavings / 1e6).toFixed(2)}M at 40% rate`);
  notes.push(`Projected value after ${termYears} years at ${(growthRate * 100).toFixed(0)}% growth: $${(projectedValueAtTerm / 1e6).toFixed(2)}M`);
  notes.push("Spouse retains access as beneficiary — indirect access to funds");
  notes.push("Trust assets protected from creditors in most jurisdictions");

  return {
    fundedValue,
    estateReduction,
    estateTaxSavings: Math.round(estateTaxSavings * 100) / 100,
    exemptionUsed,
    remainingExemption,
    spouseAccessRetained: true,
    reciprocalTrustWarning: hasReciprocalRisk,
    reciprocalTrustNotes,
    projectedGrowth: Math.round(projectedGrowth * 100) / 100,
    projectedValueAtTerm: Math.round(projectedValueAtTerm * 100) / 100,
    notes,
  };
}

export function computeIDGTAnalysis(
  trust: Trust,
  noteInterestRate: number = 0.052,
  incomeTaxRate: number = 0.37,
): IDGTAnalysis {
  const fundedValue = parseFloat(String(trust.fundedValue || "0"));
  const termYears = trust.termYears || 10;
  const growthRate = 0.08;
  const notes: string[] = [];

  const noteValue = fundedValue * 0.9;
  const seedGift = fundedValue * 0.1;
  const annualInterest = noteValue * noteInterestRate;
  const totalInterestPaid = annualInterest * termYears;

  const projectedGrowth = fundedValue * Math.pow(1 + growthRate, termYears) - fundedValue;
  const wealthTransferred = projectedGrowth - totalInterestPaid;
  const incomeTaxOnGrowth = (annualInterest * termYears) * incomeTaxRate;
  const estateTaxSaved = wealthTransferred * ESTATE_TAX_TOP_RATE;
  const netBenefit = estateTaxSaved - incomeTaxOnGrowth;

  notes.push(`Seed gift of $${(seedGift / 1e6).toFixed(2)}M (10% of trust value) uses exemption`);
  notes.push(`Installment note of $${(noteValue / 1e6).toFixed(2)}M at ${(noteInterestRate * 100).toFixed(2)}% AFR`);
  notes.push(`Annual interest payments of $${(annualInterest / 1e3).toFixed(0)}K flow back to grantor`);
  notes.push("Grantor pays income tax on trust income (further reduces estate)");
  notes.push(`Projected wealth transfer: $${(wealthTransferred / 1e6).toFixed(2)}M over ${termYears} years`);
  if (netBenefit > 0) {
    notes.push(`Net tax benefit: $${(netBenefit / 1e6).toFixed(2)}M (estate tax saved minus income tax paid)`);
  }

  return {
    fundedValue,
    noteValue: Math.round(noteValue * 100) / 100,
    interestRate: noteInterestRate,
    termYears,
    annualInterest: Math.round(annualInterest * 100) / 100,
    totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
    estateFreezeValue: fundedValue,
    projectedGrowth: Math.round(projectedGrowth * 100) / 100,
    wealthTransferred: Math.round(Math.max(0, wealthTransferred) * 100) / 100,
    incomeTaxOnGrowth: Math.round(incomeTaxOnGrowth * 100) / 100,
    estateTaxSaved: Math.round(Math.max(0, estateTaxSaved) * 100) / 100,
    netBenefit: Math.round(netBenefit * 100) / 100,
    notes,
  };
}

function computeTrustExemptionUsage(trust: Trust): number {
  const fundedValue = parseFloat(String(trust.fundedValue || "0"));
  const termYears = trust.termYears || 0;
  const section7520Rate = parseFloat(String(trust.section7520Rate || "0.05"));

  switch (trust.trustType) {
    case "GRAT": {
      const annuityFactor = section7520Rate > 0 && termYears > 0
        ? (1 - Math.pow(1 + section7520Rate, -termYears)) / section7520Rate
        : termYears;
      const optRate = annuityFactor > 0 ? 1 / annuityFactor : 0;
      const parsedRate = parseFloat(String(trust.annuityRate || ""));
      const rate = !isNaN(parsedRate) && parsedRate > 0 ? parsedRate : optRate;
      const annualPayment = fundedValue * rate;
      const retainedInterest = annualPayment * annuityFactor;
      return Math.max(0, fundedValue - retainedInterest);
    }
    case "QPRT": {
      const discountFactor = termYears > 0 && section7520Rate > 0
        ? Math.pow(1 + section7520Rate, -termYears)
        : 0.5;
      return fundedValue * discountFactor;
    }
    case "CRT":
    case "DAF":
    case "REVOCABLE":
      return 0;
    default:
      return fundedValue;
  }
}

function computeGRATZeroOutProbability(
  section7520Rate: number,
  assumedGrowthRate: number,
  termYears: number,
  volatility: number = 0.15,
): number {
  const excessReturn = assumedGrowthRate - section7520Rate;
  if (excessReturn <= 0) return 0.3;

  const zScore = (excessReturn * termYears) / (volatility * Math.sqrt(termYears));
  const probability = normalCDF(zScore);
  return Math.round(Math.min(0.99, Math.max(0.01, probability)) * 100) / 100;
}

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

export function computeGSTTracking(
  gifts: GiftHistoryEntry[],
  trusts: Trust[],
): GSTTrackingResult {
  const gstGifts = gifts.filter(g => g.gstApplicable);
  const totalGstAllocated = gstGifts.reduce(
    (sum, g) => sum + parseFloat(String(g.gstAllocated || g.taxableAmount || "0")), 0
  );

  const gstAllocationByYear: Record<number, number> = {};
  for (const gift of gstGifts) {
    const year = new Date(gift.giftDate).getFullYear();
    gstAllocationByYear[year] = (gstAllocationByYear[year] || 0) +
      parseFloat(String(gift.gstAllocated || gift.taxableAmount || "0"));
  }

  const dynastyTrusts = trusts.filter(t => t.trustType === "DYNASTY");
  const dynastyTrustAllocations = dynastyTrusts.map(t => ({
    trustName: t.name,
    amount: parseFloat(String(t.fundedValue || "0")),
  }));

  const totalDynastyAllocation = dynastyTrustAllocations.reduce((s, d) => s + d.amount, 0);
  const totalGstUsage = totalGstAllocated + totalDynastyAllocation;
  const remainingGstExemption = Math.max(0, GST_EXEMPTION - totalGstUsage);
  const excessGST = Math.max(0, totalGstUsage - GST_EXEMPTION);
  const potentialGstTax = excessGST * GST_TAX_RATE;

  const notes: string[] = [];
  if (gstGifts.length > 0) {
    notes.push(`${gstGifts.length} generation-skipping transfer${gstGifts.length !== 1 ? "s" : ""} recorded`);
  }
  if (dynastyTrusts.length > 0) {
    notes.push(`${dynastyTrusts.length} dynasty trust${dynastyTrusts.length !== 1 ? "s" : ""} with GST allocations`);
  }
  if (remainingGstExemption <= 0) {
    notes.push("WARNING: GST exemption fully utilized — additional transfers will incur 40% GST tax");
  } else if (remainingGstExemption < 2_000_000) {
    notes.push("GST exemption nearly exhausted — plan allocations carefully");
  }

  return {
    totalGstExemption: GST_EXEMPTION,
    totalGstAllocated: Math.round(totalGstUsage * 100) / 100,
    remainingGstExemption: Math.round(remainingGstExemption * 100) / 100,
    gstUtilizationPercent: GST_EXEMPTION > 0 ? Math.round((totalGstUsage / GST_EXEMPTION) * 10000) / 100 : 0,
    gstGiftCount: gstGifts.length,
    gstAllocationByYear,
    dynastyTrustAllocations,
    potentialGstTax: Math.round(potentialGstTax * 100) / 100,
    notes,
  };
}

export function computeLifetimeExemptionTracker(
  gifts: GiftHistoryEntry[],
  trusts: Trust[],
): LifetimeExemptionTracker {
  const lifetimeGiftsUsed = gifts.reduce(
    (sum, g) => sum + parseFloat(String(g.taxableAmount || "0")), 0
  );

  const irrevocableTrusts = trusts.filter(t =>
    t.trustType !== "REVOCABLE" && t.trustType !== "CRT" && t.trustType !== "DAF"
  );
  const trustTransfersUsed = irrevocableTrusts.reduce(
    (sum, t) => sum + computeTrustExemptionUsage(t), 0
  );

  const totalUsed = lifetimeGiftsUsed + trustTransfersUsed;
  const remainingExemption = Math.max(0, CURRENT_EXEMPTION - totalUsed);
  const utilizationPercent = CURRENT_EXEMPTION > 0 ? (totalUsed / CURRENT_EXEMPTION) * 100 : 0;

  const giftsByYear: Record<number, number> = {};
  for (const gift of gifts) {
    const year = new Date(gift.giftDate).getFullYear();
    giftsByYear[year] = (giftsByYear[year] || 0) + parseFloat(String(gift.taxableAmount || "0"));
  }

  const trustUsageBreakdown = irrevocableTrusts.map(t => ({
    trustName: t.name,
    trustType: t.trustType,
    amount: computeTrustExemptionUsage(t),
  }));

  const currentYear = new Date().getFullYear();
  const thisYearGifts = gifts.filter(g => new Date(g.giftDate).getFullYear() === currentYear);
  const annualExclusionsUsedThisYear = thisYearGifts.reduce(
    (sum, g) => sum + parseFloat(String(g.annualExclusionApplied || "0")), 0
  );

  const postSunsetRemaining = Math.max(0, POST_SUNSET_EXEMPTION - totalUsed);
  const capacityAtRisk = Math.max(0, remainingExemption - postSunsetRemaining);

  const notes: string[] = [];
  if (capacityAtRisk > 0) {
    notes.push(`$${(capacityAtRisk / 1e6).toFixed(2)}M of exemption capacity at risk from TCJA sunset`);
  }
  if (utilizationPercent > 80) {
    notes.push("Exemption utilization exceeds 80% — plan remaining gifts carefully");
  }
  if (totalUsed > CURRENT_EXEMPTION) {
    notes.push("WARNING: Total transfers exceed current exemption — gift tax liability may apply");
  }

  return {
    federalExemption: CURRENT_EXEMPTION,
    lifetimeGiftsUsed: Math.round(lifetimeGiftsUsed * 100) / 100,
    trustTransfersUsed: Math.round(trustTransfersUsed * 100) / 100,
    totalUsed: Math.round(totalUsed * 100) / 100,
    remainingExemption: Math.round(remainingExemption * 100) / 100,
    utilizationPercent: Math.round(utilizationPercent * 100) / 100,
    giftsByYear,
    trustUsageBreakdown,
    annualExclusion: ANNUAL_EXCLUSION,
    annualExclusionsUsedThisYear: Math.round(annualExclusionsUsedThisYear * 100) / 100,
    postSunsetRemaining: Math.round(postSunsetRemaining * 100) / 100,
    capacityAtRisk: Math.round(capacityAtRisk * 100) / 100,
    notes,
  };
}

export function computeFullEstateAnalysis(
  totalEstateValue: number,
  trusts: Trust[],
  gifts: GiftHistoryEntry[],
  isMarried: boolean = false,
  spouseExemptionPortability: number = 0,
): FullEstateAnalysis {
  const charitableTrusts = trusts.filter(t => t.trustType === "CRT" || t.trustType === "DAF");
  const charitableDeduction = charitableTrusts.reduce(
    (sum, t) => sum + parseFloat(String(t.fundedValue || "0")), 0
  );

  const giftExemptionUsed = gifts.reduce(
    (sum, g) => sum + parseFloat(String(g.taxableAmount || "0")), 0
  );

  const irrevocableTrusts = trusts.filter(t =>
    t.trustType !== "REVOCABLE" && t.trustType !== "CRT" && t.trustType !== "DAF"
  );
  const trustExemptionUsed = irrevocableTrusts.reduce(
    (sum, t) => sum + computeTrustExemptionUsage(t), 0
  );
  const totalExemptionUsed = giftExemptionUsed + trustExemptionUsed;

  const input: EstateTaxInput = {
    totalEstateValue,
    maritalDeduction: 0,
    charitableDeduction,
    lifetimeGiftsUsed: totalExemptionUsed,
    isMarried,
    spouseExemptionPortability,
  };

  const estateTax = computeEstateTax(input);
  const sunsetComparison = computeSunsetComparison(input);

  const gratTrusts = trusts.filter(t => t.trustType === "GRAT");
  const gratAnalyses = gratTrusts.map(t => computeGRATAnalysis(t));

  const slatTrusts = trusts.filter(t => t.trustType === "SLAT");
  const slatAnalyses = slatTrusts.map(t => computeSLATAnalysis(t, totalEstateValue, slatTrusts));

  const idgtCandidates = trusts.filter(t =>
    t.trustType !== "REVOCABLE" && t.trustType !== "CRT" && t.trustType !== "DAF"
    && t.trustType !== "GRAT" && t.trustType !== "SLAT" && t.trustType !== "QPRT"
  );
  const idgtAnalyses = idgtCandidates.map(t => computeIDGTAnalysis(t));

  const gstTracking = computeGSTTracking(gifts, trusts);
  const exemptionTracker = computeLifetimeExemptionTracker(gifts, trusts);

  const irrevocableTrustValue = trusts
    .filter(t => t.trustType !== "REVOCABLE")
    .reduce((s, t) => s + parseFloat(String(t.fundedValue || "0")), 0);

  const inputWithoutTrusts: EstateTaxInput = {
    ...input,
    totalEstateValue: totalEstateValue + irrevocableTrustValue,
    maritalDeduction: 0,
    charitableDeduction: 0,
  };
  const taxWithoutPlanning = computeEstateTax(inputWithoutTrusts);

  const strategyComparisons = [
    {
      strategy: "Current Plan",
      estateTaxWithout: taxWithoutPlanning.netEstateTax,
      estateTaxWith: estateTax.netEstateTax,
      savings: taxWithoutPlanning.netEstateTax - estateTax.netEstateTax,
      description: "Impact of all current trust structures and gifting strategies",
    },
  ];

  if (gratAnalyses.length > 0) {
    const gratSavings = gratAnalyses.reduce((s, g) => s + g.giftTaxSaved, 0);
    strategyComparisons.push({
      strategy: "GRAT Strategy",
      estateTaxWithout: gratSavings,
      estateTaxWith: 0,
      savings: gratSavings,
      description: `${gratAnalyses.length} GRAT${gratAnalyses.length !== 1 ? "s" : ""} transferring wealth via annuity structure`,
    });
  }

  if (slatAnalyses.length > 0) {
    const slatSavings = slatAnalyses.reduce((s, a) => s + a.estateTaxSavings, 0);
    strategyComparisons.push({
      strategy: "SLAT Strategy",
      estateTaxWithout: slatSavings,
      estateTaxWith: 0,
      savings: slatSavings,
      description: `${slatAnalyses.length} SLAT${slatAnalyses.length !== 1 ? "s" : ""} removing assets while retaining spousal access`,
    });
  }

  return {
    estateTax,
    sunsetComparison,
    gratAnalyses,
    slatAnalyses,
    idgtAnalyses,
    gstTracking,
    exemptionTracker,
    strategyComparisons,
  };
}
