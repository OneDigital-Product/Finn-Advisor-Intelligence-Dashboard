const INCOME_REPLACEMENT_MULTIPLIER = 10;
const DISCOUNT_RATE = 0.05;
const INCOME_GROWTH_RATE = 0.03;
const EDUCATION_INFLATION = 0.05;
const FOUR_YEAR_PUBLIC_COST = 25000;
const FOUR_YEAR_PRIVATE_COST = 55000;

export interface LifeInsuranceGapInput {
  annualIncome: number;
  spouseIncome?: number;
  dependents: number;
  youngestDependentAge?: number;
  mortgageBalance?: number;
  otherDebts?: number;
  educationFundingGoal: "public" | "private" | "none";
  childrenNeedingEducation?: number;
  averageChildAge?: number;
  existingLifeInsurance?: number;
  existingGroupCoverage?: number;
  liquidSavings?: number;
  retirementAssets?: number;
  annualExpenses?: number;
  filingStatus: "single" | "married_filing_jointly";
  yearsOfIncomeReplacement?: number;
  funeralAndFinalExpenses?: number;
  estateSize?: number;
  estateTaxExemption?: number;
}

export interface CoverageNeed {
  category: string;
  description: string;
  amount: number;
}

export interface CoverageSource {
  source: string;
  amount: number;
}

export interface LifeInsuranceGapResult {
  totalCoverageNeeded: number;
  existingCoverage: number;
  coverageGap: number;
  coverageSurplus: number;
  isAdequatelyCovered: boolean;
  needs: CoverageNeed[];
  sources: CoverageSource[];
  incomeReplacement: {
    annualNeed: number;
    yearsNeeded: number;
    presentValue: number;
    percentOfIncome: number;
  };
  estateLiquidity: {
    estateSize: number;
    exemption: number;
    taxableEstate: number;
    estimatedEstateTax: number;
    liquidityNeed: number;
  };
  educationFunding: {
    totalCost: number;
    perChild: number;
    childrenCovered: number;
    costType: string;
    inflationAdjusted: boolean;
  };
  recommendation: {
    coverageAmount: number;
    coverageType: string;
    termLength: number;
    estimatedAnnualPremium: number;
    rationale: string;
  };
  notes: string[];
}

function fmtCur(v: number): string {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function presentValueOfAnnuity(payment: number, rate: number, years: number): number {
  if (rate === 0) return payment * years;
  return payment * ((1 - Math.pow(1 + rate, -years)) / rate);
}

export function calculateLifeInsuranceGap(input: LifeInsuranceGapInput): LifeInsuranceGapResult {
  const {
    annualIncome,
    spouseIncome = 0,
    dependents,
    youngestDependentAge = 5,
    mortgageBalance = 0,
    otherDebts = 0,
    educationFundingGoal,
    childrenNeedingEducation = 0,
    averageChildAge = 10,
    existingLifeInsurance = 0,
    existingGroupCoverage = 0,
    liquidSavings = 0,
    retirementAssets = 0,
    annualExpenses,
    filingStatus,
    yearsOfIncomeReplacement,
    funeralAndFinalExpenses = 15000,
    estateSize = 0,
    estateTaxExemption = 13610000,
  } = input;

  const notes: string[] = [];
  const needs: CoverageNeed[] = [];
  const sources: CoverageSource[] = [];

  const householdExpenses = annualExpenses != null && annualExpenses > 0 ? annualExpenses : annualIncome * 0.75;
  const incomeSharePercent = (annualIncome + spouseIncome) > 0
    ? annualIncome / (annualIncome + spouseIncome)
    : 1;
  const incomeNeedAnnual = householdExpenses * incomeSharePercent;

  const defaultYears = dependents > 0
    ? Math.max(10, 18 - youngestDependentAge + 4)
    : (spouseIncome > 0 ? 10 : 5);
  const yearsNeeded = yearsOfIncomeReplacement ?? defaultYears;
  const realRate = DISCOUNT_RATE - INCOME_GROWTH_RATE;
  const incomeReplacementPV = presentValueOfAnnuity(incomeNeedAnnual, realRate, yearsNeeded);

  needs.push({
    category: "Income Replacement",
    description: `${yearsNeeded} years of income replacement at ${fmtCur(incomeNeedAnnual)}/year (present value)`,
    amount: Math.round(incomeReplacementPV),
  });

  if (mortgageBalance > 0) {
    needs.push({
      category: "Mortgage Payoff",
      description: "Pay off remaining mortgage balance",
      amount: Math.round(mortgageBalance),
    });
  }

  if (otherDebts > 0) {
    needs.push({
      category: "Other Debt Payoff",
      description: "Pay off other outstanding debts",
      amount: Math.round(otherDebts),
    });
  }

  let totalEducationCost = 0;
  let perChildCost = 0;
  let costTypeLabel = "None";
  if (educationFundingGoal !== "none" && childrenNeedingEducation > 0) {
    const baseAnnualCost = educationFundingGoal === "private" ? FOUR_YEAR_PRIVATE_COST : FOUR_YEAR_PUBLIC_COST;
    costTypeLabel = educationFundingGoal === "private" ? "Private University" : "Public University";
    const yearsToCollege = Math.max(0, 18 - averageChildAge);

    for (let c = 0; c < childrenNeedingEducation; c++) {
      for (let y = 0; y < 4; y++) {
        const futureYearCost = baseAnnualCost * Math.pow(1 + EDUCATION_INFLATION, yearsToCollege + y);
        const pvCost = futureYearCost / Math.pow(1 + DISCOUNT_RATE, yearsToCollege + y);
        totalEducationCost += pvCost;
      }
    }
    perChildCost = childrenNeedingEducation > 0 ? totalEducationCost / childrenNeedingEducation : 0;

    needs.push({
      category: "Education Funding",
      description: `${childrenNeedingEducation} child(ren) x 4 years ${costTypeLabel} (inflation-adjusted PV)`,
      amount: Math.round(totalEducationCost),
    });
  }

  needs.push({
    category: "Final Expenses",
    description: "Funeral, estate settlement, and immediate expenses",
    amount: Math.round(funeralAndFinalExpenses),
  });

  let estateTax = 0;
  let liquidityNeed = 0;
  const taxableEstate = Math.max(0, estateSize - estateTaxExemption);
  if (taxableEstate > 0) {
    estateTax = Math.round(taxableEstate * 0.40);
    liquidityNeed = estateTax;

    needs.push({
      category: "Estate Tax Liquidity",
      description: `Estimated estate tax on ${fmtCur(taxableEstate)} taxable estate (40% rate)`,
      amount: Math.round(liquidityNeed),
    });
  }

  const emergencyFund = householdExpenses * 0.5;
  needs.push({
    category: "Emergency Fund",
    description: "6 months of household expenses as emergency buffer",
    amount: Math.round(emergencyFund),
  });

  const totalNeed = needs.reduce((s, n) => s + n.amount, 0);

  if (existingLifeInsurance > 0) {
    sources.push({ source: "Existing Individual Life Insurance", amount: Math.round(existingLifeInsurance) });
  }
  if (existingGroupCoverage > 0) {
    sources.push({ source: "Employer Group Life Insurance", amount: Math.round(existingGroupCoverage) });
  }
  if (liquidSavings > 0) {
    sources.push({ source: "Liquid Savings", amount: Math.round(liquidSavings) });
  }
  if (retirementAssets > 0) {
    const accessibleRetirement = retirementAssets * 0.5;
    sources.push({ source: "Retirement Assets (50% accessible)", amount: Math.round(accessibleRetirement) });
  }
  if (spouseIncome > 0) {
    const spouseContribution = presentValueOfAnnuity(spouseIncome * 0.3, realRate, Math.min(yearsNeeded, 10));
    sources.push({ source: "Spouse Income Contribution (30%)", amount: Math.round(spouseContribution) });
  }

  const totalExisting = sources.reduce((s, src) => s + src.amount, 0);
  const gap = Math.max(0, totalNeed - totalExisting);
  const surplus = Math.max(0, totalExisting - totalNeed);
  const isAdequate = gap === 0;

  const recommendedCoverage = Math.ceil(gap / 50000) * 50000;
  const termLength = Math.max(10, Math.min(30, yearsNeeded));

  let coverageType: string;
  if (estateSize > estateTaxExemption) {
    coverageType = "Permanent (Whole/Universal Life)";
  } else if (yearsNeeded > 20) {
    coverageType = "30-Year Level Term";
  } else if (yearsNeeded > 10) {
    coverageType = "20-Year Level Term";
  } else {
    coverageType = "10-Year Level Term";
  }

  const premiumPer1000 = coverageType.includes("Permanent") ? 12 : coverageType.includes("30") ? 1.8 : coverageType.includes("20") ? 1.2 : 0.8;
  const estimatedPremium = Math.round((recommendedCoverage / 1000) * premiumPer1000);

  let rationale: string;
  if (isAdequate) {
    rationale = "Current coverage appears adequate. Review annually or when circumstances change (new dependents, mortgage changes, income growth).";
  } else {
    rationale = `Coverage gap of ${fmtCur(gap)} identified. A ${coverageType} policy of ${fmtCur(recommendedCoverage)} would close the gap.`;
    if (dependents > 0) {
      rationale += ` Primary driver: ${yearsNeeded} years of income replacement for ${dependents} dependent(s).`;
    }
  }

  if (!isAdequate) {
    const multipleOfIncome = annualIncome > 0 ? (recommendedCoverage / annualIncome).toFixed(1) : "N/A";
    notes.push(`Recommended coverage of ${fmtCur(recommendedCoverage)} is approximately ${multipleOfIncome}x annual income.`);
  }

  if (existingGroupCoverage > 0) {
    notes.push("Employer group coverage is not portable. Consider replacing with individual coverage if job changes are possible.");
  }

  if (dependents === 0 && mortgageBalance === 0 && otherDebts === 0) {
    notes.push("With no dependents or debts, life insurance need is primarily for final expenses and potential estate liquidity.");
  }

  if (estateSize > 0 && taxableEstate > 0) {
    notes.push(`Estate of ${fmtCur(estateSize)} exceeds the ${fmtCur(estateTaxExemption)} exemption. Life insurance can provide estate tax liquidity.`);
  }

  if (annualIncome > 0 && (existingLifeInsurance + existingGroupCoverage) / annualIncome < 5) {
    notes.push("Current coverage is less than 5x income — below the commonly recommended 10-15x range.");
  }

  notes.push("Premium estimates are illustrative and depend on health, age, and underwriting. Consult with an insurance professional for actual quotes.");
  notes.push("This analysis assumes level premium term insurance. Permanent policies offer cash value accumulation but at higher premiums.");

  return {
    totalCoverageNeeded: Math.round(totalNeed),
    existingCoverage: Math.round(totalExisting),
    coverageGap: Math.round(gap),
    coverageSurplus: Math.round(surplus),
    isAdequatelyCovered: isAdequate,
    needs,
    sources,
    incomeReplacement: {
      annualNeed: Math.round(incomeNeedAnnual),
      yearsNeeded,
      presentValue: Math.round(incomeReplacementPV),
      percentOfIncome: annualIncome > 0 ? Math.round((incomeNeedAnnual / annualIncome) * 10000) / 100 : 0,
    },
    estateLiquidity: {
      estateSize: Math.round(estateSize),
      exemption: Math.round(estateTaxExemption),
      taxableEstate: Math.round(taxableEstate),
      estimatedEstateTax: Math.round(estateTax),
      liquidityNeed: Math.round(liquidityNeed),
    },
    educationFunding: {
      totalCost: Math.round(totalEducationCost),
      perChild: Math.round(perChildCost),
      childrenCovered: childrenNeedingEducation,
      costType: costTypeLabel,
      inflationAdjusted: true,
    },
    recommendation: {
      coverageAmount: recommendedCoverage,
      coverageType,
      termLength,
      estimatedAnnualPremium: estimatedPremium,
      rationale,
    },
    notes,
  };
}
