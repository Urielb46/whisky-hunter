'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { X } from 'lucide-react';

const REGIONS = ['Speyside', 'Islay', 'Highland', 'Lowland', 'Campbeltown', 'Island', 'Kentucky', 'Tennessee'];
const CASK_TYPES = ['Ex-Bourbon', 'Sherry', 'Port', 'Wine', 'Rum', 'Virgin Oak', 'PX'];
const COUNTRIES = ['GB', 'US', 'DE', 'FR', 'NL', 'CA'];
const COUNTRY_LABELS: Record<string, string> = {
  GB: 'United Kingdom',
  US: 'United States',
  DE: 'Germany',
  FR: 'France',
  NL: 'Netherlands',
  CA: 'Canada',
};

export function FilterSidebar({ q }: { q: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('q', q);
      params.delete('page');
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/search?${params.toString()}`);
    },
    [router, searchParams, q],
  );

  const get = (key: string) => searchParams.get(key);

  const hasFilters = ['region', 'caskType', 'country', 'minAge', 'maxAge', 'minPrice', 'maxPrice'].some(
    (k) => searchParams.has(k),
  );

  function clearAll() {
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <aside className="w-full lg:w-56 lg:shrink-0">
      <div
        className="filter-card sticky top-20 space-y-6 rounded-xl p-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Filters
        </h3>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs transition-colors hover:opacity-80"
            style={{ color: 'var(--primary)' }}
          >
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {/* Region */}
      <FilterGroup label="Region">
        {REGIONS.map((r) => (
          <FilterChip
            key={r}
            label={r}
            active={get('region') === r}
            onClick={() => update('region', get('region') === r ? null : r)}
          />
        ))}
      </FilterGroup>

      {/* Cask */}
      <FilterGroup label="Cask Type">
        {CASK_TYPES.map((c) => (
          <FilterChip
            key={c}
            label={c}
            active={get('caskType') === c}
            onClick={() => update('caskType', get('caskType') === c ? null : c)}
          />
        ))}
      </FilterGroup>

      {/* Retailer country */}
      <FilterGroup label="Retailer">
        {COUNTRIES.map((c) => (
          <FilterChip
            key={c}
            label={COUNTRY_LABELS[c] ?? c}
            active={get('country') === c}
            onClick={() => update('country', get('country') === c ? null : c)}
          />
        ))}
      </FilterGroup>

      {/* Age */}
      <FilterGroup label="Min Age (years)">
        <div className="flex items-center gap-2">
          {[0, 10, 15, 18, 21, 25].map((age) => (
            <FilterChip
              key={age}
              label={age === 0 ? 'Any' : `${age}+`}
              active={(get('minAge') ?? '0') === String(age)}
              onClick={() => update('minAge', age === 0 ? null : String(age))}
            />
          ))}
        </div>
      </FilterGroup>

      {/* Price */}
      <FilterGroup label="Max Price (£)">
        <div className="flex flex-wrap gap-1.5">
          {[null, 50, 100, 200, 500].map((price) => (
            <FilterChip
              key={price ?? 'any'}
              label={price === null ? 'Any' : `≤ £${price}`}
              active={get('maxPrice') === (price === null ? null : String(price))}
              onClick={() => update('maxPrice', price === null ? null : String(price))}
            />
          ))}
        </div>
      </FilterGroup>
      </div>
    </aside>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg px-2.5 py-1 text-xs font-medium transition-all"
      style={
        active
          ? { background: 'var(--primary)', color: '#0A0A0A' }
          : {
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-subtle)',
            }
      }
    >
      {label}
    </button>
  );
}
