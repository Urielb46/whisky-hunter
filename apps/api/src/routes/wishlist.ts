/**
 * Wishlist routes — requires auth.
 * GET    /api/wishlist          → list user's wishlist
 * POST   /api/wishlist          → add product
 * DELETE /api/wishlist/:id      → remove entry
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db, wishlists, products } from '@whisky-hunter/database';
import { requirePremium } from '../middleware/require-auth.js';

export const wishlistRoute = new Hono();

wishlistRoute.use('/*', requirePremium);

// GET /api/wishlist
wishlistRoute.get('/', async (c) => {
  const userId = c.get('userId');

  const rows = await db
    .select({
      id: wishlists.id,
      productId: wishlists.productId,
      createdAt: wishlists.createdAt,
      productName: products.name,
      distillery: products.distillery,
      imageUrl: products.imageUrl,
    })
    .from(wishlists)
    .leftJoin(products, eq(products.id, wishlists.productId))
    .where(eq(wishlists.userId, userId));

  return c.json({ items: rows });
});

// POST /api/wishlist
const AddSchema = z.object({ productId: z.string().uuid() });

wishlistRoute.post(
  '/',
  zValidator('json', AddSchema),
  async (c) => {
    const userId = c.get('userId');
    const { productId } = c.req.valid('json');

    // idempotent — ignore if already exists
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
