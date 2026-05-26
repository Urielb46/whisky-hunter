import { Suspense } from 'react';
import { searchWhisky } from '@/lib/api';
import { ProductCard } from '@/components/product-card';
import { FilterSidebar } from '@/components/filter-sidebar';
import { SortBar } from '@/components/sort-bar';
import { SearchForm } from '@/components/search-form';

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    region?: string;
    caskType?: string;
    country?: string;
    // FilterSidebar writes minAge/maxAge
    minAge?: string;
    maxAge?: string;
    // legacy aliases
    ageMin?: string;
    ageMax?: string;
    minPrice?: string;
    maxPrice?: string;
    // SortBar writes sortBy + sortDir
    sortBy?: string;
    sortDir?: string;
    // legacy combined
    sort?: string;
  }>;
}

function ProductSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div className="skeleton" style={{ height: 224 }} />
      <div className="p-4 space-y-2">
        <div className="h-3 w-20 skeleton rounded" />
        <div className="h-4 w-full skeleton rounded" />
        <div className="h-4 w-3/4 skeleton rounded" />
        <div className="mt-4 h-6 w-24 skeleton rounded" />
      </div>
    </div>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const q = params.q ?? '';
  const page = parseInt(params.page ?? '1', 10);
  // Normalise age params (FilterSidebar uses minAge/maxAge)
  const ageMin = params.minAge ?? params.ageMin;
  const ageMax = params.maxAge ?? params.ageMax;
  // Normalise sort — API accepts: sort=price&sortDir=asc
  // SortBar writes sortBy (e.g. "price") + sortDir (e.g. "asc") separately.
  const sort = params.sort ?? params.sortBy ?? undefined;
  const sortDir = params.sortDir ?? undefined;
  const hasFilters = !!(params.region || params.caskType || params.country || ageMin || ageMax);

  if (!q && !hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span style={{ fontSize: 56 }}>🔍</span>
        <p className="mt-4 text-lg font-medium" style={{ color: 'var(--text)' }}>
          What are you looking for?
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          Search any whisky, distillery, or region.
        </p>
        <div className="mt-8 w-full max-w-lg">
          <SearchForm />
        </div>
      </div>
    );
  }

  let data;
  try {
    data = await searchWhisky({
      q: q || undefined,
      page,
      region: params.region,
      caskType: params.caskType,
      country: params.country,
      ageMin: ageMin ? parseInt(ageMin) : undefined,
      ageMax: ageMax ? parseInt(ageMax) : undefined,
      minPrice: params.minPrice ? parseFloat(params.minPrice) : undefined,
      maxPrice: params.maxPrice ? parseFloat(params.maxPrice) : undefined,
      sort,
      sortDir,
    });
  } catch {
    return (
      <div
        className="mt-8 rounded-xl p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-2xl mb-2">⚠️</p>
        <p className="font-medium" style={{ color: 'var(--text)' }}>Could not reach the API</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Make sure the API server is running.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / data.limit);

  function pageHref(p: number) {
    const ps = new URLSearchParams({ page: String(p) });
    if (q) ps.set('q', q);
    if (params.region) ps.set('region', params.region);
    if (params.caskType) ps.set('caskType', params.caskType);
    if (params.country) ps.set('country', params.country);
    if (ageMin) ps.set('minAge', ageMin);
    if (ageMax) ps.set('maxAge', ageMax);
    if (params.minPrice) ps.set('minPrice', params.minPrice);
    if (params.maxPrice) ps.set('maxPrice', params.maxPrice);
    if (params.sortBy) ps.set('sortBy', params.sortBy);
    if (params.sortDir) ps.set('sortDir', params.sortDir);
    else if (sort) ps.set('sort', sort);
    return `/search?${ps}`;
  }

  return (
    <div>
      {/* Page header */}
      {q ? (
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}>
            Results for{' '}
            <span className="text-gold">&ldquo;{q}&rdquo;</span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            {data.total.toLocaleString()} whisk{data.total === 1 ? 'y' : 'ies'} found
          </p>
        </div>
      ) : (
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}>
            Browse Whiskies
          </h1>
        </div>
      )}

      {/* Search bar */}
      <div className="mb-8 max-w-xl">
        <SearchForm defaultValue={q} />
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <Suspense>
          <FilterSidebar q={q} />
        </Suspense>

        {/* Results */}
        <div className="flex-1 min-w-0">
          <Suspense>
            <SortBar total={data.total} q={q} />
          </Suspense>

          {data.total === 0 ? (
            <div className="mt-12 text-center">
              <p className="text-4xl mb-3">🥃</p>
              <p className="font-semibold text-lg" style={{ color: 'var(--text)' }}>
                No results for &ldquo;{q}&rdquo;
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Try a different spelling or fewer filters.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.results.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-1.5">
                  {/* Prev */}
                  {page > 1 ? (
                    <a
                      href={pageHref(page - 1)}
                      className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-subtle)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
                    </a>
                  ) : (
                    <span
                      className="flex items-center rounded-lg px-3 py-2 opacity-30"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--text-subtle)' }}>chevron_left</span>
                    </span>
                  )}

                  {/* Page numbers — show up to 5 around current */}
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                    const p = start + i;
                    const isActive = p === page;
                    return (
                      <a
                        key={p}
                        href={pageHref(p)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors"
                        style={{
                          background: isActive ? 'var(--primary)' : 'var(--surface)',
                          border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                          color: isActive ? '#0A0A0A' : 'var(--text-subtle)',
                          fontWeight: isActive ? 700 : 500,
                        }}
                      >
                        {p}
                      </a>
                    );
                  })}

                  {/* Next */}
                  {page < totalPages ? (
                    <a
                      href={pageHref(page + 1)}
                      className="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-subtle)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
                    </a>
                  ) : (
                    <span
                      className="flex items-center rounded-lg px-3 py-2 opacity-30"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--text-subtle)' }}>chevron_right</span>
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
