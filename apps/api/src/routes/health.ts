/**
 * health.ts — API health routes.
 *
 * GET /health          — liveness probe (DB connectivity check)
 * GET /health/scrapers — DATA-04: per-retailer scraper status with isStale flag
 *
 * DATA-05: /scrapers uses isStale(last_successful_scrape_at) — NOT last_scraped_at —
 * to correctly flag retailers whose scraper ran but was blocked (Pitfall 5).
 *
 * Security (T-01-05-03, T-01-05-05):
 *   db.select().from(scraperHealth) generates parameterized SQL — no string interpolation.
 *   Endpoint is unauthed in Phase 1 (accepted risk); auth gate added in Phase 4.
 */

import { Hono } from 'hono';
import { db, scraperHealth, isStale } from '@whisky-hunter/database';
import { sql } from 'drizzle-orm';

const health = new Hono();

/**
 * GET /health
 * Basic liveness probe — checks DB connectivity.
 * Used by Railway health checks and uptime monitors.
 */
health.get('/', async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
    return c.json({ status: 'ok', db: 'connected', ts: new Date().toISOString() });
  } catch {
    return c.json({ status: 'error', db: 'unreachable' }, 503);
  }
});

/**
 * GET /health/scrapers
 * DATA-04: Per-retailer scraper health status.
 * DATA-05: Includes isStale flag from last_successful_scrape_at (not last_scraped_at).
 *
 * Response shape:
 * {
 *   count: number,
 *   timestamp: string,
 *   retailers: Array<{
 *     retailerId, lastScrapedAt, lastSuccessfulScrapeAt,
 *     lastScrapeStatus, consecutiveFailures, successRateLast24h,
 *     stale, updatedAt
 *   }>
 * }
 */
health.get('/scrapers', async (c) => {
  try {
    const rows = await db.select().from(scraperHealth);

    const retailers = rows.map((r) => ({
      retailerId:             r.retailerId,
      lastScrapedAt:          r.lastScrapedAt?.toISOString() ?? null,
      lastSuccessfulScrapeAt: r.lastSuccessfulScrapeAt?.toISOString() ?? null,
      lastScrapeStatus:       r.lastScrapeStatus,
      consecutiveFailures:    r.consecutiveFailures,
      successRateLast24h:     r.successRateLast24h ?? null,
      // DATA-05: stale = last_successful_scrape_at older than 48h, or null (never scraped)
      stale:                  isStale(r.lastSuccessfulScrapeAt ?? null),
      updatedAt:              r.updatedAt.toISOString(),
    }));

    return c.json({
      count:     retailers.length,
      timestamp: new Date().toISOString(),
      retailers,
    });
  } catch (err) {
    console.error('[health/scrapers]', err);
    return c.json({ status: 'error', message: 'Failed to load scraper health' }, 503);
  }
});

export { health };
