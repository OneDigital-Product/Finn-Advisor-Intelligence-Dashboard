export interface BudgetInput {
  mode: "pre_retirement" | "post_retirement";
  currentAge: number;
  retirementAge?: number;
  currentIncome?: number;
  annualSavingsAmount?: number;
  currentSavings?: number;
  portfolioBalance?: number;
  retirementIncome?: {
    socialSecurity: number;
    pension: number;
    dividends: number;
  };
  expenses: Record<string, number>;
  projectionYears: number;
  scenarios: {
    base: { growthRate: number; inflationRate: number };
    optimistic: { growthRate: number; inflationRate: number };
    conservative: { growthRate: number; inflationRate: number };
  };
  clientId?: string;
}

export interface ScenarioSummary {
  totalAnnualExpenses: number;
  totalAnnualIncome: number;
  annualShortfall: number;
  requiredPortfolioWithdrawal: number;
  safeWithdrawalRate: number;
  yearsUntilDepletion: number | null;
  accountBalanceAtEnd: number;
  recommendation: string;
  status: "sustainable" | "caution" | "at_risk";
}

export interface BudgetProjection {
  year: number;
  age: number;
  portfolioBalance: number;
  annualExpenses: number;
  annualIncome: number;
  requiredWithdrawal: number;
  newBalance: number;
}

export interface PreRetirementProjection {
  year: number;
  age: number;
  balance: number;
  contribution: number;
}

export interface BudgetResult {
  mode: string;
  summaryByScenario: Record<string, ScenarioSummary>;
  projections: Record<string, BudgetProjection[] | PreRetirementProjection[]>;
  expenseSummary: {
    categories: Array<{ category: string; amount: number; percentage: number }>;
    totalAnnualExpenses: number;
  };
  notes: string[];
}

function buildExpenseSummary(expenses: Record<string, number>) {
  const total = Object.values(expenses).reduce((sum, val) => sum + (val || 0), 0);
  const categoryLabels: Record<string, string> = {
    housing: "Housing",
    utilities: "Utilities",
    food: "Food & Groceries",
    transportation: "Transportation",
    healthcare: "Healthcare",
    insurance: "Insurance",
    discretionary: "Discretionary",
    other: "Other",
  };

  const categories = Object.entries(expenses)
    .filter(([, amount]) => amount > 0)
    .map(([key, amount]) => ({
      category: categoryLabels[key] || key.charAt(0).toUpperCase() + key.slice(1),
      amount: Math.round(amount * 100) / 100,
      percentage: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return { categories, totalAnnualExpenses: Math.round(total * 100) / 100 };
}

function calculatePreRetirementBudget(inputs: BudgetInput): BudgetResult {
  const {
    currentAge = 45,
    retirementAge = 65,
    annualSavingsAmount = 0,
    currentSavings = 0,
    expenses,
    scenarios,
  } = inputs;

  if (currentAge >= (retirementAge || 65)) {
    throw new Error("Current age must be less than retirement age");
  }

  const yearsUntilRetirement = (retirementAge || 65) - currentAge;
  const summaryByScenario: Record<string, ScenarioSummary> = {};
  const projections: Record<string, PreRetirementProjection[]> = {};
  const baseYear = new Date().getFullYear();

  for (const [scenarioName, scenario] of Object.entries(scenarios)) {
    const { growthRate } = scenario;
    const projectionArray: PreRetirementProjection[] = [];

    for (let i = 0; i <= yearsUntilRetirement; i++) {
      const fvSavings = currentSavings * Math.pow(1 + growthRate, i);
      const fvContributions = growthRate > 0
        ? annualSavingsAmount * ((Math.pow(1 + growthRate, i) - 1) / growthRate)
        : annualSavingsAmount * i;
      const balance = fvSavings + fvContributions;

      projectionArray.push({
        year: baseYear + i,
        age: currentAge + i,
        balance: Math.round(balance * 100) / 100,
        contribution: annualSavingsAmount,
      });
    }

    const totalAtRetirement = projectionArray[projectionArray.length - 1]?.balance || 0;

    summaryByScenario[scenarioName] = {
      totalAnnualExpenses: 0,
      totalAnnualIncome: inputs.currentIncome || 0,
      annualShortfall: 0,
      requiredPortfolioWithdrawal: 0,
      safeWithdrawalRate: 0,
      yearsUntilDepletion: null,
      accountBalanceAtEnd: Math.round(totalAtRetirement * 100) / 100,
      recommendation: `Projected savings at retirement: $${Math.round(totalAtRetirement).toLocaleString()}`,
      status: "sustainable",
    };

    projections[scenarioName] = projectionArray;
  }

  return {
    mode: "pre_retirement",
    summaryByScenario,
    projections,
    expenseSummary: buildExpenseSummary(expenses),
    notes: [
      "Pre-retirement projection assumes steady annual contributions and growth rates.",
      `Projecting ${yearsUntilRetirement} years until retirement age ${retirementAge}.`,
      "Inflation-adjusted spending will be higher in retirement than current expenses.",
      "Consider tax-advantaged accounts (401k, IRA) for retirement savings.",
    ],
  };
}

function calculatePostRetirementBudget(inputs: BudgetInput): BudgetResult {
  const {
    currentAge = 65,
    portfolioBalance = 0,
    retirementIncome = { socialSecurity: 0, pension: 0, dividends: 0 },
    expenses,
    scenarios,
    projectionYears = 30,
  } = inputs;

  if (portfolioBalance <= 0) {
    throw new Error("Portfolio balance must be greater than $0 for post-retirement analysis");
  }

  const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + (val || 0), 0);
  if (totalExpenses <= 0) {
    throw new Error("Total annual expenses must be greater than $0");
  }

  const totalFixedIncome = (retirementIncome.socialSecurity || 0) + (retirementIncome.pension || 0) + (retirementIncome.dividends || 0);

  const summaryByScenario: Record<string, ScenarioSummary> = {};
  const projections: Record<string, BudgetProjection[]> = {};
  const baseYear = new Date().getFullYear();

  for (const [scenarioName, scenario] of Object.entries(scenarios)) {
    const { growthRate, inflationRate } = scenario;

    let balance = portfolioBalance;
    let yearsUntilDepletion: number | null = null;
    const projectionArray: BudgetProjection[] = [];

    for (let year = 0; year < projectionYears; year++) {
      const age = currentAge + year;
      const inflationFactor = Math.pow(1 + inflationRate, year);
      const adjustedExpenses = totalExpenses * inflationFactor;
      const adjustedSS = (retirementIncome.socialSecurity || 0) * inflationFactor;
      const fixedPension = retirementIncome.pension || 0;
      const fixedDividends = retirementIncome.dividends || 0;
      const yearIncome = adjustedSS + fixedPension + fixedDividends;
      const requiredWithdrawal = Math.max(0, adjustedExpenses - yearIncome);

      const currentBalance = Math.max(0, balance);
      const actualWithdrawal = Math.min(requiredWithdrawal, currentBalance * (1 + growthRate));
      const newBalance = Math.max(0, currentBalance * (1 + growthRate) - actualWithdrawal);

      projectionArray.push({
        year: baseYear + year,
        age,
        portfolioBalance: Math.round(currentBalance * 100) / 100,
        annualExpenses: Math.round(adjustedExpenses * 100) / 100,
        annualIncome: Math.round(yearIncome * 100) / 100,
        requiredWithdrawal: Math.round(requiredWithdrawal * 100) / 100,
        newBalance: Math.round(newBalance * 100) / 100,
      });

      if (newBalance <= 0 && yearsUntilDepletion === null) {
        yearsUntilDepletion = year + 1;
      }

      balance = newBalance;
    }

    const firstYearShortfall = Math.max(0, totalExpenses - totalFixedIncome);
    const safeWithdrawalRate = portfolioBalance > 0 ? firstYearShortfall / portfolioBalance : 0;

    let recommendation: string;
    let status: ScenarioSummary["status"];

    if (yearsUntilDepletion !== null && yearsUntilDepletion <= projectionYears) {
      if (yearsUntilDepletion < 15) {
        recommendation = `At-risk — portfolio depletes in ${yearsUntilDepletion} years. Consider reducing expenses or increasing income.`;
        status = "at_risk";
      } else if (yearsUntilDepletion < 25) {
        recommendation = `Caution — portfolio depletes in ${yearsUntilDepletion} years. Modest adjustments recommended.`;
        status = "caution";
      } else {
        recommendation = `Potentially sustainable — portfolio lasts ${yearsUntilDepletion} years under ${scenarioName} assumptions.`;
        status = "caution";
      }
    } else {
      const endBalance = balance;
      if (endBalance > portfolioBalance * 0.5) {
        recommendation = `Very sustainable — portfolio grows under ${scenarioName} assumptions.`;
        status = "sustainable";
      } else if (endBalance > 0) {
        recommendation = `Sustainable — portfolio lasts ${projectionYears}+ years under ${scenarioName} assumptions.`;
        status = "sustainable";
      } else {
        recommendation = `Caution — portfolio is marginal under ${scenarioName} assumptions.`;
        status = "caution";
      }
    }

    summaryByScenario[scenarioName] = {
      totalAnnualExpenses: Math.round(totalExpenses * 100) / 100,
      totalAnnualIncome: Math.round(totalFixedIncome * 100) / 100,
      annualShortfall: Math.round(firstYearShortfall * 100) / 100,
      requiredPortfolioWithdrawal: Math.round(firstYearShortfall * 100) / 100,
      safeWithdrawalRate: Math.round(safeWithdrawalRate * 10000) / 100,
      yearsUntilDepletion,
      accountBalanceAtEnd: Math.round(balance * 100) / 100,
      recommendation,
      status,
    };

    projections[scenarioName] = projectionArray;
  }

  return {
    mode: "post_retirement",
    summaryByScenario,
    projections,
    expenseSummary: buildExpenseSummary(expenses),
    notes: [
      "Social Security is indexed to inflation in this projection.",
      "Pension and dividend income are assumed fixed (not inflation-adjusted).",
      "All expenses inflate at the same rate; healthcare costs may exceed general inflation in practice.",
      "Results are estimates — actual experience may differ based on market conditions and personal circumstances.",
      "Withdrawals assume gross amounts before taxes. Tax impact is not modeled.",
    ],
  };
}

export function calculateBudget(inputs: BudgetInput): BudgetResult {
  if (!inputs.mode || !["pre_retirement", "post_retirement"].includes(inputs.mode)) {
    throw new Error("Please select a valid calculation mode (pre_retirement or post_retirement)");
  }
  if (!inputs.expenses || Object.keys(inputs.expenses).length === 0) {
    throw new Error("Please provide at least one expense category");
  }
  if (!inputs.scenarios || !inputs.scenarios.base || !inputs.scenarios.optimistic || !inputs.scenarios.conservative) {
    throw new Error("All three scenario assumptions (base, optimistic, conservative) are required");
  }
  const age = inputs.currentAge;
  if (!age || !Number.isFinite(age) || age < 18 || age > 120) {
    throw new Error("Current age must be between 18 and 120");
  }

  if (inputs.mode === "pre_retirement") {
    return calculatePreRetirementBudget(inputs);
  }
  return calculatePostRetirementBudget(inputs);
}
