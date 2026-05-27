/**
 * search() — execute a whisky search against Typesense.
 *
 * Builds the query from SearchParams:
 *  - q           → full-text search with typo tolerance
 *  - filters     → Typesense filter_by syntax
 *  - sort_by     → maps our sort enum to Typesense sort fields
 *  - facets      → returned for sidebar population
 */

import type { Client as TypesenseClient } from 'typesense';
import type { SearchResultHit } from 'typesense/lib/Typesense/Documents.js';
import { COLLECTION_NAME } from './collection.js';
import type { SearchParams, SearchResponse, WhiskyDocument } from './types.js';

const DEFAULT_SORT: Record<NonNullable<SearchParams['sort']>, string> = {
  price:  'best_price_gbp:asc',
  age:    'age_years:desc',
  rating: 'review_score:desc',
  name:   'name:asc',
};

export async function searchWhiskies(
  client: TypesenseClient,
  params: SearchParams,
): Promise<SearchResponse> {
  const {
    q           = '*',
    distillery,
    region,
    caskType,
    category,
    country,
    ageMin,
    ageMax,
    abvMin,
    abvMax,
    minPrice,
    maxPrice,
    inStockOnly = false,
    sort        = 'price',
    sortDir,
    page        = 1,
    limit       = 20,
  } = params;

  // ── Build filter_by ──────────────────────────────────────────────────────
  const filters: string[] = [];

  if (distillery)  filters.push(`distillery:=${distillery}`);
  if (region)      filters.push(`region:=${region}`);
  if (caskType)    filters.push(`cask_type:=${caskType}`);
  if (category)    filters.push(`category:=${category}`);
  if (country)     filters.push(`country:=${country}`);
  if (inStockOnly) filters.push('in_stock:=true');

  if (ageMin !== undefined && ageMax !== undefined) {
    filters.push(`age_years:[${ageMin}..${ageMax}]`);
  } else if (ageMin !== undefined) {
    filters.push(`age_years:>=${ageMin}`);
  } else if (ageMax !== undefined) {
    filters.push(`age_years:<=${ageMax}`);
  }

  if (abvMin !== undefined && abvMax !== undefined) {
    filters.push(`abv:[${abvMin}..${abvMax}]`);
  } else if (abvMin !== undefined) {
    filters.push(`abv:>=${abvMin}`);
  } else if (abvMax !== undefined) {
    filters.push(`abv:<=${abvMax}`);
  }

  if (minPrice !== undefined && maxPrice !== undefined) {
    filters.push(`best_price_gbp:[${minPrice}..${maxPrice}]`);
  } else if (minPrice !== undefined) {
    filters.push(`best_price_gbp:>=${minPrice}`);
  } else if (maxPrice !== undefined) {
    filters.push(`best_price_gbp:<=${maxPrice}`);
  }

  // ── Build sort_by ────────────────────────────────────────────────────────
  const defaultSortExpr = DEFAULT_SORT[sort];
  let sortExpr = defaultSortExpr;
  if (sortDir) {
    // Override direction — e.g. "price" + "desc" → "best_price_gbp:desc"
    const [field] = defaultSortExpr.split(':');
    sortExpr = `${field}:${sortDir}`;
  }
  // Always break ties by review score then scraped_at for freshness
  sortExpr += `,review_score:desc,scraped_at:desc`;

  // ── Execute ──────────────────────────────────────────────────────────────
  const result = await client.collections<WhiskyDocument>(COLLECTION_NAME).documents().search({
    q:                  q === '' ? '*' : q,
    query_by:           'name,distillery',
    query_by_weights:   '3,2',
    infix:              'fallback',           // enable infix for distillery partial matches
    typo_tokens_threshold: 1,
    num_typos:          2,
    filter_by:          filters.length > 0 ? filters.join(' && ') : undefined,
    sort_by:            sortExpr,
    facet_by:           'region,category,cask_type,country,in_stock',
    per_page:           limit,
    page,
    highlight_full_fields: 'name,distillery',
    exclude_fields:     'description',        // large field — excluded from list view
  });

  const total = result.found;

  const results = (result.hits ?? []).map((hit: SearchResultHit<WhiskyDocument>) => {
    const doc = hit.document;
    return {
      id:          doc.id,
      name:        doc.name,
      distillery:  doc.distillery,
      ageYears:    doc.age_years ?? null,
      volumeMl:    doc.volume_ml,
      category:    doc.category,
      region:      doc.region ?? null,
      abv:         doc.abv ?? null,
      imageUrl:    doc.image_url ?? null,
      reviewScore: doc.review_score ?? null,
      bestPrice: doc.best_price_gbp !== undefined && doc.best_currency
        ? {
            priceLocal:  doc.best_price_local ?? doc.best_price_gbp,
            currency:    doc.best_currency,
            retailerName: (doc.retailer_names ?? [])[0] ?? '',
            inStock:     doc.in_stock,
          }
        : null,
    };
  });

  return { results, total, page, limit };
}
