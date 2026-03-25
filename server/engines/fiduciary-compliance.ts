import { logger } from "../lib/logger";

export type RuleSeverity = "warning" | "block";
export type RuleCategory =
  | "suitability"
  | "risk_disclosure"
  | "performance_claims"
  | "promissory_language"
  | "cherry_picked_data"
  | "misleading_statements"
  | "age_suitability"
  | "concentration"
  | "liquidity_suitability"
  | "risk_profile_mismatch";

export interface FiduciaryRule {
  id: string;
  name: string;
  category: RuleCategory;
  description: string;
  severity: RuleSeverity;
  enabled: boolean;
  patterns: RegExp[];
  contextCheck?: (content: string, metadata?: ContentMetadata) => RuleMatch | null;
}

export interface RuleMatch {
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  severity: RuleSeverity;
  matchedText: string;
  explanation: string;
  suggestion: string;
}

export interface RuleViolation extends RuleMatch {
  violationDetail: string;
  clientContext: string;
}

export interface ValidationResult {
  passed: boolean;
  outcome: "clean" | "flagged" | "blocked";
  content: string;
  annotatedContent: string;
  matches: RuleMatch[];
  warnings: RuleMatch[];
  blocks: RuleMatch[];
  violations: RuleViolation[];
  validatedAt: string;
  contentType: string;
  ruleSetVersion: string;
  violationSummary: {
    totalViolations: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

export interface PortfolioHolding {
  ticker: string;
  name: string;
  marketValue: number;
  sector?: string;
  weight?: number;
}

export interface UpcomingWithdrawal {
  amount: number;
  date: string;
  type: string;
}

export interface InvestmentPolicyLimits {
  maxSinglePosition?: number;
  maxSectorConcentration?: number;
  prohibitedProducts?: string[];
  maxEquityAllocation?: number;
  minFixedIncomeAllocation?: number;
}

export interface ContentMetadata {
  contentType: string;
  clientId?: string;
  clientRiskTolerance?: string;
  clientAge?: number;
  advisorId?: string;
  holdings?: PortfolioHolding[];
  totalPortfolioValue?: number;
  upcomingWithdrawals?: UpcomingWithdrawal[];
  rmdRequired?: boolean;
  rmdAmount?: number;
  investmentPolicyLimits?: InvestmentPolicyLimits;
}

export interface RuleSetConfig {
  rules: Array<{
    id: string;
    enabled: boolean;
    severity: RuleSeverity;
  }>;
  globalEnabled: boolean;
  blockThreshold: number;
  version: string;
}

const RULE_SET_VERSION = "2.0.0";

const DEFAULT_RULES: FiduciaryRule[] = [
  {
    id: "SUIT-001",
    name: "Unsuitable aggressive recommendation",
    category: "suitability",
    description: "Detects recommendations for aggressive investments without considering client risk tolerance",
    severity: "block",
    enabled: true,
    patterns: [
      /\b(?:you\s+should|recommend|suggest(?:ing)?)\s+(?:invest(?:ing)?|put(?:ting)?|allocat(?:e|ing))\s+(?:all|everything|100%|most|majority)\s+(?:in(?:to)?)\s+(?:stocks|equities|crypto|bitcoin|options|leveraged|speculative)/i,
      /\b(?:go\s+all[\s-]in|bet\s+everything|put\s+it\s+all)\b/i,
    ],
    contextCheck: (content: string, metadata?: ContentMetadata) => {
      if (!metadata?.clientRiskTolerance) return null;
      const conservative = ["conservative", "moderate-conservative"].includes(metadata.clientRiskTolerance);
      if (!conservative) return null;
      const aggressiveTerms = /\b(?:aggressive\s+growth|high[\s-]risk|speculative|leveraged\s+ETF|options\s+trading|cryptocurrency|margin\s+trading)/i;
      const match = content.match(aggressiveTerms);
      if (match) {
        return {
          ruleId: "SUIT-001",
          ruleName: "Unsuitable aggressive recommendation",
          category: "suitability",
          severity: "block",
          matchedText: match[0],
          explanation: `Aggressive investment suggestion "${match[0]}" detected for a ${metadata.clientRiskTolerance} risk tolerance client`,
          suggestion: "Align investment recommendations with the client's documented risk tolerance profile",
        };
      }
      return null;
    },
  },
  {
    id: "SUIT-002",
    name: "Concentrated position recommendation",
    category: "suitability",
    description: "Detects recommendations to concentrate holdings in a single position",
    severity: "warning",
    enabled: true,
    patterns: [
      /\b(?:concentrate|put\s+(?:all|most|majority)|allocate\s+(?:heavily|primarily|exclusively))\s+(?:in(?:to)?|on|to)\s+(?:one|a\s+single|this\s+one)\b/i,
      /\b(?:50%|60%|70%|80%|90%|100%)\s+(?:in(?:to)?|allocation\s+to)\s+(?:a\s+single|one)\s+(?:stock|position|holding|fund|security)/i,
    ],
  },
  {
    id: "RISK-001",
    name: "Missing risk disclosure",
    category: "risk_disclosure",
    description: "Detects investment recommendations that lack proper risk disclosure language",
    severity: "warning",
    enabled: true,
    patterns: [],
    contextCheck: (content: string) => {
      const hasRecommendation = /\b(?:recommend|suggest|should\s+consider|advise|propose)\s+(?:invest|buy|purchase|allocat)/i.test(content);
      if (!hasRecommendation) return null;
      const hasRiskDisclosure = /\b(?:risk|volatil|loss|downside|no\s+guarantee|past\s+performance|may\s+lose|principal\s+risk|market\s+risk|not\s+guaranteed)/i.test(content);
      if (hasRiskDisclosure) return null;
      return {
        ruleId: "RISK-001",
        ruleName: "Missing risk disclosure",
        category: "risk_disclosure",
        severity: "warning",
        matchedText: "",
        explanation: "Investment recommendation detected without accompanying risk disclosure language",
        suggestion: "Add appropriate risk disclosure: investments involve risk, including possible loss of principal. Past performance does not guarantee future results.",
      };
    },
  },
  {
    id: "RISK-002",
    name: "Downplaying risk",
    category: "risk_disclosure",
    description: "Detects language that minimizes or dismisses investment risks",
    severity: "warning",
    enabled: true,
    patterns: [
      /\b(?:risk[\s-]free|no[\s-]risk|zero[\s-]risk|without\s+(?:any\s+)?risk|completely\s+safe|totally\s+safe|100%\s+safe)\b/i,
      /\b(?:can(?:'t|not)\s+(?:lose|go\s+wrong)|impossible\s+to\s+lose|nothing\s+to\s+(?:lose|worry))\b/i,
      /\b(?:don(?:'t|t)\s+worry\s+about\s+(?:risk|losing|losses))\b/i,
    ],
  },
  {
    id: "PERF-001",
    name: "Performance guarantee",
    category: "performance_claims",
    description: "Detects language guaranteeing specific investment returns",
    severity: "block",
    enabled: true,
    patterns: [
      /\b(?:guarantee(?:d|s)?|certain|assured|definite(?:ly)?|promise(?:d|s)?)\s+(?:return|gain|profit|growth|yield|income)\b/i,
      /\b(?:will\s+(?:definitely|certainly|surely|absolutely)\s+(?:return|gain|grow|increase|profit|earn))\b/i,
      /\b(?:guaranteed?\s+(?:\d+%|\d+\s*percent))\b/i,
    ],
  },
  {
    id: "PERF-002",
    name: "Unrealistic return projections",
    category: "performance_claims",
    description: "Detects projections of unrealistically high returns",
    severity: "warning",
    enabled: true,
    patterns: [
      /\b(?:expect|project|anticipate|forecast)\s+(?:a\s+)?(?:return|gain|growth)\s+(?:of\s+)?(?:[3-9]\d|[1-9]\d{2,})%/i,
      /\b(?:double|triple|quadruple)\s+(?:your\s+)?(?:money|investment|portfolio)\s+(?:in\s+)?(?:a\s+)?(?:year|month|weeks?|days?)/i,
    ],
  },
  {
    id: "PROM-001",
    name: "Promissory language",
    category: "promissory_language",
    description: "Detects language that could be construed as a promise of specific outcomes",
    severity: "block",
    enabled: true,
    patterns: [
      /\b(?:I\s+promise|we\s+promise|I\s+guarantee|we\s+guarantee)\s+(?:you|that|this)\b/i,
      /\b(?:you\s+will\s+(?:never|always)\s+(?:lose|gain|earn|receive|get))\b/i,
      /\b(?:this\s+(?:will|is\s+going\s+to)\s+(?:definitely|certainly|absolutely|undoubtedly)\s+(?:work|succeed|pay\s+off|make\s+money))\b/i,
    ],
  },
  {
    id: "PROM-002",
    name: "Future outcome assurance",
    category: "promissory_language",
    description: "Detects assurances about future market or investment outcomes",
    severity: "warning",
    enabled: true,
    patterns: [
      /\b(?:the\s+market\s+will\s+(?:definitely|certainly|always)\s+(?:go\s+up|recover|bounce\s+back|increase))\b/i,
      /\b(?:this\s+stock\s+(?:will|is\s+going\s+to)\s+(?:go\s+up|skyrocket|soar|surge|moon))\b/i,
      /\b(?:(?:can(?:'t|not)|won(?:'t|t))\s+(?:fail|go\s+down|lose\s+value|crash|decline))\b/i,
    ],
  },
  {
    id: "CHRP-001",
    name: "Cherry-picked performance data",
    category: "cherry_picked_data",
    description: "Detects presentation of selective time periods for performance data",
    severity: "warning",
    enabled: true,
    patterns: [],
    contextCheck: (content: string) => {
      const specifPeriodPattern = /\b(?:in\s+(?:the\s+)?(?:last|past)\s+(?:3|6)\s+months?|since\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|from\s+\w+\s+to\s+\w+)\b/i;
      const performancePattern = /\b(?:returned|gained|grew|increased|up)\s+(?:\d+\.?\d*%|\d+\s*percent)/i;
      const hasSelectivePeriod = specifPeriodPattern.test(content);
      const hasPerformanceClaim = performancePattern.test(content);
      if (hasSelectivePeriod && hasPerformanceClaim) {
        const hasBenchmark = /\b(?:benchmark|index|S&P|comparison|versus|compared\s+to|relative\s+to)/i.test(content);
        const hasDisclaimer = /\b(?:past\s+performance|not\s+indicative|not\s+guarantee|may\s+vary|results\s+may\s+differ)/i.test(content);
        if (!hasBenchmark && !hasDisclaimer) {
          return {
            ruleId: "CHRP-001",
            ruleName: "Cherry-picked performance data",
            category: "cherry_picked_data",
            severity: "warning",
            matchedText: "",
            explanation: "Performance data presented for a selective time period without benchmark comparison or appropriate disclaimers",
            suggestion: "Include benchmark comparisons and standard disclaimers when presenting performance data for specific time periods",
          };
        }
      }
      return null;
    },
  },
  {
    id: "MISL-001",
    name: "Misleading comparison",
    category: "misleading_statements",
    description: "Detects misleading comparisons or superlative claims about investments",
    severity: "warning",
    enabled: true,
    patterns: [
      /\b(?:best|safest|most\s+profitable|highest[\s-]performing|top[\s-]rated|number[\s-]one|#1)\s+(?:investment|fund|stock|option|strategy|choice)\b/i,
      /\b(?:outperform(?:s|ed)?|beat(?:s|en)?)\s+(?:every|all|any)\s+(?:other\s+)?(?:investment|fund|stock|option|strategy|benchmark)/i,
    ],
  },
  {
    id: "MISL-002",
    name: "Urgency pressure tactics",
    category: "misleading_statements",
    description: "Detects high-pressure tactics creating artificial urgency",
    severity: "warning",
    enabled: true,
    patterns: [
      /\b(?:act\s+now|don(?:'t|t)\s+miss\s+(?:this|out)|limited\s+time|once[\s-]in[\s-]a[\s-]lifetime|now\s+or\s+never|last\s+chance|hurry)\b/i,
      /\b(?:if\s+you\s+don(?:'t|t)\s+(?:act|invest|buy)\s+(?:now|today|immediately)(?:,\s*)?you(?:'ll|will)\s+(?:miss|lose|regret))\b/i,
    ],
  },
  {
    id: "RPM-001",
    name: "Risk profile mismatch - aggressive for conservative",
    category: "risk_profile_mismatch",
    description: "Detects aggressive investment recommendations for conservative or moderate-conservative risk tolerance clients",
    severity: "block",
    enabled: true,
    patterns: [],
    contextCheck: (content: string, metadata?: ContentMetadata) => {
      if (!metadata?.clientRiskTolerance) return null;
      const isConservative = ["conservative", "moderate-conservative"].includes(metadata.clientRiskTolerance.toLowerCase());
      if (!isConservative) return null;
      const aggressiveProducts = /\b(?:leveraged\s+ETF|inverse\s+ETF|options?\s+(?:trading|strategy|spread|straddle)|futures?\s+(?:trading|contract)|margin\s+(?:trading|account|loan)|cryptocurrency|crypto\s+(?:trading|asset|currency)|bitcoin|ethereum|penny\s+stock|speculative\s+(?:stock|investment|position)|venture\s+capital|private\s+equity|hedge\s+fund|commodit(?:y|ies)\s+(?:trading|futures)|forex\s+trading|day\s+trading|swing\s+trading|meme\s+stock|SPAC|short\s+selling|naked\s+(?:call|put))/i;
      const match = content.match(aggressiveProducts);
      if (match) {
        return {
          ruleId: "RPM-001",
          ruleName: "Risk profile mismatch - aggressive for conservative",
          category: "risk_profile_mismatch" as RuleCategory,
          severity: "block" as RuleSeverity,
          matchedText: match[0],
          explanation: `Aggressive product "${match[0]}" is unsuitable for a client with ${metadata.clientRiskTolerance} risk tolerance. This violates suitability requirements under Reg BI and the fiduciary standard.`,
          suggestion: `Replace with products appropriate for ${metadata.clientRiskTolerance} risk tolerance: high-quality bonds, bond funds, balanced funds, or dividend-focused equity funds.`,
        };
      }
      return null;
    },
  },
  {
    id: "RPM-002",
    name: "Risk profile mismatch - high allocation mismatch",
    category: "risk_profile_mismatch",
    description: "Detects equity allocation recommendations that exceed risk tolerance guidelines",
    severity: "warning",
    enabled: true,
    patterns: [],
    contextCheck: (content: string, metadata?: ContentMetadata) => {
      if (!metadata?.clientRiskTolerance) return null;
      const riskTolerance = metadata.clientRiskTolerance.toLowerCase();
      const maxEquityByRisk: Record<string, number> = {
        "conservative": 30,
        "moderate-conservative": 40,
        "moderate": 60,
        "moderate-aggressive": 80,
        "aggressive": 100,
      };
      const maxEquity = maxEquityByRisk[riskTolerance];
      if (maxEquity === undefined || maxEquity >= 100) return null;
      const allocationPattern = /(\d{2,3})%\s*(?:in(?:to)?|allocation\s+(?:to|in))\s*(?:stocks?|equit(?:y|ies)|growth)/i;
      const match = content.match(allocationPattern);
      if (match) {
        const pct = parseInt(match[1]);
        if (pct > maxEquity) {
          return {
            ruleId: "RPM-002",
            ruleName: "Risk profile mismatch - high allocation mismatch",
            category: "risk_profile_mismatch" as RuleCategory,
            severity: "warning" as RuleSeverity,
            matchedText: match[0],
            explanation: `Recommended ${pct}% equity allocation exceeds the ${maxEquity}% maximum guideline for a ${metadata.clientRiskTolerance} risk tolerance profile.`,
            suggestion: `Reduce equity allocation to at most ${maxEquity}% and increase fixed income or cash to align with the client's ${metadata.clientRiskTolerance} risk profile.`,
          };
        }
      }
      return null;
    },
  },
  {
    id: "RPM-003",
    name: "Prohibited product recommendation",
    category: "risk_profile_mismatch",
    description: "Detects recommendations for products explicitly prohibited in the client's investment policy statement",
    severity: "block",
    enabled: true,
    patterns: [],
    contextCheck: (content: string, metadata?: ContentMetadata) => {
      if (!metadata?.investmentPolicyLimits?.prohibitedProducts?.length) return null;
      const lowerContent = content.toLowerCase();
      for (const product of metadata.investmentPolicyLimits.prohibitedProducts) {
        if (lowerContent.includes(product.toLowerCase())) {
          return {
            ruleId: "RPM-003",
            ruleName: "Prohibited product recommendation",
            category: "risk_profile_mismatch" as RuleCategory,
            severity: "block" as RuleSeverity,
            matchedText: product,
            explanation: `"${product}" is explicitly prohibited in the client's investment policy statement.`,
            suggestion: `Remove any recommendation involving "${product}" and replace with policy-compliant alternatives.`,
          };
        }
      }
      return null;
    },
  },
  {
    id: "RPM-004",
    name: "IPS equity allocation limit exceeded",
    category: "risk_profile_mismatch",
    description: "Detects recommended equity allocations that exceed the client's investment policy statement maximum",
    severity: "block",
    enabled: true,
    patterns: [],
    contextCheck: (content: string, metadata?: ContentMetadata) => {
      const maxEquity = metadata?.investmentPolicyLimits?.maxEquityAllocation;
      if (maxEquity === undefined || maxEquity >= 100) return null;
      const allocationPattern = /(\d{2,3})%\s*(?:in(?:to)?|allocation\s+(?:to|in)|to)\s*(?:stocks?|equit(?:y|ies)|growth\s+(?:stocks?|funds?|ETFs?)|aggressive)/i;
      const match = content.match(allocationPattern);
      if (match) {
        const pct = parseInt(match[1]);
        if (pct > maxEquity) {
          return {
            ruleId: "RPM-004",
            ruleName: "IPS equity allocation limit exceeded",
            category: "risk_profile_mismatch" as RuleCategory,
            severity: "block" as RuleSeverity,
            matchedText: match[0],
            explanation: `Recommended ${pct}% equity allocation exceeds the client's IPS maximum equity allocation of ${maxEquity}%. This violates the investment policy statement constraints.`,
            suggestion: `Reduce equity allocation to at most ${maxEquity}% as defined in the client's investment policy statement. Reallocate excess to fixed income or other approved asset classes.`,
          };
        }
      }
      return null;
    },
  },
  {
    id: "RPM-005",
    name: "IPS fixed income minimum not met",
    category: "risk_profile_mismatch",
    description: "Detects when recommended fixed income allocation falls below the client's investment policy statement minimum",
    severity: "block",
    enabled: true,
    patterns: [],
    contextCheck: (content: string, metadata?: ContentMetadata) => {
      const minFixedIncome = metadata?.investmentPolicyLimits?.minFixedIncomeAllocation;
      if (minFixedIncome === undefined || minFixedIncome <= 0) return null;
      const fixedIncomePattern = /(\d{1,3})%\s*(?:in(?:to)?|allocation\s+(?:to|in)|to)\s*(?:bonds?|fixed\s+income|treasur(?:y|ies)|investment[\s-]grade|debt)/i;
      const match = content.match(fixedIncomePattern);
      if (match) {
        const pct = parseInt(match[1]);
        if (pct < minFixedIncome) {
          return {
            ruleId: "RPM-005",
            ruleName: "IPS fixed income minimum not met",
            category: "risk_profile_mismatch" as RuleCategory,
            severity: "block" as RuleSeverity,
            matchedText: match[0],
            explanation: `Recommended ${pct}% fixed income allocation is below the client's IPS minimum of ${minFixedIncome}%. This violates the investment policy statement constraints.`,
            suggestion: `Increase fixed income allocation to at least ${minFixedIncome}% as defined in the client's investment policy statement. Reduce equity or alternative allocations accordingly.`,
          };
        }
      }
      const equityOnlyPattern = /(\d{2,3})%\s*(?:in(?:to)?|allocation\s+(?:to|in)|to)\s*(?:stocks?|equit(?:y|ies))/i;
      const equityMatch = content.match(equityOnlyPattern);
      if (equityMatch) {
        const equityPct = parseInt(equityMatch[1]);
        const impliedFixed = 100 - equityPct;
        if (impliedFixed < minFixedIncome && equityPct >= 70) {
          return {
            ruleId: "RPM-005",
            ruleName: "IPS fixed income minimum not met",
            category: "risk_profile_mismatch" as RuleCategory,
            severity: "block" as RuleSeverity,
            matchedText: equityMatch[0],
            explanation: `A ${equityPct}% equity allocation implies only ${impliedFixed}% for fixed income, which is below the client's IPS minimum of ${minFixedIncome}%.`,
            suggestion: `Adjust the allocation to ensure at least ${minFixedIncome}% in fixed income as required by the client's investment policy statement.`,
          };
        }
      }
      return null;
    },
  },
  {
    id: "AGE-001",
    name: "Illiquid alternatives for elderly clients",
    category: "age_suitability",
    description: "Flags illiquid alternative investments for clients aged 75 or older",
    severity: "block",
    enabled: true,
    patterns: [],
    contextCheck: (content: string, metadata?: ContentMetadata) => {
      if (!metadata?.clientAge || metadata.clientAge < 75) return null;
      const illiquidProducts = /\b(?:private\s+equity|private\s+placement|hedge\s+fund|venture\s+capital|non-traded\s+REIT|illiquid\s+(?:alternative|investment)|lock[\s-]up\s+period|limited\s+partnership|closed[\s-]end\s+fund|interval\s+fund|real\s+estate\s+(?:syndication|fund)|infrastructure\s+fund|timber\s+fund|farmland\s+fund)/i;
      const match = content.match(illiquidProducts);
      if (match) {
        return {
          ruleId: "AGE-001",
          ruleName: "Illiquid alternatives for elderly clients",
          category: "age_suitability" as RuleCategory,
          severity: "block" as RuleSeverity,
          matchedText: match[0],
          explanation: `Illiquid investment "${match[0]}" is inappropriate for a ${metadata.clientAge}-year-old client. These investments typically have multi-year lock-up periods that conflict with the client's time horizon and liquidity needs.`,
          suggestion: `Replace with liquid alternatives such as publicly traded REITs, liquid alternative mutual funds, or ETFs that provide similar exposure without lock-up constraints.`,
        };
      }
      return null;
    },
  },
  {
    id: "AGE-002",
    name: "Aggressive growth for near-retirees",
    category: "age_suitability",
    description: "Flags aggressive growth strategies for clients within 5 years of typical retirement age (60+)",
    severity: "warning",
    enabled: true,
    patterns: [],
    contextCheck: (content: string, metadata?: ContentMetadata) => {
      if (!metadata?.clientAge || metadata.clientAge < 60) return null;
      const aggressiveGrowth = /\b(?:aggressive\s+growth|high[\s-]growth|maximum\s+growth|growth[\s-]oriented\s+portfolio|100%\s+(?:equit(?:y|ies)|stocks?)|all[\s-]equity|small[\s-]cap\s+growth|emerging\s+market(?:s)?\s+(?:equit|stock|fund)|micro[\s-]cap)/i;
      const match = content.match(aggressiveGrowth);
      if (match) {
        return {
          ruleId: "AGE-002",
          ruleName: "Aggressive growth for near-retirees",
          category: "age_suitability" as RuleCategory,
          severity: "warning" as RuleSeverity,
          matchedText: match[0],
          explanation: `Aggressive growth strategy "${match[0]}" may be unsuitable for a ${metadata.clientAge}-year-old client approaching or in retirement. A significant market downturn could severely impact retirement income.`,
          suggestion: `Consider a more balanced allocation with increased fixed income, dividend-paying stocks, and capital preservation strategies appropriate for the client's time horizon.`,
        };
      }
      return null;
    },
  },
  {
    id: "AGE-003",
    name: "Long lock-up period for elderly clients",
    category: "age_suitability",
    description: "Flags investments with extended lock-up or surrender periods for clients over 70",
    severity: "warning",
    enabled: true,
    patterns: [],
    contextCheck: (content: string, metadata?: ContentMetadata) => {
      if (!metadata?.clientAge || metadata.clientAge < 70) return null;
      const lockUpPattern = /\b(?:(\d+)[\s-]year\s+(?:lock[\s-]?up|surrender|holding\s+period|commitment)|annuit(?:y|ies)\s+with\s+(\d+)[\s-]year|surrender\s+(?:charge|period|fee)\s+(?:of\s+)?(\d+)\s+year)/i;
      const match = content.match(lockUpPattern);
      if (match) {
        const years = parseInt(match[1] || match[2] || match[3] || "0");
        if (years >= 5) {
          return {
            ruleId: "AGE-003",
            ruleName: "Long lock-up period for elderly clients",
            category: "age_suitability" as RuleCategory,
            severity: "warning" as RuleSeverity,
            matchedText: match[0],
            explanation: `A ${years}-year lock-up/surrender period is concerning for a ${metadata.clientAge}-year-old client. The client may need access to these funds for healthcare, living expenses, or estate needs before the period ends.`,
            suggestion: `Consider investments with shorter commitment periods or no surrender charges. Ensure the client's liquidity needs are met before recommending long-duration commitments.`,
          };
        }
      }
      return null;
    },
  },
  {
    id: "CONC-001",
    name: "Single position concentration limit",
    category: "concentration",
    description: "Flags recommendations that would create or maintain excessive concentration in a single position",
    severity: "warning",
    enabled: true,
    patterns: [],
    contextCheck: (content: string, metadata?: ContentMetadata) => {
      if (!metadata?.holdings || !metadata.totalPortfolioValue || metadata.totalPortfolioValue <= 0) return null;
      const maxSinglePosition = metadata.investmentPolicyLimits?.maxSinglePosition ?? 20;
      for (const holding of metadata.holdings) {
        const weight = (holding.marketValue / metadata.totalPortfolioValue) * 100;
        if (weight > maxSinglePosition) {
          const tickerMentioned = new RegExp(`\\b${holding.ticker}\\b`, "i").test(content);
          const nameMentioned = holding.name.length > 3 && content.toLowerCase().includes(holding.name.toLowerCase());
          const recommendingMore = /\b(?:add(?:ing)?|increas(?:e|ing)|buy(?:ing)?|accumulat(?:e|ing)|more)\b/i.test(content);
          if ((tickerMentioned || nameMentioned) && recommendingMore) {
            return {
              ruleId: "CONC-001",
              ruleName: "Single position concentration limit",
              category: "concentration" as RuleCategory,
              severity: "warning" as RuleSeverity,
              matchedText: `${holding.ticker} (${weight.toFixed(1)}%)`,
              explanation: `${holding.ticker} (${holding.name}) already represents ${weight.toFixed(1)}% of the portfolio, exceeding the ${maxSinglePosition}% single-position limit. Adding more would increase concentration risk.`,
              suggestion: `Consider reducing the ${holding.ticker} position to below ${maxSinglePosition}% and diversifying across additional securities. Review the client's overall portfolio concentration.`,
            };
          }
        }
      }
      return null;
    },
  },
  {
    id: "CONC-002",
    name: "Sector concentration limit",
    category: "concentration",
    description: "Flags recommendations that would push sector allocation beyond configurable thresholds",
    severity: "warning",
    enabled: true,
    patterns: [],
    contextCheck: (content: string, metadata?: ContentMetadata) => {
      if (!metadata?.holdings || !metadata.totalPortfolioValue || metadata.totalPortfolioValue <= 0) return null;
      const maxSectorConcentration = metadata.investmentPolicyLimits?.maxSectorConcentration ?? 30;
      const sectorTotals: Record<string, number> = {};
      for (const holding of metadata.holdings) {
        const sector = holding.sector || "Other";
        sectorTotals[sector] = (sectorTotals[sector] || 0) + holding.marketValue;
      }
      for (const [sector, total] of Object.entries(sectorTotals)) {
        const weight = (total / metadata.totalPortfolioValue) * 100;
        if (weight > maxSectorConcentration && sector !== "Other") {
          const sectorMentioned = content.toLowerCase().includes(sector.toLowerCase());
          if (sectorMentioned) {
            return {
              ruleId: "CONC-002",
              ruleName: "Sector concentration limit",
              category: "concentration" as RuleCategory,
              severity: "warning" as RuleSeverity,
              matchedText: `${sector} sector (${weight.toFixed(1)}%)`,
              explanation: `The ${sector} sector already represents ${weight.toFixed(1)}% of the portfolio, exceeding the ${maxSectorConcentration}% sector concentration limit. Further sector exposure increases systematic risk.`,
              suggestion: `Diversify across sectors by reducing ${sector} exposure and adding positions in underrepresented sectors. Consider broad market index funds for better diversification.`,
            };
          }
        }
      }
      return null;
    },
  },
  {
    id: "LIQ-001",
    name: "Liquidity mismatch with upcoming withdrawals",
    category: "liquidity_suitability",
    description: "Flags illiquid investment recommendations when the client has upcoming scheduled withdrawals",
    severity: "block",
    enabled: true,
    patterns: [],
    contextCheck: (content: string, metadata?: ContentMetadata) => {
      if (!metadata?.upcomingWithdrawals?.length) return null;
      const totalUpcoming = metadata.upcomingWithdrawals.reduce((s, w) => s + w.amount, 0);
      if (totalUpcoming <= 0) return null;
      const illiquidTerms = /\b(?:private\s+(?:equity|placement|credit)|non-traded|illiquid|lock[\s-]?up|closed[\s-]end|interval\s+fund|limited\s+partnership|real\s+estate\s+(?:syndication|fund)|structured\s+(?:product|note)|alternative\s+investment)/i;
      const match = content.match(illiquidTerms);
      if (match) {
        const nextWithdrawal = metadata.upcomingWithdrawals.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
        return {
          ruleId: "LIQ-001",
          ruleName: "Liquidity mismatch with upcoming withdrawals",
          category: "liquidity_suitability" as RuleCategory,
          severity: "block" as RuleSeverity,
          matchedText: match[0],
          explanation: `Illiquid investment "${match[0]}" conflicts with $${totalUpcoming.toLocaleString()} in upcoming scheduled withdrawals. Next withdrawal of $${nextWithdrawal.amount.toLocaleString()} (${nextWithdrawal.type}) is due ${nextWithdrawal.date}.`,
          suggestion: `Ensure sufficient liquid assets to cover all upcoming withdrawals before allocating to illiquid investments. Maintain a liquidity buffer of at least 6 months of planned distributions.`,
        };
      }
      return null;
    },
  },
  {
    id: "LIQ-002",
    name: "RMD-incompatible recommendation",
    category: "liquidity_suitability",
    description: "Flags illiquid or lock-up investments in accounts subject to Required Minimum Distributions",
    severity: "block",
    enabled: true,
    patterns: [],
    contextCheck: (content: string, metadata?: ContentMetadata) => {
      if (!metadata?.rmdRequired) return null;
      const illiquidTerms = /\b(?:private\s+(?:equity|placement|credit)|non-traded\s+REIT|illiquid|lock[\s-]?up|closed[\s-]end|limited\s+partnership|structured\s+(?:product|note)|interval\s+fund)/i;
      const match = content.match(illiquidTerms);
      if (match) {
        const rmdContext = metadata.rmdAmount ? ` (estimated annual RMD: $${metadata.rmdAmount.toLocaleString()})` : "";
        return {
          ruleId: "LIQ-002",
          ruleName: "RMD-incompatible recommendation",
          category: "liquidity_suitability" as RuleCategory,
          severity: "block" as RuleSeverity,
          matchedText: match[0],
          explanation: `Illiquid investment "${match[0]}" is inappropriate for an account with Required Minimum Distribution obligations${rmdContext}. Inability to liquidate positions to meet RMDs could result in IRS penalties of 25% on the undistributed amount.`,
          suggestion: `Use liquid investments in RMD-subject accounts to ensure timely distributions. Consider holding illiquid alternatives only in Roth IRAs or taxable accounts not subject to RMDs.`,
        };
      }
      return null;
    },
  },
];

export class FiduciaryComplianceEngine {
  private rules: FiduciaryRule[];
  private globalEnabled: boolean;
  private blockThreshold: number;

  constructor(config?: Partial<RuleSetConfig>) {
    this.rules = [...DEFAULT_RULES];
    this.globalEnabled = config?.globalEnabled ?? true;
    this.blockThreshold = config?.blockThreshold ?? 1;

    if (config?.rules) {
      for (const override of config.rules) {
        const rule = this.rules.find((r) => r.id === override.id);
        if (rule) {
          rule.enabled = override.enabled;
          rule.severity = override.severity;
        }
      }
    }
  }

  validate(content: string, metadata?: ContentMetadata): ValidationResult {
    const validatedAt = new Date().toISOString();

    if (!this.globalEnabled || !content || content.trim().length === 0) {
      return {
        passed: true,
        outcome: "clean",
        content,
        annotatedContent: content,
        matches: [],
        warnings: [],
        blocks: [],
        violations: [],
        validatedAt,
        contentType: metadata?.contentType || "unknown",
        ruleSetVersion: RULE_SET_VERSION,
        violationSummary: { totalViolations: 0, byCategory: {}, bySeverity: {} },
      };
    }

    const matches: RuleMatch[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      for (const pattern of rule.patterns) {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match: RegExpExecArray | null;
        while ((match = regex.exec(content)) !== null) {
          const existing = matches.find(
            (m) => m.ruleId === rule.id && m.matchedText === match![0]
          );
          if (!existing) {
            matches.push({
              ruleId: rule.id,
              ruleName: rule.name,
              category: rule.category,
              severity: rule.severity,
              matchedText: match[0],
              explanation: `Matched rule "${rule.name}": ${rule.description}`,
              suggestion: this.getSuggestion(rule),
            });
          }
          if (!regex.global) break;
        }
      }

      if (rule.contextCheck) {
        const contextMatch = rule.contextCheck(content, metadata);
        if (contextMatch) {
          const existing = matches.find((m) => m.ruleId === contextMatch.ruleId);
          if (!existing) {
            matches.push(contextMatch);
          }
        }
      }
    }

    const warnings = matches.filter((m) => m.severity === "warning");
    const blocks = matches.filter((m) => m.severity === "block");
    const shouldBlock = blocks.length >= this.blockThreshold;

    const outcome = shouldBlock ? "blocked" : matches.length > 0 ? "flagged" : "clean";

    const annotatedContent = this.annotateContent(content, matches);

    logger.info(
      {
        outcome,
        matchCount: matches.length,
        warningCount: warnings.length,
        blockCount: blocks.length,
        contentType: metadata?.contentType,
      },
      "Fiduciary compliance validation completed"
    );

    const violations: RuleViolation[] = matches.map((m) => ({
      ...m,
      violationDetail: m.explanation,
      clientContext: this.buildClientContext(metadata),
    }));

    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    for (const v of violations) {
      byCategory[v.category] = (byCategory[v.category] || 0) + 1;
      bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1;
    }

    return {
      passed: !shouldBlock,
      outcome,
      content,
      annotatedContent,
      matches,
      warnings,
      blocks,
      violations,
      validatedAt,
      contentType: metadata?.contentType || "unknown",
      ruleSetVersion: RULE_SET_VERSION,
      violationSummary: {
        totalViolations: violations.length,
        byCategory,
        bySeverity,
      },
    };
  }

  getAvailableRules(): Array<{
    id: string;
    name: string;
    category: RuleCategory;
    description: string;
    severity: RuleSeverity;
    enabled: boolean;
  }> {
    return this.rules.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      description: r.description,
      severity: r.severity,
      enabled: r.enabled,
    }));
  }

  updateRuleConfig(ruleId: string, updates: { enabled?: boolean; severity?: RuleSeverity }): boolean {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (!rule) return false;
    if (updates.enabled !== undefined) rule.enabled = updates.enabled;
    if (updates.severity !== undefined) rule.severity = updates.severity;
    return true;
  }

  setGlobalEnabled(enabled: boolean): void {
    this.globalEnabled = enabled;
  }

  setBlockThreshold(threshold: number): void {
    this.blockThreshold = Math.max(1, threshold);
  }

  getConfig(): RuleSetConfig {
    return {
      rules: this.rules.map((r) => ({
        id: r.id,
        enabled: r.enabled,
        severity: r.severity,
      })),
      globalEnabled: this.globalEnabled,
      blockThreshold: this.blockThreshold,
      version: RULE_SET_VERSION,
    };
  }

  private getSuggestion(rule: FiduciaryRule): string {
    const suggestions: Record<RuleCategory, string> = {
      suitability: "Ensure recommendations align with the client's documented risk tolerance, investment objectives, and financial situation.",
      risk_disclosure: "Add appropriate risk disclosure language. Include: 'Investing involves risk, including possible loss of principal. Past performance does not guarantee future results.'",
      performance_claims: "Avoid guaranteeing returns. Use language like 'historical returns have averaged' or 'projections suggest' with appropriate disclaimers.",
      promissory_language: "Remove promissory language. Use conditional or educational framing instead of guarantees or promises.",
      cherry_picked_data: "Present performance data with standard benchmark comparisons and include appropriate time periods (1yr, 3yr, 5yr, 10yr).",
      misleading_statements: "Remove superlative or misleading claims. Present balanced information with appropriate context.",
      age_suitability: "Ensure investment recommendations are appropriate for the client's age, time horizon, and life stage. Avoid illiquid or long-duration investments for elderly clients.",
      concentration: "Ensure portfolio diversification by keeping single-position and sector allocations within policy limits. Consider rebalancing to reduce concentration risk.",
      liquidity_suitability: "Verify that recommended investments align with the client's liquidity needs, including upcoming withdrawals and RMD obligations.",
      risk_profile_mismatch: "Align all investment recommendations with the client's documented risk tolerance profile and investment policy statement constraints.",
    };
    return suggestions[rule.category];
  }

  private buildClientContext(metadata?: ContentMetadata): string {
    if (!metadata) return "No client context available";
    const parts: string[] = [];
    if (metadata.clientRiskTolerance) parts.push(`Risk tolerance: ${metadata.clientRiskTolerance}`);
    if (metadata.clientAge) parts.push(`Age: ${metadata.clientAge}`);
    if (metadata.totalPortfolioValue) parts.push(`Portfolio: $${metadata.totalPortfolioValue.toLocaleString()}`);
    if (metadata.rmdRequired) parts.push(`RMD required${metadata.rmdAmount ? `: $${metadata.rmdAmount.toLocaleString()}` : ""}`);
    if (metadata.upcomingWithdrawals?.length) {
      const total = metadata.upcomingWithdrawals.reduce((s, w) => s + w.amount, 0);
      parts.push(`Upcoming withdrawals: $${total.toLocaleString()} (${metadata.upcomingWithdrawals.length} scheduled)`);
    }
    if (metadata.holdings?.length) parts.push(`Holdings: ${metadata.holdings.length} positions`);
    return parts.length > 0 ? parts.join(" | ") : "No client context available";
  }

  private annotateContent(content: string, matches: RuleMatch[]): string {
    if (matches.length === 0) return content;

    let annotated = content;
    const annotations: string[] = [];

    for (const match of matches) {
      const icon = match.severity === "block" ? "🚫" : "⚠️";
      const label = match.severity === "block" ? "BLOCKED" : "WARNING";
      annotations.push(
        `${icon} **[${label}: ${match.ruleName}]** ${match.explanation}\n   → ${match.suggestion}`
      );
    }

    annotated += "\n\n---\n### Compliance Flags\n" + annotations.join("\n\n");
    return annotated;
  }
}

export const fiduciaryEngine = new FiduciaryComplianceEngine();

export async function validateAIContent(
  content: string,
  contentType: string,
  metadata?: Omit<ContentMetadata, "contentType">
): Promise<ValidationResult> {
  return fiduciaryEngine.validate(content, {
    contentType,
    ...metadata,
  });
}
