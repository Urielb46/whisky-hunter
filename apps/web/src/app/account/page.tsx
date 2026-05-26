'use client';

import { useAuth } from '@/lib/auth-context';
import { getBillingStatus } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, CreditCard, Bell, Heart, LogOut } from 'lucide-react';

export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const { data: billing } = useQuery({
    queryKey: ['billing'],
    queryFn: getBillingStatus,
    enabled: !!user,
  });

  if (loading) return null;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <User size={48} style={{ color: 'var(--border)' }} />
        <h1 className="mt-4 text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}>
          Sign in to view your account
        </h1>
        <Link href="/auth/login" className="mt-6 rounded-xl px-6 py-2.5 text-sm font-bold" style={{ background: 'var(--primary)', color: '#0A0A0A' }}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-8 text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}>
        Account
      </h1>

      {/* Profile card */}
      <div className="rounded-2xl p-6 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold"
            style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}
          >
            {user.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--text)' }}>{user.name}</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={
                  user.tier === 'premium'
                    ? { background: 'var(--primary-muted)', color: 'var(--primary)' }
                    : { background: 'var(--surface-elevated)', color: 'var(--text-muted)' }
                }
              >
                {user.tier === 'premium' ? '✦ Premium' : 'Free'}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                since {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription */}
      <div className="rounded-2xl p-6 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <CreditCard size={16} style={{ color: 'var(--primary)' }} />
          <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Subscription</h2>
        </div>

        {billing?.tier === 'premium' ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Premium Plan</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>All features unlocked</p>
              </div>
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                Active
              </span>
            </div>
            <a
              href={`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000'}/api/billing/portal`}
              className="block w-full rounded-xl py-2.5 text-center text-sm font-medium transition-colors hover:bg-white/5"
              style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              Manage billing
            </a>
          </div>
        ) : (
          <div>
            <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
              Upgrade to Premium to unlock price alerts and more.
            </p>
            <Link
              href="/premium"
              className="block w-full rounded-xl py-2.5 text-center text-sm font-bold transition-opacity hover:opacity-90"
              style={{ background: 'var(--primary)', color: '#0A0A0A' }}
            >
              ✦ Upgrade to Premium
            </Link>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="rounded-2xl overflow-hidden mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {[
          { href: '/wishlist', icon: <Heart size={15} />, label: 'My Wishlist' },
          { href: '/alerts', icon: <Bell size={15} />, label: 'Price Alerts' },
        ].map(({ href, icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/5"
            style={{ borderBottom: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <span style={{ color: 'var(--primary)' }}>{icon}</span>
            <span className="text-sm">{label}</span>
            <span className="ml-auto text-sm" style={{ color: 'var(--text-muted)' }}>→</span>
          </Link>
        ))}
        <button
          onClick={async () => { await logout(); router.push('/'); }}
          className="flex w-full items-center gap-3 px-5 py-4 transition-colors hover:bg-red-500/5"
          style={{ color: 'var(--text-muted)' }}
        >
          <LogOut size={15} />
          <span className="text-sm">Sign out</span>
        </button>
      </div>
    </div>
  );
}
