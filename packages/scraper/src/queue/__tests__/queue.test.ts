import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ScrapeJobData, ScrapeJobResult } from '../types.js';
import { SCRAPE_QUEUE_NAME } from '../types.js';

describe('queue types', () => {
  it('SCRAPE_QUEUE_NAME is stable string', () => {
    expect(SCRAPE_QUEUE_NAME).toBe('scrape');
  });

  it('ScrapeJobData shape is valid', () => {
    const job: ScrapeJobData = {
      retailerId: 'master-of-malt',
      url: 'https://www.masterofmalt.com/whiskies/',
      countryCode: 'GB',
      maxPages: 10,
    };
    expect(job.retailerId).toBe('master-of-malt');
    expect(job.maxPages).toBe(10);
  });

  it('ScrapeJobResult shape is valid', () => {
    const result: ScrapeJobResult = {
      retailerId: 'master-of-malt',
      listingsInserted: 42,
      durationMs: 1234,
      pagesVisited: 3,
    };
    expect(result.listingsInserted).toBe(42);
  });

  it('maxPages is optional', () => {
    const job: ScrapeJobData = {
      retailerId: 'whisky-exchange',
      url: 'https://www.thewhiskyexchange.com/c/40/single-malt-scotch-whisky',
      countryCode: 'GB',
    };
    expect(job.maxPages).toBeUndefined();
  });
});
