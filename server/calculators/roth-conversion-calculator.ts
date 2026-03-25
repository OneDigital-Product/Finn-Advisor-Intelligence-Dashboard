const FEDERAL_BRACKETS_2024 = [
  { min: 0, max: 11600, rate: 0.10 },
  { min: 11600, max: 47150, rate: 0.12 },
  { min: 47150, max: 100525, rate: 0.22 },
  { min: 100525, max: 191950, rate: 0.24 },
  { min: 191950, max: 243725, rate: 0.32 },
  { min: 243725, max: 609350, rate: 0.35 },
  { min: 609350, max: Infinity, rate: 0.37 },
];

const FEDERAL_BRACKETS_MFJ_2024 = [
  { min: 0, max: 23200, rate: 0.10 },
  { min: 23200, max: 94300, rate: 0.12 },
  { min: 94300, max: 201050, rate: 0.22 },
  { min: 201050, max: 383900, rate: 0.24 },
  { min: 383900, max: 487450, rate: 0.32 },
  { min: 487450, max: 731200, rate: 0.35 },
  { min: 731200, max: Infinity, rate: 0.37 },
];

const STATE_TAX_RATES: Record<string, number> = {
  AL: 0.05, AK: 0, AZ: 0.025, AR: 0.047, CA: 0.133, CO: 0.044, CT: 0.0699,
  DE: 0.066, FL: 0, GA: 0.0549, HI: 0.11, ID: 0.058, IL: 0.0495, IN: 0.0315,
  IA: 0.06, KS: 0.057, KY: 0.04, LA: 0.0425, ME: 0.0715, MD: 0.0575,
  MA: 0.05, MI: 0.0425, MN: 0.0985, MS: 0.05, MO: 0.048, MT: 0.0675,
  NE: 0.0664, NV: 0, NH: 0, NJ: 0.1075, NM: 0.059, NY: 0.109, NC: 0.0475,
  ND: 0.029, OH: 0.04, OK: 0.0475, OR: 0.099, PA: 0.0307, RI: 0.0599,
  SC: 0.065, SD: 0, TN: 0, TX: 0, UT: 0.0485, VT: 0.0875, VA: 0.0575,
  WA: 0, WV: 0.065, WI: 0.0765, WY: 0, DC: 0.104,
};

const IRMAA_THRESHOLDS_2024 = {
  single: [
    { magi: 103000, surcharge: 0 },
    { magi: 129000, surcharge: 65.90 },
    { magi: 161000, surcharge: 164.80 },
    { magi: 193000, surcharge: 263.70 },
    { magi: 500000, surcharge: 362.60 },
    { magi: Infinity, surcharge: 395.60 },
  ],
  married_filing_jointly: [
    { magi: 206000, surcharge: 0 },
    { magi: 258000, surcharge: 65.90 },
    { magi: 322000, surcharge: 164.80 },
    { magi: 386000, surcharge: 263.70 },
    { magi: 750000, surcharge: 362.60 },
    { magi: Infinity, surcharge: 395.60 },
  ],
};

export interface RothConversionInput {
  currentAge: number;
  retirementAge: number;
  traditionalIRABalance: number;
  rothIRABalance: number;
  annualIncome: number;
  filingStatus: "single" | "married_filing_jointly";
  stateRate: number;
  expectedRetirementRate: number;
  conversionAmount: number;
  projectionYears: number;
  expectedGrowthRate: number;
  nonDeductibleIRABalance?: number;
  state?: string;
}

export interface RothConversionYearProjection {
  year: number;
  age: number;
  convertedAmount: number;
  taxOnConversion: number;
  traditionalBalance: number;
  rothBalance: number;
  totalBalance: number;
}

export interface ProRataAnalysis {
  totalTraditionalIRABalance: number;
  nonDeductibleBasis: number;
  taxablePercentage: number;
  taxFreePercentage: number;
  taxableConversionAmount: number;
  taxFreeConversionAmount: number;
}

export interface IRMAAWarning {
  triggered: boolean;
  currentMAGI: number;
  magiWithConversion: number;
  monthlySurcharge: number;
  annualCost: number;
  tier: string;
}

export interface RothConversionResult {
  conversionAmount: number;
  taxOnConversion: number;
  effectiveTaxRate: number;
  marginalBracketBeforeConversion: number;
  marginalBracketAfterConversion: number;
  breakevenYears: number;
  projections: RothConversionYearProjection[];
  noConversionEndBalance: number;
  withConversionEndBalance: number;
  netBenefit: number;
  bracketImpact: {
    incomeBeforeConversion: number;
    incomeAfterConversion: number;
    taxBeforeConversion: number;
    taxAfterConversion: number;
    additionalTax: number;
  };
  notes: string[];
  proRataAnalysis?: ProRataAnalysis;
  irmaaWarning?: IRMAAWarning;
}

export interface MultiYearConversionInput {
  currentAge: number;
  retirementAge: number;
  traditionalIRABalance: number;
  rothIRABalance: number;
  annualIncome: number;
  filingStatus: "single" | "married_filing_jointly";
  stateRate: number;
  expectedRetirementRate: number;
  annualConversionAmount: number;
  conversionYears: number;
  projectionYears: number;
  expectedGrowthRate: number;
}

export interface MultiYearConversionResult {
  yearlyConversions: Array<{
    year: number;
    age: number;
    conversionAmount: number;
    taxOnConversion: number;
    effectiveTaxRate: number;
    marginalRate: number;
    traditionalBalance: number;
    rothBalance: number;
    cumulativeTaxPaid: number;
  }>;
  totalConverted: number;
  totalTaxPaid: number;
  averageEffectiveTaxRate: number;
  finalTraditionalBalance: number;
  finalRothBalance: number;
  finalTotalBalance: number;
  noConversionEndBalance: number;
  netBenefit: number;
  notes: string[];
}

export interface ScenarioComparisonInput {
  currentAge: number;
  retirementAge: number;
  traditionalIRABalance: number;
  rothIRABalance: number;
  annualIncome: number;
  filingStatus: "single" | "married_filing_jointly";
  stateRate: number;
  expectedRetirementRate: number;
  conversionAmounts: number[];
  projectionYears: number;
  expectedGrowthRate: number;
}

export interface ScenarioComparisonResult {
  scenarios: Array<{
    conversionAmount: number;
    taxOnConversion: number;
    effectiveTaxRate: number;
    marginalBracketAfter: number;
    breakevenYears: number;
    endBalance: number;
    netBenefit: number;
  }>;
  bestScenarioIndex: number;
  noConversionEndBalance: number;
  notes: string[];
}

export interface BracketOptimizerInput {
  annualIncome: number;
  filingStatus: "single" | "married_filing_jointly";
  stateRate: number;
  traditionalIRABalance: number;
}

export interface BracketOptimizerResult {
  currentBracketRate: number;
  currentBracketCeiling: number;
  maxConversionInBracket: number;
  taxOnMaxConversion: number;
  nextBracketRate: number;
  spaceInCurrentBracket: number;
  notes: string[];
}

function getBrackets(filingStatus: string) {
  return filingStatus === "married_filing_jointly" ? FEDERAL_BRACKETS_MFJ_2024 : FEDERAL_BRACKETS_2024;
}

function calculateFederalTax(taxableIncome: number, filingStatus: string): number {
  const brackets = getBrackets(filingStatus);
  let tax = 0;
  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
    tax += taxableInBracket * bracket.rate;
  }
  return tax;
}

function getMarginalRate(taxableIncome: number, filingStatus: string): number {
  const brackets = getBrackets(filingStatus);
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (taxableIncome > brackets[i].min) {
      return brackets[i].rate;
    }
  }
  return brackets[0].rate;
}

function getEffectiveStateRate(stateRate: number, state?: string): number {
  if (state && state in STATE_TAX_RATES) {
    return STATE_TAX_RATES[state];
  }
  return stateRate;
}

function calculateIRMAA(magi: number, filingStatus: "single" | "married_filing_jointly"): { surcharge: number; tier: string } {
  const thresholds = IRMAA_THRESHOLDS_2024[filingStatus];
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (magi > thresholds[i].magi) {
      continue;
    }
    if (i === 0) return { surcharge: 0, tier: "No surcharge" };
  }
  for (let i = 0; i < thresholds.length; i++) {
    if (magi <= thresholds[i].magi) {
      return {
        surcharge: thresholds[i].surcharge,
        tier: `Tier ${i} ($${thresholds[i].surcharge.toFixed(2)}/mo)`,
      };
    }
  }
  return { surcharge: thresholds[thresholds.length - 1].surcharge, tier: "Highest tier" };
}

export function validateRothConversionInput(input: Partial<RothConversionInput>): string[] {
  const errors: string[] = [];
  if (input.currentAge !== undefined && (input.currentAge < 18 || input.currentAge > 100)) {
    errors.push("Current age must be between 18 and 100");
  }
  if (input.retirementAge !== undefined && (input.retirementAge < 50 || input.retirementAge > 100)) {
    errors.push("Retirement age must be between 50 and 100");
  }
  if (input.currentAge !== undefined && input.retirementAge !== undefined && input.currentAge > input.retirementAge) {
    errors.push("Current age cannot exceed retirement age");
  }
  if (input.traditionalIRABalance !== undefined && input.traditionalIRABalance < 0) {
    errors.push("Traditional IRA balance cannot be negative");
  }
  if (input.rothIRABalance !== undefined && input.rothIRABalance < 0) {
    errors.push("Roth IRA balance cannot be negative");
  }
  if (input.annualIncome !== undefined && input.annualIncome < 0) {
    errors.push("Annual income cannot be negative");
  }
  if (input.conversionAmount !== undefined && input.conversionAmount < 0) {
    errors.push("Conversion amount cannot be negative");
  }
  if (input.stateRate !== undefined && (input.stateRate < 0 || input.stateRate > 0.15)) {
    errors.push("State tax rate must be between 0% and 15%");
  }
  if (input.expectedGrowthRate !== undefined && (input.expectedGrowthRate < -0.10 || input.expectedGrowthRate > 0.20)) {
    errors.push("Expected growth rate must be between -10% and 20%");
  }
  return errors;
}

export function calculateRothConversion(input: RothConversionInput): RothConversionResult {
  const {
    currentAge, retirementAge, traditionalIRABalance, rothIRABalance,
    annualIncome, filingStatus, expectedRetirementRate,
    conversionAmount, projectionYears, expectedGrowthRate,
    nonDeductibleIRABalance, state,
  } = input;

  const effectiveStateRate = getEffectiveStateRate(input.stateRate, state);
  const notes: string[] = [];
  const actualConversion = Math.min(conversionAmount, traditionalIRABalance);

  let proRataAnalysis: ProRataAnalysis | undefined;
  let taxableConversionAmount = actualConversion;

  if (nonDeductibleIRABalance !== undefined && nonDeductibleIRABalance > 0) {
    const totalTraditionalBalance = traditionalIRABalance;
    const clampedBasis = Math.min(nonDeductibleIRABalance, totalTraditionalBalance);
    const taxFreePercentage = totalTraditionalBalance > 0 ? Math.min(Math.max(clampedBasis / totalTraditionalBalance, 0), 1) : 0;
    const taxablePercentage = 1 - taxFreePercentage;
    taxableConversionAmount = actualConversion * taxablePercentage;
    const taxFreeConversionAmount = actualConversion * taxFreePercentage;

    proRataAnalysis = {
      totalTraditionalIRABalance: totalTraditionalBalance,
      nonDeductibleBasis: nonDeductibleIRABalance,
      taxablePercentage: Math.round(taxablePercentage * 10000) / 10000,
      taxFreePercentage: Math.round(taxFreePercentage * 10000) / 10000,
      taxableConversionAmount: Math.round(taxableConversionAmount * 100) / 100,
      taxFreeConversionAmount: Math.round(taxFreeConversionAmount * 100) / 100,
    };

    notes.push(`Pro-rata rule: ${(taxablePercentage * 100).toFixed(1)}% of conversion ($${Math.round(taxableConversionAmount).toLocaleString()}) is taxable. ${(taxFreePercentage * 100).toFixed(1)}% ($${Math.round(taxFreeConversionAmount).toLocaleString()}) is tax-free from non-deductible contributions.`);
  }

  const taxBeforeConversion = calculateFederalTax(annualIncome, filingStatus) + annualIncome * effectiveStateRate;
  const incomeAfterConversion = annualIncome + taxableConversionAmount;
  const taxAfterConversion = calculateFederalTax(incomeAfterConversion, filingStatus) + incomeAfterConversion * effectiveStateRate;
  const taxOnConversion = taxAfterConversion - taxBeforeConversion;

  const effectiveTaxRate = actualConversion > 0 ? taxOnConversion / actualConversion : 0;
  const marginalBefore = getMarginalRate(annualIncome, filingStatus);
  const marginalAfter = getMarginalRate(incomeAfterConversion, filingStatus);

  if (marginalAfter > marginalBefore) {
    notes.push(`Conversion pushes income into the ${(marginalAfter * 100).toFixed(0)}% bracket (from ${(marginalBefore * 100).toFixed(0)}%).`);
  }

  let irmaaWarning: IRMAAWarning | undefined;
  if (currentAge >= 65) {
    const magiWithConversion = annualIncome + taxableConversionAmount;
    const irmaaBefore = calculateIRMAA(annualIncome, filingStatus);
    const irmaaAfter = calculateIRMAA(magiWithConversion, filingStatus);

    if (irmaaAfter.surcharge > irmaaBefore.surcharge) {
      const annualCost = (irmaaAfter.surcharge - irmaaBefore.surcharge) * 12;
      irmaaWarning = {
        triggered: true,
        currentMAGI: annualIncome,
        magiWithConversion,
        monthlySurcharge: irmaaAfter.surcharge,
        annualCost: Math.round(annualCost * 100) / 100,
        tier: irmaaAfter.tier,
      };
      notes.push(`IRMAA Warning: Conversion increases Medicare Part B/D premiums by $${Math.round(annualCost).toLocaleString()}/year (${irmaaAfter.tier}). IRMAA is based on income from 2 years prior.`);
    } else if (irmaaBefore.surcharge > 0) {
      const existingAnnualCost = irmaaBefore.surcharge * 12;
      irmaaWarning = {
        triggered: true,
        currentMAGI: annualIncome,
        magiWithConversion,
        monthlySurcharge: irmaaAfter.surcharge,
        annualCost: Math.round(existingAnnualCost * 100) / 100,
        tier: irmaaAfter.tier,
      };
      notes.push(`IRMAA Notice: Client already exceeds IRMAA threshold at ${irmaaAfter.tier} tier ($${Math.round(existingAnnualCost).toLocaleString()}/year surcharge). Conversion does not change the tier. IRMAA is based on income from 2 years prior.`);
    } else {
      irmaaWarning = {
        triggered: false,
        currentMAGI: annualIncome,
        magiWithConversion,
        monthlySurcharge: irmaaAfter.surcharge,
        annualCost: 0,
        tier: irmaaAfter.tier,
      };
    }
  }

  let tradBalNoConv = traditionalIRABalance;
  let rothBalNoConv = rothIRABalance;
  let tradBalWithConv = traditionalIRABalance - actualConversion;
  let rothBalWithConv = rothIRABalance + (actualConversion - taxOnConversion);

  const projections: RothConversionYearProjection[] = [];
  let breakevenYears = projectionYears;
  let breakevenFound = false;

  for (let y = 0; y < projectionYears; y++) {
    const age = currentAge + y + 1;

    tradBalNoConv *= (1 + expectedGrowthRate);
    rothBalNoConv *= (1 + expectedGrowthRate);
    tradBalWithConv *= (1 + expectedGrowthRate);
    rothBalWithConv *= (1 + expectedGrowthRate);

    const totalNoConv = tradBalNoConv * (1 - expectedRetirementRate) + rothBalNoConv;
    const totalWithConv = tradBalWithConv * (1 - expectedRetirementRate) + rothBalWithConv;

    if (!breakevenFound && totalWithConv >= totalNoConv) {
      breakevenYears = y + 1;
      breakevenFound = true;
    }

    projections.push({
      year: y + 1,
      age,
      convertedAmount: y === 0 ? actualConversion : 0,
      taxOnConversion: y === 0 ? taxOnConversion : 0,
      traditionalBalance: Math.round(tradBalWithConv * 100) / 100,
      rothBalance: Math.round(rothBalWithConv * 100) / 100,
      totalBalance: Math.round((tradBalWithConv + rothBalWithConv) * 100) / 100,
    });
  }

  const noConvEnd = tradBalNoConv * (1 - expectedRetirementRate) + rothBalNoConv;
  const withConvEnd = tradBalWithConv * (1 - expectedRetirementRate) + rothBalWithConv;

  if (actualConversion < conversionAmount) {
    notes.push(`Conversion capped at Traditional IRA balance of $${traditionalIRABalance.toLocaleString()}.`);
  }

  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  if (yearsToRetirement > 0 && yearsToRetirement < breakevenYears) {
    notes.push(`Breakeven of ${breakevenYears} years exceeds ${yearsToRetirement} years to retirement (age ${retirementAge}). Consider a smaller conversion.`);
  }

  if (currentAge < 59) {
    notes.push("Converted amounts may be subject to 5-year holding period before penalty-free withdrawal.");
  }

  if (effectiveTaxRate > expectedRetirementRate) {
    notes.push("Current effective tax rate on conversion exceeds expected retirement rate. Consider a smaller conversion.");
  } else {
    notes.push("Current effective tax rate on conversion is below expected retirement rate — conversion is generally favorable.");
  }

  return {
    conversionAmount: actualConversion,
    taxOnConversion: Math.round(taxOnConversion * 100) / 100,
    effectiveTaxRate: Math.round(effectiveTaxRate * 10000) / 10000,
    marginalBracketBeforeConversion: marginalBefore,
    marginalBracketAfterConversion: marginalAfter,
    breakevenYears,
    projections,
    noConversionEndBalance: Math.round(noConvEnd * 100) / 100,
    withConversionEndBalance: Math.round(withConvEnd * 100) / 100,
    netBenefit: Math.round((withConvEnd - noConvEnd) * 100) / 100,
    bracketImpact: {
      incomeBeforeConversion: annualIncome,
      incomeAfterConversion: incomeAfterConversion,
      taxBeforeConversion: Math.round(taxBeforeConversion * 100) / 100,
      taxAfterConversion: Math.round(taxAfterConversion * 100) / 100,
      additionalTax: Math.round(taxOnConversion * 100) / 100,
    },
    notes,
    ...(proRataAnalysis ? { proRataAnalysis } : {}),
    ...(irmaaWarning ? { irmaaWarning } : {}),
  };
}

export function projectMultiYearConversion(input: MultiYearConversionInput): MultiYearConversionResult {
  const {
    currentAge, retirementAge, traditionalIRABalance, rothIRABalance,
    annualIncome, filingStatus, stateRate, expectedRetirementRate,
    annualConversionAmount, conversionYears, projectionYears, expectedGrowthRate,
  } = input;

  const notes: string[] = [];
  const yearlyConversions: MultiYearConversionResult["yearlyConversions"] = [];

  let tradBal = traditionalIRABalance;
  let rothBal = rothIRABalance;
  let totalTaxPaid = 0;
  let totalConverted = 0;

  for (let y = 0; y < conversionYears; y++) {
    const age = currentAge + y;
    const actualConversion = Math.min(annualConversionAmount, tradBal);

    if (actualConversion <= 0) {
      notes.push(`Traditional IRA depleted after ${y} years of conversions.`);
      break;
    }

    const incomeForYear = annualIncome;
    const taxBefore = calculateFederalTax(incomeForYear, filingStatus) + incomeForYear * stateRate;
    const incomeAfter = incomeForYear + actualConversion;
    const taxAfter = calculateFederalTax(incomeAfter, filingStatus) + incomeAfter * stateRate;
    const taxOnConversion = taxAfter - taxBefore;

    tradBal -= actualConversion;
    rothBal += actualConversion;
    totalTaxPaid += taxOnConversion;
    totalConverted += actualConversion;

    yearlyConversions.push({
      year: y + 1,
      age,
      conversionAmount: Math.round(actualConversion * 100) / 100,
      taxOnConversion: Math.round(taxOnConversion * 100) / 100,
      effectiveTaxRate: actualConversion > 0 ? Math.round((taxOnConversion / actualConversion) * 10000) / 10000 : 0,
      marginalRate: getMarginalRate(incomeAfter, filingStatus),
      traditionalBalance: Math.round(tradBal * 100) / 100,
      rothBalance: Math.round(rothBal * 100) / 100,
      cumulativeTaxPaid: Math.round(totalTaxPaid * 100) / 100,
    });

    tradBal *= (1 + expectedGrowthRate);
    rothBal *= (1 + expectedGrowthRate);
  }

  const remainingProjectionYears = projectionYears - conversionYears;
  for (let y = 0; y < remainingProjectionYears; y++) {
    tradBal *= (1 + expectedGrowthRate);
    rothBal *= (1 + expectedGrowthRate);
  }

  let noConvTradBal = traditionalIRABalance;
  let noConvRothBal = rothIRABalance;
  for (let y = 0; y < projectionYears; y++) {
    noConvTradBal *= (1 + expectedGrowthRate);
    noConvRothBal *= (1 + expectedGrowthRate);
  }
  const noConvEnd = noConvTradBal * (1 - expectedRetirementRate) + noConvRothBal;
  const withConvEnd = tradBal * (1 - expectedRetirementRate) + rothBal;

  const avgEffRate = totalConverted > 0 ? totalTaxPaid / totalConverted : 0;

  notes.push(`Converted $${Math.round(totalConverted).toLocaleString()} over ${yearlyConversions.length} years.`);
  notes.push(`Total tax paid on conversions: $${Math.round(totalTaxPaid).toLocaleString()}.`);
  notes.push(`Average effective tax rate: ${(avgEffRate * 100).toFixed(2)}%.`);

  if (withConvEnd > noConvEnd) {
    notes.push(`Multi-year conversion produces a net benefit of $${Math.round(withConvEnd - noConvEnd).toLocaleString()} over ${projectionYears} years.`);
  } else {
    notes.push(`Multi-year conversion produces a net cost of $${Math.round(noConvEnd - withConvEnd).toLocaleString()} over ${projectionYears} years.`);
  }

  return {
    yearlyConversions,
    totalConverted: Math.round(totalConverted * 100) / 100,
    totalTaxPaid: Math.round(totalTaxPaid * 100) / 100,
    averageEffectiveTaxRate: Math.round(avgEffRate * 10000) / 10000,
    finalTraditionalBalance: Math.round(tradBal * 100) / 100,
    finalRothBalance: Math.round(rothBal * 100) / 100,
    finalTotalBalance: Math.round((tradBal + rothBal) * 100) / 100,
    noConversionEndBalance: Math.round(noConvEnd * 100) / 100,
    netBenefit: Math.round((withConvEnd - noConvEnd) * 100) / 100,
    notes,
  };
}

export function compareConversionScenarios(input: ScenarioComparisonInput): ScenarioComparisonResult {
  const {
    currentAge, retirementAge, traditionalIRABalance, rothIRABalance,
    annualIncome, filingStatus, stateRate, expectedRetirementRate,
    conversionAmounts, projectionYears, expectedGrowthRate,
  } = input;

  let noConvTradBal = traditionalIRABalance;
  let noConvRothBal = rothIRABalance;
  for (let y = 0; y < projectionYears; y++) {
    noConvTradBal *= (1 + expectedGrowthRate);
    noConvRothBal *= (1 + expectedGrowthRate);
  }
  const noConvEnd = noConvTradBal * (1 - expectedRetirementRate) + noConvRothBal;

  const scenarios = conversionAmounts.map((amount) => {
    const result = calculateRothConversion({
      currentAge, retirementAge, traditionalIRABalance, rothIRABalance,
      annualIncome, filingStatus, stateRate, expectedRetirementRate,
      conversionAmount: amount, projectionYears, expectedGrowthRate,
    });

    return {
      conversionAmount: result.conversionAmount,
      taxOnConversion: result.taxOnConversion,
      effectiveTaxRate: result.effectiveTaxRate,
      marginalBracketAfter: result.marginalBracketAfterConversion,
      breakevenYears: result.breakevenYears,
      endBalance: result.withConversionEndBalance,
      netBenefit: result.netBenefit,
    };
  });

  const bestIdx = scenarios.reduce((best, s, i) =>
    s.netBenefit > scenarios[best].netBenefit ? i : best, 0);

  const notes: string[] = [];
  notes.push(`Compared ${scenarios.length} conversion scenarios.`);
  notes.push(`Best scenario: $${Math.round(scenarios[bestIdx].conversionAmount).toLocaleString()} conversion with net benefit of $${Math.round(scenarios[bestIdx].netBenefit).toLocaleString()}.`);

  const bracketChanges = scenarios.filter(s => s.marginalBracketAfter > getMarginalRate(annualIncome, filingStatus));
  if (bracketChanges.length > 0) {
    notes.push(`${bracketChanges.length} scenario(s) push income into a higher tax bracket.`);
  }

  return {
    scenarios,
    bestScenarioIndex: bestIdx,
    noConversionEndBalance: Math.round(noConvEnd * 100) / 100,
    notes,
  };
}

export function getConversionAmountToMaximizeBracket(input: BracketOptimizerInput): BracketOptimizerResult {
  const { annualIncome, filingStatus, stateRate, traditionalIRABalance } = input;
  const brackets = getBrackets(filingStatus);
  const notes: string[] = [];

  let currentBracketIdx = 0;
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (annualIncome > brackets[i].min) {
      currentBracketIdx = i;
      break;
    }
  }

  const currentBracket = brackets[currentBracketIdx];
  const currentBracketRate = currentBracket.rate;
  const currentBracketCeiling = currentBracket.max === Infinity ? annualIncome * 10 : currentBracket.max;

  const spaceInBracket = Math.max(0, currentBracketCeiling - annualIncome);
  const maxConversion = Math.min(spaceInBracket, traditionalIRABalance);

  const taxOnMaxConversion = maxConversion * (currentBracketRate + stateRate);

  const nextBracketRate = currentBracketIdx < brackets.length - 1
    ? brackets[currentBracketIdx + 1].rate
    : currentBracketRate;

  notes.push(`Current bracket: ${(currentBracketRate * 100).toFixed(0)}% (${filingStatus === "married_filing_jointly" ? "MFJ" : "Single"}).`);
  notes.push(`Space remaining in current bracket: $${Math.round(spaceInBracket).toLocaleString()}.`);
  notes.push(`Max conversion to stay in ${(currentBracketRate * 100).toFixed(0)}% bracket: $${Math.round(maxConversion).toLocaleString()}.`);

  if (nextBracketRate > currentBracketRate) {
    notes.push(`Next bracket is ${(nextBracketRate * 100).toFixed(0)}% — a ${((nextBracketRate - currentBracketRate) * 100).toFixed(0)} percentage point increase.`);
  }

  if (maxConversion > 0 && maxConversion < traditionalIRABalance) {
    const yearsToConvertAll = Math.ceil(traditionalIRABalance / maxConversion);
    notes.push(`At this rate, it would take ~${yearsToConvertAll} years to convert the entire Traditional IRA balance.`);
  } else if (maxConversion <= 0) {
    notes.push(`No remaining space in the current bracket for conversion.`);
  }

  return {
    currentBracketRate,
    currentBracketCeiling: currentBracketCeiling === annualIncome * 10 ? Infinity : currentBracketCeiling,
    maxConversionInBracket: Math.round(maxConversion * 100) / 100,
    taxOnMaxConversion: Math.round(taxOnMaxConversion * 100) / 100,
    nextBracketRate,
    spaceInCurrentBracket: Math.round(spaceInBracket * 100) / 100,
    notes,
  };
}
