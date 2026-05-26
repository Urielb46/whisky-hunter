const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────────────────────

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
    retailerCountry: string;
    inStock: boolean;
    scrapedAt: string;
    isStale: boolean;
  } | null;
  reviewScore: number | null;
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
  // Whiskybase catalog fields — WBASE-01–04
  whiskybaseId: string | null;
  whiskybaseUrl: string | null;
  wbScore: number | null;
  wbVoteCount: number;
  prices: PriceEntry[];
}

export interface PriceEntry {
  retailerId: string;
  retailerName: string;
  country: string;
  currency: string;
  priceLocal: number;
  inStock: boolean;
  sourceUrl: string;
  scrapedAt: string;
}

export interface TrueCost {
  shelfPrice: number;
  shipping: number;
  importDuty: number;
  exciseDuty: number;
  vat: number;
  total: number;
  currency: string;
  dutyDataAvailable: boolean;
  lpa: number;
  restriction?: {
    restricted: boolean;
    warning?: string;
  };
}

export interface WishlistItem {
  id: string;
  productId: string;
  createdAt: string;
  product: SearchResult;
}

export interface PriceAlert {
  id: string;
  productId: string;
  targetPriceGbp: number;
  currency: string;
  active: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
  product: SearchResult;
}

export interface BillingStatus {
  tier: 'free' | 'premium';
  stripeCustomerId: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  tier: 'free' | 'premium';
  createdAt: string;
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Search & Products ────────────────────────────────────────────────────────

export async function searchWhisky(params: {
  q?: string;
  distillery?: string;
  region?: string;
  ageMin?: number;
  ageMax?: number;
  abvMin?: number;
  abvMax?: number;
  minPrice?: number;
  maxPrice?: number;
  caskType?: string;
  country?: string;
  sort?: string;
  sortDir?: string;
  page?: number;
  limit?: number;
}): Promise<SearchResponse> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.distillery) qs.set('distillery', params.distillery);
  if (params.region) qs.set('region', params.region);
  if (params.ageMin !== undefined) qs.set('ageMin', String(params.ageMin));
  if (params.ageMax !== undefined) qs.set('ageMax', String(params.ageMax));
  if (params.abvMin !== undefined) qs.set('abvMin', String(params.abvMin));
  if (params.abvMax !== undefined) qs.set('abvMax', String(params.abvMax));
  if (params.minPrice !== undefined) qs.set('minPrice', String(params.minPrice));
  if (params.maxPrice !== undefined) qs.set('maxPrice', String(params.maxPrice));
  if (params.caskType) qs.set('caskType', params.caskType);
  if (params.country) qs.set('country', params.country);
  if (params.sort) qs.set('sort', params.sort);
  if (params.sortDir) qs.set('sortDir', params.sortDir);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));

  const res = await fetch(`${API_BASE}/api/search?${qs}`, {
    next: { revalidate: 300 },
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

export async function getTrueCost(params: {
  priceLocal: number;
  currency: string;
  retailerCountry: string;
  destinationCountry: string;
  volumeMl: number;
  abv: number;
}): Promise<TrueCost> {
  const qs = new URLSearchParams({
    priceLocal: String(params.priceLocal),
    currency: params.currency,
    retailerCountry: params.retailerCountry,
    destinationCountry: params.destinationCountry,
    volumeMl: String(params.volumeMl),
    abv: String(params.abv),
  });
  return apiFetch<TrueCost>(`/api/cost?${qs}`);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function getSession(): Promise<{ user: AuthUser } | null> {
  try {
    return await apiFetch<{ user: AuthUser }>('/api/auth/get-session');
  } catch {
    return null;
  }
}

export async function signIn(email: string, password: string): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>('/api/auth/sign-in/email', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function signUp(name: string, email: string, password: string): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>('/api/auth/sign-up/email', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function signOut(): Promise<void> {
  await apiFetch<void>('/api/auth/sign-out', { method: 'POST' });
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export async function getWishlist(): Promise<WishlistItem[]> {
  const data = await apiFetch<{ items: WishlistItem[] }>('/api/wishlist');
  return data.items;
}

export async function addToWishlist(productId: string): Promise<WishlistItem> {
  return apiFetch<WishlistItem>('/api/wishlist', {
    method: 'POST',
    body: JSON.stringify({ productId }),
  });
}

export async function removeFromWishlist(productId: string): Promise<void> {
  await apiFetch<void>(`/api/wishlist/product/${productId}`, { method: 'DELETE' });
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export async function getAlerts(): Promise<PriceAlert[]> {
  const data = await apiFetch<{ alerts: PriceAlert[] }>('/api/alerts');
  return data.alerts;
}

export async function createAlert(productId: string, targetPriceGbp: number): Promise<PriceAlert> {
  return apiFetch<PriceAlert>('/api/alerts', {
    method: 'POST',
    body: JSON.stringify({ productId, targetPriceGbp }),
  });
}

export async function updateAlert(id: string, data: { targetPriceGbp?: number; active?: boolean }): Promise<PriceAlert> {
  return apiFetch<PriceAlert>(`/api/alerts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAlert(id: string): Promise<void> {
  await apiFetch<void>(`/api/alerts/${id}`, { method: 'DELETE' });
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export async function getBillingStatus(): Promise<BillingStatus> {
  return apiFetch<BillingStatus>('/api/billing/status');
}

export async function createCheckout(plan: 'monthly' | 'annual'): Promise<{ url: string }> {
  return apiFetch<{ url: string }>('/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
}
