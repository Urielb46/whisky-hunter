/**
 * Mobile API client — thin wrappers around the WhiskyHunter API.
 */
import Constants from 'expo-constants';

const BASE_URL =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'http://localhost:3000';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export interface BestPrice {
  priceLocal: number;
  currency: string;
  retailerId: string | null;
  retailerName: string | null;
  retailerCountry: string | null;
  inStock: boolean | null;
  scrapedAt: string | null;
  isStale: boolean;
}

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
  reviewScore: number | null;
  bestPrice: BestPrice | null;
}

export async function searchWhisky(
  q: string,
  filters: Record<string, string> = {},
): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q, ...filters });
  const data = await apiFetch<{ results: SearchResult[] }>(`/api/search?${params}`);
  return data.results;
}

export interface ProductDetail {
  id: string;
  name: string;
  distillery: string;
  ageYears: number | null;
  volumeMl: number;
  category: string;
  region: string | null;
  abv: number | null;
  caskType: string | null;
  imageUrl: string | null;
  description: string | null;
  // Whiskybase catalog fields — WBASE-01–04
  whiskybaseId: string | null;
  whiskybaseUrl: string | null;
  wbScore: number | null;
  wbVoteCount: number;
  prices: Array<{
    retailerId: string;
    retailerName: string;
    country: string;
    currency: string;
    priceLocal: number;
    inStock: boolean;
    sourceUrl: string;
    scrapedAt: string;
  }>;
}

export async function getProduct(id: string): Promise<ProductDetail> {
  return apiFetch<ProductDetail>(`/api/products/${id}`);
}

export interface CostBreakdown {
  shelfPrice: number;
  shipping: number;
  importDuty: number;
  exciseDuty: number;
  vat: number;
  total: number;
  currency: string;
  dutyDataAvailable: boolean;
  restriction?: { restricted: boolean; warning?: string };
}

export async function getCostBreakdown(params: {
  priceLocal: number;
  currency: string;
  retailerCountry: string;
  destinationCountry: string;
  volumeMl: number;
  abv: number;
}): Promise<CostBreakdown> {
  const qs = new URLSearchParams({
    priceLocal:         String(params.priceLocal),
    currency:           params.currency,
    retailerCountry:    params.retailerCountry,
    destinationCountry: params.destinationCountry,
    volumeMl:           String(params.volumeMl),
    abv:                String(params.abv),
  });
  return apiFetch<CostBreakdown>(`/api/cost?${qs}`);
}
