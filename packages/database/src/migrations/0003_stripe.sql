-- Stripe customer ID column on users table
-- Required for Stripe Checkout + subscription lifecycle (FREQ-03)

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "stripe_customer_id" text UNIQUE;

-- Index for fast webhook lookup by Stripe customer ID
CREATE INDEX IF NOT EXISTS "users_stripe_customer_id_idx"
  ON "users" ("stripe_customer_id")
  WHERE "stripe_customer_id" IS NOT NULL;
