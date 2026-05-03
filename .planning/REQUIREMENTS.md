# Requirements: WhiskyHunter

**Defined:** 2026-05-03
**Core Value:** Show the true all-in cost of buying any whisky from anywhere in the world — every hidden fee surfaced, every source compared — so the buyer never pays more than they should.

## v1 Requirements

### Data Pipeline (DATA)

- [ ] **DATA-01**: System collects whisky listings from at least 10 major UK/US/EU retailers via hybrid pipeline (Playwright scraping + official APIs where available)
- [ ] **DATA-02**: System maintains a canonical product registry that deduplicates listings of the same whisky across sources (e.g. "Glenfarclas 15" = "Glenfarclas Fifteen Year Old")
- [ ] **DATA-03**: System stores price snapshots as append-only records — never overwrites historical prices
- [ ] **DATA-04**: System refreshes prices on a scheduled daily cadence with per-source health monitoring (alert if scraper fails)
- [ ] **DATA-05**: Each listing displays a visible "last updated" timestamp; listings older than 48 hours are visually flagged as stale

### Search & Catalog (SRCH)

- [ ] **SRCH-01**: User can search for any whisky by name with typo-tolerance and autocomplete
- [ ] **SRCH-02**: User can filter results by: distillery, region (Speyside, Islay, Bourbon, etc.), age, ABV, cask type, price range, source country
- [ ] **SRCH-03**: Search returns results within 3 seconds for any query
- [ ] **SRCH-04**: User can view a product detail page showing all vendor listings for a specific whisky, sorted by total cost
- [ ] **SRCH-05**: User can sort results by: lowest total cost, base price, professional rating, age
- [ ] **SRCH-06**: Each product page displays aggregated professional scores (Whisky Advocate, Jim Murray Whisky Bible) and tasting notes summary

### Cost Calculator (COST)

- [ ] **COST-01**: Each listing shows a line-by-line cost breakdown: shelf price + shipping + import duty + VAT/tax + currency conversion fee + optional insurance
- [ ] **COST-02**: User can set their destination country and see all costs calculated for that destination
- [ ] **COST-03**: System applies correct duty rates: UK (LPA-basis post Aug 2023 reform), EU (harmonised + member-state rates), US (FET + state excise)
- [ ] **COST-04**: System applies real-time FX conversion using cached mid-market rates (max 1-hour staleness), with visible retail spread disclaimer
- [ ] **COST-05**: System displays clear shipping restriction warnings for US states and other jurisdictions that prohibit cross-border alcohol delivery

### Authentication (AUTH)

- [ ] **AUTH-01**: User can register with email and password
- [ ] **AUTH-02**: User receives email verification after signup
- [ ] **AUTH-03**: User can log in and remain logged in across sessions
- [ ] **AUTH-04**: User can reset password via email link
- [ ] **AUTH-05**: Age gate on entry — user must confirm they are 18+ (21+ for US users) before accessing the platform

### Freemium & Subscriptions (FREQ)

- [ ] **FREQ-01**: Free tier provides basic search and price comparison (up to 50 searches/day, basic cost breakdown)
- [ ] **FREQ-02**: Premium tier unlocks: unlimited searches, full landed-cost breakdown, Wishlist, price alerts, data export
- [ ] **FREQ-03**: User can subscribe to Premium via Stripe with monthly and annual billing options
- [ ] **FREQ-04**: Premium features are gated in the UI with clear upgrade prompts (not hidden)

### Wishlist & Tracking (WISH)

- [ ] **WISH-01**: Premium user can add whiskies to a personal Wishlist
- [ ] **WISH-02**: Wishlist displays current best total cost per item, refreshed on each visit
- [ ] **WISH-03**: User can remove items from Wishlist
- [ ] **WISH-04**: User can set a target price per Wishlist item to trigger an alert

### Price Alerts (ALRT)

- [ ] **ALRT-01**: Premium user receives email notification when a tracked whisky's total cost drops below their target price
- [ ] **ALRT-02**: Mobile app user receives push notification (FCM/APNs) for the same event
- [ ] **ALRT-03**: Alerts only fire on price data fresher than 12 hours (stale data cannot trigger alerts)
- [ ] **ALRT-04**: Alert re-notification rate-limited to once per 24 hours per (user × product) pair

### Compliance (COMP)

- [ ] **COMP-01**: Platform displays alcohol purchase legal age per destination country
- [ ] **COMP-02**: Platform displays clear warning when a shipping route is legally restricted (e.g. certain US states)
- [ ] **COMP-03**: Platform links to retailer for purchase — no in-app payment or checkout for alcohol

### Web Application (WEB)

- [ ] **WEB-01**: Web app is responsive and usable on desktop (1280px+) and tablet (768px+)
- [ ] **WEB-02**: Search results page first meaningful paint within 3 seconds on standard broadband
- [ ] **WEB-03**: All core search and comparison features accessible without login (free tier)

### Mobile Application (MOB)

- [ ] **MOB-01**: iOS app published on the App Store
- [ ] **MOB-02**: Android app published on Google Play
- [ ] **MOB-03**: Mobile app supports push notifications for price alerts
- [ ] **MOB-04**: Mobile app shares core search, product detail, Wishlist, and alert features with web

## v2 Requirements

### Secondary Market & Auctions

- **AUCT-01**: Integration with Whisky Auctioneer and similar secondary market platforms
- **AUCT-02**: Historical auction price data displayed alongside retail prices

### Direct Purchase

- **PURCH-01**: In-app purchase flow with selected retailer partnerships (affiliate checkout)
- **PURCH-02**: Single cart across multiple retailers

### Community

- **COMM-01**: User can submit personal tasting notes and ratings
- **COMM-02**: User can follow other collectors' Wishlists
- **COMM-03**: Community price confirmation ("I bought this for X")

### Additional Markets

- **MKT-01**: Israeli import rules, local duty rates, and local retailer coverage
- **MKT-02**: Asia-Pacific coverage (Japan, Australia, Singapore)

### Advanced Analytics

- **HIST-01**: Price history chart per product (90-day trend) — requires 90 days of stored data before display
- **HIST-02**: "Best time to buy" recommendation based on price history patterns

### Platform Expansion

- **EXP-01**: Support for Scotch whisky cask purchases (whole cask from distilleries)
- **EXP-02**: Rum and gin coverage (same infrastructure, different categories)

## Out of Scope

| Feature | Reason |
|---------|--------|
| In-app alcohol checkout | Legal complexity; v1 redirects to retailer |
| User-generated reviews | Aggregate professional reviews only in v1; community reviews v2 |
| Israel-specific market | Start with UK/US/EU; Israeli import specifics in v2 |
| Wine and other spirits | Deliberate whisky-only focus to avoid catalog scope creep |
| WhiskyBase scraping | Legal uncertainty; use as cross-reference only if API available |
| Real-time live pricing | Prices cached with timestamps; sub-minute refresh is over-engineered for v1 |
| Price history charts | Need 60-90 days of stored data before display is meaningful; deferred to v2 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 1 | Pending |
| DATA-05 | Phase 1 | Pending |
| SRCH-01 | Phase 2 | Pending |
| SRCH-02 | Phase 2 | Pending |
| SRCH-03 | Phase 2 | Pending |
| SRCH-04 | Phase 2 | Pending |
| SRCH-05 | Phase 2 | Pending |
| SRCH-06 | Phase 2 | Pending |
| COST-01 | Phase 3 | Pending |
| COST-02 | Phase 3 | Pending |
| COST-03 | Phase 3 | Pending |
| COST-04 | Phase 3 | Pending |
| COST-05 | Phase 3 | Pending |
| AUTH-01 | Phase 4 | Pending |
| AUTH-02 | Phase 4 | Pending |
| AUTH-03 | Phase 4 | Pending |
| AUTH-04 | Phase 4 | Pending |
| AUTH-05 | Phase 4 | Pending |
| FREQ-01 | Phase 4 | Pending |
| FREQ-02 | Phase 4 | Pending |
| FREQ-03 | Phase 4 | Pending |
| FREQ-04 | Phase 4 | Pending |
| WISH-01 | Phase 4 | Pending |
| WISH-02 | Phase 4 | Pending |
| WISH-03 | Phase 4 | Pending |
| WISH-04 | Phase 4 | Pending |
| ALRT-01 | Phase 5 | Pending |
| ALRT-02 | Phase 5 | Pending |
| ALRT-03 | Phase 5 | Pending |
| ALRT-04 | Phase 5 | Pending |
| COMP-01 | Phase 3 | Pending |
| COMP-02 | Phase 3 | Pending |
| COMP-03 | Phase 1 | Pending |
| WEB-01 | Phase 6 | Pending |
| WEB-02 | Phase 6 | Pending |
| WEB-03 | Phase 6 | Pending |
| MOB-01 | Phase 6 | Pending |
| MOB-02 | Phase 6 | Pending |
| MOB-03 | Phase 6 | Pending |
| MOB-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 43 total
- Mapped to phases: 43
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-03*
*Last updated: 2026-05-03 after initial definition*
