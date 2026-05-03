# Project Research Summary

**Project:** WhiskyHunter -- Global whisky search, price comparison, and landed-cost calculator
**Domain:** Price aggregation / cross-border retail / alcohol e-commerce
**Researched:** 2026-05-03
**Confidence:** HIGH (stack + architecture verified via Context7 official docs); MEDIUM (features -- competitor training data; regulatory rates -- verify before shipping)

---

## Executive Summary

WhiskyHunter is a data pipeline product that happens to have a consumer UI. The primary engineering challenge is not building the frontend -- it is building a reliable, self-healing ingestion pipeline that scrapes 50+ global retailers, deduplicates product identities across wildly inconsistent naming conventions, and computes legally defensible landed-cost estimates in real time. Every competitor either stops at shelf price (WhiskyBase, Master of Malt) or ignores duty entirely (Wine-Searcher). The gap is genuine and exploitable, but only if the duty calculation engine is accurate and trusted.

The recommended approach is a TypeScript monorepo with two separately-deployed processes: (1) a long-lived scraping worker fleet on Railway with BullMQ + Playwright, and (2) a Hono/tRPC API on Railway serving a Next.js web app on Vercel and an Expo mobile app. PostgreSQL with append-only price snapshots is the canonical store; Typesense handles typo-tolerant faceted search; Redis caches FX rates and computed cost results. The entire stack shares TypeScript types and Zod validation schemas end-to-end -- from database schema to mobile API client -- which is the primary reason for choosing this stack over alternatives.

The two existential risks are: (a) duty calculations that users trust but are wrong -- a one-strike trust killer when a customs bill arrives -- and (b) product deduplication failure, which makes the comparison engine useless if the same bottle appears as 20 separate listings. Both must be designed correctly in Phase 1 and cannot be retrofitted. A third systemic risk -- anti-bot blocking by Cloudflare-protected retailers -- is an ongoing operational concern requiring residential proxies and Playwright stealth from day one, not as a later fix.

---

## Recommended Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Web frontend | Next.js 15 + React 19 | SSR for SEO on search pages; RSC component-level control; <3s render target |
| Mobile | Expo SDK 52+ + Expo Router | Unified FCM/APNs push; EAS Build/Update; shared TS logic with web |
| API server | Node.js 22 + Hono v4 | Lightweight, edge-portable, built-in Zod + rate limiting |
| API transport | tRPC v11 | End-to-end type safety; httpBatchLink for multi-vendor comparison pages |
| Job queue | BullMQ v5 + Redis | Persistent scrape scheduling; rate limiting per retailer; retries; DLQ |
| Scraping engine | Playwright v1.51 + stealth | Multi-browser fingerprint rotation; per-context residential proxy support |
| Primary DB | PostgreSQL 16 + Drizzle ORM | Relational price history; materialized views; partitioned snapshots |
| Search | Typesense v27+ | Built-in typo tolerance; zero-config faceting; single binary |
| Cache | Redis (ioredis) | FX rates (1h TTL), cost results (1h), search results (5m) |
| Auth | Better Auth v1.3+ | Framework-agnostic; works for Expo + Next.js both |
| Payments | Stripe v19 | Freemium subscription management |
| Email | Resend | react-email templates; best TypeScript DX |
| Push notifications | Expo Push (FCM + APNs relay) | Unified API; free at early volume |
| Hosting (workers) | Railway | Persistent processes; built-in Redis; Docker support |
| Hosting (web) | Vercel | Native Next.js; streaming SSR without configuration |
| DB hosting (v1) | Neon | Free tier; branching; serverless PostgreSQL |

**Estimated v1 infrastructure cost: $100-250/month** (proxies $50-100, Railway $20-50, Neon $0-25, Typesense Cloud $25)

---

## Table Stakes (must ship in v1)

- Text search with autocomplete and typo tolerance -- whisky names are notoriously misspelled
- Faceted filters: style, region, distillery, age statement, price range -- filter state survives pagination via URL
- Price in local currency with "as of [time]" label -- users will not mentally convert
- Per-bottle price shown first, not case price
- Stock availability with per-listing staleness tiers (green/amber/orange/red by data age)
- "Last updated" timestamp per listing, not page-level
- Multi-source results table -- the aggregation value must be immediately visible
- Affiliate click-through with tracking appended to redirect URL
- Age verification gate -- full date-of-birth entry, not Yes/No button (UK CAP Code requirement)
- Mobile-responsive web -- >50% of whisky search traffic is mobile

---

## Key Differentiators

What no competitor currently does well:

1. **True landed-cost calculation** -- shelf + shipping + import duty (LPA basis) + VAT + FX. Wine-Searcher shows shelf + estimated shipping but not duty. No competitor shows the full breakdown.
2. **Line-by-line cost breakdown** -- transparency builds trust; users understand why UK Duty Free is not always cheapest.
3. **Cross-border legality warnings** -- US state shipping restrictions, EU import limits -- no competitor surfaces these at the point of comparison.
4. **Destination-aware search** -- same query, different vendor rankings by buyer location. Landed cost is meaningless without a destination.
5. **Native mobile app with push price alerts** -- WhiskyBase has no app; Wine-Searcher has no spirits-focused alerts. Wishlist + landed-cost alert combination is unique in the market.

---

## Architecture in One Page

The system is two planes that must stay architecturally separate from day one:

**Ingestion plane** (async, background, Railway workers):

```
Scheduler (BullMQ cron) -> Job Queue -> Worker Pool (Playwright / HTTP / API workers)
  -> Parser/Source Adapters (one per retailer) -> Raw staging (Postgres JSONB)
  -> Normalizer -> Entity Resolver (blocking + Levenshtein dedup)
  -> price_snapshots (append-only, partitioned by month) + products (canonical catalog)
  -> Typesense upsert -> Alert Checker job enqueued
```

**Query plane** (synchronous, <3s SLA, Railway API + Vercel web):

```
User query -> Typesense (fuzzy, faceted, <10ms)
  -> Enrich with current_best_prices materialized view (<5ms)
  -> On product detail: Cost Calculator (pure function, Redis cache 1h)
  -> tRPC response -> Next.js web or Expo mobile
```

**Key decisions (each is load-bearing):**

- Append-only price_snapshots -- never UPDATE rows; enables history and alert diffing at zero extra cost
- current_best_prices materialized view -- refreshed every 30 min; makes search ranking O(1)
- Cost calculated at query time, NOT stored -- duty rate changes apply instantly without backfill
- FX rates stored with timestamp, reconverted at display time -- never store pre-converted prices
- Scraping workers in a separate process from the API from day one (different scaling profiles)
- Modular monolith for the API -- no microservices until there is a concrete scaling reason

---

## Top 5 Pitfalls to Avoid

1. **Wrong duty calculation basis** -- UK/EU duty is per Litre of Pure Alcohol (LPA = volume_litres x ABV/100), not ad valorem (percentage of price). Prevention: implement LPA basis from day one; write integration tests with known correct answers against the HMRC own calculator before shipping.

2. **Product deduplication collapse** -- "Glenfarclas 15" and "Glenfarclas Fifteen" must merge; "Ardbeg 10" and "Ardbeg TEN Committee Release" must NOT. Prevention: seed canonical product master from public databases (Whiskybase, LCBO) BEFORE running any scrapers; auto-merge only above 90% confidence; reject merges where price ratio exceeds 1.5x.

3. **Cloudflare blocking scrapers within 72 hours** -- Major retailers use TLS fingerprinting, canvas fingerprinting, and IP reputation scoring; datacenter IPs start with high bot scores before any other signal is evaluated. Prevention: residential proxy pool ($50-100/mo) + playwright-extra stealth plugin from day one; per-retailer health monitor alerting at <95% parse success rate.

4. **Storing FX-converted prices in the database** -- A 5% GBP/USD move makes every stored conversion wrong. Prevention: store only source currency + amount + FX rate + timestamp; reconvert at display time using current cached rate; never store computed landed costs.

5. **Showing shipping estimates to US states where spirits DTC shipping is illegal** -- Approximately 12-15 US states prohibit it outright. Prevention: build NCSL-sourced state shipping permission matrix before US launch; suppress shipping estimates for prohibited combinations; show explicit legal warnings on click-through.

---

## Build Order

Strict dependency sequence -- each phase gates the next:

| Phase | Name | Gate |
|-------|------|------|
| 1 | Data Foundation | Can we scrape and deduplicate 500+ products reliably? |
| 2 | Search and Catalog API | Can users find and view products with prices? |
| 3 | Cost Calculator | Does all-in cost match manual spot checks for 10 known bottles? |
| 4 | User Layer + Freemium | Can users register, log in, and save items? |
| 5 | Price Alerts | Do alerts fire accurately within minutes, only on fresh data? |
| 6 | Web + Mobile Frontends | All APIs exist and are stable |

Phase 1 is the most irreversible. Data model decisions (append-only snapshots, source currency storage, canonical product master) cannot be retrofitted without a full database migration. Phase 6 is last because building UI against unstable APIs creates rework -- the correct sequence for a data-first product.

Phase 1 must also include: LPA-based duty engine with versioned rate tables, robots.txt compliance check in scraper framework, age verification gate, US state shipping matrix, and Playwright + stealth + residential proxies. None of these are deferrable.

---

## Open Questions Before Building

1. **Target launch geography?** UK-only first, then EU/US? Determines which duty tables are MVP-critical vs. deferred.
2. **Budget for residential proxies ($50-100/mo) from day one?** If not, plan a proxy-free fallback using affiliate APIs only for v1 source coverage.
3. **Which 5-10 retailers are priority scrapers?** First adapters should cover the highest-traffic retailers in the target geography.
4. **Freemium model specifics?** What exactly is gated -- search limit/day, price history depth, alert count, wishlist size? Determines middleware architecture.
5. **Legal entity ready for alcohol marketing compliance?** Age verification and cross-border warning standards need legal sign-off before launch, not after.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified via Context7 official docs |
| Features | MEDIUM | Training knowledge of competitors as of mid-2025; verify current premium tier details before launch |
| Architecture | HIGH | Established patterns from Skyscanner, Kayak, Vivino production systems |
| Pitfalls (technical) | HIGH | Anti-bot, dedup, FX, React Native performance are well-documented patterns |
| Pitfalls (regulatory) | MEDIUM | Specific duty rates and US state laws must be verified from official sources at build time |

**Gaps requiring verification before shipping:** specific duty rate values (HMRC/EC/TTB official sources); US state shipping permission matrix (NCSL); EU member state-specific excise rates; age verification legal standard per jurisdiction (requires legal review in UK, US, and primary EU markets).

---

*Research completed: 2026-05-03*
*Ready for roadmap: yes*
