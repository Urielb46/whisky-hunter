import { scrapeQueue } from './scrape-queue.js';
import type { ScrapeJobData, RetailerScheduleEntry } from './types.js';

export type { RetailerScheduleEntry };

/**
 * Register (or update) a cron-based repeatable job per retailer.
 * Uses BullMQ upsertJobScheduler — idempotent on re-start.
 *
 * Default cron: 0 0 2 * * * (2 AM UTC daily).
 * Per-retailer overrides read from `retailers.cronExpression` (set in seed).
 */
export async function scheduleRetailers(
  entries: RetailerScheduleEntry[],
): Promise<void> {
  for (const entry of entries) {
    const jobData: ScrapeJobData = {
      retailerId: entry.retailerId,
      url: entry.url,
      countryCode: entry.countryCode,
      ...(entry.maxPages !== undefined ? { maxPages: entry.maxPages } : {}),
    };

    await scrapeQueue.upsertJobScheduler(
      `retailer:${entry.retailerId}`,
      { pattern: entry.cron },
      {
        name: `scrape:${entry.retailerId}`,
        data: jobData,
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 60_000 },
        },
      },
    );

    console.log(
      `[scheduler] registered retailer=${entry.retailerId} cron="${entry.cron}"`,
    );
  }
}

/**
 * Remove all registered retailer schedules.
 * Useful for clean reset during dev / testing.
 */
export async function clearAllSchedules(): Promise<void> {
  const schedulers = await scrapeQueue.getJobSchedulers();
  for (const s of schedulers) {
    await scrapeQueue.removeJobScheduler(s.key);
  }
  console.log(`[scheduler] cleared ${schedulers.length} schedules`);
}
