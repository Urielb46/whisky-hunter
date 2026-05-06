# WhiskyHunter — Pre-Launch Tasks Prompt

## Project context

WhiskyHunter is a whisky price comparison app (monorepo: pnpm + Turborepo).
All 5 development phases are **complete** and typecheck passes clean.

Stack:
- `apps/api` — Hono v4 + Better Auth + tRPC (port 3000)
- `apps/web` — Next.js 15 App Router (port 3001)
- `apps/mobile` — Expo SDK 52 + Expo Router
- `packages/scraper` — Playwright + BullMQ workers (4 adapters)
- `packages/database` — Drizzle ORM + PostgreSQL (migrations 0000+0001 applied)
- `packages/shared` — Zod schemas + FX rates + true-cost calculation

Workspace: `C:\Users\uriel\Documents\Claude\Projects\אפליקציית חיפוש ורכישת וויסקי`

---

## What remains before Launch

Work through these in order. Use caveman style (terse, no summaries). Stop only if blocked.

---

### Task 1 — Railway deployment (API + Scraper)

1. Verify `apps/api/railway.toml` and `packages/scraper/railway.toml` exist
2. Guide through creating two Railway services from the GitHub repo:
   - Service 1: root=`apps/api`, uses `apps/api/railway.toml`
   - Service 2: root=`packages/scraper`, uses `packages/scraper/railway.toml`
3. Add Railway Redis service (auto-sets `REDIS_URL`)
4. Set env vars on both services:
   ```
   DATABASE_URL=<neon connection string>
   REDIS_URL=<railway redis — auto>
   BETTER_AUTH_SECRET=<generate with openssl rand -base64 32>
   NODE_ENV=production
   GOOGLE_CLIENT_ID=<optional>
   GOOGLE_CLIENT_SECRET=<optional>
   RESEND_API_KEY=<optional>
   ```
5. Deploy and confirm `/health` returns 200

---

### Task 2 — Vercel deployment (Web)

1. Verify `apps/web/vercel.json` exists
2. Guide through Vercel project setup:
   - Framework: Next.js
   - Root Directory: `apps/web`
   - Build Command: `pnpm --filter @whisky-hunter/web build`
3. Set env vars:
   ```
   NEXT_PUBLIC_API_URL=https://<railway-api-url>
   ```
4. Deploy and confirm homepage loads

---

### Task 3 — Google OAuth credentials

1. Create OAuth 2.0 credentials at console.cloud.google.com
2. Authorized redirect URIs:
   - `https://<railway-api-url>/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (dev)
3. Add `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` to Railway API service
4. Verify Google sign-in flow works on deployed web app

---

### Task 4 — Resend email setup

1. Register at resend.com → create API key
2. Add domain (or use onboarding@resend.dev for testing)
3. Add `RESEND_API_KEY` to Railway API service
4. Wire Resend into Better Auth for:
   - Email verification on sign-up
   - Password reset flow
5. File: `apps/api/src/email.ts` — create Resend client + sendVerificationEmail + sendPasswordReset helpers

---

### Task 5 — Expo EAS Build (Mobile)

1. `cd apps/mobile && eas login && eas init`
2. Copy the generated `projectId` into `apps/mobile/app.json` under `extra.eas.projectId`
3. Set API URL in `app.json`:
   ```json
   "extra": { "apiUrl": "https://<railway-api-url>", "eas": { "projectId": "..." } }
   ```
4. Build preview APK for Android:
   ```
   eas build --platform android --profile preview
   ```
5. Test on device via Expo Go or install APK directly

---

### Task 6 — Push notifications (Price Alerts)

1. Add `expo-notifications` token registration to `apps/mobile/app/(tabs)/alerts.tsx`
2. On first alert creation, register push token and store in `users` table (add `push_token` column to auth schema)
3. Create `packages/scraper/src/jobs/price-alert-checker.ts`:
   - BullMQ job that runs every 6h
   - Queries `price_snapshots` JOIN `price_alerts` WHERE `price_local <= target_price_gbp`
   - Triggers Expo push notification via `https://exp.host/--/api/v2/push/send`
   - Updates `last_triggered_at`
4. Register job in `packages/scraper/src/worker-entry.ts`

---

### Task 7 — Typesense search (optional, performance)

1. Sign up at cloud.typesense.org (free tier) or self-host on Railway
2. Create collection `whiskies` with fields: id, name, distillery, age_years, category, region, abv
3. Create `packages/scraper/src/jobs/typesense-sync.ts` — sync canonical products on upsert
4. Replace SQL ILIKE search in `apps/api/src/routes/search.ts` with Typesense query
5. Add `TYPESENSE_API_KEY` + `TYPESENSE_HOST` to env vars

---

### Task 8 — Production DB migration + seed

After Railway + Neon are connected:
```bash
DATABASE_URL="<prod-url>" pnpm --filter @whisky-hunter/database db:migrate
DATABASE_URL="<prod-url>" pnpm --filter @whisky-hunter/database db:seed
```

---

### Task 9 — Smoke test checklist

- [ ] `GET /health` → 200
- [ ] `GET /api/search?q=macallan` → results with prices
- [ ] `GET /api/products/:id` → product + retailer prices
- [ ] `GET /api/cost?retailerId=whisky-exchange&productId=:id&destination=IL` → cost breakdown
- [ ] Sign up with email → session created
- [ ] Sign in with Google → OAuth flow completes
- [ ] Add to wishlist → persists across sessions
- [ ] Create price alert → saved in DB
- [ ] Scraper worker starts and scrapes 1 page → listings in DB

---

## Instructions for Claude

- Work caveman style — terse, no summaries between tasks
- Execute tasks in order 1→9
- Stop only if you need credentials/tokens from the user
- After each Railway/Vercel step, ask the user to confirm the deployment URL before proceeding
- For Tasks 5-7, check if the user has Apple/Google developer accounts before starting
