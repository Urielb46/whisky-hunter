'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWishlist, removeFromWishlist } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { Heart, Trash2, ExternalLink } from 'lucide-react';

const CURRENCY_SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', CAD: 'CA$' };

export default function WishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: getWishlist,
    enabled: !!user,
  });

  const remove = useMutation({
    mutationFn: (productId: string) => removeFromWishlist(productId),
    onMutate: async (productId) => {
      await qc.cancelQueries({ queryKey: ['wishlist'] });
      const prev = qc.getQueryData(['wishlist']);
      qc.setQueryData(['wishlist'], (old: typeof items) =>
        old?.filter((i) => i.productId !== productId),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['wishlist'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['wishlist'] }),
  });

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Heart size={48} style={{ color: 'var(--border)' }} />
        <h1 className="mt-4 text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}>
          Sign in to see your wishlist
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          Save whiskies and track their prices over time.
        </p>
        <Link
          href="/auth/login"
          className="mt-6 rounded-xl px-6 py-2.5 text-sm font-bold"
          style={{ background: 'var(--primary)', color: '#0A0A0A' }}
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <h1
          className="text-3xl font-bold"
          style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}
        >
          My Wishlist
        </h1>
        {items && items.length > 0 && (
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}
          >
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 skeleton rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && (!items || items.length === 0) && (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <span style={{ fontSize: 48 }}>🥃</span>
          <p className="mt-4 font-semibold" style={{ color: 'var(--text)' }}>Your wishlist is empty</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Browse whiskies and tap the heart to save them here.
          </p>
          <Link
            href="/search?q=scotch"
            className="mt-6 inline-block rounded-xl px-6 py-2.5 text-sm font-bold"
            style={{ background: 'var(--primary)', color: '#0A0A0A' }}
          >
            Browse whiskies
          </Link>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => {
            const bp = item.product.bestPrice;
            const sym = bp ? (CURRENCY_SYMBOLS[bp.currency] ?? bp.currency + ' ') : '';
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-xl px-4 py-4"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                {/* Thumbnail */}
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: 'var(--surface-elevated)' }}
                >
                  {item.product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.product.imageUrl} alt={item.product.name} className="h-12 w-12 object-contain" />
                  ) : (
                    <span style={{ fontSize: 24 }}>🥃</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.product.distillery}</p>
                  <Link
                    href={`/products/${item.productId}`}
                    className="block text-sm font-semibold truncate hover:text-amber-400 transition-colors"
                    style={{ color: 'var(--text)' }}
                  >
                    {item.product.name}
                  </Link>
                  <div className="mt-0.5 flex gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {item.product.ageYears && <span>{item.product.ageYears}yo</span>}
                    <span>{item.product.volumeMl}ml</span>
                    {item.product.region && <span>{item.product.region}</span>}
                  </div>
                </div>

                {/* Price */}
                <div className="text-right shrink-0">
                  {bp ? (
                    <>
                      <p className="font-bold" style={{ color: 'var(--primary)', fontFamily: 'Playfair Display, serif' }}>
                        {sym}{bp.priceLocal.toFixed(2)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{bp.retailerName}</p>
                    </>
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No price</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    href={`/products/${item.productId}`}
                    className="rounded-lg p-2 transition-colors hover:bg-white/5"
                    title="View product"
                  >
                    <ExternalLink size={14} style={{ color: 'var(--text-muted)' }} />
                  </Link>
                  <button
                    onClick={() => remove.mutate(item.productId)}
                    className="rounded-lg p-2 transition-colors hover:bg-red-500/10"
                    title="Remove from wishlist"
                  >
                    <Trash2 size={14} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Premium CTA */}
      {user.tier === 'free' && items && items.length > 0 && (
        <div
          className="mt-8 rounded-xl p-5 text-center"
          style={{ background: 'var(--primary-muted)', border: '1px solid rgba(212,168,83,0.3)' }}
        >
          <p className="font-semibold" style={{ color: 'var(--primary)' }}>✦ Get Price Alerts</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Upgrade to Premium to get notified when any wishlist item drops in price.
          </p>
          <Link
            href="/premium"
            className="mt-3 inline-block rounded-xl px-5 py-2 text-sm font-bold"
            style={{ background: 'var(--primary)', color: '#0A0A0A' }}
          >
            Upgrade to Premium
          </Link>
        </div>
      )}
    </div>
  );
}
