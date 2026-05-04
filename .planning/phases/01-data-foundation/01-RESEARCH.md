# Phase 1: Data Foundation - Research

**Researched:** 2026-05-04
**Domain:** Web scraping pipeline, product deduplication, append-only price storage, job scheduling
**Confidence:** HIGH (stack verified via npm registry + existing project research docs; architecture based on prior ARCHITECTURE.md work)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | Collect whisky listings from 10+ UK/US/EU retailers via hybrid pipeline (Playwright + APIs) | BullMQ scheduler + Playwright workers + per-source adapter pattern |
| DATA-02 | Canonical product registry — deduplicate listings of same whisky across sources | Blocking + Levenshtein matcher; LWIN codes as anchor identifiers |
| DATA-03 | Append-only price snapshots — never overwrite historical prices | Partitioned `price_snapshots` table; INSERT-only; no UPDATE/DELETE |
| DATA-04 | Scheduled daily refresh with per-source health monitoring and alerting | BullMQ `upsertJobScheduler` + scrape_status tracking + BullMQ failure events |
| DATA-05 | Visible "last updated" timestamp; listings > 48h flagged as stale | `last_successful_scrape_at` column + staleness query at API layer |
</phase_requirements>

---

## Summary

Phase 1 establishes the entire data ingestion backbone for WhiskyHunter. Three independent concerns must be built in strict dependency order: (1) the canonical product registry must exist before any scraper runs, because listings must attach to a canonical product; (2) the PostgreSQL schema (partitioned `price_snapshots`, `products`, `source_mappings`, `retailers`) must be locked before first data arrives, because the append-only constraint is architectural and cannot be retrofitted; (3) the scraping pipeline (BullMQ + Playwright + per-retailer adapters) can then be built on top of the stable schema.

The most irreversible decision in this phase is the product deduplication strategy. False-positive merges (two different products joined into one canonical record) are extremely hard to undo once prices accumulate. The recommended approach is hierarchical blocking (distillery + age + volume) followed by Levenshtein similarity scoring with a conservative 0.90 auto-merge threshold — items scoring 0.70-0.89 go to a human-review queue, not auto-merged.

Drizzle ORM does not have first-class support for PostgreSQL table partitioning as of May 2026. The workaround is: define the parent table in Drizzle schema, let Drizzle generate the migration, then manually append the `PARTITION BY RANGE (scraped_at)` clause and child partition definitions to the SQL migration file before applying it. Drizzle can query partitioned tables normally — the limitation is schema definition only.

**Primary recommendation:** Build schema → seed canonical product master → wire BullMQ scheduler → implement per-retailer adapters one at a time, starting with The Whisky Exchange (largest catalogue, affiliate program available as fallback) and Master of Malt.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Scraper scheduling and retries | Worker process (Railway) | — | BullMQ workers must be persistent; cannot run in serverless |
| Per-retailer HTTP scraping | Worker process (Railway) | — | Playwright requires Chromium binaries + long-lived processes |
| Raw HTML parsing | Worker process (Railway) | — | Co-located with scraper for latency; no round-trip needed |
| Product deduplication | Worker process (Railway) | — | CPU-bound matching; isolated from API request path |
| Canonical product writes | Worker process → PostgreSQL | — | Workers write; API reads |
| Price snapshot writes | Worker process → PostgreSQL | — | Append-only INSERT; workers are the only writers |
| Staleness detection | API layer (Hono/tRPC) | — | `WHERE scraped_at > now() - interval '48 hours'` at query time |
| Per-source health dashboard | API layer | Worker (metrics emit) | Workers emit success/failure events; API aggregates |
| Materialized view refresh | Worker process (BullMQ job) | PostgreSQL | Scheduled post-scrape job triggers `REFRESH MATERIALIZED VIEW` |
| Canonical product registry seed | Admin script / Wave 0 | — | One-time bootstrap; not a runtime concern |

---

## Standard Stack

### Core (Phase 1 specific)

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| `bullmq` | 5.76.5 | Job queue — scraper scheduling, retries, rate limiting | [VERIFIED: npm registry] |
| `ioredis` | 5.10.1 | Redis client (BullMQ dependency + API cache) | [VERIFIED: npm registry] |
| `playwright` | 1.59.1 | Headless browser for JS-rendered retailer pages | [VERIFIED: npm registry] |
| `playwright-extra` | 4.3.6 | Playwright plugin system (prerequisite for stealth) | [VERIFIED: npm registry] |
| `puppeteer-extra-plugin-stealth` | 2.11.2 | 17 anti-bot evasion patches for headless Chrome | [VERIFIED: npm registry] |
| `drizzle-orm` | 0.45.2 | Type-safe ORM — schema, queries, migrations | [VERIFIED: npm registry] |
| `drizzle-kit` | 0.31.10 | Drizzle CLI — `drizzle-kit generate` + `migrate` | [VERIFIED: npm registry] |
| `postgres` | 3.4.9 | PostgreSQL driver (pg-compatible, used by Drizzle) | [VERIFIED: npm registry] |
| `fastest-levenshtein` | 1.0.16 | Edit-distance for product name matching | [VERIFIED: npm registry] |
| `robots-parser` | 3.0.1 | Parse robots.txt before each scrape job | [VERIFIED: npm registry] |
| `zod` | 4.4.2 | Schema validation for RawProduct / NormalizedProduct types | [VERIFIED: npm registry] |
| `pnpm` | 10.33.2 | Workspace package manager (monorepo) | [VERIFIED: npm registry] |
| `turbo` | 2.9.8 | Monorepo build orchestration + caching | [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@neondatabase/serverless` | 1.1.0 | Neon-specific serverless Postgres driver | Only if using Neon HTTP mode (Edge/serverless contexts) |
| `tsx` | 4.21.0 | TypeScript execution for scripts and workers | Migration scripts, seed scripts, worker entrypoints |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `postgres` driver | `pg` (node-postgres) | `pg` is battle-tested; `postgres` has cleaner API and tagged template syntax; both work with Drizzle |
| `playwright-extra` + stealth | `got-scraping` (Apify) | `got-scraping` is HTTP-only — cannot handle JS-rendered pages; combine with Playwright where needed |
| BullMQ rate limiter | Custom per-request delay | BullMQ rate limiter is Redis-backed and works across worker replicas; custom delays don't |

**Installation (Phase 1 worker package):**
```bash
pnpm add bullmq ioredis playwright playwright-extra puppeteer-extra-plugin-stealth drizzle-orm postgres fastest-levenshtein robots-parser zod
pnpm add -D drizzle-kit tsx typescript
```

---

## Architecture Patterns

### System Architecture Diagram (Phase 1 Scope)

```
┌─────────────────────────────────────────────────────────────────┐
│                    INGESTION PLANE (Railway workers)            │
│                                                                 │
│  BullMQ Scheduler                                              │
│  upsertJobScheduler(retailerId, { pattern: '0 2 * * *' })      │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐   Playwright   ┌──────────────────────────┐   │
│  │  scrape-    │──────────────▶ │  Per-Retailer Adapter    │   │
│  │  queue      │   Worker Pool  │  fetch() → parse()       │   │
│  │  (Redis)    │   (concurrency │  → RawProduct[]          │   │
│  └─────────────┘    4 Playwright│                          │   │
│         │           32 HTTP)    └──────────┬───────────────┘   │
│         │                                  │                   │
│         │                                  ▼                   │
│         │                       ┌──────────────────────────┐   │
│         │                       │  Normalizer              │   │
│         │                       │  abbrev expand + extract │   │
│         │                       │  age/volume/ABV          │   │
│         │                       └──────────┬───────────────┘   │
│         │                                  │                   │
│         │                                  ▼                   │
│         │                       ┌──────────────────────────┐   │
│         │                       │  Entity Resolver         │   │
│         │                       │  block(distillery+age+   │   │
│         │                       │   volume) → Levenshtein  │   │
│         │                       │  ≥0.90 → auto-merge      │   │
│         │                       │  0.70-0.89 → review queue│   │
│         │                       └──────────┬───────────────┘   │
│         │                                  │                   │
│         │  scrape_status update            │                   │
│         │  (success/blocked/failed)        │                   │
│         └─────────────────────────────────▼───────────────┐   │
│                                                            │   │
└────────────────────────────────────────────────────────────┼───┘
                                                             │
                                                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 CANONICAL STORE (Neon PostgreSQL)                │
│                                                                 │
│  products          source_mappings     retailers                │
│  (canonical        (product ↔ source   (base_url, currency,    │
│   catalog)          URL link)           scrape_config)         │
│        │                  │                                     │
│        └──────────────────┘                                    │
│                   │                                             │
│                   ▼                                             │
│  price_snapshots  PARTITION BY RANGE (scraped_at)              │
│  INSERT-only — no UPDATE, no DELETE                             │
│  ├── price_snapshots_2026_05                                   │
│  ├── price_snapshots_2026_06  (created by Wave 0 script)       │
│  └── ...                                                        │
│                   │                                             │
│  scraper_health   │   (per-source: last_scraped_at,            │
│                   │    last_successful_scrape_at, status)       │
│                   │                                             │
│  current_best_prices  (MATERIALIZED VIEW — refreshed           │
│                        post-scrape by BullMQ job)              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
                 Available for Phase 2 (Typesense sync)
                 and Phase 3 (Cost Calculator queries)
```

### Recommended Monorepo Structure

```
whisky-hunter/
├── apps/
│   ├── web/                    # Next.js 15 (Phase 6)
│   ├── mobile/                 # Expo SDK 52 (Phase 6)
│   └── api/                    # Hono + tRPC (Phase 1 — health endpoints)
├── packages/
│   ├── database/               # Drizzle schema, migrations, seed scripts
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── products.ts
│   │   │   │   ├── price-snapshots.ts
│   │   │   │   ├── retailers.ts
│   │   │   │   └── source-mappings.ts
│   │   │   ├── migrations/     # drizzle-kit generated SQL files
│   │   │   └── seed/           # canonical product bootstrap
│   │   └── drizzle.config.ts
│   ├── scraper/                # BullMQ workers + Playwright adapters
│   │   ├── src/
│   │   │   ├── adapters/       # per-retailer ScraperAdapter implementations
│   │   │   │   ├── whisky-exchange.ts
│   │   │   │   ├── master-of-malt.ts
│   │   │   │   ├── total-wine.ts
│   │   │   │   └── ...
│   │   │   ├── normalizer/     # token expansion, field extraction
│   │   │   ├── resolver/       # entity resolution (blocking + Levenshtein)
│   │   │   ├── queue/          # BullMQ queue/worker setup
│   │   │   └── health/         # scrape_status tracking
│   │   └── Dockerfile          # mcr.microsoft.com/playwright base image
│   └── shared/                 # Zod schemas, types shared across packages
│       └── src/
│           ├── schemas/
│           │   ├── raw-product.ts
│           │   └── normalized-product.ts
│           └── types/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── tsconfig.base.json
```

### Pattern 1: BullMQ Job Scheduler (Cron per retailer)

**What:** Use `upsertJobScheduler` to register one repeating job per retailer with its own cron pattern.
**When to use:** Nightly scrapes. Each retailer gets its own scheduler ID so the schedule can be modified per-retailer without affecting others.

```typescript
// Source: https://docs.bullmq.io/guide/job-schedulers
import { Queue } from 'bullmq';
import { redis } from './redis';

const scrapeQueue = new Queue('scrape', { connection: redis });

// Called at startup (idempotent — safe to re-run)
async function registerRetailerSchedules(retailers: Retailer[]) {
  for (const retailer of retailers) {
    await scrapeQueue.upsertJobScheduler(
      `scrape-${retailer.id}`,                    // scheduler ID (unique per retailer)
      { pattern: retailer.cronExpression },        // e.g. '0 2 * * *' = 2 AM daily
      {
        name: 'scrape-retailer',
        data: { retailerId: retailer.id, url: retailer.catalogUrl },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 30_000 },
          removeOnComplete: { count: 50 },
          removeOnFail: { count: 100 },
        },
      },
    );
  }
}
```

### Pattern 2: BullMQ Worker with Rate Limiting

**What:** Each scrape worker applies a per-retailer rate limit using the BullMQ `limiter` option.
**When to use:** Whenever a retailer must not receive more than N requests per time window.

```typescript
// Source: https://docs.bullmq.io/guide/rate-limiting
import { Worker } from 'bullmq';

// Playwright worker pool — small concurrency to avoid memory exhaustion
const playwrightWorker = new Worker(
  'scrape',
  async (job) => {
    const { retailerId, url } = job.data;
    const adapter = getAdapter(retailerId);  // factory returns per-retailer adapter
    const rawProducts = await adapter.fetch(url);
    const normalized = normalize(rawProducts);
    await resolveAndPersist(normalized, retailerId);
  },
  {
    connection: redis,
    concurrency: 4,                // at most 4 Playwright scrapes simultaneously
    limiter: { max: 1, duration: 3_000 },  // 1 job / 3 seconds per queue globally
  },
);
```

### Pattern 3: Drizzle ORM Schema (with partitioning workaround)

**What:** Define tables in Drizzle TypeScript schema. For the partitioned `price_snapshots` table, manually edit the generated migration SQL to add `PARTITION BY RANGE` and child partition DDL.
**When to use:** Required for Phase 1 schema setup.

```typescript
// Source: https://orm.drizzle.team/docs/get-started/postgresql-new [CITED]
// packages/database/src/schema/price-snapshots.ts
import { pgTable, bigserial, uuid, char, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';
import { sourceMapping } from './source-mappings';
import { products } from './products';

// NOTE: PARTITION BY RANGE clause is injected manually into the SQL migration.
// Drizzle does not generate it — edit the migration file after `drizzle-kit generate`.
export const priceSnapshots = pgTable('price_snapshots', {
  id:                   bigserial('id', { mode: 'bigint' }),
  canonicalProductId:   uuid('canonical_product_id').notNull().references(() => products.id),
  sourceMappingId:      uuid('source_mapping_id').notNull().references(() => sourceMapping.id),
  currency:             char('currency', { length: 3 }).notNull(),
  priceLocal:           numeric('price_local', { precision: 10, scale: 2 }).notNull(),
  priceUsd:             numeric('price_usd', { precision: 10, scale: 2 }),
  inStock:              boolean('in_stock').notNull().default(true),
  scrapedAt:            timestamp('scraped_at', { withTimezone: true }).notNull().defaultNow(),
});
```

After `drizzle-kit generate`, the migration file must be manually edited to append:
```sql
-- Appended manually (Drizzle does not generate partitioning DDL as of v0.45):
ALTER TABLE price_snapshots PARTITION BY RANGE (scraped_at);

CREATE TABLE price_snapshots_2026_05
  PARTITION OF price_snapshots
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE price_snapshots_2026_06
  PARTITION OF price_snapshots
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- Run a Wave 0 script to auto-create future partitions on a monthly schedule
```

### Pattern 4: Per-Retailer Scraper Adapter

**What:** Each retailer implements a common `ScraperAdapter` interface. The worker calls the adapter; all anti-bot logic lives in a shared Playwright factory, not in adapters.
**When to use:** Any new retailer addition.

```typescript
// packages/scraper/src/adapters/types.ts
export interface RawProduct {
  sourceProductId: string;    // retailer's own product ID or URL slug
  name: string;               // exactly as displayed by retailer
  priceLocal: number;
  currency: string;
  inStock: boolean;
  url: string;
  imageUrl?: string;
}

export interface ScraperAdapter {
  retailerId: string;
  fetchCatalogPage(page: playwright.Page, pageNum: number): Promise<RawProduct[]>;
  totalPages(page: playwright.Page): Promise<number>;
}

// packages/scraper/src/adapters/whisky-exchange.ts
export const whiskyExchangeAdapter: ScraperAdapter = {
  retailerId: 'whisky-exchange',
  async fetchCatalogPage(page, pageNum) {
    await page.goto(`https://www.thewhiskyexchange.com/c/40/single-malt-scotch-whisky?pg=${pageNum}`);
    return page.$$eval('.product-card', cards =>
      cards.map(card => ({
        sourceProductId: card.querySelector('a')!.href.split('/').pop()!,
        name: card.querySelector('.product-name')!.textContent!.trim(),
        priceLocal: parseFloat(card.querySelector('.price')!.textContent!.replace(/[^0-9.]/g, '')),
        currency: 'GBP',
        inStock: !card.classList.contains('out-of-stock'),
        url: card.querySelector('a')!.href,
      }))
    );
  },
  async totalPages(page) {
    const text = await page.$eval('.pagination__total', el => el.textContent ?? '1');
    return parseInt(text);
  },
};
```

### Pattern 5: Playwright Stealth Context Factory

**What:** Create one stealthy Playwright browser context per scrape job. Rotate proxies at the context level.
**When to use:** All Playwright-based scrapes.

```typescript
// Source: https://github.com/berstend/puppeteer-extra [CITED]
// packages/scraper/src/queue/browser-factory.ts
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

export async function createStealthContext(proxyUrl?: string) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const ctx = await browser.newContext({
    proxy: proxyUrl ? { server: proxyUrl } : undefined,
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  });
  // Block images, fonts, stylesheets — scraper needs only HTML/JSON
  await ctx.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,css}', r => r.abort());
  return { browser, ctx };
}
```

### Pattern 6: Scraper Health Tracking

**What:** Record scrape result (success/blocked/parse_error/timeout) after every job. Drive the 48-hour staleness flag from `last_successful_scrape_at`, not `last_scraped_at`.

```typescript
// packages/database/src/schema/scraper-health.ts
export const scraperHealth = pgTable('scraper_health', {
  id:                        uuid('id').primaryKey().defaultRandom(),
  retailerId:                text('retailer_id').notNull(),
  lastScrapedAt:             timestamp('last_scraped_at', { withTimezone: true }),
  lastSuccessfulScrapeAt:    timestamp('last_successful_scrape_at', { withTimezone: true }),
  lastScrapeStatus:          text('last_scrape_status'),  // 'success' | 'blocked' | 'parse_error' | 'timeout'
  successRateLast24h:        numeric('success_rate_last_24h', { precision: 5, scale: 2 }),
  consecutiveFailures:       integer('consecutive_failures').default(0),
  updatedAt:                 timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

### Anti-Patterns to Avoid

- **Storing FX-converted prices as the canonical price:** Always store `price_local` + `currency`. Reconvert at query time. A stored USD value is stale within hours.
- **Scheduling all retailers on the same cron:** Thundering herd — all scrapers fire at once, overloading Railway workers and appearing as coordinated bot traffic to retailer CDNs. Stagger using per-retailer cron expressions or BullMQ delayed starts.
- **Auto-merging at < 0.90 similarity without human review:** Merging a £40 NAS expression with a £200 limited edition because they share "Glenfiddich" is catastrophic for user trust.
- **Using Drizzle's `drizzle-kit push` in production:** `push` is for development only. Use `generate` + `migrate` for production. Push can silently drop columns it doesn't recognize.
- **Running the entity resolver inside the API request path:** Deduplication is CPU-bound. It belongs in the background worker pipeline, not in a hot HTTP path.
- **Parsing "Just a moment..." Cloudflare pages as product data:** Always perform a sanity-check assertion in the adapter (e.g., assert product count > 0) before writing to the database.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Job scheduling with retries | Custom cron + retry logic | BullMQ `upsertJobScheduler` + `attempts` + `backoff` | Handles delayed jobs, dead-letter queue, priority, rate limiting — 1000s of edge cases |
| Anti-bot headless browser | Custom Puppeteer patches | `playwright-extra` + stealth plugin | 17 evasion patches maintained by community; TLS fingerprinting requires low-level patches you cannot write yourself |
| Edit distance for product names | Custom string comparison | `fastest-levenshtein` | Compiled C++ via WASM — 10-100x faster than pure-JS implementations |
| PostgreSQL connection pooling | Custom pool | Neon PgBouncer (built-in) or `postgres` driver pool | PgBouncer handles 10,000+ connections; `postgres` driver handles pool lifecycle correctly |
| Robots.txt parsing | Manual string parsing | `robots-parser` | Edge cases in robots.txt spec (wildcards, Allow/Disallow precedence) are non-trivial |
| Schema validation for scraped data | Manual type checks | Zod `.parse()` / `.safeParse()` | Scrapers produce untrusted input; Zod gives detailed error messages for debugging parse failures |

**Key insight:** The scraping domain has a graveyard of "simple" custom solutions that failed silently. Use libraries maintained by practitioners who've dealt with the edge cases.

---

## Common Pitfalls

### Pitfall 1: Drizzle Partitioning — Drizzle-kit Introspect Undoes Manual Partition SQL

**What goes wrong:** After manually adding `PARTITION BY RANGE` to a migration file, a developer runs `drizzle-kit introspect` to update the schema. Drizzle introspects the partitioned table as multiple separate tables (parent + child partitions), overwriting the TypeScript schema definition and breaking the codebase.

**Why it happens:** Drizzle does not have first-class partition awareness as of v0.45. Introspect treats child partition tables as independent tables.

**How to avoid:** Never run `drizzle-kit introspect` after manually adding partition DDL. Treat the `price_snapshots` migration as "owned by hand" — future schema changes to that table must be written as new migration SQL files, not regenerated. Document this in the `packages/database/README` section.

**Warning signs:** TypeScript schema file contains `price_snapshots_2026_05` as a top-level table definition.

---

### Pitfall 2: Cloudflare Turnstile Pages Parsed as Product Data

**What goes wrong:** The scraper's HTTP response is a Cloudflare Turnstile challenge page (200 OK, HTML body). The adapter's `$$eval` query finds zero product cards and returns an empty array. The worker treats this as a valid "page with no products" and writes zero snapshots — no error is raised, no alert fires. The retailer's data silently disappears from the database over 48 hours.

**Why it happens:** Cloudflare returns 200 with a JS challenge page, not a 4xx/5xx. The scraper's success detection relies on HTTP status code, which is insufficient.

**How to avoid:** Add a post-parse assertion in every adapter: `if (products.length === 0 && pageNum === 1) throw new Error('Zero products on page 1 — possible bot block')`. This makes BullMQ retry the job and eventually emit a failure event. Also add a "sanity check" in the health monitor: if a retailer that normally yields 200+ products suddenly yields 0, trigger an alert regardless of HTTP status.

**Warning signs:** A retailer's product count drops by more than 80% in one scrape cycle.

---

### Pitfall 3: False Merge in Entity Resolver — Comparing Same-Distillery Different-Expressions

**What goes wrong:** "Glenfarclas 15 Year Old" and "Glenfarclas 25 Year Old" both block to distillery=Glenfarclas but different ages. However, a typo in the source data makes the age extraction fail for one, so both appear as age=undefined. Without the age block, they compare on name similarity alone: "Glenfarclas 15 Year Old" vs "Glenfarclas 25 Year Old" scores ~0.88 Levenshtein (only 2 characters different) — above the 0.85 threshold some implementations use.

**Why it happens:** Age extraction via regex fails on unusual formats ("Fifteen Years", "XV", "15-Year-Old", "15 yr"). The fallback is name-only comparison with a threshold that is too permissive.

**How to avoid:** (1) Expand numeral words before matching: "Fifteen" → 15, "Twenty-Five" → 25, "XV" → 15. (2) Make age a blocking field, not just a scoring field — two records with confirmed different ages MUST NOT be auto-merged regardless of name similarity. (3) Set auto-merge threshold at 0.90 minimum when age is unresolvable (not 0.85).

**Warning signs:** A canonical product record has price snapshots from the same retailer spanning a 3x price range (e.g., £45 and £150) — almost certainly a false merge of two different expressions.

---

### Pitfall 4: Monthly Partition Not Pre-Created Before Scraper Runs

**What goes wrong:** The scraper runs on June 1st. The partition `price_snapshots_2026_06` does not exist yet. PostgreSQL raises `ERROR: no partition of relation "price_snapshots" found for row` and the entire scrape batch fails to insert.

**Why it happens:** Manual partition creation without automation. Developers create May and June partitions at schema setup time and forget July.

**How to avoid:** Build a BullMQ job (`create-monthly-partition`) that runs on the 25th of each month and creates the next month's partition: `CREATE TABLE IF NOT EXISTS price_snapshots_YYYY_MM PARTITION OF price_snapshots FOR VALUES FROM ('YYYY-MM-01') TO ('YYYY+1-MM+1-01')`. This job should be part of Wave 0.

**Warning signs:** First insert failure on the 1st of a new month in the BullMQ error logs.

---

### Pitfall 5: `last_scraped_at` Shown as Freshness Indicator Instead of `last_successful_scrape_at`

**What goes wrong:** A scraper is blocked by Cloudflare. The job runs, records `last_scraped_at = now()`, but returns zero products and records `last_scrape_status = 'blocked'`. The UI displays "last updated 2 minutes ago" because it reads `last_scraped_at`. The user sees fresh data when they're actually seeing 3-day-old prices.

**Why it happens:** Using a single timestamp column without distinguishing scrape attempts from scrape successes.

**How to avoid:** Always display `last_successful_scrape_at` in any user-facing or ops-facing UI. Reserve `last_scraped_at` for internal diagnostics. The staleness threshold query for DATA-05 must be: `WHERE ps.scraped_at > now() - interval '48 hours'` — this correctly flags data regardless of scrape attempt recency.

---

## Code Examples

### Full Schema: products table

```typescript
// Source: ARCHITECTURE.md (prior project research — HIGH confidence)
// packages/database/src/schema/products.ts
import {
  pgTable, uuid, text, smallint, numeric, timestamp
} from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id:          uuid('id').primaryKey().defaultRandom(),
  name:        text('name').notNull(),              // canonical display name
  distillery:  text('distillery').notNull(),
  ageYears:    smallint('age_years'),               // NULL = NAS (No Age Statement)
  volumeMl:    smallint('volume_ml').notNull(),
  category:    text('category').notNull(),          // 'scotch_single_malt' | 'bourbon' | ...
  region:      text('region'),
  caskType:    text('cask_type'),
  abv:         numeric('abv', { precision: 4, scale: 1 }),
  imageUrl:    text('image_url'),
  description: text('description'),
  reviewScore: numeric('review_score', { precision: 4, scale: 1 }),
  lwinCode:    text('lwin_code'),                   // Liv-ex LWIN identifier where known
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

### Full Schema: retailers table

```typescript
// packages/database/src/schema/retailers.ts
import { pgTable, text, char, boolean, timestamp } from 'drizzle-orm/pg-core';

export const retailers = pgTable('retailers', {
  id:               text('id').primaryKey(),       // slug: 'whisky-exchange'
  name:             text('name').notNull(),
  baseUrl:          text('base_url').notNull(),
  country:          char('country', { length: 2 }).notNull(),  // ISO 3166-1
  currency:         char('currency', { length: 3 }).notNull(), // ISO 4217
  scraperType:      text('scraper_type').notNull(), // 'playwright' | 'http' | 'api'
  catalogUrl:       text('catalog_url').notNull(),
  cronExpression:   text('cron_expression').notNull().default('0 2 * * *'),
  affiliateProgram: boolean('affiliate_program').default(false),
  tosStatus:        text('tos_status').default('ambiguous'),  // 'permitted' | 'ambiguous' | 'prohibited'
  active:           boolean('active').default(true),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

### Materialized View: current_best_prices

```sql
-- Source: ARCHITECTURE.md (prior project research — HIGH confidence)
-- Run after initial schema migration (add to Wave 0 migration script)
CREATE MATERIALIZED VIEW current_best_prices AS
SELECT
  p.id            AS product_id,
  MIN(ps.price_usd) AS min_price_usd,
  MAX(ps.scraped_at) AS latest_scraped_at,
  COUNT(DISTINCT ps.source_mapping_id)
    FILTER (WHERE ps.in_stock) AS source_count
FROM products p
JOIN source_mappings sm ON sm.canonical_product_id = p.id
JOIN price_snapshots ps ON ps.source_mapping_id = sm.id
WHERE ps.scraped_at > now() - interval '48 hours'
GROUP BY p.id;

CREATE UNIQUE INDEX ON current_best_prices (product_id);
```

### Blocking + Levenshtein Entity Resolution

```typescript
// Source: ARCHITECTURE.md (prior project research — HIGH confidence)
// packages/scraper/src/resolver/entity-resolver.ts
import { distance } from 'fastest-levenshtein';

interface NormalizedProduct {
  name: string;
  distillery: string;
  ageYears: number | null;
  volumeMl: number;
  abv: number | null;
  priceLocal: number;
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - distance(a, b) / maxLen;
}

export function computeMatchScore(a: NormalizedProduct, b: NormalizedProduct): number {
  // If ages are both known and DIFFERENT — hard reject, never merge
  if (a.ageYears !== null && b.ageYears !== null && a.ageYears !== b.ageYears) {
    return 0;
  }
  // Name similarity (normalized: lowercase, stripped stop-words)
  const nameSim = similarity(normalizeName(a.name), normalizeName(b.name));
  const distSim = a.distillery.toLowerCase() === b.distillery.toLowerCase() ? 1 : 0;
  const ageSim  = a.ageYears === b.ageYears ? 1 : 0;
  const volSim  = a.volumeMl === b.volumeMl ? 1 : 0;

  return 0.50 * nameSim + 0.30 * distSim + 0.10 * ageSim + 0.10 * volSim;
}

// Thresholds
export const AUTO_MERGE_THRESHOLD = 0.90;  // locked; do not lower without review
export const REVIEW_QUEUE_THRESHOLD = 0.70;
```

### BullMQ health event listener

```typescript
// packages/scraper/src/health/health-emitter.ts
// Source: https://docs.bullmq.io/guide/events [CITED]
import { QueueEvents } from 'bullmq';
import { db } from '@whisky-hunter/database';
import { scraperHealth } from '@whisky-hunter/database/schema';

const events = new QueueEvents('scrape', { connection: redis });

events.on('completed', async ({ jobId }) => {
  const job = await scrapeQueue.getJob(jobId);
  await db.update(scraperHealth)
    .set({
      lastScrapedAt: new Date(),
      lastSuccessfulScrapeAt: new Date(),
      lastScrapeStatus: 'success',
      consecutiveFailures: 0,
    })
    .where(eq(scraperHealth.retailerId, job!.data.retailerId));
});

events.on('failed', async ({ jobId, failedReason }) => {
  const job = await scrapeQueue.getJob(jobId);
  await db.update(scraperHealth)
    .set({
      lastScrapedAt: new Date(),
      lastScrapeStatus: failedReason.includes('bot block') ? 'blocked' : 'failed',
      consecutiveFailures: sql`consecutive_failures + 1`,
    })
    .where(eq(scraperHealth.retailerId, job!.data.retailerId));
  // TODO Phase 1: alert if consecutiveFailures > 3
});
```

---

## Target Retailers (Phase 1 — 10 minimum)

For DATA-01, 10+ retailers must be scraped. The following represent a validated starting list. Anti-bot posture is assessed based on known Cloudflare adoption patterns.

| Retailer | Region | Currency | Anti-bot Posture | Notes |
|----------|--------|----------|-----------------|-------|
| The Whisky Exchange | UK | GBP | HIGH (Cloudflare Enterprise) | Affiliate program via Awin (Merchant ID: 400) — prefer API if available |
| Master of Malt | UK | GBP | HIGH (Cloudflare) | Trade API at trade.masterofmalt.com — investigate before scraping |
| Total Wine & More | US | USD | MEDIUM-HIGH | Large catalogue; JS-rendered; Playwright required |
| LCBO | CA | CAD | LOW-MEDIUM | Government site; more permissive; also has well-structured HTML |
| Spec's Wine, Spirits & Finer Foods | US/TX | USD | LOW | Texas-only but largest US independent retailer |
| K&L Wine Merchants | US | USD | LOW-MEDIUM | Curated selection; good for premium SKUs |
| La Maison du Whisky | FR | EUR | MEDIUM | French market; EU-sourced pricing |
| Whisky.de | DE | EUR | LOW-MEDIUM | German market; structured product listings |
| Dramtime / Abbey Whisky | UK | GBP | LOW-MEDIUM | Smaller UK independents; good for rare/indie bottles |
| The Whisky Barrel | UK | GBP | LOW | Smaller; cleaner HTML; good for pilot testing |
| Whisky Auctioneer | UK | GBP | MEDIUM | Secondary market; different schema needed |

[ASSUMED] Anti-bot posture ratings above are approximate. Actual Cloudflare tier used by each retailer must be confirmed by attempting a scrape in development.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Scrapy (Python) job queue | BullMQ (Node.js) + Playwright | 2020-2022 | Single-runtime monorepo; no Python/Node split |
| Manual cron (`node-cron`) | BullMQ `upsertJobScheduler` | BullMQ v2 (2022); stabilized v5 | Redis-backed persistence; survives worker restarts; retries built-in |
| Prisma for ORM | Drizzle ORM | 2023-2024 | Readable SQL; materialized views without raw escape hatches |
| `pg` (node-postgres) | `postgres` (postgres.js) | 2022+ | Tagged template syntax; cleaner API; same PostgreSQL wire protocol |
| Single-process scraper | Separate playwright-queue + http-queue | Always best practice | Memory isolation — one crashed Playwright context doesn't kill HTTP workers |
| `drizzle-kit push` everywhere | `drizzle-kit generate` + `drizzle-kit migrate` | Drizzle docs recommendation | Push drops unrecognized columns; migrate is deterministic and reversible |

**Deprecated/outdated:**
- `QueueScheduler` class: Removed in BullMQ v2. No longer needed — scheduler functionality merged into Queue.
- `puppeteer` (Chromium-only): Superseded by Playwright for anti-bot work; Playwright supports Firefox + WebKit for fingerprint rotation.
- Drizzle ORM v0.28 and below: Major API changes in v0.29-0.38. Schema syntax differs. Use v0.38+ only.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Drizzle ORM still lacks first-class partition support as of May 2026 | Standard Stack / Pitfall 1 | If Drizzle added native partitioning support, the manual SQL workaround is unnecessary but harmless |
| A2 | Anti-bot posture of each specific retailer (LOW/MEDIUM/HIGH ratings in target retailer table) | Target Retailers | If a "LOW" retailer actually uses Cloudflare Enterprise, the initial scraper will be blocked and need stealth + proxy upgrade |
| A3 | The Whisky Exchange affiliate program (Awin Merchant ID 400) still active | Target Retailers | If program is discontinued, lose the "API fallback" option for this retailer |
| A4 | LWIN codes cover sufficient whisky SKUs (85,000+ products) to serve as canonical identifiers | Architecture / Entity Resolution | If LWIN coverage is sparse for whisky (vs. wine), canonical registry must be built from first principles |
| A5 | Neon PostgreSQL acquired by Databricks in May 2025 — pricing and feature parity with Railway PostgreSQL | Environment Availability | If Neon pricing increased significantly post-acquisition, Railway PostgreSQL may be preferred from day one |
| A6 | UK alcohol duty rate is £31.64/LPA as of 2024 (cited in PITFALLS.md) | Not a Phase 1 concern (Phase 3) | Rate table seeding needed before Phase 3; verify against HMRC at Phase 3 time |

**If this table is empty:** Not applicable — several assumed claims exist, noted above.

---

## Open Questions

1. **Does Master of Malt expose a trade/affiliate API?**
   - What we know: `trade.masterofmalt.com` exists. The Whisky Exchange uses Awin affiliate.
   - What's unclear: Whether a structured data feed (CSV/JSON) is available to affiliates that would replace Playwright scraping.
   - Recommendation: Email both retailers' affiliate programs before building Playwright adapters. API access = 10x more reliable than scraping.

2. **Does Whiskybase have a public export or API for the canonical product database?**
   - What we know: Whiskybase is described as the world's largest whisky database. No public API found in research.
   - What's unclear: Whether a data partnership or bulk export is available.
   - Recommendation: Contact Whiskybase. In parallel, use LCBO product database (public) + LWIN CSV (open source) as the canonical seed corpus.

3. **What is the minimum monthly proxy budget for reliable scraping?**
   - What we know: Bright Data residential proxies ~$10.50/GB. Oxylabs ~$10/GB. Actual GB consumption depends on scrape volume.
   - What's unclear: How many GB/month scraping 10 retailer catalogues daily consumes.
   - Recommendation: Start with Bright Data pay-as-you-go ($10.50/GB). A 10-retailer daily scrape with page sizes averaging 200KB = ~10GB/month = ~$105/mo. Budget $150/mo with buffer.

4. **Turbo vs. no build caching for Phase 1?**
   - What we know: Turbo v2.9.8 is installed; adds 22% faster incremental builds per 2025 data.
   - What's unclear: Whether Phase 1 (backend-only, no UI) benefits meaningfully from Turbo's pipeline caching.
   - Recommendation: Add `turbo.json` with basic `build` and `typecheck` pipelines from the start. Negligible setup cost; pays off when web/mobile apps are added in Phase 6.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 22 LTS | BullMQ workers, Drizzle, Playwright | Yes | v22.17.0 | — |
| npm 10 | pnpm bootstrap | Yes | 10.9.2 | — |
| pnpm (global) | Workspace management | Yes | 10.33.2 (via npm view) | `npm install -g pnpm` |
| Git | Version control | Yes | 2.53.0.windows.1 | — |
| PostgreSQL 16 (local dev) | Integration tests | Not verified | — | Use Neon free tier for dev |
| Redis 7.x (local dev) | BullMQ local testing | Not verified | — | Railway Redis service ($5/mo) |
| Chromium | Playwright scraping | Not verified (needs install) | — | `npx playwright install chromium` |
| Neon account | Cloud PostgreSQL | Not verified | — | Railway PostgreSQL |
| Railway account | Worker hosting | Not verified | — | Docker Compose locally for dev |
| Bright Data / Oxylabs | Residential proxies | Not verified | — | Test without proxies initially; add when blocked |

**Missing dependencies with no fallback:** None identified — all have viable alternatives for development.

**Missing dependencies with fallback (action required before execution):**
- Local PostgreSQL — use Neon free tier; configure `DATABASE_URL` env var
- Local Redis — use Railway Redis or `docker run -p 6379:6379 redis:7`
- Chromium binaries — run `npx playwright install chromium` in scraper package

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (inferred from ecosystem standard for pnpm + TypeScript monorepos) [ASSUMED] |
| Config file | `packages/database/vitest.config.ts`, `packages/scraper/vitest.config.ts` — Wave 0 |
| Quick run command | `pnpm --filter @whisky-hunter/database test` |
| Full suite command | `pnpm turbo test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | Adapter fetches > 0 products from retailer | Integration (against live site, rate-limited) | `pnpm --filter @whisky-hunter/scraper test:integration` | Wave 0 |
| DATA-01 | Playwright context blocks images/fonts | Unit | `pnpm --filter @whisky-hunter/scraper test` | Wave 0 |
| DATA-02 | Entity resolver: same whisky different names → merge | Unit | `pnpm --filter @whisky-hunter/scraper test` | Wave 0 |
| DATA-02 | Entity resolver: different expressions → no merge | Unit | `pnpm --filter @whisky-hunter/scraper test` | Wave 0 |
| DATA-03 | Price snapshot is INSERT-only — no UPDATE path exists | Unit (schema constraint test) | `pnpm --filter @whisky-hunter/database test` | Wave 0 |
| DATA-04 | BullMQ scheduler registers job per retailer | Unit (mock Redis) | `pnpm --filter @whisky-hunter/scraper test` | Wave 0 |
| DATA-04 | Failed scrape increments `consecutive_failures` | Unit | `pnpm --filter @whisky-hunter/scraper test` | Wave 0 |
| DATA-05 | Staleness query returns only snapshots < 48h | Unit (SQL query test) | `pnpm --filter @whisky-hunter/database test` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @whisky-hunter/scraper test` (unit tests only, < 5s)
- **Per wave merge:** `pnpm turbo test` (all packages)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `packages/scraper/vitest.config.ts` — Vitest config
- [ ] `packages/database/vitest.config.ts` — Vitest config
- [ ] `packages/scraper/src/resolver/__tests__/entity-resolver.test.ts` — covers DATA-02
- [ ] `packages/database/src/__tests__/staleness-query.test.ts` — covers DATA-05
- [ ] `packages/scraper/src/queue/__tests__/scheduler.test.ts` — covers DATA-04 (mock Redis)
- [ ] Framework install: `pnpm add -D vitest @vitest/coverage-v8` in each package

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (Phase 4) | — |
| V3 Session Management | No (Phase 4) | — |
| V4 Access Control | Partial | Admin endpoint for health dashboard — restrict to internal network / Railway private networking |
| V5 Input Validation | Yes | Zod `.safeParse()` on all scraped RawProduct data before database insert |
| V6 Cryptography | No | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Scraped data injection (malicious retailer HTML injecting SQL via product name) | Tampering | Drizzle parameterized queries — never string-interpolate into SQL |
| Proxy credential exposure | Info Disclosure | Store proxy URLs in Railway environment variables, never in source code or logs |
| BullMQ Redis unauthorized access | Elevation of Privilege | Enable Redis AUTH password on Railway Redis service; use `REDIS_URL` env var |
| Scraper writing unvalidated foreign product names to DB | Tampering | Zod schema on `RawProduct.name` — max length 500, no HTML tags, strip control chars |

---

## Sources

### Primary (HIGH confidence — verified in this session)
- npm registry: bullmq@5.76.5, playwright@1.59.1, playwright-extra@4.3.6, puppeteer-extra-plugin-stealth@2.11.2, drizzle-orm@0.45.2, drizzle-kit@0.31.10, ioredis@5.10.1, fastest-levenshtein@1.0.16, robots-parser@3.0.1, postgres@3.4.9 — [VERIFIED: npm view]
- BullMQ rate limiting API: https://docs.bullmq.io/guide/rate-limiting — [VERIFIED: WebFetch 2026-05-04]
- BullMQ job scheduler API: https://docs.bullmq.io/guide/job-schedulers — [VERIFIED: WebFetch 2026-05-04]
- Drizzle ORM partition support status: GitHub discussion #2093 — [VERIFIED: WebFetch 2026-05-04]
- Railway + Playwright Dockerfile guide: https://docs.railway.com/guides/playwright — [VERIFIED: WebFetch 2026-05-04]
- Whisky Exchange affiliate program: https://www.thewhiskyexchange.com/affiliates (Awin Merchant ID 400) — [VERIFIED: WebSearch 2026-05-04]
- Expo + pnpm monorepo: https://github.com/byCedric/expo-monorepo-example — [VERIFIED: WebFetch 2026-05-04]
- Neon connection pooling 2025 improvements: PgBouncer dynamic pool sizing — [CITED: neon.com/docs/connect/connection-pooling]

### Secondary (HIGH confidence — prior project research, Context7-verified)
- ARCHITECTURE.md (`.planning/research/ARCHITECTURE.md`) — entity resolution, price snapshot schema, materialized view pattern — verified in prior session via Context7
- STACK.md (`.planning/research/STACK.md`) — full stack rationale, BullMQ/Drizzle/Playwright choices — verified in prior session via Context7
- PITFALLS.md (`.planning/research/PITFALLS.md`) — Cloudflare evasion strategy, duty calculation basis, entity resolution failure modes

### Tertiary (MEDIUM confidence — training knowledge, flagged)
- LWIN database coverage for whisky: 85,000+ products claimed [ASSUMED — verify at LWIN CSV download time]
- Retailer anti-bot posture ratings [ASSUMED — confirm by attempting dev scrape]
- UK duty rate £31.64/LPA [ASSUMED — verify at HMRC before Phase 3]
- Neon Databricks acquisition pricing impact [CITED: dev.to article, 2025]

---

## Metadata

**Confidence breakdown:**
- Standard stack (library versions): HIGH — all verified via npm registry
- Architecture patterns (schema, BullMQ, Playwright): HIGH — verified via official docs + prior Context7 research
- Drizzle partitioning workaround: HIGH (limitation confirmed) / MEDIUM (workaround approach)
- Retailer anti-bot posture: LOW — assumed, must validate in development
- Product deduplication algorithm: HIGH — deterministic blocking + Levenshtein is well-established

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 for library versions (npm versions change); Cloudflare anti-bot guidance valid ~3 months
