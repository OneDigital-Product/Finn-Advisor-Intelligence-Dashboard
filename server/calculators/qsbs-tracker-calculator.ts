export interface QSBSPosition {
  companyName: string;
  sharesOwned: number;
  costBasis: number;
  currentValue: number;
  acquisitionDate: string;
  isOriginalIssue: boolean;
  companyGrossAssets: "under_50m" | "over_50m" | "unknown";
  isCCorporation: boolean;
  qualifiedTradeOrBusiness: boolean;
}

export interface QSBSInput {
  positions: QSBSPosition[];
  analysisDate?: string;
}

export interface QSBSPositionResult {
  companyName: string;
  sharesOwned: number;
  costBasis: number;
  currentValue: number;
  unrealizedGain: number;
  acquisitionDate: string;
  holdingPeriodDays: number;
  holdingPeriodYears: number;
  holdingPeriodMet: boolean;
  daysUntilQualified: number;
  qualificationDate: string;
  section1202Eligible: boolean;
  exclusionAmount: number;
  maxExclusionPerIssuer: number;
  excludableGain: number;
  taxableGain: number;
  estimatedTaxSavings: number;
  eligibilityIssues: string[];
  status: "qualified" | "pending" | "ineligible";
}

export interface QSBSResult {
  positions: QSBSPositionResult[];
  summary: {
    totalPositions: number;
    qualifiedPositions: number;
    pendingPositions: number;
    ineligiblePositions: number;
    totalCostBasis: number;
    totalCurrentValue: number;
    totalUnrealizedGain: number;
    totalExcludableGain: number;
    totalEstimatedTaxSavings: number;
  };
  notes: string[];
}

const FIVE_YEARS_MS = 5 * 365.25 * 24 * 60 * 60 * 1000;
const FEDERAL_LTCG_RATE = 0.20;
const NIIT_RATE = 0.038;
const COMBINED_RATE = FEDERAL_LTCG_RATE + NIIT_RATE;

export function calculateQSBS(input: QSBSInput): QSBSResult {
  const analysisDate = input.analysisDate ? new Date(input.analysisDate) : new Date();
  const notes: string[] = [];
  const positionResults: QSBSPositionResult[] = [];

  for (const pos of input.positions) {
    const acquisitionDate = new Date(pos.acquisitionDate);
    const holdingPeriodMs = analysisDate.getTime() - acquisitionDate.getTime();
    const holdingPeriodDays = Math.floor(holdingPeriodMs / (24 * 60 * 60 * 1000));
    const holdingPeriodYears = holdingPeriodDays / 365.25;
    const holdingPeriodMet = holdingPeriodMs >= FIVE_YEARS_MS;

    const daysUntilQualified = holdingPeriodMet ? 0 : Math.ceil((FIVE_YEARS_MS - holdingPeriodMs) / (24 * 60 * 60 * 1000));
    const qualificationDateObj = new Date(acquisitionDate.getTime() + FIVE_YEARS_MS);
    const qualificationDate = qualificationDateObj.toISOString().split("T")[0];

    const eligibilityIssues: string[] = [];
    if (!pos.isOriginalIssue) {
      eligibilityIssues.push("Stock must be acquired at original issuance (not secondary market)");
    }
    if (!pos.isCCorporation) {
      eligibilityIssues.push("Company must be a domestic C-Corporation");
    }
    if (pos.companyGrossAssets === "over_50m") {
      eligibilityIssues.push("Company gross assets exceeded $50M at time of issuance");
    }
    if (!pos.qualifiedTradeOrBusiness) {
      eligibilityIssues.push("Company must be engaged in a qualified trade or business");
    }

    const section1202Eligible = eligibilityIssues.length === 0;
    const unrealizedGain = pos.currentValue - pos.costBasis;
    const maxExclusionPerIssuer = Math.max(10_000_000, pos.costBasis * 10);
    const excludableGain = section1202Eligible && holdingPeriodMet
      ? Math.max(0, Math.min(unrealizedGain, maxExclusionPerIssuer))
      : 0;
    const taxableGain = Math.max(0, unrealizedGain - excludableGain);
    const estimatedTaxSavings = Math.max(0, excludableGain * COMBINED_RATE);

    let status: "qualified" | "pending" | "ineligible" = "ineligible";
    if (section1202Eligible && holdingPeriodMet) status = "qualified";
    else if (section1202Eligible && !holdingPeriodMet) status = "pending";

    positionResults.push({
      companyName: pos.companyName,
      sharesOwned: pos.sharesOwned,
      costBasis: pos.costBasis,
      currentValue: pos.currentValue,
      unrealizedGain,
      acquisitionDate: pos.acquisitionDate,
      holdingPeriodDays,
      holdingPeriodYears: Math.round(holdingPeriodYears * 10) / 10,
      holdingPeriodMet,
      daysUntilQualified,
      qualificationDate,
      section1202Eligible,
      exclusionAmount: excludableGain,
      maxExclusionPerIssuer,
      excludableGain,
      taxableGain: Math.max(0, taxableGain),
      estimatedTaxSavings: Math.round(estimatedTaxSavings * 100) / 100,
      eligibilityIssues,
      status,
    });
  }

  const qualified = positionResults.filter(p => p.status === "qualified");
  const pending = positionResults.filter(p => p.status === "pending");
  const ineligible = positionResults.filter(p => p.status === "ineligible");

  notes.push("Section 1202 allows exclusion of gain on QSBS held for 5+ years, up to the greater of $10M or 10x adjusted basis per issuer.");
  notes.push(`Tax savings estimated at combined ${(COMBINED_RATE * 100).toFixed(1)}% rate (${(FEDERAL_LTCG_RATE * 100).toFixed(0)}% LTCG + ${(NIIT_RATE * 100).toFixed(1)}% NIIT).`);

  if (pending.length > 0) {
    const nearest = pending.reduce((min, p) => p.daysUntilQualified < min.daysUntilQualified ? p : min);
    notes.push(`Nearest qualification: ${nearest.companyName} in ${nearest.daysUntilQualified} days.`);
  }

  if (ineligible.length > 0) {
    notes.push(`${ineligible.length} position(s) have eligibility issues that should be reviewed.`);
  }

  return {
    positions: positionResults,
    summary: {
      totalPositions: positionResults.length,
      qualifiedPositions: qualified.length,
      pendingPositions: pending.length,
      ineligiblePositions: ineligible.length,
      totalCostBasis: positionResults.reduce((s, p) => s + p.costBasis, 0),
      totalCurrentValue: positionResults.reduce((s, p) => s + p.currentValue, 0),
      totalUnrealizedGain: positionResults.reduce((s, p) => s + p.unrealizedGain, 0),
      totalExcludableGain: positionResults.reduce((s, p) => s + p.excludableGain, 0),
      totalEstimatedTaxSavings: Math.round(positionResults.reduce((s, p) => s + p.estimatedTaxSavings, 0) * 100) / 100,
    },
    notes,
  };
}
