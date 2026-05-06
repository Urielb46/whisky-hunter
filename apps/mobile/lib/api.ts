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

export interface SearchResult {
  id: string;
  name: string;
  distillery: string;
  ageYears: number | null;
  volumeMl: number;
  category: string;
  imageUrl: string | null;
  bestPriceGbp: number | null;
  retailerCount: number;
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
}

export async function getCostBreakdown(
  retailerId: string,
  productId: string,
  destination: string,
): Promise<CostBreakdown> {
  const params = new URLSearchParams({ retailerId, productId, destination });
  return apiFetch<CostBreakdown>(`/api/cost?${params}`);
}
