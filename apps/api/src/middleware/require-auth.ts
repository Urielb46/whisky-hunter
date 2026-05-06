/**
 * Hono middleware — validates Better Auth session and injects user into context.
 * Usage: app.use('/protected/*', requireAuth)
 */
import type { Context, Next } from 'hono';
import { auth } from '../auth.js';

declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    userTier: 'free' | 'premium';
  }
}

export async function requireAuth(c: Context, next: Next): Promise<Response | void> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('userId', session.user.id);
  c.set('userTier', (session.user as { tier?: 'free' | 'premium' }).tier ?? 'free');

  await next();
}
