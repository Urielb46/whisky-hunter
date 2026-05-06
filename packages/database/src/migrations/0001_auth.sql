-- Better Auth v1.3+ tables
-- Matches schema in packages/database/src/schema/auth.ts

CREATE TABLE IF NOT EXISTS "users" (
  "id"             text PRIMARY KEY,
  "name"           text NOT NULL,
  "email"          text NOT NULL UNIQUE,
  "email_verified" boolean NOT NULL DEFAULT false,
  "image"          text,
  "tier"           text NOT NULL DEFAULT 'free',
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "id"          text PRIMARY KEY,
  "user_id"     text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token"       text NOT NULL UNIQUE,
  "expires_at"  timestamp with time zone NOT NULL,
  "ip_address"  text,
  "user_agent"  text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "accounts" (
  "id"                      text PRIMARY KEY,
  "user_id"                 text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "account_id"              text NOT NULL,
  "provider_id"             text NOT NULL,
  "access_token"            text,
  "refresh_token"           text,
  "access_token_expires_at" timestamp with time zone,
  "scope"                   text,
  "password"                text,
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"              timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "verifications" (
  "id"         text PRIMARY KEY,
  "identifier" text NOT NULL,
  "value"      text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "wishlists" (
  "id"         text PRIMARY KEY,
  "user_id"    text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "product_id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "wishlists_user_product_idx" ON "wishlists" ("user_id", "product_id");

CREATE TABLE IF NOT EXISTS "price_alerts" (
  "id"                text PRIMARY KEY,
  "user_id"           text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "product_id"        text NOT NULL,
  "target_price_gbp"  integer NOT NULL,
  "currency"          text NOT NULL DEFAULT 'GBP',
  "active"            boolean NOT NULL DEFAULT true,
  "last_triggered_at" timestamp with time zone,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "price_alerts_user_id_idx" ON "price_alerts" ("user_id");
CREATE INDEX "price_alerts_product_active_idx" ON "price_alerts" ("product_id", "active");
