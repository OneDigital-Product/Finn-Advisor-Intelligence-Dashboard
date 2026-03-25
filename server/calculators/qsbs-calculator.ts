export interface QSBSHolding {
  companyName: string;
  ticker?: string;
  sharesOwned: number;
  costBasis: number;
  currentValue: number;
  acquisitionDate: string;
  qualifiedSmallBusiness: boolean;
  cCorpAtAcquisition: boolean;
  grossAssetsUnder50M: boolean;
  activeBusinessRequirement: boolean;
  originalHolder: boolean;
}

export interface QSBSAnalysis {
  companyName: string;
  ticker?: string;
  sharesOwned: number;
  costBasis: number;
  currentValue: number;
  unrealizedGain: number;
  acquisitionDate: string;
  holdingPeriodDays: number;
  holdingPeriodYears: number;
  meetsHoldingPeriod: boolean;
  daysUntilQualified: number;
  qualificationDate: string;
  section1202Eligible: boolean;
  eligibilityIssues: string[];
  maxExclusion: number;
  excludableGain: number;
  taxableGain: number;
  estimatedTaxSavings: number;
  milestones: QSBSMilestone[];
  status: "qualified" | "pending" | "ineligible";
}

export interface QSBSMilestone {
  label: string;
  date: string;
  completed: boolean;
  daysAway: number | null;
  description: string;
}

export interface QSBSInput {
  holdings: QSBSHolding[];
  federalCapitalGainsRate: number;
  stateCapitalGainsRate?: number;
}

export interface QSBSResult {
  analyses: QSBSAnalysis[];
  totalExcludableGain: number;
  totalTaxSavings: number;
  alerts: QSBSAlert[];
  summary: {
    qualifiedCount: number;
    pendingCount: number;
    ineligibleCount: number;
    totalCostBasis: number;
    totalCurrentValue: number;
    totalUnrealizedGain: number;
  };
  notes: string[];
}

export interface QSBSAlert {
  severity: "high" | "medium" | "low";
  holding: string;
  message: string;
}

function daysBetween(date1: Date, date2: Date): number {
  return Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

const FIVE_YEARS_DAYS = 5 * 365 + 1;

export function calculateQSBS(inputs: QSBSInput): QSBSResult {
  const { holdings, federalCapitalGainsRate, stateCapitalGainsRate = 0 } = inputs;

  if (holdings.length === 0) throw new Error("At least one QSBS holding is required");

  const now = new Date();
  const notes: string[] = [];
  const alerts: QSBSAlert[] = [];

  const analyses: QSBSAnalysis[] = holdings.map((holding) => {
    const acqDate = new Date(holding.acquisitionDate);
    const holdingDays = daysBetween(acqDate, now);
    const holdingYears = holdingDays / 365.25;
    const meetsHolding = holdingDays >= FIVE_YEARS_DAYS;
    const qualDate = addDays(acqDate, FIVE_YEARS_DAYS);
    const daysUntilQualified = meetsHolding ? 0 : daysBetween(now, qualDate);

    const eligibilityIssues: string[] = [];
    if (!holding.qualifiedSmallBusiness) eligibilityIssues.push("Company may not meet qualified small business criteria");
    if (!holding.cCorpAtAcquisition) eligibilityIssues.push("Company was not a C-Corporation at time of acquisition");
    if (!holding.grossAssetsUnder50M) eligibilityIssues.push("Company gross assets may have exceeded $50M at issuance");
    if (!holding.activeBusinessRequirement) eligibilityIssues.push("Company may not meet active business requirement (excludes certain service businesses)");
    if (!holding.originalHolder) eligibilityIssues.push("Stock was not acquired directly from the corporation (original issuance required)");

    const isEligible = eligibilityIssues.length === 0;
    const status: "qualified" | "pending" | "ineligible" = !isEligible ? "ineligible" : meetsHolding ? "qualified" : "pending";

    const unrealizedGain = holding.currentValue - holding.costBasis;
    const maxExclusion = Math.max(10000000, holding.costBasis * 10);
    const excludableGain = isEligible && meetsHolding ? Math.min(Math.max(unrealizedGain, 0), maxExclusion) : 0;
    const taxableGain = Math.max(0, unrealizedGain - excludableGain);
    const combinedRate = federalCapitalGainsRate + stateCapitalGainsRate;
    const estimatedTaxSavings = excludableGain * combinedRate;

    const milestones: QSBSMilestone[] = [
      {
        label: "Acquisition",
        date: acqDate.toISOString().split("T")[0],
        completed: true,
        daysAway: null,
        description: `Stock acquired on ${acqDate.toLocaleDateString()}`,
      },
      {
        label: "1-Year Mark",
        date: addDays(acqDate, 365).toISOString().split("T")[0],
        completed: holdingDays >= 365,
        daysAway: holdingDays >= 365 ? null : 365 - holdingDays,
        description: "Eligible for Section 1045 rollover if sold before 5-year mark",
      },
      {
        label: "5-Year Qualification",
        date: qualDate.toISOString().split("T")[0],
        completed: meetsHolding,
        daysAway: meetsHolding ? null : daysUntilQualified,
        description: "Full Section 1202 exclusion becomes available",
      },
    ];

    if (status === "pending" && daysUntilQualified <= 180) {
      alerts.push({
        severity: "high",
        holding: holding.companyName,
        message: `${holding.companyName} qualifies for QSBS exclusion in ${daysUntilQualified} days (${qualDate.toLocaleDateString()}). Avoid selling before qualification.`,
      });
    }

    if (status === "pending" && daysUntilQualified > 180 && daysUntilQualified <= 365) {
      alerts.push({
        severity: "medium",
        holding: holding.companyName,
        message: `${holding.companyName} is ${Math.round(holdingYears * 10) / 10} years into the 5-year holding period. Qualification date: ${qualDate.toLocaleDateString()}.`,
      });
    }

    if (status === "qualified" && excludableGain > 5000000) {
      alerts.push({
        severity: "medium",
        holding: holding.companyName,
        message: `${holding.companyName} has $${Math.round(excludableGain / 1000000)}M in excludable gain. Consider stacking strategies (gifting to family members) to multiply the exclusion.`,
      });
    }

    return {
      companyName: holding.companyName,
      ticker: holding.ticker,
      sharesOwned: holding.sharesOwned,
      costBasis: holding.costBasis,
      currentValue: holding.currentValue,
      unrealizedGain: Math.round(unrealizedGain * 100) / 100,
      acquisitionDate: holding.acquisitionDate,
      holdingPeriodDays: holdingDays,
      holdingPeriodYears: Math.round(holdingYears * 100) / 100,
      meetsHoldingPeriod: meetsHolding,
      daysUntilQualified,
      qualificationDate: qualDate.toISOString().split("T")[0],
      section1202Eligible: isEligible,
      eligibilityIssues,
      maxExclusion,
      excludableGain: Math.round(excludableGain * 100) / 100,
      taxableGain: Math.round(taxableGain * 100) / 100,
      estimatedTaxSavings: Math.round(estimatedTaxSavings * 100) / 100,
      milestones,
      status,
    };
  });

  const qualified = analyses.filter((a) => a.status === "qualified");
  const pending = analyses.filter((a) => a.status === "pending");
  const ineligible = analyses.filter((a) => a.status === "ineligible");

  notes.push("Section 1202 allows exclusion of gain from the sale of QSBS held for 5+ years, up to the greater of $10M or 10x the adjusted basis.");
  notes.push("Stock must be acquired at original issuance from a domestic C-Corp with gross assets ≤ $50M.");
  notes.push("Certain service businesses (health, law, consulting, finance) are excluded from QSBS eligibility.");
  if (stateCapitalGainsRate > 0) {
    notes.push(`State tax savings included at ${(stateCapitalGainsRate * 100).toFixed(1)}% rate. Note: Some states do not conform to Section 1202.`);
  }
  notes.push("Consider gifting QSBS shares to family members to multiply the $10M per-taxpayer exclusion.");

  return {
    analyses,
    totalExcludableGain: Math.round(analyses.reduce((s, a) => s + a.excludableGain, 0) * 100) / 100,
    totalTaxSavings: Math.round(analyses.reduce((s, a) => s + a.estimatedTaxSavings, 0) * 100) / 100,
    alerts: alerts.sort((a, b) => (a.severity === "high" ? -1 : b.severity === "high" ? 1 : 0)),
    summary: {
      qualifiedCount: qualified.length,
      pendingCount: pending.length,
      ineligibleCount: ineligible.length,
      totalCostBasis: Math.round(analyses.reduce((s, a) => s + a.costBasis, 0) * 100) / 100,
      totalCurrentValue: Math.round(analyses.reduce((s, a) => s + a.currentValue, 0) * 100) / 100,
      totalUnrealizedGain: Math.round(analyses.reduce((s, a) => s + a.unrealizedGain, 0) * 100) / 100,
    },
    notes,
  };
}
