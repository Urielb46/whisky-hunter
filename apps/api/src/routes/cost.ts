import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { calculateTrueCost } from '@whisky-hunter/shared';

const cost = new Hono();

const CostQuerySchema = z.object({
  priceLocal: z.coerce.number().positive(),
  currency: z.string().length(3),
  retailerCountry: z.string().length(2),
  destinationCountry: z.string().length(2),
  volumeMl: z.coerce.number().int().positive().default(700),
  abv: z.coerce.number().min(0).max(100).default(40),
  shippingLocal: z.coerce.number().min(0).default(0),
  outputCurrency: z.string().length(3).optional(),
});

/**
 * GET /api/cost
 * Calculate true all-in cost for one retailer listing.
 *
 * Example:
 *   /api/cost?priceLocal=49.99&currency=GBP&retailerCountry=GB
 *            &destinationCountry=US&volumeMl=700&abv=40&outputCurrency=USD
 */
cost.get('/', zValidator('query', CostQuerySchema), async (c) => {
  const input = c.req.valid('query');
  try {
    const breakdown = await calculateTrueCost(input);
    return c.json(breakdown);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

export { cost };
