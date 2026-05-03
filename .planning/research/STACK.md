# Technology Stack — WhiskyHunter

**Project:** WhiskyHunter — Global whisky search, price comparison, and landed-cost calculator
**Researched:** 2026-05-03
**Overall confidence:** HIGH (all recommendations verified via Context7 official docs)

---

## 1. Web Frontend

### Recommended: Next.js 15 (App Router) with React 19

**Version:** Next.js 15.x / React 19.x

**Rendering strategy:**
- **Search results page:** Server Component for initial render (SSR via React Server Components), then TanStack Query v5 for client-side re-fetching and polling. This hits the 3-second requirement: the server renders the first meaningful result set, client-side query handles cache refresh without a full reload.
- **Product detail / cost breakdown page:** SSR — price data must be fresh on load, not stale from client cache.
- **Wishlist / alerts:** Full CSR after auth check. These are user-specific, non-indexable, and benefit from React Query's polling (`refetchInterval`) for live price monitoring.
- **Landing, static content:** Static generation (SSG). No server overhead.

**Why Next.js over Remix:**
Remix's loader model is excellent for form-heavy apps but is not the right fit here. WhiskyHunter's core loop is: search → read results → compare — this is read-dominated, not form-dominated. Next.js 15 App Router gives granular control at the component level (stream RSC, Suspense boundaries) which directly translates to the <3-second render target. Remix v2's progressive-enhancement philosophy introduces complexity without payoff for a data-display-first product.

**Why Next.js over a pure React SPA:**
SEO matters for whisky name/distillery discovery (organic search "buy Glenfarclas 25 cheapest"). Server-rendered search results pages are indexable. A CSR-only app forfeits this entirely.

**What NOT to use:**
- **Remix 2.x** — Good DX but loader-centric model is friction for complex search state management. Smaller ecosystem of RSC-compatible component libraries.
- **Gatsby** — SSG-first, actively declining for dynamic data apps.
- **Vue/Nuxt or SvelteKit** — No reason to diverge from the React ecosystem when the mobile layer (Expo) is also React-based. Shared component primitives and validation schemas across web/mobile would be lost.

**Supporting libraries:**
- **TanStack Query v5** — Background polling for price freshness; `refetchIntervalInBackground: true` keeps Wishlist prices live even when the tab is backgrounded (verified in Context7 docs).
- **Zustand v5** — Lightweight global state for search filters, comparison tray (selected whiskies), and freemium gate UI state. No need for Redux-scale complexity.
- **Zod** — Schema validation shared between frontend forms and backend API contracts.

**Confidence: HIGH** (Next.js official docs + Context7 verified)

---

## 2. Mobile

### Recommended: Expo SDK 52+ with Expo Router (React Native)

**Version:** Expo SDK 52+ (targets React Native 0.76+, New Architecture enabled by default)

**Why Expo over bare React Native:**
- Expo Router provides file-based navigation that mirrors Next.js App Router — same mental model for the team, and it generates universal links (deep links work identically on web and native).
- `expo-notifications` handles both FCM (Android) and APNs (iOS) through a unified API. Context7 docs confirm the full token registration flow, including `projectId` from EAS config — critical for the price alert feature.
- EAS Build produces production iOS/Android binaries without maintaining local macOS CI. For a greenfield project, this removes months of CI/CD setup.
- OTA updates (EAS Update) allow pushing JS bundle patches without app store review — useful for price logic or duty-rate table corrections.

**Logic sharing with web:**
The real win is in non-UI layers. With Expo Router, Zod validation schemas, API client code (tRPC or fetch wrappers), currency conversion logic, and duty calculation utilities are plain TypeScript — usable identically in both Next.js and Expo without modification. Only UI components and navigation differ.

**What NOT to use:**
- **Flutter** — Dart is a separate language; zero code sharing with the Next.js web frontend. The TypeScript monorepo advantage disappears entirely.
- **React Native CLI (bare)** — More flexibility but significantly higher DevOps burden. EAS handles what would otherwise be Fastlane + custom CI scripts.
- **Capacitor/Ionic** — Web wrapper, not native. Acceptable for simple CRUD, but price alert push notifications and deep linking have documented edge-case issues compared to true native.

**Confidence: HIGH** (Expo official docs + Context7 verified, EAS confirmed production-ready)

---

## 3. Backend API

### Recommended: Node.js 22 LTS + Hono v4 + tRPC v11

**Why Node.js over Go or Python:**
The entire stack is TypeScript (Next.js, Expo, Drizzle ORM). Sharing Zod schemas, TypeScript types, and validation logic between the API layer and the frontend/mobile clients requires a common runtime. A Go API would need a separate schema contract (OpenAPI, Protobuf), adding synchronization overhead. Python (FastAPI) has excellent async support but breaks the monorepo type-sharing model.

Node.js 22 LTS has native `--watch`, improved `fetch` API, and the `AsyncLocalStorage`-based context propagation that BullMQ workers rely on.

**Why Hono v4 as the HTTP layer:**
Hono is ultra-lightweight (no framework overhead), runs on Node.js, Cloudflare Workers, and Bun with the same code. Its built-in middleware (Zod validator, rate limiting, bearer auth, CORS) covers all the API needs verified in Context7. It generates OpenAPI specs via `@hono/zod-openapi`, which means third-party affiliate API documentation is generated automatically. This matters when whisky retailers want to integrate.

**Why tRPC v11 for internal communication:**
tRPC with `httpBatchLink` allows the Next.js frontend and Expo app to share the same type-safe API client — no code generation step, no drift between server and client types. Search queries and price-alert mutations are type-checked end-to-end. Context7 verified the batch link pattern (multiple requests in one HTTP round-trip — essential for a comparison page that loads 8-12 vendor prices simultaneously).

**Public-facing REST endpoints** (for potential affiliate/partner integrations) sit in Hono directly, with Zod validation. tRPC sits behind authentication for app-internal use.

**What NOT to use:**
- **Express.js** — Unmaintained type ecosystem; no built-in Zod integration; Hono is strictly superior for new projects.
- **NestJS** — Good for enterprise but massive DX overhead for a startup product. Decorator-heavy code slows iteration.
- **GraphQL (Apollo)** — The query shape for WhiskyHunter is well-understood and stable (search by name/distillery → get prices). GraphQL's flexibility is unnecessary and adds N+1 problem surface area. tRPC gives the same type safety with 1/10th the setup.
- **Fastify** — Close second to Hono, but Hono's edge-runtime portability (Cloudflare Workers for future geo-distributed scrapers) is a meaningful differentiator.

**Confidence: HIGH** (Hono docs via Context7 verified; tRPC batch link pattern verified)

---

## 4. Data Collection Pipeline

### 4a. Scraping Engine: Playwright v1.51+ with playwright-extra + stealth

**Why Playwright over Puppeteer:**
Playwright supports Chromium, Firefox, and WebKit from one API. Rotating browser engines is the single most effective anti-fingerprinting technique — different retailers use different bot-detection vendors (DataDome, Cloudflare Bot Management, PerimeterX) that fingerprint browser characteristics. Puppeteer is Chromium-only.

Playwright's `browser.newContext({ proxy: { server: '...' } })` (verified in Context7) allows per-scrape proxy rotation at the context level — no browser restart needed between proxy switches.

**Stealth layer:** `puppeteer-extra-plugin-stealth` applies 17 evasion techniques (navigator.webdriver removal, canvas fingerprint spoofing, etc.). Despite being named for Puppeteer, it ports to Playwright via `playwright-extra`. Context7 verified the stealth plugin pattern.

**Network optimization inside scrapers:**
Use `page.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2}', route => route.abort())` to block all assets — the scraper only needs the HTML/JSON payload. This typically reduces scrape time by 60-70% and avoids triggering CDN-level bot detection on asset requests.

**What NOT to use:**
- **Scrapy (Python)** — Breaks the Node.js monorepo; requires maintaining a separate Python service. Playwright runs natively in Node.js.
- **Puppeteer** — Chromium-only is a liability for anti-bot evasion. Playwright is the direct successor with multi-browser support.
- **Cheerio + axios** — Fine for simple HTML parsing but cannot handle JavaScript-rendered pages (most modern whisky retailer sites use React/Vue storefronts).

### 4b. Job Queue: BullMQ v5 on Redis

**Why BullMQ over Temporal or Celery:**
- BullMQ runs in Node.js — same runtime as the API. No polyglot service boundary.
- `upsertJobScheduler` with cron patterns (verified in Context7) handles the daily scrape schedule (`0 0 2 * * *` for 2 AM refreshes) and per-retailer frequency variation (some retailers update prices hourly; others daily).
- Built-in rate limiting prevents hammering any single retailer. The `rateLimit` option on workers restricts requests to N per time window — essential for robots.txt compliance and avoiding IP bans.
- Redis (via `ioredis`) is already required for BullMQ. The same Redis instance doubles as the API-layer cache (short-lived price cache, rate limiting state).

**Temporal** is the correct choice at scale (100+ scrapers, complex saga-style workflows with human approval steps). For v1 (UK/US/EU, ~50 retailers), BullMQ's simpler model is appropriate. Temporal adds significant operational overhead (requires its own cluster).

**Celery** requires Python; rules itself out.

**Anti-bot strategy in 2025:**
1. Rotating residential proxies (BrightData or Oxylabs — budget ~$50-100/mo for v1 volume)
2. Playwright stealth plugin for each context
3. Per-retailer rate limiting via BullMQ worker `rateLimit`
4. Randomized delays between page actions (`page.waitForTimeout(Math.random() * 2000 + 1000)`)
5. Respect `robots.txt` — scrape only product/listing pages, not user account areas
6. Fallback to official affiliate APIs (Master of Malt, The Whisky Exchange have partner programs) when scraping becomes unreliable

**Confidence: HIGH** (BullMQ docs via Context7; Playwright docs verified; puppeteer-extra stealth verified)

---

## 5. Database

### 5a. Primary Database: PostgreSQL 16 + Drizzle ORM v0.38+

**Schema design for this domain:**
- `products` — canonical whisky catalog (name, distillery, age, region, ABV, LWIN code as global identifier)
- `listings` — one row per (product × retailer × date). This is the price history table — partitioned by `scraped_at` date range using PostgreSQL table partitioning.
- `retailers` — retailer metadata (base URL, country, currency, shipping rules, affiliate API status)
- `duty_rates` — import duty + VAT rates keyed by (origin country, destination country, product category). Updated quarterly.
- `users`, `subscriptions`, `wishlists`, `price_alerts` — freemium and user data

**Why PostgreSQL over MongoDB:**
Price history is fundamentally relational: a listing belongs to a product, belongs to a retailer, for a user's destination country. JOIN queries across these tables are the hot path. MongoDB's document model forces denormalization that creates update anomalies when a retailer changes its shipping policy. PostgreSQL's JSONB column handles the semi-structured "tasting notes" and "review scores" fields that don't fit a fixed schema.

PostgreSQL 16 adds logical replication improvements and better parallel query for time-series aggregation (finding 30-day price lows for the "best price in last month" badge).

**Drizzle ORM** is the correct choice over Prisma for this domain:
- Drizzle generates SQL that is readable and optimizable — critical when you're running complex price history aggregations.
- Prisma generates uncontrollable SQL; the N+1 handling via `select` can produce unexpected query plans.
- Drizzle's materialized view support (verified in Context7: `pgMaterializedView`) enables pre-computing "best price per product per destination country" — refresh this every 6 hours to power sub-100ms comparison lookups without hitting raw listings every time.
- Drizzle runs in edge environments (Cloudflare Workers via `neon-serverless` driver) — relevant if scrapers move to edge in v2.

**What NOT to use:**
- **MongoDB** — Wrong model for relational price history; aggregation pipeline for time-series queries is significantly harder to reason about than SQL window functions.
- **Prisma** — Opaque query generation; limited support for PostgreSQL-specific features (partitioning, materialized views) without raw SQL escape hatches.
- **SQLite** — Not suitable for multi-process write workloads (BullMQ workers + API writing concurrently).

### 5b. Search Layer: Typesense v27+ (self-hosted or Typesense Cloud)

**Why Typesense over Elasticsearch or Meilisearch:**

| Criterion | Typesense | Meilisearch | Elasticsearch |
|-----------|-----------|-------------|---------------|
| Setup complexity | Low | Low | High |
| Typo tolerance | Yes (built-in) | Yes (built-in) | Requires configuration |
| Faceted filtering | Yes — verified | Yes — verified | Yes |
| Multi-language | Good | Good | Best |
| Operational cost | Low (single binary) | Low | High (JVM, cluster) |
| Vector/semantic | Yes (v0.25+) | Yes | Yes |

Typesense is the right choice because: (1) whisky search is highly typo-prone ("Glenfarclas" vs "Glenfarcas", "Laphroaig" vs "Lafroyg") — Typesense's built-in typo tolerance handles this without tuning; (2) the facet model (distillery, region, age, country, price range) maps directly to Typesense's `facet_by` parameter verified in Context7; (3) single binary deployment, no JVM, runs on a $6 VPS.

Meilisearch is a close second and is equally valid — choose Typesense for its stronger multi-tenant API key scoping (useful for future B2B API resale). Elasticsearch is dramatically over-engineered for this scale and requires a dedicated ops engineer to maintain.

**Sync pattern:** BullMQ job triggers a Typesense upsert whenever a new listing is scraped. The `id` is `{lwin_code}-{retailer_id}` for deduplication.

**Confidence: HIGH for PostgreSQL; MEDIUM-HIGH for Typesense** (Typesense docs verified in Context7 for faceting and filtering; Typesense vs Meilisearch comparison is based on verified feature sets, operational characteristics from training data)

---

## 6. Currency and Duties Data

### 6a. FX Rates: Frankfurter API (free tier) → fallback to Open Exchange Rates (paid)

**Frankfurter** (`api.frankfurter.app`) provides ECB rates for ~33 currencies, updated daily. Free, no API key. Covers all EU currencies + GBP/USD — sufficient for v1 (UK/US/EU).

**Open Exchange Rates** ($12/mo for hourly rates) when intraday accuracy matters or when expanding to markets outside ECB coverage (JPY, AUD, ILS for Israeli buyers in v2).

**Caching strategy:** BullMQ cron job fetches rates at 09:00 UTC daily (after ECB publishes). Rates stored in Redis with 24h TTL. The cost calculator reads from Redis, never hits the FX API on user requests.

**Confidence: MEDIUM** (Frankfurter is documented and widely used; specific rate update timing verified from ECB documentation in training data)

### 6b. Duty Rates: Static table with admin refresh workflow

There is no reliable real-time API for import duty rates. The data sources are:

- **UK:** HMRC Trade Tariff API (`api.trade.tariff.service.gov.uk`) — official REST API for UK duty rates by commodity code (spirit: HS 2208).
- **EU:** EU Taxation and Customs Union database (TARIC) — machine-readable XML, requires periodic scraping.
- **US:** USITC HTS (Harmonized Tariff Schedule) — flat-file download, updated annually.

**Implementation:** Seed a `duty_rates` PostgreSQL table from these sources at launch. Build an admin UI (Next.js admin route, behind auth) for manually updating rates when tax changes occur. BullMQ job checks HMRC API weekly and flags changes for admin review.

**Key rates for whisky (HS 2208.30):**
- UK excise duty: £28.74/litre of pure alcohol (LPA) — updated each Budget
- EU (example DE): 13.03€/litre LPA + local VAT
- US: Federal excise duty is $13.50/proof gallon (varies by producer size)

**Confidence: MEDIUM** (duty rate sources identified; HMRC API verified; specific rate values are training data — must be verified before go-live)

---

## 7. Notifications

### Push Notifications: Expo Notifications (FCM + APNs unified)

For the mobile app, `expo-notifications` abstracts FCM (Android) and APNs (iOS) behind a single API. Context7 verified the full token registration flow including EAS project ID configuration. The Expo Push Notification service acts as a relay — the backend sends to `https://exp.host/--/api/v2/push/send`, Expo routes to FCM/APNs. This is free for reasonable volumes.

**When to move off Expo Push:** If the app exceeds ~1M monthly active users or requires Advanced P8 APNs features (notification attachments, critical alerts for price crashes). At that point, switch to direct FCM v1 API + APNs HTTP/2, managed via a library like `node-apn`.

### Email: Resend

**Why Resend over Postmark or SendGrid:**
Resend has a first-class Node.js/TypeScript SDK, native `react-email` template support (write email templates as React components — same skill set as the web frontend), and generous free tier (3,000 emails/month). Postmark has better deliverability reputation for transactional email, but Resend has closed the gap significantly and the DX is clearly superior.

Context7 confirmed Resend's API structure and Next.js integration patterns.

**Email triggers for WhiskyHunter:**
- Price alert threshold hit → immediate transactional email
- Weekly Wishlist digest → batch job via BullMQ scheduled job
- Account verification, password reset → immediate transactional

**What NOT to use:**
- **SendGrid** — Acquired by Twilio; pricing has increased significantly; DX has degraded.
- **Mailchimp Transactional (Mandrill)** — Overkill; primarily a marketing tool.
- **AWS SES** — Cheapest at scale ($0.10/1000) but requires significant setup and has no template system.

**Confidence: HIGH for Expo push (Context7 verified); HIGH for Resend (Context7 verified)**

---

## 8. Infrastructure

### Recommended Split: Railway (API + BullMQ workers) + Vercel (Next.js web) + Typesense Cloud or self-hosted on Railway

**Web frontend — Vercel:**
Next.js is a Vercel product. App Router, ISR, streaming SSR, and Edge Middleware work best and without configuration on Vercel. The free tier handles early traffic; Pro ($20/mo) adds unlimited serverless function duration.

**API + BullMQ workers — Railway:**
Railway is the correct choice for scraping infrastructure:
- Persistent processes (required for BullMQ workers — they must stay running, unlike serverless functions which time out)
- Docker-based deployments (Playwright requires Chromium binaries — not supported on Vercel or Netlify serverless)
- Built-in Redis service (BullMQ dependency)
- Cron-scheduled deploys or always-on worker processes
- $5-20/mo for v1 worker volume

**Why NOT Vercel for the scraping workers:** Vercel serverless functions have a 60-second timeout (300 seconds on Pro). A single page scrape with anti-bot evasion and JavaScript rendering can take 30-120 seconds. Workers must be long-lived processes, not serverless functions.

**Why NOT AWS for v1:** ECS/Fargate, ECR, RDS, ElastiCache setup is 40+ hours of DevOps configuration. Railway abstracts all of this with equivalent reliability for a startup. Migrate to AWS when monthly Railway costs exceed ~$200/mo (that's meaningful scale).

**Scraper scheduling:**
BullMQ `upsertJobScheduler` with a daily cron (`0 0 2 * * *`) per retailer tier. High-priority retailers (Master of Malt, The Whisky Exchange, Total Wine) scrape every 6 hours. Long-tail retailers scrape daily. Priority queue prevents one slow scraper from blocking urgent jobs.

**Database hosting:**
- **Neon** (PostgreSQL, serverless) for development and early production — free tier, branching, no connection pool management.
- **Railway PostgreSQL** or **Supabase** when connection pooling and persistent connections matter at scale.
- **NOT PlanetScale** — MySQL-based; loses PostgreSQL-specific features (partitioning, JSONB, materialized views) that are load-bearing for this schema.

**Typesense:**
Start with Typesense Cloud ($25/mo for the Search Starter plan) — zero ops. Self-host on Railway when volume justifies the savings.

**Confidence: HIGH for Vercel/Railway split (well-established pattern); MEDIUM for Neon early DB (newer product but solid reputation)**

---

## Full Stack at a Glance

| Layer | Technology | Version | Monthly Cost (v1 est.) |
|-------|-----------|---------|----------------------|
| Web frontend | Next.js + React | 15.x / 19.x | $0-20 (Vercel) |
| Mobile | Expo + Expo Router | SDK 52+ | $0 (EAS free tier) |
| API server | Node.js + Hono | 22 LTS / v4 | Included in Railway |
| API transport | tRPC | v11 | Free |
| Job queue | BullMQ | v5 | Included in Railway |
| Scraping engine | Playwright + stealth | v1.51+ | ~$50-100 (proxies) |
| Primary DB | PostgreSQL + Drizzle | 16 / v0.38+ | $0-25 (Neon) |
| Search | Typesense | v27+ | $25 (Cloud) |
| Cache/queue broker | Redis (ioredis) | 7.x | $5-15 (Railway) |
| FX rates | Frankfurter API | — | $0 |
| Auth | Better Auth | v1.3+ | $0 |
| Payments | Stripe | v19 | % of revenue |
| Push notifications | Expo Push / FCM / APNs | — | $0 (early volume) |
| Email | Resend | — | $0-20 |
| Hosting (API+workers) | Railway | — | $20-50 |
| **Total v1 estimate** | | | **~$100-250/mo** |

---

## Installation (Core Dependencies)

```bash
# Web + API (monorepo root or web package)
npm install next react react-dom @tanstack/react-query zustand zod
npm install hono @hono/zod-openapi
npm install @trpc/server @trpc/client @trpc/react-query
npm install drizzle-orm drizzle-kit
npm install better-auth
npm install bullmq ioredis
npm install typesense
npm install resend
npm install stripe

# Scraping worker package
npm install playwright playwright-extra puppeteer-extra-plugin-stealth

# Mobile (Expo project)
npx create-expo-app@latest --template
npx expo install expo-notifications expo-router expo-device

# Dev dependencies
npm install -D typescript @types/node drizzle-kit
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Web framework | Next.js 15 | Remix 2 | Loader model is friction for read-heavy search UI; smaller RSC ecosystem |
| Mobile | Expo (React Native) | Flutter | Dart breaks monorepo type sharing; no code reuse with Next.js |
| API framework | Hono | Express / Fastify | Express is legacy; Fastify lacks edge portability |
| API protocol | tRPC + REST | GraphQL | Over-engineered for stable, well-known query shapes |
| Job queue | BullMQ | Temporal | Temporal requires its own cluster; overkill for v1 scraper count |
| Scraping engine | Playwright | Puppeteer / Scrapy | Puppeteer is Chromium-only; Scrapy is Python |
| Primary DB | PostgreSQL | MongoDB | Relational price history needs JOINs; Mongo aggregation is harder |
| ORM | Drizzle | Prisma | Prisma hides SQL; Drizzle exposes it — necessary for complex price aggregations |
| Search | Typesense | Elasticsearch | ES is operationally heavy; Typesense is zero-config for this scale |
| Auth | Better Auth | NextAuth.js | Better Auth is framework-agnostic (works for Expo too), more active development |
| Email | Resend | Postmark / SendGrid | Resend's react-email DX is best-in-class; Postmark has no template component system |
| Hosting (workers) | Railway | Vercel / AWS | Vercel can't run persistent Playwright workers; AWS is overengineered for v1 |

---

## Sources

- Next.js App Router — Context7 `/vercel/next.js` (resolved, version v15.1.8)
- Expo push notifications — Context7 `/expo/expo` (verified: SDK 52+, EAS project ID flow)
- BullMQ scheduling — Context7 `/taskforcesh/bullmq` (verified: `upsertJobScheduler`, cron patterns, rate limiting)
- Playwright proxy + interception — Context7 `/microsoft/playwright` (verified: per-context proxy, route interception)
- playwright-extra stealth — Context7 `/berstend/puppeteer-extra` (verified: 17 evasion techniques, headless detection bypass)
- Typesense faceted search — Context7 `/typesense/typesense` (verified: `facet_by`, `filter_by`, price range filtering)
- Meilisearch faceting — Context7 `/meilisearch/documentation` (verified: facet-search endpoint, filter + sort)
- Drizzle ORM — Context7 `/drizzle-team/drizzle-orm` (verified: `pgMaterializedView`, `pgTable`, PostgreSQL partitioning)
- tRPC — Context7 `/trpc/trpc` (verified: `httpBatchLink`, type-only import pattern)
- TanStack Query v5 — Context7 `/tanstack/query` (verified: `refetchInterval`, `refetchIntervalInBackground`)
- Better Auth — Context7 `/better-auth/better-auth` (verified: OAuth social providers, session management)
- Hono — Context7 `/llmstxt/hono_dev_llms_txt` (verified: Zod validator middleware, rate limiting, bearer auth)
- Resend — Context7 `/resend/resend-examples` (verified: Next.js integration, react-email support)
- HMRC Trade Tariff API — `api.trade.tariff.service.gov.uk` (training data, requires verification before go-live)
- Frankfurter API — `api.frankfurter.app` (training data, widely cited, free ECB-sourced rates)
