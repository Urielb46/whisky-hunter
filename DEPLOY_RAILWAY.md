# Railway Deployment Guide — WhiskyHunter

**Updated:** 2026-05-26  
**Status:** Ready to deploy — DB (Neon) already live, Vercel web already live.

---

## Step 0 — Git Push (do this first)

Open Git Bash or any terminal:

```bash
cd "C:\Users\uriel\Documents\Claude\Projects\אפליקציית חיפוש ורכישת וויסקי"
git add -A
git commit -m "feat: WBASE-04 Whiskybase attribution on API, web, mobile"
git push origin main
```

Vercel will auto-deploy the web app within ~2 minutes after push.

---

## Step 1 — Create Railway Project

1. Go to [railway.app](https://railway.app) → **Login with GitHub**
2. Click **New Project** → **Deploy from GitHub repo** → select `Urielb46/whisky-hunter`
3. Railway will detect the monorepo. **Cancel** the initial auto-deploy — we'll configure manually.

---

## Step 2 — Add Redis Service

1. In your Railway project, click **+ New** → **Database** → **Add Redis**
2. Click the Redis service → go to **Connect** tab → copy the `REDIS_URL` value
3. Save it — you'll need it for the API and Scraper env vars below.

---

## Step 3 — Deploy API Service

1. Click **+ New** → **GitHub Repo** → `Urielb46/whisky-hunter`
2. Under **Source**, set **Root Directory** to: `apps/api`
3. Railway detects `railway.toml` automatically (start command: `node dist/index.js`)
4. Go to **Variables** tab → add ALL of the following:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://neondb_owner:npg_1KgPG0YLezfA@ep-purple-dawn-ali2nqq3.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require
REDIS_URL=<paste from Step 2>
BETTER_AUTH_SECRET=58dcc84013f01e3f20c3c613c9719bf6b2d6417e27972ff75d91ca91401be09a
BETTER_AUTH_URL=<Railway API public URL — set after first deploy>
RESEND_API_KEY=<get from resend.com — free tier OK>
RESEND_FROM=noreply@whiskyhunter.com
TYPESENSE_HOST=<Typesense Cloud host or skip for now>
TYPESENSE_PORT=443
TYPESENSE_PROTOCOL=https
TYPESENSE_API_KEY=<Typesense Cloud key or skip for now>
WORKER_CONCURRENCY=2
```

> **Stripe** — skip for now. Auth and search work without it. Add when ready:
> ```
> STRIPE_SECRET_KEY=sk_live_...
> STRIPE_WEBHOOK_SECRET=whsec_...
> STRIPE_PRICE_MONTHLY=price_...
> STRIPE_PRICE_ANNUAL=price_...
> ```

5. Click **Deploy** — wait for health check at `/health` to pass (~2-3 min)
6. Go to **Settings** → **Networking** → **Generate Domain** → copy the Railway URL (e.g. `https://whisky-hunter-api-production.up.railway.app`)

---

## Step 4 — Deploy Scraper/Worker Service

1. Click **+ New** → **GitHub Repo** → `Urielb46/whisky-hunter`
2. Under **Source**, set **Root Directory** to: `packages/scraper`
3. Railway detects `railway.toml` (start command: `node dist/worker-entry.js`)
4. Go to **Variables** → add:

```
NODE_ENV=production
DATABASE_URL=<same as API above>
REDIS_URL=<same Redis URL from Step 2>
PROXY_URL=<Bright Data residential proxy — leave blank to start without proxies>
SCRAPER_HEADLESS=true
SCRAPER_DEFAULT_CRON=0 2 * * *
WORKER_CONCURRENCY=2
TYPESENSE_HOST=<same as API>
TYPESENSE_PORT=443
TYPESENSE_PROTOCOL=https
TYPESENSE_API_KEY=<same as API>
```

5. Click **Deploy** — scraper worker starts and registers BullMQ jobs

---

## Step 5 — Run DB Migration

After the API service is live, open Railway's shell for the API service:

```bash
# In Railway API service → Settings → Shell
pnpm --filter @whisky-hunter/database db:migrate
```

Or run locally with the production DATABASE_URL:
```bash
DATABASE_URL="postgresql://neondb_owner:npg_1KgPG0YLezfA@ep-purple-dawn-ali2nqq3.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require" pnpm --filter @whisky-hunter/database db:migrate
```

---

## Step 6 — Update Vercel NEXT_PUBLIC_API_URL

1. Go to [vercel.com](https://vercel.com) → `whisky-hunter` project → **Settings** → **Environment Variables**
2. Update (or add):
   ```
   NEXT_PUBLIC_API_URL = https://<your-railway-api-url>
   ```
   Example: `https://whisky-hunter-api-production.up.railway.app`
3. Go to **Deployments** → **Redeploy** the latest deployment (or push a new commit)

---

## Step 7 — Seed Whiskybase Catalog (optional but recommended)

Once API + Scraper are running, seed the catalog from Whiskybase:

```bash
# In Railway Scraper service → Settings → Shell
pnpm scrape:whiskybase:dry --max-per-cat=5   # dry run first
pnpm scrape:whiskybase --max-per-cat=500     # real seed
```

---

## Accounts Needed (all free tiers OK for v1)

| Service | URL | Notes |
|---------|-----|-------|
| Railway | railway.app | $5/mo Hobby plan covers API + Scraper + Redis |
| Resend | resend.com | Free tier: 3,000 emails/mo |
| Typesense Cloud | cloud.typesense.org | Free tier available, or self-host on Railway |
| Stripe | stripe.com | Only needed for premium subscriptions |
| Google OAuth | console.cloud.google.com | Only needed for Google login |

---

## Current State

| Service | Status | URL |
|---------|--------|-----|
| Database (Neon) | ✅ Live | `ep-purple-dawn-ali2nqq3.c-3.eu-central-1.aws.neon.tech` |
| Web (Vercel) | ✅ Live | `whisky-hunter-pi.vercel.app` |
| API (Railway) | ❌ Not deployed | — |
| Scraper (Railway) | ❌ Not deployed | — |
| Redis (Railway) | ❌ Not deployed | — |
| DB Migration | ❌ Not run in prod | Run after API deploys |

---

## After All Steps Complete

The app will be fully live at `whisky-hunter-pi.vercel.app` with:
- ✅ Search powered by Typesense
- ✅ Product detail pages with Whiskybase scores + attribution
- ✅ Landed cost calculator (duty + VAT + FX)
- ✅ Auth (email + Google)
- ✅ Price alerts (email via Resend)
- ✅ Freemium gates (Stripe)
