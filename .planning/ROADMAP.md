# Roadmap: WhiskyHunter

**Project:** WhiskyHunter — Global whisky search, price comparison, and landed-cost calculator
**Created:** 2026-05-03
**Granularity:** Standard (6 phases)
**v1 Requirements:** 43 total, 43 mapped

---

## Phases

- [ ] **Phase 1: Data Foundation** — Reliable scraping pipeline and canonical product master that can ingest, deduplicate, and store prices from 10+ UK/US/EU retailers
- [ ] **Phase 2: Search & Catalog** — Typesense-powered search with typo tolerance, faceted filters, product detail pages, and aggregated professional ratings
- [ ] **Phase 3: Cost Calculator** — Landed-cost engine that surfaces every fee (duty, VAT, FX, shipping, insurance) with compliance warnings for restricted shipping routes
- [ ] **Phase 4: User Layer & Freemium** — Authentication, Stripe subscriptions, freemium gating, and Wishlist for premium users
- [ ] **Phase 5: Price Alerts** — Alert subscription system with email (Resend) and push (Expo/FCM/APNs) delivery, staleness gating, and rate limiting
- [ ] **Phase 6: Web & Mobile Apps** — Production-ready Next.js web app and Expo iOS/Android apps, App Store / Play Store submission

---

## Phase Details

### Phase 1: Data Foundation
**Goal**: The system can reliably collect, deduplicate, and store whisky listings from 10+ global retailers so that downstream search and cost features have accurate, fresh price data to operate on.
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05
**Success Criteria** (what must be TRUE):
  1. Scrapers successfully collect and parse listings from at least 10 UK/US/EU retailers without blocking, verified by per-source health monitor showing >95% parse success
  2. The same whisky bottle appearing under different names across retailers (e.g. "Glenfarclas 15" vs "Glenfarclas Fifteen Year Old") resolves to a single canonical product record
  3. Each price collection creates a new append-only snapshot row; no historical record is ever overwritten
  4. A failed scraper triggers an automated alert within the monitoring dashboard; the nightly scheduled run completes without unresolved failures
  5. Every listing displays a visible "last updated" timestamp; listings older than 48 hours are rendered with a stale-data visual indicator
**Plans**: 5 plans
Plans:
- [ ] 01-01-PLAN.md — Monorepo bootstrap, pnpm workspaces, Turbo, Vitest infrastructure
- [ ] 01-02-PLAN.md — Drizzle ORM schema (6 tables), Zod RawProduct/NormalizedProduct schemas
- [ ] 01-03-PLAN.md — [BLOCKING] Migration + partition DDL injection + seed retailers + canonical products
- [ ] 01-04-PLAN.md — BullMQ scheduler, Playwright stealth factory, 10 retailer adapters, health emitter
- [ ] 01-05-PLAN.md — Normalizer, entity resolver, staleness utility, API health endpoint, Dockerfile
**Key risks**: Product deduplication is the most irreversible decision; Cloudflare anti-bot blocking on major retailers; append-only schema must be locked before any data enters production

---

### Phase 2: Search & Catalog
**Goal**: Users can find any whisky by name or attribute within 3 seconds, view all vendor listings on a product page, and see aggregated professional scores.
**Depends on**: Phase 1
**Requirements**: SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05, SRCH-06
**Success Criteria** (what must be TRUE):
  1. A user searching for a misspelled whisky name (e.g. "Glenfarcas" or "Ardberg") receives relevant results with autocomplete suggestions
  2. A user can filter results by distillery, region, age, ABV, cask type, price range, and source country; filter state persists across pagination via URL
  3. Search results page first meaningful content arrives within 3 seconds on standard broadband
  4. Clicking a whisky from search results opens a product detail page listing all available vendor sources sorted by total cost
  5. Each product page shows aggregated professional scores from Whisky Advocate and Jim Murray Whisky Bible alongside tasting notes
**Plans**: TBD
**UI hint**: yes

---

### Phase 3: Cost Calculator
**Goal**: Every vendor listing shows a complete line-by-line landed-cost breakdown (shelf price + shipping + duty + VAT + FX + insurance) calculated for the user's destination country, with legal warnings where applicable.
**Depends on**: Phase 2
**Requirements**: COST-01, COST-02, COST-03, COST-04, COST-05, COMP-01, COMP-02, COMP-03
**Success Criteria** (what must be TRUE):
  1. For any listing, a user sees a line-by-line cost breakdown showing: shelf price, shipping, import duty, VAT/tax, currency conversion, insurance, and grand total — each as a separate labeled line
  2. A user who sets their destination country to Germany sees duty and VAT recalculated instantly using EU harmonised rates; a US user sees FET + applicable state excise
  3. UK duty calculations pass spot-check against the HMRC calculator for at least 10 known bottles (LPA-basis verification)
  4. FX rates used for conversion are no older than 1 hour, with a visible "as of [time]" label and mid-market rate disclaimer
  5. When a user browses a vendor shipping to a restricted US state, they see a clear legal warning and the platform links to the retailer rather than facilitating any in-app purchase
**Plans**: TBD
**UI hint**: yes

---

### Phase 4: User Layer & Freemium
**Goal**: Users can create accounts and log in; premium subscribers gain access to unlimited search, full cost breakdown, Wishlist, and price alerts via Stripe billing.
**Depends on**: Phase 3
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, FREQ-01, FREQ-02, FREQ-03, FREQ-04, WISH-01, WISH-02, WISH-03, WISH-04
**Success Criteria** (what must be TRUE):
  1. A new user can register with email and password, receive a verification email, confirm their account, and remain logged in across browser/app restarts
  2. An unverified or unauthenticated visitor must pass an age gate confirming they are 18+ (21+ for US) before accessing search results
  3. A free-tier user hitting 50 searches/day sees a clear upgrade prompt; all premium-only features show gated upgrade CTAs rather than being hidden
  4. A user can subscribe to Premium via Stripe (monthly or annual), immediately gaining Wishlist access, unlimited search, and full cost breakdown
  5. A premium user can add whiskies to their Wishlist, view current best total cost per item on each visit, remove items, and set a target price per item
**Plans**: TBD
**UI hint**: yes

---

### Phase 5: Price Alerts
**Goal**: Premium users receive timely, accurate email and push notifications when a tracked whisky's total cost drops below their target price, with staleness and rate-limit guardrails preventing spam or false alerts.
**Depends on**: Phase 4
**Requirements**: ALRT-01, ALRT-02, ALRT-03, ALRT-04
**Success Criteria** (what must be TRUE):
  1. When a tracked whisky's total cost drops below a user's target price, the user receives an email (via Resend) within minutes of the next scraper cycle
  2. A mobile app user with push notifications enabled receives an FCM/APNs push notification for the same price-drop event
  3. An alert does not fire if the triggering price data is older than 12 hours, even if the price has technically dropped
  4. If the same whisky remains below target across multiple scraper cycles, the user receives at most one re-notification per 24-hour period per (user × product) pair
**Plans**: TBD

---

### Phase 6: Web & Mobile Apps
**Goal**: WhiskyHunter is live on the web and in both app stores, with all v1 features accessible on responsive web, iOS, and Android.
**Depends on**: Phase 5
**Requirements**: WEB-01, WEB-02, WEB-03, MOB-01, MOB-02, MOB-03, MOB-04
**Success Criteria** (what must be TRUE):
  1. The web app is fully usable on desktop (1280px+) and tablet (768px+) without horizontal scroll or broken layouts
  2. Search results page first meaningful paint occurs within 3 seconds on standard broadband for an unauthenticated user
  3. All core search and comparison features (search, filters, product detail, cost breakdown) are accessible without login on the free tier
  4. The iOS app is live on the App Store and the Android app is live on Google Play, each passing platform review
  5. The mobile app delivers push notifications for price alerts and shares all core search, product detail, Wishlist, and alert features with the web
**Plans**: TBD
**UI hint**: yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Foundation | 0/5 | Planned | - |
| 2. Search & Catalog | 0/3 | Not started | - |
| 3. Cost Calculator | 0/3 | Not started | - |
| 4. User Layer & Freemium | 0/3 | Not started | - |
| 5. Price Alerts | 0/2 | Not started | - |
| 6. Web & Mobile Apps | 0/3 | Not started | - |

---

*Roadmap created: 2026-05-03*
*Requirements covered: 43/43*
*Phase 1 plans created: 2026-05-04*
