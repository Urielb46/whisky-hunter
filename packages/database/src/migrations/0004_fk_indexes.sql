-- FK validation + performance indexes for wishlists and price_alerts
-- wishlists.product_id and price_alerts.product_id are text columns referencing
-- products.id (uuid). A true FK is not possible without a type change (breaking).
-- Use CHECK constraints to enforce UUID format integrity instead.

ALTER TABLE "wishlists"
  ADD CONSTRAINT IF NOT EXISTS "wishlists_product_id_valid_uuid"
  CHECK (product_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

ALTER TABLE "price_alerts"
  ADD CONSTRAINT IF NOT EXISTS "price_alerts_product_id_valid_uuid"
  CHECK (product_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Performance indexes (missing from 0001_auth.sql)
CREATE INDEX IF NOT EXISTS "wishlists_user_id_idx"
  ON "wishlists" ("user_id");

CREATE INDEX IF NOT EXISTS "price_alerts_user_id_idx"
  ON "price_alerts" ("user_id");

CREATE INDEX IF NOT EXISTS "price_alerts_active_partial_idx"
  ON "price_alerts" ("user_id", "product_id")
  WHERE "active" = true;
