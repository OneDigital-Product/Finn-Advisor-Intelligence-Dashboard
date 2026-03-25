-- Add shares and price columns to transactions table
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "shares" numeric(15, 4);
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "price" numeric(15, 4);

-- Add updatedAt column to performance table
ALTER TABLE "performance" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
