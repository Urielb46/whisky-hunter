'use client';

import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { createAlert } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

interface AlertSetupModalProps {
  productId: string;
  productName: string;
  currentPrice: number | null;
  currency: string;
  onClose: () => void;
}

export function AlertSetupModal({
  productId,
  productName,
  currentPrice,
  currency,
  onClose,
}: AlertSetupModalProps) {
  const { user } = useAuth();
  const [targetPrice, setTargetPrice] = useState(
    currentPrice ? Math.floor(currentPrice * 0.9).toString() : '',
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const sym = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency + ' ';

  async function handleSave() {
    const price = parseFloat(targetPrice);
    if (!price || price <= 0) {
      setError('Enter a valid target price.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // API stores targetPriceGbp in pence (integer) — convert from pounds
      await createAlert(productId, Math.round(price * 100));
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create alert.');
    } finally {
      setLoading(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell size={18} style={{ color: 'var(--primary)' }} />
            <h2 className="font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}>
              Set Price Alert
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/5 transition-colors">
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <p className="text-xs mb-5 truncate" style={{ color: 'var(--text-muted)' }}>
          {productName}
        </p>

        {!user ? (
          <div className="text-center py-4">
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Sign in to set price alerts.
            </p>
            <Link
              href="/auth/login"
              className="inline-block rounded-xl px-6 py-2.5 text-sm font-bold"
              style={{ background: 'var(--primary)', color: '#0A0A0A' }}
            >
              Sign in
            </Link>
          </div>
        ) : user.tier !== 'premium' ? (
          <div className="text-center py-4">
            <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
              Price alerts are a Premium feature.
            </p>
            <Link
              href="/premium"
              className="inline-block rounded-xl px-6 py-2.5 text-sm font-bold mt-2"
              style={{ background: 'var(--primary)', color: '#0A0A0A' }}
            >
              ✦ Upgrade to Premium
            </Link>
          </div>
        ) : success ? (
          <div className="text-center py-4">
            <span style={{ fontSize: 40 }}>🔔</span>
            <p className="mt-3 font-semibold" style={{ color: 'var(--text)' }}>Alert set!</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              We&apos;ll email you when the price drops to {sym}{targetPrice}.
            </p>
            <button
              onClick={onClose}
              className="mt-4 rounded-xl px-6 py-2 text-sm font-medium"
              style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {currentPrice && (
              <div
                className="flex items-center justify-between rounded-lg px-3 py-2.5 mb-4 text-sm"
                style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Current best price</span>
                <span className="font-semibold" style={{ color: 'var(--text)' }}>
                  {sym}{currentPrice.toFixed(2)}
                </span>
              </div>
            )}

            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-subtle)' }}>
              Alert me when price drops below ({sym})
            </label>
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium"
                style={{ color: 'var(--text-muted)' }}
              >
                {sym}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="w-full rounded-xl pl-7 pr-4 py-2.5 text-sm outline-none"
                style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
                placeholder="0.00"
              />
            </div>

            {error && (
              <p className="mt-2 text-xs" style={{ color: '#ef4444' }}>{error}</p>
            )}

            <button
              onClick={handleSave}
              disabled={loading || !targetPrice}
              className="mt-4 w-full rounded-xl py-2.5 text-sm font-bold transition-opacity disabled:opacity-50"
              style={{ background: 'var(--primary)', color: '#0A0A0A' }}
            >
              {loading ? 'Saving…' : 'Set Alert'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
