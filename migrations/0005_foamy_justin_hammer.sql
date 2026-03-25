CREATE TABLE "direct_index_portfolios" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"account_id" varchar,
	"name" text NOT NULL,
	"target_index" text NOT NULL,
	"total_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"tracking_difference" numeric(8, 4),
	"tax_alpha" numeric(15, 2) DEFAULT '0',
	"total_harvested_losses" numeric(15, 2) DEFAULT '0',
	"status" text DEFAULT 'active' NOT NULL,
	"allocations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "discovery_questionnaires" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advisor_id" varchar NOT NULL,
	"name" text NOT NULL,
	"client_type" text DEFAULT 'individual' NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "discovery_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advisor_id" varchar NOT NULL,
	"client_id" varchar,
	"questionnaire_id" varchar,
	"meeting_id" varchar,
	"client_type" text DEFAULT 'individual' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"prospect_name" text,
	"prospect_email" text,
	"questionnaire_responses" jsonb DEFAULT '{}'::jsonb,
	"wizard_responses" jsonb DEFAULT '{}'::jsonb,
	"current_section" integer DEFAULT 0,
	"talking_points" text,
	"summary" text,
	"engagement_pathway" text,
	"recommended_next_steps" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fiduciary_rule_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advisor_id" varchar,
	"global_enabled" boolean DEFAULT true NOT NULL,
	"block_threshold" integer DEFAULT 1 NOT NULL,
	"rule_overrides" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fiduciary_validation_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advisor_id" varchar,
	"client_id" varchar,
	"content_type" text NOT NULL,
	"outcome" text NOT NULL,
	"rule_set_version" text NOT NULL,
	"match_count" integer DEFAULT 0 NOT NULL,
	"warning_count" integer DEFAULT 0 NOT NULL,
	"block_count" integer DEFAULT 0 NOT NULL,
	"matches" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"content_preview" text,
	"resolved_by" varchar,
	"resolved_at" timestamp,
	"resolution_note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tax_lots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"holding_id" varchar NOT NULL,
	"account_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"ticker" text NOT NULL,
	"shares" numeric(15, 4) NOT NULL,
	"cost_basis_per_share" numeric(15, 4) NOT NULL,
	"total_cost_basis" numeric(15, 2) NOT NULL,
	"current_price" numeric(15, 4),
	"market_value" numeric(15, 2),
	"unrealized_gain_loss" numeric(15, 2),
	"acquisition_date" text NOT NULL,
	"holding_period" text DEFAULT 'short-term' NOT NULL,
	"wash_sale_disallowed" boolean DEFAULT false,
	"wash_sale_window_start" text,
	"wash_sale_window_end" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wash_sale_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"ticker" text NOT NULL,
	"sell_date" text NOT NULL,
	"sell_account_id" varchar NOT NULL,
	"buy_date" text,
	"buy_account_id" varchar,
	"disallowed_loss" numeric(15, 2) NOT NULL,
	"window_start" text NOT NULL,
	"window_end" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "direct_index_portfolios" ADD CONSTRAINT "direct_index_portfolios_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_index_portfolios" ADD CONSTRAINT "direct_index_portfolios_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_questionnaires" ADD CONSTRAINT "discovery_questionnaires_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_sessions" ADD CONSTRAINT "discovery_sessions_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_sessions" ADD CONSTRAINT "discovery_sessions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_sessions" ADD CONSTRAINT "discovery_sessions_questionnaire_id_discovery_questionnaires_id_fk" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."discovery_questionnaires"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_sessions" ADD CONSTRAINT "discovery_sessions_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_lots" ADD CONSTRAINT "tax_lots_holding_id_holdings_id_fk" FOREIGN KEY ("holding_id") REFERENCES "public"."holdings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_lots" ADD CONSTRAINT "tax_lots_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_lots" ADD CONSTRAINT "tax_lots_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wash_sale_events" ADD CONSTRAINT "wash_sale_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wash_sale_events" ADD CONSTRAINT "wash_sale_events_sell_account_id_accounts_id_fk" FOREIGN KEY ("sell_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wash_sale_events" ADD CONSTRAINT "wash_sale_events_buy_account_id_accounts_id_fk" FOREIGN KEY ("buy_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "direct_index_portfolios_client_id_idx" ON "direct_index_portfolios" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_dq_advisor_id" ON "discovery_questionnaires" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "idx_dq_client_type" ON "discovery_questionnaires" USING btree ("client_type");--> statement-breakpoint
CREATE INDEX "idx_ds_advisor_id" ON "discovery_sessions" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "idx_ds_client_id" ON "discovery_sessions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_ds_status" ON "discovery_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_fvl_advisor_id" ON "fiduciary_validation_logs" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "idx_fvl_client_id" ON "fiduciary_validation_logs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_fvl_outcome" ON "fiduciary_validation_logs" USING btree ("outcome");--> statement-breakpoint
CREATE INDEX "idx_fvl_created_at" ON "fiduciary_validation_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tax_lots_account_id_idx" ON "tax_lots" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "tax_lots_client_id_idx" ON "tax_lots" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "tax_lots_ticker_idx" ON "tax_lots" USING btree ("ticker");--> statement-breakpoint
CREATE INDEX "wash_sale_events_client_id_idx" ON "wash_sale_events" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "wash_sale_events_ticker_idx" ON "wash_sale_events" USING btree ("ticker");