import { searchWhisky } from '@/lib/api';
import { ProductCard } from '@/components/product-card';

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string; category?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const q = params.q ?? '';
  const page = parseInt(params.page ?? '1', 10);

  if (!q) {
    return <p className="text-stone-400">Enter a search term to find whiskies.</p>;
  }

  let data;
  try {
    data = await searchWhisky({ q, page, category: params.category });
  } catch {
    return (
      <p className="text-red-400">
        Could not reach the search service. Is the API running?
      </p>
    );
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-stone-200">
        {data.total === 0
          ? `No results for "${q}"`
          : `${data.total} result${data.total === 1 ? '' : 's'} for "${q}"`}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.results.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Pagination */}
      {data.total > data.limit && (
        <div className="mt-8 flex justify-center gap-4">
          {page > 1 && (
            <a
              href={`/search?q=${encodeURIComponent(q)}&page=${page - 1}`}
              className="rounded bg-stone-800 px-4 py-2 text-sm hover:bg-stone-700"
            >
              ← Previous
            </a>
          )}
          {data.results.length === data.limit && (
            <a
              href={`/search?q=${encodeURIComponent(q)}&page=${page + 1}`}
              className="rounded bg-stone-800 px-4 py-2 text-sm hover:bg-stone-700"
            >
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
