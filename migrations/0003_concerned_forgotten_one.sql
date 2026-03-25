CREATE TABLE "estate_exemptions" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "client_id" varchar NOT NULL,
        "advisor_id" varchar NOT NULL,
        "tax_year" integer NOT NULL,
        "federal_exemption_limit" numeric(15, 2) NOT NULL,
        "lifetime_gifts_used" numeric(15, 2) DEFAULT '0',
        "gst_exemption_used" numeric(15, 2) DEFAULT '0',
        "remaining_exemption" numeric(15, 2) DEFAULT '0',
        "remaining_gst_exemption" numeric(15, 2) DEFAULT '0',
        "notes" text,
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gift_history" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "client_id" varchar NOT NULL,
        "recipient_name" text NOT NULL,
        "recipient_relationship" text,
        "gift_date" text NOT NULL,
        "gift_value" numeric(15, 2) NOT NULL,
        "gift_type" text DEFAULT 'cash' NOT NULL,
        "annual_exclusion_applied" numeric(15, 2) DEFAULT '0',
        "taxable_amount" numeric(15, 2) DEFAULT '0',
        "gst_applicable" boolean DEFAULT false,
        "gst_allocated" numeric(15, 2) DEFAULT '0',
        "trust_id" varchar,
        "notes" text,
        "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trust_relationships" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "trust_id" varchar NOT NULL,
        "person_name" text NOT NULL,
        "person_client_id" varchar,
        "role" text NOT NULL,
        "generation" integer DEFAULT 0,
        "notes" text
);
--> statement-breakpoint
CREATE TABLE "trusts" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "client_id" varchar NOT NULL,
        "advisor_id" varchar NOT NULL,
        "trust_type" text NOT NULL,
        "name" text NOT NULL,
        "status" text DEFAULT 'active' NOT NULL,
        "funded_value" numeric(15, 2) DEFAULT '0',
        "date_established" text,
        "jurisdiction" text,
        "term_years" integer,
        "section_7520_rate" numeric(5, 4),
        "annuity_rate" numeric(5, 4),
        "remainder_beneficiary" text,
        "distribution_schedule" jsonb DEFAULT '[]'::jsonb,
        "tax_implications" jsonb DEFAULT '{}'::jsonb,
        "notes" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "advisors" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "estate_exemptions" ADD CONSTRAINT "estate_exemptions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estate_exemptions" ADD CONSTRAINT "estate_exemptions_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_history" ADD CONSTRAINT "gift_history_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_history" ADD CONSTRAINT "gift_history_trust_id_trusts_id_fk" FOREIGN KEY ("trust_id") REFERENCES "public"."trusts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_relationships" ADD CONSTRAINT "trust_relationships_trust_id_trusts_id_fk" FOREIGN KEY ("trust_id") REFERENCES "public"."trusts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_relationships" ADD CONSTRAINT "trust_relationships_person_client_id_clients_id_fk" FOREIGN KEY ("person_client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trusts" ADD CONSTRAINT "trusts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trusts" ADD CONSTRAINT "trusts_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "estate_exemptions_client_year_idx" ON "estate_exemptions" USING btree ("client_id","tax_year");--> statement-breakpoint
CREATE INDEX "trusts_client_id_idx" ON "trusts" USING btree ("client_id");