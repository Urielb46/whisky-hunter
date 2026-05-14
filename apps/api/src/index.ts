import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { health } from './routes/health.js';
import { search } from './routes/search.js';
import { productsRoute } from './routes/products.js';
import { cost } from './routes/cost.js';
import { authRoute } from './routes/auth-handler.js';
import { wishlistRoute } from './routes/wishlist.js';
import { alertsRoute } from './routes/alerts.js';
import { pushTokenRoute } from './routes/push-token.js';
import { ageGateRoute } from './routes/age-gate.js';
import { billingRoute } from './routes/billing.js';
import { requireAgeGate } from './middleware/require-age-gate.js';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({ origin: ['http://localhost:3001', 'https://whiskyhunter.com'] }));

// Age gate — must be confirmed before accessing content routes (AUTH-05 / COMP-01)
// Applied to search, products, and cost; NOT applied to auth or age-gate itself.
app.use('/api/search/*', requireAgeGate);
app.use('/api/products/*', requireAgeGate);
app.use('/api/cost/*', requireAgeGate);

app.route('/health', health);
app.route('/api/auth', authRoute);
app.route('/api/age-gate', ageGateRoute);
app.route('/api/billing', billingRoute);
app.route('/api/search', search);
app.route('/api/products', productsRoute);
app.route('/api/cost', cost);
app.route('/api/wishlist', wishlistRoute);
app.route('/api/alerts', alertsRoute);
app.route('/api/user/push-token', pushTokenRoute);

app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal server error' }, 500);
});

const port = Number(process.env['PORT'] ?? 3000);
serve({ fetch: app.fetch, port });
console.log(`[api] listening on :${port}`);
