import { getProduct, searchWhisky } from '@/lib/api';

function proxyImageUrl(url: string): string {
  return `/api/img?url=${encodeURIComponent(url)}`;
}
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { TrueCostWidget } from '@/components/true-cost-widget';
import { WishlistButton } from '@/components/wishlist-button';
import { AlertButton } from '@/components/alert-button';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£', USD: '$', EUR: '€', CAD: 'CA$',
};

const isRealUrl = (url: string) => !!url && url.startsWith('http') && !url.includes('example.com');

function fmt(price: number, currency: string) {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency + ' ';
  return `${sym}${price.toFixed(2)}`;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;

  let product;
  try {
    product = await getProduct(id);
  } catch (err) {
    console.error('[ProductPage] getProduct failed:', err);
    notFound();
  }

  const inStockPrices = product.prices
    .filter((p) => p.inStock)
    .sort((a, b) => a.priceLocal - b.priceLocal);

  const outOfStockPrices = product.prices.filter((p) => !p.inStock);
  const bestPrice = inStockPrices[0] ?? null;

  // Similar products — same distillery, exclude current
  const similarData = await searchWhisky({
    q: product.distillery,
    limit: 8,
  }).catch(() => null);
  const similar = (similarData?.results ?? []).filter((r) => r.id !== product.id).slice(0, 6);

  const specs = [
    product.ageYears && { icon: 'schedule', label: 'Age', value: `${product.ageYears} years` },
    { icon: 'water_drop', label: 'Volume', value: `${product.volumeMl}ml` },
    product.abv && { icon: 'percent', label: 'ABV', value: `${product.abv}%` },
    product.region && { icon: 'location_on', label: 'Region', value: product.region },
    product.caskType && { icon: 'wine_bar', label: 'Cask', value: product.caskType },
  ].filter(Boolean) as { icon: string; label: string; value: string }[];

  const COUNTRY_FLAG: Record<string, string> = {
    GB: '🇬🇧', US: '🇺🇸', FR: '🇫🇷', DE: '🇩🇪', CA: '🇨🇦',
    JP: '🇯🇵', AU: '🇦🇺', IT: '🇮🇹', ES: '🇪🇸', NL: '🇳🇱',
  };

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
        <Link href="/" className="hover:text-amber-400 transition-colors">Home</Link>
        <span>/</span>
        <Link href="/search?q=" className="hover:text-amber-400 transition-colors">Search</Link>
        <span>/</span>
        <span style={{ color: 'var(--text)' }}>{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Left column */}
        <div>
          {/* Product image hero */}
          <div
            className="product-img-hero relative mb-8 flex h-64 items-center justify-center overflow-hidden rounded-2xl sm:h-72"
            style={{
              background: 'linear-gradient(135deg, #0f0a04 0%, #1e1208 40%, #2d1f0a 70%, #1a1008 100%)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Ambient glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 50% 80%, rgba(212,168,83,0.1) 0%, transparent 60%)' }}
            />
            {product.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={proxyImageUrl(product.imageUrl)}
                alt={product.name}
                className="relative h-full w-full object-contain p-8"
              />
            ) : (
              <div className="relative flex flex-col items-center gap-3">
                <span style={{ fontSize: 72 }}>🥃</span>
                <span
                  className="text-sm font-semibold tracking-widest uppercase"
                  style={{ color: 'var(--primary)', opacity: 0.7 }}
                >
                  {product.category?.replace(/_/g, ' ') ?? 'Whisky'}
                </span>
              </div>
            )}
            {/* Best price badge bottom-left */}
            {bestPrice && (
              <span
                className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold shadow-lg"
                style={{ background: 'var(--primary)', color: '#0A0A0A' }}
              >
                Best {bestPrice.currency === 'GBP' ? '£' : bestPrice.currency === 'USD' ? '$' : bestPrice.currency + ' '}
                {bestPrice.priceLocal.toFixed(0)}
              </span>
            )}
            {/* Country flag badge top-right */}
            {bestPrice && (
              <span
                className="absolute right-3 top-3 rounded-md px-2 py-1 text-sm font-medium"
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              >
                {COUNTRY_FLAG[bestPrice.country] ?? bestPrice.country}
              </span>
            )}
            {/* Wishlist icon overlay top-left */}
            <div className="absolute left-3 top-3">
              <WishlistButton productId={product.id} iconOnly />
            </div>
          </div>

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className="text-sm font-medium uppercase tracking-widest"
                style={{ color: 'var(--primary)' }}
              >
                {product.distillery}
              </p>
              <h1
                className="mt-1 text-3xl font-bold leading-tight sm:text-4xl"
                style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}
              >
                {product.name}
              </h1>
            </div>
          </div>

          {/* Wishlist + share row */}
          <div className="mt-4">
            <WishlistButton productId={product.id} />
          </div>

          {/* Specs */}
          <div className="mt-6 flex flex-wrap gap-3">
            {specs.map(({ icon, label, value }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 15 }}>{icon}</span>
                <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
                <span className="font-semibold" style={{ color: 'var(--text)' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Whiskybase community rating — WBASE-02 / WBASE-04 */}
          {product.wbScore != null && (
            <div
              className="mt-6 flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3">
                {/* Score badge */}
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-base font-bold"
                  style={{
                    background: 'linear-gradient(135deg, rgba(212,147,15,0.2) 0%, rgba(139,69,19,0.2) 100%)',
                    color: 'var(--primary)',
                    border: '1px solid rgba(212,147,15,0.35)',
                  }}
                >
                  {product.wbScore.toFixed(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    Community Rating
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {product.wbVoteCount.toLocaleString()} rating{product.wbVoteCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {product.whiskybaseUrl && (
                <a
                  href={product.whiskybaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ color: 'var(--primary)', border: '1px solid rgba(212,147,15,0.35)' }}
                >
                  View on Whiskybase
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          )}
          {/* Whiskybase attribution — WBASE-04 */}
          {product.wbScore != null && (
            <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
              Ratings powered by{' '}
              <a
                href="https://www.whiskybase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:opacity-80 transition-opacity"
              >
                Whiskybase
              </a>
            </p>
          )}

          {/* Description */}
          {product.description && (
            <p className="mt-6 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {product.description}
            </p>
          )}

          {/* Price table */}
          <div className="mt-10">
            <h2
              className="mb-4 text-xl font-bold"
              style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}
            >
              {inStockPrices.length > 0
                ? `${inStockPrices.length} retailer${inStockPrices.length !== 1 ? 's' : ''} in stock`
                : 'No in-stock listings'}
            </h2>

            {inStockPrices.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                This whisky is currently out of stock at all tracked retailers.
              </p>
            )}

            <div className="space-y-2">
              {inStockPrices.map((p, i) => (
                <div
                  key={p.retailerId}
                  className="price-row relative flex items-center justify-between rounded-xl px-4 py-3 overflow-hidden"
                  style={{
                    background: i === 0 ? 'var(--primary-muted)' : 'var(--surface)',
                    border: `1px solid ${i === 0 ? 'rgba(212,168,83,0.35)' : 'var(--border)'}`,
                  }}
                >
                  {/* Amber left bar for best price */}
                  {i === 0 && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                      style={{ background: 'var(--primary)' }}
                    />
                  )}
                  <div className="flex items-center gap-3 pl-1">
                    {i === 0 && (
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-bold"
                        style={{ background: 'var(--primary)', color: '#0A0A0A' }}
                      >
                        Best
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{p.retailerName}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {p.country} · {new Date(p.scrapedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p
                      className="text-lg font-bold"
                      style={{ color: i === 0 ? 'var(--primary)' : 'var(--text)', fontFamily: 'Playfair Display, serif' }}
                    >
                      {fmt(p.priceLocal, p.currency)}
                    </p>
                    {isRealUrl(p.sourceUrl) && (
                      <a
                        href={p.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition-all hover:opacity-90 active:scale-95"
                        style={
                          i === 0
                            ? { background: 'var(--primary)', color: '#0A0A0A' }
                            : { background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text)' }
                        }
                      >
                        Buy now
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {outOfStockPrices.length > 0 && (
                <>
                  <p className="pt-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Out of stock
                  </p>
                  {outOfStockPrices.map((p) => (
                    <div
                      key={p.retailerId}
                      className="flex items-center justify-between rounded-xl px-4 py-3 opacity-50"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{p.retailerName}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.country}</p>
                      </div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                        {fmt(p.priceLocal, p.currency)}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Best price summary */}
          {bestPrice && (
            <div
              className="rounded-xl p-5 text-center"
              style={{
                background: 'var(--surface)',
                border: '1px solid rgba(212,168,83,0.35)',
                boxShadow: '0 0 24px rgba(212,168,83,0.08)',
              }}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                {/* Green pulse indicator */}
                <span className="relative flex h-2 w-2">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ background: 'var(--green)' }}
                  />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: 'var(--green)' }} />
                </span>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Best price
                </p>
              </div>
              <p
                className="mt-2 text-4xl font-bold"
                style={{ color: 'var(--primary)', fontFamily: 'Playfair Display, serif' }}
              >
                {fmt(bestPrice.priceLocal, bestPrice.currency)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>at {bestPrice.retailerName}</p>
              {isRealUrl(bestPrice.sourceUrl) && (
                <a
                  href={bestPrice.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all hover:opacity-90 active:scale-95"
                  style={{
                    background: 'var(--primary)',
                    color: '#0A0A0A',
                    boxShadow: '0 4px 16px rgba(212,168,83,0.3)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
                  Buy at {bestPrice.retailerName}
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>open_in_new</span>
                </a>
              )}
              {isRealUrl(bestPrice.sourceUrl) && (
                <p className="mt-2 text-center text-xs" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                  Opens retailer site in new tab · Always verify price before checkout
                </p>
              )}
            </div>
          )}

          {/* True cost */}
          {bestPrice && (
            <TrueCostWidget
              bestPrice={bestPrice}
              volumeMl={product.volumeMl}
              abv={product.abv ?? 40}
            />
          )}

          {/* Set alert CTA */}
          <AlertButton
            productId={product.id}
            productName={product.name}
            currentPrice={bestPrice?.priceLocal ?? null}
            currency={bestPrice?.currency ?? 'GBP'}
          />
        </div>
      </div>

      {/* Similar products */}
      {similar.length > 0 && (
        <div className="mt-14">
          <h2
            className="mb-5 text-xl font-bold"
            style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}
          >
            More from {product.distillery}
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollSnapType: 'x mandatory' }}>
            {similar.map((item) => {
              const bp = item.bestPrice;
              const sym = bp
                ? ({ GBP: '£', USD: '$', EUR: '€', CAD: 'CA$' }[bp.currency] ?? bp.currency + ' ')
                : '';
              return (
                <Link
                  key={item.id}
                  href={`/products/${item.id}`}
                  className="group shrink-0 rounded-xl overflow-hidden transition-all hover:-translate-y-0.5"
                  style={{
                    width: 160,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    scrollSnapAlign: 'start',
                  }}
                >
                  {/* Mini image */}
                  <div
                    className="flex h-24 items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #0f0a04 0%, #2d1f0a 60%, #1a1008 100%)' }}
                  >
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={proxyImageUrl(item.imageUrl)} alt={item.name} className="h-20 w-full object-contain p-2" />
                    ) : (
                      <span style={{ fontSize: 32 }}>🥃</span>
                    )}
                  </div>
                  <div class