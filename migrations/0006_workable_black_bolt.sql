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
ALTER TABLE "validation_results" ADD CONSTRAINT "validation_results_approval_item_id_approval_items_id_fk" FOREIGN KEY ("approval_item_id") REFERENCES "public"."approval_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "validation_results_approval_item_idx" ON "validation_results" USING btree ("approval_item_id");--> statement-breakpoint
CREATE INDEX "validation_results_entity_idx" ON "validation_results" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "validation_results_run_idx" ON "validation_results" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "validation_rules_module_idx" ON "validation_rules" USING btree ("module");
