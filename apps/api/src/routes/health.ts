import { Hono } from 'hono';
import { db } from '@whisky-hunter/database';
import { sql } from 'drizzle-orm';

const health = new Hono();

health.get('/', async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
    return c.json({ status: 'ok', db: 'connected', ts: new Date().toISOString() });
  } catch {
    return c.json({ status: 'error', db: 'unreachable' }, 503);
  }
});

export { health };
