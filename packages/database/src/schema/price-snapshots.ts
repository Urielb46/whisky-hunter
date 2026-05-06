import { pgTable, bigserial, uuid, char, numeric, boolean, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { products } from './products';
import { sourceMappings } from './source-mappings';

// IMPORTANT: This table is APPEND-ONLY.
// PARTITION BY RANGE (scraped_at) is added MANUALLY in the migration SQL — Drizzle does not generate it.
// See PLAN-03 for the post-generate SQL edit step.
// DO NOT export an updateXxx helper for this table. Inserts only.
export const priceSnapshots = pgTable(
  'price_snapshots',
  {
    id:                 bigserial('id', { mode: 'bigint' }).notNull(),
    canonicalProductId: uuid('canonical_product_id').notNull().references(() => products.id),
    sourceMappingId:    uuid('source_mapping_id').notNull().references(() => sourceMappings.id),
    currency:           char('currency', { length: 3 }).notNull(),
    priceLocal:         numeric('price_local', { precision: 10, scale: 2 }).notNull(),
    priceUsd:           numeric('price_usd', { precision: 10, scale: 2 }),
    inStock:            boolean('in_stock').notNull().default(true),
    scrapedAt:          timestamp('scraped_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Composite PK required by PostgreSQL when partitioning by scrapedAt
    pk:                primaryKey({ columns: [t.id, t.scrapedAt] }),
    productScrapedIdx: index('price_snapshots_product_scraped_idx').on(t.canonicalProductId, t.scrapedAt),
    sourceScrapedIdx:  index('price_snapshots_source_scraped_idx').on(t.sourceMappingId, t.scrapedAt),
  }),
);

export type PriceSnapshot = typeof priceSnapshots.$inferSelect;
export type NewPriceSnapshot = typeof priceSnapshots.$inferInsert;
