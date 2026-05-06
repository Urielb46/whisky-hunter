import { pgTable, uuid, text, numeric, timestamp } from 'drizzle-orm/pg-core';
import { products } from './products';

export const dedupReviewQueue = pgTable('dedup_review_queue', {
  id:              uuid('id').primaryKey().defaultRandom(),
  productAId:      uuid('product_a_id').notNull().references(() => products.id),
  productBId:      uuid('product_b_id').notNull().references(() => products.id),
  similarityScore: numeric('similarity_score', { precision: 4, scale: 3 }).notNull(),
  status:          text('status').notNull().default('pending'),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type DedupReviewItem = typeof dedupReviewQueue.$inferSelect;
export type NewDedupReviewItem = typeof dedupReviewQueue.$inferInsert;
