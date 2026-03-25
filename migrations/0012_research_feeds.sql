ALTER TABLE "research_articles" ADD COLUMN IF NOT EXISTS "content_hash" text;--> statement-breakpoint
ALTER TABLE "research_articles" ADD COLUMN IF NOT EXISTS "feed_id" varchar;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ra_content_hash" ON "research_articles" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ra_feed_id" ON "research_articles" USING btree ("feed_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "research_feeds" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"category" text,
	"fetch_interval_minutes" integer DEFAULT 360,
	"status" text DEFAULT 'active',
	"last_fetch_at" timestamp,
	"last_error" text,
	"error_count" integer DEFAULT 0,
	"article_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rf_status" ON "research_feeds" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rf_url" ON "research_feeds" USING btree ("url");
