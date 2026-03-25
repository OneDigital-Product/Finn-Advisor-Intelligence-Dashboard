import { logger } from "../lib/logger";
import { storage } from "../storage";
import { isAIAvailable, sanitizeForPrompt, chatCompletion } from "../openai";
import type {
  ResearchArticle,
  InsertResearchArticle,
  ResearchBrief,
  BriefClassification,
  BriefKeyTakeaway,
  BriefPlanningDomain,
  BriefClientImpact,
  BriefActionTrigger,
  BriefTalkingPoint,
  BriefComplianceReview,
  BriefTagTaxonomy,
  BriefClientAlert,
} from "@shared/schema";

export const RESEARCH_TOPICS = [
  "macro",
  "equity",
  "fixed_income",
  "alternatives",
  "tax",
  "estate",
  "retirement",
  "esg",
] as const;

export type ResearchTopic = (typeof RESEARCH_TOPICS)[number];

export const RESEARCH_SOURCES = [
  { id: "jpmorgan", name: "J.P. Morgan Guide to Markets", url: "https://am.jpmorgan.com" },
  { id: "goldman", name: "Goldman Sachs ISG Outlook", url: "https://www.goldmansachs.com" },
  { id: "blackrock", name: "BlackRock Investment Institute", url: "https://www.blackrock.com" },
  { id: "vanguard", name: "Vanguard Research", url: "https://corporate.vanguard.com" },
  { id: "fidelity", name: "Fidelity Viewpoints", url: "https://www.fidelity.com" },
] as const;

export const RESEARCH_CATEGORIES = [
  "market_outlook",
  "economic_analysis",
  "sector_deep_dive",
  "fixed_income_strategy",
  "alternative_investments",
  "tax_planning",
  "regulatory_update",
] as const;

export const PLANNING_DOMAINS = [
  "investment_management",
  "retirement_planning",
  "tax_planning",
  "estate_planning",
  "risk_management",
  "cash_flow",
  "education_funding",
  "charitable_giving",
  "business_planning",
] as const;

export const LIFE_STAGES = ["accumulation", "pre_retirement", "distribution", "legacy"] as const;
export const RISK_PROFILES = ["conservative", "moderate", "aggressive"] as const;

export interface ResearchSummaryResult {
  summary: string;
  keyTakeaways: string[];
  topics: ResearchTopic[];
  relevanceTags: string[];
  researchClassification?: {
    type: string;
    sourceCredibility: number;
    credibilityLevel: string;
    timeliness: string;
    timelinessUrgency: string;
  };
  clientImpact?: {
    accumulation: string;
    preRetirement: string;
    distribution: string;
    legacy: string;
  };
  talkingPoints?: Array<{
    situation: string;
    implication: string;
    possibleAction: string;
  }>;
  actionTriggers?: Array<{
    trigger: string;
    audience: string;
    rationale: string;
    timing: string;
  }>;
  complianceStatus?: {
    forwardLookingFiltered: boolean;
    sourcesAttributed: boolean;
    balancedPresentation: boolean;
    readyForClient: boolean;
  };
}

export type ResearchClassification = BriefClassification;
export type KeyTakeaway = BriefKeyTakeaway;
export type PlanningDomainMapping = BriefPlanningDomain;

export type LifeStageImpact = BriefClientImpact["lifeStageScores"][number];
export type RiskProfileImpact = BriefClientImpact["riskProfileScores"][number];
export type ClientImpactAssessment = BriefClientImpact;
export type ActionTrigger = BriefActionTrigger;
export type TalkingPoint = BriefTalkingPoint;
export type ComplianceReview = BriefComplianceReview;
export type TagTaxonomy = BriefTagTaxonomy;
export type ClientAlertMatch = BriefClientAlert;

export interface FullResearchBrief {
  classification: BriefClassification;
  executiveSummary: string;
  keyTakeaways: BriefKeyTakeaway[];
  planningDomains: BriefPlanningDomain[];
  clientImpact: BriefClientImpact;
  actionTriggers: BriefActionTrigger[];
  talkingPoints: BriefTalkingPoint[];
  complianceReview: BriefComplianceReview;
  tagTaxonomy: BriefTagTaxonomy;
  clientAlertQueue: BriefClientAlert[];
}

const FORBIDDEN_JARGON: Record<string, string> = {
  "quantitative easing": "central bank bond-buying program",
  "dovish": "favoring lower interest rates",
  "hawkish": "favoring higher interest rates",
  "tapering": "reducing stimulus",
  "yield curve inversion": "short-term rates exceeding long-term rates",
  "basis points": "hundredths of a percent",
  "duration risk": "sensitivity to interest rate changes",
  "alpha": "returns above the benchmark",
  "beta": "market sensitivity",
  "contango": "futures priced above spot",
  "backwardation": "futures priced below spot",
  "convexity": "curvature of price-yield relationship",
  "mean reversion": "tendency to return to average",
  "deleveraging": "reducing debt levels",
};

const COMPLIANCE_FORBIDDEN_PHRASES = [
  { phrase: "guaranteed", replacement: "historically demonstrated" },
  { phrase: "will definitely", replacement: "may potentially" },
  { phrase: "sure thing", replacement: "favorable outlook" },
  { phrase: "can't lose", replacement: "risk-adjusted approach" },
  { phrase: "always goes up", replacement: "has shown historical appreciation" },
  { phrase: "risk-free", replacement: "lower-risk" },
  { phrase: "no downside", replacement: "limited historical downside" },
  { phrase: "you should buy", replacement: "consider evaluating" },
  { phrase: "you must sell", replacement: "it may be worth reviewing" },
  { phrase: "I recommend", replacement: "one approach to consider" },
];

async function aiSummarizeAndTag(title: string, content: string): Promise<ResearchSummaryResult> {
  const systemPrompt = `You are Finn, OneDigital's research analysis engine. Analyze institutional research content through a 3-step classification process, produce multi-layer analysis with client impact assessments, and generate compliance-filtered talking points.

## STEP 1: RESEARCH CLASSIFICATION

### Type Classification
Classify as one of: earnings_analysis, economic_outlook, sector_analysis, product_review, regulatory_update, white_paper, market_commentary.

### Source Credibility Scoring (0-100)
Score based on source type:
- Government/regulatory (Fed, BLS, SEC, IRS): +40
- Institutional research (Goldman, JP Morgan, BlackRock, Vanguard): +35
- Reputable financial media (WSJ, FT, Bloomberg, Reuters): +30
- Broker research: +20
- Popular media (CNBC, Yahoo Finance): +10
- Other: +5
Plus: author credentials (+15 for PhD/CFA/chief economist), peer reviewed (+10), recency (+5 for <30 days, +3 for <90 days, +1 for <1 year, -5 for >1 year), conflict of interest (-20).
Levels: 80-100=Institutional authority, 60-79=Credible professional, 40-59=Media/broker perspective, 20-39=Commentary/opinion, 0-19=Speculative/conflicted.

### Timeliness Assessment
Categorize: 0-7 days=BREAKING, 8-30=CURRENT, 31-90=RECENT, 91-365=DATED, >365=ARCHIVE.
Urgency: CRITICAL for regulatory content, HIGH for economic outlook, MEDIUM for sector analysis.

## STEP 2: MULTI-LAYER ANALYSIS

### Executive Summary (50-75 words, jargon-free)
Write for someone with 401(k) experience but no Wall Street background. Translate jargon: "hawkish" → "favoring rate hikes", "yield curve inversion" → "long-term rates lower than short-term", "QE" → "central bank bond buying".

### Key Takeaways (3-5 points)
Each must be: specific/quantified, derivable from actual research (cite source), actionable or explanatory. Format: "[Takeaway] — Why it matters: [portfolio implication]"

### Client Impact Assessment (4 segments)
For each segment, assess impact with mechanism:
- **Accumulation** (25-45, long horizon): focus on compound growth, opportunity cost
- **Pre-Retirement** (45-60, 10-20 year horizon): focus on transition, sustainability
- **Distribution** (60-80, active withdrawal): focus on income stream, purchasing power
- **Legacy** (80+, estate focus): focus on tax efficiency, generational wealth

### Planning Domain Mapping
Map to relevant domains: retirement, tax, investment strategy, risk/insurance, estate, college, cash flow, special assets, life events.

### Action Triggers (Advisor-Facing)
For each actionable insight: trigger name, target client segment, rationale with evidence, timing/urgency, example client scenario.

## STEP 3: COMPLIANCE FILTERING

### Forward-Looking Statements
Flag and attribute: "[Institution] forecasts..." with disclaimer. Never use: "We recommend", "You should", "Guaranteed", "Will definitely".
Use instead: "One strategy to consider", "Historical data shows", "Past patterns suggest".

### Balanced Presentation
For each significant assertion, include counterbalance or risk factor.

### Source Attribution
Every fact cited with: [Source, Date]. Add disclaimers after forward-looking statements, market predictions, and research citations.

## OUTPUT FORMAT (JSON)
{
  "summary": "50-75 word jargon-free executive summary",
  "keyTakeaways": ["takeaway with evidence and portfolio implication"],
  "topics": ["macro", "equity", ...from: macro, equity, fixed_income, alternatives, tax, estate, retirement, esg],
  "relevanceTags": ["interest_rates", "inflation", ...],
  "researchClassification": {
    "type": "economic_outlook",
    "sourceCredibility": 75,
    "credibilityLevel": "Credible professional research",
    "timeliness": "CURRENT",
    "timelinessUrgency": "HIGH"
  },
  "clientImpact": {
    "accumulation": "Impact statement with mechanism",
    "preRetirement": "Impact statement with mechanism",
    "distribution": "Impact statement with mechanism",
    "legacy": "Impact statement with mechanism"
  },
  "talkingPoints": [
    {
      "situation": "What happened in plain language",
      "implication": "How this affects their specific situation",
      "possibleAction": "What we might explore (non-prescriptive)"
    }
  ],
  "actionTriggers": [
    {
      "trigger": "Action name",
      "audience": "Target client segment",
      "rationale": "Why with evidence",
      "timing": "Urgency level"
    }
  ],
  "complianceStatus": {
    "forwardLookingFiltered": true,
    "sourcesAttributed": true,
    "balancedPresentation": true,
    "readyForClient": true
  }
}`;

  const userPrompt = `Title: ${sanitizeForPrompt(title, 500)}

Content:
${sanitizeForPrompt(content, 8000)}`;

  try {
    const result = await chatCompletion(systemPrompt, userPrompt, true, 4096);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || "",
        keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
        topics: (Array.isArray(parsed.topics) ? parsed.topics : []).filter((t: string) =>
          RESEARCH_TOPICS.includes(t as ResearchTopic)
        ),
        relevanceTags: Array.isArray(parsed.relevanceTags) ? parsed.relevanceTags : [],
        researchClassification: parsed.researchClassification || undefined,
        clientImpact: parsed.clientImpact || undefined,
        talkingPoints: Array.isArray(parsed.talkingPoints) ? parsed.talkingPoints : undefined,
        actionTriggers: Array.isArray(parsed.actionTriggers) ? parsed.actionTriggers : undefined,
        complianceStatus: parsed.complianceStatus || undefined,
      };
    }
  } catch (err) {
    logger.error({ err }, "AI research summarization failed");
  }

  return fallbackTagging(title, content);
}

function fallbackTagging(title: string, content: string): ResearchSummaryResult {
  const text = `${title} ${content}`.toLowerCase();
  const topics: ResearchTopic[] = [];
  const relevanceTags: string[] = [];

  if (/gdp|inflation|fed|interest rate|monetary|fiscal|economic outlook|recession/i.test(text)) {
    topics.push("macro");
    if (/inflation/i.test(text)) relevanceTags.push("inflation");
    if (/interest rate|fed fund/i.test(text)) relevanceTags.push("interest_rates");
    if (/recession/i.test(text)) relevanceTags.push("recession_risk");
  }
  if (/stock|equity|s&p|earnings|valuation|p\/e|market cap/i.test(text)) {
    topics.push("equity");
    if (/growth/i.test(text)) relevanceTags.push("growth_stocks");
    if (/value/i.test(text)) relevanceTags.push("value_stocks");
  }
  if (/bond|yield|credit|duration|fixed income|treasury|municipal/i.test(text)) {
    topics.push("fixed_income");
    if (/municipal/i.test(text)) relevanceTags.push("municipal_bonds");
    if (/treasury/i.test(text)) relevanceTags.push("treasuries");
  }
  if (/alternative|private equity|hedge fund|real estate|commodit/i.test(text)) {
    topics.push("alternatives");
  }
  if (/tax|capital gain|roth|deduction|ira/i.test(text)) {
    topics.push("tax");
  }
  if (/estate|trust|inheritance|gift|probate/i.test(text)) {
    topics.push("estate");
  }
  if (/retire|rmd|social security|pension|401k|403b/i.test(text)) {
    topics.push("retirement");
  }
  if (/esg|sustainable|climate|governance|social responsibility/i.test(text)) {
    topics.push("esg");
  }

  if (topics.length === 0) topics.push("macro");

  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20).slice(0, 3);
  const summary = sentences.map(s => s.trim()).join(". ") + ".";

  return {
    summary: summary.substring(0, 500),
    keyTakeaways: sentences.map(s => s.trim()).slice(0, 3),
    topics,
    relevanceTags,
  };
}

function classifyResearchType(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();
  if (/outlook|forecast|projection|2026|2025|year ahead/i.test(text)) return "market_outlook";
  if (/gdp|employment|inflation|cpi|pce|economic data/i.test(text)) return "economic_analysis";
  if (/sector|industry|technology|healthcare|energy|financial/i.test(text)) return "sector_deep_dive";
  if (/bond|yield|credit|duration|fixed income|treasury/i.test(text)) return "fixed_income_strategy";
  if (/alternative|private|hedge|real estate|commodit/i.test(text)) return "alternative_investments";
  if (/tax|ira|roth|capital gain|deduction/i.test(text)) return "tax_planning";
  if (/regulation|sec|finra|compliance|rule|dol/i.test(text)) return "regulatory_update";
  return "market_outlook";
}

function scoreCredibility(source: string, content: string, publishedAt?: Date | null): number {
  let score = 50;
  const knownSources = RESEARCH_SOURCES.map(s => s.id);
  const knownNames = RESEARCH_SOURCES.map(s => s.name.toLowerCase());
  const srcLower = source.toLowerCase();

  if ((knownSources as readonly string[]).includes(srcLower) || knownNames.some(n => srcLower.includes(n.split(" ")[0].toLowerCase()))) {
    score += 25;
  }

  if (/ph\.?d|cfa|cfp|professor|chief|head of|director/i.test(content)) score += 10;
  if (/peer.?review|journal|study|research paper/i.test(content)) score += 10;
  if (/cited|reference|source:|according to/i.test(content)) score += 5;

  if (publishedAt) {
    const daysSince = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 7) score += 10;
    else if (daysSince <= 30) score += 5;
    else if (daysSince > 180) score -= 10;
  }

  if (/sponsored|advertisement|paid content|affiliate/i.test(content)) score -= 15;
  if (/conflict of interest|disclosure:/i.test(content)) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function assessTimeliness(publishedAt?: Date | null): { timeliness: string; urgencyLevel: string; recency: string } {
  if (!publishedAt) return { timeliness: "unknown", urgencyLevel: "standard", recency: "unknown" };
  const daysSince = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince <= 1) return { timeliness: "breaking", urgencyLevel: "immediate", recency: "today" };
  if (daysSince <= 7) return { timeliness: "current", urgencyLevel: "high", recency: "this_week" };
  if (daysSince <= 30) return { timeliness: "recent", urgencyLevel: "standard", recency: "this_month" };
  if (daysSince <= 90) return { timeliness: "dated", urgencyLevel: "low", recency: "this_quarter" };
  return { timeliness: "archival", urgencyLevel: "reference_only", recency: "older" };
}

function buildFallbackClassification(title: string, content: string, source: string, publishedAt?: Date | null): ResearchClassification {
  const type = classifyResearchType(title, content);
  const credibilityScore = scoreCredibility(source, content, publishedAt);
  const { timeliness, urgencyLevel, recency } = assessTimeliness(publishedAt);

  const factors: { factor: string; score: number; note: string }[] = [];
  const knownNames = RESEARCH_SOURCES.map(s => s.name.toLowerCase());
  if (knownNames.some(n => source.toLowerCase().includes(n.split(" ")[0].toLowerCase()))) {
    factors.push({ factor: "Institutional Source", score: 25, note: "Published by a recognized financial institution" });
  }
  if (/cfa|cfp|ph\.?d/i.test(content)) {
    factors.push({ factor: "Author Credentials", score: 10, note: "Author holds professional credentials" });
  }
  if (publishedAt) {
    const daysSince = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
    factors.push({ factor: "Recency", score: daysSince <= 7 ? 10 : daysSince <= 30 ? 5 : 0, note: `Published ${Math.floor(daysSince)} days ago` });
  }

  return { type, credibilityScore, credibilityFactors: factors, timeliness, urgencyLevel, publicationRecency: recency };
}

function translateJargon(text: string): string {
  let result = text;
  for (const [jargon, plain] of Object.entries(FORBIDDEN_JARGON)) {
    const regex = new RegExp(jargon, "gi");
    result = result.replace(regex, `${plain}`);
  }
  return result;
}

function buildFallbackExecutiveSummary(title: string, content: string): string {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 30);
  const topSentences = sentences.slice(0, 3).map(s => s.trim());
  const raw = topSentences.join(". ") + ".";
  return translateJargon(raw).substring(0, 400);
}

function buildFallbackKeyTakeaways(content: string): KeyTakeaway[] {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 30);
  return sentences.slice(0, 5).map((s, i) => ({
    point: s.trim(),
    evidence: "Extracted from article content",
    sourceAttribution: `Paragraph ${i + 1}`,
    quantification: extractQuantification(s),
  }));
}

function extractQuantification(text: string): string {
  const match = text.match(/\d+\.?\d*\s*%|\$\d[\d,.]*\s*(billion|million|trillion)?|\d+\.?\d*\s*(billion|million|trillion)/i);
  return match ? match[0] : "qualitative";
}

function buildFallbackPlanningDomains(title: string, content: string): PlanningDomainMapping[] {
  const text = `${title} ${content}`.toLowerCase();
  const domains: PlanningDomainMapping[] = [];

  const patterns: { domain: string; regex: RegExp; rationale: string }[] = [
    { domain: "investment_management", regex: /portfolio|allocation|equity|bond|invest|market|fund|stock/i, rationale: "Directly impacts investment strategy and portfolio positioning" },
    { domain: "retirement_planning", regex: /retire|rmd|social security|pension|401k|ira|annuit/i, rationale: "Affects retirement income projections and withdrawal strategies" },
    { domain: "tax_planning", regex: /tax|capital gain|deduction|roth|1099|w-2|irs|bracket/i, rationale: "Impacts tax-efficient strategies and after-tax returns" },
    { domain: "estate_planning", regex: /estate|trust|inheritance|gift|probate|beneficiar/i, rationale: "Relevant to wealth transfer and estate structuring" },
    { domain: "risk_management", regex: /risk|volatil|hedge|insurance|protect|downside|drawdown/i, rationale: "Affects risk assessment and mitigation strategies" },
    { domain: "cash_flow", regex: /cash flow|income|spending|budget|liquidity|emergency fund/i, rationale: "Impacts cash flow planning and liquidity needs" },
    { domain: "education_funding", regex: /education|college|529|tuition|student loan/i, rationale: "Relevant to education savings and funding strategies" },
    { domain: "charitable_giving", regex: /charit|donat|philanthropi|giving|foundation|daf/i, rationale: "Impacts charitable giving strategies and tax benefits" },
    { domain: "business_planning", regex: /business|succession|owner|entrepreneur|valuation|exit/i, rationale: "Relevant to business owner planning and succession" },
  ];

  for (const p of patterns) {
    const matches = text.match(new RegExp(p.regex.source, "gi"));
    const score = matches ? Math.min(100, matches.length * 15 + 20) : 10;
    domains.push({ domain: p.domain, relevanceScore: score, rationale: matches ? p.rationale : "Low direct relevance based on content analysis" });
  }

  return domains.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function buildFallbackClientImpact(title: string, content: string): ClientImpactAssessment {
  const text = `${title} ${content}`.toLowerCase();

  const lifeStageScores: LifeStageImpact[] = [
    {
      stage: "accumulation",
      score: /growth|compound|invest|save|build|accumul/i.test(text) ? 70 : 40,
      mechanism: "Impacts long-term growth trajectory and savings strategy",
    },
    {
      stage: "pre_retirement",
      score: /retire|transition|glide path|target date|de-risk/i.test(text) ? 75 : 45,
      mechanism: "Affects pre-retirement positioning and risk reduction timeline",
    },
    {
      stage: "distribution",
      score: /income|withdraw|rmd|distribution|spend|yield/i.test(text) ? 80 : 35,
      mechanism: "Impacts income generation strategy and withdrawal sustainability",
    },
    {
      stage: "legacy",
      score: /estate|legacy|transfer|inherit|trust|gift/i.test(text) ? 70 : 25,
      mechanism: "Affects wealth transfer planning and intergenerational strategies",
    },
  ];

  const riskProfileScores: RiskProfileImpact[] = [
    {
      profile: "conservative",
      score: /bond|fixed income|treasury|stable|low risk|capital preserv/i.test(text) ? 80 : 40,
      mechanism: "Focus on capital preservation and income stability",
    },
    {
      profile: "moderate",
      score: /balanced|diversif|moderate|blend|mix/i.test(text) ? 75 : 50,
      mechanism: "Balanced approach to growth and risk management",
    },
    {
      profile: "aggressive",
      score: /growth|equity|stock|aggressive|high return|alpha/i.test(text) ? 80 : 35,
      mechanism: "Growth-oriented strategy with higher risk tolerance",
    },
  ];

  const maxLifeStage = Math.max(...lifeStageScores.map(s => s.score));
  const overallImpactLevel = maxLifeStage >= 75 ? "high" : maxLifeStage >= 50 ? "moderate" : "low";

  return { lifeStageScores, riskProfileScores, overallImpactLevel };
}

function buildFallbackActionTriggers(title: string, content: string): ActionTrigger[] {
  const text = `${title} ${content}`.toLowerCase();
  const triggers: ActionTrigger[] = [];

  if (/rate|yield|bond|fed|interest/i.test(text)) {
    triggers.push({
      action: "Review fixed income allocation and duration positioning",
      targetSegment: "Clients with >30% fixed income allocation",
      rationale: "Interest rate changes directly impact bond prices and income",
      timing: "Within 1 week",
      exampleClient: "Pre-retiree with significant bond ladder",
      priority: "high",
    });
  }

  if (/equity|stock|market|valuation|earnings/i.test(text)) {
    triggers.push({
      action: "Evaluate equity exposure and sector allocation",
      targetSegment: "Growth-oriented clients with equity-heavy portfolios",
      rationale: "Market outlook changes may warrant position adjustments",
      timing: "Within 2 weeks",
      exampleClient: "Accumulation-phase client with concentrated tech holdings",
      priority: "medium",
    });
  }

  if (/tax|capital gain|harvest|deduction/i.test(text)) {
    triggers.push({
      action: "Identify tax-loss harvesting opportunities",
      targetSegment: "High-income clients with taxable accounts",
      rationale: "Tax law changes or market moves create harvesting windows",
      timing: "Before quarter-end",
      exampleClient: "Business owner with $2M+ taxable portfolio",
      priority: "high",
    });
  }

  if (/retire|rmd|social security|pension/i.test(text)) {
    triggers.push({
      action: "Update retirement projections with new assumptions",
      targetSegment: "Clients within 5 years of retirement",
      rationale: "New data may affect retirement readiness assessments",
      timing: "At next review meeting",
      exampleClient: "Client age 60 with target retirement at 65",
      priority: "medium",
    });
  }

  if (triggers.length === 0) {
    triggers.push({
      action: "Share research highlights during next client touchpoint",
      targetSegment: "All active clients",
      rationale: "Keeping clients informed builds trust and demonstrates value",
      timing: "At next scheduled contact",
      exampleClient: "Any engaged client seeking market perspective",
      priority: "low",
    });
  }

  return triggers;
}

function buildFallbackTalkingPoints(title: string, content: string): TalkingPoint[] {
  const text = `${title} ${content}`.toLowerCase();
  const points: TalkingPoint[] = [];

  const segments = [
    { segment: "accumulation", condition: /growth|save|invest|market|equity/i },
    { segment: "pre_retirement", condition: /retire|transition|risk|allocation/i },
    { segment: "distribution", condition: /income|yield|withdraw|rmd|spend/i },
    { segment: "legacy", condition: /estate|trust|transfer|gift|inherit/i },
  ];

  for (const seg of segments) {
    if (seg.condition.test(text) || points.length < 2) {
      points.push({
        segment: seg.segment,
        situation: `Recent research from institutional sources discusses developments relevant to ${seg.segment.replace(/_/g, " ")} clients.`,
        implication: `This may affect how we approach ${seg.segment === "accumulation" ? "your long-term growth strategy" : seg.segment === "pre_retirement" ? "your retirement transition planning" : seg.segment === "distribution" ? "your income and withdrawal approach" : "your wealth transfer objectives"}.`,
        question: `How do you feel about ${seg.segment === "accumulation" ? "your current investment approach" : seg.segment === "pre_retirement" ? "your retirement timeline" : seg.segment === "distribution" ? "your current income needs" : "your legacy goals"} in light of this?`,
        action: `Let's review ${seg.segment === "accumulation" ? "your portfolio positioning" : seg.segment === "pre_retirement" ? "your retirement readiness" : seg.segment === "distribution" ? "your withdrawal strategy" : "your estate plan"} at our next meeting.`,
        doNotSay: [
          "You should definitely...",
          "This guarantees...",
          "Everyone is doing...",
          "You'll miss out if...",
        ],
      });
    }
  }

  return points;
}

function buildFallbackComplianceReview(content: string): ComplianceReview {
  const forwardLooking: { text: string; disclaimer: string }[] = [];
  const sentences = content.split(/[.!?]+/);

  for (const s of sentences) {
    if (/will\s+(increase|decrease|rise|fall|grow|decline|outperform|underperform)/i.test(s) ||
        /expect(?:ed)?\s+to\s+(rise|fall|increase|grow|decline)/i.test(s) ||
        /forecast|predict|project|anticipat/i.test(s)) {
      forwardLooking.push({
        text: s.trim().substring(0, 200),
        disclaimer: "Forward-looking statement: Past performance does not guarantee future results. This represents the opinion of the research provider and not a guarantee of any particular outcome.",
      });
    }
  }

  const forbiddenFound: { phrase: string; replacement: string }[] = [];
  for (const fp of COMPLIANCE_FORBIDDEN_PHRASES) {
    if (content.toLowerCase().includes(fp.phrase.toLowerCase())) {
      forbiddenFound.push(fp);
    }
  }

  const hasSourceAttribution = /source:|according to|cited|research by|published by/i.test(content);
  const hasBalance = /however|on the other hand|risk|downside|caveat|limitation|alternatively/i.test(content);

  return {
    forwardLookingStatements: forwardLooking,
    balancedPresentation: hasBalance,
    balanceNote: hasBalance ? "Content includes balanced perspective with risk considerations" : "Consider adding counterpoint or risk discussion for balanced presentation",
    sourceAttributionVerified: hasSourceAttribution,
    forbiddenPhrases: forbiddenFound,
    overallStatus: forbiddenFound.length > 0 ? "flagged" : forwardLooking.length > 3 ? "review" : "clear",
  };
}

function buildFallbackTagTaxonomy(title: string, content: string): TagTaxonomy {
  const text = `${title} ${content}`.toLowerCase();
  const topicTags: string[] = [];
  const assetClassTags: string[] = [];

  if (/macro|economy|gdp|inflation|fed/i.test(text)) topicTags.push("macroeconomics");
  if (/rate|yield|monetary/i.test(text)) topicTags.push("interest_rates");
  if (/equity|stock|earnings/i.test(text)) topicTags.push("equities");
  if (/tax|ira|deduction/i.test(text)) topicTags.push("tax_strategy");
  if (/retire|pension|rmd/i.test(text)) topicTags.push("retirement");
  if (/esg|climate|sustainable/i.test(text)) topicTags.push("esg");
  if (/estate|trust|gift/i.test(text)) topicTags.push("estate_planning");
  if (/regulat|compliance|sec|finra/i.test(text)) topicTags.push("regulatory");

  if (/equity|stock|s&p|nasdaq/i.test(text)) assetClassTags.push("equities");
  if (/bond|fixed income|treasury|credit/i.test(text)) assetClassTags.push("fixed_income");
  if (/cash|money market|liquidity/i.test(text)) assetClassTags.push("cash");
  if (/real estate|reit/i.test(text)) assetClassTags.push("real_estate");
  if (/commodit|gold|oil/i.test(text)) assetClassTags.push("commodities");
  if (/private equity|venture|hedge/i.test(text)) assetClassTags.push("alternatives");

  if (topicTags.length === 0) topicTags.push("general_market");
  if (assetClassTags.length === 0) assetClassTags.push("multi_asset");

  const urgency = /breaking|alert|immediate|urgent|critical/i.test(text) ? "urgent" : /important|significant|notable|key/i.test(text) ? "high" : "standard";
  const relevance = /all client|broad impact|market-wide|systemic/i.test(text) ? "universal" : /specific|niche|sector|targeted/i.test(text) ? "targeted" : "general";

  return { topicTags, assetClassTags, relevanceTag: relevance, urgencyTag: urgency };
}

function buildFallbackClientAlertQueue(title: string, content: string): ClientAlertMatch[] {
  const text = `${title} ${content}`.toLowerCase();
  const alerts: ClientAlertMatch[] = [];

  if (/rate|fed|yield|bond/i.test(text)) {
    alerts.push({
      matchType: "profile_match",
      description: "Clients with significant fixed income holdings or rate-sensitive positions",
      priority: "high",
      targetSegments: ["pre_retirement", "distribution"],
    });
  }

  if (/equity|stock|market|valuation/i.test(text)) {
    alerts.push({
      matchType: "profile_match",
      description: "Growth-oriented clients with equity-heavy portfolios",
      priority: "medium",
      targetSegments: ["accumulation", "moderate", "aggressive"],
    });
  }

  if (/tax|capital gain|harvest/i.test(text)) {
    alerts.push({
      matchType: "active_project",
      description: "Clients with active tax planning projects or year-end reviews",
      priority: "high",
      targetSegments: ["accumulation", "distribution"],
    });
  }

  if (/retire|rmd|social security/i.test(text)) {
    alerts.push({
      matchType: "expressed_interest",
      description: "Clients who have expressed interest in retirement planning updates",
      priority: "medium",
      targetSegments: ["pre_retirement", "distribution"],
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      matchType: "archive",
      description: "General research for reference library",
      priority: "low",
      targetSegments: [],
    });
  }

  return alerts;
}

function inferLifeStageFromDob(dateOfBirth: string | null | undefined): string | null {
  if (!dateOfBirth) return null;
  try {
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) return null;
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 50) return "accumulation";
    if (age < 62) return "pre_retirement";
    if (age < 75) return "distribution";
    return "legacy";
  } catch {
    return null;
  }
}

function mapRiskTolerance(riskTolerance: string | null | undefined): string | null {
  if (!riskTolerance) return null;
  const rt = riskTolerance.toLowerCase();
  if (rt.includes("conserv") || rt.includes("low")) return "conservative";
  if (rt.includes("moder") || rt.includes("balanced") || rt.includes("medium")) return "moderate";
  if (rt.includes("aggress") || rt.includes("high") || rt.includes("growth")) return "aggressive";
  return null;
}

async function enrichAlertQueueWithClientData(
  brief: FullResearchBrief,
  advisorId: string | null,
): Promise<BriefClientAlert[]> {
  if (!advisorId) return brief.clientAlertQueue;

  try {
    const clients = await storage.getClients(advisorId);
    if (!clients || clients.length === 0) return brief.clientAlertQueue;

    const impactedLifeStages = brief.clientImpact.lifeStageScores
      .filter(s => s.score >= 60)
      .map(s => s.stage);
    const impactedRiskProfiles = brief.clientImpact.riskProfileScores
      .filter(s => s.score >= 60)
      .map(s => s.profile);
    const topDomains = brief.planningDomains
      .filter(d => d.relevanceScore >= 50)
      .map(d => d.domain);

    const alerts: BriefClientAlert[] = [];

    const profileMatches: string[] = [];
    const interestMatches: string[] = [];

    for (const client of clients) {
      const clientLifeStage = inferLifeStageFromDob(client.dateOfBirth);
      const clientRiskProfile = mapRiskTolerance(client.riskTolerance);
      const clientName = `${client.firstName} ${client.lastName}`;

      const lifeStageMatch = clientLifeStage && impactedLifeStages.includes(clientLifeStage);
      const riskMatch = clientRiskProfile && impactedRiskProfiles.includes(clientRiskProfile);

      if (lifeStageMatch || riskMatch) {
        profileMatches.push(clientName);
      }

      if (client.interests) {
        const interests = client.interests.toLowerCase();
        const domainKeywords: Record<string, string[]> = {
          retirement_planning: ["retire", "pension", "401k", "ira"],
          tax_planning: ["tax", "deduction", "roth"],
          estate_planning: ["estate", "trust", "inheritance"],
          investment_management: ["invest", "portfolio", "market"],
          education_funding: ["education", "college", "529"],
          charitable_giving: ["charit", "donat", "philanthropi"],
          risk_management: ["risk", "insurance", "protect"],
          business_planning: ["business", "succession", "exit"],
          cash_flow: ["cash flow", "income", "budget"],
        };
        for (const domain of topDomains) {
          const keywords = domainKeywords[domain] || [];
          if (keywords.some(kw => interests.includes(kw))) {
            interestMatches.push(clientName);
            break;
          }
        }
      }
    }

    if (profileMatches.length > 0) {
      alerts.push({
        matchType: "profile_match",
        description: `${profileMatches.length} client(s) in your book match the impacted life stage or risk profile for this research`,
        priority: profileMatches.length >= 5 ? "high" : "medium",
        targetSegments: [...new Set([...impactedLifeStages, ...impactedRiskProfiles])],
      });
    }

    if (interestMatches.length > 0) {
      alerts.push({
        matchType: "expressed_interest",
        description: `${interestMatches.length} client(s) in your book have expressed interests aligned with this research topic`,
        priority: interestMatches.length >= 3 ? "high" : "medium",
        targetSegments: topDomains,
      });
    }

    if (alerts.length === 0) {
      return brief.clientAlertQueue;
    }

    const contentAlerts = brief.clientAlertQueue.filter(a => a.matchType === "active_project" || a.matchType === "archive");
    return [...alerts, ...contentAlerts];
  } catch (err) {
    logger.warn({ err }, "Failed to enrich alerts with client data, using content-based alerts");
    return brief.clientAlertQueue;
  }
}

export async function generateResearchBrief(articleId: string, advisorId: string): Promise<ResearchBrief> {
  const article = await storage.getResearchArticle(articleId);
  if (!article) throw new Error("Article not found");

  let brief: FullResearchBrief;

  if (isAIAvailable()) {
    brief = await aiGenerateFullBrief(article);
  } else {
    brief = buildFallbackBrief(article);
  }

  const enrichedAlerts = await enrichAlertQueueWithClientData(brief, advisorId);

  const savedBrief = await storage.createResearchBrief({
    articleId,
    advisorId,
    classification: brief.classification,
    executiveSummary: brief.executiveSummary,
    keyTakeaways: brief.keyTakeaways,
    planningDomains: brief.planningDomains,
    clientImpact: brief.clientImpact,
    actionTriggers: brief.actionTriggers,
    talkingPoints: brief.talkingPoints,
    complianceReview: brief.complianceReview,
    tagTaxonomy: brief.tagTaxonomy,
    clientAlertQueue: enrichedAlerts,
    generatedAt: new Date(),
  });

  logger.info({ briefId: savedBrief.id, articleId, advisorId }, "Research brief generated");
  return savedBrief;
}

function buildFallbackBrief(article: ResearchArticle): FullResearchBrief {
  return {
    classification: buildFallbackClassification(article.title, article.content, article.source, article.publishedAt),
    executiveSummary: buildFallbackExecutiveSummary(article.title, article.content),
    keyTakeaways: buildFallbackKeyTakeaways(article.content),
    planningDomains: buildFallbackPlanningDomains(article.title, article.content),
    clientImpact: buildFallbackClientImpact(article.title, article.content),
    actionTriggers: buildFallbackActionTriggers(article.title, article.content),
    talkingPoints: buildFallbackTalkingPoints(article.title, article.content),
    complianceReview: buildFallbackComplianceReview(article.content),
    tagTaxonomy: buildFallbackTagTaxonomy(article.title, article.content),
    clientAlertQueue: buildFallbackClientAlertQueue(article.title, article.content),
  };
}

async function aiGenerateFullBrief(article: ResearchArticle): Promise<FullResearchBrief> {
  const systemPrompt = `You are a senior wealth management research analyst at OneDigital. Analyze institutional research and produce a comprehensive structured research brief. Respond with ONLY valid JSON (no markdown, no code fences).

The JSON must match this structure exactly:
{
  "classification": {
    "type": "market_outlook|economic_analysis|sector_deep_dive|fixed_income_strategy|alternative_investments|tax_planning|regulatory_update",
    "credibilityScore": 0-100,
    "credibilityFactors": [{"factor": "string", "score": number, "note": "string"}],
    "timeliness": "breaking|current|recent|dated|archival",
    "urgencyLevel": "immediate|high|standard|low|reference_only",
    "publicationRecency": "today|this_week|this_month|this_quarter|older"
  },
  "executiveSummary": "50-75 word jargon-free summary. Replace technical jargon with plain language.",
  "keyTakeaways": [
    {"point": "key finding", "evidence": "supporting data", "sourceAttribution": "source", "quantification": "number or 'qualitative'"}
  ],
  "planningDomains": [
    {"domain": "investment_management|retirement_planning|tax_planning|estate_planning|risk_management|cash_flow|education_funding|charitable_giving|business_planning", "relevanceScore": 0-100, "rationale": "why relevant"}
  ],
  "clientImpact": {
    "lifeStageScores": [
      {"stage": "accumulation|pre_retirement|distribution|legacy", "score": 0-100, "mechanism": "how it impacts"}
    ],
    "riskProfileScores": [
      {"profile": "conservative|moderate|aggressive", "score": 0-100, "mechanism": "how it impacts"}
    ],
    "overallImpactLevel": "high|moderate|low"
  },
  "actionTriggers": [
    {"action": "specific action", "targetSegment": "who", "rationale": "why", "timing": "when", "exampleClient": "example", "priority": "high|medium|low"}
  ],
  "talkingPoints": [
    {"segment": "accumulation|pre_retirement|distribution|legacy", "situation": "current situation", "implication": "what it means", "question": "discovery question", "action": "recommended next step", "doNotSay": ["phrase to avoid"]}
  ],
  "complianceReview": {
    "forwardLookingStatements": [{"text": "statement", "disclaimer": "required disclaimer"}],
    "balancedPresentation": true/false,
    "balanceNote": "assessment",
    "sourceAttributionVerified": true/false,
    "forbiddenPhrases": [{"phrase": "found phrase", "replacement": "compliant alternative"}],
    "overallStatus": "clear|flagged|review"
  },
  "tagTaxonomy": {
    "topicTags": ["tag1", "tag2"],
    "assetClassTags": ["equities", "fixed_income"],
    "relevanceTag": "universal|general|targeted",
    "urgencyTag": "urgent|high|standard"
  },
  "clientAlertQueue": [
    {"matchType": "active_project|profile_match|expressed_interest|archive", "description": "who to alert", "priority": "high|medium|low", "targetSegments": ["accumulation"]}
  ]
}

COMPLIANCE RULES:
- Flag any forward-looking statements (predictions, forecasts)
- Check for balanced presentation (risks + opportunities)
- Detect forbidden phrases: guaranteed, will definitely, sure thing, can't lose, risk-free, no downside, you should buy, you must sell, I recommend
- Replace jargon: quantitative easing -> central bank bond-buying program, hawkish -> favoring higher interest rates, dovish -> favoring lower interest rates, alpha -> returns above the benchmark, basis points -> hundredths of a percent

Provide 3-5 key takeaways, map to all 9 planning domains with scores, score all 4 life stages and 3 risk profiles, generate 2-4 action triggers, and create talking points for at least 2 life stages.`;

  const userPrompt = `Title: ${sanitizeForPrompt(article.title, 500)}
Source: ${article.source}
Published: ${article.publishedAt ? article.publishedAt.toISOString() : "Unknown"}

Content:
${sanitizeForPrompt(article.content, 10000)}`;

  try {
    const result = await chatCompletion(systemPrompt, userPrompt, true, 4096);
    const cleaned = result.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return validateAndNormalizeBrief(parsed, article);
    }
  } catch (err) {
    logger.error({ err }, "AI research brief generation failed, using fallback");
  }

  return buildFallbackBrief(article);
}

function sanitizeComplianceOutput(text: string): string {
  let result = translateJargon(text);
  for (const fp of COMPLIANCE_FORBIDDEN_PHRASES) {
    const regex = new RegExp(fp.phrase, "gi");
    result = result.replace(regex, fp.replacement);
  }
  return result;
}

function ensureAllDomains(
  aiDomains: BriefPlanningDomain[],
  fallbackDomains: BriefPlanningDomain[],
): BriefPlanningDomain[] {
  const allDomainNames = PLANNING_DOMAINS as readonly string[];
  const result = [...aiDomains];
  const presentDomains = new Set(result.map(d => d.domain));
  for (const domain of allDomainNames) {
    if (!presentDomains.has(domain)) {
      const fb = fallbackDomains.find(d => d.domain === domain);
      result.push(fb || { domain, relevanceScore: 10, rationale: "Low direct relevance based on content analysis" });
    }
  }
  return result.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function ensureAllLifeStages(
  aiStages: LifeStageImpact[],
  fallbackStages: LifeStageImpact[],
): LifeStageImpact[] {
  const allStages = LIFE_STAGES as readonly string[];
  const result = [...aiStages];
  const present = new Set(result.map(s => s.stage));
  for (const stage of allStages) {
    if (!present.has(stage)) {
      const fb = fallbackStages.find(s => s.stage === stage);
      result.push(fb || { stage, score: 30, mechanism: "Indirect impact through broader market dynamics" });
    }
  }
  return result;
}

function ensureAllRiskProfiles(
  aiProfiles: RiskProfileImpact[],
  fallbackProfiles: RiskProfileImpact[],
): RiskProfileImpact[] {
  const allProfiles = RISK_PROFILES as readonly string[];
  const result = [...aiProfiles];
  const present = new Set(result.map(p => p.profile));
  for (const profile of allProfiles) {
    if (!present.has(profile)) {
      const fb = fallbackProfiles.find(p => p.profile === profile);
      result.push(fb || { profile, score: 30, mechanism: "General market impact applicable to this risk profile" });
    }
  }
  return result;
}

interface UntrustedBriefJson {
  classification?: Partial<BriefClassification>;
  executiveSummary?: string;
  keyTakeaways?: Partial<BriefKeyTakeaway>[];
  planningDomains?: Partial<BriefPlanningDomain>[];
  clientImpact?: {
    lifeStageScores?: Partial<LifeStageImpact>[];
    riskProfileScores?: Partial<RiskProfileImpact>[];
    overallImpactLevel?: string;
  };
  actionTriggers?: Partial<BriefActionTrigger>[];
  talkingPoints?: (Partial<BriefTalkingPoint> & { doNotSay?: string[] })[];
  complianceReview?: Partial<BriefComplianceReview>;
  tagTaxonomy?: Partial<BriefTagTaxonomy>;
  clientAlertQueue?: (Partial<BriefClientAlert> & { targetSegments?: string[] })[];
}

function validateAndNormalizeBrief(parsed: UntrustedBriefJson, article: ResearchArticle): FullResearchBrief {
  const fallback = buildFallbackBrief(article);

  return {
    classification: {
      type: parsed.classification?.type || fallback.classification.type,
      credibilityScore: clamp(parsed.classification?.credibilityScore ?? fallback.classification.credibilityScore, 0, 100),
      credibilityFactors: Array.isArray(parsed.classification?.credibilityFactors) ? parsed.classification.credibilityFactors : fallback.classification.credibilityFactors,
      timeliness: parsed.classification?.timeliness || fallback.classification.timeliness,
      urgencyLevel: parsed.classification?.urgencyLevel || fallback.classification.urgencyLevel,
      publicationRecency: parsed.classification?.publicationRecency || fallback.classification.publicationRecency,
    },
    executiveSummary: sanitizeComplianceOutput(parsed.executiveSummary || fallback.executiveSummary),
    keyTakeaways: Array.isArray(parsed.keyTakeaways) && parsed.keyTakeaways.length > 0
      ? parsed.keyTakeaways.map((t) => ({
          point: t.point || "",
          evidence: t.evidence || "",
          sourceAttribution: t.sourceAttribution || "",
          quantification: t.quantification || "qualitative",
        }))
      : fallback.keyTakeaways,
    planningDomains: ensureAllDomains(
      Array.isArray(parsed.planningDomains) && parsed.planningDomains.length > 0
        ? parsed.planningDomains.map((d) => ({
            domain: d.domain || "",
            relevanceScore: clamp(d.relevanceScore ?? 0, 0, 100),
            rationale: d.rationale || "",
          }))
        : [],
      fallback.planningDomains,
    ),
    clientImpact: {
      lifeStageScores: ensureAllLifeStages(
        Array.isArray(parsed.clientImpact?.lifeStageScores)
          ? parsed.clientImpact.lifeStageScores.map((s) => ({
              stage: s.stage || "",
              score: clamp(s.score ?? 0, 0, 100),
              mechanism: s.mechanism || "",
            }))
          : [],
        fallback.clientImpact.lifeStageScores,
      ),
      riskProfileScores: ensureAllRiskProfiles(
        Array.isArray(parsed.clientImpact?.riskProfileScores)
          ? parsed.clientImpact.riskProfileScores.map((s) => ({
              profile: s.profile || "",
              score: clamp(s.score ?? 0, 0, 100),
              mechanism: s.mechanism || "",
            }))
          : [],
        fallback.clientImpact.riskProfileScores,
      ),
      overallImpactLevel: parsed.clientImpact?.overallImpactLevel || fallback.clientImpact.overallImpactLevel,
    },
    actionTriggers: Array.isArray(parsed.actionTriggers) && parsed.actionTriggers.length > 0
      ? parsed.actionTriggers.map((t) => ({
          action: t.action || "",
          targetSegment: t.targetSegment || "",
          rationale: t.rationale || "",
          timing: t.timing || "",
          exampleClient: t.exampleClient || "",
          priority: t.priority || "medium",
        }))
      : fallback.actionTriggers,
    talkingPoints: Array.isArray(parsed.talkingPoints) && parsed.talkingPoints.length > 0
      ? parsed.talkingPoints.map((p) => ({
          segment: p.segment || "",
          situation: p.situation || "",
          implication: p.implication || "",
          question: p.question || "",
          action: p.action || "",
          doNotSay: Array.isArray(p.doNotSay) ? p.doNotSay : [],
        }))
      : fallback.talkingPoints,
    complianceReview: {
      forwardLookingStatements: Array.isArray(parsed.complianceReview?.forwardLookingStatements)
        ? parsed.complianceReview.forwardLookingStatements
        : fallback.complianceReview.forwardLookingStatements,
      balancedPresentation: typeof parsed.complianceReview?.balancedPresentation === "boolean"
        ? parsed.complianceReview.balancedPresentation
        : fallback.complianceReview.balancedPresentation,
      balanceNote: parsed.complianceReview?.balanceNote || fallback.complianceReview.balanceNote,
      sourceAttributionVerified: typeof parsed.complianceReview?.sourceAttributionVerified === "boolean"
        ? parsed.complianceReview.sourceAttributionVerified
        : fallback.complianceReview.sourceAttributionVerified,
      forbiddenPhrases: Array.isArray(parsed.complianceReview?.forbiddenPhrases)
        ? parsed.complianceReview.forbiddenPhrases
        : fallback.complianceReview.forbiddenPhrases,
      overallStatus: parsed.complianceReview?.overallStatus || fallback.complianceReview.overallStatus,
    },
    tagTaxonomy: {
      topicTags: Array.isArray(parsed.tagTaxonomy?.topicTags) ? parsed.tagTaxonomy.topicTags : fallback.tagTaxonomy.topicTags,
      assetClassTags: Array.isArray(parsed.tagTaxonomy?.assetClassTags) ? parsed.tagTaxonomy.assetClassTags : fallback.tagTaxonomy.assetClassTags,
      relevanceTag: parsed.tagTaxonomy?.relevanceTag || fallback.tagTaxonomy.relevanceTag,
      urgencyTag: parsed.tagTaxonomy?.urgencyTag || fallback.tagTaxonomy.urgencyTag,
    },
    clientAlertQueue: Array.isArray(parsed.clientAlertQueue) && parsed.clientAlertQueue.length > 0
      ? parsed.clientAlertQueue.map((a) => ({
          matchType: a.matchType || "archive",
          description: a.description || "",
          priority: a.priority || "low",
          targetSegments: Array.isArray(a.targetSegments) ? a.targetSegments : [],
        }))
      : fallback.clientAlertQueue,
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export async function ingestResearchArticle(data: {
  source: string;
  sourceUrl?: string;
  title: string;
  content: string;
  publishedAt?: Date;
  contentHash?: string;
  feedId?: string;
}): Promise<ResearchArticle> {
  let summaryResult: ResearchSummaryResult;

  if (isAIAvailable()) {
    summaryResult = await aiSummarizeAndTag(data.title, data.content);
  } else {
    summaryResult = fallbackTagging(data.title, data.content);
  }

  const article = await storage.createResearchArticle({
    source: data.source,
    sourceUrl: data.sourceUrl || null,
    title: data.title,
    content: data.content,
    summary: summaryResult.summary,
    keyTakeaways: summaryResult.keyTakeaways,
    topics: summaryResult.topics,
    relevanceTags: summaryResult.relevanceTags,
    publishedAt: data.publishedAt || new Date(),
    aiProcessed: isAIAvailable(),
    contentHash: data.contentHash || null,
    feedId: data.feedId || null,
  });

  logger.info({ articleId: article.id, topics: summaryResult.topics }, "Research article ingested");
  return article;
}

export async function reprocessArticle(articleId: string): Promise<ResearchArticle | undefined> {
  const article = await storage.getResearchArticle(articleId);
  if (!article) return undefined;

  const summaryResult = isAIAvailable()
    ? await aiSummarizeAndTag(article.title, article.content)
    : fallbackTagging(article.title, article.content);

  return storage.updateResearchArticle(articleId, {
    summary: summaryResult.summary,
    keyTakeaways: summaryResult.keyTakeaways,
    topics: summaryResult.topics,
    relevanceTags: summaryResult.relevanceTags,
    aiProcessed: isAIAvailable(),
  });
}

export async function getClientRelevantResearch(clientId: string): Promise<ResearchArticle[]> {
  const [accounts, holdings] = await Promise.all([
    storage.getAccountsByClient(clientId),
    storage.getHoldingsByClient(clientId),
  ]);

  const relevantTopics: string[] = [];

  const sectors = holdings.map(h => h.sector?.toLowerCase() || "");
  if (sectors.some(s => /equity|stock/i.test(s)) || holdings.some(h => h.ticker !== "CASH")) {
    relevantTopics.push("equity");
  }
  if (holdings.some(h => /bond|fixed|treasury|muni/i.test(h.name || ""))) {
    relevantTopics.push("fixed_income");
  }
  if (holdings.some(h => /alternative|private|real estate|reit/i.test(h.name || ""))) {
    relevantTopics.push("alternatives");
  }

  relevantTopics.push("macro");

  const accountTypes = accounts.map(a => a.accountType?.toLowerCase() || "");
  if (accountTypes.some(t => /ira|401k|roth|retire/i.test(t))) {
    relevantTopics.push("retirement");
    relevantTopics.push("tax");
  }
  if (accountTypes.some(t => /trust|estate/i.test(t))) {
    relevantTopics.push("estate");
  }

  const uniqueTopics = [...new Set(relevantTopics)];

  if (uniqueTopics.length === 0) {
    return storage.getResearchArticles({ limit: 10 });
  }

  return storage.getResearchArticlesByTopics(uniqueTopics);
}

export function getResearchHighlightsForMeetingPrep(articles: ResearchArticle[]): string {
  if (articles.length === 0) return "";

  const highlights = articles.slice(0, 5).map((a) => {
    const takeaways = Array.isArray(a.keyTakeaways) ? (a.keyTakeaways as string[]).slice(0, 2).join("; ") : "";
    const topicsStr = Array.isArray(a.topics) ? (a.topics as string[]).join(", ") : "";
    return `- **${a.title}** (${a.source}, ${topicsStr}): ${a.summary || ""}${takeaways ? ` Key points: ${takeaways}` : ""}`;
  });

  return `\n\nRelevant Institutional Research:\n${highlights.join("\n")}`;
}
