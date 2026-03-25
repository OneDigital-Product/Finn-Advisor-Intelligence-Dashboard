export interface RetirementAnalysisInput {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  portfolioValue: number;
  annualSpending: number;
  expectedReturn: number;
  inflationRate: number;
  preRetirementContribution: number;
  socialSecurityPIA?: number;
  socialSecurityClaimingAge?: number;
  spousePIA?: number;
  spouseClaimingAge?: number;
  pensionAnnualBenefit?: number;
  pensionLumpSum?: number;
  pensionStartAge?: number;
  rentalIncome?: number;
  rentalVacancyRate?: number;
  filingStatus?: "single" | "married_filing_jointly";
  traditionalBalance?: number;
  rothBalance?: number;
  taxableBalance?: number;
  marginalTaxRate?: number;
  stateRate?: number;
  returnVolatility?: number;
}

export interface YearProjection {
  age: number;
  year: number;
  portfolioBalance: number;
  incomeTotal: number;
  spendingTotal: number;
  withdrawalNeeded: number;
  inflationMultiplier: number;
}

export interface ScenarioProjection {
  name: string;
  description: string;
  yearByYear: YearProjection[];
  terminalValue: number;
  successProbability: number;
  portfolioDepletionAge: number | null;
  averageAnnualBalance: number;
  firstYearOfDecline: number | null;
}

export interface SSClaimingOption {
  claimingAge: number;
  monthlyBenefit: number;
  annualBenefit: number;
  breakEvenAge: number | null;
  lifetimePresentValue: number;
  reductionOrBonus: string;
}

export interface CouplesSSCombo {
  primaryAge: number;
  spouseAge: number;
  combinedAnnual: number;
  combinedLifetimePV: number;
  survivorBenefit: number;
}

export interface SSAnalysisResult {
  claimingOptions: SSClaimingOption[];
  optimalClaimingAge: number;
  couplesStrategy?: string;
  couplesMatrix?: CouplesSSCombo[];
  optimalCouplesCombination?: CouplesSSCombo;
}

export interface PensionComparison {
  lumpSum: {
    amount: number;
    projectedValueAt85: number;
    breakEvenAge: number | null;
  };
  singleLifeAnnuity: {
    annualPayment: number;
    totalPaymentsTo85: number;
    breakEvenAge: number | null;
  };
  jointSurvivorAnnuity: {
    annualPayment: number;
    totalPaymentsTo85: number;
    survivalBenefit: number;
  };
  hybridApproach: {
    annuityPortion: number;
    investedPortion: number;
    combinedProjectedValue: number;
  };
}

export interface PhasedRetirementPhase {
  name: string;
  startAge: number;
  endAge: number;
  earnedIncome: number;
  ssIncome: number;
  portfolioDraw: number;
  totalIncome: number;
}

export interface PhasedRetirementYear {
  age: number;
  phase: string;
  earnedIncome: number;
  ssIncome: number;
  portfolioDraw: number;
  portfolioBalance: number;
}

export interface PhasedRetirementProjection {
  phases: PhasedRetirementPhase[];
  yearByYear: PhasedRetirementYear[];
}

export interface ExpensePhase {
  name: string;
  startAge: number;
  endAge: number;
  spendingMultiplier: number;
  baseSpending: number;
  healthcareCost: number;
  totalAnnual: number;
}

export interface HealthcareYear {
  age: number;
  cost: number;
}

export interface OneTimeExpense {
  age: number;
  description: string;
  amount: number;
}

export interface LTCProbabilityEntry {
  age: number;
  probabilityOfNeed: number;
  expectedAnnualCost: number;
  weightedCost: number;
}

export interface ExpenseModelResult {
  phases: ExpensePhase[];
  healthcareProjection: HealthcareYear[];
  oneTimeExpenses: OneTimeExpense[];
  ltcProbability: LTCProbabilityEntry[];
  totalLifetimeSpending: number;
  expectedLTCCost: number;
}

export interface Remediation {
  strategy: string;
  description: string;
  impact: number;
  gapClosurePercent: number;
  feasibility: "high" | "medium" | "low";
}

export type ReadinessRating = "on_track" | "needs_attention" | "at_risk" | "critical";

export interface GapAnalysisResult {
  totalAssetsAvailable: number;
  totalRetirementNeeds: number;
  gap: number;
  fundedPercentage: number;
  successProbability: number;
  readinessRating: ReadinessRating;
  remediations: Remediation[];
}

export interface DrawdownPriority {
  order: number;
  accountType: string;
  rationale: string;
}

export interface RothLadderEntry {
  year: number;
  age: number;
  conversionAmount: number;
  taxCost: number;
  bracketUtilized: string;
  cumulativeConverted: number;
}

export interface WithdrawalYear {
  age: number;
  taxableWithdrawal: number;
  traditionalWithdrawal: number;
  rothWithdrawal: number;
  rmdAmount: number;
  totalWithdrawal: number;
  estimatedTax: number;
  afterTaxIncome: number;
  taxableBalance: number;
  traditionalBalance: number;
  rothBalance: number;
}

export interface WithdrawalSequenceResult {
  drawdownPriority: DrawdownPriority[];
  rothConversionLadder: RothLadderEntry[];
  yearByYearPlan: WithdrawalYear[];
}

export interface PassiveIncomeYear {
  age: number;
  grossIncome: number;
  netIncome: number;
  cumulativeNet: number;
  spendingCoverage: number;
}

export interface PassiveIncomeSustainability {
  grossAnnualIncome: number;
  vacancyRate: number;
  maintenanceFactor: number;
  netAnnualIncome: number;
  coverageYears: number;
  yearByYear: PassiveIncomeYear[];
}

export interface RetirementAnalysisResult {
  scenarios: ScenarioProjection[];
  socialSecurity: SSAnalysisResult;
  pension: PensionComparison | null;
  phasedRetirement: PhasedRetirementProjection;
  expenseModel: ExpenseModelResult;
  gapAnalysis: GapAnalysisResult;
  withdrawalSequence: WithdrawalSequenceResult;
  passiveIncome: PassiveIncomeSustainability | null;
}
