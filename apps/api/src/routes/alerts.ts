/**
 * Price-alert routes — requires auth.
 * GET    /api/alerts            → list user's alerts
 * POST   /api/alerts            → create alert
 * PATCH  /api/alerts/:id        → update targetPriceGbp / active
 * DELETE /api/alerts/:id        → delete alert
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db, priceAlerts, products } from '@whisky-hunter/database';
import { requirePremium } from '../middleware/require-auth.js';

export const alertsRoute = new Hono();

alertsRoute.use('/*', requirePremium);

// GET /api/alerts
alertsRoute.get('/', async (c) => {
  const userId = c.get('userId');

  type AlertRow = {
    id: string;
    product_id: string;
    target_price_gbp: number;
    currency: string;
    active: boolean;
    last_triggered_at: string | null;
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
    bp_currency: string | null;
    retailer_id: string | null;
    retailer_name: string | null;
    retailer_country: string | null;
    in_stock: boolean | null;
    scraped_at: string | null;
    is_stale: boolean | null;
  };

  const rows = await db.execute<AlertRow>(sql`
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
      a.id,
      a.product_id,
      a.target_price_gbp,
      a.currency,
      a.active,
      a.last_triggered_at,
      a.created_at,
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
      bp.currency    AS bp_currency,
      bp.retailer_id,
      bp.retailer_name,
      bp.retailer_country,
      bp.in_stock,
      bp.scraped_at,
      bp.is_stale
    FROM price_alerts a
    LEFT JOIN products p     ON p.id::text = a.product_id
    LEFT JOIN best_prices bp ON bp.product_id = p.id
    WHERE a.user_id = ${userId}
    ORDER BY a.created_at DESC
  `);

  const alerts = rows.map((r) => ({
    id: r.id,
    productId: r.product_id,
    targetPriceGbp: r.target_price_gbp,
    currency: r.currency,
    active: r.active,
    lastTriggeredAt: r.last_triggered_at,
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
            currency: r.bp_currency!,
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

  return c.json({ alerts });
});

const CreateAlertSchema = z.object({
  productId: z.string().uuid(),
  targetPriceGbp: z.number().int().positive(),
  currency: z.string().length(3).toUpperCase().default('GBP'),
});

// POST /api/alerts
alertsRoute.post(
  '/',
  zValidator('json', CreateAlertSchema),
  async (c) => {
    const userId = c.get('userId');
    const { productId, targetPriceGbp, currency } = c.req.valid('json');

    const id = crypto.randomUUID();
    await db.insert(priceAlerts).values({
      id,
      userId,
      productId,
      targetPriceGbp,
      currency,
      active: true,
    });

    return c.json({ id }, 201);
  },
);

const PatchAlertSchema = z.object({
  targetPriceGbp: z.number().int().positive().optional(),
  active: z.boolean().optional(),
}).refine((d) => d.targetPriceGbp !== undefined || d.active !== undefined, {
  message: 'At least one field required',
});

// PATCH /api/alerts/:id
alertsRoute.patch(
  '/:id',
  zValidator('json', PatchAlertSchema),
  async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const patch = c.req.valid('json');

    const result = await db
      .update(priceAlerts)
      .set({
        ...(patch.targetPriceGbp !== undefined && { targetPriceGbp: patch.targetPriceGbp }),
        ...(patch.active !== undefined && { active: patch.active }),
      })
      .where(and(eq(priceAlerts.id, id), eq(priceAlerts.userId, userId)));

    if ((result as unknown as { rowCount: number }).rowCount === 0) {
      return c.json({ error: 'Not found' }, 404);
    }

    return c.json({ updated: true });
  },
);

// DELETE /api/alerts/:id
alertsRoute.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const result = await db
    .delete(priceAlerts)
    .where(and(eq(priceAlerts.id, id), eq(priceAlerts.userId, userId)));

  if ((result as unknown as { rowCount: number }).rowCount === 0) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json({ deleted: true });
});
