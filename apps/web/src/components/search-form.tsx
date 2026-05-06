'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SearchForm() {
  const router = useRouter();
  const [q, setQ] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl gap-2">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="e.g. Macallan 12, Lagavulin 16, Ardbeg…"
        className="flex-1 rounded-lg border border-stone-700 bg-stone-900 px-4 py-3 text-stone-100 placeholder:text-stone-500 focus:border-amber-500 focus:outline-none"
        autoFocus
      />
      <button
        type="submit"
        className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-stone-950 hover:bg-amber-400 disabled:opacity-50"
        disabled={!q.trim()}
      >
        Search
      </button>
    </form>
  );
}
