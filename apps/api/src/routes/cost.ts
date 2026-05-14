import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { calculateTrueCost, checkShippingRestriction } from '@whisky-hunter/shared';

const cost = new Hono();

const CostQuerySchema = z.object({
  priceLocal:         z.coerce.number().positive(),
  currency:           z.string().length(3),
  retailerCountry:    z.string().length(2),
  destinationCountry: z.string().length(2),
  /** US state abbreviation — required for accurate US restriction check (COST-05) */
  destinationState:   z.string().length(2).optional(),
  volumeMl:           z.coerce.number().int().positive().default(700),
  abv:                z.coerce.number().min(0).max(100).default(40),
  shippingLocal:      z.coerce.number().min(0).default(0),
  outputCurrency:     z.string().length(3).optional(),
});

/**
 * GET /api/cost
 * Calculate true all-in cost for one retailer listing.
 * Includes shipping restriction warning (COST-05 / COMP-02).
 *
 * Example:
 *   /api/cost?priceLocal=49.99&currency=GBP&retailerCountry=GB
 *            &destinationCountry=US&destinationState=CA&volumeMl=700&abv=40&outputCurrency=USD
 */
cost.get('/', zValidator('query', CostQuerySchema), async (c) => {
  const { destinationState, ...input } = c.req.valid('query');
  try {
    const breakdown = await calculateTrueCost(input);
    const restriction = checkShippingRestriction(input.destinationCountry, destinationState);
    return c.json({ ...breakdown, restriction });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

export { cost };
