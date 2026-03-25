export interface DcfInput {
  ebitda: number;
  growthRate: number;
  discountRate: number;
  projectionYears?: number;
  capexPercent?: number;
  taxRate?: number;
}

export interface DcfResult {
  methodology: "dcf";
  projectedCashFlows: { year: number; cashFlow: number; presentValue: number }[];
  terminalValue: number;
  terminalValuePV: number;
  totalPresentValue: number;
  enterpriseValue: number;
  assumptions: {
    ebitda: number;
    growthRate: number;
    discountRate: number;
    projectionYears: number;
    capexPercent: number;
    taxRate: number;
    terminalGrowthRate: number;
  };
}

export function computeDcf(input: DcfInput): DcfResult {
  const {
    ebitda,
    growthRate,
    discountRate,
    projectionYears = 5,
    capexPercent = 0.05,
    taxRate = 0.21,
  } = input;

  const terminalGrowthRate = Math.min(growthRate * 0.5, 0.03);
  const effectiveDiscountRate = Math.max(discountRate, terminalGrowthRate + 0.01);

  const projectedCashFlows: { year: number; cashFlow: number; presentValue: number }[] = [];
  let currentEbitda = ebitda;
  let totalPV = 0;

  for (let year = 1; year <= projectionYears; year++) {
    currentEbitda = currentEbitda * (1 + growthRate);
    const afterTax = currentEbitda * (1 - taxRate);
    const freeCashFlow = afterTax * (1 - capexPercent);
    const pv = freeCashFlow / Math.pow(1 + effectiveDiscountRate, year);
    totalPV += pv;
    projectedCashFlows.push({
      year,
      cashFlow: Math.round(freeCashFlow),
      presentValue: Math.round(pv),
    });
  }

  const finalCashFlow = projectedCashFlows[projectedCashFlows.length - 1]?.cashFlow || 0;
  const terminalValue = (finalCashFlow * (1 + terminalGrowthRate)) / (effectiveDiscountRate - terminalGrowthRate);
  const terminalValuePV = terminalValue / Math.pow(1 + effectiveDiscountRate, projectionYears);
  const enterpriseValue = Math.round(totalPV + terminalValuePV);

  return {
    methodology: "dcf",
    projectedCashFlows,
    terminalValue: Math.round(terminalValue),
    terminalValuePV: Math.round(terminalValuePV),
    totalPresentValue: Math.round(totalPV),
    enterpriseValue,
    assumptions: {
      ebitda,
      growthRate,
      discountRate: effectiveDiscountRate,
      projectionYears,
      capexPercent,
      taxRate,
      terminalGrowthRate,
    },
  };
}

export interface ComparableInput {
  revenue: number;
  ebitda: number;
  industry?: string;
  customMultiples?: { evToEbitda?: number; evToRevenue?: number };
}

export interface ComparableResult {
  methodology: "comparable";
  evEbitdaMultiple: number;
  evRevenueMultiple: number;
  evFromEbitda: number;
  evFromRevenue: number;
  blendedValue: number;
  industryBenchmark: string;
}

const INDUSTRY_MULTIPLES: Record<string, { evToEbitda: number; evToRevenue: number }> = {
  technology: { evToEbitda: 18, evToRevenue: 5.0 },
  healthcare: { evToEbitda: 14, evToRevenue: 3.5 },
  manufacturing: { evToEbitda: 8, evToRevenue: 1.2 },
  retail: { evToEbitda: 10, evToRevenue: 1.0 },
  "financial services": { evToEbitda: 12, evToRevenue: 3.0 },
  "real estate": { evToEbitda: 15, evToRevenue: 4.0 },
  energy: { evToEbitda: 7, evToRevenue: 1.5 },
  construction: { evToEbitda: 7, evToRevenue: 0.8 },
  "professional services": { evToEbitda: 10, evToRevenue: 2.0 },
  hospitality: { evToEbitda: 11, evToRevenue: 1.8 },
  transportation: { evToEbitda: 8, evToRevenue: 1.0 },
  agriculture: { evToEbitda: 9, evToRevenue: 1.2 },
  default: { evToEbitda: 10, evToRevenue: 2.0 },
};

export function getIndustryMultiples(industry?: string): { evToEbitda: number; evToRevenue: number } {
  if (!industry) return INDUSTRY_MULTIPLES.default;
  const key = industry.toLowerCase();
  for (const [k, v] of Object.entries(INDUSTRY_MULTIPLES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return INDUSTRY_MULTIPLES.default;
}

export function computeComparable(input: ComparableInput): ComparableResult {
  const { revenue, ebitda, industry, customMultiples } = input;
  const benchmarks = getIndustryMultiples(industry);
  const evToEbitda = customMultiples?.evToEbitda || benchmarks.evToEbitda;
  const evToRevenue = customMultiples?.evToRevenue || benchmarks.evToRevenue;

  const evFromEbitda = Math.round(ebitda * evToEbitda);
  const evFromRevenue = Math.round(revenue * evToRevenue);

  const weights = { ebitda: 0.7, revenue: 0.3 };
  let blendedValue: number;
  if (ebitda > 0 && revenue > 0) {
    blendedValue = Math.round(evFromEbitda * weights.ebitda + evFromRevenue * weights.revenue);
  } else if (ebitda > 0) {
    blendedValue = evFromEbitda;
  } else {
    blendedValue = evFromRevenue;
  }

  return {
    methodology: "comparable",
    evEbitdaMultiple: evToEbitda,
    evRevenueMultiple: evToRevenue,
    evFromEbitda,
    evFromRevenue,
    blendedValue,
    industryBenchmark: industry || "default",
  };
}

export interface AssetBasedInput {
  tangibleAssets: number;
  intangibleAssets: number;
  totalLiabilities: number;
  goodwill?: number;
}

export interface AssetBasedResult {
  methodology: "asset-based";
  tangibleAssets: number;
  intangibleAssets: number;
  goodwill: number;
  totalAssets: number;
  totalLiabilities: number;
  netAssetValue: number;
}

export function computeAssetBased(input: AssetBasedInput): AssetBasedResult {
  const { tangibleAssets, intangibleAssets, totalLiabilities, goodwill = 0 } = input;
  const totalAssets = tangibleAssets + intangibleAssets + goodwill;
  const netAssetValue = Math.round(totalAssets - totalLiabilities);

  return {
    methodology: "asset-based",
    tangibleAssets,
    intangibleAssets,
    goodwill,
    totalAssets,
    totalLiabilities,
    netAssetValue,
  };
}

export interface FlpDiscountInput {
  totalValue: number;
  lpInterestPercent: number;
  entityType?: string;
  lackOfControlDiscount?: number;
  lackOfMarketabilityDiscount?: number;
}

interface DiscountRange {
  low: number;
  mid: number;
  high: number;
}

export interface FlpDiscountResult {
  controlDiscount: DiscountRange;
  marketabilityDiscount: DiscountRange;
  combinedDiscount: DiscountRange;
  discountedValue: DiscountRange;
  selectedControlDiscount: number;
  selectedMarketabilityDiscount: number;
  selectedCombinedDiscount: number;
  selectedDiscountedValue: number;
  irsDefensible: boolean;
  notes: string[];
}

function getControlDiscountRange(lpPercent: number, entityType?: string): DiscountRange {
  const type = (entityType || "").toLowerCase();
  let base: DiscountRange;

  if (lpPercent >= 95) {
    base = { low: 0.30, mid: 0.35, high: 0.40 };
  } else if (lpPercent >= 80) {
    base = { low: 0.25, mid: 0.30, high: 0.35 };
  } else if (lpPercent >= 50) {
    base = { low: 0.20, mid: 0.25, high: 0.30 };
  } else if (lpPercent >= 30) {
    base = { low: 0.15, mid: 0.20, high: 0.25 };
  } else {
    base = { low: 0.10, mid: 0.15, high: 0.20 };
  }

  if (type.includes("llc") || type.includes("partnership")) {
    base = { low: base.low + 0.02, mid: base.mid + 0.02, high: base.high + 0.02 };
  }

  return base;
}

function getMarketabilityDiscountRange(lpPercent: number, entityType?: string): DiscountRange {
  const type = (entityType || "").toLowerCase();
  let base: DiscountRange;

  if (lpPercent >= 95) {
    base = { low: 0.25, mid: 0.30, high: 0.35 };
  } else if (lpPercent >= 80) {
    base = { low: 0.20, mid: 0.25, high: 0.30 };
  } else if (lpPercent >= 50) {
    base = { low: 0.15, mid: 0.20, high: 0.25 };
  } else {
    base = { low: 0.10, mid: 0.15, high: 0.20 };
  }

  if (type.includes("partnership") || type.includes("llc")) {
    base = { low: base.low + 0.03, mid: base.mid + 0.03, high: base.high + 0.03 };
  }

  return base;
}

function computeCombinedRange(control: DiscountRange, marketability: DiscountRange): DiscountRange {
  return {
    low: round4(1 - (1 - control.low) * (1 - marketability.low)),
    mid: round4(1 - (1 - control.mid) * (1 - marketability.mid)),
    high: round4(1 - (1 - control.high) * (1 - marketability.high)),
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function computeFlpDiscountTiered(input: FlpDiscountInput): FlpDiscountResult {
  const { totalValue, lpInterestPercent, entityType, lackOfControlDiscount, lackOfMarketabilityDiscount } = input;

  const controlRange = getControlDiscountRange(lpInterestPercent, entityType);
  const marketabilityRange = getMarketabilityDiscountRange(lpInterestPercent, entityType);
  const combinedRange = computeCombinedRange(controlRange, marketabilityRange);

  const selectedControl = lackOfControlDiscount ?? controlRange.mid;
  const selectedMarketability = lackOfMarketabilityDiscount ?? marketabilityRange.mid;
  const selectedCombined = round4(1 - (1 - selectedControl) * (1 - selectedMarketability));
  const selectedDiscountedValue = Math.round(totalValue * (1 - selectedCombined) * 100) / 100;

  const controlInRange = selectedControl >= controlRange.low - 0.01 && selectedControl <= controlRange.high + 0.01;
  const marketInRange = selectedMarketability >= marketabilityRange.low - 0.01 && selectedMarketability <= marketabilityRange.high + 0.01;
  const irsDefensible = controlInRange && marketInRange;

  const notes: string[] = [];
  if (!controlInRange) {
    notes.push(`Control discount ${(selectedControl * 100).toFixed(1)}% is outside IRS-defensible range (${(controlRange.low * 100).toFixed(0)}-${(controlRange.high * 100).toFixed(0)}%)`);
  }
  if (!marketInRange) {
    notes.push(`Marketability discount ${(selectedMarketability * 100).toFixed(1)}% is outside IRS-defensible range (${(marketabilityRange.low * 100).toFixed(0)}-${(marketabilityRange.high * 100).toFixed(0)}%)`);
  }
  if (irsDefensible) {
    notes.push("Discounts are within IRS-defensible ranges based on LP interest percentage and entity type");
  }

  const discountedValueRange: DiscountRange = {
    low: Math.round(totalValue * (1 - combinedRange.high) * 100) / 100,
    mid: Math.round(totalValue * (1 - combinedRange.mid) * 100) / 100,
    high: Math.round(totalValue * (1 - combinedRange.low) * 100) / 100,
  };

  return {
    controlDiscount: controlRange,
    marketabilityDiscount: marketabilityRange,
    combinedDiscount: combinedRange,
    discountedValue: discountedValueRange,
    selectedControlDiscount: selectedControl,
    selectedMarketabilityDiscount: selectedMarketability,
    selectedCombinedDiscount: selectedCombined,
    selectedDiscountedValue,
    irsDefensible,
    notes,
  };
}

export interface TaxImpactInput {
  totalValue: number;
  discountedValue: number;
  transferAmount: number;
  transferType: "gift" | "estate" | "both";
  annualExclusionRecipients?: number;
  priorGiftsUsed?: number;
  isGstApplicable?: boolean;
}

export interface TaxImpactResult {
  giftTax: {
    grossTransfer: number;
    annualExclusions: number;
    taxableGift: number;
    lifetimeExemptionUsed: number;
    lifetimeExemptionRemaining: number;
    estimatedTax: number;
    effectiveTaxRate: number;
  };
  estateTaxReduction: {
    valueRemovedFromEstate: number;
    estimatedEstateTaxSavings: number;
    effectiveTransferRate: number;
  };
  gstImplications: {
    applicable: boolean;
    gstExemptionUsed: number;
    gstExemptionRemaining: number;
    potentialGstTax: number;
  };
  summary: {
    totalTaxExposure: number;
    netTransferEfficiency: number;
    discountSavings: number;
  };
}

const CURRENT_LIFETIME_EXEMPTION = 13_610_000;
const CURRENT_ANNUAL_EXCLUSION = 18_000;
const ESTATE_TAX_RATE = 0.40;
const GST_TAX_RATE = 0.40;
const GST_EXEMPTION = 13_610_000;

export function computeTaxImpact(input: TaxImpactInput): TaxImpactResult {
  const {
    totalValue,
    discountedValue,
    transferAmount,
    transferType,
    annualExclusionRecipients = 0,
    priorGiftsUsed = 0,
    isGstApplicable = false,
  } = input;

  const grossTransfer = transferAmount > 0 ? transferAmount : discountedValue;
  const annualExclusions = (transferType === "gift" || transferType === "both")
    ? annualExclusionRecipients * CURRENT_ANNUAL_EXCLUSION
    : 0;
  const taxableGift = (transferType === "gift" || transferType === "both")
    ? Math.max(0, grossTransfer - annualExclusions)
    : 0;

  const remainingExemption = Math.max(0, CURRENT_LIFETIME_EXEMPTION - priorGiftsUsed);
  const exemptionUsed = (transferType === "gift" || transferType === "both")
    ? Math.min(taxableGift, remainingExemption)
    : 0;
  const taxableAfterExemption = Math.max(0, taxableGift - remainingExemption);
  const estimatedGiftTax = (transferType === "gift" || transferType === "both")
    ? Math.round(taxableAfterExemption * ESTATE_TAX_RATE)
    : 0;
  const effectiveGiftRate = grossTransfer > 0 ? round4(estimatedGiftTax / grossTransfer) : 0;

  const valueRemovedFromEstate = (transferType === "estate" || transferType === "both") ? totalValue : grossTransfer;
  const estateTaxSavings = (transferType === "estate" || transferType === "both")
    ? Math.round(valueRemovedFromEstate * ESTATE_TAX_RATE)
    : 0;
  const effectiveTransferRate = totalValue > 0 ? round4(grossTransfer / totalValue) : 0;

  let gstExemptionUsed = 0;
  let gstExemptionRemaining = GST_EXEMPTION;
  let potentialGstTax = 0;
  if (isGstApplicable) {
    gstExemptionUsed = Math.min(taxableGift, GST_EXEMPTION);
    gstExemptionRemaining = Math.max(0, GST_EXEMPTION - gstExemptionUsed);
    const gstTaxable = Math.max(0, taxableGift - GST_EXEMPTION);
    potentialGstTax = Math.round(gstTaxable * GST_TAX_RATE);
  }

  const totalTaxExposure = estimatedGiftTax + potentialGstTax;
  const discountSavings = Math.round((totalValue - discountedValue) * ESTATE_TAX_RATE);
  const netTransferEfficiency = totalValue > 0 ? round4(1 - totalTaxExposure / totalValue) : 1;

  return {
    giftTax: {
      grossTransfer,
      annualExclusions,
      taxableGift,
      lifetimeExemptionUsed: exemptionUsed,
      lifetimeExemptionRemaining: Math.max(0, remainingExemption - exemptionUsed),
      estimatedTax: estimatedGiftTax,
      effectiveTaxRate: effectiveGiftRate,
    },
    estateTaxReduction: {
      valueRemovedFromEstate,
      estimatedEstateTaxSavings: estateTaxSavings,
      effectiveTransferRate,
    },
    gstImplications: {
      applicable: isGstApplicable,
      gstExemptionUsed,
      gstExemptionRemaining,
      potentialGstTax,
    },
    summary: {
      totalTaxExposure,
      netTransferEfficiency,
      discountSavings,
    },
  };
}

export interface FullValuationInput {
  revenue: number;
  ebitda: number;
  growthRate: number;
  discountRate: number;
  industry?: string;
  projectionYears?: number;
  tangibleAssets?: number;
  intangibleAssets?: number;
  totalLiabilities?: number;
  goodwill?: number;
  customMultiples?: { evToEbitda?: number; evToRevenue?: number };
}

export interface FullValuationResult {
  dcf: DcfResult | null;
  comparable: ComparableResult | null;
  assetBased: AssetBasedResult | null;
  recommended: {
    value: number;
    methodology: string;
    confidence: "high" | "medium" | "low";
    reasoning: string;
  };
}

export function computeFullValuation(input: FullValuationInput): FullValuationResult {
  const { revenue, ebitda, growthRate, discountRate, industry, projectionYears, tangibleAssets, intangibleAssets, totalLiabilities, goodwill, customMultiples } = input;

  let dcf: DcfResult | null = null;
  let comparable: ComparableResult | null = null;
  let assetBased: AssetBasedResult | null = null;

  if (ebitda > 0) {
    dcf = computeDcf({ ebitda, growthRate, discountRate, projectionYears });
  }

  if (ebitda > 0 || revenue > 0) {
    comparable = computeComparable({ revenue, ebitda, industry, customMultiples });
  }

  const hasAssetData = (tangibleAssets !== undefined && tangibleAssets > 0)
    || (intangibleAssets !== undefined && intangibleAssets > 0)
    || (goodwill !== undefined && goodwill > 0)
    || (totalLiabilities !== undefined && totalLiabilities > 0);

  if (hasAssetData) {
    assetBased = computeAssetBased({
      tangibleAssets: tangibleAssets || 0,
      intangibleAssets: intangibleAssets || 0,
      totalLiabilities: totalLiabilities || 0,
      goodwill,
    });
  }

  let value = 0;
  let methodology = "none";
  let confidence: "high" | "medium" | "low" = "low";
  let reasoning = "Insufficient data for valuation";

  const values: { val: number; method: string }[] = [];
  if (dcf) values.push({ val: dcf.enterpriseValue, method: "dcf" });
  if (comparable) values.push({ val: comparable.blendedValue, method: "comparable" });
  if (assetBased) values.push({ val: assetBased.netAssetValue, method: "asset-based" });

  if (values.length >= 3) {
    value = Math.round(values.reduce((s, v) => s + v.val, 0) / values.length);
    methodology = "blended (DCF + Comparable + Asset-Based)";
    confidence = "high";
    reasoning = "Three independent methodologies provide strong cross-validation";
  } else if (values.length === 2) {
    value = Math.round(values.reduce((s, v) => s + v.val, 0) / values.length);
    methodology = `blended (${values.map(v => v.method).join(" + ")})`;
    confidence = "medium";
    reasoning = "Two methodologies provide moderate cross-validation";
  } else if (values.length === 1) {
    value = values[0].val;
    methodology = values[0].method;
    confidence = "low";
    reasoning = "Single methodology; additional data would improve confidence";
  }

  return { dcf, comparable, assetBased, recommended: { value, methodology, confidence, reasoning } };
}
