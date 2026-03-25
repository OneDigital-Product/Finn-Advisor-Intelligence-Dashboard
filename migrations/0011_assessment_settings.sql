CREATE TABLE IF NOT EXISTS "advisor_assessment_defaults" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advisor_id" varchar NOT NULL,
	"retirement_age" integer DEFAULT 67 NOT NULL,
	"withdrawal_rate" numeric(5, 2) DEFAULT '4.00' NOT NULL,
	"insurance_multiplier" integer DEFAULT 10 NOT NULL,
	"hnw_threshold" numeric(15, 2) DEFAULT '1000000.00' NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "advisor_assessment_defaults" ADD CONSTRAINT "advisor_assessment_defaults_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "advisor_assessment_defaults_advisor_id_idx" ON "advisor_assessment_defaults" USING btree ("advisor_id");
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "assessment_overrides" jsonb;
