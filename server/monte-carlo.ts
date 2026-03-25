export interface SimulationParams {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  initialPortfolio: number;
  annualSpending: number;
  expectedReturn: number;
  returnStdDev: number;
  inflationRate: number;
  preRetirementContribution: number;
  seed?: number;
  events: Array<{
    name: string;
    type: "expense" | "income";
    amount: number;
    startAge: number;
    endAge: number | null;
    inflationAdjusted: boolean;
  }>;
}

export interface DepletionAnalysis {
  depletionAges: number[];
  averageDepletionAge: number | null;
  depletionCount: number;
  depletionRate: number;
}

export interface SimulationResults {
  successRate: number;
  numSimulations: number;
  percentilePaths: {
    ages: number[];
    p10: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p90: number[];
  };
  finalBalanceStats: {
    mean: number;
    median: number;
    p10: number;
    p90: number;
    min: number;
    max: number;
  };
  yearOfDepletion: {
    p10: number | null;
    p25: number | null;
    median: number | null;
  };
  summaryStats: {
    stdDevFinalBalance: number;
  };
  depletionAnalysis: DepletionAnalysis;
}

export function createSeededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

function boxMullerRandom(rng: () => number = Math.random): number {
  let u1 = 0, u2 = 0;
  while (u1 === 0) u1 = rng();
  while (u2 === 0) u2 = rng();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

function getPercentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

export function validateSimulationParams(params: Partial<SimulationParams>): string[] {
  const errors: string[] = [];

  if (params.currentAge !== undefined) {
    if (params.currentAge < 18 || params.currentAge > 100) {
      errors.push("Current age must be between 18 and 100");
    }
  }
  if (params.retirementAge !== undefined) {
    if (params.retirementAge < 30 || params.retirementAge > 100) {
      errors.push("Retirement age must be between 30 and 100");
    }
  }
  if (params.currentAge !== undefined && params.retirementAge !== undefined) {
    if (params.currentAge > params.retirementAge) {
      errors.push("Current age cannot exceed retirement age");
    }
  }
  if (params.lifeExpectancy !== undefined) {
    if (params.lifeExpectancy < 50 || params.lifeExpectancy > 120) {
      errors.push("Life expectancy must be between 50 and 120");
    }
  }
  if (params.currentAge !== undefined && params.lifeExpectancy !== undefined) {
    if (params.lifeExpectancy <= params.currentAge) {
      errors.push("Life expectancy must be greater than current age");
    }
  }
  if (params.initialPortfolio !== undefined && params.initialPortfolio < 0) {
    errors.push("Initial portfolio value cannot be negative");
  }
  if (params.annualSpending !== undefined && params.annualSpending < 0) {
    errors.push("Annual spending cannot be negative");
  }
  if (params.expectedReturn !== undefined && (params.expectedReturn < -0.5 || params.expectedReturn > 0.5)) {
    errors.push("Expected return must be between -50% and 50%");
  }
  if (params.returnStdDev !== undefined && (params.returnStdDev < 0 || params.returnStdDev > 1)) {
    errors.push("Return standard deviation must be between 0 and 100%");
  }
  if (params.inflationRate !== undefined && (params.inflationRate < -0.1 || params.inflationRate > 0.2)) {
    errors.push("Inflation rate must be between -10% and 20%");
  }
  if (params.preRetirementContribution !== undefined && params.preRetirementContribution < 0) {
    errors.push("Pre-retirement contribution cannot be negative");
  }

  if (params.events) {
    for (let i = 0; i < params.events.length; i++) {
      const event = params.events[i];
      if (!event.name || event.name.trim() === "") {
        errors.push(`Event ${i + 1}: name is required`);
      }
      if (event.amount < 0) {
        errors.push(`Event ${i + 1}: amount cannot be negative`);
      }
      if (event.endAge !== null && event.endAge < event.startAge) {
        errors.push(`Event ${i + 1}: end age cannot be before start age`);
      }
    }
  }

  return errors;
}

export function runMonteCarloSimulation(params: SimulationParams): SimulationResults {
  const NUM_SIMULATIONS = 1000;
  const totalYears = params.lifeExpectancy - params.currentAge;
  const yearsToRetirement = params.retirementAge - params.currentAge;
  const rng = params.seed !== undefined ? createSeededRng(params.seed) : Math.random;

  const allPaths: number[][] = [];
  let successCount = 0;
  const finalBalances: number[] = [];
  const depletionAges: (number | null)[] = [];

  for (let sim = 0; sim < NUM_SIMULATIONS; sim++) {
    const path: number[] = [params.initialPortfolio];
    let balance = params.initialPortfolio;
    let depleted = false;
    let depletionAge: number | null = null;

    for (let year = 1; year <= totalYears; year++) {
      const age = params.currentAge + year;
      const isRetired = age >= params.retirementAge;
      const inflationMultiplier = Math.pow(1 + params.inflationRate, year);

      const annualReturn = params.expectedReturn + params.returnStdDev * boxMullerRandom(rng);
      balance = balance * (1 + annualReturn);

      if (!isRetired && params.preRetirementContribution > 0) {
        balance += params.preRetirementContribution * inflationMultiplier;
      }

      if (isRetired) {
        balance -= params.annualSpending * inflationMultiplier;
      }

      for (const event of params.events) {
        if (age >= event.startAge && (event.endAge === null || age <= event.endAge)) {
          const eventAmount = event.inflationAdjusted
            ? event.amount * inflationMultiplier
            : event.amount;

          if (event.type === "expense") {
            balance -= eventAmount;
          } else {
            balance += eventAmount;
          }
        }
      }

      if (balance <= 0 && !depleted) {
        depleted = true;
        depletionAge = age;
        balance = 0;
      }

      path.push(Math.max(0, balance));
    }

    allPaths.push(path);
    finalBalances.push(balance);
    depletionAges.push(depletionAge);

    if (balance > 0) {
      successCount++;
    }
  }

  const ages = Array.from({ length: totalYears + 1 }, (_, i) => params.currentAge + i);
  const p10: number[] = [];
  const p25: number[] = [];
  const p50: number[] = [];
  const p75: number[] = [];
  const p90: number[] = [];

  for (let yearIdx = 0; yearIdx <= totalYears; yearIdx++) {
    const valuesAtYear = allPaths.map(path => path[yearIdx]).sort((a, b) => a - b);
    p10.push(Math.round(getPercentile(valuesAtYear, 10)));
    p25.push(Math.round(getPercentile(valuesAtYear, 25)));
    p50.push(Math.round(getPercentile(valuesAtYear, 50)));
    p75.push(Math.round(getPercentile(valuesAtYear, 75)));
    p90.push(Math.round(getPercentile(valuesAtYear, 90)));
  }

  finalBalances.sort((a, b) => a - b);

  const validDepletionAges = depletionAges.filter((a): a is number => a !== null).sort((a, b) => a - b);

  const meanFinal = finalBalances.reduce((s, v) => s + v, 0) / finalBalances.length;
  const variance = finalBalances.reduce((s, v) => s + Math.pow(v - meanFinal, 2), 0) / finalBalances.length;
  const stdDevFinalBalance = Math.sqrt(variance);

  const averageDepletionAge = validDepletionAges.length > 0
    ? Math.round(validDepletionAges.reduce((s, a) => s + a, 0) / validDepletionAges.length)
    : null;

  return {
    successRate: Math.round((successCount / NUM_SIMULATIONS) * 1000) / 10,
    numSimulations: NUM_SIMULATIONS,
    percentilePaths: { ages, p10, p25, p50, p75, p90 },
    finalBalanceStats: {
      mean: Math.round(meanFinal),
      median: Math.round(getPercentile(finalBalances, 50)),
      p10: Math.round(getPercentile(finalBalances, 10)),
      p90: Math.round(getPercentile(finalBalances, 90)),
      min: Math.round(finalBalances[0]),
      max: Math.round(finalBalances[finalBalances.length - 1]),
    },
    yearOfDepletion: {
      p10: validDepletionAges.length > 0 ? Math.round(getPercentile(validDepletionAges, 10)) : null,
      p25: validDepletionAges.length > 0 ? Math.round(getPercentile(validDepletionAges, 25)) : null,
      median: validDepletionAges.length > 0 ? Math.round(getPercentile(validDepletionAges, 50)) : null,
    },
    summaryStats: {
      stdDevFinalBalance: Math.round(stdDevFinalBalance),
    },
    depletionAnalysis: {
      depletionAges: validDepletionAges,
      averageDepletionAge,
      depletionCount: validDepletionAges.length,
      depletionRate: Math.round((validDepletionAges.length / NUM_SIMULATIONS) * 1000) / 10,
    },
  };
}
