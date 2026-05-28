/**
 * FX rate fetcher — Frankfurter API (ECB data, free, no key needed).
 *
 * Cache strategy (COST-04: max 1-hour staleness):
 *   1. Redis (shared across all processes) — key fx:rates:{base}, TTL 3600s
 *   2. In-process memory fallback — used when Redis unavailable
 *   3. Hardcoded fallback — used when both Redis and Frankfurter API are down
 *
 * Redis connection is lazy — only created if REDIS_URL is set.
 * If Redis fails mid-operation, falls back to in-memory silently.
 */

import type Redis from 'ioredis';

const FRANKFURTER = 'https://api.frankfurter.app';
const CACHE_TTL_MS = 60 * 60 * 1000;    // 1 hour — spec COST-04
const REDIS_TTL_S  = 60 * 60;           // 1 hour in seconds (for Redis EX)
const REDIS_KEY_PREFIX = 'fx:rates:';

// ---------------------------------------------------------------------------
// In-process fallback cache
// ---------------------------------------------------------------------------

interface RatesCache {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
}

let _memCache: RatesCache | null = null;

// ---------------------------------------------------------------------------
// Redis (lazy singleton)
// ---------------------------------------------------------------------------

let _redis: Redis | null = null;
let _redisAttempted = false;

async function getRedis(): Promise<Redis | null> {
  if (_redisAttempted) return _redis;
  _redisAttempted = true;

  const url = process.env['REDIS_URL'];
  if (!url) return null;

  try {
    // Dynamic import so the module still loads in environments without ioredis installed
    const { default: IORedis } = await import('ioredis');
    const client = new IORedis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 3000,
    });
    await client.connect();
    _redis = client;
    _redis.on('error', (err) => {
      console.warn('[fx] Redis error — falling back to in-memory cache:', err.message);
    });
  } catch (err) {
    console.warn('[fx] Redis unavailable — using in-memory cache:', (err as Error).message);
    _redis = null;
  }

  return _redis;
}

// ---------------------------------------------------------------------------
// Core fetch
// ---------------------------------------------------------------------------

async function fetchFromApi(base: string): Promise<Record<string, number>> {
  const res = await fetch(`${FRANKFURTER}/latest?from=${base}`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
  const data = (await res.json()) as { rates: Record<string, number> };
  return { [base]: 1, ...data.rates };
}

const HARDCODED_FALLBACK: Record<string, number> = {
  GBP: 1, USD: 1.27, EUR: 1.18, CAD: 1.73,
  AUD: 1.95, JPY: 192, SEK: 13.4, DKK: 8.8,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getExchangeRates(base = 'GBP'): Promise<Record<string, number>> {
  const redis = await getRedis();

  // 1. Try Redis
  if (redis) {
    try {
      const cached = await redis.get(`${REDIS_KEY_PREFIX}${base}`);
      if (cached) {
        return JSON.parse(cached) as Record<string, number>;
      }
    } catch {
      // Redis read error — fall through to API
    }
  }

  // 2. Try in-memory cache
  const now = Date.now();
  if (_memCache && _memCache.base === base && now - _memCache.fetchedAt < CACHE_TTL_MS) {
    return _memCache.rates;
  }

  // 3. Fetch from Frankfurter
  try {
    const rates = await fetchFromApi(base);

    // Store in Redis
    if (redis) {
      try {
        await redis.set(`${REDIS_KEY_PREFIX}${base}`, JSON.stringify(rates), 'EX', REDIS_TTL_S);
      } catch {
        // Redis write error — non-fatal
      }
    }

    // Store in memory as fallback
    _memCache = { base, rates, fetchedAt: now };
    return rates;
  } catch (err) {
    console.warn('[fx] Frankfurter fetch failed:', err);

    // 4. Stale memory cache
    if (_memCache && _memCache.base === base) {
      return _memCache.rates;
    }

    // 5. Hardcoded fallback (GBP-based only)
    console.warn('[fx] Using hardcoded fallback rates');
    return HARDCODED_FALLBACK;
  }
}

/**
 * Returns exchange rates together with the ISO 8601 timestamp of when the
 * rates were last fetched from the Frankfurter API (COST-04).
 */
export async function getExchangeRatesWithTimestamp(
  base = 'GBP',
): Promise<{ rates: Record<string, number>; fetchedAt: string }> {
  const rates = await getExchangeRates(base);

  // The in-process memory cache stores fetchedAt; if available, use it.
  // Otherwise fall back to "now" (rates were just fetched or came from Redis).
  const fetchedAtMs = _memCache?.base === base ? _memCache.fetchedAt : Date.now();
  return { rates, fetchedAt: new Date(fetchedAtMs).toISOString() };
}

/**
 * Convert an amount from one currency to another.
 */
export async function convertCurrency(
  amount: number,
  from: string,
  to: string,
): Promise<number> {
  if (from === to) return amount;
  const rates = await getExchangeRates(from);
  const rate = rates[to];
  if (!rate) throw new Error(`No FX rate for ${from}→${to}`);
  return amount * rate;
}
