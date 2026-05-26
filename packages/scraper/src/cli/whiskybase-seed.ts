/**
 * whiskybase-seed.ts — CLI entry point for the Whiskybase catalog seed
 *
 * Crawls Whiskybase across all categories, extracts canonical product metadata,
 * and upserts into the products table (keyed on whiskybase_id).
 *
 * WBASE-01: Seed canonical product catalog from Whiskybase (15,000+ bottles)
 * WBASE-02: Store community score + vote count (refreshed weekly via cron)
 * WBASE-03: Store image URL from static.whiskybase.com CDN
 *
 * Usage:
 *   tsx --env-file=../../.env src/cli/whiskybase-seed.ts [--max-per-cat=200]
 *
 * Environment:
 *   DATABASE_URL   PostgreSQL connection string
 *   PROXY_URL      Residential proxy (required for Whiskybase — Cloudflare protected)
 *
 * COMPLIANCE:
 *   Verify https://www.whiskybase.com/robots.txt and ToS before running in production.
 *   This script applies a 2 s / request rate limit as a minimum courtesy.
 *
 * Added: שדרוג 25526 (2026-05-25)
 */

import { chromium } from 'playwright';
import { db, queryClient } from '@whisky-hunter/database';
import { products } from '@whisky-hunter/database';
import { eq, sql } from 'drizzle-orm';
import {
  WhiskybaseCatalogAdapter,
  type WhiskybaseProduct,
} from '../adapters/whiskybase-catalog.js';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = Object.fromEntries(
  process.argv.slice(2).map((arg: string) => {
    const [k, v] = arg.replace(/^--/, '').split('=');
    return [k!, v ?? 'true'];
  }),
);

const maxPerCat = parseInt(args['max-per-cat'] ?? '200', 10);
const dryRun = args['dry-run'] === 'true';

// ---------------------------------------------------------------------------
// Upsert helper
// ---------------------------------------------------------------------------

/**
 * Upsert a Whiskybase product into the products table.
 *
 * Strategy: ON CONFLICT (whiskybase_id) → update metadata fields.
 * For new rows we invent a volumeMl default of 700 if not scraped.
 *
 * Drizzle's `.onConflictDoUpdate` requires that `products` has the unique
 * constraint `products_whiskybase_id_uniq` (added in migration 0005).
 */
async function upsertProduct(p: WhiskybaseProduct): Promise<'inserted' | 'updated'> {
  if (dryRun) {
    console.log(`[dry-run] would upsert: ${p.whiskybaseId} — ${p.name}`);
    return 'inserted';
  }

  // Drizzle's onConflictDoUpdate syntax
  await db
    .insert(products)
    .values({
      name:         p.name,
      distillery:   p.distillery || 'Unknown',
      ageYears:     p.ageYears ?? null,
      volumeMl:     p.volumeMl,
      category:     p.category,
      region:       p.region ?? null,
      caskType:     p.caskType ?? null,
      abv:          p.abv != null ? String(p.abv) : null,
      imageUrl:     p.imageUrl,
      reviewScore:  p.reviewScore != null ? String(p.reviewScore) : null,
      // Whiskybase-specific fields
      whiskybaseId:  p.whiskybaseId,
      whiskybaseUrl: p.whiskybaseUrl,
      wbScore:       p.reviewScore != null ? String(p.reviewScore) : null,
      wbVoteCount:   p.reviewCount,
    })
    .onConflictDoUpdate({
      target: products.whiskybaseId,
      set: {
        // Update catalog metadata on re-seed / weekly refresh
        name:          sql`EXCLUDED.name`,
        distillery:    sql`EXCLUDED.distillery`,
        ageYears:      sql`EXCLUDED.age_years`,
        volumeMl:      sql`EXCLUDED.volume_ml`,
        category:      sql`EXCLUDED.category`,
        region:        sql`EXCLUDED.region`,
        caskType:      sql`EXCLUDED.cask_type`,
        abv:           sql`EXCLUDED.abv`,
        imageUrl:      sql`EXCLUDED.image_url`,
        reviewScore:   sql`EXCLUDED.review_score`,
        whiskybaseUrl: sql`EXCLUDED.whiskybase_url`,
        wbScore:       sql`EXCLUDED.wb_score`,
        wbVoteCount:   sql`EXCLUDED.wb_vote_count`,
        updatedAt:     sql`NOW()`,
      },
    });

  return 'inserted'; // Drizzle does not distinguish insert vs update here
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const startedAt = Date.now();

  console.log('╔════════════════════════════════════════════╗');
  console.log('║  WhiskyHunter — Whiskybase Catalog Seed   ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`  max-per-cat : ${maxPerCat}`);
  console.log(`  dry-run     : ${dryRun}`);
  console.log(`  DATABASE_URL: ${process.env['DATABASE_URL'] ? '✓ set' : '✗ MISSING'}`);
  console.log(`  PROXY_URL   : ${process.env['PROXY_URL'] ? '✓ set' : '⚠ not set (may be blocked)'}`);
  console.log('');

  if (!process.env['DATABASE_URL']) {
    console.error('[seed] DATABASE_URL is required');
    process.exit(1);
  }

  // ── Compliance reminder ─────────────────────────────────────────────────
  console.log('⚠  COMPLIANCE: Ensure robots.txt allows /whiskies/ crawling.');
  console.log('   URL: https://www.whiskybase.com/robots.txt');
  console.log('   Attribution "Ratings powered by Whiskybase" required in UI.');
  console.log('');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const adapter = new WhiskybaseCatalogAdapter();
  let upserted = 0;
  let errors = 0;

  try {
    const { total, errors: crawlErrors } = await adapter.crawlCatalog(browser, {
      maxPerCat,
      onProgress: (msg) => console.log(msg),
      onProduct: async (p: WhiskybaseProduct) => {
        if (!p.name || !p.whiskybaseId) {
          console.warn(`[seed] skipping incomplete product: id=${p.whiskybaseId}`);
          return;
        }
        try {
          await upsertProduct(p);
          upserted++;
          if (upserted % 100 === 0) {
            const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
            console.log(`  [seed] ${upserted} upserted … (${elapsed}s elapsed)`);
          }
        } catch (err) {
          errors++;
          console.error(`[seed] upsert failed for id=${p.whiskybaseId}:`, String(err));
        }
      },
    });

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log('');
    console.log('════ Seed Complete ════════════════════════════');
    console.log(`  Crawled  : ${total} products`);
    console.log(`  Upserted : ${upserted} rows`);
    console.log(`  Errors   : ${errors + crawlErrors}`);
    console.log(`  Elapsed  : ${elapsed}s`);
    console.log('═══════════════════════════════════════════════');
  } catch (err) {
    console.error('[seed] fatal error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    await queryClient.end();
  }
}

main();
