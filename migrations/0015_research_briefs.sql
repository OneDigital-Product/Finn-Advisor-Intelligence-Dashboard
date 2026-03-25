CREATE TABLE IF NOT EXISTS "research_briefs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "article_id" varchar NOT NULL REFERENCES "research_articles"("id"),
  "advisor_id" varchar NOT NULL REFERENCES "advisors"("id"),
  "classification" jsonb DEFAULT '{}'::jsonb,
  "executive_summary" text,
  "key_takeaways" jsonb DEFAULT '[]'::jsonb,
  "planning_domains" jsonb DEFAULT '[]'::jsonb,
  "client_impact" jsonb DEFAULT '{}'::jsonb,
  "action_triggers" jsonb DEFAULT '[]'::jsonb,
  "talking_points" jsonb DEFAULT '[]'::jsonb,
  "compliance_review" jsonb DEFAULT '{}'::jsonb,
  "tag_taxonomy" jsonb DEFAULT '{}'::jsonb,
  "client_alert_queue" jsonb DEFAULT '[]'::jsonb,
  "generated_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_rb_article_id" ON "research_briefs" ("article_id");
CREATE INDEX IF NOT EXISTS "idx_rb_advisor_id" ON "research_briefs" ("advisor_id");
CREATE INDEX IF NOT EXISTS "idx_rb_generated_at" ON "research_briefs" ("generated_at");
