# WhiskyHunter — מפת דרכים לביצוע

**גרסה:** 1.0  
**תאריך יצירה:** 2026-05-25 (שדרוג 25526)  
**היקף:** v1.0 — Web + iOS + Android + 10 קמעונאים + Whiskybase  
**אומדן כולל:** ~30–34 שבועות מהתחלה עד App Store  

---

## תמונה כוללת — 7 שלבים

```
שבוע:  0    2    4    6    8   10   12   14   16   18   20   22   24   26   28   30   32
       ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤
  Pre  ██                                                                               
  P1   ████████████████████                                                             
  P2                       ████████████                                                 
  P3                                   ████████                                         
  P4                                           ████████████                             
  P5                                                       ████████                     
  P6                                                               ████████████████    
       
  M1◆──────────┘               Whiskybase catalog seeded (10k+ bottles)
  M2◆──────────────────────┘   10 קמעונאים רצים (Alpha Data)
  M3◆──────────────────────────────────┘   Search live (Internal Alpha)
  M4◆──────────────────────────────────────────────┘   Cost Calculator live
  M5◆──────────────────────────────────────────────────────────┘   Auth + Stripe (Beta)
  M6◆──────────────────────────────────────────────────────────────────┘   Price Alerts
  M7◆──────────────────────────────────────────────────────────────────────────────────┘ App Store
```

---

## פאזה 0: Pre-Development (שבועות 0–1)

> אין קוד בשלב זה. כל הפעולות הן משפטיות/עסקיות/תשתיתיות.

### משימות

| # | משימה | אחראי | מצב |
|---|-------|-------|-----|
| P0-01 | קרא `robots.txt` + ToS של כל 10 קמעונאים — תעד בטבלת compliance | Dev/Legal | ⏳ |
| P0-02 | הגש בקשה לתוכנית שותפים — The Whisky Exchange (Awin, Merchant 400) | BD | ⏳ |
| P0-03 | הגש בקשה לתוכנית שותפים — Master of Malt (Affiliate Future) | BD | ⏳ |
| P0-04 | שלח אימייל ל-Whiskybase — בקש data partnership / API access | BD | ⏳ |
| P0-05 | פתח חשבונות: Neon (PostgreSQL), Railway (workers), Bright Data (proxies) | Dev | ⏳ |
| P0-06 | פתח חשבון Stripe + Resend + Expo | Dev | ⏳ |
| P0-07 | הגדר repository ב-GitHub + branch protection rules + CI skeleton | Dev | ⏳ |

### Go/No-Go Gate — כניסה לפאזה 1

- [ ] לפחות 8 מתוך 10 קמעונאים אושרו לסריקה (robots.txt ≠ Disallow all)
- [ ] חשבון Neon ו-Railway פעילים
- [ ] GitHub repo מוכן

---

## פאזה 1: Data Foundation (שבועות 1–10)

> **מטרה:** מערכת הנתונים רצה — 10+ קמעונאים נסרקים, הקטלוג הקנוני מאוכלס מ-Whiskybase.

### שבוע 1–2: Monorepo Bootstrap (Plan 01-01)

**תוצרים:**
- `pnpm` workspaces עם 4 חבילות (`api`, `database`, `scraper`, `shared`)
- TypeScript strict mode + Vitest + Turbo
- `.env.example` + CI/CD skeleton

**פקודת אימות:**
```bash
pnpm turbo test        # חייב לעבור ✅
pnpm turbo typecheck   # zero errors ✅
```

---

### שבוע 2–3: סכמת DB (Plan 01-02)

**תוצרים:**
- טבלאות Drizzle: `products`, `retailers`, `source_mappings`, `price_snapshots`, `scraper_health`
- **חדש (25526):** שדות `whiskybase_id`, `review_score`, `review_count`, `whiskybase_url` ב-`products`
- Zod schemas: `RawProduct`, `NormalizedProduct`, `WhiskybaseProduct`

**פקודת אימות:**
```bash
pnpm --filter @whisky-hunter/database db:generate
pnpm --filter @whisky-hunter/database test  # schema constraint tests
```

---

### שבוע 3–4: Migrations + Seed (Plan 01-03)

**תוצרים:**
- Migration SQL עם `PARTITION BY RANGE` manual injection
- Wave 0 script ליצירת partitions חודשיות אוטומטית
- Seed data: טבלת `retailers` עם 10 קמעונאים (מ-RETAILERS-ADAPTERS.md)
- Materialized view: `current_best_prices`

---

### ⭐ שבוע 4–5: Whiskybase Catalog Seed (חדש — 25526) {#whiskybase-seed}

> **מהלך חדש שהוסף בשדרוג 25526.** מאכלס את הקטלוג הקנוני לפני שהסקרייפינג מתחיל.

**תוצרים:**
- `whiskybaseCatalogAdapter` (מ-WHISKYBASE-INTEGRATION.md)
- BullMQ job: `whiskybase-catalog-seed`
- סריקת 5 קטגוריות: scotch / bourbon / irish / japanese / world
- **יעד: 15,000+ בקבוקים עם שם, תמונה, ציון, ומזקקה**

**זרימת עבודה:**
```
Whiskybase listing pages → extractIds → fetchProductPage → upsert products
קצב: 1 req / 2 sec | proxy: residential | headless: true
```

**פקודת הפעלה:**
```bash
pnpm --filter @whisky-hunter/scraper scrape:whiskybase
# מריץ seed מלא — ~8 שעות לראשונה
```

**🏆 מיילסטון M1:** `whiskybase_id` מאוכלס ב-10,000+ רשומות

---

### שבוע 5–8: Scraper Pipeline — 10 קמעונאים (Plan 01-04)

**תוצרים:**
- BullMQ scheduler: cron per retailer (staggered 02:00–09:00 UTC)
- Playwright stealth factory (playwright-extra + stealth plugin)
- 10 אדפטרים (מ-RETAILERS-ADAPTERS.md):

| קמעונאי | שבוע יישום | קושי |
|---------|-----------|------|
| The Whisky Exchange | שבוע 5 | HIGH (Cloudflare) |
| Master of Malt | שבוע 5 | HIGH (Cloudflare) |
| The Whisky Barrel | שבוע 6 | LOW (Shopify) |
| Whiskybase Shop | שבוע 6 | LOW |
| LCBO | שבוע 6 | LOW (gov. site) |
| Total Wine | שבוע 7 | MEDIUM-HIGH (JS SPA) |
| K&L Wine Merchants | שבוע 7 | MEDIUM |
| La Maison du Whisky | שבוע 7 | MEDIUM |
| Whisky.de | שבוע 8 | LOW-MEDIUM |
| Abbey Whisky | שבוע 8 | LOW |

**BullMQ Rate Limiting per retailer:**
```typescript
// Cloudflare sites: 1 req / 5 sec
// Standard sites:   1 req / 2 sec
// Gov sites:        1 req / 1 sec
```

**🏆 מיילסטון M2:** 10 קמעונאים רצים, 100k+ price snapshots/day, health dashboard ירוק

---

### שבוע 8–10: Normalizer + Entity Resolver + Health API (Plan 01-05)

**תוצרים:**
- `normalizer`: abbrev expansion (Fifteen→15, Litre→L), field extraction
- `entityResolver`: Levenshtein blocking + threshold 0.90 auto-merge / 0.70 review queue
- `scraperHealth` emitter (BullMQ events → DB)
- Hono health endpoint: `GET /health/scrapers`
- Dockerfile (Playwright mcr.microsoft.com base image)

**פקודת אימות:**
```bash
pnpm turbo test        # all packages ✅
pnpm turbo typecheck   # zero errors ✅
docker build -t whisky-hunter-scraper ./packages/scraper  # builds ✅
```

### Go/No-Go Gate — כניסה לפאזה 2

- [ ] 10 קמעונאים עם >95% parse success ב-7 ימים ברצף
- [ ] 10,000+ products בטבלה עם `whiskybase_id` מאוכלס
- [ ] `current_best_prices` materialized view מתרענן אחרי כל scrape
- [ ] zero false-merges בדגימה ידנית של 100 מוצרים

---

## פאזה 2: Search & Catalog (שבועות 10–15)

> **מטרה:** משתמש מוצא כל וויסקי תוך 3 שניות, רואה תמונה, ציון Whiskybase, ומחירים.

### שבוע 10–11: Typesense Setup + Sync Job

**תוצרים:**
- Typesense Cloud (או self-hosted על Railway)
- Schema: `whiskies` collection עם facets על distillery/region/age/category/abv
- BullMQ job: `typesense-sync` — runs post-scrape, syncs `current_best_prices`
- HTTP adapter (Typesense client) ב-`@whisky-hunter/shared`

**Configuration:**
```typescript
const schema = {
  name: 'whiskies',
  fields: [
    { name: 'name',          type: 'string' },
    { name: 'distillery',    type: 'string', facet: true },
    { name: 'region',        type: 'string', facet: true },
    { name: 'age_years',     type: 'int32',  facet: true, optional: true },
    { name: 'abv',           type: 'float',  facet: true, optional: true },
    { name: 'category',      type: 'string', facet: true },
    { name: 'min_price_usd', type: 'float',  sort: true },
    { name: 'review_score',  type: 'float',  sort: true, optional: true },
    { name: 'source_count',  type: 'int32' },
    { name: 'image_url',     type: 'string', optional: true },
    { name: 'whiskybase_id', type: 'string', optional: true },
  ],
  default_sorting_field: 'min_price_usd',
};
```

---

### שבוע 11–12: Search API (Hono + tRPC)

**תוצרים:**
- tRPC router: `search.query`, `search.autocomplete`, `products.byId`, `products.listings`
- Server-side Typesense queries עם facet aggregation
- Rate limiting middleware (Hono): 50 req/min אנונימי / 500 premium

**Endpoints:**
```
GET /api/search?q=glenfarclas&page=1&filters=region:Speyside,age_min:12
GET /api/autocomplete?q=glen
GET /api/products/:whiskybaseId
GET /api/products/:whiskybaseId/listings   # כל המחירים מכל המקורות
```

---

### שבוע 12–14: Next.js Search UI (SSR)

**תוצרים:**
- `app/(search)/page.tsx` — Server Component (SSR first render)
- TanStack Query polling לרענון מחירים
- Zustand store: search filters + comparison tray
- ProductCard component עם תמונת Whiskybase + ציון
- Filter sidebar: distillery / region / age / ABV / price range

**Performance target:** FCP < 3 seconds (SSR + Typesense = sub-100ms)

---

### שבוע 14–15: Product Detail Page

**תוצרים:**
- `app/products/[whiskybaseId]/page.tsx` — SSR
- כרטיס מידע: תמונה, שם, ציון Whiskybase, מספר ציונים, קישור "View on Whiskybase →"
- טבלת מקורות: מחיר × קמעונאי × עלות משלוח (בסיסית)
- "Last updated" timestamp לכל מקור

**🏆 מיילסטון M3 (Internal Alpha):** חיפוש עובד, מוצרים נטענים, תמונות מוצגות

### Go/No-Go Gate — כניסה לפאזה 3

- [ ] חיפוש "Glenfarclas" מחזיר תוצאות תוך < 3 שניות
- [ ] Autocomplete עובד עם טיפוגרפיה (Glenfarcas → Glenfarclas)
- [ ] כל product page מציגה תמונה, ציון, ולפחות 3 מקורות
- [ ] Facet filters מסננים נכון לפחות ל-5 קטגוריות

---

## פאזה 3: Cost Calculator (שבועות 15–19)

> **מטרה:** כל מקור מציג עלות נחיתה מלאה — מדף + משלוח + מכס + מע"מ + המרה.

### שבוע 15–16: Duty Rates Engine

**תוצרים:**
- טבלת `duty_rates` מאוכלסת:
  - UK: £31.64/LPA (HMRC) — **לאמת!**
  - EU: per member state (DE: 13.03€/LPA + VAT)
  - US: $13.50/proof gallon (FET) + state excise
- Admin script לרענון טבלה רבעוני
- HMRC API integration: `api.trade.tariff.service.gov.uk` (HS 2208)

---

### שבוע 16–17: FX Engine + Shipping Rates

**תוצרים:**
- FX service: Frankfurter API (ECB) → cache ב-Redis עד שעה
- Fallback: Open Exchange Rates (paid)
- Shipping estimates: טבלה סטטית per (origin_country, destination_country, weight_range)
- Insurance: 1.5% מערך הבקבוק (standard rate)

---

### שבוע 17–19: Cost Breakdown API + UI

**תוצרים:**
- tRPC: `cost.calculate(listingId, destinationCountry)` → line-by-line breakdown
- Cost breakdown component:
  ```
  Shelf Price:          £85.00
  International Shipping: £18.00
  UK Export Handling:   £5.00
  Import Duty (DE):     £12.40
  German VAT (19%):     £22.87
  Currency (GBP→EUR):   €167.40
  Insurance (1.5%):     €2.51
  ─────────────────────────────
  TOTAL:               €169.91
  ```
- Shipping restriction warnings (US states: AL, KY, MS, UT, UT)
- Legal disclaimer: "WhiskyHunter shows costs only. Purchase happens directly with retailer."

**🏆 מיילסטון M4:** Cost calculator עובד על 3 מדינות יעד לפחות (UK, US, DE)

### Go/No-Go Gate — כניסה לפאזה 4

- [ ] UK duty calculation עובר spot-check ל-10 בקבוקים vs HMRC calculator
- [ ] FX rates מתרעננים כל שעה, `as of [time]` מוצג ב-UI
- [ ] shipping restriction warning מוצג לאוהיו/יוטה
- [ ] Grand total מחושב נכון לפחות ל-3 מדינות

---

## פאזה 4: User Layer & Freemium (שבועות 19–24)

> **מטרה:** משתמשים נרשמים, מנויים premium משלמים, Wishlist פועל.

### שבוע 19–21: Better Auth + Age Gate

**תוצרים:**
- Better Auth v1.3+ (email + password + Google OAuth)
- Email verification (Resend)
- Password reset flow
- Age gate middleware: 18+ (21+ for US based on GeoIP)
- Better Auth schema integration עם Drizzle

---

### שבוע 21–23: Stripe Subscriptions + Freemium Gating

**תוצרים:**
- Stripe Products: Premium Monthly ($9.99) + Premium Annual ($89.99)
- Stripe Webhooks: `customer.subscription.created/updated/deleted`
- Freemium gates:
  | Feature | Free | Premium |
  |---------|------|---------|
  | Searches/day | 50 | Unlimited |
  | Cost breakdown | Basic | Full line-by-line |
  | Wishlist | ❌ | ✅ |
  | Price Alerts | ❌ | ✅ |
  | Data Export | ❌ | ✅ |
- Upgrade prompts: gated features מציגים CTA, לא מוסתרים

---

### שבוע 23–24: Wishlist

**תוצרים:**
- Drizzle tables: `wishlists`, `price_alerts`
- Wishlist API: add/remove/list items
- Wishlist page (CSR + TanStack Query polling)
- Target price input per item
- "Current best price" מתרענן בכל ביקור

**🏆 מיילסטון M5 (Beta Launch):** משתמשים יכולים להירשם, לשלם, ולהשתמש ב-Wishlist

### Go/No-Go Gate — כניסה לפאזה 5

- [ ] Registration → Email verification → Login flow עובד מקצה לקצה
- [ ] Stripe checkout מסתיים ללא שגיאות ב-staging
- [ ] Free user רואה upgrade prompt לאחר 50 חיפושים
- [ ] Premium user רואה cost breakdown מלא + Wishlist

---

## פאזה 5: Price Alerts (שבועות 24–27)

> **מטרה:** התראות מחיר — email + push — עם rate limiting ו-staleness guard.

### שבוע 24–25: Alert Engine (BullMQ)

**תוצרים:**
- BullMQ job: `check-price-alerts` — רץ אחרי כל scrape cycle
- לוגיקה: `if current_total_cost < target_price AND scraped_at > now()-12h → fire alert`
- Rate limiting: מקסימום 1 התראה / 24h לכל (user × product)
- Dead-letter queue לאיוורות שנכשלו

---

### שבוע 25–26: Email Alerts (Resend)

**תוצרים:**
- React Email template: "Price Drop Alert — [Whisky Name]"
- Resend SDK integration
- Weekly Wishlist digest (BullMQ scheduled job — כל יום שישי)
- Unsubscribe link (one-click per `react-email` standard)

---

### שבוע 26–27: Push Notifications (Expo + FCM + APNs)

**תוצרים:**
- Expo Push Notification token registration flow
- FCM (Android) + APNs (iOS) via Expo unified API
- Push payload: title + body + whiskybaseId deep link
- בדיקה על מכשיר אמיתי (iOS TestFlight + Android internal track)

**🏆 מיילסטון M6:** Alert מתקבל ב-email + push תוך 10 דקות מירידת מחיר

### Go/No-Go Gate — כניסה לפאזה 6

- [ ] Alert email מתקבל תוך 5 דקות מ-scrape שמתחת ל-target
- [ ] Push notification מגיע ל-iOS ו-Android על מכשירי test
- [ ] Re-notification rate limit עובד (לא יותר מ-1/24h)
- [ ] Stale data (>12h) לא מפעיל alert

---

## פאזה 6: Web & Mobile Apps (שבועות 27–34)

> **מטרה:** WhiskyHunter v1.0 — חי ב-web, App Store, ו-Play Store.

### שבוע 27–29: Next.js Production Polish

**תוצרים:**
- Vercel deployment (production + preview environments)
- SEO: sitemap.xml + robots.txt + Open Graph meta per product
- Error boundaries + loading skeletons
- Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms
- Accessibility: WCAG 2.1 AA לפחות לדפים ראשיים
- Age gate cookie (30 days)
- Legal pages: Privacy Policy, Terms of Service, Cookie Policy

---

### שבוע 29–32: Expo Mobile App (iOS + Android)

**תוצרים:**
- Expo Router: file-based navigation (mirrors Next.js structure)
- Screens: Search / Product Detail / Cost Breakdown / Wishlist / Alerts / Profile
- Shared components with web (Zod schemas, tRPC client)
- EAS Build: production binaries
- EAS Update: OTA update channel
- Deep links: `whiskyhunter://products/[whiskybaseId]`
- Push notification permissions flow (iOS: explicit permission request)

---

### שבוע 32–34: App Store Submission + Buffer

**תוצרים:**
- App Store Connect: screenshots (6.7", 6.1", iPad), App Preview video, metadata
- Google Play Console: screenshots + feature graphic + description
- Apple Review cycle: 2–7 business days (buffer included)
- Google Play Review: 1–3 business days

**Submission Checklist:**
- [ ] Age verification popup (כנדרש ב-Apple + Google לאלכוהול)
- [ ] No in-app purchase of alcohol (redirect לאתר קמעונאי)
- [ ] Privacy policy URL פעיל
- [ ] Crash rate < 1% על TestFlight beta

**🏆 מיילסטון M7 (v1.0 Launch):** שני האפים חיים בחנויות, web ב-Vercel, 10 קמעונאים רצים

---

## לוח זמנים מסוכם

| שלב | שבועות | משך | מיילסטון |
|-----|--------|-----|---------|
| **P0: Pre-Dev** | 0–1 | 1 שבוע | חשבונות + ToS + affiliate applications |
| **P1: Data Foundation** | 1–10 | 9 שבועות | M1 (catalog) + M2 (scrapers) |
| **P2: Search & Catalog** | 10–15 | 5 שבועות | M3 (Internal Alpha) |
| **P3: Cost Calculator** | 15–19 | 4 שבועות | M4 (Cost live) |
| **P4: User + Freemium** | 19–24 | 5 שבועות | M5 (Beta Launch) |
| **P5: Price Alerts** | 24–27 | 3 שבועות | M6 (Alerts live) |
| **P6: Web + Mobile** | 27–34 | 7 שבועות | M7 (v1.0 Launch) |
| **סה"כ** | | **~34 שבועות** | |

---

## מפת תלויות קריטיות

```
P0 ──────────────────────────────────────────────────────────── (unlocks everything)
         │
         ▼
P1: Monorepo → DB Schema → Migrations → [Whiskybase Seed*] → Scrapers → Normalizer
                                              │
                                              ▼ (products table populated)
P2: Typesense Sync → Search API → Search UI → Product Detail Pages
                                                       │
                                                       ▼ (listings in UI)
P3: Duty Rates → FX Engine → Cost API → Cost UI
                                           │
                                           ▼ (costs visible)
P4: Better Auth → Stripe → Freemium Gates → Wishlist
                                               │
                                               ▼ (target prices set)
P5: Alert Engine → Email → Push Notifications
                                 │
                                 ▼ (all features working)
P6: Next.js Polish → Expo Apps → App Store Submission
```

`*` = חדש בשדרוג 25526

---

## סיכום סיכונים ואמצעי מיתיגציה

| סיכון | הסתברות | השפעה | מיתיגציה |
|-------|--------|-------|---------|
| Cloudflare חוסם The Whisky Exchange | גבוה | גבוה | Bright Data residential proxies + stealth plugin; fallback ל-Awin feed |
| Whiskybase חוסם Seed scrape | בינוני | גבוה | פנה לשותפות רשמית; rate limit 1/2s; proxy rotation |
| Apple דוחה אפליקציה (אלכוהול) | בינוני | גבוה | ודא age gate מפורש + אין in-app checkout + Privacy Policy מלא |
| Entity Resolver — false merge | נמוך-בינוני | גבוה | threshold 0.90 strict + human review queue + monitoring |
| Duty rates שגויים | בינוני | בינוני | spot-check vs HMRC + alerting כשטבלה עתיקה מ-3 חודשים |
| App Store review > 14 ימים | נמוך | בינוני | buffer שבועיים בלוח הזמנים |
| Stripe payment failures | נמוך | נמוך-בינוני | Stripe Radar + webhook retry + email לאדמין |

---

## Infrastructure Costs (v1 Monthly Estimate)

| שירות | עלות חודשית |
|-------|------------|
| Vercel (Next.js) | $0–20 |
| Railway (API + Workers) | $20–50 |
| Neon PostgreSQL | $0–25 |
| Typesense Cloud | $25 |
| Redis (Railway) | $5–15 |
| Bright Data Proxies | ~$150 (est. 15GB/mo) |
| Resend Email | $0–20 |
| Expo EAS | $0 (free tier) |
| **סה"כ** | **~$220–305/mo** |

---

## הגדרת "Done" לכל מיילסטון

### M1 — Whiskybase Catalog Seeded
- [ ] 10,000+ שורות ב-`products` עם `whiskybase_id` ≠ NULL
- [ ] `review_score` מאוכלס ל-80%+ מהרשומות
- [ ] `image_url` מאוכלס ל-90%+ מהרשומות
- [ ] BullMQ seed job מסיים ללא errors

### M2 — 10 Retailers Running
- [ ] 10 קמעונאים ב-`scraper_health` עם `last_scrape_status = 'success'`
- [ ] `consecutive_failures = 0` לכל קמעונאי
- [ ] 50,000+ price_snapshots ב-48 השעות האחרונות
- [ ] `current_best_prices` מתרענן כל לילה

### M3 — Internal Alpha (Search Live)
- [ ] חיפוש "Laphroaig 10" מחזיר תוצאות תוך < 3 שניות
- [ ] Product page לבקבוק אחד מציגה תמונה + ציון + 3+ מקורות
- [ ] Autocomplete עובד עם typos
- [ ] Filter על region=Islay עובד

### M4 — Cost Calculator Live
- [ ] Cost breakdown מוצג לבקבוק אחד עבור UK, US, DE
- [ ] UK duty calculation עם LPA-basis נכון
- [ ] FX "as of [time]" מוצג

### M5 — Beta Launch
- [ ] 10 משתמשי beta נרשמו ושילמו ב-Stripe
- [ ] Wishlist עם 3 פריטים עובד
- [ ] Freemium gate עוצר free user אחרי 50 חיפושים

### M6 — Price Alerts Live
- [ ] Alert email מתקבל ב-inbox אמיתי
- [ ] Push notification מגיע לiPhone test
- [ ] Rate limiting: alert אחד ב-24h לאותו מוצר

### M7 — v1.0 Launch
- [ ] iOS app חי ב-App Store
- [ ] Android app חי ב-Google Play
- [ ] Web app ב-Vercel, LCP < 2.5s
- [ ] 10 קמעונאים רצים ללא interruption 7 ימים

---

*מפת דרכים זו נוצרה: 2026-05-25 (שדרוג 25526)*  
*גרסה הבאה: לאחר השלמת פאזה 1 — מיילסטון M2*
