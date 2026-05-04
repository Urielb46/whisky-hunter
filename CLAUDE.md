<!-- GSD:project-start source:PROJECT.md -->
## Project

**WhiskyHunter**

WhiskyHunter is a cross-platform search and price comparison tool for whisky buyers worldwide. It aggregates product listings from global retailers, distilleries, and alcohol stores (UK, US, EU and beyond), and calculates the **true total cost** of purchase including shipping, duties, taxes, insurance, and currency conversion — so users see exactly what they'll pay, not just the shelf price. Available as a web application and mobile app (iOS + Android).

**Core Value:** Show the true all-in cost of buying any whisky from anywhere in the world — every hidden fee surfaced, every source compared — so the buyer never pays more than they should.

### Constraints

- **Data**: Hybrid collection — APIs where retailers provide them, Playwright/Puppeteer scraping where not; must handle anti-bot measures gracefully
- **Geography**: v1 covers UK + US + EU; global expansion in v2
- **Platform**: Web (desktop-first responsive) + native mobile (iOS + Android) — shared business logic
- **Monetization**: Freemium model — free tier must be genuinely useful to drive signups; premium must offer clear upgrade value
- **Compliance**: Must display alcohol purchase age-verification and cross-border shipping warnings per destination country
- **Performance**: Search results must appear within 3 seconds; price data cached with clear "last updated" timestamp
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## 1. Web Frontend
### Recommended: Next.js 15 (App Router) with React 19
- **Search results page:** Server Component for initial render (SSR via React Server Components), then TanStack Query v5 for client-side re-fetching and polling. This hits the 3-second requirement: the server renders the first meaningful result set, client-side query handles cache refresh without a full reload.
- **Product detail / cost breakdown page:** SSR — price data must be fresh on load, not stale from client cache.
- **Wishlist / alerts:** Full CSR after auth check. These are user-specific, non-indexable, and benefit from React Query's polling (`refetchInterval`) for live price monitoring.
- **Landing, static content:** Static generation (SSG). No server overhead.
- **Remix 2.x** — Good DX but loader-centric model is friction for complex search state management. Smaller ecosystem of RSC-compatible component libraries.
- **Gatsby** — SSG-first, actively declining for dynamic data apps.
- **Vue/Nuxt or SvelteKit** — No reason to diverge from the React ecosystem when the mobile layer (Expo) is also React-based. Shared component primitives and validation schemas across web/mobile would be lost.
- **TanStack Query v5** — Background polling for price freshness; `refetchIntervalInBackground: true` keeps Wishlist prices live even when the tab is backgrounded (verified in Context7 docs).
- **Zustand v5** — Lightweight global state for search filters, comparison tray (selected whiskies), and freemium gate UI state. No need for Redux-scale complexity.
- **Zod** — Schema validation shared between frontend forms and backend API contracts.
## 2. Mobile
### Recommended: Expo SDK 52+ with Expo Router (React Native)
- Expo Router provides file-based navigation that mirrors Next.js App Router — same mental model for the team, and it generates universal links (deep links work identically on web and native).
- `expo-notifications` handles both FCM (Android) and APNs (iOS) through a unified API. Context7 docs confirm the full token registration flow, including `projectId` from EAS config — critical for the price alert feature.
- EAS Build produces production iOS/Android binaries without maintaining local macOS CI. For a greenfield project, this removes months of CI/CD setup.
- OTA updates (EAS Update) allow pushing JS bundle patches without app store review — useful for price logic or duty-rate table corrections.
- **Flutter** — Dart is a separate language; zero code sharing with the Next.js web frontend. The TypeScript monorepo advantage disappears entirely.
- **React Native CLI (bare)** — More flexibility but significantly higher DevOps burden. EAS handles what would otherwise be Fastlane + custom CI scripts.
- **Capacitor/Ionic** — Web wrapper, not native. Acceptable for simple CRUD, but price alert push notifications and deep linking have documented edge-case issues compared to true native.
## 3. Backend API
### Recommended: Node.js 22 LTS + Hono v4 + tRPC v11
- **Express.js** — Unmaintained type ecosystem; no built-in Zod integration; Hono is strictly superior for new projects.
- **NestJS** — Good for enterprise but massive DX overhead for a startup product. Decorator-heavy code slows iteration.
- **GraphQL (Apollo)** — The query shape for WhiskyHunter is well-understood and stable (search by name/distillery → get prices). GraphQL's flexibility is unnecessary and adds N+1 problem surface area. tRPC gives the same type safety with 1/10th the setup.
- **Fastify** — Close second to Hono, but Hono's edge-runtime portability (Cloudflare Workers for future geo-distributed scrapers) is a meaningful differentiator.
## 4. Data Collection Pipeline
### 4a. Scraping Engine: Playwright v1.51+ with playwright-extra + stealth
- **Scrapy (Python)** — Breaks the Node.js monorepo; requires maintaining a separate Python service. Playwright runs natively in Node.js.
- **Puppeteer** — Chromium-only is a liability for anti-bot evasion. Playwright is the direct successor with multi-browser support.
- **Cheerio + axios** — Fine for simple HTML parsing but cannot handle JavaScript-rendered pages (most modern whisky retailer sites use React/Vue storefronts).
### 4b. Job Queue: BullMQ v5 on Redis
- BullMQ runs in Node.js — same runtime as the API. No polyglot service boundary.
- `upsertJobScheduler` with cron patterns (verified in Context7) handles the daily scrape schedule (`0 0 2 * * *` for 2 AM refreshes) and per-retailer frequency variation (some retailers update prices hourly; others daily).
- Built-in rate limiting prevents hammering any single retailer. The `rateLimit` option on workers restricts requests to N per time window — essential for robots.txt compliance and avoiding IP bans.
- Redis (via `ioredis`) is already required for BullMQ. The same Redis instance doubles as the API-layer cache (short-lived price cache, rate limiting state).
## 5. Database
### 5a. Primary Database: PostgreSQL 16 + Drizzle ORM v0.38+
- `products` — canonical whisky catalog (name, distillery, age, region, ABV, LWIN code as global identifier)
- `listings` — one row per (product × retailer × date). This is the price history table — partitioned by `scraped_at` date range using PostgreSQL table partitioning.
- `retailers` — retailer metadata (base URL, country, currency, shipping rules, affiliate API status)
- `duty_rates` — import duty + VAT rates keyed by (origin country, destination country, product category). Updated quarterly.
- `users`, `subscriptions`, `wishlists`, `price_alerts` — freemium and user data
- Drizzle generates SQL that is readable and optimizable — critical when you're running complex price history aggregations.
- Prisma generates uncontrollable SQL; the N+1 handling via `select` can produce unexpected query plans.
- Drizzle's materialized view support (verified in Context7: `pgMaterializedView`) enables pre-computing "best price per product per destination country" — refresh this every 6 hours to power sub-100ms comparison lookups without hitting raw listings every time.
- Drizzle runs in edge environments (Cloudflare Workers via `neon-serverless` driver) — relevant if scrapers move to edge in v2.
- **MongoDB** — Wrong model for relational price history; aggregation pipeline for time-series queries is significantly harder to reason about than SQL window functions.
- **Prisma** — Opaque query generation; limited support for PostgreSQL-specific features (partitioning, materialized views) without raw SQL escape hatches.
- **SQLite** — Not suitable for multi-process write workloads (BullMQ workers + API writing concurrently).
### 5b. Search Layer: Typesense v27+ (self-hosted or Typesense Cloud)
| Criterion | Typesense | Meilisearch | Elasticsearch |
|-----------|-----------|-------------|---------------|
| Setup complexity | Low | Low | High |
| Typo tolerance | Yes (built-in) | Yes (built-in) | Requires configuration |
| Faceted filtering | Yes — verified | Yes — verified | Yes |
| Multi-language | Good | Good | Best |
| Operational cost | Low (single binary) | Low | High (JVM, cluster) |
| Vector/semantic | Yes (v0.25+) | Yes | Yes |
## 6. Currency and Duties Data
### 6a. FX Rates: Frankfurter API (free tier) → fallback to Open Exchange Rates (paid)
### 6b. Duty Rates: Static table with admin refresh workflow
- **UK:** HMRC Trade Tariff API (`api.trade.tariff.service.gov.uk`) — official REST API for UK duty rates by commodity code (spirit: HS 2208).
- **EU:** EU Taxation and Customs Union database (TARIC) — machine-readable XML, requires periodic scraping.
- **US:** USITC HTS (Harmonized Tariff Schedule) — flat-file download, updated annually.
- UK excise duty: £28.74/litre of pure alcohol (LPA) — updated each Budget
- EU (example DE): 13.03€/litre LPA + local VAT
- US: Federal excise duty is $13.50/proof gallon (varies by producer size)
## 7. Notifications
### Push Notifications: Expo Notifications (FCM + APNs unified)
### Email: Resend
- Price alert threshold hit → immediate transactional email
- Weekly Wishlist digest → batch job via BullMQ scheduled job
- Account verification, password reset → immediate transactional
- **SendGrid** — Acquired by Twilio; pricing has increased significantly; DX has degraded.
- **Mailchimp Transactional (Mandrill)** — Overkill; primarily a marketing tool.
- **AWS SES** — Cheapest at scale ($0.10/1000) but requires significant setup and has no template system.
## 8. Infrastructure
### Recommended Split: Railway (API + BullMQ workers) + Vercel (Next.js web) + Typesense Cloud or self-hosted on Railway
- Persistent processes (required for BullMQ workers — they must stay running, unlike serverless functions which time out)
- Docker-based deployments (Playwright requires Chromium binaries — not supported on Vercel or Netlify serverless)
- Built-in Redis service (BullMQ dependency)
- Cron-scheduled deploys or always-on worker processes
- $5-20/mo for v1 worker volume
- **Neon** (PostgreSQL, serverless) for development and early production — free tier, branching, no connection pool management.
- **Railway PostgreSQL** or **Supabase** when connection pooling and persistent connections matter at scale.
- **NOT PlanetScale** — MySQL-based; loses PostgreSQL-specific features (partitioning, JSONB, materialized views) that are load-bearing for this schema.
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
## Installation (Core Dependencies)
# Web + API (monorepo root or web package)
# Scraping worker package
# Mobile (Expo project)
# Dev dependencies
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
