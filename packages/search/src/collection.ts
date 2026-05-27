/**
 * Typesense collection schema and bootstrap helpers.
 *
 * Collection: "whiskies"
 *
 * Design decisions:
 *  - `best_price_gbp`   — float stored in GBP for cross-currency range filtering
 *  - `facets`           — region, category, cask_type, country support filter UI
 *  - `age_years`        — int32 (0 = NAS) for range facets
 *  - `abv`              — float for range facets
 *  - `review_score`     — float, used for default-sort boosting
 *  - `retailer_ids`     — string[] for "available at" filtering
 *  - `in_stock`         — bool for "in stock only" filter
 */

import type Typesense from 'typesense';
import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections.js';

export const COLLECTION_NAME = 'whiskies';

export const COLLECTION_SCHEMA: CollectionCreateSchema = {
  name: COLLECTION_NAME,
  fields: [
    // ── Core identity ────────────────────────────────────────────────────────
    { name: 'id',           type: 'string' },
    { name: 'name',         type: 'string', infix: true },
    { name: 'distillery',   type: 'string', infix: true, facet: true },

    // ── Classification ───────────────────────────────────────────────────────
    { name: 'category',     type: 'string', facet: true },
    { name: 'region',       type: 'string', facet: true, optional: true },
    { name: 'cask_type',    type: 'string', facet: true, optional: true },
    { name: 'country',      type: 'string', facet: true },          // retailer country of cheapest listing

    // ── Numeric specs ────────────────────────────────────────────────────────
    { name: 'age_years',    type: 'int32',  facet: true, optional: true },
    { name: 'volume_ml',    type: 'int32' },
    { name: 'abv',          type: 'float',  facet: true, optional: true },

    // ── Pricing ──────────────────────────────────────────────────────────────
    { name: 'best_price_gbp',    type: 'float',  facet: true, optional: true },
    { name: 'best_price_local',  type: 'float',  optional: true },
    { name: 'best_currency',     type: 'string', optional: true },
    { name: 'retailer_count',    type: 'int32' },
    { name: 'in_stock',          type: 'bool',   facet: true },

    // ── Retailer list ────────────────────────────────────────────────────────
    { name: 'retailer_ids',   type: 'string[]', facet: true, optional: true },
    { name: 'retailer_names', type: 'string[]', optional: true },

    // ── Metadata ─────────────────────────────────────────────────────────────
    { name: 'image_url',     type: 'string', optional: true, index: false },
    { name: 'description',   type: 'string', optional: true, index: false },
    { name: 'review_score',  type: 'float',  optional: true },
    { name: 'lwin_code',     type: 'string', optional: true },
    { name: 'scraped_at',    type: 'int64' },  // Unix timestamp — for staleness display

    // Whiskybase catalog fields — שדרוג 25526 (WBASE-01–04)
    { name: 'whiskybase_id',  type: 'string', optional: true },
    { name: 'wb_score',       type: 'float',  optional: true },
    { name: 'wb_vote_count',  type: 'int32',  optional: true },
    { name: 'whiskybase_url', type: 'string', optional: true, index: false },
  ],

  // Default sort: by text-match relevance (_text_match).
  // review_score is optional so cannot be default_sorting_field in Typesense.
  // Callers can override with sort_by=retailer_count:desc,best_price_gbp:asc etc.

  // Enable prefix search on name + distillery
  token_separators: ['-', '.', '\''],
};

/**
 * Ensure the collection exists.
 * Creates it if missing; updates fields if schema changes require it.
 * Safe to call on every startup.
 */
export async function ensureCollection(
  client: Typesense.Client,
): Promise<void> {
  try {
    await client.collections(COLLECTION_NAME).retrieve();
    // Collection exists — no action needed (use indexer to re-index)
    console.log('[typesense] collection "whiskies" already exists');
  } catch {
    // Not found — create
    await client.collections().create(COLLECTION_SCHEMA);
    console.log('[typesense] collection "whiskies" created');
  }
}

/**
 * Drop and recreate the collection (hard reset).
 * Use carefully — erases all indexed data.
 */
export async function resetCollection(
  client: Typesense.Client,
): Promise<void> {
  try {
    await client.collections(COLLECTION_NAME).delete();
  } catch {
    // Ignore — may not exist
  }
  await client.collections().create(COLLECTION_SCHEMA);
  console.log('[typesense] collection "whiskies" reset');
}
