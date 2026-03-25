ALTER TABLE "advisors" ADD COLUMN IF NOT EXISTS "max_capacity" integer NOT NULL DEFAULT 120;--> statement-breakpoint
ALTER TABLE "advisors" ADD COLUMN IF NOT EXISTS "fee_schedule" jsonb DEFAULT '[{"minAum":0,"maxAum":250000,"rate":0.0125},{"minAum":250000,"maxAum":500000,"rate":0.0100},{"minAum":500000,"maxAum":1000000,"rate":0.0085},{"minAum":1000000,"maxAum":2000000,"rate":0.0075},{"minAum":2000000,"maxAum":null,"rate":0.0050}]';--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "fee_rate_override" numeric(8, 6);
