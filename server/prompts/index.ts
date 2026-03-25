export { generateMeetingPrep, generateMeetingPrepStructured } from "./01-meeting-prep";
export type { MeetingPrepV33Input } from "./01-meeting-prep";

export { generateMeetingSummary, generateMeetingSummaryStructured } from "./02-meeting-summary";
export type { MeetingSummaryV33Input } from "./02-meeting-summary";

export { generateTalkingPoints, generateTalkingPointsWithMeta, generateTalkingPointsStructured } from "./03-talking-points";
export type { TalkingPointsV33Input } from "./03-talking-points";

export { extractActionItems, extractActionItemsStructured } from "./04-action-items";
export type { ActionItemsV33Options } from "./04-action-items";

export { generateFollowUpEmail, generateFollowUpEmailStructured } from "./05-follow-up-email";
export type { FollowUpEmailV33Input } from "./05-follow-up-email";

export { generateDirectIndexingAnalysis } from "./21-direct-indexing-analysis";

export { generateRetirementAnalysis } from "./22-retirement-analysis";

export { generateWithdrawalAnalysis } from "./23-withdrawal-analysis";

export { generateClientInsightsDashboard } from "./24-client-insights-dashboard";

export type {
  V33MeetingPrepResult,
  V33MeetingSummaryResult,
  V33TalkingPointsResult,
  V33ActionItemsResult,
  V33FollowUpEmailResult,
  V33DataFreshness,
  V33DriftAlert,
  V33GoalProgress,
  V33ComplianceFlag,
  V33SummaryDecision,
  V33ComplianceMoment,
  V33SentimentAnalysis,
  V33SummaryActionItem,
  V33TalkingPoint,
  V33ActionItem,
  V33EmailActionItem,
  MeetingType,
  DataFreshnessStatus,
  DriftStatus,
  GoalTrackStatus,
  ComplianceSeverity,
  ConversationPhase,
  ActionOwner,
  DeadlineType,
  ActionStatus,
  EmailFormat,
  DecisionStatus,
  PlanningDomain,
  SentimentLevel,
  V33DirectIndexingInput,
  V33DirectIndexingResult,
  V33HarvestCandidate,
  V33WashSaleAlert,
  V33TaxAlphaAnalysis,
  V33DirectIndexingCompliance,
  V33DirectIndexingKeyMetric,
  V33RetirementAnalysisInput,
  V33RetirementAnalysisResult,
  V33ScenarioComparison,
  V33SSOptimization,
  V33PensionEvaluation,
  V33RetirementCompliance,
  V33RetirementKeyMetric,
  V33WithdrawalAnalysisInput,
  V33WithdrawalAnalysisResult,
  V33WithdrawalSequenceYear,
  V33BracketFillingAnalysis,
  V33RothConversionWindow,
  V33RmdCoordination,
  V33WithdrawalCompliance,
  V33WithdrawalKeyMetric,
  V33HoldingSummary,
  V33PerformancePeriod,
  V33ClientSummaryForBook,
  V33ClientInsightsDashboardInput,
  V33ClientInsightsDashboardResult,
  V33ConcentrationRiskAnalysis,
  V33ProactiveAlert,
  V33OpportunityPipelineItem,
  V33BookPerformanceMetric,
  V33ClientInsightsDashboardCompliance,
  V33ClientInsightsDashboardKeyMetric,
  V33EvidenceCitation,
} from "./types";
