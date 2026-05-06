import { pgTable, uuid, text, smallint, numeric, timestamp, index } from 'drizzle-orm/pg-core';

export const products = pgTable(
  'products',
  {
    id:          uuid('id').primaryKey().defaultRandom(),
    name:        text('name').notNull(),
    distillery:  text('distillery').notNull(),
    ageYears:    smallint('age_years'),
    volumeMl:    smallint('volume_ml').notNull(),
    category:    text('category').notNull(),
    region:      text('region'),
    caskType:    text('cask_type'),
    abv:         numeric('abv', { precision: 4, scale: 1 }),
    imageUrl:    text('image_url'),
    description: text('description'),
    reviewScore: numeric('review_score', { precision: 4, scale: 1 }),
    lwinCode:    text('lwin_code'),
    createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    distilleryIdx: index('products_distillery_idx').on(t.distillery),
    lwinCodeIdx:   index('products_lwin_code_idx').on(t.lwinCode),
  }),
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
