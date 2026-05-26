'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAlerts, deleteAlert, updateAlert } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { Bell, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

export default function AlertsPage() {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: getAlerts,
    enabled: !!user && user.tier === 'premium',
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAlert(id),
    onSettled: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateAlert(id, { active }),
    onMutate: async ({ id, active }) => {
      await qc.cancelQueries({ queryKey: ['alerts'] });
      const prev = qc.getQueryData(['alerts']);
      qc.setQueryData(['alerts'], (old: typeof alerts) =>
        old?.map((a) => (a.id === id ? { ...a, active } : a)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['alerts'], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Bell size={48} style={{ color: 'var(--border)' }} />
        <h1 className="mt-4 text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}>
          Sign in to manage alerts
        </h1>
        <Link href="/auth/login" className="mt-6 rounded-xl px-6 py-2.5 text-sm font-bold" style={{ background: 'var(--primary)', color: '#0A0A0A' }}>
          Sign in
        </Link>
      </div>
    );
  }

  if (user.tier !== 'premium') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
        <span style={{ fontSize: 56 }}>🔔</span>
        <h1 className="mt-4 text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}>
          Price Alerts — Premium Feature
        </h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          Set target prices and get notified instantly when any whisky drops below your threshold.
        </p>
        <div className="mt-8 w-full rounded-2xl p-6 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {['Unlimited price alerts', 'Email + push notifications', 'Monitor any retailer worldwide', 'Instant price drop alerts'].map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-left" style={{ color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--primary)' }}>✓</span> {f}
            </div>
          ))}
        </div>
        <Link
          href="/premium"
          className="mt-6 rounded-xl px-8 py-3 text-sm font-bold"
          style={{ background: 'var(--primary)', color: '#0A0A0A' }}
        >
          ✦ Upgrade to Premium
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}>
          Price Alerts
        </h1>
        {alerts && alerts.length > 0 && (
          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>
            {alerts.filter((a) => a.active).length} active
          </span>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 skeleton rounded-xl" />)}
        </div>
      )}

      {!isLoading && (!alerts || alerts.length === 0) && (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Bell size={40} style={{ color: 'var(--border)', margin: '0 auto' }} />
          <p className="mt-4 font-semibold" style={{ color: 'var(--text)' }}>No alerts set</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Go to any product page and set a target price to get notified.
          </p>
          <Link href="/search?q=scotch" className="mt-6 inline-block rounded-xl px-6 py-2.5 text-sm font-bold" style={{ background: 'var(--primary)', color: '#0A0A0A' }}>
            Browse whiskies
          </Link>
        </div>
      )}

      {alerts && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const bp = alert.product.bestPrice;
            const triggered = bp && bp.priceLocal <= alert.targetPriceGbp;
            return (
              <div
                key={alert.id}
                className="flex items-center gap-4 rounded-xl px-4 py-4"
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${triggered ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/products/${alert.productId}`} className="text-sm font-semibold truncate hover:text-amber-400 transition-colors" style={{ color: 'var(--text)' }}>
                      {alert.product.name}
                    </Link>
                    {triggered && (
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                        🎯 Price hit!
                      </span>
                    )}
                    {!alert.active && (
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-xs" style={{ background: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
                        Paused
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{alert.product.distillery}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>Target: <strong style={{ color: 'var(--primary)' }}>£{alert.targetPriceGbp.toFixed(0)}</strong></span>
                    {bp && <span>Current: <strong style={{ color: triggered ? '#22c55e' : 'var(--text)' }}>£{bp.priceLocal.toFixed(0)}</strong></span>}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggle.mutate({ id: alert.id, active: !alert.active })}
                    className="rounded-lg p-2 transition-colors hover:bg-white/5"
                    title={alert.active ? 'Pause alert' : 'Activate alert'}
                  >
                    {alert.active
                      ? <ToggleRight size={18} style={{ color: 'var(--primary)' }} />
                      : <ToggleLeft size={18} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                  <button
                    onClick={() => remove.mutate(alert.id)}
                    className="rounded-lg p-2 transition-colors hover:bg-red-500/10"
                  >
                    <Trash2 size={14} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
