import { z } from 'zod';

// Output of normalizer — fields parsed from raw scraped data.
export const NormalizedProductSchema = z.object({
  name: z.string().min(1).max(500),
  distillery: z.string().min(1).max(200),
  ageYears: z.number().int().min(0).max(100).nullable(),
  volumeMl: z.number().int().positive().max(10_000),
  abv: z.number().min(0).max(80).nullable(),
  category: z.enum([
    'scotch_single_malt',
    'scotch_blended',
    'irish',
    'bourbon',
    'rye',
    'japanese',
    'world',
    'other',
  ]),
  region: z.string().max(100).nullable(),
  caskType: z.string().max(200).nullable(),
  priceLocal: z.number().positive(),
  currency: z.string().length(3),
  url: z.string().url(),
  imageUrl: z.string().url().nullable(),
  sourceProductId: z.string().min(1),
  inStock: z.boolean(),
});

export type NormalizedProduct = z.infer<typeof NormalizedProductSchema>;
