import { Hono } from 'hono';
import { db } from '@whisky-hunter/database';
import { products, priceSnapshots, sourceMappings, retailers } from '@whisky-hunter/database';
import { eq, ilike, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const search = new Hono();

const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  category: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  country: z.string().length(2).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

search.get('/', zValidator('query', SearchQuerySchema), async (c) => {
  const { q, category, minPrice, maxPrice, page, limit } = c.req.valid('query');
  const offset = (page - 1) * limit;

  // Find matching canonical products
  const conditions = [ilike(products.name, `%${q}%`)];
  if (category) conditions.push(eq(products.category, category));

  const matched = await db
    .select({
      id: products.id,
      name: products.name,
      distillery: products.distillery,
      ageYears: products.ageYears,
      volumeMl: products.volumeMl,
      category: products.category,
      region: products.region,
      abv: products.abv,
      imageUrl: products.imageUrl,
    })
    .from(products)
    .where(and(...conditions))
    .limit(limit)
    .offset(offset);

  if (matched.length === 0) {
    return c.json({ results: [], total: 0, page, limit });
  }

  // For each product, get best current price across all retailers
  const productIds = matched.map((p) => p.id);

  const bestPrices = await db.execute<{
    product_id: string;
    price_local: string;
    currency: string;
    retailer_id: string;
    retailer_name: string;
    in_stock: boolean;
    scraped_at: string;
  }>(sql`
    SELECT DISTINCT ON (sm.canonical_product_id)
      sm.canonical_product_id AS product_id,
      ps.price_local,
      ps.currency,
      r.id AS retailer_id,
      r.name AS retailer_name,
      ps.in_stock,
      ps.scraped_at
    FROM price_snapshots ps
    JOIN source_mappings sm ON sm.id = ps.source_mapping_id
    JOIN retailers r ON r.id = sm.retailer_id
    WHERE sm.canonical_product_id = ANY(${productIds}::uuid[])
      AND ps.in_stock = true
    ORDER BY sm.canonical_product_id, ps.price_local ASC, ps.scraped_at DESC
  `);

  const priceMap = new Map(bestPrices.map((p) => [p.product_id, p]));

  // Apply price filters post-join
  const results = matched
    .map((p) => {
      const best = priceMap.get(p.id);
      const priceNum = best ? parseFloat(best.price_local) : null;
      return {
        id: p.id,
        name: p.name,
        distillery: p.distillery,
        ageYears: p.ageYears,
        volumeMl: p.volumeMl,
        category: p.category,
        region: p.region,
        abv: p.abv ? parseFloat(p.abv) : null,
        imageUrl: p.imageUrl,
        bestPrice: best
          ? {
              priceLocal: priceNum,
              currency: best.currency,
              retailerId: best.retailer_id,
              retailerName: best.retailer_name,
              inStock: best.in_stock,
              scrapedAt: best.scraped_at,
            }
          : null,
      };
    })
    .filter((r) => {
      if (minPrice !== undefined && (r.bestPrice?.priceLocal ?? Infinity) < minPrice) return false;
      if (maxPrice !== undefined && (r.bestPrice?.priceLocal ?? 0) > maxPrice) return false;
      return true;
    });

  return c.json({ results, total: results.length, page, limit });
});

export { search };
