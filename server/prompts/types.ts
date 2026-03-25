export type DataFreshnessStatus = "fresh" | "stale" | "critical_stale";

export type MeetingType =
  | "annual_review"
  | "discovery"
  | "problem_solving"
  | "life_event"
  | "retirement_transition"
  | "rebalancing"
  | "general";

export type DriftStatus = "in_tolerance" | "drift_warning" | "rebalance_urgent";
export type GoalTrackStatus = "ahead" | "on_track" | "at_risk";
export type ComplianceSeverity = "info" | "warning" | "critical";
export type ConversationPhase = "opening" | "core" | "transition" | "closing";
export type ActionOwner = "advisor" | "client" | "operations" | "compliance";
export type DeadlineType = "explicit" | "regulatory" | "market_window" | "contextual" | "default";
export type ActionStatus = "pending" | "in_progress" | "on_track" | "at_risk" | "completed" | "blocked";
export type EmailFormat = "formal" | "casual" | "urgent" | "emotional_support" | "auto";
export type DecisionStatus = "AGREED" | "TENTATIVE" | "PROPOSED_UNCONFIRMED";
export type SentimentLevel = "positive" | "neutral" | "anxious" | "frustrated";
export type PlanningDomain =
  | "investment"
  | "tax"
  | "estate"
  | "insurance"
  | "retirement_income"
  | "risk_protection"
  | "cash_flow"
  | "estate_administration"
  | "goal_planning"
  | "administrative_compliance";

export interface V33MeetingPrepInput {
  clientId?: string;
  meetingDate?: string;
  meetingType?: MeetingType;
  behavioralContext?: {
    anxietyLevel: string;
    dominantBias: string | null;
    recentSentiment: string;
    behavioralRiskScore: number;
  };
  researchHighlights?: string;
}

export interface V33DataFreshness {
  holdings: DataFreshnessStatus;
  goals: DataFreshnessStatus;
  lifeEvents: DataFreshnessStatus;
  confidenceScore: number;
}

export interface V33DriftAlert {
  assetClass: string;
  driftPct: number;
  status: DriftStatus;
  recommendation: string;
}

export interface V33GoalProgress {
  goalName: string;
  progressPct: number;
  onTrackStatus: GoalTrackStatus;
  gapAmount: number | null;
  monthsRemaining: number | null;
}

export interface V33ComplianceFlag {
  flagType: string;
  severity: ComplianceSeverity;
  actionRequired: string;
}

export interface V33MeetingPrepResult {
  content: string;
  meetingType: MeetingType;
  dataFreshness: V33DataFreshness;
  driftAlerts: V33DriftAlert[];
  goalProgress: V33GoalProgress[];
  complianceFlags: V33ComplianceFlag[];
  talkingPointCount: number;
}

export interface V33SummaryDecision {
  decisionId: string;
  decision: string;
  decisionStatus: DecisionStatus;
  rationale: string;
  evidenceQuote: string | null;
}

export interface V33ComplianceMoment {
  momentType: string;
  quote: string | null;
  clientUnderstandingConfirmed: boolean;
  followUpAction: string | null;
}

export interface V33SentimentAnalysis {
  overallSentiment: SentimentLevel;
  topicSentiments: Array<{ topic: string; sentiment: SentimentLevel; evidence: string }>;
  anxietyTriggers: string[];
}

export interface V33SummaryActionItem {
  actionId: string;
  description: string;
  owner: ActionOwner;
  deadline: string | null;
  priority: number;
  complianceReviewRequired: boolean;
}

export interface V33MeetingSummaryResult {
  advisorSummary: string;
  clientSummary: string;
  decisions: V33SummaryDecision[];
  complianceMoments: V33ComplianceMoment[];
  sentimentAnalysis: V33SentimentAnalysis;
  actionItems: V33SummaryActionItem[];
  complianceCertification: {
    suitabilityDocumented: boolean;
    riskDisclosuresDocumented: boolean;
    feeDiscussionsDocumented: boolean;
    regulatoryTriggersAddressed: boolean;
  };
}

export interface V33TalkingPoint {
  pointId: string;
  sequence: number;
  conversationPhase: ConversationPhase;
  topicCategory: string;
  priority: number;
  pointStatement: string;
  supportingData: Array<{ label: string; value: string }>;
  deliveryGuidance: {
    tone: string;
    detailLevel: "high" | "medium" | "summary";
    complexity: "high" | "medium" | "low";
  };
  anticipatedObjections: Array<{ objection: string; response: string }>;
}

export interface V33TalkingPointsResult {
  content: string;
  guardrailFlagged: boolean;
  guardrailViolations: Array<{ ruleId: string; description: string; severity: "block" | "flag" }>;
  conversationFlow: {
    totalDurationMinutes: number;
    openingMinutes: number;
    coreMinutes: number;
    transitionMinutes: number;
    closingMinutes: number;
  };
  talkingPoints: V33TalkingPoint[];
  meetingType: MeetingType;
}

export interface V33ActionItem {
  actionId: string;
  sequence: number;
  description: string;
  detailedDescription: string;
  planningDomain: PlanningDomain;
  owner: ActionOwner;
  deadline: string | null;
  deadlineType: DeadlineType;
  daysUntilDeadline: number | null;
  priorityScore: number;
  complianceFlag: boolean;
  complianceFlagType: string | null;
  status: ActionStatus;
  dependencies: {
    blockingDependencies: string[];
    informationDependencies: string[];
    relatedActions: string[];
  };
  evidenceQuote: string | null;
  acceptanceCriteria: string;
}

export interface V33ActionItemsResult {
  content: string;
  totalActions: number;
  criticalCount: number;
  highCount: number;
  complianceFlagCount: number;
  actions: V33ActionItem[];
  criticalPath: {
    totalDays: number;
    riskFlag: boolean;
    riskDescription: string | null;
  };
  ownerWorkload: {
    advisor: { total: number; dueWithin7Days: number; dueWithin30Days: number };
    client: { total: number; dueWithin7Days: number; dueWithin30Days: number };
    operations: { total: number; dueWithin7Days: number; dueWithin30Days: number };
    compliance: { total: number; dueWithin7Days: number; dueWithin30Days: number };
  };
}

export interface V33EmailActionItem {
  action: string;
  deadline: string | null;
  responsibleParty: "client" | "advisor";
  plainLanguageInstruction: string;
}

export interface V33FollowUpEmailResult {
  content: string;
  subjectLine: string;
  emailFormat: EmailFormat;
  actionItems: V33EmailActionItem[];
  complianceReview: {
    forwardLookingStatementsFlagged: number;
    guaranteesFlagged: number;
    requiredDisclaimersIncluded: string[];
    complianceStatus: "passed" | "requires_review" | "rewrite_required";
  };
  nextMeeting: {
    suggestedType: MeetingType;
    suggestedTimeline: string;
    suggestedFocusAreas: string[];
  } | null;
}

export interface V33DirectIndexingInput {
  clientId: string;
  clientName: string;
  totalUnrealizedLoss: number;
  totalUnrealizedGain: number;
  taxLotCount: number;
  harvestableCount: number;
  totalHarvestableSavings: number;
  washSaleTickersCount: number;
  washSaleTickers?: string[];
  topHarvestable?: Array<{
    ticker: string;
    unrealizedLoss: number;
    potentialTaxSavings: number;
    washSaleRisk: boolean;
    replacementTicker?: string;
    holdingPeriod: string;
  }>;
  portfolioCount?: number;
  taxAlpha?: number;
}

export interface V33HarvestCandidate {
  ticker: string;
  lotId: string;
  lossMagnitude: number;
  capitalLossType: "SHORT_TERM" | "LONG_TERM";
  holdingPeriodDays: number;
  taxBenefitRate: number;
  annualTaxSavings: number;
  washSaleRisk: "SAFE" | "LIKELY_SAFE" | "SUBSTANTIALLY_IDENTICAL" | "SAME_SECURITY";
  replacementTicker: string | null;
  replacementRationale: string;
  actionRecommendation: "HARVEST_NOW" | "HARVEST_WITH_REPLACEMENT" | "DEFER" | "MONITOR";
}

export interface V33WashSaleAlert {
  ticker: string;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  restrictedWindowStart: string;
  restrictedWindowEnd: string;
  conflictingHoldings: string[];
  recommendation: string;
  regulatoryReference: string;
}

export interface V33TaxAlphaAnalysis {
  annualTaxAlphaPercent: number;
  annualTaxAlphaDollars: number;
  trackingErrorPercent: number;
  trackingErrorAssessment: "TIGHT" | "CLOSE" | "MODERATE" | "LOOSE";
  sensitivityRange: [number, number];
  breakEvenAum: number;
  netBenefitAfterCosts: number;
  costComparison: {
    directIndexingCost: number;
    traditionalCost: number;
    annualSavings: number;
  };
}

export interface V33DirectIndexingCompliance {
  fiduciaryStatement: string;
  suitabilityAssessment: string;
  riskDisclosures: string[];
  regulatoryReferences: string[];
  reviewTimestamp: string;
}

export type V33DirectIndexingKeyMetric = {
  label: string;
  value: string;
  status: "positive" | "negative" | "neutral";
  context: string;
};

export interface V33EvidenceCitation {
  sourceId: string;
  sourceType: "calculation" | "regulation" | "market_data" | "client_data" | "model_output" | "policy";
  description: string;
  reference: string;
  confidence: "high" | "medium" | "low";
}

export interface V33DirectIndexingResult {
  advisorNarrative: string;
  clientSummary: string;
  harvestingOpportunities: V33HarvestCandidate[];
  washSaleAlerts: V33WashSaleAlert[];
  taxAlphaAnalysis: V33TaxAlphaAnalysis;
  yearEndPlanning: {
    realizedGainsYtd: number;
    realizedLossesYtd: number;
    netPosition: number;
    recommendedHarvestAmount: number;
    urgency: "HIGH" | "MEDIUM" | "LOW";
    lossCarryforwardAvailable: number;
  };
  complianceDocumentation: V33DirectIndexingCompliance;
  keyMetrics: V33DirectIndexingKeyMetric[];
  evidenceCitations: V33EvidenceCitation[];
}

export interface V33RetirementAnalysisInput {
  clientId?: string;
  clientName: string;
  scenarioName: string;
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  portfolioValue: number;
  annualSpending: number;
  expectedReturn: number;
  inflationRate: number;
  successRate: number;
  medianFinalBalance: number;
  p10FinalBalance: number;
  p90FinalBalance: number;
  medianDepletionAge?: number | null;
  events?: Array<{ name: string; type: string; amount: number; startAge: number; endAge?: number | null }>;
}

export interface V33ScenarioComparison {
  scenarioName: string;
  scenarioType: "base_case" | "optimistic" | "pessimistic" | "early_retirement" | "extended_career";
  successProbability: number;
  terminalValue: number;
  portfolioDepletionAge: number | null;
  averageAnnualBalance: number;
  annualWithdrawalRate: number;
  keyAssumptions: { returnRate: number; inflationRate: number; spendingGrowth: number };
  riskAssessment: string;
}

export interface V33SSOptimization {
  recommendedClaimingAge: number;
  monthlyBenefitAtRecommended: number;
  annualBenefitAtRecommended: number;
  breakEvenAge: number;
  lifetimePresentValue: number;
  claimingAgeComparisons: Array<{ claimingAge: number; monthlyBenefit: number; breakEvenAge: number; lifetimePv: number }>;
  couplesStrategy: string | null;
  rationale: string;
}

export interface V33PensionEvaluation {
  lumpSumValue: number | null;
  annuityMonthly: number | null;
  jointSurvivorMonthly: number | null;
  recommendedOption: "lump_sum" | "single_annuity" | "joint_survivor" | "hybrid" | "not_applicable";
  breakEvenAge: number | null;
  rationale: string;
}

export interface V33RetirementCompliance {
  fiduciaryStatement: string;
  assumptionsDisclosure: string;
  riskDisclosures: string[];
  regulatoryReferences: string[];
  reviewTimestamp: string;
}

export type V33RetirementKeyMetric = {
  label: string;
  value: string;
  status: "positive" | "negative" | "neutral";
  context: string;
};

export interface V33RetirementAnalysisResult {
  advisorNarrative: string;
  clientSummary: string;
  scenarioComparisons: V33ScenarioComparison[];
  ssOptimization: V33SSOptimization;
  pensionEvaluation: V33PensionEvaluation;
  expenseProjection: {
    goGoPhase: { ageRange: string; annualSpending: number; adjustmentFactor: number };
    slowGoPhase: { ageRange: string; annualSpending: number; adjustmentFactor: number };
    noGoPhase: { ageRange: string; annualSpending: number; healthcareSupplement: number };
    totalRetirementCost: number;
    healthcareEscalationRate: number;
  };
  gapAnalysis: {
    annualIncomeGap: number;
    cumulativeGap: number;
    adjustmentOptions: Array<{ adjustment: string; impact: string; newSuccessRate: number }>;
  };
  rmdProjection: {
    rmdStartAge: number;
    firstYearRmd: number;
    rothConversionWindowYears: number;
    recommendedConversionAmount: number;
    estimatedTaxSavings: number;
  };
  complianceDocumentation: V33RetirementCompliance;
  keyMetrics: V33RetirementKeyMetric[];
  evidenceCitations: V33EvidenceCitation[];
}

export interface V33WithdrawalAnalysisInput {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  filingStatus: "single" | "married_filing_jointly";
  annualSpendingNeed: number;
  socialSecurityBenefit: number;
  pensionIncome: number;
  otherIncome: number;
  accounts: Array<{
    name: string;
    type: "roth" | "taxable" | "traditional_ira" | "401k";
    balance: number;
    costBasis?: number;
    unrealizedGains?: number;
    annualContributions?: number;
  }>;
  stateOfResidence: string;
  expectedGrowthRate: number;
  inflationRate: number;
  projectionYears: number;
  qcdAmount?: number;
  clientId?: string;
}

export interface V33WithdrawalSequenceYear {
  year: number;
  age: number;
  annualNeed: number;
  rothWithdrawal: number;
  taxableWithdrawal: number;
  traditionalWithdrawal: number;
  totalTax: number;
  afterTaxIncome: number;
  effectiveTaxRate: number;
  accountBalances: { roth: number; taxable: number; traditional: number };
  notes: string;
}

export interface V33BracketFillingAnalysis {
  filingStatus: string;
  currentBracket: number;
  availableRoomInBracket: number;
  recommendedFillAmount: number;
  taxSavingsVsUnoptimized: number;
  tenYearCumulativeSavings: number;
  bracketThresholds: Array<{ bracket: number; threshold: number }>;
}

export interface V33RothConversionWindow {
  yearStart: number;
  yearEnd: number;
  ageStart: number;
  ageEnd: number;
  recommendedAnnualConversion: number;
  conversionTaxRate: number;
  totalConversionAmount: number;
  totalTaxCost: number;
  projectedLifetimeSavings: number;
  rationale: string;
}

export interface V33RmdCoordination {
  rmdStartAge: number;
  projectedFirstRmd: number;
  rmdSatisfiedByWithdrawals: boolean;
  qcdOpportunity: number;
  penaltyRisk: string;
  multiYearProjection: Array<{
    age: number;
    iraBalance: number;
    lifeExpectancyFactor: number;
    rmdAmount: number;
    taxOnRmd: number;
  }>;
}

export interface V33WithdrawalCompliance {
  fiduciaryStatement: string;
  suitabilityAssessment: string;
  riskDisclosures: string[];
  regulatoryReferences: string[];
  reviewTimestamp: string;
}

export type V33WithdrawalKeyMetric = {
  label: string;
  value: string;
  status: "positive" | "negative" | "neutral";
  context: string;
};

export interface V33WithdrawalAnalysisResult {
  advisorNarrative: string;
  clientSummary: string;
  withdrawalSequence: V33WithdrawalSequenceYear[];
  bracketFillingAnalysis: V33BracketFillingAnalysis;
  rothConversionWindows: V33RothConversionWindow[];
  rmdCoordination: V33RmdCoordination;
  irmaaAnalysis: {
    currentMagi: number;
    irmaaTriggerThreshold: number;
    projectedSurcharge: number;
    recommendation: string;
  };
  ssTaxationAnalysis: {
    provisionalIncome: number;
    taxablePercent: number;
    taxableSsAmount: number;
    recommendation: string;
  };
  complianceDocumentation: V33WithdrawalCompliance;
  keyMetrics: V33WithdrawalKeyMetric[];
  evidenceCitations: V33EvidenceCitation[];
}

export interface V33HoldingSummary {
  ticker: string;
  name: string;
  marketValue: number | string | null;
  weight: number | string | null;
  sector: string | null;
  unrealizedGainLoss: number | string | null;
}

export interface V33PerformancePeriod {
  period: string;
  returnPercent: number | string | null;
  benchmarkPercent?: number | string | null;
}

export interface V33ClientSummaryForBook {
  clientId: string;
  clientName: string;
  totalAum: number;
  accountCount: number;
  accountTypes: string[];
  riskTolerance?: string;
  segment?: string;
  topHoldings: V33HoldingSummary[];
  performance: V33PerformancePeriod[];
  recentActivities: string[];
  pendingTasks: number;
  documentsCount: number;
  lastContact?: string;
}

export interface V33ClientInsightsDashboardInput {
  advisorId: string;
  advisorName?: string;
  clients: V33ClientSummaryForBook[];
  totalBookAum: number;
  totalClientCount: number;
}

export interface V33ConcentrationRiskAnalysis {
  totalAum: number;
  totalClients: number;
  hhi: number;
  concentrationLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  top5AumPercent: number;
  top10AumPercent: number;
  top20AumPercent: number;
  singleClientMaxPercent: number;
  keyPersonRiskClients: Array<{ clientName: string; aum: number; percentOfBook: number }>;
  tierBreakdown: Array<{ tier: string; count: number; totalAum: number; percentOfBook: number; avgAumPerClient: number }>;
  mitigationRecommendations: string[];
}

export interface V33ProactiveAlert {
  alertId: string;
  clientName: string;
  clientId: string;
  category: "RMD" | "POLICY_RENEWAL" | "STALE_PLAN" | "LIFE_EVENT" | "PORTFOLIO_DRIFT" | "LOW_ENGAGEMENT" | "BENEFICIARY_REVIEW";
  priority: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  actionRequired: string;
  dueDate: string;
  owner: string;
  estimatedImpact: string;
}

export interface V33OpportunityPipelineItem {
  opportunityType: "CROSS_SELL" | "REFERRAL" | "ASSETS_NOT_HELD" | "FEE_OPTIMIZATION" | "NEW_SERVICE";
  title: string;
  description: string;
  estimatedRevenue: number;
  probability: number;
  timeline: string;
  effort: "LOW" | "MEDIUM" | "HIGH";
  targetClients: number;
  priority: number;
}

export interface V33BookPerformanceMetric {
  metricName: string;
  currentValue: string;
  trend: "UP" | "DOWN" | "STABLE";
  benchmark: string | null;
  assessment: string;
}

export interface V33ClientInsightsDashboardCompliance {
  fiduciaryStatement: string;
  dataPrivacyNote: string;
  riskDisclosures: string[];
  reviewTimestamp: string;
}

export type V33ClientInsightsDashboardKeyMetric = {
  label: string;
  value: string;
  status: "positive" | "negative" | "neutral";
  context: string;
};

export interface V33ClientInsightsDashboardResult {
  advisorNarrative: string;
  clientSummary: string;
  executiveSummary: string;
  bookHealthScore: number;
  bookHealthLabel: string;
  concentrationRisk: V33ConcentrationRiskAnalysis;
  proactiveAlerts: V33ProactiveAlert[];
  opportunityPipeline: V33OpportunityPipelineItem[];
  performanceMetrics: V33BookPerformanceMetric[];
  segmentAnalysis: {
    byLifeStage: Array<{ stage: string; count: number; aum: number; revenue: number; avgRevenuePerClient: number }>;
    byGrowth: Array<{ category: string; count: number; totalAum: number; oneYearGrowth: number }>;
    retentionRisk: { atRiskCount: number; atRiskAum: number; retentionActions: string[] };
  };
  complianceDocumentation: V33ClientInsightsDashboardCompliance;
  keyMetrics: V33ClientInsightsDashboardKeyMetric[];
  evidenceCitations: V33EvidenceCitation[];
}
