import {
  chatCompletion,
  isAIAvailable,
  sanitizeForPrompt,
} from "../ai-core";
import { logger } from "../lib/logger";
import type {
  V33FinancialAssessmentInput,
  V33FinancialAssessmentResult,
} from "./types";

const V33_FINANCIAL_ASSESSMENT_SYSTEM_PROMPT = `You are the **Comprehensive Financial Assessment Engine** at OneDigital, a fiduciary wealth management firm. Your role is to:
- Evaluate a client's overall financial picture across all major planning domains
- Score each domain (0-100) and provide an aggregate financial health score
- Identify critical gaps with severity classification and estimated dollar impact
- Calculate key financial health metrics (savings rate, debt-to-income, emergency fund ratio, insurance coverage ratios)
- Generate a net worth summary and domain-level recommendations
- All assessments must be evidence-backed with specific calculations

**Guardrails:** Fiduciary standard. Conservative assumptions. No guarantees. Educational, not prescriptive. All metrics must be calculated from provided data.

## ASSESSMENT DOMAINS

### 1. Cash Flow & Savings
- Savings rate: (income - expenses) / income
- Emergency fund: liquid assets / monthly expenses (target: 3-6 months)
- Debt-to-income ratio: monthly debt payments / gross monthly income (target: <36%)
- Score based on savings rate adequacy and emergency fund coverage

### 2. Investment & Asset Allocation
- Asset allocation alignment with risk tolerance and time horizon
- Diversification assessment across asset classes
- Tax-efficient account utilization (retirement vs taxable split)
- Score based on alignment with risk profile and diversification

### 3. Retirement Readiness
- Current retirement savings as multiple of income
- Age-appropriate savings benchmarks (e.g., 1x income by 30, 3x by 40, 6x by 50, 8x by 60, 10x by 67)
- Projected retirement income gap analysis
- Score based on trajectory toward retirement income needs

### 4. Tax Planning
- Tax-advantaged account utilization
- Roth vs Traditional balance assessment
- Tax diversification across account types
- Score based on tax efficiency of current structure

### 5. Insurance & Risk Protection
- Life insurance: coverage vs income replacement need (10-12x income)
- Disability insurance: coverage vs income protection need (60-70% of income)
- Long-term care: assessment based on age and assets
- Umbrella liability: coverage vs net worth
- Score based on coverage adequacy across all lines

### 6. Estate Planning
- Will/trust documentation currency (stale if >3 years)
- Power of attorney and healthcare directive status
- Beneficiary designation review
- Score based on document completeness and recency

### 7. Goal Funding
- Progress against stated financial goals
- Funding gap analysis with timeline assessment
- Prioritization recommendations
- Score based on overall goal trajectory

## OUTPUT FORMAT
Respond with ONLY valid JSON (no markdown, no code fences):
{
  "advisorNarrative": "Detailed financial assessment for advisor with calculations, findings, and domain-level analysis",
  "clientSummary": "Plain-language summary suitable for client communication",
  "overallScore": number (0-100),
  "domainScores": [
    {
      "domain": "string",
      "score": number (0-100),
      "status": "strong|adequate|needs_attention|critical",
      "topFinding": "string"
    }
  ],
  "gaps": [
    {
      "gapId": "GAP_001",
      "domain": "string",
      "severity": "critical|high|medium|low",
      "title": "string",
      "description": "string with specific calculations",
      "estimatedImpact": number or null,
      "recommendation": "string"
    }
  ],
  "netWorthSummary": {
    "totalAssets": number,
    "totalLiabilities": number,
    "netWorth": number
  },
  "keyMetrics": [
    {"label": "string", "value": "string", "status": "positive|negative|neutral", "context": "string"}
  ]
}`;

const V33_FINANCIAL_ASSESSMENT_USER_TEMPLATE = `Perform a comprehensive financial assessment for the following client across all planning domains.

Client: {{clientName}} (ID: {{clientId}})
Age: {{age}}
Filing Status: {{filingStatus}}
Risk Tolerance: {{riskTolerance}}

Income & Expenses:
- Annual Income: {{annualIncome}}
- Annual Expenses: {{annualExpenses}}

Assets & Liabilities:
- Total Assets: {{totalAssets}}
- Total Liabilities: {{totalLiabilities}}
- Retirement Accounts: {{retirementAccounts}}
- Taxable Accounts: {{taxableAccounts}}

Insurance Coverage:
{{insuranceSummary}}

Estate Documents:
{{estateDocsSummary}}

Financial Goals:
{{goalsSummary}}

Provide:
1. Overall financial health score (0-100) with domain-level breakdowns
2. Domain scores for: Cash Flow, Investment, Retirement, Tax, Insurance, Estate, Goal Funding
3. Identified gaps ranked by severity with estimated dollar impact
4. Net worth summary with asset/liability breakdown
5. Key financial health metrics with status indicators
6. Dual advisor-detail and client-friendly narratives

All metrics must be calculated from the provided data with specific numbers.`;

function fmt(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function generateFallbackFinancialAssessment(input: V33FinancialAssessmentInput): V33FinancialAssessmentResult {
  const totalLiabilities = input.totalLiabilities ?? 0;
  const annualExpenses = input.annualExpenses ?? Math.round(input.annualIncome * 0.7);
  const retirementAccounts = input.retirementAccounts ?? 0;
  const taxableAccounts = input.taxableAccounts ?? 0;
  const netWorth = input.totalAssets - totalLiabilities;
  const savingsRate = input.annualIncome > 0 ? ((input.annualIncome - annualExpenses) / input.annualIncome) * 100 : 0;
  const monthlyExpenses = annualExpenses / 12;
  const emergencyFundMonths = monthlyExpenses > 0 ? taxableAccounts / monthlyExpenses : 0;
  const debtToIncome = input.annualIncome > 0 ? (totalLiabilities * 0.05) / input.annualIncome * 100 : 0;

  // Retirement readiness benchmark
  const retirementMultiple = input.annualIncome > 0 ? retirementAccounts / input.annualIncome : 0;
  let targetMultiple = 1;
  if (input.age >= 30) targetMultiple = 1;
  if (input.age >= 35) targetMultiple = 2;
  if (input.age >= 40) targetMultiple = 3;
  if (input.age >= 45) targetMultiple = 4;
  if (input.age >= 50) targetMultiple = 6;
  if (input.age >= 55) targetMultiple = 7;
  if (input.age >= 60) targetMultiple = 8;
  if (input.age >= 67) targetMultiple = 10;

  // Domain scores
  const cashFlowScore = Math.min(100, Math.max(0, Math.round(
    (savingsRate >= 20 ? 40 : savingsRate >= 10 ? 25 : savingsRate >= 0 ? 15 : 0)
    + (emergencyFundMonths >= 6 ? 35 : emergencyFundMonths >= 3 ? 25 : emergencyFundMonths >= 1 ? 10 : 0)
    + (debtToIncome < 20 ? 25 : debtToIncome < 36 ? 15 : debtToIncome < 50 ? 5 : 0)
  )));

  const investmentScore = Math.min(100, Math.max(0, Math.round(
    (input.totalAssets > 0 ? 30 : 0)
    + (retirementAccounts > 0 && taxableAccounts > 0 ? 30 : retirementAccounts > 0 || taxableAccounts > 0 ? 15 : 0)
    + (input.riskTolerance ? 20 : 0)
    + 20
  )));

  const retirementScore = Math.min(100, Math.max(0, Math.round(
    Math.min(100, (retirementMultiple / Math.max(targetMultiple, 1)) * 100)
  )));

  const taxScore = Math.min(100, Math.max(0, Math.round(
    (retirementAccounts > 0 ? 40 : 0)
    + (taxableAccounts > 0 ? 30 : 0)
    + 30
  )));

  // Insurance scoring
  const insurance = input.currentInsurance || [];
  const hasLife = insurance.some(i => i.type.toLowerCase().includes("life"));
  const hasDisability = insurance.some(i => i.type.toLowerCase().includes("disability"));
  const hasUmbrella = insurance.some(i => i.type.toLowerCase().includes("umbrella"));
  const insuranceScore = Math.min(100, Math.max(0,
    (hasLife ? 35 : 0) + (hasDisability ? 30 : 0) + (hasUmbrella ? 15 : 0) + 20
  ));

  // Estate scoring
  const estateDocs = input.estateDocuments || [];
  const hasWill = estateDocs.some(d => d.type.toLowerCase().includes("will") || d.type.toLowerCase().includes("trust"));
  const hasPOA = estateDocs.some(d => d.type.toLowerCase().includes("power of attorney") || d.type.toLowerCase().includes("poa"));
  const hasHCD = estateDocs.some(d => d.type.toLowerCase().includes("healthcare") || d.type.toLowerCase().includes("directive") || d.type.toLowerCase().includes("hcd"));
  const estateScore = Math.min(100, Math.max(0,
    (hasWill ? 40 : 0) + (hasPOA ? 25 : 0) + (hasHCD ? 25 : 0) + (estateDocs.length > 0 ? 10 : 0)
  ));

  // Goal scoring
  const goals = input.financialGoals || [];
  let goalScore = 70; // default if no goals
  if (goals.length > 0) {
    const avgProgress = goals.reduce((sum, g) => {
      const progress = g.amount > 0 ? Math.min(100, (g.amount * 0.5) / g.amount * 100) : 50;
      return sum + progress;
    }, 0) / goals.length;
    goalScore = Math.round(avgProgress);
  }

  const domainScores = [
    { domain: "Cash Flow & Savings", score: cashFlowScore, status: getStatus(cashFlowScore), topFinding: savingsRate >= 20 ? `Strong savings rate of ${savingsRate.toFixed(0)}%` : `Savings rate of ${savingsRate.toFixed(0)}% is below the 20% target` },
    { domain: "Investment & Allocation", score: investmentScore, status: getStatus(investmentScore), topFinding: `${fmt(input.totalAssets)} in total assets across ${retirementAccounts > 0 && taxableAccounts > 0 ? "multiple" : "limited"} account types` },
    { domain: "Retirement Readiness", score: retirementScore, status: getStatus(retirementScore), topFinding: `Retirement savings at ${retirementMultiple.toFixed(1)}x income (target: ${targetMultiple}x at age ${input.age})` },
    { domain: "Tax Planning", score: taxScore, status: getStatus(taxScore), topFinding: retirementAccounts > 0 ? "Tax-advantaged accounts in use" : "No tax-advantaged accounts detected" },
    { domain: "Insurance & Protection", score: insuranceScore, status: getStatus(insuranceScore), topFinding: `${insurance.length} active policy/policies on record` },
    { domain: "Estate Planning", score: estateScore, status: getStatus(estateScore), topFinding: estateDocs.length > 0 ? `${estateDocs.length} estate document(s) on file` : "No estate documents on record" },
    { domain: "Goal Funding", score: goalScore, status: getStatus(goalScore), topFinding: goals.length > 0 ? `${goals.length} financial goal(s) being tracked` : "No financial goals defined" },
  ] as V33FinancialAssessmentResult["domainScores"];

  const overallScore = Math.round(
    domainScores.reduce((sum, d) => sum + d.score, 0) / domainScores.length
  );

  // Identify gaps
  const gaps: V33FinancialAssessmentResult["gaps"] = [];
  let gapIdx = 0;

  if (savingsRate < 10) {
    gapIdx++;
    gaps.push({
      gapId: `GAP_${String(gapIdx).padStart(3, "0")}`,
      domain: "Cash Flow & Savings",
      severity: savingsRate < 0 ? "critical" : "high",
      title: `Low savings rate: ${savingsRate.toFixed(0)}%`,
      description: `Current savings rate is ${savingsRate.toFixed(0)}% of gross income, well below the recommended 20%. At current income of ${fmt(input.annualIncome)}, this represents ${fmt(Math.round(input.annualIncome * 0.2 - (input.annualIncome - annualExpenses)))} in annual savings gap.`,
      estimatedImpact: Math.round(input.annualIncome * 0.2 - (input.annualIncome - annualExpenses)),
      recommendation: "Review monthly expenses to identify discretionary reductions. Automate savings contributions to reach at least 15-20% of gross income.",
    });
  }

  if (emergencyFundMonths < 3) {
    gapIdx++;
    gaps.push({
      gapId: `GAP_${String(gapIdx).padStart(3, "0")}`,
      domain: "Cash Flow & Savings",
      severity: emergencyFundMonths < 1 ? "critical" : "high",
      title: `Insufficient emergency fund: ${emergencyFundMonths.toFixed(1)} months`,
      description: `Emergency fund covers only ${emergencyFundMonths.toFixed(1)} months of expenses (target: 3-6 months). A ${fmt(Math.round(monthlyExpenses * 6 - taxableAccounts))} shortfall exists to reach the 6-month target.`,
      estimatedImpact: Math.round(monthlyExpenses * 6 - taxableAccounts),
      recommendation: "Prioritize building emergency fund to 3 months minimum, then extend to 6 months. Use high-yield savings or money market account.",
    });
  }

  if (retirementMultiple < targetMultiple * 0.5) {
    gapIdx++;
    const gap = Math.round(targetMultiple * input.annualIncome - retirementAccounts);
    gaps.push({
      gapId: `GAP_${String(gapIdx).padStart(3, "0")}`,
      domain: "Retirement Readiness",
      severity: "critical",
      title: `Retirement savings below benchmark: ${retirementMultiple.toFixed(1)}x vs ${targetMultiple}x target`,
      description: `At age ${input.age}, retirement savings should be approximately ${targetMultiple}x income (${fmt(targetMultiple * input.annualIncome)}). Current savings of ${fmt(retirementAccounts)} represent a ${fmt(gap)} shortfall.`,
      estimatedImpact: gap,
      recommendation: "Maximize retirement account contributions (401k, IRA). Consider catch-up contributions if age 50+. Model retirement income scenarios to determine required savings rate increase.",
    });
  }

  if (!hasLife && input.age < 65) {
    gapIdx++;
    gaps.push({
      gapId: `GAP_${String(gapIdx).padStart(3, "0")}`,
      domain: "Insurance & Protection",
      severity: "high",
      title: "No life insurance coverage detected",
      description: `No life insurance policy on record. For income replacement, coverage of 10-12x annual income (${fmt(input.annualIncome * 10)} to ${fmt(input.annualIncome * 12)}) is typically recommended.`,
      estimatedImpact: input.annualIncome * 10,
      recommendation: "Evaluate life insurance needs based on income replacement, debt obligations, and dependent needs. Consider term life as cost-effective option.",
    });
  }

  if (estateDocs.length === 0) {
    gapIdx++;
    gaps.push({
      gapId: `GAP_${String(gapIdx).padStart(3, "0")}`,
      domain: "Estate Planning",
      severity: input.totalAssets > 500000 ? "critical" : "high",
      title: "No estate planning documents on record",
      description: `No will, trust, power of attorney, or healthcare directive on file. With ${fmt(input.totalAssets)} in total assets, proper estate documentation is essential for asset protection and distribution according to wishes.`,
      estimatedImpact: null,
      recommendation: "Engage estate planning attorney to draft at minimum: will/trust, durable power of attorney, and healthcare directive. Review beneficiary designations on all accounts.",
    });
  }

  gaps.sort((a, b) => {
    const sev: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (sev[a.severity] ?? 2) - (sev[b.severity] ?? 2);
  });

  const keyMetrics: V33FinancialAssessmentResult["keyMetrics"] = [
    { label: "Net Worth", value: fmt(netWorth), status: netWorth > 0 ? "positive" : "negative", context: `Assets: ${fmt(input.totalAssets)} | Liabilities: ${fmt(totalLiabilities)}` },
    { label: "Savings Rate", value: `${savingsRate.toFixed(0)}%`, status: savingsRate >= 20 ? "positive" : savingsRate >= 10 ? "neutral" : "negative", context: `Target: 20%+ of gross income` },
    { label: "Emergency Fund", value: `${emergencyFundMonths.toFixed(1)} months`, status: emergencyFundMonths >= 6 ? "positive" : emergencyFundMonths >= 3 ? "neutral" : "negative", context: "Target: 3-6 months of expenses" },
    { label: "Retirement Multiple", value: `${retirementMultiple.toFixed(1)}x`, status: retirementMultiple >= targetMultiple ? "positive" : retirementMultiple >= targetMultiple * 0.7 ? "neutral" : "negative", context: `Target: ${targetMultiple}x income at age ${input.age}` },
    { label: "Financial Health Score", value: `${overallScore}/100`, status: overallScore >= 75 ? "positive" : overallScore >= 55 ? "neutral" : "negative", context: domainScores.filter(d => d.status === "critical" || d.status === "needs_attention").length > 0 ? `${domainScores.filter(d => d.status === "critical" || d.status === "needs_attention").length} domain(s) need attention` : "All domains adequate or better" },
  ];

  const advisorNarrative = `## Comprehensive Financial Assessment — ${input.clientName}

### Client Profile
- **Age:** ${input.age} | **Filing Status:** ${input.filingStatus}
- **Risk Tolerance:** ${input.riskTolerance}
- **Annual Income:** ${fmt(input.annualIncome)} | **Annual Expenses:** ${fmt(annualExpenses)}

### Net Worth
- **Total Assets:** ${fmt(input.totalAssets)}
- **Total Liabilities:** ${fmt(totalLiabilities)}
- **Net Worth:** ${fmt(netWorth)}

### Overall Score: ${overallScore}/100

### Domain Analysis
${domainScores.map(d => `- **${d.domain}:** ${d.score}/100 (${d.status}) — ${d.topFinding}`).join("\n")}

### Key Gaps (${gaps.length} identified)
${gaps.slice(0, 5).map(g => `#### [${g.severity.toUpperCase()}] ${g.title}
${g.description}
- **Recommendation:** ${g.recommendation}`).join("\n\n")}

*AI-enhanced analysis available with OpenAI integration*`;

  const clientSummary = `Your overall financial health score is ${overallScore}/100. ${gaps.filter(g => g.severity === "critical").length > 0 ? `We have identified ${gaps.filter(g => g.severity === "critical").length} critical area(s) that need prompt attention.` : "No critical issues were identified."} Your net worth stands at ${fmt(netWorth)}, and your savings rate is ${savingsRate.toFixed(0)}%.`;

  return {
    advisorNarrative,
    clientSummary,
    overallScore,
    domainScores,
    gaps,
    netWorthSummary: { totalAssets: input.totalAssets, totalLiabilities: totalLiabilities, netWorth },
    keyMetrics,
  };
}

function getStatus(score: number): "strong" | "adequate" | "needs_attention" | "critical" {
  if (score >= 80) return "strong";
  if (score >= 60) return "adequate";
  if (score >= 40) return "needs_attention";
  return "critical";
}

export async function generateFinancialAssessment(
  input: V33FinancialAssessmentInput
): Promise<V33FinancialAssessmentResult> {
  if (!isAIAvailable()) {
    logger.info("[Agent 15] AI unavailable — using deterministic fallback");
    return generateFallbackFinancialAssessment(input);
  }

  try {
    const insuranceSummary = (input.currentInsurance || [])
      .map(i => `- ${i.type}: ${fmt(i.coverage)} coverage, ${fmt(i.premium)}/yr premium`)
      .join("\n") || "- No insurance policies on record";

    const estateDocsSummary = (input.estateDocuments || [])
      .map(d => `- ${d.type}: last updated ${d.lastUpdated}`)
      .join("\n") || "- No estate documents on record";

    const goalsSummary = (input.financialGoals || [])
      .map(g => `- ${g.name}: ${fmt(g.amount)} target, ${g.timelineYears} year horizon`)
      .join("\n") || "- No financial goals defined";

    const context: Record<string, string> = {
      clientName: input.clientName,
      clientId: input.clientId,
      age: String(input.age),
      filingStatus: input.filingStatus,
      riskTolerance: input.riskTolerance,
      annualIncome: fmt(input.annualIncome),
      annualExpenses: input.annualExpenses ? fmt(input.annualExpenses) : "Not specified",
      totalAssets: fmt(input.totalAssets),
      totalLiabilities: input.totalLiabilities ? fmt(input.totalLiabilities) : "Not specified",
      retirementAccounts: input.retirementAccounts ? fmt(input.retirementAccounts) : "Not specified",
      taxableAccounts: input.taxableAccounts ? fmt(input.taxableAccounts) : "Not specified",
      insuranceSummary: sanitizeForPrompt(insuranceSummary, 1500),
      estateDocsSummary: sanitizeForPrompt(estateDocsSummary, 1000),
      goalsSummary: sanitizeForPrompt(goalsSummary, 1500),
    };

    const userPrompt = V33_FINANCIAL_ASSESSMENT_USER_TEMPLATE.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return context[key] !== undefined ? context[key] : "";
    });

    const raw = await chatCompletion(V33_FINANCIAL_ASSESSMENT_SYSTEM_PROMPT, userPrompt, true, 4096);
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

    const fallback = generateFallbackFinancialAssessment(input);

    return {
      advisorNarrative: parsed.advisorNarrative || fallback.advisorNarrative,
      clientSummary: parsed.clientSummary || fallback.clientSummary,
      overallScore: Math.max(0, Math.min(100, Number(parsed.overallScore) || fallback.overallScore)),
      domainScores: Array.isArray(parsed.domainScores) ? parsed.domainScores : fallback.domainScores,
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : fallback.gaps,
      netWorthSummary: parsed.netWorthSummary || fallback.netWorthSummary,
      keyMetrics: Array.isArray(parsed.keyMetrics) ? parsed.keyMetrics : fallback.keyMetrics,
    };
  } catch (error) {
    logger.error({ err: error }, "[Agent 15] Financial assessment failed — using fallback");
    return generateFallbackFinancialAssessment(input);
  }
}
