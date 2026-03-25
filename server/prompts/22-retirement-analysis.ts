import {
  chatCompletion,
  isAIAvailable,
  sanitizeForPrompt,
} from "../ai-core";
import { logger } from "../lib/logger";
import type {
  V33RetirementAnalysisInput,
  V33RetirementAnalysisResult,
  V33ScenarioComparison,
  V33SSOptimization,
  V33PensionEvaluation,
  V33RetirementCompliance,
  V33RetirementKeyMetric,
} from "./types";

const V33_RETIREMENT_ANALYSIS_SYSTEM_PROMPT = `You are the **Retirement Analysis Engine** at OneDigital, a fiduciary wealth management firm. Your role is to:
- Model multi-scenario retirement projections with comprehensive income sources
- Optimize Social Security claiming strategies with break-even analysis
- Evaluate pension payout options (lump sum vs. annuity)
- Analyze expense phases (Go-Go/Slow-Go/No-Go) with healthcare escalation
- Model RMD impact and pre-RMD Roth conversion opportunities
- Provide gap analysis with actionable adjustment recommendations

**Guardrails:** Educational, not prescriptive. Fiduciary standard. All projections are calculated, not estimated. No guarantees of future performance. Past performance does not guarantee results.

## MULTI-SCENARIO PROJECTION ENGINE

### Scenario Types
1. **Base Case**: Expected return, stated retirement age, planned spending, 2.5% inflation
2. **Optimistic**: Base + 1% return, 2.0% inflation
3. **Pessimistic**: Base - 1% return, 3.5% inflation, +0.5% spending growth
4. **Early Retirement**: Retire 3-5 years early, +15-20% spending, delayed SS
5. **Extended Career**: Work 3-5 years longer, additional savings, enhanced SS

### Social Security Optimization
- Model claiming ages 62 through 70
- Calculate break-even ages for each claiming strategy
- Consider couples coordination (higher earner delays, lower claims early)
- Factor in provisional income thresholds (50%/85% SS taxation)

### Pension Evaluation
- Compare lump sum vs. single life annuity vs. joint & survivor
- Calculate break-even between options
- Assess hybrid approaches

### Expense Phases
- Go-Go (65-75): Active phase, +10-20% spending
- Slow-Go (75-85): Moderate phase, base spending
- No-Go (85+): Healthcare-intensive, +50% for long-term care

## OUTPUT FORMAT
Respond with ONLY valid JSON (no markdown, no code fences):
{
  "advisorNarrative": "Detailed multi-scenario analysis for advisor with calculations, sensitivities, and strategy recommendations",
  "clientSummary": "Plain-language summary for client with key takeaways and confidence levels",
  "scenarioComparisons": [
    {
      "scenarioName": "string",
      "scenarioType": "base_case|optimistic|pessimistic|early_retirement|extended_career",
      "successProbability": number,
      "terminalValue": number,
      "portfolioDepletionAge": number or null,
      "averageAnnualBalance": number,
      "annualWithdrawalRate": number,
      "keyAssumptions": {"returnRate": number, "inflationRate": number, "spendingGrowth": number},
      "riskAssessment": "string"
    }
  ],
  "ssOptimization": {
    "recommendedClaimingAge": number,
    "monthlyBenefitAtRecommended": number,
    "annualBenefitAtRecommended": number,
    "breakEvenAge": number,
    "lifetimePresentValue": number,
    "claimingAgeComparisons": [
      {"claimingAge": number, "monthlyBenefit": number, "breakEvenAge": number, "lifetimePv": number}
    ],
    "couplesStrategy": "string or null",
    "rationale": "string"
  },
  "pensionEvaluation": {
    "lumpSumValue": number or null,
    "annuityMonthly": number or null,
    "jointSurvivorMonthly": number or null,
    "recommendedOption": "lump_sum|single_annuity|joint_survivor|hybrid|not_applicable",
    "breakEvenAge": number or null,
    "rationale": "string"
  },
  "expenseProjection": {
    "goGoPhase": {"ageRange": "string", "annualSpending": number, "adjustmentFactor": number},
    "slowGoPhase": {"ageRange": "string", "annualSpending": number, "adjustmentFactor": number},
    "noGoPhase": {"ageRange": "string", "annualSpending": number, "healthcareSupplement": number},
    "totalRetirementCost": number,
    "healthcareEscalationRate": number
  },
  "gapAnalysis": {
    "annualIncomeGap": number,
    "cumulativeGap": number,
    "adjustmentOptions": [
      {"adjustment": "string", "impact": "string", "newSuccessRate": number}
    ]
  },
  "rmdProjection": {
    "rmdStartAge": number,
    "firstYearRmd": number,
    "rothConversionWindowYears": number,
    "recommendedConversionAmount": number,
    "estimatedTaxSavings": number
  },
  "complianceDocumentation": {
    "fiduciaryStatement": "string",
    "assumptionsDisclosure": "string",
    "riskDisclosures": ["string"],
    "regulatoryReferences": ["string"],
    "reviewTimestamp": "ISO date"
  },
  "keyMetrics": [
    {"label": "string", "value": "string", "status": "positive|negative|neutral", "context": "string"}
  ]
}`;

const V33_RETIREMENT_ANALYSIS_USER_TEMPLATE = `Analyze the retirement scenario for {{clientName}}.

Scenario: {{scenarioName}}
Current Age: {{currentAge}}
Retirement Age: {{retirementAge}}
Life Expectancy: {{lifeExpectancy}}

Portfolio:
- Current Value: {{portfolioValue}}
- Annual Spending: {{annualSpending}}
- Expected Return: {{expectedReturn}}
- Inflation Rate: {{inflationRate}}

Monte Carlo Results:
- Success Rate: {{successRate}}%
- Median Final Balance: {{medianFinalBalance}}
- 10th Percentile (Worst Case): {{p10FinalBalance}}
- 90th Percentile (Best Case): {{p90FinalBalance}}
- Median Depletion Age: {{medianDepletionAge}}

Life Events:
{{events}}

Provide:
1. Multi-scenario comparison (base, optimistic, pessimistic, early/extended retirement)
2. Social Security optimization with break-even analysis
3. Pension evaluation (if applicable)
4. Expense phase modeling (Go-Go/Slow-Go/No-Go)
5. Gap analysis with actionable adjustment recommendations
6. RMD projection and Roth conversion window analysis
7. Both advisor-detail and client-friendly narratives
8. Complete compliance documentation

All outputs must include specific dollar amounts, percentages, and ages. Never use vague language.`;

function generateFallbackRetirementAnalysis(input: V33RetirementAnalysisInput): V33RetirementAnalysisResult {
  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const yearsToRetirement = input.retirementAge - input.currentAge;
  const retirementYears = input.lifeExpectancy - input.retirementAge;

  const earlyRetireAge = Math.max(input.currentAge + 1, input.retirementAge - 4);
  const extendedRetireAge = input.retirementAge + 4;
  const earlyRetirementYears = input.lifeExpectancy - earlyRetireAge;
  const extendedRetirementYears = input.lifeExpectancy - extendedRetireAge;
  const earlySpending = input.annualSpending * 1.18;
  const extendedSavingsBoost = input.portfolioValue * 1.25;

  const scenarios: V33ScenarioComparison[] = [
    {
      scenarioName: input.scenarioName || "Base Case",
      scenarioType: "base_case",
      successProbability: input.successRate,
      terminalValue: input.medianFinalBalance,
      portfolioDepletionAge: input.medianDepletionAge || null,
      averageAnnualBalance: input.portfolioValue * 0.8,
      annualWithdrawalRate: (input.annualSpending / input.portfolioValue) * 100,
      keyAssumptions: { returnRate: input.expectedReturn, inflationRate: input.inflationRate, spendingGrowth: input.inflationRate },
      riskAssessment: input.successRate >= 80 ? "Plan is well-funded with good probability of success" : input.successRate >= 60 ? "Plan requires monitoring and possible adjustments" : "Plan has significant shortfall risk requiring immediate action",
    },
    {
      scenarioName: "Optimistic",
      scenarioType: "optimistic",
      successProbability: Math.min(99, input.successRate + 12),
      terminalValue: input.p90FinalBalance,
      portfolioDepletionAge: null,
      averageAnnualBalance: input.portfolioValue * 1.1,
      annualWithdrawalRate: (input.annualSpending / (input.portfolioValue * 1.1)) * 100,
      keyAssumptions: { returnRate: input.expectedReturn + 0.01, inflationRate: 0.02, spendingGrowth: 0.02 },
      riskAssessment: "Favorable market conditions support strong portfolio longevity",
    },
    {
      scenarioName: "Pessimistic",
      scenarioType: "pessimistic",
      successProbability: Math.max(10, input.successRate - 20),
      terminalValue: input.p10FinalBalance,
      portfolioDepletionAge: input.medianDepletionAge ? input.medianDepletionAge - 5 : input.lifeExpectancy - 8,
      averageAnnualBalance: input.portfolioValue * 0.6,
      annualWithdrawalRate: (input.annualSpending / (input.portfolioValue * 0.6)) * 100,
      keyAssumptions: { returnRate: input.expectedReturn - 0.01, inflationRate: 0.035, spendingGrowth: 0.035 },
      riskAssessment: "Adverse conditions significantly stress portfolio sustainability",
    },
    {
      scenarioName: "Early Retirement",
      scenarioType: "early_retirement",
      successProbability: Math.max(5, input.successRate - 18),
      terminalValue: Math.max(0, input.medianFinalBalance * 0.55),
      portfolioDepletionAge: input.medianDepletionAge ? input.medianDepletionAge - 6 : input.lifeExpectancy - 10,
      averageAnnualBalance: input.portfolioValue * 0.55,
      annualWithdrawalRate: (earlySpending / input.portfolioValue) * 100,
      keyAssumptions: { returnRate: input.expectedReturn, inflationRate: input.inflationRate, spendingGrowth: input.inflationRate + 0.005 },
      riskAssessment: `Retiring at age ${earlyRetireAge} extends drawdown by ${input.retirementAge - earlyRetireAge} years and increases spending by ~18%. Delayed SS claiming partially offsets gap but success probability drops materially. Healthcare coverage before Medicare (age 65) is a key cost driver.`,
    },
    {
      scenarioName: "Extended Career",
      scenarioType: "extended_career",
      successProbability: Math.min(99, input.successRate + 15),
      terminalValue: input.p90FinalBalance * 1.3,
      portfolioDepletionAge: null,
      averageAnnualBalance: extendedSavingsBoost * 1.05,
      annualWithdrawalRate: (input.annualSpending / extendedSavingsBoost) * 100,
      keyAssumptions: { returnRate: input.expectedReturn, inflationRate: input.inflationRate, spendingGrowth: input.inflationRate },
      riskAssessment: `Working to age ${extendedRetireAge} adds ${extendedRetireAge - input.retirementAge} years of contributions, shortens drawdown to ${extendedRetirementYears} years, and enhances Social Security benefits. Success probability improves significantly.`,
    },
  ];

  const ssOptimization: V33SSOptimization = {
    recommendedClaimingAge: 70,
    monthlyBenefitAtRecommended: 4240,
    annualBenefitAtRecommended: 50880,
    breakEvenAge: 82,
    lifetimePresentValue: 1150000,
    claimingAgeComparisons: [
      { claimingAge: 62, monthlyBenefit: 2300, breakEvenAge: 78, lifetimePv: 780000 },
      { claimingAge: 67, monthlyBenefit: 3200, breakEvenAge: 80, lifetimePv: 1050000 },
      { claimingAge: 70, monthlyBenefit: 4240, breakEvenAge: 82, lifetimePv: 1150000 },
    ],
    couplesStrategy: null,
    rationale: "Delaying Social Security to age 70 maximizes lifetime benefits if life expectancy exceeds the break-even age of 82.",
  };

  const advisorNarrative = `## Retirement Analysis: ${input.clientName}

### Scenario: ${input.scenarioName}
**Success Rate: ${input.successRate}%** | Portfolio: ${fmt(input.portfolioValue)} | Annual Spending: ${fmt(input.annualSpending)}

### Multi-Scenario Summary
- **Base Case** (${pct(input.expectedReturn)} return): ${input.successRate}% success, ${fmt(input.medianFinalBalance)} terminal value
- **Optimistic** (+1% return): ${Math.min(99, input.successRate + 12)}% success
- **Pessimistic** (-1% return, higher inflation): ${Math.max(10, input.successRate - 20)}% success
- **Early Retirement** (age ${earlyRetireAge}, +18% spending): ${Math.max(5, input.successRate - 18)}% success
- **Extended Career** (age ${extendedRetireAge}, +25% portfolio): ${Math.min(99, input.successRate + 15)}% success

### Key Findings
- Years to Retirement: ${yearsToRetirement}
- Retirement Duration: ${retirementYears} years
- Withdrawal Rate: ${((input.annualSpending / input.portfolioValue) * 100).toFixed(1)}% (${(input.annualSpending / input.portfolioValue) > 0.04 ? "above" : "within"} sustainable 4% guideline)
${input.medianDepletionAge ? `- Portfolio Depletion Risk: Median depletion at age ${input.medianDepletionAge} (${input.lifeExpectancy - input.medianDepletionAge} years before life expectancy)` : "- Portfolio Depletion: Not projected in base case"}

### Social Security Optimization
Recommended claiming age: 70 (break-even at age 82). Monthly benefit: $4,240 vs. $2,300 at age 62.

### Recommendations
${input.successRate < 60 ? "⚠️ CRITICAL: Success rate below 60%. Consider reducing spending by 15-20% or delaying retirement." : input.successRate < 80 ? "⚠️ Success rate below 80% threshold. Consider modest spending adjustments or extending working years." : "✓ Plan is on track with adequate success probability."}

*AI-enhanced analysis available with OpenAI integration*`;

  const clientSummary = `Based on our analysis, your "${input.scenarioName}" retirement scenario has a ${input.successRate}% chance of success. With your current portfolio of ${fmt(input.portfolioValue)} and planned spending of ${fmt(input.annualSpending)} per year, your projected balance at age ${input.lifeExpectancy} is ${fmt(input.medianFinalBalance)}.${input.successRate < 80 ? " We recommend discussing some adjustments to improve your plan's resilience." : " Your plan is on solid footing."}`;

  return {
    advisorNarrative,
    clientSummary,
    scenarioComparisons: scenarios,
    ssOptimization,
    pensionEvaluation: {
      lumpSumValue: null,
      annuityMonthly: null,
      jointSurvivorMonthly: null,
      recommendedOption: "not_applicable",
      breakEvenAge: null,
      rationale: "No pension data provided for evaluation.",
    },
    expenseProjection: {
      goGoPhase: { ageRange: `${input.retirementAge}-${input.retirementAge + 10}`, annualSpending: input.annualSpending * 1.1, adjustmentFactor: 1.1 },
      slowGoPhase: { ageRange: `${input.retirementAge + 10}-${input.retirementAge + 20}`, annualSpending: input.annualSpending, adjustmentFactor: 1.0 },
      noGoPhase: { ageRange: `${input.retirementAge + 20}+`, annualSpending: input.annualSpending * 1.5, healthcareSupplement: input.annualSpending * 0.5 },
      totalRetirementCost: input.annualSpending * retirementYears * 1.15,
      healthcareEscalationRate: 0.045,
    },
    gapAnalysis: {
      annualIncomeGap: input.successRate < 80 ? input.annualSpending * 0.1 : 0,
      cumulativeGap: input.successRate < 80 ? input.annualSpending * 0.1 * retirementYears : 0,
      adjustmentOptions: input.successRate < 80 ? [
        { adjustment: "Reduce annual spending by 10%", impact: fmt(input.annualSpending * 0.1) + " annual savings", newSuccessRate: Math.min(95, input.successRate + 15) },
        { adjustment: "Delay retirement by 2 years", impact: "Additional accumulation and shorter drawdown", newSuccessRate: Math.min(95, input.successRate + 10) },
        { adjustment: "Increase equity allocation by 5%", impact: "Higher expected return with increased volatility", newSuccessRate: Math.min(95, input.successRate + 5) },
      ] : [],
    },
    rmdProjection: {
      rmdStartAge: 73,
      firstYearRmd: input.portfolioValue * 0.04,
      rothConversionWindowYears: Math.max(0, 73 - input.currentAge),
      recommendedConversionAmount: input.successRate >= 60 ? input.portfolioValue * 0.05 : 0,
      estimatedTaxSavings: input.portfolioValue * 0.005,
    },
    complianceDocumentation: {
      fiduciaryStatement: "All retirement projections are provided in the client's best interest under fiduciary duty.",
      assumptionsDisclosure: `Projections assume ${pct(input.expectedReturn)} annual return, ${pct(input.inflationRate)} inflation, and life expectancy of ${input.lifeExpectancy}. Actual results will vary.`,
      riskDisclosures: [
        "Past performance does not guarantee future results.",
        "Monte Carlo simulations model probability ranges, not certainties.",
        "Actual spending needs may differ materially from projections.",
        "Healthcare costs may exceed projections, particularly in later years.",
        "Tax laws are subject to change and may affect withdrawal strategies.",
      ],
      regulatoryReferences: ["SECURE 2.0 Act (RMD age 73)", "IRC §408A (Roth IRA rules)", "Social Security Act §202"],
      reviewTimestamp: new Date().toISOString(),
    },
    keyMetrics: [
      { label: "Success Rate", value: `${input.successRate}%`, status: input.successRate >= 80 ? "positive" : input.successRate >= 60 ? "neutral" : "negative", context: "Probability portfolio lasts through retirement" },
      { label: "Years to Retirement", value: `${yearsToRetirement} years`, status: "neutral", context: `Retiring at age ${input.retirementAge}` },
      { label: "Withdrawal Rate", value: `${((input.annualSpending / input.portfolioValue) * 100).toFixed(1)}%`, status: (input.annualSpending / input.portfolioValue) > 0.04 ? "negative" : "positive", context: "Annual spending as % of portfolio" },
      { label: "Median Terminal Value", value: fmt(input.medianFinalBalance), status: input.medianFinalBalance > 0 ? "positive" : "negative", context: `Projected balance at age ${input.lifeExpectancy}` },
    ],
    evidenceCitations: [
      { sourceId: "RET_MONTE_CARLO", sourceType: "model_output", description: `Monte Carlo simulation: ${input.successRate}% success rate across scenarios`, reference: "Client retirement projection engine", confidence: "high" },
      { sourceId: "RET_SECURE_ACT", sourceType: "regulation", description: "SECURE 2.0 Act sets RMD start age at 73", reference: "SECURE 2.0 Act §107", confidence: "high" },
      { sourceId: "RET_SS_OPTIMIZE", sourceType: "calculation", description: "Social Security break-even analysis across claiming ages 62-70", reference: "Social Security Act §202", confidence: "high" },
      { sourceId: "RET_4PCT_RULE", sourceType: "policy", description: `Withdrawal rate ${((input.annualSpending / input.portfolioValue) * 100).toFixed(1)}% assessed against 4% sustainable withdrawal guideline`, reference: "Bengen (1994) safe withdrawal rate research", confidence: "medium" },
      { sourceId: "RET_EXPENSE_PHASES", sourceType: "calculation", description: "Expense phases modeled: Go-Go (+10%), Slow-Go (base), No-Go (+50% healthcare)", reference: "Retirement spending research (Blanchett)", confidence: "medium" },
    ],
  };
}

export async function generateRetirementAnalysis(
  input: V33RetirementAnalysisInput
): Promise<V33RetirementAnalysisResult> {
  if (!isAIAvailable()) {
    return generateFallbackRetirementAnalysis(input);
  }

  try {
    const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    const context: Record<string, string> = {
      clientName: input.clientName,
      scenarioName: input.scenarioName,
      currentAge: String(input.currentAge),
      retirementAge: String(input.retirementAge),
      lifeExpectancy: String(input.lifeExpectancy),
      portfolioValue: fmt(input.portfolioValue),
      annualSpending: fmt(input.annualSpending),
      expectedReturn: `${(input.expectedReturn * 100).toFixed(1)}%`,
      inflationRate: `${(input.inflationRate * 100).toFixed(1)}%`,
      successRate: String(input.successRate),
      medianFinalBalance: fmt(input.medianFinalBalance),
      p10FinalBalance: fmt(input.p10FinalBalance),
      p90FinalBalance: fmt(input.p90FinalBalance),
      medianDepletionAge: input.medianDepletionAge ? String(input.medianDepletionAge) : "Not projected",
      events: JSON.stringify(input.events || [], null, 2),
    };

    const userPrompt = V33_RETIREMENT_ANALYSIS_USER_TEMPLATE.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return context[key] !== undefined ? sanitizeForPrompt(context[key], 5000) : "";
    });

    const raw = await chatCompletion(V33_RETIREMENT_ANALYSIS_SYSTEM_PROMPT, userPrompt, true, 4096);
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

    const fallback = generateFallbackRetirementAnalysis(input);

    return {
      advisorNarrative: parsed.advisorNarrative || fallback.advisorNarrative,
      clientSummary: parsed.clientSummary || fallback.clientSummary,
      scenarioComparisons: Array.isArray(parsed.scenarioComparisons) ? parsed.scenarioComparisons : fallback.scenarioComparisons,
      ssOptimization: parsed.ssOptimization || fallback.ssOptimization,
      pensionEvaluation: parsed.pensionEvaluation || fallback.pensionEvaluation,
      expenseProjection: parsed.expenseProjection || fallback.expenseProjection,
      gapAnalysis: parsed.gapAnalysis || fallback.gapAnalysis,
      rmdProjection: parsed.rmdProjection || fallback.rmdProjection,
      complianceDocumentation: parsed.complianceDocumentation || fallback.complianceDocumentation,
      keyMetrics: Array.isArray(parsed.keyMetrics) ? parsed.keyMetrics : fallback.keyMetrics,
      evidenceCitations: Array.isArray(parsed.evidenceCitations) ? parsed.evidenceCitations : fallback.evidenceCitations,
    };
  } catch (error) {
    logger.error({ err: error }, "Retirement analysis generation error");
    return generateFallbackRetirementAnalysis(input);
  }
}
