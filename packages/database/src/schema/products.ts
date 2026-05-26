import { pgTable, uuid, text, smallint, numeric, integer, timestamp, index, unique } from 'drizzle-orm/pg-core';

export const products = pgTable(
  'products',
  {
    id:             uuid('id').primaryKey().defaultRandom(),
    name:           text('name').notNull(),
    distillery:     text('distillery').notNull(),
    ageYears:       smallint('age_years'),
    volumeMl:       smallint('volume_ml').notNull(),
    category:       text('category').notNull(),
    region:         text('region'),
    caskType:       text('cask_type'),
    abv:            numeric('abv', { precision: 4, scale: 1 }),
    imageUrl:       text('image_url'),
    description:    text('description'),
    reviewScore:    numeric('review_score', { precision: 4, scale: 1 }),
    lwinCode:       text('lwin_code'),

    // Whiskybase catalog fields — added שדרוג 25526
    whiskybaseId:   text('whiskybase_id'),
    whiskybaseUrl:  text('whiskybase_url'),
    wbScore:        numeric('wb_score', { precision: 5, scale: 2 }),
    wbVoteCount:    integer('wb_vote_count').default(0),

    createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    distilleryIdx:    index('products_distillery_idx').on(t.distillery),
    lwinCodeIdx:      index('products_lwin_code_idx').on(t.lwinCode),
    whiskybaseIdIdx:  index('products_whiskybase_id_idx').on(t.whiskybaseId),
    whiskybaseIdUniq: unique('products_whiskybase_id_uniq').on(t.whiskybaseId),
  }),
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
