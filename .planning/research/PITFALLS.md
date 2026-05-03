# Domain Pitfalls: WhiskyHunter

**Domain:** Global price aggregation / alcohol retail / cross-border duty calculation
**Researched:** 2026-05-03
**Confidence:** HIGH (scraping, normalization, FX, mobile patterns) / MEDIUM (duty rates — jurisdiction-specific, verify before shipping)

---

## Critical Pitfalls

Mistakes that force rewrites, generate legal exposure, or cause users to make bad purchasing decisions.

---

### Pitfall 1: Treating Cloudflare as a One-Time Problem

**What goes wrong:** Engineers build scrapers that work in staging, deploy to production, and within 48-72 hours all Cloudflare-protected retailers (the majority of major UK/US spirits retailers) start returning 403s or CAPTCHA walls. The team treats each block as a one-off fix rather than an ongoing arms race. Eventually the scraper is fragile enough that a single Cloudflare ruleset update takes down 30% of data sources simultaneously.

**Why it happens:** Cloudflare Bot Management (Enterprise tier) uses a layered detection model:
- **TLS fingerprinting (JA3/JA4):** The TLS handshake signature of headless Chromium is distinct from real Chrome. Cloudflare recognises this fingerprint and scores it highly. Playwright's default TLS profile is trivially identifiable.
- **Browser fingerprinting (Canvas, WebGL, font enumeration):** Headless browsers return different Canvas hash outputs, have limited font sets, and fail navigator API checks (`navigator.webdriver === true` is the simplest kill signal — any bot check reads this first).
- **Behavioural signals:** Mouse movement entropy, scroll patterns, click timing, and inter-request timing are all anomalous in scrapers. Zero mouse movement before a click is a strong signal.
- **IP reputation:** Residential vs. datacenter IP scoring. All major cloud providers (AWS, GCP, Azure) have their egress IP ranges marked as datacenter in Cloudflare's database. Requests from these ranges start with a high bot score before any other signal is evaluated.
- **Honeypot links:** Some retailers embed invisible links in their HTML (`display: none; visibility: hidden`). Real browsers never click these. Scrapers that follow all `<a>` hrefs trigger them and get permanently blocked at the IP level.
- **Turnstile (replacement for old captcha):** Increasingly deployed on checkout and product pages. Requires a valid browser challenge response — not bypassable with simple HTTP requests.

**Consequences:** Intermittent data gaps, stale prices, silent failures where your scraper returns 200 with a CAPTCHA HTML page that you parse as a product page, corrupting your catalog.

**Warning signs (detect early):**
- Success rate on a retailer drops from ~100% to 60-80% over 2-3 days, then falls further
- Response time for a specific retailer suddenly increases 5-10x (Cloudflare challenge page load)
- Your parser starts seeing HTML with "Just a moment..." or "Checking your browser"
- Product count from a specific source drops by a round number (usually a whole page's worth)

**Prevention strategy:**
1. Use `playwright-extra` with `puppeteer-extra-plugin-stealth` — patches `navigator.webdriver`, Canvas fingerprint, and several other trivial tells. This is table stakes, not a full solution.
2. Route scraper traffic through **residential proxy pools** (Bright Data, Oxylabs, Smartproxy) — these have real ISP-assigned IPs with clean reputation scores. Budget: $100-500/month for the scale needed here.
3. Implement **random jitter in inter-request timing** (not uniform delays — uniform is itself a signal). Use a Poisson distribution around your target cadence.
4. Set realistic **viewport sizes, User-Agent strings that match the TLS fingerprint**, and make sure the TLS profile matches the UA (Chrome 120 UA with Chrome 119 TLS = flagged).
5. Use **Playwright's persistent browser context** to maintain cookies and localStorage across sessions — simulates a returning user rather than a fresh session on every scrape.
6. Build a **per-retailer health monitor**: measure HTTP status codes, response body length, and a "sanity check" (does the response contain the product name?). Alert when a retailer drops below 95% success rate.
7. Have a **fallback hierarchy per retailer**: primary (Playwright), secondary (simple HTTP + cheerio if the retailer doesn't use JS rendering), tertiary (cached last-known price with staleness flag).

**Which build phase:** Phase 1 (data infrastructure). The scraping layer must be built defensively from day one — retrofitting stealth and residential proxies into a naive scraper is expensive. Set up health monitoring in Phase 1 as well.

---

### Pitfall 2: Product Identity Collapse — The Deduplication Disaster

**What goes wrong:** You ingest 50 retailers and discover that "The same whisky" appears under 47 different name strings. Your naive string-match deduplication either (a) creates 47 duplicate products, none of which are linkable, or (b) aggressively matches things that are not the same product and averages prices across different expressions. Both are catastrophic for price comparison.

**Real examples of the normalization problem for whisky specifically:**

| Retailer A | Retailer B | Retailer C | Are They The Same? |
|------------|------------|------------|---------------------|
| Glenfarclas 15 | Glenfarclas 15 Year Old | Glenfarclas Fifteen | YES |
| Macallan 18 Sherry | Macallan 18 Year Old Sherry Oak | The Macallan 18YO Sherry Oak Cask | YES |
| Laphroaig 10 Cask Strength | Laphroaig 10 CS | Laphroaig Ten CS | YES |
| GlenDronach 12 | GlenDronach 12 Year Old | GlenDronach Original 12 | YES |
| Glenfiddich 15 Unique | Glenfiddich 15 Solera | Glenfiddich 15 Year Old Solera | YES |
| Glenmorangie 10 Original | Glenmorangie The Original | Glenmorangie Original 10 Year | YES |
| Johnnie Walker Black Label | JW Black 12 Year | Johnnie Walker Black | YES |
| Ardbeg 10 | Ardbeg Ten | Ardbeg Ten Years Old | YES |
| Ardbeg 10 | Ardbeg TEN Committee Release | NO (different expression) |

**The false-positive failure mode** is worse than false-negatives. Merging two different products — e.g., matching "Macallan 18 Sherry" with "Macallan 18 Fine Oak" because both contain "Macallan 18" — produces a comparison page showing wildly inconsistent prices that confuse users and destroy trust.

**Root causes of deduplication failure:**
- **No canonical product registry:** Building identity from scraped names alone rather than from a master product catalog (LCBO, Wine-Searcher, Whisky Auctioneer all publish product databases).
- **Treating name as identity:** Name strings are retailer marketing copy, not product identifiers. The same bottle can have 8 different marketing names.
- **Missing bottle size normalisation:** 700ml vs 750ml is the same product sold in different markets (UK vs US standard), but 700ml Glenfiddich 15 and 200ml Glenfiddich 15 miniature are NOT the same SKU for price comparison.
- **Ignoring vintage and batch:** "Glenfarclas 105" from a 2019 bottling and 2023 bottling are technically different products with potentially different prices. Secondary market buyers care about this.
- **ABV% not captured:** "Laphroaig 10" (43% ABV) vs "Laphroaig 10 Cask Strength" (58-62% ABV, batch variable) look similar but are completely different products.

**Prevention strategy:**
1. **Build a canonical product master first**, before building scrapers. Source from:
   - Whiskybase.com (has a comprehensive database with distillery-canonical names)
   - LCBO product database (public, well-maintained)
   - The Whisky Exchange's product taxonomy (accessible via their search API)
   - SMWS (Scotch Malt Whisky Society) bottle registry
2. **Product identity = {distillery, expression_name, age_statement, ABV, bottle_size, vintage_if_known}** — not name string alone. Two products with the same tuple = same product.
3. **Use fuzzy matching + edit distance (Levenshtein / Jaro-Winkler) with a domain-specific token normalisation layer:**
   - Expand abbreviations: "YO" → "Year Old", "CS" → "Cask Strength", "OB" → "Official Bottling", "IB" → "Independent Bottling"
   - Normalise numerals: "Fifteen" → 15, "Twelve" → 12
   - Strip stop words from retailer names: "The", "Aged", "Old", "Years"
   - Extract structured fields: age statement (regex `\b\d{1,2}\b` in context), ABV (`\b\d{2,3}\.?\d?%?\b`), bottle size (`\d{2,4}\s*ml`)
4. **Set a conservative merge threshold**: Only auto-merge at >90% confidence. Queue 70-90% matches for human review. Below 70% = distinct products.
5. **Never merge without a price-sanity check**: If two "matched" products have a price ratio > 1.5x, reject the merge and flag for review.
6. **Expose product disambiguation UI**: When a user searches "Ardbeg 10", show them all matched expressions with distinguishing attributes clearly visible. Let users report wrong merges.

**Warning signs (detect early):**
- You see a product listed at both £30 and £180 from the same retailer (false match)
- User reports that "Glenfiddich 12" search returns a 21-year-old bottle
- Product count from a retailer is suspiciously round (e.g., exactly 500 — suggests pagination truncation)
- Price standard deviation within a "single product" is > 40% of mean

**Which build phase:** Phase 1 (data infrastructure). The canonical product registry must be established before the first scraper runs. Retrofitting normalisation is a multi-month rewrite.

---

### Pitfall 3: Duty/Tax Calculations That Users Trust But Are Wrong

**What goes wrong:** The app displays a "total landed cost" that users rely on to make purchasing decisions worth hundreds or thousands of dollars/pounds. The calculations are systematically wrong due to incorrect HS codes, stale tax tables, or missing exception rules. Users overpay customs fees, face unexpected charges on delivery, or make purchases they thought were duty-free.

**This is the most trust-destroying pitfall in the entire product.** A user who receives a customs bill for £120 when the app said £0 will never use the product again and will warn others.

**Sources of duty calculation error:**

**HS Code errors:**
- Whisky (Scotch, bourbon, Irish, Japanese) falls under HS 2208.30 (whiskies). However, misclassified importers sometimes use 2208.90 (other spirits), which can attract different rates in some jurisdictions.
- The HS code determines the duty *rate*, but the *basis* differs: EU uses ABV × volume × rate per hectolitre of pure alcohol (HPA). US CBP uses ad valorem (percentage of transaction value) for most spirits. UK uses a specific duty per litre of pure alcohol (LPA) post-Brexit.
- Getting the wrong basis (ad valorem vs. specific) produces wildly wrong numbers even with the correct rate.

**Destination country exceptions and thresholds:**
- **UK:** Post-Brexit duty reform effective August 2023 unified the alcohol duty system. All spirits duty is now £31.64 per litre of pure alcohol (LPA) as of 2024 (uprated annually with RPI). The old by-category system is gone. Many tutorials and blogs still show the old rates — do not use them.
- **EU member states:** There is a harmonised excise minimum (EU Directive 92/83/EEC and 2020/1151/EU), but member states set their own rates above that minimum. Germany, France, Italy, Spain all have different effective rates. You cannot use a single "EU rate."
- **US:** Federal excise tax (FET) on imported spirits is $13.50/proof gallon as of 2024 (the Craft Beverage Modernization Act reduced rates for small producers — this may not apply to most imported whisky). On top of FET, state excise taxes vary. Additionally, the US operates a three-tier system: some states require importation through a licensed importer/distributor, making direct DTC (Direct-to-Consumer) shipping from a foreign retailer legally impossible regardless of duty.
- **De minimis thresholds:** The US $800 de minimis threshold does NOT apply to alcohol — all alcohol imports are dutiable regardless of value. The EU's €150 de minimis similarly excludes excise goods. These exceptions are commonly misapplied.
- **Personal allowances vs. commercial imports:** A traveller's personal allowance (e.g., 1 litre spirits duty-free into the UK) does NOT apply to postal/courier imports. These are different legal regimes.

**Stale rate tables:**
- UK alcohol duty rates are uprated by Parliament, typically in the Autumn Statement/Spring Budget. They can change every year.
- EU member state rates change on different schedules.
- US FET rates changed in 2023 with the Craft Beverage Modernization Act reauthorisation.
- Without a mechanism to detect and refresh rate tables, your calculations silently drift out of date.

**Prevention strategy:**
1. **Use LPA (Litres of Pure Alcohol) as your base unit for all calculations.** LPA = bottle_volume_litres × (ABV/100). Then apply: duty = LPA × rate_per_LPA. This is the correct basis for UK and EU excise duty.
2. **Store duty rates in a versioned, timestamped table** with effective dates. Never hardcode rates in application logic. Log every rate change with source reference.
3. **Source rates from official government publications only:**
   - UK: HMRC Alcohol Duty technical guidance (GOV.UK)
   - EU: European Commission Taxation and Customs Union excise duty tables (published quarterly)
   - US: TTB (Alcohol and Tobacco Tax and Trade Bureau) published rates
4. **Set up a quarterly review process** with calendar reminders to verify all jurisdiction rates against official sources. Pre-schedule for UK Spring Budget (March/April) and Autumn Statement (November).
5. **Display clear uncertainty messaging for each calculation.** Show: "Estimated duty: £47.20 — based on UK HMRC rates effective 1 Aug 2024. Verify with your customs broker for commercial imports."
6. **Flag jurisdictions you cannot calculate reliably.** For US state-by-state excise on top of federal, display: "Federal excise: $X — state excise varies, check [state] ABC board." Do not guess state rates without verified sources.
7. **Never remove the "estimate" label.** The legal standard for a "quote" vs. an "estimate" matters if a user disputes a charge.
8. **Explicitly handle the de minimis trap**: if the bottle value is under a common threshold, do NOT show £0 duty without checking whether alcohol is excluded from that threshold in the destination jurisdiction.

**Warning signs (detect early):**
- User reports: "Customs charged me £X but app said £Y" — this is a data signal, build a feedback mechanism from day one
- Duty calculations for a jurisdiction suddenly change by >10% between two rate table versions — validate the source; either a genuine rate change or a data entry error
- A specific retailer's prices produce duty estimates consistently lower than competitors (possible wrong ABV or bottle size in source data)

**Which build phase:** Phase 1 (duty calculation engine). Cannot be deferred. Must be versioned and tested with real-world examples before launch. Build an integration test suite with known correct answers: "Ardbeg 10 (700ml, 46% ABV) shipped from UK to France = €X duty" — validate against official calculation tools.

---

## Moderate Pitfalls

---

### Pitfall 4: Currency Conversion That Produces Misleading Totals

**What goes wrong:** The app shows a "total landed cost in USD" that uses stale exchange rates and mid-market rates, making the displayed price consistently lower than what users actually pay. Users make decisions based on currency comparisons that are off by 3-8%, which is significant for bottles costing £200-£2,000.

**Why the mid-market rate is wrong for users:**
- The mid-market rate (e.g., from Open Exchange Rates, Fixer.io, or ECB) is the interbank rate — it does not include the retail spread that users pay when their bank or card provider converts currency.
- A typical retail FX spread is 1.5-3.5% on top of mid-market.
- A premium credit card may add 1.75-2.9% foreign transaction fee on top of that.
- A £300 bottle purchase at mid-market might display as $375, but the user actually pays $388 with their bank's spread + card fee. That's a $13 systematic understatement.
- For a rare bottle at £2,000, this error is $86 — meaningful.

**Rate staleness problem:**
- GBP/USD moved 12% over the 12 months ending mid-2024. Using a rate that is even 2 weeks stale during a volatile period can produce a 2-3% error.
- Caching FX rates for 24 hours is standard, but during currency events (elections, central bank announcements, tariff surprises), rates can move 1-2% intraday.

**Prevention strategy:**
1. **Use a well-maintained FX API with sub-daily refresh:** ExchangeRate-API, Open Exchange Rates, Fixer.io all offer hourly or real-time tiers. Budget ~$30-100/month.
2. **Apply an explicit "display spread" of +2%** over mid-market to account for retail FX spread. Display this transparently: "Currency conversion includes an estimated 2% retail spread. Your actual cost may vary."
3. **Show prices in source currency first**, with destination currency conversion secondary. "£320 GBP (~$405 USD estimated)" — the word "estimated" is load-bearing.
4. **Cache FX rates with a max TTL of 4 hours** for display purposes. Flag conversions that are based on rates older than 24 hours with a visual warning.
5. **Never convert prices in a pipeline step and then store the converted value.** Store source currency + source amount + rate + timestamp as separate fields. Reconvert on display using current rate. Storing converted values means your database silently becomes stale.
6. **For premium users: add an FX calculator** that lets them enter their actual bank rate for precise comparison.

**Warning signs (detect early):**
- During a major currency move (>1% intraday), cached prices show a systematic directional bias across all cross-currency results
- Users in a specific country report all prices seeming too cheap or too expensive

**Which build phase:** Phase 1 (pricing engine). FX handling must be designed into the data model from the start — adding it later requires a database migration. The API integration is straightforward; the architectural decision (never store converted values) is the critical choice.

---

### Pitfall 5: US Alcohol Shipping Legality — Silent Enablement of Illegal Purchases

**What goes wrong:** The app does not restrict or warn about US state-by-state alcohol shipping laws. A user in a state where DTC (Direct-to-Consumer) alcohol shipping is illegal sees a retailer listed as shipping to their address, clicks through, and either (a) the retailer's checkout refuses the order after the user has invested significant time, or (b) the package is seized by state ABC authorities and the user loses their money. In the worst case, the retailer or platform faces regulatory action.

**The legal landscape as of 2025:**
- Approximately 12-15 US states prohibit DTC interstate shipping of spirits (bourbon, whisky, etc.) outright: Alabama, Arkansas, Delaware, Kentucky (to non-licensees), Mississippi, North Dakota, Oklahoma, Rhode Island (limited), South Dakota, Tennessee, Utah.
- Even states that permit some DTC alcohol shipping typically restrict it to wine — spirits DTC shipping is permitted in far fewer states.
- The rules change: states periodically expand or restrict shipping permissions through legislation. Kentucky notably changed its rules in 2023.
- These rules apply to the **shipper's license**, not just the buyer's location. A UK retailer shipping to a US address is exporting and the US importer/recipient is subject to US state law. Most UK/EU retailers avoid all US shipments to sidestep the complexity.
- Some carriers (FedEx, UPS) have their own alcohol shipping policies that are stricter than state law.

**Compliance requirements:**
- Adult signature required on delivery (21+) — this is federal law under the IDEA Act in some states, and carrier policy everywhere.
- Some states require adult signature + government ID verification.
- Shipping label must declare alcohol content in many jurisdictions.

**Prevention strategy:**
1. **Maintain a verified US state shipping permission matrix**: columns are {state, spirits_DTC_permitted, wine_DTC_permitted, carrier_restrictions}. Source: National Conference of State Legislatures (NCSL) alcohol shipping laws table, updated annually.
2. **For any US destination address**: cross-reference against this matrix before displaying shipping cost. If spirits DTC is illegal in that state, display: "Shipping spirits to [State] may not be legal. Check your state's alcohol import laws before purchasing."
3. **Do not show a shipping cost estimate for prohibited state/product combinations.** Showing a cost implies availability.
4. **Add a checkout-time warning modal** when a user is about to click through to a retailer for a state with restrictions.
5. **Do not attempt to provide legal advice** — link to the NCSL resource and advise users to consult their state's ABC board.
6. **For international shipments (UK → EU → US):** note that the relevant law is the destination US state law, not the source country's export law.

**Warning signs (detect early):**
- Users from a specific US state report orders being refused or packages seized
- A retailer changes their supported states list — triggers a scrape comparison that catches the change

**Which build phase:** Phase 1 (data model and UI), but ongoing maintenance. The state matrix must exist before the product goes live with US users. Assign a quarterly review task to verify the matrix against NCSL updates.

---

### Pitfall 6: N+1 Queries Destroying Search Performance at Scale

**What goes wrong:** The search results page shows 50 whisky products. Each product needs: base price, price history (for the chart), retailer info, and shipping cost to user's location. The naive implementation makes one query per product per data type: 50 products × 4 queries = 200 database queries per search request. At 100 concurrent users, this is 20,000 queries/second. The database falls over at approximately 1,000 concurrent users with this pattern, not the millions you planned for.

**Common N+1 patterns in this specific domain:**
- Loading retailer details in a loop after loading prices
- Computing "best price per retailer" in application code rather than SQL aggregation
- Fetching price history for each product individually rather than in a single bulk query
- Computing the duty estimate per product in a request cycle rather than pre-computing at scrape time

**The thundering herd scraping problem:**
- If you schedule all 200 retailers to be scraped on the same cron schedule (e.g., every 6 hours, all starting at midnight), you generate a massive spike of outbound HTTP traffic simultaneously. Two problems:
  1. Your scraper infrastructure gets overloaded
  2. You appear as a coordinated bot attack to retailers' CDN/WAF systems, which triggers blocks

**Prevention strategy:**
1. **Use `JOIN` and `IN (...)` queries, never loops.** Load all prices for a set of products in a single query, then join in application code (O(n) hash join, not O(n²) nested loop).
2. **Pre-compute duty estimates at scrape time**, not at query time. Store `computed_duty_gbp`, `computed_duty_usd`, `computed_duty_eur` on each price record. Recompute on duty table update (batch job), not on each user request.
3. **Add a full-text search index on the product table** (PostgreSQL `tsvector` or Elasticsearch) from day one. Do not add it after the table has 100k rows.
4. **For price history charts:** store pre-aggregated daily/weekly min prices in a separate `price_history_daily` table. The raw price scrape table will become enormous; don't query it for UI.
5. **Stagger your scraper schedule**: distribute 200 retailers across a 6-hour window using a job queue (BullMQ, Temporal). Each retailer gets a randomised start offset. This levels the load on your infrastructure and avoids the appearance of coordinated traffic.
6. **Set per-retailer scrape cadence based on price volatility**: large retailers with daily price changes → scrape every 2-4 hours. Small independent retailers → scrape every 12-24 hours. Rare/static SKUs → every 48 hours. Don't waste scraping capacity on low-change sources.

**Warning signs (detect early):**
- Search p99 latency > 500ms in development with a small dataset (300 products) — it will be 5x worse at 30,000 products
- Database CPU spikes to 80%+ during scraper runs
- A single product page requires > 5 round trips to the database

**Which build phase:** Phase 1 (data model) and Phase 2 (scraper scheduling). The data model decisions (pre-computed fields, aggregation tables) must be made before populating data. The scheduling architecture is a Phase 2 concern.

---

### Pitfall 7: Data Freshness UX — Users Make Decisions on Stale Prices

**What goes wrong:** A user sees Glenfiddich 15 listed at £42 from a retailer. They click through, add to cart, and find the current price is £55. The price changed 3 days ago; the scraper hasn't run since. The user feels misled, even though there is a small "last updated: 3 days ago" timestamp somewhere on the page that they never noticed.

**The deeper problem:** Whisky prices are not like flight prices (which users know are dynamic). Casual buyers assume prices are near-real-time. Professional collectors know prices fluctuate but expect <24h freshness. Your price freshness guarantee must be communicated up front, and the staleness indicator must be visually prominent when prices are stale.

**Specific freshness failure modes:**
- **Scraper silently fails** (403 from Cloudflare) but returns cached data from 2 weeks ago. No staleness flag fires because your system doesn't know the scrape failed — it just hasn't updated.
- **Price alert fires on stale data**: User set an alert for £45 on a bottle; your scraper picks up an old cached page that still shows £45, fires the alert, user buys, actual price is £60.
- **Comparison sort on stale data**: User sorts by "best total price." The top result is from 5 days ago, £10 cheaper than it actually is. They click through and find it more expensive than the second result.

**Prevention strategy:**
1. **Track scrape success separately from data freshness.** A "last scraped at" timestamp is meaningless if the last scrape failed. Track: `last_scraped_at`, `last_successful_scrape_at`, `last_price_change_at`, `scrape_status` (success/failure/blocked). Show `last_successful_scrape_at` in the UI, not `last_scraped_at`.
2. **Define staleness tiers visually:**
   - < 6 hours: green badge "Live price"
   - 6-24 hours: amber badge "Price from Xh ago"
   - 24-72 hours: orange badge "Price may have changed"
   - > 72 hours: red badge + warning modal before click-through "This price is X days old. Verify at retailer."
3. **Block price alerts from firing on data older than your defined threshold** (e.g., 12 hours). Re-check the price with a fresh scrape before sending the alert.
4. **Build a "freshness score" into your search ranking**: weight results with fresher prices slightly higher in default sort, all else being equal.
5. **On click-through to retailer**: always show the retailer's live price in the click-through page if possible. Consider a lightweight "price check" endpoint that verifies the price is still within tolerance before the user leaves your platform.
6. **Make the scrape failure rate visible internally**: dashboard showing per-retailer success rate, mean time since last successful scrape. Alert operations team when any retailer exceeds 24h since last successful scrape.

**Warning signs (detect early):**
- Users report "price was different at checkout" more than once per week
- Your price alerts are firing but users aren't converting (suggesting prices aren't actually at the alerted level)
- A retailer's prices haven't changed at all in 10 days (suspicious — means the scraper is probably hitting a cached/failed page)

**Which build phase:** Phase 1 (data model + scraper health), Phase 2 (UI staleness indicators). The data model fields must be in from day one. The UI treatment is a Phase 2 polish item but should be designed in Phase 1.

---

### Pitfall 8: Age Verification — Legal Requirement With No Enforcement Mechanism

**What goes wrong:** The app has no age verification layer. It is accessible to minors. In the UK, providing alcohol-related commercial services without age verification can constitute a legal offence under the Licensing Act 2003. In the US, CARU (Children's Advertising Review Unit) and the FTC actively pursue alcohol advertising platforms accessible to under-21s. In the EU, several jurisdictions require age gates on alcohol retail platforms.

The usual engineering response is "we just show prices, we don't sell" — but this is legally untested for an aggregator that deep-links directly to purchase pages and provides price comparison as a commercial service.

**Prevention strategy:**
1. **Implement an age gate on first visit** (birthdate entry + cookie/localStorage persistence) — this is the industry minimum standard.
2. **Do not use a "Are you 18?" Yes/No button** — this has been rejected as insufficient by UK ASA rulings. A full birthdate field is required.
3. **Implement age verification into your account creation flow**: date of birth field required, validated against 18 (UK/EU) or 21 (US) depending on user's stated jurisdiction.
4. **Add COPA/COPPA compliance**: do not collect data from users under 13 under any circumstances. Ensure the privacy policy explicitly restricts use to adults.
5. **Add legal disclaimers on all product pages**: "This product is only for sale to adults aged 18+ (21+ in the USA)."
6. **Consult a legal professional in your primary jurisdictions** before launch. The alcohol marketing rules in UK (CAP Code) and US are complex and change frequently.

**Which build phase:** Phase 1 (account system). Cannot be deferred. This is a launch blocker.

---

## Minor Pitfalls

---

### Pitfall 9: React Native Performance on Search and Long Lists

**What goes wrong:** The React Native app renders a search results list of 50+ products with images, price breakdowns, and currency conversions. The `FlatList` scrolls at 45fps instead of 60fps on Android mid-range devices (the realistic baseline for your user demographics). Price comparison pages with 6-8 retailers for the same bottle cause a UI freeze when navigating to the page.

**Common RN-specific mistakes for this use case:**
- Using `ScrollView` instead of `FlatList` for product lists — `ScrollView` renders all children at once; 50 product cards with images = OOM on low-end devices.
- Not memoizing product card components — every parent re-render (e.g., when a filter changes) re-renders all visible cells.
- Calling `setState` in a loop when applying filters/sorts client-side instead of computing the new array and calling `setState` once.
- Decoding and displaying images synchronously — all retailer logos and bottle photos blocking the JS thread.
- Running duty calculations on the JS thread for each visible cell during scroll.

**Prevention strategy:**
1. **Always use `FlatList` with `windowSize`, `maxToRenderPerBatch`, and `initialNumToRender` tuned** for your product card height. A good starting point: `windowSize={5}`, `maxToRenderPerBatch={10}`, `initialNumToRender={8}`.
2. **Wrap product cards in `React.memo`** with a custom comparison function that only triggers re-render when price or availability changes.
3. **Pre-compute all price calculations** (including duty and FX) server-side before sending to client. The client should display pre-formatted strings, not compute financial logic.
4. **Use `expo-image` or `react-native-fast-image`** for all product images — both implement disk caching and avoid re-decode on re-render.
5. **Run search filtering/sorting on the server**, not client. Sending 500 product objects to the client and filtering in JS is unnecessary — use server-side pagination with filters as query params.
6. **Test on a real Android mid-range device** (e.g., Pixel 6a or equivalent) from week one, not just high-end iOS simulators. Performance problems on Android are routinely discovered late because developers use expensive iPhones and Mac simulators.

**Which build phase:** Phase 2 (mobile feature parity). Design the data protocol (server pre-computes) in Phase 1.

---

### Pitfall 10: Deep Linking Broken on Price Alerts

**What goes wrong:** User receives a push notification: "Laphroaig 10 dropped to £32 — view deal." They tap it. The app opens to the home screen. The product page is not opened. User abandons. This is a basic implementation failure but it kills the key premium feature (price alerts) entirely.

**Root cause:** React Navigation deep linking + Expo/React Native push notifications require explicit configuration. The notification payload must contain a route target. The `LinkingOptions` must map that route. On iOS, Universal Links and the associated domains entitlement must be configured. On Android, Intent Filters must be configured. All of these require explicit setup; none are automatic.

**Prevention strategy:**
1. **Define the deep link scheme before building push notifications.** Example: `whiskyhunter://product/[productId]` and `https://whiskyhunter.app/product/[productId]` (universal link).
2. **Include `productId` and `retailerId` in every push notification payload** (not just a message string).
3. **Test deep links on physical devices from day one** — they behave differently on simulators.
4. **Implement a web fallback** for every deep link (universal link → falls back to product page on web if app not installed).

**Which build phase:** Phase 2 (notifications + mobile). Must be designed in Phase 2 before sending first alert.

---

### Pitfall 11: Robots.txt Compliance and ToS Legal Risk

**What goes wrong:** Your scraper ignores `robots.txt` directives. Several large retailers have clauses in their Terms of Service explicitly prohibiting automated access or price comparison aggregation. You receive a cease-and-desist letter or — in the UK — a potential Computer Misuse Act claim.

**The legal reality:**
- `robots.txt` is not legally binding per se, but courts in the US (HiQ v. LinkedIn) and EU have increasingly looked at explicit `robots.txt` restrictions as evidence of intent to restrict access.
- Scraping publicly available prices has generally been upheld (HiQ v. LinkedIn, 9th Circuit, 2022), but the law is unsettled and jurisdiction-specific.
- UK law is more cautious — the Computer Misuse Act 1990 could theoretically apply if scraping circumvents technical access controls (e.g., actively bypassing bot detection).

**Prevention strategy:**
1. **Always parse and respect `robots.txt`** for each retailer. Use `robots-parser` (Node.js) to programmatically check each URL before scraping. Log compliance.
2. **Review each retailer's ToS** before adding them as a data source. Maintain a `retailer_tos_status` field: {permitted, ambiguous, prohibited}. Only scrape {permitted} and {ambiguous} retailers initially. Get legal review before launching {ambiguous} at scale.
3. **Prioritise retailers who offer affiliate programs or data feeds** — these are explicitly permitted access and often provide better data quality.
4. **Add rate limiting that is more conservative than the retailer's stated limits.** If `robots.txt` specifies `Crawl-delay: 10`, use 15 seconds minimum.
5. **Do not circumvent login walls** — scraping content that requires authentication is a much clearer legal violation than scraping public pages.

**Which build phase:** Phase 1 (scraper infrastructure). Legal compliance is a launch prerequisite.

---

## Phase-Specific Warnings

| Build Phase | Topic | Likely Pitfall | Mitigation |
|-------------|-------|---------------|------------|
| Phase 1 | Data model design | Storing FX-converted prices (vs. source currency) | Always store source amount + currency + rate + timestamp |
| Phase 1 | Product identity | No canonical product registry before scraping | Build product master from public databases FIRST |
| Phase 1 | Duty engine | Using wrong calculation basis (ad valorem vs. LPA) | Implement LPA-based calculation, test against HMRC calculator |
| Phase 1 | Duty engine | Hardcoding rates in application logic | Versioned rate table with effective dates from day one |
| Phase 1 | Scraper | Naive implementation without stealth | Use playwright-extra + stealth plugin + residential proxies from day one |
| Phase 1 | Legal | No robots.txt compliance | Build compliance check into scraper framework before first run |
| Phase 1 | Legal | No age verification | Age gate + DOB verification is a launch blocker |
| Phase 1 | US compliance | Showing prices to US states where shipping is illegal | Build state shipping permission matrix before US launch |
| Phase 1 | Scraper health | Not distinguishing scrape failure from data freshness | Track `last_successful_scrape_at` and `scrape_status` separately |
| Phase 2 | Scraper | All retailers on same cron schedule (thundering herd) | Stagger schedule across 6h window using job queue |
| Phase 2 | Performance | N+1 queries on search results | Pre-compute duty; use batch queries; aggregate price history |
| Phase 2 | Mobile | FlatList not configured | Configure windowSize, maxToRenderPerBatch from first mobile sprint |
| Phase 2 | Mobile | Deep links not configured before building alerts | Design URL scheme before notification feature, not after |
| Phase 2 | UX | No staleness visual treatment | Design staleness tiers in Phase 1, implement in Phase 2 |
| Phase 3 | Deduplication | Drift in product matching as catalog grows | Monitor merge confidence score distribution; alert if >5% of merges drop below 85% |
| Phase 3 | FX | Stale rates during market volatility | Reduce cache TTL to 1h during high-volatility periods (detected by rate change > 0.5% in 1h) |
| Ongoing | Duty rates | UK/EU/US rate changes on budget cycles | Quarterly review process, automated monitoring of HMRC/EC/TTB feeds |
| Ongoing | US state law | State DTC shipping law changes | Subscribe to NCSL alcohol law update newsletter; annual full review |
| Ongoing | Scraper | Retailer website redesigns breaking selectors | Per-retailer health score monitoring; alert at <95% parse success rate |

---

## Summary Confidence Assessment

| Pitfall Area | Confidence | Basis |
|-------------|------------|-------|
| Anti-bot / Cloudflare mechanisms | HIGH | Well-documented in Cloudflare public docs, Playwright docs, proxy provider documentation |
| Product normalisation | HIGH | Well-established NLP problem; whisky-specific taxonomy from Whiskybase/LCBO |
| UK duty calculation (LPA basis, post-Aug 2023 reform) | HIGH | HMRC public documentation |
| EU duty calculation | MEDIUM | Harmonised minimum is documented; member state rates require per-country verification |
| US duty + FET rates | MEDIUM | TTB published rates; state-level excise requires per-state verification |
| US state shipping permissions matrix | MEDIUM | NCSL published list; changes require monitoring |
| FX rate handling | HIGH | Established financial best practice; retail spread ranges are well-known |
| React Native performance patterns | HIGH | React Native docs, well-established community patterns |
| Deep linking configuration | HIGH | Expo/React Navigation official documentation |
| Age verification legal requirements | MEDIUM | UK CAP Code is documented; US and EU vary by jurisdiction — seek legal review |

---

## Sources and Verification Required

**HIGH confidence — treat as fact:**
- Cloudflare Bot Management documentation (public): TLS fingerprinting, JA3/JA4, bot score model
- Playwright documentation: headless detection, `navigator.webdriver`
- UK HMRC: Alcohol Duty reform effective August 2023 (unified LPA-based duty)
- React Native documentation: FlatList performance configuration
- React Navigation: Deep linking + universal links configuration

**MEDIUM confidence — verify before shipping:**
- Specific UK duty rate (£31.64/LPA) — verify against current HMRC guidance at build time; rate changes annually
- EU member state-specific excise rates — pull from EC Taxation quarterly tables at implementation
- US TTB federal excise rate ($13.50/proof gallon) — verify against TTB published schedule
- US state-by-state DTC shipping permissions — NCSL table, but verify individually for target states
- Age verification legal standard per jurisdiction — requires legal counsel in UK, US, and primary EU markets

**Require fresh research at phase implementation:**
- Anti-bot bypass techniques evolve rapidly (6-12 month cycle) — re-research at Phase 1 scraper build time
- US state alcohol shipping laws: verify current status for each target state at launch
