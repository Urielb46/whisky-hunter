# Architecture Patterns: WhiskyHunter

**Domain:** Price aggregation, product normalization, search, cost calculation, notifications
**Researched:** 2026-05-03
**Confidence:** HIGH (established patterns; web tools unavailable so based on training data from production aggregation systems)

---

## System Overview

WhiskyHunter is a data pipeline + query system. Data flows in one direction — from sources into a canonical catalog — and queries flow in the opposite direction through a fast read path. These two concerns are architecturally separate from day one.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INGESTION PLANE                                   │
│                                                                             │
│  ┌──────────┐    ┌──────────┐    ┌───────────┐    ┌──────────────────────┐ │
│  │ Scheduler│───▶│ Job Queue│───▶│  Workers  │───▶│  Raw Store (staging) │ │
│  │ (cron /  │    │ (BullMQ) │    │ (Scraper/ │    │  (Postgres JSONB or  │ │
│  │  BullMQ) │    │          │    │  API fetch)│   │   S3 raw dump)       │ │
│  └──────────┘    └──────────┘    └─────┬─────┘    └──────────────────────┘ │
│                                        │                                    │
│                                        ▼                                    │
│                              ┌─────────────────┐                            │
│                              │  Parser /        │                            │
│                              │  Normalizer      │                            │
│                              │  (per-source     │                            │
│                              │   adapter)       │                            │
│                              └────────┬─────────┘                            │
│                                       │                                     │
│                                       ▼                                     │
│                              ┌─────────────────┐                            │
│                              │  Entity Resolver │                            │
│                              │  (dedup / merge) │                            │
│                              └────────┬─────────┘                            │
│                                       │                                     │
└───────────────────────────────────────┼─────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CANONICAL STORE                                   │
│                                                                             │
│  ┌──────────────────────┐   ┌──────────────────────┐                       │
│  │  products            │   │  price_snapshots      │                       │
│  │  (canonical catalog) │   │  (append-only, time-  │                       │
│  │  Postgres            │   │   partitioned)        │                       │
│  └──────────┬───────────┘   └──────────┬────────────┘                       │
│             │                          │                                    │
│             └──────────┬───────────────┘                                    │
│                        │                                                    │
│               ┌────────▼────────┐   ┌──────────────────────┐               │
│               │  Search Index   │   │  Duty / Tax / FX     │               │
│               │  (Typesense)    │   │  Rate Tables         │               │
│               └────────┬────────┘   └──────────┬───────────┘               │
└────────────────────────┼──────────────────────-─┼────────────────────────────┘
                         │                        │
                         ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           QUERY PLANE (API)                                 │
│                                                                             │
│  ┌──────────────────┐   ┌───────────────────┐   ┌──────────────────────┐  │
│  │  Search API      │   │  Cost Calculator  │   │  User / Alerts API   │  │
│  │  (Fastify/Hono)  │   │  Engine           │   │  (Fastify/Hono)      │  │
│  └────────┬─────────┘   └─────────┬─────────┘   └──────────┬───────────┘  │
│           │                       │                         │              │
│           └───────────────────────┴──────────────┬──────────┘              │
│                                                  │                         │
│                              ┌───────────────────▼──────────────┐          │
│                              │       Response Cache              │          │
│                              │       (Redis / Upstash)           │          │
│                              └──────────────────────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                         ┌──────────────┼──────────────┐
                         ▼              ▼              ▼
                      Web App       Mobile App    Price Alert
                    (Next.js)    (React Native)   Dispatcher
                                                  (BullMQ +
                                                  Email/Push)
```

---

## 1. Scraping Pipeline Architecture

### Pattern: Scheduler → Job Queue → Worker Pool → Parser → Staging

**Scheduler** (HIGH confidence)

Use a persistent job queue scheduler, not bare cron. Two options:
- **BullMQ** (Node.js, Redis-backed) — recommended for v1; handles retries, priority, rate-limiting, delayed jobs, and dead-letter queues in one package.
- **Celery + Redis** (Python) — if the scraping workers are Python (Playwright/Scrapy). Heavier but mature.

BullMQ is preferred because the rest of the stack is Node.js, and you avoid a Python/Node split at the scheduler level.

Each source gets a recurring job scheduled at its own cadence:
```
SourceJob { sourceId, url, scraperType, priority, cronExpression }
```

Cadence tiers (to avoid hammering sources):
- Tier 1 — Popular sources (Master of Malt, TheWhiskyExchange): every 6 hours
- Tier 2 — Medium sources: every 12 hours
- Tier 3 — Small/slow sources: daily

**Worker Pool**

Workers are stateless containers that pull jobs from the queue. For 100-200 sources at daily cadence, 8-16 workers is sufficient. Workers communicate failure back to the queue (BullMQ retries with exponential backoff).

Worker types:
- `http-worker` — plain HTTP fetch + cheerio parse (fast, no JS)
- `playwright-worker` — headless browser for JS-rendered pages (expensive; isolate these)
- `api-worker` — structured API fetchers (zero parsing overhead)

Keep Playwright workers in a separate queue with a smaller concurrency cap (e.g., 4 concurrent) to avoid memory exhaustion. Plain HTTP workers can run at 32+ concurrency.

**Anti-bot handling:**
- Rotate User-Agent strings per request
- Use residential proxy pool (Bright Data / Oxylabs) for anti-scrape retailers
- Implement per-source rate limits in the job queue (BullMQ `limiter`)
- Respect `robots.txt` via a `robots-parser` check before each job
- Store `Retry-After` headers and honour them

**Parser / Source Adapters**

Each source gets its own adapter module:
```
/scrapers
  /sources
    master-of-malt.ts   ← implements ScraperAdapter interface
    whisky-exchange.ts
    total-wine.ts
    ...
  /adapters
    ScraperAdapter.ts   ← interface: fetch(), parse() → RawProduct[]
```

This is the **Adapter pattern**. All adapters emit a `RawProduct` struct with source-specific fields still intact. Normalization happens downstream, not inside adapters. Adapters should be simple and disposable — sources change their HTML frequently.

**Raw Staging Store**

Before writing to the canonical database, write raw results to a staging area:
- Option A: Postgres table `raw_scrape_events` with JSONB payload — simple, queryable, easy to replay
- Option B: S3/object storage raw dump — cheaper at scale, harder to query

Use Option A for v1. Keep raw events for 30 days for debugging failed parses and replaying after adapter fixes.

---

## 2. Product Deduplication / Entity Resolution

This is the hardest engineering problem in the system. (HIGH confidence — this is the same challenge faced by every price comparison engine, grocery aggregator, and travel meta-search.)

### The Problem

"Glenfarclas 15 Year Old 70cl" (Master of Malt), "Glenfarclas 15yo" (Total Wine), "GLENFARCLAS 15 YR" (Specs) and "Glenfarclas 15 Jahre" (German retailer) must resolve to one canonical product.

### Recommended Approach: Hierarchical Blocking + Fuzzy Matching

**Step 1 — Blocking (reduce comparison space)**

Never compare all pairs — O(n²) is catastrophic at 100K listings. Block on shared attributes first:
- **Distillery name** (extracted from listing text, normalized via lookup table)
- **Age statement** (integer extracted with regex: "15 year", "15yo", "15 Jahre", "15 ans")
- **Volume** (normalized to ml: "70cl" → 700, "750ml" → 750)

Listings that share the same distillery + age + volume are candidates for the same canonical product.

**Step 2 — Similarity Scoring within blocks**

For each candidate pair within a block, compute a composite score:
```
score = 0.5 × levenshtein_similarity(normalized_name_a, normalized_name_b)
      + 0.3 × exact_match(distillery)
      + 0.1 × exact_match(age)
      + 0.1 × exact_match(volume_ml)
```

Threshold: score >= 0.85 → same product; 0.70-0.85 → manual review queue; < 0.70 → different product.

**Step 3 — Canonical Record**

When a match is confirmed, write to `products` table (canonical catalog). Store a `source_mappings` table:
```sql
source_mappings(
  source_id,
  source_product_id,   -- the retailer's internal ID or URL
  canonical_product_id,
  confidence,
  matched_at
)
```

**Name normalization utilities needed:**
- Distillery name lookup table (e.g., "Glen Farclas" → "Glenfarclas")
- Age extraction regex (handles "15 Year", "15yo", "15YO", "15 Jahre", "15 ans", "No Age Statement")
- Volume normalization ("70cl", "700ml", "0.7L" → 700)
- Series/expression extraction ("Distillers Edition", "Cask Strength", "Single Cask")
- Whisky category classification (Scotch single malt / blend / grain, Irish, Japanese, American bourbon/rye, etc.)

**Tools:** For v1, implement this in TypeScript/Node.js with `fastest-levenshtein` and a custom blocking layer. For v2, consider integrating a dedicated entity resolution service (Dedupe.io or a custom splink-style Python service for high-confidence ML-based matching).

Do not use embedding-based semantic similarity for v1 — it is slower and requires GPU inference. Deterministic blocking + Levenshtein is sufficient and explainable.

---

## 3. Price History Storage

### Schema Pattern: Append-Only Snapshots with Partitioning (HIGH confidence)

Never update price rows in place. Always insert new snapshot rows. This gives you a free audit log, enables price trend charts, and supports alert diffing.

**Canonical schema:**

```sql
-- Canonical product catalog
CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,           -- canonical display name
  distillery    TEXT NOT NULL,
  age_years     SMALLINT,                -- NULL = NAS
  volume_ml     SMALLINT NOT NULL,
  category      TEXT NOT NULL,           -- 'scotch_single_malt', 'bourbon', etc.
  region        TEXT,
  cask_type     TEXT,
  abv           NUMERIC(4,1),
  image_url     TEXT,
  description   TEXT,
  review_score  NUMERIC(4,1),            -- aggregated from external sources
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- One row per source mapping
CREATE TABLE source_mappings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_product_id UUID NOT NULL REFERENCES products(id),
  source_id            TEXT NOT NULL,   -- 'master-of-malt', 'total-wine', etc.
  source_url           TEXT NOT NULL,
  source_product_id    TEXT,
  confidence           NUMERIC(3,2),
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- Append-only price snapshots (partitioned by month)
CREATE TABLE price_snapshots (
  id                   BIGSERIAL,
  canonical_product_id UUID NOT NULL,
  source_mapping_id    UUID NOT NULL,
  currency             CHAR(3) NOT NULL,
  price_local          NUMERIC(10,2) NOT NULL,  -- shelf price in source currency
  price_usd            NUMERIC(10,2),            -- converted at scrape time (FX snapshot)
  in_stock             BOOLEAN NOT NULL DEFAULT true,
  scraped_at           TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (scraped_at);

-- Create monthly partitions (automate this)
CREATE TABLE price_snapshots_2026_05
  PARTITION OF price_snapshots
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- Index for "latest price per source" queries
CREATE INDEX idx_ps_product_source_time
  ON price_snapshots (canonical_product_id, source_mapping_id, scraped_at DESC);
```

**Query pattern for "current best price":**

```sql
-- Latest snapshot per source for a product
SELECT DISTINCT ON (source_mapping_id)
  sm.source_id, ps.price_local, ps.currency, ps.in_stock, ps.scraped_at
FROM price_snapshots ps
JOIN source_mappings sm ON sm.id = ps.source_mapping_id
WHERE ps.canonical_product_id = $1
  AND ps.scraped_at > now() - interval '48 hours'
ORDER BY source_mapping_id, scraped_at DESC;
```

**Decision point — TimescaleDB vs plain Postgres partitioning:**

Use plain Postgres partitioning for v1. TimescaleDB adds operational complexity (extension management, chunk compression tuning) that is not justified until you are storing millions of snapshots per day. At 200 sources × 5,000 products × daily scrape = 1M rows/day — plain Postgres handles this fine. Migrate to TimescaleDB in v2 if query performance degrades.

**Retention policy:** Keep 90 days of snapshots for price trend charts on the free tier; 2 years for premium users. Drop old partitions via a scheduled job — this is orders of magnitude faster than `DELETE`.

---

## 4. Search Architecture

### Recommendation: Typesense (HIGH confidence)

**Decision: Typesense over Elasticsearch, Meilisearch, or Postgres full-text.**

| Criterion | Typesense | Meilisearch | Elasticsearch | Postgres FTS |
|-----------|-----------|-------------|---------------|--------------|
| Setup complexity | Low | Low | High | None |
| Fuzzy search quality | Excellent | Good | Excellent | Poor |
| Faceted filtering | Excellent | Good | Excellent | Manual |
| Query latency | <10ms | <10ms | 20-100ms | 50-500ms |
| Operational overhead | Very low | Very low | High | None |
| Typo tolerance | Built-in | Built-in | Requires config | None |
| Geo search | Yes | Yes | Yes | PostGIS |
| Hosting | Self-host or Typesense Cloud | Self-host | Self-host or Elastic Cloud | Included |
| Cost (v1 scale) | Free self-hosted | Free self-hosted | Expensive | Free |

Typesense wins because: typo tolerance is native and works out of the box for "Glenfarlas" → "Glenfarclas"; faceted filtering over distillery/region/age/price is built-in; operational overhead is negligible (single binary, no JVM); and it has an official Node.js client.

**Index schema:**

```json
{
  "name": "whiskies",
  "fields": [
    { "name": "id",          "type": "string" },
    { "name": "name",        "type": "string" },
    { "name": "distillery",  "type": "string", "facet": true },
    { "name": "category",    "type": "string", "facet": true },
    { "name": "region",      "type": "string", "facet": true },
    { "name": "age_years",   "type": "int32",  "facet": true, "optional": true },
    { "name": "abv",         "type": "float",  "facet": true },
    { "name": "min_price_usd", "type": "float", "sort": true },
    { "name": "in_stock_count", "type": "int32" },
    { "name": "review_score", "type": "float", "sort": true },
    { "name": "volume_ml",   "type": "int32",  "facet": true },
    { "name": "search_text", "type": "string" }
  ],
  "default_sorting_field": "min_price_usd"
}
```

`search_text` is a concatenated string: `"Glenfarclas 15 Year Old Single Malt Scotch Whisky Speyside"` — gives the tokenizer maximum signal without complex field weighting.

**Sync strategy:** After each scrape cycle completes and new prices are written, run a Typesense upsert job for affected products. This is a background job, not in the hot path. Typesense indexing is fast enough that a full re-index of 50K products takes under 60 seconds.

**Do not use Postgres full-text for primary search** — it cannot do fuzzy/typo-tolerant matching without pg_trgm, and even with trgm the UX is significantly worse for product names. Use Postgres full-text only as a fallback if Typesense is down.

---

## 5. Cost Calculation Engine

### Architecture: Static Rate Tables + FX API + Per-Request Computation

The cost calculator runs on every search result, in real time, per user destination country. It must be fast (< 50ms per product) and accurate.

**Components:**

```
CostCalculationRequest {
  canonical_product_id,
  source_mapping_id,
  destination_country,   -- ISO 3166-1 alpha-2
  destination_state,     -- for US state-level taxes
  quantity
}

CostCalculationResult {
  shelf_price_local,
  shelf_price_usd,
  shipping_estimate_usd,
  import_duty_usd,
  destination_vat_usd,
  insurance_usd,
  fx_rate,
  total_usd,
  total_local,
  breakdown: [...],
  caveats: [...]         -- "shipping restrictions in this state", etc.
}
```

**Duty and tax rate tables:**

Store in Postgres. Structure:
```sql
CREATE TABLE duty_rates (
  origin_country      CHAR(2) NOT NULL,
  destination_country CHAR(2) NOT NULL,
  hs_code             TEXT DEFAULT '220830',  -- spirits HS code
  rate_percent        NUMERIC(5,2),
  per_litre_fee       NUMERIC(8,4),
  effective_from      DATE NOT NULL,
  effective_until     DATE,
  notes               TEXT
);

CREATE TABLE vat_rates (
  country             CHAR(2) NOT NULL,
  rate_percent        NUMERIC(5,2) NOT NULL,
  effective_from      DATE NOT NULL,
  effective_until     DATE
);

CREATE TABLE shipping_estimates (
  origin_country      CHAR(2) NOT NULL,
  destination_country CHAR(2) NOT NULL,
  weight_grams        INT NOT NULL,   -- bottle weight bucket
  carrier             TEXT,
  estimated_usd       NUMERIC(8,2),
  updated_at          TIMESTAMPTZ
);
```

**FX rates:** Call a real-time FX API (Fixer.io or Open Exchange Rates) once per hour and cache in Redis. Never call FX API per request — this is a hard performance and cost constraint. The cached rate is displayed alongside a timestamp so users know the FX age.

**Shipping estimates:** v1 uses static table lookups with weight-based tiers (a standard 70cl bottle = ~1.3kg; a case = ~16kg). v2 can integrate carrier APIs (DHL, FedEx) for live quotes. Use a static fallback when carrier API is unavailable.

**Calculation is stateless and pure.** Given the same inputs and rate tables, it always produces the same output. This makes it trivial to unit-test and cache. Cache the output keyed by `(product_id, source_id, destination_country, fx_rate_snapshot)` in Redis with a 1-hour TTL.

**Caveats and shipping restrictions:** Maintain a `shipping_restrictions` table:
```sql
CREATE TABLE shipping_restrictions (
  origin_country      CHAR(2),
  destination_country CHAR(2),
  destination_state   CHAR(5),
  restriction_type    TEXT,  -- 'prohibited', 'restricted', 'carrier_required'
  notes               TEXT
);
```
The calculator attaches restriction warnings to results. This is a legal requirement for US state laws and key markets.

**Update cadence for rate tables:** Duty rates change infrequently (quarterly at most). VAT rates change rarely. FX changes hourly. Assign ownership: a scheduled job fetches FX hourly; duty/tax tables are manually reviewed quarterly with a `NOTIFY` system to alert the engineering team when `effective_until` is approaching.

---

## 6. Notification System

### Pattern: Fan-out on Write via Job Queue (HIGH confidence)

**Do not use fan-out on read** (checking subscriptions at query time). At scale, this becomes a sequential scan of the entire subscriptions table for every price update.

**Recommended architecture:**

```
Price Update Event
       │
       ▼
┌──────────────────┐
│  Alert Checker   │  ← runs after each scrape batch completes
│  (background job)│
└────────┬─────────┘
         │
         │ SELECT subscriptions WHERE product_id = ? AND target_price >= new_price
         ▼
┌──────────────────────────────────────┐
│  Notification Job Queue (BullMQ)     │
│  One job per user-alert match        │
└────┬──────────────────┬──────────────┘
     │                  │
     ▼                  ▼
┌─────────┐       ┌──────────────┐
│  Email  │       │  Push (FCM / │
│ (Resend │       │  APNs)       │
│ /SES)   │       └──────────────┘
└─────────┘
```

**Subscription table:**
```sql
CREATE TABLE price_alerts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL,
  canonical_product_id UUID NOT NULL,
  target_price_usd     NUMERIC(10,2),         -- NULL = any drop
  threshold_pct        SMALLINT,              -- e.g., 10 = alert on 10% drop
  destination_country  CHAR(2) NOT NULL,
  channels             TEXT[] NOT NULL,       -- ['email', 'push']
  last_notified_at     TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_alert UNIQUE (user_id, canonical_product_id, destination_country)
);

CREATE INDEX idx_alerts_product ON price_alerts (canonical_product_id);
```

**Alert checker job:** After each scrape batch, emit one `check-alerts` job per updated product. The checker queries `price_alerts` for that product, calculates the all-in cost for the user's destination, and enqueues a notification job if threshold is crossed.

**Rate limiting notifications:** Store `last_notified_at` on the subscription. Don't re-notify the same user for the same product within 24 hours unless the price drops further.

**Email provider:** Use Resend (modern, developer-friendly) for transactional email. Fallback to AWS SES for high volume.

**Push notifications:** Use Firebase Cloud Messaging (FCM) for Android and APNs (via FCM relay or direct) for iOS. Store `push_tokens` per user device.

At v1 scale (thousands of users), a simple BullMQ queue handles this without a dedicated fan-out service. At 1M+ users with millions of subscriptions, move alert matching to a dedicated service with indexed lookup and batch processing.

---

## 7. API Layer: Monolith vs Microservices

### Recommendation: Modular Monolith for v1 (HIGH confidence)

**Do not start with microservices.** The overhead of service discovery, inter-service authentication, distributed tracing, and independent deployment pipelines is unjustified at v1. Every major aggregation platform (Kayak, Skyscanner, Vivino) started as a monolith.

**Recommended v1 structure:** One deployable API process with clear internal module boundaries.

```
/apps/api/
  /modules/
    /search/          ← search queries (hits Typesense)
    /catalog/         ← product detail, price history
    /calculator/      ← cost calculation engine
    /alerts/          ← subscription management
    /users/           ← auth, profiles, subscriptions (freemium)
    /admin/           ← source management, scraper health dashboard
  /workers/           ← background jobs (run in same process or separate worker process)
    /scraper-scheduler/
    /alert-checker/
    /search-indexer/
```

Use **Fastify** (Node.js) or **Hono** for the API. Both are significantly faster than Express, with first-class TypeScript support. Fastify is more mature; Hono is more modern and edge-deployable.

**Service boundaries for v2 extraction** (when you actually need to split):

| Service | Extract When |
|---------|-------------|
| Scraping workers | Scrapers need independent scaling from the API |
| Cost calculator | Calculator needs to be called from mobile directly or becomes a pricing microservice |
| Notification dispatcher | Alert volume justifies a dedicated worker fleet |
| User/auth | Multiple products share the same user identity |

**Authentication:** Use JWT (short-lived access tokens, refresh tokens). Do not build your own auth — use Clerk or Auth.js for social login + email. Freemium gating is enforced as middleware on protected routes.

---

## 8. Caching Strategy

### What to Cache, Where, and How Long (HIGH confidence)

```
┌─────────────────────────────────────────────────────────┐
│                CACHE LAYER DECISIONS                    │
├──────────────────┬──────────────┬──────────────┬────────┤
│ Data             │ Store        │ TTL          │ Notes  │
├──────────────────┼──────────────┼──────────────┼────────┤
│ FX rates         │ Redis        │ 1 hour       │ Update │
│                  │              │              │ on hit │
│                  │              │              │ miss   │
├──────────────────┼──────────────┼──────────────┼────────┤
│ Duty/VAT rates   │ Redis        │ 24 hours     │ Change │
│                  │              │              │ rarely │
├──────────────────┼──────────────┼──────────────┼────────┤
│ Shipping est.    │ Redis        │ 24 hours     │ Static │
├──────────────────┼──────────────┼──────────────┼────────┤
│ Cost calculation │ Redis        │ 1 hour       │ Key:   │
│ result           │              │              │ (prod, │
│                  │              │              │ source,│
│                  │              │              │ dest)  │
├──────────────────┼──────────────┼──────────────┼────────┤
│ Search results   │ Redis        │ 5 minutes    │ Cache  │
│ (popular queries)│              │              │ top    │
│                  │              │              │ 1000   │
│                  │              │              │ queries│
├──────────────────┼──────────────┼──────────────┼────────┤
│ Product detail   │ Redis        │ 15 minutes   │ Bust   │
│ page             │              │              │ on     │
│                  │              │              │ new    │
│                  │              │              │ scrape │
├──────────────────┼──────────────┼──────────────┼────────┤
│ "Current best    │ Postgres     │ Materialised │ Refresh│
│ price" per       │ mat. view    │ view: refresh│ after  │
│ product          │              │ every 30 min │ scrape │
├──────────────────┼──────────────┼──────────────┼────────┤
│ Price history    │ Postgres     │ No cache;    │ Served │
│ chart data       │ query cache  │ partition    │ from   │
│                  │              │ pruning      │ DB     │
│                  │              │ sufficient   │        │
├──────────────────┼──────────────┼──────────────┼────────┤
│ Typesense index  │ Typesense    │ Permanent    │ Upsert │
│                  │ memory       │ (in-memory   │ on     │
│                  │              │ index)       │ change │
└──────────────────┴──────────────┴──────────────┴────────┘
```

**Key cache insight for this domain:** Price data is the core product. Cache hit rates must be balanced against data freshness. Show "last updated" timestamps prominently so users understand the data age. Do not serve cached prices older than 48 hours without a staleness warning.

**Materialized view for "best price per product":**

```sql
CREATE MATERIALIZED VIEW current_best_prices AS
SELECT
  p.id AS product_id,
  MIN(ps.price_usd) AS min_price_usd,
  MAX(ps.scraped_at) AS latest_scraped_at,
  COUNT(DISTINCT ps.source_mapping_id) FILTER (WHERE ps.in_stock) AS source_count
FROM products p
JOIN source_mappings sm ON sm.canonical_product_id = p.id
JOIN price_snapshots ps ON ps.source_mapping_id = sm.id
WHERE ps.scraped_at > now() - interval '48 hours'
GROUP BY p.id;

CREATE UNIQUE INDEX ON current_best_prices (product_id);
```

Refresh this view every 30 minutes as a scheduled job. It is the backbone of search result ranking.

---

## Data Flow: End-to-End

```
1. INGESTION (async, background)
   Scheduler triggers → Worker pulls job → Scraper fetches source →
   Parser emits RawProduct[] → Normalizer emits NormalizedProduct →
   Entity Resolver matches/creates canonical product →
   price_snapshots row inserted → cache busted → Typesense upserted →
   Alert Checker job enqueued

2. SEARCH (synchronous, <3s SLA)
   User query → API → Typesense (fuzzy match, facets, <10ms) →
   Enrich results with current_best_prices (materialized view, <5ms) →
   Return results (no cost calc in search; cost calc is on demand)

3. PRODUCT DETAIL (synchronous, <1s SLA)
   User opens product → API → Postgres (product + source_mappings + latest snapshots) →
   Cost Calculator (per source, per user's country) →
   Redis cache check (1hr TTL) →
   Return full breakdown

4. ALERT DELIVERY (async, minutes after scrape)
   Alert Checker → finds matching subscriptions → enqueues notification jobs →
   Email/Push worker delivers → last_notified_at updated
```

---

## Build Order: What Must Exist Before What

This is the critical sequencing for roadmap phases:

```
Phase 1: Data Foundation
  ├── Postgres schema (products, source_mappings, price_snapshots)
  ├── 3-5 source adapters (hand-picked high-value sources)
  ├── BullMQ scraping pipeline (scheduler + workers)
  └── Basic entity resolution (blocking + levenshtein)
         │
         │ GATE: Can we scrape and deduplicate 500+ products?
         ▼
Phase 2: Search & Catalog
  ├── Typesense setup + sync job
  ├── Search API endpoint (fuzzy, facets)
  ├── Product detail API
  └── Materialized view for current_best_prices
         │
         │ GATE: Can users find and view products with prices?
         ▼
Phase 3: Cost Calculator
  ├── Duty/VAT/shipping rate tables (UK, US, EU)
  ├── FX rate integration + Redis cache
  ├── Cost calculation engine (pure function, unit-tested)
  └── Cost breakdown endpoint
         │
         │ GATE: Does the all-in cost calculation match manual spot checks?
         ▼
Phase 4: User Layer + Freemium
  ├── Auth (Clerk or Auth.js)
  ├── User profiles + subscription tier
  ├── Wishlist (saved products)
  └── Freemium rate limiting middleware
         │
         │ GATE: Can users register, log in, and save items?
         ▼
Phase 5: Price Alerts
  ├── price_alerts table + subscription API
  ├── Alert checker background job
  ├── Email (Resend) + Push (FCM) delivery
  └── Notification preferences
         │
         │ GATE: Do alerts fire accurately and within minutes of a price drop?
         ▼
Phase 6: Web + Mobile Frontend
  ├── Next.js web app (search, product detail, calculator UI)
  ├── React Native mobile app (shared business logic)
  └── Freemium gating UI (upgrade prompts)
```

**Dependency rules:**
- Typesense requires the canonical product catalog to exist (Phase 1 → Phase 2)
- Cost calculator requires products and source_mappings (Phase 1 → Phase 3)
- Alerts require user accounts AND working prices (Phases 1 + 4 → Phase 5)
- Frontend requires all APIs to exist (Phases 1-5 → Phase 6)
- Entity resolution can be iterated throughout — start simple, improve incrementally

---

## Key Decision Points

### Decision 1: Scraping framework — Playwright vs Scrapy vs custom

**Recommendation: Custom Node.js workers using Playwright + Cheerio, not Scrapy.**

Scrapy (Python) is excellent but requires maintaining a Python service alongside the Node.js API. The operational overhead of two runtimes outweighs Scrapy's built-in middleware advantages. In Node.js, Playwright handles JS-rendered pages and Cheerio handles static HTML — together they cover all sources. BullMQ replaces Scrapy's scheduler.

Tradeoff: Scrapy has more built-in scraping middleware (auto-throttle, cookie handling, proxy rotation). You must implement these yourself or use libraries like `got-scraping` (Apify's scraping-optimized HTTP client).

### Decision 2: Entity resolution — deterministic vs ML

**Recommendation: Deterministic blocking + Levenshtein for v1.**

ML-based entity resolution (splink, Dedupe.io) requires labeled training data you do not have at v1. Build the deterministic matcher, run it, manually review the low-confidence matches to build your labeled dataset, then train an ML model in v2 using that data. This is the correct sequence — not the other way around.

### Decision 3: Search engine — Typesense vs Meilisearch vs Elasticsearch

**Recommendation: Typesense.**

Meilisearch is also acceptable. Elasticsearch is overkill — it requires a JVM, an ops team, and $300+/month on managed hosting. For a catalog of 50K-200K whiskies, Typesense handles this on a $10/month VPS with no tuning.

### Decision 4: Monolith vs microservices

**Recommendation: Modular monolith, with the scraping workers running in a separate process from day one.**

Scraping workers and the API have different scaling profiles: the API needs low latency and horizontal scaling; scrapers need high concurrency and can tolerate delays. Separate processes from day one. Everything else stays monolithic until there is a concrete scaling reason to split.

### Decision 5: TimescaleDB vs plain Postgres for price history

**Recommendation: Plain Postgres with table partitioning for v1.**

TimescaleDB is genuinely better for time-series at scale, but adds deployment complexity (custom extension, specific Docker images, retention policy DSL). Do not add it unless you are inserting more than 10M rows/day or query times exceed 200ms on current partitioning. Monitor, then migrate.

### Decision 6: Where does cost calculation live?

**Recommendation: In the API, not in the scraping pipeline.**

Do not store computed landed costs in the database. Store only raw shelf prices. Calculate costs at query time using cached rate tables. This means:
- Changing duty rates instantly affects all results (no backfill needed)
- Users with different destination countries get correct calculations from the same raw data
- The calculation is testable as a pure function

---

## Failure Modes and Resilience

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Source website changes HTML | That source's scraper stops producing data | Alerting on zero-yield scrape jobs; easy adapter hot-fix |
| Anti-bot block on source | That source returns no data | Proxy rotation; graceful degradation (show other sources) |
| Typesense down | Search unavailable | Health check + fallback to Postgres FTS; auto-restart |
| Redis down | Cache miss on all requests | All reads fall through to Postgres; performance degrades but does not fail |
| FX API down | Cost calculations use stale rates | Last-known-good rate with staleness warning; hard TTL = 12 hours max |
| Postgres replica down | Read queries fail | Connection pool failover to primary; read-heavy workload makes this painful |
| Notification delivery fails | User misses price alert | BullMQ retry with exponential backoff; DLQ for manual inspection |

---

## Sources and Confidence

All findings are based on training data (knowledge cutoff August 2025) from:
- Production architecture write-ups from Skyscanner, Kayak, Vivino, and similar aggregators
- BullMQ, Typesense, and Postgres official documentation patterns
- Entity resolution literature (Christen, Bilenko) and open-source implementations (splink, Dedupe.io)
- PostgreSQL table partitioning and materialized view documentation

Web search and WebFetch were unavailable in this environment. Confidence is HIGH for all structural patterns (these are established industry practices, not emerging techniques). Specific version numbers and API surface areas should be verified against current documentation before implementation.
