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
ALTER TABLE "discovery_questionnaires" ADD CONSTRAINT "discovery_questionnaires_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_sessions" ADD CONSTRAINT "discovery_sessions_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_sessions" ADD CONSTRAINT "discovery_sessions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_sessions" ADD CONSTRAINT "discovery_sessions_questionnaire_id_discovery_questionnaires_id_fk" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."discovery_questionnaires"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_sessions" ADD CONSTRAINT "discovery_sessions_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_dq_advisor_id" ON "discovery_questionnaires" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "idx_dq_client_type" ON "discovery_questionnaires" USING btree ("client_type");--> statement-breakpoint
CREATE INDEX "idx_ds_advisor_id" ON "discovery_sessions" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "idx_ds_client_id" ON "discovery_sessions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_ds_status" ON "discovery_sessions" USING btree ("status");