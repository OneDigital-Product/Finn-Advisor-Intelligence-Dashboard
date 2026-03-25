import { db } from "./db";
import { eq, desc, asc, and, sql, ilike, like, or, gte, lte, isNull, count as drizzleCount, inArray } from "drizzle-orm";
import {
  advisors, clients, households, householdMembers, accounts, holdings,
  performance, transactions, tasks, meetings, activities, alerts,
  documents, complianceItems, lifeEvents, documentChecklist,
  workflowTemplates, clientWorkflows, associates, clientTeamMembers,
  diagnosticConfig, diagnosticResults, transcriptConfig, meetingPrepConfig, meetingSummaryConfig, documentClassificationConfig,
  complianceReviews, complianceReviewEvents,
  salesforceSyncLog, orionSyncLog, orionReconciliationReport, emailLog, zoomRecordings, meetingTranscripts,
  alertConfig, portfolioTargets, meetingProcessingConfig,
  type Advisor, type InsertAdvisor,
  type Client, type InsertClient,
  type Household, type InsertHousehold,
  type HouseholdMember, type InsertHouseholdMember,
  type Account, type InsertAccount,
  type Holding, type InsertHolding,
  type Performance, type InsertPerformance,
  type Transaction, type InsertTransaction,
  type Task, type InsertTask,
  type Meeting, type InsertMeeting,
  type Activity, type InsertActivity,
  type Alert, type InsertAlert,
  type Document, type InsertDocument,
  type ComplianceItem, type InsertComplianceItem,
  type LifeEvent, type InsertLifeEvent,
  type DocumentChecklistItem, type InsertDocumentChecklistItem,
  type WorkflowTemplate, type InsertWorkflowTemplate,
  type ClientWorkflow, type InsertClientWorkflow,
  type Associate, type InsertAssociate,
  type ClientTeamMember, type InsertClientTeamMember,
  type DiagnosticConfig, type InsertDiagnosticConfig,
  type DiagnosticResult, type InsertDiagnosticResult,
  type TranscriptConfig, type InsertTranscriptConfig,
  type MeetingPrepConfig, type InsertMeetingPrepConfig,
  type MeetingSummaryConfig, type InsertMeetingSummaryConfig,
  type DocumentClassificationConfig, type InsertDocumentClassificationConfig,
  type ComplianceReview, type InsertComplianceReview,
  type ComplianceReviewEvent, type InsertComplianceReviewEvent,
  meetingNotes, recurringTasks,
  type MeetingNote, type InsertMeetingNote,
  type RecurringTask, type InsertRecurringTask,
  trusts, trustRelationships, estateExemptions, giftHistory,
  monteCarloScenarios, scenarioEvents, alternativeAssets, loginEvents,
  type MonteCarloScenario, type InsertMonteCarloScenario,
  type ScenarioEvent, type InsertScenarioEvent,
  type AlternativeAsset, type InsertAlternativeAsset,
  type LoginEvent,
  type SalesforceSyncLog, type InsertSalesforceSyncLog,
  type OrionSyncLog, type InsertOrionSyncLog,
  type OrionReconciliationReport as OrionReconciliationReportRow, type InsertOrionReconciliationReport,
  type EmailLog, type InsertEmailLog,
  type ZoomRecording, type InsertZoomRecording,
  type MeetingTranscript, type InsertMeetingTranscript,
  type AlertConfig, type InsertAlertConfig,
  type PortfolioTarget, type InsertPortfolioTarget,
  type MeetingProcessingConfig, type InsertMeetingProcessingConfig,
  assessments, assessmentPdfs, insights, featureFlags, pilotFeedback, behavioralAnalyses,
  surveyResponses, healthCheckEvents, gateSignoffs,
  investorProfiles, investorProfileVersions, investorProfileQuestionSchemas,
  triggerCategories, triggerActions, financialGoals,
  fiduciaryValidationLogs, fiduciaryRuleConfigs,
  type FiduciaryValidationLog, type InsertFiduciaryValidationLog,
  type FiduciaryRuleConfig, type InsertFiduciaryRuleConfig,
  sopDocuments, sopChunks, custodialInstructions,
  type Assessment, type InsertAssessment,
  type AssessmentPdf, type InsertAssessmentPdf,
  type Insight, type InsertInsight,
  type FeatureFlag, type InsertFeatureFlag,
  type PilotFeedback, type InsertPilotFeedback,
  type SurveyResponse, type InsertSurveyResponse,
  type HealthCheckEvent, type InsertHealthCheckEvent,
  type GateSignoff, type InsertGateSignoff,
  type InvestorProfile, type InsertInvestorProfile,
  type InvestorProfileVersion, type InsertInvestorProfileVersion,
  type InvestorProfileQuestionSchema, type InsertInvestorProfileQuestionSchema,
  type TriggerCategory, type InsertTriggerCategory,
  type TriggerAction, type InsertTriggerAction,
  type FinancialGoal, type InsertFinancialGoal,
  discoveryQuestionnaires, discoverySessions, researchArticles, researchFeeds, researchBriefs,
  businessEntities, businessValuations, buySellAgreements, exitPlanMilestones,
  type DiscoveryQuestionnaire, type InsertDiscoveryQuestionnaire,
  type DiscoverySession, type InsertDiscoverySession,
  type ResearchArticle, type InsertResearchArticle,
  type ResearchBrief, type InsertResearchBrief,
  type ResearchFeed, type InsertResearchFeed,
  type Trust, type InsertTrust,
  type TrustRelationship, type InsertTrustRelationship,
  type EstateExemption, type InsertEstateExemption,
  type GiftHistoryEntry, type InsertGiftHistory,
  type BehavioralAnalysis, type InsertBehavioralAnalysis,
  pendingProfileUpdates,
  type PendingProfileUpdate, type InsertPendingProfileUpdate,
  withdrawalRequests, withdrawalAuditLog,
  type WithdrawalRequest, type InsertWithdrawalRequest,
  type WithdrawalAuditLog, type InsertWithdrawalAuditLog,
  type SopDocument, type InsertSopDocument,
  type SopChunk, type InsertSopChunk,
  type CustodialInstruction, type InsertCustodialInstruction,
  kycRiskRatings, amlScreeningResults, kycReviewSchedules, eddRecords, kycAuditLog,
  ofacSdnEntries, pepEntries, screeningConfigs,
  type KycRiskRating, type InsertKycRiskRating,
  type AmlScreeningResult, type InsertAmlScreeningResult,
  type KycReviewSchedule, type InsertKycReviewSchedule,
  type EddRecord, type InsertEddRecord,
  type KycAuditLogEntry, type InsertKycAuditLog,
  type OfacSdnEntry, type InsertOfacSdnEntry,
  type PepEntry, type InsertPepEntry,
  type ScreeningConfig, type InsertScreeningConfig,
  engagementEvents, engagementScores, intentSignals, nextBestActions,
  type EngagementEvent, type InsertEngagementEvent,
  type EngagementScore, type InsertEngagementScore,
  type IntentSignal, type InsertIntentSignal,
  type NextBestAction, type InsertNextBestAction,
  charitableAccounts, charitableContributions, charitableGrants, charitableGoals,
  type CharitableAccount, type InsertCharitableAccount,
  type CharitableContribution, type InsertCharitableContribution,
  type CharitableGrant, type InsertCharitableGrant,
  type CharitableGoal, type InsertCharitableGoal,
  taxLots, directIndexPortfolios, washSaleEvents,
  type TaxLot, type InsertTaxLot,
  type DirectIndexPortfolio, type InsertDirectIndexPortfolio,
  type WashSaleEvent, type InsertWashSaleEvent,
  socialProfiles, socialEvents,
  type SocialProfile, type InsertSocialProfile,
  type SocialEvent, type InsertSocialEvent,
  nigoRecords,
  type NigoRecord, type InsertNigoRecord,
  type BusinessEntity, type InsertBusinessEntity,
  type BusinessValuation, type InsertBusinessValuation,
  type BuySellAgreement, type InsertBuySellAgreement,
  type ExitPlanMilestone, type InsertExitPlanMilestone,
  flpStructures, exitMilestones,
  dafAccounts, dafTransactions, charitableRemainderTrusts, qcdRecords,
  type FlpStructure, type InsertFlpStructure,
  type ExitMilestone, type InsertExitMilestone,
  type DafAccount, type InsertDafAccount,
  type DafTransaction, type InsertDafTransaction,
  type CharitableRemainderTrust, type InsertCharitableRemainderTrust,
  type QcdRecord, type InsertQcdRecord,
  advisorAssessmentDefaults,
  type AdvisorAssessmentDefaults, type InsertAdvisorAssessmentDefaults,
  apiKeyMetadata,
  type ApiKeyMetadata, type InsertApiKeyMetadata,
  auditLog, failedLoginAttempts, activityAnalytics, exportHistory,
  type AuditLogEntry, type InsertAuditLogEntry,
  type FailedLoginAttempt, type InsertFailedLoginAttempt,
  type ActivityAnalytic, type InsertActivityAnalytic,
  type ExportHistoryRecord, type InsertExportHistoryRecord,
  type InsertLoginEvent,
  workflowDefinitions, workflowInstances, workflowStepExecutions, workflowGates,
  type WorkflowDefinition, type InsertWorkflowDefinition,
  type WorkflowInstance, type InsertWorkflowInstance,
  type WorkflowStepExecution, type InsertWorkflowStepExecution,
  type WorkflowGate, type InsertWorkflowGate,
} from "@shared/schema";

export interface IStorage {
  getAdvisor(id: string): Promise<Advisor | undefined>;
  getFirstAdvisor(): Promise<Advisor | undefined>;
  createAdvisor(advisor: InsertAdvisor): Promise<Advisor>;

  getClients(advisorId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  searchClients(advisorId: string, query: string): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, data: Partial<Client>): Promise<Client | undefined>;

  getHouseholds(advisorId: string): Promise<Household[]>;
  getHousehold(id: string): Promise<Household | undefined>;
  getHouseholdMembers(householdId: string): Promise<(HouseholdMember & { client: Client })[]>;
  createHousehold(household: InsertHousehold): Promise<Household>;
  updateHousehold(id: string, data: Partial<Household>): Promise<Household | undefined>;
  createHouseholdMember(member: InsertHouseholdMember): Promise<HouseholdMember>;

  getAccount(id: string): Promise<Account | undefined>;
  getAccountsByClient(clientId: string): Promise<Account[]>;
  getAccountsByHousehold(householdId: string): Promise<Account[]>;
  getAumByClient(clientIds: string[]): Promise<Map<string, { totalAum: number; accountCount: number }>>;
  getAumByHousehold(householdIds: string[]): Promise<Map<string, number>>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: string, data: Partial<Account>): Promise<Account | undefined>;

  getHoldingsByAccount(accountId: string): Promise<Holding[]>;
  getHoldingsByClient(clientId: string): Promise<Holding[]>;
  createHolding(holding: InsertHolding): Promise<Holding>;
  upsertHoldingByOrionId(holding: InsertHolding): Promise<Holding>;

  getPerformanceByAccount(accountId: string): Promise<Performance[]>;
  getPerformanceByHousehold(householdId: string): Promise<Performance[]>;
  createPerformance(perf: InsertPerformance): Promise<Performance>;
  upsertPerformanceByAccountPeriod(perf: InsertPerformance): Promise<Performance>;

  getTransactionsByAccount(accountId: string): Promise<Transaction[]>;
  getTransactionsByClient(clientId: string): Promise<Transaction[]>;
  createTransaction(tx: InsertTransaction): Promise<Transaction>;
  upsertTransactionByOrionId(tx: InsertTransaction): Promise<Transaction>;

  getTasks(advisorId: string): Promise<Task[]>;
  getTasksByClient(clientId: string): Promise<Task[]>;
  getTasksByMeeting(meetingId: string): Promise<Task[]>;
  getTasksByMeetingIds(meetingIds: number[]): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, data: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;

  getMeetings(advisorId: string): Promise<Meeting[]>;
  getMeeting(id: string): Promise<Meeting | undefined>;
  getMeetingsByClient(clientId: string): Promise<Meeting[]>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: string, data: Partial<Meeting>): Promise<Meeting | undefined>;

  getActivities(advisorId: string): Promise<Activity[]>;
  getActivity(id: string): Promise<Activity | undefined>;
  getActivitiesByClient(clientId: string): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: string, data: Partial<Activity>): Promise<Activity | undefined>;
  deleteActivity(id: string): Promise<void>;
  getActivitiesByFilters(filters: { advisorId: string; clientId?: string; type?: string; startDate?: string; endDate?: string; limit?: number; offset?: number }): Promise<{ activities: Activity[]; total: number }>;

  getAlerts(advisorId: string): Promise<Alert[]>;
  getFilteredAlerts(advisorId: string, filters: { severity?: string; alertType?: string; clientId?: string; limit?: number; offset?: number }): Promise<Alert[]>;
  markAlertRead(id: string, advisorId?: string): Promise<Alert | undefined>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  dismissAlert(id: string, advisorId?: string): Promise<Alert | undefined>;
  getAlertDashboardSummary(advisorId: string): Promise<{ total: number; unread: number; bySeverity: Record<string, number>; byType: Record<string, number>; recent: Alert[] }>;
  getAlertConfig(advisorId: string): Promise<AlertConfig[]>;
  upsertAlertConfig(advisorId: string, alertType: string, data: { enabled?: boolean; threshold?: Record<string, unknown> }): Promise<AlertConfig>;
  getPortfolioTargets(clientId: string): Promise<PortfolioTarget[]>;
  createPortfolioTarget(target: InsertPortfolioTarget): Promise<PortfolioTarget>;
  getMeetingProcessConfig(advisorId: string): Promise<MeetingProcessingConfig | undefined>;
  upsertMeetingProcessConfig(advisorId: string, data: Partial<InsertMeetingProcessingConfig>): Promise<MeetingProcessingConfig>;
  createAssessment(data: InsertAssessment): Promise<Assessment>;
  getLatestAssessment(clientId: string): Promise<Assessment | undefined>;
  getAssessmentHistory(clientId: string): Promise<Assessment[]>;
  getAssessment(id: string): Promise<Assessment | undefined>;
  createAssessmentPdf(data: InsertAssessmentPdf): Promise<AssessmentPdf>;
  getAssessmentPdf(assessmentId: string, type?: string): Promise<AssessmentPdf | undefined>;
  incrementPdfDownload(pdfId: string): Promise<void>;

  createInsight(data: InsertInsight): Promise<Insight>;
  createInsights(data: InsertInsight[]): Promise<void>;
  getInsightsByAdvisor(advisorId: string, options?: { limit?: number; offset?: number; dismissed?: boolean }): Promise<Insight[]>;
  getInsightsByClient(clientId: string, options?: { type?: string; severity?: string }): Promise<Insight[]>;
  getInsightById(id: string): Promise<Insight | undefined>;
  markInsightRead(id: string): Promise<void>;
  dismissInsight(id: string): Promise<void>;
  deleteExpiredInsights(): Promise<number>;
  deleteInsightsByAdvisor(advisorId: string, excludeDismissed?: boolean): Promise<number>;
  getInsightsDashboard(advisorId: string): Promise<{ high: number; medium: number; low: number; total: number; recent: Insight[] }>;
  getInsightOpportunities(advisorId: string): Promise<{ opportunities: Insight[]; totalEstimatedValue: number }>;

  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByClient(clientId: string): Promise<Document[]>;
  createDocument(doc: InsertDocument): Promise<Document>;

  getComplianceItems(advisorId: string): Promise<ComplianceItem[]>;
  getComplianceItemsByClient(clientId: string): Promise<ComplianceItem[]>;
  createComplianceItem(item: InsertComplianceItem): Promise<ComplianceItem>;
  updateComplianceItem(id: string, data: Partial<ComplianceItem>): Promise<ComplianceItem | undefined>;

  getLifeEvent(id: string): Promise<LifeEvent | undefined>;
  getLifeEvents(clientId: string): Promise<LifeEvent[]>;
  createLifeEvent(event: InsertLifeEvent): Promise<LifeEvent>;

  getAlternativeAssetsByClient(clientId: string): Promise<AlternativeAsset[]>;

  getDocumentChecklist(clientId: string): Promise<DocumentChecklistItem[]>;
  createDocumentChecklistItem(item: InsertDocumentChecklistItem): Promise<DocumentChecklistItem>;
  updateDocumentChecklistItem(id: string, data: Partial<DocumentChecklistItem>): Promise<DocumentChecklistItem | undefined>;

  getAllAdvisors(): Promise<Advisor[]>;
  updateAdvisor(id: string, data: Partial<Advisor>): Promise<Advisor | undefined>;

  getAdvisorByEmail(email: string): Promise<Advisor | undefined>;

  getAssociate(id: string): Promise<Associate | undefined>;
  getAssociateByEmail(email: string): Promise<Associate | undefined>;
  getAllAssociates(): Promise<Associate[]>;
  createAssociate(associate: InsertAssociate): Promise<Associate>;
  updateAssociate(id: string, data: Partial<Associate>): Promise<Associate | undefined>;
  deleteAssociate(id: string): Promise<void>;

  getClientTeamMembers(clientId: string): Promise<(ClientTeamMember & { associate: Associate })[]>;
  getClientsByAssociate(associateId: string): Promise<Client[]>;
  addClientTeamMember(member: InsertClientTeamMember): Promise<ClientTeamMember>;
  removeClientTeamMember(id: string): Promise<void>;

  getWorkflowTemplates(advisorId: string): Promise<WorkflowTemplate[]>;
  getWorkflowTemplate(id: string): Promise<WorkflowTemplate | undefined>;
  createWorkflowTemplate(template: InsertWorkflowTemplate): Promise<WorkflowTemplate>;
  updateWorkflowTemplate(id: string, data: Partial<WorkflowTemplate>): Promise<WorkflowTemplate | undefined>;
  deleteWorkflowTemplate(id: string): Promise<void>;

  getClientWorkflows(clientId: string): Promise<ClientWorkflow[]>;
  getAllClientWorkflows(advisorId: string): Promise<ClientWorkflow[]>;
  getAllClientWorkflowsWithClients(advisorId: string): Promise<{ workflow: ClientWorkflow; firstName: string; lastName: string }[]>;
  getClientWorkflow(id: string): Promise<ClientWorkflow | undefined>;
  createClientWorkflow(workflow: InsertClientWorkflow): Promise<ClientWorkflow>;
  updateClientWorkflow(id: string, data: Partial<ClientWorkflow>): Promise<ClientWorkflow | undefined>;

  getDiagnosticConfigs(): Promise<DiagnosticConfig[]>;
  getActiveDiagnosticConfig(): Promise<DiagnosticConfig | undefined>;
  getDiagnosticConfig(id: string): Promise<DiagnosticConfig | undefined>;
  createDiagnosticConfig(config: InsertDiagnosticConfig): Promise<DiagnosticConfig>;
  updateDiagnosticConfig(id: string, data: Partial<DiagnosticConfig>): Promise<DiagnosticConfig | undefined>;
  deleteDiagnosticConfig(id: string): Promise<void>;

  getDiagnosticResults(clientId: string): Promise<DiagnosticResult[]>;
  getDiagnosticResult(id: string): Promise<DiagnosticResult | undefined>;
  createDiagnosticResult(result: InsertDiagnosticResult): Promise<DiagnosticResult>;
  deleteDiagnosticResult(id: string): Promise<void>;

  getTranscriptConfigs(): Promise<TranscriptConfig[]>;
  getActiveTranscriptConfig(): Promise<TranscriptConfig | undefined>;
  getTranscriptConfig(id: string): Promise<TranscriptConfig | undefined>;
  createTranscriptConfig(config: InsertTranscriptConfig): Promise<TranscriptConfig>;
  updateTranscriptConfig(id: string, data: Partial<TranscriptConfig>): Promise<TranscriptConfig | undefined>;
  deleteTranscriptConfig(id: string): Promise<void>;

  getMeetingPrepConfigs(): Promise<MeetingPrepConfig[]>;
  getActiveMeetingPrepConfig(): Promise<MeetingPrepConfig | undefined>;
  createMeetingPrepConfig(config: InsertMeetingPrepConfig): Promise<MeetingPrepConfig>;
  updateMeetingPrepConfig(id: string, data: Partial<MeetingPrepConfig>): Promise<MeetingPrepConfig | undefined>;
  deleteMeetingPrepConfig(id: string): Promise<void>;

  getMeetingSummaryConfigs(): Promise<MeetingSummaryConfig[]>;
  getActiveMeetingSummaryConfig(): Promise<MeetingSummaryConfig | undefined>;
  createMeetingSummaryConfig(config: InsertMeetingSummaryConfig): Promise<MeetingSummaryConfig>;
  updateMeetingSummaryConfig(id: string, data: Partial<MeetingSummaryConfig>): Promise<MeetingSummaryConfig | undefined>;
  deleteMeetingSummaryConfig(id: string): Promise<void>;

  getDocumentClassificationConfigs(): Promise<DocumentClassificationConfig[]>;
  getActiveDocumentClassificationConfig(): Promise<DocumentClassificationConfig | undefined>;
  createDocumentClassificationConfig(config: InsertDocumentClassificationConfig): Promise<DocumentClassificationConfig>;
  updateDocumentClassificationConfig(id: string, data: Partial<DocumentClassificationConfig>): Promise<DocumentClassificationConfig | undefined>;
  deleteDocumentClassificationConfig(id: string): Promise<void>;

  getMonteCarloScenarios(clientId: string): Promise<MonteCarloScenario[]>;
  getMonteCarloScenario(id: string): Promise<MonteCarloScenario | undefined>;
  createMonteCarloScenario(scenario: InsertMonteCarloScenario): Promise<MonteCarloScenario>;
  updateMonteCarloScenario(id: string, data: Partial<MonteCarloScenario>): Promise<MonteCarloScenario | undefined>;
  deleteMonteCarloScenario(id: string): Promise<void>;
  getScenarioEvents(scenarioId: string): Promise<ScenarioEvent[]>;
  createScenarioEvent(event: InsertScenarioEvent): Promise<ScenarioEvent>;
  deleteScenarioEvent(id: string): Promise<void>;

  getComplianceReviews(clientId: string): Promise<ComplianceReview[]>;
  getComplianceReview(id: string): Promise<ComplianceReview | undefined>;
  createComplianceReview(review: InsertComplianceReview): Promise<ComplianceReview>;
  updateComplianceReview(id: string, data: Partial<ComplianceReview>): Promise<ComplianceReview | undefined>;
  getComplianceReviewEvents(reviewId: string): Promise<ComplianceReviewEvent[]>;
  createComplianceReviewEvent(event: InsertComplianceReviewEvent): Promise<ComplianceReviewEvent>;

  recordLoginEvent(data: { userId: string; userType: string; userName: string; userEmail: string; ipAddress?: string; deviceInfo?: string; mfaStatus?: boolean; status?: string }): Promise<LoginEvent>;
  getLoginEvents(days?: number): Promise<LoginEvent[]>;
  recordLogout(loginEventId: string): Promise<LoginEvent | undefined>;
  getLoginEventsByAdvisor(advisorId: string, limit?: number, offset?: number): Promise<{ events: LoginEvent[]; total: number }>;

  getTask(id: string): Promise<Task | undefined>;
  setSalesforceTaskId(taskId: string, salesforceTaskId: string): Promise<void>;
  setSalesforceMeetingId(meetingId: string, salesforceEventId: string): Promise<void>;
  updateTaskSyncStatus(taskId: string, status: string): Promise<void>;
  updateMeetingSalesforceSyncStatus(meetingId: string, status: string): Promise<void>;
  updateMeetingOutlookSyncStatus(meetingId: string, status: string): Promise<void>;
  getClientBySalesforceContactId(sfContactId: string): Promise<Client | undefined>;
  getAccountBySalesforceId(sfAccountId: string): Promise<Account | undefined>;
  getAccountByOrionId(orionAccountId: string): Promise<Account | undefined>;
  getTasksWithSalesforceIds(): Promise<Task[]>;
  getMeetingsWithSalesforceIds(): Promise<Meeting[]>;
  getTasksWithSyncStatus(status: string): Promise<Task[]>;
  getMeetingsWithSyncStatus(status: string): Promise<Meeting[]>;
  setOutlookEventId(meetingId: string, outlookEventId: string): Promise<void>;
  getMeetingByOutlookEventId(outlookEventId: string): Promise<Meeting | undefined>;
  getMeetingByZoomMeetingId(zoomMeetingId: string): Promise<Meeting | undefined>;

  getMeetingsByDateRange(advisorId: string, startDate: string, endDate: string): Promise<Meeting[]>;
  checkMeetingConflicts(advisorId: string, startTime: string, endTime: string, excludeMeetingId?: string): Promise<Meeting[]>;

  createMeetingNote(note: InsertMeetingNote): Promise<MeetingNote>;
  getMeetingNotesByMeeting(meetingId: string): Promise<MeetingNote[]>;

  createRecurringTask(config: InsertRecurringTask): Promise<RecurringTask>;
  getRecurringTasksByAdvisor(advisorId: string): Promise<RecurringTask[]>;
  getRecurringTaskByTaskId(taskId: string): Promise<RecurringTask | undefined>;
  updateRecurringTask(id: string, data: Partial<RecurringTask>): Promise<RecurringTask | undefined>;

  getOverdueTasks(advisorId: string): Promise<Task[]>;
  getUpcomingTasks(advisorId: string, days?: number): Promise<Task[]>;
  completeTask(id: string): Promise<Task | undefined>;

  createSalesforceSyncLog(data: InsertSalesforceSyncLog): Promise<SalesforceSyncLog>;
  getRecentSalesforceSyncLogs(limit: number): Promise<SalesforceSyncLog[]>;
  createOrionSyncLog(data: InsertOrionSyncLog): Promise<OrionSyncLog>;
  getRecentOrionSyncLogs(limit: number): Promise<OrionSyncLog[]>;
  createOrionReconciliationReport(data: InsertOrionReconciliationReport): Promise<OrionReconciliationReportRow>;
  createEmailLog(data: InsertEmailLog): Promise<EmailLog>;
  createZoomRecording(data: InsertZoomRecording): Promise<ZoomRecording>;
  updateZoomRecording(id: string, data: Partial<ZoomRecording>): Promise<ZoomRecording | undefined>;
  createMeetingTranscript(data: InsertMeetingTranscript): Promise<MeetingTranscript>;

  getFeatureFlags(): Promise<FeatureFlag[]>;
  getFeatureFlag(key: string): Promise<FeatureFlag | undefined>;
  createFeatureFlag(flag: InsertFeatureFlag): Promise<FeatureFlag>;
  updateFeatureFlag(key: string, data: Partial<FeatureFlag>): Promise<FeatureFlag | undefined>;

  createPilotFeedback(feedback: InsertPilotFeedback): Promise<PilotFeedback>;
  getPilotFeedback(): Promise<PilotFeedback[]>;
  getPilotFeedbackStats(): Promise<{ type: string; count: number }[]>;

  createSurveyResponse(data: InsertSurveyResponse): Promise<SurveyResponse>;
  getSurveyResponses(days?: number): Promise<SurveyResponse[]>;
  getSurveyStats(): Promise<{ avgRating: number; totalResponses: number }>;

  recordHealthCheck(data: InsertHealthCheckEvent): Promise<void>;
  getHealthChecks(days?: number): Promise<HealthCheckEvent[]>;

  createGateSignoff(data: InsertGateSignoff): Promise<GateSignoff>;
  getGateSignoffs(): Promise<GateSignoff[]>;

  createTriggerCategory(data: InsertTriggerCategory): Promise<TriggerCategory>;
  getTriggerCategory(id: string): Promise<TriggerCategory | undefined>;
  getTriggerCategories(): Promise<TriggerCategory[]>;
  getTriggerCategoryByName(name: string): Promise<TriggerCategory | undefined>;
  updateTriggerCategory(id: string, data: Partial<TriggerCategory>): Promise<TriggerCategory | undefined>;
  toggleTriggerCategoryActive(id: string, isActive: boolean): Promise<void>;
  createTriggerAction(data: InsertTriggerAction): Promise<TriggerAction>;
  getTriggerActionsForEvent(lifeEventId: string): Promise<TriggerAction[]>;
  updateLifeEvent(id: string, data: Partial<LifeEvent>): Promise<LifeEvent | undefined>;

  getAllInvestorProfiles(): Promise<InvestorProfile[]>;
  getExistingReminder(profileId: string, remindDays: number): Promise<Task | undefined>;

  createInvestorProfile(data: InsertInvestorProfile): Promise<InvestorProfile>;
  getInvestorProfile(id: string): Promise<InvestorProfile | undefined>;
  getInvestorProfilesByClient(clientId: string): Promise<InvestorProfile[]>;
  updateInvestorProfile(id: string, data: Partial<InvestorProfile>): Promise<InvestorProfile | undefined>;
  deleteInvestorProfile(id: string): Promise<void>;
  saveDraft(profileId: string, answers: Record<string, any>): Promise<void>;
  getDraft(profileId: string): Promise<Record<string, any> | undefined>;
  createProfileVersion(versionData: InsertInvestorProfileVersion): Promise<InvestorProfileVersion>;
  getProfileVersions(profileId: string): Promise<InvestorProfileVersion[]>;
  getProfileVersion(versionId: string): Promise<InvestorProfileVersion | undefined>;
  createQuestionSchema(data: InsertInvestorProfileQuestionSchema): Promise<InvestorProfileQuestionSchema>;
  getQuestionSchema(id: string): Promise<InvestorProfileQuestionSchema | undefined>;
  getActiveQuestionSchemas(profileType: string): Promise<InvestorProfileQuestionSchema[]>;
  getAllQuestionSchemas(profileType?: string): Promise<InvestorProfileQuestionSchema[]>;
  updateQuestionSchema(id: string, data: Partial<InvestorProfileQuestionSchema>): Promise<InvestorProfileQuestionSchema | undefined>;
  toggleSchemaActive(id: string, isActive: boolean): Promise<void>;

  getFinancialGoalsByClient(clientId: string): Promise<FinancialGoal[]>;
  getFinancialGoalsByAdvisor(advisorId: string): Promise<FinancialGoal[]>;
  getFinancialGoal(id: string): Promise<FinancialGoal | undefined>;
  createFinancialGoal(goal: InsertFinancialGoal): Promise<FinancialGoal>;
  updateFinancialGoal(id: string, data: Partial<FinancialGoal>): Promise<FinancialGoal | undefined>;
  deleteFinancialGoal(id: string): Promise<void>;

  getDiscoveryQuestionnaires(advisorId: string): Promise<DiscoveryQuestionnaire[]>;
  getDiscoveryQuestionnaire(id: string): Promise<DiscoveryQuestionnaire | undefined>;
  getDiscoveryQuestionnairesByType(advisorId: string, clientType: string): Promise<DiscoveryQuestionnaire[]>;
  createDiscoveryQuestionnaire(data: InsertDiscoveryQuestionnaire): Promise<DiscoveryQuestionnaire>;
  updateDiscoveryQuestionnaire(id: string, data: Partial<DiscoveryQuestionnaire>): Promise<DiscoveryQuestionnaire | undefined>;
  deleteDiscoveryQuestionnaire(id: string): Promise<void>;

  getDiscoverySessions(advisorId: string): Promise<DiscoverySession[]>;
  getDiscoverySession(id: string): Promise<DiscoverySession | undefined>;
  getDiscoverySessionsByClient(clientId: string): Promise<DiscoverySession[]>;
  createDiscoverySession(data: InsertDiscoverySession): Promise<DiscoverySession>;
  updateDiscoverySession(id: string, data: Partial<DiscoverySession>): Promise<DiscoverySession | undefined>;
  deleteDiscoverySession(id: string): Promise<void>;

  getTrustsByClient(clientId: string): Promise<Trust[]>;
  getTrust(id: string): Promise<Trust | undefined>;
  createTrust(data: InsertTrust): Promise<Trust>;
  updateTrust(id: string, data: Partial<Trust>): Promise<Trust | undefined>;
  deleteTrust(id: string): Promise<void>;

  getTrustRelationships(trustId: string): Promise<TrustRelationship[]>;
  getTrustRelationship(id: string): Promise<TrustRelationship | undefined>;
  createTrustRelationship(data: InsertTrustRelationship): Promise<TrustRelationship>;
  deleteTrustRelationship(id: string): Promise<void>;

  getEstateExemptions(clientId: string): Promise<EstateExemption[]>;
  getEstateExemption(id: string): Promise<EstateExemption | undefined>;
  createEstateExemption(data: InsertEstateExemption): Promise<EstateExemption>;
  updateEstateExemption(id: string, data: Partial<EstateExemption>): Promise<EstateExemption | undefined>;

  getGiftHistory(clientId: string): Promise<GiftHistoryEntry[]>;
  getGiftHistoryEntry(id: string): Promise<GiftHistoryEntry | undefined>;
  createGiftHistoryEntry(data: InsertGiftHistory): Promise<GiftHistoryEntry>;
  deleteGiftHistoryEntry(id: string): Promise<void>;

  createFiduciaryValidationLog(data: InsertFiduciaryValidationLog): Promise<FiduciaryValidationLog>;
  getFiduciaryValidationLogs(options?: { advisorId?: string; clientId?: string; outcome?: string; limit?: number; offset?: number }): Promise<FiduciaryValidationLog[]>;
  getFiduciaryValidationLog(id: string): Promise<FiduciaryValidationLog | undefined>;
  resolveFiduciaryValidation(id: string, resolvedBy: string, resolutionNote: string): Promise<FiduciaryValidationLog | undefined>;
  getFiduciaryValidationStats(advisorId?: string): Promise<{ total: number; clean: number; flagged: number; blocked: number; resolved: number; violationPatterns: Array<{ ruleId: string; ruleName: string; category: string; count: number }>; recentTrend: Array<{ date: string; total: number; flagged: number; blocked: number }> }>;

  getFiduciaryRuleConfig(advisorId?: string): Promise<FiduciaryRuleConfig | undefined>;
  upsertFiduciaryRuleConfig(data: InsertFiduciaryRuleConfig): Promise<FiduciaryRuleConfig>;

  createBehavioralAnalysis(data: InsertBehavioralAnalysis): Promise<BehavioralAnalysis>;
  getBehavioralAnalysesByClient(clientId: string): Promise<BehavioralAnalysis[]>;
  getBehavioralAnalysesByAdvisor(advisorId: string): Promise<BehavioralAnalysis[]>;
  getLatestBehavioralAnalysis(clientId: string): Promise<BehavioralAnalysis | undefined>;

  createPendingProfileUpdate(data: InsertPendingProfileUpdate): Promise<PendingProfileUpdate>;
  getPendingProfileUpdates(advisorId: string, status?: string): Promise<PendingProfileUpdate[]>;
  getPendingProfileUpdate(id: string): Promise<PendingProfileUpdate | undefined>;
  updatePendingProfileUpdate(id: string, data: Partial<PendingProfileUpdate>): Promise<PendingProfileUpdate | undefined>;
  getPendingProfileUpdatesByClient(clientId: string): Promise<PendingProfileUpdate[]>;

  getWithdrawalRequests(advisorId: string, status?: string): Promise<WithdrawalRequest[]>;
  getWithdrawalRequest(id: string): Promise<WithdrawalRequest | undefined>;
  createWithdrawalRequest(data: InsertWithdrawalRequest): Promise<WithdrawalRequest>;
  updateWithdrawalRequest(id: string, data: Partial<WithdrawalRequest>): Promise<WithdrawalRequest | undefined>;
  getWithdrawalAuditLog(withdrawalId: string): Promise<WithdrawalAuditLog[]>;
  createWithdrawalAuditEntry(data: InsertWithdrawalAuditLog): Promise<WithdrawalAuditLog>;

  getSopDocuments(status?: string): Promise<SopDocument[]>;
  getSopDocument(id: string): Promise<SopDocument | undefined>;
  createSopDocument(doc: InsertSopDocument): Promise<SopDocument>;
  updateSopDocument(id: string, data: Partial<SopDocument>): Promise<SopDocument | undefined>;
  deleteSopDocument(id: string): Promise<void>;
  getSopChunks(documentId: string): Promise<SopChunk[]>;
  getAllSopChunks(): Promise<SopChunk[]>;
  createSopChunk(chunk: InsertSopChunk): Promise<SopChunk>;
  deleteSopChunksByDocument(documentId: string): Promise<void>;
  searchSopChunks(query: string, limit?: number): Promise<(SopChunk & { documentTitle?: string; documentCategory?: string })[]>;

  getCustodialInstructions(filters?: { custodian?: string; actionType?: string }): Promise<CustodialInstruction[]>;
  getCustodialInstruction(id: string): Promise<CustodialInstruction | undefined>;
  createCustodialInstruction(instr: InsertCustodialInstruction): Promise<CustodialInstruction>;
  updateCustodialInstruction(id: string, data: Partial<CustodialInstruction>): Promise<CustodialInstruction | undefined>;
  deleteCustodialInstruction(id: string): Promise<void>;

  getKycRiskRating(clientId: string): Promise<KycRiskRating | undefined>;
  getKycRiskRatingsByAdvisor(advisorId: string): Promise<KycRiskRating[]>;
  createKycRiskRating(data: InsertKycRiskRating): Promise<KycRiskRating>;
  updateKycRiskRating(id: string, data: Partial<KycRiskRating>): Promise<KycRiskRating | undefined>;

  getAmlScreeningResults(clientId: string): Promise<AmlScreeningResult[]>;
  getAmlScreeningResultsByAdvisor(advisorId: string): Promise<AmlScreeningResult[]>;
  createAmlScreeningResult(data: InsertAmlScreeningResult): Promise<AmlScreeningResult>;
  updateAmlScreeningResult(id: string, data: Partial<AmlScreeningResult>): Promise<AmlScreeningResult | undefined>;

  getKycReviewSchedule(clientId: string): Promise<KycReviewSchedule | undefined>;
  getKycReviewSchedulesByAdvisor(advisorId: string): Promise<KycReviewSchedule[]>;
  createKycReviewSchedule(data: InsertKycReviewSchedule): Promise<KycReviewSchedule>;
  updateKycReviewSchedule(id: string, data: Partial<KycReviewSchedule>): Promise<KycReviewSchedule | undefined>;

  getEddRecords(clientId: string): Promise<EddRecord[]>;
  getEddRecordsByAdvisor(advisorId: string): Promise<EddRecord[]>;
  getEddRecord(id: string): Promise<EddRecord | undefined>;
  createEddRecord(data: InsertEddRecord): Promise<EddRecord>;
  updateEddRecord(id: string, data: Partial<EddRecord>): Promise<EddRecord | undefined>;

  getKycAuditLog(clientId: string): Promise<KycAuditLogEntry[]>;
  getKycAuditLogByAdvisor(advisorId: string): Promise<KycAuditLogEntry[]>;
  createKycAuditLog(data: InsertKycAuditLog): Promise<KycAuditLogEntry>;

  getAllOfacSdnEntries(): Promise<OfacSdnEntry[]>;
  createOfacSdnEntry(data: InsertOfacSdnEntry): Promise<OfacSdnEntry>;
  bulkCreateOfacSdnEntries(data: InsertOfacSdnEntry[]): Promise<number>;
  clearOfacSdnEntries(): Promise<void>;
  getOfacSdnEntryCount(): Promise<number>;

  getAllPepEntries(): Promise<PepEntry[]>;
  createPepEntry(data: InsertPepEntry): Promise<PepEntry>;
  bulkCreatePepEntries(data: InsertPepEntry[]): Promise<number>;
  clearPepEntries(): Promise<void>;
  getPepEntryCount(): Promise<number>;

  getScreeningConfig(advisorId: string): Promise<ScreeningConfig | undefined>;
  createScreeningConfig(data: InsertScreeningConfig): Promise<ScreeningConfig>;
  updateScreeningConfig(id: string, data: Partial<ScreeningConfig>): Promise<ScreeningConfig | undefined>;

  createEngagementEvent(data: InsertEngagementEvent): Promise<EngagementEvent>;
  getEngagementEventsByClient(clientId: string, limit?: number): Promise<EngagementEvent[]>;
  getEngagementEventsByAdvisor(advisorId: string, limit?: number): Promise<EngagementEvent[]>;

  upsertEngagementScore(data: InsertEngagementScore): Promise<EngagementScore>;
  getEngagementScore(clientId: string): Promise<EngagementScore | undefined>;
  getEngagementScoresByAdvisor(advisorId: string): Promise<EngagementScore[]>;

  createIntentSignal(data: InsertIntentSignal): Promise<IntentSignal>;
  getActiveIntentSignals(advisorId: string): Promise<IntentSignal[]>;
  getIntentSignalsByClient(clientId: string): Promise<IntentSignal[]>;
  deactivateIntentSignal(id: string): Promise<void>;

  createNextBestAction(data: InsertNextBestAction): Promise<NextBestAction>;
  getNextBestActions(advisorId: string, status?: string): Promise<NextBestAction[]>;
  getNextBestActionsByClient(clientId: string): Promise<NextBestAction[]>;
  updateNextBestAction(id: string, data: Partial<NextBestAction>): Promise<NextBestAction | undefined>;
  completeNextBestAction(id: string): Promise<NextBestAction | undefined>;
  dismissNextBestAction(id: string): Promise<NextBestAction | undefined>;

  getCharitableAccountsByClient(clientId: string): Promise<CharitableAccount[]>;
  getCharitableAccount(id: string): Promise<CharitableAccount | undefined>;
  createCharitableAccount(data: InsertCharitableAccount): Promise<CharitableAccount>;
  updateCharitableAccount(id: string, data: Partial<CharitableAccount>): Promise<CharitableAccount | undefined>;
  deleteCharitableAccount(id: string): Promise<void>;

  getContributionsByAccount(accountId: string): Promise<CharitableContribution[]>;
  createCharitableContribution(data: InsertCharitableContribution): Promise<CharitableContribution>;
  deleteCharitableContribution(id: string): Promise<void>;

  getGrantsByAccount(accountId: string): Promise<CharitableGrant[]>;
  createCharitableGrant(data: InsertCharitableGrant): Promise<CharitableGrant>;
  deleteCharitableGrant(id: string): Promise<void>;

  getCharitableGoalsByClient(clientId: string): Promise<CharitableGoal[]>;
  getCharitableGoal(id: string): Promise<CharitableGoal | undefined>;
  createCharitableGoal(data: InsertCharitableGoal): Promise<CharitableGoal>;
  updateCharitableGoal(id: string, data: Partial<CharitableGoal>): Promise<CharitableGoal | undefined>;
  deleteCharitableGoal(id: string): Promise<void>;

  getResearchArticles(options?: { topic?: string; source?: string; search?: string; limit?: number; offset?: number }): Promise<ResearchArticle[]>;
  getResearchArticle(id: string): Promise<ResearchArticle | undefined>;
  getResearchArticleByUrl(url: string): Promise<ResearchArticle | undefined>;
  getResearchArticleByContentHash(hash: string): Promise<ResearchArticle | undefined>;
  createResearchArticle(data: InsertResearchArticle): Promise<ResearchArticle>;
  updateResearchArticle(id: string, data: Partial<ResearchArticle>): Promise<ResearchArticle | undefined>;
  deleteResearchArticle(id: string): Promise<void>;
  getResearchArticlesByTopics(topics: string[]): Promise<ResearchArticle[]>;

  getResearchBriefsByArticle(articleId: string, advisorId: string): Promise<ResearchBrief[]>;
  getResearchBrief(id: string): Promise<ResearchBrief | undefined>;
  createResearchBrief(data: InsertResearchBrief): Promise<ResearchBrief>;
  updateResearchBrief(id: string, data: Partial<ResearchBrief>): Promise<ResearchBrief | undefined>;
  deleteResearchBrief(id: string, advisorId: string): Promise<void>;
  getResearchBriefs(advisorId: string, options?: { limit?: number; offset?: number; search?: string }): Promise<ResearchBrief[]>;

  getResearchFeeds(): Promise<ResearchFeed[]>;
  getResearchFeed(id: string): Promise<ResearchFeed | undefined>;
  getActiveResearchFeeds(): Promise<ResearchFeed[]>;
  createResearchFeed(data: InsertResearchFeed): Promise<ResearchFeed>;
  updateResearchFeed(id: string, data: Partial<ResearchFeed>): Promise<ResearchFeed | undefined>;
  deleteResearchFeed(id: string): Promise<void>;

  getTaxLotsByClient(clientId: string): Promise<TaxLot[]>;
  getTaxLotsByAccount(accountId: string): Promise<TaxLot[]>;
  getTaxLot(id: string): Promise<TaxLot | undefined>;
  createTaxLot(data: InsertTaxLot): Promise<TaxLot>;
  updateTaxLot(id: string, data: Partial<TaxLot>): Promise<TaxLot | undefined>;

  getDirectIndexPortfoliosByClient(clientId: string): Promise<DirectIndexPortfolio[]>;
  getDirectIndexPortfolio(id: string): Promise<DirectIndexPortfolio | undefined>;
  createDirectIndexPortfolio(data: InsertDirectIndexPortfolio): Promise<DirectIndexPortfolio>;
  updateDirectIndexPortfolio(id: string, data: Partial<DirectIndexPortfolio>): Promise<DirectIndexPortfolio | undefined>;

  getWashSaleEventsByClient(clientId: string): Promise<WashSaleEvent[]>;
  createWashSaleEvent(data: InsertWashSaleEvent): Promise<WashSaleEvent>;
  getSocialProfilesByClient(clientId: string): Promise<SocialProfile[]>;
  getSocialProfile(id: string): Promise<SocialProfile | undefined>;
  createSocialProfile(data: InsertSocialProfile): Promise<SocialProfile>;
  updateSocialProfile(id: string, data: Partial<SocialProfile>): Promise<SocialProfile | undefined>;
  deleteSocialProfile(id: string): Promise<void>;

  getSocialEventsByClient(clientId: string): Promise<SocialEvent[]>;
  getSocialEventsByProfile(profileId: string): Promise<SocialEvent[]>;
  getSocialEvent(id: string): Promise<SocialEvent | undefined>;
  createSocialEvent(data: InsertSocialEvent): Promise<SocialEvent>;
  updateSocialEvent(id: string, data: Partial<SocialEvent>): Promise<SocialEvent | undefined>;

  getNigoRecords(advisorId: string, status?: string): Promise<NigoRecord[]>;
  getNigoRecord(id: string): Promise<NigoRecord | undefined>;
  createNigoRecord(data: InsertNigoRecord): Promise<NigoRecord>;
  updateNigoRecord(id: string, data: Partial<NigoRecord>): Promise<NigoRecord | undefined>;
  getNigoRecordsByCustodian(advisorId: string, custodian: string): Promise<NigoRecord[]>;

  getBusinessEntitiesByClient(clientId: string): Promise<BusinessEntity[]>;
  getBusinessEntity(id: string): Promise<BusinessEntity | undefined>;
  createBusinessEntity(data: InsertBusinessEntity): Promise<BusinessEntity>;
  updateBusinessEntity(id: string, data: Partial<BusinessEntity>): Promise<BusinessEntity | undefined>;
  deleteBusinessEntity(id: string): Promise<void>;

  getBusinessValuations(businessEntityId: string): Promise<BusinessValuation[]>;
  createBusinessValuation(data: InsertBusinessValuation): Promise<BusinessValuation>;
  deleteBusinessValuation(id: string): Promise<void>;

  getBuySellAgreements(businessEntityId: string): Promise<BuySellAgreement[]>;

  getBusinessValuationsByClient(clientId: string): Promise<BusinessValuation[]>;
  getBusinessValuation(id: string): Promise<BusinessValuation | undefined>;
  updateBusinessValuation(id: string, data: Partial<BusinessValuation>): Promise<BusinessValuation | undefined>;

  getFlpStructuresByClient(clientId: string): Promise<FlpStructure[]>;
  getFlpStructure(id: string): Promise<FlpStructure | undefined>;
  createFlpStructure(data: InsertFlpStructure): Promise<FlpStructure>;
  updateFlpStructure(id: string, data: Partial<FlpStructure>): Promise<FlpStructure | undefined>;
  deleteFlpStructure(id: string): Promise<void>;

  getBuySellAgreementsByClient(clientId: string): Promise<BuySellAgreement[]>;
  getBuySellAgreement(id: string): Promise<BuySellAgreement | undefined>;
  createBuySellAgreement(data: InsertBuySellAgreement): Promise<BuySellAgreement>;
  updateBuySellAgreement(id: string, data: Partial<BuySellAgreement>): Promise<BuySellAgreement | undefined>;
  deleteBuySellAgreement(id: string): Promise<void>;

  getExitPlanMilestones(businessEntityId: string): Promise<ExitPlanMilestone[]>;
  createExitPlanMilestone(data: InsertExitPlanMilestone): Promise<ExitPlanMilestone>;
  updateExitPlanMilestone(id: string, data: Partial<ExitPlanMilestone>): Promise<ExitPlanMilestone | undefined>;
  deleteExitPlanMilestone(id: string): Promise<void>;

  getExitMilestonesByClient(clientId: string): Promise<ExitMilestone[]>;
  getExitMilestone(id: string): Promise<ExitMilestone | undefined>;
  createExitMilestone(data: InsertExitMilestone): Promise<ExitMilestone>;
  updateExitMilestone(id: string, data: Partial<ExitMilestone>): Promise<ExitMilestone | undefined>;
  deleteExitMilestone(id: string): Promise<void>;

  getDafAccountsByClient(clientId: string): Promise<DafAccount[]>;
  getDafAccount(id: string): Promise<DafAccount | undefined>;
  createDafAccount(data: InsertDafAccount): Promise<DafAccount>;
  updateDafAccount(id: string, data: Partial<DafAccount>): Promise<DafAccount | undefined>;
  deleteDafAccount(id: string): Promise<void>;
  getDafTransactions(dafAccountId: string): Promise<DafTransaction[]>;
  createDafTransaction(data: InsertDafTransaction): Promise<DafTransaction>;
  deleteDafTransaction(id: string): Promise<void>;

  getCrtsByClient(clientId: string): Promise<CharitableRemainderTrust[]>;
  getCrt(id: string): Promise<CharitableRemainderTrust | undefined>;
  createCrt(data: InsertCharitableRemainderTrust): Promise<CharitableRemainderTrust>;
  updateCrt(id: string, data: Partial<CharitableRemainderTrust>): Promise<CharitableRemainderTrust | undefined>;
  deleteCrt(id: string): Promise<void>;

  getQcdRecordsByClient(clientId: string): Promise<QcdRecord[]>;
  getQcdRecord(id: string): Promise<QcdRecord | undefined>;
  createQcdRecord(data: InsertQcdRecord): Promise<QcdRecord>;
  deleteQcdRecord(id: string): Promise<void>;

  getAdvisorAssessmentDefaults(advisorId: string): Promise<AdvisorAssessmentDefaults | undefined>;
  upsertAdvisorAssessmentDefaults(advisorId: string, data: Partial<InsertAdvisorAssessmentDefaults>): Promise<AdvisorAssessmentDefaults>;
  getActiveClientAlerts(clientId: string): Promise<Alert[]>;

  getAllApiKeyMetadata(): Promise<ApiKeyMetadata[]>;
  getApiKeyMetadata(keyName: string): Promise<ApiKeyMetadata | undefined>;
  upsertApiKeyMetadata(keyName: string, data: Partial<InsertApiKeyMetadata>): Promise<ApiKeyMetadata>;
  markApiKeyRotated(keyName: string, rotatedBy?: string): Promise<ApiKeyMetadata | undefined>;

  createAuditLogEntry(entry: InsertAuditLogEntry): Promise<AuditLogEntry>;
  getAuditLog(filters: { action?: string; entityType?: string; entityId?: string; advisorId?: string; startDate?: string; endDate?: string; limit?: number; offset?: number }): Promise<{ logs: AuditLogEntry[]; total: number }>;
  getAuditLogByEntity(entityType: string, entityId: string): Promise<AuditLogEntry[]>;
  getAuditLogByAdvisor(advisorId: string, limit?: number): Promise<AuditLogEntry[]>;

  createFailedLoginAttempt(data: InsertFailedLoginAttempt): Promise<FailedLoginAttempt>;
  getFailedLoginAttempts(filters?: { advisorId?: string; ipAddress?: string; limit?: number; offset?: number }): Promise<FailedLoginAttempt[]>;

  getActivitySummary(advisorId: string, filters?: { startDate?: string; endDate?: string; clientId?: string }): Promise<Record<string, number>>;
  getClientEngagement(advisorId: string, clientId: string): Promise<{ total30Days: number; byType: Record<string, number>; avgDuration: number; lastContactDate: string | null; engagementScore: number }>;
  getAdvisorProductivity(advisorId: string, filters?: { startDate?: string; endDate?: string }): Promise<{ totalActivities: number; byType: Record<string, number>; avgPerDay: number; totalDuration: number }>;
  getActivityTrends(advisorId: string, filters?: { startDate?: string; endDate?: string; period?: string }): Promise<{ date: string; count: number }[]>;

  createExportHistoryRecord(data: InsertExportHistoryRecord): Promise<ExportHistoryRecord>;

  getWorkflowDefinition_v2(id: string): Promise<WorkflowDefinition | undefined>;
  getWorkflowDefinitionBySlug(slug: string): Promise<WorkflowDefinition | undefined>;
  getWorkflowDefinitions_v2(filters?: { category?: string; isActive?: boolean }): Promise<WorkflowDefinition[]>;
  createWorkflowDefinition(data: InsertWorkflowDefinition): Promise<WorkflowDefinition>;
  updateWorkflowDefinition(id: string, data: Partial<WorkflowDefinition>): Promise<WorkflowDefinition | undefined>;

  getWorkflowInstance(id: string): Promise<WorkflowInstance | undefined>;
  getWorkflowInstances(filters?: { advisorId?: string; clientId?: string; status?: string; definitionId?: string; meetingId?: string }): Promise<WorkflowInstance[]>;
  createWorkflowInstance(data: InsertWorkflowInstance): Promise<WorkflowInstance>;
  updateWorkflowInstance(id: string, data: Partial<WorkflowInstance>): Promise<WorkflowInstance | undefined>;

  getWorkflowStepExecution(id: string): Promise<WorkflowStepExecution | undefined>;
  getWorkflowStepExecutions(instanceId: string): Promise<WorkflowStepExecution[]>;
  createWorkflowStepExecution(data: InsertWorkflowStepExecution): Promise<WorkflowStepExecution>;
  updateWorkflowStepExecution(id: string, data: Partial<WorkflowStepExecution>): Promise<WorkflowStepExecution | undefined>;

  getWorkflowGate(id: string): Promise<WorkflowGate | undefined>;
  getWorkflowGatesByInstance(instanceId: string): Promise<WorkflowGate[]>;
  getWorkflowGatesByOwner(ownerId: string, status?: string): Promise<WorkflowGate[]>;
  getOverdueWorkflowGates(): Promise<WorkflowGate[]>;
  createWorkflowGate(data: InsertWorkflowGate): Promise<WorkflowGate>;
  updateWorkflowGate(id: string, data: Partial<WorkflowGate>): Promise<WorkflowGate | undefined>;
}

export class DatabaseStorage implements IStorage {
  get db() {
    return db;
  }

  async getAdvisor(id: string): Promise<Advisor | undefined> {
    const [result] = await db.select().from(advisors).where(eq(advisors.id, id));
    return result;
  }

  async getFirstAdvisor(): Promise<Advisor | undefined> {
    const [result] = await db.select().from(advisors).limit(1);
    return result;
  }

  async createAdvisor(advisor: InsertAdvisor): Promise<Advisor> {
    const [result] = await db.insert(advisors).values(advisor).returning();
    return result;
  }

  async getClients(advisorId: string): Promise<Client[]> {
    return db.select().from(clients).where(eq(clients.advisorId, advisorId)).orderBy(clients.lastName);
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [result] = await db.select().from(clients).where(eq(clients.id, id));
    return result;
  }

  async searchClients(advisorId: string, query: string): Promise<Client[]> {
    return db.select().from(clients).where(
      and(
        eq(clients.advisorId, advisorId),
        or(
          ilike(clients.firstName, `%${query}%`),
          ilike(clients.lastName, `%${query}%`),
          ilike(clients.email, `%${query}%`)
        )
      )
    );
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [result] = await db.insert(clients).values(client).returning();
    return result;
  }

  async updateClient(id: string, data: Partial<Client>): Promise<Client | undefined> {
    const [result] = await db.update(clients).set({ ...data, updatedAt: new Date() }).where(eq(clients.id, id)).returning();
    return result;
  }

  async getHouseholds(advisorId: string): Promise<Household[]> {
    return db.select().from(households).where(eq(households.advisorId, advisorId));
  }

  async getHousehold(id: string): Promise<Household | undefined> {
    const [result] = await db.select().from(households).where(eq(households.id, id));
    return result;
  }

  async getHouseholdMembers(householdId: string): Promise<(HouseholdMember & { client: Client })[]> {
    const results = await db.select({
      id: householdMembers.id,
      householdId: householdMembers.householdId,
      clientId: householdMembers.clientId,
      relationship: householdMembers.relationship,
      client: clients,
    }).from(householdMembers)
      .innerJoin(clients, eq(householdMembers.clientId, clients.id))
      .where(eq(householdMembers.householdId, householdId));
    return results as unknown as (HouseholdMember & { client: Client })[];
  }

  async createHousehold(household: InsertHousehold): Promise<Household> {
    const [result] = await db.insert(households).values(household).returning();
    return result;
  }

  async updateHousehold(id: string, data: Partial<Household>): Promise<Household | undefined> {
    const [result] = await db.update(households).set({ ...data, updatedAt: new Date() }).where(eq(households.id, id)).returning();
    return result;
  }

  async createHouseholdMember(member: InsertHouseholdMember): Promise<HouseholdMember> {
    const [result] = await db.insert(householdMembers).values(member).returning();
    return result;
  }

  async getAccount(id: string): Promise<Account | undefined> {
    const [result] = await db.select().from(accounts).where(eq(accounts.id, id));
    return result;
  }

  async getAccountsByClient(clientId: string): Promise<Account[]> {
    return db.select().from(accounts).where(eq(accounts.clientId, clientId));
  }

  async getAccountsByHousehold(householdId: string): Promise<Account[]> {
    return db.select().from(accounts).where(eq(accounts.householdId, householdId));
  }

  async getAumByClient(clientIds: string[]): Promise<Map<string, { totalAum: number; accountCount: number }>> {
    const result = new Map<string, { totalAum: number; accountCount: number }>();
    if (clientIds.length === 0) return result;
    const rows = await db
      .select({
        clientId: accounts.clientId,
        totalAum: sql<string>`COALESCE(SUM(${accounts.balance}), 0)`,
        accountCount: sql<number>`COUNT(*)::int`,
      })
      .from(accounts)
      .where(inArray(accounts.clientId, clientIds))
      .groupBy(accounts.clientId);
    for (const row of rows) {
      result.set(row.clientId, { totalAum: parseFloat(row.totalAum), accountCount: row.accountCount });
    }
    return result;
  }

  async getAumByHousehold(householdIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (householdIds.length === 0) return result;
    const rows = await db
      .select({
        householdId: accounts.householdId,
        totalAum: sql<string>`COALESCE(SUM(${accounts.balance}), 0)`,
      })
      .from(accounts)
      .where(inArray(accounts.householdId, householdIds))
      .groupBy(accounts.householdId);
    for (const row of rows) {
      if (row.householdId) {
        result.set(row.householdId, parseFloat(row.totalAum));
      }
    }
    return result;
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [result] = await db.insert(accounts).values(account).returning();
    return result;
  }

  async updateAccount(id: string, data: Partial<Account>): Promise<Account | undefined> {
    const [result] = await db.update(accounts).set(data).where(eq(accounts.id, id)).returning();
    return result;
  }

  async getHoldingsByAccount(accountId: string): Promise<Holding[]> {
    return db.select().from(holdings).where(eq(holdings.accountId, accountId));
  }

  async getHoldingsByClient(clientId: string): Promise<Holding[]> {
    const results = await db
      .select({ holdings: holdings })
      .from(holdings)
      .innerJoin(accounts, eq(holdings.accountId, accounts.id))
      .where(eq(accounts.clientId, clientId));
    return results.map(r => r.holdings);
  }

  async createHolding(holding: InsertHolding): Promise<Holding> {
    const [result] = await db.insert(holdings).values(holding).returning();
    return result;
  }

  async upsertHoldingByOrionId(holding: InsertHolding): Promise<Holding> {
    const [result] = await db
      .insert(holdings)
      .values(holding)
      .onConflictDoUpdate({
        target: holdings.orionHoldingId,
        set: {
          ticker: holding.ticker,
          name: holding.name,
          shares: holding.shares,
          marketValue: holding.marketValue,
          costBasis: holding.costBasis,
          unrealizedGainLoss: holding.unrealizedGainLoss,
          weight: holding.weight,
          sector: holding.sector,
          lastOrionSync: holding.lastOrionSync,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getPerformanceByAccount(accountId: string): Promise<Performance[]> {
    return db.select().from(performance).where(eq(performance.accountId, accountId));
  }

  async getPerformanceByHousehold(householdId: string): Promise<Performance[]> {
    return db.select().from(performance).where(eq(performance.householdId, householdId));
  }

  async createPerformance(perf: InsertPerformance): Promise<Performance> {
    const [result] = await db.insert(performance).values(perf).returning();
    return result;
  }

  async upsertPerformanceByAccountPeriod(perf: InsertPerformance): Promise<Performance> {
    const [result] = await db
      .insert(performance)
      .values(perf)
      .onConflictDoUpdate({
        target: [performance.accountId, performance.period],
        set: {
          returnPct: perf.returnPct,
          benchmarkPct: perf.benchmarkPct,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getTransactionsByAccount(accountId: string): Promise<Transaction[]> {
    return db.select().from(transactions).where(eq(transactions.accountId, accountId)).orderBy(desc(transactions.date));
  }

  async createTransaction(tx: InsertTransaction): Promise<Transaction> {
    const [created] = await db.insert(transactions).values(tx).returning();
    return created;
  }

  async upsertTransactionByOrionId(tx: InsertTransaction): Promise<Transaction> {
    const [result] = await db
      .insert(transactions)
      .values(tx)
      .onConflictDoUpdate({
        target: transactions.orionTransactionId,
        set: {
          type: tx.type,
          ticker: tx.ticker,
          description: tx.description,
          shares: tx.shares,
          price: tx.price,
          amount: tx.amount,
          date: tx.date,
        },
      })
      .returning();
    return result;
  }

  async getTransactionsByClient(clientId: string): Promise<Transaction[]> {
    const clientAccounts = await this.getAccountsByClient(clientId);
    const allTx: Transaction[] = [];
    for (const acc of clientAccounts) {
      const tx = await this.getTransactionsByAccount(acc.id);
      allTx.push(...tx);
    }
    return allTx.sort((a, b) => b.date.localeCompare(a.date));
  }

  async getTasks(advisorId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.advisorId, advisorId)).orderBy(desc(tasks.createdAt));
  }

  async getTasksByClient(clientId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.clientId, clientId)).orderBy(desc(tasks.createdAt));
  }

  async getTasksByMeeting(meetingId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.meetingId, meetingId)).orderBy(desc(tasks.createdAt));
  }

  async getTasksByMeetingIds(meetingIds: number[]): Promise<Task[]> {
    if (meetingIds.length === 0) return [];
    return db.select().from(tasks).where(inArray(tasks.meetingId, meetingIds as any)).orderBy(desc(tasks.createdAt));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [result] = await db.insert(tasks).values(task).returning();
    return result;
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task | undefined> {
    const [result] = await db.update(tasks).set({ ...data, updatedAt: new Date() }).where(eq(tasks.id, id)).returning();
    return result;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getMeetings(advisorId: string): Promise<Meeting[]> {
    return db.select().from(meetings).where(eq(meetings.advisorId, advisorId)).orderBy(meetings.startTime);
  }

  async getMeeting(id: string): Promise<Meeting | undefined> {
    const [result] = await db.select().from(meetings).where(eq(meetings.id, id));
    return result;
  }

  async getMeetingsByClient(clientId: string): Promise<Meeting[]> {
    return db.select().from(meetings).where(eq(meetings.clientId, clientId)).orderBy(desc(meetings.startTime));
  }

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    const [result] = await db.insert(meetings).values(meeting).returning();
    return result;
  }

  async updateMeeting(id: string, data: Partial<Meeting>): Promise<Meeting | undefined> {
    const [result] = await db.update(meetings).set({ ...data, updatedAt: new Date() }).where(eq(meetings.id, id)).returning();
    return result;
  }

  async getActivities(advisorId: string): Promise<Activity[]> {
    return db.select().from(activities).where(eq(activities.advisorId, advisorId)).orderBy(desc(activities.date));
  }

  async getActivity(id: string): Promise<Activity | undefined> {
    const [result] = await db.select().from(activities).where(eq(activities.id, id));
    return result;
  }

  async getActivitiesByClient(clientId: string): Promise<Activity[]> {
    return db.select().from(activities).where(eq(activities.clientId, clientId)).orderBy(desc(activities.date));
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [result] = await db.insert(activities).values(activity).returning();
    return result;
  }

  async updateActivity(id: string, data: Partial<Activity>): Promise<Activity | undefined> {
    const [result] = await db.update(activities).set({ ...data, updatedAt: new Date() }).where(eq(activities.id, id)).returning();
    return result;
  }

  async deleteActivity(id: string): Promise<void> {
    await db.delete(activities).where(eq(activities.id, id));
  }

  async getActivitiesByFilters(filters: { advisorId: string; clientId?: string; type?: string; startDate?: string; endDate?: string; limit?: number; offset?: number }): Promise<{ activities: Activity[]; total: number }> {
    const conditions = [eq(activities.advisorId, filters.advisorId)];
    if (filters.clientId) conditions.push(eq(activities.clientId, filters.clientId));
    if (filters.type) conditions.push(eq(activities.type, filters.type));
    if (filters.startDate) conditions.push(gte(activities.date, filters.startDate));
    if (filters.endDate) conditions.push(lte(activities.date, filters.endDate));
    const whereClause = and(...conditions);
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(activities).where(whereClause);
    const total = Number(totalResult[0]?.count || 0);
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    const results = await db.select().from(activities).where(whereClause).orderBy(desc(activities.date)).limit(limit).offset(offset);
    return { activities: results, total };
  }

  async getAlerts(advisorId: string): Promise<Alert[]> {
    return db.select().from(alerts).where(eq(alerts.advisorId, advisorId)).orderBy(desc(alerts.createdAt));
  }

  async markAlertRead(id: string, advisorId?: string): Promise<Alert | undefined> {
    const conditions = [eq(alerts.id, id)];
    if (advisorId) conditions.push(eq(alerts.advisorId, advisorId));
    const [result] = await db.update(alerts).set({ isRead: true, updatedAt: new Date() }).where(and(...conditions)).returning();
    return result;
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [result] = await db.insert(alerts).values(alert).returning();
    return result;
  }

  async getFilteredAlerts(advisorId: string, filters: { severity?: string; alertType?: string; clientId?: string; limit?: number; offset?: number }): Promise<Alert[]> {
    const conditions = [eq(alerts.advisorId, advisorId), isNull(alerts.dismissedAt)];

    if (filters.severity) {
      conditions.push(eq(alerts.severity, filters.severity));
    }
    if (filters.alertType) {
      conditions.push(eq(alerts.alertType, filters.alertType));
    }
    if (filters.clientId) {
      conditions.push(eq(alerts.clientId, filters.clientId));
    }

    let query = db.select().from(alerts).where(and(...conditions)).orderBy(desc(alerts.createdAt));

    if (filters.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    if (filters.offset) {
      query = query.offset(filters.offset) as typeof query;
    }

    return query;
  }

  async dismissAlert(id: string, advisorId?: string): Promise<Alert | undefined> {
    const conditions = [eq(alerts.id, id)];
    if (advisorId) conditions.push(eq(alerts.advisorId, advisorId));
    const [result] = await db.update(alerts).set({
      dismissedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(...conditions)).returning();
    return result;
  }

  async getAlertDashboardSummary(advisorId: string): Promise<{ total: number; unread: number; bySeverity: Record<string, number>; byType: Record<string, number>; recent: Alert[] }> {
    const activeAlerts = await db.select().from(alerts)
      .where(and(eq(alerts.advisorId, advisorId), isNull(alerts.dismissedAt)))
      .orderBy(desc(alerts.createdAt));

    const total = activeAlerts.length;
    const unread = activeAlerts.filter(a => !a.isRead).length;
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const alert of activeAlerts) {
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
      if (alert.alertType) {
        byType[alert.alertType] = (byType[alert.alertType] || 0) + 1;
      }
    }

    return { total, unread, bySeverity, byType, recent: activeAlerts.slice(0, 10) };
  }

  async getAlertConfig(advisorId: string): Promise<AlertConfig[]> {
    return db.select().from(alertConfig).where(eq(alertConfig.advisorId, advisorId));
  }

  async upsertAlertConfig(advisorId: string, alertType: string, data: { enabled?: boolean; threshold?: Record<string, unknown> }): Promise<AlertConfig> {
    const existing = await db.select().from(alertConfig)
      .where(and(eq(alertConfig.advisorId, advisorId), eq(alertConfig.alertType, alertType)));

    if (existing.length > 0) {
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (data.enabled !== undefined) updateData.enabled = data.enabled;
      if (data.threshold !== undefined) updateData.threshold = data.threshold;
      const [result] = await db.update(alertConfig).set(updateData)
        .where(and(eq(alertConfig.advisorId, advisorId), eq(alertConfig.alertType, alertType))).returning();
      return result;
    } else {
      const [result] = await db.insert(alertConfig).values({
        advisorId,
        alertType,
        enabled: data.enabled ?? true,
        threshold: data.threshold,
      }).returning();
      return result;
    }
  }

  async getPortfolioTargets(clientId: string): Promise<PortfolioTarget[]> {
    return db.select().from(portfolioTargets).where(eq(portfolioTargets.clientId, clientId));
  }

  async createPortfolioTarget(target: InsertPortfolioTarget): Promise<PortfolioTarget> {
    const [result] = await db.insert(portfolioTargets).values(target).returning();
    return result;
  }

  async getMeetingProcessConfig(advisorId: string): Promise<MeetingProcessingConfig | undefined> {
    const [result] = await db.select().from(meetingProcessingConfig).where(eq(meetingProcessingConfig.advisorId, advisorId));
    return result;
  }

  async upsertMeetingProcessConfig(advisorId: string, data: Partial<InsertMeetingProcessingConfig>): Promise<MeetingProcessingConfig> {
    const existing = await this.getMeetingProcessConfig(advisorId);
    if (existing) {
      const [result] = await db.update(meetingProcessingConfig)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(meetingProcessingConfig.advisorId, advisorId))
        .returning();
      return result;
    } else {
      const [result] = await db.insert(meetingProcessingConfig)
        .values({ advisorId, ...data })
        .returning();
      return result;
    }
  }

  async createAssessment(data: InsertAssessment): Promise<Assessment> {
    const [result] = await db.insert(assessments).values(data).returning();
    return result;
  }

  async getLatestAssessment(clientId: string): Promise<Assessment | undefined> {
    const [result] = await db.select().from(assessments)
      .where(eq(assessments.clientId, clientId))
      .orderBy(desc(assessments.generatedAt))
      .limit(1);
    return result;
  }

  async getAssessmentHistory(clientId: string): Promise<Assessment[]> {
    return db.select().from(assessments)
      .where(eq(assessments.clientId, clientId))
      .orderBy(desc(assessments.generatedAt))
      .limit(20);
  }

  async getAssessment(id: string): Promise<Assessment | undefined> {
    const [result] = await db.select().from(assessments).where(eq(assessments.id, id));
    return result;
  }

  async createAssessmentPdf(data: InsertAssessmentPdf): Promise<AssessmentPdf> {
    const [result] = await db.insert(assessmentPdfs).values(data).returning();
    return result;
  }

  async getAssessmentPdf(assessmentId: string, type?: string): Promise<AssessmentPdf | undefined> {
    const conditions = [eq(assessmentPdfs.assessmentId, assessmentId)];
    if (type) conditions.push(eq(assessmentPdfs.type, type));
    const [result] = await db.select().from(assessmentPdfs).where(and(...conditions)).limit(1);
    return result;
  }

  async incrementPdfDownload(pdfId: string): Promise<void> {
    await db.update(assessmentPdfs)
      .set({
        downloadCount: sql`download_count + 1`,
        lastDownloadedAt: new Date(),
      })
      .where(eq(assessmentPdfs.id, pdfId));
  }

  async createInsight(data: InsertInsight): Promise<Insight> {
    const [result] = await db.insert(insights).values(data).returning();
    return result;
  }

  async createInsights(data: InsertInsight[]): Promise<void> {
    if (data.length === 0) return;
    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
      await db.insert(insights).values(data.slice(i, i + batchSize));
    }
  }

  async getInsightsByAdvisor(advisorId: string, options?: { limit?: number; offset?: number; dismissed?: boolean }): Promise<Insight[]> {
    const conditions = [eq(insights.advisorId, advisorId)];
    if (options?.dismissed === false) conditions.push(eq(insights.isDismissed, false));
    return db.select().from(insights)
      .where(and(...conditions))
      .orderBy(desc(insights.createdAt))
      .limit(options?.limit ?? 50)
      .offset(options?.offset ?? 0);
  }

  async getInsightsByClient(clientId: string, options?: { type?: string; severity?: string }): Promise<Insight[]> {
    const conditions = [eq(insights.clientId, clientId), eq(insights.isDismissed, false)];
    if (options?.type) conditions.push(eq(insights.insightType, options.type));
    if (options?.severity) conditions.push(eq(insights.severity, options.severity));
    return db.select().from(insights)
      .where(and(...conditions))
      .orderBy(desc(insights.createdAt));
  }

  async getInsightById(id: string): Promise<Insight | undefined> {
    const [result] = await db.select().from(insights).where(eq(insights.id, id));
    return result;
  }

  async markInsightRead(id: string): Promise<void> {
    await db.update(insights).set({ isRead: true }).where(eq(insights.id, id));
  }

  async dismissInsight(id: string): Promise<void> {
    await db.update(insights)
      .set({ isDismissed: true, dismissedAt: new Date() })
      .where(eq(insights.id, id));
  }

  async deleteExpiredInsights(): Promise<number> {
    const now = new Date();
    const result = await db.delete(insights).where(sql`${insights.expiresAt} <= ${now}`).returning();
    return result.length;
  }

  async deleteInsightsByAdvisor(advisorId: string, excludeDismissed = true): Promise<number> {
    const conditions = [eq(insights.advisorId, advisorId)];
    if (excludeDismissed) conditions.push(eq(insights.isDismissed, false));
    const result = await db.delete(insights).where(and(...conditions)).returning();
    return result.length;
  }

  async getInsightsDashboard(advisorId: string): Promise<{ high: number; medium: number; low: number; total: number; recent: Insight[] }> {
    const allInsights = await db.select().from(insights)
      .where(and(eq(insights.advisorId, advisorId), eq(insights.isDismissed, false)))
      .orderBy(desc(insights.createdAt));

    const high = allInsights.filter(i => i.severity === "high").length;
    const medium = allInsights.filter(i => i.severity === "medium").length;
    const low = allInsights.filter(i => i.severity === "low").length;

    return {
      high,
      medium,
      low,
      total: allInsights.length,
      recent: allInsights.slice(0, 5),
    };
  }

  async getInsightOpportunities(advisorId: string): Promise<{ opportunities: Insight[]; totalEstimatedValue: number }> {
    const opportunities = await db.select().from(insights)
      .where(and(
        eq(insights.advisorId, advisorId),
        eq(insights.isDismissed, false),
        sql`${insights.estimatedValue} IS NOT NULL AND ${insights.estimatedValue} > 0`
      ))
      .orderBy(desc(sql`${insights.estimatedValue}`));

    const totalEstimatedValue = opportunities.reduce((s, o) => s + parseFloat(String(o.estimatedValue || "0")), 0);
    return { opportunities, totalEstimatedValue };
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [result] = await db.select().from(documents).where(eq(documents.id, id));
    return result;
  }

  async getDocumentsByClient(clientId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.clientId, clientId));
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [result] = await db.insert(documents).values(doc).returning();
    return result;
  }

  async getComplianceItems(advisorId: string): Promise<ComplianceItem[]> {
    return db.select().from(complianceItems).where(eq(complianceItems.advisorId, advisorId));
  }

  async getComplianceItemsByClient(clientId: string): Promise<ComplianceItem[]> {
    return db.select().from(complianceItems).where(eq(complianceItems.clientId, clientId));
  }

  async createComplianceItem(item: InsertComplianceItem): Promise<ComplianceItem> {
    const [result] = await db.insert(complianceItems).values(item).returning();
    return result;
  }

  async updateComplianceItem(id: string, data: Partial<ComplianceItem>): Promise<ComplianceItem | undefined> {
    const [result] = await db.update(complianceItems).set({ ...data, updatedAt: new Date() }).where(eq(complianceItems.id, id)).returning();
    return result;
  }

  async getLifeEvent(id: string): Promise<LifeEvent | undefined> {
    const [result] = await db.select().from(lifeEvents).where(eq(lifeEvents.id, id));
    return result;
  }

  async getLifeEvents(clientId: string): Promise<LifeEvent[]> {
    return db.select().from(lifeEvents).where(eq(lifeEvents.clientId, clientId)).orderBy(desc(lifeEvents.eventDate));
  }

  async createLifeEvent(event: InsertLifeEvent): Promise<LifeEvent> {
    const [result] = await db.insert(lifeEvents).values(event).returning();
    return result;
  }

  async getAlternativeAssetsByClient(clientId: string): Promise<AlternativeAsset[]> {
    return db.select().from(alternativeAssets).where(eq(alternativeAssets.clientId, clientId));
  }

  async getDocumentChecklist(clientId: string): Promise<DocumentChecklistItem[]> {
    return db.select().from(documentChecklist).where(eq(documentChecklist.clientId, clientId)).orderBy(documentChecklist.sortOrder);
  }

  async createDocumentChecklistItem(item: InsertDocumentChecklistItem): Promise<DocumentChecklistItem> {
    const [result] = await db.insert(documentChecklist).values(item).returning();
    return result;
  }

  async updateDocumentChecklistItem(id: string, data: Partial<DocumentChecklistItem>): Promise<DocumentChecklistItem | undefined> {
    const [result] = await db.update(documentChecklist).set(data).where(eq(documentChecklist.id, id)).returning();
    return result;
  }

  async getAllAdvisors(): Promise<Advisor[]> {
    return db.select().from(advisors);
  }

  async updateAdvisor(id: string, data: Partial<Advisor>): Promise<Advisor | undefined> {
    const [result] = await db.update(advisors).set({ ...data, updatedAt: new Date() }).where(eq(advisors.id, id)).returning();
    return result;
  }

  async getWorkflowTemplates(advisorId: string): Promise<WorkflowTemplate[]> {
    return db.select().from(workflowTemplates).where(eq(workflowTemplates.advisorId, advisorId)).orderBy(workflowTemplates.name);
  }

  async getWorkflowTemplate(id: string): Promise<WorkflowTemplate | undefined> {
    const [result] = await db.select().from(workflowTemplates).where(eq(workflowTemplates.id, id));
    return result;
  }

  async createWorkflowTemplate(template: InsertWorkflowTemplate): Promise<WorkflowTemplate> {
    const [result] = await db.insert(workflowTemplates).values(template).returning();
    return result;
  }

  async updateWorkflowTemplate(id: string, data: Partial<WorkflowTemplate>): Promise<WorkflowTemplate | undefined> {
    const [result] = await db.update(workflowTemplates).set(data).where(eq(workflowTemplates.id, id)).returning();
    return result;
  }

  async deleteWorkflowTemplate(id: string): Promise<void> {
    await db.delete(workflowTemplates).where(eq(workflowTemplates.id, id));
  }

  async getClientWorkflows(clientId: string): Promise<ClientWorkflow[]> {
    return db.select().from(clientWorkflows).where(eq(clientWorkflows.clientId, clientId));
  }

  async getAllClientWorkflows(advisorId: string): Promise<ClientWorkflow[]> {
    return db.select({ workflow: clientWorkflows })
      .from(clientWorkflows)
      .innerJoin(clients, eq(clientWorkflows.clientId, clients.id))
      .where(eq(clients.advisorId, advisorId))
      .then(rows => rows.map(r => r.workflow));
  }

  async getAllClientWorkflowsWithClients(advisorId: string): Promise<{ workflow: ClientWorkflow; firstName: string; lastName: string }[]> {
    return db.select({
      workflow: clientWorkflows,
      firstName: clients.firstName,
      lastName: clients.lastName,
    })
      .from(clientWorkflows)
      .innerJoin(clients, eq(clientWorkflows.clientId, clients.id))
      .where(eq(clients.advisorId, advisorId));
  }

  async getClientWorkflow(id: string): Promise<ClientWorkflow | undefined> {
    const [result] = await db.select().from(clientWorkflows).where(eq(clientWorkflows.id, id));
    return result;
  }

  async createClientWorkflow(workflow: InsertClientWorkflow): Promise<ClientWorkflow> {
    const [result] = await db.insert(clientWorkflows).values(workflow).returning();
    return result;
  }

  async updateClientWorkflow(id: string, data: Partial<ClientWorkflow>): Promise<ClientWorkflow | undefined> {
    const [result] = await db.update(clientWorkflows).set(data).where(eq(clientWorkflows.id, id)).returning();
    return result;
  }

  async getAdvisorByEmail(email: string): Promise<Advisor | undefined> {
    const [result] = await db.select().from(advisors).where(eq(advisors.email, email));
    return result;
  }

  async getAssociate(id: string): Promise<Associate | undefined> {
    const [result] = await db.select().from(associates).where(eq(associates.id, id));
    return result;
  }

  async getAssociateByEmail(email: string): Promise<Associate | undefined> {
    const [result] = await db.select().from(associates).where(eq(associates.email, email));
    return result;
  }

  async getAllAssociates(): Promise<Associate[]> {
    return db.select().from(associates).orderBy(associates.name);
  }

  async createAssociate(associate: InsertAssociate): Promise<Associate> {
    const [result] = await db.insert(associates).values(associate).returning();
    return result;
  }

  async updateAssociate(id: string, data: Partial<Associate>): Promise<Associate | undefined> {
    const [result] = await db.update(associates).set(data).where(eq(associates.id, id)).returning();
    return result;
  }

  async deleteAssociate(id: string): Promise<void> {
    await db.delete(clientTeamMembers).where(eq(clientTeamMembers.associateId, id));
    await db.delete(associates).where(eq(associates.id, id));
  }

  async getClientTeamMembers(clientId: string): Promise<(ClientTeamMember & { associate: Associate })[]> {
    const rows = await db
      .select({
        id: clientTeamMembers.id,
        clientId: clientTeamMembers.clientId,
        associateId: clientTeamMembers.associateId,
        role: clientTeamMembers.role,
        addedAt: clientTeamMembers.addedAt,
        associate: associates,
      })
      .from(clientTeamMembers)
      .innerJoin(associates, eq(clientTeamMembers.associateId, associates.id))
      .where(eq(clientTeamMembers.clientId, clientId));
    return rows.map(r => ({
      id: r.id,
      clientId: r.clientId,
      associateId: r.associateId,
      role: r.role,
      addedAt: r.addedAt,
      associate: r.associate,
    }));
  }

  async getClientsByAssociate(associateId: string): Promise<Client[]> {
    const rows = await db
      .select({ client: clients })
      .from(clientTeamMembers)
      .innerJoin(clients, eq(clientTeamMembers.clientId, clients.id))
      .where(eq(clientTeamMembers.associateId, associateId));
    return rows.map(r => r.client);
  }

  async addClientTeamMember(member: InsertClientTeamMember): Promise<ClientTeamMember> {
    const [result] = await db.insert(clientTeamMembers).values(member).returning();
    return result;
  }

  async removeClientTeamMember(id: string): Promise<void> {
    await db.delete(clientTeamMembers).where(eq(clientTeamMembers.id, id));
  }

  async getDiagnosticConfigs(): Promise<DiagnosticConfig[]> {
    return db.select().from(diagnosticConfig).orderBy(desc(diagnosticConfig.createdAt));
  }

  async getActiveDiagnosticConfig(): Promise<DiagnosticConfig | undefined> {
    const [result] = await db.select().from(diagnosticConfig).where(eq(diagnosticConfig.isActive, true)).limit(1);
    return result;
  }

  async getDiagnosticConfig(id: string): Promise<DiagnosticConfig | undefined> {
    const [result] = await db.select().from(diagnosticConfig).where(eq(diagnosticConfig.id, id));
    return result;
  }

  async createDiagnosticConfig(config: InsertDiagnosticConfig): Promise<DiagnosticConfig> {
    if (config.isActive) {
      await db.update(diagnosticConfig).set({ isActive: false });
    }
    const [result] = await db.insert(diagnosticConfig).values(config).returning();
    return result;
  }

  async updateDiagnosticConfig(id: string, data: Partial<DiagnosticConfig>): Promise<DiagnosticConfig | undefined> {
    if (data.isActive) {
      await db.update(diagnosticConfig).set({ isActive: false });
    }
    const [result] = await db.update(diagnosticConfig).set({ ...data, updatedAt: new Date() }).where(eq(diagnosticConfig.id, id)).returning();
    return result;
  }

  async deleteDiagnosticConfig(id: string): Promise<void> {
    await db.delete(diagnosticConfig).where(eq(diagnosticConfig.id, id));
  }

  async getDiagnosticResults(clientId: string): Promise<(DiagnosticResult & { configName?: string })[]> {
    const rows = await db
      .select({
        id: diagnosticResults.id,
        clientId: diagnosticResults.clientId,
        configId: diagnosticResults.configId,
        analysisJson: diagnosticResults.analysisJson,
        renderedHtml: diagnosticResults.renderedHtml,
        createdAt: diagnosticResults.createdAt,
        configName: diagnosticConfig.name,
      })
      .from(diagnosticResults)
      .leftJoin(diagnosticConfig, eq(diagnosticResults.configId, diagnosticConfig.id))
      .where(eq(diagnosticResults.clientId, clientId))
      .orderBy(desc(diagnosticResults.createdAt));
    return rows as unknown as (DiagnosticResult & { configName?: string })[];
  }

  async getDiagnosticResult(id: string): Promise<DiagnosticResult | undefined> {
    const [result] = await db.select().from(diagnosticResults).where(eq(diagnosticResults.id, id));
    return result;
  }

  async createDiagnosticResult(result: InsertDiagnosticResult): Promise<DiagnosticResult> {
    const [created] = await db.insert(diagnosticResults).values(result).returning();
    return created;
  }

  async deleteDiagnosticResult(id: string): Promise<void> {
    await db.delete(diagnosticResults).where(eq(diagnosticResults.id, id));
  }

  async getTranscriptConfigs(): Promise<TranscriptConfig[]> {
    return db.select().from(transcriptConfig).orderBy(desc(transcriptConfig.createdAt));
  }

  async getActiveTranscriptConfig(): Promise<TranscriptConfig | undefined> {
    const [result] = await db.select().from(transcriptConfig).where(eq(transcriptConfig.isActive, true)).limit(1);
    return result;
  }

  async getTranscriptConfig(id: string): Promise<TranscriptConfig | undefined> {
    const [result] = await db.select().from(transcriptConfig).where(eq(transcriptConfig.id, id));
    return result;
  }

  async createTranscriptConfig(config: InsertTranscriptConfig): Promise<TranscriptConfig> {
    if (config.isActive) {
      await db.update(transcriptConfig).set({ isActive: false });
    }
    const [result] = await db.insert(transcriptConfig).values(config).returning();
    return result;
  }

  async updateTranscriptConfig(id: string, data: Partial<TranscriptConfig>): Promise<TranscriptConfig | undefined> {
    if (data.isActive) {
      await db.update(transcriptConfig).set({ isActive: false });
    }
    const [result] = await db.update(transcriptConfig).set({ ...data, updatedAt: new Date() }).where(eq(transcriptConfig.id, id)).returning();
    return result;
  }

  async deleteTranscriptConfig(id: string): Promise<void> {
    await db.delete(transcriptConfig).where(eq(transcriptConfig.id, id));
  }

  async getMeetingPrepConfigs(): Promise<MeetingPrepConfig[]> {
    return db.select().from(meetingPrepConfig).orderBy(desc(meetingPrepConfig.createdAt));
  }

  async getActiveMeetingPrepConfig(): Promise<MeetingPrepConfig | undefined> {
    const [result] = await db.select().from(meetingPrepConfig).where(eq(meetingPrepConfig.isActive, true)).limit(1);
    return result;
  }

  async createMeetingPrepConfig(config: InsertMeetingPrepConfig): Promise<MeetingPrepConfig> {
    if (config.isActive) {
      await db.update(meetingPrepConfig).set({ isActive: false });
    }
    const [result] = await db.insert(meetingPrepConfig).values(config).returning();
    return result;
  }

  async updateMeetingPrepConfig(id: string, data: Partial<MeetingPrepConfig>): Promise<MeetingPrepConfig | undefined> {
    if (data.isActive) {
      await db.update(meetingPrepConfig).set({ isActive: false });
    }
    const [result] = await db.update(meetingPrepConfig).set({ ...data, updatedAt: new Date() }).where(eq(meetingPrepConfig.id, id)).returning();
    return result;
  }

  async deleteMeetingPrepConfig(id: string): Promise<void> {
    await db.delete(meetingPrepConfig).where(eq(meetingPrepConfig.id, id));
  }

  async getMeetingSummaryConfigs(): Promise<MeetingSummaryConfig[]> {
    return db.select().from(meetingSummaryConfig).orderBy(desc(meetingSummaryConfig.createdAt));
  }

  async getActiveMeetingSummaryConfig(): Promise<MeetingSummaryConfig | undefined> {
    const [result] = await db.select().from(meetingSummaryConfig).where(eq(meetingSummaryConfig.isActive, true)).limit(1);
    return result;
  }

  async createMeetingSummaryConfig(config: InsertMeetingSummaryConfig): Promise<MeetingSummaryConfig> {
    if (config.isActive) {
      await db.update(meetingSummaryConfig).set({ isActive: false });
    }
    const [result] = await db.insert(meetingSummaryConfig).values(config).returning();
    return result;
  }

  async updateMeetingSummaryConfig(id: string, data: Partial<MeetingSummaryConfig>): Promise<MeetingSummaryConfig | undefined> {
    if (data.isActive) {
      await db.update(meetingSummaryConfig).set({ isActive: false });
    }
    const [result] = await db.update(meetingSummaryConfig).set({ ...data, updatedAt: new Date() }).where(eq(meetingSummaryConfig.id, id)).returning();
    return result;
  }

  async deleteMeetingSummaryConfig(id: string): Promise<void> {
    await db.delete(meetingSummaryConfig).where(eq(meetingSummaryConfig.id, id));
  }

  async getDocumentClassificationConfigs(): Promise<DocumentClassificationConfig[]> {
    return db.select().from(documentClassificationConfig).orderBy(desc(documentClassificationConfig.createdAt));
  }

  async getActiveDocumentClassificationConfig(): Promise<DocumentClassificationConfig | undefined> {
    const [result] = await db.select().from(documentClassificationConfig).where(eq(documentClassificationConfig.isActive, true)).limit(1);
    return result;
  }

  async createDocumentClassificationConfig(config: InsertDocumentClassificationConfig): Promise<DocumentClassificationConfig> {
    if (config.isActive) {
      await db.update(documentClassificationConfig).set({ isActive: false });
    }
    const [result] = await db.insert(documentClassificationConfig).values(config).returning();
    return result;
  }

  async updateDocumentClassificationConfig(id: string, data: Partial<DocumentClassificationConfig>): Promise<DocumentClassificationConfig | undefined> {
    if (data.isActive) {
      await db.update(documentClassificationConfig).set({ isActive: false });
    }
    const [result] = await db.update(documentClassificationConfig).set({ ...data, updatedAt: new Date() }).where(eq(documentClassificationConfig.id, id)).returning();
    return result;
  }

  async deleteDocumentClassificationConfig(id: string): Promise<void> {
    await db.delete(documentClassificationConfig).where(eq(documentClassificationConfig.id, id));
  }

  async getMonteCarloScenarios(clientId: string): Promise<MonteCarloScenario[]> {
    return db.select().from(monteCarloScenarios).where(eq(monteCarloScenarios.clientId, clientId)).orderBy(desc(monteCarloScenarios.createdAt));
  }

  async getMonteCarloScenario(id: string): Promise<MonteCarloScenario | undefined> {
    const [result] = await db.select().from(monteCarloScenarios).where(eq(monteCarloScenarios.id, id));
    return result;
  }

  async createMonteCarloScenario(scenario: InsertMonteCarloScenario): Promise<MonteCarloScenario> {
    const [result] = await db.insert(monteCarloScenarios).values(scenario).returning();
    return result;
  }

  async updateMonteCarloScenario(id: string, data: Partial<MonteCarloScenario>): Promise<MonteCarloScenario | undefined> {
    const [result] = await db.update(monteCarloScenarios).set(data).where(eq(monteCarloScenarios.id, id)).returning();
    return result;
  }

  async deleteMonteCarloScenario(id: string): Promise<void> {
    await db.delete(scenarioEvents).where(eq(scenarioEvents.scenarioId, id));
    await db.delete(monteCarloScenarios).where(eq(monteCarloScenarios.id, id));
  }

  async getScenarioEvents(scenarioId: string): Promise<ScenarioEvent[]> {
    return db.select().from(scenarioEvents).where(eq(scenarioEvents.scenarioId, scenarioId));
  }

  async createScenarioEvent(event: InsertScenarioEvent): Promise<ScenarioEvent> {
    const [result] = await db.insert(scenarioEvents).values(event).returning();
    return result;
  }

  async deleteScenarioEvent(id: string): Promise<void> {
    await db.delete(scenarioEvents).where(eq(scenarioEvents.id, id));
  }

  async getComplianceReviews(clientId: string): Promise<ComplianceReview[]> {
    return db.select().from(complianceReviews).where(eq(complianceReviews.clientId, clientId)).orderBy(desc(complianceReviews.createdAt));
  }

  async getComplianceReview(id: string): Promise<ComplianceReview | undefined> {
    const [result] = await db.select().from(complianceReviews).where(eq(complianceReviews.id, id));
    return result;
  }

  async createComplianceReview(review: InsertComplianceReview): Promise<ComplianceReview> {
    const [result] = await db.insert(complianceReviews).values(review).returning();
    return result;
  }

  async updateComplianceReview(id: string, data: Partial<ComplianceReview>): Promise<ComplianceReview | undefined> {
    const [result] = await db.update(complianceReviews).set(data).where(eq(complianceReviews.id, id)).returning();
    return result;
  }

  async getComplianceReviewEvents(reviewId: string): Promise<ComplianceReviewEvent[]> {
    return db.select().from(complianceReviewEvents).where(eq(complianceReviewEvents.reviewId, reviewId)).orderBy(complianceReviewEvents.createdAt);
  }

  async getComplianceReviewEventsByReviewIds(reviewIds: string[]): Promise<ComplianceReviewEvent[]> {
    if (reviewIds.length === 0) return [];
    return db.select().from(complianceReviewEvents).where(inArray(complianceReviewEvents.reviewId, reviewIds)).orderBy(complianceReviewEvents.createdAt);
  }

  async createComplianceReviewEvent(event: InsertComplianceReviewEvent): Promise<ComplianceReviewEvent> {
    const [result] = await db.insert(complianceReviewEvents).values(event).returning();
    return result;
  }

  async recordLoginEvent(data: { userId: string; userType: string; userName: string; userEmail: string; ipAddress?: string; deviceInfo?: string; mfaStatus?: boolean; status?: string }): Promise<LoginEvent> {
    const [result] = await db.insert(loginEvents).values({
      ...data,
      loginTime: new Date(),
    }).returning();
    return result;
  }

  async getLoginEvents(days: number = 90): Promise<LoginEvent[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return db.select().from(loginEvents)
      .where(sql`${loginEvents.timestamp} >= ${cutoff}`)
      .orderBy(desc(loginEvents.timestamp));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [result] = await db.select().from(tasks).where(eq(tasks.id, id));
    return result;
  }

  async setSalesforceTaskId(taskId: string, salesforceTaskId: string): Promise<void> {
    await db.update(tasks).set({ salesforceTaskId, updatedAt: new Date() }).where(eq(tasks.id, taskId));
  }

  async setSalesforceMeetingId(meetingId: string, salesforceEventId: string): Promise<void> {
    await db.update(meetings).set({ salesforceEventId, updatedAt: new Date() }).where(eq(meetings.id, meetingId));
  }

  async updateTaskSyncStatus(taskId: string, status: string): Promise<void> {
    await db.update(tasks).set({ salesforceSyncStatus: status, lastSyncedAt: new Date(), updatedAt: new Date() }).where(eq(tasks.id, taskId));
  }

  async updateMeetingSalesforceSyncStatus(meetingId: string, status: string): Promise<void> {
    await db.update(meetings).set({ salesforceSyncStatus: status, lastSyncedAt: new Date(), updatedAt: new Date() }).where(eq(meetings.id, meetingId));
  }

  async updateMeetingOutlookSyncStatus(meetingId: string, status: string): Promise<void> {
    await db.update(meetings).set({ outlookSyncStatus: status, lastSyncedWithOutlook: new Date(), updatedAt: new Date() }).where(eq(meetings.id, meetingId));
  }

  async getClientBySalesforceContactId(sfContactId: string): Promise<Client | undefined> {
    const [result] = await db.select().from(clients).where(eq(clients.salesforceContactId, sfContactId));
    return result;
  }

  async getAccountBySalesforceId(sfAccountId: string): Promise<Account | undefined> {
    const [result] = await db.select().from(accounts).where(eq(accounts.salesforceAccountId, sfAccountId));
    return result;
  }

  async getAccountByOrionId(orionAccountId: string): Promise<Account | undefined> {
    const [result] = await db.select().from(accounts).where(eq(accounts.orionAccountId, orionAccountId));
    return result;
  }

  async getTasksWithSalesforceIds(): Promise<Task[]> {
    return db.select().from(tasks).where(sql`${tasks.salesforceTaskId} IS NOT NULL`);
  }

  async getMeetingsWithSalesforceIds(): Promise<Meeting[]> {
    return db.select().from(meetings).where(sql`${meetings.salesforceEventId} IS NOT NULL`);
  }

  async getTasksWithSyncStatus(status: string): Promise<Task[]> {
    return db.select().from(tasks).where(
      or(eq(tasks.salesforceSyncStatus, status), sql`${tasks.salesforceSyncStatus} IS NULL`)
    );
  }

  async getMeetingsWithSyncStatus(status: string): Promise<Meeting[]> {
    return db.select().from(meetings).where(
      or(eq(meetings.salesforceSyncStatus, status), sql`${meetings.salesforceSyncStatus} IS NULL`)
    );
  }

  async setOutlookEventId(meetingId: string, outlookEventId: string): Promise<void> {
    await db.update(meetings).set({ outlookEventId, updatedAt: new Date() }).where(eq(meetings.id, meetingId));
  }

  async getMeetingByOutlookEventId(outlookEventId: string): Promise<Meeting | undefined> {
    const [result] = await db.select().from(meetings).where(eq(meetings.outlookEventId, outlookEventId));
    return result;
  }

  async getMeetingByZoomMeetingId(zoomMeetingId: string): Promise<Meeting | undefined> {
    const [result] = await db.select().from(meetings).where(eq(meetings.zoomMeetingId, zoomMeetingId));
    return result;
  }

  async getMeetingsByDateRange(advisorId: string, startDate: string, endDate: string): Promise<Meeting[]> {
    return db.select().from(meetings).where(
      and(
        eq(meetings.advisorId, advisorId),
        gte(meetings.startTime, startDate),
        sql`${meetings.startTime} < ${endDate}`
      )
    ).orderBy(asc(meetings.startTime));
  }

  async checkMeetingConflicts(advisorId: string, startTime: string, endTime: string, excludeMeetingId?: string): Promise<Meeting[]> {
    const conditions = [
      eq(meetings.advisorId, advisorId),
      sql`${meetings.startTime} < ${endTime}`,
      sql`${meetings.endTime} > ${startTime}`,
      sql`${meetings.status} != 'cancelled'`,
    ];
    if (excludeMeetingId) {
      conditions.push(sql`${meetings.id} != ${excludeMeetingId}`);
    }
    return db.select().from(meetings).where(and(...conditions));
  }

  async createMeetingNote(note: InsertMeetingNote): Promise<MeetingNote> {
    const [result] = await db.insert(meetingNotes).values(note).returning();
    return result;
  }

  async getMeetingNotesByMeeting(meetingId: string): Promise<MeetingNote[]> {
    return db.select().from(meetingNotes).where(eq(meetingNotes.meetingId, meetingId)).orderBy(desc(meetingNotes.createdAt));
  }

  async createRecurringTask(config: InsertRecurringTask): Promise<RecurringTask> {
    const [result] = await db.insert(recurringTasks).values(config).returning();
    return result;
  }

  async getRecurringTasksByAdvisor(advisorId: string): Promise<RecurringTask[]> {
    return db.select().from(recurringTasks)
      .innerJoin(tasks, eq(recurringTasks.taskId, tasks.id))
      .where(eq(tasks.advisorId, advisorId))
      .then(rows => rows.map(r => r.recurring_tasks));
  }

  async getRecurringTaskByTaskId(taskId: string): Promise<RecurringTask | undefined> {
    const [result] = await db.select().from(recurringTasks).where(eq(recurringTasks.taskId, taskId));
    return result;
  }

  async updateRecurringTask(id: string, data: Partial<RecurringTask>): Promise<RecurringTask | undefined> {
    const [result] = await db.update(recurringTasks).set(data).where(eq(recurringTasks.id, id)).returning();
    return result;
  }

  async getOverdueTasks(advisorId: string): Promise<Task[]> {
    const today = new Date().toISOString().split("T")[0];
    return db.select().from(tasks).where(
      and(
        eq(tasks.advisorId, advisorId),
        sql`${tasks.status} != 'completed'`,
        sql`${tasks.dueDate} < ${today}`,
        sql`${tasks.dueDate} IS NOT NULL`
      )
    ).orderBy(asc(tasks.dueDate));
  }

  async getUpcomingTasks(advisorId: string, days: number = 7): Promise<Task[]> {
    const today = new Date().toISOString().split("T")[0];
    const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    return db.select().from(tasks).where(
      and(
        eq(tasks.advisorId, advisorId),
        sql`${tasks.status} != 'completed'`,
        gte(tasks.dueDate, today),
        sql`${tasks.dueDate} <= ${futureDate}`
      )
    ).orderBy(asc(tasks.dueDate));
  }

  async completeTask(id: string): Promise<Task | undefined> {
    const now = new Date();
    const [result] = await db.update(tasks).set({
      status: "completed",
      completedAt: now,
      updatedAt: now,
    }).where(eq(tasks.id, id)).returning();
    return result;
  }

  async createSalesforceSyncLog(data: InsertSalesforceSyncLog): Promise<SalesforceSyncLog> {
    const [result] = await db.insert(salesforceSyncLog).values(data).returning();
    return result;
  }

  async getRecentSalesforceSyncLogs(limit: number): Promise<SalesforceSyncLog[]> {
    return db.select().from(salesforceSyncLog).orderBy(desc(salesforceSyncLog.syncedAt)).limit(limit);
  }

  async createOrionSyncLog(data: InsertOrionSyncLog): Promise<OrionSyncLog> {
    const [result] = await db.insert(orionSyncLog).values(data).returning();
    return result;
  }

  async getRecentOrionSyncLogs(limit: number): Promise<OrionSyncLog[]> {
    return db.select().from(orionSyncLog).orderBy(desc(orionSyncLog.syncedAt)).limit(limit);
  }

  async createOrionReconciliationReport(data: InsertOrionReconciliationReport): Promise<OrionReconciliationReportRow> {
    const [result] = await db.insert(orionReconciliationReport).values(data).returning();
    return result;
  }

  async createEmailLog(data: InsertEmailLog): Promise<EmailLog> {
    const [result] = await db.insert(emailLog).values(data).returning();
    return result;
  }

  async createZoomRecording(data: InsertZoomRecording): Promise<ZoomRecording> {
    const [result] = await db.insert(zoomRecordings).values(data).returning();
    return result;
  }

  async updateZoomRecording(id: string, data: Partial<ZoomRecording>): Promise<ZoomRecording | undefined> {
    const [result] = await db.update(zoomRecordings).set(data).where(eq(zoomRecordings.id, id)).returning();
    return result;
  }

  async createMeetingTranscript(data: InsertMeetingTranscript): Promise<MeetingTranscript> {
    const [result] = await db.insert(meetingTranscripts).values(data).returning();
    return result;
  }

  async getFeatureFlags(): Promise<FeatureFlag[]> {
    return db.select().from(featureFlags).orderBy(featureFlags.key);
  }

  async getFeatureFlag(key: string): Promise<FeatureFlag | undefined> {
    const [result] = await db.select().from(featureFlags).where(eq(featureFlags.key, key));
    return result;
  }

  async createFeatureFlag(flag: InsertFeatureFlag): Promise<FeatureFlag> {
    const [result] = await db.insert(featureFlags).values(flag).returning();
    return result;
  }

  async updateFeatureFlag(key: string, data: Partial<FeatureFlag>): Promise<FeatureFlag | undefined> {
    const [result] = await db.update(featureFlags)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(featureFlags.key, key))
      .returning();
    return result;
  }

  async createPilotFeedback(feedback: InsertPilotFeedback): Promise<PilotFeedback> {
    const [result] = await db.insert(pilotFeedback).values(feedback).returning();
    return result;
  }

  async getPilotFeedback(): Promise<PilotFeedback[]> {
    return db.select().from(pilotFeedback).orderBy(desc(pilotFeedback.createdAt));
  }

  async getPilotFeedbackStats(): Promise<{ type: string; count: number }[]> {
    const results = await db
      .select({ type: pilotFeedback.type, count: sql<number>`count(*)::int` })
      .from(pilotFeedback)
      .groupBy(pilotFeedback.type);
    return results;
  }

  async createSurveyResponse(data: InsertSurveyResponse): Promise<SurveyResponse> {
    const [result] = await db.insert(surveyResponses).values(data).returning();
    return result;
  }

  async getSurveyResponses(days: number = 30): Promise<SurveyResponse[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return db.select().from(surveyResponses)
      .where(sql`${surveyResponses.createdAt} >= ${cutoff}`)
      .orderBy(desc(surveyResponses.createdAt));
  }

  async getSurveyStats(): Promise<{ avgRating: number; totalResponses: number }> {
    const [result] = await db
      .select({
        avgRating: sql<number>`COALESCE(AVG(${surveyResponses.rating})::numeric(3,2), 0)::float`,
        totalResponses: sql<number>`count(*)::int`,
      })
      .from(surveyResponses);
    return result || { avgRating: 0, totalResponses: 0 };
  }

  async recordHealthCheck(data: InsertHealthCheckEvent): Promise<void> {
    await db.insert(healthCheckEvents).values(data);
  }

  async getHealthChecks(days: number = 60): Promise<HealthCheckEvent[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return db.select().from(healthCheckEvents)
      .where(sql`${healthCheckEvents.checkedAt} >= ${cutoff}`)
      .orderBy(desc(healthCheckEvents.checkedAt));
  }

  async createGateSignoff(data: InsertGateSignoff): Promise<GateSignoff> {
    const [result] = await db.insert(gateSignoffs).values(data).returning();
    return result;
  }

  async getGateSignoffs(): Promise<GateSignoff[]> {
    return db.select().from(gateSignoffs).orderBy(desc(gateSignoffs.createdAt));
  }

  async createTriggerCategory(data: InsertTriggerCategory): Promise<TriggerCategory> {
    const [cat] = await db.insert(triggerCategories).values(data).returning();
    return cat;
  }

  async getTriggerCategory(id: string): Promise<TriggerCategory | undefined> {
    const [result] = await db.select().from(triggerCategories).where(eq(triggerCategories.id, id));
    return result;
  }

  async getTriggerCategories(): Promise<TriggerCategory[]> {
    return db.select().from(triggerCategories).orderBy(asc(triggerCategories.name));
  }

  async getTriggerCategoryByName(name: string): Promise<TriggerCategory | undefined> {
    const [result] = await db.select().from(triggerCategories).where(ilike(triggerCategories.name, name));
    return result;
  }

  async updateTriggerCategory(id: string, data: Partial<TriggerCategory>): Promise<TriggerCategory | undefined> {
    const [result] = await db.update(triggerCategories).set({ ...data, updatedAt: new Date() }).where(eq(triggerCategories.id, id)).returning();
    return result;
  }

  async toggleTriggerCategoryActive(id: string, isActive: boolean): Promise<void> {
    await db.update(triggerCategories).set({ isActive, updatedAt: new Date() }).where(eq(triggerCategories.id, id));
  }

  async createTriggerAction(data: InsertTriggerAction): Promise<TriggerAction> {
    const [action] = await db.insert(triggerActions).values(data).returning();
    return action;
  }

  async getTriggerActionsForEvent(lifeEventId: string): Promise<TriggerAction[]> {
    return db.select().from(triggerActions).where(eq(triggerActions.lifeEventId, lifeEventId));
  }

  async updateLifeEvent(id: string, data: Partial<LifeEvent>): Promise<LifeEvent | undefined> {
    const [result] = await db.update(lifeEvents).set(data).where(eq(lifeEvents.id, id)).returning();
    return result;
  }

  async getAllInvestorProfiles(): Promise<InvestorProfile[]> {
    return db.select().from(investorProfiles);
  }

  async getExistingReminder(profileId: string, remindDays: number): Promise<Task | undefined> {
    const results = await db.select().from(tasks).where(
      and(
        eq(tasks.type, "reminder"),
        eq(tasks.category, "profile_reminder"),
        eq(tasks.status, "pending"),
        like(tasks.description, `%${profileId}%`),
        like(tasks.description, `%remindDays:${remindDays}%`)
      )
    );
    return results[0];
  }

  async createInvestorProfile(data: InsertInvestorProfile): Promise<InvestorProfile> {
    const [profile] = await db.insert(investorProfiles).values(data).returning();
    return profile;
  }

  async getInvestorProfile(id: string): Promise<InvestorProfile | undefined> {
    const [result] = await db.select().from(investorProfiles).where(eq(investorProfiles.id, id));
    return result;
  }

  async getInvestorProfilesByClient(clientId: string): Promise<InvestorProfile[]> {
    return db.select().from(investorProfiles)
      .where(eq(investorProfiles.clientId, clientId))
      .orderBy(desc(investorProfiles.createdAt));
  }

  async updateInvestorProfile(id: string, data: Partial<InvestorProfile>): Promise<InvestorProfile | undefined> {
    const [profile] = await db
      .update(investorProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(investorProfiles.id, id))
      .returning();
    return profile;
  }

  async deleteInvestorProfile(id: string): Promise<void> {
    await db.delete(investorProfileVersions).where(eq(investorProfileVersions.profileId, id));
    await db.delete(investorProfiles).where(eq(investorProfiles.id, id));
  }

  async saveDraft(profileId: string, answers: Record<string, any>): Promise<void> {
    await db
      .update(investorProfiles)
      .set({
        draftAnswers: answers,
        status: "in_progress",
        updatedAt: new Date(),
      })
      .where(eq(investorProfiles.id, profileId));
  }

  async getDraft(profileId: string): Promise<Record<string, any> | undefined> {
    const profile = await this.getInvestorProfile(profileId);
    return profile?.draftAnswers as Record<string, any> | undefined;
  }

  async createProfileVersion(versionData: InsertInvestorProfileVersion): Promise<InvestorProfileVersion> {
    const [version] = await db
      .insert(investorProfileVersions)
      .values(versionData)
      .returning();
    return version;
  }

  async getProfileVersions(profileId: string): Promise<InvestorProfileVersion[]> {
    return db.select().from(investorProfileVersions)
      .where(eq(investorProfileVersions.profileId, profileId))
      .orderBy(desc(investorProfileVersions.versionNumber));
  }

  async getProfileVersion(versionId: string): Promise<InvestorProfileVersion | undefined> {
    const [result] = await db.select().from(investorProfileVersions)
      .where(eq(investorProfileVersions.id, versionId));
    return result;
  }

  async createQuestionSchema(data: InsertInvestorProfileQuestionSchema): Promise<InvestorProfileQuestionSchema> {
    const [schema] = await db.insert(investorProfileQuestionSchemas).values(data).returning();
    return schema;
  }

  async getQuestionSchema(id: string): Promise<InvestorProfileQuestionSchema | undefined> {
    const [result] = await db.select().from(investorProfileQuestionSchemas)
      .where(eq(investorProfileQuestionSchemas.id, id));
    return result;
  }

  async getActiveQuestionSchemas(profileType: string): Promise<InvestorProfileQuestionSchema[]> {
    return db.select().from(investorProfileQuestionSchemas)
      .where(and(
        eq(investorProfileQuestionSchemas.profileType, profileType),
        eq(investorProfileQuestionSchemas.isActive, true),
      ))
      .orderBy(desc(investorProfileQuestionSchemas.createdAt));
  }

  async getAllQuestionSchemas(profileType?: string): Promise<InvestorProfileQuestionSchema[]> {
    if (profileType) {
      return db.select().from(investorProfileQuestionSchemas)
        .where(eq(investorProfileQuestionSchemas.profileType, profileType))
        .orderBy(desc(investorProfileQuestionSchemas.createdAt));
    }
    return db.select().from(investorProfileQuestionSchemas)
      .orderBy(desc(investorProfileQuestionSchemas.createdAt));
  }

  async updateQuestionSchema(
    id: string,
    data: Partial<InvestorProfileQuestionSchema>
  ): Promise<InvestorProfileQuestionSchema | undefined> {
    const [schema] = await db
      .update(investorProfileQuestionSchemas)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(investorProfileQuestionSchemas.id, id))
      .returning();
    return schema;
  }

  async toggleSchemaActive(id: string, isActive: boolean): Promise<void> {
    await db
      .update(investorProfileQuestionSchemas)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(investorProfileQuestionSchemas.id, id));
  }

  async getFinancialGoalsByClient(clientId: string): Promise<FinancialGoal[]> {
    return db.select().from(financialGoals).where(eq(financialGoals.clientId, clientId)).orderBy(financialGoals.bucket, financialGoals.priority);
  }

  async getFinancialGoalsByAdvisor(advisorId: string): Promise<FinancialGoal[]> {
    const advisorClients = await this.getClients(advisorId);
    const clientIds = advisorClients.map(c => c.id);
    if (clientIds.length === 0) return [];
    const allGoals: FinancialGoal[] = [];
    for (const cid of clientIds) {
      const goals = await db.select().from(financialGoals).where(eq(financialGoals.clientId, cid));
      allGoals.push(...goals);
    }
    return allGoals;
  }

  async getFinancialGoal(id: string): Promise<FinancialGoal | undefined> {
    const [result] = await db.select().from(financialGoals).where(eq(financialGoals.id, id));
    return result;
  }

  async createFinancialGoal(goal: InsertFinancialGoal): Promise<FinancialGoal> {
    const [result] = await db.insert(financialGoals).values(goal).returning();
    return result;
  }

  async updateFinancialGoal(id: string, data: Partial<FinancialGoal>): Promise<FinancialGoal | undefined> {
    const [result] = await db.update(financialGoals).set({ ...data, updatedAt: new Date() }).where(eq(financialGoals.id, id)).returning();
    return result;
  }

  async deleteFinancialGoal(id: string): Promise<void> {
    await db.delete(financialGoals).where(eq(financialGoals.id, id));
  }

  async getDiscoveryQuestionnaires(advisorId: string): Promise<DiscoveryQuestionnaire[]> {
    return db.select().from(discoveryQuestionnaires)
      .where(eq(discoveryQuestionnaires.advisorId, advisorId))
      .orderBy(desc(discoveryQuestionnaires.createdAt));
  }

  async getDiscoveryQuestionnaire(id: string): Promise<DiscoveryQuestionnaire | undefined> {
    const [row] = await db.select().from(discoveryQuestionnaires)
      .where(eq(discoveryQuestionnaires.id, id)).limit(1);
    return row;
  }

  async getDiscoveryQuestionnairesByType(advisorId: string, clientType: string): Promise<DiscoveryQuestionnaire[]> {
    return db.select().from(discoveryQuestionnaires)
      .where(and(
        eq(discoveryQuestionnaires.advisorId, advisorId),
        eq(discoveryQuestionnaires.clientType, clientType),
        eq(discoveryQuestionnaires.isActive, true),
      ))
      .orderBy(desc(discoveryQuestionnaires.createdAt));
  }

  async createDiscoveryQuestionnaire(data: InsertDiscoveryQuestionnaire): Promise<DiscoveryQuestionnaire> {
    const [row] = await db.insert(discoveryQuestionnaires).values(data).returning();
    return row;
  }

  async updateDiscoveryQuestionnaire(id: string, data: Partial<DiscoveryQuestionnaire>): Promise<DiscoveryQuestionnaire | undefined> {
    const [row] = await db.update(discoveryQuestionnaires)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(discoveryQuestionnaires.id, id)).returning();
    return row;
  }

  async deleteDiscoveryQuestionnaire(id: string): Promise<void> {
    await db.delete(discoveryQuestionnaires).where(eq(discoveryQuestionnaires.id, id));
  }

  async getDiscoverySessions(advisorId: string): Promise<DiscoverySession[]> {
    return db.select().from(discoverySessions)
      .where(eq(discoverySessions.advisorId, advisorId))
      .orderBy(desc(discoverySessions.createdAt));
  }

  async getDiscoverySession(id: string): Promise<DiscoverySession | undefined> {
    const [row] = await db.select().from(discoverySessions)
      .where(eq(discoverySessions.id, id)).limit(1);
    return row;
  }

  async getDiscoverySessionsByClient(clientId: string): Promise<DiscoverySession[]> {
    return db.select().from(discoverySessions)
      .where(eq(discoverySessions.clientId, clientId))
      .orderBy(desc(discoverySessions.createdAt));
  }

  async createDiscoverySession(data: InsertDiscoverySession): Promise<DiscoverySession> {
    const [row] = await db.insert(discoverySessions).values(data).returning();
    return row;
  }

  async updateDiscoverySession(id: string, data: Partial<DiscoverySession>): Promise<DiscoverySession | undefined> {
    const [row] = await db.update(discoverySessions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(discoverySessions.id, id)).returning();
    return row;
  }

  async deleteDiscoverySession(id: string): Promise<void> {
    await db.delete(discoverySessions).where(eq(discoverySessions.id, id));
  }

  async getTrustsByClient(clientId: string): Promise<Trust[]> {
    return db.select().from(trusts).where(eq(trusts.clientId, clientId)).orderBy(desc(trusts.createdAt));
  }

  async getTrust(id: string): Promise<Trust | undefined> {
    const [result] = await db.select().from(trusts).where(eq(trusts.id, id));
    return result;
  }

  async createTrust(data: InsertTrust): Promise<Trust> {
    const [result] = await db.insert(trusts).values(data).returning();
    return result;
  }

  async updateTrust(id: string, data: Partial<Trust>): Promise<Trust | undefined> {
    const [result] = await db.update(trusts).set({ ...data, updatedAt: new Date() }).where(eq(trusts.id, id)).returning();
    return result;
  }

  async deleteTrust(id: string): Promise<void> {
    await db.delete(trustRelationships).where(eq(trustRelationships.trustId, id));
    await db.delete(trusts).where(eq(trusts.id, id));
  }

  async getTrustRelationships(trustId: string): Promise<TrustRelationship[]> {
    return db.select().from(trustRelationships).where(eq(trustRelationships.trustId, trustId));
  }

  async getTrustRelationshipsByTrustIds(trustIds: string[]): Promise<TrustRelationship[]> {
    if (trustIds.length === 0) return [];
    return db.select().from(trustRelationships).where(inArray(trustRelationships.trustId, trustIds));
  }

  async getTrustRelationship(id: string): Promise<TrustRelationship | undefined> {
    const [result] = await db.select().from(trustRelationships).where(eq(trustRelationships.id, id));
    return result;
  }

  async createTrustRelationship(data: InsertTrustRelationship): Promise<TrustRelationship> {
    const [result] = await db.insert(trustRelationships).values(data).returning();
    return result;
  }

  async deleteTrustRelationship(id: string): Promise<void> {
    await db.delete(trustRelationships).where(eq(trustRelationships.id, id));
  }

  async getEstateExemptions(clientId: string): Promise<EstateExemption[]> {
    return db.select().from(estateExemptions).where(eq(estateExemptions.clientId, clientId)).orderBy(desc(estateExemptions.taxYear));
  }

  async getEstateExemption(id: string): Promise<EstateExemption | undefined> {
    const [result] = await db.select().from(estateExemptions).where(eq(estateExemptions.id, id));
    return result;
  }

  async createEstateExemption(data: InsertEstateExemption): Promise<EstateExemption> {
    const [result] = await db.insert(estateExemptions).values(data).returning();
    return result;
  }

  async updateEstateExemption(id: string, data: Partial<EstateExemption>): Promise<EstateExemption | undefined> {
    const [result] = await db.update(estateExemptions).set({ ...data, updatedAt: new Date() }).where(eq(estateExemptions.id, id)).returning();
    return result;
  }

  async getGiftHistory(clientId: string): Promise<GiftHistoryEntry[]> {
    return db.select().from(giftHistory).where(eq(giftHistory.clientId, clientId)).orderBy(desc(giftHistory.giftDate));
  }

  async getGiftHistoryEntry(id: string): Promise<GiftHistoryEntry | undefined> {
    const [result] = await db.select().from(giftHistory).where(eq(giftHistory.id, id));
    return result;
  }

  async createGiftHistoryEntry(data: InsertGiftHistory): Promise<GiftHistoryEntry> {
    const [result] = await db.insert(giftHistory).values(data).returning();
    return result;
  }

  async deleteGiftHistoryEntry(id: string): Promise<void> {
    await db.delete(giftHistory).where(eq(giftHistory.id, id));
  }

  async createFiduciaryValidationLog(data: InsertFiduciaryValidationLog): Promise<FiduciaryValidationLog> {
    const [log] = await db.insert(fiduciaryValidationLogs).values(data).returning();
    return log;
  }

  async getFiduciaryValidationLogs(options?: { advisorId?: string; clientId?: string; outcome?: string; limit?: number; offset?: number }): Promise<FiduciaryValidationLog[]> {
    const conditions: any[] = [];
    if (options?.advisorId) conditions.push(eq(fiduciaryValidationLogs.advisorId, options.advisorId));
    if (options?.clientId) conditions.push(eq(fiduciaryValidationLogs.clientId, options.clientId));
    if (options?.outcome) conditions.push(eq(fiduciaryValidationLogs.outcome, options.outcome));

    const query = db.select().from(fiduciaryValidationLogs);
    const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
    return filtered
      .orderBy(desc(fiduciaryValidationLogs.createdAt))
      .limit(options?.limit || 100)
      .offset(options?.offset || 0);
  }

  async getFiduciaryValidationLog(id: string): Promise<FiduciaryValidationLog | undefined> {
    const [result] = await db.select().from(fiduciaryValidationLogs)
      .where(eq(fiduciaryValidationLogs.id, id));
    return result;
  }

  async resolveFiduciaryValidation(id: string, resolvedBy: string, resolutionNote: string): Promise<FiduciaryValidationLog | undefined> {
    const [result] = await db.update(fiduciaryValidationLogs)
      .set({ resolvedBy, resolvedAt: new Date(), resolutionNote })
      .where(eq(fiduciaryValidationLogs.id, id))
      .returning();
    return result;
  }

  async getFiduciaryValidationStats(advisorId?: string): Promise<{ total: number; clean: number; flagged: number; blocked: number; resolved: number; violationPatterns: Array<{ ruleId: string; ruleName: string; category: string; count: number }>; recentTrend: Array<{ date: string; total: number; flagged: number; blocked: number }> }> {
    const conditions: any[] = [];
    if (advisorId) conditions.push(eq(fiduciaryValidationLogs.advisorId, advisorId));

    const allLogs = conditions.length > 0
      ? await db.select().from(fiduciaryValidationLogs).where(and(...conditions))
      : await db.select().from(fiduciaryValidationLogs);

    const violationCounts: Record<string, { ruleId: string; ruleName: string; category: string; count: number }> = {};
    for (const log of allLogs) {
      const matches = log.matches as any[];
      if (Array.isArray(matches)) {
        for (const match of matches) {
          const key = match.ruleId || "unknown";
          if (!violationCounts[key]) {
            violationCounts[key] = {
              ruleId: match.ruleId || "unknown",
              ruleName: match.ruleName || "Unknown Rule",
              category: match.category || "unknown",
              count: 0,
            };
          }
          violationCounts[key].count++;
        }
      }
    }
    const violationPatterns = Object.values(violationCounts).sort((a, b) => b.count - a.count);

    const trendMap: Record<string, { total: number; flagged: number; blocked: number }> = {};
    for (const log of allLogs) {
      const date = log.createdAt ? new Date(log.createdAt).toISOString().split("T")[0] : "unknown";
      if (!trendMap[date]) trendMap[date] = { total: 0, flagged: 0, blocked: 0 };
      trendMap[date].total++;
      if (log.outcome === "flagged") trendMap[date].flagged++;
      if (log.outcome === "blocked") trendMap[date].blocked++;
    }
    const recentTrend = Object.entries(trendMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);

    return {
      total: allLogs.length,
      clean: allLogs.filter(l => l.outcome === "clean").length,
      flagged: allLogs.filter(l => l.outcome === "flagged").length,
      blocked: allLogs.filter(l => l.outcome === "blocked").length,
      resolved: allLogs.filter(l => l.resolvedBy !== null).length,
      violationPatterns,
      recentTrend,
    };
  }

  async getFiduciaryRuleConfig(advisorId?: string): Promise<FiduciaryRuleConfig | undefined> {
    if (advisorId) {
      const [result] = await db.select().from(fiduciaryRuleConfigs)
        .where(eq(fiduciaryRuleConfigs.advisorId, advisorId));
      if (result) return result;
    }
    const [global] = await db.select().from(fiduciaryRuleConfigs)
      .where(isNull(fiduciaryRuleConfigs.advisorId))
      .orderBy(desc(fiduciaryRuleConfigs.updatedAt))
      .limit(1);
    return global;
  }

  async upsertFiduciaryRuleConfig(data: InsertFiduciaryRuleConfig): Promise<FiduciaryRuleConfig> {
    const existing = await this.getFiduciaryRuleConfig(data.advisorId || undefined);
    if (existing) {
      const [updated] = await db.update(fiduciaryRuleConfigs)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(fiduciaryRuleConfigs.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(fiduciaryRuleConfigs).values(data).returning();
    return created;
  }

  async createBehavioralAnalysis(data: InsertBehavioralAnalysis): Promise<BehavioralAnalysis> {
    const [analysis] = await db.insert(behavioralAnalyses).values(data).returning();
    return analysis;
  }

  async getBehavioralAnalysesByClient(clientId: string): Promise<BehavioralAnalysis[]> {
    return db
      .select()
      .from(behavioralAnalyses)
      .where(eq(behavioralAnalyses.clientId, clientId))
      .orderBy(desc(behavioralAnalyses.createdAt));
  }

  async getBehavioralAnalysesByAdvisor(advisorId: string): Promise<BehavioralAnalysis[]> {
    return db
      .select()
      .from(behavioralAnalyses)
      .where(eq(behavioralAnalyses.advisorId, advisorId))
      .orderBy(desc(behavioralAnalyses.createdAt));
  }

  async getLatestBehavioralAnalysis(clientId: string): Promise<BehavioralAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(behavioralAnalyses)
      .where(eq(behavioralAnalyses.clientId, clientId))
      .orderBy(desc(behavioralAnalyses.createdAt))
      .limit(1);
    return analysis;
  }

  async createPendingProfileUpdate(data: InsertPendingProfileUpdate): Promise<PendingProfileUpdate> {
    const [result] = await db.insert(pendingProfileUpdates).values(data).returning();
    return result;
  }

  async getPendingProfileUpdates(advisorId: string, status?: string): Promise<PendingProfileUpdate[]> {
    if (status && status !== "all") {
      return db.select().from(pendingProfileUpdates)
        .where(and(eq(pendingProfileUpdates.advisorId, advisorId), eq(pendingProfileUpdates.status, status)))
        .orderBy(desc(pendingProfileUpdates.createdAt));
    }
    return db.select().from(pendingProfileUpdates)
      .where(eq(pendingProfileUpdates.advisorId, advisorId))
      .orderBy(desc(pendingProfileUpdates.createdAt));
  }

  async getPendingProfileUpdate(id: string): Promise<PendingProfileUpdate | undefined> {
    const [result] = await db.select().from(pendingProfileUpdates).where(eq(pendingProfileUpdates.id, id));
    return result;
  }

  async updatePendingProfileUpdate(id: string, data: Partial<PendingProfileUpdate>): Promise<PendingProfileUpdate | undefined> {
    const [result] = await db.update(pendingProfileUpdates).set(data).where(eq(pendingProfileUpdates.id, id)).returning();
    return result;
  }

  async getPendingProfileUpdatesByClient(clientId: string): Promise<PendingProfileUpdate[]> {
    return db.select().from(pendingProfileUpdates)
      .where(eq(pendingProfileUpdates.clientId, clientId))
      .orderBy(desc(pendingProfileUpdates.createdAt));
  }

  async getWithdrawalRequests(advisorId: string, status?: string): Promise<WithdrawalRequest[]> {
    if (status && status !== "all") {
      return db.select().from(withdrawalRequests)
        .where(and(eq(withdrawalRequests.advisorId, advisorId), eq(withdrawalRequests.status, status)))
        .orderBy(desc(withdrawalRequests.createdAt));
    }
    return db.select().from(withdrawalRequests)
      .where(eq(withdrawalRequests.advisorId, advisorId))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async getWithdrawalRequest(id: string): Promise<WithdrawalRequest | undefined> {
    const [result] = await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.id, id));
    return result;
  }

  async createWithdrawalRequest(data: InsertWithdrawalRequest): Promise<WithdrawalRequest> {
    const [result] = await db.insert(withdrawalRequests).values(data).returning();
    return result;
  }

  async updateWithdrawalRequest(id: string, data: Partial<WithdrawalRequest>): Promise<WithdrawalRequest | undefined> {
    const [result] = await db.update(withdrawalRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(withdrawalRequests.id, id))
      .returning();
    return result;
  }

  async getWithdrawalAuditLog(withdrawalId: string): Promise<WithdrawalAuditLog[]> {
    return db.select().from(withdrawalAuditLog)
      .where(eq(withdrawalAuditLog.withdrawalId, withdrawalId))
      .orderBy(desc(withdrawalAuditLog.createdAt));
  }

  async createWithdrawalAuditEntry(data: InsertWithdrawalAuditLog): Promise<WithdrawalAuditLog> {
    const [result] = await db.insert(withdrawalAuditLog).values(data).returning();
    return result;
  }

  async getSopDocuments(status?: string): Promise<SopDocument[]> {
    if (status) {
      return db.select().from(sopDocuments).where(eq(sopDocuments.status, status)).orderBy(desc(sopDocuments.updatedAt));
    }
    return db.select().from(sopDocuments).orderBy(desc(sopDocuments.updatedAt));
  }

  async getSopDocument(id: string): Promise<SopDocument | undefined> {
    const [result] = await db.select().from(sopDocuments).where(eq(sopDocuments.id, id));
    return result;
  }

  async createSopDocument(doc: InsertSopDocument): Promise<SopDocument> {
    const [result] = await db.insert(sopDocuments).values(doc).returning();
    return result;
  }

  async updateSopDocument(id: string, data: Partial<SopDocument>): Promise<SopDocument | undefined> {
    const [result] = await db.update(sopDocuments).set({ ...data, updatedAt: new Date() }).where(eq(sopDocuments.id, id)).returning();
    return result;
  }

  async deleteSopDocument(id: string): Promise<void> {
    await db.delete(sopChunks).where(eq(sopChunks.documentId, id));
    await db.delete(sopDocuments).where(eq(sopDocuments.id, id));
  }

  async getSopChunks(documentId: string): Promise<SopChunk[]> {
    return db.select().from(sopChunks).where(eq(sopChunks.documentId, documentId)).orderBy(asc(sopChunks.chunkIndex));
  }

  async getAllSopChunks(): Promise<SopChunk[]> {
    return db.select().from(sopChunks).orderBy(asc(sopChunks.chunkIndex));
  }

  async createSopChunk(chunk: InsertSopChunk): Promise<SopChunk> {
    const [result] = await db.insert(sopChunks).values(chunk).returning();
    return result;
  }

  async deleteSopChunksByDocument(documentId: string): Promise<void> {
    await db.delete(sopChunks).where(eq(sopChunks.documentId, documentId));
  }

  async searchSopChunks(query: string, limit = 10): Promise<(SopChunk & { documentTitle?: string; documentCategory?: string })[]> {
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (keywords.length === 0) return [];

    const allChunks = await db
      .select({
        chunk: sopChunks,
        docTitle: sopDocuments.title,
        docCategory: sopDocuments.category,
      })
      .from(sopChunks)
      .innerJoin(sopDocuments, eq(sopChunks.documentId, sopDocuments.id))
      .where(eq(sopDocuments.status, "active"));

    const scored = allChunks.map(row => {
      const content = row.chunk.content.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        const matches = content.split(kw).length - 1;
        score += matches;
      }
      return { ...row, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

    return scored.map(r => ({
      ...r.chunk,
      documentTitle: r.docTitle,
      documentCategory: r.docCategory,
    }));
  }

  async getCustodialInstructions(filters?: { custodian?: string; actionType?: string }): Promise<CustodialInstruction[]> {
    const conditions = [eq(custodialInstructions.status, "active")];
    if (filters?.custodian) conditions.push(eq(custodialInstructions.custodian, filters.custodian));
    if (filters?.actionType) conditions.push(eq(custodialInstructions.actionType, filters.actionType));

    return db.select().from(custodialInstructions)
      .where(and(...conditions))
      .orderBy(custodialInstructions.custodian, custodialInstructions.actionType);
  }

  async getCustodialInstruction(id: string): Promise<CustodialInstruction | undefined> {
    const [result] = await db.select().from(custodialInstructions).where(eq(custodialInstructions.id, id));
    return result;
  }

  async createCustodialInstruction(instr: InsertCustodialInstruction): Promise<CustodialInstruction> {
    const [result] = await db.insert(custodialInstructions).values(instr).returning();
    return result;
  }

  async updateCustodialInstruction(id: string, data: Partial<CustodialInstruction>): Promise<CustodialInstruction | undefined> {
    const [result] = await db.update(custodialInstructions).set({ ...data, updatedAt: new Date() }).where(eq(custodialInstructions.id, id)).returning();
    return result;
  }

  async deleteCustodialInstruction(id: string): Promise<void> {
    await db.delete(custodialInstructions).where(eq(custodialInstructions.id, id));
  }

  async getKycRiskRating(clientId: string): Promise<KycRiskRating | undefined> {
    const [result] = await db.select().from(kycRiskRatings).where(eq(kycRiskRatings.clientId, clientId)).orderBy(desc(kycRiskRatings.createdAt)).limit(1);
    return result;
  }

  async getKycRiskRatingsByAdvisor(advisorId: string): Promise<KycRiskRating[]> {
    return db.select().from(kycRiskRatings).where(eq(kycRiskRatings.advisorId, advisorId)).orderBy(desc(kycRiskRatings.createdAt));
  }

  async createKycRiskRating(data: InsertKycRiskRating): Promise<KycRiskRating> {
    const [result] = await db.insert(kycRiskRatings).values(data).returning();
    return result;
  }

  async updateKycRiskRating(id: string, data: Partial<KycRiskRating>): Promise<KycRiskRating | undefined> {
    const [result] = await db.update(kycRiskRatings).set({ ...data, updatedAt: new Date() }).where(eq(kycRiskRatings.id, id)).returning();
    return result;
  }

  async getAmlScreeningResults(clientId: string): Promise<AmlScreeningResult[]> {
    return db.select().from(amlScreeningResults).where(eq(amlScreeningResults.clientId, clientId)).orderBy(desc(amlScreeningResults.createdAt));
  }

  async getAmlScreeningResultsByAdvisor(advisorId: string): Promise<AmlScreeningResult[]> {
    return db.select().from(amlScreeningResults).where(eq(amlScreeningResults.advisorId, advisorId)).orderBy(desc(amlScreeningResults.createdAt));
  }

  async createAmlScreeningResult(data: InsertAmlScreeningResult): Promise<AmlScreeningResult> {
    const [result] = await db.insert(amlScreeningResults).values(data).returning();
    return result;
  }

  async updateAmlScreeningResult(id: string, data: Partial<AmlScreeningResult>): Promise<AmlScreeningResult | undefined> {
    const [result] = await db.update(amlScreeningResults).set(data).where(eq(amlScreeningResults.id, id)).returning();
    return result;
  }

  async getKycReviewSchedule(clientId: string): Promise<KycReviewSchedule | undefined> {
    const [result] = await db.select().from(kycReviewSchedules).where(eq(kycReviewSchedules.clientId, clientId)).orderBy(desc(kycReviewSchedules.createdAt)).limit(1);
    return result;
  }

  async getKycReviewSchedulesByAdvisor(advisorId: string): Promise<KycReviewSchedule[]> {
    return db.select().from(kycReviewSchedules).where(eq(kycReviewSchedules.advisorId, advisorId)).orderBy(kycReviewSchedules.nextReviewDate);
  }

  async createKycReviewSchedule(data: InsertKycReviewSchedule): Promise<KycReviewSchedule> {
    const [result] = await db.insert(kycReviewSchedules).values(data).returning();
    return result;
  }

  async updateKycReviewSchedule(id: string, data: Partial<KycReviewSchedule>): Promise<KycReviewSchedule | undefined> {
    const [result] = await db.update(kycReviewSchedules).set({ ...data, updatedAt: new Date() }).where(eq(kycReviewSchedules.id, id)).returning();
    return result;
  }

  async getEddRecords(clientId: string): Promise<EddRecord[]> {
    return db.select().from(eddRecords).where(eq(eddRecords.clientId, clientId)).orderBy(desc(eddRecords.createdAt));
  }

  async getEddRecordsByAdvisor(advisorId: string): Promise<EddRecord[]> {
    return db.select().from(eddRecords).where(eq(eddRecords.advisorId, advisorId)).orderBy(desc(eddRecords.createdAt));
  }

  async getEddRecord(id: string): Promise<EddRecord | undefined> {
    const [result] = await db.select().from(eddRecords).where(eq(eddRecords.id, id));
    return result;
  }

  async createEddRecord(data: InsertEddRecord): Promise<EddRecord> {
    const [result] = await db.insert(eddRecords).values(data).returning();
    return result;
  }

  async updateEddRecord(id: string, data: Partial<EddRecord>): Promise<EddRecord | undefined> {
    const [result] = await db.update(eddRecords).set({ ...data, updatedAt: new Date() }).where(eq(eddRecords.id, id)).returning();
    return result;
  }

  async getKycAuditLog(clientId: string): Promise<KycAuditLogEntry[]> {
    return db.select().from(kycAuditLog).where(eq(kycAuditLog.clientId, clientId)).orderBy(desc(kycAuditLog.createdAt));
  }

  async getKycAuditLogByAdvisor(advisorId: string): Promise<KycAuditLogEntry[]> {
    return db.select().from(kycAuditLog).where(eq(kycAuditLog.advisorId, advisorId)).orderBy(desc(kycAuditLog.createdAt));
  }

  async createKycAuditLog(data: InsertKycAuditLog): Promise<KycAuditLogEntry> {
    const [result] = await db.insert(kycAuditLog).values(data).returning();
    return result;
  }

  async getAllOfacSdnEntries(): Promise<OfacSdnEntry[]> {
    return db.select().from(ofacSdnEntries);
  }

  async createOfacSdnEntry(data: InsertOfacSdnEntry): Promise<OfacSdnEntry> {
    const [result] = await db.insert(ofacSdnEntries).values(data).returning();
    return result;
  }

  async bulkCreateOfacSdnEntries(data: InsertOfacSdnEntry[]): Promise<number> {
    if (data.length === 0) return 0;
    const batchSize = 100;
    let inserted = 0;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      await db.insert(ofacSdnEntries).values(batch);
      inserted += batch.length;
    }
    return inserted;
  }

  async clearOfacSdnEntries(): Promise<void> {
    await db.delete(ofacSdnEntries);
  }

  async getOfacSdnEntryCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(ofacSdnEntries);
    return Number(result?.count || 0);
  }

  async getAllPepEntries(): Promise<PepEntry[]> {
    return db.select().from(pepEntries);
  }

  async createPepEntry(data: InsertPepEntry): Promise<PepEntry> {
    const [result] = await db.insert(pepEntries).values(data).returning();
    return result;
  }

  async bulkCreatePepEntries(data: InsertPepEntry[]): Promise<number> {
    if (data.length === 0) return 0;
    const batchSize = 100;
    let inserted = 0;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      await db.insert(pepEntries).values(batch);
      inserted += batch.length;
    }
    return inserted;
  }

  async clearPepEntries(): Promise<void> {
    await db.delete(pepEntries);
  }

  async getPepEntryCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(pepEntries);
    return Number(result?.count || 0);
  }

  async getScreeningConfig(advisorId: string): Promise<ScreeningConfig | undefined> {
    const [result] = await db.select().from(screeningConfigs).where(eq(screeningConfigs.advisorId, advisorId));
    return result;
  }

  async createScreeningConfig(data: InsertScreeningConfig): Promise<ScreeningConfig> {
    const [result] = await db.insert(screeningConfigs).values(data).returning();
    return result;
  }

  async updateScreeningConfig(id: string, data: Partial<ScreeningConfig>): Promise<ScreeningConfig | undefined> {
    const [result] = await db.update(screeningConfigs).set({ ...data, updatedAt: new Date() }).where(eq(screeningConfigs.id, id)).returning();
    return result;
  }

  async createEngagementEvent(data: InsertEngagementEvent): Promise<EngagementEvent> {
    const [result] = await db.insert(engagementEvents).values(data).returning();
    return result;
  }

  async getEngagementEventsByClient(clientId: string, limit = 50): Promise<EngagementEvent[]> {
    return db.select().from(engagementEvents)
      .where(eq(engagementEvents.clientId, clientId))
      .orderBy(desc(engagementEvents.occurredAt))
      .limit(limit);
  }

  async getEngagementEventsByAdvisor(advisorId: string, limit = 100): Promise<EngagementEvent[]> {
    return db.select().from(engagementEvents)
      .where(eq(engagementEvents.advisorId, advisorId))
      .orderBy(desc(engagementEvents.occurredAt))
      .limit(limit);
  }

  async upsertEngagementScore(data: InsertEngagementScore): Promise<EngagementScore> {
    const existing = await db.select().from(engagementScores)
      .where(eq(engagementScores.clientId, data.clientId))
      .limit(1);
    if (existing.length > 0) {
      const [updated] = await db.update(engagementScores)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(engagementScores.id, existing[0].id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(engagementScores).values(data).returning();
    return created;
  }

  async getEngagementScore(clientId: string): Promise<EngagementScore | undefined> {
    const [result] = await db.select().from(engagementScores)
      .where(eq(engagementScores.clientId, clientId));
    return result;
  }

  async getEngagementScoresByAdvisor(advisorId: string): Promise<EngagementScore[]> {
    return db.select().from(engagementScores)
      .where(eq(engagementScores.advisorId, advisorId))
      .orderBy(desc(engagementScores.compositeScore));
  }

  async createIntentSignal(data: InsertIntentSignal): Promise<IntentSignal> {
    const [result] = await db.insert(intentSignals).values(data).returning();
    return result;
  }

  async getActiveIntentSignals(advisorId: string): Promise<IntentSignal[]> {
    return db.select().from(intentSignals)
      .where(and(
        eq(intentSignals.advisorId, advisorId),
        eq(intentSignals.isActive, true)
      ))
      .orderBy(desc(intentSignals.detectedAt));
  }

  async getIntentSignalsByClient(clientId: string): Promise<IntentSignal[]> {
    return db.select().from(intentSignals)
      .where(eq(intentSignals.clientId, clientId))
      .orderBy(desc(intentSignals.detectedAt));
  }

  async deactivateIntentSignal(id: string): Promise<void> {
    await db.update(intentSignals)
      .set({ isActive: false })
      .where(eq(intentSignals.id, id));
  }

  async createNextBestAction(data: InsertNextBestAction): Promise<NextBestAction> {
    const [result] = await db.insert(nextBestActions).values(data).returning();
    return result;
  }

  async getNextBestActions(advisorId: string, status?: string): Promise<NextBestAction[]> {
    const conditions = [eq(nextBestActions.advisorId, advisorId)];
    if (status) conditions.push(eq(nextBestActions.status, status));
    return db.select().from(nextBestActions)
      .where(and(...conditions))
      .orderBy(desc(nextBestActions.priority));
  }

  async getNextBestActionsByClient(clientId: string): Promise<NextBestAction[]> {
    return db.select().from(nextBestActions)
      .where(eq(nextBestActions.clientId, clientId))
      .orderBy(desc(nextBestActions.priority));
  }

  async updateNextBestAction(id: string, data: Partial<NextBestAction>): Promise<NextBestAction | undefined> {
    const [result] = await db.update(nextBestActions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(nextBestActions.id, id))
      .returning();
    return result;
  }

  async completeNextBestAction(id: string): Promise<NextBestAction | undefined> {
    const [result] = await db.update(nextBestActions)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(nextBestActions.id, id))
      .returning();
    return result;
  }

  async dismissNextBestAction(id: string): Promise<NextBestAction | undefined> {
    const [result] = await db.update(nextBestActions)
      .set({ status: "dismissed", dismissedAt: new Date(), updatedAt: new Date() })
      .where(eq(nextBestActions.id, id))
      .returning();
    return result;
  }

  async getCharitableAccountsByClient(clientId: string): Promise<CharitableAccount[]> {
    return db.select().from(charitableAccounts).where(eq(charitableAccounts.clientId, clientId)).orderBy(desc(charitableAccounts.createdAt));
  }

  async getCharitableAccount(id: string): Promise<CharitableAccount | undefined> {
    const [result] = await db.select().from(charitableAccounts).where(eq(charitableAccounts.id, id));
    return result;
  }

  async createCharitableAccount(data: InsertCharitableAccount): Promise<CharitableAccount> {
    const [result] = await db.insert(charitableAccounts).values(data).returning();
    return result;
  }

  async updateCharitableAccount(id: string, data: Partial<CharitableAccount>): Promise<CharitableAccount | undefined> {
    const [result] = await db.update(charitableAccounts).set({ ...data, updatedAt: new Date() }).where(eq(charitableAccounts.id, id)).returning();
    return result;
  }

  async deleteCharitableAccount(id: string): Promise<void> {
    await db.delete(charitableContributions).where(eq(charitableContributions.accountId, id));
    await db.delete(charitableGrants).where(eq(charitableGrants.accountId, id));
    await db.delete(charitableAccounts).where(eq(charitableAccounts.id, id));
  }

  async getContributionsByAccount(accountId: string): Promise<CharitableContribution[]> {
    return db.select().from(charitableContributions).where(eq(charitableContributions.accountId, accountId)).orderBy(desc(charitableContributions.date));
  }

  async getContributionsByAccountIds(accountIds: string[]): Promise<CharitableContribution[]> {
    if (accountIds.length === 0) return [];
    return db.select().from(charitableContributions).where(inArray(charitableContributions.accountId, accountIds)).orderBy(desc(charitableContributions.date));
  }

  async createCharitableContribution(data: InsertCharitableContribution): Promise<CharitableContribution> {
    const [result] = await db.insert(charitableContributions).values(data).returning();
    return result;
  }

  async deleteCharitableContribution(id: string): Promise<void> {
    await db.delete(charitableContributions).where(eq(charitableContributions.id, id));
  }

  async getGrantsByAccount(accountId: string): Promise<CharitableGrant[]> {
    return db.select().from(charitableGrants).where(eq(charitableGrants.accountId, accountId)).orderBy(desc(charitableGrants.date));
  }

  async getGrantsByAccountIds(accountIds: string[]): Promise<CharitableGrant[]> {
    if (accountIds.length === 0) return [];
    return db.select().from(charitableGrants).where(inArray(charitableGrants.accountId, accountIds)).orderBy(desc(charitableGrants.date));
  }

  async createCharitableGrant(data: InsertCharitableGrant): Promise<CharitableGrant> {
    const [result] = await db.insert(charitableGrants).values(data).returning();
    return result;
  }

  async deleteCharitableGrant(id: string): Promise<void> {
    await db.delete(charitableGrants).where(eq(charitableGrants.id, id));
  }

  async getCharitableGoalsByClient(clientId: string): Promise<CharitableGoal[]> {
    return db.select().from(charitableGoals).where(eq(charitableGoals.clientId, clientId)).orderBy(desc(charitableGoals.createdAt));
  }

  async getCharitableGoal(id: string): Promise<CharitableGoal | undefined> {
    const [result] = await db.select().from(charitableGoals).where(eq(charitableGoals.id, id));
    return result;
  }

  async createCharitableGoal(data: InsertCharitableGoal): Promise<CharitableGoal> {
    const [result] = await db.insert(charitableGoals).values(data).returning();
    return result;
  }

  async updateCharitableGoal(id: string, data: Partial<CharitableGoal>): Promise<CharitableGoal | undefined> {
    const [result] = await db.update(charitableGoals).set({ ...data, updatedAt: new Date() }).where(eq(charitableGoals.id, id)).returning();
    return result;
  }

  async deleteCharitableGoal(id: string): Promise<void> {
    await db.delete(charitableGoals).where(eq(charitableGoals.id, id));
  }

  async getResearchArticles(options?: { topic?: string; source?: string; search?: string; limit?: number; offset?: number }): Promise<ResearchArticle[]> {
    const conditions = [];
    if (options?.source) {
      conditions.push(eq(researchArticles.source, options.source));
    }
    if (options?.topic) {
      conditions.push(sql`${options.topic} = ANY(${researchArticles.topics})`);
    }
    if (options?.search) {
      conditions.push(
        or(
          ilike(researchArticles.title, `%${options.search}%`),
          ilike(researchArticles.content, `%${options.search}%`),
          ilike(researchArticles.summary || '', `%${options.search}%`)
        )!
      );
    }
    const query = db.select().from(researchArticles);
    const withWhere = conditions.length > 0 ? query.where(and(...conditions)) : query;
    return withWhere
      .orderBy(desc(researchArticles.publishedAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async getResearchArticle(id: string): Promise<ResearchArticle | undefined> {
    const [article] = await db.select().from(researchArticles).where(eq(researchArticles.id, id));
    return article;
  }

  async createResearchArticle(data: InsertResearchArticle): Promise<ResearchArticle> {
    const [article] = await db.insert(researchArticles).values(data).returning();
    return article;
  }

  async updateResearchArticle(id: string, data: Partial<ResearchArticle>): Promise<ResearchArticle | undefined> {
    const [updated] = await db.update(researchArticles).set(data).where(eq(researchArticles.id, id)).returning();
    return updated;
  }

  async deleteResearchArticle(id: string): Promise<void> {
    await db.delete(researchArticles).where(eq(researchArticles.id, id));
  }

  async getResearchArticleByUrl(url: string): Promise<ResearchArticle | undefined> {
    const [article] = await db.select().from(researchArticles).where(eq(researchArticles.sourceUrl, url));
    return article;
  }

  async getResearchArticleByContentHash(hash: string): Promise<ResearchArticle | undefined> {
    const [article] = await db.select().from(researchArticles).where(eq(researchArticles.contentHash, hash));
    return article;
  }

  async getResearchArticlesByTopics(topics: string[]): Promise<ResearchArticle[]> {
    if (topics.length === 0) return [];
    return db
      .select()
      .from(researchArticles)
      .where(sql`${researchArticles.topics} && ${sql`ARRAY[${sql.join(topics.map(t => sql`${t}`), sql`, `)}]::text[]`}`)
      .orderBy(desc(researchArticles.publishedAt))
      .limit(20);
  }

  async getResearchBriefsByArticle(articleId: string, advisorId: string): Promise<ResearchBrief[]> {
    return db.select().from(researchBriefs)
      .where(and(eq(researchBriefs.articleId, articleId), eq(researchBriefs.advisorId, advisorId)))
      .orderBy(desc(researchBriefs.generatedAt));
  }

  async getResearchBrief(id: string): Promise<ResearchBrief | undefined> {
    const [brief] = await db.select().from(researchBriefs).where(eq(researchBriefs.id, id));
    return brief;
  }

  async createResearchBrief(data: InsertResearchBrief): Promise<ResearchBrief> {
    const [brief] = await db.insert(researchBriefs).values(data).returning();
    return brief;
  }

  async updateResearchBrief(id: string, data: Partial<ResearchBrief>): Promise<ResearchBrief | undefined> {
    const [updated] = await db.update(researchBriefs).set({ ...data, updatedAt: new Date() }).where(eq(researchBriefs.id, id)).returning();
    return updated;
  }

  async deleteResearchBrief(id: string, advisorId: string): Promise<void> {
    await db.delete(researchBriefs).where(and(eq(researchBriefs.id, id), eq(researchBriefs.advisorId, advisorId)));
  }

  async getResearchBriefs(advisorId: string, options?: { limit?: number; offset?: number; search?: string }): Promise<ResearchBrief[]> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const advisorFilter = eq(researchBriefs.advisorId, advisorId);
    if (options?.search) {
      return db.select().from(researchBriefs)
        .where(and(advisorFilter, ilike(sql`COALESCE(${researchBriefs.executiveSummary}, '')`, `%${options.search}%`)))
        .orderBy(desc(researchBriefs.generatedAt))
        .limit(limit)
        .offset(offset);
    }
    return db.select().from(researchBriefs).where(advisorFilter).orderBy(desc(researchBriefs.generatedAt)).limit(limit).offset(offset);
  }

  async getResearchFeeds(): Promise<ResearchFeed[]> {
    return db.select().from(researchFeeds).orderBy(desc(researchFeeds.createdAt));
  }

  async getResearchFeed(id: string): Promise<ResearchFeed | undefined> {
    const [feed] = await db.select().from(researchFeeds).where(eq(researchFeeds.id, id));
    return feed;
  }

  async getActiveResearchFeeds(): Promise<ResearchFeed[]> {
    return db.select().from(researchFeeds).where(eq(researchFeeds.status, "active")).orderBy(asc(researchFeeds.lastFetchAt));
  }

  async createResearchFeed(data: InsertResearchFeed): Promise<ResearchFeed> {
    const [feed] = await db.insert(researchFeeds).values(data).returning();
    return feed;
  }

  async updateResearchFeed(id: string, data: Partial<ResearchFeed>): Promise<ResearchFeed | undefined> {
    const [updated] = await db.update(researchFeeds).set({ ...data, updatedAt: new Date() }).where(eq(researchFeeds.id, id)).returning();
    return updated;
  }

  async deleteResearchFeed(id: string): Promise<void> {
    await db.delete(researchFeeds).where(eq(researchFeeds.id, id));
  }

  async getTaxLotsByClient(clientId: string): Promise<TaxLot[]> {
    return await db.select().from(taxLots).where(eq(taxLots.clientId, clientId)).orderBy(desc(taxLots.acquisitionDate));
  }

  async getTaxLotsByAccount(accountId: string): Promise<TaxLot[]> {
    return await db.select().from(taxLots).where(eq(taxLots.accountId, accountId)).orderBy(desc(taxLots.acquisitionDate));
  }

  async getTaxLot(id: string): Promise<TaxLot | undefined> {
    const [result] = await db.select().from(taxLots).where(eq(taxLots.id, id));
    return result;
  }

  async createTaxLot(data: InsertTaxLot): Promise<TaxLot> {
    const [result] = await db.insert(taxLots).values(data).returning();
    return result;
  }

  async updateTaxLot(id: string, data: Partial<TaxLot>): Promise<TaxLot | undefined> {
    const [result] = await db.update(taxLots).set({ ...data, updatedAt: new Date() }).where(eq(taxLots.id, id)).returning();
    return result;
  }

  async getDirectIndexPortfoliosByClient(clientId: string): Promise<DirectIndexPortfolio[]> {
    return await db.select().from(directIndexPortfolios).where(eq(directIndexPortfolios.clientId, clientId)).orderBy(desc(directIndexPortfolios.createdAt));
  }

  async getDirectIndexPortfolio(id: string): Promise<DirectIndexPortfolio | undefined> {
    const [result] = await db.select().from(directIndexPortfolios).where(eq(directIndexPortfolios.id, id));
    return result;
  }

  async createDirectIndexPortfolio(data: InsertDirectIndexPortfolio): Promise<DirectIndexPortfolio> {
    const [result] = await db.insert(directIndexPortfolios).values(data).returning();
    return result;
  }

  async updateDirectIndexPortfolio(id: string, data: Partial<DirectIndexPortfolio>): Promise<DirectIndexPortfolio | undefined> {
    const [result] = await db.update(directIndexPortfolios).set({ ...data, updatedAt: new Date() }).where(eq(directIndexPortfolios.id, id)).returning();
    return result;
  }

  async getWashSaleEventsByClient(clientId: string): Promise<WashSaleEvent[]> {
    return await db.select().from(washSaleEvents).where(eq(washSaleEvents.clientId, clientId)).orderBy(desc(washSaleEvents.createdAt));
  }

  async createWashSaleEvent(data: InsertWashSaleEvent): Promise<WashSaleEvent> {
    const [result] = await db.insert(washSaleEvents).values(data).returning();
    return result;
  }

  async getSocialProfilesByClient(clientId: string): Promise<SocialProfile[]> {
    return db.select().from(socialProfiles).where(eq(socialProfiles.clientId, clientId)).orderBy(desc(socialProfiles.createdAt));
  }

  async getSocialProfile(id: string): Promise<SocialProfile | undefined> {
    const [result] = await db.select().from(socialProfiles).where(eq(socialProfiles.id, id));
    return result;
  }

  async createSocialProfile(data: InsertSocialProfile): Promise<SocialProfile> {
    const [result] = await db.insert(socialProfiles).values(data).returning();
    return result;
  }

  async updateSocialProfile(id: string, data: Partial<SocialProfile>): Promise<SocialProfile | undefined> {
    const [result] = await db.update(socialProfiles).set({ ...data, updatedAt: new Date() }).where(eq(socialProfiles.id, id)).returning();
    return result;
  }

  async deleteSocialProfile(id: string): Promise<void> {
    await db.delete(socialEvents).where(eq(socialEvents.socialProfileId, id));
    await db.delete(socialProfiles).where(eq(socialProfiles.id, id));
  }

  async getSocialEventsByClient(clientId: string): Promise<SocialEvent[]> {
    return db.select().from(socialEvents).where(eq(socialEvents.clientId, clientId)).orderBy(desc(socialEvents.detectedAt));
  }

  async getSocialEventsByProfile(profileId: string): Promise<SocialEvent[]> {
    return db.select().from(socialEvents).where(eq(socialEvents.socialProfileId, profileId)).orderBy(desc(socialEvents.detectedAt));
  }

  async getSocialEvent(id: string): Promise<SocialEvent | undefined> {
    const [result] = await db.select().from(socialEvents).where(eq(socialEvents.id, id));
    return result;
  }

  async createSocialEvent(data: InsertSocialEvent): Promise<SocialEvent> {
    const [result] = await db.insert(socialEvents).values(data).returning();
    return result;
  }

  async updateSocialEvent(id: string, data: Partial<SocialEvent>): Promise<SocialEvent | undefined> {
    const [result] = await db.update(socialEvents).set(data).where(eq(socialEvents.id, id)).returning();
    return result;
  }

  async getNigoRecords(advisorId: string, status?: string): Promise<NigoRecord[]> {
    if (status && status !== "all") {
      return db.select().from(nigoRecords)
        .where(and(eq(nigoRecords.advisorId, advisorId), eq(nigoRecords.status, status)))
        .orderBy(desc(nigoRecords.createdAt));
    }
    return db.select().from(nigoRecords)
      .where(eq(nigoRecords.advisorId, advisorId))
      .orderBy(desc(nigoRecords.createdAt));
  }

  async getNigoRecord(id: string): Promise<NigoRecord | undefined> {
    const [result] = await db.select().from(nigoRecords).where(eq(nigoRecords.id, id));
    return result;
  }

  async createNigoRecord(data: InsertNigoRecord): Promise<NigoRecord> {
    const [result] = await db.insert(nigoRecords).values(data).returning();
    return result;
  }

  async updateNigoRecord(id: string, data: Partial<NigoRecord>): Promise<NigoRecord | undefined> {
    const [result] = await db.update(nigoRecords)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(nigoRecords.id, id))
      .returning();
    return result;
  }

  async getNigoRecordsByCustodian(advisorId: string, custodian: string): Promise<NigoRecord[]> {
    return db.select().from(nigoRecords)
      .where(and(eq(nigoRecords.advisorId, advisorId), eq(nigoRecords.custodian, custodian)))
      .orderBy(desc(nigoRecords.createdAt));
  }

  async getBusinessValuationsByClient(clientId: string): Promise<BusinessValuation[]> {
    return db.select({ valuation: businessValuations }).from(businessValuations)
      .innerJoin(businessEntities, eq(businessValuations.businessEntityId, businessEntities.id))
      .where(eq(businessEntities.clientId, clientId))
      .orderBy(desc(businessValuations.createdAt))
      .then(rows => rows.map(r => r.valuation));
  }
  async getBusinessValuation(id: string): Promise<BusinessValuation | undefined> {
    const [result] = await db.select().from(businessValuations).where(eq(businessValuations.id, id));
    return result;
  }
  async updateBusinessValuation(id: string, data: Partial<BusinessValuation>): Promise<BusinessValuation | undefined> {
    const [result] = await db.update(businessValuations).set(data).where(eq(businessValuations.id, id)).returning();
    return result;
  }

  async getFlpStructuresByClient(clientId: string): Promise<FlpStructure[]> {
    return db.select().from(flpStructures).where(eq(flpStructures.clientId, clientId)).orderBy(desc(flpStructures.createdAt));
  }
  async getFlpStructure(id: string): Promise<FlpStructure | undefined> {
    const [result] = await db.select().from(flpStructures).where(eq(flpStructures.id, id));
    return result;
  }
  async createFlpStructure(data: InsertFlpStructure): Promise<FlpStructure> {
    const [result] = await db.insert(flpStructures).values(data).returning();
    return result;
  }
  async updateFlpStructure(id: string, data: Partial<FlpStructure>): Promise<FlpStructure | undefined> {
    const [result] = await db.update(flpStructures).set({ ...data, updatedAt: new Date() }).where(eq(flpStructures.id, id)).returning();
    return result;
  }
  async deleteFlpStructure(id: string): Promise<void> {
    await db.delete(flpStructures).where(eq(flpStructures.id, id));
  }

  async getBuySellAgreementsByClient(clientId: string): Promise<BuySellAgreement[]> {
    return db.select({ agreement: buySellAgreements }).from(buySellAgreements)
      .innerJoin(businessEntities, eq(buySellAgreements.businessEntityId, businessEntities.id))
      .where(eq(businessEntities.clientId, clientId))
      .orderBy(desc(buySellAgreements.createdAt))
      .then(rows => rows.map(r => r.agreement));
  }
  async getBuySellAgreement(id: string): Promise<BuySellAgreement | undefined> {
    const [result] = await db.select().from(buySellAgreements).where(eq(buySellAgreements.id, id));
    return result;
  }

  async getExitMilestonesByClient(clientId: string): Promise<ExitMilestone[]> {
    return db.select().from(exitMilestones).where(eq(exitMilestones.clientId, clientId)).orderBy(asc(exitMilestones.sortOrder));
  }
  async getExitMilestone(id: string): Promise<ExitMilestone | undefined> {
    const [result] = await db.select().from(exitMilestones).where(eq(exitMilestones.id, id));
    return result;
  }
  async createExitMilestone(data: InsertExitMilestone): Promise<ExitMilestone> {
    const [result] = await db.insert(exitMilestones).values(data).returning();
    return result;
  }
  async updateExitMilestone(id: string, data: Partial<ExitMilestone>): Promise<ExitMilestone | undefined> {
    const [result] = await db.update(exitMilestones).set({ ...data, updatedAt: new Date() }).where(eq(exitMilestones.id, id)).returning();
    return result;
  }
  async deleteExitMilestone(id: string): Promise<void> {
    await db.delete(exitMilestones).where(eq(exitMilestones.id, id));
  }

  async getDafAccountsByClient(clientId: string): Promise<DafAccount[]> {
    return db.select().from(dafAccounts).where(eq(dafAccounts.clientId, clientId)).orderBy(desc(dafAccounts.createdAt));
  }
  async getDafAccount(id: string): Promise<DafAccount | undefined> {
    const [result] = await db.select().from(dafAccounts).where(eq(dafAccounts.id, id));
    return result;
  }
  async createDafAccount(data: InsertDafAccount): Promise<DafAccount> {
    const [result] = await db.insert(dafAccounts).values(data).returning();
    return result;
  }
  async updateDafAccount(id: string, data: Partial<DafAccount>): Promise<DafAccount | undefined> {
    const [result] = await db.update(dafAccounts).set({ ...data, updatedAt: new Date() }).where(eq(dafAccounts.id, id)).returning();
    return result;
  }
  async deleteDafAccount(id: string): Promise<void> {
    await db.delete(dafAccounts).where(eq(dafAccounts.id, id));
  }
  async getDafTransactions(dafAccountId: string): Promise<DafTransaction[]> {
    return db.select().from(dafTransactions).where(eq(dafTransactions.dafAccountId, dafAccountId)).orderBy(desc(dafTransactions.createdAt));
  }
  async createDafTransaction(data: InsertDafTransaction): Promise<DafTransaction> {
    const [result] = await db.insert(dafTransactions).values(data).returning();
    return result;
  }
  async deleteDafTransaction(id: string): Promise<void> {
    await db.delete(dafTransactions).where(eq(dafTransactions.id, id));
  }

  async getCrtsByClient(clientId: string): Promise<CharitableRemainderTrust[]> {
    return db.select().from(charitableRemainderTrusts).where(eq(charitableRemainderTrusts.clientId, clientId)).orderBy(desc(charitableRemainderTrusts.createdAt));
  }
  async getCrt(id: string): Promise<CharitableRemainderTrust | undefined> {
    const [result] = await db.select().from(charitableRemainderTrusts).where(eq(charitableRemainderTrusts.id, id));
    return result;
  }
  async createCrt(data: InsertCharitableRemainderTrust): Promise<CharitableRemainderTrust> {
    const [result] = await db.insert(charitableRemainderTrusts).values(data).returning();
    return result;
  }
  async updateCrt(id: string, data: Partial<CharitableRemainderTrust>): Promise<CharitableRemainderTrust | undefined> {
    const [result] = await db.update(charitableRemainderTrusts).set({ ...data, updatedAt: new Date() }).where(eq(charitableRemainderTrusts.id, id)).returning();
    return result;
  }
  async deleteCrt(id: string): Promise<void> {
    await db.delete(charitableRemainderTrusts).where(eq(charitableRemainderTrusts.id, id));
  }

  async getQcdRecordsByClient(clientId: string): Promise<QcdRecord[]> {
    return db.select().from(qcdRecords).where(eq(qcdRecords.clientId, clientId)).orderBy(desc(qcdRecords.createdAt));
  }
  async getQcdRecord(id: string): Promise<QcdRecord | undefined> {
    const [result] = await db.select().from(qcdRecords).where(eq(qcdRecords.id, id));
    return result;
  }
  async createQcdRecord(data: InsertQcdRecord): Promise<QcdRecord> {
    const [result] = await db.insert(qcdRecords).values(data).returning();
    return result;
  }
  async deleteQcdRecord(id: string): Promise<void> {
    await db.delete(qcdRecords).where(eq(qcdRecords.id, id));
  }

  async getBusinessEntitiesByClient(clientId: string): Promise<BusinessEntity[]> {
    return db.select().from(businessEntities)
      .where(eq(businessEntities.clientId, clientId))
      .orderBy(desc(businessEntities.createdAt));
  }

  async getBusinessEntity(id: string): Promise<BusinessEntity | undefined> {
    const [row] = await db.select().from(businessEntities)
      .where(eq(businessEntities.id, id)).limit(1);
    return row;
  }

  async createBusinessEntity(data: InsertBusinessEntity): Promise<BusinessEntity> {
    const [row] = await db.insert(businessEntities).values(data).returning();
    return row;
  }

  async updateBusinessEntity(id: string, data: Partial<BusinessEntity>): Promise<BusinessEntity | undefined> {
    const [row] = await db.update(businessEntities)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(businessEntities.id, id)).returning();
    return row;
  }

  async deleteBusinessEntity(id: string): Promise<void> {
    await db.delete(exitPlanMilestones).where(eq(exitPlanMilestones.businessEntityId, id));
    await db.delete(buySellAgreements).where(eq(buySellAgreements.businessEntityId, id));
    await db.delete(businessValuations).where(eq(businessValuations.businessEntityId, id));
    await db.delete(businessEntities).where(eq(businessEntities.id, id));
  }

  async getBusinessValuations(businessEntityId: string): Promise<BusinessValuation[]> {
    return db.select().from(businessValuations)
      .where(eq(businessValuations.businessEntityId, businessEntityId))
      .orderBy(desc(businessValuations.valuationDate));
  }

  async createBusinessValuation(data: InsertBusinessValuation): Promise<BusinessValuation> {
    const [row] = await db.insert(businessValuations).values(data).returning();
    return row;
  }

  async deleteBusinessValuation(id: string): Promise<void> {
    await db.delete(businessValuations).where(eq(businessValuations.id, id));
  }

  async getBuySellAgreements(businessEntityId: string): Promise<BuySellAgreement[]> {
    return db.select().from(buySellAgreements)
      .where(eq(buySellAgreements.businessEntityId, businessEntityId))
      .orderBy(desc(buySellAgreements.createdAt));
  }

  async createBuySellAgreement(data: InsertBuySellAgreement): Promise<BuySellAgreement> {
    const [row] = await db.insert(buySellAgreements).values(data).returning();
    return row;
  }

  async updateBuySellAgreement(id: string, data: Partial<BuySellAgreement>): Promise<BuySellAgreement | undefined> {
    const [row] = await db.update(buySellAgreements)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(buySellAgreements.id, id)).returning();
    return row;
  }

  async deleteBuySellAgreement(id: string): Promise<void> {
    await db.delete(buySellAgreements).where(eq(buySellAgreements.id, id));
  }

  async getExitPlanMilestones(businessEntityId: string): Promise<ExitPlanMilestone[]> {
    return db.select().from(exitPlanMilestones)
      .where(eq(exitPlanMilestones.businessEntityId, businessEntityId))
      .orderBy(asc(exitPlanMilestones.sortOrder));
  }

  async createExitPlanMilestone(data: InsertExitPlanMilestone): Promise<ExitPlanMilestone> {
    const [row] = await db.insert(exitPlanMilestones).values(data).returning();
    return row;
  }

  async updateExitPlanMilestone(id: string, data: Partial<ExitPlanMilestone>): Promise<ExitPlanMilestone | undefined> {
    const [row] = await db.update(exitPlanMilestones)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(exitPlanMilestones.id, id)).returning();
    return row;
  }

  async deleteExitPlanMilestone(id: string): Promise<void> {
    await db.delete(exitPlanMilestones).where(eq(exitPlanMilestones.id, id));
  }

  async getAdvisorAssessmentDefaults(advisorId: string): Promise<AdvisorAssessmentDefaults | undefined> {
    const [result] = await db.select().from(advisorAssessmentDefaults).where(eq(advisorAssessmentDefaults.advisorId, advisorId));
    return result;
  }

  async upsertAdvisorAssessmentDefaults(advisorId: string, data: Partial<InsertAdvisorAssessmentDefaults>): Promise<AdvisorAssessmentDefaults> {
    const existing = await this.getAdvisorAssessmentDefaults(advisorId);
    if (existing) {
      const [result] = await db.update(advisorAssessmentDefaults)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(advisorAssessmentDefaults.advisorId, advisorId))
        .returning();
      return result;
    }
    const [result] = await db.insert(advisorAssessmentDefaults)
      .values({ advisorId, ...data })
      .returning();
    return result;
  }

  async getActiveClientAlerts(clientId: string): Promise<Alert[]> {
    return db.select().from(alerts)
      .where(and(eq(alerts.clientId, clientId), isNull(alerts.dismissedAt)))
      .orderBy(desc(alerts.createdAt));
  }

  async getAllApiKeyMetadata(): Promise<ApiKeyMetadata[]> {
    return db.select().from(apiKeyMetadata).orderBy(asc(apiKeyMetadata.keyName));
  }

  async getApiKeyMetadata(keyName: string): Promise<ApiKeyMetadata | undefined> {
    const [result] = await db.select().from(apiKeyMetadata).where(eq(apiKeyMetadata.keyName, keyName));
    return result;
  }

  async upsertApiKeyMetadata(keyName: string, data: Partial<InsertApiKeyMetadata>): Promise<ApiKeyMetadata> {
    const existing = await this.getApiKeyMetadata(keyName);
    if (existing) {
      const [result] = await db.update(apiKeyMetadata)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(apiKeyMetadata.keyName, keyName))
        .returning();
      return result;
    }
    const [result] = await db.insert(apiKeyMetadata)
      .values({ keyName, integration: data.integration || keyName, ...data })
      .returning();
    return result;
  }

  async markApiKeyRotated(keyName: string, rotatedBy?: string): Promise<ApiKeyMetadata | undefined> {
    const existing = await this.getApiKeyMetadata(keyName);
    if (!existing) return undefined;
    const [result] = await db.update(apiKeyMetadata)
      .set({ lastRotatedAt: new Date(), rotatedBy: rotatedBy || null, updatedAt: new Date() })
      .where(eq(apiKeyMetadata.keyName, keyName))
      .returning();
    return result;
  }

  async recordLogout(loginEventId: string): Promise<LoginEvent | undefined> {
    const [existing] = await db.select().from(loginEvents).where(eq(loginEvents.id, loginEventId));
    if (!existing) return undefined;
    const logoutTime = new Date();
    const loginTime = existing.loginTime || existing.timestamp;
    const sessionDuration = loginTime ? Math.floor((logoutTime.getTime() - loginTime.getTime()) / 60000) : null;
    const [result] = await db.update(loginEvents)
      .set({ logoutTime, sessionDuration })
      .where(eq(loginEvents.id, loginEventId))
      .returning();
    return result;
  }

  async getLoginEventsByAdvisor(advisorId: string, limit: number = 50, offset: number = 0): Promise<{ events: LoginEvent[]; total: number }> {
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(loginEvents).where(eq(loginEvents.userId, advisorId));
    const total = Number(totalResult[0]?.count || 0);
    const events = await db.select().from(loginEvents)
      .where(eq(loginEvents.userId, advisorId))
      .orderBy(desc(loginEvents.timestamp))
      .limit(limit)
      .offset(offset);
    return { events, total };
  }

  async createAuditLogEntry(entry: InsertAuditLogEntry): Promise<AuditLogEntry> {
    const [result] = await db.insert(auditLog).values(entry).returning();
    return result;
  }

  async getAuditLog(filters: { action?: string; entityType?: string; entityId?: string; advisorId?: string; startDate?: string; endDate?: string; limit?: number; offset?: number }): Promise<{ logs: AuditLogEntry[]; total: number }> {
    const conditions: any[] = [];
    if (filters.action) conditions.push(eq(auditLog.action, filters.action));
    if (filters.entityType) conditions.push(eq(auditLog.entityType, filters.entityType));
    if (filters.entityId) conditions.push(eq(auditLog.entityId, filters.entityId));
    if (filters.advisorId) conditions.push(eq(auditLog.advisorId, filters.advisorId));
    if (filters.startDate) conditions.push(gte(auditLog.timestamp, new Date(filters.startDate)));
    if (filters.endDate) conditions.push(lte(auditLog.timestamp, new Date(filters.endDate)));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(auditLog).where(whereClause);
    const total = Number(totalResult[0]?.count || 0);
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    const logs = await db.select().from(auditLog).where(whereClause).orderBy(desc(auditLog.timestamp)).limit(limit).offset(offset);
    return { logs, total };
  }

  async getAuditLogByEntity(entityType: string, entityId: string): Promise<AuditLogEntry[]> {
    return db.select().from(auditLog)
      .where(and(eq(auditLog.entityType, entityType), eq(auditLog.entityId, entityId)))
      .orderBy(desc(auditLog.timestamp));
  }

  async getAuditLogByAdvisor(advisorId: string, limit: number = 1000): Promise<AuditLogEntry[]> {
    return db.select().from(auditLog)
      .where(eq(auditLog.advisorId, advisorId))
      .orderBy(desc(auditLog.timestamp))
      .limit(limit);
  }

  async createFailedLoginAttempt(data: InsertFailedLoginAttempt): Promise<FailedLoginAttempt> {
    const [result] = await db.insert(failedLoginAttempts).values(data).returning();
    return result;
  }

  async getFailedLoginAttempts(filters?: { advisorId?: string; ipAddress?: string; limit?: number; offset?: number }): Promise<FailedLoginAttempt[]> {
    const conditions: any[] = [];
    if (filters?.advisorId) conditions.push(eq(failedLoginAttempts.advisorId, filters.advisorId));
    if (filters?.ipAddress) conditions.push(eq(failedLoginAttempts.ipAddress, filters.ipAddress));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    return db.select().from(failedLoginAttempts).where(whereClause).orderBy(desc(failedLoginAttempts.lastAttemptTime)).limit(limit).offset(offset);
  }

  async getActivitySummary(advisorId: string, filters?: { startDate?: string; endDate?: string; clientId?: string }): Promise<Record<string, number>> {
    const conditions = [eq(activities.advisorId, advisorId)];
    if (filters?.clientId) conditions.push(eq(activities.clientId, filters.clientId));
    if (filters?.startDate) conditions.push(gte(activities.date, filters.startDate));
    if (filters?.endDate) conditions.push(lte(activities.date, filters.endDate));
    const results = await db.select({ type: activities.type, count: sql<number>`count(*)` })
      .from(activities)
      .where(and(...conditions))
      .groupBy(activities.type);
    const summary: Record<string, number> = {};
    for (const row of results) {
      summary[row.type] = Number(row.count);
    }
    return summary;
  }

  async getClientEngagement(advisorId: string, clientId: string): Promise<{ total30Days: number; byType: Record<string, number>; avgDuration: number; lastContactDate: string | null; engagementScore: number }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const results = await db.select().from(activities)
      .where(and(eq(activities.clientId, clientId), eq(activities.advisorId, advisorId), gte(activities.date, thirtyDaysAgo)))
      .orderBy(desc(activities.date));
    const byType: Record<string, number> = {};
    let totalDuration = 0;
    for (const a of results) {
      byType[a.type] = (byType[a.type] || 0) + 1;
      if (a.duration) totalDuration += a.duration;
    }
    const weights: Record<string, number> = { call: 3, email: 1, meeting: 5, note: 1, task_completed: 2, portfolio_update: 4, document_shared: 2, recommendation_made: 3, trade_executed: 4, transfer_processed: 3, account_created: 5, status_change: 1 };
    let score = 0;
    for (const a of results) score += (weights[a.type] || 1);
    return {
      total30Days: results.length,
      byType,
      avgDuration: results.length > 0 ? totalDuration / results.length : 0,
      lastContactDate: results.length > 0 ? results[0].date : null,
      engagementScore: Math.min(100, score),
    };
  }

  async getAdvisorProductivity(advisorId: string, filters?: { startDate?: string; endDate?: string }): Promise<{ totalActivities: number; byType: Record<string, number>; avgPerDay: number; totalDuration: number }> {
    const conditions = [eq(activities.advisorId, advisorId)];
    if (filters?.startDate) conditions.push(gte(activities.date, filters.startDate));
    if (filters?.endDate) conditions.push(lte(activities.date, filters.endDate));
    const results = await db.select().from(activities).where(and(...conditions));
    const byType: Record<string, number> = {};
    let totalDuration = 0;
    for (const a of results) {
      byType[a.type] = (byType[a.type] || 0) + 1;
      if (a.duration) totalDuration += a.duration;
    }
    const startDate = filters?.startDate ? new Date(filters.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filters?.endDate ? new Date(filters.endDate) : new Date();
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
    return {
      totalActivities: results.length,
      byType,
      avgPerDay: results.length / days,
      totalDuration,
    };
  }

  async getActivityTrends(advisorId: string, filters?: { startDate?: string; endDate?: string; period?: string }): Promise<{ date: string; count: number }[]> {
    const conditions = [eq(activities.advisorId, advisorId)];
    if (filters?.startDate) conditions.push(gte(activities.date, filters.startDate));
    if (filters?.endDate) conditions.push(lte(activities.date, filters.endDate));
    const results = await db.select({ date: activities.date, count: sql<number>`count(*)` })
      .from(activities)
      .where(and(...conditions))
      .groupBy(activities.date)
      .orderBy(asc(activities.date));
    return results.map(r => ({ date: r.date, count: Number(r.count) }));
  }

  async createExportHistoryRecord(data: InsertExportHistoryRecord): Promise<ExportHistoryRecord> {
    const [result] = await db.insert(exportHistory).values(data).returning();
    return result;
  }

  async getWorkflowDefinition_v2(id: string): Promise<WorkflowDefinition | undefined> {
    const [result] = await db.select().from(workflowDefinitions).where(eq(workflowDefinitions.id, id));
    return result;
  }

  async getWorkflowDefinitionBySlug(slug: string): Promise<WorkflowDefinition | undefined> {
    const [result] = await db.select().from(workflowDefinitions).where(eq(workflowDefinitions.slug, slug));
    return result;
  }

  async getWorkflowDefinitions_v2(filters?: { category?: string; isActive?: boolean }): Promise<WorkflowDefinition[]> {
    const conditions: any[] = [];
    if (filters?.category) conditions.push(eq(workflowDefinitions.category, filters.category));
    if (filters?.isActive !== undefined) conditions.push(eq(workflowDefinitions.isActive, filters.isActive));
    if (conditions.length === 0) return db.select().from(workflowDefinitions).orderBy(workflowDefinitions.name);
    return db.select().from(workflowDefinitions).where(and(...conditions)).orderBy(workflowDefinitions.name);
  }

  async createWorkflowDefinition(data: InsertWorkflowDefinition): Promise<WorkflowDefinition> {
    const [result] = await db.insert(workflowDefinitions).values(data).returning();
    return result;
  }

  async updateWorkflowDefinition(id: string, data: Partial<WorkflowDefinition>): Promise<WorkflowDefinition | undefined> {
    const [result] = await db.update(workflowDefinitions).set({ ...data, updatedAt: new Date() }).where(eq(workflowDefinitions.id, id)).returning();
    return result;
  }

  async getWorkflowInstance(id: string): Promise<WorkflowInstance | undefined> {
    const [result] = await db.select().from(workflowInstances).where(eq(workflowInstances.id, id));
    return result;
  }

  async getWorkflowInstances(filters?: { advisorId?: string; clientId?: string; status?: string; definitionId?: string; meetingId?: string }): Promise<WorkflowInstance[]> {
    const conditions: any[] = [];
    if (filters?.advisorId) conditions.push(eq(workflowInstances.advisorId, filters.advisorId));
    if (filters?.clientId) conditions.push(eq(workflowInstances.clientId, filters.clientId));
    if (filters?.status) conditions.push(eq(workflowInstances.status, filters.status));
    if (filters?.definitionId) conditions.push(eq(workflowInstances.definitionId, filters.definitionId));
    if (filters?.meetingId) conditions.push(eq(workflowInstances.meetingId, filters.meetingId));
    if (conditions.length === 0) return db.select().from(workflowInstances).orderBy(desc(workflowInstances.createdAt));
    return db.select().from(workflowInstances).where(and(...conditions)).orderBy(desc(workflowInstances.createdAt));
  }

  async createWorkflowInstance(data: InsertWorkflowInstance): Promise<WorkflowInstance> {
    const [result] = await db.insert(workflowInstances).values(data).returning();
    return result;
  }

  async updateWorkflowInstance(id: string, data: Partial<WorkflowInstance>): Promise<WorkflowInstance | undefined> {
    const [result] = await db.update(workflowInstances).set({ ...data, updatedAt: new Date() }).where(eq(workflowInstances.id, id)).returning();
    return result;
  }

  async getWorkflowStepExecution(id: string): Promise<WorkflowStepExecution | undefined> {
    const [result] = await db.select().from(workflowStepExecutions).where(eq(workflowStepExecutions.id, id));
    return result;
  }

  async getWorkflowStepExecutions(instanceId: string): Promise<WorkflowStepExecution[]> {
    return db.select().from(workflowStepExecutions).where(eq(workflowStepExecutions.instanceId, instanceId)).orderBy(asc(workflowStepExecutions.stepIndex));
  }

  async createWorkflowStepExecution(data: InsertWorkflowStepExecution): Promise<WorkflowStepExecution> {
    const [result] = await db.insert(workflowStepExecutions).values(data).returning();
    return result;
  }

  async updateWorkflowStepExecution(id: string, data: Partial<WorkflowStepExecution>): Promise<WorkflowStepExecution | undefined> {
    const [result] = await db.update(workflowStepExecutions).set({ ...data, updatedAt: new Date() }).where(eq(workflowStepExecutions.id, id)).returning();
    return result;
  }

  async getWorkflowGate(id: string): Promise<WorkflowGate | undefined> {
    const [result] = await db.select().from(workflowGates).where(eq(workflowGates.id, id));
    return result;
  }

  async getWorkflowGatesByInstance(instanceId: string): Promise<WorkflowGate[]> {
    return db.select().from(workflowGates).where(eq(workflowGates.instanceId, instanceId)).orderBy(desc(workflowGates.createdAt));
  }

  async getWorkflowGatesByOwner(ownerId: string, status?: string): Promise<WorkflowGate[]> {
    const conditions: any[] = [eq(workflowGates.ownerId, ownerId)];
    if (status) conditions.push(eq(workflowGates.status, status));
    return db.select().from(workflowGates).where(and(...conditions)).orderBy(desc(workflowGates.createdAt));
  }

  async getOverdueWorkflowGates(): Promise<WorkflowGate[]> {
    return db.select().from(workflowGates)
      .where(and(eq(workflowGates.status, "pending"), lte(workflowGates.expiresAt, new Date())))
      .orderBy(asc(workflowGates.expiresAt));
  }

  async createWorkflowGate(data: InsertWorkflowGate): Promise<WorkflowGate> {
    const [result] = await db.insert(workflowGates).values(data).returning();
    return result;
  }

  async updateWorkflowGate(id: string, data: Partial<WorkflowGate>): Promise<WorkflowGate | undefined> {
    const [result] = await db.update(workflowGates).set({ ...data, updatedAt: new Date() }).where(eq(workflowGates.id, id)).returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
