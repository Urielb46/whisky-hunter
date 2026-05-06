import { describe, it, expect } from 'vitest';
import {
  products,
  retailers,
  sourceMappings,
  priceSnapshots,
  scraperHealth,
  dedupReviewQueue,
} from '../schema';
import { RawProductSchema, NormalizedProductSchema } from '@whisky-hunter/shared';

describe('schema shape', () => {
  it('exports all six tables with correct SQL table names', () => {
    // Drizzle stores the SQL table name on a Symbol
    expect((products as any)[Symbol.for('drizzle:Name')]).toBe('products');
    expect((retailers as any)[Symbol.for('drizzle:Name')]).toBe('retailers');
    expect((sourceMappings as any)[Symbol.for('drizzle:Name')]).toBe('source_mappings');
    expect((priceSnapshots as any)[Symbol.for('drizzle:Name')]).toBe('price_snapshots');
    expect((scraperHealth as any)[Symbol.for('drizzle:Name')]).toBe('scraper_health');
    expect((dedupReviewQueue as any)[Symbol.for('drizzle:Name')]).toBe('dedup_review_queue');
  });
});

describe('RawProductSchema (security boundary T-injection)', () => {
  it('rejects names longer than 500 chars', () => {
    const result = RawProductSchema.safeParse({
      sourceProductId: 'abc',
      name: 'x'.repeat(501),
      priceLocal: 50.0,
      currency: 'GBP',
      inStock: true,
      url: 'https://example.com/p/123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects names containing HTML tags', () => {
    const result = RawProductSchema.safeParse({
      sourceProductId: 'abc',
      name: 'Glenfarclas <script>alert(1)</script> 15',
      priceLocal: 50.0,
      currency: 'GBP',
      inStock: true,
      url: 'https://example.com/p/123',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid product', () => {
    const result = RawProductSchema.safeParse({
      sourceProductId: 'abc-123',
      name: 'Glenfarclas 15 Year Old',
      priceLocal: 65.0,
      currency: 'GBP',
      inStock: true,
      url: 'https://www.thewhiskyexchange.com/p/123',
      imageUrl: 'https://www.thewhiskyexchange.com/img/123.jpg',
    });
    expect(result.success).toBe(true);
  });
});

describe('NormalizedProductSchema', () => {
  it('rejects empty distillery', () => {
    const result = NormalizedProductSchema.safeParse({
      name: 'Glenfarclas 15',
      distillery: '',
      ageYears: 15,
      volumeMl: 700,
      abv: 46,
      category: 'scotch_single_malt',
      region: 'Speyside',
      caskType: 'Sherry',
      priceLocal: 65,
      currency: 'GBP',
      url: 'https://example.com',
      imageUrl: null,
      sourceProductId: 'abc',
      inStock: true,
    });
    expect(result.success).toBe(false);
  });
});
