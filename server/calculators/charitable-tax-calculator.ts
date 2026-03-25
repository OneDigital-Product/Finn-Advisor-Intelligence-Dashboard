const STANDARD_DEDUCTION_2024: Record<string, number> = {
  single: 14600,
  married_filing_jointly: 29200,
};

const AGI_LIMITS: Record<string, number> = {
  cash_public: 0.60,
  appreciated_property: 0.30,
  private_foundation: 0.20,
};

const OVERALL_AGI_CAP = 0.60;

const BRACKETS_SINGLE_2024 = [
  { min: 0, max: 11600, rate: 0.10 },
  { min: 11600, max: 47150, rate: 0.12 },
  { min: 47150, max: 100525, rate: 0.22 },
  { min: 100525, max: 191950, rate: 0.24 },
  { min: 191950, max: 243725, rate: 0.32 },
  { min: 243725, max: 609350, rate: 0.35 },
  { min: 609350, max: Infinity, rate: 0.37 },
];

const BRACKETS_MFJ_2024 = [
  { min: 0, max: 23200, rate: 0.10 },
  { min: 23200, max: 94300, rate: 0.12 },
  { min: 94300, max: 201050, rate: 0.22 },
  { min: 201050, max: 383900, rate: 0.24 },
  { min: 383900, max: 487450, rate: 0.32 },
  { min: 487450, max: 731200, rate: 0.35 },
  { min: 731200, max: Infinity, rate: 0.37 },
];

const CARRYFORWARD_YEARS = 5;
const QCD_MAX_ANNUAL = 105000;
const QCD_MIN_AGE = 70.5;

export interface ContributionInput {
  amount: number;
  type: "cash_public" | "appreciated_property" | "private_foundation";
}

export interface CharitableTaxInput {
  agi: number;
  filingStatus: "single" | "married_filing_jointly";
  contributions: ContributionInput[];
  priorCarryforward?: CarryforwardEntry[];
  rmdAmount?: number;
  age?: number;
  standardDeductionOverride?: number;
  section7520Rate?: number;
  crtFundedValue?: number;
  crtPayoutRate?: number;
  crtTermYears?: number;
  crtType?: "CRAT" | "CRUT";
}

export interface CarryforwardEntry {
  year: number;
  amount: number;
  type: string;
  expiresYear: number;
}

export interface DeductionResult {
  contributionType: string;
  totalContributed: number;
  agiLimitPercent: number;
  maxDeductible: number;
  deductedThisYear: number;
  carryforward: number;
}

export interface CarryforwardSchedule {
  year: number;
  beginningBalance: number;
  utilized: number;
  expired: number;
  endingBalance: number;
}

export interface StrategyComparison {
  strategy: string;
  givingAmount: number;
  deductionAmount: number;
  taxSavings: number;
  afterTaxCost: number;
  incomeStream: number;
  notes: string[];
}

export interface CrtProjection {
  charitableDeduction: number;
  annualIncome: number;
  totalIncome: number;
  remainderToCharity: number;
  presentValueOfIncome: number;
  taxSavingsFromDeduction: number;
}

export interface QcdOptimization {
  recommendedQcdAmount: number;
  rmdObligation: number;
  standardDeduction: number;
  taxableIncomeWithoutQcd: number;
  taxableIncomeWithQcd: number;
  taxSavings: number;
  qcdEligible: boolean;
  notes: string[];
}

export interface CharitableTaxResult {
  deductions: DeductionResult[];
  totalDeductedThisYear: number;
  totalCarryforward: number;
  itemizingBeneficial: boolean;
  carryforwardSchedule: CarryforwardSchedule[];
  strategyComparison: StrategyComparison[];
  crtProjection: CrtProjection | null;
  qcdOptimization: QcdOptimization | null;
  effectiveTaxRate: number;
  marginalRate: number;
  taxSavingsFromDeductions: number;
  notes: string[];
}

function getBrackets(filingStatus: string) {
  return filingStatus === "married_filing_jointly" ? BRACKETS_MFJ_2024 : BRACKETS_SINGLE_2024;
}

function computeFederalTax(taxableIncome: number, filingStatus: string): number {
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
  let marginal = brackets[0].rate;
  for (const bracket of brackets) {
    if (taxableIncome > bracket.min) {
      marginal = bracket.rate;
    }
  }
  return marginal;
}

export function calculateCharitableTaxImpact(input: CharitableTaxInput): CharitableTaxResult {
  const {
    agi,
    filingStatus,
    contributions,
    priorCarryforward = [],
    rmdAmount,
    age,
    section7520Rate = 0.052,
    crtFundedValue,
    crtPayoutRate,
    crtTermYears,
    crtType,
  } = input;

  const notes: string[] = [];
  const standardDeduction = input.standardDeductionOverride ?? STANDARD_DEDUCTION_2024[filingStatus];

  const overallCap = agi * OVERALL_AGI_CAP;
  let aggregateDeducted = 0;

  const grouped: Record<string, number> = {};
  for (const c of contributions) {
    grouped[c.type] = (grouped[c.type] || 0) + c.amount;
  }

  const deductionOrder: string[] = ["cash_public", "appreciated_property", "private_foundation"];
  const deductions: DeductionResult[] = [];
  let totalCarryforward = 0;

  for (const type of deductionOrder) {
    const totalAmount = grouped[type];
    if (!totalAmount) continue;

    const limitPct = AGI_LIMITS[type] || 0.60;
    const categoryLimit = agi * limitPct;
    const remainingCap = overallCap - aggregateDeducted;
    const maxDeductible = Math.min(categoryLimit, remainingCap);
    const deducted = Math.min(totalAmount, maxDeductible);
    const cf = Math.max(0, totalAmount - deducted);

    deductions.push({
      contributionType: type,
      totalContributed: Math.round(totalAmount),
      agiLimitPercent: limitPct,
      maxDeductible: Math.round(maxDeductible),
      deductedThisYear: Math.round(deducted),
      carryforward: Math.round(cf),
    });

    aggregateDeducted += deducted;
    totalCarryforward += cf;

    if (cf > 0) {
      notes.push(
        `${formatType(type)}: ${fmtCur(totalAmount)} contributed exceeds limit (${fmtCur(maxDeductible)}). ${fmtCur(cf)} carries forward up to 5 years.`
      );
    }
  }

  let totalDeductedThisYear = Math.round(aggregateDeducted);

  const currentYear = new Date().getFullYear();

  const remainingCapForCf = overallCap - aggregateDeducted;
  let priorCfUsed = 0;

  const priorCfTracking = priorCarryforward
    .filter(cf => cf.expiresYear > currentYear)
    .sort((a, b) => a.expiresYear - b.expiresYear)
    .map(cf => ({ ...cf, remaining: cf.amount }));

  if (remainingCapForCf > 0) {
    let available = remainingCapForCf;
    for (const cf of priorCfTracking) {
      if (available <= 0) break;
      const use = Math.min(cf.remaining, available);
      cf.remaining -= use;
      priorCfUsed += use;
      available -= use;
    }
    if (priorCfUsed > 0) {
      totalDeductedThisYear += Math.round(priorCfUsed);
      notes.push(`${fmtCur(priorCfUsed)} of prior-year carryforward utilized this year.`);
    }
  }

  const itemizingBeneficial = totalDeductedThisYear > standardDeduction;

  const taxWithStandard = computeFederalTax(Math.max(0, agi - standardDeduction), filingStatus);
  const taxWithItemized = computeFederalTax(Math.max(0, agi - totalDeductedThisYear), filingStatus);
  const taxBenefit = itemizingBeneficial
    ? Math.round((taxWithStandard - taxWithItemized) * 100) / 100
    : 0;

  const taxableIncomeBase = Math.max(0, agi - (itemizingBeneficial ? totalDeductedThisYear : standardDeduction));
  const marginalRate = getMarginalRate(Math.max(0, agi - standardDeduction), filingStatus);
  const effectiveTaxRate = agi > 0
    ? Math.round((computeFederalTax(taxableIncomeBase, filingStatus) / agi) * 10000) / 10000
    : 0;

  const runningCfEntries: { remaining: number; expiresYear: number }[] = [];
  if (totalCarryforward > 0) {
    runningCfEntries.push({ remaining: totalCarryforward, expiresYear: currentYear + CARRYFORWARD_YEARS });
  }
  for (const cf of priorCfTracking) {
    if (cf.remaining > 0) {
      runningCfEntries.push({ remaining: cf.remaining, expiresYear: cf.expiresYear });
    }
  }

  let cfBalance = runningCfEntries.reduce((s, e) => s + e.remaining, 0);
  const initialCfBalance = cfBalance;
  const carryforwardSchedule: CarryforwardSchedule[] = [];

  for (let i = 1; i <= CARRYFORWARD_YEARS && cfBalance > 0; i++) {
    const year = currentYear + i;
    const beginningBalance = cfBalance;
    const futureCapacity = agi * OVERALL_AGI_CAP;
    const utilized = Math.min(cfBalance, futureCapacity);

    let toUtilize = utilized;
    const sorted = [...runningCfEntries].filter(e => e.remaining > 0).sort((a, b) => a.expiresYear - b.expiresYear);
    for (const entry of sorted) {
      if (toUtilize <= 0) break;
      const use = Math.min(entry.remaining, toUtilize);
      entry.remaining -= use;
      toUtilize -= use;
    }

    let expiredThisYear = 0;
    for (const entry of runningCfEntries) {
      if (entry.expiresYear === year && entry.remaining > 0) {
        expiredThisYear += entry.remaining;
        entry.remaining = 0;
      }
    }

    cfBalance = runningCfEntries.reduce((s, e) => s + e.remaining, 0);

    carryforwardSchedule.push({
      year,
      beginningBalance: Math.round(beginningBalance),
      utilized: Math.round(utilized - toUtilize),
      expired: Math.round(expiredThisYear),
      endingBalance: Math.round(cfBalance),
    });
  }

  const totalGivingAmount = contributions.reduce((s, c) => s + c.amount, 0);
  const strategyComparison = buildStrategyComparison(
    totalGivingAmount, agi, filingStatus, standardDeduction, marginalRate,
    section7520Rate, crtFundedValue, crtPayoutRate, crtTermYears, crtType,
    rmdAmount, age
  );

  let crtProjection: CrtProjection | null = null;
  if (crtFundedValue && crtPayoutRate && crtTermYears && crtType) {
    crtProjection = computeEnhancedCrtProjection(
      crtFundedValue, crtPayoutRate, crtTermYears, crtType, section7520Rate, marginalRate
    );
  }

  let qcdOptimization: QcdOptimization | null = null;
  if (rmdAmount !== undefined && age !== undefined) {
    qcdOptimization = computeQcdOptimization(
      agi, filingStatus, rmdAmount, age, standardDeduction, marginalRate
    );
  }

  notes.push(`Filing status: ${filingStatus === "married_filing_jointly" ? "Married Filing Jointly" : "Single"}.`);
  notes.push(`AGI: ${fmtCur(agi)}. Marginal rate: ${(marginalRate * 100).toFixed(0)}%.`);

  if (itemizingBeneficial) {
    notes.push(`Charitable deductions (${fmtCur(totalDeductedThisYear)}) exceed standard deduction (${fmtCur(standardDeduction)}). Itemizing is beneficial.`);
  } else if (totalDeductedThisYear > 0) {
    notes.push(`Charitable deductions (${fmtCur(totalDeductedThisYear)}) do not exceed standard deduction (${fmtCur(standardDeduction)}). Consider bunching contributions into a single year or using a DAF.`);
  }

  return {
    deductions,
    totalDeductedThisYear,
    totalCarryforward: Math.round(initialCfBalance),
    itemizingBeneficial,
    carryforwardSchedule,
    strategyComparison,
    crtProjection,
    qcdOptimization,
    effectiveTaxRate,
    marginalRate,
    taxSavingsFromDeductions: taxBenefit,
    notes,
  };
}

function computeEnhancedCrtProjection(
  fundedValue: number, payoutRate: number, termYears: number,
  crtType: string, section7520Rate: number, marginalRate: number
): CrtProjection {
  const annualPayout = fundedValue * payoutRate;
  let charitableDeduction: number;

  if (crtType === "CRAT") {
    const annuityFactor = (1 - Math.pow(1 + section7520Rate, -termYears)) / section7520Rate;
    charitableDeduction = fundedValue - (annualPayout * annuityFactor);
  } else {
    const exhaustionRate = payoutRate / (1 + section7520Rate);
    const unitrustFactor = 1 - Math.pow(1 - exhaustionRate, termYears);
    const pvPayouts = fundedValue * unitrustFactor;
    charitableDeduction = fundedValue - pvPayouts;
  }

  charitableDeduction = Math.max(0, charitableDeduction);

  const totalIncome = annualPayout * termYears;
  const growthRate = 0.06;
  const remainderToCharity = crtType === "CRUT"
    ? fundedValue * Math.pow(1 + growthRate - payoutRate, termYears)
    : Math.max(0, fundedValue - totalIncome);

  let presentValueOfIncome = 0;
  for (let y = 1; y <= termYears; y++) {
    presentValueOfIncome += annualPayout / Math.pow(1 + section7520Rate, y);
  }

  const taxSavingsFromDeduction = charitableDeduction * marginalRate;

  return {
    charitableDeduction: Math.round(charitableDeduction),
    annualIncome: Math.round(annualPayout),
    totalIncome: Math.round(totalIncome),
    remainderToCharity: Math.round(Math.max(0, remainderToCharity)),
    presentValueOfIncome: Math.round(presentValueOfIncome),
    taxSavingsFromDeduction: Math.round(taxSavingsFromDeduction),
  };
}

function computeQcdOptimization(
  agi: number, filingStatus: string, rmdAmount: number, age: number,
  standardDeduction: number, marginalRate: number
): QcdOptimization {
  const qcdEligible = age >= QCD_MIN_AGE;
  const notesArr: string[] = [];

  if (!qcdEligible) {
    notesArr.push(`Client is ${age} years old. QCDs are available starting at age 70½.`);
    return {
      recommendedQcdAmount: 0,
      rmdObligation: rmdAmount,
      standardDeduction,
      taxableIncomeWithoutQcd: Math.max(0, agi - standardDeduction),
      taxableIncomeWithQcd: Math.max(0, agi - standardDeduction),
      taxSavings: 0,
      qcdEligible: false,
      notes: notesArr,
    };
  }

  const taxableWithoutQcd = Math.max(0, agi - standardDeduction);
  const taxWithoutQcd = computeFederalTax(taxableWithoutQcd, filingStatus);

  const excessAboveStdDed = Math.max(0, agi - standardDeduction);
  const optimalQcd = Math.min(QCD_MAX_ANNUAL, excessAboveStdDed);

  const agiAfterQcd = agi - optimalQcd;
  const taxableWithQcd = Math.max(0, agiAfterQcd - standardDeduction);
  const taxWithQcd = computeFederalTax(taxableWithQcd, filingStatus);
  const taxSavings = Math.round((taxWithoutQcd - taxWithQcd) * 100) / 100;

  notesArr.push(`RMD obligation: ${fmtCur(rmdAmount)}.`);

  if (agi <= standardDeduction) {
    notesArr.push("AGI is at or below standard deduction. QCD provides no additional tax benefit.");
  } else if (optimalQcd < rmdAmount && optimalQcd < QCD_MAX_ANNUAL) {
    notesArr.push(`Recommended QCD: ${fmtCur(optimalQcd)} — enough to reduce AGI to the standard deduction threshold. Additional QCD beyond this amount yields no further tax savings.`);
  } else {
    notesArr.push(`Recommended QCD: ${fmtCur(optimalQcd)} to maximize tax benefit.`);
  }

  if (optimalQcd >= rmdAmount) {
    notesArr.push("Full RMD can be satisfied through QCD, eliminating taxable distribution.");
  } else if (optimalQcd > 0) {
    notesArr.push(`QCD covers ${fmtCur(optimalQcd)} of ${fmtCur(rmdAmount)} RMD. Remaining ${fmtCur(rmdAmount - optimalQcd)} is taxable.`);
  }

  if (agiAfterQcd <= standardDeduction) {
    notesArr.push("With QCD, AGI falls at or below standard deduction threshold — no federal income tax owed.");
  }

  return {
    recommendedQcdAmount: Math.round(optimalQcd),
    rmdObligation: rmdAmount,
    standardDeduction,
    taxableIncomeWithoutQcd: Math.round(taxableWithoutQcd),
    taxableIncomeWithQcd: Math.round(taxableWithQcd),
    taxSavings,
    qcdEligible: true,
    notes: notesArr,
  };
}

function buildStrategyComparison(
  givingAmount: number, agi: number, filingStatus: string,
  standardDeduction: number, marginalRate: number,
  section7520Rate: number,
  crtFundedValue?: number, crtPayoutRate?: number, crtTermYears?: number, crtType?: string,
  rmdAmount?: number, age?: number
): StrategyComparison[] {
  const strategies: StrategyComparison[] = [];
  const taxWithStandard = computeFederalTax(Math.max(0, agi - standardDeduction), filingStatus);

  const cashLimit = agi * AGI_LIMITS.cash_public;
  const cashDeduction = Math.min(givingAmount, cashLimit);
  const cashItemized = cashDeduction > standardDeduction;
  const taxAfterCash = cashItemized
    ? computeFederalTax(Math.max(0, agi - cashDeduction), filingStatus)
    : taxWithStandard;
  const cashSavings = Math.round((taxWithStandard - taxAfterCash) * 100) / 100;

  strategies.push({
    strategy: "Direct Cash Gift",
    givingAmount,
    deductionAmount: Math.round(cashDeduction),
    taxSavings: cashSavings,
    afterTaxCost: Math.round(givingAmount - cashSavings),
    incomeStream: 0,
    notes: [
      `60% AGI limit: ${fmtCur(cashLimit)}`,
      cashDeduction < givingAmount ? `${fmtCur(givingAmount - cashDeduction)} carries forward` : "Fully deductible this year",
      cashItemized ? "Itemizing is beneficial" : "Standard deduction may be more favorable",
    ],
  });

  const dafDeduction = Math.min(givingAmount, cashLimit);
  const dafItemized = dafDeduction > standardDeduction;
  const taxAfterDaf = dafItemized
    ? computeFederalTax(Math.max(0, agi - dafDeduction), filingStatus)
    : taxWithStandard;
  const dafSavings = Math.round((taxWithStandard - taxAfterDaf) * 100) / 100;

  strategies.push({
    strategy: "Donor-Advised Fund (DAF)",
    givingAmount,
    deductionAmount: Math.round(dafDeduction),
    taxSavings: dafSavings,
    afterTaxCost: Math.round(givingAmount - dafSavings),
    incomeStream: 0,
    notes: [
      "Deduction in year of contribution",
      "Flexible grant timing to charities",
      "Investment growth is tax-free",
      "Useful for bunching multiple years of giving",
    ],
  });

  const fv = crtFundedValue || givingAmount;
  const pr = crtPayoutRate || 0.05;
  const ty = crtTermYears || 20;
  const ct = crtType || "CRUT";
  const annualCrtIncome = fv * pr;
  const totalCrtIncome = annualCrtIncome * ty;

  let crtDeduction: number;
  if (ct === "CRAT") {
    const annuityFactor = (1 - Math.pow(1 + section7520Rate, -ty)) / section7520Rate;
    crtDeduction = fv - (annualCrtIncome * annuityFactor);
  } else {
    const exhaustionRate = pr / (1 + section7520Rate);
    const unitrustFactor = 1 - Math.pow(1 - exhaustionRate, ty);
    crtDeduction = fv - fv * unitrustFactor;
  }
  crtDeduction = Math.max(0, crtDeduction);

  const crtAgiLimit = agi * AGI_LIMITS.appreciated_property;
  const crtDeductionCapped = Math.min(crtDeduction, crtAgiLimit);
  const crtItemized = crtDeductionCapped > standardDeduction;
  const taxAfterCrt = crtItemized
    ? computeFederalTax(Math.max(0, agi - crtDeductionCapped), filingStatus)
    : taxWithStandard;
  const crtSavings = Math.round((taxWithStandard - taxAfterCrt) * 100) / 100;

  strategies.push({
    strategy: `Charitable Remainder Trust (${ct})`,
    givingAmount: fv,
    deductionAmount: Math.round(crtDeductionCapped),
    taxSavings: crtSavings,
    afterTaxCost: Math.round(fv - crtSavings - totalCrtIncome),
    incomeStream: Math.round(annualCrtIncome),
    notes: [
      `${(pr * 100).toFixed(1)}% payout over ${ty} years`,
      `Annual income: ${fmtCur(annualCrtIncome)}`,
      `Total projected income: ${fmtCur(totalCrtIncome)}`,
      "30% AGI limit applies (appreciated property)",
    ],
  });

  if (rmdAmount !== undefined && age !== undefined && age >= QCD_MIN_AGE) {
    const qcdAmount = Math.min(givingAmount, QCD_MAX_ANNUAL);
    const agiAfterQcd = agi - qcdAmount;
    const taxableAfterQcd = Math.max(0, agiAfterQcd - standardDeduction);
    const taxAfterQcd = computeFederalTax(taxableAfterQcd, filingStatus);
    const qcdSavings = Math.round((taxWithStandard - taxAfterQcd) * 100) / 100;
    const rmdSatisfied = Math.min(qcdAmount, rmdAmount);

    const qcdNotes = [
      "Excluded from gross income (not a deduction)",
      `Annual limit: ${fmtCur(QCD_MAX_ANNUAL)}`,
      "Available to IRA owners age 70½+",
    ];
    if (rmdSatisfied >= rmdAmount) {
      qcdNotes.push(`Fully satisfies RMD of ${fmtCur(rmdAmount)}`);
    } else {
      qcdNotes.push(`Satisfies ${fmtCur(rmdSatisfied)} of ${fmtCur(rmdAmount)} RMD`);
    }
    if (qcdAmount < givingAmount) {
      qcdNotes.push(`QCD capped at ${fmtCur(QCD_MAX_ANNUAL)} annual limit; remaining ${fmtCur(givingAmount - qcdAmount)} would need another strategy`);
    }

    strategies.push({
      strategy: "Qualified Charitable Distribution (QCD)",
      givingAmount,
      deductionAmount: 0,
      taxSavings: qcdSavings,
      afterTaxCost: Math.round(givingAmount - qcdSavings),
      incomeStream: 0,
      notes: qcdNotes,
    });
  }

  return strategies;
}

function formatType(type: string): string {
  switch (type) {
    case "cash_public": return "Cash to public charities";
    case "appreciated_property": return "Appreciated property";
    case "private_foundation": return "Private foundation";
    default: return type;
  }
}

function fmtCur(v: number): string {
  return "$" + Math.round(v).toLocaleString("en-US");
}
