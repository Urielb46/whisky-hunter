import type { SearchResult } from '@/lib/api';

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£', USD: '$', EUR: '€', CAD: 'CA$',
};

interface ProductCardProps {
  product: SearchResult;
}

export function ProductCard({ product }: ProductCardProps) {
  const bp = product.bestPrice;
  const sym = bp ? (CURRENCY_SYMBOLS[bp.currency] ?? bp.currency + ' ') : '';

  return (
    <a
      href={`/products/${product.id}`}
      className="flex flex-col rounded-lg border border-stone-700 bg-stone-900 p-4 hover:border-amber-500 transition-colors"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {product.distillery}
      </p>
      <h3 className="mt-1 font-semibold text-stone-100 leading-snug">{product.name}</h3>

      <div className="mt-2 flex gap-3 text-xs text-stone-400">
        {product.ageYears && <span>{product.ageYears}yo</span>}
        <span>{product.volumeMl}ml</span>
        {product.abv && <span>{product.abv}%</span>}
        {product.region && <span>{product.region}</span>}
      </div>

      <div className="mt-auto pt-4">
        {bp ? (
          <div>
            <p className="text-lg font-bold text-amber-400">
              {sym}{bp.priceLocal.toFixed(2)}
            </p>
            <p className="text-xs text-stone-500">
              {bp.inStock ? '✓ in stock' : '✗ out of stock'} · {bp.retailerName}
            </p>
          </div>
        ) : (
          <p className="text-sm text-stone-500">No price data</p>
        )}
      </div>
    </a>
  );
}
