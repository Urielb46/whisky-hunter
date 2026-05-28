/**
 * Search rate-limiting middleware — FREQ-01
 *
 * Limits:
 *  - Unauthenticated (guest) : 10 searches / day   (keyed by IP)
 *  - Free tier user          : 50 searches / day   (keyed by userId)
 *  - Premium user            : unlimited
 *
 * Storage: Redis INCR + EXPIREAT (TTL to midnight UTC).
 * If Redis is unavailable, the middleware fails open (allows the request).
 */

import type { Context, Next } from 'hono';
import { Redis } from 'ioredis';
import { auth } from '../auth.js';

const FREE_TIER_LIMIT  = 50;
const GUEST_LIMIT      = 10;

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  try {
    const url = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
    });
    redis.on('error', () => { /* suppress — fail open */ });
    return redis;
  } catch {
    return null;
  }
}

/** Seconds until the next UTC midnight */
function secondsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  ));
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
}

export async function searchRateLimit(c: Context, next: Next): Promise<Response | void> {
  const r = getRedis();

  // Resolve user identity + tier (no forced auth — guests are allowed)
  let userId: string | null = null;
  let tier: 'free' | 'premium' = 'free';

  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (session?.user) {
      userId = session.user.id;
      tier = (session.user as { tier?: 'free' | 'premium' }).tier ?? 'free';
    }
  } catch {
    // Unauthenticated — guest path
  }

  // Premium users bypass the limit entirely
  if (tier === 'premium') {
    await next();
    return;
  }

  const limit = userId ? FREE_TIER_LIMIT : GUEST_LIMIT;
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    ?? c.req.header('x-real-ip')
    ?? 'unknown';
  const key = userId ? `srch:u:${userId}` : `srch:ip:${ip}`;

  // If Redis unavailable → fail open
  if (!r) {
    await next();
    return;
  }

  try {
    const ttl = secondsUntilMidnightUTC();
    const count = await r.incr(key);

    if (count === 1) {
      // First request today — set expiry
      await r.expire(key, ttl);
    }

    // Set informational headers
    c.header('X-RateLimit-Limit',     String(limit));
    c.header('X-RateLimit-Remaining', String(Math.max(0, limit - count)));
    c.header('X-RateLimit-Reset',     String(Math.floor(Date.now() / 1000) + ttl));

    if (count > limit) {
      return c.json(
        {
          error: 'Search limit reached',
          message: `Free accounts are limited to ${limit} searches per day. Upgrade to Premium for unlimited search.`,
          upgrade: '/premium',
          resetsAt: new Date(Date.now() + ttl * 1000).toISOString(),
        },
        429,
      );
    }
  } catch {
    // Redis error → fail open
  }

  await next();
}
