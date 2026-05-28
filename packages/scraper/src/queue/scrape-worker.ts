import { Worker, type Job } from 'bullmq';
import { redisConnection } from './connection.js';
import type { ScrapeJobData, ScrapeJobResult } from './types.js';
import { SCRAPE_QUEUE_NAME } from './types.js';
import { getAdapter } from '../adapters/registry.js';
import { getBrowser } from '../browser.js';
import { db } from '@whisky-hunter/database';
import { priceSnapshots, sourceMappings } from '@whisky-hunter/database';
import { eq, and } from 'drizzle-orm';
import type { RawProduct } from '@whisky-hunter/shared';
import { syncProductsToTypesense } from '@whisky-hunter/search';

/**
 * Look up source mapping for a scraped product.
 * Returns null when the product isn't yet mapped to a canonical entry
 * (will be picked up by dedup review flow later).
 */
async function resolveMapping(
  raw: RawProduct,
): Promise<{ sourceMappingId: string; canonicalProductId: string } | null> {
  const rows = await db
    .select({
      id: sourceMappings.id,
      canonicalProductId: sourceMappings.canonicalProductId,
      sourceUrl: sourceMappings.sourceUrl,
    })
    .from(sourceMappings)
    .where(
      and(
        eq(sourceMappings.retailerId, raw.retailerId),
        eq(sourceMappings.sourceProductId, raw.sourceProductId),
      ),
    )
    .limit(1);

  if (!rows[0]) return null;

  if (rows[0].sourceUrl !== raw.url) {
    await db.update(sourceMappings)
      .set({ sourceUrl: raw.url })
      .where(eq(sourceMappings.id, rows[0].id));
  }

  return {
    sourceMappingId: rows[0].id,
    canonicalProductId: rows[0].canonicalProductId,
  };
}

async function process(
  job: Job<ScrapeJobData, ScrapeJobResult>,
): Promise<ScrapeJobResult> {
  const start = Date.now();
  const { retailerId, url, maxPages } = job.data;
  console.log(`[worker] job ${job.id} — retailer=${retailerId} url=${url}`);

  const adapter = getAdapter(retailerId);
  const browser = await getBrowser();
  const products = await adapter.getAllProducts(browser, url, maxPages ?? 50);

  let listingsInserted = 0;
  const scrapedAt = new Date();
  const insertedProductIds = new Set<string>();

  for (const raw of products) {
    const mapping = await resolveMapping(raw);
    if (!mapping) continue; // not yet in canonical catalog

    await db.insert(priceSnapshots).values({
      canonicalProductId: mapping.canonicalProductId,
      sourceMappingId: mapping.sourceMappingId,
      currency: raw.currency,
      priceLocal: raw.priceLocal.toFixed(2),
      inStock: raw.inStock,
      scrapedAt,
    });

    listingsInserted++;
    insertedProductIds.add(mapping.canonicalProductId);
  }

  if (insertedProductIds.size > 0) {
    syncProductsToTypesense([...insertedProductIds]).catch((err: Error) =>
      console.warn('[worker] Typesense sync failed (non-fatal):', err.message)
    );
  }

  return {
    retailerId,
    listingsInserted,
    durationMs: Date.now() - start,
    pagesVisited: Math.max(1, Math.ceil(products.length / 24)),
  };
}

export function createScrapeWorker(
  concurrency = 2,
): Worker<ScrapeJobData, ScrapeJobResult> {
  const worker = new Worker<ScrapeJobData, ScrapeJobResult>(
    SCRAPE_QUEUE_NAME,
    process,
    {
      connection: redisConnection,
      concurrency,
      limiter: { max: 10, duration: 60_000 },
    },
  );

  worker.on('completed', (job, result) => {
    console.log(
      `[worker] ✓ job ${job.id} retailer=${result.retailerId} ` +
        `inserted=${result.listingsInserted} ms=${result.durationMs}`,
    );
  });

  worker.on('failed', (job, err) => {
    console.error(`[worker] ✗ job ${job?.id} error: ${err.message}`);
  });

  return worker;
}
