import { getProduct } from '@/lib/api';
import { notFound } from 'next/navigation';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£', USD: '$', EUR: '€', CAD: 'CA$',
};

function fmt(price: number, currency: string) {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency + ' ';
  return `${sym}${price.toFixed(2)}`;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;

  let product;
  try {
    product = await getProduct(id);
  } catch {
    notFound();
  }

  const inStockPrices = product.prices
    .filter((p) => p.inStock)
    .sort((a, b) => a.priceLocal - b.priceLocal);

  return (
    <div className="max-w-3xl">
      <a href="/search" className="text-sm text-amber-400 hover:underline">
        ← Back to search
      </a>

      <h1 className="mt-4 text-3xl font-bold text-stone-100">{product.name}</h1>
      <p className="mt-1 text-stone-400">{product.distillery}</p>

      <dl className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {product.ageYears && (
          <div className="rounded bg-stone-800 p-3">
            <dt className="text-stone-500">Age</dt>
            <dd className="font-semibold">{product.ageYears} years</dd>
          </div>
        )}
        <div className="rounded bg-stone-800 p-3">
          <dt className="text-stone-500">Volume</dt>
          <dd className="font-semibold">{product.volumeMl}ml</dd>
        </div>
        {product.abv && (
          <div className="rounded bg-stone-800 p-3">
            <dt className="text-stone-500">ABV</dt>
            <dd className="font-semibold">{product.abv}%</dd>
          </div>
        )}
        {product.region && (
          <div className="rounded bg-stone-800 p-3">
            <dt className="text-stone-500">Region</dt>
            <dd className="font-semibold">{product.region}</dd>
          </div>
        )}
      </dl>

      {product.description && (
        <p className="mt-6 text-stone-400">{product.description}</p>
      )}

      <h2 className="mt-10 text-xl font-semibold text-stone-200">
        Prices ({inStockPrices.length} retailer{inStockPrices.length !== 1 ? 's' : ''} in stock)
      </h2>

      {inStockPrices.length === 0 ? (
        <p className="mt-4 text-stone-500">No in-stock listings found.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {inStockPrices.map((p) => (
            <li
              key={p.retailerId}
              className="flex items-center justify-between rounded border border-stone-700 bg-stone-900 px-4 py-3"
            >
              <div>
                <p className="font-medium text-stone-200">{p.retailerName}</p>
                <p className="text-xs text-stone-500">
                  {p.country} · updated {new Date(p.scrapedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-amber-400">
                  {fmt(p.priceLocal, p.currency)}
                </p>
                <a
                  href={p.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-600 hover:underline"
                >
                  Buy →
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
