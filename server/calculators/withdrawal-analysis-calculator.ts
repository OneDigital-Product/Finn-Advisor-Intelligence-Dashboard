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

const STANDARD_DEDUCTION_2024: Record<string, number> = {
  single: 14600,
  married_filing_jointly: 29200,
};

const UNIFORM_LIFETIME_TABLE: Record<number, number> = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0,
  79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0,
  86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8,
  93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4,
  101: 6.0, 102: 5.6, 103: 5.2, 104: 4.9, 105: 4.6, 106: 4.3, 107: 4.1,
  108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4, 112: 3.3, 113: 3.1, 114: 3.0,
  115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3, 120: 2.0,
};

const STATE_TAX_RATES: Record<string, { name: string; rate: number; hasCapGains: boolean; capGainsRate: number }> = {
  CA: { name: "California", rate: 0.0930, hasCapGains: true, capGainsRate: 0.0930 },
  NY: { name: "New York", rate: 0.0685, hasCapGains: true, capGainsRate: 0.0685 },
  TX: { name: "Texas", rate: 0, hasCapGains: false, capGainsRate: 0 },
  FL: { name: "Florida", rate: 0, hasCapGains: false, capGainsRate: 0 },
  NJ: { name: "New Jersey", rate: 0.0637, hasCapGains: true, capGainsRate: 0.0637 },
  IL: { name: "Illinois", rate: 0.0495, hasCapGains: true, capGainsRate: 0.0495 },
  PA: { name: "Pennsylvania", rate: 0.0307, hasCapGains: true, capGainsRate: 0.0307 },
  MA: { name: "Massachusetts", rate: 0.0500, hasCapGains: true, capGainsRate: 0.0900 },
  WA: { name: "Washington", rate: 0, hasCapGains: true, capGainsRate: 0.07 },
  CT: { name: "Connecticut", rate: 0.0699, hasCapGains: true, capGainsRate: 0.0699 },
};

const IRMAA_THRESHOLDS_SINGLE = [
  { magi: 103000, partBSurcharge: 0, partDSurcharge: 0 },
  { magi: 103000, partBSurcharge: 65.90 * 12, partDSurcharge: 12.90 * 12 },
  { magi: 129000, partBSurcharge: 164.80 * 12, partDSurcharge: 33.30 * 12 },
  { magi: 161000, partBSurcharge: 263.70 * 12, partDSurcharge: 53.80 * 12 },
  { magi: 193000, partBSurcharge: 362.60 * 12, partDSurcharge: 74.20 * 12 },
  { magi: 500000, partBSurcharge: 395.60 * 12, partDSurcharge: 81.00 * 12 },
];

const IRMAA_THRESHOLDS_MFJ = [
  { magi: 206000, partBSurcharge: 0, partDSurcharge: 0 },
  { magi: 206000, partBSurcharge: 65.90 * 12, partDSurcharge: 12.90 * 12 },
  { magi: 258000, partBSurcharge: 164.80 * 12, partDSurcharge: 33.30 * 12 },
  { magi: 322000, partBSurcharge: 263.70 * 12, partDSurcharge: 53.80 * 12 },
  { magi: 386000, partBSurcharge: 362.60 * 12, partDSurcharge: 74.20 * 12 },
  { magi: 750000, partBSurcharge: 395.60 * 12, partDSurcharge: 81.00 * 12 },
];

const SS_THRESHOLD_SINGLE_50 = 25000;
const SS_THRESHOLD_SINGLE_85 = 34000;
const SS_THRESHOLD_MFJ_50 = 32000;
const SS_THRESHOLD_MFJ_85 = 44000;
const NIIT_THRESHOLD_SINGLE = 200000;
const NIIT_THRESHOLD_MFJ = 250000;
const NIIT_RATE = 0.038;

export interface WithdrawalAccount {
  name: string;
  type: "roth" | "taxable" | "traditional_ira" | "401k";
  balance: number;
  costBasis?: number;
  unrealizedGains?: number;
  annualContributions?: number;
}

export interface WithdrawalAnalysisInput {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  filingStatus: "single" | "married_filing_jointly";
  annualSpendingNeed: number;
  socialSecurityBenefit: number;
  pensionIncome: number;
  otherIncome: number;
  accounts: WithdrawalAccount[];
  stateOfResidence: string;
  expectedGrowthRate: number;
  inflationRate: number;
  projectionYears: number;
  qcdAmount?: number;
}

export interface WithdrawalYearDetail {
  year: number;
  age: number;
  spendingNeed: number;
  withdrawals: Array<{
    accountName: string;
    accountType: string;
    amount: number;
    taxCost: number;
    afterTaxIncome: number;
  }>;
  rmdRequired: number;
  rmdSatisfied: boolean;
  qcdUsed: number;
  totalWithdrawn: number;
  totalTaxCost: number;
  afterTaxIncome: number;
  effectiveTaxRate: number;
  marginalRate: number;
  ssIncome: number;
  federalTax: number;
  stateTax: number;
  ordinaryIncome: number;
  capitalGains: number;
  taxableSS: number;
  irmaaSurcharge: number;
  niitTax: number;
  accountBalances: Array<{
    accountName: string;
    accountType: string;
    startBalance: number;
    endBalance: number;
    declinePercent: number;
  }>;
  depletionWarnings: string[];
}

export interface TaxBracketFillResult {
  currentBracketRate: number;
  nextBracketRate: number;
  bracketRoom: number;
  recommendedIRAWithdrawal: number;
  taxCostOfFilling: number;
  tenYearProjection: Array<{
    year: number;
    bracketRoom: number;
    fillAmount: number;
    taxCostOptimized: number;
    taxCostUnoptimized: number;
    cumulativeSavings: number;
  }>;
  totalTenYearSavings: number;
}

export interface RothConversionWindow {
  year: number;
  age: number;
  estimatedIncome: number;
  conversionRoom: number;
  recommendedConversion: number;
  taxCost: number;
  cumulativeRothBalance: number;
  isLowIncomeYear: boolean;
}

export interface RMDCoordination {
  rmdAge: number;
  currentRMD: number;
  rmdSatisfiesCashNeed: boolean;
  excessRMD: number;
  qcdBenefit: number;
  qcdTaxSavings: number;
  strategies: Array<{
    name: string;
    rmdAmount: number;
    qcdAmount: number;
    taxableAmount: number;
    taxCost: number;
    netAfterTax: number;
  }>;
}

export interface TaxEfficiencyRanking {
  accountType: string;
  accountName: string;
  marginalTaxCost: number;
  effectiveCostPerDollar: number;
  rank: number;
  notes: string;
}

export interface StateTaxComparison {
  state: string;
  stateName: string;
  stateIncomeTaxRate: number;
  stateCapGainsRate: number;
  annualStateTax: number;
  tenYearStateTax: number;
  savingsVsCurrent: number;
}

export interface IRMAAMonitoring {
  currentMAGI: number;
  nearestThreshold: number;
  distanceToThreshold: number;
  currentSurcharge: number;
  potentialSurcharge: number;
  avoidanceStrategy: string;
}

export interface SSTaxationAnalysis {
  combinedIncome: number;
  taxablePortion: number;
  taxablePercentage: number;
  tier: "0%" | "50%" | "85%";
  roomToNextTier: number;
  taxOnSS: number;
  strategy: string;
}

export interface NIITExposure {
  modifiedAGI: number;
  niitThreshold: number;
  netInvestmentIncome: number;
  niitLiability: number;
  spreadStrategy: string;
  multiYearSavings: number;
}

export interface DynamicAdjustment {
  marketDrawdownProtocol: Array<{
    level: number;
    trigger: string;
    drawdownPercent: string;
    response: string;
    withdrawalModification: string;
  }>;
  spendingGuardrails: {
    ceiling: number;
    ceilingPercent: number;
    core: number;
    corePercent: number;
    floor: number;
    floorPercent: number;
    currentSpending: number;
    currentPercent: number;
    status: "above_ceiling" | "at_ceiling" | "core" | "at_floor" | "below_floor";
  };
  taxLawAdaptation: Array<{
    scenario: string;
    impact: string;
    adjustmentAction: string;
  }>;
}

export interface StrategyComparison {
  strategyName: string;
  description: string;
  totalTaxesPaid: number;
  totalAfterTaxIncome: number;
  portfolioLongevityYears: number;
  depletionAge: number;
  averageEffectiveRate: number;
  yearByYear: Array<{
    year: number;
    withdrawal: number;
    taxCost: number;
    afterTax: number;
    endingBalance: number;
  }>;
}

export interface WithdrawalAnalysisResult {
  yearByYearPlan: WithdrawalYearDetail[];
  bracketFilling: TaxBracketFillResult;
  rothConversionWindows: RothConversionWindow[];
  rmdCoordination: RMDCoordination;
  taxEfficiencyRanking: TaxEfficiencyRanking[];
  stateTaxComparisons: StateTaxComparison[];
  irmaaMonitoring: IRMAAMonitoring;
  ssTaxation: SSTaxationAnalysis;
  niitExposure: NIITExposure;
  dynamicAdjustments: DynamicAdjustment;
  strategyComparisons: StrategyComparison[];
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
    const inBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
    tax += inBracket * bracket.rate;
  }
  return tax;
}

function getMarginalRate(taxableIncome: number, filingStatus: string): number {
  if (taxableIncome <= 0) return 0.10;
  const brackets = getBrackets(filingStatus);
  for (const bracket of brackets) {
    if (taxableIncome >= bracket.min && taxableIncome <= bracket.max) {
      return bracket.rate;
    }
  }
  return brackets[brackets.length - 1].rate;
}

function getBracketRoom(taxableIncome: number, filingStatus: string): { room: number; currentRate: number; nextRate: number } {
  const brackets = getBrackets(filingStatus);
  if (taxableIncome <= 0) {
    return { room: brackets[0].max, currentRate: brackets[0].rate, nextRate: brackets.length > 1 ? brackets[1].rate : brackets[0].rate };
  }
  for (let i = 0; i < brackets.length; i++) {
    const b = brackets[i];
    if (taxableIncome >= b.min && taxableIncome <= b.max) {
      const room = b.max === Infinity ? 0 : b.max - taxableIncome;
      const nextRate = i + 1 < brackets.length ? brackets[i + 1].rate : b.rate;
      return { room, currentRate: b.rate, nextRate };
    }
  }
  return { room: 0, currentRate: 0.37, nextRate: 0.37 };
}

function computeSSATaxable(ssBenefit: number, otherIncome: number, filingStatus: string): number {
  if (ssBenefit <= 0) return 0;
  const combinedIncome = otherIncome + ssBenefit * 0.5;
  const t50 = filingStatus === "married_filing_jointly" ? SS_THRESHOLD_MFJ_50 : SS_THRESHOLD_SINGLE_50;
  const t85 = filingStatus === "married_filing_jointly" ? SS_THRESHOLD_MFJ_85 : SS_THRESHOLD_SINGLE_85;

  if (combinedIncome <= t50) return 0;
  if (combinedIncome <= t85) {
    return Math.min(ssBenefit * 0.5, (combinedIncome - t50) * 0.5);
  }
  const base = Math.min((t85 - t50) * 0.5, ssBenefit * 0.5);
  const extra = (combinedIncome - t85) * 0.85;
  return Math.min(ssBenefit * 0.85, base + extra);
}

function computeIRMAA(magi: number, filingStatus: string): { partBSurcharge: number; partDSurcharge: number; total: number } {
  const thresholds = filingStatus === "married_filing_jointly" ? IRMAA_THRESHOLDS_MFJ : IRMAA_THRESHOLDS_SINGLE;
  let surcharge = { partBSurcharge: 0, partDSurcharge: 0 };
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (magi > thresholds[i].magi) {
      surcharge = thresholds[i];
      break;
    }
  }
  return { ...surcharge, total: surcharge.partBSurcharge + surcharge.partDSurcharge };
}

function computeRMD(age: number, balance: number): number {
  if (age < 73) return 0;
  const factor = UNIFORM_LIFETIME_TABLE[Math.min(age, 120)] || 2.0;
  return balance / factor;
}

function computeSourceTaxCost(
  acctType: string, amount: number, acctName: string,
  currentOrdinary: number, currentCapGains: number, ssIncome: number,
  costBases: Record<string, number>, balances: Record<string, number>,
  filingStatus: string, stateRate: number, standardDeduction: number,
): number {
  if (acctType === "roth") return 0;
  if (acctType === "taxable") {
    const bal = balances[acctName] || 0;
    const basis = costBases[acctName] || 0;
    const gainRatio = bal > 0 ? Math.max(0, (bal - basis) / bal) : 0;
    if (gainRatio < 0) return 0;
    const gains = amount * gainRatio;
    const nonSS = currentOrdinary - ssIncome;
    const tOrd = Math.max(0, nonSS + computeSSATaxable(ssIncome, nonSS + currentCapGains + gains, filingStatus) - standardDeduction);
    const cgRate = tOrd > (filingStatus === "married_filing_jointly" ? 583750 : 492300) ? 0.20 :
                   tOrd > (filingStatus === "married_filing_jointly" ? 89250 : 44625) ? 0.15 : 0;
    return gains * cgRate + gains * stateRate;
  }
  const newOrdinary = currentOrdinary + amount;
  const nonSS = newOrdinary - ssIncome;
  const tOrd = Math.max(0, nonSS + computeSSATaxable(ssIncome, nonSS + currentCapGains, filingStatus) - standardDeduction);
  return amount * getMarginalRate(tOrd, filingStatus) + amount * stateRate;
}

function hasLoss(acctName: string, costBases: Record<string, number>, balances: Record<string, number>): boolean {
  const bal = balances[acctName] || 0;
  const basis = costBases[acctName] || 0;
  return basis > bal;
}

function runWithdrawalStrategy(
  input: WithdrawalAnalysisInput,
  strategyType: "roth_first" | "bracket_filling" | "sequential" | "proportional" | "optimized",
): { yearDetails: WithdrawalYearDetail[]; totalTaxes: number; totalAfterTax: number; depletionAge: number; longevityYears: number } {
  const { filingStatus, socialSecurityBenefit, pensionIncome, otherIncome, stateOfResidence, expectedGrowthRate, inflationRate, qcdAmount } = input;
  const stateRate = STATE_TAX_RATES[stateOfResidence]?.rate || 0;
  const standardDeduction = STANDARD_DEDUCTION_2024[filingStatus] || 14600;
  const years = input.projectionYears;

  const balances: Record<string, number> = {};
  const costBases: Record<string, number> = {};
  for (const acct of input.accounts) {
    balances[acct.name] = acct.balance;
    costBases[acct.name] = acct.costBasis || acct.balance * 0.6;
  }

  const yearDetails: WithdrawalYearDetail[] = [];
  let totalTaxes = 0;
  let totalAfterTax = 0;
  let depletionAge = input.currentAge + 100;
  let longevityYears = years;
  let harvestedLosses = 0;

  for (let y = 0; y < years; y++) {
    const age = input.currentAge + y;
    const spendingNeed = input.annualSpendingNeed * Math.pow(1 + inflationRate, y);
    const ssIncome = age >= 62 ? socialSecurityBenefit * Math.pow(1 + inflationRate * 0.5, y) : 0;
    const pension = pensionIncome * Math.pow(1 + inflationRate * 0.3, y);
    const otherInc = otherIncome;
    const guaranteedIncome = ssIncome + pension + otherInc;
    const netSpendingGap = Math.max(0, spendingNeed - guaranteedIncome);

    const traditionalAccounts = input.accounts.filter(a => a.type === "traditional_ira" || a.type === "401k");
    let totalTraditionalBalance = 0;
    for (const a of traditionalAccounts) {
      totalTraditionalBalance += balances[a.name] || 0;
    }
    const rmdRequired = computeRMD(age, totalTraditionalBalance);
    let rmdSatisfied = rmdRequired <= 0;
    let rmdRemaining = rmdRequired;

    const qcdUsed = qcdAmount && age >= 70.5 ? Math.min(qcdAmount, rmdRequired, 105000) : 0;
    rmdRemaining = Math.max(0, rmdRemaining - qcdUsed);

    const estimatedMarginalRate = getMarginalRate(Math.max(0, guaranteedIncome - standardDeduction), filingStatus) + stateRate;
    let cashNeeded = netSpendingGap > 0 ? netSpendingGap / Math.max(0.5, 1 - estimatedMarginalRate) : 0;

    const withdrawals: WithdrawalYearDetail["withdrawals"] = [];
    let totalOrdinaryIncome = guaranteedIncome;
    let totalCapGains = 0;

    function withdrawFrom(acctName: string, acctType: string, amount: number) {
      if (amount <= 0) return 0;
      const available = balances[acctName] || 0;
      const drawn = Math.min(amount, available);
      if (drawn <= 0) return 0;
      balances[acctName] -= drawn;

      let taxCost = 0;
      if (acctType === "roth") {
        taxCost = 0;
      } else if (acctType === "taxable") {
        const basis = costBases[acctName] || 0;
        const totalBal = available;
        const gainRatio = totalBal > 0 ? (totalBal - basis) / totalBal : 0;
        const gains = drawn * gainRatio;
        if (gains < 0) {
          const realizedLoss = Math.abs(gains);
          harvestedLosses += realizedLoss;
          const offset = Math.min(harvestedLosses, totalCapGains);
          totalCapGains -= offset;
          harvestedLosses -= offset;
          const washSaleLimitedLoss = Math.min(realizedLoss - offset, 3000);
          taxCost = -(washSaleLimitedLoss * stateRate);
        } else {
          const netGains = Math.max(0, gains - harvestedLosses);
          harvestedLosses = Math.max(0, harvestedLosses - gains);
          totalCapGains += netGains;
          const nonSS = totalOrdinaryIncome - ssIncome;
          const tOrd = Math.max(0, nonSS + computeSSATaxable(ssIncome, nonSS + totalCapGains, filingStatus) - standardDeduction);
          const cgRate = tOrd > (filingStatus === "married_filing_jointly" ? 583750 : 492300) ? 0.20 :
                         tOrd > (filingStatus === "married_filing_jointly" ? 89250 : 44625) ? 0.15 : 0;
          taxCost = netGains * cgRate + netGains * stateRate;
        }
        costBases[acctName] = Math.max(0, basis - drawn * Math.max(0, 1 - Math.max(0, gainRatio)));
      } else {
        totalOrdinaryIncome += drawn;
        taxCost = drawn * getMarginalRate(Math.max(0, totalOrdinaryIncome - standardDeduction), filingStatus) + drawn * stateRate;
      }

      withdrawals.push({
        accountName: acctName,
        accountType: acctType,
        amount: Math.round(drawn),
        taxCost: Math.round(taxCost),
        afterTaxIncome: Math.round(drawn - taxCost),
      });
      return drawn;
    }

    if (rmdRemaining > 0) {
      for (const a of traditionalAccounts) {
        if (rmdRemaining <= 0) break;
        const acctBal = balances[a.name] || 0;
        const acctRmd = computeRMD(age, acctBal);
        const drawn = withdrawFrom(a.name, a.type, Math.min(acctRmd, rmdRemaining));
        rmdRemaining -= drawn;
        cashNeeded = Math.max(0, cashNeeded - drawn);
      }
      rmdSatisfied = rmdRemaining <= 0;
    }

    if (cashNeeded > 0) {
      if (strategyType === "optimized") {
        const taxableAcctsWithLoss = input.accounts.filter(a => a.type === "taxable" && hasLoss(a.name, costBases, balances) && (balances[a.name] || 0) > 0);
        for (const a of taxableAcctsWithLoss) {
          if (cashNeeded <= 0) break;
          const drawn = withdrawFrom(a.name, a.type, cashNeeded);
          cashNeeded -= drawn;
        }

        while (cashNeeded > 0) {
          let bestAcct: typeof input.accounts[0] | null = null;
          let bestCost = Infinity;
          const testAmount = Math.min(cashNeeded, 10000);
          for (const a of input.accounts) {
            if ((balances[a.name] || 0) <= 0) continue;
            if (a.type === "traditional_ira" || a.type === "401k") {
              const currentTaxable = Math.max(0, totalOrdinaryIncome - standardDeduction);
              const { room } = getBracketRoom(currentTaxable, filingStatus);
              if (room > 0) {
                const cost = computeSourceTaxCost(a.type, Math.min(testAmount, room), a.name, totalOrdinaryIncome, totalCapGains, ssIncome, costBases, balances, filingStatus, stateRate, standardDeduction);
                if (cost < bestCost) { bestCost = cost; bestAcct = a; }
              } else {
                const cost = computeSourceTaxCost(a.type, testAmount, a.name, totalOrdinaryIncome, totalCapGains, ssIncome, costBases, balances, filingStatus, stateRate, standardDeduction);
                if (cost < bestCost) { bestCost = cost; bestAcct = a; }
              }
            } else {
              const cost = computeSourceTaxCost(a.type, testAmount, a.name, totalOrdinaryIncome, totalCapGains, ssIncome, costBases, balances, filingStatus, stateRate, standardDeduction);
              if (cost < bestCost) { bestCost = cost; bestAcct = a; }
            }
          }
          if (!bestAcct) break;
          const drawn = withdrawFrom(bestAcct.name, bestAcct.type, cashNeeded);
          cashNeeded -= drawn;
          if (drawn <= 0) break;
        }
      } else if (strategyType === "roth_first") {
        const rothAccts = input.accounts.filter(a => a.type === "roth");
        for (const a of rothAccts) {
          if (cashNeeded <= 0) break;
          const drawn = withdrawFrom(a.name, a.type, cashNeeded);
          cashNeeded -= drawn;
        }
        const taxableAccts = input.accounts.filter(a => a.type === "taxable");
        for (const a of taxableAccts) {
          if (cashNeeded <= 0) break;
          const drawn = withdrawFrom(a.name, a.type, cashNeeded);
          cashNeeded -= drawn;
        }
        for (const a of traditionalAccounts) {
          if (cashNeeded <= 0) break;
          const drawn = withdrawFrom(a.name, a.type, cashNeeded);
          cashNeeded -= drawn;
        }
      } else if (strategyType === "bracket_filling") {
        const taxableAcctsLoss = input.accounts.filter(a => a.type === "taxable" && hasLoss(a.name, costBases, balances) && (balances[a.name] || 0) > 0);
        for (const a of taxableAcctsLoss) {
          if (cashNeeded <= 0) break;
          const drawn = withdrawFrom(a.name, a.type, cashNeeded);
          cashNeeded -= drawn;
        }
        const taxableAccts = input.accounts.filter(a => a.type === "taxable" && !hasLoss(a.name, costBases, balances) && (balances[a.name] || 0) > 0);
        for (const a of taxableAccts) {
          if (cashNeeded <= 0) break;
          const drawn = withdrawFrom(a.name, a.type, cashNeeded);
          cashNeeded -= drawn;
        }
        const currentTaxable = Math.max(0, totalOrdinaryIncome - standardDeduction);
        const { room } = getBracketRoom(currentTaxable, filingStatus);
        let fillRemaining = Math.min(room, cashNeeded);
        for (const a of traditionalAccounts) {
          if (fillRemaining <= 0 || cashNeeded <= 0) break;
          const drawAmt = Math.min(fillRemaining, cashNeeded);
          const drawn = withdrawFrom(a.name, a.type, drawAmt);
          cashNeeded -= drawn;
          fillRemaining -= drawn;
        }
        const rothAccts = input.accounts.filter(a => a.type === "roth");
        for (const a of rothAccts) {
          if (cashNeeded <= 0) break;
          const drawn = withdrawFrom(a.name, a.type, cashNeeded);
          cashNeeded -= drawn;
        }
        for (const a of traditionalAccounts) {
          if (cashNeeded <= 0) break;
          const drawn = withdrawFrom(a.name, a.type, cashNeeded);
          cashNeeded -= drawn;
        }
      } else if (strategyType === "sequential") {
        for (const a of traditionalAccounts) {
          if (cashNeeded <= 0) break;
          const drawn = withdrawFrom(a.name, a.type, cashNeeded);
          cashNeeded -= drawn;
        }
        const taxableAccts = input.accounts.filter(a => a.type === "taxable");
        for (const a of taxableAccts) {
          if (cashNeeded <= 0) break;
          const drawn = withdrawFrom(a.name, a.type, cashNeeded);
          cashNeeded -= drawn;
        }
        const rothAccts = input.accounts.filter(a => a.type === "roth");
        for (const a of rothAccts) {
          if (cashNeeded <= 0) break;
          const drawn = withdrawFrom(a.name, a.type, cashNeeded);
          cashNeeded -= drawn;
        }
      } else {
        const totalBal = Object.values(balances).reduce((s, v) => s + v, 0);
        if (totalBal > 0) {
          for (const a of input.accounts) {
            if (cashNeeded <= 0) break;
            const proportion = (balances[a.name] || 0) / totalBal;
            const drawn = withdrawFrom(a.name, a.type, cashNeeded * proportion);
            cashNeeded -= drawn;
          }
        }
      }
    }

    function computeYearTaxes() {
      const nonSS = totalOrdinaryIncome - ssIncome;
      const tSS = computeSSATaxable(ssIncome, nonSS + totalCapGains, filingStatus);
      const tOrdinary = Math.max(0, nonSS + tSS - standardDeduction);
      const fedOrdTax = computeFederalTax(tOrdinary, filingStatus);
      const cgRate = tOrdinary > (filingStatus === "married_filing_jointly" ? 583750 : 492300) ? 0.20 :
                     tOrdinary > (filingStatus === "married_filing_jointly" ? 89250 : 44625) ? 0.15 : 0;
      const fedCGTax = totalCapGains * cgRate;
      const fedTax = fedOrdTax + fedCGTax;
      const stTax = Math.max(0, nonSS + totalCapGains) * stateRate;
      const m = nonSS + ssIncome + totalCapGains;
      const irm = computeIRMAA(m, filingStatus);
      const niitTh = filingStatus === "married_filing_jointly" ? NIIT_THRESHOLD_MFJ : NIIT_THRESHOLD_SINGLE;
      const nii = totalCapGains;
      const mExcess = Math.max(0, m - niitTh);
      const nTax = mExcess > 0 ? Math.min(nii, mExcess) * NIIT_RATE : 0;
      return {
        nonSSIncome: nonSS, taxableSS: tSS, taxableOrdinary: tOrdinary,
        federalTax: fedTax, stateTax: stTax, magi: m, irmaa: irm, niitTax: nTax,
        yearTotalTax: fedTax + stTax + irm.total + nTax,
      };
    }

    let taxes = computeYearTaxes();
    let totalWithdrawn = withdrawals.reduce((s, w) => s + w.amount, 0);
    let afterTax = guaranteedIncome + totalWithdrawn - taxes.yearTotalTax;

    if (afterTax < spendingNeed) {
      const shortfall = spendingNeed - afterTax;
      const grossUpRate = Math.max(0.5, 1 - estimatedMarginalRate);
      const additionalGross = shortfall / grossUpRate;
      let additionalNeeded = additionalGross;
      for (const a of input.accounts) {
        if (additionalNeeded <= 0) break;
        const drawn = withdrawFrom(a.name, a.type, additionalNeeded);
        additionalNeeded -= drawn;
      }
      taxes = computeYearTaxes();
      totalWithdrawn = withdrawals.reduce((s, w) => s + w.amount, 0);
      afterTax = guaranteedIncome + totalWithdrawn - taxes.yearTotalTax;
    }

    const { federalTax, stateTax, niitTax, yearTotalTax } = taxes;

    for (const acct of input.accounts) {
      balances[acct.name] = (balances[acct.name] || 0) * (1 + expectedGrowthRate);
    }

    const accountBalances: WithdrawalYearDetail["accountBalances"] = input.accounts.map(a => {
      const startBal = (balances[a.name] || 0) / (1 + expectedGrowthRate);
      const endBal = balances[a.name] || 0;
      return {
        accountName: a.name,
        accountType: a.type,
        startBalance: Math.round(startBal),
        endBalance: Math.round(endBal),
        declinePercent: startBal > 0 ? Math.round(((startBal - endBal) / startBal) * 100) : 0,
      };
    });

    const totalEndBalance = accountBalances.reduce((s, a) => s + a.endBalance, 0);
    const depletionWarnings: string[] = [];
    for (const ab of accountBalances) {
      if (ab.endBalance <= 0 && ab.startBalance > 0) {
        depletionWarnings.push(`${ab.accountName} depleted in year ${y + 1}`);
      }
    }
    if (totalEndBalance <= 0 && depletionAge > age) {
      depletionAge = age;
      longevityYears = y + 1;
    }

    totalTaxes += yearTotalTax;
    totalAfterTax += afterTax;

    const totalGross = guaranteedIncome + totalWithdrawn;
    const effectiveTaxRate = totalGross > 0 ? yearTotalTax / totalGross : 0;
    const yearMarginalRate = getMarginalRate(taxes.taxableOrdinary, filingStatus);

    yearDetails.push({
      year: y + 1,
      age,
      spendingNeed: Math.round(spendingNeed),
      withdrawals,
      rmdRequired: Math.round(rmdRequired),
      rmdSatisfied,
      qcdUsed: Math.round(qcdUsed),
      totalWithdrawn: Math.round(totalWithdrawn),
      totalTaxCost: Math.round(yearTotalTax),
      afterTaxIncome: Math.round(afterTax),
      effectiveTaxRate: Math.round(effectiveTaxRate * 10000) / 100,
      marginalRate: Math.round(yearMarginalRate * 100) / 100,
      ssIncome: Math.round(ssIncome),
      federalTax: Math.round(federalTax),
      stateTax: Math.round(stateTax),
      ordinaryIncome: Math.round(totalOrdinaryIncome),
      capitalGains: Math.round(totalCapGains),
      taxableSS: Math.round(taxes.taxableSS),
      irmaaSurcharge: Math.round(taxes.irmaa.total),
      niitTax: Math.round(niitTax),
      accountBalances,
      depletionWarnings,
    });
  }

  return { yearDetails, totalTaxes: Math.round(totalTaxes), totalAfterTax: Math.round(totalAfterTax), depletionAge, longevityYears };
}

export function calculateWithdrawalAnalysis(input: WithdrawalAnalysisInput): WithdrawalAnalysisResult {
  const { filingStatus, socialSecurityBenefit, pensionIncome, otherIncome, stateOfResidence, expectedGrowthRate, inflationRate, currentAge, retirementAge, annualSpendingNeed, qcdAmount } = input;
  const stateInfo = STATE_TAX_RATES[stateOfResidence] || { name: stateOfResidence, rate: 0, hasCapGains: false, capGainsRate: 0 };
  const stateRate = stateInfo.rate;
  const standardDeduction = STANDARD_DEDUCTION_2024[filingStatus] || 14600;
  const notes: string[] = [];

  type StrategyType = "roth_first" | "bracket_filling" | "sequential" | "proportional" | "optimized";
  const strategies: Array<{ type: StrategyType; result: ReturnType<typeof runWithdrawalStrategy> }> = [];
  for (const sType of ["optimized", "roth_first", "bracket_filling", "sequential", "proportional"] as const) {
    strategies.push({ type: sType, result: runWithdrawalStrategy(input, sType) });
  }
  const bestStrategy = strategies.reduce((best, s) =>
    s.result.totalAfterTax > best.result.totalAfterTax ? s : best
  );
  const primary = bestStrategy.result;
  const yearByYearPlan = primary.yearDetails;
  notes.push(`Optimal strategy: ${bestStrategy.type.replace(/_/g, " ")} (highest after-tax income: $${primary.totalAfterTax.toLocaleString()})`);

  const baseIncome = socialSecurityBenefit + pensionIncome + otherIncome;
  const nonSSBase = pensionIncome + otherIncome;
  const taxableSSBase = computeSSATaxable(socialSecurityBenefit, nonSSBase, filingStatus);
  const taxableBaseIncome = Math.max(0, nonSSBase + taxableSSBase - standardDeduction);
  const { room: bracketRoom, currentRate, nextRate } = getBracketRoom(taxableBaseIncome, filingStatus);
  const traditionalBalance = input.accounts.filter(a => a.type === "traditional_ira" || a.type === "401k").reduce((s, a) => s + a.balance, 0);
  const recommendedFill = Math.min(bracketRoom, traditionalBalance);
  const fillTaxCost = recommendedFill * currentRate + recommendedFill * stateRate;

  const tenYearBracketProjection: TaxBracketFillResult["tenYearProjection"] = [];
  let cumulativeSavings = 0;
  for (let y = 0; y < 10; y++) {
    const futureNonSS = nonSSBase * Math.pow(1 + inflationRate * 0.5, y);
    const futureSS = socialSecurityBenefit * Math.pow(1 + inflationRate * 0.5, y);
    const futureTaxableSS = computeSSATaxable(futureSS, futureNonSS, filingStatus);
    const futureTaxable = Math.max(0, futureNonSS + futureTaxableSS - standardDeduction * Math.pow(1 + inflationRate, y));
    const { room } = getBracketRoom(futureTaxable, filingStatus);
    const fillAmt = Math.min(room, traditionalBalance * Math.pow(1 - 0.05, y));
    const optTax = fillAmt * currentRate + fillAmt * stateRate;
    const unoptTax = fillAmt * nextRate + fillAmt * stateRate;
    const savings = unoptTax - optTax;
    cumulativeSavings += savings;
    tenYearBracketProjection.push({
      year: y + 1,
      bracketRoom: Math.round(room),
      fillAmount: Math.round(fillAmt),
      taxCostOptimized: Math.round(optTax),
      taxCostUnoptimized: Math.round(unoptTax),
      cumulativeSavings: Math.round(cumulativeSavings),
    });
  }

  const bracketFilling: TaxBracketFillResult = {
    currentBracketRate: currentRate,
    nextBracketRate: nextRate,
    bracketRoom: Math.round(bracketRoom),
    recommendedIRAWithdrawal: Math.round(recommendedFill),
    taxCostOfFilling: Math.round(fillTaxCost),
    tenYearProjection: tenYearBracketProjection,
    totalTenYearSavings: Math.round(cumulativeSavings),
  };

  const rothConversionWindows: RothConversionWindow[] = [];
  let cumulativeRothBalance = input.accounts.filter(a => a.type === "roth").reduce((s, a) => s + a.balance, 0);
  const rmdStartAge = 73;
  let remainingTraditional = traditionalBalance;
  for (let ladder = 0; ladder < 5; ladder++) {
    const age = currentAge + ladder;
    const y = ladder;
    const isRetired = age >= retirementAge;
    const yearNonSS = isRetired ? nonSSBase : nonSSBase * 1.5;
    const yearSS = isRetired ? socialSecurityBenefit : socialSecurityBenefit;
    const yearTaxableSS = computeSSATaxable(yearSS, yearNonSS, filingStatus);
    const incomeInYear = yearNonSS + yearSS;
    const taxableInYear = Math.max(0, yearNonSS + yearTaxableSS - standardDeduction);
    const { room } = getBracketRoom(taxableInYear, filingStatus);
    const isLowIncome = isRetired && age < rmdStartAge && incomeInYear < annualSpendingNeed;
    const ladderTarget = remainingTraditional / (5 - ladder);
    const conversionAmount = isLowIncome
      ? Math.min(room, ladderTarget, remainingTraditional)
      : Math.min(room * 0.75, ladderTarget, remainingTraditional);
    const taxCost = conversionAmount * getMarginalRate(taxableInYear + conversionAmount, filingStatus) + conversionAmount * stateRate;
    cumulativeRothBalance = cumulativeRothBalance * (1 + expectedGrowthRate) + conversionAmount;
    remainingTraditional = Math.max(0, remainingTraditional - conversionAmount);

    rothConversionWindows.push({
      year: y + 1,
      age,
      estimatedIncome: Math.round(incomeInYear),
      conversionRoom: Math.round(room),
      recommendedConversion: Math.round(conversionAmount),
      taxCost: Math.round(taxCost),
      cumulativeRothBalance: Math.round(cumulativeRothBalance),
      isLowIncomeYear: isLowIncome,
    });
  }

  const totalTraditionalBal = input.accounts.filter(a => a.type === "traditional_ira" || a.type === "401k").reduce((s, a) => s + a.balance, 0);
  const currentRMD = computeRMD(currentAge, totalTraditionalBal);
  const qcdBenefit = qcdAmount && currentAge >= 70.5 ? Math.min(qcdAmount, currentRMD, 105000) : 0;
  const marginalRate = getMarginalRate(Math.max(0, baseIncome + currentRMD - standardDeduction), filingStatus);
  const qcdTaxSavings = qcdBenefit * marginalRate + qcdBenefit * stateRate;

  const rmdCoordination: RMDCoordination = {
    rmdAge: 73,
    currentRMD: Math.round(currentRMD),
    rmdSatisfiesCashNeed: currentRMD >= annualSpendingNeed - baseIncome,
    excessRMD: Math.round(Math.max(0, currentRMD - (annualSpendingNeed - baseIncome))),
    qcdBenefit: Math.round(qcdBenefit),
    qcdTaxSavings: Math.round(qcdTaxSavings),
    strategies: [
      {
        name: "Standard RMD",
        rmdAmount: Math.round(currentRMD),
        qcdAmount: 0,
        taxableAmount: Math.round(currentRMD),
        taxCost: Math.round(currentRMD * marginalRate + currentRMD * stateRate),
        netAfterTax: Math.round(currentRMD - (currentRMD * marginalRate + currentRMD * stateRate)),
      },
      {
        name: "RMD with QCD",
        rmdAmount: Math.round(currentRMD),
        qcdAmount: Math.round(qcdBenefit),
        taxableAmount: Math.round(currentRMD - qcdBenefit),
        taxCost: Math.round((currentRMD - qcdBenefit) * marginalRate + (currentRMD - qcdBenefit) * stateRate),
        netAfterTax: Math.round(currentRMD - qcdBenefit - ((currentRMD - qcdBenefit) * marginalRate + (currentRMD - qcdBenefit) * stateRate)),
      },
      {
        name: "RMD + Roth Conversion",
        rmdAmount: Math.round(currentRMD),
        qcdAmount: 0,
        taxableAmount: Math.round(currentRMD + bracketRoom * 0.5),
        taxCost: Math.round((currentRMD + bracketRoom * 0.5) * marginalRate + (currentRMD + bracketRoom * 0.5) * stateRate),
        netAfterTax: Math.round(currentRMD - ((currentRMD + bracketRoom * 0.5) * marginalRate + (currentRMD + bracketRoom * 0.5) * stateRate)),
      },
    ],
  };

  const taxEfficiencyRanking: TaxEfficiencyRanking[] = input.accounts.map((a, i) => {
    let costPerDollar: number;
    let rankNotes: string;
    if (a.type === "roth") {
      costPerDollar = 0;
      rankNotes = "Tax-free withdrawals. No impact on MAGI or IRMAA.";
    } else if (a.type === "taxable") {
      const gainRatio = a.balance > 0 && a.unrealizedGains ? a.unrealizedGains / a.balance : 0.3;
      costPerDollar = gainRatio * (0.15 + stateRate);
      rankNotes = `${Math.round(gainRatio * 100)}% gain ratio. LTCG rate applies. May trigger NIIT.`;
    } else {
      costPerDollar = marginalRate + stateRate;
      rankNotes = "Fully taxable as ordinary income. Increases MAGI for IRMAA/SS.";
    }
    return {
      accountType: a.type,
      accountName: a.name,
      marginalTaxCost: Math.round(costPerDollar * 10000) / 100,
      effectiveCostPerDollar: Math.round(costPerDollar * 100) / 100,
      rank: 0,
      notes: rankNotes,
    };
  }).sort((a, b) => a.effectiveCostPerDollar - b.effectiveCostPerDollar)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const annualIncome = baseIncome + annualSpendingNeed * 0.3;
  const stateTaxComparisons: StateTaxComparison[] = Object.entries(STATE_TAX_RATES).map(([code, info]) => {
    const annualStateTax = annualIncome * info.rate;
    const currentStateTax = annualIncome * stateRate;
    return {
      state: code,
      stateName: info.name,
      stateIncomeTaxRate: info.rate,
      stateCapGainsRate: info.capGainsRate,
      annualStateTax: Math.round(annualStateTax),
      tenYearStateTax: Math.round(annualStateTax * 10),
      savingsVsCurrent: Math.round((currentStateTax - annualStateTax) * 10),
    };
  }).sort((a, b) => a.annualStateTax - b.annualStateTax);

  const magi = baseIncome + (yearByYearPlan[0]?.totalWithdrawn || 0);
  const irmaaResult = computeIRMAA(magi, filingStatus);
  const irmaaThresholds = filingStatus === "married_filing_jointly" ? IRMAA_THRESHOLDS_MFJ : IRMAA_THRESHOLDS_SINGLE;
  let nearestThreshold = irmaaThresholds[0].magi;
  for (const t of irmaaThresholds) {
    if (magi < t.magi) {
      nearestThreshold = t.magi;
      break;
    }
  }

  const irmaaMonitoring: IRMAAMonitoring = {
    currentMAGI: Math.round(magi),
    nearestThreshold,
    distanceToThreshold: Math.round(nearestThreshold - magi),
    currentSurcharge: Math.round(irmaaResult.total),
    potentialSurcharge: Math.round(computeIRMAA(magi + 20000, filingStatus).total),
    avoidanceStrategy: irmaaResult.total > 0
      ? "Consider reducing MAGI through Roth withdrawals, QCDs, or deferring taxable income."
      : `Stay below $${nearestThreshold.toLocaleString()} MAGI to avoid surcharges.`,
  };

  const ssCombinedIncome = (baseIncome - socialSecurityBenefit) + socialSecurityBenefit * 0.5;
  const ssT50 = filingStatus === "married_filing_jointly" ? SS_THRESHOLD_MFJ_50 : SS_THRESHOLD_SINGLE_50;
  const ssT85 = filingStatus === "married_filing_jointly" ? SS_THRESHOLD_MFJ_85 : SS_THRESHOLD_SINGLE_85;
  const ssTaxablePortion = computeSSATaxable(socialSecurityBenefit, baseIncome - socialSecurityBenefit, filingStatus);
  const ssPercentTaxable = socialSecurityBenefit > 0 ? (ssTaxablePortion / socialSecurityBenefit) * 100 : 0;
  const ssTier = ssPercentTaxable <= 0 ? "0%" : ssPercentTaxable <= 50 ? "50%" : "85%";
  const ssRoomToNext = ssTier === "0%" ? Math.round(ssT50 - ssCombinedIncome) : ssTier === "50%" ? Math.round(ssT85 - ssCombinedIncome) : 0;
  const ssTaxOnSS = ssTaxablePortion * getMarginalRate(Math.max(0, baseIncome - standardDeduction + ssTaxablePortion), filingStatus);

  const ssTaxation: SSTaxationAnalysis = {
    combinedIncome: Math.round(ssCombinedIncome),
    taxablePortion: Math.round(ssTaxablePortion),
    taxablePercentage: Math.round(ssPercentTaxable),
    tier: ssTier,
    roomToNextTier: ssRoomToNext,
    taxOnSS: Math.round(ssTaxOnSS),
    strategy: ssTier === "0%"
      ? `Combined income is below $${ssT50.toLocaleString()}. SS benefits are tax-free. Avoid adding more than $${ssRoomToNext.toLocaleString()} in income.`
      : ssTier === "50%"
      ? `Up to 50% of SS is taxable. Keep combined income below $${ssT85.toLocaleString()} to avoid 85% taxation.`
      : "85% of SS is taxable. Consider Roth withdrawals to reduce provisional income.",
  };

  const niitThreshold = filingStatus === "married_filing_jointly" ? NIIT_THRESHOLD_MFJ : NIIT_THRESHOLD_SINGLE;
  const investmentIncome = input.accounts.filter(a => a.type === "taxable").reduce((s, a) => s + (a.unrealizedGains || a.balance * 0.3), 0) * 0.04;
  const niitLiability = magi > niitThreshold ? Math.min(investmentIncome, magi - niitThreshold) * NIIT_RATE : 0;
  const spreadYears = 3;
  const spreadSavings = niitLiability > 0 ? niitLiability * 0.3 : 0;

  const niitExposure: NIITExposure = {
    modifiedAGI: Math.round(magi),
    niitThreshold,
    netInvestmentIncome: Math.round(investmentIncome),
    niitLiability: Math.round(niitLiability),
    spreadStrategy: niitLiability > 0
      ? `Spread capital gains over ${spreadYears} years to reduce NIIT. Estimated savings: $${Math.round(spreadSavings).toLocaleString()}.`
      : "NIIT not currently triggered. Monitor as income or gains increase.",
    multiYearSavings: Math.round(spreadSavings),
  };

  const totalPortfolio = input.accounts.reduce((s, a) => s + a.balance, 0);
  const dynamicAdjustments: DynamicAdjustment = {
    marketDrawdownProtocol: [
      {
        level: 1,
        trigger: "Portfolio declines 10-15%",
        drawdownPercent: "10-15%",
        response: "Review",
        withdrawalModification: "No change. Review asset allocation and rebalance opportunistically.",
      },
      {
        level: 2,
        trigger: "Portfolio declines 15-25%",
        drawdownPercent: "15-25%",
        response: "Defer discretionary",
        withdrawalModification: "Reduce withdrawals by 10-15%. Defer non-essential spending. Prioritize Roth withdrawals.",
      },
      {
        level: 3,
        trigger: "Portfolio declines 25-40%",
        drawdownPercent: "25-40%",
        response: "Modify withdrawal rate",
        withdrawalModification: "Reduce to 3% withdrawal rate. Use cash reserves and Roth first. Suspend Roth conversions.",
      },
      {
        level: 4,
        trigger: "Portfolio declines 40%+",
        drawdownPercent: "40%+",
        response: "Tactical rebalance",
        withdrawalModification: "Minimum essential withdrawals only. Tax-loss harvest aggressively. Consider part-time income or reverse mortgage.",
      },
    ],
    spendingGuardrails: {
      ceiling: Math.round(totalPortfolio * 0.055),
      ceilingPercent: 5.5,
      core: Math.round(totalPortfolio * 0.04),
      corePercent: 4.0,
      floor: Math.round(totalPortfolio * 0.03),
      floorPercent: 3.0,
      currentSpending: Math.round(annualSpendingNeed),
      currentPercent: totalPortfolio > 0 ? Math.round((annualSpendingNeed / totalPortfolio) * 1000) / 10 : 0,
      status: annualSpendingNeed > totalPortfolio * 0.055
        ? "above_ceiling"
        : annualSpendingNeed > totalPortfolio * 0.045
        ? "at_ceiling"
        : annualSpendingNeed > totalPortfolio * 0.035
        ? "core"
        : annualSpendingNeed > totalPortfolio * 0.03
        ? "at_floor"
        : "below_floor",
    },
    taxLawAdaptation: [
      {
        scenario: "TCJA Sunset (2026)",
        impact: "Tax brackets revert to higher pre-2017 rates. Standard deduction reduced.",
        adjustmentAction: "Accelerate Roth conversions before 2026. Front-load traditional IRA withdrawals at current lower rates.",
      },
      {
        scenario: "Capital Gains Rate Increase",
        impact: "LTCG rate may increase from 15%/20% to ordinary income rates for high earners.",
        adjustmentAction: "Realize gains at current rates. Consider installment sales. Shift to tax-loss harvesting.",
      },
      {
        scenario: "RMD Age Changes",
        impact: "SECURE Act 2.0 may further delay RMD start age.",
        adjustmentAction: "Extended Roth conversion window. Adjust withdrawal sequencing for longer tax-deferred growth.",
      },
      {
        scenario: "Estate Tax Exemption Reduction",
        impact: "Exemption may drop from $13.61M to ~$7M per person.",
        adjustmentAction: "Accelerate gifting strategies. Consider irrevocable trusts and CRTs for excess assets.",
      },
    ],
  };

  const strategyMeta: Record<string, { name: string; desc: string }> = {
    optimized: { name: "Dynamic Optimized", desc: "Per-year source selection based on marginal tax cost, with loss harvesting and bracket-aware IRA draws" },
    roth_first: { name: "Roth-First", desc: "Withdraw from Roth accounts first, then taxable, then tax-deferred" },
    bracket_filling: { name: "Bracket-Filling", desc: "Fill current tax bracket with IRA withdrawals, supplement with taxable/Roth" },
    sequential: { name: "Traditional-First", desc: "Withdraw from traditional IRA/401k first, then taxable, then Roth" },
    proportional: { name: "Proportional", desc: "Withdraw proportionally from all account types based on balance" },
  };

  const strategyComparisons: StrategyComparison[] = strategies.map(s => {
    const meta = strategyMeta[s.type];
    const result = s.result;
    return {
      strategyName: meta.name,
      description: meta.desc,
      totalTaxesPaid: result.totalTaxes,
      totalAfterTaxIncome: result.totalAfterTax,
      portfolioLongevityYears: result.longevityYears,
      depletionAge: result.depletionAge,
      averageEffectiveRate: result.totalAfterTax > 0 ? Math.round((result.totalTaxes / (result.totalTaxes + result.totalAfterTax)) * 10000) / 100 : 0,
      yearByYear: result.yearDetails.map(yd => ({
        year: yd.year,
        withdrawal: yd.totalWithdrawn,
        taxCost: yd.totalTaxCost,
        afterTax: yd.afterTaxIncome,
        endingBalance: yd.accountBalances.reduce((s, a) => s + a.endBalance, 0),
      })),
    };
  });

  notes.push("Analysis uses 2024 federal tax brackets. Actual future brackets may differ.");
  notes.push(`State tax analysis uses ${stateInfo.name} (${(stateRate * 100).toFixed(1)}%) income tax rate.`);
  if (currentAge >= 73) notes.push("RMD coordination is active. Required minimum distributions are factored into all strategies.");
  if (currentRMD > annualSpendingNeed - baseIncome) notes.push("RMD exceeds cash need. Consider reinvesting excess or QCD strategies.");
  notes.push("IRMAA surcharges use 2024 thresholds based on MAGI from two years prior.");
  notes.push("Dynamic adjustment triggers are guidelines. Actual responses should be discussed with your advisor.");

  return {
    yearByYearPlan,
    bracketFilling,
    rothConversionWindows,
    rmdCoordination,
    taxEfficiencyRanking,
    stateTaxComparisons,
    irmaaMonitoring,
    ssTaxation,
    niitExposure,
    dynamicAdjustments,
    strategyComparisons,
    notes,
  };
}
