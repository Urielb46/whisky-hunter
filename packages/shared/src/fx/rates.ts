/**
 * FX rate fetcher — Frankfurter API (ECB data, free, no key needed).
 * Fallback: cached rates from last successful fetch.
 */

const FRANKFURTER = 'https://api.frankfurter.app';
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

interface RatesCache {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
}

let _cache: RatesCache | null = null;

export async function getExchangeRates(base = 'GBP'): Promise<Record<string, number>> {
  const now = Date.now();
  if (_cache && _cache.base === base && now - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache.rates;
  }

  try {
    const res = await fetch(`${FRANKFURTER}/latest?from=${base}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
    const data = (await res.json()) as { rates: Record<string, number> };
    _cache = { base, rates: { [base]: 1, ...data.rates }, fetchedAt: now };
    return _cache.rates;
  } catch (err) {
    console.warn('[fx] Frankfurter fetch failed, using cached rates:', err);
    if (_cache) return _cache.rates;
    // Hardcoded fallback — updated 2025-Q2
    return {
      GBP: 1, USD: 1.27, EUR: 1.18, CAD: 1.73,
      AUD: 1.95, JPY: 192, SEK: 13.4, DKK: 8.8,
    };
  }
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
