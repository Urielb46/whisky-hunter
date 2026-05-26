---
plan: 01-05
status: complete
completed_at: 2026-05-26
wave: 4
---

# Plan 01-05 Summary — Normalizer, Entity Resolver, Staleness, Health API, Dockerfile

## What was built

### Task 1: Normalizer + Entity Resolver (DATA-02)

**`packages/scraper/src/normalizer/normalizer.ts`** (197 lines)
- `expandNumeralWords()` — converts 'Fifteen' → '15', 'Twenty-Five' → '25', 'XV' → '15' before entity resolution sees the name (Pitfall 3 prevention)
- `extractAge()` — finds age in years using expanded name; returns null for NAS
- `extractVolume()` — handles 700ml / 70cl / 1L / 1.75L; defaults to 700
- `extractAbv()` — validates range [20, 96]; returns null if absent
- `normalize()` — full pipeline producing `NormalizedForResolver` for `computeMatchScore()`

**`packages/scraper/src/normalizer/__tests__/normalizer.test.ts`** (135 lines, 26 it() blocks)

**`packages/scraper/src/resolver/entity-resolver.ts`** (131 lines)
- `AUTO_MERGE_THRESHOLD = 0.90` — LOCKED (grep-verifiable)
- `REVIEW_QUEUE_THRESHOLD = 0.70` — LOCKED
- `computeMatchScore(a, b)` — score formula: 0.50×name + 0.30×distillery + 0.10×age + 0.10×volume
- Hard reject guard: `a.ageYears !== null && b.ageYears !== null && a.ageYears !== b.ageYears → return 0`
- `routeMatchDecision(score)` — routes to auto_merge / review_queue / no_action
- `normalizeName()` — strips stop words before Levenshtein comparison

**`packages/scraper/src/resolver/__tests__/entity-resolver.test.ts`** (190 lines, 20 it() blocks)
- Covers: same-product merge, hard-reject (Glenfarclas 15 vs 25), NAS null symmetry, distillery mismatch, score range, threshold constants

### Task 2: Staleness, Health API, Partition Job, Dockerfile (DATA-04, DATA-05)

**`packages/database/src/staleness.ts`** (31 lines)
- `STALE_THRESHOLD_HOURS = 48`
- `isStale(lastSuccessfulScrapeAt: Date | null): boolean` — uses `last_successful_scrape_at` not `last_scraped_at` (Pitfall 5)

**`packages/database/src/__tests__/staleness-query.test.ts`** (54 lines, 7 it() blocks)
- Covers: >48h stale, <48h fresh, null→true, exact boundary (inclusive), 1ms under boundary, blocked scraper scenario

**`packages/database/src/index.ts`** — added `isStale`, `STALE_THRESHOLD_HOURS` to public exports

**`apps/api/src/routes/health.ts`** (78 lines)
- `GET /health` — existing liveness probe (unchanged)
- `GET /health/scrapers` — new DATA-04 endpoint; queries `scraperHealth` table via parameterized Drizzle select; maps each row with `stale: isStale(r.lastSuccessfulScrapeAt ?? null)`

**`packages/scraper/src/queue/monthly-partition-job.ts`** (77 lines)
- Cron `'0 0 25 * *'` — midnight UTC on the 25th of each month
- `registerMonthlyPartitionJob()` — idempotent via `upsertJobScheduler`
- `createPartitionWorker()` — calls `ensureCurrentAndNextMonthPartitions()`
- Prevents Pitfall 4: silent insert failures on the 1st of each month

**`packages/scraper/Dockerfile`** (35 lines)
- Base: `mcr.microsoft.com/playwright:v1.59.1-jammy` (Chromium + all system deps pre-installed)
- Layer-cached: manifest copy → `pnpm install --prod` → source copy
- CMD: `tsx src/worker-entry.ts` (persistent process for Railway)

**`.env.example`** — added `PORT=3000`, `WORKER_CONCURRENCY=2`

## Requirements closed

| Requirement | Status |
|-------------|--------|
| DATA-02 entity resolver with locked thresholds | ✓ |
| DATA-04 GET /health/scrapers endpoint | ✓ |
| DATA-05 isStale() using last_successful_scrape_at | ✓ |
| Pitfall 3: numeral word expansion before resolution | ✓ |
| Pitfall 4: monthly partition pre-creation on 25th | ✓ |
| Pitfall 5: stale flag uses correct column | ✓ |
| Railway Dockerfile with Playwright base image | ✓ |

## Phase 01-data-foundation status

All 5 plans (01-01 through 01-05) executed. Phase 1 is complete end-to-end:
raw HTML scraping → normalization → entity resolution → PostgreSQL → Typesense index → health monitoring → Railway deployment.
