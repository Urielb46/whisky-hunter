/**
 * Worker process entry point.
 * Run with: tsx --env-file=../../.env src/worker-entry.ts
 *
 * In production: Railway runs this as a persistent background process
 * (not serverless — BullMQ workers must stay alive).
 */
import { createScrapeWorker } from './queue/index.js';
import { db, queryClient } from '@whisky-hunter/database';
import { retailers } from '@whisky-hunter/database';
import { scheduleRetailers } from './queue/scheduler.js';
import {
  createPriceAlertQueue,
  createPriceAlertWorker,
  ALERT_QUEUE_NAME,
} from './jobs/price-alert-checker.js';

const CONCURRENCY = parseInt(process.env['WORKER_CONCURRENCY'] ?? '2', 10);

async function main() {
  console.log('[worker-entry] starting scrape worker...');

  // Boot the scrape worker
  const worker = createScrapeWorker(CONCURRENCY);

  // Load all active retailers and register their schedules
  const allRetailers = await db.select().from(retailers);
  await scheduleRetailers(
    allRetailers.map((r) => ({
      retailerId: r.id,
      url: r.catalogUrl,
      countryCode: r.country,
      // DB stores 5-field cron; prepend seconds field for BullMQ (6-field)
      cron: `0 ${r.cronExpression}`,
    })),
  );

  // Boot the price-alert checker (runs every 6 hours)
  const alertQueue  = createPriceAlertQueue();
  const alertWorker = createPriceAlertWorker();

  await alertQueue.upsertJobScheduler(
    `${ALERT_QUEUE_NAME}-scheduler`,
    { every: 6 * 60 * 60 * 1000 }, // 6h in ms
    { name: ALERT_QUEUE_NAME, data: {} },
  );

  console.log(`[worker-entry] worker ready — concurrency=${CONCURRENCY}`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[worker-entry] ${signal} received, shutting down...`);
    await worker.close();
    await alertWorker.close();
    await alertQueue.close();
    await queryClient.end();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[worker-entry] fatal:', err);
  process.exit(1);
});
