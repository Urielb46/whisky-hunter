import { Redis } from 'ioredis';

const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

/**
 * Shared Redis connection for BullMQ.
 * BullMQ requires maxRetriesPerRequest: null on the connection it manages.
 */
export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on('error', (err) => {
  console.error('[redis] connection error:', err.message);
});
