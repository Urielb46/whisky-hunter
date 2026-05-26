'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createCheckout } from '@/lib/api';
import Link from 'next/link';
import { Check } from 'lucide-react';

const FEATURES = [
  'Unlimited price alerts',
  'Email + push notifications',
  'Monitor all 8 retailers',
  'Instant price drop alerts',
  'Priority support',
  'Early access to new features',
];

export default function PremiumPage() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<'monthly' | 'annual'>('annual');
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    if (!user) {
      window.location.href = '/auth/signup';
      return;
    }
    setLoading(true);
    try {
      const { url } = await createCheckout(plan);
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  if (user?.tier === 'premium') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span style={{ fontSize: 56 }}>✦</span>
        <h1 className="mt-4 text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}>
          You&apos;re on Premium
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          Enjoy unlimited price alerts and all premium features.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/alerts" className="rounded-xl px-5 py-2.5 text-sm font-semibold" style={{ background: 'var(--primary)', color: '#0A0A0A' }}>
            Manage Alerts
          </Link>
          <Link href="/account" className="rounded-xl px-5 py-2.5 text-sm font-semibold" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <p className="inline-block rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-widest mb-4" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>
          Premium
        </p>
        <h1 className="text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}>
          Never miss a price drop
        </h1>
        <p className="mt-3 text-base" style={{ color: 'var(--text-muted)' }}>
          Set alerts on any whisky and get notified the moment prices fall.
        </p>
      </div>

      {/* Plan toggle */}
      <div className="flex justify-center mb-8">
        <div className="flex rounded-xl p-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {(['monthly', 'annual'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlan(p)}
              className="relative rounded-lg px-5 py-2 text-sm font-medium transition-all"
              style={
                plan === p
                  ? { background: 'var(--primary)', color: '#0A0A0A' }
                  : { color: 'var(--text-muted)' }
              }
            >
              {p === 'annual' ? 'Annual' : 'Monthly'}
              {p === 'annual' && (
                <span
                  className="absolute -top-2 -right-2 rounded-full px-1.5 py-0.5 text-xs font-bold"
                  style={{ background: '#22c55e', color: '#fff', fontSize: 9 }}
                >
                  -25%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Pricing card */}
      <div
        className="rounded-2xl p-8 text-center mb-6"
        style={{
          background: 'var(--surface)',
          border: '1px solid rgba(212,168,83,0.3)',
          boxShadow: '0 0 40px rgba(212,168,83,0.08)',
        }}
      >
        <div className="mb-2">
          <span className="text-5xl font-bold" style={{ color: 'var(--primary)', fontFamily: 'Playfair Display, serif' }}>
            {plan === 'annual' ? '$7.49' : '$9.99'}
          </span>
          <span className="text-lg" style={{ color: 'var(--text-muted)' }}>/mo</span>
        </div>
        {plan === 'annual' && (
          <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Billed $89.99/year · Save $30</p>
        )}

        <div className="my-6 space-y-3 text-left">
          {FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-3 text-sm" style={{ color: 'var(--text)' }}>
              <Check size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              {f}
            </div>
          ))}
        </div>

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full rounded-xl py-3.5 text-sm font-bold transition-opacity disabled:opacity-50"
          style={{ background: 'var(--primary)', color: '#0A0A0A' }}
        >
          {loading ? 'Redirecting…' : `Start Premium — ${plan === 'annual' ? '$7.49/mo' : '$9.99/mo'}`}
        </button>

        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          Cancel anytime. No questions asked.
        </p>
      </div>

      {/* Free tier comparison */}
      <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
          Free vs Premium
        </p>
        <div className="grid grid-cols-3 gap-2 text-xs text-center">
          <div />
          <div className="font-semibold" style={{ color: 'var(--text-muted)' }}>Free</div>
          <div className="font-semibold" style={{ color: 'var(--primary)' }}>Premium</div>
          {[
            ['Search whiskies', '✓', '✓'],
            ['Compare prices', '✓', '✓'],
            ['True cost calculator', '✓', '✓'],
            ['Wishlist', '✓ (10)', 'Unlimited'],
            ['Price alerts', '✗', 'Unlimited'],
            ['Push notifications', '✗', '✓'],
          ].map(([label, free, premium]) => (
            <>
              <div key={label + 'l'} className="text-left py-2" style={{ color: 'var(--text-muted)' }}>{label}</div>
              <div key={label + 'f'} className="py-2" style={{ color: free === '✗' ? '#ef4444' : 'var(--text-subtle)' }}>{free}</div>
              <div key={label + 'p'} className="py-2" style={{ color: premium === '✗' ? '#ef4444' : 'var(--primary)' }}>{premium}</div>
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
