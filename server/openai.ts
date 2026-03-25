import { logger } from "./lib/logger";
import type { Client, Account, Document as ClientDocument } from "@shared/schema";

export {
  type HoldingData,
  type PerformanceData,
  type TaskData,
  type LifeEventData,
  type ComplianceItemData,
  type MeetingData,
  type ClientInfoData,
  type MeetingPrepInput,
  type MeetingSummaryInput,
  type TalkingPointsInput,
  type BehavioralContext,
  type ChatCompletionMeta,
  isAIAvailable,
  sanitizeForPrompt,
  sanitizeObjectStrings,
  chatCompletion,
  chatCompletionWithMeta,
  buildMeetingPrepContext,
  sanitizePromptInput,
  interpolateTemplate,
} from "./ai-core";

import {
  type ComplianceItemData,
  type HoldingData,
  type PerformanceData,
  type TaskData,
  type ChatCompletionMeta,
  type ClientInfoData,
  isAIAvailable,
  sanitizeForPrompt,
  chatCompletion,
  chatCompletionWithMeta,
  interpolateTemplate,
} from "./ai-core";

export interface ClientInsightInput {
  clientName: string;
  clientInfo: ClientInfoData;
  holdings: HoldingData[];
  performance: PerformanceData[];
  activities: Array<{ type: string; subject: string; date: string }>;
  tasks: TaskData[];
}

export interface DiagnosticInput {
  client: Pick<Client, 'firstName' | 'lastName' | 'riskTolerance'>;
  accounts: Array<Pick<Account, 'balance'>>;
  holdings: HoldingData[];
  performance: PerformanceData[];
  activities: Array<{ type: string; subject: string; date: string }>;
  tasks: TaskData[];
  documents: Array<Pick<ClientDocument, 'name' | 'type' | 'status'>>;
  complianceItems: ComplianceItemData[];
  household: Record<string, unknown> | null;
  householdMembers: Array<Record<string, unknown>>;
}

export interface ParsedDocumentResult {
  profileUpdates: Record<string, string | null>;
  accounts: Array<Record<string, string>>;
  holdings: Array<Record<string, string | null>>;
  notes: string;
  summary: string;
  documentClassification?: {
    documentType: string;
    statementType: string | null;
    custodian: string | null;
    custodianConfidence: number | null;
    reportDate: string | null;
    asOfDate: string | null;
    classificationConfidence: number | null;
  };
  custodianDetection?: {
    custodianName: string | null;
    custodianId: string | null;
    confidence: number | null;
    signatureElementsFound: string[];
    parsingRulesApplied: string | null;
  };
  documentStructure?: {
    pageCountEstimate: number | null;
    sectionsDetected: Array<{ sectionName: string; status: string }>;
    completenessAssessment: string | null;
  };
  validationSummary?: {
    checksPassed: number;
    checksFailed: number;
    flags: number;
    dataQualityScore: number;
  };
  dateTracking?: {
    asOfDate: string | null;
    dataAgeDays: number | null;
    freshnessStatus: string | null;
    recommendation: string | null;
  };
  ocrQuality?: {
    imageBased: boolean;
    ocrConfidence: number | null;
    qualityScore: number | null;
    recommendation: string | null;
  };
  regulatoryValidation?: Array<{
    accountType: string;
    contributionAmount: number | null;
    annualLimit: number | null;
    limitStatus: string | null;
    validation: string;
    note: string | null;
  }>;
  importReady?: boolean;
  importActions?: Array<{
    action: string;
    target: string;
    priority: string;
  }>;
  beneficiaries?: Array<{
    accountId: string;
    primaryBeneficiary: string;
    primaryPercentage: number | null;
    contingentBeneficiary: string | null;
    contingentPercentage: number | null;
    effectiveDate: string | null;
    alignmentStatus: string | null;
  }>;
}

interface TranscriptParticipant {
  name: string;
  role: string;
  turn_count: number;
  talk_time_pct: number;
}

interface TranscriptDecisionPoint {
  decision: string;
  status: string;
  speaker: string;
  rationale: string;
  next_step: string;
  timeline: string;
  follow_up: boolean;
}

interface TranscriptFollowUp {
  action: string;
  priority: string;
  timeline: string;
  assigned_to: string;
}

interface TranscriptContradiction {
  claim_1: string;
  claim_2: string;
  assessment: string;
  severity: string;
  recommended_action: string;
}

interface TranscriptMissingTopic {
  domain: string;
  reason: string;
  risk_level: string;
  recommended_action: string;
}

interface ParsedAccountEntry {
  accountNumber?: string;
  accountType?: string;
  custodian?: string;
  balance?: string;
  taxStatus?: string;
  qualifiedStatus?: string;
  model?: string;
  accountOpenDate?: string;
  [key: string]: string | undefined;
}

interface ParsedHoldingEntry {
  ticker?: string;
  name?: string;
  cusip?: string;
  shares?: string;
  unitPrice?: string | number;
  marketValue?: string;
  accountPct?: string | number;
  assetClass?: string;
  costBasis?: string;
  acquisitionDate?: string;
  unrealizedGainLoss?: string | number;
  holdingPeriod?: string;
  sector?: string;
  confidence?: number;
  [key: string]: string | number | undefined;
}

export interface ClassifyDocumentInput {
  fileName: string;
  documentType: string;
  fileContent: string;
  clientName: string;
  checklistItems: Array<{ id: string; category: string; documentName: string; description?: string | null }>;
}

export interface ClassifyDocumentResult {
  matchedChecklistItemId: string | null;
  confidence: string;
  reasoning: string;
  documentClassification?: {
    primaryType: string;
    secondaryType: string | null;
    specificStatementType: string | null;
    planningDomain: string | null;
    urgencyLevel: string | null;
    lifecycleStage: string | null;
    classificationConfidence: number | null;
  };
  custodianDetection?: {
    custodianName: string | null;
    custodianId: string | null;
    confidence: number | null;
    signatureElements: string[];
  };
  dateTracking?: {
    documentAsOfDate: string | null;
    dataAgeDays: number | null;
    freshnessStatus: string | null;
    freshnessAssessment: string | null;
  };
  confidenceAssessment?: {
    overallConfidence: number | null;
    confidenceRating: string | null;
    routingRecommendation: string | null;
  };
  routingDecision?: {
    routingAction: string | null;
    targetWorkflow: string | null;
    priority: string | null;
    notificationText: string | null;
  };
  relationshipDetection?: {
    relatedDocumentsExpected: string[];
    missingRelatedDocuments: string[];
  };
  checklistTracking?: {
    checklistItemSatisfied: string | null;
    completionImpact: string | null;
  };
  qualityAssessment?: {
    overallQualityScore: number | null;
    qualityRating: string | null;
    usability: string | null;
  };
  complianceDetection?: {
    complianceDocument: boolean;
    complianceImplications: string | null;
  };
}


export {
  generateMeetingPrep,
  generateMeetingPrepStructured,
  generateMeetingSummary,
  generateMeetingSummaryStructured,
  generateTalkingPoints,
  generateTalkingPointsWithMeta,
  generateTalkingPointsStructured,
  extractActionItems,
  extractActionItemsStructured,
  generateFollowUpEmail,
  generateFollowUpEmailStructured,
  generateDirectIndexingAnalysis,
  generateRetirementAnalysis,
  generateWithdrawalAnalysis,
  generateClientInsightsDashboard,

  type MeetingPrepV33Input,
  type MeetingSummaryV33Input,
  type TalkingPointsV33Input,
  type ActionItemsV33Options,
  type FollowUpEmailV33Input,

  type V33MeetingPrepResult,
  type V33MeetingSummaryResult,
  type V33TalkingPointsResult,
  type V33ActionItemsResult,
  type V33FollowUpEmailResult,
  type V33DataFreshness,
  type V33DriftAlert,
  type V33GoalProgress,
  type V33ComplianceFlag,
  type V33SummaryDecision,
  type V33ComplianceMoment,
  type V33SentimentAnalysis,
  type V33SummaryActionItem,
  type V33TalkingPoint,
  type V33ActionItem,
  type V33EmailActionItem,
  type MeetingType,
  type DataFreshnessStatus,
  type DriftStatus,
  type GoalTrackStatus,
  type ComplianceSeverity,
  type ConversationPhase,
  type ActionOwner,
  type DeadlineType,
  type ActionStatus,
  type EmailFormat,
  type DecisionStatus,
  type PlanningDomain,
  type SentimentLevel,
  type V33DirectIndexingInput,
  type V33DirectIndexingResult,
  type V33HarvestCandidate,
  type V33WashSaleAlert,
  type V33TaxAlphaAnalysis,
  type V33DirectIndexingCompliance,
  type V33DirectIndexingKeyMetric,
  type V33RetirementAnalysisInput,
  type V33RetirementAnalysisResult,
  type V33ScenarioComparison,
  type V33SSOptimization,
  type V33PensionEvaluation,
  type V33RetirementCompliance,
  type V33RetirementKeyMetric,
  type V33WithdrawalAnalysisInput,
  type V33WithdrawalAnalysisResult,
  type V33WithdrawalSequenceYear,
  type V33BracketFillingAnalysis,
  type V33RothConversionWindow,
  type V33RmdCoordination,
  type V33WithdrawalCompliance,
  type V33WithdrawalKeyMetric,
  type V33HoldingSummary,
  type V33PerformancePeriod,
  type V33ClientSummaryForBook,
  type V33ClientInsightsDashboardInput,
  type V33ClientInsightsDashboardResult,
  type V33ConcentrationRiskAnalysis,
  type V33ProactiveAlert,
  type V33OpportunityPipelineItem,
  type V33BookPerformanceMetric,
  type V33ClientInsightsDashboardCompliance,
  type V33ClientInsightsDashboardKeyMetric,
} from "./prompts/index";

export async function generateClientInsight(data: ClientInsightInput): Promise<string> {
  const meta = await generateClientInsightWithMeta(data);
  return meta.output;
}

export async function generateClientInsightWithMeta(data: ClientInsightInput): Promise<ChatCompletionMeta> {
  if (!isAIAvailable()) {
    const { holdings, performance, tasks } = data;
    const ytd = performance.find(p => p.period === 'YTD');
    const techWeight = holdings.filter(h => h.sector === 'Technology').reduce((sum, h) => sum + parseFloat(h.weight || '0'), 0);
    const pendingTasks = tasks.filter(t => t.status === 'pending');

    let insights = `### Key Insights for ${data.clientName}\n\n`;
    if (techWeight > 30) insights += `- **Concentration Risk**: Technology sector represents ${techWeight.toFixed(1)}% of the portfolio, well above typical 25% threshold\n`;
    if (ytd && parseFloat(ytd.returnPct) > parseFloat(ytd.benchmarkPct || '0')) insights += `- **Strong Performance**: Outperforming benchmark by ${(parseFloat(ytd.returnPct) - parseFloat(ytd.benchmarkPct || '0')).toFixed(2)}% YTD\n`;
    if (pendingTasks.length > 3) insights += `- **Action Required**: ${pendingTasks.length} pending tasks need attention\n`;
    insights += `- Portfolio contains ${holdings.length} positions across ${new Set(holdings.map(h => h.sector)).size} sectors\n`;

    return { output: insights + `\n*AI-enhanced insights available with OpenAI integration*`, guardrailFlagged: false, guardrailViolations: [] };
  }

  try {
    const systemPrompt = `You are the **Insight Engine** at OneDigital, generating actionable intelligence from client data that enables advisors to deliver proactive, personalized guidance.

## YOUR ROLE
- Scan across all 9 planning domains for quantifiable opportunities and risks
- Identify insights backed by calculation, not heuristic
- Detect behavioral patterns (engagement trends, concern patterns, decision timing)
- Surface life-stage-specific opportunities (tax, estate, insurance, income)
- Flag proactive alerts (upcoming RMDs, policy renewals, beneficiary reviews, rebalancing triggers)
- Rank insights by impact (dollar value, risk mitigation, goal advancement)
- Link every insight to specific client data and KB guidance

## NINE PLANNING DOMAINS TO SCAN
1. INVESTMENT & ASSET ALLOCATION: Concentration risk (any holding >15%), allocation drift (>5%), performance attribution, rebalancing triggers (drift >8%), cost analysis, diversification gaps
2. TAX OPTIMIZATION: Tax-loss harvesting opportunities, Roth conversion windows, estimated tax liability, capital gains timing, charitable strategy opportunities
3. RETIREMENT INCOME PLANNING: RMD calculation (age >72), income sufficiency, withdrawal strategy, Social Security timing optimization, longevity risk
4. ESTATE PLANNING & LEGACY: Beneficiary designation review (>3 years), estate tax exposure, will/trust status after life events, legacy planning opportunities
5. INSURANCE & RISK PROTECTION: Life insurance adequacy, disability insurance review, long-term care exposure (age >60), liability/umbrella coverage, policy review schedule
6. CASH FLOW & BUDGETING: Emergency fund adequacy (3-6 months), cash position, debt payoff timing, savings rate trajectory, major expense planning
7. GOAL PROGRESS TRACKING: Goal on-track status, timeline feasibility, goal prioritization, new goal identification from life stage changes
8. BEHAVIORAL & ENGAGEMENT PATTERNS: Engagement frequency trends, question patterns, decision velocity, concern evolution, communication preferences
9. LIFE STAGE & MAJOR TRANSITIONS: Life stage classification, recent transitions, upcoming transitions, strategy adaptation needs

## INSIGHT RANKING (4 TIERS)
TIER 1 CRITICAL (Score ≥80): Imminent deadlines, regulatory breach risk, major loss risk. Impact >$10K. Action in days-weeks.
TIER 2 HIGH-IMPACT (Score 60-79): Major quantified opportunity, significant risk mitigation. Impact $5K-10K+. Action in weeks-months.
TIER 3 MEDIUM-PRIORITY (Score 40-59): Valuable optimization, modest opportunity. Impact $1K-5K. Action within 90 days.
TIER 4 INFORMATIONAL (Score <40): Status checks, behavioral notes. Ongoing monitoring.

## QUANTITATIVE IMPACT SCORING
IMPACT_SCORE = (Dollar_Impact_Weight × 0.5) + (Risk_Mitigation_Weight × 0.3) + (Goal_Enablement_Weight × 0.2)
Range 1-100. Dollar Impact: 0-50 pts based on annual $ impact. Risk Mitigation: 0-30 pts. Goal Enablement: 0-20 pts.

## OUTPUT FORMAT
Return ONLY valid JSON with this structure:
{
  "executiveSummary": {
    "totalInsights": number,
    "countByTier": {"critical": number, "highImpact": number, "medium": number, "informational": number},
    "estimatedTotalImpact": "$X,XXX - $XX,XXX",
    "keyTakeaways": ["string"]
  },
  "insights": [
    {
      "tier": 1|2|3|4,
      "tierLabel": "CRITICAL"|"HIGH-IMPACT"|"MEDIUM-PRIORITY"|"INFORMATIONAL",
      "category": "Investment|Tax|Retirement|Estate|Insurance|CashFlow|Goals|Behavioral|LifeStage",
      "alertType": "string",
      "urgency": "immediate|this_week|this_month|this_quarter|ongoing",
      "title": "string",
      "situation": "string",
      "whyItMatters": "string",
      "quantifiedImpact": "$X,XXX or description",
      "impactScore": number 1-100,
      "supportingData": ["string"],
      "confidence": number 1-5,
      "recommendedAction": "string",
      "kbReference": "string or null",
      "successMetric": "string"
    }
  ],
  "planningDomainSummary": {
    "investment": {"status": "on-track|needs-attention|critical|not-assessed", "notes": "string"},
    "tax": {"status": "string", "notes": "string"},
    "retirement": {"status": "string", "notes": "string"},
    "estate": {"status": "string", "notes": "string"},
    "insurance": {"status": "string", "notes": "string"},
    "cashFlow": {"status": "string", "notes": "string"},
    "goals": {"status": "string", "notes": "string"},
    "behavioral": {"status": "string", "notes": "string"},
    "lifeStage": {"status": "string", "notes": "string"}
  },
  "behavioralInsights": {
    "engagementTrend": "string",
    "recurringConcerns": ["string"],
    "decisionVelocity": "string",
    "anxietyIndicators": ["string"],
    "recommendedTone": "string"
  },
  "lifeStageContext": {
    "currentStage": "string",
    "recentEvents": ["string"],
    "upcomingConsiderations": ["string"]
  },
  "actionChecklist": [
    {
      "timeframe": "this_week|this_month|this_quarter",
      "action": "string",
      "owner": "advisor|client|operations",
      "priority": "critical|high|medium|low"
    }
  ],
  "dataQuality": {
    "dataFreshness": "string",
    "overallConfidence": number 1-5,
    "missingData": ["string"],
    "caveats": ["string"]
  }
}

## GUARDRAILS
- Calculation-first only. No inference without evidence.
- Threshold-based alerting. Regulatory compliance-aware.
- Privacy-conscious (no protected-class inferences).
- Every insight must have quantified impact or explicit reason why quantification is not possible.`;

    const userPrompt = `Client: ${sanitizeForPrompt(data.clientName, 200)}
Client Profile: ${sanitizeForPrompt(JSON.stringify(data.clientInfo), 5000)}
Holdings (top positions): ${sanitizeForPrompt(JSON.stringify(data.holdings.slice(0, 15)), 6000)}
Performance: ${sanitizeForPrompt(JSON.stringify(data.performance), 3000)}
Recent Activities: ${sanitizeForPrompt(JSON.stringify(data.activities.slice(0, 8)), 3000)}
Pending Tasks: ${sanitizeForPrompt(JSON.stringify(data.tasks), 3000)}

Analyze all 9 planning domains. Generate ranked insights with quantified impact scores. Flag any critical alerts requiring immediate action.`;

    const meta = await chatCompletionWithMeta(systemPrompt, userPrompt);
    const cleaned = meta.output.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    try {
      JSON.parse(cleaned);
      return { ...meta, output: cleaned };
    } catch {
      return meta;
    }
  } catch {
    return { output: "Insight generation failed. Please try again.", guardrailFlagged: false, guardrailViolations: [] };
  }
}

export async function summarizeTranscript(transcript: string, clientName: string): Promise<string> {
  if (!isAIAvailable()) {
    const lines = transcript.split('\n').filter(l => l.trim() && !l.match(/^\d{2}:\d{2}/));
    const wordCount = transcript.split(/\s+/).length;
    const speakerMatches = transcript.match(/^[A-Z][a-z]+ [A-Z][a-z]+:/gm);
    const speakers = speakerMatches ? [...new Set(speakerMatches)].join(', ') : 'Unknown';

    const actionLines = lines
      .filter(l => /\b(need|should|will|must|follow|update|review|schedule|send|prepare|set up|contact|action|next step)\b/i.test(l))
      .slice(0, 5);

    return `## Meeting Transcript Summary

### Overview
- **Client**: ${clientName}
- **Transcript Length**: ~${wordCount} words
- **Speakers**: ${speakers}
- **Date Processed**: ${new Date().toLocaleDateString()}

### Key Discussion Points
${lines.slice(0, 8).map(l => `- ${l.trim().substring(0, 120)}`).join('\n')}

### Potential Action Items
${actionLines.length > 0 ? actionLines.map((l, i) => `${i + 1}. ${l.trim().substring(0, 150)}`).join('\n') : 'No clear action items detected from keyword analysis.'}

### Sentiment
- Overall tone appears professional and constructive

---
*AI-enhanced transcript analysis available with OpenAI integration*`;
  }

  try {
    const systemPrompt = `You are Finn v3.3, an expert wealth management transcript summarization engine at OneDigital. Summarize meeting transcripts using speaker diarization, compliance extraction, temporal analysis, and planning domain tagging.

## CORE RESPONSIBILITIES
1. Speaker Diarization: Distinguish advisor, client(s), and third parties throughout. Count turns by role, calculate advisor talk percentage (flag if >70% or <20%).
2. Temporal Flow Analysis: Map conversation arc and decision progression chronologically.
3. Quantitative Capture: Extract ALL numbers (balances, ages, contributions, dates) with context, speaker, domain, and confidence (stated_explicitly | inferred | approximate). Flag any value contradicting known client data.
4. Compliance Extraction: Identify suitability discussions, risk disclosures (market, longevity, inflation, interest rate, concentration, sequence of returns, tax, regulatory), fiduciary statements, fee discussions, conflicts of interest disclosures, product/service introductions, recommendation statements, and client acknowledgments. Assess compliance coverage gaps.
5. Emotional Arc Tracking: Monitor client sentiment evolution per topic (entry/exit sentiment, turning points, emotional intensity 1-5, objections raised and whether resolved, agreement signals).
6. Decision Point Identification: For each decision-relevant statement, classify status as DECIDED | DEFERRED | EXPLORING | REJECTED | TABLED with speaker, rationale, next step, timeline, and follow-up flag.
7. Contradiction Detection: Cross-reference all factual claims within transcript. Flag contradictory statements with severity (clarification_needed | material_discrepancy) and recommended action.
8. Domain Tagging: Map each discussion segment to the 9 planning domains:
   - Discovery / Client Understanding
   - Retirement Planning / Income Projection
   - Tax Planning / Optimization
   - Asset Allocation / Risk Management
   - Estate Planning / Wealth Transfer
   - Insurance Planning / Risk Mitigation
   - Education Planning / Special Goals
   - Business Succession / Owner Planning
   - Behavioral Coaching / Values Alignment
   For each topic, assign primary and secondary domains with timestamp and depth of coverage.
9. Missing Topic Detection: Based on client context, identify important topics NOT discussed. Flag gaps with risk level and recommended action.

## OUTPUT FORMAT
Return ONLY valid JSON (no markdown fences) with this structure:
{
  "summary_metadata": {
    "client_name": "string",
    "meeting_date_processed": "ISO 8601",
    "meeting_duration_estimate_minutes": number,
    "participants": [{"name": "string", "role": "string", "turn_count": number, "talk_time_pct": number}],
    "diarization_confidence": number
  },
  "executive_summary": {
    "primary_topics_discussed": ["string"],
    "key_decisions_made": ["string"],
    "major_follow_ups": ["string"],
    "overall_sentiment_shift": "string",
    "advisor_quality_indicators": "string"
  },
  "temporal_flow": [
    {"sequence": number, "timestamp": "string", "speaker": "string", "domain": "string", "topic": "string", "sentiment": "string", "decision_status": "string", "engagement": "string"}
  ],
  "quantitative_data": [
    {"value": number, "unit": "string", "category": "string", "context": "string", "speaker": "string", "domain": "string", "confidence": "string"}
  ],
  "data_validation_flags": [
    {"flag": "string", "extracted_value": number, "detail": "string", "severity": "string"}
  ],
  "compliance_extracts": {
    "suitability": [{"statement": "string", "speaker": "string", "domains_addressed": ["string"], "confidence": "string"}],
    "risk_disclosures": [{"risk_type": "string", "statement": "string", "speaker": "string", "confidence": "string"}],
    "fee_discussions": [{"statement": "string", "speaker": "string"}],
    "recommendations": [{"service": "string", "rationale": "string", "speaker": "string", "decision_status": "string", "follow_up_required": boolean}],
    "compliance_coverage": {
      "suitability_addressed": boolean,
      "risk_disclosure_adequate": boolean,
      "fiduciary_standard_mentioned": boolean,
      "fee_transparency": boolean,
      "gaps": ["string"]
    }
  },
  "emotional_arc": {
    "overall_sentiment_trend": "string",
    "initial_sentiment": "string",
    "final_sentiment": "string",
    "sentiment_by_domain": [{"domain": "string", "entry_sentiment": "string", "exit_sentiment": "string", "turning_point": "string"}],
    "objections_raised": [{"objection": "string", "speaker": "string", "response_quality": "string", "objection_resolved": boolean}],
    "agreement_signals": [{"signal": "string", "topic": "string", "confidence": "string"}]
  },
  "decision_points": [
    {"decision": "string", "status": "DECIDED|DEFERRED|EXPLORING|REJECTED|TABLED", "speaker": "string", "rationale": "string", "next_step": "string", "timeline": "string", "follow_up": boolean}
  ],
  "contradictions_detected": [
    {"claim_1": "string", "claim_2": "string", "assessment": "string", "severity": "string", "recommended_action": "string"}
  ],
  "domain_coverage": {
    "discovery": number, "retirement_planning": number, "tax_planning": number, "asset_allocation": number,
    "estate_planning": number, "insurance_planning": number, "education_planning": number,
    "business_succession": number, "behavioral_coaching": number, "total_minutes": number,
    "coverage_assessment": "string"
  },
  "domain_mapping": [
    {"domain_primary": "string", "domain_secondary": ["string"], "topic": "string", "duration_minutes": number, "depth": "string", "key_points": ["string"]}
  ],
  "missing_topics": {
    "gaps": [{"domain": "string", "reason": "string", "risk_level": "string", "recommended_action": "string"}]
  },
  "recommended_follow_up": [
    {"action": "string", "priority": "high|medium|low", "timeline": "string", "assigned_to": "string"}
  ],
  "sentiment_timeline": [
    {"timestamp": "string", "domain": "string", "sentiment_score": number, "confidence": number}
  ],
  "plain_language_summary": "string (200-300 word summary suitable for client email)"
}

## VALIDATION RULES
- Speaker role assignments must be consistent throughout
- Quantitative values contradicting known data must be flagged
- All major discussion topics must map to at least one domain
- Missing topics must have explicit risk assessment
- Decision status transitions must be logical

## TONE
- Advisor-facing: Technical, precise, compliance-focused, actionable
- Client-facing summary: Warm, reassuring, jargon-minimized, partnership language
- Neutral on decisions: Report what was decided; don't prescribe outcomes
- Evidence-based: All claims backed by transcript quotes or quantitative data`;

    const result = await chatCompletion(
      systemPrompt,
      `Meeting transcript for client ${sanitizeForPrompt(clientName, 200)}:\n\n${sanitizeForPrompt(transcript, 20000)}`,
      true,
      8192
    );

    const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      const participants: TranscriptParticipant[] = parsed.summary_metadata?.participants || [];
      const decisions: TranscriptDecisionPoint[] = parsed.decision_points || [];
      const followUps: TranscriptFollowUp[] = parsed.recommended_follow_up || [];
      const contradictions: TranscriptContradiction[] = parsed.contradictions_detected || [];
      const missing: TranscriptMissingTopic[] = parsed.missing_topics?.gaps || [];
      const compliance = parsed.compliance_extracts?.compliance_coverage || {};
      const emotional = parsed.emotional_arc || {};

      let formattedSummary = `## Meeting Transcript Summary — Finn v3.3\n\n`;
      formattedSummary += `### Overview\n`;
      formattedSummary += `- **Client**: ${clientName}\n`;
      formattedSummary += `- **Duration**: ~${parsed.summary_metadata?.meeting_duration_estimate_minutes || 'N/A'} minutes\n`;
      formattedSummary += `- **Participants**: ${participants.map((p) => `${p.name} (${p.role}, ${p.talk_time_pct || '?'}%)`).join(', ') || 'N/A'}\n`;
      formattedSummary += `- **Sentiment Arc**: ${emotional.overall_sentiment_trend || 'N/A'} (${emotional.initial_sentiment || '?'} → ${emotional.final_sentiment || '?'})\n\n`;

      formattedSummary += `### Key Topics\n`;
      const topics: string[] = parsed.executive_summary?.primary_topics_discussed || [];
      topics.forEach((t) => { formattedSummary += `- ${t}\n`; });

      formattedSummary += `\n### Decisions\n`;
      decisions.forEach((d) => {
        formattedSummary += `- **[${d.status}]** ${d.decision}${d.timeline ? ` — Timeline: ${d.timeline}` : ''}${d.follow_up ? ' *(follow-up required)*' : ''}\n`;
      });

      formattedSummary += `\n### Follow-Up Actions\n`;
      followUps.forEach((f, i) => {
        formattedSummary += `${i + 1}. **[${f.priority}]** ${f.action} — ${f.timeline || 'TBD'}${f.assigned_to ? ` (${f.assigned_to})` : ''}\n`;
      });

      formattedSummary += `\n### Compliance Coverage\n`;
      formattedSummary += `- Suitability Addressed: ${compliance.suitability_addressed ? '✓' : '✗'}\n`;
      formattedSummary += `- Risk Disclosure Adequate: ${compliance.risk_disclosure_adequate ? '✓' : '✗'}\n`;
      formattedSummary += `- Fiduciary Standard Mentioned: ${compliance.fiduciary_standard_mentioned ? '✓' : '✗'}\n`;
      formattedSummary += `- Fee Transparency: ${compliance.fee_transparency ? '✓' : '✗'}\n`;
      if (compliance.gaps?.length > 0) {
        formattedSummary += `- **Gaps**: ${(compliance.gaps as string[]).join('; ')}\n`;
      }

      if (contradictions.length > 0) {
        formattedSummary += `\n### Contradictions Detected\n`;
        contradictions.forEach((c) => {
          formattedSummary += `- Warning: ${c.assessment} (Severity: ${c.severity})\n`;
        });
      }

      if (missing.length > 0) {
        formattedSummary += `\n### Missing Topics\n`;
        missing.forEach((m) => {
          formattedSummary += `- **${m.domain}** [${m.risk_level}]: ${m.reason}. Action: ${m.recommended_action}\n`;
        });
      }

      parsed.formatted_summary = formattedSummary;
      return JSON.stringify(parsed);
    } catch {
      return cleaned;
    }
  } catch (error) {
    logger.error({ err: error }, "API error");
    return "Transcript summarization failed. Please try again.";
  }
}

export async function parseClientDocument(documentText: string, documentType: string, existingClientData?: Record<string, unknown>): Promise<ParsedDocumentResult> {
  const defaultResult = {
    profileUpdates: {},
    accounts: [],
    holdings: [],
    notes: "",
    summary: "Document parsing requires AI integration. Please configure your OpenAI API key to enable automatic document parsing.",
  };

  if (!isAIAvailable()) {
    const emailMatch = documentText.match(/[\w.-]+@[\w.-]+\.\w+/);
    const phoneMatch = documentText.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const dobMatch = documentText.match(/\b(?:DOB|Date of Birth|Born)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    const ssnMatch = documentText.match(/\b\d{3}-\d{2}-\d{4}\b/);

    const profileUpdates: Record<string, string | null> = {};
    if (emailMatch) profileUpdates.email = emailMatch[0];
    if (phoneMatch) profileUpdates.phone = phoneMatch[0];
    if (dobMatch) profileUpdates.dateOfBirth = dobMatch[1];

    const accountMatches = documentText.match(/(?:Account|Acct)[#:\s]*(\w+)/gi) || [];
    const balanceMatches = documentText.match(/\$[\d,]+\.?\d*/g) || [];

    return {
      profileUpdates,
      accounts: accountMatches.slice(0, 5).map((m, i) => ({
        accountNumber: m.replace(/(?:Account|Acct)[#:\s]*/i, ''),
        balance: balanceMatches[i] ? balanceMatches[i].replace(/[$,]/g, '') : '0',
      })),
      holdings: [],
      notes: `Document parsed with basic extraction. Found: ${Object.keys(profileUpdates).length} profile fields, ${accountMatches.length} account references.`,
      summary: `### Basic Document Analysis\n\n**Document Type**: ${documentType}\n**Fields Detected**: ${Object.keys(profileUpdates).join(', ') || 'None'}\n**Account References**: ${accountMatches.length}\n**Dollar Amounts Found**: ${balanceMatches.length}\n\n*AI-enhanced document parsing available with OpenAI integration for full extraction*`,
    };
  }

  try {
    const systemPrompt = `You are Finn v3.3, an expert wealth management document parser at OneDigital. Parse client documents into structured, validated, and cross-referenced data compatible with client profiles and regulatory requirements.

## CORE RESPONSIBILITIES
1. Document Type Classification: Classify into Financial Statement, Tax Return, Insurance Policy, Estate Planning Document, Benefits Summary, Government Statement, Real Estate Document, or Business Document. Assign confidence score (0-1).
2. Custodian Detection: Identify custodian (Schwab, Fidelity, Vanguard, E*TRADE, Interactive Brokers, TD Ameritrade, Merrill Edge, etc.) and apply format-specific parsing. For insurance: John Hancock, Lincoln National, MassMutual, Northwestern Mutual, etc. For 401k: Fidelity Workplace, Voya, Principal, MetLife. Log signature elements found and confidence.
3. Multi-Page Section Handling: Detect sections (Account Summary, Holdings Detail, Transactions, Performance, Fees, Tax Reporting). Flag incomplete sections.
4. Data Validation Against Client Profile: Cross-reference extracted data against existing client data. Validate account matches, name matches, balance consistency (within ~10%), account freshness (flag >6 months). Flag new/orphan accounts.
5. Account Type Classification: Classify as qualified/non-qualified and taxable/tax-deferred/tax-free. Include Traditional IRA, Roth IRA, SEP-IRA, 401(k), 403(b), 457(b), HSA, 529, Taxable Brokerage, Individual, Joint, Trust.
6. Holdings Extraction with CUSIP/Ticker: For each holding extract security name, ticker, CUSIP (if available), shares, unit price, market value, account percentage, asset class (equity_us, equity_international, fixed_income, money_market, cash, alternative). Verify sum of holdings equals account balance.
7. Cost Basis Extraction: Capture cost basis per share, acquisition date, total cost basis, unrealized gain/loss, gain/loss percentage, holding period (short_term < 1 year, long_term >= 1 year).
8. Beneficiary Cross-Referencing: Extract beneficiary name, type (spouse, child, trust, contingent), percentage, effective date. Cross-reference against existing client profile beneficiary data. Flag misalignments.
9. Date Sensitivity & Freshness: Track as-of date and flag staleness: Green (0-30 days), Yellow (31-90 days), Orange (91-180 days), Red (>180 days). Special cases: tax returns (1 year normal), wills/trusts (age less critical).
10. OCR Quality Assessment: If document appears scanned, score OCR confidence (0-1), assess data completeness, consistency checks, anomaly detection.
11. Regulatory Cross-Reference: Validate contributions against annual limits — IRA ($7,000/$8,000 if 50+), 401(k) ($23,500/$31,000 if 50+), SEP-IRA (25% net SE income, max $70,000), HSA ($4,300 individual/$8,550 family). Flag excess contributions.

## OUTPUT FORMAT
Return ONLY valid JSON with this structure:
{
  "document_classification": {
    "document_type": "financial_statement|tax_return|insurance_policy|estate_planning|benefits_summary|government_statement|real_estate|business_document",
    "statement_type": "string (specific subtype)",
    "custodian": "string or null",
    "custodian_confidence": number,
    "report_date": "ISO date or null",
    "as_of_date": "ISO date or null",
    "classification_confidence": number
  },
  "custodian_detection": {
    "custodian_name": "string or null",
    "custodian_id": "string or null",
    "confidence": number,
    "signature_elements_found": ["string"],
    "parsing_rules_applied": "string"
  },
  "document_structure": {
    "page_count_estimate": number,
    "sections_detected": [{"section_name": "string", "status": "complete|partial|missing"}],
    "completeness_assessment": "full_document|partial|missing_pages"
  },
  "validation_checks": [
    {"check": "string", "status": "pass|fail|flag", "detail": "string", "action_required": false}
  ],
  "validation_summary": {
    "checks_passed": number, "checks_failed": number, "flags": number, "data_quality_score": number
  },
  "profileUpdates": {
    "firstName": "string or null", "lastName": "string or null", "email": "string or null",
    "phone": "string or null", "dateOfBirth": "YYYY-MM-DD or null",
    "occupation": "string or null", "employer": "string or null",
    "address": "string or null", "city": "string or null", "state": "string or null", "zip": "string or null",
    "riskTolerance": "conservative|moderate-conservative|moderate|moderate-aggressive|aggressive or null",
    "interests": "string or null"
  },
  "accounts": [
    {
      "accountNumber": "string", "accountType": "string", "custodian": "string",
      "balance": "number as string", "taxStatus": "taxable|tax-deferred|tax-free",
      "qualifiedStatus": "qualified|non_qualified",
      "model": "string or null", "accountOpenDate": "ISO date or null"
    }
  ],
  "holdings": [
    {
      "ticker": "string", "name": "string", "cusip": "string or null",
      "shares": "number as string", "unitPrice": "number as string or null",
      "marketValue": "number as string", "accountPct": "number or null",
      "assetClass": "string or null",
      "costBasis": "number as string or null", "acquisitionDate": "ISO date or null",
      "unrealizedGainLoss": "number as string or null", "holdingPeriod": "short_term|long_term|null",
      "sector": "string or null", "confidence": number
    }
  ],
  "holdings_summary": {
    "total_holdings": number,
    "balance_check": {"extracted_total": number, "stated_balance": number, "variance_pct": number, "status": "pass|fail"}
  },
  "beneficiaries": [
    {
      "accountId": "string", "primaryBeneficiary": "string", "primaryPercentage": number,
      "contingentBeneficiary": "string or null", "contingentPercentage": "number or null",
      "effectiveDate": "ISO date or null", "alignmentStatus": "aligned|misaligned|unknown"
    }
  ],
  "date_tracking": {
    "as_of_date": "ISO date or null", "data_age_days": number,
    "freshness_status": "green|yellow|orange|red", "recommendation": "string"
  },
  "ocr_quality": {
    "image_based": boolean, "ocr_confidence": number, "quality_score": number, "recommendation": "string"
  },
  "regulatory_validation": [
    {
      "account_type": "string", "contribution_amount": number,
      "annual_limit": number, "limit_status": "below_limit|at_limit|over_limit",
      "validation": "pass|fail", "note": "string or null"
    }
  ],
  "import_ready": boolean,
  "import_actions": [
    {"action": "update_account|add_account|update_holdings|flag_for_review", "target": "string", "priority": "high|medium|low"}
  ],
  "notes": "Brief summary of what was extracted and any items needing manual review",
  "summary": "Detailed markdown summary of the document contents for the advisor"
}

Only include fields where you found actual data. Leave as null if not found. For accounts and holdings, only include entries with sufficient data. Be precise with numbers. All dollar amounts should be formatted consistently as strings.`;

    const userPrompt = `Parse this ${documentType} document and extract client data.\n\n${existingClientData ? `Existing client data for cross-reference validation:\n${JSON.stringify(existingClientData, null, 2)}\n\n` : ''}Document content:\n\n${documentText.substring(0, 15000)}`;

    const response = await chatCompletion(systemPrompt, userPrompt, true, 8192);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const rawAccounts: ParsedAccountEntry[] = parsed.accounts || [];
      const rawHoldings: ParsedHoldingEntry[] = parsed.holdings || [];

      const docClass = parsed.document_classification;
      const custDet = parsed.custodian_detection;
      const docStruct = parsed.document_structure;
      const valSummary = parsed.validation_summary;
      const dateTr = parsed.date_tracking;
      const ocrQ = parsed.ocr_quality;

      return {
        profileUpdates: parsed.profileUpdates || {},
        accounts: rawAccounts.map((a) => ({
          accountNumber: a.accountNumber || '',
          accountType: a.accountType || '',
          custodian: a.custodian || '',
          balance: a.balance || '0',
          taxStatus: a.taxStatus || '',
          qualifiedStatus: a.qualifiedStatus || '',
          model: a.model || '',
          accountOpenDate: a.accountOpenDate || '',
        })),
        holdings: rawHoldings.map((h) => ({
          ticker: h.ticker || null,
          name: h.name || null,
          shares: h.shares || '0',
          marketValue: h.marketValue || '0',
          costBasis: h.costBasis || null,
          sector: h.sector || null,
          cusip: h.cusip || null,
          unitPrice: h.unitPrice != null ? String(h.unitPrice) : null,
          accountPct: h.accountPct != null ? String(h.accountPct) : null,
          assetClass: h.assetClass || null,
          acquisitionDate: h.acquisitionDate || null,
          unrealizedGainLoss: h.unrealizedGainLoss != null ? String(h.unrealizedGainLoss) : null,
          holdingPeriod: h.holdingPeriod || null,
          confidence: h.confidence != null ? String(h.confidence) : null,
        })),
        notes: parsed.notes || "",
        summary: parsed.summary || "Document parsed successfully.",
        documentClassification: docClass ? {
          documentType: docClass.document_type || '',
          statementType: docClass.statement_type || null,
          custodian: docClass.custodian || null,
          custodianConfidence: docClass.custodian_confidence ?? null,
          reportDate: docClass.report_date || null,
          asOfDate: docClass.as_of_date || null,
          classificationConfidence: docClass.classification_confidence ?? null,
        } : undefined,
        custodianDetection: custDet ? {
          custodianName: custDet.custodian_name || null,
          custodianId: custDet.custodian_id || null,
          confidence: custDet.confidence ?? null,
          signatureElementsFound: custDet.signature_elements_found || [],
          parsingRulesApplied: custDet.parsing_rules_applied || null,
        } : undefined,
        documentStructure: docStruct ? {
          pageCountEstimate: docStruct.page_count_estimate ?? null,
          sectionsDetected: (docStruct.sections_detected || []).map((s: { section_name: string; status: string }) => ({
            sectionName: s.section_name,
            status: s.status,
          })),
          completenessAssessment: docStruct.completeness_assessment || null,
        } : undefined,
        validationSummary: valSummary ? {
          checksPassed: valSummary.checks_passed ?? 0,
          checksFailed: valSummary.checks_failed ?? 0,
          flags: valSummary.flags ?? 0,
          dataQualityScore: valSummary.data_quality_score ?? 0,
        } : undefined,
        dateTracking: dateTr ? {
          asOfDate: dateTr.as_of_date || null,
          dataAgeDays: dateTr.data_age_days ?? null,
          freshnessStatus: dateTr.freshness_status || null,
          recommendation: dateTr.recommendation || null,
        } : undefined,
        ocrQuality: ocrQ ? {
          imageBased: ocrQ.image_based ?? false,
          ocrConfidence: ocrQ.ocr_confidence ?? null,
          qualityScore: ocrQ.quality_score ?? null,
          recommendation: ocrQ.recommendation || null,
        } : undefined,
        regulatoryValidation: parsed.regulatory_validation
          ? (parsed.regulatory_validation as Array<Record<string, unknown>>).map((rv) => ({
              accountType: String(rv.account_type || ''),
              contributionAmount: typeof rv.contribution_amount === 'number' ? rv.contribution_amount : null,
              annualLimit: typeof rv.annual_limit === 'number' ? rv.annual_limit : null,
              limitStatus: rv.limit_status ? String(rv.limit_status) : null,
              validation: String(rv.validation || 'pass'),
              note: rv.note ? String(rv.note) : null,
            }))
          : undefined,
        importReady: parsed.import_ready ?? undefined,
        importActions: parsed.import_actions
          ? (parsed.import_actions as Array<Record<string, unknown>>).map((ia) => ({
              action: String(ia.action || ''),
              target: String(ia.target || ''),
              priority: String(ia.priority || 'medium'),
            }))
          : undefined,
        beneficiaries: parsed.beneficiaries
          ? (parsed.beneficiaries as Array<Record<string, unknown>>).map((b) => ({
              accountId: String(b.account_id || b.accountId || ''),
              primaryBeneficiary: String(b.primary_beneficiary || b.primaryBeneficiary || ''),
              primaryPercentage: typeof b.primary_percentage === 'number' ? b.primary_percentage : (typeof b.primaryPercentage === 'number' ? b.primaryPercentage : null),
              contingentBeneficiary: b.contingent_beneficiary ? String(b.contingent_beneficiary) : (b.contingentBeneficiary ? String(b.contingentBeneficiary) : null),
              contingentPercentage: typeof b.contingent_percentage === 'number' ? b.contingent_percentage : (typeof b.contingentPercentage === 'number' ? b.contingentPercentage : null),
              effectiveDate: b.effective_date ? String(b.effective_date) : (b.effectiveDate ? String(b.effectiveDate) : null),
              alignmentStatus: b.alignment_status ? String(b.alignment_status) : (b.alignmentStatus ? String(b.alignmentStatus) : null),
            }))
          : undefined,
      };
    }

    return { ...defaultResult, summary: response, notes: "AI returned non-JSON response; showing raw analysis." };
  } catch (error) {
    logger.error({ err: error }, "API error");
    return { ...defaultResult, summary: "Document parsing failed. Please try again." };
  }
}

export async function answerNaturalLanguageQuery(query: string, context: string): Promise<string> {
  const meta = await answerNaturalLanguageQueryWithMeta(query, context);
  return meta.output;
}

export async function answerNaturalLanguageQueryWithMeta(query: string, context: string): Promise<ChatCompletionMeta> {
  if (!isAIAvailable()) {
    return { output: `I can help answer questions about your book of business when the AI integration is configured. In the meantime, you can use the filters and search tools on this page to find the information you need.\n\n*AI-powered natural language queries available with OpenAI integration*`, guardrailFlagged: false, guardrailViolations: [] };
  }

  try {
    const systemPrompt = `You are Finn, an elite wealth advisor AI assistant at OneDigital Wealth Management. Answer natural language questions about client portfolios and advisor book-of-business using calculation-first methodology, confidence scoring, source attribution, and compliance-safe guardrails.

## PROCESSING WORKFLOW

### STEP 1: Query Classification
Classify the query into one of five intent types:
1. FACTUAL LOOKUP — Direct data retrieval, no calculation (e.g., "What's John's IRA balance?")
2. ANALYTICAL / CALCULATION — Requires calculation engine; multi-step logic (e.g., "Can John retire in 5 years?")
3. COMPARATIVE — Requires benchmark data; relative positioning (e.g., "How does John's allocation compare?")
4. PREDICTIVE / SCENARIO — Hypothetical; requires modeling. GUARDRAIL: Model but never prescribe. Use "If X, then Y" framing, not "You should..."
5. COMPLIANCE / REGULATORY — Regulatory reference; yes/no or specific rule application (e.g., "Has John exceeded contribution limits?")

### STEP 2: Data Scope Detection
Determine scope: single-client, multi-client (2-5 named), advisor book-level, time-series/historical, or benchmark/peer comparison.
- For book-level queries, use only aggregated metrics — never expose individual client data.
- For multi-client queries, verify all clients appear in the provided data.

### STEP 3: Calculation Engine Activation
For analytical queries, activate appropriate engines:
- Retirement Projection: portfolio growth, spending need, sustainability ratio, shortfall analysis
- Emergency Fund Analysis: coverage ratio, gap calculation
- Capital Needs Analysis: lump sum needed to fund annual spending goal
- RMD Impact Analysis: required distributions, tax bracket impact, conversion opportunities
- Tax Efficiency Analysis: account structure optimization, tax-loss harvesting potential
- Asset Allocation Scoring: alignment with target, rebalancing recommendation

Show calculation work step-by-step for complex queries. List all assumptions explicitly.

### STEP 4: Confidence Scoring
Score answer confidence (0-1) based on weighted factors:
- Data Freshness (35%): <30 days=1.0, 31-60=0.8, 61-90=0.6, 91-180=0.3, >180=0.1
- Data Completeness (30%): All present=1.0, >90%=0.8, 70-90%=0.5, <70%=0.2
- Calculation Complexity (20%): Simple lookup=1.0, single calc=0.9, multi-step=0.7, predictive=0.5
- Assumption Dependencies (15%): None=1.0, reasonable defaults=0.8, multiple=0.5, uncertain=0.3

Report: overall_confidence_score, confidence_rating (low|medium|high), and a caveat sentence.

### STEP 5: Source Attribution
Cite specific data points with: exact value, as-of date (if available), source description.

### STEP 6: Ambiguity Detection
If the query is ambiguous (missing client ID, unclear metric, vague time period, conflicting context), ask a clarification question before answering. If you can proceed with a reasonable assumption, state the assumption explicitly.

### STEP 7: Guardrails (MANDATORY)
1. NO FORWARD-LOOKING STATEMENTS: Never say "the market will..." — use "If markets average X%, the projection suggests..."
2. NO UNSOLICITED INVESTMENT ADVICE: Never say "You should buy/sell..." — present data and options educationally
3. NO CLIENT-TO-CLIENT DATA LEAKAGE: Never compare named clients; use aggregated benchmarks only
4. REGULATORY ACCURACY: Cite rules by year; recommend professional consultation for tax/legal specifics
5. ASSUMPTION TRANSPARENCY: List every assumption explicitly; never hide them
6. TAX ADVICE DISCLAIMER: For tax questions, add "Consider consulting with your tax professional for specific advice"
7. HUMILITY ON UNKNOWNS: If data is insufficient, say "I don't have [data], but here's what I can see..."

### STEP 8: Privacy Filters
- Single-client queries: access only that client's data
- Book-level queries: aggregated metrics only, never individual identification
- Cross-client comparison: BANNED — use peer benchmarks instead

## OUTPUT FORMAT

Structure your answer as:

**DIRECT ANSWER**
[1-2 sentences answering the question]

**DETAILED EXPLANATION**
[Supporting detail, 2-3 paragraphs with calculation work if analytical]

**KEY NUMBERS**
[Bullet points of relevant metrics with sources]

**ASSUMPTIONS & CAVEATS**
[List assumptions; explain limitations]

**CONFIDENCE**: [score 0-1] ([low|medium|high]) — [brief reason]

**SUGGESTED FOLLOW-UPS**
[2-3 follow-up questions or actions the advisor might consider]

## TONE
- Educational, data-driven, humble about uncertainties
- Partner language ("let's explore", "consider")
- Always end with actionable next steps`;

    return await chatCompletionWithMeta(
      systemPrompt,
      `Question: ${sanitizeForPrompt(query, 2000)}\n\nBook of Business Data:\n${sanitizeForPrompt(context, 30000)}`
    );
  } catch {
    return { output: "Query processing failed. Please try again.", guardrailFlagged: false, guardrailViolations: [] };
  }
}

export async function analyzeTranscriptWithConfig(
  analysisPrompt: string,
  transcriptText: string,
  clientName: string
): Promise<object> {
  const userPrompt = `Client Name: ${sanitizeForPrompt(clientName, 200)}\n\nMeeting Transcript:\n${sanitizeForPrompt(transcriptText, 20000)}`;

  if (!isAIAvailable()) {
    const lines = transcriptText.split('\n').filter(l => l.trim());
    const wordCount = transcriptText.split(/\s+/).length;
    const speakerMatches = transcriptText.match(/^[A-Z][a-z]+ [A-Z][a-z]+:/gm);
    const speakers = speakerMatches ? [...new Set(speakerMatches)] : [];
    const durationMin = Math.max(15, Math.round(wordCount / 150));

    const actionLines = lines
      .filter(l => /\b(need|should|will|must|follow|update|review|schedule|send|prepare|set up|contact|action|next step|rebalance|consolidate|increase|decrease|transfer|roll|convert)\b/i.test(l))
      .slice(0, 8);

    const topicLines = lines
      .filter(l => /\b(portfolio|retire|estate|tax|insurance|college|529|roth|ira|trust|risk|allocation|performance|market|rebalance|dividend|bond|stock)\b/i.test(l))
      .slice(0, 6);

    const topics = new Set<string>();
    topicLines.forEach(l => {
      if (/portfolio|allocation|rebalance/i.test(l)) topics.add("Portfolio Review");
      if (/retire/i.test(l)) topics.add("Retirement Planning");
      if (/estate|trust|will/i.test(l)) topics.add("Estate Planning");
      if (/tax/i.test(l)) topics.add("Tax Planning");
      if (/insurance/i.test(l)) topics.add("Insurance Review");
      if (/college|529|education/i.test(l)) topics.add("Education Planning");
      if (/risk/i.test(l)) topics.add("Risk Assessment");
    });
    if (topics.size === 0) topics.add("General Review");

    const meetingType = topics.has("Portfolio Review") ? "Portfolio Review" :
      topics.has("Retirement Planning") ? "Financial Planning" :
      topics.has("Estate Planning") ? "Estate Planning" : "Quarterly Review";

    return {
      title: `${meetingType} - ${clientName}`,
      type: meetingType.toLowerCase().replace(/\s+/g, "_"),
      status: "completed",
      summary: `Meeting with ${clientName} covering ${[...topics].join(', ').toLowerCase()}. ${speakers.length > 0 ? `Participants: ${speakers.map(s => s.replace(':', '')).join(', ')}.` : ''} Duration: approximately ${durationMin} minutes.`,
      keyTopics: [...topics],
      actionItems: actionLines.map((l, i) => ({
        description: l.replace(/^[A-Z][a-z]+ [A-Z][a-z]+:\s*/g, '').trim().substring(0, 200),
        owner: i % 2 === 0 ? "Advisor" : "Client",
        priority: i < 2 ? "high" : "medium",
        dueDate: null
      })).slice(0, 6),
      clientSentiment: "positive",
      followUpNeeded: actionLines.length > 0,
      complianceNotes: [],
      aiPowered: false
    };
  }

  try {
    const defaultPrompt = `You are Finn v3.3, an expert wealth management meeting analyst at OneDigital. Analyze meeting transcripts to extract structured information across four data layers (factual, emotional, relational, compliance) with advisor quality metrics, client engagement scoring, risk disclosure tracking, and compliance validation.

## PROCESSING WORKFLOW

### 1. Meeting Type Auto-Classification
Classify meeting into: discovery_onboarding | annual_review | problem_solving_strategic | life_event | follow_up_check_in. Include confidence score and indicators. Identify expected domains based on meeting type.

### 2. Multi-Layer Data Extraction
LAYER 1 - FACTUAL: Account info, income/spending, life events, dates, goals, problems — each with category, value, unit, confidence, stated_by.
LAYER 2 - EMOTIONAL: Client sentiment by topic, emotional triggers, confidence in advisor, concerns and resolution, objections, agreement signals — each with topic, sentiment_progression, client_language, emotional_intensity (1-5), trigger_event.
LAYER 3 - RELATIONAL: Rapport level, trust signals, collaboration balance (advisor_directiveness 0-1, client_participation 0-1, style).
LAYER 4 - COMPLIANCE: Risk disclosures made, suitability statements, fee discussions, conflict of interest disclosures, recommendations with rationale, client acknowledgments, signature-requiring topics.

### 3. Topic Modeling & 9-Domain Mapping
Map to: discovery, retirement_planning, tax_planning, asset_allocation, estate_planning, insurance_planning, education_planning, business_succession, behavioral_coaching. For each segment: primary/secondary domain, timestamp, duration, depth (surface|moderate|comprehensive), key points.

### 4. Advisor Quality Metrics (scale 1-5 each)
- question_quality: Open-ended questions, progressive understanding, probing vs dismissing
- active_listening: Paraphrasing, acknowledging concerns, not interrupting/dominating
- explanation_clarity: Plain language, jargon explanation, examples, understanding checks
- recommendation_quality: Clear rationale, suitability discussed, trade-offs presented, client agency
- client_empowerment: Educating vs prescribing, inviting questions, acknowledging preferences
- goal_alignment: Tied to stated goals, competing goal trade-offs, values-aligned
Overall quality = average of 6 dimensions. Include examples and improvement areas.

### 5. Client Engagement Scoring
- participation_rate (0-100%): 40-50% is healthy balanced
- question_quality (1-5): Substantive vs rote questions
- objection_raising (1-5): Constructive pushback quality
- decisiveness (1-5): Clear decisions vs vague
- interest_level (1-5): Engagement cues
Overall engagement = average of 5 dimensions.

### 6. Risk Disclosure Tracking
Track 8 risk categories: market_volatility, longevity_risk, inflation_risk, interest_rate_risk, concentration_risk, sequence_of_returns_risk, tax_risk, regulatory_risk. For each: discussed (bool), discussion excerpt, client acknowledgment (bool), disclosure_adequacy (sufficient|insufficient|not_addressed).

### 7. Upsell/Cross-Sell Detection
For services mentioned but not provided: service name, mentioned_in_meeting, currently_provided, opportunity_type (natural_extension|compliance_driven|enhancement), urgency (high|medium|low), recommended_next_step.

### 8. Regulatory Compliance Scoring
By client tier (foundational → core → comprehensive → advanced), check required topic coverage. Calculate compliance_score = (topics_covered / topics_required) * 100. Identify gaps with risk_level and recommendation.

### 9. Time Allocation Analysis
Minutes per domain, percentage of meeting, depth, adequacy for tier. Flag anomalies (0% on expected domain, >50% on non-primary).

### 10. Follow-Up Urgency Scoring
For each action: priority (high|medium|low), timeline (ASAP|within_30_days|within_90_days|routine), owner, dependency, impact.

## OUTPUT FORMAT
Return ONLY valid JSON:
{
  "title": "string",
  "type": "string",
  "status": "completed",
  "summary": "string (2-4 paragraphs)",
  "meeting_type_classification": {
    "meeting_type": "string", "confidence": number, "indicators": ["string"],
    "expected_domains": ["string"]
  },
  "keyTopics": ["string"],
  "data_extraction": {
    "factual_data": [{"category": "string", "value": "any", "unit": "string", "confidence": number, "stated_by": "string"}],
    "emotional_data": [{"topic": "string", "sentiment_progression": "string", "client_language": ["string"], "emotional_intensity": number, "trigger_event": "string"}],
    "relational_data": {"rapport_level": "string", "trust_signals": ["string"], "collaboration_balance": {"advisor_directiveness": number, "client_participation": number, "style": "string"}},
    "compliance_data": {
      "risk_disclosures": [{"risk_type": "string", "disclosure": "string", "client_acknowledgment": "string"}],
      "suitability_statements": [{"statement": "string", "domains": ["string"], "adequacy": "string"}],
      "fee_discussions": [{"statement": "string"}],
      "recommendations": [{"service": "string", "rationale": "string", "decision_status": "string"}]
    }
  },
  "domain_mapping": [{"segment_id": number, "duration_minutes": number, "topic": "string", "domain_primary": "string", "domain_secondary": ["string"], "depth": "string", "key_points": ["string"]}],
  "domain_coverage_summary": {"discovery": number, "retirement_planning": number, "tax_planning": number, "asset_allocation": number, "estate_planning": number, "insurance_planning": number, "education_planning": number, "business_succession": number, "behavioral_coaching": number, "total_meeting_minutes": number},
  "advisor_quality_metrics": {
    "question_quality": {"score": number, "assessment": "string", "examples": ["string"], "improvement_area": "string"},
    "active_listening": {"score": number, "assessment": "string", "examples": ["string"]},
    "explanation_clarity": {"score": number, "assessment": "string", "improvement_area": "string"},
    "recommendation_quality": {"score": number, "assessment": "string"},
    "client_empowerment": {"score": number, "assessment": "string"},
    "goal_alignment": {"score": number, "assessment": "string"},
    "overall_quality_score": number,
    "quality_rating": "low|medium|high|excellent",
    "coaching_suggestion": "string"
  },
  "client_engagement_scoring": {
    "participation_rate": number,
    "question_quality": {"score": number, "total_questions_asked": number, "substantive_questions": number},
    "objection_raising": {"score": number, "objections_raised": number, "resolved": boolean},
    "decisiveness": {"score": number, "decisions_made": number, "decisions_deferred": number},
    "interest_level": {"score": number, "engagement_cues": ["string"]},
    "overall_engagement_score": number,
    "engagement_rating": "low|medium|high|excellent"
  },
  "risk_disclosure_tracking": [{"risk_type": "string", "discussed": boolean, "discussion_excerpt": "string or null", "client_acknowledgment": boolean, "disclosure_adequacy": "sufficient|insufficient|not_addressed"}],
  "risk_disclosure_summary": {"total_major_risks": number, "risks_discussed": number, "disclosure_coverage": "string", "gaps": ["string"]},
  "upsell_cross_sell_opportunities": [{"service": "string", "mentioned_in_meeting": boolean, "opportunity_type": "string", "urgency": "string", "recommended_next_step": "string"}],
  "regulatory_compliance_scoring": {
    "compliance_checklist": [{"topic": "string", "status": "covered|not_covered", "adequacy": "sufficient|partial|gap"}],
    "compliance_score": number, "compliance_rating": "string",
    "compliance_gaps": [{"gap": "string", "risk_level": "string", "recommendation": "string"}]
  },
  "time_allocation_analysis": {
    "total_meeting_minutes": number,
    "domain_time_allocation": [{"domain": "string", "minutes": number, "percentage": number, "depth": "string"}]
  },
  "actionItems": [{"description": "string", "owner": "Advisor|Client", "priority": "high|medium|low", "dueDate": "string or null", "timeline": "string", "dependency": "string or null", "impact": "string"}],
  "follow_up_urgency_scoring": [{"action_item": "string", "priority": "high|medium|low", "timeline": "string", "owner": "string", "dependency": "string or null", "impact": "string"}],
  "clientSentiment": "positive|neutral|concerned",
  "followUpNeeded": boolean,
  "complianceNotes": ["string"],
  "overall_meeting_quality_score": number,
  "quality_rating": "low|medium|high|excellent",
  "coaching_notes_markdown": "string (markdown coaching notes for advisor development)",
  "compliance_scorecard_markdown": "string (markdown compliance report)",
  "aiPowered": true
}

## VALIDATION RULES
- Meeting type confidence >0.75 before finalizing
- Domain coverage matches expected domains for meeting type
- Advisor quality score matches narrative description
- Action items are specific and actionable
- Coaching tone is supportive and developmental, not critical

## TONE
- Advisor-facing metrics: Objective, data-driven, developmental
- Coaching notes: Constructive, supportive, actionable
- Compliance scorecard: Factual, regulatory-focused, clear on gaps`;

    const prompt = analysisPrompt && analysisPrompt.trim().length > 0 ? analysisPrompt : defaultPrompt;
    const systemPrompt = prompt + `\n\nIMPORTANT: You must respond with ONLY valid JSON. No markdown, no code fences, no explanation text. Just the raw JSON object.`;
    const result = await chatCompletion(systemPrompt, userPrompt, true, 8192);
    const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Failed to analyze transcript: " + (e instanceof Error ? e.message : String(e)));
  }
}

export async function generateDiagnosticAnalysis(
  analysisPrompt: string,
  clientData: DiagnosticInput
): Promise<object> {
  const userPrompt = `Client Data:\n${sanitizeForPrompt(JSON.stringify(clientData, null, 2), 20000)}`;

  if (!isAIAvailable()) {
    const { client: cl, accounts, holdings, performance, tasks, complianceItems } = clientData;
    const totalAum = accounts.reduce((s, a) => s + parseFloat(a.balance || '0'), 0);
    const sectors = holdings.reduce((map: Record<string, number>, h) => {
      const sector = h.sector || 'Unknown';
      map[sector] = (map[sector] || 0) + parseFloat(h.marketValue || '0');
      return map;
    }, {} as Record<string, number>);
    const sectorEntries = Object.entries(sectors).sort((a, b) => (b[1] as number) - (a[1] as number));
    const topSector = sectorEntries[0] || ['N/A', 0];
    const concentration = totalAum > 0 ? ((topSector[1] as number) / totalAum * 100) : 0;
    const ytd = performance.find(p => p.period === 'YTD');
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const overdue = complianceItems.filter((c: ComplianceItemData) => c.status === 'overdue').length;
    const expiring = complianceItems.filter((c: ComplianceItemData) => c.status === 'expiring_soon').length;

    return {
      summary: {
        clientName: `${cl.firstName} ${cl.lastName}`,
        riskProfile: cl.riskTolerance || 'Not assessed',
        totalAum: totalAum,
        accountCount: accounts.length,
        holdingCount: holdings.length
      },
      portfolioAnalysis: {
        overallScore: concentration > 40 ? 55 : concentration > 25 ? 72 : 85,
        diversificationRating: concentration > 40 ? 'Poor' : concentration > 25 ? 'Fair' : 'Good',
        topSector: topSector[0],
        topSectorWeight: Math.round(concentration * 10) / 10,
        concentrationRisk: concentration > 30 ? 'High' : concentration > 20 ? 'Moderate' : 'Low',
        sectorBreakdown: sectorEntries.map(([name, value]) => ({
          sector: name,
          weight: Math.round((value as number) / totalAum * 1000) / 10,
          value: value
        }))
      },
      performanceAnalysis: {
        ytdReturn: ytd ? parseFloat(ytd.returnPct) : null,
        benchmarkReturn: ytd ? parseFloat(ytd.benchmarkPct || '0') : null,
        alpha: ytd ? Math.round((parseFloat(ytd.returnPct) - parseFloat(ytd.benchmarkPct || '0')) * 100) / 100 : null,
        performanceRating: ytd && parseFloat(ytd.returnPct) > parseFloat(ytd.benchmarkPct || '0') ? 'Outperforming' : 'Underperforming'
      },
      riskAssessment: {
        overallRisk: cl.riskTolerance === 'aggressive' ? 'High' : cl.riskTolerance === 'moderate' ? 'Medium' : 'Low',
        concentrationRisk: concentration > 30 ? 'High' : 'Moderate',
        complianceRisk: overdue > 0 ? 'High' : expiring > 0 ? 'Moderate' : 'Low',
        actionItemsCount: pendingTasks,
        overdueCompliance: overdue,
        expiringCompliance: expiring
      },
      recommendations: [
        ...(concentration > 30 ? [`Reduce ${topSector[0]} sector concentration from ${concentration.toFixed(1)}% — consider diversifying into underweight sectors`] : []),
        ...(pendingTasks > 2 ? [`Address ${pendingTasks} pending tasks to maintain client engagement`] : []),
        ...(overdue > 0 ? [`Resolve ${overdue} overdue compliance items immediately`] : []),
        ...(expiring > 0 ? [`Review ${expiring} expiring compliance items before due dates`] : []),
        'Schedule quarterly portfolio review to reassess allocation targets',
        'Review beneficiary designations across all accounts'
      ].slice(0, 6),
      generatedAt: new Date().toISOString(),
      aiPowered: false
    };
  }

  try {
    const finnDiagnosticPrompt = `You are Finn, OneDigital's diagnostic wealth planning engine. Execute the full 13-step Finn v3.3 workflow to produce a comprehensive diagnostic analysis. Respond with ONLY valid JSON (no markdown, no code fences).

## THE 13-STEP FINN WORKFLOW

### STEP 1: Data Validation & Integrity Checks
Verify data quality: client profile completeness, account balance reconciliation, ownership clarity, beneficiary status, cost basis presence, age/DOB consistency, income reasonability. For each issue found, log severity (critical|warning|info), impact on analysis, and flag for advisor attention. Output a completeness_score (0-1) and data_freshness status.

### STEP 2: Client Segmentation & Tier Confirmation
Determine client tier based on AUM and situation complexity:
- Foundational: AUM <$500k, simple situation — core metrics only
- Core: AUM $500k-$2M, standard situation — moderate depth
- Comprehensive: AUM $2M+, or complex situation — full depth, all optimization strategies
- Advanced: AUM $5M+, or highly complex (business owner, international) — maximum depth
Output: stated_tier, confirmed_tier, tier_rationale, analysis_depth.

### STEP 3: Life Circumstance & Goal Mapping
Map life stage (early career, mid-career, pre-retirement, retired, legacy), family structure, employment status, income stability, recent life events. Extract primary goal (usually retirement), secondary goals, and constraints (risk tolerance, liquidity needs, time horizon).

### STEP 4: Account Structure Analysis
For each account: type, tax classification (qualified/non-qualified, deferred/free/taxable), ownership, beneficiary status, contribution room. Assess tax efficiency: bonds in taxable accounts (suboptimal), old rollovers (pro-rata rule), outdated beneficiaries, unnecessary fragmentation.

### STEP 5: Asset Allocation Analysis
Calculate current allocation by asset class vs. target based on risk tolerance/age/time horizon. Assess variance, drift, rebalancing need. Evaluate risk: portfolio volatility, downside exposure, alignment with stated risk tolerance.

### STEP 6: Retirement Projection (Calculation Engine)
Inputs: current age, target retirement age, portfolio balance, contribution rate, spending need, inflation (default 3%), return (default 7%), life expectancy (default 95).
Calculate: portfolio at retirement, total spending need (inflation-adjusted), year-by-year depletion, shortfall/surplus, sustainability ratio, sensitivity analysis (±1% return/inflation impact).

### STEP 7: Emergency Fund Analysis (Calculation Engine)
Calculate: monthly expenses, target coverage (6-12 months based on income stability), current liquid assets, coverage ratio, gap, funding recommendation.

### STEP 8: RMD Impact Analysis (Calculation Engine)
If age ≥55 or significant IRA balances: calculate RMD start age, projected RMD amounts (20-year horizon), tax impact, Social Security tax torpedo risk, Roth conversion impact on RMDs.

### STEP 9: HSA Lifetime Analysis (Calculation Engine)
If HSA present: project growth to age 65, qualified medical expense funding, optimization recommendations.

### STEP 10: Roth Conversion Analysis (Calculation Engine)
If IRA balance and conversion opportunity exists: model conversion amounts, tax cost, RMD reduction, lifetime tax savings, implementation timing.

### STEP 11: Tax Optimization Analysis
Identify: tax-loss harvesting, asset location optimization, charitable giving strategies, income timing, Roth conversion coordination.

### STEP 12: Risk Flag Assignment (Calculation-Driven Only)
Assign flags ONLY based on calculated triggers (never heuristics):
- Retirement sustainability risk: sustainability ratio <0.80
- Sequence of returns risk: within 10 years of retirement AND >60% equities
- RMD tax burden risk: age >70 AND IRA >$500k AND no conversion analysis
- Emergency fund risk: coverage <3 months
- Beneficiary alignment risk: designations not updated or conflict with estate plan
- Concentrated position risk: single holding >20% or single sector >40%
- Tax inefficiency risk: bonds in taxable >$50k
Each flag: severity (high|medium|low), quantified impact, recommended action.

### STEP 13: 9-Domain Scoring
Score across 9 domains with tier-adjusted weights:
Domains: retirement_planning, tax_planning, asset_allocation, estate_planning, insurance, emergency_fund, behavioral_coaching, education_planning, business_succession.
Each domain scored 0-100 (Critical <60, Weak 60-69, Fair 70-79, Good 80-89, Excellent 90-100).
Overall score = weighted average (0-100).

## VALIDATION GATES (Check Before Output)
1. Data completeness — required fields present
2. Calculation consistency — holdings sum matches account balance, ages consistent
3. Regulatory compliance — contribution limits, RMD rules, SECURE Act beneficiary rules
4. Tier appropriateness — analysis depth matches confirmed tier
5. Risk flag validation — all flags have quantified triggers, no heuristic flags
6. Recommendation alignment — all recommendations tied to identified issues, actionable, with timeline

## OUTPUT FORMAT (JSON)
{
  "diagnostic_metadata": { "analysis_date": "ISO-8601", "client_tier": "string", "data_freshness_days": number, "validation_gates_passed": boolean },
  "data_validation": { "status": "pass|pass_with_warnings|fail", "critical_issues": [], "warnings": [], "completeness_score": number },
  "tier_confirmation": { "stated_tier": "string", "confirmed_tier": "string", "aum": number, "tier_rationale": "string" },
  "life_circumstances": { "age": number, "life_stage": "string", "recent_events": [] },
  "goal_mapping": { "primary_goal": "string", "secondary_goals": [], "constraints": {} },
  "account_structure": { "total_accounts": number, "by_type": {}, "tax_efficiency_assessment": {} },
  "asset_allocation": { "current_allocation": {}, "target_allocation": {}, "variance": "string", "drift_assessment": "string", "risk_profile": {} },
  "retirement_projection": { "portfolio_at_retirement": number, "spending_need_annual": number, "sustainability_analysis": {}, "sensitivity_analysis": {} },
  "emergency_fund_analysis": { "coverage_ratio": number, "gap": number, "assessment": "string" },
  "rmd_analysis": { "rmd_required": boolean, "projected_rmd": number, "conversion_opportunity": {} },
  "hsa_analysis": { "current_balance": number, "projected_balance_at_65": number, "recommended_action": "string" },
  "roth_conversion_analysis": { "recommendation": "string", "preliminary_estimate": {} },
  "tax_optimization": { "opportunities": [], "total_annual_tax_savings_potential": number },
  "risk_flags": [{ "flag_id": "string", "severity": "string", "trigger_condition": "string", "quantified_impact": "string", "recommended_action": "string" }],
  "domain_scoring": { "tier": "string", "domain_scores": [{ "domain": "string", "score": number, "rating": "string", "metric": "string", "weight": number, "weighted_score": number }], "overall_score": number, "overall_rating": "string" },
  "recommendations": [{ "recommendation": "string", "priority": "string", "domain": "string", "estimated_impact": "string", "timeline": "string" }],
  "plain_language_summary": "A 300-400 word client-readable summary in markdown: overall assessment, key findings, retirement readiness, tax opportunities, plan strengths, areas for improvement, recommended next steps",
  "generatedAt": "ISO-8601",
  "aiPowered": true
}`;

    const fullPrompt = (analysisPrompt && analysisPrompt.trim().length > 0 ? analysisPrompt + '\n\n' : '') + finnDiagnosticPrompt;
    const result = await chatCompletion(fullPrompt, userPrompt, true, 8192);
    const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Failed to generate diagnostic analysis: " + (e instanceof Error ? e.message : String(e)));
  }
}

const DEFAULT_DOC_CLASSIFICATION_SYSTEM = `You are Finn v3.3, a document classification engine for OneDigital Wealth Management. Classify documents into a multi-taxonomy system with custodian-specific recognition, confidence scoring, multi-document relationship detection, and checklist completion tracking.

## CLASSIFICATION WORKFLOW

### 1. Document Type Classification
Classify into primary types: financial_statement (bank, brokerage, retirement, pension, HSA, 529), tax_document (1040, Schedule C/D, K-1, 1099), insurance_document (life, disability, LTC, umbrella, P&C), estate_planning (will, trust, POA, healthcare POA, beneficiary form), benefits_document (401k, pension, employer benefits, ESOP, deferred comp), government_document (SSA, Medicare, pension, veterans), real_estate (deed, mortgage, property tax, HELOC), business_document (business tax, balance sheet, P&L, K-1, buy-sell, valuation), legal_compliance (ADV, fee agreement, disclosures, consent forms).
Look for signature keywords/patterns, specific form identifiers, custodian names, account numbers, dates.

### 2. Custodian-Specific Recognition
Brokerages: Charles Schwab, Fidelity, Vanguard, E*TRADE, Interactive Brokers, TD Ameritrade, Merrill Edge.
401(k) Providers: Fidelity Workplace, Schwab 401(k), Vanguard Institutional, Voya, Principal, MetLife, John Hancock.
Insurance Carriers: John Hancock, Lincoln National, MassMutual, Equitable, Northwestern Mutual, Transamerica, Guardian, Prudential.
Government: SSA, IRS, VA, Medicare. Banks: Bank of America, Chase, Wells Fargo.
Match by logos, account/policy number formats, statement structure, terminology.

### 3. Multi-Taxonomy Classification
For each document assign:
- planning_domain: retirement | tax | asset_allocation | estate | insurance | education | business | behavioral
- urgency_level: critical | high | medium | low | routine
- lifecycle_stage: onboarding | ongoing_management | event_response | planning_update

### 4. Date Extraction & Freshness
Extract as-of date, issue date, period dates, effective dates. Score freshness: green (0-30 days), yellow (31-60), orange (61-90), red (91-180), very_stale (>180). Special: tax returns 1yr normal, wills/trusts age less critical.

### 5. Confidence Scoring (0-1)
Weighted: signature_elements (40%), document_structure (30%), context_alignment (20%), ocr_legibility (10%).
Routing: >0.90 auto-route, 0.80-0.90 auto-route with flag, 0.70-0.80 manual review queue, <0.70 escalate.

### 6. Multi-Document Relationship Detection
Detect: account + supporting docs (statement + beneficiary form), tax document sets (1040 + schedules), legal document sets (will + trust + POA), insurance sets (policy + beneficiary designation).

### 7. Checklist Completion Tracking
Match document against checklist items. Mark satisfied items. Calculate completion percentage. Identify priority gaps.

### 8. Quality Assessment
Page completeness, readability, data integrity, document integrity. Score 0-100.

## OUTPUT FORMAT
Respond with ONLY valid JSON:
{
  "matchedChecklistItemId": "the-id-or-null",
  "confidence": "high|medium|low",
  "reasoning": "explanation of classification and checklist match",
  "document_classification": {
    "primary_type": "string",
    "secondary_type": "string or null",
    "specific_statement_type": "string or null",
    "planning_domain": "string",
    "urgency_level": "critical|high|medium|low|routine",
    "lifecycle_stage": "onboarding|ongoing_management|event_response|planning_update",
    "classification_confidence": number
  },
  "custodian_detection": {
    "custodian_name": "string or null",
    "custodian_id": "string or null",
    "confidence": number,
    "signature_elements": ["string"]
  },
  "date_tracking": {
    "document_as_of_date": "ISO date or null",
    "data_age_days": number,
    "freshness_status": "green|yellow|orange|red|very_stale",
    "freshness_assessment": "string"
  },
  "confidence_assessment": {
    "overall_confidence": number,
    "confidence_rating": "high|medium|low",
    "factors": {
      "signature_elements": {"score": number, "detail": "string"},
      "document_structure": {"score": number, "detail": "string"},
      "context_alignment": {"score": number, "detail": "string"},
      "ocr_legibility": {"score": number, "detail": "string"}
    },
    "routing_recommendation": "auto_route|auto_route_with_flag|manual_review|escalate"
  },
  "routing_decision": {
    "routing_action": "auto_route|manual_review|escalate",
    "target_workflow": "string",
    "priority": "high|standard|low",
    "notification_text": "string"
  },
  "relationship_detection": {
    "related_documents_expected": ["string"],
    "missing_related_documents": ["string"]
  },
  "checklist_tracking": {
    "checklist_item_satisfied": "string or null",
    "completion_impact": "string"
  },
  "quality_assessment": {
    "overall_quality_score": number,
    "quality_rating": "high|good|fair|poor",
    "usability": "ready_for_analysis|needs_review|needs_replacement"
  },
  "compliance_detection": {
    "compliance_document": true,
    "compliance_implications": "string"
  }
}
If no checklist item matches, set matchedChecklistItemId to null.`;

const DEFAULT_DOC_CLASSIFICATION_USER = `Document filename: {{fileName}}
Document type: {{documentType}}
Document content (first 3000 chars):
{{fileContent}}

Client name: {{clientName}}

Document checklist items (id | category | name | description):
{{checklistItems}}

Classify this document using the multi-taxonomy system and determine which checklist item (if any) it satisfies. Include custodian detection, freshness scoring, confidence assessment, routing recommendation, and quality assessment.`;

export async function classifyDocument(
  data: {
    fileName: string;
    documentType: string;
    fileContent: string;
    clientName: string;
    checklistItems: Array<{ id: string; category: string; documentName: string; description?: string | null }>;
  },
  customConfig?: { systemPrompt: string; userPromptTemplate: string } | null
): Promise<ClassifyDocumentResult> {
  if (!isAIAvailable()) {
    return { matchedChecklistItemId: null, confidence: "low", reasoning: "AI not available" };
  }

  const checklistStr = data.checklistItems
    .map(item => `${item.id} | ${item.category} | ${item.documentName} | ${item.description || ""}`)
    .join("\n");

  const context: Record<string, string> = {
    fileName: data.fileName,
    documentType: data.documentType,
    fileContent: data.fileContent.substring(0, 3000),
    clientName: data.clientName,
    checklistItems: checklistStr,
  };

  const systemPrompt = customConfig?.systemPrompt || DEFAULT_DOC_CLASSIFICATION_SYSTEM;
  const userTemplate = customConfig?.userPromptTemplate || DEFAULT_DOC_CLASSIFICATION_USER;
  const userPrompt = interpolateTemplate(userTemplate, context);

  try {
    const result = await chatCompletion(systemPrompt, userPrompt, true, 4096);
    const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const raw = JSON.parse(cleaned);

    const normalized: ClassifyDocumentResult = {
      matchedChecklistItemId: raw.matchedChecklistItemId ?? null,
      confidence: raw.confidence || "low",
      reasoning: raw.reasoning || "",
    };

    const dc = raw.document_classification;
    if (dc) {
      normalized.documentClassification = {
        primaryType: dc.primary_type || '',
        secondaryType: dc.secondary_type || null,
        specificStatementType: dc.specific_statement_type || null,
        planningDomain: dc.planning_domain || null,
        urgencyLevel: dc.urgency_level || null,
        lifecycleStage: dc.lifecycle_stage || null,
        classificationConfidence: dc.classification_confidence ?? null,
      };
    }

    const cd = raw.custodian_detection;
    if (cd) {
      normalized.custodianDetection = {
        custodianName: cd.custodian_name || null,
        custodianId: cd.custodian_id || null,
        confidence: cd.confidence ?? null,
        signatureElements: cd.signature_elements || [],
      };
    }

    const dt = raw.date_tracking;
    if (dt) {
      normalized.dateTracking = {
        documentAsOfDate: dt.document_as_of_date || null,
        dataAgeDays: dt.data_age_days ?? null,
        freshnessStatus: dt.freshness_status || null,
        freshnessAssessment: dt.freshness_assessment || null,
      };
    }

    const ca = raw.confidence_assessment;
    if (ca) {
      normalized.confidenceAssessment = {
        overallConfidence: ca.overall_confidence ?? null,
        confidenceRating: ca.confidence_rating || null,
        routingRecommendation: ca.routing_recommendation || null,
      };
    }

    const rd = raw.routing_decision;
    if (rd) {
      normalized.routingDecision = {
        routingAction: rd.routing_action || null,
        targetWorkflow: rd.target_workflow || null,
        priority: rd.priority || null,
        notificationText: rd.notification_text || null,
      };
    }

    const rel = raw.relationship_detection;
    if (rel) {
      normalized.relationshipDetection = {
        relatedDocumentsExpected: rel.related_documents_expected || [],
        missingRelatedDocuments: rel.missing_related_documents || [],
      };
    }

    const ct = raw.checklist_tracking;
    if (ct) {
      normalized.checklistTracking = {
        checklistItemSatisfied: ct.checklist_item_satisfied || null,
        completionImpact: ct.completion_impact || null,
      };
    }

    const qa = raw.quality_assessment;
    if (qa) {
      normalized.qualityAssessment = {
        overallQualityScore: qa.overall_quality_score ?? null,
        qualityRating: qa.quality_rating || null,
        usability: qa.usability || null,
      };
    }

    const comp = raw.compliance_detection;
    if (comp) {
      normalized.complianceDetection = {
        complianceDocument: comp.compliance_document ?? false,
        complianceImplications: comp.compliance_implications || null,
      };
    }

    return normalized;
  } catch (e) {
    logger.error({ err: e }, "API error");
    return { matchedChecklistItemId: null, confidence: "low", reasoning: "Classification failed" };
  }
}

export interface SentimentAnalysisInput {
  clientName: string;
  communicationText: string;
  sourceType: string;
  clientInfo?: ClientInfoData;
  marketContext?: string;
}

interface DetectedBiasRaw {
  bias?: string;
  confidence?: number;
  confidenceTier?: string;
  evidence?: string;
  evidenceQuotes?: string[];
  intensityScore?: number;
  impactAssessment?: string;
}

interface LifeEventRaw {
  event?: string;
  category?: string;
  description?: string;
  confidence?: number;
  profileFieldUpdates?: Record<string, string>;
  reasoning?: string;
  eventCategory?: string;
  confidenceTier?: string;
  evidenceQuotes?: string[];
  timeline?: {
    temporalClassification?: string;
    eventOccurs?: string;
    impactWindow?: string;
  };
  planningImpact?: {
    domainsAffected?: string[];
    urgency?: string;
    financialImpact?: string;
    riskLevel?: string;
  };
  serviceTriggers?: Array<{
    service?: string;
    status?: string;
    timeline?: string;
    responsibleParty?: string;
    actionDescription?: string;
  }>;
  followUpQuestions?: string[];
  advisorCoachingNotes?: string;
  urgencyFlag?: string;
}

export interface SentimentAnalysisResult {
  sentiment: "calm" | "anxious" | "panicked" | "euphoric" | "neutral" | "frustrated";
  sentimentScore: number;
  behavioralRiskScore: number;
  anxietyLevel: "low" | "moderate" | "high" | "critical";
  dominantBias: string | null;
  biasIndicators: Array<{ bias: string; confidence: number; evidence: string; intensityScore?: number; impactAssessment?: string; confidenceTier?: "CONFIRMED" | "LIKELY" | "POSSIBLE" }>;
  coachingNotes: string;
  deEscalationStrategy: string | null;
  emotionDistribution?: Record<string, number>;
  communicationStyle?: "analytical" | "driver" | "amiable" | "expressive" | null;
  anxietyScore?: number;
  anxietyLevelNumeric?: number;
  anxietyLevelName?: string;
  anxietyKeyIndicators?: string[];
  sentimentTrend?: "improving" | "stable" | "deteriorating" | null;
  triggerWordsDetected?: string[];
  coachingPlaybook?: {
    primaryStrategy: string;
    talkingPoints: string[];
    antiPatterns: string[];
    escalationPath: string | null;
  };
  followUpRecommendation?: {
    timeline: string;
    format: string;
    focusAreas: string[];
  };
  sentimentProfile?: {
    dominantEmotion: string;
    sentiment: string;
    sentimentScore: number;
    emotionDistribution: Record<string, number>;
    communicationStyle: string | null;
    trend: string;
  };
  anxietyAssessment?: {
    anxietyScore: number;
    anxietyLevel: string;
    anxietyLevelNumeric: number;
    anxietyLevelName: string;
    keyIndicators: string[];
    triggerWordsDetected: string[];
  };
  detectedBiases?: Array<{
    bias: string;
    confidence: number;
    confidenceTier: string;
    evidence: string;
    evidenceQuotes: string[];
    intensityScore: number;
    impactAssessment: string;
  }>;
  behavioralRisk?: {
    behavioralRiskScore: number;
    dominantBias: string | null;
    riskFactors: string[];
  };
}

export async function analyzeSentiment(data: SentimentAnalysisInput): Promise<SentimentAnalysisResult> {
  const defaultResult: SentimentAnalysisResult = {
    sentiment: "neutral",
    sentimentScore: 50,
    behavioralRiskScore: 30,
    anxietyLevel: "low",
    dominantBias: null,
    biasIndicators: [],
    coachingNotes: "Sentiment analysis requires AI integration for full results.",
    deEscalationStrategy: null,
  };

  if (!isAIAvailable()) {
    const text = data.communicationText.toLowerCase();
    const anxiousWords = ["worried", "concern", "nervous", "anxious", "scared", "fear", "panic", "crash", "loss", "downturn", "sell", "pull out", "risk", "volatile"];
    const euphoricWords = ["amazing", "incredible", "moon", "all-in", "double down", "guaranteed", "easy money", "can't lose"];
    const calmWords = ["plan", "strategy", "long-term", "diversify", "patient", "steady", "goal", "objective"];

    const anxiousCount = anxiousWords.filter(w => text.includes(w)).length;
    const euphoricCount = euphoricWords.filter(w => text.includes(w)).length;
    const calmCount = calmWords.filter(w => text.includes(w)).length;

    if (anxiousCount > 3) {
      defaultResult.sentiment = "anxious";
      defaultResult.sentimentScore = 25;
      defaultResult.behavioralRiskScore = 70;
      defaultResult.anxietyLevel = "high";
      defaultResult.dominantBias = "Loss Aversion";
      defaultResult.biasIndicators = [{ bias: "Loss Aversion", confidence: 70, evidence: "Multiple anxiety indicators detected" }];
      defaultResult.coachingNotes = "Client showing elevated anxiety. Review historical returns and reinforce long-term strategy.";
      defaultResult.deEscalationStrategy = "Acknowledge concerns, reference historical recovery data, reaffirm plan alignment.";
    } else if (euphoricCount > 2) {
      defaultResult.sentiment = "euphoric";
      defaultResult.sentimentScore = 85;
      defaultResult.behavioralRiskScore = 60;
      defaultResult.anxietyLevel = "low";
      defaultResult.dominantBias = "Overconfidence";
      defaultResult.biasIndicators = [{ bias: "Overconfidence", confidence: 65, evidence: "Euphoric language detected" }];
      defaultResult.coachingNotes = "Client showing euphoric patterns. Gently reinforce risk management principles.";
    } else if (calmCount > 2) {
      defaultResult.sentiment = "calm";
      defaultResult.sentimentScore = 70;
      defaultResult.behavioralRiskScore = 15;
      defaultResult.anxietyLevel = "low";
      defaultResult.coachingNotes = "Client appears composed and strategy-focused.";
    }

    return defaultResult;
  }

  try {
    const systemPrompt = `You are a behavioral finance expert at OneDigital wealth management. Analyze client communication using a multi-dimensional sentiment model with evidence-based bias detection.

## FINANCIAL EMOTION TAXONOMY (7 emotions)
Classify dominant and secondary emotions from:
- Anxiety: Fear of loss, uncertainty. Indicators: "What if...", "concerned", "losing", "worried"
- Confidence: Conviction in strategy. Indicators: "Looking forward to", "excited", "plan to", "growing"
- Frustration: Blocked progress. Indicators: "Not moving fast enough", "disappointed", "wasting time"
- Confusion: Lack of understanding. Indicators: "Don't understand", "complicated", "lost me"
- Eagerness: Ready to act. Indicators: "When can we...", "let's move", "need this done"
- Denial: Avoiding reality. Indicators: "It'll be fine", "doesn't matter", "not my concern"
- Grief: Loss acceptance. Indicators: "Coming to terms with", "accepting", "learning to live with"
Rank by dominance. Provide emotion distribution (0.0-1.0 for each detected emotion, must sum to ~1.0).

## BEHAVIORAL BIAS DETECTION (7 biases — require explicit evidence)
For each bias, provide confidence tier (CONFIRMED/LIKELY/POSSIBLE), evidence quotes, and intensity score (0.0-1.0):
1. Loss Aversion: Disproportionate fear of losses. Evidence: 2+ direct loss-fear statements = CONFIRMED; 1 + asymmetric language = LIKELY. Quantify: loss-fear mentions ÷ total concerns.
2. Recency Bias: Overweighting recent events. Evidence: recent event mentioned 3+ times = CONFIRMED. Quantify: recent mentions ÷ total time references.
3. Anchoring: Over-reliance on reference point. Evidence: same number 5+ times = CONFIRMED; 3-4 times with resistance = LIKELY.
4. Confirmation Bias: Selective attention to supporting info. Evidence: explicitly rejects contrary data = CONFIRMED; only seeks supporting = LIKELY.
5. Status Quo Bias: Preference for current state despite evidence. Evidence: explicitly resists recommended change = CONFIRMED; passive about rebalancing = LIKELY.
6. Herding: Following others without analysis. Evidence: peer reference drives recommendation request = CONFIRMED; multiple peer mentions = LIKELY.
7. Overconfidence: Certainty about uncertain outcomes. Evidence: 3+ definitive predictions without caveats = CONFIRMED; 2 definitive statements = LIKELY.
RULE: No bias scored without explicit evidence. If evidence insufficient, mark as POSSIBLE only.

## 10-LEVEL ANXIETY SCORING RUBRIC
Level 1-3 (CALM): Future-focused, curiosity, reflective tone, long-term framing. Action: Maintain approach.
Level 4-6 (CONCERNED): More questions, reassurance-seeking, "what if" questions. Action: Provide context, schedule check-in.
Level 7-8 (ANXIOUS): Fixation on losses, urgency language, short responses, catastrophizing. Action: Escalate, schedule call, de-escalation coaching.
Level 9-10 (PANIC): Threatening liquidation/advisor switch, irrational urgency, all-or-nothing thinking. Action: CRITICAL escalation to senior advisor immediately.
Formula: ANXIETY_SCORE = ((Panic_Language × 3) + (Urgency_Phrases × 2) + (Loss_Fixation × 2.5) + (Reassurance_Requests × 1.5) + (Future_Concerns × 1)) / (Total_Phrases × Calibration_Factor)
Map: 0.0-0.25 = Level 1-3, 0.25-0.50 = Level 4-6, 0.50-0.75 = Level 7-8, 0.75-1.0 = Level 9-10

## COMMUNICATION STYLE PROFILING
Classify as: Analytical (data-driven, "show me the data"), Driver (results-focused, "bottom line"), Amiable (relationship-focused, "what do you think?"), Expressive (enthusiasm-driven, "I'm excited about...")

## TRIGGER WORD DETECTION
HIGH-ALERT: "Sell everything", "Move to cash", "I'm done", "Leaving this firm", "Liquidate", "Get me out"
MODERATE-ALERT: "Losing sleep", "Can't take it", "Disaster", "Worst", "Change advisors"
LOW-ALERT: "Concerned", "Worried", "What if", "Is it safe", "Uncomfortable"

## DE-ESCALATION STRATEGY MATCHING
Match anxiety level × bias type to specific strategy. For anxiety 9-10: ESCALATE IMMEDIATELY regardless of bias.

Return ONLY valid JSON with this v3.3 structure:
{
  "sentimentProfile": {
    "dominantEmotion": "anxiety"|"confidence"|"frustration"|"confusion"|"eagerness"|"denial"|"grief",
    "sentiment": "calm"|"anxious"|"panicked"|"euphoric"|"neutral"|"frustrated",
    "sentimentScore": number 0-100,
    "emotionDistribution": {"anxiety": 0.0-1.0, "confidence": 0.0-1.0, "frustration": 0.0-1.0, "confusion": 0.0-1.0, "eagerness": 0.0-1.0, "denial": 0.0-1.0, "grief": 0.0-1.0},
    "communicationStyle": "analytical"|"driver"|"amiable"|"expressive"|null,
    "trend": "improving"|"stable"|"deteriorating"|"volatile"
  },
  "anxietyAssessment": {
    "anxietyScore": number 0.0-1.0,
    "anxietyLevel": "low"|"moderate"|"high"|"critical",
    "anxietyLevelNumeric": number 1-10,
    "anxietyLevelName": "calm"|"mildly_concerned"|"concerned"|"worried"|"elevated"|"anxious"|"highly_anxious"|"distressed"|"panicking"|"crisis",
    "keyIndicators": [string],
    "triggerWordsDetected": [string]
  },
  "detectedBiases": [
    {
      "bias": string,
      "confidence": number 0-100,
      "confidenceTier": "CONFIRMED"|"LIKELY"|"POSSIBLE",
      "evidence": string,
      "evidenceQuotes": [string],
      "intensityScore": number 0.0-1.0,
      "impactAssessment": string
    }
  ],
  "behavioralRisk": {
    "behavioralRiskScore": number 0-100,
    "dominantBias": string or null,
    "riskFactors": [string]
  },
  "coachingPlaybook": {
    "coachingNotes": string,
    "deEscalationStrategy": string or null,
    "primaryStrategy": string,
    "talkingPoints": [string],
    "antiPatterns": [string],
    "escalationPath": string or null
  },
  "followUpRecommendation": {
    "timeline": string,
    "format": string,
    "focusAreas": [string]
  }
}`;

    const userPrompt = `Client: ${sanitizeForPrompt(data.clientName, 200)}
Source: ${data.sourceType}
${data.marketContext ? `Market Context: ${sanitizeForPrompt(data.marketContext, 500)}` : ''}
${data.clientInfo ? `Risk Tolerance: ${data.clientInfo.riskTolerance || 'Unknown'}` : ''}

Communication:
${sanitizeForPrompt(data.communicationText, 15000)}`;

    const result = await chatCompletion(systemPrompt, userPrompt);
    const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const sp = parsed.sentimentProfile || {};
    const aa = parsed.anxietyAssessment || {};
    const br = parsed.behavioralRisk || {};
    const cp = parsed.coachingPlaybook || {};
    const fu = parsed.followUpRecommendation || {};
    const biases = (parsed.detectedBiases || []).map((b: DetectedBiasRaw) => ({
      bias: b.bias || "",
      confidence: b.confidence || 0,
      evidence: b.evidence || "",
      intensityScore: b.intensityScore,
      impactAssessment: b.impactAssessment,
      confidenceTier: b.confidenceTier as "CONFIRMED" | "LIKELY" | "POSSIBLE" | undefined,
    }));

    const mapped: SentimentAnalysisResult = {
      sentiment: sp.sentiment || parsed.sentiment || "neutral",
      sentimentScore: sp.sentimentScore ?? parsed.sentimentScore ?? 50,
      behavioralRiskScore: br.behavioralRiskScore ?? parsed.behavioralRiskScore ?? 30,
      anxietyLevel: aa.anxietyLevel || parsed.anxietyLevel || "low",
      dominantBias: br.dominantBias ?? parsed.dominantBias ?? null,
      biasIndicators: biases.length > 0 ? biases : (parsed.biasIndicators || []),
      coachingNotes: cp.coachingNotes || parsed.coachingNotes || "",
      deEscalationStrategy: cp.deEscalationStrategy ?? parsed.deEscalationStrategy ?? null,
      emotionDistribution: sp.emotionDistribution || parsed.emotionDistribution,
      communicationStyle: sp.communicationStyle || parsed.communicationStyle,
      anxietyScore: aa.anxietyScore ?? parsed.anxietyScore,
      anxietyLevelNumeric: aa.anxietyLevelNumeric ?? parsed.anxietyLevelNumeric,
      anxietyLevelName: aa.anxietyLevelName || parsed.anxietyLevelName,
      anxietyKeyIndicators: aa.keyIndicators || parsed.anxietyKeyIndicators,
      triggerWordsDetected: aa.triggerWordsDetected || parsed.triggerWordsDetected,
      coachingPlaybook: cp.primaryStrategy ? {
        primaryStrategy: cp.primaryStrategy,
        talkingPoints: cp.talkingPoints || [],
        antiPatterns: cp.antiPatterns || [],
        escalationPath: cp.escalationPath || null,
      } : parsed.coachingPlaybook,
      followUpRecommendation: fu.timeline ? {
        timeline: fu.timeline,
        format: fu.format || "",
        focusAreas: fu.focusAreas || [],
      } : parsed.followUpRecommendation,
      sentimentProfile: parsed.sentimentProfile,
      anxietyAssessment: parsed.anxietyAssessment,
      detectedBiases: parsed.detectedBiases,
      behavioralRisk: parsed.behavioralRisk,
    };

    return mapped;
  } catch (error) {
    logger.error({ err: error }, "Sentiment analysis failed");
    return defaultResult;
  }
}

export async function generateBehavioralCoachingNotes(data: {
  clientName: string;
  anxietyLevel: string;
  dominantBias: string | null;
  recentSentiments: Array<{ sentiment: string; date: string; score: number }>;
  riskTolerance: string | null;
  situationType?: string;
  communicationStyle?: string;
  biasHistory?: string[];
  priorEffectiveInterventions?: string[];
  priorIneffectiveInterventions?: string[];
  decisionVelocity?: string;
  portfolioContext?: string;
  goalContext?: string;
}): Promise<string> {
  if (!isAIAvailable()) {
    const notes: string[] = [`## Behavioral Coaching Notes: ${data.clientName}\n`];
    if (data.anxietyLevel === "high" || data.anxietyLevel === "critical") {
      notes.push("### Alert: Elevated Anxiety Detected");
      notes.push("- Begin meeting by acknowledging market conditions");
      notes.push("- Use historical data to show recovery patterns");
      notes.push("- Reaffirm alignment between portfolio and long-term goals");
      notes.push("- Avoid market timing discussions");
    }
    if (data.dominantBias === "Loss Aversion") {
      notes.push("\n### Bias: Loss Aversion");
      notes.push("- Frame discussions in terms of goals achieved, not losses avoided");
      notes.push("- Show probability of positive outcomes over investment horizon");
    }
    if (data.dominantBias === "Recency Bias") {
      notes.push("\n### Bias: Recency Bias");
      notes.push("- Present longer-term performance data (5, 10, 20 years)");
      notes.push("- Discuss how recent events fit into historical patterns");
    }
    if (data.dominantBias === "Herd Mentality") {
      notes.push("\n### Bias: Herd Mentality");
      notes.push("- Emphasize personalized strategy vs. market consensus");
      notes.push("- Remind client their plan is tailored to their specific goals");
    }
    notes.push("\n*AI-enhanced coaching notes available with OpenAI integration*");
    return notes.join("\n");
  }

  try {
    const systemPrompt = `You are a behavioral finance coach for wealth advisors at OneDigital. Generate evidence-based, situation-specific coaching notes enabling advisors to manage client emotions effectively during meetings and transitions.

## BEHAVIORAL PROFILE INTEGRATION
Use the client's historical behavioral data to tailor coaching:
- Previous sentiment scores and anxiety trajectory (stable/improving/deteriorating)
- Known bias inventory and prior trigger events
- Communication style (analytical/driver/amiable/expressive)
- Prior interventions that worked vs. didn't work
- Decision velocity (quick/deliberate/slow)

## 8 SITUATION-SPECIFIC COACHING TYPES
Classify the situation and tailor coaching accordingly:
1. Market Downturn: Anxiety spike, loss focus → Reframe losses within long-term context
2. Performance Miss: Disappointment, doubt → Validate goal, recalibrate if needed
3. Life Event: Disorientation, opportunity seeking → Integrate new financial reality
4. Goal Shortfall: Worry, urgency to "catch up" → Realistic options assessment
5. Tax Surprise: Frustration → Education + proactive planning
6. Advisor Review: Mixed confidence → Reinforce value, address concerns
7. Rebalancing: Resistance (status quo bias) → Show cost of inaction vs. benefit
8. Fee Discussion: Price sensitivity → Tie fees to outcomes delivered

## EVIDENCE-BASED INTERVENTION STRATEGIES
Apply research-backed techniques:
1. Historical Precedent Framing (for recency bias, panic): Reference exact historical data and recovery timeframes
2. Goal-Based Anchoring (for loss aversion, overconfidence): Separate market noise from stated goals with specific projections
3. Visualization Exercises (for volatility anxiety): Guide mental simulation of future outcomes
4. Variability Context (for first-time volatility, loss aversion): Normalize corrections with frequency and recovery data
5. Social Proof (for herding, underconfidence): Provide aggregated, anonymized peer cohort data (NEVER identify specific clients)

## SCRIPT-READY TALKING POINTS
For each situation × bias combination, generate:
- Opening (Validation): Acknowledge the client's concern with empathy
- Reframe (Historical/Goal-Based): Provide data-driven context
- Data Point: Specific numbers and historical analogues
- Commitment: Secure agreement to stay course with specific timeline
- Close: Set next touchpoint and express confidence

## ANTI-PATTERNS (what NOT to say)
- Loss Aversion: Don't say "You're being irrational" or "Markets always go up"
- Recency Bias: Don't say "Don't worry, it always comes back"
- Anchoring: Don't say "Forget that target, it's not realistic"
- Status Quo: Don't say "We should change this" (activates resistance)
- Herding: Don't validate herding with "Everyone's doing this"
- Overconfidence: Don't be wishy-washy with "You might be right but..."

## MEETING STRUCTURE (for high-anxiety meetings)
1. Rapport Building (10%): Acknowledge stress, confirm agenda
2. Wins & Validation (20%): Lead with what IS working
3. Context & Data (40%): Historical comparisons, projections
4. Difficult Decisions (20%): Direct, present options
5. Commitment & Next Steps (10%): Confirm strategy, set touchpoint

## ESCALATION PROTOCOL
- IMMEDIATE: Client threatens liquidation/advisor switch, panic decisions, severe distress
- WITHIN 24 HOURS: Anxiety 8+, major life event, persistent rejection of reframing
- PROACTIVE: Anxiety 5-7 deteriorating, moderate life events, historical trigger recurrence

## FOLLOW-UP STRATEGY
- Immediate (within 1 week): Written summary, reiterate confidence
- Short-term (2-4 weeks): Proactive check-in call, relevant market commentary
- Reinforcement (quarterly): Portfolio review, goal progress, strategy reaffirmation

## OUTPUT FORMAT
Return ONLY valid JSON with this v3.3 structure:
{
  "coachingContext": {
    "meetingType": "string",
    "anxietyLevel": "string",
    "anxietyBaseline": "string",
    "sentimentTrend": "improving|stable|deteriorating|volatile",
    "situationType": "market_downturn|performance_miss|life_event|goal_shortfall|tax_surprise|advisor_review|rebalancing|fee_discussion|general"
  },
  "situationAssessment": {
    "trigger": "string",
    "emotionalState": "string",
    "riskLevel": "low|moderate|high|critical",
    "urgency": "routine|proactive|within_24_hours|immediate"
  },
  "behavioralProfile": {
    "communicationStyle": "analytical|driver|amiable|expressive|unknown",
    "knownBiases": ["string"],
    "effectiveInterventions": ["string"],
    "ineffectiveInterventions": ["string"],
    "decisionVelocity": "quick|deliberate|slow|unknown"
  },
  "playbook": {
    "primaryStrategy": "historical_precedent|goal_anchoring|visualization|variability_context|social_proof",
    "talkingPoints": {
      "opening": "string (validation statement)",
      "reframe": "string (historical/goal-based reframe)",
      "dataPoint": "string (specific numbers/analogues)",
      "commitment": "string (secure agreement with timeline)",
      "close": "string (next touchpoint + confidence)"
    },
    "antiPatterns": ["string (what NOT to say)"],
    "alternativeApproaches": ["string"]
  },
  "meetingStructure": {
    "rapportBuilding": {"allocation": "10%", "guidance": "string"},
    "winsAndValidation": {"allocation": "20%", "guidance": "string"},
    "contextAndData": {"allocation": "40%", "guidance": "string"},
    "difficultDecisions": {"allocation": "20%", "guidance": "string"},
    "commitmentAndNextSteps": {"allocation": "10%", "guidance": "string"}
  },
  "followUpPlan": {
    "immediate": {"timeline": "within 1 week", "actions": ["string"]},
    "shortTerm": {"timeline": "2-4 weeks", "actions": ["string"]},
    "reinforcement": {"timeline": "quarterly", "actions": ["string"]}
  },
  "escalationFlag": {
    "triggered": true|false,
    "level": "none|proactive|within_24_hours|immediate",
    "reason": "string or null",
    "recommendedAction": "string or null"
  }
}`;

    let sentimentTrend = "insufficient data";
    if (data.recentSentiments.length >= 3) {
      const scores = data.recentSentiments.map(s => s.score);
      const recent = scores.slice(0, Math.ceil(scores.length / 2));
      const older = scores.slice(Math.ceil(scores.length / 2));
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      const diff = recentAvg - olderAvg;
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - (recentAvg + olderAvg) / 2, 2), 0) / scores.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev > 20) {
        sentimentTrend = "volatile";
      } else if (diff > 5) {
        sentimentTrend = "improving";
      } else if (diff < -5) {
        sentimentTrend = "deteriorating";
      } else {
        sentimentTrend = "stable";
      }
    } else if (data.recentSentiments.length === 2) {
      const diff = data.recentSentiments[0].score - data.recentSentiments[1].score;
      sentimentTrend = diff > 5 ? "improving" : diff < -5 ? "deteriorating" : "stable";
    }

    const userPrompt = `Client: ${sanitizeForPrompt(data.clientName, 200)}
Current Anxiety Level: ${data.anxietyLevel}
Dominant Bias: ${data.dominantBias || 'None detected'}
Risk Tolerance: ${data.riskTolerance || 'Unknown'}
Situation Type: ${data.situationType || 'General review'}
Communication Style: ${data.communicationStyle || 'Unknown'}
Decision Velocity: ${data.decisionVelocity || 'Unknown'}
Bias History: ${data.biasHistory?.join(', ') || 'No history available'}
Prior Effective Interventions: ${data.priorEffectiveInterventions?.join(', ') || 'Unknown'}
Prior Ineffective Interventions: ${data.priorIneffectiveInterventions?.join(', ') || 'Unknown'}
Sentiment Trend: ${sentimentTrend}
Recent Sentiment History: ${sanitizeForPrompt(JSON.stringify(data.recentSentiments), 3000)}
Portfolio Context: ${data.portfolioContext || 'Not provided'}
Goal Context: ${data.goalContext || 'Not provided'}

Generate comprehensive, situation-specific coaching playbook with script-ready talking points tailored to this client's behavioral profile and current situation.`;

    const result = await chatCompletion(systemPrompt, userPrompt);
    const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (!parsed.coachingContext || !parsed.playbook) {
        logger.warn("Coaching notes JSON missing required v3.3 sections, wrapping in envelope");
        return JSON.stringify({
          coachingContext: { meetingType: "general", anxietyLevel: data.anxietyLevel, situationType: data.situationType || "general" },
          situationAssessment: { trigger: "unknown", emotionalState: "unknown", riskLevel: "moderate", urgency: "routine" },
          behavioralProfile: { communicationStyle: data.communicationStyle || "unknown", knownBiases: data.biasHistory || [] },
          playbook: { primaryStrategy: "goal_anchoring", talkingPoints: {}, antiPatterns: [], alternativeApproaches: [] },
          meetingStructure: {},
          followUpPlan: { immediate: { actions: [] }, shortTerm: { actions: [] }, reinforcement: { actions: [] } },
          escalationFlag: { triggered: false, level: "none" },
          rawNotes: result,
        });
      }
      return cleaned;
    } catch {
      return JSON.stringify({
        coachingContext: { meetingType: "general", anxietyLevel: data.anxietyLevel, situationType: data.situationType || "general" },
        situationAssessment: { trigger: "unknown", emotionalState: "unknown", riskLevel: "moderate", urgency: "routine" },
        playbook: { primaryStrategy: "goal_anchoring", talkingPoints: {}, antiPatterns: [] },
        escalationFlag: { triggered: false, level: "none" },
        rawNotes: result,
      });
    }
  } catch {
    return JSON.stringify({
      coachingContext: { meetingType: "error", anxietyLevel: data.anxietyLevel },
      situationAssessment: { riskLevel: "unknown", urgency: "routine" },
      playbook: { primaryStrategy: "goal_anchoring", talkingPoints: {}, antiPatterns: [] },
      escalationFlag: { triggered: false, level: "none" },
      error: "Behavioral coaching notes generation failed. Please try again.",
    });
  }
}

export async function generateAssessment(prompt: string): Promise<string> {
  if (!isAIAvailable()) {
    return JSON.stringify({
      status: "review",
      score: 50,
      summary: "Assessment generated with limited analysis. AI-enhanced assessment available with OpenAI integration.",
      recommendations: [
        {
          priority: "medium",
          action: "Enable AI integration for comprehensive analysis",
          rationale: "Full domain assessment requires AI capabilities",
        },
      ],
    });
  }

  try {
    const systemPrompt = `You are a senior financial planning analyst at OneDigital Wealth Management. Provide structured, domain-specific financial assessments using quantitative calculation engines and evidence-based scoring rubrics.

## ASSESSMENT TYPES
Classify the assessment request into one of 5 types and apply domain-specific logic:

### 1. RETIREMENT READINESS
- Accumulation Gap Analysis: FutureValue vs. RetirementTarget. Gap scoring: <10% = ON TRACK, 10-30% = MODERATE SHORTFALL, >30% = SIGNIFICANT SHORTFALL
- Withdrawal Sustainability: Safe withdrawal rate (4% base, adjusted for inflation +0.5%, longevity -0.25% per 5yr beyond 90, concentration -0.5% if >25% single holding). Probability to age 95: >90% SUSTAINABLE, 80-90% ADEQUATE, 70-80% AT RISK, <70% UNSUSTAINABLE
- Social Security Optimization: Compare claiming at 62 vs FRA vs 70 with breakeven analysis and spousal coordination

### 2. INSURANCE ADEQUACY
- Capital Needs Analysis (Life): Income replacement + debt payoff + education fund + emergency fund + settlement costs - current coverage - liquid assets = gap. Scoring: <10% gap ADEQUATE, 10-30% MODERATE, 30-50% SIGNIFICANT, >50% CRITICAL
- Disability Income Gap: Monthly income need vs available coverage. Scoring: 0 gap FULLY COVERED, 1-25% MOSTLY COVERED, 25-50% SIGNIFICANT GAP, >50% CRITICAL GAP
- Long-Term Care Exposure: LTC cost × duration × probability - insurance - self-insurance capacity. Scoring: covered LOW RISK, 0-25% gap MANAGEABLE, 25-50% MODERATE, 50-100% HIGH, >100% CRITICAL

### 3. TAX EFFICIENCY
- Effective Tax Rate & Bracket Analysis: Calculate marginal and effective rates, bracket room, risk of exceeding thresholds (IRMAA, etc.)
- Roth Conversion Opportunity: Optimal amount to fill bracket gap, tax cost vs future benefit analysis
- Asset Location Optimization: Tax-efficient placement across account types, quantify annual tax drag savings

### 4. ESTATE COMPLETENESS
- Document Inventory Scoring: Will (20pts), Trust (20pts), Financial POA (10pts), Healthcare POA (10pts), Living Will (10pts), HIPAA (5pts), Letter of Intent (10pts), Beneficiary Review (15pts). Apply -5pt penalty per document >5 years old. Score ≥85 STRONG, 70-84 ADEQUATE, 50-69 SIGNIFICANT GAPS, <50 CRITICAL
- Beneficiary alignment check and probate risk assessment

### 5. INVESTMENT APPROPRIATENESS
- Allocation Drift: Target vs current, drift tolerance ±5%. >10% in any class = URGENT REBALANCE. Include opportunity cost calculation.
- Concentration Risk: Single holding >10% FLAG, top 5 >40% FLAG, single sector >30% FLAG. Calculate diversification score.
- Fee Analysis: Total cost (advisory + expense ratios + trading), benchmark comparison, lifetime fee drag calculation.

## SCORING RUBRIC (universal)
RED FLAG (<50%): Immediate action needed
YELLOW FLAG (50-75%): Monitor and plan
GREEN (75-100%): On track

## CONFIDENCE INTERVALS
Always provide three scenarios for long-term projections:
- Conservative (10th percentile)
- Base Case (median)
- Optimistic (90th percentile)

## OUTPUT RULES
- Always respond with valid JSON only, no markdown formatting or code blocks
- Every number must have a source (client data or disclosed assumption)
- Every recommendation must be specific and actionable with timeline and owner
- Include gap-to-action mapping: Issue → Severity → Action → Timeline → Owner → Success Metric
- Be data-driven and quantitative. Avoid vague recommendations.`;

    const result = await chatCompletion(
      systemPrompt,
      prompt,
      true
    ) || "{}";
    const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (!parsed.status && !parsed.score && !parsed.summary) {
        logger.warn("Assessment JSON missing required v3.3 fields, wrapping in standard envelope");
        return JSON.stringify({
          status: "review",
          score: 50,
          summary: "Assessment completed — partial v3.3 compliance",
          assessmentType: parsed.assessmentType || "unknown",
          recommendations: parsed.recommendations || [],
          confidenceIntervals: parsed.confidenceIntervals || null,
          gapToActionMapping: parsed.gapToActionMapping || [],
          ...parsed,
        });
      }
      return cleaned;
    } catch {
      logger.warn("Assessment returned non-JSON, wrapping response");
      return JSON.stringify({
        status: "review",
        score: 50,
        summary: "Assessment generated but returned non-structured output",
        assessmentType: "unknown",
        recommendations: [],
        rawOutput: result.substring(0, 2000),
      });
    }
  } catch (error) {
    logger.error({ err: error }, "API error");
    return JSON.stringify({
      status: "review",
      score: 50,
      summary: "Assessment generation encountered an error. Please try again.",
      recommendations: [],
    });
  }
}

export interface DiscoveryTalkingPointsInput {
  prospectName: string;
  clientType: string;
  questionnaireResponses: Record<string, unknown>;
  wizardResponses: Record<string, unknown>;
}

export async function generateDiscoveryTalkingPoints(data: DiscoveryTalkingPointsInput): Promise<string> {
  if (!isAIAvailable()) {
    return generateFallbackDiscoveryTalkingPoints(data);
  }

  try {
    return await chatCompletion(
      `You are Finn, an elite wealth advisor coach at OneDigital. Generate personalized, F.O.R.M.-structured discovery talking points and a full conversation architecture for a 45-60 minute prospect meeting.

## F.O.R.M. METHODOLOGY
Structure discovery around four dimensions:
- **Family**: Relationships, dependents, life stage, household dynamics → reveals values, obligations, risk tolerance
- **Occupation**: Work, career path, income, industry, job security → reveals earning power, trajectory
- **Recreation**: Hobbies, interests, passion projects, lifestyle → reveals personality, discretionary spending
- **Motivation**: Why they're seeking advice now, fears, dreams, legacy → reveals pain points, triggers, goals

## QUESTIONNAIRE GAP DETECTION
Analyze the pre-meeting questionnaire for:
1. **Unanswered questions**: What was skipped? What does silence reveal? (Privacy concern? Uncertainty? Lack of awareness?)
2. **Inconsistencies**: Do goals match behavior? Does stated risk tolerance match portfolio? Do income/savings match goals?
3. **Red flags**: Shopping multiple advisors? Recent bad experience? Unclear on basics? Unmotivated?
4. **Positive signals**: Specific numbers mentioned? Urgency language? Life event trigger? Confidence or anxiety?

Map each gap to a specific discovery question to fill it naturally during conversation.

## PROSPECT PROFILING
From questionnaire data, classify:
- **Life Stage**: Accumulation (25-45), Peak Earning (45-55), Pre-Retirement (55-65), Early Retirement (65-75), Established Retirement (75+)
- **Tier Prediction**: Estimate AUM potential → Growth (<$250k), Premier ($250k-$1M), Wealth ($1M-$5M), Executive (>$5M)
- **Service Needs**: Map responses to planning domains (tax optimization, retirement readiness, estate planning, college funding, etc.)
- **Communication Style**: Analytical (data/research-focused), Driver (concise/action), Amiable (partnership/process), Expressive (stories/vision)

## CONVERSATION ARCHITECTURE (45-60 Minutes)
Generate segment-by-segment talking points:

**Segment 1: Opening Rapport (0-5 min)** — Build comfort, set agenda, use client's name, establish this is about THEM not a sales pitch
**Segment 2: Family Exploration (5-15 min)** — Dependents, values, risk tolerance drivers, loss aversion probes
**Segment 3: Occupation Exploration (15-22 min)** — Income stability, career trajectory, benefits, business ownership
**Segment 4: Recreation Exploration (22-28 min)** — Lifestyle, interests, discretionary spending, ideal life vision
**Segment 5: Motivation Exploration (28-42 min)** — WHY they're here, pain points, goals, fears, timeline, current advisor context
**Segment 6: Value Proposition Transition (42-45 min)** — Reflect learnings, position OneDigital value matched to their expressed needs, propose next steps

## QUESTION TYPES
Use four types throughout: Open-Ended (explore), Probing (deepen), Clarifying (confirm), Quantifying (get numbers). Pause and listen; use 6-second silence technique.

## RED FLAG DETECTION
Flag: advisor shopping, unrealistic expectations, distrust of advisors, fixed/rigid ideas, financial denial, compliance red flags.

## VALUE PROPOSITION ALIGNMENT
Match each expressed pain point to a OneDigital service capability with specific talking point.

Format with clear markdown sections, bullet points, and specific question text.`,
      `Client: ${data.prospectName}
Client Type: ${data.clientType}

Pre-Meeting Questionnaire Responses:
${JSON.stringify(data.questionnaireResponses, null, 2)}

Discovery Wizard Responses So Far:
${JSON.stringify(data.wizardResponses, null, 2)}

Generate a complete discovery meeting preparation document with:
1. Pre-Meeting Analysis (questionnaire gaps, inconsistencies, signals, red flags)
2. Prospect Profile (life stage, tier prediction, service needs, communication style)
3. Full Conversation Architecture (6 segments with specific talking points, questions, and advisor behavior notes)
4. Gap-to-Question Mapping (specific questions to fill each information gap)
5. Red Flags to Watch For
6. Value Proposition Alignment (pain points → OneDigital solutions)
7. Competitive Positioning (if transitioning from another advisor)
8. Recommended Next Steps & Engagement Pathway`
    );
  } catch {
    return generateFallbackDiscoveryTalkingPoints(data);
  }
}

function generateFallbackDiscoveryTalkingPoints(data: DiscoveryTalkingPointsInput): string {
  const responses = data.questionnaireResponses as Record<string, string>;
  return `## Discovery Talking Points: ${data.prospectName}

### Rapport Building
- Welcome and set expectations for the discovery meeting
- Ask about their motivation for seeking financial advice
${responses.referralSource ? `- Mention the referral connection: ${responses.referralSource}` : ''}

### Values & Priorities
- "What does financial success look like to you?"
- "What keeps you up at night financially?"
- "If money were no object, what would your ideal life look like?"

### Money Story
- "How did your family talk about money growing up?"
- "What was your first significant financial decision?"
- "What financial lessons have stuck with you?"

### Risk Attitudes
- Discuss comfort with market volatility
- Explore past investment experiences (positive and negative)
- Understand their timeline and liquidity needs

### Goals Hierarchy
- **Short-term (1-3 years):** Emergency fund, debt reduction, upcoming expenses
- **Medium-term (3-10 years):** Education funding, home purchase, career changes
- **Long-term (10+ years):** Retirement, legacy, philanthropy

### Next Steps
- Outline the engagement pathway and timeline
- Discuss fee structure and service model
- Schedule follow-up meeting

*AI-enhanced talking points available with OpenAI integration*`;
}

export interface DiscoverySummaryInput {
  prospectName: string;
  clientType: string;
  questionnaireResponses: Record<string, unknown>;
  wizardResponses: Record<string, unknown>;
  meetingNotes?: string;
}

export async function generateDiscoverySummary(data: DiscoverySummaryInput): Promise<{ summary: string; engagementPathway: string; nextSteps: Array<{ title: string; description: string; priority: string; suggestedTimeline: string }> }> {
  if (!isAIAvailable()) {
    return generateFallbackDiscoverySummary(data);
  }

  try {
    const raw = await chatCompletion(
      `You are Finn, an elite wealth advisor coach at OneDigital. Synthesize discovery data into an actionable qualification scorecard, engagement pathway recommendation, and internal team briefing. All scores must be calculated with quantitative backing, never hand-assigned. Respond with valid JSON only, no markdown formatting.

## MULTI-SOURCE DATA SYNTHESIS
Analyze all available sources: questionnaire responses, wizard/meeting responses, and meeting notes. For each source, assess confidence (HIGH if recent <30 days, MEDIUM if older, flag missing data for follow-up).

## PROSPECT QUALIFICATION SCORING

### AUM Potential
Calculate: stated investable assets + 5-year projected growth + expected inheritance + spouse assets.
Tier: <$250k=Foundational, $250k-$1M=Core, $1M-$5M=Comprehensive, >$5M=Advanced.

### Service Complexity (0-15 scale)
Score based on: multiple income sources (+2), self-employed/business owner (+3), side income (+1), married filing separately (+2), high-tax state (+1), significant investment income >$25k (+2), active business entity (+3), estate >$6.94M exemption (+3), multi-state properties (+2), minor children (+1), blended family (+2), alternative assets (+3), RE portfolio (+2), concentrated stock (+2).
Tier: 0-2=Low, 3-5=Medium, 6-10=High, 11+=Very High.

### Revenue Potential (12-Month)
Calculate: AUM × fee rate (0.5-1.5%) + complexity-tier service fees + planning fees ($2k-$10k) + specialty fees.
Include 3-year projection with retention probability.

### Engagement Likelihood (0-100)
Score based on: prospect-initiated outreach (+20), referral (+15), marketing-driven (+5), meeting ≥60 min (+15), detailed questions (+10), volunteered info (+10), docs submitted on time (+15), specific problems articulated (+15), wants to start <30 days (+10), spouse attended (+10), both agree on need (+10).
Assessment: <40=Low, 40-65=Medium, 66-85=High, >85=Very High.

### Fit Score (0-100)
Calculate: service_fit (matched services/needed × 40) + complexity_fit (supported=30, else 15) + wealth_fit (target band=20) + lifecycle_fit (specialty match=10).
Assessment: <50=Poor, 50-70=Good, 71-85=Excellent, >85=Perfect.

## ENGAGEMENT PATHWAY RECOMMENDATION
Based on AUM, complexity, engagement, and fit scores:
- Recommend service tier with evidence-based justification
- Propose service bundle with included and add-on services
- Include onboarding timeline (4 phases over 12 weeks)
- Required documents checklist (urgent, high, medium priority)

## DOMAIN ASSESSMENT
For each of 9 planning domains (retirement, tax, investment, risk/insurance, estate, college, cash flow, business succession, charitable), assess: GREEN (adequate), YELLOW (gap, 3-6 month timeline), RED (significant gap, address in 90 days), GRAY (not applicable/discussed).

## INTERNAL TEAM BRIEFING
Include notes for: relationship manager (personality, triggers, VIP factors), tax specialist (priority focus, CPA coordination), estate planning specialist (urgency, scope), investment team (risk profile, rebalancing needs), insurance specialist (coverage gaps).

## PERSONALITY & COMMUNICATION PREFERENCES
Document: decision-making style, risk tolerance, technology comfort, financial knowledge level, family dynamics, preferred contact method, meeting frequency, detail preference.`,
      `Client: ${data.prospectName}
Client Type: ${data.clientType}

Questionnaire Responses:
${JSON.stringify(data.questionnaireResponses, null, 2)}

Discovery Meeting Responses:
${JSON.stringify(data.wizardResponses, null, 2)}

${data.meetingNotes ? `Additional Meeting Notes:\n${data.meetingNotes}` : ''}

Generate a JSON response with this structure:
{
  "summary": "Comprehensive meeting summary in markdown covering: prospect overview, key values and priorities, money story insights, risk profile observations, goals hierarchy, concerns and opportunities, domain-by-domain assessment",
  "qualificationScores": {
    "aumPotential": { "amount": number, "tier": "string", "confidence": "string" },
    "serviceComplexity": { "score": number, "tier": "string", "drivers": [] },
    "revenuePotential": { "year1": number, "year2": number, "year3": number },
    "engagementLikelihood": { "score": number, "assessment": "string", "keySignals": [] },
    "fitScore": { "score": number, "assessment": "string", "matchedServices": number }
  },
  "engagementPathway": "Recommended engagement pathway with tier justification, proposed service bundle, and pricing context",
  "domainAssessment": [{ "domain": "string", "status": "green|yellow|red|gray", "keyMetric": "string" }],
  "teamBriefing": { "relationshipManager": "string", "taxSpecialist": "string", "estateSpecialist": "string", "investmentTeam": "string" },
  "personalityProfile": { "decisionStyle": "string", "communicationPreference": "string", "financialKnowledge": "string" },
  "nextSteps": [
    { "title": "Step title", "description": "Step description", "priority": "high|medium|low", "suggestedTimeline": "Within 1 week", "owner": "advisor|client|team" }
  ]
}`
    );

    try {
      return JSON.parse(raw);
    } catch {
      return {
        summary: raw,
        engagementPathway: "Review discovery data to determine the best engagement pathway.",
        nextSteps: [{ title: "Review discovery summary", description: "Review the AI-generated summary and determine next steps.", priority: "high", suggestedTimeline: "Within 1 week" }],
      };
    }
  } catch {
    return generateFallbackDiscoverySummary(data);
  }
}

function generateFallbackDiscoverySummary(data: DiscoverySummaryInput): { summary: string; engagementPathway: string; nextSteps: Array<{ title: string; description: string; priority: string; suggestedTimeline: string }> } {
  const responses = data.questionnaireResponses as Record<string, string>;
  const wizard = data.wizardResponses as Record<string, string>;

  return {
    summary: `## Discovery Summary: ${data.prospectName}

### Prospect Overview
- **Client Type:** ${data.clientType}
- **Name:** ${data.prospectName}
${responses.occupation ? `- **Occupation:** ${responses.occupation}` : ''}
${responses.maritalStatus ? `- **Marital Status:** ${responses.maritalStatus}` : ''}

### Personal Background
${wizard.background || 'Background details to be gathered.'}

### Values & Priorities
${wizard.values || responses.topPriorities || 'No specific priorities recorded during discovery.'}

### Financial Snapshot
${wizard.financial || 'Financial details to be gathered in follow-up.'}

### Money Story
${wizard.moneyStory || 'Money story not yet discussed.'}

### Goals
${wizard.goals || 'Goals to be refined during engagement.'}

### Risk Profile
${wizard.risk || responses.riskTolerance || 'Risk tolerance assessment pending.'}

---
*Summary generated ${new Date().toLocaleDateString()} | AI-enhanced summaries available with OpenAI integration*`,

    engagementPathway: "Comprehensive Financial Planning - recommended based on discovery responses.",

    nextSteps: [
      { title: "Send follow-up email", description: `Thank ${data.prospectName} for the discovery meeting and outline proposed next steps.`, priority: "high", suggestedTimeline: "Within 24 hours" },
      { title: "Prepare engagement letter", description: "Draft the engagement letter based on the recommended service tier.", priority: "high", suggestedTimeline: "Within 1 week" },
      { title: "Create client profile", description: "Set up the client profile with discovery data.", priority: "medium", suggestedTimeline: "Within 1 week" },
      { title: "Schedule planning meeting", description: "Book the first planning meeting to dive deeper into financial details.", priority: "medium", suggestedTimeline: "Within 2 weeks" },
    ],
  };
}

export interface LifeEventDetection {
  event: string;
  category: string;
  description: string;
  confidence: number;
  profileFieldUpdates: Record<string, string>;
  reasoning: string;
  eventCategory?: "family" | "career" | "financial" | "health" | "education" | "legal";
  confidenceTier?: "CONFIRMED" | "LIKELY" | "POSSIBLE";
  evidenceQuotes?: string[];
  timeline?: {
    temporalClassification: "past_recent" | "past_established" | "present" | "future_imminent" | "future_planned" | "future_longterm";
    eventOccurs?: string;
    impactWindow?: string;
  };
  planningImpact?: {
    domainsAffected: string[];
    urgency: "IMMEDIATE" | "URGENT" | "HIGH" | "MEDIUM" | "ROUTINE";
    financialImpact?: string;
    riskLevel?: string;
  };
  serviceTriggers?: Array<{
    service: string;
    status: "ACTIVATE" | "SCHEDULE" | "RECOMMEND";
    timeline: string;
    responsibleParty: string;
    actionDescription: string;
  }>;
  followUpQuestions?: string[];
  advisorCoachingNotes?: string;
  urgencyFlag?: string;
}

export async function detectLifeEventsFromTranscript(
  transcriptText: string,
  clientName: string,
  existingLifeEvents: Array<{ eventDate: string; description: string }> = []
): Promise<LifeEventDetection[]> {
  if (!isAIAvailable()) {
    const text = transcriptText.toLowerCase();
    const detections: LifeEventDetection[] = [];
    const patterns: Array<{ keywords: string[]; event: string; category: string; fields: Record<string, string> }> = [
      { keywords: ["married", "wedding", "engagement", "fiancé", "fiancee", "spouse"], event: "Marriage", category: "marriage", fields: { maritalStatus: "married" } },
      { keywords: ["divorce", "separated", "separation", "ex-wife", "ex-husband"], event: "Divorce", category: "divorce", fields: { maritalStatus: "divorced" } },
      { keywords: ["baby", "pregnant", "expecting", "newborn", "new child", "son was born", "daughter was born"], event: "New Child", category: "new_baby", fields: {} },
      { keywords: ["inherited", "inheritance", "estate received", "passed away", "left me"], event: "Inheritance", category: "inheritance", fields: {} },
      { keywords: ["new job", "new position", "promoted", "changed jobs", "started at", "joined", "career change", "left my job", "retired", "retiring"], event: "Job Change", category: "job_change", fields: {} },
    ];

    for (const p of patterns) {
      if (p.keywords.some(kw => text.includes(kw))) {
        const alreadyExists = existingLifeEvents.some(e => e.description.toLowerCase().includes(p.category));
        if (!alreadyExists) {
          detections.push({
            event: p.event,
            category: p.category,
            description: `${p.event} detected from meeting transcript with ${clientName}`,
            confidence: 60,
            profileFieldUpdates: p.fields,
            reasoning: `Keywords matching "${p.category}" pattern found in transcript`,
          });
        }
      }
    }
    return detections;
  }

  try {
    const systemPrompt = `You are an expert wealth advisor assistant at OneDigital specializing in detecting life events from client communications. Identify significant life events and automatically trigger relevant planning domain assessments.

## COMPREHENSIVE LIFE EVENT TAXONOMY (6 categories)

### FAMILY EVENTS
Marriage/Domestic Partnership (HIGH urgency), Divorce/Separation (CRITICAL), New Child/Grandchild (HIGH), Adoption (HIGH), Death of Spouse/Parent (CRITICAL), Custody Change (MEDIUM), Adult Child Transition (MEDIUM)

### CAREER EVENTS
Job Change/New Employment (HIGH), Promotion/Significant Raise (MEDIUM), Layoff/Job Loss (CRITICAL), Retirement/Work Reduction (CRITICAL), Starting Business (CRITICAL), Selling Business (CRITICAL), Partnership Change (MEDIUM)

### FINANCIAL EVENTS
Inheritance (HIGH), Large Gift Received (MEDIUM), Property Purchase (HIGH), Property Sale (MEDIUM), Significant Lawsuit/Settlement (CRITICAL), Bankruptcy/Financial Crisis (CRITICAL), Windfall (HIGH)

### HEALTH EVENTS
Major Health Diagnosis (CRITICAL), Disability Onset (CRITICAL), Recovery/Health Improvement (MEDIUM), Long-Term Care Need (CRITICAL), Dependent Health Event (MEDIUM)

### EDUCATION EVENTS
Child Starting College (HIGH), Graduate School Entry (MEDIUM), 529 Plan Beneficiary Change (MEDIUM), FAFSA/Financial Aid (HIGH)

### LEGAL EVENTS
Will Creation/Update (HIGH), Trust Creation (HIGH), Power of Attorney (MEDIUM), Guardianship Determination (HIGH), Prenuptial/Postnuptial Agreement (HIGH)

## 3-TIER CONFIDENCE SCORING

TIER 1 CONFIRMED (90%+ confidence): Direct, unambiguous statement. Examples: "We're getting married in June", "My mother passed away", "I just got a job offer". Treat as fact; trigger immediate follow-up.

TIER 2 LIKELY (70-90% confidence): Strong contextual indicators without explicit statement. Examples: "We've been house hunting and found something", "Things are changing at work", "The diagnosis was tougher than expected". Confirm with targeted questions.

TIER 3 POSSIBLE (50-70% confidence): Indirect references or ambiguous language. Examples: "Family situation is complicated", "Work has been stressful", "Money's been tighter". Note in file; probe gently.

Scoring formula: DETECTION_CONFIDENCE = (Explicitness × 0.5) + (Corroborating_Evidence × 0.3) + (Temporal_Clarity × 0.2)
Where each factor is 0.0-1.0. Result: ≥0.90 CONFIRMED, 0.70-0.90 LIKELY, 0.50-0.70 POSSIBLE, <0.50 skip.

## PLANNING DOMAIN ACTIVATION
For each detected event, map to affected planning domains (Goals, Tax, Estate, Insurance, Retirement, Investment, Cash Flow, Education, Legal) and set urgency:
- IMMEDIATE: Action within 7 days (beneficiary changes, critical documents)
- URGENT: Action within 30 days (insurance review, tax withholding)
- HIGH: Action within 60-90 days (comprehensive plan updates)
- MEDIUM: Next scheduled review
- ROUTINE: Annual check-in

## TIMELINE EXTRACTION
Classify each event temporally:
- Past Recent (within 6 months): May still require active response
- Past Established (6-24 months): Integration phase
- Present: Currently happening
- Future Imminent (0-3 months): Preparation phase
- Future Planned (3-12 months): Planning phase
- Future Long-term (>12 months): Strategic phase

## SERVICE TRIGGER MAPPING
For each event, identify service activations with status (ACTIVATE/SCHEDULE/RECOMMEND), timeline, responsible party, and action description.

## OUTPUT FORMAT
Return ONLY valid JSON array. Each detected event:
{
  "event": "short event name",
  "category": "marriage|divorce|new_baby|inheritance|job_change|home_purchase|relocation|health_event|death_in_family|retirement|promotion|business_start|business_sale|layoff|adoption|custody_change|property_sale|lawsuit|windfall|disability|ltc_need|college_start|will_update|trust_creation|poa_creation|guardianship|prenup",
  "description": "brief description as mentioned",
  "confidence": number 0-100,
  "profileFieldUpdates": {"fieldName": "suggestedValue"},
  "reasoning": "why this was detected with evidence",
  "eventCategory": "family|career|financial|health|education|legal",
  "confidenceTier": "CONFIRMED|LIKELY|POSSIBLE",
  "evidenceQuotes": ["direct quotes from transcript"],
  "timeline": {
    "temporalClassification": "past_recent|past_established|present|future_imminent|future_planned|future_longterm",
    "eventOccurs": "estimated date or timeframe if determinable",
    "impactWindow": "when action is needed"
  },
  "planningImpact": {
    "domainsAffected": ["Retirement", "Tax", "Insurance", etc.],
    "urgency": "IMMEDIATE|URGENT|HIGH|MEDIUM|ROUTINE",
    "financialImpact": "estimated dollar impact if determinable or TBD",
    "riskLevel": "Critical|High|Medium|Low"
  },
  "serviceTriggers": [{"service": string, "status": "ACTIVATE|SCHEDULE|RECOMMEND", "timeline": string, "responsibleParty": string, "actionDescription": string}],
  "followUpQuestions": ["event-specific clarifying questions"],
  "advisorCoachingNotes": "coaching guidance for advisor",
  "urgencyFlag": "summary urgency statement"
}

If no life events detected, return []. Only detect events with confidence > 50. Do not re-detect events already listed.`;

    const existingStr = existingLifeEvents.length > 0
      ? `\nAlready recorded life events (do not re-detect):\n${existingLifeEvents.map(e => `- ${e.eventDate}: ${e.description}`).join("\n")}`
      : "";

    const userPrompt = `Client: ${sanitizeForPrompt(clientName, 200)}${existingStr}

Transcript:
${sanitizeForPrompt(transcriptText, 15000)}`;

    const result = await chatCompletion(systemPrompt, userPrompt, true);
    const cleaned = result.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    const validEventCategories = ["family", "career", "financial", "health", "education", "legal"] as const;
    const validConfTiers = ["CONFIRMED", "LIKELY", "POSSIBLE"] as const;
    const validTemporal = ["past_recent", "past_established", "present", "future_imminent", "future_planned", "future_longterm"] as const;
    const validUrgency = ["IMMEDIATE", "URGENT", "HIGH", "MEDIUM", "ROUTINE"] as const;
    const validTriggerStatus = ["ACTIVATE", "SCHEDULE", "RECOMMEND"] as const;

    return parsed
    .filter((event: LifeEventRaw) => (typeof event.confidence === "number" ? event.confidence : 0) > 50)
    .map((event: LifeEventRaw): LifeEventDetection => {
      const conf = typeof event.confidence === "number" ? event.confidence : 50;
      const confTierRaw = event.confidenceTier || (conf >= 90 ? "CONFIRMED" : conf >= 70 ? "LIKELY" : "POSSIBLE");

      const result: LifeEventDetection = {
        event: event.event || "Unknown",
        category: event.category || "unknown",
        description: event.description || "",
        confidence: conf,
        profileFieldUpdates: event.profileFieldUpdates || {},
        reasoning: event.reasoning || "",
      };

      if (event.eventCategory && validEventCategories.includes(event.eventCategory as typeof validEventCategories[number])) {
        result.eventCategory = event.eventCategory as LifeEventDetection["eventCategory"];
      }

      if (validConfTiers.includes(confTierRaw as typeof validConfTiers[number])) {
        result.confidenceTier = confTierRaw as LifeEventDetection["confidenceTier"];
      }

      if (event.evidenceQuotes) {
        result.evidenceQuotes = event.evidenceQuotes;
      }

      if (event.timeline?.temporalClassification && validTemporal.includes(event.timeline.temporalClassification as typeof validTemporal[number])) {
        result.timeline = {
          temporalClassification: event.timeline.temporalClassification as LifeEventDetection["timeline"] extends { temporalClassification: infer T } ? T : never,
          eventOccurs: event.timeline.eventOccurs,
          impactWindow: event.timeline.impactWindow,
        };
      }

      if (event.planningImpact?.urgency && validUrgency.includes(event.planningImpact.urgency as typeof validUrgency[number])) {
        result.planningImpact = {
          domainsAffected: event.planningImpact.domainsAffected || [],
          urgency: event.planningImpact.urgency as NonNullable<LifeEventDetection["planningImpact"]>["urgency"],
          financialImpact: event.planningImpact.financialImpact,
          riskLevel: event.planningImpact.riskLevel,
        };
      }

      if (event.serviceTriggers) {
        result.serviceTriggers = event.serviceTriggers
          .filter(st => st.status && validTriggerStatus.includes(st.status as typeof validTriggerStatus[number]))
          .map(st => ({
            service: st.service || "",
            status: st.status as NonNullable<LifeEventDetection["serviceTriggers"]>[number]["status"],
            timeline: st.timeline || "",
            responsibleParty: st.responsibleParty || "",
            actionDescription: st.actionDescription || "",
          }));
      }

      if (event.followUpQuestions) result.followUpQuestions = event.followUpQuestions;
      if (event.advisorCoachingNotes) result.advisorCoachingNotes = event.advisorCoachingNotes;
      if (event.urgencyFlag) result.urgencyFlag = event.urgencyFlag;

      return result;
    });
  } catch (error) {
    logger.error({ err: error }, "Life event detection failed");
    return [];
  }
}

export interface SopQueryResult {
  answer: string;
  sources: Array<{ documentTitle: string; category: string; chunkContent: string }>;
  confidence: string;
}

export async function querySopKnowledgeBase(
  question: string,
  relevantChunks: Array<{ content: string; documentTitle?: string; documentCategory?: string }>,
  custodialContext?: Array<{ custodian: string; actionType: string; formName: string; instructions?: string | null }>
): Promise<SopQueryResult> {
  const sources = relevantChunks.map(c => ({
    documentTitle: c.documentTitle || "Unknown",
    category: c.documentCategory || "General",
    chunkContent: c.content.substring(0, 500),
  }));

  if (!isAIAvailable()) {
    if (relevantChunks.length === 0 && (!custodialContext || custodialContext.length === 0)) {
      return {
        answer: "No relevant SOP documents or custodial instructions found for your query. Please refine your question or contact the operations team.",
        sources: [],
        confidence: "low",
      };
    }

    let answer = "Based on the available documentation:\n\n";
    if (relevantChunks.length > 0) {
      answer += relevantChunks.map((c, i) => `**Source ${i + 1}** (${c.documentTitle || "Unknown"}):\n${c.content.substring(0, 300)}...`).join("\n\n");
    }
    if (custodialContext && custodialContext.length > 0) {
      answer += "\n\n**Custodial Instructions:**\n";
      answer += custodialContext.map(ci => `- **${ci.custodian}** — ${ci.actionType}: ${ci.formName}${ci.instructions ? ` — ${ci.instructions.substring(0, 200)}` : ""}`).join("\n");
    }

    return { answer, sources, confidence: "medium" };
  }

  try {
    const contextText = relevantChunks.map((c, i) =>
      `[Source ${i + 1}: ${c.documentTitle || "Unknown"} (${c.documentCategory || "General"})]\n${c.content}`
    ).join("\n\n---\n\n");

    let custodialText = "";
    if (custodialContext && custodialContext.length > 0) {
      custodialText = "\n\nCustodial Instructions:\n" + custodialContext.map(ci =>
        `- ${ci.custodian} | ${ci.actionType} | Form: ${ci.formName}${ci.instructions ? ` | ${ci.instructions}` : ""}`
      ).join("\n");
    }

    const systemPrompt = `You are Finn, OneDigital's operations knowledge assistant. Retrieve accurate, custodian-specific Standard Operating Procedures and provide step-by-step execution guidance. Every procedure must be precise, sourced, and up-to-date.

## QUERY CLASSIFICATION
Classify the query into one of four types:
1. PROCEDURAL HOW-TO — Step-by-step instructions, prerequisites, timeline (e.g., "How do I execute an account transfer at Schwab?")
2. POLICY CLARIFICATION — Policy statement, applicability, exceptions (e.g., "What are the rules on fee-only advisory?")
3. COMPLIANCE REQUIREMENT — Compliance rule, documentation requirement, timing (e.g., "Are we required to document suitability?")
4. ESCALATION PATH — Contact person, phone/email, escalation procedure (e.g., "Who do I contact if a trade fails?")

## MULTI-SOURCE RETRIEVAL HIERARCHY
Answer using sources in this order of precedence:
1. Internal OneDigital Procedures (highest authority)
2. Custodian-Specific Instructions (Schwab, Fidelity, Vanguard)
3. Compliance Policies (SEI/LST overlays, fiduciary documentation)
4. Regulatory Requirements (SEC, FINRA, state, IRS)

## CUSTODIAN-SPECIFIC ROUTING
When a custodian is identified, provide custodian-specific details:

**Schwab** — Portal: AdviserCenter. Key contacts: 1-800-515-2157. ACAT: 5-10 business days. eSign acceptable for most docs. Common issues: ACAT rejection (title mismatch), fee deduction failure (confirm AUM structure), eSign rejection (some require wet signature).

**Fidelity** — Portal: AdvisorCentral. ACAT: 5-7 business days (typically faster). MoneyLink and ACH available. Common issues: funding delays (confirm MoneyLink registration), UMA execution delays (verify model sums to 100%), fee billing errors (check SMA designation).

**Vanguard** — Portal: Vanguard Advisor Services, Portfolio Center. ACAT: 10-15 business days (slower). Requires signed Fee Authorization Agreement. No pre/post-market trading. Common issues: slow ACAT processing (plan ahead, follow up day 5), fee deduction setup complexity, limited trading flexibility.

## RESPONSE STRUCTURE
For PROCEDURAL queries, include: prerequisites, required permissions, step-by-step instructions with portal locations, required documents, timeline (best/typical/worst case), common pitfalls with prevention/resolution, troubleshooting for known errors, escalation contacts, and related procedures.

For all queries: cite the source document, include last-updated date if available, flag if documentation may be outdated (>6 months), and include compliance checkpoints.

## CONFIDENCE SCORING
Rate confidence: Source_Authority × 0.4 + Recency × 0.3 + Specificity × 0.2 + Custodian_Verification × 0.1
- 0.90-1.0: "Direct from custodian documentation, recent, verified"
- 0.75-0.90: "From internal KB, recently updated, custodian-confirmed"
- 0.60-0.75: "From internal KB, may need verification with custodian"
- <0.60: "Inferred from similar procedures, recommend custodian verification"

## VERSION AWARENESS
If the SOP documentation is older than 180 days, flag: "SOP may be outdated. Recommend verification with custodian."
If older than 365 days, flag: "SOP is stale. Do not execute without direct custodian verification."

Format your response with markdown. End with a confidence assessment on a new line prefixed with "Confidence: ".`;

    const userPrompt = `Question: ${sanitizeForPrompt(question, 2000)}

Relevant SOP Documentation:
${sanitizeForPrompt(contextText, 15000)}
${custodialText ? sanitizeForPrompt(custodialText, 5000) : ""}

Provide a clear, accurate answer following the structured response format. Classify the query type, route to the correct custodian if applicable, and include step-by-step procedures with compliance checkpoints. End with a confidence assessment (high/medium/low) on a new line prefixed with "Confidence: ".`;

    const response = await chatCompletion(systemPrompt, userPrompt);

    let confidence = "medium";
    const confMatch = response.match(/Confidence:\s*(high|medium|low)/i);
    if (confMatch) {
      confidence = confMatch[1].toLowerCase();
    }

    const cleanAnswer = response.replace(/Confidence:\s*(high|medium|low)/gi, "").trim();

    return { answer: cleanAnswer, sources, confidence };
  } catch (error) {
    logger.error({ err: error }, "SOP RAG query error");
    return {
      answer: "Unable to process your SOP query at this time. Please try again later.",
      sources,
      confidence: "low",
    };
  }
}
