import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, date, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const advisors = pgTable("advisors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  title: text("title").notNull(),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  passwordHash: text("password_hash"),
  calendlyAccessToken: text("calendly_access_token"),
  calendlyUserId: text("calendly_user_id"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  maxCapacity: integer("max_capacity").notNull().default(120),
  feeSchedule: jsonb("fee_schedule").default([
    { minAum: 0, maxAum: 250000, rate: 0.0125 },
    { minAum: 250000, maxAum: 500000, rate: 0.0100 },
    { minAum: 500000, maxAum: 1000000, rate: 0.0085 },
    { minAum: 1000000, maxAum: 2000000, rate: 0.0075 },
    { minAum: 2000000, maxAum: null, rate: 0.0050 },
  ]),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const associates = pgTable("associates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("analyst"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  passwordHash: text("password_hash"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clientTeamMembers = pgTable("client_team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  associateId: varchar("associate_id").notNull().references(() => associates.id),
  role: text("role").notNull().default("support"),
  addedAt: text("added_at"),
}, (table) => ({
  clientIdIdx: index("client_team_members_client_id_idx").on(table.clientId),
  associateIdIdx: index("client_team_members_associate_id_idx").on(table.associateId),
}));

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  segment: text("segment").notNull().default("C"),
  status: text("status").notNull().default("active"),
  riskTolerance: text("risk_tolerance"),
  dateOfBirth: text("date_of_birth"),
  occupation: text("occupation"),
  employer: text("employer"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  notes: text("notes"),
  lastContactDate: text("last_contact_date"),
  nextReviewDate: text("next_review_date"),
  referralSource: text("referral_source"),
  interests: text("interests"),
  feeRateOverride: decimal("fee_rate_override", { precision: 8, scale: 6 }),
  salesforceContactId: varchar("salesforce_contact_id"),
  syncedToSalesforce: boolean("synced_to_salesforce").default(false),
  assessmentOverrides: jsonb("assessment_overrides"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  advisorIdIdx: index("clients_advisor_id_idx").on(table.advisorId),
  salesforceContactIdUniq: uniqueIndex("clients_salesforce_contact_id_uniq").on(table.salesforceContactId),
}));

export const households = pgTable("households", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  primaryClientId: varchar("primary_client_id").references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  totalAum: decimal("total_aum", { precision: 15, scale: 2 }).default("0"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  advisorIdIdx: index("households_advisor_id_idx").on(table.advisorId),
  primaryClientIdIdx: index("households_primary_client_id_idx").on(table.primaryClientId),
}));

export const householdMembers = pgTable("household_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: varchar("household_id").notNull().references(() => households.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  relationship: text("relationship").notNull(),
}, (table) => ({
  householdIdIdx: index("household_members_household_id_idx").on(table.householdId),
  clientIdIdx: index("household_members_client_id_idx").on(table.clientId),
}));

export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  householdId: varchar("household_id").references(() => households.id),
  accountNumber: text("account_number").notNull(),
  accountType: text("account_type").notNull(),
  custodian: text("custodian").notNull(),
  model: text("model"),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default("0"),
  taxStatus: text("tax_status"),
  status: text("status").notNull().default("active"),
  salesforceAccountId: varchar("salesforce_account_id"),
  syncedToSalesforce: boolean("synced_to_salesforce").default(false),
  orionAccountId: varchar("orion_account_id"),
  orionSyncStatus: text("orion_sync_status"),
  lastOrionSync: timestamp("last_orion_sync"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("accounts_client_id_idx").on(table.clientId),
  householdIdIdx: index("accounts_household_id_idx").on(table.householdId),
}));

export const holdings = pgTable("holdings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accounts.id),
  ticker: text("ticker").notNull(),
  name: text("name").notNull(),
  shares: decimal("shares", { precision: 15, scale: 4 }).notNull(),
  marketValue: decimal("market_value", { precision: 15, scale: 2 }).notNull(),
  costBasis: decimal("cost_basis", { precision: 15, scale: 2 }),
  unrealizedGainLoss: decimal("unrealized_gain_loss", { precision: 15, scale: 2 }),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  sector: text("sector"),
  orionHoldingId: varchar("orion_holding_id"),
  orionDataHash: varchar("orion_data_hash"),
  lastOrionSync: timestamp("last_orion_sync"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  accountIdIdx: index("holdings_account_id_idx").on(table.accountId),
  orionHoldingIdIdx: uniqueIndex("holdings_orion_holding_id_idx").on(table.orionHoldingId),
}));

export const performance = pgTable("performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").references(() => accounts.id),
  householdId: varchar("household_id").references(() => households.id),
  period: text("period").notNull(),
  returnPct: decimal("return_pct", { precision: 8, scale: 4 }).notNull(),
  benchmarkPct: decimal("benchmark_pct", { precision: 8, scale: 4 }),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  accountPeriodIdx: uniqueIndex("performance_account_period_idx").on(table.accountId, table.period),
  householdIdIdx: index("performance_household_id_idx").on(table.householdId),
}));

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accounts.id),
  type: text("type").notNull(),
  ticker: text("ticker"),
  description: text("description").notNull(),
  shares: decimal("shares", { precision: 15, scale: 4 }),
  price: decimal("price", { precision: 15, scale: 4 }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  date: text("date").notNull(),
  orionTransactionId: varchar("orion_transaction_id"),
}, (table) => ({
  accountIdIdx: index("transactions_account_id_idx").on(table.accountId),
  orionTransactionIdIdx: uniqueIndex("transactions_orion_transaction_id_idx").on(table.orionTransactionId),
}));

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  clientId: varchar("client_id").references(() => clients.id),
  meetingId: varchar("meeting_id").references(() => meetings.id),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: text("due_date"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  category: text("category"),
  type: text("type").notNull().default("general"),
  assigneeId: varchar("assignee_id").references(() => associates.id),
  salesforceTaskId: varchar("salesforce_task_id"),
  salesforceSyncStatus: text("salesforce_sync_status"),
  lastSyncedAt: timestamp("last_synced_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdStatusIdx: index("tasks_client_id_status_idx").on(table.clientId, table.status),
  advisorIdIdx: index("tasks_advisor_id_idx").on(table.advisorId),
  salesforceTaskIdUniq: uniqueIndex("tasks_salesforce_task_id_uniq").on(table.salesforceTaskId),
  categoryStatusDueDateIdx: index("tasks_category_status_due_date_idx").on(table.category, table.status, table.dueDate),
  meetingIdIdx: index("tasks_meeting_id_idx").on(table.meetingId),
  assigneeIdIdx: index("tasks_assignee_id_idx").on(table.assigneeId),
}));

export const meetings = pgTable("meetings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  clientId: varchar("client_id").references(() => clients.id),
  title: text("title").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
  location: text("location"),
  prepBrief: text("prep_brief"),
  followUpEmail: text("follow_up_email"),
  transcriptSummary: text("transcript_summary"),
  transcriptRaw: text("transcript_raw"),
  salesforceEventId: varchar("salesforce_event_id"),
  salesforceSyncStatus: text("salesforce_sync_status"),
  lastSyncedAt: timestamp("last_synced_at"),
  outlookEventId: varchar("outlook_event_id"),
  outlookSyncStatus: text("outlook_sync_status"),
  lastSyncedWithOutlook: timestamp("last_synced_with_outlook"),
  zoomMeetingId: varchar("zoom_meeting_id"),
  zoomJoinUrl: varchar("zoom_join_url"),
  summaryGenerated: boolean("summary_generated").default(false),
  description: text("meeting_description"),
  timezone: text("timezone"),
  attendees: jsonb("attendees").default([]),
  agenda: jsonb("agenda").default([]),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  advisorIdStartTimeIdx: index("meetings_advisor_id_start_time_idx").on(table.advisorId, table.startTime),
  clientIdIdx: index("meetings_client_id_idx").on(table.clientId),
  outlookEventIdUniqueIdx: uniqueIndex("meetings_outlook_event_id_unique").on(table.outlookEventId),
  salesforceEventIdUniq: uniqueIndex("meetings_salesforce_event_id_uniq").on(table.salesforceEventId),
}));

export const meetingNotes = pgTable("meeting_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").notNull().references(() => meetings.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  noteText: text("note_text").notNull(),
  summary: text("summary"),
  actionItems: jsonb("action_items").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  meetingIdIdx: index("meeting_notes_meeting_id_idx").on(table.meetingId),
  advisorIdIdx: index("meeting_notes_advisor_id_idx").on(table.advisorId),
}));

export const recurringTasks = pgTable("recurring_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id),
  pattern: text("pattern").notNull(),
  interval: integer("interval").notNull().default(1),
  daysOfWeek: jsonb("days_of_week").default([]),
  dateOfMonth: integer("date_of_month"),
  endDate: text("end_date"),
  nextDueDate: text("next_due_date"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  taskIdIdx: index("recurring_tasks_task_id_idx").on(table.taskId),
}));

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  clientId: varchar("client_id").references(() => clients.id),
  type: text("type").notNull(),
  subject: text("subject").notNull(),
  description: text("description"),
  date: text("date").notNull(),
  duration: integer("duration"),
  metadata: jsonb("metadata"),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: varchar("related_entity_id"),
  salesforceActivityId: varchar("salesforce_activity_id"),
  salesforceSyncStatus: text("salesforce_sync_status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  advisorIdIdx: index("activities_advisor_id_idx").on(table.advisorId),
  clientIdIdx: index("activities_client_id_idx").on(table.clientId),
  dateIdx: index("activities_date_idx").on(table.date),
  typeIdx: index("activities_type_idx").on(table.type),
  salesforceActivityIdIdx: index("activities_salesforce_activity_id_idx").on(table.salesforceActivityId),
}));

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  clientId: varchar("client_id").references(() => clients.id),
  type: text("type").notNull(),
  severity: text("severity").notNull().default("info"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  alertType: varchar("alert_type", { length: 50 }),
  dismissedAt: timestamp("dismissed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  advisorIdSeverityIdx: index("alerts_advisor_id_severity_idx").on(table.advisorId, table.severity),
  clientIdIdx: index("alerts_client_id_idx").on(table.clientId),
}));

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  uploadDate: text("upload_date"),
  expirationDate: text("expiration_date"),
  fileName: text("file_name"),
  fileContent: text("file_content"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("documents_client_id_idx").on(table.clientId),
}));

export const complianceItems = pgTable("compliance_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  dueDate: text("due_date"),
  description: text("description").notNull(),
  completedDate: text("completed_date"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("compliance_items_client_id_idx").on(table.clientId),
  advisorIdIdx: index("compliance_items_advisor_id_idx").on(table.advisorId),
}));

export const triggerCategories = pgTable("trigger_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  defaultActions: jsonb("default_actions").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const lifeEvents = pgTable("life_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  eventType: text("event_type").notNull(),
  eventDate: text("event_date").notNull(),
  description: text("description").notNull(),
  triggerCategoryId: varchar("trigger_category_id"),
  downstreamActions: jsonb("downstream_actions").default([]),
}, (table) => ({
  clientIdIdx: index("life_events_client_id_idx").on(table.clientId),
}));

export const triggerActions = pgTable("trigger_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lifeEventId: varchar("life_event_id").notNull().references(() => lifeEvents.id),
  triggerCategoryId: varchar("trigger_category_id"),
  actionType: text("action_type").notNull(),
  status: text("status").notNull().default("pending"),
  resultMetadata: jsonb("result_metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  lifeEventIdIdx: index("trigger_actions_life_event_id_idx").on(table.lifeEventId),
}));

export const documentChecklist = pgTable("document_checklist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  category: text("category").notNull(),
  documentName: text("document_name").notNull(),
  description: text("description"),
  required: boolean("required").notNull().default(true),
  received: boolean("received").notNull().default(false),
  receivedDate: text("received_date"),
  documentId: varchar("document_id"),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => ({
  clientIdIdx: index("document_checklist_client_id_idx").on(table.clientId),
}));

export const workflowTemplates = pgTable("workflow_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("general"),
  steps: jsonb("steps").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  advisorIdIdx: index("workflow_templates_advisor_id_idx").on(table.advisorId),
}));

export const clientWorkflows = pgTable("client_workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  templateId: varchar("template_id").references(() => workflowTemplates.id),
  templateName: text("template_name").notNull(),
  status: text("status").notNull().default("active"),
  steps: jsonb("steps").notNull().default([]),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  assignedBy: text("assigned_by"),
}, (table) => ({
  clientIdIdx: index("client_workflows_client_id_idx").on(table.clientId),
  templateIdIdx: index("client_workflows_template_id_idx").on(table.templateId),
}));

export const insertAdvisorSchema = createInsertSchema(advisors).omit({ id: true, updatedAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHouseholdSchema = createInsertSchema(households).omit({ id: true, updatedAt: true });
export const insertHouseholdMemberSchema = createInsertSchema(householdMembers).omit({ id: true });
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true, updatedAt: true });
export const insertHoldingSchema = createInsertSchema(holdings).omit({ id: true, updatedAt: true });
export const insertPerformanceSchema = createInsertSchema(performance).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMeetingSchema = createInsertSchema(meetings).omit({ id: true, updatedAt: true });
export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, updatedAt: true });
export const insertComplianceItemSchema = createInsertSchema(complianceItems).omit({ id: true, updatedAt: true });
export const insertMeetingNoteSchema = createInsertSchema(meetingNotes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRecurringTaskSchema = createInsertSchema(recurringTasks).omit({ id: true, createdAt: true });
export const insertLifeEventSchema = createInsertSchema(lifeEvents).omit({ id: true });
export const insertTriggerCategorySchema = createInsertSchema(triggerCategories).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTriggerActionSchema = createInsertSchema(triggerActions).omit({ id: true, createdAt: true });
export const insertDocumentChecklistSchema = createInsertSchema(documentChecklist).omit({ id: true });

export type Advisor = typeof advisors.$inferSelect;
export type InsertAdvisor = z.infer<typeof insertAdvisorSchema>;

export interface FeeScheduleTier {
  minAum: number;
  maxAum: number | null;
  rate: number;
}

export function calculateFeeRate(aum: number, feeSchedule: FeeScheduleTier[] | null | undefined, clientOverride?: string | null): number {
  if (clientOverride) {
    const overrideRate = parseFloat(clientOverride);
    if (!isNaN(overrideRate) && overrideRate > 0) return overrideRate;
  }

  const tiers = Array.isArray(feeSchedule) ? feeSchedule as FeeScheduleTier[] : [];
  if (tiers.length === 0) return 0.0085;

  const sorted = [...tiers].sort((a, b) => a.minAum - b.minAum);
  for (const tier of sorted) {
    if (aum >= tier.minAum && (tier.maxAum === null || aum < tier.maxAum)) {
      return tier.rate;
    }
  }

  return sorted[sorted.length - 1].rate;
}
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Household = typeof households.$inferSelect;
export type InsertHousehold = z.infer<typeof insertHouseholdSchema>;
export type HouseholdMember = typeof householdMembers.$inferSelect;
export type InsertHouseholdMember = z.infer<typeof insertHouseholdMemberSchema>;
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Holding = typeof holdings.$inferSelect;
export type InsertHolding = z.infer<typeof insertHoldingSchema>;
export type Performance = typeof performance.$inferSelect;
export type InsertPerformance = z.infer<typeof insertPerformanceSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type ComplianceItem = typeof complianceItems.$inferSelect;
export type InsertComplianceItem = z.infer<typeof insertComplianceItemSchema>;

export const complianceReviews = pgTable("compliance_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  advisorNotes: text("advisor_notes"),
  reviewerName: text("reviewer_name"),
  reviewerNotes: text("reviewer_notes"),
  reviewItems: text("review_items"),
  submittedAt: text("submitted_at"),
  reviewedAt: text("reviewed_at"),
  completedAt: text("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("compliance_reviews_client_id_idx").on(table.clientId),
  advisorIdIdx: index("compliance_reviews_advisor_id_idx").on(table.advisorId),
}));

export const complianceReviewEvents = pgTable("compliance_review_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewId: varchar("review_id").notNull().references(() => complianceReviews.id),
  eventType: text("event_type").notNull(),
  description: text("description").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  reviewIdIdx: index("compliance_review_events_review_id_idx").on(table.reviewId),
}));

export const insertComplianceReviewSchema = createInsertSchema(complianceReviews).omit({ id: true, createdAt: true });
export const insertComplianceReviewEventSchema = createInsertSchema(complianceReviewEvents).omit({ id: true, createdAt: true });
export type ComplianceReview = typeof complianceReviews.$inferSelect;
export type InsertComplianceReview = z.infer<typeof insertComplianceReviewSchema>;
export type ComplianceReviewEvent = typeof complianceReviewEvents.$inferSelect;
export type InsertComplianceReviewEvent = z.infer<typeof insertComplianceReviewEventSchema>;

export type MeetingNote = typeof meetingNotes.$inferSelect;
export type InsertMeetingNote = z.infer<typeof insertMeetingNoteSchema>;
export type RecurringTask = typeof recurringTasks.$inferSelect;
export type InsertRecurringTask = z.infer<typeof insertRecurringTaskSchema>;
export type LifeEvent = typeof lifeEvents.$inferSelect;
export type InsertLifeEvent = z.infer<typeof insertLifeEventSchema>;
export type TriggerCategory = typeof triggerCategories.$inferSelect;
export type InsertTriggerCategory = z.infer<typeof insertTriggerCategorySchema>;
export type TriggerAction = typeof triggerActions.$inferSelect;
export type InsertTriggerAction = z.infer<typeof insertTriggerActionSchema>;
export type DocumentChecklistItem = typeof documentChecklist.$inferSelect;
export type InsertDocumentChecklistItem = z.infer<typeof insertDocumentChecklistSchema>;

export const reportTemplates = pgTable("report_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  templateType: text("template_type").notNull(),
  sections: jsonb("sections").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  advisorIdIdx: index("report_templates_advisor_id_idx").on(table.advisorId),
}));

export const reportArtifacts = pgTable("report_artifacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => reportTemplates.id),
  clientId: varchar("client_id").references(() => clients.id),
  householdId: varchar("household_id").references(() => households.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  status: text("status").notNull().default("draft"),
  reportName: text("report_name").notNull(),
  content: jsonb("content").notNull(),
  renderedHtml: text("rendered_html"),
  pdfUrl: text("pdf_url"),
  version: integer("version").notNull().default(1),
  createdBy: varchar("created_by").notNull().references(() => advisors.id),
  jobId: varchar("job_id"),
  reportType: varchar("report_type", { length: 50 }),
  draftTitle: text("draft_title"),
  fullDraftText: text("full_draft_text"),
  draftSections: jsonb("draft_sections"),
  includedSources: jsonb("included_sources"),
  assumptionNotes: jsonb("assumption_notes"),
  missingInfoFlags: jsonb("missing_info_flags"),
  confidenceSummary: jsonb("confidence_summary"),
  wordCount: integer("word_count"),
  originalDraftText: text("original_draft_text"),
  editCount: integer("edit_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  finalizedAt: timestamp("finalized_at"),
}, (table) => ({
  advisorIdIdx: index("report_artifacts_advisor_id_idx").on(table.advisorId),
  clientIdIdx: index("report_artifacts_client_id_idx").on(table.clientId),
  createdAtIdx: index("report_artifacts_created_at_idx").on(table.createdAt),
  templateIdIdx: index("report_artifacts_template_id_idx").on(table.templateId),
  householdIdIdx: index("report_artifacts_household_id_idx").on(table.householdId),
  createdByIdx: index("report_artifacts_created_by_idx").on(table.createdBy),
}));

export const reportArtifactVersions = pgTable("report_artifact_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artifactId: varchar("artifact_id").notNull().references(() => reportArtifacts.id),
  versionNumber: integer("version_number").notNull(),
  draftText: text("draft_text").notNull(),
  editedBy: varchar("edited_by").notNull().references(() => advisors.id),
  editSummary: text("edit_summary"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  artifactIdIdx: index("report_artifact_versions_artifact_id_idx").on(table.artifactId),
  editedByIdx: index("report_artifact_versions_edited_by_idx").on(table.editedBy),
}));

export type ReportArtifactVersion = typeof reportArtifactVersions.$inferSelect;

export const insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReportArtifactSchema = createInsertSchema(reportArtifacts).omit({ id: true, createdAt: true, updatedAt: true });

export const insertWorkflowTemplateSchema = createInsertSchema(workflowTemplates).omit({ id: true, createdAt: true });
export const insertClientWorkflowSchema = createInsertSchema(clientWorkflows).omit({ id: true });
export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type InsertWorkflowTemplate = z.infer<typeof insertWorkflowTemplateSchema>;
export type ClientWorkflow = typeof clientWorkflows.$inferSelect;
export type InsertClientWorkflow = z.infer<typeof insertClientWorkflowSchema>;
export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertReportTemplate = z.infer<typeof insertReportTemplateSchema>;
export type ReportArtifact = typeof reportArtifacts.$inferSelect;
export type InsertReportArtifact = z.infer<typeof insertReportArtifactSchema>;

export const calculatorRuns = pgTable("calculator_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  calculatorType: text("calculator_type").notNull(),
  clientId: varchar("client_id").references(() => clients.id),
  householdId: varchar("household_id").references(() => households.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  inputs: jsonb("inputs").notNull(),
  results: jsonb("results").notNull(),
  assumptions: jsonb("assumptions").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").notNull().references(() => advisors.id),
}, (table) => ({
  advisorIdIdx: index("calculator_runs_advisor_id_idx").on(table.advisorId),
  clientIdIdx: index("calculator_runs_client_id_idx").on(table.clientId),
  householdIdIdx: index("calculator_runs_household_id_idx").on(table.householdId),
  createdByIdx: index("calculator_runs_created_by_idx").on(table.createdBy),
}));

export const insertCalculatorRunSchema = createInsertSchema(calculatorRuns).omit({ id: true, createdAt: true });
export type CalculatorRun = typeof calculatorRuns.$inferSelect;
export type InsertCalculatorRun = z.infer<typeof insertCalculatorRunSchema>;

export const diagnosticConfig = pgTable("diagnostic_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  analysisPrompt: text("analysis_prompt").notNull(),
  htmlTemplate: text("html_template").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const diagnosticResults = pgTable("diagnostic_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  configId: varchar("config_id").notNull(),
  analysisJson: text("analysis_json").notNull(),
  renderedHtml: text("rendered_html").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("diagnostic_results_client_id_idx").on(table.clientId),
  configIdIdx: index("diagnostic_results_config_id_idx").on(table.configId),
}));

export const insertDiagnosticConfigSchema = createInsertSchema(diagnosticConfig).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDiagnosticResultSchema = createInsertSchema(diagnosticResults).omit({ id: true, createdAt: true });
export type DiagnosticConfig = typeof diagnosticConfig.$inferSelect;
export type InsertDiagnosticConfig = z.infer<typeof insertDiagnosticConfigSchema>;
export type DiagnosticResult = typeof diagnosticResults.$inferSelect;
export type InsertDiagnosticResult = z.infer<typeof insertDiagnosticResultSchema>;

export const transcriptConfig = pgTable("transcript_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  analysisPrompt: text("analysis_prompt").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTranscriptConfigSchema = createInsertSchema(transcriptConfig).omit({ id: true, createdAt: true, updatedAt: true });
export type TranscriptConfig = typeof transcriptConfig.$inferSelect;
export type InsertTranscriptConfig = z.infer<typeof insertTranscriptConfigSchema>;

export const meetingPrepConfig = pgTable("meeting_prep_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  userPromptTemplate: text("user_prompt_template").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMeetingPrepConfigSchema = createInsertSchema(meetingPrepConfig).omit({ id: true, createdAt: true, updatedAt: true });
export type MeetingPrepConfig = typeof meetingPrepConfig.$inferSelect;
export type InsertMeetingPrepConfig = z.infer<typeof insertMeetingPrepConfigSchema>;

export const meetingSummaryConfig = pgTable("meeting_summary_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  userPromptTemplate: text("user_prompt_template").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMeetingSummaryConfigSchema = createInsertSchema(meetingSummaryConfig).omit({ id: true, createdAt: true, updatedAt: true });
export type MeetingSummaryConfig = typeof meetingSummaryConfig.$inferSelect;
export type InsertMeetingSummaryConfig = z.infer<typeof insertMeetingSummaryConfigSchema>;

export const insertAssociateSchema = createInsertSchema(associates).omit({ id: true, createdAt: true });
export const insertClientTeamMemberSchema = createInsertSchema(clientTeamMembers).omit({ id: true });
export type Associate = typeof associates.$inferSelect;
export type InsertAssociate = z.infer<typeof insertAssociateSchema>;
export type ClientTeamMember = typeof clientTeamMembers.$inferSelect;
export type InsertClientTeamMember = z.infer<typeof insertClientTeamMemberSchema>;

export const monteCarloScenarios = pgTable("monte_carlo_scenarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  name: text("name").notNull(),
  currentAge: integer("current_age").notNull(),
  retirementAge: integer("retirement_age").notNull(),
  lifeExpectancy: integer("life_expectancy").notNull().default(90),
  annualSpending: decimal("annual_spending", { precision: 15, scale: 2 }).notNull(),
  expectedReturn: decimal("expected_return", { precision: 5, scale: 4 }).notNull().default("0.07"),
  returnStdDev: decimal("return_std_dev", { precision: 5, scale: 4 }).notNull().default("0.12"),
  inflationRate: decimal("inflation_rate", { precision: 5, scale: 4 }).notNull().default("0.03"),
  preRetirementContribution: decimal("pre_retirement_contribution", { precision: 15, scale: 2 }).default("0"),
  results: jsonb("results"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("monte_carlo_scenarios_client_id_idx").on(table.clientId),
}));

export const scenarioEvents = pgTable("scenario_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scenarioId: varchar("scenario_id").notNull().references(() => monteCarloScenarios.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  startAge: integer("start_age").notNull(),
  endAge: integer("end_age"),
  inflationAdjusted: boolean("inflation_adjusted").notNull().default(true),
}, (table) => ({
  scenarioIdIdx: index("scenario_events_scenario_id_idx").on(table.scenarioId),
}));

export const alternativeAssets = pgTable("alternative_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  assetType: text("asset_type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  estimatedValue: decimal("estimated_value", { precision: 15, scale: 2 }).notNull(),
  costBasis: decimal("cost_basis", { precision: 15, scale: 2 }),
  acquisitionDate: text("acquisition_date"),
  location: text("location"),
  notes: text("notes"),
}, (table) => ({
  clientIdIdx: index("alternative_assets_client_id_idx").on(table.clientId),
}));

export const insertAlternativeAssetSchema = createInsertSchema(alternativeAssets).omit({ id: true });
export type AlternativeAsset = typeof alternativeAssets.$inferSelect;
export type InsertAlternativeAsset = z.infer<typeof insertAlternativeAssetSchema>;

export const documentClassificationConfig = pgTable("document_classification_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  userPromptTemplate: text("user_prompt_template").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDocumentClassificationConfigSchema = createInsertSchema(documentClassificationConfig).omit({ id: true, createdAt: true, updatedAt: true });
export type DocumentClassificationConfig = typeof documentClassificationConfig.$inferSelect;
export type InsertDocumentClassificationConfig = z.infer<typeof insertDocumentClassificationConfigSchema>;

export const loginEvents = pgTable("login_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  userType: text("user_type").notNull(),
  userName: text("user_name").notNull(),
  userEmail: text("user_email").notNull(),
  loginTime: timestamp("login_time").defaultNow(),
  logoutTime: timestamp("logout_time"),
  ipAddress: text("ip_address"),
  deviceInfo: text("device_info"),
  failedAttempts: integer("failed_attempts").default(0),
  mfaStatus: boolean("mfa_status").default(false),
  sessionDuration: integer("session_duration"),
  status: text("status").default("success"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("login_events_user_id_idx").on(table.userId),
  loginTimeIdx: index("login_events_login_time_idx").on(table.loginTime),
  statusIdx: index("login_events_status_idx").on(table.status),
  ipAddressIdx: index("login_events_ip_address_idx").on(table.ipAddress),
}));

export const insertLoginEventSchema = createInsertSchema(loginEvents).omit({ id: true, timestamp: true });
export type LoginEvent = typeof loginEvents.$inferSelect;
export type InsertLoginEvent = z.infer<typeof insertLoginEventSchema>;

export const insertMonteCarloScenarioSchema = createInsertSchema(monteCarloScenarios).omit({ id: true, createdAt: true, results: true });
export const insertScenarioEventSchema = createInsertSchema(scenarioEvents).omit({ id: true });
export type MonteCarloScenario = typeof monteCarloScenarios.$inferSelect;
export type InsertMonteCarloScenario = z.infer<typeof insertMonteCarloScenarioSchema>;
export type ScenarioEvent = typeof scenarioEvents.$inferSelect;
export type InsertScenarioEvent = z.infer<typeof insertScenarioEventSchema>;

export const salesforceSyncLog = pgTable("salesforce_sync_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recordType: text("record_type").notNull(),
  recordId: varchar("record_id"),
  salesforceId: varchar("salesforce_id"),
  action: text("action").notNull(),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  syncedAt: timestamp("synced_at").defaultNow(),
});

export const orionSyncLog = pgTable("orion_sync_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id"),
  action: text("action").notNull(),
  status: text("status").notNull(),
  recordsAffected: integer("records_affected"),
  details: jsonb("details"),
  syncedAt: timestamp("synced_at").defaultNow(),
});

export const orionReconciliationReport = pgTable("orion_reconciliation_report", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportDate: timestamp("report_date").defaultNow(),
  accountsChecked: integer("accounts_checked"),
  discrepancies: jsonb("discrepancies"),
  totalValueDiff: decimal("total_value_diff", { precision: 15, scale: 2 }),
  actionItems: jsonb("action_items"),
});

// ---------------------------------------------------------------------------
// Client Identity Crosswalk — durable mapping between local UUID, SF household,
// SF contact, and Orion client IDs. This is the authoritative cross-system
// identity layer used by the canonical identity resolver.
// ---------------------------------------------------------------------------
export const clientIdentityCrosswalk = pgTable("client_identity_crosswalk", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  localClientUuid: varchar("local_client_uuid").references(() => clients.id),
  salesforceHouseholdId: varchar("salesforce_household_id"),
  salesforceContactId: varchar("salesforce_contact_id"),
  orionClientId: varchar("orion_client_id"),
  displayName: text("display_name"),
  mappingSource: text("mapping_source").notNull().default("backfill"), // exact | backfill | heuristic | manual
  mappingConfidence: decimal("mapping_confidence", { precision: 3, scale: 2 }),
  identityStatus: text("identity_status").notNull().default("unmapped"), // live-integrated | local-only | partially-mapped | unmapped
  lastVerifiedAt: timestamp("last_verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  localClientUuidUniq: uniqueIndex("crosswalk_local_uuid_uniq").on(table.localClientUuid),
  sfHouseholdIdx: index("crosswalk_sf_household_idx").on(table.salesforceHouseholdId),
  orionClientIdx: index("crosswalk_orion_client_idx").on(table.orionClientId),
}));

export type ClientIdentityCrosswalkRecord = typeof clientIdentityCrosswalk.$inferSelect;
export type InsertClientIdentityCrosswalk = typeof clientIdentityCrosswalk.$inferInsert;

export const emailLog = pgTable("email_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull(),
  messageId: varchar("message_id"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const zoomRecordings = pgTable("zoom_recordings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").references(() => meetings.id),
  zoomRecordingId: varchar("zoom_recording_id"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  downloadedAt: timestamp("downloaded_at"),
  transcribedAt: timestamp("transcribed_at"),
  status: text("status"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  meetingIdIdx: index("zoom_recordings_meeting_id_idx").on(table.meetingId),
}));

export const meetingTranscripts = pgTable("meeting_transcripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").references(() => meetings.id),
  zoomRecordingId: varchar("zoom_recording_id"),
  rawText: text("raw_text"),
  processedText: text("processed_text"),
  generatedAt: timestamp("generated_at"),
  summarized: boolean("summarized").default(false),
}, (table) => ({
  meetingIdIdx: index("meeting_transcripts_meeting_id_idx").on(table.meetingId),
}));

export const insertSalesforceSyncLogSchema = createInsertSchema(salesforceSyncLog).omit({ id: true, syncedAt: true });
export const insertOrionSyncLogSchema = createInsertSchema(orionSyncLog).omit({ id: true, syncedAt: true });
export const insertOrionReconciliationReportSchema = createInsertSchema(orionReconciliationReport).omit({ id: true, reportDate: true });
export const insertEmailLogSchema = createInsertSchema(emailLog).omit({ id: true, sentAt: true });
export const insertZoomRecordingSchema = createInsertSchema(zoomRecordings).omit({ id: true, createdAt: true });
export const insertMeetingTranscriptSchema = createInsertSchema(meetingTranscripts).omit({ id: true });

export type SalesforceSyncLog = typeof salesforceSyncLog.$inferSelect;
export type InsertSalesforceSyncLog = z.infer<typeof insertSalesforceSyncLogSchema>;
export type OrionSyncLog = typeof orionSyncLog.$inferSelect;
export type InsertOrionSyncLog = z.infer<typeof insertOrionSyncLogSchema>;
export type OrionReconciliationReport = typeof orionReconciliationReport.$inferSelect;
export type InsertOrionReconciliationReport = z.infer<typeof insertOrionReconciliationReportSchema>;
export type EmailLog = typeof emailLog.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type ZoomRecording = typeof zoomRecordings.$inferSelect;
export type InsertZoomRecording = z.infer<typeof insertZoomRecordingSchema>;
export type MeetingTranscript = typeof meetingTranscripts.$inferSelect;
export type InsertMeetingTranscript = z.infer<typeof insertMeetingTranscriptSchema>;

export const alertConfig = pgTable("alert_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  alertType: varchar("alert_type", { length: 50 }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  threshold: jsonb("threshold"),
  notificationChannel: varchar("notification_channel", { length: 20 }).default("dashboard"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  advisorIdIdx: index("alert_config_advisor_id_idx").on(table.advisorId),
}));

export const portfolioTargets = pgTable("portfolio_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  assetClass: text("asset_class").notNull(),
  targetAllocation: decimal("target_allocation", { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("portfolio_targets_client_id_idx").on(table.clientId),
}));

export const insertAlertConfigSchema = createInsertSchema(alertConfig).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPortfolioTargetSchema = createInsertSchema(portfolioTargets).omit({ id: true, createdAt: true, updatedAt: true });
export type AlertConfig = typeof alertConfig.$inferSelect;
export type InsertAlertConfig = z.infer<typeof insertAlertConfigSchema>;
export type PortfolioTarget = typeof portfolioTargets.$inferSelect;
export type InsertPortfolioTarget = z.infer<typeof insertPortfolioTargetSchema>;

export const meetingProcessingConfig = pgTable("meeting_processing_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advisorId: varchar("advisor_id").notNull().unique().references(() => advisors.id),
  autoCreateTasks: boolean("auto_create_tasks").notNull().default(true),
  syncToSalesforce: boolean("sync_to_salesforce").notNull().default(true),
  generateFollowUpEmail: boolean("generate_follow_up_email").notNull().default(true),
  defaultTaskPriority: text("default_task_priority").notNull().default("medium"),
  defaultTaskDueDays: integer("default_task_due_days").notNull().default(7),
  emailTemplate: text("email_template"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMeetingProcessingConfigSchema = createInsertSchema(meetingProcessingConfig).omit({ id: true, createdAt: true, updatedAt: true });
export type MeetingProcessingConfig = typeof meetingProcessingConfig.$inferSelect;
export type InsertMeetingProcessingConfig = z.infer<typeof insertMeetingProcessingConfigSchema>;

export const assessments = pgTable("assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  overallScore: integer("overall_score").notNull().default(0),
  assessmentData: jsonb("assessment_data").notNull().default({}),
  criticalActions: jsonb("critical_actions").notNull().default([]),
  summary: text("summary"),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("assessments_client_id_idx").on(table.clientId),
  advisorIdIdx: index("assessments_advisor_id_idx").on(table.advisorId),
}));

export const assessmentPdfs = pgTable("assessment_pdfs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentId: varchar("assessment_id").notNull().references(() => assessments.id),
  type: text("type").notNull().default("assessment"),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").default(0),
  downloadCount: integer("download_count").notNull().default(0),
  lastDownloadedAt: timestamp("last_downloaded_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  assessmentIdIdx: index("assessment_pdfs_assessment_id_idx").on(table.assessmentId),
}));

export const insertAssessmentSchema = createInsertSchema(assessments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAssessmentPdfSchema = createInsertSchema(assessmentPdfs).omit({ id: true, createdAt: true });
export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type AssessmentPdf = typeof assessmentPdfs.$inferSelect;
export type InsertAssessmentPdf = z.infer<typeof insertAssessmentPdfSchema>;

export const insights = pgTable("insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  insightType: varchar("insight_type", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 10 }).notNull().default("medium"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  opportunity: text("opportunity"),
  recommendedAction: text("recommended_action"),
  estimatedValue: decimal("estimated_value", { precision: 15, scale: 2 }),
  metrics: jsonb("metrics").default({}),
  confidence: integer("confidence").default(50),
  isRead: boolean("is_read").default(false),
  isDismissed: boolean("is_dismissed").default(false),
  dismissedAt: timestamp("dismissed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => ({
  clientIdIdx: index("insights_client_id_idx").on(table.clientId),
  advisorIdIdx: index("insights_advisor_id_idx").on(table.advisorId),
}));

export const insertInsightSchema = createInsertSchema(insights).omit({ id: true, createdAt: true });
export type Insight = typeof insights.$inferSelect;
export type InsertInsight = z.infer<typeof insertInsightSchema>;

export const featureFlags = pgTable("feature_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").unique().notNull(),
  enabled: boolean("enabled").notNull().default(false),
  rolloutPercentage: integer("rollout_percentage").default(100),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({ id: true, createdAt: true, updatedAt: true });
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;

export const pilotFeedback = pgTable("pilot_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  type: varchar("type").notNull(),
  message: text("message").notNull(),
  pageUrl: text("page_url"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPilotFeedbackSchema = createInsertSchema(pilotFeedback).omit({ id: true, createdAt: true });
export type PilotFeedback = typeof pilotFeedback.$inferSelect;
export type InsertPilotFeedback = z.infer<typeof insertPilotFeedbackSchema>;

export const surveyResponses = pgTable("survey_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  pageUrl: text("page_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({ id: true, createdAt: true });
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;

export const healthCheckEvents = pgTable("health_check_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  status: integer("status").notNull(),
  responseTime: integer("response_time"),
  checkedAt: timestamp("checked_at").defaultNow(),
});

export const insertHealthCheckEventSchema = createInsertSchema(healthCheckEvents).omit({ id: true, checkedAt: true });
export type HealthCheckEvent = typeof healthCheckEvents.$inferSelect;
export type InsertHealthCheckEvent = z.infer<typeof insertHealthCheckEventSchema>;

export const gateSignoffs = pgTable("gate_signoffs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gate: varchar("gate").notNull(),
  signedOffBy: text("signed_off_by").notNull(),
  title: text("title").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGateSignoffSchema = createInsertSchema(gateSignoffs).omit({ id: true, createdAt: true });
export type GateSignoff = typeof gateSignoffs.$inferSelect;
export type InsertGateSignoff = z.infer<typeof insertGateSignoffSchema>;

export const investorProfileQuestionSchemas = pgTable("investor_profile_question_schemas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  profileType: text("profile_type").notNull(),
  questions: jsonb("questions").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const investorProfiles = pgTable("investor_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  profileType: text("profile_type").notNull(),
  entityType: text("entity_type"),
  status: text("status").notNull().default("draft"),
  currentVersionId: varchar("current_version_id"),
  expirationDate: timestamp("expiration_date"),
  draftAnswers: jsonb("draft_answers").default({}),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("investor_profiles_client_id_idx").on(table.clientId),
}));

export const investorProfileVersions = pgTable("investor_profile_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull().references(() => investorProfiles.id),
  versionNumber: integer("version_number").notNull(),
  questionSchemaId: varchar("question_schema_id").notNull().references(() => investorProfileQuestionSchemas.id),
  answers: jsonb("answers").notNull(),
  submittedBy: text("submitted_by").notNull(),
  submittedAt: timestamp("submitted_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  profileIdIdx: index("investor_profile_versions_profile_id_idx").on(table.profileId),
  questionSchemaIdIdx: index("investor_profile_versions_question_schema_id_idx").on(table.questionSchemaId),
}));

export const insertInvestorProfileSchema = createInsertSchema(investorProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvestorProfileVersionSchema = createInsertSchema(investorProfileVersions).omit({
  id: true,
  createdAt: true,
});

export const insertInvestorProfileQuestionSchemaSchema = createInsertSchema(investorProfileQuestionSchemas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InvestorProfile = typeof investorProfiles.$inferSelect;
export type InsertInvestorProfile = z.infer<typeof insertInvestorProfileSchema>;
export type InvestorProfileVersion = typeof investorProfileVersions.$inferSelect;
export type InsertInvestorProfileVersion = z.infer<typeof insertInvestorProfileVersionSchema>;
export type InvestorProfileQuestionSchema = typeof investorProfileQuestionSchemas.$inferSelect;
export type InsertInvestorProfileQuestionSchema = z.infer<typeof insertInvestorProfileQuestionSchemaSchema>;

export const approvalItems = pgTable("approval_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemType: text("item_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id"),
  title: text("title").notNull(),
  description: text("description"),
  payload: jsonb("payload").notNull().default({}),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("normal"),
  submittedBy: varchar("submitted_by").notNull(),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  statusPriorityIdx: index("approval_items_status_priority_idx").on(table.status, table.priority),
  createdAtIdx: index("approval_items_created_at_idx").on(table.createdAt),
}));

export const insertApprovalItemSchema = createInsertSchema(approvalItems).omit({ id: true, createdAt: true, updatedAt: true });
export type ApprovalItem = typeof approvalItems.$inferSelect;
export type InsertApprovalItem = z.infer<typeof insertApprovalItemSchema>;

export const approvalRules = pgTable("approval_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemType: text("item_type").notNull(),
  autoApproveConditions: jsonb("auto_approve_conditions").default({}),
  requiredReviewerRole: text("required_reviewer_role"),
  slaHours: integer("sla_hours").default(24),
  escalationRole: text("escalation_role"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertApprovalRuleSchema = createInsertSchema(approvalRules).omit({ id: true, createdAt: true, updatedAt: true });
export type ApprovalRule = typeof approvalRules.$inferSelect;
export type InsertApprovalRule = z.infer<typeof insertApprovalRuleSchema>;

export const custodialChanges = pgTable("custodial_changes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: text("source").notNull(),
  changeType: text("change_type").notNull(),
  rawPayload: jsonb("raw_payload").notNull().default({}),
  normalizedPayload: jsonb("normalized_payload").notNull().default({}),
  matchedClientId: varchar("matched_client_id").references(() => clients.id),
  matchedAccountId: varchar("matched_account_id").references(() => accounts.id),
  status: text("status").notNull().default("pending_review"),
  approvalItemId: varchar("approval_item_id").references(() => approvalItems.id),
  notes: text("notes"),
  receivedAt: timestamp("received_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  statusIdx: index("custodial_changes_status_idx").on(table.status),
  matchedClientIdIdx: index("custodial_changes_matched_client_id_idx").on(table.matchedClientId),
  matchedAccountIdIdx: index("custodial_changes_matched_account_id_idx").on(table.matchedAccountId),
  approvalItemIdIdx: index("custodial_changes_approval_item_id_idx").on(table.approvalItemId),
}));

export const insertCustodialChangeSchema = createInsertSchema(custodialChanges).omit({ id: true, receivedAt: true, createdAt: true });
export type CustodialChange = typeof custodialChanges.$inferSelect;
export type InsertCustodialChange = z.infer<typeof insertCustodialChangeSchema>;

export const factFinderDefinitions = pgTable("fact_finder_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("custom"),
  questionSchema: jsonb("question_schema").notNull().default([]),
  routingRules: jsonb("routing_rules").default({}),
  scoringRules: jsonb("scoring_rules").default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const factFinderResponses = pgTable("fact_finder_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  definitionId: varchar("definition_id").notNull().references(() => factFinderDefinitions.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  householdId: varchar("household_id").references(() => households.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  status: text("status").notNull().default("draft"),
  answers: jsonb("answers").notNull().default({}),
  completionPercentage: integer("completion_percentage").default(0),
  startedAt: timestamp("started_at").defaultNow(),
  submittedAt: timestamp("submitted_at"),
  reviewedBy: varchar("reviewed_by").references(() => advisors.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  advisorIdIdx: index("fact_finder_responses_advisor_id_idx").on(table.advisorId),
  clientIdIdx: index("fact_finder_responses_client_id_idx").on(table.clientId),
  definitionIdIdx: index("fact_finder_responses_definition_id_idx").on(table.definitionId),
  householdIdIdx: index("fact_finder_responses_household_id_idx").on(table.householdId),
  reviewedByIdx: index("fact_finder_responses_reviewed_by_idx").on(table.reviewedBy),
}));

export const insertFactFinderDefinitionSchema = createInsertSchema(factFinderDefinitions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFactFinderResponseSchema = createInsertSchema(factFinderResponses).omit({ id: true, createdAt: true, updatedAt: true, startedAt: true });
export type FactFinderDefinition = typeof factFinderDefinitions.$inferSelect;
export type InsertFactFinderDefinition = z.infer<typeof insertFactFinderDefinitionSchema>;
export type FactFinderResponse = typeof factFinderResponses.$inferSelect;
export type InsertFactFinderResponse = z.infer<typeof insertFactFinderResponseSchema>;

export const cassidyJobs = pgTable("cassidy_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().unique(),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  clientId: varchar("client_id").references(() => clients.id),
  householdId: varchar("household_id").references(() => households.id),
  taskType: varchar("task_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  requestPayload: jsonb("request_payload").notNull(),
  responsePayload: jsonb("response_payload"),
  calledAgent: text("called_agent"),
  cassidyRequestId: text("cassidy_request_id"),
  agentTrace: jsonb("agent_trace"),
  secondaryAgents: jsonb("secondary_agents"),
  mergedOutput: jsonb("merged_output"),
  chainStatus: varchar("chain_status", { length: 50 }).default("single_agent"),
  conversationTurnId: varchar("conversation_turn_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  statusIdx: index("cassidy_jobs_status_idx").on(table.status),
  advisorIdIdx: index("cassidy_jobs_advisor_id_idx").on(table.advisorId),
  clientIdIdx: index("cassidy_jobs_client_id_idx").on(table.clientId),
  createdAtIdx: index("cassidy_jobs_created_at_idx").on(table.createdAt),
  householdIdIdx: index("cassidy_jobs_household_id_idx").on(table.householdId),
}));

export const insertCassidyJobSchema = createInsertSchema(cassidyJobs).omit({ id: true, createdAt: true, updatedAt: true });
export type CassidyJob = typeof cassidyJobs.$inferSelect;
export type InsertCassidyJob = z.infer<typeof insertCassidyJobSchema>;

export const agentChainSteps = pgTable("agent_chain_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => cassidyJobs.jobId, { onDelete: "cascade" }),
  chainPosition: integer("chain_position").notNull(),
  agentName: varchar("agent_name", { length: 100 }).notNull(),
  agentPromptHash: varchar("agent_prompt_hash", { length: 64 }),
  status: varchar("status", { length: 50 }).notNull().default("queued"),
  inputContext: jsonb("input_context").notNull(),
  outputContext: jsonb("output_context"),
  errorMessage: text("error_message"),
  executionDurationMs: integer("execution_duration_ms"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_agent_chain_job").on(table.jobId),
  index("idx_agent_chain_status").on(table.status),
  index("idx_agent_chain_position").on(table.jobId, table.chainPosition),
]);

export const insertAgentChainStepSchema = createInsertSchema(agentChainSteps).omit({ id: true, createdAt: true, updatedAt: true });
export type AgentChainStep = typeof agentChainSteps.$inferSelect;
export type InsertAgentChainStep = z.infer<typeof insertAgentChainStepSchema>;

export const conversationTurns = pgTable("conversation_turns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  sessionId: varchar("session_id").notNull(),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  clientId: varchar("client_id").references(() => clients.id),
  turnNumber: integer("turn_number").notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  jobId: varchar("job_id").references(() => cassidyJobs.jobId),
  suggestedPrompts: jsonb("suggested_prompts"),
  tokenUsage: integer("token_usage"),
  executionTimeMs: integer("execution_time_ms"),
  parentTurnId: varchar("parent_turn_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_conversation_turns").on(table.conversationId),
  index("idx_conversation_advisor").on(table.advisorId),
  uniqueIndex("unique_conversation_turn").on(table.conversationId, table.turnNumber),
  index("idx_conversation_client").on(table.clientId),
  index("idx_conversation_job").on(table.jobId),
]);

export const insertConversationTurnSchema = createInsertSchema(conversationTurns).omit({ id: true, createdAt: true, updatedAt: true });
export type ConversationTurn = typeof conversationTurns.$inferSelect;
export type InsertConversationTurn = z.infer<typeof insertConversationTurnSchema>;

export const executionTraces = pgTable("execution_traces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().unique().references(() => cassidyJobs.jobId, { onDelete: "cascade" }),
  traceData: jsonb("trace_data").notNull(),
  summary: text("summary"),
  status: varchar("status", { length: 20 }).notNull(),
  totalDurationMs: integer("total_duration_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertExecutionTraceSchema = createInsertSchema(executionTraces).omit({ id: true, createdAt: true, updatedAt: true });
export type ExecutionTrace = typeof executionTraces.$inferSelect;
export type InsertExecutionTrace = z.infer<typeof insertExecutionTraceSchema>;

export const cassidyAuditLog = pgTable("cassidy_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  eventData: jsonb("event_data").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_audit_job_id").on(table.jobId),
  index("idx_audit_event_type").on(table.eventType),
  index("idx_audit_timestamp").on(table.timestamp),
]);

export const insertCassidyAuditLogSchema = createInsertSchema(cassidyAuditLog).omit({ id: true, createdAt: true });
export type CassidyAuditLogEntry = typeof cassidyAuditLog.$inferSelect;
export type InsertCassidyAuditLog = z.infer<typeof insertCassidyAuditLogSchema>;

export const candidateFacts = pgTable("candidate_facts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  jobId: varchar("job_id").notNull(),
  clientId: varchar("client_id").notNull(),
  factType: varchar("fact_type", { length: 50 }).notNull(),
  factLabel: varchar("fact_label", { length: 255 }).notNull(),
  factValue: text("fact_value").notNull(),
  normalizedValue: text("normalized_value"),
  confidence: varchar("confidence", { length: 10 }).notNull(),
  sourceSnippet: text("source_snippet"),
  sourceReference: varchar("source_reference", { length: 255 }),
  ambiguityFlag: boolean("ambiguity_flag").default(false),
  originalReviewRequired: boolean("original_review_required").default(false),
  editorNote: text("editor_note"),
  status: varchar("status", { length: 20 }).default("pending"),
  reviewerId: varchar("reviewer_id"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_candidate_facts_job_id").on(table.jobId),
  index("idx_candidate_facts_client_id").on(table.clientId),
  index("idx_candidate_facts_status").on(table.status),
  index("idx_candidate_facts_reviewer_id").on(table.reviewerId),
  index("idx_candidate_facts_confidence").on(table.confidence),
]);

export const insertCandidateFactSchema = createInsertSchema(candidateFacts).omit({ createdAt: true, updatedAt: true });
export type CandidateFact = typeof candidateFacts.$inferSelect;
export type InsertCandidateFact = z.infer<typeof insertCandidateFactSchema>;

export const detectedSignals = pgTable("detected_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id"),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  meetingId: varchar("meeting_id").references(() => meetings.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  signalType: text("signal_type").notNull(),
  description: text("description").notNull(),
  confidence: text("confidence").notNull(),
  materiality: text("materiality").notNull(),
  sourceSnippet: text("source_snippet"),
  dateReference: text("date_reference"),
  recommendedActions: jsonb("recommended_actions"),
  status: text("status").notNull().default("pending"),
  reviewRequired: boolean("review_required").default(false),
  duplicateLikelihood: text("duplicate_likelihood"),
  reasoning: text("reasoning"),
  actionHistory: jsonb("action_history"),
  actionTakenAt: timestamp("action_taken_at"),
  actionMetadata: jsonb("action_metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_detected_signals_client_id").on(table.clientId),
  index("idx_detected_signals_meeting_id").on(table.meetingId),
  index("idx_detected_signals_status").on(table.status),
  index("idx_detected_signals_materiality").on(table.materiality),
  index("idx_detected_signals_advisor_id").on(table.advisorId),
]);

export const insertDetectedSignalSchema = createInsertSchema(detectedSignals).omit({ id: true, createdAt: true, updatedAt: true });
export type DetectedSignal = typeof detectedSignals.$inferSelect;
export type InsertDetectedSignal = z.infer<typeof insertDetectedSignalSchema>;

export const signalActions = pgTable("signal_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  signalId: varchar("signal_id").notNull().references(() => detectedSignals.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  actionType: text("action_type").notNull(),
  actionTimestamp: timestamp("action_timestamp").notNull().defaultNow(),
  actionStatus: text("action_status").notNull(),
  actionResult: jsonb("action_result"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_signal_actions_signal_id").on(table.signalId),
  index("idx_signal_actions_advisor_id").on(table.advisorId),
  index("idx_signal_actions_created_at").on(table.createdAt),
]);

export const insertSignalActionSchema = createInsertSchema(signalActions).omit({ id: true, createdAt: true, updatedAt: true });
export type SignalAction = typeof signalActions.$inferSelect;
export type InsertSignalAction = z.infer<typeof insertSignalActionSchema>;

export const trusts = pgTable("trusts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  trustType: text("trust_type").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  fundedValue: decimal("funded_value", { precision: 15, scale: 2 }).default("0"),
  dateEstablished: text("date_established"),
  jurisdiction: text("jurisdiction"),
  termYears: integer("term_years"),
  section7520Rate: decimal("section_7520_rate", { precision: 5, scale: 4 }),
  annuityRate: decimal("annuity_rate", { precision: 5, scale: 4 }),
  remainderBeneficiary: text("remainder_beneficiary"),
  distributionSchedule: jsonb("distribution_schedule").default([]),
  taxImplications: jsonb("tax_implications").default({}),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("trusts_client_id_idx").on(table.clientId),
  advisorIdIdx: index("trusts_advisor_id_idx").on(table.advisorId),
}));

export const trustRelationships = pgTable("trust_relationships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trustId: varchar("trust_id").notNull().references(() => trusts.id),
  personName: text("person_name").notNull(),
  personClientId: varchar("person_client_id").references(() => clients.id),
  role: text("role").notNull(),
  generation: integer("generation").default(0),
  notes: text("notes"),
}, (table) => ({
  trustIdIdx: index("trust_relationships_trust_id_idx").on(table.trustId),
  personClientIdIdx: index("trust_relationships_person_client_id_idx").on(table.personClientId),
}));

export const estateExemptions = pgTable("estate_exemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  taxYear: integer("tax_year").notNull(),
  federalExemptionLimit: decimal("federal_exemption_limit", { precision: 15, scale: 2 }).notNull(),
  lifetimeGiftsUsed: decimal("lifetime_gifts_used", { precision: 15, scale: 2 }).default("0"),
  gstExemptionUsed: decimal("gst_exemption_used", { precision: 15, scale: 2 }).default("0"),
  remainingExemption: decimal("remaining_exemption", { precision: 15, scale: 2 }).default("0"),
  remainingGstExemption: decimal("remaining_gst_exemption", { precision: 15, scale: 2 }).default("0"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientYearIdx: index("estate_exemptions_client_year_idx").on(table.clientId, table.taxYear),
  advisorIdIdx: index("estate_exemptions_advisor_id_idx").on(table.advisorId),
}));

export const giftHistory = pgTable("gift_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  recipientName: text("recipient_name").notNull(),
  recipientRelationship: text("recipient_relationship"),
  giftDate: text("gift_date").notNull(),
  giftValue: decimal("gift_value", { precision: 15, scale: 2 }).notNull(),
  giftType: text("gift_type").notNull().default("cash"),
  annualExclusionApplied: decimal("annual_exclusion_applied", { precision: 15, scale: 2 }).default("0"),
  taxableAmount: decimal("taxable_amount", { precision: 15, scale: 2 }).default("0"),
  gstApplicable: boolean("gst_applicable").default(false),
  gstAllocated: decimal("gst_allocated", { precision: 15, scale: 2 }).default("0"),
  trustId: varchar("trust_id").references(() => trusts.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("gift_history_client_id_idx").on(table.clientId),
  trustIdIdx: index("gift_history_trust_id_idx").on(table.trustId),
}));

export const insertTrustSchema = createInsertSchema(trusts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTrustRelationshipSchema = createInsertSchema(trustRelationships).omit({ id: true });
export const insertEstateExemptionSchema = createInsertSchema(estateExemptions).omit({ id: true, updatedAt: true });
export const insertGiftHistorySchema = createInsertSchema(giftHistory).omit({ id: true, createdAt: true });

export type Trust = typeof trusts.$inferSelect;
export type InsertTrust = z.infer<typeof insertTrustSchema>;
export type TrustRelationship = typeof trustRelationships.$inferSelect;
export type InsertTrustRelationship = z.infer<typeof insertTrustRelationshipSchema>;
export type EstateExemption = typeof estateExemptions.$inferSelect;
export type InsertEstateExemption = z.infer<typeof insertEstateExemptionSchema>;
export type GiftHistoryEntry = typeof giftHistory.$inferSelect;
export type InsertGiftHistory = z.infer<typeof insertGiftHistorySchema>;

export const fiduciaryValidationLogs = pgTable("fiduciary_validation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advisorId: varchar("advisor_id"),
  clientId: varchar("client_id"),
  contentType: text("content_type").notNull(),
  outcome: text("outcome").notNull(),
  ruleSetVersion: text("rule_set_version").notNull(),
  matchCount: integer("match_count").notNull().default(0),
  warningCount: integer("warning_count").notNull().default(0),
  blockCount: integer("block_count").notNull().default(0),
  matches: jsonb("matches").notNull().default([]),
  contentPreview: text("content_preview"),
  resolvedBy: varchar("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  resolutionNote: text("resolution_note"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_fvl_advisor_id").on(table.advisorId),
  index("idx_fvl_client_id").on(table.clientId),
  index("idx_fvl_outcome").on(table.outcome),
  index("idx_fvl_created_at").on(table.createdAt),
]);

export const insertFiduciaryValidationLogSchema = createInsertSchema(fiduciaryValidationLogs).omit({ id: true, createdAt: true });
export type FiduciaryValidationLog = typeof fiduciaryValidationLogs.$inferSelect;
export type InsertFiduciaryValidationLog = z.infer<typeof insertFiduciaryValidationLogSchema>;

export const fiduciaryRuleConfigs = pgTable("fiduciary_rule_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advisorId: varchar("advisor_id"),
  globalEnabled: boolean("global_enabled").notNull().default(true),
  blockThreshold: integer("block_threshold").notNull().default(1),
  ruleOverrides: jsonb("rule_overrides").notNull().default([]),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFiduciaryRuleConfigSchema = createInsertSchema(fiduciaryRuleConfigs).omit({ id: true, createdAt: true });
export type FiduciaryRuleConfig = typeof fiduciaryRuleConfigs.$inferSelect;
export type InsertFiduciaryRuleConfig = z.infer<typeof insertFiduciaryRuleConfigSchema>;

export const behavioralAnalyses = pgTable("behavioral_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  sentiment: varchar("sentiment", { length: 20 }).notNull(),
  sentimentScore: integer("sentiment_score").notNull(),
  behavioralRiskScore: integer("behavioral_risk_score").notNull(),
  dominantBias: text("dominant_bias"),
  biasIndicators: jsonb("bias_indicators").default([]),
  anxietyLevel: varchar("anxiety_level", { length: 10 }).notNull().default("low"),
  sourceType: varchar("source_type", { length: 30 }).notNull(),
  sourceId: varchar("source_id"),
  sourceSnippet: text("source_snippet"),
  coachingNotes: text("coaching_notes"),
  deEscalationStrategy: text("de_escalation_strategy"),
  marketCondition: varchar("market_condition", { length: 20 }),
  metrics: jsonb("metrics").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ba_client_id").on(table.clientId),
  index("idx_ba_advisor_id").on(table.advisorId),
  index("idx_ba_created_at").on(table.createdAt),
]);

export const insertBehavioralAnalysisSchema = createInsertSchema(behavioralAnalyses).omit({ id: true, createdAt: true });
export type BehavioralAnalysis = typeof behavioralAnalyses.$inferSelect;
export type InsertBehavioralAnalysis = z.infer<typeof insertBehavioralAnalysisSchema>;

export const pendingProfileUpdates = pgTable("pending_profile_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  sourceType: varchar("source_type", { length: 30 }).notNull(),
  sourceId: varchar("source_id"),
  lifeEvent: text("life_event").notNull(),
  fieldUpdates: jsonb("field_updates").notNull().default({}),
  reasoning: text("reasoning"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ppu_client_id").on(table.clientId),
  index("idx_ppu_advisor_id").on(table.advisorId),
  index("idx_ppu_status").on(table.status),
]);

export const insertPendingProfileUpdateSchema = createInsertSchema(pendingProfileUpdates).omit({ id: true, createdAt: true });
export type PendingProfileUpdate = typeof pendingProfileUpdates.$inferSelect;
export type InsertPendingProfileUpdate = z.infer<typeof insertPendingProfileUpdateSchema>;

export const validationRules = pgTable("validation_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  module: text("module").notNull(),
  ruleKey: text("rule_key").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  severity: text("severity").notNull().default("error"),
  enabled: boolean("enabled").notNull().default(true),
  config: jsonb("config").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  moduleIdx: index("validation_rules_module_idx").on(table.module),
}));

export const validationResults = pgTable("validation_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: varchar("run_id").notNull().default(sql`gen_random_uuid()`),
  approvalItemId: varchar("approval_item_id").references(() => approvalItems.id),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id"),
  module: text("module").notNull(),
  ruleKey: text("rule_key").notNull(),
  status: text("status").notNull(),
  message: text("message").notNull(),
  remediation: text("remediation"),
  details: jsonb("details").default({}),
  runBy: varchar("run_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  approvalItemIdx: index("validation_results_approval_item_idx").on(table.approvalItemId),
  entityIdx: index("validation_results_entity_idx").on(table.entityType, table.entityId),
  runIdx: index("validation_results_run_idx").on(table.runId),
}));

export const insertValidationRuleSchema = createInsertSchema(validationRules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertValidationResultSchema = createInsertSchema(validationResults).omit({ id: true, createdAt: true });
export type ValidationRule = typeof validationRules.$inferSelect;
export type InsertValidationRule = z.infer<typeof insertValidationRuleSchema>;
export type ValidationResult = typeof validationResults.$inferSelect;
export type InsertValidationResult = z.infer<typeof insertValidationResultSchema>;

export const marketDataCache = pgTable("market_data_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull(),
  dataType: text("data_type").notNull(),
  ticker: varchar("ticker").notNull(),
  cacheKey: text("cache_key").notNull().unique(),
  data: jsonb("data").notNull(),
  fetchedAt: timestamp("fetched_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_mdc_provider_ticker").on(table.provider, table.ticker),
  index("idx_mdc_expires_at").on(table.expiresAt),
]);

export const financialGoals = pgTable("financial_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  name: text("name").notNull(),
  targetAmount: decimal("target_amount", { precision: 15, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  timeHorizonYears: integer("time_horizon_years").notNull(),
  priority: text("priority").notNull().default("medium"),
  bucket: integer("bucket").notNull().default(1),
  linkedAccountIds: jsonb("linked_account_ids").notNull().default([]),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("financial_goals_client_id_idx").on(table.clientId),
}));

export const insertFinancialGoalSchema = createInsertSchema(financialGoals).omit({ id: true, createdAt: true, updatedAt: true });
export type FinancialGoal = typeof financialGoals.$inferSelect;
export type InsertFinancialGoal = z.infer<typeof insertFinancialGoalSchema>;

export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  accountId: varchar("account_id").notNull().references(() => accounts.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  method: text("method").notNull(),
  reason: text("reason").notNull(),
  frequency: text("frequency").notNull().default("one_time"),
  taxWithholding: decimal("tax_withholding", { precision: 5, scale: 2 }),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  orionSetAsideId: varchar("orion_set_aside_id"),
  orionNwrTagId: varchar("orion_nwr_tag_id"),
  salesforceCaseId: varchar("salesforce_case_id"),
  salesforceCaseNumber: varchar("salesforce_case_number"),
  eclipseFileGenerated: boolean("eclipse_file_generated").default(false),
  eclipseFileName: text("eclipse_file_name"),
  tradeConfirmedAt: timestamp("trade_confirmed_at"),
  nwrRemovedAt: timestamp("nwr_removed_at"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  advisorIdIdx: index("withdrawal_requests_advisor_id_idx").on(table.advisorId),
  clientIdIdx: index("withdrawal_requests_client_id_idx").on(table.clientId),
  statusIdx: index("withdrawal_requests_status_idx").on(table.status),
  accountIdIdx: index("withdrawal_requests_account_id_idx").on(table.accountId),
}));

export const withdrawalAuditLog = pgTable("withdrawal_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  withdrawalId: varchar("withdrawal_id").notNull().references(() => withdrawalRequests.id),
  action: text("action").notNull(),
  performedBy: varchar("performed_by").notNull(),
  details: jsonb("details").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  withdrawalIdIdx: index("withdrawal_audit_log_withdrawal_id_idx").on(table.withdrawalId),
}));

export const insertWithdrawalRequestSchema = createInsertSchema(withdrawalRequests).omit({ id: true, createdAt: true, updatedAt: true, submittedAt: true });
export const insertWithdrawalAuditLogSchema = createInsertSchema(withdrawalAuditLog).omit({ id: true, createdAt: true });
export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type InsertWithdrawalRequest = z.infer<typeof insertWithdrawalRequestSchema>;
export type WithdrawalAuditLog = typeof withdrawalAuditLog.$inferSelect;
export type InsertWithdrawalAuditLog = z.infer<typeof insertWithdrawalAuditLogSchema>;

export const sopDocuments = pgTable("sop_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  content: text("content").notNull(),
  version: text("version").notNull().default("1.0"),
  status: text("status").notNull().default("active"),
  uploadedBy: varchar("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_sop_docs_category").on(table.category),
  index("idx_sop_docs_status").on(table.status),
]);

export const insertSopDocumentSchema = createInsertSchema(sopDocuments).omit({ id: true, createdAt: true, updatedAt: true });
export type SopDocument = typeof sopDocuments.$inferSelect;
export type InsertSopDocument = z.infer<typeof insertSopDocumentSchema>;

export const sopChunks = pgTable("sop_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => sopDocuments.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_sop_chunks_doc_id").on(table.documentId),
]);

export const insertSopChunkSchema = createInsertSchema(sopChunks).omit({ id: true, createdAt: true });
export type SopChunk = typeof sopChunks.$inferSelect;
export type InsertSopChunk = z.infer<typeof insertSopChunkSchema>;

export const custodialInstructions = pgTable("custodial_instructions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  custodian: text("custodian").notNull(),
  actionType: text("action_type").notNull(),
  formName: text("form_name").notNull(),
  description: text("description"),
  requiredFields: jsonb("required_fields").notNull().default([]),
  requiredSignatures: jsonb("required_signatures").notNull().default([]),
  supportingDocuments: jsonb("supporting_documents").notNull().default([]),
  instructions: text("instructions"),
  processingTime: text("processing_time"),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_cust_instr_custodian").on(table.custodian),
  index("idx_cust_instr_action_type").on(table.actionType),
]);

export const insertCustodialInstructionSchema = createInsertSchema(custodialInstructions).omit({ id: true, createdAt: true, updatedAt: true });
export type CustodialInstruction = typeof custodialInstructions.$inferSelect;
export type InsertCustodialInstruction = z.infer<typeof insertCustodialInstructionSchema>;

export const apiUsageTracking = pgTable("api_usage_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull(),
  date: date("date").notNull(),
  requestsMade: integer("requests_made").notNull().default(0),
  requestsLimit: integer("requests_limit").notNull(),
  lastRequestAt: timestamp("last_request_at"),
}, (table) => [
  uniqueIndex("idx_aut_provider_date").on(table.provider, table.date),
]);

export const discoveryQuestionnaires = pgTable("discovery_questionnaires", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  name: text("name").notNull(),
  clientType: text("client_type").notNull().default("individual"),
  sections: jsonb("sections").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_dq_advisor_id").on(table.advisorId),
  index("idx_dq_client_type").on(table.clientType),
]);

export const insertDiscoveryQuestionnaireSchema = createInsertSchema(discoveryQuestionnaires).omit({ id: true, createdAt: true, updatedAt: true });
export type DiscoveryQuestionnaire = typeof discoveryQuestionnaires.$inferSelect;
export type InsertDiscoveryQuestionnaire = z.infer<typeof insertDiscoveryQuestionnaireSchema>;

export const discoverySessions = pgTable("discovery_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  clientId: varchar("client_id").references(() => clients.id),
  questionnaireId: varchar("questionnaire_id").references(() => discoveryQuestionnaires.id),
  meetingId: varchar("meeting_id").references(() => meetings.id),
  clientType: text("client_type").notNull().default("individual"),
  status: text("status").notNull().default("draft"),
  prospectName: text("prospect_name"),
  prospectEmail: text("prospect_email"),
  questionnaireResponses: jsonb("questionnaire_responses").default({}),
  wizardResponses: jsonb("wizard_responses").default({}),
  currentSection: integer("current_section").default(0),
  talkingPoints: text("talking_points"),
  summary: text("summary"),
  engagementPathway: text("engagement_pathway"),
  recommendedNextSteps: jsonb("recommended_next_steps").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_ds_advisor_id").on(table.advisorId),
  index("idx_ds_client_id").on(table.clientId),
  index("idx_ds_status").on(table.status),
  index("idx_ds_questionnaire_id").on(table.questionnaireId),
  index("idx_ds_meeting_id").on(table.meetingId),
]);

export const insertDiscoverySessionSchema = createInsertSchema(discoverySessions).omit({ id: true, createdAt: true, updatedAt: true });
export type DiscoverySession = typeof discoverySessions.$inferSelect;
export type InsertDiscoverySession = z.infer<typeof insertDiscoverySessionSchema>;

export const kycRiskRatings = pgTable("kyc_risk_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  riskScore: integer("risk_score").notNull(),
  riskTier: text("risk_tier").notNull(),
  residencyRisk: integer("residency_risk").notNull().default(0),
  occupationRisk: integer("occupation_risk").notNull().default(0),
  sourceOfWealthRisk: integer("source_of_wealth_risk").notNull().default(0),
  pepStatus: boolean("pep_status").notNull().default(false),
  pepRisk: integer("pep_risk").notNull().default(0),
  factors: jsonb("factors").notNull().default({}),
  overrideReason: text("override_reason"),
  ratedBy: text("rated_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("kyc_risk_ratings_client_id_idx").on(table.clientId),
  advisorIdIdx: index("kyc_risk_ratings_advisor_id_idx").on(table.advisorId),
}));

export const amlScreeningResults = pgTable("aml_screening_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  screeningType: text("screening_type").notNull(),
  watchlistName: text("watchlist_name").notNull(),
  matchStatus: text("match_status").notNull(),
  matchConfidence: integer("match_confidence"),
  matchDetails: jsonb("match_details").default({}),
  resolvedBy: text("resolved_by"),
  resolvedAt: text("resolved_at"),
  resolution: text("resolution"),
  notes: text("notes"),
  screenedBy: text("screened_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("aml_screening_client_id_idx").on(table.clientId),
  matchStatusIdx: index("aml_screening_match_status_idx").on(table.matchStatus),
  advisorIdIdx: index("aml_screening_advisor_id_idx").on(table.advisorId),
}));

export const kycReviewSchedules = pgTable("kyc_review_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  riskTier: text("risk_tier").notNull(),
  lastReviewDate: text("last_review_date"),
  nextReviewDate: text("next_review_date").notNull(),
  reviewFrequencyMonths: integer("review_frequency_months").notNull(),
  status: text("status").notNull().default("scheduled"),
  completedAt: text("completed_at"),
  completedBy: text("completed_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("kyc_review_schedules_client_id_idx").on(table.clientId),
  nextReviewIdx: index("kyc_review_schedules_next_review_idx").on(table.nextReviewDate),
  advisorIdIdx: index("kyc_review_schedules_advisor_id_idx").on(table.advisorId),
}));

export const eddRecords = pgTable("edd_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  triggerReason: text("trigger_reason").notNull(),
  status: text("status").notNull().default("pending"),
  requiredDocuments: jsonb("required_documents").notNull().default([]),
  collectedDocuments: jsonb("collected_documents").notNull().default([]),
  findings: text("findings"),
  riskAssessment: text("risk_assessment"),
  recommendation: text("recommendation"),
  assignedTo: text("assigned_to"),
  completedAt: text("completed_at"),
  completedBy: text("completed_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("edd_records_client_id_idx").on(table.clientId),
  statusIdx: index("edd_records_status_idx").on(table.status),
  advisorIdIdx: index("edd_records_advisor_id_idx").on(table.advisorId),
}));

export const kycAuditLog = pgTable("kyc_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id"),
  details: jsonb("details").default({}),
  performedBy: text("performed_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("kyc_audit_log_client_id_idx").on(table.clientId),
  actionIdx: index("kyc_audit_log_action_idx").on(table.action),
  advisorIdIdx: index("kyc_audit_log_advisor_id_idx").on(table.advisorId),
}));

export const insertKycRiskRatingSchema = createInsertSchema(kycRiskRatings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAmlScreeningResultSchema = createInsertSchema(amlScreeningResults).omit({ id: true, createdAt: true });
export const insertKycReviewScheduleSchema = createInsertSchema(kycReviewSchedules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEddRecordSchema = createInsertSchema(eddRecords).omit({ id: true, createdAt: true, updatedAt: true });
export const insertKycAuditLogSchema = createInsertSchema(kycAuditLog).omit({ id: true, createdAt: true });

export type KycRiskRating = typeof kycRiskRatings.$inferSelect;
export type InsertKycRiskRating = z.infer<typeof insertKycRiskRatingSchema>;
export type AmlScreeningResult = typeof amlScreeningResults.$inferSelect;
export type InsertAmlScreeningResult = z.infer<typeof insertAmlScreeningResultSchema>;
export type KycReviewSchedule = typeof kycReviewSchedules.$inferSelect;
export type InsertKycReviewSchedule = z.infer<typeof insertKycReviewScheduleSchema>;
export type EddRecord = typeof eddRecords.$inferSelect;
export type InsertEddRecord = z.infer<typeof insertEddRecordSchema>;
export type KycAuditLogEntry = typeof kycAuditLog.$inferSelect;
export type InsertKycAuditLog = z.infer<typeof insertKycAuditLogSchema>;

export const ofacSdnEntries = pgTable("ofac_sdn_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sdnName: text("sdn_name").notNull(),
  sdnType: text("sdn_type"),
  program: text("program"),
  title: text("title"),
  remarks: text("remarks"),
  aliases: jsonb("aliases").notNull().default([]),
  addresses: jsonb("addresses").notNull().default([]),
  sourceId: text("source_id"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  sdnNameIdx: index("ofac_sdn_name_idx").on(table.sdnName),
  sourceIdIdx: index("ofac_sdn_source_id_idx").on(table.sourceId),
}));

export const pepEntries = pgTable("pep_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  country: text("country"),
  position: text("position"),
  level: text("level"),
  aliases: jsonb("aliases").notNull().default([]),
  activeFrom: text("active_from"),
  activeTo: text("active_to"),
  source: text("source"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  fullNameIdx: index("pep_full_name_idx").on(table.fullName),
  countryIdx: index("pep_country_idx").on(table.country),
}));

export const screeningConfigs = pgTable("screening_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  ofacEnabled: boolean("ofac_enabled").notNull().default(true),
  pepEnabled: boolean("pep_enabled").notNull().default(true),
  internalWatchlistEnabled: boolean("internal_watchlist_enabled").notNull().default(true),
  nameMatchThreshold: integer("name_match_threshold").notNull().default(85),
  autoResolveThreshold: integer("auto_resolve_threshold").notNull().default(65),
  highConfidenceThreshold: integer("high_confidence_threshold").notNull().default(90),
  rescreeningFrequencyDays: integer("rescreening_frequency_days").notNull().default(90),
  lastOfacUpdate: timestamp("last_ofac_update"),
  lastRescreeningRun: timestamp("last_rescreening_run"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  advisorIdIdx: index("screening_configs_advisor_id_idx").on(table.advisorId),
}));

export const insertOfacSdnEntrySchema = createInsertSchema(ofacSdnEntries).omit({ id: true, createdAt: true });
export const insertPepEntrySchema = createInsertSchema(pepEntries).omit({ id: true, createdAt: true });
export const insertScreeningConfigSchema = createInsertSchema(screeningConfigs).omit({ id: true, createdAt: true, updatedAt: true });

export type OfacSdnEntry = typeof ofacSdnEntries.$inferSelect;
export type InsertOfacSdnEntry = z.infer<typeof insertOfacSdnEntrySchema>;
export type PepEntry = typeof pepEntries.$inferSelect;
export type InsertPepEntry = z.infer<typeof insertPepEntrySchema>;
export type ScreeningConfig = typeof screeningConfigs.$inferSelect;
export type InsertScreeningConfig = z.infer<typeof insertScreeningConfigSchema>;

export const preCaseValidations = pgTable("pre_case_validations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  validationType: text("validation_type").notNull(),
  overallResult: text("overall_result").notNull().default("pending"),
  modules: jsonb("modules").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("pre_case_validations_client_id_idx").on(table.clientId),
  advisorIdIdx: index("pre_case_validations_advisor_id_idx").on(table.advisorId),
}));

export const insertPreCaseValidationSchema = createInsertSchema(preCaseValidations).omit({ id: true, createdAt: true });
export type PreCaseValidation = typeof preCaseValidations.$inferSelect;
export type InsertPreCaseValidation = z.infer<typeof insertPreCaseValidationSchema>;

export const nigoItems = pgTable("nigo_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id),
  accountId: varchar("account_id").references(() => accounts.id),
  custodian: text("custodian").notNull(),
  nigoType: text("nigo_type").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"),
  resolutionGuidance: text("resolution_guidance"),
  rmdAmount: decimal("rmd_amount", { precision: 15, scale: 2 }),
  rmdYear: integer("rmd_year"),
  submittedAt: timestamp("submitted_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  custodianIdx: index("nigo_items_custodian_idx").on(table.custodian),
  statusIdx: index("nigo_items_status_idx").on(table.status),
  clientIdIdx: index("nigo_items_client_id_idx").on(table.clientId),
  accountIdIdx: index("nigo_items_account_id_idx").on(table.accountId),
}));

export const insertNigoItemSchema = createInsertSchema(nigoItems).omit({ id: true, createdAt: true, updatedAt: true });
export type NigoItem = typeof nigoItems.$inferSelect;
export type InsertNigoItem = z.infer<typeof insertNigoItemSchema>;

export const engagementEvents = pgTable("engagement_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  eventType: text("event_type").notNull(),
  channel: text("channel").notNull(),
  subject: text("subject"),
  description: text("description"),
  metadata: jsonb("metadata").default({}),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("engagement_events_client_id_idx").on(table.clientId),
  advisorIdIdx: index("engagement_events_advisor_id_idx").on(table.advisorId),
  eventTypeIdx: index("engagement_events_event_type_idx").on(table.eventType),
}));

export const engagementScores = pgTable("engagement_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  compositeScore: integer("composite_score").notNull().default(0),
  frequencyScore: integer("frequency_score").notNull().default(0),
  recencyScore: integer("recency_score").notNull().default(0),
  diversityScore: integer("diversity_score").notNull().default(0),
  trend: text("trend").notNull().default("stable"),
  breakdown: jsonb("breakdown").default({}),
  calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("engagement_scores_client_id_idx").on(table.clientId),
  advisorIdIdx: index("engagement_scores_advisor_id_idx").on(table.advisorId),
}));

export const intentSignals = pgTable("intent_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  signalType: text("signal_type").notNull(),
  strength: text("strength").notNull().default("medium"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  evidence: jsonb("evidence").default([]),
  isActive: boolean("is_active").notNull().default(true),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("intent_signals_client_id_idx").on(table.clientId),
  advisorIdIdx: index("intent_signals_advisor_id_idx").on(table.advisorId),
  activeIdx: index("intent_signals_active_idx").on(table.isActive),
}));

export const nextBestActions = pgTable("next_best_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  actionType: text("action_type").notNull(),
  priority: integer("priority").notNull().default(50),
  title: text("title").notNull(),
  description: text("description").notNull(),
  reasoning: text("reasoning"),
  status: text("status").notNull().default("pending"),
  category: text("category").notNull().default("outreach"),
  estimatedImpact: text("estimated_impact"),
  dueDate: text("due_date"),
  completedAt: timestamp("completed_at"),
  dismissedAt: timestamp("dismissed_at"),
  salesforceActivityId: varchar("salesforce_activity_id"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("nba_client_id_idx").on(table.clientId),
  advisorIdIdx: index("nba_advisor_id_idx").on(table.advisorId),
  statusIdx: index("nba_status_idx").on(table.status),
  priorityIdx: index("nba_priority_idx").on(table.priority),
}));

export const insertEngagementEventSchema = createInsertSchema(engagementEvents).omit({ id: true, createdAt: true });
export const insertEngagementScoreSchema = createInsertSchema(engagementScores).omit({ id: true, createdAt: true, updatedAt: true });
export const insertIntentSignalSchema = createInsertSchema(intentSignals).omit({ id: true, createdAt: true });
export const insertNextBestActionSchema = createInsertSchema(nextBestActions).omit({ id: true, createdAt: true, updatedAt: true });

export type EngagementEvent = typeof engagementEvents.$inferSelect;
export type InsertEngagementEvent = z.infer<typeof insertEngagementEventSchema>;
export type EngagementScore = typeof engagementScores.$inferSelect;
export type InsertEngagementScore = z.infer<typeof insertEngagementScoreSchema>;
export type IntentSignal = typeof intentSignals.$inferSelect;
export type InsertIntentSignal = z.infer<typeof insertIntentSignalSchema>;
export type NextBestAction = typeof nextBestActions.$inferSelect;
export type InsertNextBestAction = z.infer<typeof insertNextBestActionSchema>;

export const charitableAccounts = pgTable("charitable_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  accountType: text("account_type").notNull(),
  name: text("name").notNull(),
  provider: text("provider"),
  accountNumber: text("account_number"),
  currentBalance: decimal("current_balance", { precision: 15, scale: 2 }).notNull().default("0"),
  totalContributions: decimal("total_contributions", { precision: 15, scale: 2 }).default("0"),
  totalGrants: decimal("total_grants", { precision: 15, scale: 2 }).default("0"),
  inceptionDate: text("inception_date"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("charitable_accounts_client_id_idx").on(table.clientId),
  advisorIdIdx: index("charitable_accounts_advisor_id_idx").on(table.advisorId),
}));

export const charitableContributions = pgTable("charitable_contributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => charitableAccounts.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  date: text("date").notNull(),
  type: text("type").notNull().default("cash"),
  taxDeductionAmount: decimal("tax_deduction_amount", { precision: 15, scale: 2 }),
  taxYear: integer("tax_year"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  accountIdIdx: index("charitable_contributions_account_id_idx").on(table.accountId),
}));

export const businessEntities = pgTable("business_entities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  name: text("name").notNull(),
  entityType: text("entity_type").notNull(),
  industry: text("industry"),
  ownershipPercentage: decimal("ownership_percentage", { precision: 5, scale: 2 }),
  estimatedValue: decimal("estimated_value", { precision: 15, scale: 2 }),
  annualRevenue: decimal("annual_revenue", { precision: 15, scale: 2 }),
  annualEbitda: decimal("annual_ebitda", { precision: 15, scale: 2 }),
  employeeCount: integer("employee_count"),
  foundedDate: text("founded_date"),
  keyPeople: jsonb("key_people").default([]),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("business_entities_client_id_idx").on(table.clientId),
}));

export const businessValuations = pgTable("business_valuations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessEntityId: varchar("business_entity_id").notNull().references(() => businessEntities.id),
  valuationDate: text("valuation_date").notNull(),
  methodology: text("methodology").notNull(),
  estimatedValue: decimal("estimated_value", { precision: 15, scale: 2 }).notNull(),
  assumptions: jsonb("assumptions").default({}),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  businessEntityIdIdx: index("business_valuations_business_entity_id_idx").on(table.businessEntityId),
}));

export const charitableGrants = pgTable("charitable_grants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => charitableAccounts.id),
  recipientName: text("recipient_name").notNull(),
  recipientEin: text("recipient_ein"),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  date: text("date").notNull(),
  purpose: text("purpose"),
  status: text("status").notNull().default("completed"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  accountIdIdx: index("charitable_grants_account_id_idx").on(table.accountId),
}));

export const charitableGoals = pgTable("charitable_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  name: text("name").notNull(),
  targetAmount: decimal("target_amount", { precision: 15, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  targetYear: integer("target_year"),
  category: text("category").notNull().default("general"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("charitable_goals_client_id_idx").on(table.clientId),
}));

export const buySellAgreements = pgTable("buy_sell_agreements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessEntityId: varchar("business_entity_id").notNull().references(() => businessEntities.id),
  agreementType: text("agreement_type").notNull(),
  triggerEvents: jsonb("trigger_events").notNull().default([]),
  fundingMechanism: text("funding_mechanism"),
  fundingAmount: decimal("funding_amount", { precision: 15, scale: 2 }),
  policyNumber: text("policy_number"),
  insuranceCarrier: text("insurance_carrier"),
  effectiveDate: text("effective_date"),
  reviewDate: text("review_date"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  businessEntityIdIdx: index("buy_sell_agreements_business_entity_id_idx").on(table.businessEntityId),
}));

export const insertCharitableAccountSchema = createInsertSchema(charitableAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCharitableContributionSchema = createInsertSchema(charitableContributions).omit({ id: true, createdAt: true });
export const insertCharitableGrantSchema = createInsertSchema(charitableGrants).omit({ id: true, createdAt: true });
export const insertCharitableGoalSchema = createInsertSchema(charitableGoals).omit({ id: true, createdAt: true, updatedAt: true });

export type CharitableAccount = typeof charitableAccounts.$inferSelect;
export type InsertCharitableAccount = z.infer<typeof insertCharitableAccountSchema>;
export type CharitableContribution = typeof charitableContributions.$inferSelect;
export type InsertCharitableContribution = z.infer<typeof insertCharitableContributionSchema>;
export type CharitableGrant = typeof charitableGrants.$inferSelect;
export type InsertCharitableGrant = z.infer<typeof insertCharitableGrantSchema>;
export type CharitableGoal = typeof charitableGoals.$inferSelect;
export type InsertCharitableGoal = z.infer<typeof insertCharitableGoalSchema>;

export const researchArticles = pgTable("research_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  keyTakeaways: jsonb("key_takeaways").default([]),
  topics: text("topics").array().default([]),
  relevanceTags: text("relevance_tags").array().default([]),
  publishedAt: timestamp("published_at"),
  ingestedAt: timestamp("ingested_at").defaultNow(),
  aiProcessed: boolean("ai_processed").default(false),
  contentHash: text("content_hash"),
  feedId: varchar("feed_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ra_source").on(table.source),
  index("idx_ra_published").on(table.publishedAt),
  index("idx_ra_ai_processed").on(table.aiProcessed),
  index("idx_ra_content_hash").on(table.contentHash),
  index("idx_ra_feed_id").on(table.feedId),
]);

export const insertResearchArticleSchema = createInsertSchema(researchArticles).omit({ id: true, createdAt: true, ingestedAt: true });
export type ResearchArticle = typeof researchArticles.$inferSelect;
export type InsertResearchArticle = z.infer<typeof insertResearchArticleSchema>;

export interface BriefClassification {
  type: string;
  credibilityScore: number;
  credibilityFactors: { factor: string; score: number; note: string }[];
  timeliness: string;
  urgencyLevel: string;
  publicationRecency: string;
}

export interface BriefKeyTakeaway {
  point: string;
  evidence: string;
  sourceAttribution: string;
  quantification: string;
}

export interface BriefPlanningDomain {
  domain: string;
  relevanceScore: number;
  rationale: string;
}

export interface BriefClientImpact {
  lifeStageScores: { stage: string; score: number; mechanism: string }[];
  riskProfileScores: { profile: string; score: number; mechanism: string }[];
  overallImpactLevel: string;
}

export interface BriefActionTrigger {
  action: string;
  targetSegment: string;
  rationale: string;
  timing: string;
  exampleClient: string;
  priority: string;
}

export interface BriefTalkingPoint {
  segment: string;
  situation: string;
  implication: string;
  question: string;
  action: string;
  doNotSay: string[];
}

export interface BriefComplianceReview {
  forwardLookingStatements: { text: string; disclaimer: string }[];
  balancedPresentation: boolean;
  balanceNote: string;
  sourceAttributionVerified: boolean;
  forbiddenPhrases: { phrase: string; replacement: string }[];
  overallStatus: string;
}

export interface BriefTagTaxonomy {
  topicTags: string[];
  assetClassTags: string[];
  relevanceTag: string;
  urgencyTag: string;
}

export interface BriefClientAlert {
  matchType: string;
  description: string;
  priority: string;
  targetSegments: string[];
}

export const researchBriefs = pgTable("research_briefs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: varchar("article_id").notNull().references(() => researchArticles.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  classification: jsonb("classification").$type<BriefClassification>().default({} as BriefClassification),
  executiveSummary: text("executive_summary"),
  keyTakeaways: jsonb("key_takeaways").$type<BriefKeyTakeaway[]>().default([]),
  planningDomains: jsonb("planning_domains").$type<BriefPlanningDomain[]>().default([]),
  clientImpact: jsonb("client_impact").$type<BriefClientImpact>().default({} as BriefClientImpact),
  actionTriggers: jsonb("action_triggers").$type<BriefActionTrigger[]>().default([]),
  talkingPoints: jsonb("talking_points").$type<BriefTalkingPoint[]>().default([]),
  complianceReview: jsonb("compliance_review").$type<BriefComplianceReview>().default({} as BriefComplianceReview),
  tagTaxonomy: jsonb("tag_taxonomy").$type<BriefTagTaxonomy>().default({} as BriefTagTaxonomy),
  clientAlertQueue: jsonb("client_alert_queue").$type<BriefClientAlert[]>().default([]),
  generatedAt: timestamp("generated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_rb_article_id").on(table.articleId),
  index("idx_rb_advisor_id").on(table.advisorId),
  index("idx_rb_generated_at").on(table.generatedAt),
]);

export const insertResearchBriefSchema = createInsertSchema(researchBriefs).omit({ id: true, createdAt: true, updatedAt: true });
export type ResearchBrief = typeof researchBriefs.$inferSelect;
export type InsertResearchBrief = z.infer<typeof insertResearchBriefSchema>;

export const researchFeeds = pgTable("research_feeds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  url: text("url").notNull(),
  category: text("category"),
  fetchIntervalMinutes: integer("fetch_interval_minutes").default(360),
  status: text("status").default("active"),
  lastFetchAt: timestamp("last_fetch_at"),
  lastError: text("last_error"),
  errorCount: integer("error_count").default(0),
  articleCount: integer("article_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_rf_status").on(table.status),
  index("idx_rf_url").on(table.url),
]);

export const insertResearchFeedSchema = createInsertSchema(researchFeeds).omit({ id: true, createdAt: true, updatedAt: true, lastFetchAt: true, lastError: true, errorCount: true, articleCount: true });
export type ResearchFeed = typeof researchFeeds.$inferSelect;
export type InsertResearchFeed = z.infer<typeof insertResearchFeedSchema>;

export const taxLots = pgTable("tax_lots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  holdingId: varchar("holding_id").notNull().references(() => holdings.id),
  accountId: varchar("account_id").notNull().references(() => accounts.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  ticker: text("ticker").notNull(),
  shares: decimal("shares", { precision: 15, scale: 4 }).notNull(),
  costBasisPerShare: decimal("cost_basis_per_share", { precision: 15, scale: 4 }).notNull(),
  totalCostBasis: decimal("total_cost_basis", { precision: 15, scale: 2 }).notNull(),
  currentPrice: decimal("current_price", { precision: 15, scale: 4 }),
  marketValue: decimal("market_value", { precision: 15, scale: 2 }),
  unrealizedGainLoss: decimal("unrealized_gain_loss", { precision: 15, scale: 2 }),
  acquisitionDate: text("acquisition_date").notNull(),
  holdingPeriod: text("holding_period").notNull().default("short-term"),
  washSaleDisallowed: boolean("wash_sale_disallowed").default(false),
  washSaleWindowStart: text("wash_sale_window_start"),
  washSaleWindowEnd: text("wash_sale_window_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  accountIdIdx: index("tax_lots_account_id_idx").on(table.accountId),
  clientIdIdx: index("tax_lots_client_id_idx").on(table.clientId),
  tickerIdx: index("tax_lots_ticker_idx").on(table.ticker),
  holdingIdIdx: index("tax_lots_holding_id_idx").on(table.holdingId),
}));

export const directIndexPortfolios = pgTable("direct_index_portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  accountId: varchar("account_id").references(() => accounts.id),
  name: text("name").notNull(),
  targetIndex: text("target_index").notNull(),
  totalValue: decimal("total_value", { precision: 15, scale: 2 }).notNull().default("0"),
  trackingDifference: decimal("tracking_difference", { precision: 8, scale: 4 }),
  taxAlpha: decimal("tax_alpha", { precision: 15, scale: 2 }).default("0"),
  totalHarvestedLosses: decimal("total_harvested_losses", { precision: 15, scale: 2 }).default("0"),
  status: text("status").notNull().default("active"),
  allocations: jsonb("allocations").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("direct_index_portfolios_client_id_idx").on(table.clientId),
  accountIdIdx: index("direct_index_portfolios_account_id_idx").on(table.accountId),
}));

export const washSaleEvents = pgTable("wash_sale_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  ticker: text("ticker").notNull(),
  sellDate: text("sell_date").notNull(),
  sellAccountId: varchar("sell_account_id").notNull().references(() => accounts.id),
  buyDate: text("buy_date"),
  buyAccountId: varchar("buy_account_id").references(() => accounts.id),
  disallowedLoss: decimal("disallowed_loss", { precision: 15, scale: 2 }).notNull(),
  windowStart: text("window_start").notNull(),
  windowEnd: text("window_end").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("wash_sale_events_client_id_idx").on(table.clientId),
  tickerIdx: index("wash_sale_events_ticker_idx").on(table.ticker),
  sellAccountIdIdx: index("wash_sale_events_sell_account_id_idx").on(table.sellAccountId),
  buyAccountIdIdx: index("wash_sale_events_buy_account_id_idx").on(table.buyAccountId),
}));

export const insertTaxLotSchema = createInsertSchema(taxLots).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDirectIndexPortfolioSchema = createInsertSchema(directIndexPortfolios).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWashSaleEventSchema = createInsertSchema(washSaleEvents).omit({ id: true, createdAt: true });

export type TaxLot = typeof taxLots.$inferSelect;
export type InsertTaxLot = z.infer<typeof insertTaxLotSchema>;
export type DirectIndexPortfolio = typeof directIndexPortfolios.$inferSelect;
export type InsertDirectIndexPortfolio = z.infer<typeof insertDirectIndexPortfolioSchema>;
export type WashSaleEvent = typeof washSaleEvents.$inferSelect;
export type InsertWashSaleEvent = z.infer<typeof insertWashSaleEventSchema>;
export const socialProfiles = pgTable("social_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  platform: text("platform").notNull().default("linkedin"),
  profileUrl: text("profile_url").notNull(),
  displayName: text("display_name"),
  headline: text("headline"),
  monitoringEnabled: boolean("monitoring_enabled").notNull().default(true),
  lastCheckedAt: timestamp("last_checked_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("social_profiles_client_id_idx").on(table.clientId),
}));

export const socialEvents = pgTable("social_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  socialProfileId: varchar("social_profile_id").notNull().references(() => socialProfiles.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  eventType: text("event_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  detectedAt: timestamp("detected_at").defaultNow(),
  sourceUrl: text("source_url"),
  isRead: boolean("is_read").notNull().default(false),
  outreachPrompt: text("outreach_prompt"),
  outreachGenerated: boolean("outreach_generated").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("social_events_client_id_idx").on(table.clientId),
  profileIdIdx: index("social_events_profile_id_idx").on(table.socialProfileId),
}));

export const insertSocialProfileSchema = createInsertSchema(socialProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSocialEventSchema = createInsertSchema(socialEvents).omit({ id: true, createdAt: true });
export type SocialProfile = typeof socialProfiles.$inferSelect;
export type InsertSocialProfile = z.infer<typeof insertSocialProfileSchema>;
export type SocialEvent = typeof socialEvents.$inferSelect;
export type InsertSocialEvent = z.infer<typeof insertSocialEventSchema>;

export const nigoRecords = pgTable("nigo_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  accountId: varchar("account_id").references(() => accounts.id),
  custodian: text("custodian").notNull(),
  submissionType: text("submission_type").notNull(),
  reasonCode: text("reason_code").notNull(),
  reasonDescription: text("reason_description"),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("normal"),
  submittedDate: text("submitted_date").notNull(),
  rejectedDate: text("rejected_date"),
  resolvedDate: text("resolved_date"),
  resolutionNotes: text("resolution_notes"),
  resolutionGuidance: text("resolution_guidance"),
  formReference: text("form_reference"),
  aging: integer("aging").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  advisorIdIdx: index("nigo_records_advisor_id_idx").on(table.advisorId),
  clientIdIdx: index("nigo_records_client_id_idx").on(table.clientId),
  statusIdx: index("nigo_records_status_idx").on(table.status),
  custodianIdx: index("nigo_records_custodian_idx").on(table.custodian),
  accountIdIdx: index("nigo_records_account_id_idx").on(table.accountId),
}));

export const insertNigoRecordSchema = createInsertSchema(nigoRecords).omit({ id: true, createdAt: true, updatedAt: true });
export type NigoRecord = typeof nigoRecords.$inferSelect;
export type InsertNigoRecord = z.infer<typeof insertNigoRecordSchema>;

export const exitPlanMilestones = pgTable("exit_plan_milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessEntityId: varchar("business_entity_id").notNull().references(() => businessEntities.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  targetDate: text("target_date"),
  status: text("status").notNull().default("not_started"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  businessEntityIdIdx: index("exit_plan_milestones_business_entity_id_idx").on(table.businessEntityId),
}));

export const insertBusinessEntitySchema = createInsertSchema(businessEntities).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBusinessValuationSchema = createInsertSchema(businessValuations).omit({ id: true, createdAt: true });
export const insertBuySellAgreementSchema = createInsertSchema(buySellAgreements).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExitPlanMilestoneSchema = createInsertSchema(exitPlanMilestones).omit({ id: true, createdAt: true, updatedAt: true });
export type BusinessEntity = typeof businessEntities.$inferSelect;
export type InsertBusinessEntity = z.infer<typeof insertBusinessEntitySchema>;
export type BusinessValuation = typeof businessValuations.$inferSelect;
export type InsertBusinessValuation = z.infer<typeof insertBusinessValuationSchema>;
export type BuySellAgreement = typeof buySellAgreements.$inferSelect;
export type InsertBuySellAgreement = z.infer<typeof insertBuySellAgreementSchema>;
export type ExitPlanMilestone = typeof exitPlanMilestones.$inferSelect;
export type InsertExitPlanMilestone = z.infer<typeof insertExitPlanMilestoneSchema>;

export const flpStructures = pgTable("flp_structures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  name: text("name").notNull(),
  totalValue: decimal("total_value", { precision: 15, scale: 2 }),
  generalPartnerPct: decimal("general_partner_pct", { precision: 5, scale: 2 }).default("1"),
  limitedPartnerPct: decimal("limited_partner_pct", { precision: 5, scale: 2 }).default("99"),
  lackOfControlDiscount: decimal("lack_of_control_discount", { precision: 5, scale: 4 }).default("0.25"),
  lackOfMarketabilityDiscount: decimal("lack_of_marketability_discount", { precision: 5, scale: 4 }).default("0.20"),
  combinedDiscount: decimal("combined_discount", { precision: 5, scale: 4 }),
  discountedValue: decimal("discounted_value", { precision: 15, scale: 2 }),
  ownershipDetails: jsonb("ownership_details").default([]),
  status: text("status").notNull().default("active"),
  dateEstablished: text("date_established"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("flp_structures_client_id_idx").on(table.clientId),
  advisorIdIdx: index("flp_structures_advisor_id_idx").on(table.advisorId),
}));

export const exitMilestones = pgTable("exit_milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: text("target_date"),
  category: text("category").notNull().default("general"),
  status: text("status").notNull().default("pending"),
  completedDate: text("completed_date"),
  sortOrder: integer("sort_order").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("exit_milestones_client_id_idx").on(table.clientId),
  advisorIdIdx: index("exit_milestones_advisor_id_idx").on(table.advisorId),
}));

export const insertFlpStructureSchema = createInsertSchema(flpStructures).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExitMilestoneSchema = createInsertSchema(exitMilestones).omit({ id: true, createdAt: true, updatedAt: true });
export type FlpStructure = typeof flpStructures.$inferSelect;
export type InsertFlpStructure = z.infer<typeof insertFlpStructureSchema>;
export type ExitMilestone = typeof exitMilestones.$inferSelect;
export type InsertExitMilestone = z.infer<typeof insertExitMilestoneSchema>;

export const dafAccounts = pgTable("daf_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  sponsorOrganization: text("sponsor_organization").notNull(),
  accountName: text("account_name").notNull(),
  currentBalance: decimal("current_balance", { precision: 15, scale: 2 }).default("0"),
  totalContributions: decimal("total_contributions", { precision: 15, scale: 2 }).default("0"),
  totalGrants: decimal("total_grants", { precision: 15, scale: 2 }).default("0"),
  taxDeductionsTaken: decimal("tax_deductions_taken", { precision: 15, scale: 2 }).default("0"),
  dateOpened: text("date_opened"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("daf_accounts_client_id_idx").on(table.clientId),
  advisorIdIdx: index("daf_accounts_advisor_id_idx").on(table.advisorId),
}));

export const dafTransactions = pgTable("daf_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dafAccountId: varchar("daf_account_id").notNull().references(() => dafAccounts.id),
  transactionType: text("transaction_type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  recipientOrg: text("recipient_org"),
  description: text("description"),
  transactionDate: text("transaction_date").notNull(),
  taxYear: integer("tax_year"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  dafAccountIdIdx: index("daf_transactions_daf_account_id_idx").on(table.dafAccountId),
}));

export const charitableRemainderTrusts = pgTable("charitable_remainder_trusts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  trustName: text("trust_name").notNull(),
  crtType: text("crt_type").notNull(),
  fundedValue: decimal("funded_value", { precision: 15, scale: 2 }),
  currentValue: decimal("current_value", { precision: 15, scale: 2 }),
  payoutRate: decimal("payout_rate", { precision: 5, scale: 4 }),
  termYears: integer("term_years"),
  charitableBeneficiary: text("charitable_beneficiary"),
  incomeBeneficiary: text("income_beneficiary"),
  projectedAnnualIncome: decimal("projected_annual_income", { precision: 15, scale: 2 }),
  charitableDeduction: decimal("charitable_deduction", { precision: 15, scale: 2 }),
  dateEstablished: text("date_established"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("crt_client_id_idx").on(table.clientId),
  advisorIdIdx: index("crt_advisor_id_idx").on(table.advisorId),
}));

export const qcdRecords = pgTable("qcd_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  iraAccountId: varchar("ira_account_id"),
  charityName: text("charity_name").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  distributionDate: text("distribution_date").notNull(),
  taxYear: integer("tax_year").notNull(),
  rmdSatisfied: decimal("rmd_satisfied", { precision: 15, scale: 2 }).default("0"),
  taxSavingsEstimate: decimal("tax_savings_estimate", { precision: 15, scale: 2 }).default("0"),
  status: text("status").notNull().default("completed"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("qcd_records_client_id_idx").on(table.clientId),
  advisorIdIdx: index("qcd_records_advisor_id_idx").on(table.advisorId),
}));

export const insertDafAccountSchema = createInsertSchema(dafAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDafTransactionSchema = createInsertSchema(dafTransactions).omit({ id: true, createdAt: true });
export const insertCharitableRemainderTrustSchema = createInsertSchema(charitableRemainderTrusts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertQcdRecordSchema = createInsertSchema(qcdRecords).omit({ id: true, createdAt: true });
export type DafAccount = typeof dafAccounts.$inferSelect;
export type InsertDafAccount = z.infer<typeof insertDafAccountSchema>;
export type DafTransaction = typeof dafTransactions.$inferSelect;
export type InsertDafTransaction = z.infer<typeof insertDafTransactionSchema>;
export type CharitableRemainderTrust = typeof charitableRemainderTrusts.$inferSelect;
export type InsertCharitableRemainderTrust = z.infer<typeof insertCharitableRemainderTrustSchema>;
export type QcdRecord = typeof qcdRecords.$inferSelect;
export type InsertQcdRecord = z.infer<typeof insertQcdRecordSchema>;

export const advisorAssessmentDefaults = pgTable("advisor_assessment_defaults", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  retirementAge: integer("retirement_age").notNull().default(67),
  withdrawalRate: decimal("withdrawal_rate", { precision: 5, scale: 2 }).notNull().default("4.00"),
  insuranceMultiplier: integer("insurance_multiplier").notNull().default(10),
  hnwThreshold: decimal("hnw_threshold", { precision: 15, scale: 2 }).notNull().default("1000000.00"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  advisorIdIdx: uniqueIndex("advisor_assessment_defaults_advisor_id_idx").on(table.advisorId),
}));

export const insertAdvisorAssessmentDefaultsSchema = createInsertSchema(advisorAssessmentDefaults).omit({ id: true, updatedAt: true });
export type AdvisorAssessmentDefaults = typeof advisorAssessmentDefaults.$inferSelect;
export type InsertAdvisorAssessmentDefaults = z.infer<typeof insertAdvisorAssessmentDefaultsSchema>;

export const apiKeyMetadata = pgTable("api_key_metadata", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  keyName: text("key_name").notNull(),
  integration: text("integration").notNull(),
  lastRotatedAt: timestamp("last_rotated_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  rotatedBy: text("rotated_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  keyNameUniq: uniqueIndex("api_key_metadata_key_name_uniq").on(table.keyName),
}));

export const insertApiKeyMetadataSchema = createInsertSchema(apiKeyMetadata).omit({ id: true, createdAt: true, updatedAt: true });
export type ApiKeyMetadata = typeof apiKeyMetadata.$inferSelect;
export type InsertApiKeyMetadata = z.infer<typeof insertApiKeyMetadataSchema>;

export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  advisorId: varchar("advisor_id").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  reason: text("reason"),
  description: text("description"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  status: text("status").notNull().default("success"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  advisorIdIdx: index("audit_log_advisor_id_idx").on(table.advisorId),
  entityTypeIdx: index("audit_log_entity_type_idx").on(table.entityType),
  entityIdIdx: index("audit_log_entity_id_idx").on(table.entityId),
  actionIdx: index("audit_log_action_idx").on(table.action),
  timestampIdx: index("audit_log_timestamp_idx").on(table.timestamp),
}));

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({ id: true, createdAt: true });
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type InsertAuditLogEntry = z.infer<typeof insertAuditLogSchema>;

export const failedLoginAttempts = pgTable("failed_login_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advisorId: varchar("advisor_id").notNull(),
  ipAddress: text("ip_address").notNull(),
  attemptTime: timestamp("attempt_time").notNull().defaultNow(),
  reason: text("reason"),
  count: integer("count").notNull().default(1),
  lastAttemptTime: timestamp("last_attempt_time").defaultNow(),
  blockedUntil: timestamp("blocked_until"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  advisorIdIdx: index("failed_login_advisor_id_idx").on(table.advisorId),
  ipAddressIdx: index("failed_login_ip_idx").on(table.ipAddress),
  blockedUntilIdx: index("failed_login_blocked_until_idx").on(table.blockedUntil),
}));

export const insertFailedLoginAttemptSchema = createInsertSchema(failedLoginAttempts).omit({ id: true, createdAt: true });
export type FailedLoginAttempt = typeof failedLoginAttempts.$inferSelect;
export type InsertFailedLoginAttempt = z.infer<typeof insertFailedLoginAttemptSchema>;

export const activityAnalytics = pgTable("activity_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advisorId: varchar("advisor_id").notNull(),
  clientId: varchar("client_id"),
  period: text("period").notNull(),
  periodDate: text("period_date").notNull(),
  activityType: text("activity_type"),
  count: integer("count").notNull().default(0),
  duration: integer("duration"),
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => ({
  advisorIdIdx: index("activity_analytics_advisor_id_idx").on(table.advisorId),
  clientIdIdx: index("activity_analytics_client_id_idx").on(table.clientId),
  periodDateIdx: index("activity_analytics_period_date_idx").on(table.periodDate),
}));

export const insertActivityAnalyticsSchema = createInsertSchema(activityAnalytics).omit({ id: true });
export type ActivityAnalytic = typeof activityAnalytics.$inferSelect;
export type InsertActivityAnalytic = z.infer<typeof insertActivityAnalyticsSchema>;

export const exportHistory = pgTable("export_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advisorId: varchar("advisor_id").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id"),
  format: text("format").notNull(),
  fileName: text("file_name").notNull(),
  recordCount: integer("record_count").notNull(),
  fileSize: integer("file_size"),
  exportTime: timestamp("export_time").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  downloadedCount: integer("downloaded_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  advisorIdIdx: index("export_history_advisor_id_idx").on(table.advisorId),
  exportTimeIdx: index("export_history_export_time_idx").on(table.exportTime),
}));

export const insertExportHistorySchema = createInsertSchema(exportHistory).omit({ id: true, createdAt: true });
export type ExportHistoryRecord = typeof exportHistory.$inferSelect;
export type InsertExportHistoryRecord = z.infer<typeof insertExportHistorySchema>;

export const workflowDefinitions = pgTable("workflow_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  category: text("category").notNull().default("general"),
  triggerEvent: text("trigger_event").notNull(),
  steps: jsonb("steps").notNull().default([]),
  gates: jsonb("gates").notNull().default([]),
  branches: jsonb("branches").notNull().default([]),
  defaultTimeoutHours: integer("default_timeout_hours").default(72),
  isActive: boolean("is_active").notNull().default(true),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex("workflow_definitions_slug_idx").on(table.slug),
  categoryIdx: index("workflow_definitions_category_idx").on(table.category),
}));

export const insertWorkflowDefinitionSchema = createInsertSchema(workflowDefinitions).omit({ id: true, createdAt: true, updatedAt: true });
export type WorkflowDefinition = typeof workflowDefinitions.$inferSelect;
export type InsertWorkflowDefinition = z.infer<typeof insertWorkflowDefinitionSchema>;

export const workflowInstances = pgTable("workflow_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  definitionId: varchar("definition_id").notNull().references(() => workflowDefinitions.id),
  advisorId: varchar("advisor_id").notNull().references(() => advisors.id),
  clientId: varchar("client_id").references(() => clients.id),
  meetingId: varchar("meeting_id"),
  status: text("status").notNull().default("pending"),
  currentStepIndex: integer("current_step_index").notNull().default(0),
  triggerPayload: jsonb("trigger_payload").notNull().default({}),
  context: jsonb("context").notNull().default({}),
  error: text("error"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  pausedAt: timestamp("paused_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  definitionIdIdx: index("workflow_instances_definition_id_idx").on(table.definitionId),
  advisorIdIdx: index("workflow_instances_advisor_id_idx").on(table.advisorId),
  clientIdIdx: index("workflow_instances_client_id_idx").on(table.clientId),
  statusIdx: index("workflow_instances_status_idx").on(table.status),
  meetingIdIdx: index("workflow_instances_meeting_id_idx").on(table.meetingId),
}));

export const insertWorkflowInstanceSchema = createInsertSchema(workflowInstances).omit({ id: true, createdAt: true, updatedAt: true });
export type WorkflowInstance = typeof workflowInstances.$inferSelect;
export type InsertWorkflowInstance = z.infer<typeof insertWorkflowInstanceSchema>;

export const workflowStepExecutions = pgTable("workflow_step_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instanceId: varchar("instance_id").notNull().references(() => workflowInstances.id, { onDelete: "cascade" }),
  stepIndex: integer("step_index").notNull(),
  stepName: text("step_name").notNull(),
  stepType: text("step_type").notNull().default("ai_prompt"),
  status: text("status").notNull().default("pending"),
  inputPayload: jsonb("input_payload").notNull().default({}),
  outputPayload: jsonb("output_payload"),
  error: text("error"),
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  durationMs: integer("duration_ms"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  instanceIdIdx: index("workflow_step_executions_instance_id_idx").on(table.instanceId),
  statusIdx: index("workflow_step_executions_status_idx").on(table.status),
  stepIndexIdx: index("workflow_step_executions_step_idx").on(table.instanceId, table.stepIndex),
}));

export const insertWorkflowStepExecutionSchema = createInsertSchema(workflowStepExecutions).omit({ id: true, createdAt: true, updatedAt: true });
export type WorkflowStepExecution = typeof workflowStepExecutions.$inferSelect;
export type InsertWorkflowStepExecution = z.infer<typeof insertWorkflowStepExecutionSchema>;

export const workflowGates = pgTable("workflow_gates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instanceId: varchar("instance_id").notNull().references(() => workflowInstances.id, { onDelete: "cascade" }),
  stepExecutionId: varchar("step_execution_id").references(() => workflowStepExecutions.id),
  gateName: text("gate_name").notNull(),
  gateType: text("gate_type").notNull().default("approval"),
  ownerId: varchar("owner_id").notNull(),
  ownerRole: text("owner_role").notNull().default("advisor"),
  status: text("status").notNull().default("pending"),
  decision: text("decision"),
  decisionNote: text("decision_note"),
  timeoutHours: integer("timeout_hours").notNull().default(72),
  escalationLevel: integer("escalation_level").notNull().default(0),
  escalatedAt: timestamp("escalated_at"),
  payload: jsonb("payload").notNull().default({}),
  decidedAt: timestamp("decided_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  instanceIdIdx: index("workflow_gates_instance_id_idx").on(table.instanceId),
  ownerIdIdx: index("workflow_gates_owner_id_idx").on(table.ownerId),
  statusIdx: index("workflow_gates_status_idx").on(table.status),
  expiresAtIdx: index("workflow_gates_expires_at_idx").on(table.expiresAt),
}));

export const insertWorkflowGateSchema = createInsertSchema(workflowGates).omit({ id: true, createdAt: true, updatedAt: true });
export type WorkflowGate = typeof workflowGates.$inferSelect;
export type InsertWorkflowGate = z.infer<typeof insertWorkflowGateSchema>;
