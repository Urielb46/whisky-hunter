'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const SORT_OPTIONS = [
  { value: 'price_asc', label: 'Price: Low → High', sortBy: 'price', sortDir: 'asc' },
  { value: 'price_desc', label: 'Price: High → Low', sortBy: 'price', sortDir: 'desc' },
  { value: 'age_desc', label: 'Age: Oldest first', sortBy: 'age', sortDir: 'desc' },
  { value: 'name_asc', label: 'Name: A → Z', sortBy: 'name', sortDir: 'asc' },
];

interface SortBarProps {
  total: number;
  q: string;
}

export function SortBar({ total, q }: SortBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSortBy = searchParams.get('sortBy') ?? 'price';
  const currentSortDir = searchParams.get('sortDir') ?? 'asc';
  const currentValue = `${currentSortBy}_${currentSortDir}`;

  function handleSort(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = SORT_OPTIONS.find((o) => o.value === e.target.value);
    if (!selected) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('q', q);
    params.set('sortBy', selected.sortBy);
    params.set('sortDir', selected.sortDir);
    params.delete('page');
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        <span className="font-semibold" style={{ color: 'var(--text)' }}>{total.toLocaleString()}</span>{' '}
        result{total !== 1 ? 's' : ''}
      </p>

      <div className="flex items-center gap-2">
        <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Sort by</label>
        <select
          value={currentValue}
          onChange={handleSort}
          className="rounded-lg px-3 py-1.5 text-xs outline-none"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
