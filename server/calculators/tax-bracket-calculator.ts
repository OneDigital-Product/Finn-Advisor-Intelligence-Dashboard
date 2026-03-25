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

const STANDARD_DEDUCTION_2024 = {
  single: 14600,
  married_filing_jointly: 29200,
};

export interface TaxBracketInput {
  grossIncome: number;
  filingStatus: "single" | "married_filing_jointly";
  deductions: number;
  additionalIncome: number;
  stateRate: number;
  projectionYears: number;
  expectedIncomeGrowth: number;
  expectedBracketInflation: number;
}

export interface BracketBreakdown {
  rate: number;
  min: number;
  max: number;
  taxableInBracket: number;
  taxInBracket: number;
  isCurrentBracket: boolean;
}

export interface YearProjection {
  year: number;
  grossIncome: number;
  taxableIncome: number;
  federalTax: number;
  stateTax: number;
  totalTax: number;
  effectiveRate: number;
  marginalRate: number;
  bracketHeadroom: number;
}

export interface TaxBracketResult {
  currentYear: {
    grossIncome: number;
    totalIncome: number;
    deductions: number;
    taxableIncome: number;
    federalTax: number;
    stateTax: number;
    totalTax: number;
    effectiveRate: number;
    marginalRate: number;
    bracketHeadroom: number;
    bracketBreakdown: BracketBreakdown[];
  };
  projections: YearProjection[];
  notes: string[];
}

function getBrackets(filingStatus: string) {
  return filingStatus === "married_filing_jointly" ? BRACKETS_MFJ_2024 : BRACKETS_SINGLE_2024;
}

function calculateTax(taxableIncome: number, filingStatus: string): { tax: number; breakdown: BracketBreakdown[]; marginalRate: number; headroom: number } {
  const brackets = getBrackets(filingStatus);
  let tax = 0;
  const breakdown: BracketBreakdown[] = [];
  let marginalRate = brackets[0].rate;
  let headroom = 0;

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) {
      breakdown.push({
        rate: bracket.rate,
        min: bracket.min,
        max: bracket.max === Infinity ? bracket.min + 1000000 : bracket.max,
        taxableInBracket: 0,
        taxInBracket: 0,
        isCurrentBracket: false,
      });
      continue;
    }

    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
    const taxInBracket = taxableInBracket * bracket.rate;
    tax += taxInBracket;

    const isCurrent = taxableIncome > bracket.min && taxableIncome <= bracket.max;
    if (isCurrent) {
      marginalRate = bracket.rate;
      headroom = bracket.max === Infinity ? 0 : bracket.max - taxableIncome;
    }

    if (taxableIncome > bracket.max && bracket === brackets[brackets.length - 1]) {
      marginalRate = bracket.rate;
      headroom = 0;
    }

    breakdown.push({
      rate: bracket.rate,
      min: bracket.min,
      max: bracket.max === Infinity ? bracket.min + 1000000 : bracket.max,
      taxableInBracket: Math.round(taxableInBracket * 100) / 100,
      taxInBracket: Math.round(taxInBracket * 100) / 100,
      isCurrentBracket: isCurrent,
    });
  }

  return { tax, breakdown, marginalRate, headroom };
}

export function calculateTaxBracket(input: TaxBracketInput): TaxBracketResult {
  const {
    grossIncome, filingStatus, deductions, additionalIncome,
    stateRate, projectionYears, expectedIncomeGrowth, expectedBracketInflation,
  } = input;

  const notes: string[] = [];
  const totalIncome = grossIncome + additionalIncome;
  const standardDeduction = STANDARD_DEDUCTION_2024[filingStatus];
  const effectiveDeductions = deductions > 0 ? deductions : standardDeduction;
  const taxableIncome = Math.max(0, totalIncome - effectiveDeductions);

  const { tax: federalTax, breakdown, marginalRate, headroom } = calculateTax(taxableIncome, filingStatus);
  const stateTax = totalIncome * stateRate;
  const totalTax = federalTax + stateTax;
  const effectiveRate = totalIncome > 0 ? totalTax / totalIncome : 0;

  if (deductions === 0) {
    notes.push(`Using standard deduction of $${standardDeduction.toLocaleString()} for ${filingStatus === "married_filing_jointly" ? "Married Filing Jointly" : "Single"}.`);
  }

  if (headroom > 0 && headroom < 25000) {
    notes.push(`Only $${Math.round(headroom).toLocaleString()} of headroom before the next bracket (${((marginalRate === 0.10 ? 0.12 : marginalRate === 0.12 ? 0.22 : marginalRate === 0.22 ? 0.24 : marginalRate === 0.24 ? 0.32 : marginalRate === 0.32 ? 0.35 : 0.37) * 100).toFixed(0)}%). Consider Roth conversions or charitable giving to stay in current bracket.`);
  }

  const projections: YearProjection[] = [];
  for (let y = 1; y <= projectionYears; y++) {
    const futureIncome = totalIncome * Math.pow(1 + expectedIncomeGrowth, y);
    const futureDeduction = effectiveDeductions * Math.pow(1 + expectedBracketInflation, y);
    const futureTaxableIncome = Math.max(0, futureIncome - futureDeduction);

    const inflatedBrackets = getBrackets(filingStatus).map(b => ({
      ...b,
      min: b.min * Math.pow(1 + expectedBracketInflation, y),
      max: b.max === Infinity ? Infinity : b.max * Math.pow(1 + expectedBracketInflation, y),
    }));

    let futureFederalTax = 0;
    let futureMarginal = inflatedBrackets[0].rate;
    let futureHeadroom = 0;
    for (const bracket of inflatedBrackets) {
      if (futureTaxableIncome <= bracket.min) continue;
      const taxableInBracket = Math.min(futureTaxableIncome, bracket.max) - bracket.min;
      futureFederalTax += taxableInBracket * bracket.rate;
      if (futureTaxableIncome > bracket.min && futureTaxableIncome <= bracket.max) {
        futureMarginal = bracket.rate;
        futureHeadroom = bracket.max === Infinity ? 0 : bracket.max - futureTaxableIncome;
      }
    }

    const futureStateTax = futureIncome * stateRate;
    const futureTotalTax = futureFederalTax + futureStateTax;
    const futureEffective = futureIncome > 0 ? futureTotalTax / futureIncome : 0;

    projections.push({
      year: y,
      grossIncome: Math.round(futureIncome),
      taxableIncome: Math.round(futureTaxableIncome),
      federalTax: Math.round(futureFederalTax),
      stateTax: Math.round(futureStateTax),
      totalTax: Math.round(futureTotalTax),
      effectiveRate: Math.round(futureEffective * 10000) / 10000,
      marginalRate: futureMarginal,
      bracketHeadroom: Math.round(futureHeadroom),
    });
  }

  notes.push("Tax brackets are projected using expected inflation adjustments. Actual future brackets may differ.");
  notes.push("This analysis uses federal brackets only. State taxes are calculated as a flat percentage.");

  return {
    currentYear: {
      grossIncome,
      totalIncome,
      deductions: effectiveDeductions,
      taxableIncome,
      federalTax: Math.round(federalTax * 100) / 100,
      stateTax: Math.round(stateTax * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      effectiveRate: Math.round(effectiveRate * 10000) / 10000,
      marginalRate,
      bracketHeadroom: Math.round(headroom),
      bracketBreakdown: breakdown,
    },
    projections,
    notes,
  };
}
