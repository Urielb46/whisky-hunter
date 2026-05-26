# Project State: WhiskyHunter

## Project Reference

See: .planning/PROJECT.md  
**Core value:** Show the true all-in cost of buying any whisky from anywhere in the world.  
**Last updated:** 2026-05-26

## Current Phase

**Post-development — Awaiting deployment.**  
All code phases are complete. Next step: deploy to Railway (API + Scraper) + Vercel (Web).

## Phase Status

| # | Phase | Status | Notes |
|---|-------|--------|-------|
| 1 | Infrastructure & Database | ✅ Complete | Drizzle ORM, PostgreSQL schema, migrations 0000–0005, seed data; Whiskybase catalog seed (15k+ products, weekly score refresh) |
| 2 | Scraper Pipeline | ✅ Complete | Playwright + stealth, 4 adapters, BullMQ scheduler |
| 3 | API Server | ✅ Complete | Hono v4, tRPC, all routes |
| 4 | Auth + Wishlist + Alerts | ✅ Complete | Better Auth v1.3 (email + Google OAuth) |
| 5 | Web Frontend | ✅ Complete | Next.js 15 App Router, SSR search + product detail |
| 5b | Mobile App | ✅ Complete | Expo SDK 52, Expo Router, all tabs + product detail |
| 5c | Deployment Configs | ✅ Complete | railway.toml (API + Scraper), vercel.json (Web) |
| 6 | UI Design System | ✅ Complete | Stitch (Google) — 13 screens, design system tokens |

**TypeScript typecheck:** ✅ passes clean across all packages.

## Pre-Launch Checklist

| # | Task | Status | Requirement |
|---|------|--------|-------------|
| 1 | Railway — deploy API service | ❌ | Railway account + GitHub repo |
| 2 | Railway — deploy Scraper service | ❌ | Railway account |
| 3 | Railway — Redis service | ❌ | Railway account |
| 4 | Vercel — deploy Web | ❌ | Vercel account + Railway API URL |
| 5 | Google OAuth credentials | ❌ | Google Cloud Console |
| 6 | Resend — email setup | ✅ code / ❌ credentials | Resend account + API key |
| 7 | EAS Build — Android/iOS | ❌ | EAS login + Apple Dev Account |
| 8 | Push notifications job | ✅ code / ❌ EAS | `jobs/price-alert-checker.ts` written |
| 9 | Typesense search (optional) | ❌ | Typesense Cloud account |
| 10 | DB migration — Production | ❌ | DATABASE_URL (Neon/Railway) |
| 11 | Smoke tests | ❌ | Depends on 1–10 |

## UI Design System — Stitch (Google)

**Platform:** [stitch.withgoogle.com](https://stitch.withgoogle.com)  
**Project ID:** `17103168079326692664`  
**Design System ID:** `assets/9585011100005006120` — WhiskyHunter Design System

| Token | Value |
|-------|-------|
| Mode | Dark |
| Primary | Amber Gold `#D4930F` |
| Secondary | Barrel Brown `#8B4513` |
| Headline Font | Playfair Display |
| Body Font | Inter |
| Roundness | Round 8 |

### Desktop Screens

| Screen | Screen ID |
|--------|-----------|
| Landing Page | `0c3cad0ed258483a8f5d72a7f0bed399` |
| Landing Page v2 | `21159ff1c1284d169511d8c6cffdcff1` |
| Search Results v1 | `242611487e454702bafb8a2254c3b976` |
| Search Results v2 | `6f5d8f710f8345c195da9f18e3fdd257` |
| Search Results v3 | `37bb30efb94b47c6ba710e5d7612e390` |
| Search Results v4 | `b544fe362de244d28b80d492fbb4b792` |
| Global Discovery Flow | `8b61aec4ff6b41fd9239f6c4eb81803e` |

### Mobile Screens (Expo)

| Screen | Screen ID |
|--------|-----------|
| Home & Search | `39d2bf29580043b8951d0a18862c1b0b` |
| Search Results | `6e889a61b875474b942078143689c562` |
| Product Detail v1 | `07c2cdddd74b48688806ecd90f4c4e84` |
| Product Detail v2 | `4a47d46297304ee09d911e5480426b71` |
| My Wishlist | `ca609013935a401c8866f997b4579a47` |
| Price Alerts | `6fae5291462b4d4e88dd302549aa4438` |

## Running Locally

```bash
cp .env.example .env          # fill DATABASE_URL + REDIS_URL
pnpm --filter @whisky-hunter/database db:migrate
pnpm --filter @whisky-hunter/database db:seed
pnpm dev
```

Ports: API `localhost:3000` · Web `localhost:3001` · Mobile: `npx expo start`

## Key Context

- Monorepo stack: Next.js 15 + Expo SDK 52 + Hono/tRPC + BullMQ + Playwright + PostgreSQL + Typesense
- Infrastructure: Vercel (web) + Railway (API + workers)
- UK duty: LPA-basis post Aug 2023 HMRC reform — verify rates at go-live
- Anti-bot: Playwright stealth + residential proxies required

## Whiskybase Integration (שדרוג 25526 — 2026-05-25)

- Migration `0005_whiskybase_fields.sql` — added `whiskybase_id`, `whiskybase_url`, `wb_score`, `wb_vote_count` to products
- `packages/scraper/src/adapters/whiskybase-catalog.ts` — Playwright catalog adapter (5 categories, rate-limited)
- `packages/scraper/src/cli/whiskybase-seed.ts` — seed CLI (`pnpm scrape:whiskybase`)
- `packages/scraper/src/jobs/whiskybase-refresh.ts` — weekly BullMQ job (Sunday 03:00 UTC)
- API, web, and mobile product pages show community score + "View on Whiskybase →" + "Ratings powered by Whiskybase" attribution (WBASE-04)

---
*Initialized: 2026-05-04 · Last updated: 2026-05-26*
