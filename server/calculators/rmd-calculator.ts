const UNIFORM_LIFETIME_TABLE: Record<number, number> = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0,
  79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0,
  86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8,
  93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4,
  101: 6.0, 102: 5.6, 103: 5.2, 104: 4.9, 105: 4.6, 106: 4.3, 107: 4.1,
  108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4, 112: 3.3, 113: 3.1, 114: 3.0,
  115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3, 120: 2.0,
};

export interface RMDInput {
  accountHolderDOB: string;
  accountBalance: number;
  beneficiaryDOB?: string;
  beneficiaryRelationship?: "spouse" | "non_spouse" | "none";
  taxYear: number;
  assumedGrowthRate: number;
  inheritanceStatus?: "original_owner" | "inherited_ira" | "post_secure_act";
  projectionYears?: number;
  qcdAmount?: number;
  qcdAnnualIncrease?: number;
  marginalTaxRate?: number;
}

export interface RMDProjection {
  year: number;
  age: number;
  rmdAmount: number;
  accountBalance: number;
  withdrawalPercentage: number;
  qcdAmount?: number;
  taxableDistribution?: number;
  taxSavingsFromQCD?: number;
}

export interface QCDSummary {
  totalQCDOverPeriod: number;
  totalTaxSavings: number;
  qcdAsPercentOfRMD: number;
  qcdEligible: boolean;
  qcdEligibilityAge: number;
}

export interface RMDResult {
  currentYearRMD: number;
  rmdPercentage: number;
  lifeExpectancyFactor: number;
  projections: RMDProjection[];
  notes: string[];
  qcdSummary?: QCDSummary;
}

export interface AggregatedRMDInput {
  accountHolderDOB: string;
  taxYear: number;
  accounts: Array<{
    name: string;
    type: "traditional_ira" | "401k" | "403b" | "457b" | "sep_ira" | "simple_ira";
    balance: number;
  }>;
}

export interface AggregatedRMDResult {
  totalRMD: number;
  accountDetails: Array<{
    name: string;
    type: string;
    balance: number;
    rmdAmount: number;
    canAggregateWith: string;
  }>;
  aggregationGroups: Array<{
    groupName: string;
    totalBalance: number;
    totalRMD: number;
    accounts: string[];
    note: string;
  }>;
  lifeExpectancyFactor: number;
  accountHolderAge: number;
  notes: string[];
}

export interface QCDAnalysisInput {
  accountHolderDOB: string;
  accountBalance: number;
  taxYear: number;
  proposedQCDAmount: number;
  marginalTaxRate: number;
  standardDeduction?: number;
  itemizedDeductions?: number;
}

export interface QCDAnalysisResult {
  eligible: boolean;
  accountHolderAge: number;
  proposedQCD: number;
  effectiveQCD: number;
  currentYearRMD: number;
  rmdSatisfied: boolean;
  rmdRemaining: number;
  taxSavings: number;
  comparedToCharitableDeduction: {
    qcdTaxBenefit: number;
    deductionTaxBenefit: number;
    qcdAdvantage: number;
    explanation: string;
  };
  notes: string[];
}

export interface RMDProjectionInput {
  accountHolderDOB: string;
  accountBalance: number;
  taxYear: number;
  assumedGrowthRate: number;
  projectionYears: number;
}

export interface RMDProjectionResult {
  projections: RMDProjection[];
  totalRMDOverPeriod: number;
  endingBalance: number;
  notes: string[];
}

export interface StrategyComparisonInput {
  accountHolderDOB: string;
  accountBalance: number;
  taxYear: number;
  assumedGrowthRate: number;
  projectionYears: number;
  qcdAmount: number;
  marginalTaxRate: number;
}

export interface StrategyComparisonResult {
  standardWithdrawal: {
    projections: RMDProjection[];
    totalDistributions: number;
    totalTaxes: number;
    endingBalance: number;
  };
  qcdStrategy: {
    projections: RMDProjection[];
    totalDistributions: number;
    totalTaxes: number;
    totalQCD: number;
    totalTaxSavings: number;
    endingBalance: number;
  };
  taxSavingsFromQCD: number;
  notes: string[];
}

function calculateAge(dob: string, asOfYear: number): number {
  const birthYear = new Date(dob).getFullYear();
  return asOfYear - birthYear;
}

function getLifeExpectancyFactor(accountHolderAge: number): number {
  if (accountHolderAge in UNIFORM_LIFETIME_TABLE) {
    return UNIFORM_LIFETIME_TABLE[accountHolderAge];
  }
  if (accountHolderAge > 120) {
    return 1.0;
  }
  return 0;
}

export function calculateRMD(inputs: RMDInput): RMDResult {
  const {
    accountHolderDOB,
    accountBalance,
    beneficiaryDOB,
    beneficiaryRelationship = "none",
    taxYear,
    assumedGrowthRate,
    inheritanceStatus = "original_owner",
    projectionYears = 10,
  } = inputs;

  if (!accountHolderDOB || isNaN(new Date(accountHolderDOB).getTime())) {
    throw new Error("Invalid account holder date of birth");
  }
  if (accountBalance <= 0) {
    throw new Error("Account balance must be greater than $0");
  }
  if (!taxYear || taxYear < 2000 || taxYear > 2100) {
    throw new Error("Tax year must be between 2000 and 2100");
  }

  const notes: string[] = [];
  const accountHolderAge = calculateAge(accountHolderDOB, taxYear);
  const beneficiaryAge = beneficiaryDOB ? calculateAge(beneficiaryDOB, taxYear) : undefined;

  if (accountHolderAge < 72) {
    throw new Error(
      `Account holder is age ${accountHolderAge} in tax year ${taxYear}. RMD applies at age 72+ (73+ under SECURE 2.0).`
    );
  }

  if (accountHolderAge < 73) {
    notes.push("Note: Under SECURE 2.0, RMD start age is 73. Verify whether this account holder is subject to the older age-72 rule.");
  }

  if (beneficiaryRelationship === "spouse" && beneficiaryAge !== undefined && accountHolderAge - beneficiaryAge > 10) {
    notes.push(
      "Spouse beneficiary is 10+ years younger. The IRS Joint Life and Last Survivor Table (Table II) would apply for a more favorable factor. This calculator uses the Uniform Lifetime Table (Table III) as a conservative estimate."
    );
  }

  const lifeExpectancyFactor = getLifeExpectancyFactor(accountHolderAge);

  const currentYearRMD = accountBalance / lifeExpectancyFactor;
  const rmdPercentage = (currentYearRMD / accountBalance) * 100;

  const qcdAmount = inputs.qcdAmount || 0;
  const qcdAnnualIncrease = inputs.qcdAnnualIncrease || 0;
  const marginalTaxRate = inputs.marginalTaxRate || 0.24;
  const QCD_MAX_ANNUAL = 105000;
  const QCD_MIN_AGE = 70.5;
  const hasQCD = qcdAmount > 0;

  const projections: RMDProjection[] = [];
  let projectedBalance = accountBalance;
  let totalQCD = 0;
  let totalQCDTaxSavings = 0;

  for (let i = 0; i < projectionYears; i++) {
    const year = taxYear + i;
    const age = accountHolderAge + i;

    const factor = getLifeExpectancyFactor(age);
    if (factor <= 0) {
      notes.push(`No IRS table factor available for age ${age}. Projection ended.`);
      break;
    }
    const rmdAmount = projectedBalance / factor;
    const withdrawalPct = projectedBalance > 0 ? (rmdAmount / projectedBalance) * 100 : 0;

    let yearQCD = 0;
    let taxableDistribution = rmdAmount;
    let taxSavings = 0;

    if (hasQCD && age >= QCD_MIN_AGE) {
      const inflatedQCD = qcdAmount * Math.pow(1 + qcdAnnualIncrease, i);
      yearQCD = Math.min(inflatedQCD, QCD_MAX_ANNUAL, rmdAmount);
      taxableDistribution = rmdAmount - yearQCD;
      taxSavings = yearQCD * marginalTaxRate;
      totalQCD += yearQCD;
      totalQCDTaxSavings += taxSavings;
    }

    projections.push({
      year,
      age,
      rmdAmount: Math.round(rmdAmount * 100) / 100,
      accountBalance: Math.round(projectedBalance * 100) / 100,
      withdrawalPercentage: Math.round(withdrawalPct * 100) / 100,
      ...(hasQCD ? {
        qcdAmount: Math.round(yearQCD * 100) / 100,
        taxableDistribution: Math.round(taxableDistribution * 100) / 100,
        taxSavingsFromQCD: Math.round(taxSavings * 100) / 100,
      } : {}),
    });

    projectedBalance = projectedBalance * (1 + assumedGrowthRate) - rmdAmount;

    if (projectedBalance <= 0) {
      notes.push(`Account projected to deplete by year ${year + 1} (age ${age + 1}).`);
      break;
    }
  }

  if (inheritanceStatus === "inherited_ira" || inheritanceStatus === "post_secure_act") {
    notes.push(
      "SECURE Act 2.0: Non-spouse beneficiaries must deplete inherited IRA within 10 years of original owner's death."
    );
  }

  if (beneficiaryRelationship === "non_spouse") {
    notes.push("Non-spouse beneficiary: 10-year distribution rule applies under SECURE Act.");
  }

  if (beneficiaryRelationship === "spouse" && beneficiaryAge !== undefined && accountHolderAge - beneficiaryAge > 10) {
    notes.push("Spouse beneficiary is 10+ years younger — Joint Life Expectancy adjustment applied.");
  }

  notes.push(
    `Assumes ${(assumedGrowthRate * 100).toFixed(1)}% annual growth rate. Actual returns will vary.`
  );
  notes.push(
    "RMD must be withdrawn by December 31 each year to avoid 25% penalty (reduced from 50% under SECURE 2.0)."
  );
  notes.push(
    "Note: Roth IRAs have NO RMD during original owner's lifetime. This calculation assumes Traditional IRA."
  );

  if (hasQCD) {
    notes.push(`QCD: $${qcdAmount.toLocaleString()} annually directed to charity, reducing taxable income. Max $${QCD_MAX_ANNUAL.toLocaleString()}/year.`);
    notes.push("QCDs are available starting at age 70½. They satisfy RMD requirements and are excluded from taxable income.");
    notes.push("QCDs must go directly from IRA custodian to the charity. They cannot come from SEP or SIMPLE IRAs with active contributions.");
  }

  let qcdSummary: QCDSummary | undefined;
  if (hasQCD) {
    const totalRMD = projections.reduce((s, p) => s + p.rmdAmount, 0);
    qcdSummary = {
      totalQCDOverPeriod: Math.round(totalQCD * 100) / 100,
      totalTaxSavings: Math.round(totalQCDTaxSavings * 100) / 100,
      qcdAsPercentOfRMD: totalRMD > 0 ? Math.round((totalQCD / totalRMD) * 10000) / 100 : 0,
      qcdEligible: accountHolderAge >= QCD_MIN_AGE,
      qcdEligibilityAge: QCD_MIN_AGE,
    };
  }

  return {
    currentYearRMD: Math.round(currentYearRMD * 100) / 100,
    rmdPercentage: Math.round(rmdPercentage * 100) / 100,
    lifeExpectancyFactor,
    projections,
    notes,
    ...(qcdSummary ? { qcdSummary } : {}),
  };
}

export function calculateAggregatedRMD(input: AggregatedRMDInput): AggregatedRMDResult {
  const { accountHolderDOB, taxYear, accounts } = input;

  if (!accountHolderDOB || isNaN(new Date(accountHolderDOB).getTime())) {
    throw new Error("Invalid account holder date of birth");
  }

  const accountHolderAge = calculateAge(accountHolderDOB, taxYear);
  if (accountHolderAge < 72) {
    throw new Error(`Account holder is age ${accountHolderAge} in tax year ${taxYear}. RMD applies at age 72+.`);
  }

  const factor = getLifeExpectancyFactor(accountHolderAge);
  if (factor <= 0) {
    throw new Error(`No IRS life expectancy factor available for age ${accountHolderAge}.`);
  }

  const notes: string[] = [];
  const iraTypes = new Set(["traditional_ira", "sep_ira", "simple_ira"]);
  const employerTypes = new Set(["401k", "403b", "457b"]);

  const iraAccounts = accounts.filter(a => iraTypes.has(a.type));
  const employerAccounts = accounts.filter(a => employerTypes.has(a.type));

  const totalIRABalance = iraAccounts.reduce((s, a) => s + a.balance, 0);
  const totalIRARMD = totalIRABalance / factor;

  const accountDetails = accounts.map(a => {
    const isIRA = iraTypes.has(a.type);
    const rmdForAccount = a.balance / factor;

    return {
      name: a.name,
      type: a.type,
      balance: a.balance,
      rmdAmount: Math.round(rmdForAccount * 100) / 100,
      canAggregateWith: isIRA ? "IRA group (can satisfy from any IRA)" : `${a.type} (must be taken from this account)`,
    };
  });

  const aggregationGroups: AggregatedRMDResult["aggregationGroups"] = [];

  if (iraAccounts.length > 0) {
    aggregationGroups.push({
      groupName: "Traditional IRAs (Aggregated)",
      totalBalance: Math.round(totalIRABalance * 100) / 100,
      totalRMD: Math.round(totalIRARMD * 100) / 100,
      accounts: iraAccounts.map(a => a.name),
      note: "IRA RMDs can be aggregated and taken from any IRA account in this group.",
    });
  }

  for (const ea of employerAccounts) {
    aggregationGroups.push({
      groupName: `${ea.name} (${ea.type})`,
      totalBalance: ea.balance,
      totalRMD: Math.round((ea.balance / factor) * 100) / 100,
      accounts: [ea.name],
      note: `${ea.type} RMD must be taken separately from this account.`,
    });
  }

  const totalRMD = totalIRARMD + employerAccounts.reduce((s, a) => s + a.balance / factor, 0);

  if (iraAccounts.length > 1) {
    notes.push(`${iraAccounts.length} IRA accounts aggregated. Total IRA RMD of $${Math.round(totalIRARMD).toLocaleString()} can be taken from any combination of these IRAs.`);
  }
  if (employerAccounts.length > 0) {
    notes.push(`${employerAccounts.length} employer plan(s) require separate RMD calculations. Each must be satisfied from its own plan.`);
  }
  notes.push(`Life expectancy factor: ${factor} (age ${accountHolderAge}).`);

  return {
    totalRMD: Math.round(totalRMD * 100) / 100,
    accountDetails,
    aggregationGroups,
    lifeExpectancyFactor: factor,
    accountHolderAge,
    notes,
  };
}

export function analyzeQCD(input: QCDAnalysisInput): QCDAnalysisResult {
  const {
    accountHolderDOB, accountBalance, taxYear, proposedQCDAmount,
    marginalTaxRate, standardDeduction, itemizedDeductions,
  } = input;

  const accountHolderAge = calculateAge(accountHolderDOB, taxYear);
  const QCD_MAX = 105000;
  const QCD_MIN_AGE = 70.5;
  const eligible = accountHolderAge >= QCD_MIN_AGE;
  const notes: string[] = [];

  const factor = getLifeExpectancyFactor(Math.max(accountHolderAge, 72));
  const currentYearRMD = accountHolderAge >= 72 ? accountBalance / factor : 0;

  const effectiveQCD = Math.min(proposedQCDAmount, QCD_MAX, accountBalance);

  const rmdSatisfied = effectiveQCD >= currentYearRMD;
  const rmdRemaining = Math.max(0, currentYearRMD - effectiveQCD);

  const taxSavings = effectiveQCD * marginalTaxRate;

  const stdDed = standardDeduction || 14600;
  const itemDed = itemizedDeductions || 0;

  let deductionTaxBenefit = 0;
  if (itemDed + effectiveQCD > stdDed) {
    deductionTaxBenefit = Math.min(effectiveQCD, (itemDed + effectiveQCD) - stdDed) * marginalTaxRate;
  } else {
    deductionTaxBenefit = 0;
  }

  const qcdAdvantage = taxSavings - deductionTaxBenefit;

  let explanation: string;
  if (qcdAdvantage > 0) {
    explanation = `QCD provides $${Math.round(qcdAdvantage).toLocaleString()} more tax benefit than a charitable deduction because QCD excludes income entirely rather than reducing taxable income after AGI.`;
  } else if (qcdAdvantage === 0) {
    explanation = "QCD and charitable deduction provide equivalent tax benefits in this scenario.";
  } else {
    explanation = "Charitable deduction provides slightly more benefit. This is unusual — consider verifying deduction assumptions.";
  }

  if (!eligible) {
    notes.push(`Account holder is age ${accountHolderAge}. QCD eligibility begins at age 70½.`);
  } else {
    notes.push(`Account holder is eligible for QCD at age ${accountHolderAge}.`);
  }

  if (proposedQCDAmount > QCD_MAX) {
    notes.push(`Proposed QCD of $${proposedQCDAmount.toLocaleString()} exceeds annual maximum of $${QCD_MAX.toLocaleString()}. Capped at $${QCD_MAX.toLocaleString()}.`);
  }

  if (rmdSatisfied && currentYearRMD > 0) {
    notes.push(`QCD of $${Math.round(effectiveQCD).toLocaleString()} fully satisfies the $${Math.round(currentYearRMD).toLocaleString()} RMD.`);
  } else if (currentYearRMD > 0) {
    notes.push(`QCD of $${Math.round(effectiveQCD).toLocaleString()} partially satisfies RMD. Additional $${Math.round(rmdRemaining).toLocaleString()} must be withdrawn.`);
  }

  notes.push("QCD must be transferred directly from IRA custodian to qualified charity.");
  notes.push("QCD cannot be made from employer plans (401k, 403b) — only from IRAs.");

  return {
    eligible,
    accountHolderAge,
    proposedQCD: proposedQCDAmount,
    effectiveQCD: Math.round(effectiveQCD * 100) / 100,
    currentYearRMD: Math.round(currentYearRMD * 100) / 100,
    rmdSatisfied,
    rmdRemaining: Math.round(rmdRemaining * 100) / 100,
    taxSavings: Math.round(taxSavings * 100) / 100,
    comparedToCharitableDeduction: {
      qcdTaxBenefit: Math.round(taxSavings * 100) / 100,
      deductionTaxBenefit: Math.round(deductionTaxBenefit * 100) / 100,
      qcdAdvantage: Math.round(qcdAdvantage * 100) / 100,
      explanation,
    },
    notes,
  };
}

export function projectRMD(input: RMDProjectionInput): RMDProjectionResult {
  const { accountHolderDOB, accountBalance, taxYear, assumedGrowthRate, projectionYears } = input;

  const accountHolderAge = calculateAge(accountHolderDOB, taxYear);
  if (accountHolderAge < 72) {
    throw new Error(`Account holder is age ${accountHolderAge}. RMD projection starts at age 72+.`);
  }

  const notes: string[] = [];
  const projections: RMDProjection[] = [];
  let projectedBalance = accountBalance;
  let totalRMD = 0;

  for (let i = 0; i < projectionYears; i++) {
    const year = taxYear + i;
    const age = accountHolderAge + i;

    const factor = getLifeExpectancyFactor(age);
    if (factor <= 0) {
      notes.push(`No IRS table factor for age ${age}. Projection ended.`);
      break;
    }

    const rmdAmount = projectedBalance / factor;
    const withdrawalPct = projectedBalance > 0 ? (rmdAmount / projectedBalance) * 100 : 0;
    totalRMD += rmdAmount;

    projections.push({
      year,
      age,
      rmdAmount: Math.round(rmdAmount * 100) / 100,
      accountBalance: Math.round(projectedBalance * 100) / 100,
      withdrawalPercentage: Math.round(withdrawalPct * 100) / 100,
    });

    projectedBalance = projectedBalance * (1 + assumedGrowthRate) - rmdAmount;
    if (projectedBalance <= 0) {
      notes.push(`Account projected to deplete by year ${year + 1} (age ${age + 1}).`);
      projectedBalance = 0;
      break;
    }
  }

  notes.push(`Total RMD over ${projections.length} years: $${Math.round(totalRMD).toLocaleString()}.`);
  notes.push(`Ending balance: $${Math.round(projectedBalance).toLocaleString()} (assumes ${(assumedGrowthRate * 100).toFixed(1)}% growth).`);

  return {
    projections,
    totalRMDOverPeriod: Math.round(totalRMD * 100) / 100,
    endingBalance: Math.round(projectedBalance * 100) / 100,
    notes,
  };
}

export function compareStrategies(input: StrategyComparisonInput): StrategyComparisonResult {
  const {
    accountHolderDOB, accountBalance, taxYear, assumedGrowthRate,
    projectionYears, qcdAmount, marginalTaxRate,
  } = input;

  const accountHolderAge = calculateAge(accountHolderDOB, taxYear);
  if (accountHolderAge < 72) {
    throw new Error(`Account holder is age ${accountHolderAge}. Strategy comparison starts at age 72+.`);
  }

  const QCD_MAX = 105000;
  const QCD_MIN_AGE = 70.5;
  const notes: string[] = [];

  const standardProjections: RMDProjection[] = [];
  let stdBalance = accountBalance;
  let stdTotalDist = 0;
  let stdTotalTax = 0;

  const qcdProjections: RMDProjection[] = [];
  let qcdBalance = accountBalance;
  let qcdTotalDist = 0;
  let qcdTotalTax = 0;
  let qcdTotal = 0;
  let qcdTotalSavings = 0;

  for (let i = 0; i < projectionYears; i++) {
    const year = taxYear + i;
    const age = accountHolderAge + i;

    const factor = getLifeExpectancyFactor(age);
    if (factor <= 0) break;

    const stdRMD = stdBalance / factor;
    const stdTax = stdRMD * marginalTaxRate;
    stdTotalDist += stdRMD;
    stdTotalTax += stdTax;

    standardProjections.push({
      year, age,
      rmdAmount: Math.round(stdRMD * 100) / 100,
      accountBalance: Math.round(stdBalance * 100) / 100,
      withdrawalPercentage: Math.round((stdRMD / stdBalance) * 10000) / 100,
    });

    stdBalance = stdBalance * (1 + assumedGrowthRate) - stdRMD;
    if (stdBalance <= 0) { stdBalance = 0; break; }

    const qcdRMD = qcdBalance / factor;
    const yearQCD = age >= QCD_MIN_AGE ? Math.min(qcdAmount, QCD_MAX, qcdRMD) : 0;
    const taxableDist = qcdRMD - yearQCD;
    const qcdTax = taxableDist * marginalTaxRate;
    const savings = yearQCD * marginalTaxRate;

    qcdTotalDist += qcdRMD;
    qcdTotalTax += qcdTax;
    qcdTotal += yearQCD;
    qcdTotalSavings += savings;

    qcdProjections.push({
      year, age,
      rmdAmount: Math.round(qcdRMD * 100) / 100,
      accountBalance: Math.round(qcdBalance * 100) / 100,
      withdrawalPercentage: Math.round((qcdRMD / qcdBalance) * 10000) / 100,
      qcdAmount: Math.round(yearQCD * 100) / 100,
      taxableDistribution: Math.round(taxableDist * 100) / 100,
      taxSavingsFromQCD: Math.round(savings * 100) / 100,
    });

    qcdBalance = qcdBalance * (1 + assumedGrowthRate) - qcdRMD;
    if (qcdBalance <= 0) { qcdBalance = 0; break; }
  }

  const totalSavings = qcdTotalSavings;

  notes.push(`Standard withdrawal: $${Math.round(stdTotalTax).toLocaleString()} total taxes over ${standardProjections.length} years.`);
  notes.push(`QCD strategy: $${Math.round(qcdTotalTax).toLocaleString()} total taxes, saving $${Math.round(totalSavings).toLocaleString()}.`);
  notes.push(`Total charitable giving via QCD: $${Math.round(qcdTotal).toLocaleString()}.`);

  if (totalSavings > 0) {
    notes.push(`QCD strategy saves ${((totalSavings / stdTotalTax) * 100).toFixed(1)}% in total taxes compared to standard withdrawal.`);
  }

  return {
    standardWithdrawal: {
      projections: standardProjections,
      totalDistributions: Math.round(stdTotalDist * 100) / 100,
      totalTaxes: Math.round(stdTotalTax * 100) / 100,
      endingBalance: Math.round(stdBalance * 100) / 100,
    },
    qcdStrategy: {
      projections: qcdProjections,
      totalDistributions: Math.round(qcdTotalDist * 100) / 100,
      totalTaxes: Math.round(qcdTotalTax * 100) / 100,
      totalQCD: Math.round(qcdTotal * 100) / 100,
      totalTaxSavings: Math.round(qcdTotalSavings * 100) / 100,
      endingBalance: Math.round(qcdBalance * 100) / 100,
    },
    taxSavingsFromQCD: Math.round(totalSavings * 100) / 100,
    notes,
  };
}
