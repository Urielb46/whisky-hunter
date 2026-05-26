/**
 * Wishlist routes — requires auth (free tier).
 * GET    /api/wishlist                    → list user's wishlist
 * POST   /api/wishlist                    → add product
 * DELETE /api/wishlist/product/:productId → remove by product id
 * DELETE /api/wishlist/:id                → remove by wishlist entry id
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db, wishlists, products, priceSnapshots, sourceMappings, retailers } from '@whisky-hunter/database';
import { requireAuth } from '../middleware/require-auth.js';

export const wishlistRoute = new Hono();

wishlistRoute.use('/*', requireAuth);

// GET /api/wishlist
wishlistRoute.get('/', async (c) => {
  const userId = c.get('userId');

  type WishlistRow = {
    id: string;
    product_id: string;
    created_at: string;
    name: string | null;
    distillery: string | null;
    age_years: number | null;
    volume_ml: number | null;
    category: string | null;
    region: string | null;
    cask_type: string | null;
    abv: string | null;
    image_url: string | null;
    review_score: string | null;
    price_local: string | null;
    currency: string | null;
    retailer_id: string | null;
    retailer_name: string | null;
    retailer_country: string | null;
    in_stock: boolean | null;
    scraped_at: string | null;
    is_stale: boolean | null;
  };

  const rows = await db.execute<WishlistRow>(sql`
    WITH best_prices AS (
      SELECT DISTINCT ON (sm.canonical_product_id)
        sm.canonical_product_id AS product_id,
        ps.price_local,
        ps.currency,
        r.id      AS retailer_id,
        r.name    AS retailer_name,
        r.country AS retailer_country,
        ps.in_stock,
        ps.scraped_at,
        (ps.scraped_at < NOW() - INTERVAL '48 hours') AS is_stale
      FROM price_snapshots ps
      JOIN source_mappings sm ON sm.id = ps.source_mapping_id
      JOIN retailers r        ON r.id  = sm.retailer_id
      WHERE ps.in_stock = true
      ORDER BY sm.canonical_product_id, ps.price_local ASC, ps.scraped_at DESC
    )
    SELECT
      w.id,
      w.product_id,
      w.created_at,
      p.name,
      p.distillery,
      p.age_years,
      p.volume_ml,
      p.category,
      p.region,
      p.cask_type,
      p.abv,
      p.image_url,
      p.review_score,
      bp.price_local,
      bp.currency,
      bp.retailer_id,
      bp.retailer_name,
      bp.retailer_country,
      bp.in_stock,
      bp.scraped_at,
      bp.is_stale
    FROM wishlists w
    LEFT JOIN products p        ON p.id::text = w.product_id
    LEFT JOIN best_prices bp    ON bp.product_id = p.id
    WHERE w.user_id = ${userId}
    ORDER BY w.created_at DESC
  `);

  const items = rows.map((r) => ({
    id: r.id,
    productId: r.product_id,
    createdAt: r.created_at,
    product: {
      id: r.product_id,
      name: r.name ?? '',
      distillery: r.distillery ?? '',
      ageYears: r.age_years,
      volumeMl: r.volume_ml ?? 700,
      category: r.category ?? 'whisky',
      region: r.region,
      caskType: r.cask_type,
      abv: r.abv ? parseFloat(r.abv) : null,
      imageUrl: r.image_url,
      reviewScore: r.review_score ? parseFloat(r.review_score) : null,
      bestPrice: r.price_local
        ? {
            priceLocal: parseFloat(r.price_local),
            currency: r.currency!,
            retailerId: r.retailer_id!,
            retailerName: r.retailer_name!,
            retailerCountry: r.retailer_country!,
            inStock: r.in_stock!,
            scrapedAt: r.scraped_at!,
            isStale: r.is_stale ?? false,
          }
        : null,
    },
  }));

  return c.json({ items });
});

// POST /api/wishlist
const AddSchema = z.object({ productId: z.string().uuid() });

wishlistRoute.post(
  '/',
  zValidator('json', AddSchema),
  async (c) => {
    const userId = c.get('userId');
    const { productId } = c.req.valid('json');

    const [existing] = await db
      .select({ id: wishlists.id })
      .from(wishlists)
      .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)))
      .limit(1);

    if (existing) {
      return c.json({ id: existing.id, existing: true });
    }

    const id = crypto.randomUUID();
    await db.insert(wishlists).values({ id, userId, productId });
    return c.json({ id, existing: false }, 201);
  },
);

// DELETE /api/wishlist/product/:productId
wishlistRoute.delete('/product/:productId', async (c) => {
  const userId = c.get('userId');
  const productId = c.req.param('productId');

  const result = await db
    .delete(wishlists)
    .where(and(eq(wishlists.productId, productId), eq(wishlists.userId, userId)));

  if ((result as unknown as { rowCount: number }).rowCount === 0) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json({ deleted: true });
});

// DELETE /api/wishlist/:id
wishlistRoute.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const result = await db
    .delete(wishlists)
    .where(and(eq(wishlists.id, id), eq(wishlists.userId, userId)));

  if ((result as unknown as { rowCount: number }).rowCount === 0) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json({ deleted: true });
});
