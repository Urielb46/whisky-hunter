# Feature Landscape: Whisky Search & Price Comparison

**Domain:** Global whisky price aggregation and comparison
**Researched:** 2026-05-03
**Overall confidence:** MEDIUM — Web access unavailable; findings from training knowledge
of named competitors (whiskybase.com, wine-searcher.com, masterofmalt.com,
whiskyauctioneer.com, totalwine.com, distillers.com). Confidence is high on
structural features (training knowledge is stable for these established platforms),
medium on exact premium-tier details which evolve.

---

## Table Stakes

Features that every serious buyer expects. Missing any of these and users bounce
immediately — they don't complain, they leave.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Text search with autocomplete | Every e-commerce baseline since 2010; Wine-Searcher does it, Google trained users | Low | Needs decent whisky name corpus — "Glenfarclas 105" vs "GF105" etc. |
| Faceted filters | Price range, country of origin, distillery, style (Single Malt, Blended, Bourbon, etc.), age statement | Medium | Filter state must survive pagination and sharing via URL |
| Price display in local currency | Users will not mentally convert; Total Wine, MoM, WB all show local prices | Low | Requires FX rate feed; display must say "as of [time]" |
| Per-bottle price (not case price) | Confusion between case and bottle pricing is a top complaint on wine/spirits forums | Low | Always show per-bottle; show case as secondary |
| Product image | Without an image users cannot confirm they found the right bottling | Low | Need fallback for unlisted bottlings |
| Distillery and region labelling | Whisky buyers filter by region (Islay, Speyside, Kentucky) before brand | Low | Taxonomy must be curated — "Highland" vs "Northern Highlands" inconsistency is a known pain |
| ABV display | Legal in most markets; collectors consider < 40% vs 43% vs 46% vs cask strength significant | Low | |
| Age statement (NAS flag) | Age-statement vs NAS is a purchasing criterion for many buyers | Low | Must display "NAS" explicitly, not just omit the field |
| "Buy" / redirect to retailer | Price aggregators are lead generators; user must be able to click through to purchase | Low | Affiliate tracking appended in redirect URL |
| Stock availability indication | Showing price for an out-of-stock product destroys trust | Medium | Staleness is the hard part; need per-source freshness signal |
| Mobile-responsive web | >50% whisky search traffic is mobile; mobile-hostile sites lose half their audience | Low | Responsive is table stakes; native app is differentiator |
| Basic sorting | By price (low to high), by rating, by relevance | Low | |
| "Last updated" timestamp on prices | Whisky prices change daily; showing stale data without a timestamp is a trust killer | Low | Per-listing timestamp, not page-level |
| Age verification gate | Legal requirement in virtually all target markets (UK, US, EU) | Low | Cookie-persisted; GDPR-compliant |

---

## Differentiators

Features that set WhiskyHunter apart. Competitors either lack these or implement them
poorly. These are the reasons users pay and refer friends.

### Tier 1: Core Differentiators (the whole point of the product)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| True landed-cost calculation | No competitor shows all-in cost: shelf + shipping + duty + VAT + insurance + FX. WhiskyBase shows community prices only. Wine-Searcher shows shelf price + estimated shipping but not duties. MoM shows their own price only. | High | Requires: per-country duty tables (UK excise, US federal + state excise, EU excise), shipping rate APIs or flat-rate estimates per carrier/retailer, insurance cost model (typically 1-2% of bottle value), live FX. Duty tables change — need refresh pipeline. |
| Cost breakdown line-by-line | Transparency builds trust; users understand why UK Duty Free isn't always cheapest | Low (UI) | The calculation is the hard part; displaying it is straightforward |
| Cross-border legality warnings | "Shipping to [your state/country] from [retailer country] may be restricted" — no competitor surfaces this cleanly | Medium | Need state/country shipping restriction matrix; must be prominent, not hidden in footer |
| Destination-aware search | Same query returns different vendor rankings depending on where the buyer is located | Medium | Requires geolocation or explicit destination selection; landed cost is only meaningful with a destination |

### Tier 2: Strong Differentiators (hard to replicate quickly)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Price history chart | Wine-Searcher Pro has this for wine; spirits tools largely don't. Shows whether "deal" is actually good. | Medium | Requires storing historical price snapshots per product per retailer. DB grows fast. Start with 90-day window. |
| Wishlist with target price alerts | WhiskyBase has wishlists (community-oriented); Wine-Searcher Pro has alerts. No spirits-focused tool has both combined with landed-cost calculation | Medium | Push notifications (mobile) + email. FCM for Android, APNs for iOS. Trigger on any source hitting target. |
| Multi-source comparison table | Same bottle from 8 retailers shown in one table sorted by landed cost — not just shelf price | Medium | The UX pattern: think Skyscanner flight comparison. WhiskyBase shows community market prices but not retailer comparisons. |
| "Best deal right now" badge | Algorithmically determined cheapest landed cost across all sources, prominently highlighted | Low (UI) | Trust requires the algorithm to actually be right and freshness to be high |
| Saved search / collection tracking | User builds a collection ("bottles I own") separate from wishlist; useful for insurance and trade reference | Medium | Collection is distinct from wishlist — different UX flow |

### Tier 3: Premium Differentiators (monetization hooks)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Export to CSV/PDF | Collectors and buyers managing large orders want data export. Wine-Searcher Pro has this. | Low | CSV of wishlist + current landed costs is high-value for power users |
| Price alert threshold configurability | "Alert me when it drops below £85 landed" vs "alert me on any change" — granularity matters | Low | UI complexity is low; push infrastructure is medium |
| Unlimited daily searches (Premium) | Free tier search limits create upgrade pressure without frustrating casual users | Low | Rate limiting logic needed server-side |
| Retailer trust score / reliability rating | Community-sourced data on whether a retailer ships on time, packages well, resolves problems | High | Network effects required; cold-start problem. Defer to v2 unless early community seeded. |
| Deal score / value rating | "Is this a fair price for this age/region/distillery?" — contextual value signal | Medium | Requires baseline pricing model per category; statistical median vs current listing |

### Tier 4: Whisky-Specific Data (domain depth)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Cask type display | Sherry butt, ex-bourbon, port pipe, virgin oak — core buying criterion for connoisseurs. WhiskyBase has this; most retailers do not. | Low (display) / Medium (data collection) | Data is inconsistently labelled across retailers; requires normalisation |
| Tasting notes aggregation | Jim Murray Whisky Bible scores, Whisky Advocate, SMWS notes — aggregated on one page. No pure-aggregator does this. | Medium | Copyright is a risk for full text; scores + short excerpts likely fair use. Need legal review. |
| Vintage / distillation year | Critical for rare bottles; distinct from age statement | Low | Many retailers don't publish this; WhiskyBase community fills gaps |
| Bottle size variants | 5cl, 20cl, 35cl, 50cl, 70cl, 75cl, 1L — same whisky at different sizes needs deduplication | Medium | Deduplication logic is non-trivial; price-per-cl normalisation useful |
| Independent bottler attribution | IB bottlings (Signatory, Gordon & MacPhail, SMWS) need clear attribution separate from distillery | Medium | Many users search by IB as well as distillery |
| Natural colour / no chill-filter flags | Important quality signals for connoisseurs; inconsistently labelled | Low | Boolean flags; source data quality varies |

---

## Anti-Features

Things competitors do that users hate. Deliberately avoid these.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Shelf price only, no shipping cost | The single biggest complaint about WhiskyBase and Distillers.com listings — users discover extra £20 shipping at checkout | Always show landed cost; if shipping unknown, show "+ shipping est. £X–£Y" range |
| Stale prices with no freshness indicator | Wine-Searcher has been criticised for showing prices weeks out of stock | Per-listing "updated X hours ago" timestamp; grey out listings older than 48 hours |
| Registration wall before first search | Drives bounce; most users won't register for something they haven't seen value from | Allow full search anonymously; paywall specific premium features only |
| Surprise currency conversion at checkout | Showing GBP but redirecting to a EUR checkout; trust-destroying | Be explicit about which currency the retailer charges; show FX-converted estimate |
| Cluttered results with ads mixed in | Total Wine and many comparison sites blend promoted results without clear labelling | Clearly label any promoted/affiliate-priority results; credibility depends on perceived neutrality |
| Bot-blocking popups and cookie banners on every search | Competitors with aggressive cookie consent flows lose mobile users | GDPR-compliant once-per-session consent; remember preference for 1 year |
| Out-of-stock results ranked equally with in-stock | Nothing more frustrating than clicking through to a sold-out page | Filter out-of-stock to bottom by default; allow "include OOS" toggle |
| Price-per-case without per-bottle breakdown | Master of Malt and some retailers show case pricing confusingly | Always lead with per-bottle; case pricing as secondary context |
| Distillery name mismatch / duplicate listings | "Glenfarclas" vs "The Glenfarclas" vs "Glenfarclas Distillery" creates duplicate products — WhiskyBase has thousands of near-duplicates | Curated distillery canonical name dictionary; fuzzy-match deduplication at ingest |
| Review scores from single source | Sole reliance on Jim Murray (who has credibility issues) or a single metric | Show multiple scores (Whisky Advocate, SMWS, community avg) side by side |
| Mobile experience = shrunken desktop | WhiskyBase and many specialist tools have no real mobile UX — tables don't reflow | Mobile-first components: card layout, touch-friendly filters, swipe gestures for comparison |
| No explanation of cost components | Total Wine shows one price; WhiskyBase shows community prices — neither explains what is included | Always show cost breakdown tooltip or expand section |

---

## Feature Dependencies

```
Destination selection → Duty calculation → Landed cost total → Landed cost sorting → Best deal badge
Price history storage → Price history chart → Deal score / value rating
User account → Wishlist → Target price alerts → Push notifications
User account → Saved search → Email digest
Distillery canonical database → Deduplication → Accurate search results → Cask/vintage data display
Retailer scraping pipeline → Stock availability → Freshness timestamps
```

---

## MVP Recommendation

Prioritise these for v1 — they demonstrate core value without which the product has no
differentiation over existing tools:

1. **Text search with autocomplete** — baseline functionality
2. **Faceted filters** (style, region, distillery, age range, price range) — qualification layer
3. **Multi-source results table** — the aggregation value is visible
4. **Landed cost calculation** (shelf + shipping + duty + FX) — the core differentiator
5. **Line-by-line cost breakdown** — transparency builds trust
6. **Cross-border legality warnings** — legal protection + trust signal
7. **"Last updated" timestamps** — honesty about data freshness
8. **Basic wishlist** (free tier, limited items) — retention hook

Defer to v2:
- **Price history chart** — requires historical data accumulation; can't launch with this
- **Retailer trust scores** — cold-start problem; needs community
- **Collection tracking** — useful but not core to search/comparison
- **Auction/secondary market pricing** — explicitly out of scope per PROJECT.md
- **Tasting notes aggregation** — legal review needed; lower priority than price accuracy
- **Export (CSV/PDF)** — premium upsell; build after core is proven

---

## Competitor Feature Matrix

| Feature | WhiskyBase | Wine-Searcher | Master of Malt | WhiskyHunter (planned) |
|---------|-----------|---------------|----------------|------------------------|
| Multi-retailer aggregation | Community prices only | Yes (wine focus) | Own stock only | Yes — core feature |
| Landed cost (all-in) | No | Partial (shelf + est. shipping, no duty) | No | Yes — full breakdown |
| Duty/tax calculation | No | No | No | Yes |
| FX conversion | No | Yes (basic) | GBP only | Yes |
| Price history | No | Pro only (wine) | No | Planned v1.x |
| Wishlist | Yes (community) | Pro only | Yes | Yes (freemium) |
| Price alerts | No | Pro only | No | Yes (premium) |
| Distillery database | Excellent | Poor | Good | Good (curated) |
| Cask type data | Yes | No | Partial | Yes |
| Tasting notes | Community | No | Own notes | Aggregated scores |
| Mobile app | No | Partial | No | Yes — native |
| Stock availability | Partial | Yes | Yes | Yes |
| Cross-border warnings | No | No | No | Yes |

Confidence: MEDIUM — based on training knowledge of these platforms as of mid-2025. Specific
premium tier details may have changed. The matrix accurately reflects architectural choices
(aggregator vs retailer vs community database) which are stable.

---

## Sources

**Note:** Web access was unavailable during this research session. All findings are derived
from training knowledge of the named platforms acquired before August 2025. Confidence on
structural features is HIGH (architecture of these platforms is well-documented). Confidence
on specific pricing/tier details is MEDIUM (these change). Verify current premium tier
details on each competitor before using for positioning copy.

Recommended verification steps before roadmap finalisation:
- Visit wine-searcher.com/wine/spirits to confirm current Pro tier features and price
- Visit whiskybase.com to audit current wishlist and alert capabilities
- Check masterofmalt.com for any aggregation features added post-2025
- Review whiskyauctioneer.com for price history data they surface (auction history)
