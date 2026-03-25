CREATE TABLE IF NOT EXISTS "api_key_metadata" (
"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
"key_name" text NOT NULL,
"integration" text NOT NULL,
"last_rotated_at" timestamp DEFAULT now() NOT NULL,
"expires_at" timestamp,
"rotated_by" text,
"notes" text,
"created_at" timestamp DEFAULT now(),
"updated_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "api_key_metadata_key_name_uniq" ON "api_key_metadata" USING btree ("key_name");