import { z } from 'zod';

/**
 * Output of a per-retailer scraper adapter — pre-normalization.
 *
 * Security notes:
 *  - name: max 500 chars, no HTML tags, no control characters (third-party HTML is untrusted)
 *  - priceLocal: must be finite positive number in the retailer's currency (decimal, not pence)
 *  - url/imageUrl: validated as URLs to prevent data injection
 */
export const RawProductSchema = z.object({
  /** Retailer slug (matches retailers.id in DB) */
  retailerId: z.string().min(1).max(100),
  /** Retailer-specific unique ID / slug for this product */
  sourceProductId: z.string().min(1).max(500),
  /** Product display name — scrubbed of HTML */
  name: z
    .string()
    .min(1)
    .max(500)
    .refine((s) => !/<\s*\/?[a-z][\s\S]*?>/i.test(s), {
      message: 'Product name must not contain HTML tags',
    })
    .refine((s) => !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(s), {
      message: 'Product name must not contain control characters',
    }),
  /** Price in retailer currency — decimal (e.g. 49.99 GBP, not pence) */
  priceLocal: z.number().positive().finite().max(1_000_000),
  /** ISO 4217 currency code */
  currency: z.string().length(3).regex(/^[A-Z]{3}$/),
  /** Volume in millilitres (e.g. 700) */
  volumeMl: z.number().int().positive().max(10_000).default(700),
  /** ABV percentage (e.g. 40.0) — null if not scraped */
  abv: z.number().min(0).max(100).nullable().default(null),
  /** Whether the product is currently in stock */
  inStock: z.boolean().default(true),
  /** Canonical product page URL */
  url: z.string().url().max(2000),
  /** Product image URL (optional) */
  imageUrl: z.string().url().max(2000).nullable().default(null),
});

export type RawProduct = z.infer<typeof RawProductSchema>;
