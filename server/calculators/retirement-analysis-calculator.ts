import type {
  RetirementAnalysisInput,
  ScenarioProjection,
  YearProjection,
  SSClaimingOption,
  SSAnalysisResult,
  CouplesSSCombo,
  PensionComparison,
  PhasedRetirementProjection,
  ExpenseModelResult,
  LTCProbabilityEntry,
  GapAnalysisResult,
  WithdrawalSequenceResult,
  PassiveIncomeSustainability,
  RetirementAnalysisResult,
} from "@shared/retirement-analysis-types";

export type { RetirementAnalysisInput, RetirementAnalysisResult };

function runDeterministicProjection(
  currentAge: number,
  retirementAge: number,
  lifeExpectancy: number,
  portfolioValue: number,
  annualSpending: number,
  expectedReturn: number,
  inflationRate: number,
  preRetirementContrib: number,
  ssAnnual: number,
  ssStartAge: number,
  pensionAnnual: number,
  pensionStartAge: number,
  rentalIncome: number
): YearProjection[] {
  const years: YearProjection[] = [];
  let balance = portfolioValue;
  const targetAge = Math.max(lifeExpectancy, 95);

  for (let age = currentAge; age <= targetAge; age++) {
    const yearNum = age - currentAge;
    const inflMult = Math.pow(1 + inflationRate, yearNum);
    const isRetired = age >= retirementAge;

    let income = 0;
    if (age >= ssStartAge) income += ssAnnual * inflMult;
    if (age >= pensionStartAge && pensionAnnual > 0) income += pensionAnnual * inflMult;
    if (rentalIncome > 0) income += rentalIncome * inflMult;

    let spending = 0;
    if (isRetired) {
      spending = annualSpending * inflMult;
    }

    if (!isRetired && preRetirementContrib > 0) {
      balance += preRetirementContrib * inflMult;
    }

    balance *= (1 + expectedReturn);

    let withdrawal = 0;
    if (isRetired) {
      withdrawal = Math.max(0, spending - income);
      balance -= withdrawal;
    }

    if (balance < 0) balance = 0;

    years.push({
      age,
      year: yearNum,
      portfolioBalance: Math.round(balance),
      incomeTotal: Math.round(income),
      spendingTotal: Math.round(spending),
      withdrawalNeeded: Math.round(withdrawal),
      inflationMultiplier: inflMult,
    });
  }
  return years;
}

function calculateSuccessProbability(
  currentAge: number, retirementAge: number, lifeExpectancy: number,
  portfolioValue: number, annualSpending: number,
  expectedReturn: number, returnStdDev: number, inflationRate: number,
  preRetirementContrib: number, ssAnnual: number, ssStartAge: number,
  pensionAnnual: number, pensionStartAge: number, rentalIncome: number
): number {
  const numSims = 500;
  const totalYears = Math.max(lifeExpectancy, 95) - currentAge;
  let successCount = 0;

  for (let sim = 0; sim < numSims; sim++) {
    let balance = portfolioValue;
    let survived = true;

    for (let yr = 0; yr < totalYears; yr++) {
      const age = currentAge + yr;
      const inflMult = Math.pow(1 + inflationRate, yr);
      const isRetired = age >= retirementAge;

      const u1 = Math.random() || 0.0001;
      const u2 = Math.random() || 0.0001;
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const annualReturn = expectedReturn + returnStdDev * z;

      balance *= (1 + annualReturn);

      if (!isRetired) {
        balance += preRetirementContrib * inflMult;
      } else {
        let income = 0;
        if (age >= ssStartAge) income += ssAnnual * inflMult;
        if (age >= pensionStartAge && pensionAnnual > 0) income += pensionAnnual * inflMult;
        if (rentalIncome > 0) income += rentalIncome * inflMult;

        const spending = annualSpending * inflMult;
        const withdrawal = Math.max(0, spending - income);
        balance -= withdrawal;
      }

      if (balance <= 0) {
        survived = false;
        break;
      }
    }
    if (survived) successCount++;
  }

  return Math.round((successCount / numSims) * 1000) / 10;
}

function buildScenarios(input: RetirementAnalysisInput): ScenarioProjection[] {
  const ssAnnual = input.socialSecurityPIA ? calculateSSBenefit(input.socialSecurityPIA, input.socialSecurityClaimingAge ?? 67, 67).annualBenefit : 0;
  const ssStartAge = input.socialSecurityClaimingAge ?? 67;
  const pensionAnnual = input.pensionAnnualBenefit ?? 0;
  const pensionStartAge = input.pensionStartAge ?? input.retirementAge;
  const vacancyRate = input.rentalVacancyRate ?? 0.05;
  const maintenanceFactor = 0.10;
  const rentalIncome = input.rentalIncome ? input.rentalIncome * (1 - vacancyRate) * (1 - maintenanceFactor) : 0;

  const scenarioDefs = [
    {
      name: "Base Case",
      description: "Current assumptions with expected market returns and standard inflation",
      returnAdj: 0, inflOverride: null, retireAdj: 0, spendMult: 1.0, ssDelayBonus: false
    },
    {
      name: "Optimistic",
      description: "Higher returns (+1%) with 2% inflation",
      returnAdj: 0.01, inflOverride: 0.02, retireAdj: 0, spendMult: 1.0, ssDelayBonus: false
    },
    {
      name: "Pessimistic",
      description: "Lower returns (-1%) with 3.5% inflation",
      returnAdj: -0.01, inflOverride: 0.035, retireAdj: 0, spendMult: 1.0, ssDelayBonus: false
    },
    {
      name: "Early Retirement",
      description: "Retire 5 years earlier with 20% higher spending",
      returnAdj: 0, inflOverride: null, retireAdj: -5, spendMult: 1.2, ssDelayBonus: false
    },
    {
      name: "Extended Career",
      description: "Work 5 additional years with delayed Social Security (+8%/yr bonus)",
      returnAdj: 0, inflOverride: null, retireAdj: 5, spendMult: 1.0, ssDelayBonus: true
    },
  ];

  return scenarioDefs.map(def => {
    const adjReturn = input.expectedReturn + def.returnAdj;
    const adjInflation = def.inflOverride !== null ? def.inflOverride : input.inflationRate;
    const adjRetireAge = Math.max(input.currentAge + 1, input.retirementAge + def.retireAdj);
    const adjSpending = input.annualSpending * def.spendMult;
    const delayedSSAge = def.ssDelayBonus ? Math.min(ssStartAge + 5, 70) : ssStartAge;
    const actualDelayYears = def.ssDelayBonus ? Math.max(0, delayedSSAge - ssStartAge) : 0;
    const adjSS = def.ssDelayBonus && actualDelayYears > 0
      ? input.socialSecurityPIA
        ? calculateSSBenefit(input.socialSecurityPIA, delayedSSAge, 67).annualBenefit
        : ssAnnual
      : ssAnnual;
    const adjSSStart = delayedSSAge;

    const yearByYear = runDeterministicProjection(
      input.currentAge, adjRetireAge, input.lifeExpectancy,
      input.portfolioValue, adjSpending, adjReturn, adjInflation,
      input.preRetirementContribution, adjSS, adjSSStart,
      pensionAnnual, pensionStartAge, rentalIncome
    );

    const finalEntry = yearByYear[yearByYear.length - 1];
    const terminalValue = finalEntry?.portfolioBalance || 0;

    const depletionEntry = yearByYear.find(y => y.portfolioBalance <= 0 && y.age >= adjRetireAge);
    const depletionAge = depletionEntry?.age || null;

    const retiredYears = yearByYear.filter(y => y.age >= adjRetireAge);
    const avgBalance = retiredYears.length > 0
      ? Math.round(retiredYears.reduce((s, y) => s + y.portfolioBalance, 0) / retiredYears.length)
      : terminalValue;

    let firstDecline: number | null = null;
    for (let i = 1; i < yearByYear.length; i++) {
      if (yearByYear[i].age >= adjRetireAge && yearByYear[i].portfolioBalance < yearByYear[i - 1].portfolioBalance) {
        firstDecline = yearByYear[i].age;
        break;
      }
    }

    const volatility = input.returnVolatility ?? 0.12;
    const successProb = calculateSuccessProbability(
      input.currentAge, adjRetireAge, input.lifeExpectancy,
      input.portfolioValue, adjSpending, adjReturn, volatility, adjInflation,
      input.preRetirementContribution, adjSS, adjSSStart,
      pensionAnnual, pensionStartAge, rentalIncome
    );

    return {
      name: def.name,
      description: def.description,
      yearByYear,
      terminalValue,
      successProbability: successProb,
      portfolioDepletionAge: depletionAge,
      averageAnnualBalance: avgBalance,
      firstYearOfDecline: firstDecline,
    };
  });
}

function calculateSSBenefit(pia: number, claimingAge: number, fra: number): { monthlyBenefit: number; annualBenefit: number } {
  let factor = 1.0;
  if (claimingAge < fra) {
    const monthsEarly = (fra - claimingAge) * 12;
    if (monthsEarly <= 36) {
      factor = 1 - (monthsEarly * 5 / 900);
    } else {
      factor = 1 - (36 * 5 / 900) - ((monthsEarly - 36) * 5 / 1200);
    }
  } else if (claimingAge > fra) {
    const monthsLate = (claimingAge - fra) * 12;
    factor = 1 + (monthsLate * 8 / 1200);
  }

  const monthly = Math.round(pia * factor);
  return { monthlyBenefit: monthly, annualBenefit: monthly * 12 };
}

function buildSSAnalysis(input: RetirementAnalysisInput): SSAnalysisResult {
  const pia = input.socialSecurityPIA ?? 2500;
  const fra = 67;
  const discountRate = 0.03;
  const claimingOptions: SSClaimingOption[] = [];

  const age62Benefit = calculateSSBenefit(pia, 62, fra);

  for (let age = 62; age <= 70; age++) {
    const { monthlyBenefit, annualBenefit } = calculateSSBenefit(pia, age, fra);

    let breakEvenAge: number | null = null;
    if (age > 62) {
      const forgoneIncome = age62Benefit.annualBenefit * (age - 62);
      const annualGain = annualBenefit - age62Benefit.annualBenefit;
      if (annualGain > 0) {
        breakEvenAge = Math.round(age + forgoneIncome / annualGain);
      }
    }

    let lpv = 0;
    for (let yr = age; yr <= 95; yr++) {
      const discount = Math.pow(1 + discountRate, -(yr - input.currentAge));
      lpv += annualBenefit * discount;
    }

    let label: string;
    if (age < fra) {
      const reduction = Math.round((1 - calculateSSBenefit(pia, age, fra).monthlyBenefit / pia) * 100);
      label = `-${reduction}% (early)`;
    } else if (age === fra) {
      label = "Full benefit (FRA)";
    } else {
      const bonus = Math.round((calculateSSBenefit(pia, age, fra).monthlyBenefit / pia - 1) * 100);
      label = `+${bonus}% (delayed)`;
    }

    claimingOptions.push({
      claimingAge: age,
      monthlyBenefit,
      annualBenefit,
      breakEvenAge,
      lifetimePresentValue: Math.round(lpv),
      reductionOrBonus: label,
    });
  }

  const optimal = claimingOptions.reduce((best, opt) => opt.lifetimePresentValue > best.lifetimePresentValue ? opt : best);

  let couplesStrategy: string | undefined;
  let couplesMatrix: CouplesSSCombo[] | undefined;
  let optimalCouplesCombination: CouplesSSCombo | undefined;

  if (input.spousePIA) {
    couplesMatrix = [];
    const primaryPIA = pia;
    const spousePIA = input.spousePIA;
    const primaryAges = [62, 63, 64, 65, 66, 67, 68, 69, 70];
    const spouseAges = [62, 63, 64, 65, 66, 67, 68, 69, 70];

    for (const pAge of primaryAges) {
      for (const sAge of spouseAges) {
        const pBenefit = calculateSSBenefit(primaryPIA, pAge, fra);
        const sBenefit = calculateSSBenefit(spousePIA, sAge, fra);
        const combinedAnnual = pBenefit.annualBenefit + sBenefit.annualBenefit;
        const survivorMonthly = Math.max(pBenefit.monthlyBenefit, sBenefit.monthlyBenefit);
        const survivorAnnual = survivorMonthly * 12;

        let combinedPV = 0;
        for (let yr = Math.max(pAge, sAge); yr <= 95; yr++) {
          const disc = Math.pow(1 + discountRate, -(yr - input.currentAge));
          combinedPV += combinedAnnual * disc;
        }

        couplesMatrix.push({
          primaryAge: pAge,
          spouseAge: sAge,
          combinedAnnual,
          combinedLifetimePV: Math.round(combinedPV),
          survivorBenefit: survivorAnnual,
        });
      }
    }

    optimalCouplesCombination = couplesMatrix.reduce((best, combo) =>
      combo.combinedLifetimePV > best.combinedLifetimePV ? combo : best
    );

    const higherEarnerPIA = Math.max(primaryPIA, spousePIA);
    const maxSurvivorBenefit = calculateSSBenefit(higherEarnerPIA, 70, fra);
    couplesStrategy = `Optimal: primary claims at ${optimalCouplesCombination.primaryAge}, spouse at ${optimalCouplesCombination.spouseAge} (combined $${optimalCouplesCombination.combinedAnnual.toLocaleString()}/yr, PV $${optimalCouplesCombination.combinedLifetimePV.toLocaleString()}). Higher earner delays to 70 for max survivor benefit ($${maxSurvivorBenefit.monthlyBenefit.toLocaleString()}/mo).`;
  }

  return { claimingOptions, optimalClaimingAge: optimal.claimingAge, couplesStrategy, couplesMatrix, optimalCouplesCombination };
}

function buildPensionAnalysis(input: RetirementAnalysisInput): PensionComparison | null {
  if (!input.pensionLumpSum && !input.pensionAnnualBenefit) return null;

  const lumpSum = input.pensionLumpSum ?? (input.pensionAnnualBenefit ?? 0) * 15;
  const annualBenefit = input.pensionAnnualBenefit ?? Math.round(lumpSum / 15);
  const startAge = input.pensionStartAge ?? input.retirementAge;
  const yearsTo85 = 85 - startAge;
  const growthRate = input.expectedReturn;

  const projectedLumpAt85 = Math.round(lumpSum * Math.pow(1 + growthRate, yearsTo85));

  const totalAnnuityPayments = annualBenefit * yearsTo85;
  let lumpBreakEven: number | null = null;
  let lumpBalance = lumpSum;
  for (let yr = 0; yr < 40; yr++) {
    lumpBalance = lumpBalance * (1 + growthRate) - annualBenefit;
    if (lumpBalance <= 0) {
      lumpBreakEven = startAge + yr;
      break;
    }
  }

  const jointRate = 0.85;
  const jointAnnual = Math.round(annualBenefit * jointRate);
  const totalJointPayments = jointAnnual * yearsTo85;

  const hybridAnnuityPortion = Math.round(lumpSum * 0.5);
  const hybridInvestedPortion = lumpSum - hybridAnnuityPortion;
  const hybridAnnuityIncome = Math.round(annualBenefit * 0.5);
  const hybridInvestedValue = Math.round(hybridInvestedPortion * Math.pow(1 + growthRate, yearsTo85));

  return {
    lumpSum: {
      amount: lumpSum,
      projectedValueAt85: projectedLumpAt85,
      breakEvenAge: lumpBreakEven,
    },
    singleLifeAnnuity: {
      annualPayment: annualBenefit,
      totalPaymentsTo85: totalAnnuityPayments,
      breakEvenAge: lumpBreakEven,
    },
    jointSurvivorAnnuity: {
      annualPayment: jointAnnual,
      totalPaymentsTo85: totalJointPayments,
      survivalBenefit: jointAnnual,
    },
    hybridApproach: {
      annuityPortion: hybridAnnuityPortion,
      investedPortion: hybridInvestedPortion,
      combinedProjectedValue: hybridInvestedValue + (hybridAnnuityIncome * yearsTo85),
    },
  };
}

function buildPhasedRetirement(input: RetirementAnalysisInput): PhasedRetirementProjection {
  const retAge = input.retirementAge;
  const ssAnnual = input.socialSecurityPIA ? calculateSSBenefit(input.socialSecurityPIA, input.socialSecurityClaimingAge ?? 67, 67).annualBenefit : 0;
  const ssStartAge = input.socialSecurityClaimingAge ?? 67;
  const currentIncome = input.annualSpending * 1.3;

  const phases = [
    { name: "Full-Time", startAge: input.currentAge, endAge: retAge - 3, incomeRatio: 1.0 },
    { name: "Part-Time", startAge: retAge - 2, endAge: retAge - 1, incomeRatio: 0.5 },
    { name: "Consulting", startAge: retAge, endAge: retAge + 2, incomeRatio: 0.25 },
    { name: "Fully Retired", startAge: retAge + 3, endAge: input.lifeExpectancy, incomeRatio: 0 },
  ];

  const phaseResults = phases.map(p => {
    const earned = Math.round(currentIncome * p.incomeRatio);
    const ss = p.startAge >= ssStartAge ? ssAnnual : 0;
    const spending = Math.round(input.annualSpending * (p.incomeRatio > 0 ? 1.0 : 1.0));
    const draw = Math.max(0, Math.round(spending - earned - ss));
    return {
      name: p.name,
      startAge: p.startAge,
      endAge: p.endAge,
      earnedIncome: earned,
      ssIncome: ss,
      portfolioDraw: draw,
      totalIncome: earned + ss + draw,
    };
  });

  const yearByYear: PhasedRetirementProjection["yearByYear"] = [];
  let balance = input.portfolioValue;
  for (let age = input.currentAge; age <= input.lifeExpectancy; age++) {
    const phase = phases.find(p => age >= p.startAge && age <= p.endAge) || phases[phases.length - 1];
    const inflMult = Math.pow(1 + input.inflationRate, age - input.currentAge);
    const earned = Math.round(currentIncome * phase.incomeRatio * inflMult);
    const ss = age >= ssStartAge ? Math.round(ssAnnual * inflMult) : 0;
    const spending = Math.round(input.annualSpending * inflMult);
    const draw = Math.max(0, spending - earned - ss);

    balance = balance * (1 + input.expectedReturn);
    if (phase.incomeRatio > 0) {
      balance += Math.round(input.preRetirementContribution * phase.incomeRatio * inflMult);
    }
    balance -= draw;
    if (balance < 0) balance = 0;

    yearByYear.push({
      age,
      phase: phase.name,
      earnedIncome: earned,
      ssIncome: ss,
      portfolioDraw: draw,
      portfolioBalance: Math.round(balance),
    });
  }

  return { phases: phaseResults, yearByYear };
}

function buildExpenseModel(input: RetirementAnalysisInput): ExpenseModelResult {
  const retAge = input.retirementAge;
  const base = input.annualSpending;

  const le = input.lifeExpectancy;
  const goGoEnd = Math.min(retAge + 10, le);
  const slowGoEnd = Math.min(retAge + 20, le);

  const rawPhases = [
    {
      name: "Go-Go (Active)",
      startAge: retAge,
      endAge: goGoEnd,
      spendingMultiplier: 1.1,
      baseSpending: Math.round(base * 1.1),
      healthcareCost: 8000,
      totalAnnual: Math.round(base * 1.1 + 8000),
    },
    {
      name: "Slow-Go (Moderate)",
      startAge: goGoEnd + 1,
      endAge: slowGoEnd,
      spendingMultiplier: 1.0,
      baseSpending: Math.round(base * 1.0),
      healthcareCost: 15000,
      totalAnnual: Math.round(base * 1.0 + 15000),
    },
    {
      name: "No-Go (Essential)",
      startAge: slowGoEnd + 1,
      endAge: le,
      spendingMultiplier: 0.7,
      baseSpending: Math.round(base * 0.7),
      healthcareCost: 30000,
      totalAnnual: Math.round(base * 0.7 + 30000),
    },
  ];

  const phases = rawPhases.filter(p => p.startAge <= p.endAge);

  const healthcareProjection: { age: number; cost: number }[] = [];
  const healthcareInflation = 0.05;
  const baseHealthcare = 6000;
  for (let age = retAge; age <= input.lifeExpectancy; age++) {
    const yearsIn = age - retAge;
    const ageFactor = 1 + (age - 65) * 0.02;
    const cost = Math.round(baseHealthcare * Math.pow(1 + healthcareInflation, yearsIn) * Math.max(1, ageFactor));
    healthcareProjection.push({ age, cost });
  }

  const oneTimeExpenses = [
    { age: retAge, description: "Retirement celebration & initial travel", amount: 25000 },
    { age: retAge + 5, description: "Home renovation / downsizing costs", amount: 50000 },
  ].filter(e => e.age >= input.currentAge && e.age <= input.lifeExpectancy);

  const ltcProbability: LTCProbabilityEntry[] = [];
  let expectedLTCCost = 0;
  const annualLTCCost = 108000;
  const ltcCostInflation = 0.04;

  for (let age = 65; age <= le; age++) {
    let prob = 0;
    if (age < 75) prob = 0.02 + (age - 65) * 0.005;
    else if (age < 85) prob = 0.07 + (age - 75) * 0.015;
    else prob = Math.min(0.5, 0.22 + (age - 85) * 0.02);

    const yearsFromBase = age - 65;
    const inflatedCost = Math.round(annualLTCCost * Math.pow(1 + ltcCostInflation, yearsFromBase));
    const weighted = Math.round(inflatedCost * prob);
    expectedLTCCost += weighted;

    if (age >= retAge) {
      ltcProbability.push({
        age,
        probabilityOfNeed: Math.round(prob * 1000) / 10,
        expectedAnnualCost: inflatedCost,
        weightedCost: weighted,
      });
    }
  }

  let totalLifetime = 0;
  for (const phase of phases) {
    const years = phase.endAge - phase.startAge + 1;
    totalLifetime += phase.totalAnnual * years;
  }
  totalLifetime += oneTimeExpenses.reduce((s, e) => s + e.amount, 0);
  totalLifetime += expectedLTCCost;

  return { phases, healthcareProjection, oneTimeExpenses, ltcProbability, totalLifetimeSpending: Math.round(totalLifetime), expectedLTCCost: Math.round(expectedLTCCost) };
}

function buildGapAnalysis(input: RetirementAnalysisInput, scenarios: ScenarioProjection[]): GapAnalysisResult {
  const baseScenario = scenarios[0];
  const retirementYears = input.lifeExpectancy - input.retirementAge;
  const inflAdj = (1 + input.inflationRate);

  let totalNeeds = 0;
  for (let yr = 0; yr < retirementYears; yr++) {
    totalNeeds += input.annualSpending * Math.pow(inflAdj, yr + (input.retirementAge - input.currentAge));
  }

  const ssAnnual = input.socialSecurityPIA ? calculateSSBenefit(input.socialSecurityPIA, input.socialSecurityClaimingAge ?? 67, 67).annualBenefit : 0;
  const pensionAnnual = input.pensionAnnualBenefit ?? 0;
  const incomeYears = Math.max(0, input.lifeExpectancy - (input.socialSecurityClaimingAge ?? 67));

  const totalIncome = (ssAnnual + pensionAnnual) * incomeYears;
  const netNeeds = Math.max(0, totalNeeds - totalIncome);

  const yearsToRetire = input.retirementAge - input.currentAge;
  const futurePortfolio = input.portfolioValue * Math.pow(1 + input.expectedReturn, yearsToRetire);
  const futureContrib = input.expectedReturn === 0
    ? input.preRetirementContribution * yearsToRetire
    : input.preRetirementContribution * ((Math.pow(1 + input.expectedReturn, yearsToRetire) - 1) / input.expectedReturn);
  const totalAssets = Math.round(futurePortfolio + futureContrib);

  const gap = Math.round(netNeeds - totalAssets);
  const fundedPct = netNeeds > 0 ? Math.min(100, Math.round((totalAssets / netNeeds) * 100)) : 100;

  const successProb = baseScenario.successProbability;

  let rating: GapAnalysisResult["readinessRating"];
  if (fundedPct >= 100 && successProb >= 80) rating = "on_track";
  else if (fundedPct >= 80 && successProb >= 60) rating = "needs_attention";
  else if (fundedPct >= 60) rating = "at_risk";
  else rating = "critical";

  const absGap = Math.max(0, gap);
  const remediations = [];

  const extraSavings = Math.round(input.preRetirementContribution * 0.25);
  const extraYears = input.retirementAge - input.currentAge;
  const extraSavingsImpact = input.expectedReturn === 0
    ? extraSavings * extraYears
    : extraSavings * ((Math.pow(1 + input.expectedReturn, extraYears) - 1) / input.expectedReturn);
  remediations.push({
    strategy: "Increase Savings by 25%",
    description: `Save an additional ${formatNum(extraSavings)}/year (${formatNum(Math.round(input.preRetirementContribution * 1.25))}/year total)`,
    impact: Math.round(extraSavingsImpact),
    gapClosurePercent: absGap > 0 ? Math.min(100, Math.round((extraSavingsImpact / absGap) * 100)) : 100,
    feasibility: "medium" as const,
  });

  const delayYears = 3;
  const delayImpact = input.portfolioValue * Math.pow(1 + input.expectedReturn, delayYears) - input.portfolioValue + (input.preRetirementContribution * delayYears) + (input.annualSpending * delayYears);
  remediations.push({
    strategy: `Delay Retirement ${delayYears} Years`,
    description: `Retire at age ${input.retirementAge + delayYears} instead of ${input.retirementAge}`,
    impact: Math.round(delayImpact),
    gapClosurePercent: absGap > 0 ? Math.min(100, Math.round((delayImpact / absGap) * 100)) : 100,
    feasibility: "high" as const,
  });

  const spendingReduction = 0.15;
  const spendingImpact = input.annualSpending * spendingReduction * retirementYears;
  remediations.push({
    strategy: "Reduce Spending 15%",
    description: `Lower annual retirement spending from ${formatNum(input.annualSpending)} to ${formatNum(Math.round(input.annualSpending * 0.85))}`,
    impact: Math.round(spendingImpact),
    gapClosurePercent: absGap > 0 ? Math.min(100, Math.round((spendingImpact / absGap) * 100)) : 100,
    feasibility: "medium" as const,
  });

  const ssDelayImpact = ssAnnual * 0.24 * incomeYears;
  remediations.push({
    strategy: "Delay Social Security to 70",
    description: "Maximize SS benefit with delayed credits (+8%/year after FRA)",
    impact: Math.round(ssDelayImpact),
    gapClosurePercent: absGap > 0 ? Math.min(100, Math.round((ssDelayImpact / absGap) * 100)) : 100,
    feasibility: "high" as const,
  });

  const bridgeIncome = 40000;
  const bridgeYears = 5;
  const bridgeImpact = bridgeIncome * bridgeYears + (input.annualSpending * bridgeYears * 0.5);
  remediations.push({
    strategy: "Part-Time Bridge Employment",
    description: `Earn ${formatNum(bridgeIncome)}/year part-time for ${bridgeYears} years after retirement`,
    impact: Math.round(bridgeImpact),
    gapClosurePercent: absGap > 0 ? Math.min(100, Math.round((bridgeImpact / absGap) * 100)) : 100,
    feasibility: "high" as const,
  });

  return {
    totalAssetsAvailable: totalAssets,
    totalRetirementNeeds: Math.round(netNeeds),
    gap,
    fundedPercentage: fundedPct,
    successProbability: successProb,
    readinessRating: rating,
    remediations,
  };
}

function getRMDFactor(age: number): number {
  const table: Record<number, number> = {
    73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
    80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2,
    87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1,
    94: 9.5, 95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4,
  };
  if (age < 73) return 0;
  return table[age] ?? Math.max(5.0, 6.4 - (age - 100) * 0.5);
}

function calculateRMD(traditionalBalance: number, age: number): number {
  const factor = getRMDFactor(age);
  if (factor <= 0) return 0;
  return Math.round(traditionalBalance / factor);
}

function buildWithdrawalSequence(input: RetirementAnalysisInput): WithdrawalSequenceResult {
  const tradBal = input.traditionalBalance ?? input.portfolioValue * 0.5;
  const rothBal = input.rothBalance ?? input.portfolioValue * 0.2;
  const taxableBal = input.taxableBalance ?? input.portfolioValue * 0.3;
  const marginalRate = input.marginalTaxRate ?? 0.24;
  const stateRate = input.stateRate ?? 0.05;
  const totalRate = marginalRate + stateRate;
  const growthRate = input.expectedReturn;

  const drawdownPriority = [
    { order: 1, accountType: "Tax-Free (Roth IRA)", rationale: "Draw first to avoid early RMDs and preserve tax-deferred growth; no tax on withdrawals" },
    { order: 2, accountType: "Taxable (Brokerage)", rationale: "Use next for tax-loss harvesting opportunities and favorable long-term capital gains rates" },
    { order: 3, accountType: "Tax-Deferred (Traditional IRA/401k)", rationale: "Preserve longest for continued tax-deferred growth; subject to RMDs at 73" },
  ];

  const rothLadder: WithdrawalSequenceResult["rothConversionLadder"] = [];
  const yearsToRetire = Math.max(0, input.retirementAge - input.currentAge);
  const conversionYears = Math.min(5, yearsToRetire);

  const brackets = input.filingStatus === "married_filing_jointly"
    ? [
        { max: 23200, rate: 0.10 },
        { max: 94300, rate: 0.12 },
        { max: 201050, rate: 0.22 },
        { max: 383900, rate: 0.24 },
        { max: 487450, rate: 0.32 },
        { max: 731200, rate: 0.35 },
        { max: Infinity, rate: 0.37 },
      ]
    : [
        { max: 11600, rate: 0.10 },
        { max: 47150, rate: 0.12 },
        { max: 100525, rate: 0.22 },
        { max: 191950, rate: 0.24 },
        { max: 243725, rate: 0.32 },
        { max: 609350, rate: 0.35 },
        { max: Infinity, rate: 0.37 },
      ];

  let cumulativeConverted = 0;
  let remainingTrad = tradBal;
  for (let i = 0; i < conversionYears && remainingTrad > 0; i++) {
    const currentBracket = brackets.find(b => (input.annualSpending ?? 80000) < b.max) ?? brackets[0];
    const spaceInBracket = currentBracket.max - (input.annualSpending ?? 80000);
    const conversionAmount = Math.min(Math.max(0, spaceInBracket), remainingTrad, 50000);
    const taxCost = Math.round(conversionAmount * (currentBracket.rate + stateRate));

    cumulativeConverted += conversionAmount;
    remainingTrad -= conversionAmount;

    rothLadder.push({
      year: i + 1,
      age: input.currentAge + i,
      conversionAmount: Math.round(conversionAmount),
      taxCost,
      bracketUtilized: `${(currentBracket.rate * 100).toFixed(0)}%`,
      cumulativeConverted: Math.round(cumulativeConverted),
    });
  }

  const yearByYearPlan: WithdrawalSequenceResult["yearByYearPlan"] = [];
  let tBal = tradBal;
  let rBal = rothBal;
  let txBal = taxableBal;

  for (let age = input.retirementAge; age <= Math.min(input.lifeExpectancy, 95); age++) {
    const yr = age - input.retirementAge;
    const inflMult = Math.pow(1 + input.inflationRate, yr);
    const spending = Math.round(input.annualSpending * inflMult);

    const ssIncome = input.socialSecurityPIA && age >= (input.socialSecurityClaimingAge ?? 67)
      ? calculateSSBenefit(input.socialSecurityPIA, input.socialSecurityClaimingAge ?? 67, 67).annualBenefit * inflMult
      : 0;
    const pensionIncome = (input.pensionAnnualBenefit ?? 0) * (age >= (input.pensionStartAge ?? input.retirementAge) ? inflMult : 0);

    const netNeed = Math.max(0, spending - ssIncome - pensionIncome);

    let txW = 0, tradW = 0, rothW = 0;

    tBal *= (1 + growthRate);
    rBal *= (1 + growthRate);
    txBal *= (1 + growthRate);

    const rmdAmount = calculateRMD(tBal, age);
    if (rmdAmount > 0 && tBal > 0) {
      tradW = Math.min(rmdAmount, tBal);
      tBal -= tradW;
    }

    let remaining = Math.max(0, netNeed - tradW);

    if (remaining > 0 && rBal > 0) {
      rothW = Math.min(remaining, rBal);
      rBal -= rothW;
      remaining -= rothW;
    }

    if (remaining > 0 && txBal > 0) {
      txW = Math.min(remaining, txBal);
      txBal -= txW;
      remaining -= txW;
    }

    if (remaining > 0 && tBal > 0) {
      const additionalTrad = Math.min(remaining, tBal);
      tradW += additionalTrad;
      tBal -= additionalTrad;
      remaining -= additionalTrad;
    }

    const estimatedTax = Math.round(tradW * totalRate + txW * 0.15);

    yearByYearPlan.push({
      age,
      taxableWithdrawal: Math.round(txW),
      traditionalWithdrawal: Math.round(tradW),
      rothWithdrawal: Math.round(rothW),
      rmdAmount: Math.round(rmdAmount),
      totalWithdrawal: Math.round(txW + tradW + rothW),
      estimatedTax,
      afterTaxIncome: Math.round(txW + tradW + rothW - estimatedTax + ssIncome + pensionIncome),
      taxableBalance: Math.round(Math.max(0, txBal)),
      traditionalBalance: Math.round(Math.max(0, tBal)),
      rothBalance: Math.round(Math.max(0, rBal)),
    });
  }

  return { drawdownPriority, rothConversionLadder: rothLadder, yearByYearPlan };
}

function buildPassiveIncome(input: RetirementAnalysisInput): PassiveIncomeSustainability | null {
  if (!input.rentalIncome || input.rentalIncome <= 0) return null;

  const vacancyRate = input.rentalVacancyRate ?? 0.05;
  const maint = 0.10;
  const grossAnnual = input.rentalIncome;
  const netAnnual = grossAnnual * (1 - vacancyRate) * (1 - maint);
  const retAge = input.retirementAge;
  const le = input.lifeExpectancy;
  const rentalInflation = 0.03;

  const yearByYear: PassiveIncomeSustainability["yearByYear"]  = [];
  let cumNet = 0;
  for (let age = retAge; age <= le; age++) {
    const yr = age - retAge;
    const inflMult = Math.pow(1 + rentalInflation, yr);
    const gross = Math.round(grossAnnual * inflMult);
    const net = Math.round(netAnnual * inflMult);
    cumNet += net;
    const spendingInflMult = Math.pow(1 + input.inflationRate, yr + (retAge - input.currentAge));
    const annualSpending = input.annualSpending * spendingInflMult;
    const coverage = annualSpending > 0 ? Math.round((net / annualSpending) * 1000) / 10 : 0;
    yearByYear.push({ age, grossIncome: gross, netIncome: net, cumulativeNet: Math.round(cumNet), spendingCoverage: coverage });
  }

  return {
    grossAnnualIncome: grossAnnual,
    vacancyRate,
    maintenanceFactor: maint,
    netAnnualIncome: Math.round(netAnnual),
    coverageYears: le - retAge,
    yearByYear,
  };
}

function formatNum(n: number): string {
  return "$" + n.toLocaleString("en-US");
}

export function calculateRetirementAnalysis(input: RetirementAnalysisInput): RetirementAnalysisResult {
  const scenarios = buildScenarios(input);
  const socialSecurity = buildSSAnalysis(input);
  const pension = buildPensionAnalysis(input);
  const phasedRetirement = buildPhasedRetirement(input);
  const expenseModel = buildExpenseModel(input);
  const gapAnalysis = buildGapAnalysis(input, scenarios);
  const withdrawalSequence = buildWithdrawalSequence(input);
  const passiveIncome = buildPassiveIncome(input);

  return {
    scenarios,
    socialSecurity,
    pension,
    phasedRetirement,
    expenseModel,
    gapAnalysis,
    withdrawalSequence,
    passiveIncome,
  };
}
