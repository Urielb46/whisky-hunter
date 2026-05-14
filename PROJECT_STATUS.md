# WhiskyHunter — Project Status
**תאריך:** 12 מאי 2026  
**סטאטוס כללי:** ✅ פיתוח הושלם · ✅ UI Design System הושלם · ⏳ טרם הועלה לאוויר

---

## פאזות פיתוח

| # | פאזה | סטאטוס | פירוט |
|---|------|---------|-------|
| 1 | Infrastructure & Database | ✅ הושלם | Drizzle ORM, PostgreSQL schema, migrations 0000+0001, seed data |
| 2 | Scraper Pipeline | ✅ הושלם | Playwright + stealth, 4 adapters (Whisky Exchange, Master of Malt, Total Wine, Whisky.de), BullMQ scheduler |
| 3 | API Server | ✅ הושלם | Hono v4, tRPC, search/products/cost/health routes |
| 4 | Auth + Wishlist + Alerts | ✅ הושלם | Better Auth v1.3 (email+Google OAuth), wishlist CRUD, price alerts CRUD |
| 5 | Web Frontend | ✅ הושלם | Next.js 15 App Router, search page, product detail, SSR |
| 5b | Mobile App | ✅ הושלם | Expo SDK 52, Expo Router, tabs: search/wishlist/alerts, product detail |
| 5c | Deployment Configs | ✅ הושלם | railway.toml (API + Scraper), vercel.json (Web) |
| 6 | UI Design System (Stitch) | ✅ הושלם | 13 מסכים, design system מלא, HTML code מוכן — ראה פרטים למטה |

**Typecheck:** ✅ עובר clean על כל ה-packages

---

## מבנה הפרויקט

```
apps/
  api/           Hono v4 + Better Auth + tRPC          ✅
    src/
      auth.ts                Better Auth config         ✅
      index.ts               app entry + all routes     ✅
      routes/
        health.ts            GET /health                ✅
        search.ts            GET /api/search            ✅
        products.ts          GET /api/products/:id      ✅
        cost.ts              GET /api/cost              ✅
        auth-handler.ts      /api/auth/* (Better Auth)  ✅
        wishlist.ts          GET/POST/DELETE /api/wishlist ✅
        alerts.ts            GET/POST/PATCH/DELETE /api/alerts ✅
      middleware/
        require-auth.ts      Better Auth session guard  ✅
      railway.toml           Railway deploy config      ✅

  web/           Next.js 15 App Router                  ✅
    src/app/
      layout.tsx             root layout                ✅
      page.tsx               landing / hero             ✅
      search/page.tsx        search results (SSR)       ✅
      products/[id]/page.tsx product detail (SSR)       ✅
    src/components/
      search-form.tsx                                   ✅
      product-card.tsx                                  ✅
    vercel.json              Vercel deploy config       ✅

  mobile/        Expo SDK 52 + Expo Router               ✅
    app/
      _layout.tsx            root layout + QueryClient  ✅
      (tabs)/_layout.tsx     tab navigator              ✅
      (tabs)/index.tsx       search screen              ✅
      (tabs)/wishlist.tsx    wishlist screen            ✅
      (tabs)/alerts.tsx      price alerts screen        ✅
      product/[id].tsx       product detail             ✅
    app.json                 EAS config (projectId TBD) ✅
    lib/api.ts               API client helpers         ✅

packages/
  database/      Drizzle ORM + PostgreSQL               ✅
    schema/
      products.ts, retailers.ts, price-snapshots.ts    ✅
      auth.ts      users/sessions/accounts/verifications ✅
      + wishlists, price_alerts tables in auth.ts      ✅
    migrations/
      0000_initial.sql                                  ✅
      0001_auth.sql                                     ✅
    seed/          retailers + products bootstrap       ✅

  scraper/       Playwright + BullMQ                    ✅
    adapters/    whisky-exchange, master-of-malt,       ✅
                 total-wine, whisky-de (4 adapters)
    queue/       BullMQ scheduler, workers              ✅
    resolver/    product normalizer + fuzzy match       ✅
    railway.toml Railway worker config                  ✅
    jobs/       price-alert-checker.ts                  ✅

  shared/        Zod schemas + FX + duty calc           ✅
    schemas/     normalized-product, raw-product        ✅
    fx/          Frankfurter API client                 ✅
    duty/        rates-table + true-cost calculator     ✅
```

---

## מה עוד חסר לפני Launch

| # | משימה | סטאטוס | דרישות |
|---|-------|---------|--------|
| 1 | Railway — deploy API service | ❌ | חשבון Railway + GitHub repo |
| 2 | Railway — deploy Scraper service | ❌ | חשבון Railway |
| 3 | Railway — Redis service | ❌ | חשבון Railway |
| 4 | Vercel — deploy Web | ❌ | חשבון Vercel + Railway API URL |
| 5 | Google OAuth credentials | ❌ | Google Cloud Console |
| 6 | Resend — email setup | ✅ קוד / ❌ credentials | חשבון Resend + API key + `pnpm install` |
|   | `apps/api/src/email.ts` | ✅ | נכתב |
| 7 | EAS Build — Android/iOS | ❌ | EAS login + Apple Dev Account |
| 8 | Push notifications job | ✅ קוד / ❌ EAS | `jobs/price-alert-checker.ts` נכתב |
| 9 | Typesense search (אופציונלי) | ❌ | חשבון Typesense Cloud |
| 10 | DB migration — Production | ❌ | DATABASE_URL של Neon/Railway |
| 11 | Smoke tests | ❌ | תלוי ב-1-10 |

**קוד שחסר (ניתן לכתוב עכשיו):**
- `apps/api/src/email.ts` — Resend client + sendVerificationEmail + sendPasswordReset
- `packages/scraper/src/jobs/price-alert-checker.ts` — BullMQ job, כל 6 שעות
- רישום ה-job ב-`packages/scraper/src/worker-entry.ts`

**קוד שחסר (תלוי credentials):**
- `apps/mobile/app.json` — projectId של EAS (מתקבל רק אחרי `eas init`)
- `NEXT_PUBLIC_API_URL` — URL של Railway API service

---

## UI Design System — Stitch (Google)

**תאריך:** 12 מאי 2026  
**פלטפורמה:** [stitch.withgoogle.com](https://stitch.withgoogle.com)  
**Project ID:** `17103168079326692664`  
**Design System ID:** `assets/9585011100005006120` — WhiskyHunter Design System

### Design System

| Token | ערך |
|-------|-----|
| Mode | Dark |
| Primary | Amber Gold `#D4930F` |
| Secondary | Barrel Brown `#8B4513` |
| Headline Font | Playfair Display |
| Body Font | Inter |
| Roundness | Round 8 |
| Color Variant | Tonal Spot |

### מסכי Desktop

| מסך | Screen ID | גובה |
|-----|-----------|------|
| Landing Page | `0c3cad0ed258483a8f5d72a7f0bed399` | 3466px |
| Landing Page v2 | `21159ff1c1284d169511d8c6cffdcff1` | 4974px |
| Search Results v1 | `242611487e454702bafb8a2254c3b976` | 2896px |
| Search Results v2 | `6f5d8f710f8345c195da9f18e3fdd257` | 3048px |
| Search Results v3 | `37bb30efb94b47c6ba710e5d7612e390` | 4018px |
| Search Results v4 | `b544fe362de244d28b80d492fbb4b792` | 2746px |
| Global Discovery Flow | `8b61aec4ff6b41fd9239f6c4eb81803e` | 1024px |

### מסכי Mobile (Expo)

| מסך | Screen ID | גובה |
|-----|-----------|------|
| Home & Search | `39d2bf29580043b8951d0a18862c1b0b` | 2238px |
| Search Results | `6e889a61b875474b942078143689c562` | 2332px |
| Product Detail v1 | `07c2cdddd74b48688806ecd90f4c4e84` | 3550px |
| Product Detail v2 | `4a47d46297304ee09d911e5480426b71` | 3506px |
| My Wishlist | `ca609013935a401c8866f997b4579a47` | 1954px |
| Price Alerts | `6fae5291462b4d4e88dd302549aa4438` | 1768px |

### כיצד לגשת ל-HTML Code

כל מסך כולל HTML מוכן. לגישה דרך Stitch MCP:
```
project: projects/17103168079326692664
design system: assets/9585011100005006120
```

---

## מסמכים

| קובץ | תיאור | מיקום |
|------|-------|-------|
| `LAUNCH_PROMPT.md` | הנחיות מפורטות ל-9 משימות pre-launch | ✅ בפרויקט |
| `whisky-hunter-installation-guide.docx` | מדריך התקנה עברי למשתמש לא-טכני | ✅ outputs (יש להעתיק) |
| `PROJECT_STATUS.md` | קובץ זה | ✅ בפרויקט |

---

## סביבת הפיתוח

```
Node.js    22 LTS
pnpm       workspaces + Turborepo
TypeScript ✅ typecheck עובר clean
```

**הרצת הפרויקט מקומית:**
```bash
# 1. העתק .env.example ל-.env ומלא DATABASE_URL + REDIS_URL
cp .env.example .env

# 2. הרץ migrations
pnpm --filter @whisky-hunter/database db:migrate

# 3. Seed data
pnpm --filter @whisky-hunter/database db:seed

# 4. הפעל הכל
pnpm dev
```

**Ports:**
- API: `http://localhost:3000`
- Web: `http://localhost:3001`
- Mobile: Expo Go / `npx expo start`
