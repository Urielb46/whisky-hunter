/**
 * staleness.ts — DATA-05: Scraper data freshness utility.
 *
 * CRITICAL (Pitfall 5): Always check last_successful_scrape_at, NOT last_scraped_at.
 * last_scraped_at is updated even when a scrape run is blocked by Cloudflare or
 * returns zero products — it reflects "we tried", not "we succeeded".
 * last_successful_scrape_at is only updated on a run that produced valid listings.
 *
 * Exports:
 *   STALE_THRESHOLD_HOURS — 48h staleness boundary (grep-verifiable)
 *   isStale(lastSuccessfulScrapeAt) — returns true if data is stale or never scraped
 *
 * Added: שדרוג 25526 (2026-05-25)
 */

/** 48-hour staleness threshold. Listings older than this are considered stale. */
export const STALE_THRESHOLD_HOURS = 48;

/**
 * Returns true if the given timestamp is older than STALE_THRESHOLD_HOURS,
 * or null (null means the retailer has never successfully scraped — treat as stale).
 *
 * @param lastSuccessfulScrapeAt - Value from scraper_health.last_successful_scrape_at.
 *   MUST be last_successful_scrape_at, NOT last_scraped_at (see Pitfall 5).
 */
export function isStale(lastSuccessfulScrapeAt: Date | null): boolean {
  if (lastSuccessfulScrapeAt === null) return true; // Never successfully scraped → stale
  const ageMs = Date.now() - lastSuccessfulScrapeAt.getTime();
  const thresholdMs = STALE_THRESHOLD_HOURS * 60 * 60 * 1000;
  return ageMs >= thresholdMs; // Exactly at the boundary is also stale
}
