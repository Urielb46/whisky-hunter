/**
 * TypeScript types for Typesense whisky documents.
 * Must match the fields declared in COLLECTION_SCHEMA.
 */

export interface WhiskyDocument {
  id: string;
  name: string;
  distillery: string;
  category: string;
  region?: string;
  cask_type?: string;
  country: string;

  age_years?: number;
  volume_ml: number;
  abv?: number;

  best_price_gbp?: number;
  best_price_local?: number;
  best_currency?: string;
  retailer_count: number;
  in_stock: boolean;

  retailer_ids?: string[];
  retailer_names?: string[];

  image_url?: string;
  description?: string;
  review_score?: number;
  lwin_code?: string;
  scraped_at: number;  // Unix seconds

  // Whiskybase catalog fields — added שדרוג 25526
  whiskybase_id?: string;
  wb_score?: number;       // Whiskybase community score (0–100)
  wb_vote_count?: number;  // Number of Whiskybase community ratings
  whiskybase_url?: string; // Deep link to bottle page
}

/** The subset returned by the search API (matches web/mobile SearchResult shape). */
export interface SearchHit {
  id: string;
  name: string;
  distillery: string;
  ageYears: number | null;
  volumeMl: number;
  category: string;
  region: string | null;
  abv: number | null;
  imageUrl: string | null;
  reviewScore: number | null;
  // Whiskybase attribution fields (WBASE-04)
  whiskybaseId: string | null;
  wbScore: number | null;
  wbVoteCount: number;
  whiskybaseUrl: string | null;
  bestPrice: {
    priceLocal: number;
    currency: string;
    retailerName: string;
    inStock: boolean;
  } | null;
}

export interface SearchParams {
  q?: string;
  distillery?: string;
  region?: string;
  caskType?: string;
  category?: string;
  country?: string;
  ageMin?: number;
  ageMax?: number;
  abvMin?: number;
  abvMax?: number;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: 'price' | 'age' | 'rating' | 'name';
  sortDir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SearchResponse {
  results: SearchHit[];
  total: number;
  page: number;
  limit: number;
}
