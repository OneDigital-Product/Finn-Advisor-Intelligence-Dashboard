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
ALTER TABLE "advisors" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "withdrawal_audit_log" ADD CONSTRAINT "withdrawal_audit_log_withdrawal_id_withdrawal_requests_id_fk" FOREIGN KEY ("withdrawal_id") REFERENCES "public"."withdrawal_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "withdrawal_audit_log_withdrawal_id_idx" ON "withdrawal_audit_log" USING btree ("withdrawal_id");--> statement-breakpoint
CREATE INDEX "withdrawal_requests_advisor_id_idx" ON "withdrawal_requests" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "withdrawal_requests_client_id_idx" ON "withdrawal_requests" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "withdrawal_requests_status_idx" ON "withdrawal_requests" USING btree ("status");