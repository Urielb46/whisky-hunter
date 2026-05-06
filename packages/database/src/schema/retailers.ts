import { pgTable, text, char, boolean, timestamp } from 'drizzle-orm/pg-core';

export const retailers = pgTable('retailers', {
  id:               text('id').primaryKey(),
  name:             text('name').notNull(),
  baseUrl:          text('base_url').notNull(),
  country:          char('country', { length: 2 }).notNull(),
  currency:         char('currency', { length: 3 }).notNull(),
  scraperType:      text('scraper_type').notNull(),
  catalogUrl:       text('catalog_url').notNull(),
  cronExpression:   text('cron_expression').notNull().default('0 2 * * *'),
  affiliateProgram: boolean('affiliate_program').notNull().default(false),
  tosStatus:        text('tos_status').notNull().default('ambiguous'),
  active:           boolean('active').notNull().default(true),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Retailer = typeof retailers.$inferSelect;
export type NewRetailer = typeof retailers.$inferInsert;
