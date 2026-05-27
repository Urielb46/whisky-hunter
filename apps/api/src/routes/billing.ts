/**
 * Billing routes — FREQ-03 (Stripe subscriptions).
 *
 * GET  /api/billing/status      → current tier + subscription info (auth required)
 * POST /api/billing/checkout    → create Stripe Checkout Session (auth required)
 * POST /api/billing/webhook     → Stripe webhook handler (no auth — Stripe signature)
 *
 * Flow:
 *   1. User hits POST /checkout with { plan: 'monthly' | 'annual' }
 *   2. API creates/reuses Stripe Customer, creates Checkout Session → { url }
 *   3. Frontend redirects to Stripe hosted checkout
 *   4. On success, Stripe fires checkout.session.completed webhook
 *   5. Webhook updates users.tier = 'premium' + stores stripeCustomerId
 *   6. On subscription cancellation, tier reverts to 'free'
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { db, users } from '@whisky-hunter/database';
import { requireAuth } from '../middleware/require-auth.js';

export const billingRoute = new Hono();

// ---------------------------------------------------------------------------
// Stripe client
// ---------------------------------------------------------------------------

function getStripe(): Stripe {
  const key = process.env['STRIPE_SECRET_KEY'];
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
}

const PRICES: Record<string, string | undefined> = {
  monthly: process.env['STRIPE_PRICE_MONTHLY'],
  annual:  process.env['STRIPE_PRICE_ANNUAL'],
};

// ---------------------------------------------------------------------------
// GET /api/billing/status
// ---------------------------------------------------------------------------

billingRoute.get('/status', requireAuth, async (c) => {
  const userId = c.get('userId');
  const [user] = await db
    .select({ tier: users.tier, stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return c.json({ error: 'User not found' }, 404);

  return c.json({
    tier: user.tier,
    stripeCustomerId: user.stripeCustomerId ?? null,
  });
});

// ---------------------------------------------------------------------------
// POST /api/billing/checkout
// ---------------------------------------------------------------------------

const CheckoutSchema = z.object({
  plan: z.enum(['monthly', 'annual']),
  /** Where Stripe redirects after successful payment */
  successUrl: z.string().url().optional(),
  /** Where Stripe redirects on cancel */
  cancelUrl: z.string().url().optional(),
});

billingRoute.post(
  '/checkout',
  requireAuth,
  zValidator('json', CheckoutSchema),
  async (c) => {
    const userId = c.get('userId');
    const { plan, successUrl, cancelUrl } = c.req.valid('json');

    const priceId = PRICES[plan];
    if (!priceId) {
      return c.json({ error: `STRIPE_PRICE_${plan.toUpperCase()} not configured` }, 500);
    }

    const stripe = getStripe();
    const appUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

    // Fetch user to get or create Stripe customer
    const [user] = await db
      .select({ email: users.email, name: users.name, stripeCustomerId: users.stripeCustomerId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return c.json({ error: 'User not found' }, 404);

    let customerId = user.stripeCustomerId ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name:  user.name,
        metadata: { userId },
      });
      customerId = customer.id;
      await db
        .update(users)
        .set({ stripeCustomerId: customerId })
        .where(eq(users.id, userId));
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl ?? `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  cancelUrl  ?? `${appUrl}/billing/cancel`,
      metadata: { userId },
      subscription_data: { metadata: { userId } },
    });

    return c.json({ url: session.url });
  },
);

// ---------------------------------------------------------------------------
// POST /api/billing/webhook
// Raw body must be read before any parsing — Stripe verifies the raw payload.
// ---------------------------------------------------------------------------

billingRoute.post('/webhook', async (c) => {
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];
  if (!webhookSecret) {
    console.error('[billing] STRIPE_WEBHOOK_SECRET not set');
    return c.json({ error: 'Webhook not configured' }, 500);
  }

  const sig = c.req.header('stripe-signature');
  if (!sig) return c.json({ error: 'Missing stripe-signature' }, 400);

  // Read raw body — must happen before any other body consumption
  const rawBody = await c.req.raw.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[billing] webhook signature verification failed:', err);
    return c.json({ error: 'Invalid signature' }, 400);
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    console.error('[billing] webhook handler error:', err);
    return c.json({ error: 'Handler error' }, 500);
  }

  return c.json({ received: true });
});

// ---------------------------------------------------------------------------
// Stripe event handlers
// ---------------------------------------------------------------------------

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) break;
      await db
        .update(users)
        .set({ tier: 'premium' })
        .where(eq(users.id, userId));
      console.log(`[billing] user ${userId} upgraded to premium`);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) break;
      await db
        .update(users)
        .set({ tier: 'free' })
        .where(eq(users.id, userId));
      console.log(`[billing] user ${userId} downgraded to free (subscription deleted)`);
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) break;
      const tier = sub.status === 'active' || sub.status === 'trialing' ? 'premium' : 'free';
      await db
        .update(users)
        .set({ tier })
        .where(eq(users.id, userId));
      console.log(`[billing] user ${userId} subscription updated → ${tier} (status: ${sub.status})`);
      break;
    }

    default:
      // Ignore unhandled event types
      break;
  }
}
