/**
 * Typesense indexer — syncs the canonical product catalogue from PostgreSQL
 * into the "whiskies" Typesense collection.
 *
 * Run with:
 *   pnpm --filter @whisky-hunter/search index
 *   # or directly:
 *   tsx packages/search/src/indexer.ts
 *
 * Env required:
 *   DATABASE_URL      — PostgreSQL connection string
 *   TYPESENSE_HOST    — Typesense host
 *   TYPESENSE_API_KEY — admin API key
 *
 * Strategy:
 *  1. Load all products with their best price snapshot (per retailer).
 *  2. Build a WhiskyDocument for each product.
 *  3. Import in batches of 250 using Typesense bulk import (upsert mode).
 *
 * GBP conversion for best_price_gbp:
 *   - If currency is GBP → use directly
 *   - Otherwise → fetch live rate from Frankfurter API (best-effort)
 */

import { db } from '@whisky-hunter/database';
import { sql } from 'drizzle-orm';
import { typesense, isTypesenseConfigured } from './client.js';
import { ensureCollection } from './collection.js';
import type { WhiskyDocument } from './types.js';

const BATCH_SIZE = 250;

// ---------------------------------------------------------------------------
// FX rates (GBP pivot)
// ---------------------------------------------------------------------------
const rateCache = new Map<string, number>();

async function toGbp(amount: number, currency: string): Promise<number> {
  if (currency === 'GBP') return amount;
  if (rateCache.has(currency)) return amount * rateCache.get(currency)!;

  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${currency}&to=GBP`);
    if (!res.ok) throw new Error('FX error');
    const data = await res.json() as { rates: { GBP: number } };
    rateCache.set(currency, data.rates.GBP);
    return amount * data.rates.GBP;
  } catch {
    // Fallback rates (approximate, updated manually)
    const fallback: Record<string, number> = { USD: 0.79, EUR: 0.86, CAD: 0.58, AUD: 0.50, JPY: 0.0053 };
    const rate = fallback[currency] ?? 1;
    rateCache.set(currency, rate);
    return amount * rate;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!isTypesenseConfigured()) {
    console.error('[indexer] TYPESENSE_HOST and TYPESENSE_API_KEY must be set');
    process.exit(1);
  }

  console.log('[indexer] ensuring collection...');
  await ensureCollection(typesense);

  console.log('[indexer] loading products from PostgreSQL...');

  type ProductRow = {
    id: string;
    name: string;
    distillery: string;
    age_years: number | null;
    volume_ml: number;
    category: string;
    region: string | null;
    cask_type: string | null;
    abv: string | null;
    image_url: string | null;
    description: string | null;
    review_score: string | null;
    lwin_code: string | null;
    // Whiskybase catalog fields — שדרוג 25526 (WBASE-01–04)
    whiskybase_id: string | null;
    wb_score: string | null;
    wb_vote_count: number | null;
    whiskybase_url: string | null;
    // aggregated price data
    best_price_local: string | null;
    best_currency: string | null;
    best_retailer_id: string | null;
    best_retailer_name: string | null;
    best_country: string | null;
    in_stock: boolean | null;
    scraped_at: string | null;
    retailer_ids: string[] | null;
    retailer_names: string[] | null;
  };

  const rows = await db.execute<ProductRow>(sql`
    WITH best_prices AS (
      SELECT DISTINCT ON (sm.canonical_product_id)
        sm.canonical_product_id AS product_id,
        ps.price_local,
        ps.currency,
        r.id      AS retailer_id,
        r.name    AS retailer_name,
        r.country AS retailer_country,
        ps.in_stock,
        ps.scraped_at
      FROM price_snapshots ps
      JOIN source_mappings sm ON sm.id = ps.source_mapping_id
      JOIN retailers r        ON r.id  = sm.retailer_id
      WHERE ps.in_stock = true
      ORDER BY sm.canonical_product_id, ps.price_local ASC, ps.scraped_at DESC
    ),
    retailer_lists AS (
      SELECT
        sm.canonical_product_id AS product_id,
        array_agg(DISTINCT r.id ORDER BY r.id)   AS retailer_ids,
        array_agg(DISTINCT r.name ORDER BY r.name) AS retailer_names,
        COUNT(DISTINCT r.id) AS retailer_count
      FROM price_snapshots ps
      JOIN source_mappings sm ON sm.id = ps.source_mapping_id
      JOIN retailers r        ON r.id  = sm.retailer_id
      WHERE ps.in_stock = true
      GROUP BY sm.canonical_product_id
    )
    SELECT
      p.id,
      p.name,
      p.distillery,
      p.age_years,
      p.volume_ml,
      p.category,
      p.region,
      p.cask_type,
      p.abv,
      p.image_url,
      p.description,
      p.review_score,
      p.lwin_code,
      p.whiskybase_id,
      p.wb_score,
      p.wb_vote_count,
      p.whiskybase_url,
      bp.price_local   AS best_price_local,
      bp.currency      AS best_currency,
      bp.retailer_id   AS best_retailer_id,
      bp.retailer_name AS best_retailer_name,
      bp.retailer_country AS best_country,
      bp.in_stock,
      bp.scraped_at,
      rl.retailer_ids,
      rl.retailer_names
    FROM products p
    LEFT JOIN best_prices  bp ON bp.product_id = p.id
    LEFT JOIN retailer_lists rl ON rl.product_id = p.id
    ORDER BY p.name
  `);

  console.log(`[indexer] loaded ${rows.length} products`);

  const documents: WhiskyDocument[] = [];

  for (const row of rows) {
    const hasPrice = row.best_price_local !== null && row.best_currency !== null;
    const bestPriceGbp = hasPrice
      ? await toGbp(parseFloat(row.best_price_local!), row.best_currency!)
      : undefined;

    const doc: WhiskyDocument = {
      id:           row.id,
      name:         row.name,
      distillery:   row.distillery,
      category:     row.category,
      region:       row.region ?? undefined,
      cask_type:    row.cask_type ?? undefined,
      country:      row.best_country ?? 'GB',
      age_years:    row.age_years ?? undefined,
      volume_ml:    row.volume_ml,
      abv:          row.abv ? parseFloat(row.abv) : undefined,
      best_price_gbp:   bestPriceGbp,
      best_price_local: hasPrice ? parseFloat(row.best_price_local!) : undefined,
      best_currency:    row.best_currency ?? undefined,
      retailer_count:   row.retailer_ids?.length ?? 0,
      in_stock:         row.in_stock ?? false,
      retailer_ids:     row.retailer_ids ?? undefined,
      retailer_names:   row.retailer_names ?? undefined,
      image_url:    row.image_url ?? undefined,
      description:  row.description ?? undefined,
      review_score: row.review_score ? parseFloat(row.review_score) : undefined,
      lwin_code:    row.lwin_code ?? undefined,
      // Whiskybase catalog fields (WBASE-01–04)
      whiskybase_id:  row.whiskybase_id ?? undefined,
      wb_score:       row.wb_score ? parseFloat(row.wb_score) : undefined,
      wb_vote_count:  row.wb_vote_count ?? undefined,
      whiskybase_url: row.whiskybase_url ?? undefined,
      scraped_at:   row.scraped_at
        ? Math.floor(new Date(row.scraped_at).getTime() / 1000)
        : Math.floor(Date.now() / 1000),
    };

    documents.push(doc);
  }

  // Import in batches
  const total = documents.length;
  let indexed = 0;

  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    const results = await typesense
      .collections<WhiskyDocument>('whiskies')
      .documents()
      .import(batch, { action: 'upsert' });

    const errors = results.filter((r) => !r.success);
    if (errors.length > 0) {
      console.error(`[indexer] ${errors.length} errors in batch:`, errors.slice(0, 3));
    }

    indexed += batch.length;
    console.log(`[indexer] indexed ${indexed}/${total}`);
  }

  console.log('[indexer] done ✓');
  process.exit(0);
}

main().catch((err) => {
  console.error('[indexer] fatal error:', err);
  process.exit(1);
});
