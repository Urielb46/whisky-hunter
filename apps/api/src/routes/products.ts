import { Hono } from 'hono';
import { db } from '@whisky-hunter/database';
import { products, priceSnapshots, sourceMappings, retailers } from '@whisky-hunter/database';
import { eq, sql } from 'drizzle-orm';

const productsRoute = new Hono();

/**
 * GET /products/:id
 * Returns canonical product details + all current retailer prices.
 */
productsRoute.get('/:id', async (c) => {
  const id = c.req.param('id');

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // All current prices across retailers (latest snapshot per source mapping)
  const prices = await db.execute<{
    retailer_id: string;
    retailer_name: string;
    retailer_country: string;
    retailer_currency: string;
    price_local: string;
    currency: string;
    in_stock: boolean;
    source_url: string;
    scraped_at: string;
  }>(sql`
    SELECT DISTINCT ON (sm.retailer_id)
      r.id AS retailer_id,
      r.name AS retailer_name,
      r.country AS retailer_country,
      r.currency AS retailer_currency,
      ps.price_local,
      ps.currency,
      ps.in_stock,
      sm.source_url,
      ps.scraped_at
    FROM price_snapshots ps
    JOIN source_mappings sm ON sm.id = ps.source_mapping_id
    JOIN retailers r ON r.id = sm.retailer_id
    WHERE sm.canonical_product_id = ${id}::uuid
    ORDER BY sm.retailer_id, ps.scraped_at DESC
  `);

  return c.json({
    id: product.id,
    name: product.name,
    distillery: product.distillery,
    ageYears: product.ageYears,
    volumeMl: product.volumeMl,
    category: product.category,
    region: product.region,
    abv: product.abv ? parseFloat(product.abv) : null,
    caskType: product.caskType,
    imageUrl: product.imageUrl,
    description: product.description,
    lwinCode: product.lwinCode,
    prices: prices.map((p) => ({
      retailerId: p.retailer_id,
      retailerName: p.retailer_name,
      country: p.retailer_country,
      currency: p.retailer_currency,
      priceLocal: parseFloat(p.price_local),
      inStock: p.in_stock,
      sourceUrl: p.source_url,
      scrapedAt: p.scraped_at,
    })),
  });
});

export { productsRoute };
