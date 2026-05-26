'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';

export function SearchForm({
  defaultValue = '',
  large = false,
}: {
  defaultValue?: string;
  large?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);
  const [focused, setFocused] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2">
      <div
        className="flex flex-1 items-center gap-3 rounded-xl"
        style={{
          background: 'var(--surface)',
          border: `1px solid ${focused ? 'rgba(212,168,83,0.6)' : 'var(--border)'}`,
          boxShadow: focused ? '0 0 0 3px rgba(212,168,83,0.08)' : 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          padding: large ? '14px 20px' : '10px 16px',
        }}
      >
        <Search
          size={large ? 20 : 16}
          style={{ color: focused ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0, transition: 'color 0.2s' }}
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={large ? 'Search any whisky, distillery, or region…' : 'e.g. Macallan 12, Lagavulin 16…'}
          className="w-full bg-transparent outline-none"
          style={{ color: 'var(--text)', fontSize: large ? 16 : 14 }}
          autoFocus={!large}
        />
      </div>
      <button
        type="submit"
        disabled={!q.trim()}
        className="rounded-xl font-bold transition-all disabled:opacity-40 hover:opacity-90 active:scale-95"
        style={{
          background: 'var(--primary)',
          color: '#0A0A0A',
          padding: large ? '14px 28px' : '10px 20px',
          fontSize: large ? 15 : 13,
        }}
      >
        Search
      </button>
    </form>
  );
}
