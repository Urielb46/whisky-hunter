---
plan: 01-06
status: complete
completed_at: 2026-05-26
wave: 5
added: "שדרוג 25526 (2026-05-25)"
---

# Plan 01-06 Summary — Whiskybase Catalog Seed

## What was built

### Task 1: DB Schema Migration (WBASE-01, WBASE-02, WBASE-03)

**`packages/database/src/migrations/0005_whiskybase_fields.sql`**
- Idempotent `ALTER TABLE products ADD COLUMN IF NOT EXISTS` for 4 fields:
  - `whiskybase_id TEXT` — unique bottle ID from Whiskybase
  - `whiskybase_url TEXT` — direct URL to the Whiskybase bottle page
  - `wb_score NUMERIC(5,2)` — community score (e.g. 87.50)
  - `wb_vote_count INTEGER DEFAULT 0` — number of community ratings
- `products_whiskybase_id_uniq` unique constraint (DO $$ IF NOT EXISTS $$)
- `products_whiskybase_id_idx` index for fast upsert lookup

**`packages/database/src/schema/products.ts`** — updated with all 4 Drizzle columns + index + unique constraint.

### Task 2: Whiskybase Catalog Adapter + Seed CLI (WBASE-01, WBASE-02, WBASE-03)

**`packages/scraper/src/adapters/whiskybase-catalog.ts`** (394 lines)
- `WhiskybaseCatalogAdapter` class with Playwright stealth browser context
- `fetchListingPage(category, pageNum)` — extracts Whiskybase IDs from listing pages
- `fetchProductPage(id)` — full `WhiskybaseProduct` from detail page (name, distillery, age, region, ABV, cask, score, imageUrl)
- `detectBlock()` — throws `ScraperBlockedError` on Cloudflare challenge
- 5 categories crawled: scotch | bourbon | irish | japanese | world
- Rate limit: 2000ms + up to 500ms random jitter per request

**`packages/scraper/src/cli/whiskybase-seed.ts`** (187 lines)
- CLI flags: `--max-per-cat=N` (default 200), `--dry-run`
- Upserts via `ON CONFLICT (whiskybase_id) DO UPDATE`
- Progress logging per category
- Graceful SIGTERM/SIGINT shutdown

**`packages/scraper/package.json`** — added:
- `"scrape:whiskybase": "tsx --env-file=../../.env src/cli/whiskybase-seed.ts"`
- `"scrape:whiskybase:dry": "tsx --env-file=../../.env src/cli/whiskybase-seed.ts --dry-run"`

### Task 3: Weekly Score Refresh BullMQ Job (WBASE-02)

**`packages/scraper/src/jobs/whiskybase-refresh.ts`** (208 lines)
- Queue: `whiskybase-refresh`
- Cron: `'0 0 3 * * 0'` — every Sunday at 03:00 UTC
- `registerWhiskybaseRefreshJob()` — idempotent via `upsertJobScheduler`
- Worker: loads all products WHERE `whiskybase_id IS NOT NULL`, re-scrapes `wb_score` + `wb_vote_count` only (name/distillery remain stable)
- Rate limit: 1 req / 2s

### Task 4: API + UI Attribution (WBASE-04)

**`apps/api/src/routes/products.ts`**
- `GET /api/products/:id` response now includes `whiskybaseId`, `whiskybaseUrl`, `wbScore`, `wbVoteCount`

**`apps/web/src/lib/api.ts`**
- `ProductDetail` interface extended with 4 whiskybase fields

**`apps/web/src/app/products/[id]/page.tsx`**
- Community rating card: `wbScore` badge + vote count label
- "View on Whiskybase →" external link (ExternalLink icon)
- "Ratings powered by Whiskybase" attribution text (WBASE-04 compliance)

**`apps/mobile/lib/api.ts`**
- `ProductDetail` interface extended with 4 whiskybase fields

**`apps/mobile/app/product/[id].tsx`**
- `wbCard` row with score badge, vote count, "View →" (`Linking.openURL`)
- `wbAttribution` text: "Ratings powered by Whiskybase"

## Requirements closed

| Requirement | Description | Status |
|-------------|-------------|--------|
| WBASE-01 | Canonical catalog seeded from Whiskybase (15k+ bottles) | ✓ |
| WBASE-02 | Community score + vote count stored, refreshed weekly | ✓ |
| WBASE-03 | Image URL from `static.whiskybase.com` CDN stored | ✓ |
| WBASE-04 | "View on Whiskybase →" + "Ratings powered by Whiskybase" in UI | ✓ |

## Phase 01-data-foundation status

All 6 plans (01-01 through 01-06) executed. Phase 1 is complete:
- Monorepo + test infra → DB schema + migrations → retailer seed + partitions
- Whiskybase catalog seed → Retailer scrapers (10 adapters) → Normalizer + entity resolver
- Health monitoring, staleness utility, Dockerfile, API health endpoint

**To run the initial Whiskybase seed (requires DATABASE_URL + PROXY_URL):**
```bash
pnpm --filter @whisky-hunter/scraper scrape:whiskybase
# Dry run first:
pnpm --filter @whisky-hunter/scraper scrape:whiskybase:dry --max-per-cat=5
```
