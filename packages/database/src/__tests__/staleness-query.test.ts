/**
 * staleness-query.test.ts — DATA-05 unit tests for isStale()
 *
 * Verifies: 48h threshold, null handling, boundary condition,
 * and that we use last_successful_scrape_at semantics.
 */
import { describe, it, expect } from 'vitest';
import { isStale, STALE_THRESHOLD_HOURS } from '../staleness.js';

/** Helper: return a Date that is `hours` hours in the past from now. */
function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

describe('STALE_THRESHOLD_HOURS', () => {
  it('is exactly 48', () => {
    expect(STALE_THRESHOLD_HOURS).toBe(48);
  });
});

describe('isStale', () => {
  it('returns true when last_successful_scrape_at is older than 48h', () => {
    expect(isStale(hoursAgo(50))).toBe(true);
    expect(isStale(hoursAgo(72))).toBe(true);
    expect(isStale(hoursAgo(100))).toBe(true);
  });

  it('returns false when last_successful_scrape_at is fresher than 48h', () => {
    expect(isStale(hoursAgo(24))).toBe(false);
    expect(isStale(hoursAgo(1))).toBe(false);
    expect(isStale(new Date())).toBe(false);
  });

  it('returns true for null (retailer has never successfully scraped)', () => {
    // A scraper that has never run has no last_successful_scrape_at → stale
    expect(isStale(null)).toBe(true);
  });

  it('returns true at the exact 48h boundary (boundary is inclusive — >= threshold is stale)', () => {
    // Exactly 48h ago: ageMs === thresholdMs → stale
    expect(isStale(hoursAgo(48))).toBe(true);
  });

  it('returns false just under 48h (47h59m59s ago)', () => {
    const almostThreshold = new Date(Date.now() - (48 * 60 * 60 * 1000 - 1));
    expect(isStale(almostThreshold)).toBe(false);
  });

  it('a scraper blocked by Cloudflare (last_scraped_at recent, last_successful_scrape_at 3 days ago) is stale', () => {
    // Simulates Pitfall 5: scraper "ran" recently but hasn't successfully produced data in 72h
    const lastSuccessfulScrapeAt = hoursAgo(72); // 3 days old
    expect(isStale(lastSuccessfulScrapeAt)).toBe(true);
  });
});
