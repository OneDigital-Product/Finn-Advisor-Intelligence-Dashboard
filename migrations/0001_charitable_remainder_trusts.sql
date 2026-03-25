-- Applied via direct SQL on 2026-03-16
-- charitable_remainder_trusts table creation (matches shared/schema.ts)
CREATE TABLE IF NOT EXISTS "charitable_remainder_trusts" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" varchar NOT NULL REFERENCES "clients"("id"),
  "advisor_id" varchar NOT NULL REFERENCES "advisors"("id"),
  "trust_name" text NOT NULL,
  "crt_type" text NOT NULL,
  "funded_value" numeric(15,2),
  "current_value" numeric(15,2),
  "payout_rate" numeric(5,4),
  "term_years" integer,
  "charitable_beneficiary" text,
  "income_beneficiary" text,
  "projected_annual_income" numeric(15,2),
  "charitable_deduction" numeric(15,2),
  "date_established" text,
  "status" text NOT NULL DEFAULT 'active',
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "crt_client_id_idx" ON "charitable_remainder_trusts" ("client_id");
CREATE INDEX IF NOT EXISTS "crt_advisor_id_idx" ON "charitable_remainder_trusts" ("advisor_id");
