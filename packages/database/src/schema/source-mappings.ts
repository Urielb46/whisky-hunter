import { pgTable, uuid, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { products } from './products';
import { retailers } from './retailers';

export const sourceMappings = pgTable(
  'source_mappings',
  {
    id:                 uuid('id').primaryKey().defaultRandom(),
    canonicalProductId: uuid('canonical_product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    retailerId:         text('retailer_id').notNull().references(() => retailers.id),
    sourceUrl:          text('source_url').notNull(),
    sourceProductId:    text('source_product_id').notNull(),
    createdAt:          timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqRetailerSource: uniqueIndex('source_mappings_retailer_source_uniq').on(t.retailerId, t.sourceProductId),
  }),
);

export type SourceMapping = typeof sourceMappings.$inferSelect;
export type NewSourceMapping = typeof sourceMappings.$inferInsert;
