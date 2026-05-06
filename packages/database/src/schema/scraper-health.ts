import { pgTable, uuid, text, timestamp, numeric, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { retailers } from './retailers';

export const scraperHealth = pgTable(
  'scraper_health',
  {
    id:                     uuid('id').primaryKey().defaultRandom(),
    retailerId:             text('retailer_id').notNull().references(() => retailers.id),
    lastScrapedAt:          timestamp('last_scraped_at', { withTimezone: true }),
    lastSuccessfulScrapeAt: timestamp('last_successful_scrape_at', { withTimezone: true }),
    lastScrapeStatus:       text('last_scrape_status'),
    successRateLast24h:     numeric('success_rate_last_24h', { precision: 5, scale: 2 }),
    consecutiveFailures:    integer('consecutive_failures').notNull().default(0),
    updatedAt:              timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqRetailer: uniqueIndex('scraper_health_retailer_uniq').on(t.retailerId),
  }),
);

export type ScraperHealth = typeof scraperHealth.$inferSelect;
export type NewScraperHealth = typeof scraperHealth.$inferInsert;
