# WhiskyHunter

## What This Is

WhiskyHunter is a cross-platform search and price comparison tool for whisky buyers worldwide. It aggregates product listings from global retailers, distilleries, and alcohol stores (UK, US, EU and beyond), and calculates the **true total cost** of purchase including shipping, duties, taxes, insurance, and currency conversion — so users see exactly what they'll pay, not just the shelf price. Available as a web application and mobile app (iOS + Android).

## Core Value

Show the true all-in cost of buying any whisky from anywhere in the world — every hidden fee surfaced, every source compared — so the buyer never pays more than they should.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Core Search & Comparison**
- [ ] User can search for any whisky by name, distillery, age, region, or style
- [ ] Search returns results aggregated from multiple global sources (retailers, distilleries, marketplaces)
- [ ] Each result shows base price, shipping cost, duties/taxes, insurance, currency conversion, and total cost
- [ ] User can sort and filter results by: total cost, source country, availability, age, distillery, region, taste profile, price range
- [ ] User can view side-by-side comparison of the same whisky from multiple vendors

**Total Cost Calculator**
- [ ] System calculates shipping cost per vendor to user's destination country
- [ ] System calculates import duty and VAT/tax based on destination country and bottle value
- [ ] System calculates shipping insurance cost for high-value bottles
- [ ] System applies real-time currency conversion for cross-currency purchases
- [ ] All cost components displayed transparently (line-by-line breakdown)

**Wishlist & Tracking**
- [ ] User can save whiskies to a personal Wishlist
- [ ] User can set a target price per whisky and receive alerts when price drops to target
- [ ] User can view Wishlist with current best prices updated on each visit

**Price Alerts**
- [ ] User receives push notifications (mobile) and email alerts when tracked whisky price changes
- [ ] User can configure alert threshold (% drop or absolute price)

**Reviews & Ratings**
- [ ] Each whisky page displays aggregated scores from Whisky Advocate, SMWS, Jim Murray, Distillery notes
- [ ] User can view tasting notes and reviewer consensus

**Accounts & Monetization**
- [ ] User can register / log in (email + social)
- [ ] Free tier: basic search, price comparison, limited daily searches
- [ ] Premium subscription: unlimited searches, Wishlist, price alerts, full cost breakdown, export

### Out of Scope

- **Direct purchase / checkout** — v1 redirects to the retailer; marketplace integration is v2+
- **User-generated reviews** — aggregating professional reviews is v1; community reviews deferred
- **Auction/secondary market** (Whisky Auctioneer, etc.) — complex pricing model, deferred to v2
- **Israel-only market focus** — starting with UK/US/EU; Israeli import specifics in v2
- **Wine and spirits beyond whisky** — deliberate category focus to avoid scope creep

## Context

- **Domain**: Global whisky retail is fragmented — no single aggregator currently shows true landed cost. Existing tools (whiskybase.com, vinmonopolet APIs, Master of Malt) show shelf price only, not delivery cost.
- **Legal**: Web scraping must respect robots.txt and rate limits. Some retailers (e.g., UK Duty-Free) have formal affiliate APIs. Duty/tax rates change — requires periodic refresh of tax tables.
- **Data freshness**: Prices change daily. Scraping cadence and caching strategy are critical for UX.
- **Alcohol regulations**: Some jurisdictions restrict cross-border alcohol shipping (e.g., US state laws vary). The tool should display warnings, not enable illegal purchases.
- **Market**: Both connoisseurs hunting rare bottles and everyday buyers wanting Johnnie Walker at the best all-in price.

## Constraints

- **Data**: Hybrid collection — APIs where retailers provide them, Playwright/Puppeteer scraping where not; must handle anti-bot measures gracefully
- **Geography**: v1 covers UK + US + EU; global expansion in v2
- **Platform**: Web (desktop-first responsive) + native mobile (iOS + Android) — shared business logic
- **Monetization**: Freemium model — free tier must be genuinely useful to drive signups; premium must offer clear upgrade value
- **Compliance**: Must display alcohol purchase age-verification and cross-border shipping warnings per destination country
- **Performance**: Search results must appear within 3 seconds; price data cached with clear "last updated" timestamp

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hybrid scraping (API + Playwright) | No single API covers enough sources; scraping fills gaps | — Pending |
| Freemium over pure SaaS | Lowers acquisition barrier for both collectors and casual buyers | — Pending |
| Start UK/US/EU | Highest density of online whisky retailers and most API/scraping maturity | — Pending |
| Show total landed cost (not shelf price) | Core differentiator — no competitor does this accurately | — Pending |
| Cross-platform (Web + Mobile) from v1 | Both audiences expect mobile; shared logic reduces duplication | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-03 after initialization*
