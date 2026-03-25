CREATE TABLE "aml_screening_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"advisor_id" varchar NOT NULL,
	"screening_type" text NOT NULL,
	"watchlist_name" text NOT NULL,
	"match_status" text NOT NULL,
	"match_confidence" integer,
	"match_details" jsonb DEFAULT '{}'::jsonb,
	"resolved_by" text,
	"resolved_at" text,
	"resolution" text,
	"notes" text,
	"screened_by" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "behavioral_analyses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"advisor_id" varchar NOT NULL,
	"sentiment" varchar(20) NOT NULL,
	"sentiment_score" integer NOT NULL,
	"behavioral_risk_score" integer NOT NULL,
	"dominant_bias" text,
	"bias_indicators" jsonb DEFAULT '[]'::jsonb,
	"anxiety_level" varchar(10) DEFAULT 'low' NOT NULL,
	"source_type" varchar(30) NOT NULL,
	"source_id" varchar,
	"source_snippet" text,
	"coaching_notes" text,
	"de_escalation_strategy" text,
	"market_condition" varchar(20),
	"metrics" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_entities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"name" text NOT NULL,
	"entity_type" text NOT NULL,
	"industry" text,
	"ownership_percentage" numeric(5, 2),
	"estimated_value" numeric(15, 2),
	"annual_revenue" numeric(15, 2),
	"annual_ebitda" numeric(15, 2),
	"employee_count" integer,
	"founded_date" text,
	"key_people" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_valuations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_entity_id" varchar NOT NULL,
	"valuation_date" text NOT NULL,
	"methodology" text NOT NULL,
	"estimated_value" numeric(15, 2) NOT NULL,
	"assumptions" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "buy_sell_agreements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_entity_id" varchar NOT NULL,
	"agreement_type" text NOT NULL,
	"trigger_events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"funding_mechanism" text,
	"funding_amount" numeric(15, 2),
	"policy_number" text,
	"insurance_carrier" text,
	"effective_date" text,
	"review_date" text,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "charitable_accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"advisor_id" varchar NOT NULL,
	"account_type" text NOT NULL,
	"name" text NOT NULL,
	"provider" text,
	"account_number" text,
	"current_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_contributions" numeric(15, 2) DEFAULT '0',
	"total_grants" numeric(15, 2) DEFAULT '0',
	"inception_date" text,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "charitable_contributions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"date" text NOT NULL,
	"type" text DEFAULT 'cash' NOT NULL,
	"tax_deduction_amount" numeric(15, 2),
	"tax_year" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "charitable_goals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"name" text NOT NULL,
	"target_amount" numeric(15, 2) NOT NULL,
	"current_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"target_year" integer,
	"category" text DEFAULT 'general' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "charitable_grants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"recipient_name" text NOT NULL,
	"recipient_ein" text,
	"amount" numeric(15, 2) NOT NULL,
	"date" text NOT NULL,
	"purpose" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "charitable_remainder_trusts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"advisor_id" varchar NOT NULL,
	"trust_name" text NOT NULL,
	"crt_type" text NOT NULL,
	"funded_value" numeric(15, 2),
	"current_value" numeric(15, 2),
	"payout_rate" numeric(5, 4),
	"term_years" integer,
	"charitable_beneficiary" text,
	"income_beneficiary" text,
	"projected_annual_income" numeric(15, 2),
	"charitable_deduction" numeric(15, 2),
	"date_established" text,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custodial_instructions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"custodian" text NOT NULL,
	"action_type" text NOT NULL,
	"form_name" text NOT NULL,
	"description" text,
	"required_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required_signatures" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"supporting_documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"instructions" text,
	"processing_time" text,
	"notes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daf_accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"advisor_id" varchar NOT NULL,
	"sponsor_organization" text NOT NULL,
	"account_name" text NOT NULL,
	"current_balance" numeric(15, 2) DEFAULT '0',
	"total_contributions" numeric(15, 2) DEFAULT '0',
	"total_grants" numeric(15, 2) DEFAULT '0',
	"tax_deductions_taken" numeric(15, 2) DEFAULT '0',
	"date_opened" text,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daf_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daf_account_id" varchar NOT NULL,
	"transaction_type" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"recipient_org" text,
	"description" text,
	"transaction_date" text NOT NULL,
	"tax_year" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "edd_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"advisor_id" varchar NOT NULL,
	"trigger_reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"required_documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"collected_documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"findings" text,
	"risk_assessment" text,
	"recommendation" text,
	"assigned_to" text,
	"completed_at" text,
	"completed_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "engagement_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"advisor_id" varchar NOT NULL,
	"event_type" text NOT NULL,
	"channel" text NOT NULL,
	"subject" text,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "engagement_scores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"advisor_id" varchar NOT NULL,
	"composite_score" integer DEFAULT 0 NOT NULL,
	"frequency_score" integer DEFAULT 0 NOT NULL,
	"recency_score" integer DEFAULT 0 NOT NULL,
	"diversity_score" integer DEFAULT 0 NOT NULL,
	"trend" text DEFAULT 'stable' NOT NULL,
	"breakdown" jsonb DEFAULT '{}'::jsonb,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exit_milestones" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"advisor_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"target_date" text,
	"category" text DEFAULT 'general' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"completed_date" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exit_plan_milestones" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_entity_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"target_date" text,
	"status" text DEFAULT 'not_started' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "flp_structures" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"advisor_id" varchar NOT NULL,
	"name" text NOT NULL,
	"total_value" numeric(15, 2),
	"general_partner_pct" numeric(5, 2) DEFAULT '1',
	"limited_partner_pct" numeric(5, 2) DEFAULT '99',
	"lack_of_control_discount" numeric(5, 4) DEFAULT '0.25',
	"lack_of_marketability_discount" numeric(5, 4) DEFAULT '0.20',
	"combined_discount" numeric(5, 4),
	"discounted_value" numeric(15, 2),
	"ownership_details" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"date_established" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "intent_signals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"advisor_id" varchar NOT NULL,
	"signal_type" text NOT NULL,
	"strength" text DEFAULT 'medium' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "kyc_audit_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"advisor_id" varchar NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" varchar,
	"details" jsonb DEFAULT '{}'::jsonb,
	"performed_by" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "kyc_review_schedules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"advisor_id" varchar NOT NULL,
	"risk_tier" text NOT NULL,
	"last_review_date" text,
	"next_review_date" text NOT NULL,
	"review_frequency_months" integer NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"completed_at" text,
	"completed_by" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "kyc_risk_ratings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"advisor_id" varchar NOT NULL,
	"risk_score" integer NOT NULL,
	"risk_tier" text NOT NULL,
	"residency_risk" integer DEFAULT 0 NOT NULL,
	"occupation_risk" integer DEFAULT 0 NOT NULL,
	"source_of_wealth_risk" integer DEFAULT 0 NOT NULL,
	"pep_status" boolean DEFAULT false NOT NULL,
	"pep_risk" integer DEFAULT 0 NOT NULL,
	"factors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"override_reason" text,
	"rated_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "next_best_actions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"advisor_id" varchar NOT NULL,
	"action_type" text NOT NULL,
	"priority" integer DEFAULT 50 NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"reasoning" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"category" text DEFAULT 'outreach' NOT NULL,
	"estimated_impact" text,
	"due_date" text,
	"completed_at" timestamp,
	"dismissed_at" timestamp,
	"salesforce_activity_id" varchar,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nigo_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar,
	"account_id" varchar,
	"custodian" text NOT NULL,
	"nigo_type" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"resolution_guidance" text,
	"rmd_amount" numeric(15, 2),
	"rmd_year" integer,
	"submitted_at" timestamp,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nigo_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advisor_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"account_id" varchar,
	"custodian" text NOT NULL,
	"submission_type" text NOT NULL,
	"reason_code" text NOT NULL,
	"reason_description" text,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"submitted_date" text NOT NULL,
	"rejected_date" text,
	"resolved_date" text,
	"resolution_notes" text,
	"resolution_guidance" text,
	"form_reference" text,
	"aging" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pending_profile_updates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"advisor_id" varchar NOT NULL,
	"source_type" varchar(30) NOT NULL,
	"source_id" varchar,
	"life_event" text NOT NULL,
	"field_updates" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reasoning" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"review_note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pre_case_validations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"advisor_id" varchar NOT NULL,
	"validation_type" text NOT NULL,
	"overall_result" text DEFAULT 'pending' NOT NULL,
	"modules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "qcd_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"advisor_id" varchar NOT NULL,
	"ira_account_id" varchar,
	"charity_name" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"distribution_date" text NOT NULL,
	"tax_year" integer NOT NULL,
	"rmd_satisfied" numeric(15, 2) DEFAULT '0',
	"tax_savings_estimate" numeric(15, 2) DEFAULT '0',
	"status" text DEFAULT 'completed' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "research_articles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"source_url" text,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"summary" text,
	"key_takeaways" jsonb DEFAULT '[]'::jsonb,
	"topics" text[] DEFAULT '{}',
	"relevance_tags" text[] DEFAULT '{}',
	"published_at" timestamp,
	"ingested_at" timestamp DEFAULT now(),
	"ai_processed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "social_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"social_profile_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"event_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"detected_at" timestamp DEFAULT now(),
	"source_url" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"outreach_prompt" text,
	"outreach_generated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "social_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"platform" text DEFAULT 'linkedin' NOT NULL,
	"profile_url" text NOT NULL,
	"display_name" text,
	"headline" text,
	"monitoring_enabled" boolean DEFAULT true NOT NULL,
	"last_checked_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sop_chunks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" varchar NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sop_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"content" text NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"uploaded_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "validation_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" varchar DEFAULT gen_random_uuid() NOT NULL,
	"approval_item_id" varchar,
	"entity_type" text NOT NULL,
	"entity_id" varchar,
	"module" text NOT NULL,
	"rule_key" text NOT NULL,
	"status" text NOT NULL,
	"message" text NOT NULL,
	"remediation" text,
	"details" jsonb DEFAULT '{}'::jsonb,
	"run_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "validation_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module" text NOT NULL,
	"rule_key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"severity" text DEFAULT 'error' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "withdrawal_audit_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"withdrawal_id" varchar NOT NULL,
	"action" text NOT NULL,
	"performed_by" varchar NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "withdrawal_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advisor_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"account_id" varchar NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"method" text NOT NULL,
	"reason" text NOT NULL,
	"frequency" text DEFAULT 'one_time' NOT NULL,
	"tax_withholding" numeric(5, 2),
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"orion_set_aside_id" varchar,
	"orion_nwr_tag_id" varchar,
	"salesforce_case_id" varchar,
	"salesforce_case_number" varchar,
	"eclipse_file_generated" boolean DEFAULT false,
	"eclipse_file_name" text,
	"trade_confirmed_at" timestamp,
	"nwr_removed_at" timestamp,
	"submitted_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "aml_screening_results" ADD CONSTRAINT "aml_screening_results_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aml_screening_results" ADD CONSTRAINT "aml_screening_results_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavioral_analyses" ADD CONSTRAINT "behavioral_analyses_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavioral_analyses" ADD CONSTRAINT "behavioral_analyses_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_entities" ADD CONSTRAINT "business_entities_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_valuations" ADD CONSTRAINT "business_valuations_business_entity_id_business_entities_id_fk" FOREIGN KEY ("business_entity_id") REFERENCES "public"."business_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buy_sell_agreements" ADD CONSTRAINT "buy_sell_agreements_business_entity_id_business_entities_id_fk" FOREIGN KEY ("business_entity_id") REFERENCES "public"."business_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charitable_accounts" ADD CONSTRAINT "charitable_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charitable_accounts" ADD CONSTRAINT "charitable_accounts_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charitable_contributions" ADD CONSTRAINT "charitable_contributions_account_id_charitable_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."charitable_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charitable_goals" ADD CONSTRAINT "charitable_goals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charitable_grants" ADD CONSTRAINT "charitable_grants_account_id_charitable_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."charitable_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charitable_remainder_trusts" ADD CONSTRAINT "charitable_remainder_trusts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charitable_remainder_trusts" ADD CONSTRAINT "charitable_remainder_trusts_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daf_accounts" ADD CONSTRAINT "daf_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daf_accounts" ADD CONSTRAINT "daf_accounts_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daf_transactions" ADD CONSTRAINT "daf_transactions_daf_account_id_daf_accounts_id_fk" FOREIGN KEY ("daf_account_id") REFERENCES "public"."daf_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edd_records" ADD CONSTRAINT "edd_records_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edd_records" ADD CONSTRAINT "edd_records_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_events" ADD CONSTRAINT "engagement_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_events" ADD CONSTRAINT "engagement_events_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_scores" ADD CONSTRAINT "engagement_scores_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_scores" ADD CONSTRAINT "engagement_scores_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_milestones" ADD CONSTRAINT "exit_milestones_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_milestones" ADD CONSTRAINT "exit_milestones_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_plan_milestones" ADD CONSTRAINT "exit_plan_milestones_business_entity_id_business_entities_id_fk" FOREIGN KEY ("business_entity_id") REFERENCES "public"."business_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flp_structures" ADD CONSTRAINT "flp_structures_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flp_structures" ADD CONSTRAINT "flp_structures_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intent_signals" ADD CONSTRAINT "intent_signals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intent_signals" ADD CONSTRAINT "intent_signals_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_audit_log" ADD CONSTRAINT "kyc_audit_log_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_audit_log" ADD CONSTRAINT "kyc_audit_log_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_review_schedules" ADD CONSTRAINT "kyc_review_schedules_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_review_schedules" ADD CONSTRAINT "kyc_review_schedules_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_risk_ratings" ADD CONSTRAINT "kyc_risk_ratings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_risk_ratings" ADD CONSTRAINT "kyc_risk_ratings_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "next_best_actions" ADD CONSTRAINT "next_best_actions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "next_best_actions" ADD CONSTRAINT "next_best_actions_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nigo_items" ADD CONSTRAINT "nigo_items_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nigo_items" ADD CONSTRAINT "nigo_items_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nigo_records" ADD CONSTRAINT "nigo_records_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nigo_records" ADD CONSTRAINT "nigo_records_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nigo_records" ADD CONSTRAINT "nigo_records_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_profile_updates" ADD CONSTRAINT "pending_profile_updates_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_profile_updates" ADD CONSTRAINT "pending_profile_updates_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_case_validations" ADD CONSTRAINT "pre_case_validations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_case_validations" ADD CONSTRAINT "pre_case_validations_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcd_records" ADD CONSTRAINT "qcd_records_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcd_records" ADD CONSTRAINT "qcd_records_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_events" ADD CONSTRAINT "social_events_social_profile_id_social_profiles_id_fk" FOREIGN KEY ("social_profile_id") REFERENCES "public"."social_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_events" ADD CONSTRAINT "social_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_profiles" ADD CONSTRAINT "social_profiles_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sop_chunks" ADD CONSTRAINT "sop_chunks_document_id_sop_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."sop_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_results" ADD CONSTRAINT "validation_results_approval_item_id_approval_items_id_fk" FOREIGN KEY ("approval_item_id") REFERENCES "public"."approval_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_audit_log" ADD CONSTRAINT "withdrawal_audit_log_withdrawal_id_withdrawal_requests_id_fk" FOREIGN KEY ("withdrawal_id") REFERENCES "public"."withdrawal_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aml_screening_client_id_idx" ON "aml_screening_results" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "aml_screening_match_status_idx" ON "aml_screening_results" USING btree ("match_status");--> statement-breakpoint
CREATE INDEX "idx_ba_client_id" ON "behavioral_analyses" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_ba_advisor_id" ON "behavioral_analyses" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "idx_ba_created_at" ON "behavioral_analyses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "business_entities_client_id_idx" ON "business_entities" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "charitable_accounts_client_id_idx" ON "charitable_accounts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "crt_client_id_idx" ON "charitable_remainder_trusts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_cust_instr_custodian" ON "custodial_instructions" USING btree ("custodian");--> statement-breakpoint
CREATE INDEX "idx_cust_instr_action_type" ON "custodial_instructions" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "daf_accounts_client_id_idx" ON "daf_accounts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "edd_records_client_id_idx" ON "edd_records" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "edd_records_status_idx" ON "edd_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "engagement_events_client_id_idx" ON "engagement_events" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "engagement_events_advisor_id_idx" ON "engagement_events" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "engagement_events_event_type_idx" ON "engagement_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "engagement_scores_client_id_idx" ON "engagement_scores" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "engagement_scores_advisor_id_idx" ON "engagement_scores" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "exit_milestones_client_id_idx" ON "exit_milestones" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "flp_structures_client_id_idx" ON "flp_structures" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "intent_signals_client_id_idx" ON "intent_signals" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "intent_signals_advisor_id_idx" ON "intent_signals" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "intent_signals_active_idx" ON "intent_signals" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "kyc_audit_log_client_id_idx" ON "kyc_audit_log" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "kyc_audit_log_action_idx" ON "kyc_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "kyc_review_schedules_client_id_idx" ON "kyc_review_schedules" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "kyc_review_schedules_next_review_idx" ON "kyc_review_schedules" USING btree ("next_review_date");--> statement-breakpoint
CREATE INDEX "kyc_risk_ratings_client_id_idx" ON "kyc_risk_ratings" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "kyc_risk_ratings_advisor_id_idx" ON "kyc_risk_ratings" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "nba_client_id_idx" ON "next_best_actions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "nba_advisor_id_idx" ON "next_best_actions" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "nba_status_idx" ON "next_best_actions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "nba_priority_idx" ON "next_best_actions" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "nigo_items_custodian_idx" ON "nigo_items" USING btree ("custodian");--> statement-breakpoint
CREATE INDEX "nigo_items_status_idx" ON "nigo_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "nigo_records_advisor_id_idx" ON "nigo_records" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "nigo_records_client_id_idx" ON "nigo_records" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "nigo_records_status_idx" ON "nigo_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "nigo_records_custodian_idx" ON "nigo_records" USING btree ("custodian");--> statement-breakpoint
CREATE INDEX "idx_ppu_client_id" ON "pending_profile_updates" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_ppu_advisor_id" ON "pending_profile_updates" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "idx_ppu_status" ON "pending_profile_updates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pre_case_validations_client_id_idx" ON "pre_case_validations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "qcd_records_client_id_idx" ON "qcd_records" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_ra_source" ON "research_articles" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_ra_published" ON "research_articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_ra_ai_processed" ON "research_articles" USING btree ("ai_processed");--> statement-breakpoint
CREATE INDEX "social_events_client_id_idx" ON "social_events" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "social_events_profile_id_idx" ON "social_events" USING btree ("social_profile_id");--> statement-breakpoint
CREATE INDEX "social_profiles_client_id_idx" ON "social_profiles" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_sop_chunks_doc_id" ON "sop_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_sop_docs_category" ON "sop_documents" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_sop_docs_status" ON "sop_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "validation_results_approval_item_idx" ON "validation_results" USING btree ("approval_item_id");--> statement-breakpoint
CREATE INDEX "validation_results_entity_idx" ON "validation_results" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "validation_results_run_idx" ON "validation_results" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "validation_rules_module_idx" ON "validation_rules" USING btree ("module");--> statement-breakpoint
CREATE INDEX "withdrawal_audit_log_withdrawal_id_idx" ON "withdrawal_audit_log" USING btree ("withdrawal_id");--> statement-breakpoint
CREATE INDEX "withdrawal_requests_advisor_id_idx" ON "withdrawal_requests" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "withdrawal_requests_client_id_idx" ON "withdrawal_requests" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "withdrawal_requests_status_idx" ON "withdrawal_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "holdings_orion_holding_id_idx" ON "holdings" USING btree ("orion_holding_id");--> statement-breakpoint
CREATE UNIQUE INDEX "performance_account_period_idx" ON "performance" USING btree ("account_id","period");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_orion_transaction_id_idx" ON "transactions" USING btree ("orion_transaction_id");