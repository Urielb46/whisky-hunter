import { Hono } from 'hono';
import type { Context } from 'hono';
import { db } from '@whisky-hunter/database';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import {
  typesense,
  isTypesenseConfigured,
  searchWhiskies,
} from '@whisky-hunter/search';

const search = new Hono();

// ---------------------------------------------------------------------------
// Sort options — SQL fallback path
// ---------------------------------------------------------------------------

const SORT_FIELDS = {
  price:  { asc: sql`bp.price_local::numeric ASC NULLS LAST`,  desc: sql`bp.price_local::numeric DESC NULLS LAST` },
  age:    { asc: sql`p.age_years ASC NULLS LAST`,              desc: sql`p.age_years DESC NULLS LAST` },
  rating: { asc: sql`p.review_score ASC NULLS LAST`,           desc: sql`p.review_score DESC NULLS LAST` },
  name:   { asc: sql`p.name ASC`,                              desc: sql`p.name DESC` },
} as const;

type SortKey = keyof typeof SORT_FIELDS;

// ---------------------------------------------------------------------------
// Query schema
// ---------------------------------------------------------------------------

const SearchQuerySchema = z.object({
  q:           z.string().max(200).optional(),
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
  country:     z.string().length(2).optional(),
  inStockOnly: z.coerce.boolean().optional(),
  sort:        z.enum(['price', 'age', 'rating', 'name']).default('price'),
  sortDir:     z.enum(['asc', 'desc']).optional(),
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(50).default(20),
});

/**
 * GET /api/search
 *
 * Primary path  → Typesense (when TYPESENSE_HOST + TYPESENSE_API_KEY are set)
 * Fallback path → PostgreSQL ILIKE (development / no Typesense configured)
 */
search.get('/', zValidator('query', SearchQuerySchema), async (c) => {
  const params = c.req.valid('query');

  // Typesense path
  if (isTypesenseConfigured()) {
    try {
      const result = await searchWhiskies(typesense, {
        q:           params.q,
        distillery:  params.distillery,
        region:      params.region,
        caskType:    params.caskType,
        category:    params.category,
        country:     params.country,
        ageMin:      params.ageMin,
        ageMax:      params.ageMax,
        abvMin:      params.abvMin,
        abvMax:      params.abvMax,
        minPrice:    params.minPrice,
        maxPrice:    params.maxPrice,
        inStockOnly: params.inStockOnly,
        sort:        params.sort,
        sortDir:     params.sortDir,
        page:        params.page,
        limit:       params.limit,
      });
      return c.json(result);
    } catch (err) {
      console.error('[search] Typesense error, falling back to SQL:', err);
    }
  }

  // PostgreSQL fallback
  return sqlSearch(c, params);
});

// ---------------------------------------------------------------------------
// SQL fallback search
// ---------------------------------------------------------------------------

type ValidatedParams = z.infer<typeof SearchQuerySchema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sqlSearch(c: Context<any>, params: ValidatedParams) {
  const {
    q, distillery, region, caskType, category,
    ageMin, ageMax, abvMin, abvMax,
    minPrice, maxPrice, country,
    sort, sortDir, page, limit,
  } = params;

  const offset = (page - 1) * limit;
  const defaultDir: Record<SortKey, 'asc' | 'desc'> = {
    price: 'asc', name: 'asc', age: 'desc', rating: 'desc',
  };
  const dir = sortDir ?? defaultDir[sort as SortKey];
  const orderBy = SORT_FIELDS[sort as SortKey][dir];

  const bpFilter = country !== undefined ? sql`AND r.country = ${country}` : sql``;

  const conditions = sql`
    ${q !== undefined && q.length > 0 ? sql`AND (
      p.name ILIKE ${`%${q}%`}
      OR p.distillery ILIKE ${`%${q}%`}
      OR COALESCE(p.region, '') ILIKE ${`%${q}%`}
      OR p.category ILIKE ${`%${q}%`}
    )` : sql``}
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
  `;

  const bpCte = sql`
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
      WHERE ps.in_stock = true ${bpFilter}
      ORDER BY sm.canonical_product_id, ps.price_local ASC, ps.scraped_at DESC
    )
  `;

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
  };

  const [rows, countRows] = await Promise.all([
    db.execute<Row>(sql`
      ${bpCte}
      SELECT
        p.id, p.name, p.distillery, p.age_years, p.volume_ml, p.category,
        p.region, p.cask_type, p.abv, p.image_url, p.review_score,
        bp.price_local, bp.currency, bp.retailer_id, bp.retailer_name,
        bp.retailer_country, bp.in_stock, bp.scraped_at, bp.is_stale
      FROM products p
      LEFT JOIN best_prices bp ON bp.product_id = p.id
      WHERE TRUE ${conditions}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `),
    db.execute<{ cnt: string }>(sql`
      ${bpCte}
      SELECT COUNT(*) AS cnt
      FROM products p
      LEFT JOIN best_prices bp ON bp.product_id = p.id
      WHERE TRUE ${conditions}
    `),
  ]);

  const total = countRows[0] ? parseInt(countRows[0].cnt, 10) : 0;

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
}

export { search };
