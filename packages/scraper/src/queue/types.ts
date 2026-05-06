/**
 * BullMQ job payload types for the scraper queue.
 * Keep these lean — only what the worker needs to start a job.
 */

export interface ScrapeJobData {
  /** Retailer slug (PK in retailers table) */
  retailerId: string;
  /** Full URL to scrape (product list or search page) */
  url: string;
  /** ISO country code of the retailer (for duty calc context) */
  countryCode: string;
  /** Optional: limit pages scraped per run (default: unlimited) */
  maxPages?: number;
}

export interface ScrapeJobResult {
  retailerId: string;
  listingsInserted: number;
  durationMs: number;
  pagesVisited: number;
}

export const SCRAPE_QUEUE_NAME = 'scrape' as const;

export interface RetailerScheduleEntry {
  retailerId: string;
  url: string;
  countryCode: string;
  /** BullMQ cron pattern (6-field: sec min hr dom mon dow) */
  cron: string;
  maxPages?: number;
}
