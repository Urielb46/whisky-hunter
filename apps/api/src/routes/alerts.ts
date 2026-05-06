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
import { eq, and } from 'drizzle-orm';
import { db, priceAlerts, products } from '@whisky-hunter/database';
import { requireAuth } from '../middleware/require-auth.js';

export const alertsRoute = new Hono();

alertsRoute.use('/*', requireAuth);

// GET /api/alerts
alertsRoute.get('/', async (c) => {
  const userId = c.get('userId');

  const rows = await db
    .select({
      id: priceAlerts.id,
      productId: priceAlerts.productId,
      targetPriceGbp: priceAlerts.targetPriceGbp,
      currency: priceAlerts.currency,
      active: priceAlerts.active,
      lastTriggeredAt: priceAlerts.lastTriggeredAt,
      createdAt: priceAlerts.createdAt,
      productName: products.name,
    })
    .from(priceAlerts)
    .leftJoin(products, eq(products.id, priceAlerts.productId))
    .where(eq(priceAlerts.userId, userId));

  return c.json({ alerts: rows });
});

const CreateAlertSchema = z.object({
  productId: z.string().uuid(),
  targetPriceGbp: z.number().int().positive(), // pence
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
