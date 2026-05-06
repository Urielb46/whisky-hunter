---
phase: 1
slug: data-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-04
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `packages/database/vitest.config.ts`, `packages/scraper/vitest.config.ts` — Wave 0 installs |
| **Quick run command** | `pnpm --filter @whisky-hunter/scraper test` |
| **Full suite command** | `pnpm turbo test` |
| **Estimated runtime** | ~15 seconds (unit); ~60 seconds (full with integration) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @whisky-hunter/scraper test`
- **After every plan wave:** Run `pnpm turbo test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds (unit); 60 seconds (full)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | DATA-01 | — | N/A | unit | `pnpm --filter @whisky-hunter/scraper test` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | DATA-01 | T-bot-block | Cloudflare challenge detected before writing to DB | unit | `pnpm --filter @whisky-hunter/scraper test` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | DATA-02 | T-false-merge | Age mismatch rejects merge | unit | `pnpm --filter @whisky-hunter/scraper test` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | DATA-02 | T-false-merge | Similarity < 0.70 → no merge, no review | unit | `pnpm --filter @whisky-hunter/scraper test` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 1 | DATA-03 | T-mutation | No UPDATE path exists in price_snapshots code | unit | `pnpm --filter @whisky-hunter/database test` | ❌ W0 | ⬜ pending |
| 1-04-01 | 04 | 2 | DATA-04 | — | N/A | unit | `pnpm --filter @whisky-hunter/scraper test` | ❌ W0 | ⬜ pending |
| 1-04-02 | 04 | 2 | DATA-04 | — | Failed scrape increments consecutive_failures | unit | `pnpm --filter @whisky-hunter/scraper test` | ❌ W0 | ⬜ pending |
| 1-05-01 | 05 | 2 | DATA-05 | T-stale-display | Staleness query uses last_successful_scrape_at | unit | `pnpm --filter @whisky-hunter/database test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/scraper/vitest.config.ts` — Vitest config for scraper package
- [ ] `packages/database/vitest.config.ts` — Vitest config for database package
- [ ] `packages/scraper/src/resolver/__tests__/entity-resolver.test.ts` — covers DATA-02 (merge/no-merge cases)
- [ ] `packages/database/src/__tests__/staleness-query.test.ts` — covers DATA-05
- [ ] `packages/scraper/src/queue/__tests__/scheduler.test.ts` — covers DATA-04 (mock Redis)
- [ ] `packages/scraper/src/adapters/__tests__/browser-factory.test.ts` — covers DATA-01 (image blocking)
- [ ] `pnpm add -D vitest @vitest/coverage-v8` in each package

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live scraper collects >0 products from 10+ retailers | DATA-01 | Requires live retailer access + proxy credentials | Run `pnpm --filter @whisky-hunter/scraper scrape:test` against each retailer; verify count >0 in DB |
| Cloudflare blocking triggers health alert | DATA-04 | Requires actual Cloudflare block response | Temporarily point scraper at honeypot URL; verify `consecutive_failures` increments and alert fires |
| 48h stale badge appears in listing API | DATA-05 | Requires aging test data in DB | Insert snapshot with `scraped_at = now() - interval '50 hours'`; verify API returns `stale: true` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
