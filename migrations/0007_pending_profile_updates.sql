CREATE TABLE IF NOT EXISTS "pending_profile_updates" (
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
DO $$ BEGIN
 ALTER TABLE "pending_profile_updates" ADD CONSTRAINT "pending_profile_updates_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pending_profile_updates" ADD CONSTRAINT "pending_profile_updates_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ppu_client_id" ON "pending_profile_updates" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ppu_advisor_id" ON "pending_profile_updates" USING btree ("advisor_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ppu_status" ON "pending_profile_updates" USING btree ("status");
