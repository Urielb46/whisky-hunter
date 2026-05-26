/**
 * whiskybase-refresh.ts — BullMQ job for weekly Whiskybase score refresh
 *
 * WBASE-02: Refresh community score + vote count for all products that
 * have a whiskybase_id. Runs every Sunday at 03:00 UTC.
 *
 * Strategy:
 *   1. Load all products WHERE whiskybase_id IS NOT NULL from PostgreSQL.
 *   2. For each, visit https://www.whiskybase.com/whiskies/{id} with
 *      Playwright and re-scrape reviewScore + reviewCount only.
 *   3. UPDATE products SET wb_score, wb_vote_count, updated_at = NOW().
 *
 * Rate limit: 1 req / 2 s (same as the initial seed — respects robots.txt).
 * Proxy: reads PROXY_URL from env (same residential proxy as seed).
 *
 * COMPLIANCE:
 *   robots.txt must be verified before production activation.
 *   Attribution "Ratings powered by Whiskybase" displayed in UI (WBASE-04).
 *
 * Added: שדרוג 25526 (2026-05-25)
 */

import { Queue, Worker } from 'bullmq';
import { chromium } from 'playwright';
import { redisConnection } from '../queue/connection.js';
import { db } from '@whisky-hunter/database';
import { products } from '@whisky-hunter/database';
import { isNotNull, sql } from 'drizzle-orm';
import { WhiskybaseCatalogAdapter } from '../adapters/whiskybase-catalog.js';

// ---------------------------------------------------------------------------
// Queue name + cron schedule
// ---------------------------------------------------------------------------

export const WB_REFRESH_QUEUE_NAME = 'whiskybase-refresh';

/** BullMQ 6-field cron: every Sunday at 03:00 UTC */
const WB_REFRESH_CRON = '0 0 3 * * 0';

// ---------------------------------------------------------------------------
// Queue factory
// ---------------------------------------------------------------------------

export function createWhiskybaseRefreshQueue(): Queue {
  return new Queue(WB_REFRESH_QUEUE_NAME, { connection: redisConnection });
}

// ---------------------------------------------------------------------------
// Schedule registration — idempotent via upsertJobScheduler
// ---------------------------------------------------------------------------

/**
 * Register (or update) the weekly refresh scheduler.
 * Safe to call on every worker startup.
 */
export async function scheduleWhiskybaseRefresh(
  queue: Queue,
): Promise<void> {
  await queue.upsertJobScheduler(
    'whiskybase-weekly-refresh',
    { pattern: WB_REFRESH_CRON },
    {
      name: 'whiskybase-refresh',
      data: {},
      opts: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 10 * 60 * 1000 }, // retry after 10 min
      },
    },
  );
  console.log(`[whiskybase-refresh] scheduler registered (cron: ${WB_REFRESH_CRON})`);
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export function createWhiskybaseRefreshWorker(): Worker {
  return new Worker(
    WB_REFRESH_QUEUE_NAME,
    async () => {
      const startedAt = Date.now();
      console.log('[whiskybase-refresh] starting weekly score refresh...');

      // Load all products with a whiskybase_id
      const rows = await db
        .select({
          id:           products.id,
          whiskybaseId: products.whiskybaseId,
        })
        .from(products)
        .where(isNotNull(products.whiskybaseId));

      console.log(`[whiskybase-refresh] ${rows.length} products to refresh`);
      if (rows.length === 0) return;

      const adapter = new WhiskybaseCatalogAdapter();
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const context = await adapter.createContext(browser);
      const page    = await context.newPage();

      let updated = 0;
      let errors  = 0;

      try {
        for (const row of rows) {
          if (!row.whiskybaseId) continue;

          // Rate limit: same 2 s + jitter as initial seed
          await sleep(2_000 + Math.floor(Math.random() * 500));

          try {
            const url = `https://www.whiskybase.com/whiskies/${row.whiskybaseId}`;
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

            // Detect bot block — throws if Cloudflare challenge seen
            await detectBlock(page, url);

            // Scrape score + vote count only
            const { reviewScore, reviewCount } = await page.evaluate(() => {
              const getText = (sel: string): string | null =>
                (document.querySelector(sel) as HTMLElement | null)
                  ?.textContent?.trim() ?? null;

              const scoreText = getText(
                '.whisky-rating__score, .score-value, [class*="rating__score"], ' +
                '[class*="score__value"], .rating-average',
              );
              const reviewScore =
                scoreText && /[\d.]/.test(scoreText)
                  ? parseFloat(scoreText)
                  : null;

              const votesText =
                getText('.whisky-rating__votes, [class*="votes"], [class*="ratings-count"]') ?? '';
              const reviewCount = parseInt(votesText.replace(/[^0-9]/g, '') || '0', 10);

              return { reviewScore, reviewCount };
            });

            // Update PostgreSQL
            await db
              .update(products)
              .set({
                wbScore:     reviewScore != null ? String(reviewScore) : undefined,
                wbVoteCount: reviewCount,
                updatedAt:   sql`NOW()`,
              })
              .where(sql`${products.id} = ${row.id}`);

            updated++;
            if (updated % 50 === 0) {
              const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
              console.log(`[whiskybase-refresh] ${updated}/${rows.length} updated (${elapsed}s)`);
            }
          } catch (err) {
            errors++;
            const msg = String(err);
            if (msg.includes('bot-block')) {
              console.error('[whiskybase-refresh] bot-block detected — aborting refresh');
              throw err; // propagate so BullMQ retries later
            }
            console.warn(
              `[whiskybase-refresh] error for id=${row.whiskybaseId}: ${msg}`,
            );
          }
        }
      } finally {
        await page.close().catch(() => undefined);
        await context.close().catch(() => undefined);
        await browser.close().catch(() => undefined);
      }

      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(
        `[whiskybase-refresh] done — ${updated} updated, ${errors} errors, ${elapsed}s elapsed`,
      );
    },
    {
      connection: redisConnection,
      concurrency: 1, // only one refresh runs at a time
    },
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function detectBlock(page: import('playwright').Page, url: string): Promise<void> {
  const title = await page.title().catch(() => '');
  if (
    title.toLowerCase().includes('just a moment') ||
    title.toLowerCase().includes('cloudflare') ||
    title.toLowerCase().includes('access denied') ||
    title.toLowerCase().includes('forbidden')
  ) {
    throw new Error(`bot-block: Cloudflare/WAF challenge at ${url}`);
  }
}
