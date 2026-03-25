import {
  chatCompletion,
  isAIAvailable,
  sanitizeForPrompt,
} from "../ai-core";
import { logger } from "../lib/logger";
import type {
  V33WithdrawalAnalysisInput,
  V33WithdrawalAnalysisResult,
  V33WithdrawalSequenceYear,
  V33BracketFillingAnalysis,
  V33RothConversionWindow,
  V33RmdCoordination,
  V33WithdrawalCompliance,
  V33WithdrawalKeyMetric,
} from "./types";

const V33_WITHDRAWAL_ANALYSIS_SYSTEM_PROMPT = `You are the **Withdrawal Analysis Engine** at OneDigital, a fiduciary wealth management firm. Your role is to:
- Develop year-by-year withdrawal plans with tax optimization
- Determine optimal account draw-down sequencing (taxable → tax-deferred → Roth)
- Implement tax bracket filling strategies to minimize lifetime tax burden
- Identify Roth conversion opportunity windows in low-income years
- Coordinate Required Minimum Distributions (RMDs) with overall strategy
- Monitor IRMAA premium surcharge triggers and Social Security taxation thresholds

**Guardrails:** Educational, not prescriptive. Fiduciary standard. All recommendations backed by tax calculations. No guarantees. Account-level detail required.

## WITHDRAWAL SEQUENCING OPTIMIZATION

### Account Draw-Down Priority
1. Taxable accounts first (manage capital gains with specific lot identification)
2. Tax-deferred accounts (fill low brackets, coordinate with RMDs)
3. Roth accounts last (preserve tax-free growth)

Exception: Fill low tax brackets with traditional IRA withdrawals even when taxable funds available.

### Tax Bracket Filling
- Calculate current taxable income (SS + pension + other)
- Identify available room before next bracket threshold
- Fill with tax-deferred withdrawals at current low rate
- Document savings vs. unoptimized approach

### Roth Conversion Windows
- Identify low-income years (between retirement and RMD age)
- Calculate optimal conversion amount to fill bracket
- Compare conversion tax cost vs. future RMD tax cost
- Model 5-year Roth conversion ladder

### RMD Coordination
- Calculate RMD using Uniform Lifetime Table
- Coordinate with other withdrawals
- Evaluate QCD (Qualified Charitable Distribution) opportunities
- Model multi-year RMD progression

### Tax Impact Analysis
- Marginal bracket impact per withdrawal source
- State tax considerations
- IRMAA Medicare premium surcharge triggers (MAGI thresholds)
- Social Security taxation thresholds (50%/85% provisional income)

## OUTPUT FORMAT
Respond with ONLY valid JSON (no markdown, no code fences):
{
  "advisorNarrative": "Detailed year-by-year withdrawal strategy for advisor with tax calculations and account-level detail",
  "clientSummary": "Plain-language explanation of the withdrawal strategy for client understanding",
  "withdrawalSequence": [
    {
      "year": number,
      "age": number,
      "annualNeed": number,
      "rothWithdrawal": number,
      "taxableWithdrawal": number,
      "traditionalWithdrawal": number,
      "totalTax": number,
      "afterTaxIncome": number,
      "effectiveTaxRate": number,
      "accountBalances": {"roth": number, "taxable": number, "traditional": number},
      "notes": "string"
    }
  ],
  "bracketFillingAnalysis": {
    "filingStatus": "string",
    "currentBracket": number,
    "availableRoomInBracket": number,
    "recommendedFillAmount": number,
    "taxSavingsVsUnoptimized": number,
    "tenYearCumulativeSavings": number,
    "bracketThresholds": [{"bracket": number, "threshold": number}]
  },
  "rothConversionWindows": [
    {
      "yearStart": number,
      "yearEnd": number,
      "ageStart": number,
      "ageEnd": number,
      "recommendedAnnualConversion": number,
      "conversionTaxRate": number,
      "totalConversionAmount": number,
      "totalTaxCost": number,
      "projectedLifetimeSavings": number,
      "rationale": "string"
    }
  ],
  "rmdCoordination": {
    "rmdStartAge": number,
    "projectedFirstRmd": number,
    "rmdSatisfiedByWithdrawals": boolean,
    "qcdOpportunity": number,
    "penaltyRisk": "string",
    "multiYearProjection": [
      {"age": number, "iraBalance": number, "lifeExpectancyFactor": number, "rmdAmount": number, "taxOnRmd": number}
    ]
  },
  "irmaaAnalysis": {
    "currentMagi": number,
    "irmaaTriggerThreshold": number,
    "projectedSurcharge": number,
    "recommendation": "string"
  },
  "ssTaxationAnalysis": {
    "provisionalIncome": number,
    "taxablePercent": number,
    "taxableSsAmount": number,
    "recommendation": "string"
  },
  "complianceDocumentation": {
    "fiduciaryStatement": "string",
    "suitabilityAssessment": "string",
    "riskDisclosures": ["string"],
    "regulatoryReferences": ["string"],
    "reviewTimestamp": "ISO date"
  },
  "keyMetrics": [
    {"label": "string", "value": "string", "status": "positive|negative|neutral", "context": "string"}
  ]
}`;

const V33_WITHDRAWAL_ANALYSIS_USER_TEMPLATE = `Analyze withdrawal strategy for the client.

Client Profile:
- Current Age: {{currentAge}}
- Retirement Age: {{retirementAge}}
- Life Expectancy: {{lifeExpectancy}}
- Filing Status: {{filingStatus}}
- State of Residence: {{stateOfResidence}}

Income Needs:
- Annual Spending Need: {{annualSpendingNeed}}
- Social Security Benefit: {{socialSecurityBenefit}}
- Pension Income: {{pensionIncome}}
- Other Income: {{otherIncome}}

Accounts:
{{accounts}}

Growth Assumptions:
- Expected Growth Rate: {{expectedGrowthRate}}
- Inflation Rate: {{inflationRate}}
- Projection Years: {{projectionYears}}
- QCD Amount: {{qcdAmount}}

Provide:
1. Year-by-year optimal withdrawal sequence with account-level detail
2. Tax bracket filling strategy with savings quantification
3. Roth conversion opportunity windows with cost/benefit analysis
4. RMD coordination and QCD evaluation
5. IRMAA threshold monitoring
6. Social Security taxation threshold analysis
7. Both advisor-detail and client-friendly narratives
8. Complete compliance documentation

All outputs must include specific dollar amounts, tax rates, and account balances.`;

function generateFallbackWithdrawalAnalysis(input: V33WithdrawalAnalysisInput): V33WithdrawalAnalysisResult {
  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const totalBalance = input.accounts.reduce((sum, a) => sum + a.balance, 0);
  const rothBalance = input.accounts.filter(a => a.type === "roth").reduce((sum, a) => sum + a.balance, 0);
  const taxableBalance = input.accounts.filter(a => a.type === "taxable").reduce((sum, a) => sum + a.balance, 0);
  const traditionalBalance = input.accounts.filter(a => ["traditional_ira", "401k"].includes(a.type)).reduce((sum, a) => sum + a.balance, 0);

  const otherIncome = input.socialSecurityBenefit + input.pensionIncome + input.otherIncome;
  const annualGap = Math.max(0, input.annualSpendingNeed - otherIncome);

  const withdrawalSequence: V33WithdrawalSequenceYear[] = [];
  let rBal = rothBalance;
  let tBal = taxableBalance;
  let trBal = traditionalBalance;

  for (let yr = 0; yr < Math.min(input.projectionYears, 10); yr++) {
    const age = input.currentAge + yr;
    const inflatedNeed = annualGap * Math.pow(1 + input.inflationRate, yr);
    let remaining = inflatedNeed;
    let taxableW = 0, tradW = 0, rothW = 0, totalTax = 0;

    if (tBal > 0 && remaining > 0) {
      taxableW = Math.min(remaining, tBal);
      const gainRatio = 0.3;
      totalTax += taxableW * gainRatio * 0.15;
      tBal -= taxableW;
      remaining -= taxableW;
    }
    if (trBal > 0 && remaining > 0) {
      tradW = Math.min(remaining, trBal);
      totalTax += tradW * 0.22;
      trBal -= tradW;
      remaining -= tradW;
    }
    if (rBal > 0 && remaining > 0) {
      rothW = Math.min(remaining, rBal);
      rBal -= rothW;
      remaining -= rothW;
    }

    tBal *= (1 + input.expectedGrowthRate);
    trBal *= (1 + input.expectedGrowthRate);
    rBal *= (1 + input.expectedGrowthRate);

    withdrawalSequence.push({
      year: yr + 1,
      age,
      annualNeed: Math.round(inflatedNeed),
      rothWithdrawal: Math.round(rothW),
      taxableWithdrawal: Math.round(taxableW),
      traditionalWithdrawal: Math.round(tradW),
      totalTax: Math.round(totalTax),
      afterTaxIncome: Math.round(inflatedNeed - totalTax),
      effectiveTaxRate: inflatedNeed > 0 ? Math.round((totalTax / inflatedNeed) * 10000) / 100 : 0,
      accountBalances: { roth: Math.round(rBal), taxable: Math.round(tBal), traditional: Math.round(trBal) },
      notes: age >= 73 ? "RMD applicable" : "",
    });
  }

  const bracketThreshold12 = input.filingStatus === "married_filing_jointly" ? 90750 : 45375;
  const ssProvisional = otherIncome + (input.socialSecurityBenefit * 0.5);
  const availableRoom = Math.max(0, bracketThreshold12 - ssProvisional);

  const yearsToRmd = Math.max(0, 73 - input.currentAge);
  const projectedIraAt73 = traditionalBalance * Math.pow(1 + input.expectedGrowthRate, yearsToRmd);
  const firstRmd = projectedIraAt73 / 26.5;

  const rothWindows: V33RothConversionWindow[] = [];
  if (input.currentAge < 73 && traditionalBalance > 100000) {
    rothWindows.push({
      yearStart: input.currentAge >= input.retirementAge ? 1 : input.retirementAge - input.currentAge,
      yearEnd: Math.min(yearsToRmd, 8),
      ageStart: Math.max(input.currentAge, input.retirementAge),
      ageEnd: Math.min(72, input.currentAge + 8),
      recommendedAnnualConversion: Math.min(availableRoom, traditionalBalance * 0.1),
      conversionTaxRate: 0.12,
      totalConversionAmount: Math.min(availableRoom * yearsToRmd, traditionalBalance * 0.3),
      totalTaxCost: Math.min(availableRoom * yearsToRmd, traditionalBalance * 0.3) * 0.12,
      projectedLifetimeSavings: Math.min(availableRoom * yearsToRmd, traditionalBalance * 0.3) * 0.10,
      rationale: "Low-income window between retirement and RMD age allows conversions at 12% vs. projected 22%+ rates during RMD phase.",
    });
  }

  const advisorNarrative = `## Withdrawal Analysis

### Account Balances
- Taxable: ${fmt(taxableBalance)}
- Traditional IRA/401(k): ${fmt(traditionalBalance)}
- Roth IRA: ${fmt(rothBalance)}
- **Total: ${fmt(totalBalance)}**

### Annual Income Need
- Annual Spending: ${fmt(input.annualSpendingNeed)}
- Social Security: ${fmt(input.socialSecurityBenefit)}
- Pension: ${fmt(input.pensionIncome)}
- Other Income: ${fmt(input.otherIncome)}
- **Annual Gap (portfolio withdrawal needed): ${fmt(annualGap)}**

### Withdrawal Sequencing Strategy
Recommended order: Taxable → Traditional IRA (bracket-filling) → Roth (preserve tax-free growth).

### Tax Bracket Filling
Available room in 12% bracket: ${fmt(availableRoom)}. Fill with traditional IRA withdrawals before moving to higher brackets.

### Roth Conversion Opportunity
${yearsToRmd > 0 ? `${yearsToRmd}-year window before RMD age. Recommended annual conversion: ${fmt(Math.min(availableRoom, traditionalBalance * 0.1))} at 12% rate.` : "RMD age reached; conversion window closed."}

### RMD Projection
RMD start age: 73. Projected first RMD: ${fmt(firstRmd)}.

*AI-enhanced analysis available with OpenAI integration*`;

  const clientSummary = `Your withdrawal strategy focuses on minimizing taxes over your retirement. We recommend drawing from your taxable accounts first, then traditional retirement accounts (filling low tax brackets), and preserving your Roth accounts for last since they grow tax-free. Your annual income gap of ${fmt(annualGap)} (after Social Security and other income) will be covered by strategic account withdrawals.${yearsToRmd > 0 ? ` You have a ${yearsToRmd}-year window to consider Roth conversions at favorable tax rates before required minimum distributions begin.` : ""}`;

  return {
    advisorNarrative,
    clientSummary,
    withdrawalSequence,
    bracketFillingAnalysis: {
      filingStatus: input.filingStatus,
      currentBracket: 12,
      availableRoomInBracket: availableRoom,
      recommendedFillAmount: Math.min(availableRoom, annualGap),
      taxSavingsVsUnoptimized: availableRoom * 0.10,
      tenYearCumulativeSavings: availableRoom * 0.10 * 10,
      bracketThresholds: input.filingStatus === "married_filing_jointly"
        ? [{ bracket: 10, threshold: 22500 }, { bracket: 12, threshold: 90750 }, { bracket: 22, threshold: 190650 }, { bracket: 24, threshold: 364200 }]
        : [{ bracket: 10, threshold: 11250 }, { bracket: 12, threshold: 45375 }, { bracket: 22, threshold: 95350 }, { bracket: 24, threshold: 182100 }],
    },
    rothConversionWindows: rothWindows,
    rmdCoordination: {
      rmdStartAge: 73,
      projectedFirstRmd: Math.round(firstRmd),
      rmdSatisfiedByWithdrawals: false,
      qcdOpportunity: input.qcdAmount || 0,
      penaltyRisk: traditionalBalance > 0 ? "25% excise tax on RMD shortfall (reduced to 10% if corrected promptly)" : "No RMD-eligible accounts",
      multiYearProjection: [
        { age: 73, iraBalance: Math.round(projectedIraAt73), lifeExpectancyFactor: 26.5, rmdAmount: Math.round(firstRmd), taxOnRmd: Math.round(firstRmd * 0.22) },
        { age: 75, iraBalance: Math.round(projectedIraAt73 * 0.92), lifeExpectancyFactor: 24.6, rmdAmount: Math.round(projectedIraAt73 * 0.92 / 24.6), taxOnRmd: Math.round((projectedIraAt73 * 0.92 / 24.6) * 0.22) },
        { age: 80, iraBalance: Math.round(projectedIraAt73 * 0.75), lifeExpectancyFactor: 19.5, rmdAmount: Math.round(projectedIraAt73 * 0.75 / 19.5), taxOnRmd: Math.round((projectedIraAt73 * 0.75 / 19.5) * 0.22) },
      ],
    },
    irmaaAnalysis: {
      currentMagi: ssProvisional + annualGap,
      irmaaTriggerThreshold: input.filingStatus === "married_filing_jointly" ? 194000 : 97000,
      projectedSurcharge: (ssProvisional + annualGap) > (input.filingStatus === "married_filing_jointly" ? 194000 : 97000) ? 1668 : 0,
      recommendation: (ssProvisional + annualGap) > (input.filingStatus === "married_filing_jointly" ? 194000 : 97000)
        ? "MAGI exceeds IRMAA threshold. Consider spreading withdrawals or using Roth to reduce taxable income."
        : "MAGI below IRMAA threshold. Current withdrawal levels preserve standard Medicare premiums.",
    },
    ssTaxationAnalysis: {
      provisionalIncome: ssProvisional,
      taxablePercent: ssProvisional > (input.filingStatus === "married_filing_jointly" ? 44000 : 34000) ? 85 : ssProvisional > (input.filingStatus === "married_filing_jointly" ? 32000 : 25000) ? 50 : 0,
      taxableSsAmount: ssProvisional > (input.filingStatus === "married_filing_jointly" ? 44000 : 34000) ? input.socialSecurityBenefit * 0.85 : ssProvisional > (input.filingStatus === "married_filing_jointly" ? 32000 : 25000) ? input.socialSecurityBenefit * 0.5 : 0,
      recommendation: "Coordinate withdrawal amounts to minimize the portion of Social Security subject to taxation.",
    },
    complianceDocumentation: {
      fiduciaryStatement: "All withdrawal recommendations made in the client's best interest under fiduciary duty.",
      suitabilityAssessment: "Withdrawal strategy assessed for suitability given client's tax situation, income needs, and account structure.",
      riskDisclosures: [
        "Tax laws are subject to change; withdrawal tax treatment may be modified by future legislation.",
        "Actual tax liability depends on total income from all sources in the tax year.",
        "Early withdrawals before age 59½ may incur 10% penalty in addition to income tax.",
        "RMD failure results in 25% excise tax on the shortfall amount.",
        "Roth conversion is an irrevocable taxable event.",
      ],
      regulatoryReferences: [
        "SECURE 2.0 Act (RMD age 73, penalty reduction)",
        "IRC §408A (Roth IRA conversion rules)",
        "IRC §72(t) (early distribution penalty)",
        "Medicare IRMAA (42 CFR §407.20)",
        "IRC §86 (Social Security taxation)",
      ],
      reviewTimestamp: new Date().toISOString(),
    },
    keyMetrics: [
      { label: "Annual Income Gap", value: fmt(annualGap), status: "neutral", context: "Amount needed from portfolio withdrawals" },
      { label: "Roth Conversion Window", value: yearsToRmd > 0 ? `${yearsToRmd} years` : "Closed", status: yearsToRmd > 0 ? "positive" : "neutral", context: "Years before RMD obligations begin" },
      { label: "Projected First RMD", value: fmt(firstRmd), status: "neutral", context: `At age 73 from ${fmt(projectedIraAt73)} IRA balance` },
      { label: "Tax Bracket Room", value: fmt(availableRoom), status: availableRoom > 0 ? "positive" : "neutral", context: "Available room in 12% bracket for optimized withdrawals" },
    ],
    evidenceCitations: [
      { sourceId: "WD_DRAW_SEQUENCE", sourceType: "calculation", description: "Optimal draw-down: taxable → traditional (bracket-fill) → Roth (tax-free last)", reference: "Tax-efficient withdrawal ordering research", confidence: "high" },
      { sourceId: "WD_RMD_RULE", sourceType: "regulation", description: "RMD start age 73, 25% excise on shortfall (10% if corrected)", reference: "SECURE 2.0 Act §107, IRC §4974", confidence: "high" },
      { sourceId: "WD_ROTH_CONV", sourceType: "regulation", description: "Roth conversion is irrevocable taxable event under IRC §408A", reference: "IRC §408A", confidence: "high" },
      { sourceId: "WD_IRMAA", sourceType: "regulation", description: `IRMAA threshold: ${fmt(input.filingStatus === "married_filing_jointly" ? 194000 : 97000)} for ${input.filingStatus}`, reference: "42 CFR §407.20", confidence: "high" },
      { sourceId: "WD_SS_TAX", sourceType: "regulation", description: "Social Security taxation: 50% at provisional income >$25K/$32K, 85% at >$34K/$44K", reference: "IRC §86", confidence: "high" },
      { sourceId: "WD_BRACKET_FILL", sourceType: "calculation", description: `${fmt(availableRoom)} available in 12% bracket for optimized withdrawals`, reference: "2024 federal tax brackets", confidence: "high" },
    ],
  };
}

export async function generateWithdrawalAnalysis(
  input: V33WithdrawalAnalysisInput
): Promise<V33WithdrawalAnalysisResult> {
  if (!isAIAvailable()) {
    return generateFallbackWithdrawalAnalysis(input);
  }

  try {
    const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    const context: Record<string, string> = {
      currentAge: String(input.currentAge),
      retirementAge: String(input.retirementAge),
      lifeExpectancy: String(input.lifeExpectancy),
      filingStatus: input.filingStatus,
      stateOfResidence: input.stateOfResidence,
      annualSpendingNeed: fmt(input.annualSpendingNeed),
      socialSecurityBenefit: fmt(input.socialSecurityBenefit),
      pensionIncome: fmt(input.pensionIncome),
      otherIncome: fmt(input.otherIncome),
      accounts: JSON.stringify(input.accounts, null, 2),
      expectedGrowthRate: `${(input.expectedGrowthRate * 100).toFixed(1)}%`,
      inflationRate: `${(input.inflationRate * 100).toFixed(1)}%`,
      projectionYears: String(input.projectionYears),
      qcdAmount: input.qcdAmount ? fmt(input.qcdAmount) : "Not specified",
    };

    const userPrompt = V33_WITHDRAWAL_ANALYSIS_USER_TEMPLATE.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return context[key] !== undefined ? sanitizeForPrompt(context[key], 5000) : "";
    });

    const raw = await chatCompletion(V33_WITHDRAWAL_ANALYSIS_SYSTEM_PROMPT, userPrompt, true, 4096);
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

    const fallback = generateFallbackWithdrawalAnalysis(input);

    return {
      advisorNarrative: parsed.advisorNarrative || fallback.advisorNarrative,
      clientSummary: parsed.clientSummary || fallback.clientSummary,
      withdrawalSequence: Array.isArray(parsed.withdrawalSequence) ? parsed.withdrawalSequence : fallback.withdrawalSequence,
      bracketFillingAnalysis: parsed.bracketFillingAnalysis || fallback.bracketFillingAnalysis,
      rothConversionWindows: Array.isArray(parsed.rothConversionWindows) ? parsed.rothConversionWindows : fallback.rothConversionWindows,
      rmdCoordination: parsed.rmdCoordination || fallback.rmdCoordination,
      irmaaAnalysis: parsed.irmaaAnalysis || fallback.irmaaAnalysis,
      ssTaxationAnalysis: parsed.ssTaxationAnalysis || fallback.ssTaxationAnalysis,
      complianceDocumentation: parsed.complianceDocumentation || fallback.complianceDocumentation,
      keyMetrics: Array.isArray(parsed.keyMetrics) ? parsed.keyMetrics : fallback.keyMetrics,
      evidenceCitations: Array.isArray(parsed.evidenceCitations) ? parsed.evidenceCitations : fallback.evidenceCitations,
    };
  } catch (error) {
    logger.error({ err: error }, "Withdrawal analysis generation error");
    return generateFallbackWithdrawalAnalysis(input);
  }
}
