/**
 * Mounts Better Auth request handler at /api/auth/*.
 * Better Auth handles all auth routes internally (sign-in, sign-up, OAuth callbacks, etc.)
 */
import { Hono } from 'hono';
import { auth } from '../auth.js';

export const authRoute = new Hono();

// Better Auth handles all sub-paths: /sign-in, /sign-up, /callback, /session, etc.
authRoute.all('/*', async (c) => {
  // Strip the /api/auth prefix so Better Auth sees the correct path
  return auth.handler(c.req.raw);
});
