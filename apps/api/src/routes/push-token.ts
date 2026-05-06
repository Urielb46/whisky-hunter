/**
 * PATCH /api/user/push-token
 * Stores the Expo push token for the authenticated user.
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, users } from '@whisky-hunter/database';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/require-auth.js';

export const pushTokenRoute = new Hono();

pushTokenRoute.patch(
  '/',
  requireAuth,
  zValidator('json', z.object({ pushToken: z.string().min(1) })),
  async (c) => {
    const userId = c.get('userId' as never) as string;
    const { pushToken } = c.req.valid('json');

    await db
      .update(users)
      .set({ pushToken })
      .where(eq(users.id, userId));

    return c.json({ ok: true });
  },
);
