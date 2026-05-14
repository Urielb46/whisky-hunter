import { Hono } from 'hono';
import { db } from '@whisky-hunter/database';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const search = new Hono();

// ---------------------------------------------------------------------------
// Sort options — SRCH-05
// ---------------------------------------------------------------------------

const SORT_OPTIONS = {
  price:  sql`bp.price_local::numeric ASC NULLS LAST`,
  age:    sql`p.age_years DESC NULLS LAST`,
  rating: sql`p.review_score DESC NULLS LAST`,
  name:   sql`p.name ASC`,
} as const;

type SortKey = keyof typeof SORT_OPTIONS;

// ---------------------------------------------------------------------------
// Query schema — full filter set (SRCH-02) + sort (SRCH-05)
// ---------------------------------------------------------------------------

const SearchQuerySchema = z.object({
  /** Free-text name search */
  q:           z.string().min(1).max(200),
  /** SRCH-02 filters */
  distillery:  z.string().max(100).optional(),
  region:      z.string().max(100).optional(),
  caskType:    z.string().max(100).optional(),
  category:    z.string().max(100).optional(),
  ageMin:      z.coerce.number().int().min(0).optional(),
  ageMax:      z.coerce.number().int().min(0).optional(),
  abvMin:      z.coerce.number().min(0).max(100).optional(),
  abvMax:      z.coerce.number().min(0).max(100).optional(),
  minPrice:    z.coerce.number().min(0).optional(),
  maxPrice:    z.coerce.number().min(0).optional(),
  /** Retailer source country (ISO 3166-1 alpha-2) */
  country:     z.string().length(2).optional(),
  /** SRCH-05 sort */
  sort:        z.enum(['price', 'age', 'rating', 'name']).default('price'),
  /** Pagination */
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(50).default(20),
});

/**
 * GET /api/search
 *
 * CTE approach:
 *   1. best_prices — DISTINCT ON per product, cheapest in-stock price.
 *      Filters by retailer country here if provided.
 *   2. Outer SELECT — joins products + best_prices.
 *      All product-level filters (distillery, region, age, ABV, cask, price)
 *      applied in WHERE — never in JS post-fetch.
 *   3. ORDER BY driven by `sort` param (SRCH-05).
 *   4. COUNT(*) OVER() — true total without a second round-trip.
 *   5. LIMIT / OFFSET — correct pagination.
 */
search.get('/', zValidator('query', SearchQuerySchema), async (c) => {
  const {
    q, distillery, region, caskType, category,
    ageMin, ageMax, abvMin, abvMax,
    minPrice, maxPrice, country,
    sort, page, limit,
  } = c.req.valid('query');

  const offset = (page - 1) * limit;
  const orderBy = SORT_OPTIONS[sort as SortKey];

  type Row = {
    id: string;
    name: string;
    distillery: string;
    age_years: number | null;
    volume_ml: number;
    category: string;
    region: string | null;
    cask_type: string | null;
    abv: string | null;
    image_url: string | null;
    review_score: string | null;
    price_local: string | null;
    currency: string | null;
    retailer_id: string | null;
    retailer_name: string | null;
    retailer_country: string | null;
    in_stock: boolean | null;
    scraped_at: string | null;
    is_stale: boolean | null;
    total_count: string;
  };

  const rows = await db.execute<Row>(sql`
    WITH best_prices AS (
      SELECT DISTINCT ON (sm.canonical_product_id)
        sm.canonical_product_id AS product_id,
        ps.price_local,
        ps.currency,
        r.id      AS retailer_id,
        r.name    AS retailer_name,
        r.country AS retailer_country,
        ps.in_stock,
        ps.scraped_at,
        (ps.scraped_at < NOW() - INTERVAL '48 hours') AS is_stale
      FROM price_snapshots ps
      JOIN source_mappings sm ON sm.id = ps.source_mapping_id
      JOIN retailers r        ON r.id  = sm.retailer_id
      WHERE ps.in_stock = true
        ${country !== undefined ? sql`AND r.country = ${country}` : sql``}
      ORDER BY sm.canonical_product_id, ps.price_local ASC, ps.scraped_at DESC
    )
    SELECT
      p.id,
      p.name,
      p.distillery,
      p.age_years,
      p.volume_ml,
      p.category,
      p.region,
      p.cask_type,
      p.abv,
      p.image_url,
      p.review_score,
      bp.price_local,
      bp.currency,
      bp.retailer_id,
      bp.retailer_name,
      bp.retailer_country,
      bp.in_stock,
      bp.scraped_at,
      bp.is_stale,
      COUNT(*) OVER() AS total_count
    FROM products p
    LEFT JOIN best_prices bp ON bp.product_id = p.id
    WHERE p.name ILIKE ${`%${q}%`}
      ${distillery !== undefined ? sql`AND p.distillery ILIKE ${`%${distillery}%`}` : sql``}
      ${region     !== undefined ? sql`AND p.region ILIKE ${`%${region}%`}`         : sql``}
      ${caskType   !== undefined ? sql`AND p.cask_type ILIKE ${`%${caskType}%`}`    : sql``}
      ${category   !== undefined ? sql`AND p.category = ${category}`                : sql``}
      ${ageMin     !== undefined ? sql`AND p.age_years >= ${ageMin}`                : sql``}
      ${ageMax     !== undefined ? sql`AND p.age_years <= ${ageMax}`                : sql``}
      ${abvMin     !== undefined ? sql`AND p.abv::numeric >= ${abvMin}`             : sql``}
      ${abvMax     !== undefined ? sql`AND p.abv::numeric <= ${abvMax}`             : sql``}
      ${minPrice   !== undefined ? sql`AND bp.price_local IS NOT NULL AND bp.price_local::numeric >= ${minPrice}` : sql``}
      ${maxPrice   !== undefined ? sql`AND bp.price_local IS NOT NULL AND bp.price_local::numeric <= ${maxPrice}` : sql``}
    ORDER BY ${orderBy}
    LIMIT ${limit} OFFSET ${offset}
  `);

  const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;

  const results = rows.map((r) => ({
    id:          r.id,
    name:        r.name,
    distillery:  r.distillery,
    ageYears:    r.age_years,
    volumeMl:    r.volume_ml,
    category:    r.category,
    region:      r.region,
    caskType:    r.cask_type,
    abv:         r.abv ? parseFloat(r.abv) : null,
    imageUrl:    r.image_url,
    reviewScore: r.review_score ? parseFloat(r.review_score) : null,
    bestPrice: r.price_local
      ? {
          priceLocal:      parseFloat(r.price_local),
          currency:        r.currency,
          retailerId:      r.retailer_id,
          retailerName:    r.retailer_name,
          retailerCountry: r.retailer_country,
          inStock:         r.in_stock,
          scrapedAt:       r.scraped_at,
          isStale:         r.is_stale ?? false,
        }
      : null,
  }));

  return c.json({ results, total, page, limit });
});

export { search };
