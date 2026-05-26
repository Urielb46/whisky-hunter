-- Whiskybase catalog fields — שדרוג 25526 (2026-05-25)
-- Adds whiskybase_id, whiskybase_url, wb_score, wb_vote_count to products.
-- whiskybase_id is UNIQUE (one canonical product maps to at most one Whiskybase bottle).
-- wb_score stored as NUMERIC(5,2) to support scores like 87.50.
-- Idempotent: all statements use IF NOT EXISTS / IF NOT EXISTS equivalents.

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "whiskybase_id"  TEXT,
  ADD COLUMN IF NOT EXISTS "whiskybase_url" TEXT,
  ADD COLUMN IF NOT EXISTS "wb_score"       NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS "wb_vote_count"  INTEGER NOT NULL DEFAULT 0;

-- Unique constraint: one Whiskybase bottle → one canonical product row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_whiskybase_id_uniq'
  ) THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_whiskybase_id_uniq" UNIQUE ("whiskybase_id");
  END IF;
END $$;

-- Lookup index used by the catalog seed upsert path
CREATE INDEX IF NOT EXISTS "products_whiskybase_id_idx"
  ON "products" ("whiskybase_id");
