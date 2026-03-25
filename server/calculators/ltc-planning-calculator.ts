const LTC_PROBABILITY_BY_AGE: Record<number, number> = {
  50: 0.52, 55: 0.52, 60: 0.52, 65: 0.52, 70: 0.52,
  75: 0.50, 80: 0.48, 85: 0.45, 90: 0.40,
};

const AVERAGE_LTC_DURATION_YEARS = 3.0;
const NURSING_HOME_ANNUAL_COST = 108405;
const ASSISTED_LIVING_ANNUAL_COST = 54000;
const HOME_CARE_ANNUAL_COST = 61776;
const LTC_COST_INFLATION = 0.04;
const GENERAL_INFLATION = 0.03;
const INVESTMENT_RETURN = 0.06;

export interface LTCPlanningInput {
  clientAge: number;
  gender: "male" | "female";
  healthStatus: "excellent" | "good" | "fair" | "poor";
  liquidAssets: number;
  annualIncome: number;
  annualExpenses: number;
  existingLTCCoverage?: number;
  spouseAge?: number;
  spouseIncome?: number;
  stateOfResidence?: string;
  carePreference: "nursing_home" | "assisted_living" | "home_care" | "blended";
  projectionYears?: number;
}

export interface LTCScenario {
  strategy: string;
  description: string;
  annualCost: number;
  totalCostOverPeriod: number;
  outOfPocketAtClaim: number;
  coverageGap: number;
  assetProtection: number;
  breakEvenAge: number;
  pros: string[];
  cons: string[];
  details: Record<string, number | string>;
}

export interface LTCPlanningResult {
  projectedLTCCost: {
    atAge75: number;
    atAge80: number;
    atAge85: number;
    averageDuration: number;
    annualCostToday: number;
    careType: string;
  };
  probabilityOfNeed: number;
  scenarios: LTCScenario[];
  breakEvenAnalysis: {
    traditionalVsSelfInsure: number;
    hybridVsSelfInsure: number;
    traditionalVsHybrid: number;
  };
  selfInsureCapacity: {
    canSelfInsure: boolean;
    surplusOrDeficit: number;
    yearsOfCoverage: number;
    percentOfAssetsRequired: number;
  };
  notes: string[];
}

function getBaseCost(carePreference: string): number {
  switch (carePreference) {
    case "nursing_home": return NURSING_HOME_ANNUAL_COST;
    case "assisted_living": return ASSISTED_LIVING_ANNUAL_COST;
    case "home_care": return HOME_CARE_ANNUAL_COST;
    case "blended": return (NURSING_HOME_ANNUAL_COST + ASSISTED_LIVING_ANNUAL_COST + HOME_CARE_ANNUAL_COST) / 3;
    default: return NURSING_HOME_ANNUAL_COST;
  }
}

function getCareLabel(pref: string): string {
  switch (pref) {
    case "nursing_home": return "Nursing Home";
    case "assisted_living": return "Assisted Living";
    case "home_care": return "Home Care";
    case "blended": return "Blended Care";
    default: return "Nursing Home";
  }
}

function getProbability(age: number, gender: string, health: string): number {
  const ages = Object.keys(LTC_PROBABILITY_BY_AGE).map(Number).sort((a, b) => a - b);
  let baseProb = LTC_PROBABILITY_BY_AGE[65];
  for (const a of ages) {
    if (age >= a) baseProb = LTC_PROBABILITY_BY_AGE[a];
  }

  if (gender === "female") baseProb *= 1.15;
  else baseProb *= 0.90;

  switch (health) {
    case "excellent": baseProb *= 0.80; break;
    case "good": baseProb *= 1.00; break;
    case "fair": baseProb *= 1.20; break;
    case "poor": baseProb *= 1.50; break;
  }

  return Math.min(1.0, Math.round(baseProb * 1000) / 1000);
}

function fmtCur(v: number): string {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function calculateLTCPlanning(input: LTCPlanningInput): LTCPlanningResult {
  const {
    clientAge,
    gender,
    healthStatus,
    liquidAssets,
    annualIncome,
    annualExpenses,
    existingLTCCoverage = 0,
    spouseAge,
    spouseIncome = 0,
    carePreference,
    projectionYears = 30,
  } = input;

  const notes: string[] = [];
  const baseCost = getBaseCost(carePreference);
  const careLabel = getCareLabel(carePreference);
  const probability = getProbability(clientAge, gender, healthStatus);

  const yearsTo75 = Math.max(0, 75 - clientAge);
  const yearsTo80 = Math.max(0, 80 - clientAge);
  const yearsTo85 = Math.max(0, 85 - clientAge);

  const costAt75 = baseCost * Math.pow(1 + LTC_COST_INFLATION, yearsTo75) * AVERAGE_LTC_DURATION_YEARS;
  const costAt80 = baseCost * Math.pow(1 + LTC_COST_INFLATION, yearsTo80) * AVERAGE_LTC_DURATION_YEARS;
  const costAt85 = baseCost * Math.pow(1 + LTC_COST_INFLATION, yearsTo85) * AVERAGE_LTC_DURATION_YEARS;

  const scenarios: LTCScenario[] = [];

  const annualSurplus = annualIncome - annualExpenses;
  const yearsToNeed = Math.max(0, 80 - clientAge);
  let futureAssets = liquidAssets;
  for (let y = 0; y < yearsToNeed; y++) {
    futureAssets = futureAssets * (1 + INVESTMENT_RETURN) + annualSurplus;
    if (futureAssets < 0) { futureAssets = 0; break; }
  }
  const futureLTCCost = costAt80;
  const selfInsureGap = Math.max(0, futureLTCCost - futureAssets);
  const selfInsureSurplus = futureAssets - futureLTCCost;
  const yearsOfCoverage = baseCost > 0 ? futureAssets / (baseCost * Math.pow(1 + LTC_COST_INFLATION, yearsToNeed)) : 0;
  const pctAssetsRequired = futureAssets > 0 ? (futureLTCCost / futureAssets) * 100 : 100;

  scenarios.push({
    strategy: "Self-Insure",
    description: "Set aside and invest assets to cover potential LTC costs without purchasing insurance.",
    annualCost: 0,
    totalCostOverPeriod: 0,
    outOfPocketAtClaim: Math.round(futureLTCCost),
    coverageGap: Math.round(Math.max(0, selfInsureGap)),
    assetProtection: 0,
    breakEvenAge: 200,
    pros: [
      "No premium payments",
      "Full control over invested funds",
      "If no care needed, assets remain in estate",
      annualSurplus > 0 ? `Current annual surplus of ${fmtCur(annualSurplus)} can be directed to savings` : "",
    ].filter(Boolean),
    cons: [
      `Must accumulate ${fmtCur(futureLTCCost)} for potential care costs`,
      "Investment risk on self-insure fund",
      selfInsureGap > 0 ? `Current projection shows ${fmtCur(selfInsureGap)} shortfall` : "",
      "Extended care could deplete entire estate",
      spouseAge ? "May leave spouse financially vulnerable" : "",
    ].filter(Boolean),
    details: {
      projectedAssetsAtNeed: Math.round(futureAssets),
      projectedCareNeed: Math.round(futureLTCCost),
      surplusOrDeficit: Math.round(selfInsureSurplus),
      yearsOfCoverage: Math.round(yearsOfCoverage * 10) / 10,
    },
  });

  const traditionalPremiumBase = clientAge < 55 ? 2500 : clientAge < 65 ? 3800 : clientAge < 75 ? 5500 : 8000;
  const healthMultiplier = healthStatus === "excellent" ? 0.85 : healthStatus === "good" ? 1.0 : healthStatus === "fair" ? 1.3 : 1.8;
  const genderMultiplier = gender === "female" ? 1.15 : 1.0;
  const traditionalPremium = Math.round(traditionalPremiumBase * healthMultiplier * genderMultiplier);

  const traditionalDailyBenefit = 200;
  const traditionalBenefitPeriod = 3;
  const traditionalMaxBenefit = traditionalDailyBenefit * 365 * traditionalBenefitPeriod;
  const traditionalInflationRider = 0.03;
  const yearsOfPremiums = Math.max(0, 85 - clientAge);
  const totalPremiums = traditionalPremium * yearsOfPremiums;
  const futureBenefitAt80 = traditionalMaxBenefit * Math.pow(1 + traditionalInflationRider, yearsToNeed);
  const traditionalGap = Math.max(0, futureLTCCost - futureBenefitAt80 - existingLTCCoverage);
  const traditionalBreakeven = totalPremiums > 0 ? Math.round(clientAge + totalPremiums / (traditionalDailyBenefit * 365)) : clientAge;

  scenarios.push({
    strategy: "Traditional LTC Insurance",
    description: `Standalone LTC policy with ${fmtCur(traditionalDailyBenefit)}/day benefit, ${traditionalBenefitPeriod}-year benefit period, and ${(traditionalInflationRider * 100).toFixed(0)}% compound inflation protection.`,
    annualCost: traditionalPremium,
    totalCostOverPeriod: Math.round(totalPremiums),
    outOfPocketAtClaim: Math.round(traditionalGap),
    coverageGap: Math.round(traditionalGap),
    assetProtection: Math.round(futureBenefitAt80),
    breakEvenAge: traditionalBreakeven,
    pros: [
      `${fmtCur(traditionalDailyBenefit)}/day benefit with ${(traditionalInflationRider * 100).toFixed(0)}% inflation protection`,
      `Maximum benefit of ${fmtCur(futureBenefitAt80)} at age 80 (inflation-adjusted)`,
      "Tax-qualified premiums may be partially deductible",
      "Protects assets and income for spouse/heirs",
    ],
    cons: [
      `Annual premium of ${fmtCur(traditionalPremium)} (may increase over time)`,
      `Total premiums of ${fmtCur(totalPremiums)} if no claim made`,
      "Use-it-or-lose-it — no benefit if LTC is never needed",
      "Premiums are not guaranteed; insurers can request rate increases",
      healthStatus === "poor" ? "Health status may result in higher premiums or denial" : "",
    ].filter(Boolean),
    details: {
      dailyBenefit: traditionalDailyBenefit,
      benefitPeriodYears: traditionalBenefitPeriod,
      inflationProtection: `${(traditionalInflationRider * 100).toFixed(0)}% compound`,
      maxBenefitAtAge80: Math.round(futureBenefitAt80),
      estimatedAnnualPremium: traditionalPremium,
    },
  });

  const hybridPremiumSingle = clientAge < 55 ? 75000 : clientAge < 65 ? 100000 : clientAge < 75 ? 135000 : 180000;
  const hybridLTCMultiplier = 3;
  const hybridLTCBenefit = hybridPremiumSingle * hybridLTCMultiplier;
  const hybridDeathBenefit = hybridPremiumSingle * 1.5;
  const hybridFutureLTCBenefit = hybridLTCBenefit * Math.pow(1 + traditionalInflationRider, yearsToNeed);
  const hybridGap = Math.max(0, futureLTCCost - hybridFutureLTCBenefit - existingLTCCoverage);
  const hybridBreakeven = Math.round(clientAge + (hybridPremiumSingle / (hybridLTCBenefit / AVERAGE_LTC_DURATION_YEARS / 365)) / 365);

  scenarios.push({
    strategy: "Hybrid Life/LTC Policy",
    description: `Single premium life insurance with LTC rider. Provides ${fmtCur(hybridLTCBenefit)} LTC benefit pool and ${fmtCur(hybridDeathBenefit)} death benefit.`,
    annualCost: 0,
    totalCostOverPeriod: Math.round(hybridPremiumSingle),
    outOfPocketAtClaim: Math.round(hybridGap),
    coverageGap: Math.round(hybridGap),
    assetProtection: Math.round(hybridFutureLTCBenefit),
    breakEvenAge: hybridBreakeven,
    pros: [
      `Single premium of ${fmtCur(hybridPremiumSingle)} — no ongoing premiums`,
      `LTC benefit pool of ${fmtCur(hybridLTCBenefit)} (${hybridLTCMultiplier}x multiplier)`,
      `Death benefit of ${fmtCur(hybridDeathBenefit)} if LTC never needed`,
      "Premium is guaranteed — no rate increases",
      "Return of premium option if policy is surrendered",
    ],
    cons: [
      `Large upfront premium of ${fmtCur(hybridPremiumSingle)}`,
      "Opportunity cost of invested premium",
      "LTC benefits may not keep pace with care cost inflation",
      "Lower LTC benefit than standalone policy for same premium",
    ],
    details: {
      singlePremium: hybridPremiumSingle,
      ltcBenefitPool: hybridLTCBenefit,
      ltcMultiplier: `${hybridLTCMultiplier}x`,
      deathBenefit: hybridDeathBenefit,
      ltcBenefitAtAge80: Math.round(hybridFutureLTCBenefit),
    },
  });

  const traditionalBreakevenVsSelf = totalPremiums > 0 && futureBenefitAt80 > 0
    ? Math.round(clientAge + (totalPremiums / (futureBenefitAt80 / AVERAGE_LTC_DURATION_YEARS)))
    : 0;
  const hybridBreakevenVsSelf = hybridPremiumSingle > 0 && hybridFutureLTCBenefit > 0
    ? Math.round(clientAge + (hybridPremiumSingle / (hybridFutureLTCBenefit / AVERAGE_LTC_DURATION_YEARS)))
    : 0;
  const traditionalVsHybrid = totalPremiums > hybridPremiumSingle
    ? Math.round(clientAge + Math.abs(totalPremiums - hybridPremiumSingle) / (Math.abs(futureBenefitAt80 - hybridFutureLTCBenefit) / AVERAGE_LTC_DURATION_YEARS || 1))
    : 0;

  const canSelfInsure = selfInsureSurplus >= 0 && pctAssetsRequired < 50;

  if (probability > 0.50) {
    notes.push(`There is a ${(probability * 100).toFixed(0)}% probability of needing long-term care. Insurance coverage is strongly recommended.`);
  } else {
    notes.push(`There is a ${(probability * 100).toFixed(0)}% probability of needing long-term care based on age, gender, and health status.`);
  }

  if (canSelfInsure) {
    notes.push(`Self-insurance is viable: projected assets of ${fmtCur(futureAssets)} exceed projected care costs of ${fmtCur(futureLTCCost)}.`);
  } else {
    notes.push(`Self-insurance shows a potential shortfall of ${fmtCur(Math.abs(selfInsureSurplus))}. Insurance may be advisable.`);
  }

  if (spouseAge) {
    notes.push("Spousal protection should be considered — LTC costs can significantly impact the surviving spouse's financial security.");
  }

  notes.push(`${careLabel} costs are projected at ${(LTC_COST_INFLATION * 100).toFixed(0)}% annual inflation. Average duration of care is ${AVERAGE_LTC_DURATION_YEARS} years.`);
  notes.push("Premium estimates are illustrative. Actual premiums depend on underwriting, carrier, and specific policy features.");

  return {
    projectedLTCCost: {
      atAge75: Math.round(costAt75),
      atAge80: Math.round(costAt80),
      atAge85: Math.round(costAt85),
      averageDuration: AVERAGE_LTC_DURATION_YEARS,
      annualCostToday: Math.round(baseCost),
      careType: careLabel,
    },
    probabilityOfNeed: probability,
    scenarios,
    breakEvenAnalysis: {
      traditionalVsSelfInsure: traditionalBreakevenVsSelf,
      hybridVsSelfInsure: hybridBreakevenVsSelf,
      traditionalVsHybrid: traditionalVsHybrid,
    },
    selfInsureCapacity: {
      canSelfInsure,
      surplusOrDeficit: Math.round(selfInsureSurplus),
      yearsOfCoverage: Math.round(yearsOfCoverage * 10) / 10,
      percentOfAssetsRequired: Math.round(pctAssetsRequired * 10) / 10,
    },
    notes,
  };
}
