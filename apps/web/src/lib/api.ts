const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

export interface SearchResult {
  id: string;
  name: string;
  distillery: string;
  ageYears: number | null;
  volumeMl: number;
  category: string;
  region: string | null;
  abv: number | null;
  imageUrl: string | null;
  bestPrice: {
    priceLocal: number;
    currency: string;
    retailerId: string;
    retailerName: string;
    inStock: boolean;
    scrapedAt: string;
  } | null;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductDetail extends SearchResult {
  caskType: string | null;
  description: string | null;
  lwinCode: string | null;
  prices: {
    retailerId: string;
    retailerName: string;
    country: string;
    currency: string;
    priceLocal: number;
    inStock: boolean;
    sourceUrl: string;
    scrapedAt: string;
  }[];
}

export async function searchWhisky(params: {
  q: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}): Promise<SearchResponse> {
  const qs = new URLSearchParams();
  qs.set('q', params.q);
  if (params.category) qs.set('category', params.category);
  if (params.minPrice !== undefined) qs.set('minPrice', String(params.minPrice));
  if (params.maxPrice !== undefined) qs.set('maxPrice', String(params.maxPrice));
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));

  const res = await fetch(`${API_BASE}/api/search?${qs}`, {
    next: { revalidate: 300 }, // cache 5 min
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json() as Promise<SearchResponse>;
}

export async function getProduct(id: string): Promise<ProductDetail> {
  const res = await fetch(`${API_BASE}/api/products/${id}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Product fetch failed: ${res.status}`);
  return res.json() as Promise<ProductDetail>;
}
