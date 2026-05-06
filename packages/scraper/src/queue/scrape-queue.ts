import { Queue } from 'bullmq';
import { redisConnection } from './connection.js';
import type { ScrapeJobData, ScrapeJobResult } from './types.js';
import { SCRAPE_QUEUE_NAME } from './types.js';

export const scrapeQueue = new Queue<ScrapeJobData, ScrapeJobResult>(
  SCRAPE_QUEUE_NAME,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60_000, // 1 min base, doubles each retry
      },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 100 },
    },
  },
);
