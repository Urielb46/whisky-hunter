/**
 * monthly-partition-job.ts — BullMQ job for pre-creating PostgreSQL partitions.
 *
 * Pitfall 4: price_snapshots is range-partitioned by scraped_at (monthly).
 * If the partition for the new month doesn't exist before the 1st, every
 * scraper insert on the 1st will fail with "no partition of relation found".
 *
 * Solution: Run ensureCurrentAndNextMonthPartitions() on the 25th of each month
 * so the next month's partition is always pre-created with 6 days of headroom.
 *
 * Cron: '0 0 25 * *' — midnight UTC on the 25th of each month.
 *
 * Added: שדרוג 25526 (2026-05-25)
 */

import { Queue, Worker } from 'bullmq';
import { redisConnection } from './connection.js';
import { ensureCurrentAndNextMonthPartitions } from '@whisky-hunter/database';

export const PARTITION_QUEUE_NAME = 'maintenance';
const PARTITION_JOB_NAME = 'create-monthly-partition';
const PARTITION_CRON = '0 0 25 * *'; // Midnight UTC on the 25th of each month

// ─── Queue factory ────────────────────────────────────────────────────────────

export function createPartitionQueue(): Queue {
  return new Queue(PARTITION_QUEUE_NAME, { connection: redisConnection });
}

// ─── Schedule registration — idempotent via upsertJobScheduler ───────────────

/**
 * Register (or update) the monthly partition creation scheduler.
 * Safe to call on every worker startup — upsertJobScheduler is idempotent.
 */
export async function registerMonthlyPartitionJob(queue?: Queue): Promise<void> {
  const q = queue ?? createPartitionQueue();
  await q.upsertJobScheduler(
    PARTITION_JOB_NAME,
    { pattern: PARTITION_CRON },
    {
      name: PARTITION_JOB_NAME,
      data: {},
      opts: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 }, // retry after 1min, 2min, 4min
      },
    },
  );
  console.log(`[monthly-partition] scheduler registered (cron: ${PARTITION_CRON})`);
}

// ─── Worker ───────────────────────────────────────────────────────────────────

export function createPartitionWorker(): Worker {
  return new Worker(
    PARTITION_QUEUE_NAME,
    async (job) => {
      if (job.name !== PARTITION_JOB_NAME) return; // Ignore unrelated jobs in shared queue

      const now = new Date();
      console.log(`[monthly-partition] running for ${now.toISOString()}`);
      await ensureCurrentAndNextMonthPartitions(now);
      console.log('[monthly-partition] ensured current + next month partitions ✓');
    },
    {
      connection: redisConnection,
      concurrency: 1, // DDL operations are not parallelisable
    },
  );
}

/** One-shot runner (for CLI / manual invocation). */
export async function runMonthlyPartitionJob(): Promise<void> {
  await ensureCurrentAndNextMonthPartitions(new Date());
  console.log('[monthly-partition] ensured current + next month partitions');
}
